// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {AsyncScope} from '../../conductor/async-scope.js';
import {installPageErrorHandlers} from '../../conductor/events.js';
import {platform} from '../../conductor/platform.js';
import {TestConfig} from '../../conductor/test_config.js';

import {PageWrapper} from './page-wrapper.js';
import type {InspectedPage} from './target-helper.js';

export type Action = (element: puppeteer.ElementHandle) => Promise<void>;

export interface ClickOptions {
  root?: puppeteer.ElementHandle;
  clickOptions?: puppeteer.ClickOptions;
  maxPixelsFromLeft?: number;
}

const envLatePromises = process.env['LATE_PROMISES'] !== undefined ?
    ['true', ''].includes(process.env['LATE_PROMISES'].toLowerCase()) ? 10 : Number(process.env['LATE_PROMISES']) :
    0;

type DeducedElementType<ElementType extends Element|null, Selector extends string> =
    ElementType extends null ? puppeteer.NodeFor<Selector>: ElementType;

const CONTROL_OR_META = platform === 'mac' ? 'Meta' : 'Control';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalThis: any = global;

interface DevToolsReloadParams {
  canDock?: boolean;
  panel?: string;
}

export class DevToolsPage extends PageWrapper {
  screenshotLog: Record<string, string> = {};
  #currentHighlightedElement?: HighlightedElement;
  #cdpSession?: puppeteer.CDPSession;

  constructor(page: puppeteer.Page) {
    super(page);
    this.#startHeartbeat();
  }

  async delayPromisesIfRequired(): Promise<void> {
    if (envLatePromises === 0) {
      return;
    }
    /* eslint-disable-next-line no-console */
    console.log(`Delaying promises by ${envLatePromises}ms`);
    await this.evaluate(delay => {
      global.Promise = class<T> extends Promise<T>{
        constructor(
            executor: (resolve: (value: T|PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void) {
          super((resolve, reject) => {
            executor(
                value => setTimeout(() => resolve(value), delay), reason => setTimeout(() => reject(reason), delay));
          });
        }
      };
    }, envLatePromises);
  }

  #heartbeatInterval: ReturnType<typeof setInterval> = -1 as unknown as ReturnType<typeof setInterval>;
  /**
   * Evaluates a script in the page every second
   * to detect possible timeouts.
   */
  #startHeartbeat(): void {
    const url = this.page.url();
    this.#heartbeatInterval = setInterval(async () => {
      // 1 - success, -1 - eval error, -2 - eval timeout.
      const status = await Promise.race([
        this.page.evaluate(() => 1).catch(() => {
          return -1;
        }),
        new Promise<number>(resolve => setTimeout(() => resolve(-2), 1000))
      ]);
      if (status <= 0) {
        clearInterval(this.#heartbeatInterval);
      }
      if (status === -2) {
        console.error(`heartbeat(${url}): failed with ${status}`);
      }
    }, 2000);
  }

  async throttleCPUIfRequired(): Promise<void> {
    if (TestConfig.cpuThrottle === 1) {
      return;
    }
    /* eslint-disable-next-line no-console */
    console.log(`Throttling CPU: ${TestConfig.cpuThrottle}x slowdown`);
    const client = await this.#getCDPSession();
    await client.send('Emulation.setCPUThrottlingRate', {
      rate: TestConfig.cpuThrottle,
    });
  }

  override async reload(options?: puppeteer.WaitForOptions) {
    await super.reload(options);
    await this.ensureReadyForTesting();
  }

  /**
   * Use the Runtime.setQueryParamForTesting to mock the parameter before
   * DevTools is loaded.
   *
   * Important information for the implementation:
   * Trying to change the url and then reload or navigate to the new one will
   * hit this check in the back end:
   * https://crsrc.org/c/chrome/browser/devtools/devtools_ui_bindings.cc;l=406?q=devtools_ui_b&ss=chromium
   *
   * @param panel Mocks DevTools URL search params to make it open a specific panel on load.
   * @param canDock Mocks DevTools URL search params to make it think whether it can dock or not.
   * This does not control whether or not the panel can actually dock or not.
   */
  async reloadWithParams({panel, canDock}: DevToolsReloadParams) {
    // evaluateOnNewDocument is ran before all other JS is loaded
    // ES Modules are only resolved once and always resolved asynchronously
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules#other_differences_between_modules_and_classic_scripts
    // This means this will always resolve before DevTools tries to read the values
    const token = await this.page.evaluateOnNewDocument(async (panelName, canDockDevTools) => {
      // @ts-expect-error Evaluated in DevTools context
      const Root = await import('./core/root/root.js');
      if (panelName) {
        Root.Runtime.Runtime.setQueryParamForTesting('panel', panelName);
      }
      if (canDockDevTools) {
        Root.Runtime.Runtime.setQueryParamForTesting('can_dock', `${canDockDevTools}`);
      }
    }, panel, canDock);

    await this.reload();
    await this.page.removeScriptToEvaluateOnNewDocument(token.identifier);
    if (panel) {
      await this.waitFor(`.panel.${panel}`);
    }
  }

  async ensureReadyForTesting() {
    const devToolsVeLogging = {enabled: true, testing: true};
    await this.evaluateOnNewDocument(`globalThis.hostConfigForTesting = ${JSON.stringify({devToolsVeLogging})};`);
    await this.waitForFunction(async () => {
      const result = await this.page.evaluate(`(async function() {
        const Main = await import('./entrypoints/main/main.js');
        return Main.MainImpl.MainImpl.instanceForTest !== null;
      })()`);
      return result;
    });

    await this.evaluate(`
      (async function() {
        const Main = await import('./entrypoints/main/main.js');
        await Main.MainImpl.MainImpl.instanceForTest.readyForTest();
      })();
    `);
  }

  async useSoftMenu() {
    await this.evaluate(() => {
      // @ts-expect-error different context
      DevToolsAPI.setUseSoftMenu(true);
    });
  }

  /**
   * Get a single element handle. Uses `pierce` handler per default for piercing Shadow DOM.
   */
  async $<ElementType extends Element|null = null, Selector extends string = string>(
      selector: Selector, root?: puppeteer.ElementHandle, handler = 'pierce') {
    const rootElement = root ? root : this.page;
    const element = await rootElement.$(`${handler}/${selector}`) as
        puppeteer.ElementHandle<DeducedElementType<ElementType, Selector>>;
    await this.#maybeHighlight(element);
    return element;
  }

  async #maybeHighlight(element: puppeteer.ElementHandle) {
    if (!TestConfig.debug) {
      return;
    }
    if (!element) {
      return;
    }
    if (this.#currentHighlightedElement) {
      await this.#currentHighlightedElement.reset();
    }
    this.#currentHighlightedElement = new HighlightedElement(element);
    await this.#currentHighlightedElement.highlight();
  }

  async performActionOnSelector(selector: string, options: {root?: puppeteer.ElementHandle}, action: Action):
      Promise<puppeteer.ElementHandle> {
    // TODO(crbug.com/1410168): we should refactor waitFor to be compatible with
    // Puppeteer's syntax for selectors.
    const queryHandlers = new Set([
      'pierceShadowText',
      'pierce',
      'aria',
      'xpath',
      'text',
    ]);
    let queryHandler = 'pierce';
    for (const handler of queryHandlers) {
      const prefix = handler + '/';
      if (selector.startsWith(prefix)) {
        queryHandler = handler;
        selector = selector.substring(prefix.length);
        break;
      }
    }
    return await this.waitForFunction(async () => {
      const element = await this.waitFor(selector, options?.root, undefined, queryHandler);
      try {
        await action(element);
        await this.drainTaskQueue();
        return element;
      } catch {
        return undefined;
      }
    });
  }

  async waitFor<ElementType extends Element|null = null, Selector extends string = string>(
      selector: Selector, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope(), handler?: string) {
    return await asyncScope.exec(() => this.waitForFunction(async () => {
      const element = await this.$<ElementType, typeof selector>(selector, root, handler);
      return (element || undefined);
    }, asyncScope), `Waiting for element matching selector '${handler ? `${handler}/` : ''}${selector}'`);
  }

  /**
   * Schedules a task in the frontend page that ensures that previously
   * handled tasks have been handled.
   */
  async drainTaskQueue(): Promise<void> {
    await this.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  }

  async typeText(text: string, opts?: {delay: number}) {
    await this.page.keyboard.type(text, opts);
    await this.drainTaskQueue();
  }

  async click(selector: string, options?: ClickOptions) {
    return await this.performActionOnSelector(
        selector,
        {root: options?.root},
        element => element.click(options?.clickOptions),
    );
  }

  async hover(selector: string, options?: {root?: puppeteer.ElementHandle}) {
    return await this.performActionOnSelector(
        selector,
        {root: options?.root},
        element => element.hover(),
    );
  }

  waitForAria<ElementType extends Element = Element>(
      selector: string, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope()) {
    return this.waitFor<ElementType>(selector, root, asyncScope, 'aria');
  }

  async waitForNone(selector: string, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope(), handler?: string) {
    return await asyncScope.exec(() => this.waitForFunction(async () => {
      const elements = await this.$$(selector, root, handler);
      if (elements.length === 0) {
        return true;
      }
      return false;
    }, asyncScope), `Waiting for no elements to match selector '${handler ? `${handler}/` : ''}${selector}'`);
  }

  /**
   * Get multiple element handles. Uses `pierce` handler per default for piercing Shadow DOM.
   */
  async $$<ElementType extends Element|null = null, Selector extends string = string>(
      selector: Selector, root?: puppeteer.JSHandle, handler = 'pierce') {
    const rootElement = root ? root.asElement() || this.page : this.page;
    const elements = await rootElement.$$(`${handler}/${selector}`) as
        Array<puppeteer.ElementHandle<DeducedElementType<ElementType, Selector>>>;
    return elements;
  }

  /**
   * @deprecated This method is not able to recover from unstable DOM. Use click(selector) instead.
   */
  async clickElement(element: puppeteer.ElementHandle, options?: ClickOptions): Promise<void> {
    // Retries here just in case the element gets connected to DOM / becomes visible.
    await this.waitForFunction(async () => {
      try {
        await element.click(options?.clickOptions);
        await this.drainTaskQueue();
        return true;
      } catch {
        return false;
      }
    });
  }

  waitForElementWithTextContent(textContent: string, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope()) {
    return this.waitFor(textContent, root, asyncScope, 'pierceShadowText');
  }

  async scrollElementIntoView(selector: string, root?: puppeteer.ElementHandle) {
    const element = await this.$(selector, root);

    if (!element) {
      throw new Error(`Unable to find element with selector "${selector}"`);
    }

    await element.evaluate(el => {
      el.scrollIntoView({
        behavior: 'instant',
        block: 'center',
        inline: 'center',
      });
    });
  }

  /**
   * Search for all elements based on their textContent
   *
   * @param textContent The text content to search for.
   * @param root The root of the search.
   */
  async $$textContent(textContent: string, root?: puppeteer.ElementHandle) {
    return await this.$$(textContent, root, 'pierceShadowText');
  }

  waitForNoElementsWithTextContent(textContent: string, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope()) {
    return asyncScope.exec(() => this.waitForFunction(async () => {
      const elems = await this.$$textContent(textContent, root);
      if (elems && elems.length === 0) {
        return true;
      }

      return false;
    }, asyncScope), `Waiting for no elements with textContent '${textContent}'`);
  }

  async withControlOrMetaKey(action: () => Promise<void>, root = this.page) {
    await this.waitForFunction(async () => {
      await root.keyboard.down(CONTROL_OR_META);
      try {
        await action();
        return true;
      } finally {
        await root.keyboard.up(CONTROL_OR_META);
      }
    });
  }

  /**
   * @deprecated This method is not able to recover from unstable DOM. Use hover(selector) instead.
   */
  async hoverElement(element: puppeteer.ElementHandle): Promise<void> {
    // Retries here just in case the element gets connected to DOM / becomes visible.
    await this.waitForFunction(async () => {
      try {
        await element.hover();
        await this.drainTaskQueue();
        return true;
      } catch {
        return false;
      }
    });
  }

  async doubleClick(
      selector: string, options?: {root?: puppeteer.ElementHandle, clickOptions?: puppeteer.ClickOptions}) {
    const passedClickOptions = (options?.clickOptions) || {};
    const clickOptionsWithDoubleClick: puppeteer.ClickOptions = {
      ...passedClickOptions,
      clickCount: 2,
    };
    return await this.click(selector, {
      ...options,
      clickOptions: clickOptionsWithDoubleClick,
    });
  }

  async pasteText(text: string) {
    await this.page.keyboard.sendCharacter(text);
    await this.drainTaskQueue();
  }

  /**
   * Search for an element based on its textContent.
   *
   * @param textContent The text content to search for.
   * @param root The root of the search.
   */
  async $textContent(textContent: string, root?: puppeteer.ElementHandle) {
    return await this.$(textContent, root, 'pierceShadowText');
  }

  async getTextContent<ElementType extends Element = Element>(selector: string, root?: puppeteer.ElementHandle) {
    const text = await (await this.$<ElementType, typeof selector>(selector, root))?.evaluate(node => node.textContent);
    return text ?? undefined;
  }

  async getAllTextContents(selector: string, root?: puppeteer.JSHandle, handler = 'pierce'):
      Promise<Array<string|null>> {
    const allElements = await this.$$(selector, root, handler);
    return await Promise.all(allElements.map(e => e.evaluate(e => e.textContent)));
  }

  /**
   * Match multiple elements based on a selector and return their textContents, but only for those
   * elements that are visible.
   *
   * @param selector jquery selector to match
   * @returns array containing text contents from visible elements
   */
  async getVisibleTextContents(selector: string) {
    const allElements = await this.$$(selector);
    const texts = await Promise.all(
        allElements.map(el => el.evaluate(node => node.checkVisibility() ? node.textContent?.trim() : undefined)));
    return texts.filter(content => typeof (content) === 'string');
  }

  async waitForVisible<ElementType extends Element|null = null, Selector extends string = string>(
      selector: Selector, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope(), handler?: string) {
    return await asyncScope.exec(() => this.waitForFunction(async () => {
      const element = await this.$<ElementType, typeof selector>(selector, root, handler);
      const visible = await element.evaluate(node => node.checkVisibility());
      return visible ? element : undefined;
    }, asyncScope), `Waiting for element matching selector '${handler ? `${handler}/` : ''}${selector}' to be visible`);
  }

  async waitForMany<ElementType extends Element|null = null, Selector extends string = string>(
      selector: Selector, count: number, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope(),
      handler?: string) {
    return await asyncScope.exec(() => this.waitForFunction(async () => {
      const elements = await this.$$<ElementType, typeof selector>(selector, root, handler);
      return elements.length >= count ? elements : undefined;
    }, asyncScope), `Waiting for ${count} elements to match selector '${handler ? `${handler}/` : ''}${selector}'`);
  }

  waitForAriaNone = (selector: string, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope()) => {
    return this.waitForNone(selector, root, asyncScope, 'aria');
  };

  waitForElementsWithTextContent(textContent: string, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope()) {
    return asyncScope.exec(() => this.waitForFunction(async () => {
      const elems = await this.$$textContent(textContent, root);
      if (elems?.length) {
        return elems;
      }

      return undefined;
    }, asyncScope), `Waiting for elements with textContent '${textContent}'`);
  }

  async waitForFunctionWithTries<T>(
      fn: () => Promise<T|undefined>, options: {tries: number} = {
        tries: Number.MAX_SAFE_INTEGER,
      },
      asyncScope = new AsyncScope()) {
    return await asyncScope.exec(async () => {
      let tries = 0;
      while (tries++ < options.tries) {
        const result = await fn();
        if (result) {
          return result;
        }
        await this.timeout(100);
      }
      return undefined;
    });
  }

  async waitForWithTries(
      selector: string, root?: puppeteer.ElementHandle, options: {tries: number} = {
        tries: Number.MAX_SAFE_INTEGER,
      },
      asyncScope = new AsyncScope(), handler?: string) {
    return await asyncScope.exec(() => this.waitForFunctionWithTries(async () => {
      const element = await this.$(selector, root, handler);
      return (element || undefined);
    }, options, asyncScope));
  }

  debuggerStatement() {
    return this.page.evaluate(() => {
      // eslint-disable-next-line no-debugger
      debugger;
    });
  }

  async waitForAnimationFrame() {
    await this.page.waitForFunction(() => {
      return new Promise(resolve => {
        requestAnimationFrame(resolve);
      });
    });
  }

  async activeElement() {
    await this.waitForAnimationFrame();

    return await this.page.evaluateHandle(() => {
      let activeElement = document.activeElement;

      while (activeElement?.shadowRoot) {
        activeElement = activeElement.shadowRoot.activeElement;
      }

      if (!activeElement) {
        throw new Error('No active element found');
      }

      return activeElement;
    });
  }

  async activeElementTextContent() {
    const element = await this.activeElement();
    return await element.evaluate(node => node.textContent);
  }

  async activeElementAccessibleName() {
    const element = await this.activeElement();
    return await element.evaluate(node => node.getAttribute('aria-label') || node.getAttribute('title'));
  }

  async tabForward(page?: puppeteer.Page) {
    await (page ?? this.page).keyboard.press('Tab');
  }

  async tabBackward(page?: puppeteer.Page) {
    const targetPage = page ?? this.page;
    await targetPage.keyboard.down('Shift');
    await targetPage.keyboard.press('Tab');
    await targetPage.keyboard.up('Shift');
  }

  async clickMoreTabsButton(root?: puppeteer.ElementHandle<Element>) {
    await this.click('.tabbed-pane-header-tabs-drop-down-container', {root});
  }

  async closePanelTab(panelTabSelector: string) {
    // Get close button from tab element
    const selector = `${panelTabSelector} > .tabbed-pane-close-button`;
    await this.click(selector);
    await this.waitForNone(selector);
  }

  async closeAllCloseableTabs() {
    // get all closeable tools by looking for the available x buttons on tabs
    const selector = '.tabbed-pane-close-button';
    const allCloseButtons = await this.$$(selector);

    // Get all panel ids
    const panelTabIds = await Promise.all(allCloseButtons.map(button => {
      return button.evaluate(button => button.parentElement ? button.parentElement.id : '');
    }));

    // Close each tab
    for (const tabId of panelTabIds) {
      const selector = `#${tabId}`;
      await this.closePanelTab(selector);
    }
  }

  // Noisy! Do not leave this in your test but it may be helpful
  // when debugging.
  async enableCDPLogging() {
    await this.page.evaluate(() => {
      globalThis.ProtocolClient.test.dumpProtocol = console.log;  // eslint-disable-line no-console
    });
  }

  async enableCDPTracking() {
    await this.page.evaluate(() => {
      globalThis.__messageMapForTest = new Map();
      globalThis.ProtocolClient.test.onMessageSent = (message: {method: string, id: number}) => {
        globalThis.__messageMapForTest.set(message.id, message.method);
      };
      globalThis.ProtocolClient.test.onMessageReceived = (message: {id?: number}) => {
        if (message.id) {
          globalThis.__messageMapForTest.delete(message.id);
        }
      };
    });
  }

  async logOutstandingCDP() {
    await this.page.evaluate(() => {
      for (const entry of globalThis.__messageMapForTest) {
        console.error(entry);
      }
    });
  }

  installEventListener(eventType: string) {
    return this.page.evaluate(eventType => {
      window.__pendingEvents = window.__pendingEvents || new Map();
      window.addEventListener(eventType, (e: Event) => {
        let events = window.__pendingEvents.get(eventType);
        if (!events) {
          events = [];
          window.__pendingEvents.set(eventType, events);
        }
        events.push(e);
      });
    }, eventType);
  }

  getPendingEvents(eventType: string): Promise<Event[]|undefined> {
    return this.page.evaluate(eventType => {
      if (!('__pendingEvents' in window)) {
        return undefined;
      }
      const pendingEvents = window.__pendingEvents.get(eventType);
      window.__pendingEvents.set(eventType, []);
      return pendingEvents;
    }, eventType);
  }

  async hasClass(element: puppeteer.ElementHandle<Element>, classname: string) {
    return await element.evaluate((el, classname) => el.classList.contains(classname), classname);
  }

  async waitForClass(element: puppeteer.ElementHandle<Element>, classname: string) {
    await this.waitForFunction(async () => {
      return await this.hasClass(element, classname);
    });
  }

  async renderCoordinatorQueueEmpty() {
    await this.page.evaluate(() => {
      return new Promise<void>(resolve => {
        const pendingFrames = globalThis.__getRenderCoordinatorPendingFrames();
        if (pendingFrames < 1) {
          resolve();
          return;
        }
        globalThis.addEventListener('renderqueueempty', resolve, {once: true});
      });
    });
  }

  async setCheckBox(selector: string, wantChecked: boolean) {
    const checkbox = await this.waitFor(selector);
    const checked = await checkbox.evaluate(box => (box as HTMLInputElement).checked);
    if (checked !== wantChecked) {
      await this.click(`${selector} + label`);
    }
    assert.strictEqual(await checkbox.evaluate(box => (box as HTMLInputElement).checked), wantChecked);
  }

  async summonSearchBox() {
    await this.pressKey('f', {control: true});
  }

  async readClipboard() {
    await this.page.browserContext().overridePermissions(this.page.url(), ['clipboard-read', 'clipboard-write']);
    const clipboard = await this.page.evaluate(async () => await navigator.clipboard.readText());
    await this.page.browserContext().clearPermissionOverrides();
    return clipboard;
  }

  async setupOverridesFSMocks() {
    await this.evaluateOnNewDocument(`
      Object.defineProperty(window, 'InspectorFrontendHost', {
        configurable: true,
        enumerable: true,
        get() {
            return this._InspectorFrontendHost;
        },
        set(value) {
            this._InspectorFrontendHost = value;
            this._InspectorFrontendHost.fileSystem = null;
            this._InspectorFrontendHost.addFileSystem = (type) => {
              const onFileSystem = (fs) => {
                this._InspectorFrontendHost.fileSystem = fs;
                const fileSystem = {
                  fileSystemName: 'sandboxedRequestedFileSystem',
                  fileSystemPath: '/overrides',
                  rootURL: 'filesystem:devtools://devtools/isolated/',
                  type: 'overrides',
                };
                this._InspectorFrontendHost.events.dispatchEventToListeners('fileSystemAdded', {fileSystem});
              };
              window.webkitRequestFileSystem(window.TEMPORARY, 1024 * 1024, onFileSystem);
            };
            this._InspectorFrontendHost.removeFileSystem = (fileSystemPath) => {
              const removalCallback = (entries) => {
                entries.forEach(entry => {
                  if (entry.isDirectory) {
                    entry.removeRecursively(() => {});
                  } else if (entry.isFile) {
                    entry.remove(() => {});
                  }
                });
              };

              if (this._InspectorFrontendHost.fileSystem) {
                this._InspectorFrontendHost.fileSystem.root.createReader().readEntries(removalCallback);
              }

              this._InspectorFrontendHost.fileSystem = null;
              this._InspectorFrontendHost.events.dispatchEventToListeners('fileSystemRemoved', '/overrides');
            }
            this._InspectorFrontendHost.isolatedFileSystem = (_fileSystemId, _registeredName) => {
              return this._InspectorFrontendHost.fileSystem;
            };
        }
      });
    `);
    await this.reload();
  }

  async #getCDPSession() {
    if (!this.#cdpSession) {
      this.#cdpSession = await this.page.createCDPSession();
    }
    return this.#cdpSession;
  }

  async disableAnimations() {
    const session = await this.#getCDPSession();
    await session.send('Animation.enable');
    await session.send('Animation.setPlaybackRate', {playbackRate: 30_000});
  }

  async enableAnimations() {
    const session = await this.#getCDPSession();
    await session.send('Animation.setPlaybackRate', {playbackRate: 1});
  }

  // Debugging utility to be used around flaky code and hopefully reveal visual glitches.
  // Use it with the rdb wrapper to inspect the collected screenshots after a test failure.
  async captureScreenshot(name?: string) {
    const index = Object.keys(this.screenshotLog).length + 1;
    const fullName = index + ' ' + (name ?? 'screenshot');
    this.screenshotLog[fullName] = await this.screenshot();
  }
}

export interface DevtoolsSettings {
  enabledDevToolsExperiments: string[];
  disabledDevToolsExperiments: string[];
  devToolsSettings: Record<string, unknown>;
  // front_end/ui/legacy/DockController.ts DockState
  dockingMode: 'bottom'|'right'|'left'|'undocked';
}

export const DEFAULT_DEVTOOLS_SETTINGS: DevtoolsSettings = {
  enabledDevToolsExperiments: [],
  disabledDevToolsExperiments: [],
  devToolsSettings: {
    veLogsTestMode: true,
  },
  dockingMode: 'right',
};

/**
 * @internal
 */
async function setDevToolsSettings(devToolsPata: DevToolsPage, settings: Record<string, unknown>) {
  if (!Object.keys(settings).length) {
    return;
  }
  const rawValues = Object.entries(settings).map(value => {
    switch (typeof value[1]) {
      case 'boolean':
        return [value[0], value[1].toString()];
      case 'string':
      case 'number':
      case 'bigint':
        return [value[0], `'${value[1]}'`];
      default:
        return [value[0], JSON.stringify(value[1])];
    }
  });
  const expression = `(async () => {
      const Common = await import('./core/common/common.js');
      var setting;
      ${
      rawValues
          .map(([settingName, value]) => `setting = Common.Settings.Settings.instance().createSetting('${settingName}');
      setting.set(${value})`)
          .join('\n      ')}
    })()`;
  return await devToolsPata.evaluate(expression);
}

/**
 * @internal
 */
async function setDevToolsExperiments(devToolsPage: DevToolsPage, experiments: string[]) {
  if (!experiments.length) {
    return;
  }
  return await devToolsPage.evaluate(async experiments => {
    // @ts-expect-error evaluate in DevTools page
    const Root = await import('./core/root/root.js');
    for (const experiment of experiments) {
      Root.Runtime.experiments.setEnabled(experiment, true);
    }
  }, experiments);
}

/**
 * @internal
 */
async function setDisabledDevToolsExperiments(devToolsPage: DevToolsPage, experiments: string[]) {
  if (!experiments.length) {
    return;
  }
  return await devToolsPage.evaluate(async experiments => {
    // @ts-expect-error evaluate in DevTools page
    const Root = await import('./core/root/root.js');
    for (const experiment of experiments) {
      Root.Runtime.experiments.setEnabled(experiment, false);
    }
  }, experiments);
}

/**
 * @internal
 */
async function setDockingSide(devToolsPage: DevToolsPage, side: string) {
  await devToolsPage.evaluate(`
    (async function() {
      const UI = await import('./ui/legacy/legacy.js');
      UI.DockController.DockController.instance().setDockSide('${side}');
    })();
  `);
}

export async function setupDevToolsPage(
    context: puppeteer.BrowserContext, settings: DevtoolsSettings, inspectedPage: InspectedPage) {
  const session = await context.browser().target().createCDPSession();
  // FIXME: get rid of the reload below and configure
  // the initial DevTools state via the openDevTools command.
  // @ts-expect-error no types yet
  const {targetId} = await session.send('Target.openDevTools', {
    // @ts-expect-error need to expose this via Puppeteer.
    targetId: inspectedPage.page.target()._getTargetInfo().targetId
  });
  // @ts-expect-error need to expose this via Puppeteer.
  const devToolsTarget = await context.waitForTarget(target => target._getTargetInfo().targetId === targetId);
  const frontend = await devToolsTarget?.page();
  if (!frontend) {
    throw new Error('Unable to find frontend target!');
  }
  installPageErrorHandlers(frontend);
  const devToolsPage = new DevToolsPage(frontend);
  await devToolsPage.ensureReadyForTesting();
  await Promise.all([
    devToolsPage.disableAnimations(),
    setDevToolsSettings(devToolsPage, settings.devToolsSettings),
    setDevToolsExperiments(devToolsPage, settings.enabledDevToolsExperiments),
    setDisabledDevToolsExperiments(devToolsPage, settings.disabledDevToolsExperiments),
  ]);
  await devToolsPage.reload();

  await Promise.all([
    devToolsPage.throttleCPUIfRequired(),
    devToolsPage.delayPromisesIfRequired(),
    devToolsPage.useSoftMenu(),
  ]);

  await setDockingSide(devToolsPage, settings.dockingMode);
  return devToolsPage;
}

class HighlightedElement {
  constructor(readonly element: puppeteer.ElementHandle) {
  }

  async reset() {
    await this.element.evaluate(el => {
      if (el instanceof HTMLElement) {
        el.style.outline = '';
      }
    });
  }

  async highlight() {
    await this.element.evaluate(el => {
      if (el instanceof HTMLElement) {
        el.style.outline = '2px solid red';
      }
    });
  }
}

// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {installPageErrorHandlers} from '../../conductor/events.js';
import {TestConfig} from '../../conductor/test_config.js';

import {PageWrapper} from './page-wrapper.js';
import type {InspectedPage} from './target-helper.js';

const envLatePromises = process.env['LATE_PROMISES'] !== undefined ?
    ['true', ''].includes(process.env['LATE_PROMISES'].toLowerCase()) ? 10 : Number(process.env['LATE_PROMISES']) :
    0;

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
   * @param persistReloads If this is true running {@link DevToolsPage.reload} will reloading with
   * the provided options
   */
  async reloadWithParams({panel, canDock}: DevToolsReloadParams, persistReloads = false) {
    if (!panel && !canDock) {
      await this.reload();
      return;
    }

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
    if (!persistReloads) {
      await this.page.removeScriptToEvaluateOnNewDocument(token.identifier);
    }
    if (panel) {
      await this.waitFor(`.panel.${panel}`);
    }
  }

  async ensureReadyForTesting() {
    const devToolsVeLogging = {enabled: true, testing: true};
    await this.evaluateOnNewDocument(`globalThis.hostConfigForTesting = ${JSON.stringify({devToolsVeLogging})};`);
    await this.waitForFunction(async () => {
      try {
        const result = await this.page.evaluate(async function() {
          // @ts-expect-error Executed in DevTools realm
          const Main = await import('./entrypoints/main/main.js');
          return Main.MainImpl.MainImpl.instanceForTest !== null;
        });
        return result;
      } catch (err) {
        // We might be navigating, so we retry execution context destroyed
        // errors.
        if (err.message.startsWith('Execution context was destroyed')) {
          return false;
        }
        throw err;
      }
    });

    await this.evaluate(async () => {
      // @ts-expect-error Executed in DevTools realm
      const Main = await import('./entrypoints/main/main.js');
      await Main.MainImpl.MainImpl.instanceForTest.readyForTest();
    });
  }

  async useSoftMenu() {
    await this.evaluate(() => {
      // @ts-expect-error different context
      DevToolsAPI.setUseSoftMenu(true);
    });
  }

  override async $<ElementType extends Element|null = null, Selector extends string = string>(
      selector: Selector, root?: puppeteer.ElementHandle, handler = 'pierce') {
    const element = await super.$<ElementType, Selector>(selector, root, handler);
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

  debuggerStatement() {
    return this.page.evaluate(() => {
      // eslint-disable-next-line no-debugger
      debugger;
    });
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
        return;
      }
      const pendingEvents = window.__pendingEvents.get(eventType);
      window.__pendingEvents.set(eventType, []);
      return pendingEvents;
    }, eventType);
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
  /**
   * Defined in front_end/ui/legacy/DockController.ts DockState
   */
  dockingMode: 'bottom'|'right'|'left'|'undocked';
  // DevTools panel to open on load
  /**
   * The name of the panel to be loaded initially
   * This persist after {@link DevToolsPage.reload}
   *
   * To reload into a panel use {@link DevToolsPage.reloadWithParams}
   */
  panel?: string;
}

export const DEFAULT_DEVTOOLS_SETTINGS: DevtoolsSettings = {
  enabledDevToolsExperiments: [],
  disabledDevToolsExperiments: [],
  devToolsSettings: {
    veLogsTestMode: true,
  },
  dockingMode: 'right',
  panel: undefined
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

  await devToolsPage.reloadWithParams({panel: settings.panel}, true);

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

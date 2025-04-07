// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {AsyncScope} from '../../conductor/async-scope.js';
import {installPageErrorHandlers} from '../../conductor/events.js';
import {platform} from '../../conductor/platform.js';
import {TestConfig} from '../../conductor/test_config.js';

import {PageWrapper} from './page-wrapper.js';

export type Action = (element: puppeteer.ElementHandle) => Promise<void>;

export interface ClickOptions {
  root?: puppeteer.ElementHandle;
  clickOptions?: puppeteer.ClickOptions;
  maxPixelsFromLeft?: number;
}

const envThrottleRate = process.env['STRESS'] ? 3 : 1;
const envLatePromises = process.env['LATE_PROMISES'] !== undefined ?
    ['true', ''].includes(process.env['LATE_PROMISES'].toLowerCase()) ? 10 : Number(process.env['LATE_PROMISES']) :
    0;

type DeducedElementType<ElementType extends Element|null, Selector extends string> =
    ElementType extends null ? puppeteer.NodeFor<Selector>: ElementType;

export class DevToolsPage extends PageWrapper {
  #currentHighlightedElement?: HighlightedElement;

  async setExperimentEnabled(experiment: string, enabled: boolean) {
    await this.evaluate(`(async () => {
      const Root = await import('./core/root/root.js');
      Root.Runtime.experiments.setEnabled('${experiment}', ${enabled});
    })()`);
  }

  async enableExperiment(experiment: string) {
    await this.setExperimentEnabled(experiment, true);
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

  async throttleCPUIfRequired(): Promise<void> {
    if (envThrottleRate === 1) {
      return;
    }
    /* eslint-disable-next-line no-console */
    console.log(`Throttling CPU: ${envThrottleRate}x slowdown`);
    const client = await this.page.createCDPSession();
    await client.send('Emulation.setCPUThrottlingRate', {
      rate: envThrottleRate,
    });
  }

  async setDevToolsSetting(settingName: string, value: string|boolean) {
    const rawValue = (typeof value === 'boolean') ? value.toString() : `'${value}'`;
    await this.evaluate(`(async () => {
      const Common = await import('./core/common/common.js');
      Common.Settings.Settings.instance().createSetting('${settingName}', ${rawValue});
    })()`);
  }

  async setDockingSide(side: string) {
    await this.evaluate(`
      (async function() {
        const UI = await import('./ui/legacy/legacy.js');
        UI.DockController.DockController.instance().setDockSide('${side}');
      })();
    `);
  }

  async ensureReadyForTesting() {
    await this.page.waitForFunction(`
      (async function() {
        const Main = await import('./entrypoints/main/main.js');
        return Main.MainImpl.MainImpl.instanceForTest !== null;
        })()
        `);
    await this.evaluate(`
      (async function() {
        const Main = await import('./entrypoints/main/main.js');
        await Main.MainImpl.MainImpl.instanceForTest.readyForTest();
      })();
    `);
  }

  async useSoftMenu() {
    await this.page.evaluate('window.DevToolsAPI.setUseSoftMenu(true)');
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
        await this.drainFrontendTaskQueue();
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
    }, asyncScope), `Waiting for element matching selector '${selector}'`);
  }

  /**
   * Schedules a task in the frontend page that ensures that previously
   * handled tasks have been handled.
   */
  async drainFrontendTaskQueue(): Promise<void> {
    await this.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  }

  async waitForFunction<T>(fn: () => Promise<T|undefined>, asyncScope = new AsyncScope(), description?: string) {
    const innerFunction = async () => {
      while (true) {
        AsyncScope.abortSignal?.throwIfAborted();
        const result = await fn();
        AsyncScope.abortSignal?.throwIfAborted();
        if (result) {
          return result;
        }
        await this.timeout(100);
      }
    };
    return await asyncScope.exec(innerFunction, description);
  }

  timeout(duration: number) {
    return new Promise<void>(resolve => setTimeout(resolve, duration));
  }

  async typeText(text: string) {
    await this.page.keyboard.type(text);
    await this.drainFrontendTaskQueue();
  }

  async pressKey(key: puppeteer.KeyInput, modifiers?: {control?: boolean, alt?: boolean, shift?: boolean}) {
    if (modifiers) {
      if (modifiers.control) {
        if (platform === 'mac') {
          // Use command key on mac
          await this.page.keyboard.down('Meta');
        } else {
          await this.page.keyboard.down('Control');
        }
      }
      if (modifiers.alt) {
        await this.page.keyboard.down('Alt');
      }
      if (modifiers.shift) {
        await this.page.keyboard.down('Shift');
      }
    }
    await this.page.keyboard.press(key);
    if (modifiers) {
      if (modifiers.shift) {
        await this.page.keyboard.up('Shift');
      }
      if (modifiers.alt) {
        await this.page.keyboard.up('Alt');
      }
      if (modifiers.control) {
        if (platform === 'mac') {
          // Use command key on mac
          await this.page.keyboard.up('Meta');
        } else {
          await this.page.keyboard.up('Control');
        }
      }
    }
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
    }, asyncScope), `Waiting for no elements to match selector '${selector}'`);
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
        await this.drainFrontendTaskQueue();
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
      el.scrollIntoView();
    });
  }
}

export interface DevtoolsSettings {
  enabledDevToolsExperiments: string[];
  devToolsSettings: {[key: string]: string|boolean};
  dockingMode: string;
}

export const DEFAULT_DEVTOOLS_SETTINGS = {
  enabledDevToolsExperiments: [],
  devToolsSettings: {
    isUnderTest: true,
  },
  dockingMode: 'right',
};

export async function setupDevToolsPage(context: puppeteer.BrowserContext, settings: DevtoolsSettings) {
  const devToolsTarget = await context.waitForTarget(target => target.url().startsWith('devtools://'));
  const frontend = await devToolsTarget?.page();
  if (!frontend) {
    throw new Error('Unable to find frontend target!');
  }
  installPageErrorHandlers(frontend);
  const devToolsPage = new DevToolsPage(frontend);
  await devToolsPage.ensureReadyForTesting();
  for (const key in settings.devToolsSettings) {
    await devToolsPage.setDevToolsSetting(key, settings.devToolsSettings[key]);
  }
  for (const experiment of settings.enabledDevToolsExperiments) {
    await devToolsPage.enableExperiment(experiment);
  }
  await devToolsPage.reload();
  await devToolsPage.ensureReadyForTesting();
  await devToolsPage.throttleCPUIfRequired();
  await devToolsPage.delayPromisesIfRequired();
  await devToolsPage.useSoftMenu();
  await devToolsPage.setDockingSide(settings.dockingMode);
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

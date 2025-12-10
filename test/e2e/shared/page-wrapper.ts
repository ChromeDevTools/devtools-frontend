// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {AsyncScope} from '../../conductor/async-scope.js';
import {platform} from '../../conductor/platform.js';

const CONTROL_OR_META = platform === 'mac' ? 'Meta' : 'Control';

export type Action = (element: puppeteer.ElementHandle) => Promise<void>;

export interface ClickOptions {
  root?: puppeteer.ElementHandle;
  clickOptions?: puppeteer.ClickOptions;
  maxPixelsFromLeft?: number;
}

type DeducedElementType<ElementType extends Element|null, Selector extends string> =
    ElementType extends null ? puppeteer.NodeFor<Selector>: ElementType;

export class PageWrapper {
  page: puppeteer.Page;
  evaluate: puppeteer.Page['evaluate'];
  waitForNavigation: puppeteer.Page['waitForNavigation'];
  bringToFront: puppeteer.Page['bringToFront'];
  evaluateOnNewDocument: puppeteer.Page['evaluateOnNewDocument'];
  removeScriptToEvaluateOnNewDocument: puppeteer.Page['removeScriptToEvaluateOnNewDocument'];
  locator: puppeteer.Page['locator'];

  constructor(page: puppeteer.Page) {
    this.page = page;
    this.evaluate = page.evaluate.bind(page);
    this.bringToFront = page.bringToFront.bind(page);
    this.evaluateOnNewDocument = page.evaluateOnNewDocument.bind(page);
    this.removeScriptToEvaluateOnNewDocument = page.removeScriptToEvaluateOnNewDocument.bind(page);
    this.waitForNavigation = page.waitForNavigation.bind(page);
    this.locator = page.locator.bind(page);
  }

  /**
   * `waitForFunction` runs in the test context and not in the page
   * context. If you want to evaluate code on the page, use
   * {@link PageWrapper.evaluate} within the `waitForFunction` callback.
   */
  async waitForFunction<T>(
      fn: () => T | undefined | Promise<T|undefined>, asyncScope = new AsyncScope(), description?: string) {
    const signal = AsyncScope.abortSignal;
    const innerFunction = async () => {
      while (true) {
        signal?.throwIfAborted();
        const result = await fn();
        signal?.throwIfAborted();
        if (result) {
          return result as Exclude<NonNullable<T>, false>;
        }
        await this.timeout(100);
      }
    };
    return await asyncScope.exec(innerFunction, description);
  }

  timeout(duration: number) {
    return new Promise<void>(resolve => setTimeout(resolve, duration));
  }

  async screenshot(): Promise<string> {
    await this.bringToFront();
    return await this.page.screenshot({
      encoding: 'base64',
    });
  }

  async reload(options?: puppeteer.WaitForOptions) {
    await this.page.reload(options);
  }

  async raf() {
    await this.page.evaluate(() => {
      return new Promise(resolve => window.requestAnimationFrame(resolve));
    });
  }

  /**
   * Schedules a task in the page that ensures that previously
   * handled tasks have been handled.
   */
  async drainTaskQueue(): Promise<void> {
    await this.evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
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

  /**
   * Get a single element handle. Uses `pierce` handler per default for piercing Shadow DOM.
   */
  async $<ElementType extends Element|null = null, Selector extends string = string>(
      selector: Selector, root?: puppeteer.ElementHandle, handler = 'pierce') {
    const rootElement = root ? root : this.page;
    const element = await rootElement.$(`${handler}/${selector}`) as
        puppeteer.ElementHandle<DeducedElementType<ElementType, Selector>>;
    return element;
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

  async waitFor<ElementType extends Element|null = null, Selector extends string = string>(
      selector: Selector, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope(), handler?: string) {
    return await asyncScope.exec(() => this.waitForFunction(async () => {
      const element = await this.$<ElementType, typeof selector>(selector, root, handler);
      return (element || undefined);
    }, asyncScope), `Waiting for element matching selector '${handler ? `${handler}/` : ''}${selector}'`);
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

  async click(selector: string, options?: ClickOptions) {
    return await this.performActionOnSelector(
        selector,
        {root: options?.root},
        element => element.click(options?.clickOptions),
    );
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
}

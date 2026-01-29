// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {AsyncScope} from '../../conductor/async-scope.js';
import {platform} from '../../conductor/platform.js';

export type Action = (element: puppeteer.ElementHandle) => Promise<void>;
export interface KeyModifiers {
  /**
   * On Mac this presses the Meta key
   */
  control?: boolean;
  alt?: boolean;
  shift?: boolean;
}
export interface ClickOptions {
  root?: puppeteer.ElementHandle;
  modifiers?: KeyModifiers;
  clickOptions?: puppeteer.ClickOptions;
  maxPixelsFromLeft?: number;
}

export interface Logger {
  log(message: string): void;
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
      fn: (logger: Logger) => T | undefined | Promise<T|undefined>, asyncScope = new AsyncScope(),
      description?: string) {
    const signal = AsyncScope.abortSignal;
    const innerFunction = async (messages: string[]) => {
      let iterations = 0;
      const logger = {log: messages.push.bind(messages)};
      while (true) {
        signal?.throwIfAborted();
        const messagesBefore = messages.length;
        const result = await fn(logger);
        // On completing an iteration, remove any leftover messages from the previous iteration.
        messages.splice(0, messagesBefore);
        messages.push(`Iteration ${iterations++} result: ${result ? 'success' : `${result}`}`);
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

  async pressKey(key: puppeteer.KeyInput, modifiers?: KeyModifiers) {
    await this.#withKeyModifiers(async () => {
      await this.page.keyboard.press(key);
    }, modifiers ?? {});
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
    const rootElement = root?.asElement() ?? this.page;
    const elements = await rootElement.$$(`${handler}/${selector}`) as
        Array<puppeteer.ElementHandle<DeducedElementType<ElementType, Selector>>>;
    return elements;
  }

  async waitFor<ElementType extends Element|null = null, Selector extends string = string>(
      selector: Selector, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope(), handler?: string) {
    return await asyncScope.exec(() => this.waitForFunction(async () => {
      const element = await this.$<ElementType, typeof selector>(selector, root, handler);
      return (element || undefined);
    }, asyncScope, `Waiting for element matching selector '${handler ? `${handler}/` : ''}${selector}'`));
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
    return await this.waitForFunction(async logger => {
      const element = await this.waitFor(selector, options?.root, undefined, queryHandler);
      try {
        await action(element);
        await this.drainTaskQueue();
        return element;
      } catch (err) {
        logger.log(`Threw error: ${err.message}`);
        return undefined;
      }
    }, undefined, `Performing action on ${selector}`);
  }

  async click(selector: string, options?: ClickOptions) {
    return await this.#withKeyModifiers(async () => {
      return await this.performActionOnSelector(
          selector,
          {root: options?.root},
          element => element.click(options?.clickOptions),
      );
    }, options?.modifiers ?? {});
  }

  async #withKeyModifiers<T>(action: () => Promise<T>, modifiers: KeyModifiers):
      Promise<Exclude<NonNullable<T>, false>> {
    return (await this.waitForFunction(async () => {
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

      try {
        const result = await action();
        return result ?? true;
      } finally {
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
    }) as Exclude<NonNullable<T>, false>);
  }

  async typeText(text: string, opts?: {delay: number}) {
    await this.page.keyboard.type(text, opts);
    await this.drainTaskQueue();
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
    }, asyncScope, `Waiting for no elements to match selector '${handler ? `${handler}/` : ''}${selector}'`));
  }

  /**
   * @deprecated This method is not able to recover from unstable DOM. Use click(selector) instead.
   */
  async clickElement(element: puppeteer.ElementHandle, options?: ClickOptions):
      Promise<void> {  // Retries here just in case the element gets connected to DOM / becomes visible.
    await this.#withKeyModifiers(async () => {
      await this.waitForFunction(async () => {
        try {
          await element.click(options?.clickOptions);
          await this.drainTaskQueue();
          return true;
        } catch {
          return false;
        }
      }, undefined, 'Clicking element');
    }, options?.modifiers ?? {});
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
      const elements = await this.$$textContent(textContent, root);
      if (elements?.length === 0) {
        return true;
      }

      return false;
    }, asyncScope, `Waiting for no elements with textContent '${textContent}'`));
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
    }, asyncScope, `Waiting for element matching selector '${handler ? `${handler}/` : ''}${selector}' to be visible`));
  }

  async waitForMany<ElementType extends Element|null = null, Selector extends string = string>(
      selector: Selector, count: number, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope(),
      handler?: string) {
    return await asyncScope.exec(() => this.waitForFunction(async () => {
      const elements = await this.$$<ElementType, typeof selector>(selector, root, handler);
      return elements.length >= count ? elements : undefined;
    }, asyncScope, `Waiting for ${count} elements to match selector '${handler ? `${handler}/` : ''}${selector}'`));
  }

  async waitForManyWithTries<ElementType extends Element|null = null, Selector extends string = string>(
      selector: Selector, count: number, tries: number, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope(),
      handler?: string) {
    return await asyncScope.exec(
        () => this.waitForFunctionWithTries(
            async () => {
              const elements = await this.$$<ElementType, typeof selector>(selector, root, handler);
              return elements.length >= count ? elements : undefined;
            },
            {tries}, asyncScope),
        `Waiting for ${count} elements to match selector '${handler ? `${handler}/` : ''}${selector}'`);
  }

  waitForAriaNone = (selector: string, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope()) => {
    return this.waitForNone(selector, root, asyncScope, 'aria');
  };

  waitForElementsWithTextContent(textContent: string, root?: puppeteer.ElementHandle, asyncScope = new AsyncScope()) {
    return asyncScope.exec(() => this.waitForFunction(async () => {
      const elements = await this.$$textContent(textContent, root);
      if (elements?.length) {
        return elements;
      }

      return;
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
          return result as Exclude<NonNullable<T>, false>;
        }
        await this.timeout(100);
      }
      return;
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

  async activeElement() {
    await this.raf();

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

  async tabForward() {
    await this.page.keyboard.press('Tab');
  }

  async tabBackward() {
    await this.pressKey('Tab', {shift: true});
  }

  async hasClass(element: puppeteer.ElementHandle<Element>, classname: string) {
    return await element.evaluate((el, classname) => el.classList.contains(classname), classname);
  }

  async waitForClass(element: puppeteer.ElementHandle<Element>, classname: string) {
    await this.waitForFunction(async () => {
      return await this.hasClass(element, classname);
    }, undefined, `Waiting for element to have class '${classname}'`);
  }

  waitForTextNotMatching(element: puppeteer.ElementHandle<Element>, regex: RegExp): Promise<string> {
    return this.waitForFunction(async () => {
      const text = await element.evaluate(e => e.textContent);
      if (text.match(regex)) {
        return;
      }
      return text;
    }, undefined, `Waiting for text not to match '${regex}'`);
  }

  async setCheckBox(selector: string, wantChecked: boolean) {
    const checkbox = await this.waitFor<HTMLInputElement>(selector);
    const checked = await checkbox.evaluate(box => box.checked);
    if (checked !== wantChecked) {
      await this.click(`${selector} + label`);
    }
    assert.strictEqual(
        await checkbox.evaluate(box => box.checked), wantChecked, `Expected checkbox to be ${wantChecked}`);
  }
}

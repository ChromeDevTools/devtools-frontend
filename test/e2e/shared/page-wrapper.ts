// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {AsyncScope} from '../../conductor/async-scope.js';
import {platform} from '../../conductor/platform.js';

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
}

// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// use require here due to
// https://github.com/evanw/esbuild/issues/587#issuecomment-901397213
import puppeteer = require('puppeteer');

import {loadEmptyPageAndWaitForContent} from './frontend_tab.js';

/**
 * Wrapper class around `puppeteer.Page` that helps with setting up and
 * managing a tab that can be inspected by the DevTools frontend.
 */
export class TargetTab {
  private constructor(readonly page: puppeteer.Page) {
  }

  static async create(browser: puppeteer.Browser): Promise<TargetTab> {
    const page = await browser.newPage();
    await loadEmptyPageAndWaitForContent(page);
    return new TargetTab(page);
  }

  async reset(): Promise<void> {
    await loadEmptyPageAndWaitForContent(this.page);
  }

  targetId(): string {
    // TODO(crbug.com/1297458): Replace private property access with public getter once available in puppeteer.
    return this.page.target()._targetId;
  }
}

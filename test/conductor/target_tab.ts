// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// use require here due to
// https://github.com/evanw/esbuild/issues/587#issuecomment-901397213
import puppeteer = require('puppeteer-core');

import {loadEmptyPageAndWaitForContent} from './frontend_tab.js';

/**
 * Wrapper class around `puppeteer.Page` that helps with setting up and
 * managing a tab that can be inspected by the DevTools frontend.
 */
export class TargetTab {
  private constructor(readonly page: puppeteer.Page, readonly tabTargetId: string) {
  }

  static async create(browser: puppeteer.Browser): Promise<TargetTab> {
    const host = (new URL(browser.wsEndpoint())).host;
    const frameTarget = new Promise<puppeteer.Target>(resolve => browser.once('targetcreated', resolve));
    const jsonNewReponse = await fetch(`http://${host}/json/new?${escape('about:blank')}&for_tab`, {method: 'PUT'});
    const tabTarget = await jsonNewReponse.json();
    const page = await frameTarget.then(t => t.page()) as puppeteer.Page;
    await loadEmptyPageAndWaitForContent(page);

    return new TargetTab(page, tabTarget.id);
  }

  async reset(): Promise<void> {
    await loadEmptyPageAndWaitForContent(this.page);
    const client = await this.page.target().createCDPSession();
    await client.send('ServiceWorker.enable');
    await client.send('ServiceWorker.stopAllWorkers');
    await client.detach();
  }

  targetId(): string {
    return this.tabTargetId;
  }
}

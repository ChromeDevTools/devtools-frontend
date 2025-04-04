// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

export class PageWrapper {
  page: puppeteer.Page;
  evaluate: puppeteer.Page['evaluate'];
  bringToFront: puppeteer.Page['bringToFront'];

  constructor(page: puppeteer.Page) {
    this.page = page;
    this.evaluate = page.evaluate.bind(page);
    this.bringToFront = page.bringToFront.bind(page);
  }

  async screenshot(): Promise<string> {
    await this.bringToFront();
    return await this.page.screenshot({
      encoding: 'base64',
    });
  }

  async reload() {
    await this.page.reload();
  }
}

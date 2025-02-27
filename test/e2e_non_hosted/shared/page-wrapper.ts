// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

export class PageWrapper {
  page: puppeteer.Page;
  evaluate: puppeteer.Page['evaluate'];
  bringToFront: puppeteer.Page['bringToFront'];
  waitForFunction: puppeteer.Page['waitForFunction'];

  constructor(p: puppeteer.Page) {
    this.page = p;
    this.evaluate = p.evaluate.bind(p);
    this.bringToFront = p.bringToFront.bind(p);
    this.waitForFunction = p.waitForFunction.bind(p);
  }

  async screenshot() {
    const opts = {
      encoding: 'base64' as 'base64',
    };
    await this.bringToFront();
    return await this.page.screenshot(opts);
  }
}

// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {PageWrapper} from './page-wrapper.js';

export class InspectedPage extends PageWrapper {
  constructor(page: puppeteer.Page, readonly serverPort: number) {
    super(page);
    this.serverPort = serverPort;
  }
  async goTo(url: string, options: puppeteer.WaitForOptions = {}) {
    await this.page.goto(url, options);
  }

  async goToResource(path: string, options: puppeteer.WaitForOptions = {}) {
    await this.goTo(`${this.getResourcesPath()}/${path}`, options);
  }

  getResourcesPath(host = 'localhost') {
    return `https://${host}:${this.serverPort}/test/e2e/resources`;
  }
}

export async function setupInspectedPage(context: puppeteer.BrowserContext, serverPort: number) {
  const page = await context.newPage();
  return new InspectedPage(page, serverPort);
}

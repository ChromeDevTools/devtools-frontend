// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
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

  async goToHtml(html: string) {
    return await this.goTo(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  }

  waitForSelector<Selector extends string>(selector: Selector, options?: puppeteer.WaitForSelectorOptions) {
    return this.page.waitForSelector(selector, options);
  }

  async goToResource(path: string, options: puppeteer.WaitForOptions = {}) {
    await this.goTo(`${this.getResourcesPath()}/${path}`, options);
  }

  async goToResourceWithCustomHost(host: string, path: string) {
    assert.isTrue(host.endsWith('.test'), 'Only custom hosts with a .test domain are allowed.');
    await this.goTo(`${this.getResourcesPath(host)}/${path}`);
  }

  getResourcesPath(host = 'localhost') {
    return `${this.domain(host)}/test/e2e/resources`;
  }

  domain(host = 'localhost') {
    return `https://${host}:${this.serverPort}`;
  }

  getOopifResourcesPath() {
    return this.getResourcesPath('devtools.oopif.test');
  }

  async overridePermissions(permissions: puppeteer.Permission[]) {
    await this.page.browserContext().overridePermissions(`https://localhost:${this.serverPort}`, permissions);
  }
}

export async function setupInspectedPage(context: puppeteer.BrowserContext, serverPort: number) {
  const page = await context.newPage();
  return new InspectedPage(page, serverPort);
}

// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';
import type * as puppeteer from 'puppeteer-core';

import type {TestStateProvider} from '../conductor/mocha-interface-helpers.js';
import {StateProvider} from '../e2e/conductor/state-provider.js';
import {setupInspectedPage} from '../e2e/shared/target-helper.js';

import {createTargetUniverse} from './TargetUniverse.js';

export class ApiStateProvider implements TestStateProvider<API.State, API.SuiteSettings> {
  static instance = new ApiStateProvider();
  #suiteToSettingsMap = new WeakMap<Mocha.Suite, API.SuiteSettings>();
  #stateToCleanupMap = new WeakMap<API.State, () => void>();

  registerSuiteSettings(suite: Mocha.Suite, suiteSettings: API.SuiteSettings): void {
    this.#suiteToSettingsMap.set(suite, suiteSettings);
  }

  async prepareSuite(suite: Mocha.Suite): Promise<void> {
    await StateProvider.instance.resolveBrowser(suite);
  }

  async resolveBrowser(suite?: Mocha.Suite): Promise<void> {
    if (suite) {
      await StateProvider.instance.resolveBrowser(suite);
    }
  }

  #getSettings(suite: Mocha.Suite): API.SuiteSettings|undefined {
    return this.#suiteToSettingsMap.get(suite);
  }

  async setupInspectedPage(context: puppeteer.BrowserContext, serverPort: number) {
    return await setupInspectedPage(context, serverPort);
  }

  async createState(suite: Mocha.Suite): Promise<API.State> {
    await this.prepareSuite(suite);
    const browserWrapper = suite.browser;
    if (!browserWrapper || !browserWrapper.connected) {
      throw new Error('Browser disconnected unexpectedly');
    }
    const browser = browserWrapper.browser;

    const settings = this.#getSettings(suite);
    const browsingContext = await browser.createBrowserContext();
    const inspectedPage = await this.setupInspectedPage(browsingContext, StateProvider.serverPort);

    const targetUrl = settings?.targetUrl ?? `${inspectedPage.domain()}/test/e2e/resources/empty.html`;
    await inspectedPage.goTo(targetUrl);
    const session = await inspectedPage.page.createCDPSession();

    const targetUniverse = await createTargetUniverse(session, settings?.creationOptions);

    const state: API.State = {
      inspectedPage,
      universe: targetUniverse.universe,
    };
    this.#stateToCleanupMap.set(state, targetUniverse.cleanup);
    return state;
  }

  async cleanupState(state: API.State): Promise<void> {
    try {
      const cleanup = this.#stateToCleanupMap.get(state);
      this.#stateToCleanupMap.delete(state);
      cleanup?.();
    } catch (e) {
      console.error('Unexpected error during target universe cleanup', e);
    }
    try {
      await state.inspectedPage.page.browserContext().close();
    } catch (e) {
      console.error('Unexpected error during cleanup', e);
    }
  }

  async closeBrowser() {
    await StateProvider.instance.closeBrowsers();
  }
}

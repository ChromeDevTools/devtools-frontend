// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';
import * as puppeteer from 'puppeteer-core';

import {querySelectorShadowTextAll, querySelectorShadowTextOne} from '../../conductor/custom-query-handlers.js';
import {TestConfig} from '../../conductor/test_config.js';
import {startServer} from '../../conductor/test_server.js';
import {type BrowserWrapper, DEFAULT_BROWSER_SETTINGS, Launcher} from '../shared/browser-helper.js';
import {DEFAULT_DEVTOOLS_SETTINGS, setupDevToolsPage} from '../shared/frontend-helper.js';
import {setupInspectedPage} from '../shared/target-helper.js';

const DEFAULT_SETTINGS = {
  ...DEFAULT_BROWSER_SETTINGS,
  ...DEFAULT_DEVTOOLS_SETTINGS
};

export class StateProvider {
  static instance = new StateProvider();

  #settingsCallbackMap = new Map<Mocha.Suite, E2E.SuiteSettings>();
  #browserMap = new Map<string, BrowserWrapper>();
  static serverPort: number;

  private constructor() {
  }

  registerSettingsCallback(suite: Mocha.Suite, suiteSettings: E2E.SuiteSettings) {
    this.#settingsCallbackMap.set(suite, suiteSettings);
  }

  async resolveBrowser(suite: Mocha.Suite) {
    if (!StateProvider.serverPort) {
      StateProvider.serverPort = await StateProvider.#globalSetup();
    }
    const settings = await this.#getSettings(suite);
    const browserSettings = {
      enabledBlinkFeatures: (settings.enabledBlinkFeatures ?? []).toSorted(),
      disabledFeatures: (settings.disabledFeatures ?? []).toSorted(),
    };
    const browserKey = JSON.stringify(browserSettings);
    let browser = this.#browserMap.get(browserKey);
    if (!browser) {
      browser = await Launcher.browserSetup(browserSettings);
      this.#browserMap.set(browserKey, browser);
    }
    // Suite needs to be aware of the browser instance to be able to create the
    // full state for the tests
    suite.browser = browser;
  }

  async getState(suite: Mocha.Suite) {
    const settings = await this.#getSettings(suite);
    const browser = suite.browser;
    const browsingContext = await browser.createBrowserContext();
    const inspectedPage = await setupInspectedPage(browsingContext, StateProvider.serverPort);
    const devToolsPage = await setupDevToolsPage(browsingContext, settings);
    const state = {
      devToolsPage,
      inspectedPage,
      browser,
    };
    // Suite needs to be aware of the full state to be able to capture
    // screenshots on failures
    suite.state = state;
    return {state, browsingContext};
  }

  async #getSettings(suite: Mocha.Suite): Promise<E2E.HarnessSettings> {
    const settings = this.#settingsCallbackMap.get(suite);
    if (settings) {
      return mergeSettings(settings, DEFAULT_SETTINGS);
    }
    return DEFAULT_SETTINGS;
  }

  static async #globalSetup() {
    const serverPort = Number(await startServer(TestConfig.serverType, []));
    // eslint-disable-next-line no-console
    console.log(`Started ${TestConfig.serverType} server on port ${serverPort}`);
    puppeteer.Puppeteer.registerCustomQueryHandler('pierceShadowText', {
      queryOne: querySelectorShadowTextOne as ((node: Node, selector: string) => Node | null),
      queryAll: querySelectorShadowTextAll as unknown as ((node: Node, selector: string) => Node[]),
    });
    return serverPort;
  }

  async closeBrowsers() {
    await Promise.all([...this.#browserMap.values()].map(async browser => {
      await browser.browser.close();
    }));
  }
}

export function mergeSettings(s1: E2E.SuiteSettings, s2: E2E.HarnessSettings): E2E.HarnessSettings {
  function mergeAsSet<T>(arr1?: T[], arr2?: T[]) {
    return Array.from(new Set(arr1 ?? []).union(new Set(arr2 ?? [])));
  }

  return {
    enabledBlinkFeatures: mergeAsSet(s1.enabledBlinkFeatures, s2.enabledBlinkFeatures),
    disabledFeatures: mergeAsSet(s1.disabledFeatures, s2.disabledFeatures),
    enabledDevToolsExperiments: mergeAsSet(s1.enabledDevToolsExperiments, s2.enabledDevToolsExperiments),
    devToolsSettings: {...(s2.devToolsSettings ?? {}), ...(s1.devToolsSettings ?? {})},
    dockingMode: s1.dockingMode ?? s2.dockingMode,
  };
}

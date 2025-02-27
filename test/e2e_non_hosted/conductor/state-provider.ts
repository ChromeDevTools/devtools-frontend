// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';
import * as puppeteer from 'puppeteer-core';

import {querySelectorShadowTextAll, querySelectorShadowTextOne} from '../../conductor/custom-query-handlers.js';
import {dumpCollectedErrors} from '../../conductor/events.js';
import {TestConfig} from '../../conductor/test_config.js';
import {startServer} from '../../conductor/test_server.js';
import {type BrowserWrapper, DEFAULT_BROWSER_SETTINGS, Launcher} from '../shared/browser-helper.js';
import {DEFAULT_DEVTOOLS_SETTINGS, setupDevToolsPage} from '../shared/frontend-helper.js';
import {setupInspectedPage} from '../shared/target-helper.js';

import type {HarnessSettings, SuiteSettings, TestCallbackWithState} from './mocha-interface-helpers.js';

class DebugModeNotice {
  /* eslint-disable no-console */
  noticeDelivered = false;

  async notice() {
    // Pause when running interactively in debug mode. This is mututally
    // exclusive with parallel mode.
    // We need to pause after `resetPagesBetweenTests`, otherwise the DevTools
    // and target tab are not available to us to set breakpoints in.
    // We still only want to pause once, so we remember that we did pause.
    if (TestConfig.debug && !this.noticeDelivered) {
      this.noticeDelivered = true;
      console.log('Running in debug mode.');
      console.log(' - Press enter to run the test.');
      console.log(' - Press ctrl + c to quit.');
      await new Promise<void>(resolve => {
        const {stdin} = process;
        stdin.on('data', () => {
          stdin.pause();
          resolve();
        });
      });
    }
  }
}

const DEFAULT_SETTINGS = {
  ...DEFAULT_BROWSER_SETTINGS,
  ...DEFAULT_DEVTOOLS_SETTINGS
};

export class StateProvider {
  static instance = new StateProvider();

  debugNotice: DebugModeNotice;
  settingsCallbackMap: Map<Mocha.Suite, SuiteSettings>;
  browserMap: Map<string, BrowserWrapper>;
  static serverPort: Number;

  private constructor() {
    this.debugNotice = new DebugModeNotice();
    this.settingsCallbackMap = new Map();
    this.browserMap = new Map();
  }

  registerSettingsCallback(suite: Mocha.Suite, suiteSettings: SuiteSettings) {
    this.settingsCallbackMap.set(suite, suiteSettings);
  }

  async callWithState(suite: Mocha.Suite, testFn: TestCallbackWithState) {
    await this.debugNotice.notice();
    const {state, browsingContext} = await this.getState(suite);
    try {
      return await testFn(state);
    } finally {
      await browsingContext.close();
      dumpCollectedErrors();
    }
  }

  async resolveBrowser(suite: Mocha.Suite) {
    if (!StateProvider.serverPort) {
      StateProvider.serverPort = await StateProvider.globalSetup();
    }
    const settings = await this.getSettings(suite);
    const browserSettings = {
      enabledBlinkFeatures: (settings.enabledBlinkFeatures ?? []).toSorted(),
      disabledFeatures: (settings.disabledFeatures ?? []).toSorted(),
    };
    const browserKey = JSON.stringify(browserSettings);
    let browser = this.browserMap.get(browserKey);
    if (!browser) {
      browser = await Launcher.browserSetup(browserSettings, StateProvider.serverPort);
      this.browserMap.set(browserKey, browser);
    }
    // Suite needs to be aware of the browser instance to be able to create the
    // full state for the tests
    suite.browser = browser;
  }

  private async getState(suite: Mocha.Suite) {
    const settings = await this.getSettings(suite);
    const browser = suite.browser;
    const browsingContext = await browser.createBrowserContext();
    const inspectedPage = await setupInspectedPage(browsingContext);
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

  private async getSettings(suite: Mocha.Suite): Promise<HarnessSettings> {
    const settings = this.settingsCallbackMap.get(suite);
    if (settings) {
      return mergeSettings(settings, DEFAULT_SETTINGS);
    }
    return DEFAULT_SETTINGS;
  }

  /* eslint-disable no-console */
  private static async globalSetup() {
    const serverPort = Number(await startServer(TestConfig.serverType, []));
    console.log(`Started ${TestConfig.serverType} server on port ${serverPort}`);
    puppeteer.Puppeteer.registerCustomQueryHandler('pierceShadowText', {
      queryOne: querySelectorShadowTextOne as ((node: Node, selector: string) => Node | null),
      queryAll: querySelectorShadowTextAll as unknown as ((node: Node, selector: string) => Node[]),
    });
    return serverPort;
  }

  async closeBrowsers() {
    await this.browserMap.forEach(async (browser: BrowserWrapper) => {
      await browser.browser.close();
    });
  }
}

export function mergeSettings(s1: SuiteSettings, s2: HarnessSettings): HarnessSettings {
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

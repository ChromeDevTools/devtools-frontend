// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Mocha from 'mocha';
import * as puppeteer from 'puppeteer-core';

import {querySelectorShadowTextAll, querySelectorShadowTextOne} from '../../conductor/custom-query-handlers.js';
import type {TestStateProvider} from '../../conductor/mocha-interface-helpers.js';
import {ScreenshotError} from '../../conductor/screenshot-error.js';
import {TestConfig} from '../../conductor/test_config.js';
import {startServer} from '../../conductor/test_server.js';
import {
  type BrowserSettings,
  type BrowserWrapper,
  DEFAULT_BROWSER_SETTINGS,
  Launcher,
} from '../shared/browser-helper.js';
import {DEFAULT_DEVTOOLS_SETTINGS, setupDevToolsPage} from '../shared/frontend-helper.js';
import {setupInspectedPage} from '../shared/target-helper.js';

const DEFAULT_SETTINGS = {
  ...DEFAULT_BROWSER_SETTINGS,
  ...DEFAULT_DEVTOOLS_SETTINGS,
};

export interface E2EState extends E2E.State {
  browsingContext: puppeteer.BrowserContext;
}

export interface ScreenshotState {
  browser?: {connected: boolean};
  inspectedPage?: {screenshot(options?: {encoding: 'base64'}): Promise<string>};
  devToolsPage?: {screenshot(options?: {encoding: 'base64'}): Promise<string>, screenshotLog?: Record<string, string>};
}

async function takeScreenshots(state: ScreenshotState): Promise<{inspectedPage?: string, devToolsPage?: string}> {
  try {
    // Keep the DevTools page screenshot first to minimize the
    // time between it and the error.
    const devToolsPage = await state.devToolsPage?.screenshot();
    const inspectedPage = await state.inspectedPage?.screenshot();
    return {inspectedPage, devToolsPage};
  } catch (err) {
    console.error('Error taking a screenshot', err);
    return {};
  }
}

export async function screenshotError(state: ScreenshotState, error: Error) {
  if (state.browser && !state.browser.connected) {
    console.error('Browser was disconnected, skipping screenshots');
    return error;
  }

  console.error('Taking screenshots for the error:', error);
  if (!TestConfig.debug) {
    try {
      const screenshotTimeout = 5_000;
      let timer: ReturnType<typeof setTimeout>;
      const {inspectedPage, devToolsPage} = await Promise.race([
        takeScreenshots(state).then(result => {
          clearTimeout(timer);
          return result;
        }),
        new Promise(resolve => {
          timer = setTimeout(resolve, screenshotTimeout);
        }).then(() => {
          console.error(`Could not take screenshots within ${screenshotTimeout}ms.`);
          return {inspectedPage: undefined, devToolsPage: undefined};
        }),
      ]);
      return ScreenshotError.fromBase64Images(error, inspectedPage, devToolsPage, state.devToolsPage?.screenshotLog);
    } catch (e) {
      console.error('Unexpected error saving screenshots', e);
      return e;
    }
  }
  return error;
}

export class StateProvider implements TestStateProvider<E2EState, E2E.SuiteSettings> {
  static instance = new StateProvider();
  static serverPort: number;

  /**
   * This provides a mapping whenever we have called the
   * {@link Mocha.setup | setup()} function with custom settings.
   */
  #suiteToSettingsMap = new WeakMap<Mocha.Suite, E2E.SuiteSettings>();
  /**
   * This provides a quick link between suite and browser with
   * the correct setting allowing us to skip some check
   * because we try to run the creation of browser in a beforeEach
   */
  #suiteToBrowser = new WeakMap<Mocha.Suite, BrowserWrapper>();
  /**
   * Provides a mapping between a stable key (sorted JSON)
   * created from the settings and a browser.
   * This allows us to have a single browser between test
   * that require the same settings.
   */
  #settingToBrowser = new Map<string, BrowserWrapper>();

  private constructor() {
  }

  registerSuiteSettings(suite: Mocha.Suite, suiteSettings: E2E.SuiteSettings): void {
    this.#suiteToSettingsMap.set(suite, suiteSettings);
  }

  async prepareSuite(suite: Mocha.Suite): Promise<void> {
    if (!StateProvider.serverPort) {
      StateProvider.serverPort = await StateProvider.#globalSetup();
    }
    let browser = this.#suiteToBrowser.get(suite);
    if (browser?.connected) {
      return;
    }

    const settings = this.#getSettings(suite);
    const browserSettings: BrowserSettings = {
      enabledFeatures: (settings.enabledFeatures ?? []).toSorted(),
      disabledFeatures: (settings.disabledFeatures ?? []).toSorted(),
      extensions: (settings.extensions ?? []).toSorted(),
    };
    const browserKey = JSON.stringify(browserSettings);
    browser = this.#settingToBrowser.get(browserKey);
    if (browser && !browser.connected) {
      browser?.browser.process()?.kill();
    }

    if (!browser?.connected) {
      browser = await Launcher.browserSetup(browserSettings, StateProvider.serverPort);
      this.#settingToBrowser.set(browserKey, browser);
    }
    this.#suiteToBrowser.set(suite, browser);
    // Suite needs to be aware of the browser instance to be able to create the
    // full state for the tests
    suite.browser = browser;
  }

  async resolveBrowser(suite: Mocha.Suite): Promise<void> {
    return await this.prepareSuite(suite);
  }

  async createState(suite: Mocha.Suite): Promise<E2EState> {
    const settings = this.#getSettings(suite);
    const browser = suite.browser;
    if (!browser.connected) {
      throw new Error('Browser disconnected unexpectedly');
    }

    const browsingContext = await browser.createBrowserContext();
    const inspectedPage = await setupInspectedPage(browsingContext, StateProvider.serverPort);
    const devToolsPage = await setupDevToolsPage(
        inspectedPage,
        settings,
    );
    const state: E2EState = {
      devToolsPage,
      inspectedPage,
      browser,
      browsingContext,
    };
    // Suite needs to be aware of the full state to be able to capture
    // screenshots on failures
    suite.state = state;
    return state;
  }

  async getState(suite: Mocha.Suite) {
    return await this.createState(suite);
  }

  async cleanupState(state: E2EState): Promise<void> {
    try {
      await state.browsingContext.close();
    } catch (e) {
      console.error('Unexpected error closing browsing context during cleanup', e);
    }
  }

  async onTestError(state: E2EState|undefined, error: Error): Promise<Error> {
    if (!state) {
      console.error('Missing browsing state. Skipping screenshot taking for error:', error);
      return error;
    }
    if (error instanceof ScreenshotError) {
      return error;
    }
    return await screenshotError(state, error);
  }

  #getSettings(suite: Mocha.Suite): E2E.HarnessSettings {
    const settings = this.#suiteToSettingsMap.get(suite);
    if (settings) {
      return mergeSettings(settings, DEFAULT_SETTINGS);
    }
    return DEFAULT_SETTINGS;
  }

  static async #globalSetup() {
    const serverPort = Number(await startServer([]));
    // eslint-disable-next-line no-console
    console.log(`Started server on port ${serverPort}`);
    puppeteer.Puppeteer.registerCustomQueryHandler('pierceShadowText', {
      queryOne: querySelectorShadowTextOne as ((node: Node, selector: string) => Node | null),
      queryAll: querySelectorShadowTextAll as unknown as ((node: Node, selector: string) => Node[]),
    });
    return serverPort;
  }

  async closeBrowsers() {
    this.#settingToBrowser.values().next().value?.copyCrashDumps();
    await Promise.allSettled([...this.#settingToBrowser.values()].map(async browser => {
      await browser.browser.close();
    }));
  }
}

export function mergeSettings(s1: E2E.SuiteSettings, s2: E2E.HarnessSettings): E2E.HarnessSettings {
  function mergeAsSet<T>(arr1?: T[], arr2?: T[]) {
    return Array.from(new Set(arr1 ?? []).union(new Set(arr2 ?? [])));
  }

  return {
    enabledFeatures: mergeAsSet(s1.enabledFeatures, s2.enabledFeatures),
    disabledFeatures: mergeAsSet(s1.disabledFeatures, s2.disabledFeatures),
    extensions: mergeAsSet(s1.extensions, s2.extensions),
    enabledDevToolsExperiments: mergeAsSet(s1.enabledDevToolsExperiments, s2.enabledDevToolsExperiments),
    disabledDevToolsExperiments: mergeAsSet(s1.disabledDevToolsExperiments, s2.disabledDevToolsExperiments),
    devToolsSettings: {...(s2.devToolsSettings ?? {}), ...(s1.devToolsSettings ?? {})},
    dockingMode: s1.dockingMode ?? s2.dockingMode,
    panel: s1.panel ?? s2.panel,
  };
}

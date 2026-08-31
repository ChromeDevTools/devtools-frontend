// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as puppeteer from 'puppeteer-core';

import {TestConfig} from '../conductor/test_config.js';
import {type E2EState, StateProvider} from '../e2e/conductor/state-provider.js';
import {type BrowserSettings, type BrowserWrapper, Launcher} from '../e2e/shared/browser-helper.js';
import {InspectedPage} from '../e2e/shared/target-helper.js';

export class AiEvalStateProvider extends StateProvider {
  static override instance = new AiEvalStateProvider();

  override async launchBrowser(settings: BrowserSettings): Promise<BrowserWrapper> {
    return await Launcher.browserSetup({
      ...settings,
      chromeUsername: TestConfig.otaUsername,
    },
                                       StateProvider.serverPort);
  }

  override async browsingContext(browser: BrowserWrapper): Promise<puppeteer.BrowserContext> {
    return browser.browser.defaultBrowserContext();
  }

  override async setupInspectedPage(context: puppeteer.BrowserContext, serverPort: number): Promise<InspectedPage> {
    const page = await context.newPage();
    return new InspectedPage(page, serverPort);
  }

  override async cleanupState(state: E2EState): Promise<void> {
    try {
      if (state.inspectedPage) {
        await state.inspectedPage.page.close().catch(() => {});
      }
    } catch {
      // Ignore cleanup error for default browser context.
    }
  }
}

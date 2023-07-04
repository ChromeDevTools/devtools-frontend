// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-console */

// use require here due to
// https://github.com/evanw/esbuild/issues/587#issuecomment-901397213
import puppeteer = require('puppeteer-core');

import {installPageErrorHandlers} from './events.js';
import {getTestRunnerConfigSetting} from './test_runner_config.js';

// When loading DevTools with target.goto, we wait for it to be fully loaded using these events.
const DEVTOOLS_WAITUNTIL_EVENTS: puppeteer.PuppeteerLifeCycleEvent[] = ['networkidle2', 'domcontentloaded'];
// When loading an empty page (including within the devtools window), we wait for it to be loaded using these events.
const EMPTY_PAGE_WAITUNTIL_EVENTS: puppeteer.PuppeteerLifeCycleEvent[] = ['domcontentloaded'];
const EMPTY_PAGE = 'data:text/html,<!DOCTYPE html>';

export interface DevToolsFrontendCreationOptions {
  browser: puppeteer.Browser;
  testServerPort: number;
  targetId: string;
}

export interface DevToolsFrontendReloadOptions {
  selectedPanel?: {name: string, selector?: string};
  canDock?: boolean;
  queryParams?: {panel?: string};
  drawerShown?: boolean;
}

/**
 * Wrapper class around `puppeteer.Page` that helps with setting up and
 * managing a DevTools frontend tab.
 */
export class DevToolsFrontendTab {
  readonly #frontendUrl: string;

  private static readonly DEFAULT_TAB = {
    name: 'elements',
    selector: '.elements',
  };
  // We use the counter to give each tab a unique origin.
  private static tabCounter = 0;

  private constructor(readonly page: puppeteer.Page, frontendUrl: string) {
    this.#frontendUrl = frontendUrl;
  }

  static async create({browser, testServerPort, targetId}: DevToolsFrontendCreationOptions):
      Promise<DevToolsFrontendTab> {
    const devToolsAppURL =
        getTestRunnerConfigSetting<string>('hosted-server-devtools-url', 'front_end/devtools_app.html');
    if (!devToolsAppURL) {
      throw new Error('Could not load DevTools. hosted-server-devtools-url config not found.');
    }

    // We load the DevTools frontend on a unique origin. Otherwise we would share 'localhost' with
    // target pages. This could cause difficult to debug problems as things like window.localStorage
    // would be shared and requests would be "same-origin".
    // We also use a unique ID per DevTools frontend instance, to avoid the same issue with other
    // frontend instances.
    const id = DevToolsFrontendTab.tabCounter++;
    const frontendUrl = `https://i${id}.devtools-frontend.test:${testServerPort}/${devToolsAppURL}?ws=localhost:${
        getDebugPort(browser)}/devtools/page/${targetId}&targetType=tab`;

    const frontend = await browser.newPage();
    installPageErrorHandlers(frontend);
    await frontend.goto(frontendUrl, {waitUntil: DEVTOOLS_WAITUNTIL_EVENTS});

    const tab = new DevToolsFrontendTab(frontend, frontendUrl);
    return tab;
  }

  /** Same as `reload` but also clears out experiments and settings (window.localStorage really) */
  async reset(): Promise<void> {
    // Clear any local storage settings.
    await this.page.evaluate(() => localStorage.clear());

    await this.reload();
  }

  async reload(options: DevToolsFrontendReloadOptions = {}): Promise<void> {
    // For the unspecified case wait for loading, then wait for the elements panel.
    const {selectedPanel = DevToolsFrontendTab.DEFAULT_TAB, canDock = false, queryParams = {}, drawerShown = false} =
        options;

    if (selectedPanel.name !== DevToolsFrontendTab.DEFAULT_TAB.name) {
      await this.page.evaluate(name => {
        globalThis.localStorage.setItem('panel-selectedTab', `"${name}"`);
      }, selectedPanel.name);
    }

    if (drawerShown) {
      await this.page.evaluate(() => {
        globalThis.localStorage.setItem('Inspector.drawerSplitViewState', '{"horizontal" : {"showMode": "Both"}}');
      });
    }

    // Reload the DevTools frontend and await the elements panel.
    await loadEmptyPageAndWaitForContent(this.page);
    // omit "can_dock=" when it's false because appending "can_dock=false"
    // will make getElementPosition in shared helpers unhappy
    let url = canDock ? `${this.#frontendUrl}&can_dock=true` : this.#frontendUrl;

    if (queryParams.panel) {
      url += `&panel=${queryParams.panel}`;
    }

    await this.page.goto(url, {waitUntil: DEVTOOLS_WAITUNTIL_EVENTS});

    if (!queryParams.panel && selectedPanel.selector) {
      await this.page.waitForSelector(selectedPanel.selector);
    }
  }

  /**
   * Returns the current hostname of this frontend tab. This might not be
   * consistent with the intial URL in case the page was navigated to
   * a different origin.
   */
  hostname(): string {
    const url = new URL(this.page.url());
    return url.hostname;
  }
}

export async function loadEmptyPageAndWaitForContent(target: puppeteer.Page) {
  await target.goto(EMPTY_PAGE, {waitUntil: EMPTY_PAGE_WAITUNTIL_EVENTS});
}

function getDebugPort(browser: puppeteer.Browser) {
  const websocketUrl = browser.wsEndpoint();
  const url = new URL(websocketUrl);
  if (url.port) {
    return url.port;
  }
  throw new Error(`Unable to find debug port: ${websocketUrl}`);
}

// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {openNetworkTab, setCacheDisabled} from '../helpers/network-helpers.js';
import type {DevToolsPage} from '../shared/DevToolsPage.js';

const PILL_SELECTOR = '.status-bar .pill';
const DISABLE_CACHE_CHECKBOX_SELECTOR = '[title^="Disable cache"]';

describe('The status bar', () => {
  async function enableStateChangesPills(devToolsPage: DevToolsPage): Promise<void> {
    await devToolsPage.setupMockHostConfigAndReload({devToolsAiNaturalLanguageInterface: {enabled: true}});
  }

  async function throttleCPU(devToolsPage: DevToolsPage): Promise<void> {
    await devToolsPage.evaluate(() => {
      // @ts-expect-error globalThis.universe is set by MainImpl
      globalThis.universe.cpuThrottlingManager.setCPUThrottlingRate(4);
    });
  }

  async function disableCache(devToolsPage: DevToolsPage): Promise<void> {
    await openNetworkTab(devToolsPage);
    await setCacheDisabled(devToolsPage, true);
  }

  async function isDisableCacheChecked(devToolsPage: DevToolsPage): Promise<boolean> {
    const checkbox = await devToolsPage.waitFor<HTMLInputElement>(DISABLE_CACHE_CHECKBOX_SELECTOR);
    return await checkbox.evaluate(input => input.checked);
  }

  async function waitForPills(devToolsPage: DevToolsPage, titles: string[]): Promise<void> {
    await devToolsPage.waitForStrictEqual(titles.join(),
                                          async () => (await devToolsPage.getAllTextContents(PILL_SELECTOR)).join());
  }

  it('shows a pill for each state change and resets them', async ({devToolsPage}) => {
    await enableStateChangesPills(devToolsPage);

    await throttleCPU(devToolsPage);
    await disableCache(devToolsPage);
    await waitForPills(devToolsPage, ['CPU (4×)', 'Cache disabled']);

    await devToolsPage.click('.status-bar devtools-button[title="Enable cache"]');
    await waitForPills(devToolsPage, ['CPU (4×)']);
    assert.isFalse(await isDisableCacheChecked(devToolsPage));

    await devToolsPage.click('.status-bar .reset-all');
    await devToolsPage.waitForNone(PILL_SELECTOR);
  });
});

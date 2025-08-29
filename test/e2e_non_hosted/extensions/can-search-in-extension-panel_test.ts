// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type {Chrome} from '../../../extension-api/ExtensionAPI.js';
import {expectError} from '../../conductor/events.js';
import {platform} from '../../conductor/platform.js';
import {loadExtension} from '../../e2e/helpers/extension-helpers.js';
import {clickMoreTabsButton} from '../../shared/helper.js';

declare global {
  interface Window {
    searchEvents: Array<{action: string, queryString?: string}>;
  }
}

const PAGE_TITLE = 'TestPanel';
describe('Extension panels', () => {
  it('can perform search actions', async ({devToolsPage, inspectedPage}) => {
    expectError('Unknown VE context: https://localhostTestPanel');
    await inspectedPage.goToResource('empty.html');
    const extension = await loadExtension('TestExtension', undefined, undefined, devToolsPage, inspectedPage);

    const page = new URL(`${inspectedPage.getResourcesPath()}/extensions/test_panel.html`).pathname;

    await extension.evaluate(async (page: string) => {
      window.searchEvents = [];
      const panel = await new Promise<Chrome.DevTools.ExtensionPanel>(
          r => window.chrome.devtools.panels.create('TestPanel', '', page, r));
      panel.onSearch.addListener((action, queryString) => window.searchEvents.push({action, queryString}));
    }, page);

    await clickMoreTabsButton(undefined, devToolsPage);
    await devToolsPage.click(`[aria-label=${PAGE_TITLE}]`);

    const accelerator = platform === 'mac' ? 'Meta' : 'Control';
    await devToolsPage.page.keyboard.down(accelerator);
    await devToolsPage.page.keyboard.press('F');
    await devToolsPage.page.keyboard.up(accelerator);

    const search = await devToolsPage.waitFor('#search-input-field');
    await search.type('abc');

    const queries = await devToolsPage.waitForFunction(() => {
      return extension.evaluate(() => window.searchEvents.length > 0 ? window.searchEvents : undefined);
    });

    assert.deepEqual(queries, [{action: 'performSearch', queryString: 'abc'}]);
  });
});

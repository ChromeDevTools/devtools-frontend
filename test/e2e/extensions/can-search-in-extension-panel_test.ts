// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {type Chrome} from '../../../extension-api/ExtensionAPI.js';
import {click, getBrowserAndPages, getResourcesPath, platform, waitFor, waitForFunction} from '../../shared/helper.js';

import {loadExtension} from '../helpers/extension-helpers.js';

declare global {
  interface Window {
    searchEvents: {action: string, queryString?: string}[];
  }
}

const PAGE_TITLE = 'TestPanel';
describe('Extension panels', () => {
  it('can perform search actions', async () => {
    const extension = await loadExtension('TestExtension');

    const page = new URL(`${getResourcesPath()}/extensions/test_panel.html`).pathname;

    await extension.evaluate(async (title: string, page: string) => {
      window.searchEvents = [];
      const panel = await new Promise<Chrome.DevTools.ExtensionPanel>(
          r => window.chrome.devtools.panels.create('TestPanel', '', page, r));
      panel.onSearch.addListener((action, queryString) => window.searchEvents.push({action, queryString}));
    }, PAGE_TITLE, page);

    await click(`[aria-label=${PAGE_TITLE}]`);

    const {frontend} = getBrowserAndPages();
    const accelerator = platform === 'mac' ? 'Meta' : 'Control';
    await frontend.keyboard.down(accelerator);
    await frontend.keyboard.press('F');
    await frontend.keyboard.up(accelerator);

    const search = await waitFor('#search-input-field');
    await search.type('abc');

    const queries = await waitForFunction(() => {
      return extension.evaluate(() => window.searchEvents.length > 0 ? window.searchEvents : undefined);
    });

    assert.deepEqual(queries, [{action: 'performSearch', queryString: 'abc'}]);
  });
});

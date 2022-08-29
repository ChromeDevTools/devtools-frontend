// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {getSearchResultMatchesText, summonAndWaitForSearchBox} from '../helpers/elements-helpers.js';
import {togglePreferenceInSettingsTab} from '../helpers/settings-helpers.js';

describe('The Elements tab', async () => {
  it('search is only performed when Enter is pressed when the "searchAsYouType" setting is disabled', async () => {
    await togglePreferenceInSettingsTab('Search as you type', false);
    await summonAndWaitForSearchBox();
    const {frontend} = getBrowserAndPages();

    await frontend.keyboard.type('html');

    // Wait a bit in case the search results are fetched, otherwise the assertion might always pass.
    await new Promise(r => setTimeout(r, 200));

    assert.strictEqual(await getSearchResultMatchesText(), '');

    frontend.keyboard.press('Enter');

    assert.notEqual(await getSearchResultMatchesText(), '');
  });

  it('search is performed as the user types when the "searchAsYouType" setting is enabled', async () => {
    await togglePreferenceInSettingsTab('Search as you type', true);
    await summonAndWaitForSearchBox();
    const {frontend} = getBrowserAndPages();

    await frontend.keyboard.type('html');

    assert.notEqual(await getSearchResultMatchesText(), '');
  });
});

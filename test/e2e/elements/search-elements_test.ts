// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getBrowserAndPages, goToResource, pressKey, timeout, waitFor, waitForNone} from '../../shared/helper.js';

import {
  assertSearchResultMatchesText,
  SEARCH_BOX_SELECTOR,
  summonAndWaitForSearchBox,
  waitForSelectedNodeToBeExpanded,
} from '../helpers/elements-helpers.js';
import {togglePreferenceInSettingsTab} from '../helpers/settings-helpers.js';

describe('The Elements tab', function() {
  it('search is performed as the user types when the "searchAsYouType" setting is enabled', async () => {
    await togglePreferenceInSettingsTab('Search as you type', true);
    await summonAndWaitForSearchBox();
    const {frontend} = getBrowserAndPages();

    await frontend.keyboard.type('html');

    await assertSearchResultMatchesText('1 of 1');
    await pressKey('Escape');
  });

  it('search is closed on reload', async () => {
    await summonAndWaitForSearchBox();

    const {target, frontend} = getBrowserAndPages();
    await frontend.keyboard.type('html');
    await frontend.keyboard.press('Enter');

    await assertSearchResultMatchesText('1 of 1');

    await waitForNone(`${SEARCH_BOX_SELECTOR}.hidden`);
    await target.reload();
    await waitFor(`${SEARCH_BOX_SELECTOR}.hidden`);
    await pressKey('Escape');
  });

  describe('when searchAsYouType setting is disabled', () => {
    beforeEach(async () => {
      await togglePreferenceInSettingsTab('Search as you type', false);
      await new Promise(r => setTimeout(r, 1000));
    });

    it('search is only performed when Enter is pressed', async () => {
      await goToResource('elements/elements-search-test.html');
      await waitForSelectedNodeToBeExpanded();
      await summonAndWaitForSearchBox();
      const {frontend} = getBrowserAndPages();

      await frontend.keyboard.type('one');

      // Wait a bit in case the search results are fetched, otherwise the assertion might always pass.
      await timeout(200);

      await assertSearchResultMatchesText('');

      await frontend.keyboard.press('Enter');

      await assertSearchResultMatchesText('1 of 1');
    });

    it('search should jump to next match when Enter is pressed when the input is not changed', async () => {
      await goToResource('elements/elements-search-test.html');
      await waitForSelectedNodeToBeExpanded();
      await summonAndWaitForSearchBox();
      const {frontend} = getBrowserAndPages();

      await frontend.keyboard.type('two');
      await frontend.keyboard.press('Enter');
      await assertSearchResultMatchesText('1 of 2');

      await frontend.keyboard.press('Enter');
      await assertSearchResultMatchesText('2 of 2');
    });

    it('search should be performed with the new query when the input is changed and Enter is pressed', async () => {
      await goToResource('elements/elements-search-test.html');
      await waitForSelectedNodeToBeExpanded();
      await summonAndWaitForSearchBox();
      const {frontend} = getBrowserAndPages();

      await frontend.keyboard.type('one');
      await frontend.keyboard.press('Enter');
      await assertSearchResultMatchesText('1 of 1');

      await frontend.keyboard.press('Backspace');
      await frontend.keyboard.press('Backspace');
      await frontend.keyboard.press('Backspace');

      await frontend.keyboard.type('two');
      await frontend.keyboard.press('Enter');
      await assertSearchResultMatchesText('1 of 2');
    });
  });
});

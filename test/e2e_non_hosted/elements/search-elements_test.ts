// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  assertSearchResultMatchesText,
  SEARCH_BOX_SELECTOR,
  summonAndWaitForSearchBox,
  waitForSelectedNodeToBeExpanded,
} from '../../e2e/helpers/elements-helpers.js';
import {togglePreferenceInSettingsTab} from '../../e2e/helpers/settings-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

async function toggleSearchAsYouType(devToolsPage: DevToolsPage, enabled: boolean) {
  await togglePreferenceInSettingsTab('Search as you type', enabled, devToolsPage);
}

describe('The Elements tab', function() {
  it('search is performed as the user types when the "searchAsYouType" setting is enabled', async ({devToolsPage}) => {
    await toggleSearchAsYouType(devToolsPage, true);
    await summonAndWaitForSearchBox(devToolsPage);

    await devToolsPage.page.keyboard.type('html');

    await assertSearchResultMatchesText('1 of 1', devToolsPage);
    await devToolsPage.page.keyboard.press('Escape');
  });

  it('search is closed on reload', async ({devToolsPage, inspectedPage}) => {
    await summonAndWaitForSearchBox(devToolsPage);

    await devToolsPage.page.keyboard.type('html');
    await devToolsPage.page.keyboard.press('Enter');

    await assertSearchResultMatchesText('1 of 1', devToolsPage);

    await devToolsPage.waitForNone(`${SEARCH_BOX_SELECTOR}.hidden`);
    await inspectedPage.reload();
    await devToolsPage.waitFor(`${SEARCH_BOX_SELECTOR}.hidden`);
    await devToolsPage.page.keyboard.press('Escape');
  });

  describe('when searchAsYouType setting is disabled', () => {
    it('search is only performed when Enter is pressed', async ({devToolsPage, inspectedPage}) => {
      await toggleSearchAsYouType(devToolsPage, false);
      await inspectedPage.goToResource('elements/elements-search-test.html');
      await waitForSelectedNodeToBeExpanded(devToolsPage);
      await summonAndWaitForSearchBox(devToolsPage);

      await devToolsPage.page.keyboard.type('one');

      // Wait a bit in case the search results are fetched, otherwise the assertion might always pass.
      await devToolsPage.timeout(200);

      await assertSearchResultMatchesText('', devToolsPage);

      await devToolsPage.page.keyboard.press('Enter');

      await assertSearchResultMatchesText('1 of 1', devToolsPage);
    });

    it('search should jump to next match when Enter is pressed when the input is not changed',
       async ({devToolsPage, inspectedPage}) => {
         await toggleSearchAsYouType(devToolsPage, false);
         await inspectedPage.goToResource('elements/elements-search-test.html');
         await waitForSelectedNodeToBeExpanded(devToolsPage);
         await summonAndWaitForSearchBox(devToolsPage);

         await devToolsPage.page.keyboard.type('two');
         await devToolsPage.page.keyboard.press('Enter');
         await assertSearchResultMatchesText('1 of 2', devToolsPage);

         await devToolsPage.page.keyboard.press('Enter');
         await assertSearchResultMatchesText('2 of 2', devToolsPage);
       });

    it('search should be performed with the new query when the input is changed and Enter is pressed',
       async ({devToolsPage, inspectedPage}) => {
         await toggleSearchAsYouType(devToolsPage, false);
         await inspectedPage.goToResource('elements/elements-search-test.html');
         await waitForSelectedNodeToBeExpanded(devToolsPage);
         await summonAndWaitForSearchBox(devToolsPage);

         await devToolsPage.page.keyboard.type('one');
         await devToolsPage.page.keyboard.press('Enter');
         await assertSearchResultMatchesText('1 of 1', devToolsPage);

         await devToolsPage.page.keyboard.press('Backspace');
         await devToolsPage.page.keyboard.press('Backspace');
         await devToolsPage.page.keyboard.press('Backspace');

         await devToolsPage.page.keyboard.type('two');
         await devToolsPage.page.keyboard.press('Enter');
         await assertSearchResultMatchesText('1 of 2', devToolsPage);
       });
  });
});

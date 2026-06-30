// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  navigateToNetworkTab,
  waitForSomeRequestsToAppear,
} from '../helpers/network-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const SIMPLE_PAGE_URL = 'requests.html?num=1';

describe('The Network Tab search', function() {
  async function performSearch(devToolsPage: DevToolsPage, query: string, isRegex?: boolean, ignoreCase?: boolean) {
    const searchInput = await devToolsPage.waitFor('.search-toolbar-input');
    await searchInput.focus();
    await searchInput.type(query);

    if (ignoreCase !== undefined) {
      const matchCaseButton = await devToolsPage.waitFor('.match-case-button');
      const matchCaseToggled = await matchCaseButton.evaluate(e => e.ariaPressed === 'true');
      // The button is a toggle. `aria-pressed` is 'true' if it's active.
      // We want `ignoreCase` to be true when the button is NOT pressed.
      const shouldBeToggled = !ignoreCase;
      if (shouldBeToggled !== matchCaseToggled) {
        await matchCaseButton.click();
      }
    }

    if (isRegex !== undefined) {
      const regexButton = await devToolsPage.waitFor('.regex-button');
      const regexToggled = await regexButton.evaluate(e => e.ariaPressed === 'true');
      if (isRegex !== regexToggled) {
        await regexButton.click();
      }
    }

    await searchInput.press('Enter');
  }

  async function waitForSearchResults(devToolsPage: DevToolsPage,
                                      expectedMatches: Array<{request: string, matches: string[]}>) {
    const sortedExpected = expectedMatches.toSorted((a, b) => a.request.localeCompare(b.request));
    await devToolsPage.waitForFunction(async () => {
      const results = (await getSearchResults(devToolsPage)).toSorted((a, b) => a.request.localeCompare(b.request));

      if (results.length !== sortedExpected.length) {
        return false;
      }
      for (let i = 0; i < sortedExpected.length; i++) {
        if (results[i].request !== sortedExpected[i].request) {
          return false;
        }
        if (results[i].matches.length !== sortedExpected[i].matches.length) {
          return false;
        }
        for (let j = 0; j < sortedExpected[i].matches.length; j++) {
          if (!results[i].matches[j].includes(sortedExpected[i].matches[j])) {
            return false;
          }
        }
      }
      return true;
    });
  }

  async function getSearchResults(devToolsPage: DevToolsPage): Promise<Array<{request: string, matches: string[]}>> {
    const resultElements = await devToolsPage.waitForMany('.search-result', 1);
    const matchElementContainers = await devToolsPage.waitForMany('.search-result + ol', 1);
    if (resultElements.length === 0 || matchElementContainers.length !== resultElements.length) {
      return [];
    }
    const results = [];
    for (let i = 0; i < resultElements.length; i++) {
      const requestName =
          await resultElements[i].$eval('.search-result-file-name', node => (node.textContent || '').split('—')[0]);
      const matchElements = await matchElementContainers[i].$$('.search-match-content');
      const matches = await Promise.all(matchElements.map(e => e.evaluate(node => node.textContent || '')));
      results.push({request: requestName, matches});
    }
    return results;
  }

  it('can search request URLs', async ({devToolsPage, inspectedPage}: {
                                  devToolsPage: DevToolsPage,
                                  inspectedPage: InspectedPage,
                                }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    await inspectedPage.evaluate(
        () => Promise.all([1, 2, 3].map(i => fetch(`search-result-${i}.js`).then(r => r.text()))));
    await waitForSomeRequestsToAppear(6, devToolsPage);

    await devToolsPage.summonSearchBox();
    await devToolsPage.waitFor('.search-toolbar-input');
    await performSearch(devToolsPage, 'search-result');
    await waitForSearchResults(devToolsPage, [
      {request: 'search-result-1.js', matches: ['e2e/resources/network']},
      {request: 'search-result-2.js', matches: ['e2e/resources/network']},
      {request: 'search-result-3.js', matches: ['e2e/resources/network']},
    ]);
  });

  it('can search request bodies with case-insensitive regex', async ({devToolsPage, inspectedPage}: {
                                                                devToolsPage: DevToolsPage,
                                                                inspectedPage: InspectedPage,
                                                              }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    await inspectedPage.evaluate(
        () => Promise.all([1, 2, 3].map(i => fetch(`search-result-${i}.js`).then(r => r.text()))));
    await waitForSomeRequestsToAppear(6, devToolsPage);

    await devToolsPage.summonSearchBox();
    await devToolsPage.waitFor('.search-toolbar-input');
    await performSearch(devToolsPage, 'd.search', true, true);
    await waitForSearchResults(devToolsPage, [
      {request: 'search-result-1.js', matches: ['dosearch()']},
      {request: 'search-result-2.js', matches: ['doSearch()']},
      {request: 'search-result-3.js', matches: ['d.Search()']},
    ]);
  });

  it('can search request bodies with case-sensitive regex', async ({devToolsPage, inspectedPage}: {
                                                              devToolsPage: DevToolsPage,
                                                              inspectedPage: InspectedPage,
                                                            }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    await inspectedPage.evaluate(
        () => Promise.all([1, 2, 3].map(i => fetch(`search-result-${i}.js`).then(r => r.text()))));
    await waitForSomeRequestsToAppear(6, devToolsPage);

    await devToolsPage.summonSearchBox();
    await devToolsPage.waitFor('.search-toolbar-input');
    await performSearch(devToolsPage, 'd.search', true, false);
    await waitForSearchResults(devToolsPage, [
      {request: 'search-result-1.js', matches: ['dosearch()']},
    ]);
  });

  it('can search request bodies with case-insensitive text', async ({devToolsPage, inspectedPage}: {
                                                               devToolsPage: DevToolsPage,
                                                               inspectedPage: InspectedPage,
                                                             }) => {
    await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
    await inspectedPage.evaluate(
        () => Promise.all([1, 2, 3].map(i => fetch(`search-result-${i}.js`).then(r => r.text()))));
    await waitForSomeRequestsToAppear(6, devToolsPage);

    await devToolsPage.summonSearchBox();
    await devToolsPage.waitFor('.search-toolbar-input');
    await performSearch(devToolsPage, 'd.search', false, true);
    await waitForSearchResults(devToolsPage, [
      {request: 'search-result-3.js', matches: ['d.Search()']},
    ]);
  });

  it(
      'reveals the request in the network log when a search result is clicked', async ({devToolsPage, inspectedPage}: {
                                                                                  devToolsPage: DevToolsPage,
                                                                                  inspectedPage: InspectedPage,
                                                                                }) => {
        await navigateToNetworkTab(SIMPLE_PAGE_URL, devToolsPage, inspectedPage);
        await inspectedPage.evaluate(
            () => Promise.all([1, 2, 3].map(i => fetch(`search-result-${i}.js`).then(r => r.text()))));
        await waitForSomeRequestsToAppear(6, devToolsPage);

        await devToolsPage.summonSearchBox();
        await devToolsPage.waitFor('.search-toolbar-input');
        await performSearch(devToolsPage, 'd.search', false, true);
        await waitForSearchResults(devToolsPage, [
          {request: 'search-result-3.js', matches: ['d.Search()']},
        ]);

        // Click on the first match. There should be only one.
        const firstMatch = await devToolsPage.waitFor('.search-match-content');
        await firstMatch.click();

        // Search pane should be closed and the request selected.
        const selectedRequestName =
            await devToolsPage.waitFor('.network-log-grid .data-grid-data-grid-node.selected .name-column')
                .then(e => e.evaluate(n => n.textContent));
        assert.include(selectedRequestName, 'search-result-3.js');
      });
});

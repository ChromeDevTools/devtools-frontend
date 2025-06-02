// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {navigateToConsoleTab} from '../../e2e/helpers/console-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

describe('Console search', () => {
  it('finds and highlights matches including a "current match"', async ({devToolsPage, inspectedPage}) => {
    await Promise.all([
      inspectedPage.goToResource('console/search.html'),
      navigateToConsoleTab(devToolsPage),
    ]);

    await openSearchBar(devToolsPage);
    await devToolsPage.typeText('Message');

    await devToolsPage.waitForElementWithTextContent('1 of 200', await devToolsPage.waitFor('.search-results-matches'));
    await waitForHighlightedCurrentSearchResult(devToolsPage, 'Message');

    // Since we have 200 console messages not all of them are rendered, so we make sure that at least a reasonable amount
    // of highlighted search results are rendered.
    assert.isAbove((await devToolsPage.$$('.highlighted-search-result')).length, 50);
  });

  it('can jump forwards and backwards', async ({devToolsPage, inspectedPage}) => {
    await Promise.all([
      inspectedPage.goToResource('console/search.html'),
      navigateToConsoleTab(devToolsPage),
    ]);

    await openSearchBar(devToolsPage);
    await devToolsPage.typeText('MATCH');

    await waitForHighlightedCurrentSearchResult(devToolsPage, 'MATCH');
    assert.strictEqual(
        await devToolsPage.getTextContent('.console-message-text:has(.current-search-result)'),
        'FIRST MATCH, SECOND MATCH');

    await devToolsPage.click('aria/Show next result');
    await devToolsPage.click('aria/Show next result');

    assert.strictEqual(
        await devToolsPage.getTextContent('.console-message-text:has(.current-search-result)'), 'LAST MATCH');

    await devToolsPage.click('aria/Show previous result');
    assert.strictEqual(
        await devToolsPage.getTextContent('.console-message-text:has(.current-search-result)'),
        'FIRST MATCH, SECOND MATCH');
  });

  it('can jump forward in remote object property matches', async ({devToolsPage, inspectedPage}) => {
    await Promise.all([
      inspectedPage.goToResource('console/search.html'),
      navigateToConsoleTab(devToolsPage),
    ]);

    await openSearchBar(devToolsPage);
    await devToolsPage.typeText('field_');

    await waitForHighlightedCurrentSearchResult(devToolsPage, 'field_');
    assert.strictEqual(
        await devToolsPage.getTextContent('.console-message-text:has(.current-search-result)'),
        '{field_0: \'value #0\', field_1: \'value #1\'}');
  });
});

async function openSearchBar(devToolsPage: DevToolsPage): Promise<void> {
  await devToolsPage.pressKey('f', {control: true});
  await devToolsPage.waitFor('.search-bar:not(.hidden)');
}

async function waitForHighlightedCurrentSearchResult(devToolsPage: DevToolsPage, matchingText: string): Promise<void> {
  await devToolsPage.waitForFunction(async () => {
    const actualText = await devToolsPage.getTextContent('.current-search-result');
    return actualText === matchingText;
  });
}

// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers.js';

describe('The Search Panel', () => {
  it('provides results across scopes', async ({devToolsPage, inspectedPage}) => {
    const SEARCH_QUERY = '[aria-label="Find"]';
    const SEARCH_RESULTS = '.search-results';
    const SEARCH_FILE_RESULT = '.search-result';
    const SEARCH_CHILDREN_RESULT = '.search-match-link';

    // Load the search page, which has results in the HTML, JS, and CSS.
    await inspectedPage.goToResource('search/search.html');

    // Launch the search panel.
    await openPanelViaMoreTools('Search', devToolsPage);
    await devToolsPage.waitFor(SEARCH_QUERY);
    const inputElement = await devToolsPage.$(SEARCH_QUERY);
    assert.isOk(inputElement, 'Unable to find search input field');

    // Go ahead and search.
    await inputElement.focus();
    await inputElement.type('searchTestUniqueString');
    await devToolsPage.page.keyboard.press('Enter');

    // Wait for results.
    const resultsContainer = await devToolsPage.waitFor(SEARCH_RESULTS);

    const fileResults = await devToolsPage.waitForFunction(async () => {
      const results = await devToolsPage.$$(SEARCH_FILE_RESULT, resultsContainer);
      return results.length === 3 ? results : undefined;
    });

    interface FileSearchResult {
      matchesCount: number;
      fileName: string;
    }

    const files: FileSearchResult[] = await Promise.all(fileResults.map(result => result.evaluate(value => {
      const SEARCH_RESULT_FILE_NAME = '.search-result-file-name';
      const SEARCH_RESULT_MATCHES_COUNT = '.search-result-matches-count';

      const fileNameElement = value.querySelector(SEARCH_RESULT_FILE_NAME);
      const matchesCountElement = value.querySelector(SEARCH_RESULT_MATCHES_COUNT);
      if (!fileNameElement) {
        throw new Error('Could not find search result file name element.');
      }
      if (!matchesCountElement) {
        throw new Error('Could not find search result matches count element.');
      }

      // Wrap the entries with the file details.
      return {
        fileName: fileNameElement.deepInnerText().split('\u2014')[0],
        matchesCount: parseInt(matchesCountElement.textContent || '', 10),
      };
    })));

    files.sort((a, b) => {
      return a.matchesCount - b.matchesCount;
    });

    assert.deepEqual(files, [
      {fileName: 'search.css', matchesCount: 3},
      {fileName: 'search.html', matchesCount: 4},
      {fileName: 'search.js', matchesCount: 6},
    ]);

    // Now step through the actual entries of the search result.
    const entryResults = await devToolsPage.$$(SEARCH_CHILDREN_RESULT, resultsContainer);
    const entries = await Promise.all(entryResults.map(result => result.evaluate(value => {
      const SEARCH_MATCH_LINE_NUMBER = '.search-match-line-number';
      const SEARCH_MATCH_CONTENT = '.search-match-content';

      const lineNumberElement = value.querySelector(SEARCH_MATCH_LINE_NUMBER);
      const matchContentElement = value.querySelector(SEARCH_MATCH_CONTENT);

      if (!lineNumberElement) {
        throw new Error('Could not find search line number element.');
      }
      if (!matchContentElement) {
        throw new Error('Could not find search match content element.');
      }

      return {
        line: lineNumberElement.textContent || '',
        content: matchContentElement.textContent || '',
      };
    })));

    assert.deepEqual(entries, [
      {line: '7', content: 'div.searchTestUniqueString {'},
      {line: '11', content: 'div.searchTestUniqueString:hover {'},
      {line: '12', content: '/* another searchTestUniqueString occurence */'},
      {line: '4', content: 'function searchTestUniqueString() {'},
      {line: '6', content: '// searchTestUniqueString two occurences on the same line searchTestUniqueString'},
      {line: '6', content: '…urences on the same line searchTestUniqueString'},
      {line: '7', content: '// searchTestUniqueString on the next line.'},
      {line: '12', content: 'searchTestUniqueString();'},
      {line: '13', content: '// SEARCHTestUniqueString();'},
      {line: '8', content: '…pt>window.eval(\'function searchTestUniqueString() {}\');</script>'},
      {line: '10', content: '<div>searchTestUniqueString</div>'},
      {line: '12', content: '<!-- searchTestUniqueString -->'},
      {line: '14', content: '<div id="searchTestUniqueString">div text</div>'},
    ]);
  });
});

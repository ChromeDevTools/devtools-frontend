// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$, $$, getBrowserAndPages, goToResource, waitFor, waitForFunction} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {triggerFindDialog} from '../helpers/search-helpers.js';

describe('The Search Panel', async () => {
  it('provides results across scopes', async () => {
    const {frontend} = getBrowserAndPages();
    const SEARCH_QUERY = '[aria-label="Search Query"]';
    const SEARCH_RESULTS = '.search-results';
    const SEARCH_FILE_RESULT = '.search-result';
    const SEARCH_CHILDREN_RESULT = '.search-match-link';

    // Load the search page, which has results in the HTML, JS, and CSS.
    await goToResource('search/search.html');

    // Launch the search panel.
    await triggerFindDialog(frontend);
    await waitFor(SEARCH_QUERY);
    const inputElement = await $(SEARCH_QUERY);
    if (!inputElement) {
      assert.fail('Unable to find search input field');
    }

    // Go ahead and search.
    await inputElement.focus();
    await inputElement.type('searchTestUniqueString');
    await frontend.keyboard.press('Enter');

    // Wait for results.
    const resultsContainer = await waitFor(SEARCH_RESULTS);

    const fileResults = await waitForFunction(async () => {
      const results = await $$(SEARCH_FILE_RESULT, resultsContainer);
      return results.length === 3 ? results : undefined;
    });

    interface FileSearchResult {
      matchesCount: number;
      fileName: string;
    }

    const files: FileSearchResult[] = await Promise.all(fileResults.map(result => result.evaluate(value => {
      const SEARCH_RESULT_FILE_NAME = '.search-result-file-name';
      const SEARCH_RESULT_MATCHES_COUNT = '.search-result-matches-count';

      // Wrap the entries with the file details.
      return {
        fileName: value.querySelector(SEARCH_RESULT_FILE_NAME)!.firstChild!.textContent as string,
        matchesCount: parseInt(value.querySelector(SEARCH_RESULT_MATCHES_COUNT)!.textContent as string, 10),
      };
    })));

    files.sort((a, b) => {
      return a.matchesCount - b.matchesCount;
    });

    assert.deepEqual(files, [
      {fileName: 'search.css', matchesCount: 3},
      {fileName: 'search.html', matchesCount: 4},
      {fileName: 'search.js', matchesCount: 5},
    ]);

    // Now step through the actual entries of the search result.
    const entryResults = await $$(SEARCH_CHILDREN_RESULT, resultsContainer);
    const entries = await Promise.all(entryResults.map(result => result.evaluate(value => {
      const SEARCH_MATCH_LINE_NUMBER = '.search-match-line-number';
      const SEARCH_MATCH_CONTENT = '.search-match-content';

      return {
        line: value.querySelector(SEARCH_MATCH_LINE_NUMBER)!.textContent,
        content: value.querySelector(SEARCH_MATCH_CONTENT)!.textContent,
      };
    })));

    assert.deepEqual(entries, [
      {line: '7', content: 'div.searchTestUniqueString {'},
      {line: '11', content: 'div.searchTestUniqueString:hover {'},
      {line: '12', content: '/* another searchTestUniqueString occurence */'},
      {line: '4', content: 'function searchTestUniqueString() {'},
      {line: '6', content: '// searchTestUniqueString two occurences on the same line searchTestUniqueString'},
      {line: '7', content: '// searchTestUniqueString on the next line.'},
      {line: '12', content: 'searchTestUniqueString();'},
      {line: '13', content: '// SEARCHTestUniqueString();'},
      {line: '8', content: '…eval(\'function searchTestUniqueString() {}\');</script>'},
      {line: '10', content: '<div>searchTestUniqueString</div>'},
      {line: '12', content: '<!-- searchTestUniqueString -->'},
      {line: '14', content: '<div id="searchTestUniqueString">div text</div>'},
    ]);
  });
});

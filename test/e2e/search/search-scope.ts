// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import {$, $$, getBrowserAndPages, resetPages, resourcesPath, waitFor} from '../../shared/helper.js';
import {triggerFindDialog} from '../helpers/search-helpers.js';

describe('The Search Panel', async () => {
  beforeEach(async () => {
    await resetPages();
  });

  it('provides results across scopes', async () => {
    const {target, frontend} = getBrowserAndPages();
    const SEARCH_QUERY = '[aria-label="Search Query"]';
    const SEARCH_RESULTS = '.search-results';
    const SEARCH_FILE_RESULT = '.search-result';
    const SEARCH_CHILDREN_RESULT = '.search-match-link';

    // Load the search page, which has results in the HTML, JS, and CSS.
    await target.goto(`${resourcesPath}/search/search.html`);

    // Launch the search panel.
    await triggerFindDialog(frontend);
    await waitFor(SEARCH_QUERY);
    const query = await $(SEARCH_QUERY);
    const inputElement = query.asElement();
    if (!inputElement) {
      assert.fail('Unable to find search input field');
      return;
    }

    // Go ahead and search.
    await inputElement.focus();
    await inputElement.type('searchTestUniqueString');
    await frontend.keyboard.press('Enter');

    // Wait for results.
    await waitFor(SEARCH_RESULTS);
    const resultsContainer = await $(SEARCH_RESULTS);
    await waitFor(SEARCH_FILE_RESULT, resultsContainer);

    // Process the results into something manageable.
    const fileResults = await $$(SEARCH_FILE_RESULT, resultsContainer);
    const files = await fileResults.evaluate(result => result.map((value: Element) => {
      const SEARCH_RESULT_FILE_NAME = '.search-result-file-name';
      const SEARCH_RESULT_MATCHES_COUNT = '.search-result-matches-count';

      // Wrap the entries with the file details.
      return {
        fileName: value.querySelector(SEARCH_RESULT_FILE_NAME)!.firstChild!.textContent,
        matchesCount: value.querySelector(SEARCH_RESULT_MATCHES_COUNT)!.textContent,
      };
    }));

    assert.deepEqual(files, [
      {fileName: 'search.css', matchesCount: '3'}, {fileName: 'search.js', matchesCount: '5'},
      {fileName: 'search.html', matchesCount: '4'},
    ]);

    // Now step through the actual entries of the search result.
    const entryResults = await $$(SEARCH_CHILDREN_RESULT, resultsContainer);
    const entries = await entryResults.evaluate(result => result.map((value: Element) => {
      const SEARCH_MATCH_LINE_NUMBER = '.search-match-line-number';
      const SEARCH_MATCH_CONTENT = '.search-match-content';

      return {
        line: value.querySelector(SEARCH_MATCH_LINE_NUMBER)!.textContent,
            content: value.querySelector(SEARCH_MATCH_CONTENT)!.textContent,
      };
    }));

    assert.deepEqual(entries, [
      {line: '1', content: 'div.searchTestUniqueString {'}, {line: '5', content: 'div.searchTestUniqueString:hover {'},
      {line: '6', content: '/* another searchTestUniqueString occurence */'},
      {line: '1', content: 'function searchTestUniqueString() {'},
      {line: '3', content: '// searchTestUniqueString two occurences on the same line searchTestUniqueString'},
      {line: '4', content: '// searchTestUniqueString on the next line.'},
      {line: '9', content: 'searchTestUniqueString();'}, {line: '10', content: '// SEARCHTestUniqueString();'},
      {line: '5', content: '…eval("function searchTestUniqueString() {}");</script>'},
      {line: '7', content: '<div>searchTestUniqueString</div>'},
      {line: '9', content: '<!-- searchTestUniqueString -->'},
      {line: '11', content: '<div id="searchTestUniqueString">div text</div>'},
    ]);
  });
});

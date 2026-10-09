// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import {TestRunner} from '../test_runner/test_runner.js';

/**
 * @file using private properties isn't a Closure violation in tests.
 */

export const dumpSearchResults = function(searchResults) {
  function comparator(a, b) {
    a.url.localeCompare(b.url);
  }

  searchResults.sort(comparator);
  TestRunner.addResult('Search results: ');

  for (let i = 0; i < searchResults.length; i++) {
    TestRunner.addResult(
        'url: ' + searchResults[i].url.replace(/VM\d+/, 'VMXX') + ', matchesCount: ' + searchResults[i].matchesCount);
  }

  TestRunner.addResult('');
};

export const dumpSearchMatches = function(searchMatches) {
  TestRunner.addResult('Search matches: ');

  for (let i = 0; i < searchMatches.length; i++) {
    TestRunner.addResult(
        'lineNumber: ' + searchMatches[i].lineNumber + ', line: \'' + searchMatches[i].lineContent + '\'');
  }

  TestRunner.addResult('');
};

export const runSearchAndDumpResults = function(scope, searchConfig, callback) {
  const searchResults = [];
  const progress = new Common.Progress.Progress();
  scope.performSearch(searchConfig, progress, searchResultCallback, searchFinishedCallback);

  function searchResultCallback(searchResult) {
    searchResults.push(searchResult);
  }

  function searchFinishedCallback() {
    function comparator(searchResultA, searchResultB) {
      const aUrl = searchResultA.uiSourceCode.url();
      const bUrl = searchResultB.uiSourceCode.url();
      return aUrl > bUrl ? 1 : bUrl > aUrl ? -1 : 0;
    }

    searchResults.sort(comparator);

    for (let i = 0; i < searchResults.length; ++i) {
      const searchResult = searchResults[i];
      const uiSourceCode = searchResult.uiSourceCode;
      const searchMatches = searchResult.searchMatches;

      if (!searchMatches.length) {
        continue;
      }

      TestRunner.addResult(
          'Search result #' + (i + 1) + ': uiSourceCode.url = ' + uiSourceCode.url().replace(/VM\d+/, 'VMXX'));

      for (let j = 0; j < searchMatches.length; ++j) {
        const lineNumber = searchMatches[j].lineNumber;
        const lineContent = searchMatches[j].lineContent;
        TestRunner.addResult(
            '  search match #' + (j + 1) + ': lineNumber = ' + lineNumber + ', lineContent = \'' + lineContent + '\'');
      }
    }

    callback();
  }
};

TestRunner.deprecatedInitAsync(`
  if (window.GCController)
    GCController.collect();
`);

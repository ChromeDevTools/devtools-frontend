// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SearchModule from './search.js';

self.Search = self.Search || {};
Search = Search || {};

/**
 * @constructor
 */
Search.SearchConfig = SearchModule.SearchConfig.SearchConfig;

Search.SearchConfig.FilePatternRegex = SearchModule.SearchConfig.FilePatternRegex;

/**
 * @constructor
 */
Search.SearchConfig.QueryTerm = SearchModule.SearchConfig.QueryTerm;

/**
 * @interface
 */
Search.SearchResult = SearchModule.SearchConfig.SearchResult;

/**
 * @interface
 */
Search.SearchScope = SearchModule.SearchConfig.SearchScope;

/**
 * @constructor
 */
Search.SearchResultsPane = SearchModule.SearchResultsPane.SearchResultsPane;
Search.SearchResultsPane._matchesExpandedByDefault = SearchModule.SearchResultsPane.matchesExpandedByDefault;
Search.SearchResultsPane._matchesShownAtOnce = SearchModule.SearchResultsPane.matchesShownAtOnce;

/**
 * @constructor
 */
Search.SearchResultsPane.SearchResultsTreeElement = SearchModule.SearchResultsPane.SearchResultsTreeElement;

/**
 * @constructor
 */
Search.SearchView = SearchModule.SearchView.SearchView;

/** @typedef {!{regex: !RegExp, isNegative: boolean}} */
Search.SearchConfig.RegexQuery;

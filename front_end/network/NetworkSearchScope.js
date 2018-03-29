// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Search.SearchScope}
 */
Network.NetworkSearchScope = class {
  /**
   * @override
   * @param {!Common.Progress} progress
   */
  performIndexing(progress) {
    setImmediate(progress.done.bind(progress));
  }

  /**
   * @override
   * @param {!Search.SearchConfig} searchConfig
   * @param {!Common.Progress} progress
   * @param {function(!Search.SearchResult)} searchResultCallback
   * @param {function(boolean)} searchFinishedCallback
   * @return {?}
   */
  async performSearch(searchConfig, progress, searchResultCallback, searchFinishedCallback) {
    const promises = [];
    const requests =
        BrowserSDK.networkLog.requests().filter(request => searchConfig.filePathMatchesFileQuery(request.url()));
    progress.setTotalWork(requests.length);
    for (const request of requests) {
      const promise = this._searchRequest(searchConfig, request, progress);
      promises.push(promise);
    }
    const results = await Promise.all(promises);
    if (progress.isCanceled()) {
      searchFinishedCallback(false);
      return;
    }
    for (const result of results.sort((r1, r2) => r1.label().localeCompare(r2.label()))) {
      if (result.matchesCount() > 0)
        searchResultCallback(result);
    }
    progress.done();
    searchFinishedCallback(true);
  }

  /**
   * @param {!Search.SearchConfig} searchConfig
   * @param {!SDK.NetworkRequest} request
   * @param {!Common.Progress} progress
   * @return {!Promise<?Network.NetworkSearchResult>}
   */
  async _searchRequest(searchConfig, request, progress) {
    let bodyMatches = [];
    if (request.contentType().isTextType()) {
      bodyMatches =
          await request.searchInContent(searchConfig.query(), !searchConfig.ignoreCase(), searchConfig.isRegex());
    }
    if (progress.isCanceled())
      return null;
    const locations = [];
    for (const header of request.requestHeaders()) {
      if (headerMatchesQuery(header))
        locations.push(new Network.UIRequestLocation(request, header, null, null));
    }
    for (const header of request.responseHeaders) {
      if (headerMatchesQuery(header))
        locations.push(new Network.UIRequestLocation(request, null, header, null));
    }
    for (const match of bodyMatches)
      locations.push(new Network.UIRequestLocation(request, null, null, match));
    progress.worked();
    return new Network.NetworkSearchResult(request, locations);

    /**
     * @param {!SDK.NetworkRequest.NameValue} header
     * @return {boolean}
     */
    function headerMatchesQuery(header) {
      const string = `${header.name}: ${header.value}`;
      const flags = searchConfig.ignoreCase() ? 'i' : '';
      const regExps = searchConfig.queries().map(query => new RegExp(query, flags));
      let pos = 0;
      for (const regExp of regExps) {
        const match = string.substr(pos).match(regExp);
        if (!match)
          return false;
        pos += match.index + match[0].length;
      }
      return true;
    }
  }

  /**
   * @override
   */
  stopSearch() {
  }
};

Network.UIRequestLocation = class {
  /**
   * @param {!SDK.NetworkRequest} request
   * @param {?SDK.NetworkRequest.NameValue} requestHeader
   * @param {?SDK.NetworkRequest.NameValue} responseHeader
   * @param {?Common.ContentProvider.SearchMatch} searchMatch
   */
  constructor(request, requestHeader, responseHeader, searchMatch) {
    this.request = request;
    this.requestHeader = requestHeader;
    this.responseHeader = responseHeader;
    this.searchMatch = searchMatch;
  }
};

/**
 * @implements Search.SearchResult
 */
Network.NetworkSearchResult = class {
  /**
   * @param {!SDK.NetworkRequest} request
   * @param {!Array<!Network.UIRequestLocation>} locations
   */
  constructor(request, locations) {
    this._request = request;
    this._locations = locations;
  }

  /**
   * @override
   * @return {number}
   */
  matchesCount() {
    return this._locations.length;
  }

  /**
   * @override
   * @return {string}
   */
  label() {
    return this._request.url();
  }

  /**
   * @override
   * @return {string}
   */
  description() {
    return this._request.url();
  }

  /**
   * @override
   * @param {number} index
   * @return {string}
   */
  matchLineContent(index) {
    const location = this._locations[index];
    const header = location.requestHeader || location.responseHeader;
    if (header)
      return header.value;
    return location.searchMatch.lineContent;
  }

  /**
   * @override
   * @param {number} index
   * @return {!Object}
   */
  matchRevealable(index) {
    return this._locations[index];
  }

  /**
   * @override
   * @param {number} index
   * @return {?}
   */
  matchLabel(index) {
    const location = this._locations[index];
    const header = location.requestHeader || location.responseHeader;
    if (header)
      return header.name;
    return location.searchMatch.lineNumber + 1;
  }
};

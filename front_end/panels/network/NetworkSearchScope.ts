// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../core/common/common.js'; // eslint-disable-line no-unused-vars
import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js'; // eslint-disable-line no-unused-vars
import * as Logs from '../../models/logs/logs.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js'; // eslint-disable-line no-unused-vars
import type * as Search from '../search/search.js';                      // eslint-disable-line no-unused-vars

const UIStrings = {
  /**
  *@description Text for web URLs
  */
  url: 'URL',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/NetworkSearchScope.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class NetworkSearchScope implements Search.SearchConfig.SearchScope {
  performIndexing(progress: Common.Progress.Progress): void {
    queueMicrotask(() => {
      progress.done();
    });
  }

  async performSearch(
      searchConfig: Search.SearchConfig.SearchConfig, progress: Common.Progress.Progress,
      searchResultCallback: (arg0: Search.SearchConfig.SearchResult) => void,
      searchFinishedCallback: (arg0: boolean) => void): Promise<void> {
    const promises = [];
    const requests = Logs.NetworkLog.NetworkLog.instance().requests().filter(
        request => searchConfig.filePathMatchesFileQuery(request.url()));
    progress.setTotalWork(requests.length);
    for (const request of requests) {
      const promise = this._searchRequest(searchConfig, request, progress);
      promises.push(promise);
    }
    const resultsWithNull = await Promise.all(promises);
    const results = (resultsWithNull.filter(result => result !== null) as NetworkSearchResult[]);
    if (progress.isCanceled()) {
      searchFinishedCallback(false);
      return;
    }
    for (const result of results.sort((r1, r2) => r1.label().localeCompare(r2.label()))) {
      if (result.matchesCount() > 0) {
        searchResultCallback(result);
      }
    }
    progress.done();
    searchFinishedCallback(true);
  }

  async _searchRequest(
      searchConfig: Search.SearchConfig.SearchConfig, request: SDK.NetworkRequest.NetworkRequest,
      progress: Common.Progress.Progress): Promise<NetworkSearchResult|null> {
    let bodyMatches: TextUtils.ContentProvider.SearchMatch[] = [];
    if (request.contentType().isTextType()) {
      bodyMatches =
          await request.searchInContent(searchConfig.query(), !searchConfig.ignoreCase(), searchConfig.isRegex());
    }
    if (progress.isCanceled()) {
      return null;
    }
    const locations = [];
    if (stringMatchesQuery(request.url())) {
      locations.push(UIRequestLocation.urlMatch(request));
    }
    for (const header of request.requestHeaders()) {
      if (headerMatchesQuery(header)) {
        locations.push(UIRequestLocation.requestHeaderMatch(request, header));
      }
    }
    for (const header of request.responseHeaders) {
      if (headerMatchesQuery(header)) {
        locations.push(UIRequestLocation.responseHeaderMatch(request, header));
      }
    }
    for (const match of bodyMatches) {
      locations.push(UIRequestLocation.bodyMatch(request, match));
    }
    progress.worked();
    return new NetworkSearchResult(request, locations);

    function headerMatchesQuery(header: SDK.NetworkRequest.NameValue): boolean {
      return stringMatchesQuery(`${header.name}: ${header.value}`);
    }

    function stringMatchesQuery(string: string): boolean {
      const flags = searchConfig.ignoreCase() ? 'i' : '';
      const regExps = searchConfig.queries().map(query => new RegExp(query, flags));
      let pos = 0;
      for (const regExp of regExps) {
        const match = string.substr(pos).match(regExp);
        if (!match || !match.index) {
          return false;
        }
        pos += match.index + match[0].length;
      }
      return true;
    }
  }

  stopSearch(): void {
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum UIHeaderSection {
  General = 'General',
  Request = 'Request',
  Response = 'Response',
}

interface UIHeaderLocation {
  section: UIHeaderSection;
  header: SDK.NetworkRequest.NameValue|null;
}

export class UIRequestLocation {
  request: SDK.NetworkRequest.NetworkRequest;
  header: UIHeaderLocation|null;
  searchMatch: TextUtils.ContentProvider.SearchMatch|null;
  isUrlMatch: boolean;

  private constructor(
      request: SDK.NetworkRequest.NetworkRequest, header: UIHeaderLocation|null,
      searchMatch: TextUtils.ContentProvider.SearchMatch|null, urlMatch: boolean) {
    this.request = request;
    this.header = header;
    this.searchMatch = searchMatch;
    this.isUrlMatch = urlMatch;
  }

  static requestHeaderMatch(request: SDK.NetworkRequest.NetworkRequest, header: SDK.NetworkRequest.NameValue|null):
      UIRequestLocation {
    return new UIRequestLocation(request, {section: UIHeaderSection.Request, header}, null, false);
  }

  static responseHeaderMatch(request: SDK.NetworkRequest.NetworkRequest, header: SDK.NetworkRequest.NameValue|null):
      UIRequestLocation {
    return new UIRequestLocation(request, {section: UIHeaderSection.Response, header}, null, false);
  }

  static bodyMatch(request: SDK.NetworkRequest.NetworkRequest, searchMatch: TextUtils.ContentProvider.SearchMatch|null):
      UIRequestLocation {
    return new UIRequestLocation(request, null, searchMatch, false);
  }

  static urlMatch(request: SDK.NetworkRequest.NetworkRequest): UIRequestLocation {
    return new UIRequestLocation(request, null, null, true);
  }

  static header(request: SDK.NetworkRequest.NetworkRequest, section: UIHeaderSection, name: string): UIRequestLocation {
    return new UIRequestLocation(request, {section, header: {name, value: ''}}, null, true);
  }
}

export class NetworkSearchResult implements Search.SearchConfig.SearchResult {
  _request: SDK.NetworkRequest.NetworkRequest;
  _locations: UIRequestLocation[];

  constructor(request: SDK.NetworkRequest.NetworkRequest, locations: UIRequestLocation[]) {
    this._request = request;
    this._locations = locations;
  }

  matchesCount(): number {
    return this._locations.length;
  }

  label(): string {
    return this._request.displayName;
  }

  description(): string {
    const parsedUrl = this._request.parsedURL;
    if (!parsedUrl) {
      return this._request.url();
    }
    return parsedUrl.urlWithoutScheme();
  }

  matchLineContent(index: number): string {
    const location = this._locations[index];
    if (location.isUrlMatch) {
      return this._request.url();
    }
    const header = location?.header?.header;
    if (header) {
      return header.value;
    }
    return (location.searchMatch as TextUtils.ContentProvider.SearchMatch).lineContent;
  }

  matchRevealable(index: number): Object {
    return this._locations[index];
  }

  matchLabel(index: number): string {
    const location = this._locations[index];
    if (location.isUrlMatch) {
      return i18nString(UIStrings.url);
    }
    const header = location?.header?.header;
    if (header) {
      return `${header.name}:`;
    }

    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // @ts-expect-error
    return (location.searchMatch as TextUtils.ContentProvider.SearchMatch).lineNumber + 1;
  }
}

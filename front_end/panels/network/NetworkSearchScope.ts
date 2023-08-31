// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Logs from '../../models/logs/logs.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import type * as Search from '../search/search.js';

const UIStrings = {
  /**
   *@description Text for web URLs
   */
  url: 'URL',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/NetworkSearchScope.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class NetworkSearchScope implements Search.SearchScope.SearchScope {
  #networkLog: Logs.NetworkLog.NetworkLog;

  constructor(networkLog: Logs.NetworkLog.NetworkLog) {
    this.#networkLog = networkLog;
  }

  performIndexing(progress: Common.Progress.Progress): void {
    queueMicrotask(() => {
      progress.done();
    });
  }

  async performSearch(
      searchConfig: Workspace.SearchConfig.SearchConfig, progress: Common.Progress.Progress,
      searchResultCallback: (arg0: Search.SearchScope.SearchResult) => void,
      searchFinishedCallback: (arg0: boolean) => void): Promise<void> {
    const promises = [];
    const requests =
        this.#networkLog.requests().filter(request => searchConfig.filePathMatchesFileQuery(request.url()));
    progress.setTotalWork(requests.length);
    for (const request of requests) {
      const promise = this.searchRequest(searchConfig, request, progress);
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

  private async searchRequest(
      searchConfig: Workspace.SearchConfig.SearchConfig, request: SDK.NetworkRequest.NetworkRequest,
      progress: Common.Progress.Progress): Promise<NetworkSearchResult|null> {
    const bodyMatches = await NetworkSearchScope.#responseBodyMatches(searchConfig, request);
    if (progress.isCanceled()) {
      return null;
    }
    const locations = [];
    if (stringMatchesQuery(request.url())) {
      locations.push(NetworkForward.UIRequestLocation.UIRequestLocation.urlMatch(request));
    }
    for (const header of request.requestHeaders()) {
      if (headerMatchesQuery(header)) {
        locations.push(NetworkForward.UIRequestLocation.UIRequestLocation.requestHeaderMatch(request, header));
      }
    }
    for (const header of request.responseHeaders) {
      if (headerMatchesQuery(header)) {
        locations.push(NetworkForward.UIRequestLocation.UIRequestLocation.responseHeaderMatch(request, header));
      }
    }
    for (const match of bodyMatches) {
      locations.push(NetworkForward.UIRequestLocation.UIRequestLocation.bodyMatch(request, match));
    }
    progress.incrementWorked();
    return new NetworkSearchResult(request, locations);

    function headerMatchesQuery(header: SDK.NetworkRequest.NameValue): boolean {
      return stringMatchesQuery(`${header.name}: ${header.value}`);
    }

    function stringMatchesQuery(string: string): boolean {
      const flags = searchConfig.ignoreCase() ? 'i' : '';
      const regExps =
          searchConfig.queries().map(query => new RegExp(Platform.StringUtilities.escapeForRegExp(query), flags));
      let pos = 0;
      for (const regExp of regExps) {
        const match = string.substr(pos).match(regExp);
        if (!match || match.index === undefined) {
          return false;
        }
        pos += match.index + match[0].length;
      }
      return true;
    }
  }

  static async #responseBodyMatches(
      searchConfig: Workspace.SearchConfig.SearchConfig,
      request: SDK.NetworkRequest.NetworkRequest): Promise<TextUtils.ContentProvider.SearchMatch[]> {
    if (!request.contentType().isTextType()) {
      return [];
    }

    let matches: TextUtils.ContentProvider.SearchMatch[] = [];
    for (const query of searchConfig.queries()) {
      const tmpMatches = await request.searchInContent(query, !searchConfig.ignoreCase(), searchConfig.isRegex());
      if (tmpMatches.length === 0) {
        // Mirror file search that all individual queries must produce matches.
        return [];
      }
      matches =
          Platform.ArrayUtilities.mergeOrdered(matches, tmpMatches, TextUtils.ContentProvider.SearchMatch.comparator);
    }
    return matches;
  }

  stopSearch(): void {
  }
}

export class NetworkSearchResult implements Search.SearchScope.SearchResult {
  private readonly request: SDK.NetworkRequest.NetworkRequest;
  private readonly locations: NetworkForward.UIRequestLocation.UIRequestLocation[];

  constructor(
      request: SDK.NetworkRequest.NetworkRequest, locations: NetworkForward.UIRequestLocation.UIRequestLocation[]) {
    this.request = request;
    this.locations = locations;
  }

  matchesCount(): number {
    return this.locations.length;
  }

  label(): string {
    return this.request.displayName;
  }

  description(): string {
    const parsedUrl = this.request.parsedURL;
    if (!parsedUrl) {
      return this.request.url();
    }
    return parsedUrl.urlWithoutScheme();
  }

  matchLineContent(index: number): string {
    const location = this.locations[index];
    if (location.isUrlMatch) {
      return this.request.url();
    }
    const header = location?.header?.header;
    if (header) {
      return header.value;
    }
    return (location.searchMatch as TextUtils.ContentProvider.SearchMatch).lineContent;
  }

  matchRevealable(index: number): Object {
    return this.locations[index];
  }

  matchLabel(index: number): string {
    const location = this.locations[index];
    if (location.isUrlMatch) {
      return i18nString(UIStrings.url);
    }
    const header = location?.header?.header;
    if (header) {
      return `${header.name}:`;
    }

    return ((location.searchMatch as TextUtils.ContentProvider.SearchMatch).lineNumber + 1).toString();
  }

  matchColumn(index: number): number|undefined {
    const location = this.locations[index];
    return location.searchMatch?.columnNumber;
  }

  matchLength(index: number): number|undefined {
    const location = this.locations[index];
    return location.searchMatch?.matchLength;
  }
}

// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
const UIStrings = {
    /**
     * @description Text for web URLs
     */
    url: 'URL',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/NetworkSearchScope.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class NetworkSearchScope {
    #networkLog;
    constructor(networkLog) {
        this.#networkLog = networkLog;
    }
    performIndexing(progress) {
        queueMicrotask(() => {
            progress.done = true;
        });
    }
    async performSearch(searchConfig, progress, searchResultCallback, searchFinishedCallback) {
        const promises = [];
        const requests = this.#networkLog.requests().filter(request => searchConfig.filePathMatchesFileQuery(request.url()));
        progress.totalWork = requests.length;
        for (const request of requests) {
            const promise = this.searchRequest(searchConfig, request, progress);
            promises.push(promise);
        }
        const resultsWithNull = await Promise.all(promises);
        const results = (resultsWithNull.filter(result => result !== null));
        if (progress.canceled) {
            searchFinishedCallback(false);
            return;
        }
        for (const result of results.sort((r1, r2) => r1.label().localeCompare(r2.label()))) {
            if (result.matchesCount() > 0) {
                searchResultCallback(result);
            }
        }
        progress.done = true;
        searchFinishedCallback(true);
    }
    async searchRequest(searchConfig, request, progress) {
        const bodyMatches = await NetworkSearchScope.#responseBodyMatches(searchConfig, request);
        if (progress.canceled) {
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
        ++progress.worked;
        return new NetworkSearchResult(request, locations);
        function headerMatchesQuery(header) {
            return stringMatchesQuery(`${header.name}: ${header.value}`);
        }
        function stringMatchesQuery(string) {
            const flags = searchConfig.ignoreCase() ? 'i' : '';
            const regExps = searchConfig.queries().map(query => new RegExp(Platform.StringUtilities.escapeForRegExp(query), flags));
            let pos = 0;
            for (const regExp of regExps) {
                const match = string.substr(pos).match(regExp);
                if (match?.index === undefined) {
                    return false;
                }
                pos += match.index + match[0].length;
            }
            return true;
        }
    }
    static async #responseBodyMatches(searchConfig, request) {
        if (!request.contentType().isTextType()) {
            return [];
        }
        let matches = [];
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
    stopSearch() {
    }
}
export class NetworkSearchResult {
    request;
    locations;
    constructor(request, locations) {
        this.request = request;
        this.locations = locations;
    }
    matchesCount() {
        return this.locations.length;
    }
    label() {
        return this.request.displayName;
    }
    description() {
        const parsedUrl = this.request.parsedURL;
        if (!parsedUrl) {
            return this.request.url();
        }
        return parsedUrl.urlWithoutScheme();
    }
    matchLineContent(index) {
        const location = this.locations[index];
        if (location.isUrlMatch) {
            return this.request.url();
        }
        const header = location?.header?.header;
        if (header) {
            return header.value;
        }
        return location.searchMatch.lineContent;
    }
    matchRevealable(index) {
        return this.locations[index];
    }
    matchLabel(index) {
        const location = this.locations[index];
        if (location.isUrlMatch) {
            return i18nString(UIStrings.url);
        }
        const header = location?.header?.header;
        if (header) {
            return `${header.name}:`;
        }
        return (location.searchMatch.lineNumber + 1).toString();
    }
    matchColumn(index) {
        const location = this.locations[index];
        return location.searchMatch?.columnNumber;
    }
    matchLength(index) {
        const location = this.locations[index];
        return location.searchMatch?.matchLength;
    }
}
//# sourceMappingURL=NetworkSearchScope.js.map
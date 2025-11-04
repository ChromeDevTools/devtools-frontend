// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export var FilterType;
(function (FilterType) {
    /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
    FilterType["Domain"] = "domain";
    FilterType["HasResponseHeader"] = "has-response-header";
    FilterType["HasRequestHeader"] = "has-request-header";
    FilterType["HasOverrides"] = "has-overrides";
    FilterType["ResponseHeaderValueSetCookie"] = "response-header-set-cookie";
    FilterType["Is"] = "is";
    FilterType["LargerThan"] = "larger-than";
    FilterType["Method"] = "method";
    FilterType["MimeType"] = "mime-type";
    FilterType["MixedContent"] = "mixed-content";
    FilterType["Priority"] = "priority";
    FilterType["Scheme"] = "scheme";
    FilterType["SetCookieDomain"] = "set-cookie-domain";
    FilterType["SetCookieName"] = "set-cookie-name";
    FilterType["SetCookieValue"] = "set-cookie-value";
    FilterType["ResourceType"] = "resource-type";
    FilterType["CookieDomain"] = "cookie-domain";
    FilterType["CookieName"] = "cookie-name";
    FilterType["CookiePath"] = "cookie-path";
    FilterType["CookieValue"] = "cookie-value";
    FilterType["StatusCode"] = "status-code";
    FilterType["Url"] = "url";
    /* eslint-enable @typescript-eslint/naming-convention */
})(FilterType || (FilterType = {}));
export class UIRequestFilter {
    filters;
    constructor(filters) {
        this.filters = filters;
    }
    static filters(filters) {
        return new UIRequestFilter(filters);
    }
}
//# sourceMappingURL=UIFilter.js.map
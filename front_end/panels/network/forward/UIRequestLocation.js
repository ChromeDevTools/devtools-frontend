// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export class UIRequestLocation {
    request;
    header;
    searchMatch;
    isUrlMatch;
    tab;
    filterOptions;
    constructor(request, header, searchMatch, urlMatch, tab, filterOptions) {
        this.request = request;
        this.header = header;
        this.searchMatch = searchMatch;
        this.isUrlMatch = urlMatch;
        this.tab = tab;
        this.filterOptions = filterOptions;
    }
    static requestHeaderMatch(request, header) {
        return new UIRequestLocation(request, { section: "Request" /* UIHeaderSection.REQUEST */, header }, null, false, undefined, undefined);
    }
    static responseHeaderMatch(request, header) {
        return new UIRequestLocation(request, { section: "Response" /* UIHeaderSection.RESPONSE */, header }, null, false, undefined, undefined);
    }
    static bodyMatch(request, searchMatch) {
        return new UIRequestLocation(request, null, searchMatch, false, undefined, undefined);
    }
    static urlMatch(request) {
        return new UIRequestLocation(request, null, null, true, undefined, undefined);
    }
    static header(request, section, name) {
        return new UIRequestLocation(request, { section, header: { name, value: '' } }, null, false, undefined, undefined);
    }
    static tab(request, tab, filterOptions) {
        return new UIRequestLocation(request, null, null, false, tab, filterOptions);
    }
}
//# sourceMappingURL=UIRequestLocation.js.map
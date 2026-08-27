// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export var UIHeaderSection;
(function (UIHeaderSection) {
    UIHeaderSection["GENERAL"] = "General";
    UIHeaderSection["REQUEST"] = "Request";
    UIHeaderSection["RESPONSE"] = "Response";
    UIHeaderSection["EARLY_HINTS"] = "EarlyHints";
})(UIHeaderSection || (UIHeaderSection = {}));
export var UIRequestTabs;
(function (UIRequestTabs) {
    UIRequestTabs["COOKIES"] = "cookies";
    UIRequestTabs["DEVICE_BOUND_SESSIONS"] = "device-bound-sessions";
    UIRequestTabs["EVENT_SOURCE"] = "eventSource";
    UIRequestTabs["HEADERS_COMPONENT"] = "headers-component";
    UIRequestTabs["PAYLOAD"] = "payload";
    UIRequestTabs["INITIATOR"] = "initiator";
    UIRequestTabs["PREVIEW"] = "preview";
    UIRequestTabs["RESPONSE"] = "response";
    UIRequestTabs["TIMING"] = "timing";
    UIRequestTabs["TRUST_TOKENS"] = "trust-tokens";
    UIRequestTabs["WS_FRAMES"] = "web-socket-frames";
    UIRequestTabs["DIRECT_SOCKET_CONNECTION"] = "direct-socket-connection";
    UIRequestTabs["DIRECT_SOCKET_CHUNKS"] = "direct-socket-chunks";
})(UIRequestTabs || (UIRequestTabs = {}));
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
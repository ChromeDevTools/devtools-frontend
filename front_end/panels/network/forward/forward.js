var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/panels/network/forward/NetworkRequestId.ts
var NetworkRequestId_exports = {};
__export(NetworkRequestId_exports, {
  NetworkRequestId: () => NetworkRequestId
});
var NetworkRequestId = class {
  requestId;
  manager;
  constructor(requestId, manager) {
    this.requestId = requestId;
    this.manager = manager;
  }
};

// ../../front_end/panels/network/forward/UIFilter.ts
var UIFilter_exports = {};
__export(UIFilter_exports, {
  FilterType: () => FilterType,
  IsFilterType: () => IsFilterType,
  MixedContentFilterValues: () => MixedContentFilterValues,
  UIRequestFilter: () => UIRequestFilter
});
var FilterType = /* @__PURE__ */ ((FilterType2) => {
  FilterType2["Domain"] = "domain";
  FilterType2["HasResponseHeader"] = "has-response-header";
  FilterType2["HasRequestHeader"] = "has-request-header";
  FilterType2["HasOverrides"] = "has-overrides";
  FilterType2["ResponseHeaderValueSetCookie"] = "response-header-set-cookie";
  FilterType2["Is"] = "is";
  FilterType2["LargerThan"] = "larger-than";
  FilterType2["Method"] = "method";
  FilterType2["MimeType"] = "mime-type";
  FilterType2["MixedContent"] = "mixed-content";
  FilterType2["Priority"] = "priority";
  FilterType2["Scheme"] = "scheme";
  FilterType2["SetCookieDomain"] = "set-cookie-domain";
  FilterType2["SetCookieName"] = "set-cookie-name";
  FilterType2["SetCookieValue"] = "set-cookie-value";
  FilterType2["ResourceType"] = "resource-type";
  FilterType2["CookieDomain"] = "cookie-domain";
  FilterType2["CookieName"] = "cookie-name";
  FilterType2["CookiePath"] = "cookie-path";
  FilterType2["CookieValue"] = "cookie-value";
  FilterType2["StatusCode"] = "status-code";
  FilterType2["Url"] = "url";
  return FilterType2;
})(FilterType || {});
var IsFilterType = /* @__PURE__ */ ((IsFilterType2) => {
  IsFilterType2["RUNNING"] = "running";
  IsFilterType2["FROM_CACHE"] = "from-cache";
  IsFilterType2["SERVICE_WORKER_INTERCEPTED"] = "service-worker-intercepted";
  IsFilterType2["SERVICE_WORKER_INITIATED"] = "service-worker-initiated";
  IsFilterType2["PRELOAD"] = "preloaded";
  return IsFilterType2;
})(IsFilterType || {});
var MixedContentFilterValues = /* @__PURE__ */ ((MixedContentFilterValues2) => {
  MixedContentFilterValues2["ALL"] = "all";
  MixedContentFilterValues2["DISPLAYED"] = "displayed";
  MixedContentFilterValues2["BLOCKED"] = "blocked";
  MixedContentFilterValues2["BLOCK_OVERRIDDEN"] = "block-overridden";
  return MixedContentFilterValues2;
})(MixedContentFilterValues || {});
var UIRequestFilter = class _UIRequestFilter {
  filters;
  constructor(filters) {
    this.filters = filters;
  }
  static filters(filters) {
    return new _UIRequestFilter(filters);
  }
};

// ../../front_end/panels/network/forward/UIRequestLocation.ts
var UIRequestLocation_exports = {};
__export(UIRequestLocation_exports, {
  UIHeaderSection: () => UIHeaderSection,
  UIRequestLocation: () => UIRequestLocation,
  UIRequestTabs: () => UIRequestTabs
});
var UIHeaderSection = /* @__PURE__ */ ((UIHeaderSection2) => {
  UIHeaderSection2["GENERAL"] = "General";
  UIHeaderSection2["REQUEST"] = "Request";
  UIHeaderSection2["RESPONSE"] = "Response";
  UIHeaderSection2["EARLY_HINTS"] = "EarlyHints";
  return UIHeaderSection2;
})(UIHeaderSection || {});
var UIRequestTabs = /* @__PURE__ */ ((UIRequestTabs2) => {
  UIRequestTabs2["COOKIES"] = "cookies";
  UIRequestTabs2["DEVICE_BOUND_SESSIONS"] = "device-bound-sessions";
  UIRequestTabs2["EVENT_SOURCE"] = "eventSource";
  UIRequestTabs2["HEADERS_COMPONENT"] = "headers-component";
  UIRequestTabs2["PAYLOAD"] = "payload";
  UIRequestTabs2["INITIATOR"] = "initiator";
  UIRequestTabs2["PREVIEW"] = "preview";
  UIRequestTabs2["RESPONSE"] = "response";
  UIRequestTabs2["TIMING"] = "timing";
  UIRequestTabs2["TRUST_TOKENS"] = "trust-tokens";
  UIRequestTabs2["WS_FRAMES"] = "web-socket-frames";
  UIRequestTabs2["DIRECT_SOCKET_CONNECTION"] = "direct-socket-connection";
  UIRequestTabs2["DIRECT_SOCKET_CHUNKS"] = "direct-socket-chunks";
  return UIRequestTabs2;
})(UIRequestTabs || {});
var UIRequestLocation = class _UIRequestLocation {
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
    return new _UIRequestLocation(
      request,
      { section: "Request" /* REQUEST */, header },
      null,
      false,
      void 0,
      void 0
    );
  }
  static responseHeaderMatch(request, header) {
    return new _UIRequestLocation(
      request,
      { section: "Response" /* RESPONSE */, header },
      null,
      false,
      void 0,
      void 0
    );
  }
  static bodyMatch(request, searchMatch) {
    return new _UIRequestLocation(request, null, searchMatch, false, void 0, void 0);
  }
  static urlMatch(request) {
    return new _UIRequestLocation(request, null, null, true, void 0, void 0);
  }
  static header(request, section, name) {
    return new _UIRequestLocation(request, { section, header: { name, value: "" } }, null, false, void 0, void 0);
  }
  static tab(request, tab, filterOptions) {
    return new _UIRequestLocation(request, null, null, false, tab, filterOptions);
  }
};
export {
  NetworkRequestId_exports as NetworkRequestId,
  UIFilter_exports as UIFilter,
  UIRequestLocation_exports as UIRequestLocation
};
//# sourceMappingURL=forward.js.map

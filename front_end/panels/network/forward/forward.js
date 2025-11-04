var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/network/forward/NetworkRequestId.js
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

// gen/front_end/panels/network/forward/UIFilter.js
var UIFilter_exports = {};
__export(UIFilter_exports, {
  FilterType: () => FilterType,
  UIRequestFilter: () => UIRequestFilter
});
var FilterType;
(function(FilterType2) {
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
})(FilterType || (FilterType = {}));
var UIRequestFilter = class _UIRequestFilter {
  filters;
  constructor(filters) {
    this.filters = filters;
  }
  static filters(filters) {
    return new _UIRequestFilter(filters);
  }
};

// gen/front_end/panels/network/forward/UIRequestLocation.js
var UIRequestLocation_exports = {};
__export(UIRequestLocation_exports, {
  UIRequestLocation: () => UIRequestLocation
});
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
    return new _UIRequestLocation(request, { section: "Request", header }, null, false, void 0, void 0);
  }
  static responseHeaderMatch(request, header) {
    return new _UIRequestLocation(request, { section: "Response", header }, null, false, void 0, void 0);
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

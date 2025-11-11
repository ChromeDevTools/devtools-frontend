var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/har/HARFormat.js
var HARFormat_exports = {};
__export(HARFormat_exports, {
  HARCallFrame: () => HARCallFrame,
  HARCookie: () => HARCookie,
  HAREntry: () => HAREntry,
  HARInitiator: () => HARInitiator,
  HARLog: () => HARLog,
  HARPage: () => HARPage,
  HARParam: () => HARParam,
  HARRoot: () => HARRoot,
  HARStack: () => HARStack,
  HARTimings: () => HARTimings
});
import * as SDK from "./../../core/sdk/sdk.js";
var HARBase = class _HARBase {
  custom;
  constructor(data) {
    if (!data || typeof data !== "object") {
      throw new Error("First parameter is expected to be an object");
    }
    this.custom = /* @__PURE__ */ new Map();
  }
  static safeDate(data) {
    const date = new Date(data);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
    throw new Error("Invalid date format");
  }
  static safeNumber(data) {
    const result = Number(data);
    if (!Number.isNaN(result)) {
      return result;
    }
    throw new Error("Casting to number results in NaN");
  }
  static optionalNumber(data) {
    return data !== void 0 ? _HARBase.safeNumber(data) : void 0;
  }
  static optionalString(data) {
    return data !== void 0 ? String(data) : void 0;
  }
  customAsString(name) {
    const value = this.custom.get(name);
    if (!value) {
      return void 0;
    }
    return String(value);
  }
  customAsNumber(name) {
    const value = this.custom.get(name);
    if (!value) {
      return void 0;
    }
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) {
      return void 0;
    }
    return numberValue;
  }
  customAsArray(name) {
    const value = this.custom.get(name);
    if (!value) {
      return void 0;
    }
    return Array.isArray(value) ? value : void 0;
  }
  customInitiator() {
    return this.custom.get("initiator");
  }
};
var HARRoot = class extends HARBase {
  log;
  constructor(data) {
    super(data);
    this.log = new HARLog(data["log"]);
  }
};
var HARLog = class extends HARBase {
  version;
  creator;
  browser;
  pages;
  entries;
  comment;
  constructor(data) {
    super(data);
    this.version = String(data["version"]);
    this.creator = new HARCreator(data["creator"]);
    this.browser = data["browser"] ? new HARCreator(data["browser"]) : void 0;
    this.pages = Array.isArray(data["pages"]) ? data["pages"].map((page) => new HARPage(page)) : [];
    if (!Array.isArray(data["entries"])) {
      throw new Error("log.entries is expected to be an array");
    }
    this.entries = data["entries"].map((entry) => new HAREntry(entry));
    this.comment = HARBase.optionalString(data["comment"]);
  }
};
var HARCreator = class extends HARBase {
  name;
  version;
  comment;
  constructor(data) {
    super(data);
    this.name = String(data["name"]);
    this.version = String(data["version"]);
    this.comment = HARBase.optionalString(data["comment"]);
  }
};
var HARPage = class extends HARBase {
  startedDateTime;
  id;
  title;
  pageTimings;
  comment;
  constructor(data) {
    super(data);
    this.startedDateTime = HARBase.safeDate(data["startedDateTime"]);
    this.id = String(data["id"]);
    this.title = String(data["title"]);
    this.pageTimings = new HARPageTimings(data["pageTimings"]);
    this.comment = HARBase.optionalString(data["comment"]);
  }
};
var HARPageTimings = class extends HARBase {
  onContentLoad;
  onLoad;
  comment;
  constructor(data) {
    super(data);
    this.onContentLoad = HARBase.optionalNumber(data["onContentLoad"]);
    this.onLoad = HARBase.optionalNumber(data["onLoad"]);
    this.comment = HARBase.optionalString(data["comment"]);
  }
};
var HAREntry = class extends HARBase {
  pageref;
  startedDateTime;
  time;
  request;
  response;
  timings;
  serverIPAddress;
  connection;
  comment;
  constructor(data) {
    super(data);
    this.pageref = HARBase.optionalString(data["pageref"]);
    this.startedDateTime = HARBase.safeDate(data["startedDateTime"]);
    this.time = HARBase.safeNumber(data["time"]);
    this.request = new HARRequest(data["request"]);
    this.response = new HARResponse(data["response"]);
    this.timings = new HARTimings(data["timings"]);
    this.serverIPAddress = HARBase.optionalString(data["serverIPAddress"]);
    this.connection = HARBase.optionalString(data["connection"]);
    this.comment = HARBase.optionalString(data["comment"]);
    this.custom.set("connectionId", HARBase.optionalString(data["_connectionId"]));
    this.custom.set("fromCache", HARBase.optionalString(data["_fromCache"]));
    this.custom.set("initiator", this.importInitiator(data["_initiator"]));
    this.custom.set("priority", HARBase.optionalString(data["_priority"]));
    this.custom.set("resourceType", HARBase.optionalString(data["_resourceType"]));
    this.custom.set("webSocketMessages", this.importWebSocketMessages(data["_webSocketMessages"]));
  }
  importInitiator(initiator) {
    if (typeof initiator !== "object") {
      return;
    }
    return new HARInitiator(initiator);
  }
  importWebSocketMessages(inputMessages) {
    if (!Array.isArray(inputMessages)) {
      return;
    }
    const outputMessages = [];
    for (const message of inputMessages) {
      if (typeof message !== "object") {
        return;
      }
      outputMessages.push(new HARWebSocketMessage(message));
    }
    return outputMessages;
  }
};
var HARRequest = class extends HARBase {
  method;
  url;
  httpVersion;
  cookies;
  headers;
  queryString;
  postData;
  headersSize;
  bodySize;
  comment;
  constructor(data) {
    super(data);
    this.method = String(data["method"]);
    this.url = String(data["url"]);
    this.httpVersion = String(data["httpVersion"]);
    this.cookies = Array.isArray(data["cookies"]) ? data["cookies"].map((cookie) => new HARCookie(cookie)) : [];
    this.headers = Array.isArray(data["headers"]) ? data["headers"].map((header) => new HARHeader(header)) : [];
    this.queryString = Array.isArray(data["queryString"]) ? data["queryString"].map((qs) => new HARQueryString(qs)) : [];
    this.postData = data["postData"] ? new HARPostData(data["postData"]) : void 0;
    this.headersSize = HARBase.safeNumber(data["headersSize"]);
    this.bodySize = HARBase.safeNumber(data["bodySize"]);
    this.comment = HARBase.optionalString(data["comment"]);
  }
};
var HARResponse = class extends HARBase {
  status;
  statusText;
  httpVersion;
  cookies;
  headers;
  content;
  redirectURL;
  headersSize;
  bodySize;
  comment;
  constructor(data) {
    super(data);
    this.status = HARBase.safeNumber(data["status"]);
    this.statusText = String(data["statusText"]);
    this.httpVersion = String(data["httpVersion"]);
    this.cookies = Array.isArray(data["cookies"]) ? data["cookies"].map((cookie) => new HARCookie(cookie)) : [];
    this.headers = Array.isArray(data["headers"]) ? data["headers"].map((header) => new HARHeader(header)) : [];
    this.content = new HARContent(data["content"]);
    this.redirectURL = String(data["redirectURL"]);
    this.headersSize = HARBase.safeNumber(data["headersSize"]);
    this.bodySize = HARBase.safeNumber(data["bodySize"]);
    this.comment = HARBase.optionalString(data["comment"]);
    this.custom.set("transferSize", HARBase.optionalNumber(data["_transferSize"]));
    this.custom.set("error", HARBase.optionalString(data["_error"]));
    this.custom.set("fetchedViaServiceWorker", Boolean(data["_fetchedViaServiceWorker"]));
    this.custom.set("responseCacheStorageCacheName", HARBase.optionalString(data["_responseCacheStorageCacheName"]));
    this.custom.set("serviceWorkerResponseSource", HARBase.optionalString(data["_serviceWorkerResponseSource"]));
    this.custom.set("serviceWorkerRouterRuleIdMatched", HARBase.optionalNumber(data["_serviceWorkerRouterRuleIdMatched"]));
    this.custom.set("serviceWorkerRouterMatchedSourceType", HARBase.optionalString(data["_serviceWorkerRouterMatchedSourceType"]));
    this.custom.set("serviceWorkerRouterActualSourceType", HARBase.optionalString(data["_serviceWorkerRouterActualSourceType"]));
  }
};
var HARCookie = class extends HARBase {
  name;
  value;
  path;
  domain;
  expires;
  httpOnly;
  secure;
  comment;
  constructor(data) {
    super(data);
    this.name = String(data["name"]);
    this.value = String(data["value"]);
    this.path = HARBase.optionalString(data["path"]);
    this.domain = HARBase.optionalString(data["domain"]);
    this.expires = data["expires"] ? HARBase.safeDate(data["expires"]) : void 0;
    this.httpOnly = data["httpOnly"] !== void 0 ? Boolean(data["httpOnly"]) : void 0;
    this.secure = data["secure"] !== void 0 ? Boolean(data["secure"]) : void 0;
    this.comment = HARBase.optionalString(data["comment"]);
  }
};
var HARHeader = class extends HARBase {
  name;
  value;
  comment;
  constructor(data) {
    super(data);
    this.name = String(data["name"]);
    this.value = String(data["value"]);
    this.comment = HARBase.optionalString(data["comment"]);
  }
};
var HARQueryString = class extends HARBase {
  name;
  value;
  comment;
  constructor(data) {
    super(data);
    this.name = String(data["name"]);
    this.value = String(data["value"]);
    this.comment = HARBase.optionalString(data["comment"]);
  }
};
var HARPostData = class extends HARBase {
  mimeType;
  params;
  text;
  comment;
  constructor(data) {
    super(data);
    this.mimeType = String(data["mimeType"]);
    this.params = Array.isArray(data["params"]) ? data["params"].map((param) => new HARParam(param)) : [];
    this.text = String(data["text"]);
    this.comment = HARBase.optionalString(data["comment"]);
  }
};
var HARParam = class extends HARBase {
  name;
  value;
  fileName;
  contentType;
  comment;
  constructor(data) {
    super(data);
    this.name = String(data["name"]);
    this.value = HARBase.optionalString(data["value"]);
    this.fileName = HARBase.optionalString(data["fileName"]);
    this.contentType = HARBase.optionalString(data["contentType"]);
    this.comment = HARBase.optionalString(data["comment"]);
  }
};
var HARContent = class extends HARBase {
  size;
  compression;
  mimeType;
  text;
  encoding;
  comment;
  constructor(data) {
    super(data);
    this.size = HARBase.safeNumber(data["size"]);
    this.compression = HARBase.optionalNumber(data["compression"]);
    this.mimeType = String(data["mimeType"]);
    this.text = HARBase.optionalString(data["text"]);
    this.encoding = HARBase.optionalString(data["encoding"]);
    this.comment = HARBase.optionalString(data["comment"]);
  }
};
var HARTimings = class extends HARBase {
  blocked;
  dns;
  connect;
  send;
  wait;
  receive;
  ssl;
  comment;
  constructor(data) {
    super(data);
    this.blocked = HARBase.optionalNumber(data["blocked"]);
    this.dns = HARBase.optionalNumber(data["dns"]);
    this.connect = HARBase.optionalNumber(data["connect"]);
    this.send = HARBase.safeNumber(data["send"]);
    this.wait = HARBase.safeNumber(data["wait"]);
    this.receive = HARBase.safeNumber(data["receive"]);
    this.ssl = HARBase.optionalNumber(data["ssl"]);
    this.comment = HARBase.optionalString(data["comment"]);
    this.custom.set("blocked_queueing", HARBase.optionalNumber(data["_blocked_queueing"]));
    this.custom.set("blocked_proxy", HARBase.optionalNumber(data["_blocked_proxy"]));
    this.custom.set("workerStart", HARBase.optionalNumber(data["_workerStart"]));
    this.custom.set("workerReady", HARBase.optionalNumber(data["_workerReady"]));
    this.custom.set("workerFetchStart", HARBase.optionalNumber(data["_workerFetchStart"]));
    this.custom.set("workerRespondWithSettled", HARBase.optionalNumber(data["_workerRespondWithSettled"]));
    this.custom.set("workerRouterEvaluationStart", HARBase.optionalNumber(data["_workerRouterEvaluationStart"]));
    this.custom.set("workerCacheLookupStart", HARBase.optionalNumber(data["_workerCacheLookupStart"]));
  }
};
var HARInitiator = class extends HARBase {
  type;
  url;
  lineNumber;
  requestId;
  stack;
  /**
   * Based on Protocol.Network.Initiator defined in browser_protocol.pdl
   */
  constructor(data) {
    super(data);
    this.type = HARBase.optionalString(data["type"]) ?? "other";
    this.url = HARBase.optionalString(data["url"]);
    this.lineNumber = HARBase.optionalNumber(data["lineNumber"]);
    this.requestId = HARBase.optionalString(data["requestId"]);
    if (data["stack"]) {
      this.stack = new HARStack(data["stack"]);
    }
  }
};
var HARStack = class _HARStack extends HARBase {
  description;
  callFrames;
  parent;
  parentId;
  /**
   * Based on Protocol.Runtime.StackTrace defined in browser_protocol.pdl
   */
  constructor(data) {
    super(data);
    this.callFrames = Array.isArray(data.callFrames) ? data.callFrames.map((item) => item ? new HARCallFrame(item) : null).filter(Boolean) : [];
    if (data["parent"]) {
      this.parent = new _HARStack(data["parent"]);
    }
    this.description = HARBase.optionalString(data["description"]);
    const parentId = data["parentId"];
    if (parentId) {
      this.parentId = {
        id: HARBase.optionalString(parentId["id"]) ?? "",
        debuggerId: HARBase.optionalString(parentId["debuggerId"])
      };
    }
  }
};
var HARCallFrame = class extends HARBase {
  functionName;
  scriptId;
  url = "";
  lineNumber = -1;
  columnNumber = -1;
  /**
   * Based on Protocol.Runtime.CallFrame defined in browser_protocol.pdl
   */
  constructor(data) {
    super(data);
    this.functionName = HARBase.optionalString(data["functionName"]) ?? "";
    this.scriptId = HARBase.optionalString(data["scriptId"]) ?? "";
    this.url = HARBase.optionalString(data["url"]) ?? "";
    this.lineNumber = HARBase.optionalNumber(data["lineNumber"]) ?? -1;
    this.columnNumber = HARBase.optionalNumber(data["columnNumber"]) ?? -1;
  }
};
var HARWebSocketMessage = class extends HARBase {
  time;
  opcode;
  data;
  type;
  constructor(data) {
    super(data);
    this.time = HARBase.optionalNumber(data["time"]);
    this.opcode = HARBase.optionalNumber(data["opcode"]);
    this.data = HARBase.optionalString(data["data"]);
    this.type = HARBase.optionalString(data["type"]);
  }
};

// gen/front_end/models/har/Importer.js
var Importer_exports = {};
__export(Importer_exports, {
  Importer: () => Importer
});
import * as Common from "./../../core/common/common.js";
import * as Platform from "./../../core/platform/platform.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as TextUtils from "./../text_utils/text_utils.js";
var Importer = class _Importer {
  static requestsFromHARLog(log) {
    const pages = /* @__PURE__ */ new Map();
    for (const page of log.pages) {
      pages.set(page.id, page);
    }
    log.entries.sort((a, b) => a.startedDateTime.valueOf() - b.startedDateTime.valueOf());
    const pageLoads = /* @__PURE__ */ new Map();
    const requests = [];
    for (const entry of log.entries) {
      const pageref = entry.pageref;
      let pageLoad = pageref ? pageLoads.get(pageref) : void 0;
      const documentURL = pageLoad ? pageLoad.mainRequest.url() : entry.request.url;
      let initiator = null;
      const initiatorEntry = entry.customInitiator();
      if (initiatorEntry) {
        initiator = {
          type: initiatorEntry.type,
          url: initiatorEntry.url,
          lineNumber: initiatorEntry.lineNumber,
          requestId: initiatorEntry.requestId,
          stack: initiatorEntry.stack
        };
      }
      const request = SDK2.NetworkRequest.NetworkRequest.createWithoutBackendRequest("har-" + requests.length, entry.request.url, documentURL, initiator);
      const page = pageref ? pages.get(pageref) : void 0;
      if (!pageLoad && pageref && page) {
        pageLoad = _Importer.buildPageLoad(page, request);
        pageLoads.set(pageref, pageLoad);
      }
      _Importer.fillRequestFromHAREntry(request, entry, pageLoad);
      if (pageLoad) {
        pageLoad.bindRequest(request);
      }
      requests.push(request);
    }
    return requests;
  }
  static buildPageLoad(page, mainRequest) {
    const pageLoad = new SDK2.PageLoad.PageLoad(mainRequest);
    pageLoad.startTime = page.startedDateTime.valueOf();
    pageLoad.contentLoadTime = Number(page.pageTimings.onContentLoad) * 1e3;
    pageLoad.loadTime = Number(page.pageTimings.onLoad) * 1e3;
    return pageLoad;
  }
  static fillCookieFromHARCookie(type, harCookie) {
    const cookie = new SDK2.Cookie.Cookie(harCookie.name, harCookie.value, type);
    if (harCookie.path) {
      cookie.addAttribute("path", harCookie.path);
    }
    if (harCookie.domain) {
      cookie.addAttribute("domain", harCookie.domain);
    }
    if (harCookie.expires) {
      cookie.addAttribute("expires", harCookie.expires.getTime());
    }
    if (harCookie.httpOnly) {
      cookie.addAttribute(
        "http-only"
        /* SDK.Cookie.Attribute.HTTP_ONLY */
      );
    }
    if (harCookie.secure) {
      cookie.addAttribute(
        "secure"
        /* SDK.Cookie.Attribute.SECURE */
      );
    }
    return cookie;
  }
  static fillRequestFromHAREntry(request, entry, pageLoad) {
    if (entry.request.postData) {
      request.setRequestFormData(true, entry.request.postData.text);
    } else {
      request.setRequestFormData(false, null);
    }
    request.connectionId = entry.customAsString("connectionId") || "";
    request.requestMethod = entry.request.method;
    request.setRequestHeaders(entry.request.headers);
    if (entry.response.content.mimeType && entry.response.content.mimeType !== "x-unknown") {
      request.mimeType = entry.response.content.mimeType;
    }
    request.responseHeaders = entry.response.headers;
    request.statusCode = entry.response.status;
    request.statusText = entry.response.statusText;
    let protocol = entry.response.httpVersion.toLowerCase();
    if (protocol === "http/2.0") {
      protocol = "h2";
    }
    request.protocol = protocol.replace(/^http\/2\.0?\+quic/, "http/2+quic");
    const issueTime = entry.startedDateTime.getTime() / 1e3;
    request.setIssueTime(issueTime, issueTime);
    const contentSize = entry.response.content.size > 0 ? entry.response.content.size : 0;
    const headersSize = entry.response.headersSize > 0 ? entry.response.headersSize : 0;
    const bodySize = entry.response.bodySize > 0 ? entry.response.bodySize : 0;
    request.resourceSize = contentSize || headersSize + bodySize;
    let transferSize = entry.response.customAsNumber("transferSize");
    if (transferSize === void 0) {
      transferSize = entry.response.headersSize + entry.response.bodySize;
    }
    request.setTransferSize(transferSize >= 0 ? transferSize : 0);
    const fromCache = entry.customAsString("fromCache");
    if (fromCache === "memory") {
      request.setFromMemoryCache();
    } else if (fromCache === "disk") {
      request.setFromDiskCache();
    }
    const contentText = entry.response.content.text;
    const isBase64 = entry.response.content.encoding === "base64";
    const { mimeType, charset } = Platform.MimeType.parseContentType(entry.response.content.mimeType);
    request.setContentDataProvider(async () => new TextUtils.ContentData.ContentData(contentText ?? "", isBase64, mimeType ?? "", charset ?? void 0));
    if (request.mimeType === "text/event-stream" && contentText) {
      const issueTime2 = entry.startedDateTime.getTime() / 1e3;
      const onEvent = (eventName, data, eventId) => {
        request.addEventSourceMessage(issueTime2, eventName, eventId, data);
      };
      const parser = new SDK2.ServerSentEventProtocol.ServerSentEventsParser(onEvent, charset ?? void 0);
      let text = contentText;
      if (isBase64) {
        const bytes = Common.Base64.decode(contentText);
        text = new TextDecoder(charset ?? void 0).decode(bytes);
      }
      parser.addTextChunk(text);
    }
    _Importer.setupTiming(request, issueTime, entry.time, entry.timings);
    request.setRemoteAddress(entry.serverIPAddress || "", Number(entry.connection) || 80);
    request.setResourceType(_Importer.getResourceType(request, entry, pageLoad));
    const includedRequestCookies = entry.request.cookies.map((cookie) => ({
      cookie: this.fillCookieFromHARCookie(0, cookie),
      exemptionReason: void 0
    }));
    request.setIncludedRequestCookies(includedRequestCookies);
    const responseCookies = entry.response.cookies.map(this.fillCookieFromHARCookie.bind(
      this,
      1
      /* SDK.Cookie.Type.RESPONSE */
    ));
    request.responseCookies = responseCookies;
    const priority = entry.customAsString("priority");
    if (priority && Protocol.Network.ResourcePriority.hasOwnProperty(priority)) {
      request.setPriority(priority);
    }
    const messages = entry.customAsArray("webSocketMessages");
    if (messages) {
      for (const message of messages) {
        if (message.time === void 0) {
          continue;
        }
        if (!Object.values(SDK2.NetworkRequest.WebSocketFrameType).includes(message.type)) {
          continue;
        }
        if (message.opcode === void 0) {
          continue;
        }
        if (message.data === void 0) {
          continue;
        }
        const mask = message.type === SDK2.NetworkRequest.WebSocketFrameType.Send;
        request.addFrame({ time: message.time, text: message.data, opCode: message.opcode, mask, type: message.type });
      }
    }
    request.fetchedViaServiceWorker = Boolean(entry.response.custom.get("fetchedViaServiceWorker"));
    const serviceWorkerResponseSource = entry.response.customAsString("serviceWorkerResponseSource");
    if (serviceWorkerResponseSource) {
      const sources = /* @__PURE__ */ new Set([
        "cache-storage",
        "fallback-code",
        "http-cache",
        "network"
      ]);
      if (sources.has(serviceWorkerResponseSource)) {
        request.setServiceWorkerResponseSource(serviceWorkerResponseSource);
      }
    }
    const responseCacheStorageCacheName = entry.response.customAsString("responseCacheStorageCacheName");
    if (responseCacheStorageCacheName) {
      request.setResponseCacheStorageCacheName(responseCacheStorageCacheName);
    }
    const ruleIdMatched = entry.response.customAsNumber("serviceWorkerRouterRuleIdMatched");
    if (ruleIdMatched !== void 0) {
      const routerInfo = {
        ruleIdMatched,
        matchedSourceType: entry.response.customAsString("serviceWorkerRouterMatchedSourceType"),
        actualSourceType: entry.response.customAsString("serviceWorkerRouterActualSourceType")
      };
      request.serviceWorkerRouterInfo = routerInfo;
    }
    request.finished = true;
  }
  static getResourceType(request, entry, pageLoad) {
    const customResourceTypeName = entry.customAsString("resourceType");
    if (customResourceTypeName) {
      const customResourceType = Common.ResourceType.ResourceType.fromName(customResourceTypeName);
      if (customResourceType) {
        return customResourceType;
      }
    }
    if (pageLoad && pageLoad.mainRequest === request) {
      return Common.ResourceType.resourceTypes.Document;
    }
    const resourceTypeFromMime = Common.ResourceType.ResourceType.fromMimeType(entry.response.content.mimeType);
    if (resourceTypeFromMime !== Common.ResourceType.resourceTypes.Other) {
      return resourceTypeFromMime;
    }
    const resourceTypeFromUrl = Common.ResourceType.ResourceType.fromURL(entry.request.url);
    if (resourceTypeFromUrl) {
      return resourceTypeFromUrl;
    }
    return Common.ResourceType.resourceTypes.Other;
  }
  static setupTiming(request, issueTime, entryTotalDuration, timings) {
    function accumulateTime(timing2) {
      if (timing2 === void 0 || timing2 < 0) {
        return -1;
      }
      lastEntry += timing2;
      return lastEntry;
    }
    let lastEntry = timings.blocked && timings.blocked >= 0 ? timings.blocked : 0;
    const proxy = timings.customAsNumber("blocked_proxy") || -1;
    const queueing = timings.customAsNumber("blocked_queueing") || -1;
    if (lastEntry > 0 && queueing > 0) {
      lastEntry -= queueing;
    }
    const ssl = timings.ssl && timings.ssl >= 0 ? timings.ssl : 0;
    if (timings.connect && timings.connect > 0) {
      timings.connect -= ssl;
    }
    const timing = {
      proxyStart: proxy > 0 ? lastEntry - proxy : -1,
      proxyEnd: proxy > 0 ? lastEntry : -1,
      requestTime: issueTime + (queueing > 0 ? queueing : 0) / 1e3,
      dnsStart: timings.dns && timings.dns >= 0 ? lastEntry : -1,
      dnsEnd: accumulateTime(timings.dns),
      // Add ssl to end time without modifying lastEntry (see comment above).
      connectStart: timings.connect && timings.connect >= 0 ? lastEntry : -1,
      connectEnd: accumulateTime(timings.connect) + ssl,
      // Now update lastEntry to add ssl timing back in (see comment above).
      sslStart: timings.ssl && timings.ssl >= 0 ? lastEntry : -1,
      sslEnd: accumulateTime(timings.ssl),
      workerStart: timings.customAsNumber("workerStart") || -1,
      workerReady: timings.customAsNumber("workerReady") || -1,
      workerFetchStart: timings.customAsNumber("workerFetchStart") || -1,
      workerRespondWithSettled: timings.customAsNumber("workerRespondWithSettled") || -1,
      workerRouterEvaluationStart: timings.customAsNumber("workerRouterEvaluationStart"),
      workerCacheLookupStart: timings.customAsNumber("workerCacheLookupStart"),
      sendStart: timings.send >= 0 ? lastEntry : -1,
      sendEnd: accumulateTime(timings.send),
      pushStart: 0,
      pushEnd: 0,
      receiveHeadersStart: timings.wait && timings.wait >= 0 ? lastEntry : -1,
      receiveHeadersEnd: accumulateTime(timings.wait)
    };
    accumulateTime(timings.receive);
    request.timing = timing;
    request.endTime = issueTime + Math.max(entryTotalDuration, lastEntry) / 1e3;
  }
};

// gen/front_end/models/har/Log.js
var Log_exports = {};
__export(Log_exports, {
  Entry: () => Entry,
  Log: () => Log
});
import * as Common2 from "./../../core/common/common.js";
import * as SDK3 from "./../../core/sdk/sdk.js";
var Log = class _Log {
  static pseudoWallTime(request, monotonicTime) {
    return new Date(request.pseudoWallTime(monotonicTime) * 1e3);
  }
  static async build(requests, options) {
    const log = new _Log();
    const entryPromises = [];
    for (const request of requests) {
      entryPromises.push(Entry.build(request, options));
    }
    const entries = await Promise.all(entryPromises);
    return { version: "1.2", creator: log.creator(), pages: log.buildPages(requests), entries };
  }
  creator() {
    const webKitVersion = /AppleWebKit\/([^ ]+)/.exec(window.navigator.userAgent);
    return { name: "WebInspector", version: webKitVersion ? webKitVersion[1] : "n/a" };
  }
  buildPages(requests) {
    const seenIdentifiers = /* @__PURE__ */ new Set();
    const pages = [];
    for (let i = 0; i < requests.length; ++i) {
      const request = requests[i];
      const page = SDK3.PageLoad.PageLoad.forRequest(request);
      if (!page || seenIdentifiers.has(page.id)) {
        continue;
      }
      seenIdentifiers.add(page.id);
      pages.push(this.convertPage(page, request));
    }
    return pages;
  }
  convertPage(page, request) {
    return {
      startedDateTime: _Log.pseudoWallTime(request, page.startTime).toJSON(),
      id: "page_" + page.id,
      title: page.url,
      pageTimings: {
        onContentLoad: this.pageEventTime(page, page.contentLoadTime),
        onLoad: this.pageEventTime(page, page.loadTime)
      }
    };
  }
  pageEventTime(page, time) {
    const startTime = page.startTime;
    if (time === -1 || startTime === -1) {
      return -1;
    }
    return Entry.toMilliseconds(time - startTime);
  }
};
var Entry = class _Entry {
  request;
  constructor(request) {
    this.request = request;
  }
  static toMilliseconds(time) {
    return time === -1 ? -1 : time * 1e3;
  }
  static async build(request, options) {
    const harEntry = new _Entry(request);
    let ipAddress = harEntry.request.remoteAddress();
    const portPositionInString = ipAddress.lastIndexOf(":");
    const connection = portPositionInString !== -1 ? ipAddress.substring(portPositionInString + 1) : void 0;
    if (portPositionInString !== -1) {
      ipAddress = ipAddress.substr(0, portPositionInString);
    }
    const timings = harEntry.buildTimings();
    let time = 0;
    for (const t of [timings.blocked, timings.dns, timings.connect, timings.send, timings.wait, timings.receive]) {
      time += Math.max(t, 0);
    }
    const initiator = harEntry.request.initiator();
    let exportedInitiator = null;
    if (initiator) {
      exportedInitiator = {
        type: initiator.type
      };
      if (initiator.url !== void 0) {
        exportedInitiator.url = initiator.url;
      }
      if (initiator.requestId !== void 0) {
        exportedInitiator.requestId = initiator.requestId;
      }
      if (initiator.lineNumber !== void 0) {
        exportedInitiator.lineNumber = initiator.lineNumber;
      }
      if (initiator.stack) {
        exportedInitiator.stack = initiator.stack;
      }
    }
    const entry = {
      _connectionId: void 0,
      _fromCache: void 0,
      _initiator: exportedInitiator,
      _priority: harEntry.request.priority(),
      _resourceType: harEntry.request.resourceType().name(),
      _webSocketMessages: void 0,
      cache: {},
      connection,
      pageref: void 0,
      request: await harEntry.buildRequest(),
      response: harEntry.buildResponse(),
      // IPv6 address should not have square brackets per (https://tools.ietf.org/html/rfc2373#section-2.2).
      serverIPAddress: ipAddress.replace(/\[\]/g, ""),
      startedDateTime: Log.pseudoWallTime(harEntry.request, harEntry.request.issueTime()).toJSON(),
      time,
      timings
    };
    if (options.sanitize) {
      entry.response.cookies = [];
      entry.response.headers = entry.response.headers.filter(({ name }) => !["set-cookie"].includes(name.toLocaleLowerCase()));
      entry.request.cookies = [];
      entry.request.headers = entry.request.headers.filter(({ name }) => !["authorization", "cookie"].includes(name.toLocaleLowerCase()));
    }
    if (harEntry.request.cached()) {
      entry._fromCache = harEntry.request.cachedInMemory() ? "memory" : "disk";
    } else {
      delete entry._fromCache;
    }
    if (harEntry.request.connectionId !== "0") {
      entry._connectionId = harEntry.request.connectionId;
    } else {
      delete entry._connectionId;
    }
    const page = SDK3.PageLoad.PageLoad.forRequest(harEntry.request);
    if (page) {
      entry.pageref = "page_" + page.id;
    } else {
      delete entry.pageref;
    }
    if (harEntry.request.resourceType() === Common2.ResourceType.resourceTypes.WebSocket) {
      const messages = [];
      for (const message of harEntry.request.frames()) {
        messages.push({ type: message.type, time: message.time, opcode: message.opCode, data: message.text });
      }
      entry._webSocketMessages = messages;
    } else {
      delete entry._webSocketMessages;
    }
    return entry;
  }
  async buildRequest() {
    const headersText = this.request.requestHeadersText();
    const res = {
      method: this.request.requestMethod,
      url: this.buildRequestURL(this.request.url()),
      httpVersion: this.request.requestHttpVersion(),
      headers: this.request.requestHeaders(),
      queryString: this.buildParameters(this.request.queryParameters || []),
      cookies: this.buildCookies(this.request.includedRequestCookies().map((includedRequestCookie) => includedRequestCookie.cookie)),
      headersSize: headersText ? headersText.length : -1,
      bodySize: await this.requestBodySize(),
      postData: void 0
    };
    const postData = await this.buildPostData();
    if (postData) {
      res.postData = postData;
    } else {
      delete res.postData;
    }
    return res;
  }
  buildResponse() {
    const headersText = this.request.responseHeadersText;
    return {
      status: this.request.statusCode,
      statusText: this.request.statusText,
      httpVersion: this.request.responseHttpVersion(),
      headers: this.request.responseHeaders,
      cookies: this.buildCookies(this.request.responseCookies),
      content: this.buildContent(),
      redirectURL: this.request.responseHeaderValue("Location") || "",
      headersSize: headersText ? headersText.length : -1,
      bodySize: this.responseBodySize,
      _transferSize: this.request.transferSize,
      _error: this.request.localizedFailDescription,
      _fetchedViaServiceWorker: this.request.fetchedViaServiceWorker,
      _responseCacheStorageCacheName: this.request.getResponseCacheStorageCacheName(),
      _serviceWorkerResponseSource: this.request.serviceWorkerResponseSource(),
      _serviceWorkerRouterRuleIdMatched: this.request.serviceWorkerRouterInfo?.ruleIdMatched ?? void 0,
      _serviceWorkerRouterMatchedSourceType: this.request.serviceWorkerRouterInfo?.matchedSourceType ?? void 0,
      _serviceWorkerRouterActualSourceType: this.request.serviceWorkerRouterInfo?.actualSourceType ?? void 0
    };
  }
  buildContent() {
    const content = {
      size: this.request.resourceSize,
      mimeType: this.request.mimeType || "x-unknown",
      compression: void 0
    };
    const compression = this.responseCompression;
    if (typeof compression === "number") {
      content.compression = compression;
    } else {
      delete content.compression;
    }
    return content;
  }
  buildTimings() {
    const timing = this.request.timing;
    const issueTime = this.request.issueTime();
    const startTime = this.request.startTime;
    const result = {
      blocked: -1,
      dns: -1,
      ssl: -1,
      connect: -1,
      send: 0,
      wait: 0,
      receive: 0,
      _blocked_queueing: -1,
      _blocked_proxy: void 0
    };
    const queuedTime = issueTime < startTime ? startTime - issueTime : -1;
    result.blocked = _Entry.toMilliseconds(queuedTime);
    result._blocked_queueing = _Entry.toMilliseconds(queuedTime);
    let highestTime = 0;
    if (timing) {
      const blockedStart = leastNonNegative([timing.dnsStart, timing.connectStart, timing.sendStart]);
      if (blockedStart !== Infinity) {
        result.blocked += blockedStart;
      }
      if (timing.proxyEnd !== -1) {
        result._blocked_proxy = timing.proxyEnd - timing.proxyStart;
      }
      if (result._blocked_proxy && result._blocked_proxy > result.blocked) {
        result.blocked = result._blocked_proxy;
      }
      const dnsStart = timing.dnsEnd >= 0 ? blockedStart : 0;
      const dnsEnd = timing.dnsEnd >= 0 ? timing.dnsEnd : -1;
      result.dns = dnsEnd - dnsStart;
      const sslStart = timing.sslEnd > 0 ? timing.sslStart : 0;
      const sslEnd = timing.sslEnd > 0 ? timing.sslEnd : -1;
      result.ssl = sslEnd - sslStart;
      const connectStart = timing.connectEnd >= 0 ? leastNonNegative([dnsEnd, blockedStart]) : 0;
      const connectEnd = timing.connectEnd >= 0 ? timing.connectEnd : -1;
      result.connect = connectEnd - connectStart;
      const sendStart = timing.sendEnd >= 0 ? Math.max(connectEnd, dnsEnd, blockedStart) : 0;
      const sendEnd = timing.sendEnd >= 0 ? timing.sendEnd : 0;
      result.send = sendEnd - sendStart;
      if (result.send < 0) {
        result.send = 0;
      }
      highestTime = Math.max(sendEnd, connectEnd, sslEnd, dnsEnd, blockedStart, 0);
      result._workerStart = timing.workerStart;
      result._workerReady = timing.workerReady;
      result._workerFetchStart = timing.workerFetchStart;
      result._workerRespondWithSettled = timing.workerRespondWithSettled;
      result._workerRouterEvaluationStart = timing.workerRouterEvaluationStart;
      result._workerCacheLookupStart = timing.workerCacheLookupStart;
    } else if (this.request.responseReceivedTime === -1) {
      result.blocked = _Entry.toMilliseconds(this.request.endTime - issueTime);
      return result;
    }
    const requestTime = timing ? timing.requestTime : startTime;
    const waitStart = highestTime;
    const waitEnd = _Entry.toMilliseconds(this.request.responseReceivedTime - requestTime);
    result.wait = waitEnd - waitStart;
    const receiveStart = waitEnd;
    const receiveEnd = _Entry.toMilliseconds(this.request.endTime - requestTime);
    result.receive = Math.max(receiveEnd - receiveStart, 0);
    return result;
    function leastNonNegative(values) {
      return values.reduce((best, value) => value >= 0 && value < best ? value : best, Infinity);
    }
  }
  async buildPostData() {
    const postData = await this.request.requestFormData();
    if (!postData) {
      return null;
    }
    const res = { mimeType: this.request.requestContentType() || "", text: postData, params: void 0 };
    const formParameters = await this.request.formParameters();
    if (formParameters) {
      res.params = this.buildParameters(formParameters);
    } else {
      delete res.params;
    }
    return res;
  }
  buildParameters(parameters) {
    return parameters.slice();
  }
  buildRequestURL(url) {
    return Common2.ParsedURL.ParsedURL.split(url, "#", 2)[0];
  }
  buildCookies(cookies) {
    return cookies.map(this.buildCookie.bind(this));
  }
  buildCookie(cookie) {
    const c = {
      name: cookie.name(),
      value: cookie.value(),
      path: cookie.path(),
      domain: cookie.domain(),
      expires: cookie.expiresDate(Log.pseudoWallTime(this.request, this.request.startTime)),
      httpOnly: cookie.httpOnly(),
      secure: cookie.secure(),
      sameSite: void 0,
      partitionKey: void 0
    };
    if (cookie.sameSite()) {
      c.sameSite = cookie.sameSite();
    } else {
      delete c.sameSite;
    }
    if (cookie.partitionKey()) {
      c.partitionKey = cookie.partitionKey();
    } else {
      delete c.partitionKey;
    }
    return c;
  }
  async requestBodySize() {
    const postData = await this.request.requestFormData();
    if (!postData) {
      return 0;
    }
    return new TextEncoder().encode(postData).length;
  }
  get responseBodySize() {
    if (this.request.cached() || this.request.statusCode === 304) {
      return 0;
    }
    if (!this.request.responseHeadersText) {
      return -1;
    }
    return this.request.transferSize - this.request.responseHeadersText.length;
  }
  get responseCompression() {
    if (this.request.cached() || this.request.statusCode === 304 || this.request.statusCode === 206) {
      return;
    }
    if (!this.request.responseHeadersText) {
      return;
    }
    return this.request.resourceSize - this.responseBodySize;
  }
};

// gen/front_end/models/har/Writer.js
var Writer_exports = {};
__export(Writer_exports, {
  Writer: () => Writer,
  chunkSize: () => chunkSize,
  jsonIndent: () => jsonIndent
});
import * as Common3 from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Platform2 from "./../../core/platform/platform.js";
import * as TextUtils2 from "./../text_utils/text_utils.js";
var UIStrings = {
  /**
   * @description Title of progress in harwriter of the network panel
   */
  collectingContent: "Collecting content\u2026",
  /**
   * @description Text to indicate DevTools is writing to a file
   */
  writingFile: "Writing file\u2026"
};
var str_ = i18n.i18n.registerUIStrings("models/har/Writer.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var Writer = class _Writer {
  static async write(stream, requests, options, progress) {
    const compositeProgress = new Common3.Progress.CompositeProgress(progress);
    const content = await _Writer.harStringForRequests(requests, options, compositeProgress);
    if (progress.canceled) {
      return;
    }
    await _Writer.writeToStream(stream, compositeProgress, content);
  }
  static async harStringForRequests(requests, options, compositeProgress) {
    const progress = compositeProgress.createSubProgress();
    progress.title = i18nString(UIStrings.collectingContent);
    progress.totalWork = requests.length;
    requests.sort((reqA, reqB) => reqA.issueTime() - reqB.issueTime());
    const harLog = await Log.build(requests, options);
    const promises = [];
    for (let i = 0; i < requests.length; i++) {
      const promise = requests[i].requestContentData();
      promises.push(promise.then(contentLoaded.bind(null, harLog.entries[i])));
    }
    await Promise.all(promises);
    progress.done = true;
    if (progress.canceled) {
      return "";
    }
    return JSON.stringify({ log: harLog }, null, jsonIndent);
    function isValidCharacter(codePoint) {
      return codePoint < 55296 || codePoint >= 57344 && codePoint < 64976 || codePoint > 65007 && codePoint <= 1114111 && (codePoint & 65534) !== 65534;
    }
    function needsEncoding(content) {
      for (let i = 0; i < content.length; i++) {
        if (!isValidCharacter(content.charCodeAt(i))) {
          return true;
        }
      }
      return false;
    }
    function contentLoaded(entry, contentDataOrError) {
      ++progress.worked;
      const contentData = TextUtils2.ContentData.ContentData.asDeferredContent(contentDataOrError);
      let encoded = contentData.isEncoded;
      if (contentData.content !== null) {
        let content = contentData.content;
        if (content && !encoded && needsEncoding(content)) {
          content = Platform2.StringUtilities.toBase64(content);
          encoded = true;
        }
        entry.response.content.text = content;
      }
      if (encoded) {
        entry.response.content.encoding = "base64";
      }
    }
  }
  static async writeToStream(stream, compositeProgress, fileContent) {
    const progress = compositeProgress.createSubProgress();
    progress.title = i18nString(UIStrings.writingFile);
    progress.totalWork = fileContent.length;
    for (let i = 0; i < fileContent.length && !progress.canceled; i += chunkSize) {
      const chunk = fileContent.substr(i, chunkSize);
      await stream.write(chunk);
      progress.worked += chunk.length;
    }
    progress.done = true;
  }
};
var jsonIndent = 2;
var chunkSize = 1e5;
export {
  HARFormat_exports as HARFormat,
  Importer_exports as Importer,
  Log_exports as Log,
  Writer_exports as Writer
};
//# sourceMappingURL=har.js.map

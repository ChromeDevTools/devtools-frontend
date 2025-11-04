var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/logs/LogManager.js
var LogManager_exports = {};
__export(LogManager_exports, {
  LogManager: () => LogManager
});
import * as Common2 from "./../../core/common/common.js";
import * as SDK2 from "./../../core/sdk/sdk.js";

// gen/front_end/models/logs/NetworkLog.js
var NetworkLog_exports = {};
__export(NetworkLog_exports, {
  Events: () => Events,
  NetworkLog: () => NetworkLog
});
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as SDK from "./../../core/sdk/sdk.js";
var UIStrings = {
  /**
   * @description When DevTools doesn't know the URL that initiated a network request, we
   * show this phrase instead. 'unknown' would also work in this context.
   */
  anonymous: "<anonymous>"
};
var str_ = i18n.i18n.registerUIStrings("models/logs/NetworkLog.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var networkLogInstance;
var NetworkLog = class _NetworkLog extends Common.ObjectWrapper.ObjectWrapper {
  #requests = [];
  #sentNetworkRequests = [];
  #receivedNetworkResponses = [];
  #requestsSet = /* @__PURE__ */ new Set();
  #requestsMap = /* @__PURE__ */ new Map();
  #pageLoadForManager = /* @__PURE__ */ new Map();
  #unresolvedPreflightRequests = /* @__PURE__ */ new Map();
  #modelListeners = /* @__PURE__ */ new WeakMap();
  #initiatorData = /* @__PURE__ */ new WeakMap();
  #isRecording = true;
  constructor() {
    super();
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.NetworkManager.NetworkManager, this);
    const recordLogSetting = Common.Settings.Settings.instance().moduleSetting("network-log.record-log");
    recordLogSetting.addChangeListener(() => {
      const preserveLogSetting = Common.Settings.Settings.instance().moduleSetting("network-log.preserve-log");
      if (!preserveLogSetting.get() && recordLogSetting.get()) {
        this.reset(true);
      }
      this.setIsRecording(recordLogSetting.get());
    }, this);
  }
  static instance() {
    if (!networkLogInstance) {
      networkLogInstance = new _NetworkLog();
    }
    return networkLogInstance;
  }
  static removeInstance() {
    networkLogInstance = void 0;
  }
  modelAdded(networkManager) {
    const eventListeners = [];
    eventListeners.push(networkManager.addEventListener(SDK.NetworkManager.Events.RequestStarted, this.onRequestStarted, this));
    eventListeners.push(networkManager.addEventListener(SDK.NetworkManager.Events.RequestUpdated, this.onRequestUpdated, this));
    eventListeners.push(networkManager.addEventListener(SDK.NetworkManager.Events.RequestRedirected, this.onRequestRedirect, this));
    eventListeners.push(networkManager.addEventListener(SDK.NetworkManager.Events.RequestFinished, this.onRequestUpdated, this));
    eventListeners.push(networkManager.addEventListener(SDK.NetworkManager.Events.MessageGenerated, this.networkMessageGenerated.bind(this, networkManager)));
    eventListeners.push(networkManager.addEventListener(SDK.NetworkManager.Events.ResponseReceived, this.onResponseReceived, this));
    const resourceTreeModel = networkManager.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (resourceTreeModel) {
      eventListeners.push(resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.WillReloadPage, this.willReloadPage, this));
      eventListeners.push(resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.onPrimaryPageChanged, this));
      eventListeners.push(resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, this.onLoad, this));
      eventListeners.push(resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.DOMContentLoaded, this.onDOMContentLoaded.bind(this, resourceTreeModel)));
    }
    this.#modelListeners.set(networkManager, eventListeners);
  }
  modelRemoved(networkManager) {
    this.removeNetworkManagerListeners(networkManager);
  }
  removeNetworkManagerListeners(networkManager) {
    Common.EventTarget.removeEventListeners(this.#modelListeners.get(networkManager) || []);
  }
  setIsRecording(enabled) {
    if (this.#isRecording === enabled) {
      return;
    }
    this.#isRecording = enabled;
    if (enabled) {
      SDK.TargetManager.TargetManager.instance().observeModels(SDK.NetworkManager.NetworkManager, this);
    } else {
      SDK.TargetManager.TargetManager.instance().unobserveModels(SDK.NetworkManager.NetworkManager, this);
      SDK.TargetManager.TargetManager.instance().models(SDK.NetworkManager.NetworkManager).forEach(this.removeNetworkManagerListeners.bind(this));
    }
  }
  requestForURL(url) {
    return this.#requests.find((request) => request.url() === url) || null;
  }
  originalRequestForURL(url) {
    return this.#sentNetworkRequests.find((request) => request.url === url) || null;
  }
  originalResponseForURL(url) {
    return this.#receivedNetworkResponses.find((response) => response.url === url) || null;
  }
  requests() {
    return this.#requests;
  }
  requestByManagerAndId(networkManager, requestId) {
    for (let i = this.#requests.length - 1; i >= 0; i--) {
      const request = this.#requests[i];
      if (requestId === request.requestId() && networkManager === SDK.NetworkManager.NetworkManager.forRequest(request)) {
        return request;
      }
    }
    return null;
  }
  requestByManagerAndURL(networkManager, url) {
    for (const request of this.#requests) {
      if (url === request.url() && networkManager === SDK.NetworkManager.NetworkManager.forRequest(request)) {
        return request;
      }
    }
    return null;
  }
  initializeInitiatorSymbolIfNeeded(request) {
    let initiatorInfo = this.#initiatorData.get(request);
    if (initiatorInfo) {
      return initiatorInfo;
    }
    initiatorInfo = {
      info: null,
      chain: null,
      request: void 0
    };
    this.#initiatorData.set(request, initiatorInfo);
    return initiatorInfo;
  }
  static initiatorInfoForRequest(request, existingInitiatorData) {
    const initiatorInfo = existingInitiatorData || {
      info: null,
      chain: null,
      request: void 0
    };
    let type = "other";
    let url = Platform.DevToolsPath.EmptyUrlString;
    let lineNumber = void 0;
    let columnNumber = void 0;
    let scriptId = null;
    let initiatorStack = null;
    let initiatorRequest = null;
    const initiator = request.initiator();
    const redirectSource = request.redirectSource();
    if (redirectSource) {
      type = "redirect";
      url = redirectSource.url();
    } else if (initiator) {
      if (initiator.type === "parser") {
        type = "parser";
        url = initiator.url ? initiator.url : url;
        lineNumber = initiator.lineNumber;
        columnNumber = initiator.columnNumber;
      } else if (initiator.type === "script") {
        for (let stack = initiator.stack; stack; ) {
          const topFrame = stack.callFrames.length ? stack.callFrames[0] : null;
          if (!topFrame) {
            stack = stack.parent;
            continue;
          }
          type = "script";
          url = topFrame.url || i18nString(UIStrings.anonymous);
          lineNumber = topFrame.lineNumber;
          columnNumber = topFrame.columnNumber;
          scriptId = topFrame.scriptId;
          break;
        }
        if (!initiator.stack && initiator.url) {
          type = "script";
          url = initiator.url;
          lineNumber = initiator.lineNumber;
        }
        if (initiator.stack?.callFrames?.length) {
          initiatorStack = initiator.stack;
        }
      } else if (initiator.type === "preload") {
        type = "preload";
      } else if (initiator.type === "preflight") {
        type = "preflight";
        initiatorRequest = request.preflightInitiatorRequest();
      } else if (initiator.type === "SignedExchange") {
        type = "signedExchange";
        url = initiator.url || Platform.DevToolsPath.EmptyUrlString;
      }
    }
    initiatorInfo.info = { type, url, lineNumber, columnNumber, scriptId, stack: initiatorStack, initiatorRequest };
    return initiatorInfo.info;
  }
  initiatorInfoForRequest(request) {
    const initiatorInfo = this.initializeInitiatorSymbolIfNeeded(request);
    if (initiatorInfo.info) {
      return initiatorInfo.info;
    }
    return _NetworkLog.initiatorInfoForRequest(request, initiatorInfo);
  }
  initiatorGraphForRequest(request) {
    const initiated = /* @__PURE__ */ new Map();
    const networkManager = SDK.NetworkManager.NetworkManager.forRequest(request);
    for (const otherRequest of this.#requests) {
      const otherRequestManager = SDK.NetworkManager.NetworkManager.forRequest(otherRequest);
      if (networkManager === otherRequestManager && this.initiatorChain(otherRequest).has(request)) {
        const initiatorRequest = this.initiatorRequest(otherRequest);
        if (initiatorRequest) {
          initiated.set(otherRequest, initiatorRequest);
        }
      }
    }
    return { initiators: this.initiatorChain(request), initiated };
  }
  initiatorChain(request) {
    const initiatorDataForRequest = this.initializeInitiatorSymbolIfNeeded(request);
    let initiatorChainCache = initiatorDataForRequest.chain;
    if (initiatorChainCache) {
      return initiatorChainCache;
    }
    initiatorChainCache = /* @__PURE__ */ new Set();
    let checkRequest = request;
    while (checkRequest) {
      const initiatorData = this.initializeInitiatorSymbolIfNeeded(checkRequest);
      if (initiatorData.chain) {
        initiatorChainCache = initiatorChainCache.union(initiatorData.chain);
        break;
      }
      if (initiatorChainCache.has(checkRequest)) {
        break;
      }
      initiatorChainCache.add(checkRequest);
      checkRequest = this.initiatorRequest(checkRequest);
    }
    initiatorDataForRequest.chain = initiatorChainCache;
    return initiatorChainCache;
  }
  initiatorRequest(request) {
    const initiatorData = this.initializeInitiatorSymbolIfNeeded(request);
    if (initiatorData.request !== void 0) {
      return initiatorData.request;
    }
    const url = this.initiatorInfoForRequest(request).url;
    const networkManager = SDK.NetworkManager.NetworkManager.forRequest(request);
    initiatorData.request = networkManager ? this.requestByManagerAndURL(networkManager, url) : null;
    return initiatorData.request;
  }
  willReloadPage() {
    if (!Common.Settings.Settings.instance().moduleSetting("network-log.preserve-log").get()) {
      this.reset(true);
    }
  }
  onPrimaryPageChanged(event) {
    const mainFrame = event.data.frame;
    const manager = mainFrame.resourceTreeModel().target().model(SDK.NetworkManager.NetworkManager);
    if (!manager || mainFrame.resourceTreeModel().target().parentTarget()?.type() === SDK.Target.Type.FRAME) {
      return;
    }
    if (mainFrame.url !== mainFrame.unreachableUrl() && Common.ParsedURL.schemeIs(mainFrame.url, "chrome-error:")) {
      return;
    }
    const preserveLog = Common.Settings.Settings.instance().moduleSetting("network-log.preserve-log").get();
    const oldRequests = this.#requests;
    const oldManagerRequests = this.#requests.filter((request) => SDK.NetworkManager.NetworkManager.forRequest(request) === manager);
    const oldRequestsSet = this.#requestsSet;
    this.#requests = [];
    this.#sentNetworkRequests = [];
    this.#receivedNetworkResponses = [];
    this.#requestsSet = /* @__PURE__ */ new Set();
    this.#requestsMap.clear();
    this.#unresolvedPreflightRequests.clear();
    this.dispatchEventToListeners(Events.Reset, { clearIfPreserved: !preserveLog });
    let currentPageLoad = null;
    const requestsToAdd = [];
    for (const request of oldManagerRequests) {
      if (event.data.type !== "Activation" && request.loaderId !== mainFrame.loaderId) {
        continue;
      }
      if (!currentPageLoad) {
        currentPageLoad = new SDK.PageLoad.PageLoad(request);
        let redirectSource = request.redirectSource();
        while (redirectSource) {
          requestsToAdd.push(redirectSource);
          redirectSource = redirectSource.redirectSource();
        }
      }
      requestsToAdd.push(request);
    }
    const serviceWorkerRequestsToAdd = [];
    for (const swRequest of oldRequests) {
      if (!swRequest.initiatedByServiceWorker()) {
        continue;
      }
      const keepRequest = requestsToAdd.some((request) => request.url() === swRequest.url() && request.issueTime() <= swRequest.issueTime());
      if (keepRequest) {
        serviceWorkerRequestsToAdd.push(swRequest);
      }
    }
    requestsToAdd.push(...serviceWorkerRequestsToAdd);
    for (const request of requestsToAdd) {
      currentPageLoad?.bindRequest(request);
      oldRequestsSet.delete(request);
      this.addRequest(request);
    }
    if (preserveLog) {
      for (const request of oldRequestsSet) {
        this.addRequest(request, true);
        request.preserved = true;
      }
    }
    if (currentPageLoad) {
      this.#pageLoadForManager.set(manager, currentPageLoad);
    }
  }
  addRequest(request, preserveLog) {
    this.#requests.push(request);
    this.#requestsSet.add(request);
    const requestList = this.#requestsMap.get(request.requestId());
    if (!requestList) {
      this.#requestsMap.set(request.requestId(), [request]);
    } else {
      requestList.push(request);
    }
    this.tryResolvePreflightRequests(request);
    this.dispatchEventToListeners(Events.RequestAdded, { request, preserveLog });
  }
  removeRequest(request) {
    const index = this.#requests.indexOf(request);
    if (index > -1) {
      this.#requests.splice(index, 1);
    }
    this.#requestsSet.delete(request);
    this.#requestsMap.delete(request.requestId());
    this.dispatchEventToListeners(Events.RequestRemoved, { request });
  }
  tryResolvePreflightRequests(request) {
    if (request.isPreflightRequest()) {
      const initiator = request.initiator();
      if (initiator?.requestId) {
        const [initiatorRequest] = this.requestsForId(initiator.requestId);
        if (initiatorRequest) {
          request.setPreflightInitiatorRequest(initiatorRequest);
          initiatorRequest.setPreflightRequest(request);
        } else {
          this.#unresolvedPreflightRequests.set(initiator.requestId, request);
        }
      }
    } else {
      const preflightRequest = this.#unresolvedPreflightRequests.get(request.requestId());
      if (preflightRequest) {
        this.#unresolvedPreflightRequests.delete(request.requestId());
        request.setPreflightRequest(preflightRequest);
        preflightRequest.setPreflightInitiatorRequest(request);
        const data = this.#initiatorData.get(preflightRequest);
        if (data) {
          data.info = null;
        }
        this.dispatchEventToListeners(Events.RequestUpdated, { request: preflightRequest });
      }
    }
  }
  importRequests(requests) {
    this.reset(true);
    this.#requests = [];
    this.#sentNetworkRequests = [];
    this.#receivedNetworkResponses = [];
    this.#requestsSet.clear();
    this.#requestsMap.clear();
    this.#unresolvedPreflightRequests.clear();
    for (const request of requests) {
      this.addRequest(request);
    }
  }
  onRequestStarted(event) {
    const { request, originalRequest } = event.data;
    if (originalRequest) {
      this.#sentNetworkRequests.push(originalRequest);
    }
    this.#requestsSet.add(request);
    const manager = SDK.NetworkManager.NetworkManager.forRequest(request);
    const pageLoad = manager ? this.#pageLoadForManager.get(manager) : null;
    if (pageLoad) {
      pageLoad.bindRequest(request);
    }
    this.addRequest(request);
  }
  onResponseReceived(event) {
    const response = event.data.response;
    this.#receivedNetworkResponses.push(response);
  }
  onRequestUpdated(event) {
    const request = event.data;
    if (!this.#requestsSet.has(request)) {
      return;
    }
    if (request.isPreflightRequest() && request.corsErrorStatus()?.corsError === "UnexpectedPrivateNetworkAccess") {
      this.removeRequest(request);
      return;
    }
    this.dispatchEventToListeners(Events.RequestUpdated, { request });
  }
  onRequestRedirect(event) {
    this.#initiatorData.delete(event.data);
  }
  onDOMContentLoaded(resourceTreeModel, event) {
    const networkManager = resourceTreeModel.target().model(SDK.NetworkManager.NetworkManager);
    const pageLoad = networkManager ? this.#pageLoadForManager.get(networkManager) : null;
    if (pageLoad) {
      pageLoad.contentLoadTime = event.data;
    }
  }
  onLoad(event) {
    const networkManager = event.data.resourceTreeModel.target().model(SDK.NetworkManager.NetworkManager);
    const pageLoad = networkManager ? this.#pageLoadForManager.get(networkManager) : null;
    if (pageLoad) {
      pageLoad.loadTime = event.data.loadTime;
    }
  }
  reset(clearIfPreserved) {
    this.#requests = [];
    this.#sentNetworkRequests = [];
    this.#receivedNetworkResponses = [];
    this.#requestsSet.clear();
    this.#requestsMap.clear();
    this.#unresolvedPreflightRequests.clear();
    const managers = new Set(SDK.TargetManager.TargetManager.instance().models(SDK.NetworkManager.NetworkManager));
    for (const manager of this.#pageLoadForManager.keys()) {
      if (!managers.has(manager)) {
        this.#pageLoadForManager.delete(manager);
      }
    }
    this.dispatchEventToListeners(Events.Reset, { clearIfPreserved });
  }
  networkMessageGenerated(networkManager, event) {
    const { message, warning, requestId } = event.data;
    const consoleMessage = new SDK.ConsoleModel.ConsoleMessage(networkManager.target().model(SDK.RuntimeModel.RuntimeModel), "network", warning ? "warning" : "info", message);
    this.associateConsoleMessageWithRequest(consoleMessage, requestId);
    networkManager.target().model(SDK.ConsoleModel.ConsoleModel)?.addMessage(consoleMessage);
  }
  associateConsoleMessageWithRequest(consoleMessage, requestId) {
    const target = consoleMessage.target();
    const networkManager = target ? target.model(SDK.NetworkManager.NetworkManager) : null;
    if (!networkManager) {
      return;
    }
    const request = this.requestByManagerAndId(networkManager, requestId);
    if (!request) {
      return;
    }
    consoleMessageToRequest.set(consoleMessage, request);
    const initiator = request.initiator();
    if (initiator) {
      consoleMessage.stackTrace = initiator.stack || void 0;
      if (initiator.url) {
        consoleMessage.url = initiator.url;
        consoleMessage.line = initiator.lineNumber || 0;
      }
    }
  }
  static requestForConsoleMessage(consoleMessage) {
    return consoleMessageToRequest.get(consoleMessage) || null;
  }
  requestsForId(requestId) {
    return this.#requestsMap.get(requestId) || [];
  }
};
var consoleMessageToRequest = /* @__PURE__ */ new WeakMap();
var Events;
(function(Events2) {
  Events2["Reset"] = "Reset";
  Events2["RequestAdded"] = "RequestAdded";
  Events2["RequestUpdated"] = "RequestUpdated";
  Events2["RequestRemoved"] = "RequestRemoved";
})(Events || (Events = {}));

// gen/front_end/models/logs/LogManager.js
var modelToEventListeners = /* @__PURE__ */ new WeakMap();
var instance = null;
var LogManager = class _LogManager {
  constructor() {
    SDK2.TargetManager.TargetManager.instance().observeModels(SDK2.LogModel.LogModel, this);
  }
  static instance({ forceNew } = { forceNew: false }) {
    if (!instance || forceNew) {
      instance = new _LogManager();
    }
    return instance;
  }
  modelAdded(logModel) {
    const eventListeners = [];
    eventListeners.push(logModel.addEventListener("EntryAdded", this.logEntryAdded, this));
    modelToEventListeners.set(logModel, eventListeners);
  }
  modelRemoved(logModel) {
    const eventListeners = modelToEventListeners.get(logModel);
    if (eventListeners) {
      Common2.EventTarget.removeEventListeners(eventListeners);
    }
  }
  logEntryAdded(event) {
    const { logModel, entry } = event.data;
    const target = logModel.target();
    const details = {
      url: entry.url,
      line: entry.lineNumber,
      parameters: [entry.text, ...entry.args ?? []],
      stackTrace: entry.stackTrace,
      timestamp: entry.timestamp,
      workerId: entry.workerId,
      category: entry.category,
      affectedResources: entry.networkRequestId ? { requestId: entry.networkRequestId } : void 0
    };
    const consoleMessage = new SDK2.ConsoleModel.ConsoleMessage(target.model(SDK2.RuntimeModel.RuntimeModel), entry.source, entry.level, entry.text, details);
    if (entry.networkRequestId) {
      NetworkLog.instance().associateConsoleMessageWithRequest(consoleMessage, entry.networkRequestId);
    }
    const consoleModel = target.model(SDK2.ConsoleModel.ConsoleModel);
    if (consoleMessage.source === "worker") {
      const workerId = consoleMessage.workerId || "";
      if (SDK2.TargetManager.TargetManager.instance().targetById(workerId)) {
        return;
      }
      window.setTimeout(() => {
        if (!SDK2.TargetManager.TargetManager.instance().targetById(workerId)) {
          consoleModel?.addMessage(consoleMessage);
        }
      }, 1e3);
    } else {
      consoleModel?.addMessage(consoleMessage);
    }
  }
};

// gen/front_end/models/logs/RequestResolver.js
var RequestResolver_exports = {};
__export(RequestResolver_exports, {
  RequestResolver: () => RequestResolver
});
import * as Common3 from "./../../core/common/common.js";
var RequestResolver = class extends Common3.ResolverBase.ResolverBase {
  networkListener = null;
  networkLog;
  constructor(networkLog = NetworkLog.instance()) {
    super();
    this.networkLog = networkLog;
  }
  getForId(id) {
    const requests = this.networkLog.requestsForId(id);
    if (requests.length > 0) {
      return requests[0];
    }
    return null;
  }
  onRequestAdded(event) {
    const { request } = event.data;
    const backendRequestId = request.backendRequestId();
    if (backendRequestId) {
      this.onResolve(backendRequestId, request);
    }
  }
  startListening() {
    if (this.networkListener) {
      return;
    }
    this.networkListener = this.networkLog.addEventListener(Events.RequestAdded, this.onRequestAdded, this);
  }
  stopListening() {
    if (!this.networkListener) {
      return;
    }
    Common3.EventTarget.removeEventListeners([this.networkListener]);
    this.networkListener = null;
  }
};
export {
  LogManager_exports as LogManager,
  NetworkLog_exports as NetworkLog,
  RequestResolver_exports as RequestResolver
};
//# sourceMappingURL=logs.js.map

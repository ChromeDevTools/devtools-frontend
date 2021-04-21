/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';

import {ConsoleMessage, ConsoleModel} from './ConsoleModel.js';
import {Events as NetworkManagerEvents, Message, NetworkManager} from './NetworkManager.js';  // eslint-disable-line no-unused-vars
import {InitiatorType, NetworkRequest} from './NetworkRequest.js';  // eslint-disable-line no-unused-vars
import {PageLoad} from './PageLoad.js';
import {Events as ResourceTreeModelEvents, ResourceTreeFrame, ResourceTreeModel} from './ResourceTreeModel.js';  // eslint-disable-line no-unused-vars
import {RuntimeModel} from './RuntimeModel.js';
import {SDKModelObserver, TargetManager} from './SDKModel.js';  // eslint-disable-line no-unused-vars

const UIStrings = {
  /**
  *@description Text in Network Log
  */
  anonymous: '<anonymous>',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/NetworkLog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
let _instance: NetworkLog;

export class NetworkLog extends Common.ObjectWrapper.ObjectWrapper implements SDKModelObserver<NetworkManager> {
  _requests: NetworkRequest[];
  _sentNetworkRequests: Protocol.Network.Request[];
  _receivedNetworkResponses: Protocol.Network.Response[];
  _requestsSet: Set<NetworkRequest>;
  _requestsMap: Map<string, NetworkRequest[]>;
  _pageLoadForManager: Map<NetworkManager, PageLoad>;
  _isRecording: boolean;
  _modelListeners: WeakMap<NetworkManager, Common.EventTarget.EventDescriptor[]>;
  _initiatorData: WeakMap<NetworkRequest, InitiatorData>;
  _unresolvedPreflightRequests: Map<string, NetworkRequest>;

  constructor() {
    super();
    this._requests = [];
    this._sentNetworkRequests = [];
    this._receivedNetworkResponses = [];
    this._requestsSet = new Set();
    this._requestsMap = new Map();
    this._pageLoadForManager = new Map();
    this._isRecording = true;
    this._modelListeners = new WeakMap();
    this._initiatorData = new WeakMap();
    TargetManager.instance().observeModels(NetworkManager, this);
    const recordLogSetting: Common.Settings.Setting<boolean> =
        Common.Settings.Settings.instance().moduleSetting('network_log.record-log');
    recordLogSetting.addChangeListener(() => {
      const preserveLogSetting = Common.Settings.Settings.instance().moduleSetting('network_log.preserve-log');
      if (!preserveLogSetting.get() && recordLogSetting.get()) {
        this.reset(true);
      }
      this.setIsRecording((recordLogSetting.get() as boolean));
    }, this);
    this._unresolvedPreflightRequests = new Map();
  }

  static instance(): NetworkLog {
    if (!_instance) {
      _instance = new NetworkLog();
    }
    return _instance;
  }

  modelAdded(networkManager: NetworkManager): void {
    const eventListeners = [];
    eventListeners.push(
        networkManager.addEventListener(NetworkManagerEvents.RequestStarted, this._onRequestStarted, this));
    eventListeners.push(
        networkManager.addEventListener(NetworkManagerEvents.RequestUpdated, this._onRequestUpdated, this));
    eventListeners.push(
        networkManager.addEventListener(NetworkManagerEvents.RequestRedirected, this._onRequestRedirect, this));
    eventListeners.push(
        networkManager.addEventListener(NetworkManagerEvents.RequestFinished, this._onRequestUpdated, this));
    eventListeners.push(networkManager.addEventListener(
        NetworkManagerEvents.MessageGenerated, this._networkMessageGenerated.bind(this, networkManager)));
    eventListeners.push(
        networkManager.addEventListener(NetworkManagerEvents.ResponseReceived, this._onResponseReceived, this));

    const resourceTreeModel = networkManager.target().model(ResourceTreeModel);
    if (resourceTreeModel) {
      eventListeners.push(
          resourceTreeModel.addEventListener(ResourceTreeModelEvents.WillReloadPage, this._willReloadPage, this));
      eventListeners.push(resourceTreeModel.addEventListener(
          ResourceTreeModelEvents.MainFrameNavigated, this._onMainFrameNavigated, this));
      eventListeners.push(resourceTreeModel.addEventListener(ResourceTreeModelEvents.Load, this._onLoad, this));
      eventListeners.push(resourceTreeModel.addEventListener(
          ResourceTreeModelEvents.DOMContentLoaded, this._onDOMContentLoaded.bind(this, resourceTreeModel)));
    }

    this._modelListeners.set(networkManager, eventListeners);
  }

  modelRemoved(networkManager: NetworkManager): void {
    this._removeNetworkManagerListeners(networkManager);
  }

  _removeNetworkManagerListeners(networkManager: NetworkManager): void {
    Common.EventTarget.EventTarget.removeEventListeners(this._modelListeners.get(networkManager) || []);
  }

  setIsRecording(enabled: boolean): void {
    if (this._isRecording === enabled) {
      return;
    }
    this._isRecording = enabled;
    if (enabled) {
      TargetManager.instance().observeModels(NetworkManager, this);
    } else {
      TargetManager.instance().unobserveModels(NetworkManager, this);
      TargetManager.instance().models(NetworkManager).forEach(this._removeNetworkManagerListeners.bind(this));
    }
  }

  requestForURL(url: string): NetworkRequest|null {
    return this._requests.find(request => request.url() === url) || null;
  }

  originalRequestForURL(url: string): Protocol.Network.Request|null {
    return this._sentNetworkRequests.find(request => request.url === url) || null;
  }

  originalResponseForURL(url: string): Protocol.Network.Response|null {
    return this._receivedNetworkResponses.find(response => response.url === url) || null;
  }

  requests(): NetworkRequest[] {
    return this._requests;
  }

  requestByManagerAndId(networkManager: NetworkManager, requestId: string): NetworkRequest|null {
    // We iterate backwards because the last item will likely be the one needed for console network request lookups.
    for (let i = this._requests.length - 1; i >= 0; i--) {
      const request = this._requests[i];
      if (requestId === request.requestId() && networkManager === NetworkManager.forRequest(request)) {
        return request;
      }
    }
    return null;
  }

  _requestByManagerAndURL(networkManager: NetworkManager, url: string): NetworkRequest|null {
    for (const request of this._requests) {
      if (url === request.url() && networkManager === NetworkManager.forRequest(request)) {
        return request;
      }
    }
    return null;
  }

  _initializeInitiatorSymbolIfNeeded(request: NetworkRequest): InitiatorData {
    let initiatorInfo = this._initiatorData.get(request);
    if (initiatorInfo) {
      return initiatorInfo;
    }
    initiatorInfo = {
      info: null,
      chain: null,
      request: undefined,
    };
    this._initiatorData.set(request, initiatorInfo);
    return initiatorInfo;
  }

  initiatorInfoForRequest(request: NetworkRequest): _InitiatorInfo {
    const initiatorInfo = this._initializeInitiatorSymbolIfNeeded(request);
    if (initiatorInfo.info) {
      return initiatorInfo.info;
    }

    let type = InitiatorType.Other;
    let url = '';
    let lineNumber: number = -Infinity;
    let columnNumber: number = -Infinity;
    let scriptId: string|null = null;
    let initiatorStack: Protocol.Runtime.StackTrace|null = null;
    let initiatorRequest: (NetworkRequest|null)|null = null;
    const initiator = request.initiator();

    const redirectSource = request.redirectSource();
    if (redirectSource) {
      type = InitiatorType.Redirect;
      url = redirectSource.url();
    } else if (initiator) {
      if (initiator.type === Protocol.Network.InitiatorType.Parser) {
        type = InitiatorType.Parser;
        url = initiator.url ? initiator.url : url;
        lineNumber = typeof initiator.lineNumber === 'number' ? initiator.lineNumber : lineNumber;
        columnNumber = typeof initiator.columnNumber === 'number' ? initiator.columnNumber : columnNumber;
      } else if (initiator.type === Protocol.Network.InitiatorType.Script) {
        for (let stack: (Protocol.Runtime.StackTrace|undefined) = initiator.stack; stack;) {
          const topFrame = stack.callFrames.length ? stack.callFrames[0] : null;
          if (!topFrame) {
            stack = stack.parent;
            continue;
          }
          type = InitiatorType.Script;
          url = topFrame.url || i18nString(UIStrings.anonymous);
          lineNumber = topFrame.lineNumber;
          columnNumber = topFrame.columnNumber;
          scriptId = topFrame.scriptId;
          break;
        }
        if (!initiator.stack && initiator.url) {
          type = InitiatorType.Script;
          url = initiator.url;
          lineNumber = initiator.lineNumber || 0;
        }
        if (initiator.stack && initiator.stack.callFrames && initiator.stack.callFrames.length) {
          initiatorStack = initiator.stack || null;
        }
      } else if (initiator.type === Protocol.Network.InitiatorType.Preload) {
        type = InitiatorType.Preload;
      } else if (initiator.type === Protocol.Network.InitiatorType.Preflight) {
        type = InitiatorType.Preflight;
        initiatorRequest = request.preflightInitiatorRequest();
      } else if (initiator.type === Protocol.Network.InitiatorType.SignedExchange) {
        type = InitiatorType.SignedExchange;
        url = initiator.url || '';
      }
    }

    initiatorInfo.info = {type, url, lineNumber, columnNumber, scriptId, stack: initiatorStack, initiatorRequest};
    return initiatorInfo.info;
  }

  initiatorGraphForRequest(request: NetworkRequest): InitiatorGraph {
    const initiated = new Map<NetworkRequest, NetworkRequest>();
    const networkManager = NetworkManager.forRequest(request);
    for (const otherRequest of this._requests) {
      const otherRequestManager = NetworkManager.forRequest(otherRequest);
      if (networkManager === otherRequestManager && this._initiatorChain(otherRequest).has(request)) {
        // save parent request of otherRequst in order to build the initiator chain table later
        const initiatorRequest = this._initiatorRequest(otherRequest);
        if (initiatorRequest) {
          initiated.set(otherRequest, initiatorRequest);
        }
      }
    }
    return {initiators: this._initiatorChain(request), initiated: initiated};
  }

  _initiatorChain(request: NetworkRequest): Set<NetworkRequest> {
    const initiatorDataForRequest = this._initializeInitiatorSymbolIfNeeded(request);
    let initiatorChainCache: Set<NetworkRequest>|(Set<NetworkRequest>| null) = initiatorDataForRequest.chain;
    if (initiatorChainCache) {
      return initiatorChainCache;
    }

    initiatorChainCache = new Set();

    let checkRequest: (NetworkRequest|null)|NetworkRequest = request;
    while (checkRequest) {
      const initiatorData = this._initializeInitiatorSymbolIfNeeded(checkRequest);
      if (initiatorData.chain) {
        Platform.SetUtilities.addAll(initiatorChainCache, initiatorData.chain);
        break;
      }
      if (initiatorChainCache.has(checkRequest)) {
        break;
      }
      initiatorChainCache.add(checkRequest);
      checkRequest = this._initiatorRequest(checkRequest);
    }
    initiatorDataForRequest.chain = initiatorChainCache;
    return initiatorChainCache;
  }

  _initiatorRequest(request: NetworkRequest): NetworkRequest|null {
    const initiatorData = this._initializeInitiatorSymbolIfNeeded(request);
    if (initiatorData.request !== undefined) {
      return initiatorData.request;
    }
    const url = this.initiatorInfoForRequest(request).url;
    const networkManager = NetworkManager.forRequest(request);
    initiatorData.request = networkManager ? this._requestByManagerAndURL(networkManager, url) : null;
    return initiatorData.request;
  }

  _willReloadPage(): void {
    if (!Common.Settings.Settings.instance().moduleSetting('network_log.preserve-log').get()) {
      this.reset(true);
    }
  }

  _onMainFrameNavigated(event: Common.EventTarget.EventTargetEvent): void {
    const mainFrame = (event.data as ResourceTreeFrame);
    const manager = mainFrame.resourceTreeModel().target().model(NetworkManager);
    if (!manager || mainFrame.resourceTreeModel().target().parentTarget()) {
      return;
    }

    // If a page resulted in an error, the browser will navigate to an internal error page
    // hosted at 'chrome-error://...'. In this case, skip the frame navigated event to preserve
    // the network log.
    if (mainFrame.url !== mainFrame.unreachableUrl() && mainFrame.url.startsWith('chrome-error://')) {
      return;
    }

    const preserveLog = Common.Settings.Settings.instance().moduleSetting('network_log.preserve-log').get();

    const oldRequests = this._requests;
    const oldManagerRequests = this._requests.filter(request => NetworkManager.forRequest(request) === manager);
    const oldRequestsSet = this._requestsSet;
    this._requests = [];
    this._sentNetworkRequests = [];
    this._receivedNetworkResponses = [];
    this._requestsSet = new Set();
    this._requestsMap.clear();
    this._unresolvedPreflightRequests.clear();
    this.dispatchEventToListeners(Events.Reset, {clearIfPreserved: !preserveLog});

    // Preserve requests from the new session.
    let currentPageLoad: PageLoad|null = null;
    const requestsToAdd = [];
    for (const request of oldManagerRequests) {
      if (request.loaderId !== mainFrame.loaderId) {
        continue;
      }
      if (!currentPageLoad) {
        currentPageLoad = new PageLoad(request);
        let redirectSource = request.redirectSource();
        while (redirectSource) {
          requestsToAdd.push(redirectSource);
          redirectSource = redirectSource.redirectSource();
        }
      }
      requestsToAdd.push(request);
    }

    // Preserve service worker requests from the new session.
    const serviceWorkerRequestsToAdd = [];
    for (const swRequest of oldRequests) {
      if (!swRequest.initiatedByServiceWorker()) {
        continue;
      }

      // If there is a matching request that came before this one, keep it.
      const keepRequest = requestsToAdd.some(
          request => request.url() === swRequest.url() && request.issueTime() <= swRequest.issueTime());
      if (keepRequest) {
        serviceWorkerRequestsToAdd.push(swRequest);
      }
    }
    requestsToAdd.push(...serviceWorkerRequestsToAdd);

    for (const request of requestsToAdd) {
      // TODO: Use optional chaining here once closure is gone.
      if (currentPageLoad) {
        currentPageLoad.bindRequest(request);
      }
      oldRequestsSet.delete(request);
      this._addRequest(request);
    }

    if (preserveLog) {
      for (const request of oldRequestsSet) {
        this._addRequest(request);
      }
    }

    if (currentPageLoad) {
      this._pageLoadForManager.set(manager, currentPageLoad);
    }
  }

  _addRequest(request: NetworkRequest): void {
    this._requests.push(request);
    this._requestsSet.add(request);
    const requestList = this._requestsMap.get(request.requestId());
    if (!requestList) {
      this._requestsMap.set(request.requestId(), [request]);
    } else {
      requestList.push(request);
    }
    this._tryResolvePreflightRequests(request);
    this.dispatchEventToListeners(Events.RequestAdded, request);
  }

  _tryResolvePreflightRequests(request: NetworkRequest): void {
    if (request.isPreflightRequest()) {
      const initiator = request.initiator();
      if (initiator && initiator.requestId) {
        const [initiatorRequest] = this.requestsForId(initiator.requestId);
        if (initiatorRequest) {
          request.setPreflightInitiatorRequest(initiatorRequest);
          initiatorRequest.setPreflightRequest(request);
        } else {
          this._unresolvedPreflightRequests.set(initiator.requestId, request);
        }
      }
    } else {
      const preflightRequest = this._unresolvedPreflightRequests.get(request.requestId());
      if (preflightRequest) {
        this._unresolvedPreflightRequests.delete(request.requestId());
        request.setPreflightRequest(preflightRequest);
        preflightRequest.setPreflightInitiatorRequest(request);
        // Force recomputation of initiator info, if it already exists.
        const data = this._initiatorData.get(preflightRequest);
        if (data) {
          data.info = null;
        }
        this.dispatchEventToListeners(Events.RequestUpdated, preflightRequest);
      }
    }
  }

  importRequests(requests: NetworkRequest[]): void {
    this.reset(true);
    this._requests = [];
    this._sentNetworkRequests = [];
    this._receivedNetworkResponses = [];
    this._requestsSet.clear();
    this._requestsMap.clear();
    this._unresolvedPreflightRequests.clear();
    for (const request of requests) {
      this._addRequest(request);
    }
  }

  _onRequestStarted(event: Common.EventTarget.EventTargetEvent): void {
    const request = (event.data.request as NetworkRequest);
    if (event.data.originalRequest) {
      this._sentNetworkRequests.push(event.data.originalRequest);
    }
    this._requestsSet.add(request);
    const manager = NetworkManager.forRequest(request);
    const pageLoad = manager ? this._pageLoadForManager.get(manager) : null;
    if (pageLoad) {
      pageLoad.bindRequest(request);
    }
    this._addRequest(request);
  }

  _onResponseReceived(event: Common.EventTarget.EventTargetEvent): void {
    const response = (event.data.response as Protocol.Network.Response);
    this._receivedNetworkResponses.push(response);
  }

  _onRequestUpdated(event: Common.EventTarget.EventTargetEvent): void {
    const request = (event.data as NetworkRequest);
    if (!this._requestsSet.has(request)) {
      return;
    }
    this.dispatchEventToListeners(Events.RequestUpdated, request);
  }

  _onRequestRedirect(event: Common.EventTarget.EventTargetEvent): void {
    const request = (event.data as NetworkRequest);
    this._initiatorData.delete(request);
  }

  _onDOMContentLoaded(resourceTreeModel: ResourceTreeModel, event: Common.EventTarget.EventTargetEvent): void {
    const networkManager = resourceTreeModel.target().model(NetworkManager);
    const pageLoad = networkManager ? this._pageLoadForManager.get(networkManager) : null;
    if (pageLoad) {
      pageLoad.contentLoadTime = (event.data as number);
    }
  }

  _onLoad(event: Common.EventTarget.EventTargetEvent): void {
    const networkManager = event.data.resourceTreeModel.target().model(NetworkManager);
    const pageLoad = networkManager ? this._pageLoadForManager.get(networkManager) : null;
    if (pageLoad) {
      pageLoad.loadTime = (event.data.loadTime as number);
    }
  }

  reset(clearIfPreserved: boolean): void {
    this._requests = [];
    this._sentNetworkRequests = [];
    this._receivedNetworkResponses = [];
    this._requestsSet.clear();
    this._requestsMap.clear();
    this._unresolvedPreflightRequests.clear();
    const managers = new Set<NetworkManager>(TargetManager.instance().models(NetworkManager));
    for (const manager of this._pageLoadForManager.keys()) {
      if (!managers.has(manager)) {
        this._pageLoadForManager.delete(manager);
      }
    }

    this.dispatchEventToListeners(Events.Reset, {clearIfPreserved});
  }

  _networkMessageGenerated(networkManager: NetworkManager, event: Common.EventTarget.EventTargetEvent): void {
    const message = (event.data as Message);
    const consoleMessage = new ConsoleMessage(
        networkManager.target().model(RuntimeModel), Protocol.Log.LogEntrySource.Network,
        message.warning ? Protocol.Log.LogEntryLevel.Warning : Protocol.Log.LogEntryLevel.Info, message.message);
    this.associateConsoleMessageWithRequest(consoleMessage, message.requestId);
    ConsoleModel.instance().addMessage(consoleMessage);
  }

  associateConsoleMessageWithRequest(consoleMessage: ConsoleMessage, requestId: string): void {
    const target = consoleMessage.target();
    const networkManager = target ? target.model(NetworkManager) : null;
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
      consoleMessage.stackTrace = initiator.stack || undefined;
      if (initiator.url) {
        consoleMessage.url = initiator.url;
        consoleMessage.line = initiator.lineNumber || 0;
      }
    }
  }

  static requestForConsoleMessage(consoleMessage: ConsoleMessage): NetworkRequest|null {
    return consoleMessageToRequest.get(consoleMessage) || null;
  }

  requestsForId(requestId: string): NetworkRequest[] {
    return this._requestsMap.get(requestId) || [];
  }
}

const consoleMessageToRequest = new WeakMap<ConsoleMessage, NetworkRequest>();

export const Events = {
  Reset: Symbol('Reset'),
  RequestAdded: Symbol('RequestAdded'),
  RequestUpdated: Symbol('RequestUpdated'),
};

interface InitiatorData {
  info: _InitiatorInfo|null;
  chain: Set<NetworkRequest>|null;
  request?: NetworkRequest|null;
}

export interface InitiatorGraph {
  initiators: Set<NetworkRequest>;
  initiated: Map<NetworkRequest, NetworkRequest>;
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface _InitiatorInfo {
  type: InitiatorType;
  url: string;
  lineNumber: number;
  columnNumber: number;
  scriptId: string|null;
  stack: Protocol.Runtime.StackTrace|null;
  initiatorRequest: NetworkRequest|null;
}

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

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

const UIStrings = {
  /**
   * @description When DevTools doesn't know the URL that initiated a network request, we
   * show this phrase instead. 'unknown' would also work in this context.
   */
  anonymous: '<anonymous>',
};
const str_ = i18n.i18n.registerUIStrings('models/logs/NetworkLog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let networkLogInstance: NetworkLog;

export class NetworkLog extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    SDK.TargetManager.SDKModelObserver<SDK.NetworkManager.NetworkManager> {
  private requestsInternal: SDK.NetworkRequest.NetworkRequest[];
  private sentNetworkRequests: Protocol.Network.Request[];
  private receivedNetworkResponses: Protocol.Network.Response[];
  private requestsSet: Set<SDK.NetworkRequest.NetworkRequest>;
  private readonly requestsMap: Map<string, SDK.NetworkRequest.NetworkRequest[]>;
  private readonly pageLoadForManager: Map<SDK.NetworkManager.NetworkManager, SDK.PageLoad.PageLoad>;
  private isRecording: boolean;
  private readonly modelListeners: WeakMap<SDK.NetworkManager.NetworkManager, Common.EventTarget.EventDescriptor[]>;
  private readonly initiatorData: WeakMap<SDK.NetworkRequest.NetworkRequest, InitiatorData>;
  private readonly unresolvedPreflightRequests: Map<string, SDK.NetworkRequest.NetworkRequest>;

  constructor() {
    super();
    this.requestsInternal = [];
    this.sentNetworkRequests = [];
    this.receivedNetworkResponses = [];
    this.requestsSet = new Set();
    this.requestsMap = new Map();
    this.pageLoadForManager = new Map();
    this.isRecording = true;
    this.modelListeners = new WeakMap();
    this.initiatorData = new WeakMap();
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.NetworkManager.NetworkManager, this);
    const recordLogSetting: Common.Settings.Setting<boolean> =
        Common.Settings.Settings.instance().moduleSetting('network_log.record-log');
    recordLogSetting.addChangeListener(() => {
      const preserveLogSetting = Common.Settings.Settings.instance().moduleSetting('network_log.preserve-log');
      if (!preserveLogSetting.get() && recordLogSetting.get()) {
        this.reset(true);
      }
      this.setIsRecording((recordLogSetting.get() as boolean));
    }, this);
    this.unresolvedPreflightRequests = new Map();
  }

  static instance(): NetworkLog {
    if (!networkLogInstance) {
      networkLogInstance = new NetworkLog();
    }
    return networkLogInstance;
  }

  modelAdded(networkManager: SDK.NetworkManager.NetworkManager): void {
    const eventListeners = [];
    eventListeners.push(
        networkManager.addEventListener(SDK.NetworkManager.Events.RequestStarted, this.onRequestStarted, this));
    eventListeners.push(
        networkManager.addEventListener(SDK.NetworkManager.Events.RequestUpdated, this.onRequestUpdated, this));
    eventListeners.push(
        networkManager.addEventListener(SDK.NetworkManager.Events.RequestRedirected, this.onRequestRedirect, this));
    eventListeners.push(
        networkManager.addEventListener(SDK.NetworkManager.Events.RequestFinished, this.onRequestUpdated, this));
    eventListeners.push(networkManager.addEventListener(
        SDK.NetworkManager.Events.MessageGenerated, this.networkMessageGenerated.bind(this, networkManager)));
    eventListeners.push(
        networkManager.addEventListener(SDK.NetworkManager.Events.ResponseReceived, this.onResponseReceived, this));

    const resourceTreeModel = networkManager.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (resourceTreeModel) {
      eventListeners.push(
          resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.WillReloadPage, this.willReloadPage, this));
      eventListeners.push(resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this.onMainFrameNavigated, this));
      eventListeners.push(resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, this.onLoad, this));
      eventListeners.push(resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.DOMContentLoaded, this.onDOMContentLoaded.bind(this, resourceTreeModel)));
    }

    this.modelListeners.set(networkManager, eventListeners);
  }

  modelRemoved(networkManager: SDK.NetworkManager.NetworkManager): void {
    this.removeNetworkManagerListeners(networkManager);
  }

  private removeNetworkManagerListeners(networkManager: SDK.NetworkManager.NetworkManager): void {
    Common.EventTarget.removeEventListeners(this.modelListeners.get(networkManager) || []);
  }

  setIsRecording(enabled: boolean): void {
    if (this.isRecording === enabled) {
      return;
    }
    this.isRecording = enabled;
    if (enabled) {
      SDK.TargetManager.TargetManager.instance().observeModels(SDK.NetworkManager.NetworkManager, this);
    } else {
      SDK.TargetManager.TargetManager.instance().unobserveModels(SDK.NetworkManager.NetworkManager, this);
      SDK.TargetManager.TargetManager.instance()
          .models(SDK.NetworkManager.NetworkManager)
          .forEach(this.removeNetworkManagerListeners.bind(this));
    }
  }

  requestForURL(url: Platform.DevToolsPath.UrlString): SDK.NetworkRequest.NetworkRequest|null {
    return this.requestsInternal.find(request => request.url() === url) || null;
  }

  originalRequestForURL(url: Platform.DevToolsPath.UrlString): Protocol.Network.Request|null {
    return this.sentNetworkRequests.find(request => request.url === url) || null;
  }

  originalResponseForURL(url: Platform.DevToolsPath.UrlString): Protocol.Network.Response|null {
    return this.receivedNetworkResponses.find(response => response.url === url) || null;
  }

  requests(): SDK.NetworkRequest.NetworkRequest[] {
    return this.requestsInternal;
  }

  requestByManagerAndId(networkManager: SDK.NetworkManager.NetworkManager, requestId: string):
      SDK.NetworkRequest.NetworkRequest|null {
    // We iterate backwards because the last item will likely be the one needed for console network request lookups.
    for (let i = this.requestsInternal.length - 1; i >= 0; i--) {
      const request = this.requestsInternal[i];
      if (requestId === request.requestId() &&
          networkManager === SDK.NetworkManager.NetworkManager.forRequest(request)) {
        return request;
      }
    }
    return null;
  }

  private requestByManagerAndURL(
      networkManager: SDK.NetworkManager.NetworkManager,
      url: Platform.DevToolsPath.UrlString): SDK.NetworkRequest.NetworkRequest|null {
    for (const request of this.requestsInternal) {
      if (url === request.url() && networkManager === SDK.NetworkManager.NetworkManager.forRequest(request)) {
        return request;
      }
    }
    return null;
  }

  private initializeInitiatorSymbolIfNeeded(request: SDK.NetworkRequest.NetworkRequest): InitiatorData {
    let initiatorInfo = this.initiatorData.get(request);
    if (initiatorInfo) {
      return initiatorInfo;
    }
    initiatorInfo = {
      info: null,
      chain: null,
      request: undefined,
    };
    this.initiatorData.set(request, initiatorInfo);
    return initiatorInfo;
  }

  static initiatorInfoForRequest(request: SDK.NetworkRequest.NetworkRequest, existingInitiatorData?: InitiatorData):
      InitiatorInfo {
    const initiatorInfo: InitiatorData = existingInitiatorData || {
      info: null,
      chain: null,
      request: undefined,
    };

    let type = SDK.NetworkRequest.InitiatorType.Other;
    let url = Platform.DevToolsPath.EmptyUrlString;
    let lineNumber: number|undefined = undefined;
    let columnNumber: number|undefined = undefined;
    let scriptId: Protocol.Runtime.ScriptId|null = null;
    let initiatorStack: Protocol.Runtime.StackTrace|null = null;
    let initiatorRequest: SDK.NetworkRequest.NetworkRequest|null = null;
    const initiator = request.initiator();

    const redirectSource = request.redirectSource();
    if (redirectSource) {
      type = SDK.NetworkRequest.InitiatorType.Redirect;
      url = redirectSource.url();
    } else if (initiator) {
      if (initiator.type === Protocol.Network.InitiatorType.Parser) {
        type = SDK.NetworkRequest.InitiatorType.Parser;
        url = initiator.url ? initiator.url as Platform.DevToolsPath.UrlString : url;
        lineNumber = initiator.lineNumber;
        columnNumber = initiator.columnNumber;
      } else if (initiator.type === Protocol.Network.InitiatorType.Script) {
        for (let stack: (Protocol.Runtime.StackTrace|undefined) = initiator.stack; stack;) {
          const topFrame = stack.callFrames.length ? stack.callFrames[0] : null;
          if (!topFrame) {
            stack = stack.parent;
            continue;
          }
          type = SDK.NetworkRequest.InitiatorType.Script;
          url = (topFrame.url || i18nString(UIStrings.anonymous) as string) as Platform.DevToolsPath.UrlString;
          lineNumber = topFrame.lineNumber;
          columnNumber = topFrame.columnNumber;
          scriptId = topFrame.scriptId;
          break;
        }
        if (!initiator.stack && initiator.url) {
          type = SDK.NetworkRequest.InitiatorType.Script;
          url = initiator.url as Platform.DevToolsPath.UrlString;
          lineNumber = initiator.lineNumber;
        }
        if (initiator.stack?.callFrames?.length) {
          initiatorStack = initiator.stack;
        }
      } else if (initiator.type === Protocol.Network.InitiatorType.Preload) {
        type = SDK.NetworkRequest.InitiatorType.Preload;
      } else if (initiator.type === Protocol.Network.InitiatorType.Preflight) {
        type = SDK.NetworkRequest.InitiatorType.Preflight;
        initiatorRequest = request.preflightInitiatorRequest();
      } else if (initiator.type === Protocol.Network.InitiatorType.SignedExchange) {
        type = SDK.NetworkRequest.InitiatorType.SignedExchange;
        url = initiator.url as Platform.DevToolsPath.UrlString || Platform.DevToolsPath.EmptyUrlString;
      }
    }
    initiatorInfo.info = {type, url, lineNumber, columnNumber, scriptId, stack: initiatorStack, initiatorRequest};
    return initiatorInfo.info;
  }

  initiatorInfoForRequest(request: SDK.NetworkRequest.NetworkRequest): InitiatorInfo {
    const initiatorInfo = this.initializeInitiatorSymbolIfNeeded(request);
    if (initiatorInfo.info) {
      return initiatorInfo.info;
    }

    return NetworkLog.initiatorInfoForRequest(request, initiatorInfo);
  }

  initiatorGraphForRequest(request: SDK.NetworkRequest.NetworkRequest): InitiatorGraph {
    const initiated = new Map<SDK.NetworkRequest.NetworkRequest, SDK.NetworkRequest.NetworkRequest>();
    const networkManager = SDK.NetworkManager.NetworkManager.forRequest(request);
    for (const otherRequest of this.requestsInternal) {
      const otherRequestManager = SDK.NetworkManager.NetworkManager.forRequest(otherRequest);
      if (networkManager === otherRequestManager && this.initiatorChain(otherRequest).has(request)) {
        // save parent request of otherRequst in order to build the initiator chain table later
        const initiatorRequest = this.initiatorRequest(otherRequest);
        if (initiatorRequest) {
          initiated.set(otherRequest, initiatorRequest);
        }
      }
    }
    return {initiators: this.initiatorChain(request), initiated: initiated};
  }

  private initiatorChain(request: SDK.NetworkRequest.NetworkRequest): Set<SDK.NetworkRequest.NetworkRequest> {
    const initiatorDataForRequest = this.initializeInitiatorSymbolIfNeeded(request);
    let initiatorChainCache = initiatorDataForRequest.chain;
    if (initiatorChainCache) {
      return initiatorChainCache;
    }

    initiatorChainCache = new Set();

    let checkRequest: SDK.NetworkRequest.NetworkRequest|null = request;
    while (checkRequest) {
      const initiatorData = this.initializeInitiatorSymbolIfNeeded(checkRequest);
      if (initiatorData.chain) {
        Platform.SetUtilities.addAll(initiatorChainCache, initiatorData.chain);
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

  private initiatorRequest(request: SDK.NetworkRequest.NetworkRequest): SDK.NetworkRequest.NetworkRequest|null {
    const initiatorData = this.initializeInitiatorSymbolIfNeeded(request);
    if (initiatorData.request !== undefined) {
      return initiatorData.request;
    }
    const url = this.initiatorInfoForRequest(request).url;
    const networkManager = SDK.NetworkManager.NetworkManager.forRequest(request);
    initiatorData.request = networkManager ? this.requestByManagerAndURL(networkManager, url) : null;
    return initiatorData.request;
  }

  private willReloadPage(): void {
    if (!Common.Settings.Settings.instance().moduleSetting('network_log.preserve-log').get()) {
      this.reset(true);
    }
  }

  private onMainFrameNavigated(event: Common.EventTarget.EventTargetEvent<SDK.ResourceTreeModel.ResourceTreeFrame>):
      void {
    const mainFrame = event.data;
    const manager = mainFrame.resourceTreeModel().target().model(SDK.NetworkManager.NetworkManager);
    if (!manager || mainFrame.resourceTreeModel().target().parentTarget()?.type() === SDK.Target.Type.Frame) {
      return;
    }

    // If a page resulted in an error, the browser will navigate to an internal error page
    // hosted at 'chrome-error://...'. In this case, skip the frame navigated event to preserve
    // the network log.
    if (mainFrame.url !== mainFrame.unreachableUrl() && mainFrame.url.startsWith('chrome-error://')) {
      return;
    }

    const preserveLog = Common.Settings.Settings.instance().moduleSetting('network_log.preserve-log').get();

    const oldRequests = this.requestsInternal;
    const oldManagerRequests =
        this.requestsInternal.filter(request => SDK.NetworkManager.NetworkManager.forRequest(request) === manager);
    const oldRequestsSet = this.requestsSet;
    this.requestsInternal = [];
    this.sentNetworkRequests = [];
    this.receivedNetworkResponses = [];
    this.requestsSet = new Set();
    this.requestsMap.clear();
    this.unresolvedPreflightRequests.clear();
    this.dispatchEventToListeners(Events.Reset, {clearIfPreserved: !preserveLog});

    // Preserve requests from the new session.
    let currentPageLoad: SDK.PageLoad.PageLoad|null = null;
    const requestsToAdd = [];
    for (const request of oldManagerRequests) {
      if (request.loaderId !== mainFrame.loaderId) {
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
      currentPageLoad?.bindRequest(request);
      oldRequestsSet.delete(request);
      this.addRequest(request);
    }

    if (preserveLog) {
      for (const request of oldRequestsSet) {
        this.addRequest(request);
        request.preserved = true;
      }
    }

    if (currentPageLoad) {
      this.pageLoadForManager.set(manager, currentPageLoad);
    }
  }

  private addRequest(request: SDK.NetworkRequest.NetworkRequest): void {
    this.requestsInternal.push(request);
    this.requestsSet.add(request);
    const requestList = this.requestsMap.get(request.requestId());
    if (!requestList) {
      this.requestsMap.set(request.requestId(), [request]);
    } else {
      requestList.push(request);
    }
    this.tryResolvePreflightRequests(request);
    this.dispatchEventToListeners(Events.RequestAdded, request);
  }

  private tryResolvePreflightRequests(request: SDK.NetworkRequest.NetworkRequest): void {
    if (request.isPreflightRequest()) {
      const initiator = request.initiator();
      if (initiator && initiator.requestId) {
        const [initiatorRequest] = this.requestsForId(initiator.requestId);
        if (initiatorRequest) {
          request.setPreflightInitiatorRequest(initiatorRequest);
          initiatorRequest.setPreflightRequest(request);
        } else {
          this.unresolvedPreflightRequests.set(initiator.requestId, request);
        }
      }
    } else {
      const preflightRequest = this.unresolvedPreflightRequests.get(request.requestId());
      if (preflightRequest) {
        this.unresolvedPreflightRequests.delete(request.requestId());
        request.setPreflightRequest(preflightRequest);
        preflightRequest.setPreflightInitiatorRequest(request);
        // Force recomputation of initiator info, if it already exists.
        const data = this.initiatorData.get(preflightRequest);
        if (data) {
          data.info = null;
        }
        this.dispatchEventToListeners(Events.RequestUpdated, preflightRequest);
      }
    }
  }

  importRequests(requests: SDK.NetworkRequest.NetworkRequest[]): void {
    this.reset(true);
    this.requestsInternal = [];
    this.sentNetworkRequests = [];
    this.receivedNetworkResponses = [];
    this.requestsSet.clear();
    this.requestsMap.clear();
    this.unresolvedPreflightRequests.clear();
    for (const request of requests) {
      this.addRequest(request);
    }
  }

  private onRequestStarted(event: Common.EventTarget.EventTargetEvent<SDK.NetworkManager.RequestStartedEvent>): void {
    const {request, originalRequest} = event.data;
    if (originalRequest) {
      this.sentNetworkRequests.push(originalRequest);
    }
    this.requestsSet.add(request);
    const manager = SDK.NetworkManager.NetworkManager.forRequest(request);
    const pageLoad = manager ? this.pageLoadForManager.get(manager) : null;
    if (pageLoad) {
      pageLoad.bindRequest(request);
    }
    this.addRequest(request);
  }

  private onResponseReceived(event: Common.EventTarget.EventTargetEvent<SDK.NetworkManager.ResponseReceivedEvent>):
      void {
    const response = event.data.response;
    this.receivedNetworkResponses.push(response);
  }

  private onRequestUpdated(event: Common.EventTarget.EventTargetEvent<SDK.NetworkRequest.NetworkRequest>): void {
    const request = event.data;
    if (!this.requestsSet.has(request)) {
      return;
    }
    this.dispatchEventToListeners(Events.RequestUpdated, request);
  }

  private onRequestRedirect(event: Common.EventTarget.EventTargetEvent<SDK.NetworkRequest.NetworkRequest>): void {
    this.initiatorData.delete(event.data);
  }

  private onDOMContentLoaded(
      resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel,
      event: Common.EventTarget.EventTargetEvent<number>): void {
    const networkManager = resourceTreeModel.target().model(SDK.NetworkManager.NetworkManager);
    const pageLoad = networkManager ? this.pageLoadForManager.get(networkManager) : null;
    if (pageLoad) {
      pageLoad.contentLoadTime = event.data;
    }
  }

  private onLoad(event: Common.EventTarget
                     .EventTargetEvent<{resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel, loadTime: number}>):
      void {
    const networkManager = event.data.resourceTreeModel.target().model(SDK.NetworkManager.NetworkManager);
    const pageLoad = networkManager ? this.pageLoadForManager.get(networkManager) : null;
    if (pageLoad) {
      pageLoad.loadTime = event.data.loadTime;
    }
  }

  reset(clearIfPreserved: boolean): void {
    this.requestsInternal = [];
    this.sentNetworkRequests = [];
    this.receivedNetworkResponses = [];
    this.requestsSet.clear();
    this.requestsMap.clear();
    this.unresolvedPreflightRequests.clear();
    const managers = new Set<SDK.NetworkManager.NetworkManager>(
        SDK.TargetManager.TargetManager.instance().models(SDK.NetworkManager.NetworkManager));
    for (const manager of this.pageLoadForManager.keys()) {
      if (!managers.has(manager)) {
        this.pageLoadForManager.delete(manager);
      }
    }

    this.dispatchEventToListeners(Events.Reset, {clearIfPreserved});
  }

  private networkMessageGenerated(
      networkManager: SDK.NetworkManager.NetworkManager,
      event: Common.EventTarget.EventTargetEvent<SDK.NetworkManager.MessageGeneratedEvent>): void {
    const {message, warning, requestId} = event.data;
    const consoleMessage = new SDK.ConsoleModel.ConsoleMessage(
        networkManager.target().model(SDK.RuntimeModel.RuntimeModel), Protocol.Log.LogEntrySource.Network,
        warning ? Protocol.Log.LogEntryLevel.Warning : Protocol.Log.LogEntryLevel.Info, message);
    this.associateConsoleMessageWithRequest(consoleMessage, requestId);
    SDK.ConsoleModel.ConsoleModel.instance().addMessage(consoleMessage);
  }

  associateConsoleMessageWithRequest(consoleMessage: SDK.ConsoleModel.ConsoleMessage, requestId: string): void {
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
      consoleMessage.stackTrace = initiator.stack || undefined;
      if (initiator.url) {
        consoleMessage.url = initiator.url as Platform.DevToolsPath.UrlString;
        consoleMessage.line = initiator.lineNumber || 0;
      }
    }
  }

  static requestForConsoleMessage(consoleMessage: SDK.ConsoleModel.ConsoleMessage): SDK.NetworkRequest.NetworkRequest
      |null {
    return consoleMessageToRequest.get(consoleMessage) || null;
  }

  requestsForId(requestId: string): SDK.NetworkRequest.NetworkRequest[] {
    return this.requestsMap.get(requestId) || [];
  }
}

const consoleMessageToRequest = new WeakMap<SDK.ConsoleModel.ConsoleMessage, SDK.NetworkRequest.NetworkRequest>();

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  Reset = 'Reset',
  RequestAdded = 'RequestAdded',
  RequestUpdated = 'RequestUpdated',
}

export interface ResetEvent {
  clearIfPreserved: boolean;
}

export type EventTypes = {
  [Events.Reset]: ResetEvent,
  [Events.RequestAdded]: SDK.NetworkRequest.NetworkRequest,
  [Events.RequestUpdated]: SDK.NetworkRequest.NetworkRequest,
};

export interface InitiatorData {
  info: InitiatorInfo|null;
  chain: Set<SDK.NetworkRequest.NetworkRequest>|null;
  request?: SDK.NetworkRequest.NetworkRequest|null;
}

export interface InitiatorGraph {
  initiators: Set<SDK.NetworkRequest.NetworkRequest>;
  initiated: Map<SDK.NetworkRequest.NetworkRequest, SDK.NetworkRequest.NetworkRequest>;
}

export interface InitiatorInfo {
  type: SDK.NetworkRequest.InitiatorType;
  // generally this is a url but can also contain "<anonymous>"
  url: Platform.DevToolsPath.UrlString;
  lineNumber: number|undefined;
  columnNumber: number|undefined;
  scriptId: Protocol.Runtime.ScriptId|null;
  stack: Protocol.Runtime.StackTrace|null;
  initiatorRequest: SDK.NetworkRequest.NetworkRequest|null;
}

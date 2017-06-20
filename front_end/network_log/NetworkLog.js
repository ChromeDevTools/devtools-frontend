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

/**
 * @implements {SDK.SDKModelObserver<!SDK.NetworkManager>}
 */
NetworkLog.NetworkLog = class extends Common.Object {
  constructor() {
    super();
    /** @type {!Array<!SDK.NetworkRequest>} */
    this._requests = [];
    /** @type {!Set<!SDK.NetworkRequest>} */
    this._requestsSet = new Set();
    /** @type {!Map<!SDK.NetworkManager, !Map<string, !SDK.NetworkRequest>>} */
    this._requestsByManagerAndId = new Map();
    /** @type {!Map<!SDK.NetworkManager, !NetworkLog.PageLoad>} */
    this._currentPageLoad = new Map();
    this._isRecording = true;
    SDK.targetManager.observeModels(SDK.NetworkManager, this);
  }

  /**
   * @override
   * @param {!SDK.NetworkManager} networkManager
   */
  modelAdded(networkManager) {
    var eventListeners = [];
    eventListeners.push(
        networkManager.addEventListener(SDK.NetworkManager.Events.RequestStarted, this._onRequestStarted, this));
    eventListeners.push(
        networkManager.addEventListener(SDK.NetworkManager.Events.RequestUpdated, this._onRequestUpdated, this));
    eventListeners.push(
        networkManager.addEventListener(SDK.NetworkManager.Events.RequestRedirected, this._onRequestRedirect, this));
    eventListeners.push(
        networkManager.addEventListener(SDK.NetworkManager.Events.RequestFinished, this._onRequestUpdated, this));

    var resourceTreeModel = networkManager.target().model(SDK.ResourceTreeModel);
    if (resourceTreeModel) {
      eventListeners.push(
          resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.WillReloadPage, this._willReloadPage, this));
      eventListeners.push(resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this._onMainFrameNavigated, this));
      eventListeners.push(resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, this._onLoad, this));
      eventListeners.push(resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.DOMContentLoaded, this._onDOMContentLoaded.bind(this, resourceTreeModel)));
    }

    networkManager[NetworkLog.NetworkLog._events] = eventListeners;
    this._requestsByManagerAndId.set(networkManager, new Map());
  }

  /**
   * @override
   * @param {!SDK.NetworkManager} networkManager
   */
  modelRemoved(networkManager) {
    this._requestsByManagerAndId.delete(networkManager);
    this._removeNetworkManagerListeners(networkManager);
  }

  /**
   * @param {!SDK.NetworkManager} networkManager
   */
  _removeNetworkManagerListeners(networkManager) {
    Common.EventTarget.removeEventListeners(networkManager[NetworkLog.NetworkLog._events]);
  }

  /**
   * @param {boolean} enabled
   */
  setIsRecording(enabled) {
    if (this._isRecording === enabled)
      return;
    this._isRecording = enabled;
    if (enabled) {
      SDK.targetManager.observeModels(SDK.NetworkManager, this);
    } else {
      SDK.targetManager.unobserveModels(SDK.NetworkManager, this);
      SDK.targetManager.models(SDK.NetworkManager).forEach(this._removeNetworkManagerListeners.bind(this));
    }
  }

  /**
   * @param {string} url
   * @return {?SDK.NetworkRequest}
   */
  requestForURL(url) {
    return this._requests.find(request => request.url() === url) || null;
  }

  /**
   * @return {!Array<!SDK.NetworkRequest>}
   */
  requests() {
    return this._requests;
  }

  /**
   * @param {!SDK.NetworkManager} networkManager
   * @return {!Array<!SDK.NetworkRequest>}
   */
  requestsForManager(networkManager) {
    var map = this._requestsByManagerAndId.get(networkManager);
    return map ? Array.from(map.values()) : [];
  }

  /**
   * @param {!SDK.NetworkManager} networkManager
   * @param {string} url
   * @return {?SDK.NetworkRequest}
   */
  _requestByManagerAndURL(networkManager, url) {
    var map = this._requestsByManagerAndId.get(networkManager);
    if (!map)
      return null;
    for (var request of map.values()) {
      if (request.url() === url)
        return request;
    }
    return null;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  _initializeInitiatorSymbolIfNeeded(request) {
    if (!request[NetworkLog.NetworkLog._initiatorDataSymbol]) {
      /** @type {!{info: ?NetworkLog.NetworkLog._InitiatorInfo, chain: !Set<!SDK.NetworkRequest>, request: (?SDK.NetworkRequest|undefined)}} */
      request[NetworkLog.NetworkLog._initiatorDataSymbol] = {
        info: null,
        chain: null,
        request: undefined,
      };
    }
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {!NetworkLog.NetworkLog._InitiatorInfo}
   */
  initiatorInfoForRequest(request) {
    this._initializeInitiatorSymbolIfNeeded(request);
    if (request[NetworkLog.NetworkLog._initiatorDataSymbol].info)
      return request[NetworkLog.NetworkLog._initiatorDataSymbol].info;

    var type = SDK.NetworkRequest.InitiatorType.Other;
    var url = '';
    var lineNumber = -Infinity;
    var columnNumber = -Infinity;
    var scriptId = null;
    var initiator = request.initiator();

    var redirectSource = request.redirectSource();
    if (redirectSource) {
      type = SDK.NetworkRequest.InitiatorType.Redirect;
      url = redirectSource.url();
    } else if (initiator) {
      if (initiator.type === Protocol.Network.InitiatorType.Parser) {
        type = SDK.NetworkRequest.InitiatorType.Parser;
        url = initiator.url ? initiator.url : url;
        lineNumber = initiator.lineNumber ? initiator.lineNumber : lineNumber;
      } else if (initiator.type === Protocol.Network.InitiatorType.Script) {
        for (var stack = initiator.stack; stack; stack = stack.parent) {
          var topFrame = stack.callFrames.length ? stack.callFrames[0] : null;
          if (!topFrame)
            continue;
          type = SDK.NetworkRequest.InitiatorType.Script;
          url = topFrame.url || Common.UIString('<anonymous>');
          lineNumber = topFrame.lineNumber;
          columnNumber = topFrame.columnNumber;
          scriptId = topFrame.scriptId;
          break;
        }
      } else if (initiator.type === Protocol.Network.InitiatorType.Preload) {
        type = SDK.NetworkRequest.InitiatorType.Preload;
      }
    }

    request[NetworkLog.NetworkLog._initiatorDataSymbol].info =
        {type: type, url: url, lineNumber: lineNumber, columnNumber: columnNumber, scriptId: scriptId};
    return request[NetworkLog.NetworkLog._initiatorDataSymbol].info;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {!NetworkLog.NetworkLog.InitiatorGraph}
   */
  initiatorGraphForRequest(request) {
    /** @type {!Set<!SDK.NetworkRequest>} */
    var initiated = new Set();
    var map = this._requestsByManagerAndId.get(request.networkManager());
    if (map) {
      for (var otherRequest of map.values()) {
        if (this._initiatorChain(otherRequest).has(request))
          initiated.add(otherRequest);
      }
    }
    return {initiators: this._initiatorChain(request), initiated: initiated};
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {!Set<!SDK.NetworkRequest>}
   */
  _initiatorChain(request) {
    this._initializeInitiatorSymbolIfNeeded(request);
    var initiatorChainCache =
        /** @type {?Set<!SDK.NetworkRequest>} */ (request[NetworkLog.NetworkLog._initiatorDataSymbol].chain);
    if (initiatorChainCache)
      return initiatorChainCache;

    initiatorChainCache = new Set();

    var checkRequest = request;
    do {
      initiatorChainCache.add(checkRequest);
      checkRequest = this._initiatorRequest(checkRequest);
    } while (checkRequest);
    request[NetworkLog.NetworkLog._initiatorDataSymbol].chain = initiatorChainCache;
    return initiatorChainCache;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {?SDK.NetworkRequest}
   */
  _initiatorRequest(request) {
    this._initializeInitiatorSymbolIfNeeded(request);
    if (request[NetworkLog.NetworkLog._initiatorDataSymbol].request !== undefined)
      return request[NetworkLog.NetworkLog._initiatorDataSymbol].request;
    var url = this.initiatorInfoForRequest(request).url;
    request[NetworkLog.NetworkLog._initiatorDataSymbol].request =
        this._requestByManagerAndURL(request.networkManager(), url);
    return request[NetworkLog.NetworkLog._initiatorDataSymbol].request;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {?NetworkLog.PageLoad}
   */
  pageLoadForRequest(request) {
    return request[NetworkLog.NetworkLog._pageLoadForRequestSymbol] || null;
  }

  _willReloadPage() {
    if (!Common.moduleSetting('network_log.preserve-log').get())
      this.reset();
  }

  /**
   * @param {!Common.Event} event
   */
  _onMainFrameNavigated(event) {
    var mainFrame = /** @type {!SDK.ResourceTreeFrame} */ (event.data);
    var networkManager = mainFrame.resourceTreeModel().target().model(SDK.NetworkManager);
    if (!networkManager)
      return;

    var oldManagerRequests = this.requestsForManager(networkManager);
    var oldRequestsSet = this._requestsSet;
    this._requests = [];
    this._requestsSet = new Set();
    var idMap = new Map();
    // TODO(allada) This should be removed in a future patch, but if somewhere else does a request on this in a reset
    // event it may cause problems.
    this._requestsByManagerAndId.set(networkManager, idMap);
    this.dispatchEventToListeners(NetworkLog.NetworkLog.Events.Reset);

    // Preserve requests from the new session.
    var currentPageLoad = null;
    var requestsToAdd = [];
    for (var request of oldManagerRequests) {
      if (request.loaderId !== mainFrame.loaderId)
        continue;
      if (!currentPageLoad) {
        currentPageLoad = new NetworkLog.PageLoad(request);
        var redirectSource = request.redirectSource();
        while (redirectSource) {
          requestsToAdd.push(redirectSource);
          redirectSource = redirectSource.redirectSource();
        }
      }
      requestsToAdd.push(request);
    }

    for (var request of requestsToAdd) {
      oldRequestsSet.delete(request);
      this._requests.push(request);
      this._requestsSet.add(request);
      idMap.set(request.requestId(), request);
      request[NetworkLog.NetworkLog._pageLoadForRequestSymbol] = currentPageLoad;
      this.dispatchEventToListeners(NetworkLog.NetworkLog.Events.RequestAdded, request);
    }

    if (Common.moduleSetting('network_log.preserve-log').get()) {
      for (var request of oldRequestsSet) {
        this._requests.push(request);
        this._requestsSet.add(request);
        this.dispatchEventToListeners(NetworkLog.NetworkLog.Events.RequestAdded, request);
      }
    }

    if (currentPageLoad)
      this._currentPageLoad.set(networkManager, currentPageLoad);
  }

  /**
   * @param {!Common.Event} event
   */
  _onRequestStarted(event) {
    var request = /** @type {!SDK.NetworkRequest} */ (event.data);
    this._requests.push(request);
    this._requestsSet.add(request);
    var idMap = this._requestsByManagerAndId.get(request.networkManager());
    if (idMap)
      idMap.set(request.requestId(), request);
    request[NetworkLog.NetworkLog._pageLoadForRequestSymbol] =
        this._currentPageLoad.get(request.networkManager()) || null;
    this.dispatchEventToListeners(NetworkLog.NetworkLog.Events.RequestAdded, request);
  }

  /**
   * @param {!Common.Event} event
   */
  _onRequestUpdated(event) {
    var request = /** @type {!SDK.NetworkRequest} */ (event.data);
    if (!this._requestsSet.has(request))
      return;
    this.dispatchEventToListeners(NetworkLog.NetworkLog.Events.RequestUpdated, request);
  }

  /**
   * @param {!Common.Event} event
   */
  _onRequestRedirect(event) {
    var request = /** @type {!SDK.NetworkRequest} */ (event.data);
    delete request[NetworkLog.NetworkLog._initiatorDataSymbol];
  }

  /**
   * @param {!SDK.ResourceTreeModel} resourceTreeModel
   * @param {!Common.Event} event
   */
  _onDOMContentLoaded(resourceTreeModel, event) {
    var networkManager = resourceTreeModel.target().model(SDK.NetworkManager);
    var pageLoad = networkManager ? this._currentPageLoad.get(networkManager) : null;
    if (pageLoad)
      pageLoad.contentLoadTime = /** @type {number} */ (event.data);
  }

  /**
   * @param {!Common.Event} event
   */
  _onLoad(event) {
    var networkManager = event.data.resourceTreeModel.target().model(SDK.NetworkManager);
    var pageLoad = networkManager ? this._currentPageLoad.get(networkManager) : null;
    if (pageLoad)
      pageLoad.loadTime = /** @type {number} */ (event.data.loadTime);
  }

  /**
   * @param {!SDK.NetworkManager} networkManager
   * @param {!Protocol.Network.RequestId} requestId
   * @return {?SDK.NetworkRequest}
   */
  requestForId(networkManager, requestId) {
    var map = this._requestsByManagerAndId.get(networkManager);
    return map ? (map.get(requestId) || null) : null;
  }

  reset() {
    this._requests = [];
    this._requestsSet.clear();
    this._requestsByManagerAndId.forEach(map => map.clear());
    var networkManagers = new Set(SDK.targetManager.models(SDK.NetworkManager));
    for (var networkManager of this._currentPageLoad.keys()) {
      if (!networkManagers.has(networkManager))
        this._currentPageLoad.delete(networkManager);
    }

    this.dispatchEventToListeners(NetworkLog.NetworkLog.Events.Reset);
  }
};

NetworkLog.PageLoad = class {
  /**
   * @param {!SDK.NetworkRequest} mainRequest
   */
  constructor(mainRequest) {
    this.id = ++NetworkLog.PageLoad._lastIdentifier;
    this.url = mainRequest.url();
    this.startTime = mainRequest.startTime;
    /** @type {number} */
    this.loadTime;
    /** @type {number} */
    this.contentLoadTime;
    this.mainRequest = mainRequest;
  }
};

NetworkLog.PageLoad._lastIdentifier = 0;

/** @typedef {!{initiators: !Set<!SDK.NetworkRequest>, initiated: !Set<!SDK.NetworkRequest>}} */
NetworkLog.NetworkLog.InitiatorGraph;

NetworkLog.NetworkLog.Events = {
  Reset: Symbol('Reset'),
  RequestAdded: Symbol('RequestAdded'),
  RequestUpdated: Symbol('RequestUpdated')
};

/** @typedef {!{type: !SDK.NetworkRequest.InitiatorType, url: string, lineNumber: number, columnNumber: number, scriptId: ?string}} */
NetworkLog.NetworkLog._InitiatorInfo;

NetworkLog.NetworkLog._initiatorDataSymbol = Symbol('InitiatorData');
NetworkLog.NetworkLog._pageLoadForRequestSymbol = Symbol('PageLoadForRequest');
NetworkLog.NetworkLog._events = Symbol('NetworkLog.NetworkLog.events');

/** @type {!NetworkLog.NetworkLog} */
NetworkLog.networkLog;

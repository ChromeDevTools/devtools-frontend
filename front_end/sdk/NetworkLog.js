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
SDK.NetworkLog = class {
  constructor() {
    /** @type {!Array<!SDK.NetworkRequest>} */
    this._requests = [];
    /** @type {!Map<!SDK.Target, !Map<string, !SDK.NetworkRequest>>} */
    this._requestsByTargetAndId = new Map();
    /** @type {!Map<!SDK.Target, !SDK.PageLoad>} */
    this._currentPageLoad = new Map();
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
    eventListeners.push(networkManager.on(SDK.NetworkManager.RequestRedirectEvent, this._onRequestRedirect, this));

    var resourceTreeModel = networkManager.target().model(SDK.ResourceTreeModel);
    if (resourceTreeModel) {
      eventListeners.push(resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this._onMainFrameNavigated, this));
      eventListeners.push(resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.Load, this._onLoad.bind(this, resourceTreeModel)));
      eventListeners.push(resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.DOMContentLoaded, this._onDOMContentLoaded.bind(this, resourceTreeModel)));
    }

    networkManager[SDK.NetworkLog._events] = eventListeners;
    this._requestsByTargetAndId.set(networkManager.target(), new Map());
  }

  /**
   * @override
   * @param {!SDK.NetworkManager} networkManager
   */
  modelRemoved(networkManager) {
    this._requestsByTargetAndId.delete(networkManager.target());
    Common.EventTarget.removeEventListeners(networkManager[SDK.NetworkLog._events]);
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
   * @param {!SDK.Target} target
   * @return {!Array<!SDK.NetworkRequest>}
   */
  requestsForTarget(target) {
    var map = this._requestsByTargetAndId.get(target);
    return map ? Array.from(map.values()) : [];
  }

  /**
   * @param {string} url
   * @param {!SDK.Target} target
   * @return {?SDK.NetworkRequest}
   */
  _requestForURLInTarget(url, target) {
    var map = this._requestsByTargetAndId.get(target);
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
    if (!request[SDK.NetworkLog._initiatorDataSymbol]) {
      /** @type {!{info: ?SDK.NetworkLog._InitiatorInfo, chain: !Set<!SDK.NetworkRequest>, request: (?SDK.NetworkRequest|undefined)}} */
      request[SDK.NetworkLog._initiatorDataSymbol] = {
        info: null,
        chain: null,
        request: undefined,
      };
    }
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {!SDK.NetworkLog._InitiatorInfo}
   */
  initiatorInfoForRequest(request) {
    this._initializeInitiatorSymbolIfNeeded(request);
    if (request[SDK.NetworkLog._initiatorDataSymbol].info)
      return request[SDK.NetworkLog._initiatorDataSymbol].info;

    var type = SDK.NetworkRequest.InitiatorType.Other;
    var url = '';
    var lineNumber = -Infinity;
    var columnNumber = -Infinity;
    var scriptId = null;
    var initiator = request.initiator();

    if (request.redirectSource) {
      type = SDK.NetworkRequest.InitiatorType.Redirect;
      url = request.redirectSource.url();
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

    request[SDK.NetworkLog._initiatorDataSymbol].info =
        {type: type, url: url, lineNumber: lineNumber, columnNumber: columnNumber, scriptId: scriptId};
    return request[SDK.NetworkLog._initiatorDataSymbol].info;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {!SDK.NetworkLog.InitiatorGraph}
   */
  initiatorGraphForRequest(request) {
    /** @type {!Set<!SDK.NetworkRequest>} */
    var initiated = new Set();
    var map = this._requestsByTargetAndId.get(request.target());
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
        /** @type {?Set<!SDK.NetworkRequest>} */ (request[SDK.NetworkLog._initiatorDataSymbol].chain);
    if (initiatorChainCache)
      return initiatorChainCache;

    initiatorChainCache = new Set();

    var checkRequest = request;
    do {
      initiatorChainCache.add(checkRequest);
      checkRequest = this._initiatorRequest(checkRequest);
    } while (checkRequest);
    request[SDK.NetworkLog._initiatorDataSymbol].chain = initiatorChainCache;
    return initiatorChainCache;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {?SDK.NetworkRequest}
   */
  _initiatorRequest(request) {
    this._initializeInitiatorSymbolIfNeeded(request);
    if (request[SDK.NetworkLog._initiatorDataSymbol].request !== undefined)
      return request[SDK.NetworkLog._initiatorDataSymbol].request;
    var url = this.initiatorInfoForRequest(request).url;
    request[SDK.NetworkLog._initiatorDataSymbol].request = this._requestForURLInTarget(url, request.target());
    return request[SDK.NetworkLog._initiatorDataSymbol].request;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {?SDK.PageLoad}
   */
  pageLoadForRequest(request) {
    return request[SDK.NetworkLog._pageLoadForRequestSymbol];
  }

  /**
   * @param {!Common.Event} event
   */
  _onMainFrameNavigated(event) {
    var mainFrame = /** @type {!SDK.ResourceTreeFrame} */ (event.data);
    var target = mainFrame.target();
    this._currentPageLoad.delete(target);
    var oldRequests = this.requestsForTarget(target);
    this._requests = this._requests.filter(request => request.target() !== target);
    var idMap = new Map();
    this._requestsByTargetAndId.set(target, idMap);

    // Preserve requests from the new session.
    var currentPageLoad = null;
    for (var i = 0; i < oldRequests.length; ++i) {
      var request = oldRequests[i];
      if (request.loaderId === mainFrame.loaderId) {
        if (!currentPageLoad)
          currentPageLoad = new SDK.PageLoad(request);
        this._requests.push(request);
        idMap.set(request.requestId(), request);
        request[SDK.NetworkLog._pageLoadForRequestSymbol] = currentPageLoad;
      }
    }
    if (currentPageLoad)
      this._currentPageLoad.set(target, currentPageLoad);
  }

  /**
   * @param {!Common.Event} event
   */
  _onRequestStarted(event) {
    var request = /** @type {!SDK.NetworkRequest} */ (event.data);
    this._requests.push(request);
    this._requestsByTargetAndId.get(request.target()).set(request.requestId(), request);
    request[SDK.NetworkLog._pageLoadForRequestSymbol] = this._currentPageLoad.get(request.target());
  }

  /**
   * @param {!SDK.NetworkManager.RequestRedirectEvent} event
   */
  _onRequestRedirect(event) {
    var request = event.request;
    delete request[SDK.NetworkLog._initiatorDataSymbol];
  }

  /**
   * @param {!SDK.ResourceTreeModel} resourceTreeModel
   * @param {!Common.Event} event
   */
  _onDOMContentLoaded(resourceTreeModel, event) {
    var pageLoad = this._currentPageLoad.get(resourceTreeModel.target());
    if (pageLoad)
      pageLoad.contentLoadTime = /** @type {number} */ (event.data);
  }

  /**
   * @param {!SDK.ResourceTreeModel} resourceTreeModel
   * @param {!Common.Event} event
   */
  _onLoad(resourceTreeModel, event) {
    var pageLoad = this._currentPageLoad.get(resourceTreeModel.target());
    if (pageLoad)
      pageLoad.loadTime = /** @type {number} */ (event.data);
  }

  /**
   * @param {!SDK.Target} target
   * @param {!Protocol.Network.RequestId} requestId
   * @return {?SDK.NetworkRequest}
   */
  requestForId(target, requestId) {
    var map = this._requestsByTargetAndId.get(target);
    return map ? (map.get(requestId) || null) : null;
  }
};

SDK.PageLoad = class {
  /**
   * @param {!SDK.NetworkRequest} mainRequest
   */
  constructor(mainRequest) {
    this.id = ++SDK.PageLoad._lastIdentifier;
    this.url = mainRequest.url();
    this.startTime = mainRequest.startTime;
    /** @type {number} */
    this.loadTime;
    /** @type {number} */
    this.contentLoadTime;
  }
};

SDK.PageLoad._lastIdentifier = 0;

/** @typedef {!{initiators: !Set<!SDK.NetworkRequest>, initiated: !Set<!SDK.NetworkRequest>}} */
SDK.NetworkLog.InitiatorGraph;

/** @typedef {!{type: !SDK.NetworkRequest.InitiatorType, url: string, lineNumber: number, columnNumber: number, scriptId: ?string}} */
SDK.NetworkLog._InitiatorInfo;

SDK.NetworkLog._initiatorDataSymbol = Symbol('InitiatorData');
SDK.NetworkLog._pageLoadForRequestSymbol = Symbol('PageLoadForRequest');
SDK.NetworkLog._events = Symbol('SDK.NetworkLog.events');

/** @type {!SDK.NetworkLog} */
SDK.networkLog;

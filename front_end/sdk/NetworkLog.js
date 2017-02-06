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
 * @unrestricted
 */
SDK.NetworkLog = class {
  /**
   * @param {!SDK.Target} target
   * @param {!SDK.ResourceTreeModel} resourceTreeModel
   * @param {!SDK.NetworkManager} networkManager
   */
  constructor(target, resourceTreeModel, networkManager) {
    this._target = target;
    target[SDK.NetworkLog._logSymbol] = this;
    /** @type {!Array<!SDK.NetworkRequest>} */
    this._requests = [];
    /** @type {!Object<string, !SDK.NetworkRequest>} */
    this._requestForId = {};
    networkManager.addEventListener(SDK.NetworkManager.Events.RequestStarted, this._onRequestStarted, this);
    resourceTreeModel.addEventListener(
        SDK.ResourceTreeModel.Events.MainFrameNavigated, this._onMainFrameNavigated, this);
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, this._onLoad, this);
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.DOMContentLoaded, this._onDOMContentLoaded, this);
    networkManager.on(SDK.NetworkManager.RequestRedirectEvent, this._onRequestRedirect, this);
  }

  /**
   * @return {!SDK.Target}
   */
  target() {
    return this._target;
  }

  /**
   * @param {!SDK.Target} target
   * @return {?SDK.NetworkLog}
   */
  static fromTarget(target) {
    return target[SDK.NetworkLog._logSymbol] || null;
  }

  /**
   * @param {string} url
   * @return {?SDK.NetworkRequest}
   */
  static requestForURL(url) {
    for (var target of SDK.targetManager.targets()) {
      var networkLog = SDK.NetworkLog.fromTarget(target);
      var result = networkLog && networkLog.requestForURL(url);
      if (result)
        return result;
    }
    return null;
  }

  /**
   * @return {!Array.<!SDK.NetworkRequest>}
   */
  static requests() {
    var result = [];
    for (var target of SDK.targetManager.targets()) {
      var networkLog = SDK.NetworkLog.fromTarget(target);
      if (networkLog)
        result = result.concat(networkLog.requests());
    }
    return result;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {?SDK.NetworkLog}
   */
  static fromRequest(request) {
    return SDK.NetworkLog.fromTarget(request.target());
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  static _initializeInitiatorSymbolIfNeeded(request) {
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
  static initiatorInfoForRequest(request) {
    SDK.NetworkLog._initializeInitiatorSymbolIfNeeded(request);
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
  static initiatorGraphForRequest(request) {
    /** @type {!Set<!SDK.NetworkRequest>} */
    var initiated = new Set();
    var networkLog = SDK.NetworkLog.fromRequest(request);
    if (!networkLog)
      return {initiators: new Set(), initiated: new Set()};

    var requests = networkLog.requests();
    for (var logRequest of requests) {
      var localInitiators = initiatorChain(logRequest);
      if (localInitiators.has(request))
        initiated.add(logRequest);
    }
    return {initiators: initiatorChain(request), initiated: initiated};

    /**
     * @param {!SDK.NetworkRequest} request
     * @return {!Set<!SDK.NetworkRequest>}
     */
    function initiatorChain(request) {
      SDK.NetworkLog._initializeInitiatorSymbolIfNeeded(request);
      var initiatorChainCache =
          /** @type {?Set<!SDK.NetworkRequest>} */ (request[SDK.NetworkLog._initiatorDataSymbol].chain);
      if (initiatorChainCache)
        return initiatorChainCache;

      initiatorChainCache = new Set();

      var checkRequest = request;
      while (checkRequest) {
        initiatorChainCache.add(checkRequest);
        checkRequest = initiatorRequest(checkRequest);
      }
      request[SDK.NetworkLog._initiatorDataSymbol].chain = initiatorChainCache;
      return initiatorChainCache;
    }

    /**
     * @param {!SDK.NetworkRequest} request
     * @return {?SDK.NetworkRequest}
     */
    function initiatorRequest(request) {
      SDK.NetworkLog._initializeInitiatorSymbolIfNeeded(request);
      if (request[SDK.NetworkLog._initiatorDataSymbol].request !== undefined)
        return request[SDK.NetworkLog._initiatorDataSymbol].request;
      var networkLog = SDK.NetworkLog.fromRequest(request);
      var url = SDK.NetworkLog.initiatorInfoForRequest(request).url;
      request[SDK.NetworkLog._initiatorDataSymbol].request = networkLog.requestForURL(url);
      return request[SDK.NetworkLog._initiatorDataSymbol].request;
    }
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {?SDK.PageLoad}
   */
  static pageLoadForRequest(request) {
    return request[SDK.NetworkLog._pageLoadForRequestSymbol];
  }

  /**
   * @return {!Array.<!SDK.NetworkRequest>}
   */
  requests() {
    return this._requests;
  }

  /**
   * @param {string} url
   * @return {?SDK.NetworkRequest}
   */
  requestForURL(url) {
    for (var i = 0; i < this._requests.length; ++i) {
      if (this._requests[i].url() === url)
        return this._requests[i];
    }
    return null;
  }

  /**
   * @param {!Common.Event} event
   */
  _onMainFrameNavigated(event) {
    var mainFrame = /** type {SDK.ResourceTreeFrame} */ event.data;
    // Preserve requests from the new session.
    this._currentPageLoad = null;
    var oldRequests = this._requests.splice(0, this._requests.length);
    this._requestForId = {};
    for (var i = 0; i < oldRequests.length; ++i) {
      var request = oldRequests[i];
      if (request.loaderId === mainFrame.loaderId) {
        if (!this._currentPageLoad)
          this._currentPageLoad = new SDK.PageLoad(request);
        this._requests.push(request);
        this._requestForId[request.requestId()] = request;
        request[SDK.NetworkLog._pageLoadForRequestSymbol] = this._currentPageLoad;
      }
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _onRequestStarted(event) {
    var request = /** @type {!SDK.NetworkRequest} */ (event.data);
    this._requests.push(request);
    this._requestForId[request.requestId()] = request;
    request[SDK.NetworkLog._pageLoadForRequestSymbol] = this._currentPageLoad;
  }

  /**
   * @param {!SDK.NetworkManager.RequestRedirectEvent} event
   */
  _onRequestRedirect(event) {
    var request = event.request;
    delete request[SDK.NetworkLog._initiatorDataSymbol];
  }

  /**
   * @param {!Common.Event} event
   */
  _onDOMContentLoaded(event) {
    if (this._currentPageLoad)
      this._currentPageLoad.contentLoadTime = event.data;
  }

  /**
   * @param {!Common.Event} event
   */
  _onLoad(event) {
    if (this._currentPageLoad)
      this._currentPageLoad.loadTime = event.data;
  }

  /**
   * @param {!Protocol.Network.RequestId} requestId
   * @return {?SDK.NetworkRequest}
   */
  requestForId(requestId) {
    return this._requestForId[requestId];
  }
};

/**
 * @unrestricted
 */
SDK.PageLoad = class {
  /**
   * @param {!SDK.NetworkRequest} mainRequest
   */
  constructor(mainRequest) {
    this.id = ++SDK.PageLoad._lastIdentifier;
    this.url = mainRequest.url();
    this.startTime = mainRequest.startTime;
  }
};

SDK.PageLoad._lastIdentifier = 0;

/** @typedef {!{initiators: !Set<!SDK.NetworkRequest>, initiated: !Set<!SDK.NetworkRequest>}} */
SDK.NetworkLog.InitiatorGraph;

/** @typedef {!{type: !SDK.NetworkRequest.InitiatorType, url: string, lineNumber: number, columnNumber: number, scriptId: ?string}} */
SDK.NetworkLog._InitiatorInfo;

SDK.NetworkLog._initiatorDataSymbol = Symbol('InitiatorData');
SDK.NetworkLog._pageLoadForRequestSymbol = Symbol('PageLoadForRequest');
SDK.NetworkLog._logSymbol = Symbol('NetworkLog');

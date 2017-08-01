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
SDK.NetworkManager = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);
    this._dispatcher = new SDK.NetworkDispatcher(this);
    this._networkAgent = target.networkAgent();
    target.registerNetworkDispatcher(this._dispatcher);
    if (Common.moduleSetting('cacheDisabled').get())
      this._networkAgent.setCacheDisabled(true);

    // Limit buffer when talking to a remote device.
    if (Runtime.queryParam('remoteFrontend') || Runtime.queryParam('ws'))
      this._networkAgent.enable(10000000, 5000000);
    else
      this._networkAgent.enable();

    this._bypassServiceWorkerSetting = Common.settings.createSetting('bypassServiceWorker', false);
    if (this._bypassServiceWorkerSetting.get())
      this._bypassServiceWorkerChanged();
    this._bypassServiceWorkerSetting.addChangeListener(this._bypassServiceWorkerChanged, this);

    Common.moduleSetting('cacheDisabled').addChangeListener(this._cacheDisabledSettingChanged, this);
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {?SDK.NetworkManager}
   */
  static forRequest(request) {
    return request[SDK.NetworkManager._networkManagerForRequestSymbol];
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static canReplayRequest(request) {
    return !!request[SDK.NetworkManager._networkManagerForRequestSymbol] &&
        request.resourceType() === Common.resourceTypes.XHR;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  static replayRequest(request) {
    var manager = request[SDK.NetworkManager._networkManagerForRequestSymbol];
    if (!manager)
      return;
    manager._networkAgent.replayXHR(request.requestId());
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {!Promise<!SDK.NetworkRequest.ContentData>}
   */
  static async requestContentData(request) {
    if (request.resourceType() === Common.resourceTypes.WebSocket)
      return {error: 'Content for WebSockets is currently not supported', content: null, encoded: false};
    if (!request.finished)
      await request.once(SDK.NetworkRequest.Events.FinishedLoading);
    var manager = SDK.NetworkManager.forRequest(request);
    if (!manager)
      return {error: 'No network manager for request', content: null, encoded: false};
    var response = await manager._networkAgent.invoke_getResponseBody({requestId: request.requestId()});
    var error = response[Protocol.Error] || null;
    return {error: error, content: error ? null : response.body, encoded: response.base64Encoded};
  }

  /**
   * @param {!SDK.NetworkManager.Conditions} conditions
   * @return {!Protocol.Network.ConnectionType}
   * TODO(allada): this belongs to NetworkConditionsSelector, which should hardcode/guess it.
   */
  static _connectionType(conditions) {
    if (!conditions.download && !conditions.upload)
      return Protocol.Network.ConnectionType.None;
    var types = SDK.NetworkManager._connectionTypes;
    if (!types) {
      SDK.NetworkManager._connectionTypes = [];
      types = SDK.NetworkManager._connectionTypes;
      types.push(['2g', Protocol.Network.ConnectionType.Cellular2g]);
      types.push(['3g', Protocol.Network.ConnectionType.Cellular3g]);
      types.push(['4g', Protocol.Network.ConnectionType.Cellular4g]);
      types.push(['bluetooth', Protocol.Network.ConnectionType.Bluetooth]);
      types.push(['wifi', Protocol.Network.ConnectionType.Wifi]);
      types.push(['wimax', Protocol.Network.ConnectionType.Wimax]);
    }
    for (var type of types) {
      if (conditions.title.toLowerCase().indexOf(type[0]) !== -1)
        return type[1];
    }
    return Protocol.Network.ConnectionType.Other;
  }

  /**
   * @param {string} url
   * @return {!SDK.NetworkRequest}
   */
  inflightRequestForURL(url) {
    return this._dispatcher._inflightRequestsByURL[url];
  }

  /**
   * @param {!Common.Event} event
   */
  _cacheDisabledSettingChanged(event) {
    var enabled = /** @type {boolean} */ (event.data);
    this._networkAgent.setCacheDisabled(enabled);
  }

  /**
   * @override
   */
  dispose() {
    Common.moduleSetting('cacheDisabled').removeChangeListener(this._cacheDisabledSettingChanged, this);
  }

  _bypassServiceWorkerChanged() {
    this._networkAgent.setBypassServiceWorker(this._bypassServiceWorkerSetting.get());
  }
};

SDK.SDKModel.register(SDK.NetworkManager, SDK.Target.Capability.Network, true);

/** @enum {symbol} */
SDK.NetworkManager.Events = {
  RequestStarted: Symbol('RequestStarted'),
  RequestUpdated: Symbol('RequestUpdated'),
  RequestFinished: Symbol('RequestFinished'),
  RequestUpdateDropped: Symbol('RequestUpdateDropped'),
  ResponseReceived: Symbol('ResponseReceived'),
  MessageGenerated: Symbol('MessageGenerated'),
  RequestRedirected: Symbol('RequestRedirected'),
};

/** @typedef {{message: string, requestId: string, warning: boolean}} */
SDK.NetworkManager.Message;

SDK.NetworkManager._MIMETypes = {
  'text/html': {'document': true},
  'text/xml': {'document': true},
  'text/plain': {'document': true},
  'application/xhtml+xml': {'document': true},
  'image/svg+xml': {'document': true},
  'text/css': {'stylesheet': true},
  'text/xsl': {'stylesheet': true},
  'text/vtt': {'texttrack': true},
};

/**
 * @typedef {{
 *   download: number,
 *   upload: number,
 *   latency: number,
 *   title: string,
 * }}
 **/
SDK.NetworkManager.Conditions;

/** @type {!SDK.NetworkManager.Conditions} */
SDK.NetworkManager.NoThrottlingConditions = {
  title: Common.UIString('Online'),
  download: -1,
  upload: -1,
  latency: 0
};

/** @type {!SDK.NetworkManager.Conditions} */
SDK.NetworkManager.OfflineConditions = {
  title: Common.UIString('Offline'),
  download: 0,
  upload: 0,
  latency: 0,
};

/** @type {!SDK.NetworkManager.Conditions} */
SDK.NetworkManager.Slow3GConditions = {
  title: Common.UIString('Slow 3G'),
  download: 500 * 1024 / 8 * .8,
  upload: 500 * 1024 / 8 * .8,
  latency: 400 * 5,
};

/** @type {!SDK.NetworkManager.Conditions} */
SDK.NetworkManager.Fast3GConditions = {
  title: Common.UIString('Fast 3G'),
  download: 1.6 * 1024 * 1024 / 8 * .9,
  upload: 750 * 1024 / 8 * .9,
  latency: 150 * 3.75,
};

/** @typedef {{url: string, enabled: boolean}} */
SDK.NetworkManager.BlockedPattern;

SDK.NetworkManager._networkManagerForRequestSymbol = Symbol('NetworkManager');

/**
 * @implements {Protocol.NetworkDispatcher}
 * @unrestricted
 */
SDK.NetworkDispatcher = class {
  /**
   * @param {!SDK.NetworkManager} manager
   */
  constructor(manager) {
    this._manager = manager;
    /** @type {!Object<!Protocol.Network.RequestId, !SDK.NetworkRequest>} */
    this._inflightRequestsById = {};
    /** @type {!Object<string, !SDK.NetworkRequest>} */
    this._inflightRequestsByURL = {};
  }

  /**
   * @param {!Protocol.Network.Headers} headersMap
   * @return {!Array.<!SDK.NetworkRequest.NameValue>}
   */
  _headersMapToHeadersArray(headersMap) {
    var result = [];
    for (var name in headersMap) {
      var values = headersMap[name].split('\n');
      for (var i = 0; i < values.length; ++i)
        result.push({name: name, value: values[i]});
    }
    return result;
  }

  /**
   * @param {!SDK.NetworkRequest} networkRequest
   * @param {!Protocol.Network.Request} request
   */
  _updateNetworkRequestWithRequest(networkRequest, request) {
    networkRequest.requestMethod = request.method;
    networkRequest.setRequestHeaders(this._headersMapToHeadersArray(request.headers));
    networkRequest.requestFormData = request.postData;
    networkRequest.setInitialPriority(request.initialPriority);
    networkRequest.mixedContentType = request.mixedContentType || Protocol.Security.MixedContentType.None;
    networkRequest.setReferrerPolicy(request.referrerPolicy);
  }

  /**
   * @param {!SDK.NetworkRequest} networkRequest
   * @param {!Protocol.Network.Response=} response
   */
  _updateNetworkRequestWithResponse(networkRequest, response) {
    if (response.url && networkRequest.url() !== response.url)
      networkRequest.setUrl(response.url);
    networkRequest.mimeType = response.mimeType;
    networkRequest.statusCode = response.status;
    networkRequest.statusText = response.statusText;
    networkRequest.responseHeaders = this._headersMapToHeadersArray(response.headers);
    if (response.encodedDataLength >= 0)
      networkRequest.setTransferSize(response.encodedDataLength);
    if (response.headersText)
      networkRequest.responseHeadersText = response.headersText;
    if (response.requestHeaders) {
      networkRequest.setRequestHeaders(this._headersMapToHeadersArray(response.requestHeaders));
      networkRequest.setRequestHeadersText(response.requestHeadersText || '');
    }

    networkRequest.connectionReused = response.connectionReused;
    networkRequest.connectionId = String(response.connectionId);
    if (response.remoteIPAddress)
      networkRequest.setRemoteAddress(response.remoteIPAddress, response.remotePort || -1);

    if (response.fromServiceWorker)
      networkRequest.fetchedViaServiceWorker = true;

    if (response.fromDiskCache)
      networkRequest.setFromDiskCache();
    networkRequest.timing = response.timing;

    networkRequest.protocol = response.protocol;

    networkRequest.setSecurityState(response.securityState);

    if (!this._mimeTypeIsConsistentWithType(networkRequest)) {
      var message = Common.UIString(
          'Resource interpreted as %s but transferred with MIME type %s: "%s".', networkRequest.resourceType().title(),
          networkRequest.mimeType, networkRequest.url());
      this._manager.dispatchEventToListeners(
          SDK.NetworkManager.Events.MessageGenerated,
          {message: message, requestId: networkRequest.requestId(), warning: true});
    }

    if (response.securityDetails)
      networkRequest.setSecurityDetails(response.securityDetails);
  }

  /**
   * @param {!SDK.NetworkRequest} networkRequest
   * @return {boolean}
   */
  _mimeTypeIsConsistentWithType(networkRequest) {
    // If status is an error, content is likely to be of an inconsistent type,
    // as it's going to be an error message. We do not want to emit a warning
    // for this, though, as this will already be reported as resource loading failure.
    // Also, if a URL like http://localhost/wiki/load.php?debug=true&lang=en produces text/css and gets reloaded,
    // it is 304 Not Modified and its guessed mime-type is text/php, which is wrong.
    // Don't check for mime-types in 304-resources.
    if (networkRequest.hasErrorStatusCode() || networkRequest.statusCode === 304 || networkRequest.statusCode === 204)
      return true;

    var resourceType = networkRequest.resourceType();
    if (resourceType !== Common.resourceTypes.Stylesheet && resourceType !== Common.resourceTypes.Document &&
        resourceType !== Common.resourceTypes.TextTrack)
      return true;


    if (!networkRequest.mimeType)
      return true;  // Might be not known for cached resources with null responses.

    if (networkRequest.mimeType in SDK.NetworkManager._MIMETypes)
      return resourceType.name() in SDK.NetworkManager._MIMETypes[networkRequest.mimeType];

    return false;
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.ResourcePriority} newPriority
   * @param {!Protocol.Network.MonotonicTime} timestamp
   */
  resourceChangedPriority(requestId, newPriority, timestamp) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (networkRequest)
      networkRequest.setPriority(newPriority);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.LoaderId} loaderId
   * @param {string} documentURL
   * @param {!Protocol.Network.Request} request
   * @param {!Protocol.Network.MonotonicTime} time
   * @param {!Protocol.Network.TimeSinceEpoch} wallTime
   * @param {!Protocol.Network.Initiator} initiator
   * @param {!Protocol.Network.Response=} redirectResponse
   * @param {!Protocol.Page.ResourceType=} resourceType
   * @param {!Protocol.Page.FrameId=} frameId
   */
  requestWillBeSent(
      requestId, loaderId, documentURL, request, time, wallTime, initiator, redirectResponse, resourceType, frameId) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (networkRequest) {
      // FIXME: move this check to the backend.
      if (!redirectResponse)
        return;
      this.responseReceived(requestId, loaderId, time, Protocol.Page.ResourceType.Other, redirectResponse, frameId);
      networkRequest = this._appendRedirect(requestId, time, request.url);
      this._manager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestRedirected, networkRequest);
    } else {
      networkRequest =
          this._createNetworkRequest(requestId, frameId || '', loaderId, request.url, documentURL, initiator);
    }
    networkRequest.hasNetworkData = true;
    this._updateNetworkRequestWithRequest(networkRequest, request);
    networkRequest.setIssueTime(time, wallTime);
    networkRequest.setResourceType(
        resourceType ? Common.resourceTypes[resourceType] : Protocol.Page.ResourceType.Other);

    this._startNetworkRequest(networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   */
  requestServedFromCache(requestId) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;

    networkRequest.setFromMemoryCache();
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.LoaderId} loaderId
   * @param {!Protocol.Network.MonotonicTime} time
   * @param {!Protocol.Page.ResourceType} resourceType
   * @param {!Protocol.Network.Response} response
   * @param {!Protocol.Page.FrameId=} frameId
   */
  responseReceived(requestId, loaderId, time, resourceType, response, frameId) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest) {
      // We missed the requestWillBeSent.
      var eventData = {};
      eventData.url = response.url;
      eventData.frameId = frameId || '';
      eventData.loaderId = loaderId;
      eventData.resourceType = resourceType;
      eventData.mimeType = response.mimeType;
      var lastModifiedHeader = response.headers['last-modified'];
      eventData.lastModified = lastModifiedHeader ? new Date(lastModifiedHeader) : null;
      this._manager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestUpdateDropped, eventData);
      return;
    }

    networkRequest.responseReceivedTime = time;
    networkRequest.setResourceType(Common.resourceTypes[resourceType]);

    // net::ParsedCookie::kMaxCookieSize = 4096 (net/cookies/parsed_cookie.h)
    if ('Set-Cookie' in response.headers && response.headers['Set-Cookie'].length > 4096) {
      var message = Common.UIString(
          'Set-Cookie header is ignored in response from url: %s. Cookie length should be less than or equal to 4096 characters.',
          response.url);
      this._manager.dispatchEventToListeners(
          SDK.NetworkManager.Events.MessageGenerated, {message: message, requestId: requestId, warning: true});
    }

    this._updateNetworkRequestWithResponse(networkRequest, response);

    this._updateNetworkRequest(networkRequest);
    this._manager.dispatchEventToListeners(SDK.NetworkManager.Events.ResponseReceived, networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} time
   * @param {number} dataLength
   * @param {number} encodedDataLength
   */
  dataReceived(requestId, time, dataLength, encodedDataLength) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;

    networkRequest.resourceSize += dataLength;
    if (encodedDataLength !== -1)
      networkRequest.increaseTransferSize(encodedDataLength);
    networkRequest.endTime = time;

    this._updateNetworkRequest(networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} finishTime
   * @param {number} encodedDataLength
   */
  loadingFinished(requestId, finishTime, encodedDataLength) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;
    this._finishNetworkRequest(networkRequest, finishTime, encodedDataLength);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} time
   * @param {!Protocol.Page.ResourceType} resourceType
   * @param {string} localizedDescription
   * @param {boolean=} canceled
   * @param {!Protocol.Network.BlockedReason=} blockedReason
   */
  loadingFailed(requestId, time, resourceType, localizedDescription, canceled, blockedReason) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;

    networkRequest.failed = true;
    networkRequest.setResourceType(Common.resourceTypes[resourceType]);
    networkRequest.canceled = !!canceled;
    if (blockedReason) {
      networkRequest.setBlockedReason(blockedReason);
      if (blockedReason === Protocol.Network.BlockedReason.Inspector) {
        var message = Common.UIString('Request was blocked by DevTools: "%s".', networkRequest.url());
        this._manager.dispatchEventToListeners(
            SDK.NetworkManager.Events.MessageGenerated, {message: message, requestId: requestId, warning: true});
      }
    }
    networkRequest.localizedFailDescription = localizedDescription;
    this._finishNetworkRequest(networkRequest, time, -1);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {string} requestURL
   * @param {!Protocol.Network.Initiator=} initiator
   */
  webSocketCreated(requestId, requestURL, initiator) {
    var networkRequest = new SDK.NetworkRequest(requestId, requestURL, '', '', '', initiator || null);
    networkRequest[SDK.NetworkManager._networkManagerForRequestSymbol] = this._manager;
    networkRequest.setResourceType(Common.resourceTypes.WebSocket);
    this._startNetworkRequest(networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} time
   * @param {!Protocol.Network.TimeSinceEpoch} wallTime
   * @param {!Protocol.Network.WebSocketRequest} request
   */
  webSocketWillSendHandshakeRequest(requestId, time, wallTime, request) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;

    networkRequest.requestMethod = 'GET';
    networkRequest.setRequestHeaders(this._headersMapToHeadersArray(request.headers));
    networkRequest.setIssueTime(time, wallTime);

    this._updateNetworkRequest(networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} time
   * @param {!Protocol.Network.WebSocketResponse} response
   */
  webSocketHandshakeResponseReceived(requestId, time, response) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;

    networkRequest.statusCode = response.status;
    networkRequest.statusText = response.statusText;
    networkRequest.responseHeaders = this._headersMapToHeadersArray(response.headers);
    networkRequest.responseHeadersText = response.headersText || '';
    if (response.requestHeaders)
      networkRequest.setRequestHeaders(this._headersMapToHeadersArray(response.requestHeaders));
    if (response.requestHeadersText)
      networkRequest.setRequestHeadersText(response.requestHeadersText);
    networkRequest.responseReceivedTime = time;
    networkRequest.protocol = 'websocket';

    this._updateNetworkRequest(networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} time
   * @param {!Protocol.Network.WebSocketFrame} response
   */
  webSocketFrameReceived(requestId, time, response) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;

    networkRequest.addFrame(response, time, false);
    networkRequest.responseReceivedTime = time;

    this._updateNetworkRequest(networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} time
   * @param {!Protocol.Network.WebSocketFrame} response
   */
  webSocketFrameSent(requestId, time, response) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;

    networkRequest.addFrame(response, time, true);
    networkRequest.responseReceivedTime = time;

    this._updateNetworkRequest(networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} time
   * @param {string} errorMessage
   */
  webSocketFrameError(requestId, time, errorMessage) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;

    networkRequest.addFrameError(errorMessage, time);
    networkRequest.responseReceivedTime = time;

    this._updateNetworkRequest(networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} time
   */
  webSocketClosed(requestId, time) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;
    this._finishNetworkRequest(networkRequest, time, -1);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} time
   * @param {string} eventName
   * @param {string} eventId
   * @param {string} data
   */
  eventSourceMessageReceived(requestId, time, eventName, eventId, data) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;
    networkRequest.addEventSourceMessage(time, eventName, eventId, data);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.Request} request
   * @param {string} resourceType
   * @param {boolean} isNavigationRequest
   * @param {!Protocol.Network.Headers=} redirectHeaders
   * @param {number=} redirectStatusCode
   * @param {string=} redirectUrl
   */
  requestIntercepted(
      requestId, request, resourceType, isNavigationRequest, redirectHeaders, redirectStatusCode, redirectUrl) {
    // Stub implementation.  Event not currently used by the frontend.
  }

  /**
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} time
   * @param {string} redirectURL
   * @return {!SDK.NetworkRequest}
   */
  _appendRedirect(requestId, time, redirectURL) {
    var originalNetworkRequest = this._inflightRequestsById[requestId];
    var redirectCount = 0;
    for (var redirect = originalNetworkRequest.redirectSource(); redirect; redirect = redirect.redirectSource())
      redirectCount++;

    originalNetworkRequest.setRequestId(requestId + ':redirected.' + redirectCount);
    this._finishNetworkRequest(originalNetworkRequest, time, -1);
    var newNetworkRequest = this._createNetworkRequest(
        requestId, originalNetworkRequest.frameId, originalNetworkRequest.loaderId, redirectURL,
        originalNetworkRequest.documentURL, originalNetworkRequest.initiator());
    newNetworkRequest.setRedirectSource(originalNetworkRequest);
    return newNetworkRequest;
  }

  /**
   * @param {!SDK.NetworkRequest} networkRequest
   */
  _startNetworkRequest(networkRequest) {
    this._inflightRequestsById[networkRequest.requestId()] = networkRequest;
    this._inflightRequestsByURL[networkRequest.url()] = networkRequest;
    this._manager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestStarted, networkRequest);
  }

  /**
   * @param {!SDK.NetworkRequest} networkRequest
   */
  _updateNetworkRequest(networkRequest) {
    this._manager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestUpdated, networkRequest);
  }

  /**
   * @param {!SDK.NetworkRequest} networkRequest
   * @param {!Protocol.Network.MonotonicTime} finishTime
   * @param {number} encodedDataLength
   */
  _finishNetworkRequest(networkRequest, finishTime, encodedDataLength) {
    networkRequest.endTime = finishTime;
    networkRequest.finished = true;
    if (encodedDataLength >= 0)
      networkRequest.setTransferSize(encodedDataLength);
    this._manager.dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, networkRequest);
    delete this._inflightRequestsById[networkRequest.requestId()];
    delete this._inflightRequestsByURL[networkRequest.url()];

    if (Common.moduleSetting('monitoringXHREnabled').get() &&
        networkRequest.resourceType().category() === Common.resourceCategories.XHR) {
      var message = Common.UIString(
          (networkRequest.failed || networkRequest.hasErrorStatusCode()) ? '%s failed loading: %s "%s".' :
                                                                           '%s finished loading: %s "%s".',
          networkRequest.resourceType().title(), networkRequest.requestMethod, networkRequest.url());
      this._manager.dispatchEventToListeners(
          SDK.NetworkManager.Events.MessageGenerated,
          {message: message, requestId: networkRequest.requestId(), warning: false});
    }
  }

  /**
   * @param {!Protocol.Network.RequestId} requestId
   * @param {string} frameId
   * @param {!Protocol.Network.LoaderId} loaderId
   * @param {string} url
   * @param {string} documentURL
   * @param {?Protocol.Network.Initiator} initiator
   */
  _createNetworkRequest(requestId, frameId, loaderId, url, documentURL, initiator) {
    var request = new SDK.NetworkRequest(requestId, url, documentURL, frameId, loaderId, initiator);
    request[SDK.NetworkManager._networkManagerForRequestSymbol] = this._manager;
    return request;
  }
};

/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
SDK.MultitargetNetworkManager = class extends Common.Object {
  constructor() {
    super();
    this._userAgentOverride = '';
    /** @type {!Set<!Protocol.NetworkAgent>} */
    this._agents = new Set();
    /** @type {!SDK.NetworkManager.Conditions} */
    this._networkConditions = SDK.NetworkManager.NoThrottlingConditions;

    this._blockingEnabledSetting = Common.moduleSetting('requestBlockingEnabled');
    this._blockedPatternsSetting = Common.settings.createSetting('networkBlockedPatterns', []);
    this._effectiveBlockedURLs = [];
    this._updateBlockedPatterns();

    SDK.targetManager.observeTargets(this, SDK.Target.Capability.Network);
  }

  /**
   * @param {string} uaString
   * @return {string}
   */
  static patchUserAgentWithChromeVersion(uaString) {
    // Patches Chrome/CriOS version from user agent ("1.2.3.4" when user agent is: "Chrome/1.2.3.4").
    var chromeRegex = new RegExp('(?:^|\\W)Chrome/(\\S+)');
    var chromeMatch = navigator.userAgent.match(chromeRegex);
    if (chromeMatch && chromeMatch.length > 1)
      return String.sprintf(uaString, chromeMatch[1]);
    return uaString;
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    var networkAgent = target.networkAgent();
    if (this._extraHeaders)
      networkAgent.setExtraHTTPHeaders(this._extraHeaders);
    if (this._currentUserAgent())
      networkAgent.setUserAgentOverride(this._currentUserAgent());
    if (this._effectiveBlockedURLs.length)
      networkAgent.setBlockedURLs(this._effectiveBlockedURLs);
    this._agents.add(networkAgent);
    if (this.isThrottling())
      this._updateNetworkConditions(networkAgent);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    this._agents.delete(target.networkAgent());
  }

  /**
   * @return {boolean}
   */
  isThrottling() {
    return this._networkConditions.download >= 0 || this._networkConditions.upload >= 0 ||
        this._networkConditions.latency > 0;
  }

  /**
   * @return {boolean}
   */
  isOffline() {
    return !this._networkConditions.download && !this._networkConditions.upload;
  }

  /**
   * @param {!SDK.NetworkManager.Conditions} conditions
   */
  setNetworkConditions(conditions) {
    this._networkConditions = conditions;
    for (var agent of this._agents)
      this._updateNetworkConditions(agent);
    this.dispatchEventToListeners(SDK.MultitargetNetworkManager.Events.ConditionsChanged);
  }

  /**
   * @return {!SDK.NetworkManager.Conditions}
   */
  networkConditions() {
    return this._networkConditions;
  }

  /**
   * @param {!Protocol.NetworkAgent} networkAgent
   */
  _updateNetworkConditions(networkAgent) {
    var conditions = this._networkConditions;
    if (!this.isThrottling()) {
      networkAgent.emulateNetworkConditions(false, 0, 0, 0);
    } else {
      networkAgent.emulateNetworkConditions(
          this.isOffline(), conditions.latency, conditions.download < 0 ? 0 : conditions.download,
          conditions.upload < 0 ? 0 : conditions.upload, SDK.NetworkManager._connectionType(conditions));
    }
  }

  /**
   * @param {!Protocol.Network.Headers} headers
   */
  setExtraHTTPHeaders(headers) {
    this._extraHeaders = headers;
    for (var agent of this._agents)
      agent.setExtraHTTPHeaders(this._extraHeaders);
  }

  /**
   * @return {string}
   */
  _currentUserAgent() {
    return this._customUserAgent ? this._customUserAgent : this._userAgentOverride;
  }

  _updateUserAgentOverride() {
    var userAgent = this._currentUserAgent();
    for (var agent of this._agents)
      agent.setUserAgentOverride(userAgent);
  }

  /**
   * @param {string} userAgent
   */
  setUserAgentOverride(userAgent) {
    if (this._userAgentOverride === userAgent)
      return;
    this._userAgentOverride = userAgent;
    if (!this._customUserAgent)
      this._updateUserAgentOverride();
    this.dispatchEventToListeners(SDK.MultitargetNetworkManager.Events.UserAgentChanged);
  }

  /**
   * @return {string}
   */
  userAgentOverride() {
    return this._userAgentOverride;
  }

  /**
   * @param {string} userAgent
   */
  setCustomUserAgentOverride(userAgent) {
    this._customUserAgent = userAgent;
    this._updateUserAgentOverride();
  }

  /**
   * @return {!Array<!SDK.NetworkManager.BlockedPattern>}
   */
  blockedPatterns() {
    return this._blockedPatternsSetting.get().slice();
  }

  /**
   * @return {boolean}
   */
  blockingEnabled() {
    return this._blockingEnabledSetting.get();
  }

  /**
   * @return {boolean}
   */
  isBlocking() {
    return !!this._effectiveBlockedURLs.length;
  }

  /**
   * @param {!Array<!SDK.NetworkManager.BlockedPattern>} patterns
   */
  setBlockedPatterns(patterns) {
    this._blockedPatternsSetting.set(patterns);
    this._updateBlockedPatterns();
    this.dispatchEventToListeners(SDK.MultitargetNetworkManager.Events.BlockedPatternsChanged);
  }

  /**
   * @param {boolean} enabled
   */
  setBlockingEnabled(enabled) {
    if (this._blockingEnabledSetting.get() === enabled)
      return;
    this._blockingEnabledSetting.set(enabled);
    this._updateBlockedPatterns();
    this.dispatchEventToListeners(SDK.MultitargetNetworkManager.Events.BlockedPatternsChanged);
  }

  _updateBlockedPatterns() {
    var urls = [];
    if (this._blockingEnabledSetting.get()) {
      for (var pattern of this._blockedPatternsSetting.get()) {
        if (pattern.enabled)
          urls.push(pattern.url);
      }
    }

    if (!urls.length && !this._effectiveBlockedURLs.length)
      return;
    this._effectiveBlockedURLs = urls;
    for (var agent of this._agents)
      agent.setBlockedURLs(this._effectiveBlockedURLs);
  }

  clearBrowserCache() {
    for (var agent of this._agents)
      agent.clearBrowserCache();
  }

  clearBrowserCookies() {
    for (var agent of this._agents)
      agent.clearBrowserCookies();
  }

  /**
   * @param {string} origin
   * @return {!Promise<!Array<string>>}
   */
  getCertificate(origin) {
    var target = SDK.targetManager.mainTarget();
    return target.networkAgent().getCertificate(origin).then(certificate => certificate || []);
  }

  /**
   * @param {string} url
   * @param {function(number, !Object.<string, string>, string)} callback
   */
  loadResource(url, callback) {
    var headers = {};

    var currentUserAgent = this._currentUserAgent();
    if (currentUserAgent)
      headers['User-Agent'] = currentUserAgent;

    if (Common.moduleSetting('cacheDisabled').get())
      headers['Cache-Control'] = 'no-cache';

    Host.ResourceLoader.load(url, headers, callback);
  }
};

/** @enum {symbol} */
SDK.MultitargetNetworkManager.Events = {
  BlockedPatternsChanged: Symbol('BlockedPatternsChanged'),
  ConditionsChanged: Symbol('ConditionsChanged'),
  UserAgentChanged: Symbol('UserAgentChanged')
};

/**
 * @type {!SDK.MultitargetNetworkManager}
 */
SDK.multitargetNetworkManager;

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
    if (Common.moduleSetting('monitoringXHREnabled').get())
      this._networkAgent.setMonitoringXHREnabled(true);

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
   * @param {!SDK.Target} target
   * @return {?SDK.NetworkManager}
   */
  static fromTarget(target) {
    return target.model(SDK.NetworkManager);
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

SDK.SDKModel.register(SDK.NetworkManager, SDK.Target.Capability.Network);

/** @enum {symbol} */
SDK.NetworkManager.Events = {
  RequestStarted: Symbol('RequestStarted'),
  RequestUpdated: Symbol('RequestUpdated'),
  RequestFinished: Symbol('RequestFinished'),
  RequestUpdateDropped: Symbol('RequestUpdateDropped'),
  ResponseReceived: Symbol('ResponseReceived')
};

/** @implements {Common.Emittable} */
SDK.NetworkManager.RequestRedirectEvent = class {
  /**
   * @param {!SDK.NetworkRequest} request
   */
  constructor(request) {
    this.request = request;
  }
};

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


/** @typedef {{download: number, upload: number, latency: number, title: string}} */
SDK.NetworkManager.Conditions;
/** @type {!SDK.NetworkManager.Conditions} */
SDK.NetworkManager.NoThrottlingConditions = {
  title: Common.UIString('No throttling'),
  download: -1,
  upload: -1,
  latency: 0
};
/** @type {!SDK.NetworkManager.Conditions} */
SDK.NetworkManager.OfflineConditions = {
  title: Common.UIString('Offline'),
  download: 0,
  upload: 0,
  latency: 0
};


/**
 * @implements {Protocol.NetworkDispatcher}
 * @unrestricted
 */
SDK.NetworkDispatcher = class {
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
    networkRequest.mixedContentType = request.mixedContentType || Protocol.Network.RequestMixedContentType.None;
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
      var consoleModel = this._manager.target().model(SDK.ConsoleModel);
      consoleModel.addMessage(new SDK.ConsoleMessage(
          consoleModel.target(), SDK.ConsoleMessage.MessageSource.Network, SDK.ConsoleMessage.MessageLevel.Info,
          Common.UIString(
              'Resource interpreted as %s but transferred with MIME type %s: "%s".',
              networkRequest.resourceType().title(), networkRequest.mimeType, networkRequest.url()),
          undefined, undefined, undefined, undefined, networkRequest.requestId()));
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
   * @param {!Protocol.Network.Timestamp} timestamp
   */
  resourceChangedPriority(requestId, newPriority, timestamp) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (networkRequest)
      networkRequest.setPriority(newPriority);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Page.FrameId} frameId
   * @param {!Protocol.Network.LoaderId} loaderId
   * @param {string} documentURL
   * @param {!Protocol.Network.Request} request
   * @param {!Protocol.Network.Timestamp} time
   * @param {!Protocol.Network.Timestamp} wallTime
   * @param {!Protocol.Network.Initiator} initiator
   * @param {!Protocol.Network.Response=} redirectResponse
   * @param {!Protocol.Page.ResourceType=} resourceType
   */
  requestWillBeSent(
      requestId,
      frameId,
      loaderId,
      documentURL,
      request,
      time,
      wallTime,
      initiator,
      redirectResponse,
      resourceType) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (networkRequest) {
      // FIXME: move this check to the backend.
      if (!redirectResponse)
        return;
      this.responseReceived(requestId, frameId, loaderId, time, Protocol.Page.ResourceType.Other, redirectResponse);
      networkRequest = this._appendRedirect(requestId, time, request.url);
      this._manager.emit(new SDK.NetworkManager.RequestRedirectEvent(networkRequest));
    } else {
      networkRequest = this._createNetworkRequest(requestId, frameId, loaderId, request.url, documentURL, initiator);
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
   * @param {!Protocol.Page.FrameId} frameId
   * @param {!Protocol.Network.LoaderId} loaderId
   * @param {!Protocol.Network.Timestamp} time
   * @param {!Protocol.Page.ResourceType} resourceType
   * @param {!Protocol.Network.Response} response
   */
  responseReceived(requestId, frameId, loaderId, time, resourceType, response) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest) {
      // We missed the requestWillBeSent.
      var eventData = {};
      eventData.url = response.url;
      eventData.frameId = frameId;
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
      var consoleModel = this._manager.target().model(SDK.ConsoleModel);
      consoleModel.addMessage(
          new SDK.ConsoleMessage(
              consoleModel.target(), SDK.ConsoleMessage.MessageSource.Network, SDK.ConsoleMessage.MessageLevel.Warning,
              Common.UIString(
                  'Set-Cookie header is ignored in response from url: %s. Cookie length should be less than or equal to 4096 characters.',
                  response.url)),
          undefined, undefined, undefined, undefined, requestId);
    }

    this._updateNetworkRequestWithResponse(networkRequest, response);

    this._updateNetworkRequest(networkRequest);
    this._manager.dispatchEventToListeners(SDK.NetworkManager.Events.ResponseReceived, networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.Timestamp} time
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
   * @param {!Protocol.Network.Timestamp} finishTime
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
   * @param {!Protocol.Network.Timestamp} time
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
        var consoleModel = this._manager.target().model(SDK.ConsoleModel);
        consoleModel.addMessage(new SDK.ConsoleMessage(
            consoleModel.target(), SDK.ConsoleMessage.MessageSource.Network, SDK.ConsoleMessage.MessageLevel.Warning,
            Common.UIString('Request was blocked by DevTools: "%s".', networkRequest.url()), undefined, undefined,
            undefined, undefined, requestId));
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
    var networkRequest =
        new SDK.NetworkRequest(this._manager.target(), requestId, requestURL, '', '', '', initiator || null);
    networkRequest.setResourceType(Common.resourceTypes.WebSocket);
    this._startNetworkRequest(networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.Timestamp} time
   * @param {!Protocol.Network.Timestamp} wallTime
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
   * @param {!Protocol.Network.Timestamp} time
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
   * @param {!Protocol.Network.Timestamp} time
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
   * @param {!Protocol.Network.Timestamp} time
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
   * @param {!Protocol.Network.Timestamp} time
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
   * @param {!Protocol.Network.Timestamp} time
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
   * @param {!Protocol.Network.Timestamp} time
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
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.Timestamp} time
   * @param {string} redirectURL
   * @return {!SDK.NetworkRequest}
   */
  _appendRedirect(requestId, time, redirectURL) {
    var originalNetworkRequest = this._inflightRequestsById[requestId];
    var previousRedirects = originalNetworkRequest.redirects || [];
    originalNetworkRequest.setRequestId(requestId + ':redirected.' + previousRedirects.length);
    delete originalNetworkRequest.redirects;
    if (previousRedirects.length > 0)
      originalNetworkRequest.redirectSource = previousRedirects[previousRedirects.length - 1];
    this._finishNetworkRequest(originalNetworkRequest, time, -1);
    var newNetworkRequest = this._createNetworkRequest(
        requestId, originalNetworkRequest.frameId, originalNetworkRequest.loaderId, redirectURL,
        originalNetworkRequest.documentURL, originalNetworkRequest.initiator());
    newNetworkRequest.redirects = previousRedirects.concat(originalNetworkRequest);
    return newNetworkRequest;
  }

  /**
   * @param {!SDK.NetworkRequest} networkRequest
   */
  _startNetworkRequest(networkRequest) {
    this._inflightRequestsById[networkRequest.requestId()] = networkRequest;
    this._inflightRequestsByURL[networkRequest.url()] = networkRequest;
    this._dispatchEventToListeners(SDK.NetworkManager.Events.RequestStarted, networkRequest);
  }

  /**
   * @param {!SDK.NetworkRequest} networkRequest
   */
  _updateNetworkRequest(networkRequest) {
    this._dispatchEventToListeners(SDK.NetworkManager.Events.RequestUpdated, networkRequest);
  }

  /**
   * @param {!SDK.NetworkRequest} networkRequest
   * @param {!Protocol.Network.Timestamp} finishTime
   * @param {number} encodedDataLength
   */
  _finishNetworkRequest(networkRequest, finishTime, encodedDataLength) {
    networkRequest.endTime = finishTime;
    networkRequest.finished = true;
    if (encodedDataLength >= 0)
      networkRequest.setTransferSize(encodedDataLength);
    this._dispatchEventToListeners(SDK.NetworkManager.Events.RequestFinished, networkRequest);
    delete this._inflightRequestsById[networkRequest.requestId()];
    delete this._inflightRequestsByURL[networkRequest.url()];
  }

  /**
   * @param {string} eventType
   * @param {!SDK.NetworkRequest} networkRequest
   */
  _dispatchEventToListeners(eventType, networkRequest) {
    this._manager.dispatchEventToListeners(eventType, networkRequest);
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
    return new SDK.NetworkRequest(this._manager.target(), requestId, url, documentURL, frameId, loaderId, initiator);
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

    this._agentsHaveBlockedURLs = false;
    this._blockedEnabledSetting = Common.moduleSetting('requestBlockingEnabled');
    this._blockedEnabledSetting.addChangeListener(this._updateBlockedURLs, this);
    this._blockedURLsSetting = Common.moduleSetting('networkBlockedURLs');
    this._blockedURLsSetting.addChangeListener(this._updateBlockedURLs, this);
    this._updateBlockedURLs();

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
    if (this._blockedEnabledSetting.get())
      networkAgent.setBlockedURLs(this._blockedURLsSetting.get());
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
    Host.ResourceLoader.targetUserAgent = userAgent;
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

  _updateBlockedURLs() {
    var urls = /** @type {!Array<string>} */ ([]);
    if (this._blockedEnabledSetting.get())
      urls = this._blockedURLsSetting.get();
    if (!urls.length && !this._agentsHaveBlockedURLs)
      return;
    this._agentsHaveBlockedURLs = !!urls.length;
    for (var agent of this._agents)
      agent.setBlockedURLs(urls);
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
   * @param {function(!Array<string>)} callback
   */
  getCertificate(origin, callback) {
    var target = SDK.targetManager.mainTarget();
    target.networkAgent().getCertificate(origin, mycallback);

    /**
     * @param {?Protocol.Error} error
     * @param {!Array<string>} certificate
     */
    function mycallback(error, certificate) {
      callback(error ? [] : certificate);
    }
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
  ConditionsChanged: Symbol('ConditionsChanged'),
  UserAgentChanged: Symbol('UserAgentChanged')
};

/**
 * @type {!SDK.MultitargetNetworkManager}
 */
SDK.multitargetNetworkManager;

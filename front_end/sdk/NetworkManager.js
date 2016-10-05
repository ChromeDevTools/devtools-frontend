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
 * @constructor
 * @extends {WebInspector.SDKModel}
 * @param {!WebInspector.Target} target
 */
WebInspector.NetworkManager = function(target) {
  WebInspector.SDKModel.call(this, WebInspector.NetworkManager, target);
  this._dispatcher = new WebInspector.NetworkDispatcher(this);
  this._target = target;
  this._networkAgent = target.networkAgent();
  target.registerNetworkDispatcher(this._dispatcher);
  if (WebInspector.moduleSetting('cacheDisabled').get())
    this._networkAgent.setCacheDisabled(true);
  if (WebInspector.moduleSetting('monitoringXHREnabled').get())
    this._networkAgent.setMonitoringXHREnabled(true);

  // Limit buffer when talking to a remote device.
  if (Runtime.queryParam('remoteFrontend') || Runtime.queryParam('ws'))
    this._networkAgent.enable(10000000, 5000000);
  else
    this._networkAgent.enable();

  this._bypassServiceWorkerSetting =
      WebInspector.settings.createSetting('bypassServiceWorker', false);
  if (this._bypassServiceWorkerSetting.get())
    this._bypassServiceWorkerChanged();
  this._bypassServiceWorkerSetting.addChangeListener(this._bypassServiceWorkerChanged, this);

  WebInspector.moduleSetting('cacheDisabled')
      .addChangeListener(this._cacheDisabledSettingChanged, this);
};

/** @enum {symbol} */
WebInspector.NetworkManager.Events = {
  RequestStarted: Symbol('RequestStarted'),
  RequestUpdated: Symbol('RequestUpdated'),
  RequestFinished: Symbol('RequestFinished'),
  RequestUpdateDropped: Symbol('RequestUpdateDropped'),
  ResponseReceived: Symbol('ResponseReceived')
};

WebInspector.NetworkManager._MIMETypes = {
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
 * @param {!WebInspector.Target} target
 * @return {?WebInspector.NetworkManager}
 */
WebInspector.NetworkManager.fromTarget = function(target) {
  return /** @type {?WebInspector.NetworkManager} */ (target.model(WebInspector.NetworkManager));
};

/** @typedef {{download: number, upload: number, latency: number, title: string}} */
WebInspector.NetworkManager.Conditions;
/** @type {!WebInspector.NetworkManager.Conditions} */
WebInspector.NetworkManager.NoThrottlingConditions = {
  title: WebInspector.UIString('No throttling'),
  download: -1,
  upload: -1,
  latency: 0
};
/** @type {!WebInspector.NetworkManager.Conditions} */
WebInspector.NetworkManager.OfflineConditions = {
  title: WebInspector.UIString('Offline'),
  download: 0,
  upload: 0,
  latency: 0
};

/**
 * @param {!WebInspector.NetworkManager.Conditions} conditions
 * @return {!NetworkAgent.ConnectionType}
 * TODO(allada): this belongs to NetworkConditionsSelector, which should hardcode/guess it.
 */
WebInspector.NetworkManager._connectionType = function(conditions) {
  if (!conditions.download && !conditions.upload)
    return NetworkAgent.ConnectionType.None;
  var types = WebInspector.NetworkManager._connectionTypes;
  if (!types) {
    WebInspector.NetworkManager._connectionTypes = [];
    types = WebInspector.NetworkManager._connectionTypes;
    types.push(['2g', NetworkAgent.ConnectionType.Cellular2g]);
    types.push(['3g', NetworkAgent.ConnectionType.Cellular3g]);
    types.push(['4g', NetworkAgent.ConnectionType.Cellular4g]);
    types.push(['bluetooth', NetworkAgent.ConnectionType.Bluetooth]);
    types.push(['wifi', NetworkAgent.ConnectionType.Wifi]);
    types.push(['wimax', NetworkAgent.ConnectionType.Wimax]);
  }
  for (var type of types) {
    if (conditions.title.toLowerCase().indexOf(type[0]) !== -1)
      return type[1];
  }
  return NetworkAgent.ConnectionType.Other;
};

WebInspector.NetworkManager.prototype = {
  /**
     * @param {string} url
     * @return {!WebInspector.NetworkRequest}
     */
  inflightRequestForURL: function(url) { return this._dispatcher._inflightRequestsByURL[url]; },

  /**
   * @param {!WebInspector.Event} event
   */
  _cacheDisabledSettingChanged: function(event) {
    var enabled = /** @type {boolean} */ (event.data);
    this._networkAgent.setCacheDisabled(enabled);
  },

  dispose: function() {
    WebInspector.moduleSetting('cacheDisabled')
        .removeChangeListener(this._cacheDisabledSettingChanged, this);
  },

  /**
     * @return {!WebInspector.Setting}
     */
  bypassServiceWorkerSetting: function() { return this._bypassServiceWorkerSetting; },

  _bypassServiceWorkerChanged: function() {
    this._networkAgent.setBypassServiceWorker(this._bypassServiceWorkerSetting.get());
  },

  __proto__: WebInspector.SDKModel.prototype
};

/**
 * @constructor
 * @implements {NetworkAgent.Dispatcher}
 */
WebInspector.NetworkDispatcher = function(manager) {
  this._manager = manager;
  this._inflightRequestsById = {};
  this._inflightRequestsByURL = {};
};

WebInspector.NetworkDispatcher.prototype = {
  /**
     * @param {!NetworkAgent.Headers} headersMap
     * @return {!Array.<!WebInspector.NetworkRequest.NameValue>}
     */
  _headersMapToHeadersArray: function(headersMap) {
    var result = [];
    for (var name in headersMap) {
      var values = headersMap[name].split('\n');
      for (var i = 0; i < values.length; ++i)
        result.push({name: name, value: values[i]});
    }
    return result;
  },

  /**
   * @param {!WebInspector.NetworkRequest} networkRequest
   * @param {!NetworkAgent.Request} request
   */
  _updateNetworkRequestWithRequest: function(networkRequest, request) {
    networkRequest.requestMethod = request.method;
    networkRequest.setRequestHeaders(this._headersMapToHeadersArray(request.headers));
    networkRequest.requestFormData = request.postData;
    networkRequest.setInitialPriority(request.initialPriority);
    networkRequest.mixedContentType =
        request.mixedContentType || NetworkAgent.RequestMixedContentType.None;
  },

  /**
   * @param {!WebInspector.NetworkRequest} networkRequest
   * @param {!NetworkAgent.Response=} response
   */
  _updateNetworkRequestWithResponse: function(networkRequest, response) {
    if (response.url && networkRequest.url !== response.url)
      networkRequest.url = response.url;
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
      var consoleModel = this._manager._target.consoleModel;
      consoleModel.addMessage(new WebInspector.ConsoleMessage(
          consoleModel.target(), WebInspector.ConsoleMessage.MessageSource.Network,
          WebInspector.ConsoleMessage.MessageLevel.Log,
          WebInspector.UIString(
              'Resource interpreted as %s but transferred with MIME type %s: "%s".',
              networkRequest.resourceType().title(), networkRequest.mimeType, networkRequest.url),
          WebInspector.ConsoleMessage.MessageType.Log, '', 0, 0, networkRequest.requestId));
    }

    if (response.securityDetails)
      networkRequest.setSecurityDetails(response.securityDetails);
  },

  /**
     * @param {!WebInspector.NetworkRequest} networkRequest
     * @return {boolean}
     */
  _mimeTypeIsConsistentWithType: function(networkRequest) {
    // If status is an error, content is likely to be of an inconsistent type,
    // as it's going to be an error message. We do not want to emit a warning
    // for this, though, as this will already be reported as resource loading failure.
    // Also, if a URL like http://localhost/wiki/load.php?debug=true&lang=en produces text/css and
    // gets reloaded,
    // it is 304 Not Modified and its guessed mime-type is text/php, which is wrong.
    // Don't check for mime-types in 304-resources.
    if (networkRequest.hasErrorStatusCode() || networkRequest.statusCode === 304 ||
        networkRequest.statusCode === 204)
      return true;

    var resourceType = networkRequest.resourceType();
    if (resourceType !== WebInspector.resourceTypes.Stylesheet &&
        resourceType !== WebInspector.resourceTypes.Document &&
        resourceType !== WebInspector.resourceTypes.TextTrack) {
      return true;
    }

    if (!networkRequest.mimeType)
      return true;  // Might be not known for cached resources with null responses.

    if (networkRequest.mimeType in WebInspector.NetworkManager._MIMETypes)
      return resourceType.name() in WebInspector.NetworkManager._MIMETypes[networkRequest.mimeType];

    return false;
  },

  /**
   * @override
   * @param {!NetworkAgent.RequestId} requestId
   * @param {!NetworkAgent.ResourcePriority} newPriority
   * @param {!NetworkAgent.Timestamp} timestamp
   */
  resourceChangedPriority: function(requestId, newPriority, timestamp) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (networkRequest)
      networkRequest.setPriority(newPriority);
  },

  /**
   * @override
   * @param {!NetworkAgent.RequestId} requestId
   * @param {!PageAgent.FrameId} frameId
   * @param {!NetworkAgent.LoaderId} loaderId
   * @param {string} documentURL
   * @param {!NetworkAgent.Request} request
   * @param {!NetworkAgent.Timestamp} time
   * @param {!NetworkAgent.Timestamp} wallTime
   * @param {!NetworkAgent.Initiator} initiator
   * @param {!NetworkAgent.Response=} redirectResponse
   * @param {!PageAgent.ResourceType=} resourceType
   */
  requestWillBeSent: function(
      requestId, frameId, loaderId, documentURL, request, time, wallTime, initiator,
      redirectResponse, resourceType) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (networkRequest) {
      // FIXME: move this check to the backend.
      if (!redirectResponse)
        return;
      this.responseReceived(
          requestId, frameId, loaderId, time, PageAgent.ResourceType.Other, redirectResponse);
      networkRequest = this._appendRedirect(requestId, time, request.url);
    } else
      networkRequest = this._createNetworkRequest(
          requestId, frameId, loaderId, request.url, documentURL, initiator);
    networkRequest.hasNetworkData = true;
    this._updateNetworkRequestWithRequest(networkRequest, request);
    networkRequest.setIssueTime(time, wallTime);
    networkRequest.setResourceType(WebInspector.resourceTypes[resourceType]);

    this._startNetworkRequest(networkRequest);
  },

  /**
   * @override
   * @param {!NetworkAgent.RequestId} requestId
   */
  requestServedFromCache: function(requestId) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;

    networkRequest.setFromMemoryCache();
  },

  /**
   * @override
   * @param {!NetworkAgent.RequestId} requestId
   * @param {!PageAgent.FrameId} frameId
   * @param {!NetworkAgent.LoaderId} loaderId
   * @param {!NetworkAgent.Timestamp} time
   * @param {!PageAgent.ResourceType} resourceType
   * @param {!NetworkAgent.Response} response
   */
  responseReceived: function(requestId, frameId, loaderId, time, resourceType, response) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest) {
      // We missed the requestWillBeSent.
      var eventData = {};
      eventData.url = response.url;
      eventData.frameId = frameId;
      eventData.loaderId = loaderId;
      eventData.resourceType = resourceType;
      eventData.mimeType = response.mimeType;
      this._manager.dispatchEventToListeners(
          WebInspector.NetworkManager.Events.RequestUpdateDropped, eventData);
      return;
    }

    networkRequest.responseReceivedTime = time;
    networkRequest.setResourceType(WebInspector.resourceTypes[resourceType]);

    this._updateNetworkRequestWithResponse(networkRequest, response);

    this._updateNetworkRequest(networkRequest);
    this._manager.dispatchEventToListeners(
        WebInspector.NetworkManager.Events.ResponseReceived, networkRequest);
  },

  /**
   * @override
   * @param {!NetworkAgent.RequestId} requestId
   * @param {!NetworkAgent.Timestamp} time
   * @param {number} dataLength
   * @param {number} encodedDataLength
   */
  dataReceived: function(requestId, time, dataLength, encodedDataLength) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;

    networkRequest.resourceSize += dataLength;
    if (encodedDataLength !== -1)
      networkRequest.increaseTransferSize(encodedDataLength);
    networkRequest.endTime = time;

    this._updateNetworkRequest(networkRequest);
  },

  /**
   * @override
   * @param {!NetworkAgent.RequestId} requestId
   * @param {!NetworkAgent.Timestamp} finishTime
   * @param {number} encodedDataLength
   */
  loadingFinished: function(requestId, finishTime, encodedDataLength) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;
    this._finishNetworkRequest(networkRequest, finishTime, encodedDataLength);
  },

  /**
   * @override
   * @param {!NetworkAgent.RequestId} requestId
   * @param {!NetworkAgent.Timestamp} time
   * @param {!PageAgent.ResourceType} resourceType
   * @param {string} localizedDescription
   * @param {boolean=} canceled
   * @param {!NetworkAgent.BlockedReason=} blockedReason
   */
  loadingFailed: function(
      requestId, time, resourceType, localizedDescription, canceled, blockedReason) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;

    networkRequest.failed = true;
    networkRequest.setResourceType(WebInspector.resourceTypes[resourceType]);
    networkRequest.canceled = canceled;
    if (blockedReason) {
      networkRequest.setBlockedReason(blockedReason);
      if (blockedReason === NetworkAgent.BlockedReason.Inspector) {
        var consoleModel = this._manager._target.consoleModel;
        consoleModel.addMessage(new WebInspector.ConsoleMessage(
            consoleModel.target(), WebInspector.ConsoleMessage.MessageSource.Network,
            WebInspector.ConsoleMessage.MessageLevel.Warning,
            WebInspector.UIString('Request was blocked by DevTools: "%s".', networkRequest.url),
            WebInspector.ConsoleMessage.MessageType.Log, '', 0, 0, networkRequest.requestId));
      }
    }
    networkRequest.localizedFailDescription = localizedDescription;
    this._finishNetworkRequest(networkRequest, time, -1);
  },

  /**
   * @override
   * @param {!NetworkAgent.RequestId} requestId
   * @param {string} requestURL
   * @param {!NetworkAgent.Initiator=} initiator
   */
  webSocketCreated: function(requestId, requestURL, initiator) {
    var networkRequest = new WebInspector.NetworkRequest(
        this._manager._target, requestId, requestURL, '', '', '', initiator || null);
    networkRequest.setResourceType(WebInspector.resourceTypes.WebSocket);
    this._startNetworkRequest(networkRequest);
  },

  /**
   * @override
   * @param {!NetworkAgent.RequestId} requestId
   * @param {!NetworkAgent.Timestamp} time
   * @param {!NetworkAgent.Timestamp} wallTime
   * @param {!NetworkAgent.WebSocketRequest} request
   */
  webSocketWillSendHandshakeRequest: function(requestId, time, wallTime, request) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;

    networkRequest.requestMethod = 'GET';
    networkRequest.setRequestHeaders(this._headersMapToHeadersArray(request.headers));
    networkRequest.setIssueTime(time, wallTime);

    this._updateNetworkRequest(networkRequest);
  },

  /**
   * @override
   * @param {!NetworkAgent.RequestId} requestId
   * @param {!NetworkAgent.Timestamp} time
   * @param {!NetworkAgent.WebSocketResponse} response
   */
  webSocketHandshakeResponseReceived: function(requestId, time, response) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;

    networkRequest.statusCode = response.status;
    networkRequest.statusText = response.statusText;
    networkRequest.responseHeaders = this._headersMapToHeadersArray(response.headers);
    networkRequest.responseHeadersText = response.headersText;
    if (response.requestHeaders)
      networkRequest.setRequestHeaders(this._headersMapToHeadersArray(response.requestHeaders));
    if (response.requestHeadersText)
      networkRequest.setRequestHeadersText(response.requestHeadersText);
    networkRequest.responseReceivedTime = time;
    networkRequest.protocol = 'websocket';

    this._updateNetworkRequest(networkRequest);
  },

  /**
   * @override
   * @param {!NetworkAgent.RequestId} requestId
   * @param {!NetworkAgent.Timestamp} time
   * @param {!NetworkAgent.WebSocketFrame} response
   */
  webSocketFrameReceived: function(requestId, time, response) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;

    networkRequest.addFrame(response, time);
    networkRequest.responseReceivedTime = time;

    this._updateNetworkRequest(networkRequest);
  },

  /**
   * @override
   * @param {!NetworkAgent.RequestId} requestId
   * @param {!NetworkAgent.Timestamp} time
   * @param {!NetworkAgent.WebSocketFrame} response
   */
  webSocketFrameSent: function(requestId, time, response) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;

    networkRequest.addFrame(response, time, true);
    networkRequest.responseReceivedTime = time;

    this._updateNetworkRequest(networkRequest);
  },

  /**
   * @override
   * @param {!NetworkAgent.RequestId} requestId
   * @param {!NetworkAgent.Timestamp} time
   * @param {string} errorMessage
   */
  webSocketFrameError: function(requestId, time, errorMessage) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;

    networkRequest.addFrameError(errorMessage, time);
    networkRequest.responseReceivedTime = time;

    this._updateNetworkRequest(networkRequest);
  },

  /**
   * @override
   * @param {!NetworkAgent.RequestId} requestId
   * @param {!NetworkAgent.Timestamp} time
   */
  webSocketClosed: function(requestId, time) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;
    this._finishNetworkRequest(networkRequest, time, -1);
  },

  /**
   * @override
   * @param {!NetworkAgent.RequestId} requestId
   * @param {!NetworkAgent.Timestamp} time
   * @param {string} eventName
   * @param {string} eventId
   * @param {string} data
   */
  eventSourceMessageReceived: function(requestId, time, eventName, eventId, data) {
    var networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest)
      return;
    networkRequest.addEventSourceMessage(time, eventName, eventId, data);
  },

  /**
     * @param {!NetworkAgent.RequestId} requestId
     * @param {!NetworkAgent.Timestamp} time
     * @param {string} redirectURL
     * @return {!WebInspector.NetworkRequest}
     */
  _appendRedirect: function(requestId, time, redirectURL) {
    var originalNetworkRequest = this._inflightRequestsById[requestId];
    var previousRedirects = originalNetworkRequest.redirects || [];
    originalNetworkRequest.requestId = requestId + ':redirected.' + previousRedirects.length;
    delete originalNetworkRequest.redirects;
    if (previousRedirects.length > 0)
      originalNetworkRequest.redirectSource = previousRedirects[previousRedirects.length - 1];
    this._finishNetworkRequest(originalNetworkRequest, time, -1);
    var newNetworkRequest = this._createNetworkRequest(
        requestId, originalNetworkRequest.frameId, originalNetworkRequest.loaderId, redirectURL,
        originalNetworkRequest.documentURL, originalNetworkRequest.initiator());
    newNetworkRequest.redirects = previousRedirects.concat(originalNetworkRequest);
    return newNetworkRequest;
  },

  /**
   * @param {!WebInspector.NetworkRequest} networkRequest
   */
  _startNetworkRequest: function(networkRequest) {
    this._inflightRequestsById[networkRequest.requestId] = networkRequest;
    this._inflightRequestsByURL[networkRequest.url] = networkRequest;
    this._dispatchEventToListeners(
        WebInspector.NetworkManager.Events.RequestStarted, networkRequest);
  },

  /**
   * @param {!WebInspector.NetworkRequest} networkRequest
   */
  _updateNetworkRequest: function(networkRequest) {
    this._dispatchEventToListeners(
        WebInspector.NetworkManager.Events.RequestUpdated, networkRequest);
  },

  /**
   * @param {!WebInspector.NetworkRequest} networkRequest
   * @param {!NetworkAgent.Timestamp} finishTime
   * @param {number} encodedDataLength
   */
  _finishNetworkRequest: function(networkRequest, finishTime, encodedDataLength) {
    networkRequest.endTime = finishTime;
    networkRequest.finished = true;
    if (encodedDataLength >= 0)
      networkRequest.setTransferSize(encodedDataLength);
    this._dispatchEventToListeners(
        WebInspector.NetworkManager.Events.RequestFinished, networkRequest);
    delete this._inflightRequestsById[networkRequest.requestId];
    delete this._inflightRequestsByURL[networkRequest.url];
  },

  /**
   * @param {string} eventType
   * @param {!WebInspector.NetworkRequest} networkRequest
   */
  _dispatchEventToListeners: function(eventType, networkRequest) {
    this._manager.dispatchEventToListeners(eventType, networkRequest);
  },

  /**
   * @param {!NetworkAgent.RequestId} requestId
   * @param {string} frameId
   * @param {!NetworkAgent.LoaderId} loaderId
   * @param {string} url
   * @param {string} documentURL
   * @param {?NetworkAgent.Initiator} initiator
   */
  _createNetworkRequest: function(requestId, frameId, loaderId, url, documentURL, initiator) {
    return new WebInspector.NetworkRequest(
        this._manager._target, requestId, url, documentURL, frameId, loaderId, initiator);
  }
};


/**
 * @constructor
 * @extends {WebInspector.Object}
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.MultitargetNetworkManager = function() {
  WebInspector.Object.call(this);
  WebInspector.targetManager.observeTargets(this);

  /** @type {!Set<string>} */
  this._blockedURLs = new Set();
  this._blockedSetting = WebInspector.moduleSetting('blockedURLs');
  this._blockedSetting.addChangeListener(this._updateBlockedURLs, this);
  this._blockedSetting.set([]);
  this._updateBlockedURLs();

  this._userAgentOverride = '';
  /** @type {!Set<!Protocol.NetworkAgent>} */
  this._agents = new Set();
  /** @type {!WebInspector.NetworkManager.Conditions} */
  this._networkConditions = WebInspector.NetworkManager.NoThrottlingConditions;
};

/** @enum {symbol} */
WebInspector.MultitargetNetworkManager.Events = {
  ConditionsChanged: Symbol('ConditionsChanged'),
  UserAgentChanged: Symbol('UserAgentChanged')
};

/**
 * @param {string} uaString
 * @return {string}
 */
WebInspector.MultitargetNetworkManager.patchUserAgentWithChromeVersion = function(uaString) {
  // Patches Chrome/CriOS version from user agent ("1.2.3.4" when user agent is: "Chrome/1.2.3.4").
  var chromeRegex = new RegExp('(?:^|\\W)Chrome/(\\S+)');
  var chromeMatch = navigator.userAgent.match(chromeRegex);
  if (chromeMatch && chromeMatch.length > 1)
    return String.sprintf(uaString, chromeMatch[1]);
  return uaString;
};

WebInspector.MultitargetNetworkManager.prototype = {
  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetAdded: function(target) {
    var networkAgent = target.networkAgent();
    if (this._extraHeaders)
      networkAgent.setExtraHTTPHeaders(this._extraHeaders);
    if (this._currentUserAgent())
      networkAgent.setUserAgentOverride(this._currentUserAgent());
    for (var url of this._blockedURLs)
      networkAgent.addBlockedURL(url);
    this._agents.add(networkAgent);
    if (this.isThrottling())
      this._updateNetworkConditions(networkAgent);
  },

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetRemoved: function(target) { this._agents.delete(target.networkAgent()); },

  /**
     * @return {boolean}
     */
  isThrottling: function() {
    return this._networkConditions.download >= 0 || this._networkConditions.upload >= 0 ||
        this._networkConditions.latency > 0;
  },

  /**
     * @return {boolean}
     */
  isOffline: function() {
    return !this._networkConditions.download && !this._networkConditions.upload;
  },

  /**
   * @param {!WebInspector.NetworkManager.Conditions} conditions
   */
  setNetworkConditions: function(conditions) {
    this._networkConditions = conditions;
    for (var agent of this._agents)
      this._updateNetworkConditions(agent);
    this.dispatchEventToListeners(WebInspector.MultitargetNetworkManager.Events.ConditionsChanged);
  },

  /**
     * @return {!WebInspector.NetworkManager.Conditions}
     */
  networkConditions: function() { return this._networkConditions; },

  /**
   * @param {!Protocol.NetworkAgent} networkAgent
   */
  _updateNetworkConditions: function(networkAgent) {
    var conditions = this._networkConditions;
    if (!this.isThrottling()) {
      networkAgent.emulateNetworkConditions(false, 0, 0, 0);
    } else {
      networkAgent.emulateNetworkConditions(
          this.isOffline(), conditions.latency, conditions.download < 0 ? 0 : conditions.download,
          conditions.upload < 0 ? 0 : conditions.upload,
          WebInspector.NetworkManager._connectionType(conditions));
    }
  },

  /**
   * @param {!NetworkAgent.Headers} headers
   */
  setExtraHTTPHeaders: function(headers) {
    this._extraHeaders = headers;
    for (var target of WebInspector.targetManager.targets())
      target.networkAgent().setExtraHTTPHeaders(this._extraHeaders);
  },

  /**
     * @return {string}
     */
  _currentUserAgent: function() {
    return this._customUserAgent ? this._customUserAgent : this._userAgentOverride;
  },

  _updateUserAgentOverride: function() {
    var userAgent = this._currentUserAgent();
    WebInspector.ResourceLoader.targetUserAgent = userAgent;
    for (var target of WebInspector.targetManager.targets())
      target.networkAgent().setUserAgentOverride(userAgent);
  },

  /**
   * @param {string} userAgent
   */
  setUserAgentOverride: function(userAgent) {
    if (this._userAgentOverride === userAgent)
      return;
    this._userAgentOverride = userAgent;
    if (!this._customUserAgent)
      this._updateUserAgentOverride();
    this.dispatchEventToListeners(WebInspector.MultitargetNetworkManager.Events.UserAgentChanged);
  },

  /**
     * @return {string}
     */
  userAgentOverride: function() { return this._userAgentOverride; },

  /**
   * @param {string} userAgent
   */
  setCustomUserAgentOverride: function(userAgent) {
    this._customUserAgent = userAgent;
    this._updateUserAgentOverride();
  },

  _updateBlockedURLs: function() {
    var blocked = this._blockedSetting.get();
    for (var url of blocked) {
      if (!this._blockedURLs.has(url))
        this._addBlockedURL(url);
    }
    for (var url of this._blockedURLs) {
      if (blocked.indexOf(url) === -1)
        this._removeBlockedURL(url);
    }
  },

  /**
   * @param {string} url
   */
  _addBlockedURL: function(url) {
    this._blockedURLs.add(url);
    for (var target of WebInspector.targetManager.targets())
      target.networkAgent().addBlockedURL(url);
  },

  /**
   * @param {string} url
   */
  _removeBlockedURL: function(url) {
    this._blockedURLs.delete(url);
    for (var target of WebInspector.targetManager.targets())
      target.networkAgent().removeBlockedURL(url);
  },

  clearBrowserCache: function() {
    for (var target of WebInspector.targetManager.targets())
      target.networkAgent().clearBrowserCache();
  },

  clearBrowserCookies: function() {
    for (var target of WebInspector.targetManager.targets())
      target.networkAgent().clearBrowserCookies();
  },

  /**
   * @param {string} origin
   * @param {function(!Array<string>)} callback
   */
  getCertificate: function(origin, callback) {
    var target = WebInspector.targetManager.mainTarget();
    target.networkAgent().getCertificate(origin, mycallback);

    /**
     * @param {?Protocol.Error} error
     * @param {!Array<string>} certificate
     */
    function mycallback(error, certificate) { callback(error ? [] : certificate); }
  },

  /**
   * @param {string} url
   * @param {function(number, !Object.<string, string>, string)} callback
   */
  loadResource: function(url, callback) {
    var headers = {};

    var currentUserAgent = this._currentUserAgent();
    if (currentUserAgent)
      headers['User-Agent'] = currentUserAgent;

    if (WebInspector.moduleSetting('cacheDisabled').get())
      headers['Cache-Control'] = 'no-cache';

    WebInspector.ResourceLoader.load(url, headers, callback);
  },

  __proto__: WebInspector.Object.prototype
};

/**
 * @type {!WebInspector.MultitargetNetworkManager}
 */
WebInspector.multitargetNetworkManager;

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

// @ts-nocheck

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';

import {Cookie} from './Cookie.js';
import {ContentData, Events as NetworkRequestEvents, ExtraRequestInfo, ExtraResponseInfo, NameValue, NetworkRequest} from './NetworkRequest.js';  // eslint-disable-line no-unused-vars
import {Capability, SDKModel, SDKModelObserver, Target, TargetManager} from './SDKModel.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class NetworkManager extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);
    this._dispatcher = new NetworkDispatcher(this);
    this._networkAgent = target.networkAgent();
    target.registerNetworkDispatcher(this._dispatcher);
    if (Common.Settings.Settings.instance().moduleSetting('cacheDisabled').get()) {
      this._networkAgent.setCacheDisabled(true);
    }

    this._networkAgent.enable(undefined, undefined, MAX_EAGER_POST_REQUEST_BODY_LENGTH);

    this._bypassServiceWorkerSetting = Common.Settings.Settings.instance().createSetting('bypassServiceWorker', false);
    if (this._bypassServiceWorkerSetting.get()) {
      this._bypassServiceWorkerChanged();
    }
    this._bypassServiceWorkerSetting.addChangeListener(this._bypassServiceWorkerChanged, this);

    Common.Settings.Settings.instance()
        .moduleSetting('cacheDisabled')
        .addChangeListener(this._cacheDisabledSettingChanged, this);
  }

  /**
   * @param {!NetworkRequest} request
   * @return {?NetworkManager}
   */
  static forRequest(request) {
    return request[_networkManagerForRequestSymbol];
  }

  /**
   * @param {!NetworkRequest} request
   * @return {boolean}
   */
  static canReplayRequest(request) {
    return !!request[_networkManagerForRequestSymbol] &&
        request.resourceType() === Common.ResourceType.resourceTypes.XHR;
  }

  /**
   * @param {!NetworkRequest} request
   */
  static replayRequest(request) {
    const manager = request[_networkManagerForRequestSymbol];
    if (!manager) {
      return;
    }
    manager._networkAgent.replayXHR(request.requestId());
  }

  /**
   * @param {!NetworkRequest} request
   * @param {string} query
   * @param {boolean} caseSensitive
   * @param {boolean} isRegex
   * @return {!Promise<!Array<!TextUtils.ContentProvider.SearchMatch>>}
   */
  static async searchInRequest(request, query, caseSensitive, isRegex) {
    const manager = NetworkManager.forRequest(request);
    if (!manager) {
      return [];
    }
    const response = await manager._networkAgent.invoke_searchInResponseBody(
        {requestId: request.requestId(), query: query, caseSensitive: caseSensitive, isRegex: isRegex});
    return response.result || [];
  }

  /**
   * @param {!NetworkRequest} request
   * @return {!Promise<!ContentData>}
   */
  static async requestContentData(request) {
    if (request.resourceType() === Common.ResourceType.resourceTypes.WebSocket) {
      return {error: 'Content for WebSockets is currently not supported', content: null, encoded: false};
    }
    if (!request.finished) {
      await request.once(NetworkRequestEvents.FinishedLoading);
    }
    const manager = NetworkManager.forRequest(request);
    if (!manager) {
      return {error: 'No network manager for request', content: null, encoded: false};
    }
    const response = await manager._networkAgent.invoke_getResponseBody({requestId: request.requestId()});
    const error = response[ProtocolClient.InspectorBackend.ProtocolError] || null;
    return {error: error, content: error ? null : response.body, encoded: response.base64Encoded};
  }

  /**
   * @param {!NetworkRequest} request
   * @return {!Promise<?string>}
   */
  static requestPostData(request) {
    const manager = NetworkManager.forRequest(request);
    if (manager) {
      return manager._networkAgent.getRequestPostData(request.backendRequestId());
    }
    console.error('No network manager for request');
    return /** @type {!Promise<?string>} */ (Promise.resolve(null));
  }

  /**
   * @param {!Conditions} conditions
   * @return {!Protocol.Network.ConnectionType}
   * TODO(allada): this belongs to NetworkConditionsSelector, which should hardcode/guess it.
   */
  static _connectionType(conditions) {
    if (!conditions.download && !conditions.upload) {
      return Protocol.Network.ConnectionType.None;
    }
    let types = NetworkManager._connectionTypes;
    if (!types) {
      NetworkManager._connectionTypes = [];
      types = NetworkManager._connectionTypes;
      types.push(['2g', Protocol.Network.ConnectionType.Cellular2g]);
      types.push(['3g', Protocol.Network.ConnectionType.Cellular3g]);
      types.push(['4g', Protocol.Network.ConnectionType.Cellular4g]);
      types.push(['bluetooth', Protocol.Network.ConnectionType.Bluetooth]);
      types.push(['wifi', Protocol.Network.ConnectionType.Wifi]);
      types.push(['wimax', Protocol.Network.ConnectionType.Wimax]);
    }
    for (const type of types) {
      if (conditions.title.toLowerCase().indexOf(type[0]) !== -1) {
        return type[1];
      }
    }
    return Protocol.Network.ConnectionType.Other;
  }

  /**
   * @param {!Object} headers
   * @return {!Object<string, string>}
   */
  static lowercaseHeaders(headers) {
    const newHeaders = {};
    for (const headerName in headers) {
      newHeaders[headerName.toLowerCase()] = headers[headerName];
    }
    return newHeaders;
  }

  /**
   * @param {string} url
   * @return {!NetworkRequest}
   */
  inflightRequestForURL(url) {
    return this._dispatcher._inflightRequestsByURL[url];
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _cacheDisabledSettingChanged(event) {
    const enabled = /** @type {boolean} */ (event.data);
    this._networkAgent.setCacheDisabled(enabled);
  }

  /**
   * @override
   */
  dispose() {
    Common.Settings.Settings.instance()
        .moduleSetting('cacheDisabled')
        .removeChangeListener(this._cacheDisabledSettingChanged, this);
  }

  _bypassServiceWorkerChanged() {
    this._networkAgent.setBypassServiceWorker(this._bypassServiceWorkerSetting.get());
  }
}

/** @enum {symbol} */
export const Events = {
  RequestStarted: Symbol('RequestStarted'),
  RequestUpdated: Symbol('RequestUpdated'),
  RequestFinished: Symbol('RequestFinished'),
  RequestUpdateDropped: Symbol('RequestUpdateDropped'),
  ResponseReceived: Symbol('ResponseReceived'),
  MessageGenerated: Symbol('MessageGenerated'),
  RequestRedirected: Symbol('RequestRedirected'),
  LoadingFinished: Symbol('LoadingFinished'),
};

const _MIMETypes = {
  'text/html': {'document': true},
  'text/xml': {'document': true},
  'text/plain': {'document': true},
  'application/xhtml+xml': {'document': true},
  'image/svg+xml': {'document': true},
  'text/css': {'stylesheet': true},
  'text/xsl': {'stylesheet': true},
  'text/vtt': {'texttrack': true},
  'application/pdf': {'document': true},
};

/** @type {!Conditions} */
export const NoThrottlingConditions = {
  title: Common.UIString.UIString('Online'),
  download: -1,
  upload: -1,
  latency: 0
};

/** @type {!Conditions} */
export const OfflineConditions = {
  title: Common.UIString.UIString('Offline'),
  download: 0,
  upload: 0,
  latency: 0,
};

/** @type {!Conditions} */
export const Slow3GConditions = {
  title: Common.UIString.UIString('Slow 3G'),
  download: 500 * 1024 / 8 * .8,
  upload: 500 * 1024 / 8 * .8,
  latency: 400 * 5,
};

/** @type {!Conditions} */
export const Fast3GConditions = {
  title: Common.UIString.UIString('Fast 3G'),
  download: 1.6 * 1024 * 1024 / 8 * .9,
  upload: 750 * 1024 / 8 * .9,
  latency: 150 * 3.75,
};

const _networkManagerForRequestSymbol = Symbol('NetworkManager');
const MAX_EAGER_POST_REQUEST_BODY_LENGTH = 64 * 1024;  // bytes

/**
 * @implements {Protocol.NetworkDispatcher}
 * @unrestricted
 */
export class NetworkDispatcher {
  /**
   * @param {!NetworkManager} manager
   */
  constructor(manager) {
    this._manager = manager;
    /** @type {!Object<!Protocol.Network.RequestId, !NetworkRequest>} */
    this._inflightRequestsById = {};
    /** @type {!Object<string, !NetworkRequest>} */
    this._inflightRequestsByURL = {};
    /** @type {!Map<string, !RedirectExtraInfoBuilder>} */
    this._requestIdToRedirectExtraInfoBuilder = new Map();
  }

  /**
   * @param {!Protocol.Network.Headers} headersMap
   * @return {!Array.<!NameValue>}
   */
  _headersMapToHeadersArray(headersMap) {
    const result = [];
    for (const name in headersMap) {
      const values = headersMap[name].split('\n');
      for (let i = 0; i < values.length; ++i) {
        result.push({name: name, value: values[i]});
      }
    }
    return result;
  }

  /**
   * @param {!NetworkRequest} networkRequest
   * @param {!Protocol.Network.Request} request
   */
  _updateNetworkRequestWithRequest(networkRequest, request) {
    networkRequest.requestMethod = request.method;
    networkRequest.setRequestHeaders(this._headersMapToHeadersArray(request.headers));
    networkRequest.setRequestFormData(!!request.hasPostData, request.postData || null);
    networkRequest.setInitialPriority(request.initialPriority);
    networkRequest.mixedContentType = request.mixedContentType || Protocol.Security.MixedContentType.None;
    networkRequest.setReferrerPolicy(request.referrerPolicy);
  }

  /**
   * @param {!NetworkRequest} networkRequest
   * @param {!Protocol.Network.Response=} response
   */
  _updateNetworkRequestWithResponse(networkRequest, response) {
    if (response.url && networkRequest.url() !== response.url) {
      networkRequest.setUrl(response.url);
    }
    networkRequest.mimeType = response.mimeType;
    networkRequest.statusCode = response.status;
    networkRequest.statusText = response.statusText;
    if (!networkRequest.hasExtraResponseInfo()) {
      networkRequest.responseHeaders = this._headersMapToHeadersArray(response.headers);
    }

    if (response.encodedDataLength >= 0) {
      networkRequest.setTransferSize(response.encodedDataLength);
    }

    if (response.requestHeaders && !networkRequest.hasExtraRequestInfo()) {
      // TODO(http://crbug.com/1004979): Stop using response.requestHeaders and
      //   response.requestHeadersText once shared workers
      //   emit Network.*ExtraInfo events for their network requests.
      networkRequest.setRequestHeaders(this._headersMapToHeadersArray(response.requestHeaders));
      networkRequest.setRequestHeadersText(response.requestHeadersText || '');
    }

    networkRequest.connectionReused = response.connectionReused;
    networkRequest.connectionId = String(response.connectionId);
    if (response.remoteIPAddress) {
      networkRequest.setRemoteAddress(response.remoteIPAddress, response.remotePort || -1);
    }

    if (response.fromServiceWorker) {
      networkRequest.fetchedViaServiceWorker = true;
    }

    if (response.fromDiskCache) {
      networkRequest.setFromDiskCache();
    }

    if (response.fromPrefetchCache) {
      networkRequest.setFromPrefetchCache();
    }

    networkRequest.timing = response.timing;

    networkRequest.protocol = response.protocol || '';

    networkRequest.setSecurityState(response.securityState);

    if (!this._mimeTypeIsConsistentWithType(networkRequest)) {
      const message = Common.UIString.UIString(
          'Resource interpreted as %s but transferred with MIME type %s: "%s".', networkRequest.resourceType().title(),
          networkRequest.mimeType, networkRequest.url());
      this._manager.dispatchEventToListeners(
          Events.MessageGenerated, {message: message, requestId: networkRequest.requestId(), warning: true});
    }

    if (response.securityDetails) {
      networkRequest.setSecurityDetails(response.securityDetails);
    }
  }

  /**
   * @param {!NetworkRequest} networkRequest
   * @return {boolean}
   */
  _mimeTypeIsConsistentWithType(networkRequest) {
    // If status is an error, content is likely to be of an inconsistent type,
    // as it's going to be an error message. We do not want to emit a warning
    // for this, though, as this will already be reported as resource loading failure.
    // Also, if a URL like http://localhost/wiki/load.php?debug=true&lang=en produces text/css and gets reloaded,
    // it is 304 Not Modified and its guessed mime-type is text/php, which is wrong.
    // Don't check for mime-types in 304-resources.
    if (networkRequest.hasErrorStatusCode() || networkRequest.statusCode === 304 || networkRequest.statusCode === 204) {
      return true;
    }

    const resourceType = networkRequest.resourceType();
    if (resourceType !== Common.ResourceType.resourceTypes.Stylesheet &&
        resourceType !== Common.ResourceType.resourceTypes.Document &&
        resourceType !== Common.ResourceType.resourceTypes.TextTrack) {
      return true;
    }


    if (!networkRequest.mimeType) {
      return true;
    }  // Might be not known for cached resources with null responses.

    if (networkRequest.mimeType in _MIMETypes) {
      return resourceType.name() in _MIMETypes[networkRequest.mimeType];
    }

    return false;
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.ResourcePriority} newPriority
   * @param {!Protocol.Network.MonotonicTime} timestamp
   */
  resourceChangedPriority(requestId, newPriority, timestamp) {
    const networkRequest = this._inflightRequestsById[requestId];
    if (networkRequest) {
      networkRequest.setPriority(newPriority);
    }
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.SignedExchangeInfo} info
   */
  signedExchangeReceived(requestId, info) {
    // While loading a signed exchange, a signedExchangeReceived event is sent
    // between two requestWillBeSent events.
    // 1. The first requestWillBeSent is sent while starting the navigation (or
    //    prefetching).
    // 2. This signedExchangeReceived event is sent when the browser detects the
    //    signed exchange.
    // 3. The second requestWillBeSent is sent with the generated redirect
    //    response and a new redirected request which URL is the inner request
    //    URL of the signed exchange.
    let networkRequest = this._inflightRequestsById[requestId];
    // |requestId| is available only for navigation requests. If the request was
    // sent from a renderer process for prefetching, it is not available. In the
    // case, need to fallback to look for the URL.
    // TODO(crbug/841076): Sends the request ID of prefetching to the browser
    // process and DevTools to find the matching request.
    if (!networkRequest) {
      networkRequest = this._inflightRequestsByURL[info.outerResponse.url];
      if (!networkRequest) {
        return;
      }
    }
    networkRequest.setSignedExchangeInfo(info);
    networkRequest.setResourceType(Common.ResourceType.resourceTypes.SignedExchange);

    this._updateNetworkRequestWithResponse(networkRequest, info.outerResponse);
    this._updateNetworkRequest(networkRequest);
    this._manager.dispatchEventToListeners(Events.ResponseReceived, networkRequest);
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
   * @param {!Protocol.Network.ResourceType=} resourceType
   * @param {!Protocol.Page.FrameId=} frameId
   */
  requestWillBeSent(
      requestId, loaderId, documentURL, request, time, wallTime, initiator, redirectResponse, resourceType, frameId) {
    let networkRequest = this._inflightRequestsById[requestId];
    if (networkRequest) {
      // FIXME: move this check to the backend.
      if (!redirectResponse) {
        return;
      }
      // If signedExchangeReceived event has already been sent for the request,
      // ignores the internally generated |redirectResponse|. The
      // |outerResponse| of SignedExchangeInfo was set to |networkRequest| in
      // signedExchangeReceived().
      if (!networkRequest.signedExchangeInfo()) {
        this.responseReceived(
            requestId, loaderId, time, Protocol.Network.ResourceType.Other, redirectResponse, frameId);
      }
      networkRequest = this._appendRedirect(requestId, time, request.url);
      this._manager.dispatchEventToListeners(Events.RequestRedirected, networkRequest);
    } else {
      networkRequest =
          this._createNetworkRequest(requestId, frameId || '', loaderId, request.url, documentURL, initiator);
    }
    networkRequest.hasNetworkData = true;
    this._updateNetworkRequestWithRequest(networkRequest, request);
    networkRequest.setIssueTime(time, wallTime);
    networkRequest.setResourceType(
        resourceType ? Common.ResourceType.resourceTypes[resourceType] : Protocol.Network.ResourceType.Other);

    this._getExtraInfoBuilder(requestId).addRequest(networkRequest);

    this._startNetworkRequest(networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   */
  requestServedFromCache(requestId) {
    const networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest) {
      return;
    }

    networkRequest.setFromMemoryCache();
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.LoaderId} loaderId
   * @param {!Protocol.Network.MonotonicTime} time
   * @param {!Protocol.Network.ResourceType} resourceType
   * @param {!Protocol.Network.Response} response
   * @param {!Protocol.Page.FrameId=} frameId
   */
  responseReceived(requestId, loaderId, time, resourceType, response, frameId) {
    const networkRequest = this._inflightRequestsById[requestId];
    const lowercaseHeaders = NetworkManager.lowercaseHeaders(response.headers);
    if (!networkRequest) {
      // We missed the requestWillBeSent.
      const eventData = {};
      eventData.url = response.url;
      eventData.frameId = frameId || '';
      eventData.loaderId = loaderId;
      eventData.resourceType = resourceType;
      eventData.mimeType = response.mimeType;
      const lastModifiedHeader = lowercaseHeaders['last-modified'];
      eventData.lastModified = lastModifiedHeader ? new Date(lastModifiedHeader) : null;
      this._manager.dispatchEventToListeners(Events.RequestUpdateDropped, eventData);
      return;
    }

    networkRequest.responseReceivedTime = time;
    networkRequest.setResourceType(Common.ResourceType.resourceTypes[resourceType]);

    // net::ParsedCookie::kMaxCookieSize = 4096 (net/cookies/parsed_cookie.h)
    if ('set-cookie' in lowercaseHeaders && lowercaseHeaders['set-cookie'].length > 4096) {
      const values = lowercaseHeaders['set-cookie'].split('\n');
      for (let i = 0; i < values.length; ++i) {
        if (values[i].length <= 4096) {
          continue;
        }
        const message = Common.UIString.UIString(
            'Set-Cookie header is ignored in response from url: %s. Cookie length should be less than or equal to 4096 characters.',
            response.url);
        this._manager.dispatchEventToListeners(
            Events.MessageGenerated, {message: message, requestId: requestId, warning: true});
      }
    }

    this._updateNetworkRequestWithResponse(networkRequest, response);

    this._updateNetworkRequest(networkRequest);
    this._manager.dispatchEventToListeners(Events.ResponseReceived, networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} time
   * @param {number} dataLength
   * @param {number} encodedDataLength
   */
  dataReceived(requestId, time, dataLength, encodedDataLength) {
    let networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest) {
      networkRequest = this._maybeAdoptMainResourceRequest(requestId);
    }
    if (!networkRequest) {
      return;
    }

    networkRequest.resourceSize += dataLength;
    if (encodedDataLength !== -1) {
      networkRequest.increaseTransferSize(encodedDataLength);
    }
    networkRequest.endTime = time;

    this._updateNetworkRequest(networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} finishTime
   * @param {number} encodedDataLength
   * @param {boolean=} shouldReportCorbBlocking
   */
  loadingFinished(requestId, finishTime, encodedDataLength, shouldReportCorbBlocking) {
    let networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest) {
      networkRequest = this._maybeAdoptMainResourceRequest(requestId);
    }
    if (!networkRequest) {
      return;
    }
    this._getExtraInfoBuilder(requestId).finished();
    this._finishNetworkRequest(networkRequest, finishTime, encodedDataLength, shouldReportCorbBlocking);
    this._manager.dispatchEventToListeners(Events.LoadingFinished, networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} time
   * @param {!Protocol.Network.ResourceType} resourceType
   * @param {string} localizedDescription
   * @param {boolean=} canceled
   * @param {!Protocol.Network.BlockedReason=} blockedReason
   */
  loadingFailed(requestId, time, resourceType, localizedDescription, canceled, blockedReason) {
    const networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest) {
      return;
    }

    networkRequest.failed = true;
    networkRequest.setResourceType(Common.ResourceType.resourceTypes[resourceType]);
    networkRequest.canceled = !!canceled;
    if (blockedReason) {
      networkRequest.setBlockedReason(blockedReason);
      if (blockedReason === Protocol.Network.BlockedReason.Inspector) {
        const message = Common.UIString.UIString('Request was blocked by DevTools: "%s".', networkRequest.url());
        this._manager.dispatchEventToListeners(
            Events.MessageGenerated, {message: message, requestId: requestId, warning: true});
      }
    }
    networkRequest.localizedFailDescription = localizedDescription;
    this._getExtraInfoBuilder(requestId).finished();
    this._finishNetworkRequest(networkRequest, time, -1);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {string} requestURL
   * @param {!Protocol.Network.Initiator=} initiator
   */
  webSocketCreated(requestId, requestURL, initiator) {
    const networkRequest = new NetworkRequest(requestId, requestURL, '', '', '', initiator || null);
    networkRequest[_networkManagerForRequestSymbol] = this._manager;
    networkRequest.setResourceType(Common.ResourceType.resourceTypes.WebSocket);
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
    const networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest) {
      return;
    }

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
    const networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest) {
      return;
    }

    networkRequest.statusCode = response.status;
    networkRequest.statusText = response.statusText;
    networkRequest.responseHeaders = this._headersMapToHeadersArray(response.headers);
    networkRequest.responseHeadersText = response.headersText || '';
    if (response.requestHeaders) {
      networkRequest.setRequestHeaders(this._headersMapToHeadersArray(response.requestHeaders));
    }
    if (response.requestHeadersText) {
      networkRequest.setRequestHeadersText(response.requestHeadersText);
    }
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
    const networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest) {
      return;
    }

    networkRequest.addProtocolFrame(response, time, false);
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
    const networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest) {
      return;
    }

    networkRequest.addProtocolFrame(response, time, true);
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
    const networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest) {
      return;
    }

    networkRequest.addProtocolFrameError(errorMessage, time);
    networkRequest.responseReceivedTime = time;

    this._updateNetworkRequest(networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} time
   */
  webSocketClosed(requestId, time) {
    const networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest) {
      return;
    }
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
    const networkRequest = this._inflightRequestsById[requestId];
    if (!networkRequest) {
      return;
    }
    networkRequest.addEventSourceMessage(time, eventName, eventId, data);
  }

  /**
   * @override
   * @param {!Protocol.Network.InterceptionId} interceptionId
   * @param {!Protocol.Network.Request} request
   * @param {!Protocol.Page.FrameId} frameId
   * @param {!Protocol.Network.ResourceType} resourceType
   * @param {boolean} isNavigationRequest
   * @param {boolean=} isDownload
   * @param {string=} redirectUrl
   * @param {!Protocol.Network.AuthChallenge=} authChallenge
   * @param {!Protocol.Network.ErrorReason=} responseErrorReason
   * @param {number=} responseStatusCode
   * @param {!Protocol.Network.Headers=} responseHeaders
   * @param {!Protocol.Network.RequestId=} requestId
   */
  requestIntercepted(
      interceptionId, request, frameId, resourceType, isNavigationRequest, isDownload, redirectUrl, authChallenge,
      responseErrorReason, responseStatusCode, responseHeaders, requestId) {
    self.SDK.multitargetNetworkManager._requestIntercepted(new InterceptedRequest(
        this._manager.target().networkAgent(), interceptionId, request, frameId, resourceType, isNavigationRequest,
        isDownload, redirectUrl, authChallenge, responseErrorReason, responseStatusCode, responseHeaders, requestId));
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Array<!Protocol.Network.BlockedCookieWithReason>} blockedCookies
   * @param {!Protocol.Network.Headers} headers
   */
  requestWillBeSentExtraInfo(requestId, blockedCookies, headers) {
    /** @type {!ExtraRequestInfo} */
    const extraRequestInfo = {
      blockedRequestCookies: blockedCookies.map(blockedCookie => {
        return {blockedReasons: blockedCookie.blockedReasons, cookie: Cookie.fromProtocolCookie(blockedCookie.cookie)};
      }),
      requestHeaders: this._headersMapToHeadersArray(headers)
    };
    this._getExtraInfoBuilder(requestId).addRequestExtraInfo(extraRequestInfo);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Array<!Protocol.Network.BlockedSetCookieWithReason>} blockedCookies
   * @param {!Protocol.Network.Headers} headers
   * @param {string=} headersText
   */
  responseReceivedExtraInfo(requestId, blockedCookies, headers, headersText) {
    /** @type {!ExtraResponseInfo} */
    const extraResponseInfo = {
      blockedResponseCookies: blockedCookies.map(blockedCookie => {
        return {
          blockedReasons: blockedCookie.blockedReasons,
          cookieLine: blockedCookie.cookieLine,
          cookie: blockedCookie.cookie ? Cookie.fromProtocolCookie(blockedCookie.cookie) : null
        };
      }),
      responseHeaders: this._headersMapToHeadersArray(headers),
      responseHeadersText: headersText
    };
    this._getExtraInfoBuilder(requestId).addResponseExtraInfo(extraResponseInfo);
  }

  /**
   * @suppress {missingOverride}
   * @param {string} url
   * @param {string} firstPartyUrl
   * @param {!Array<!Protocol.Network.BlockedSetCookieWithReason>} blockedCookies
   */
  cookiesChanged(url, firstPartyUrl, blockedCookies) {
    // TODO(chromium:1032063): Implement this protocol message handler.
  }

  /**
   * @param {string} requestId
   * @return {!RedirectExtraInfoBuilder}
   */
  _getExtraInfoBuilder(requestId) {
    if (!this._requestIdToRedirectExtraInfoBuilder.get(requestId)) {
      const deleteCallback = () => {
        this._requestIdToRedirectExtraInfoBuilder.delete(requestId);
      };
      this._requestIdToRedirectExtraInfoBuilder.set(requestId, new RedirectExtraInfoBuilder(deleteCallback));
    }
    return this._requestIdToRedirectExtraInfoBuilder.get(requestId);
  }

  /**
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} time
   * @param {string} redirectURL
   * @return {!NetworkRequest}
   */
  _appendRedirect(requestId, time, redirectURL) {
    const originalNetworkRequest = this._inflightRequestsById[requestId];
    let redirectCount = 0;
    for (let redirect = originalNetworkRequest.redirectSource(); redirect; redirect = redirect.redirectSource()) {
      redirectCount++;
    }

    originalNetworkRequest.markAsRedirect(redirectCount);
    this._finishNetworkRequest(originalNetworkRequest, time, -1);
    const newNetworkRequest = this._createNetworkRequest(
        requestId, originalNetworkRequest.frameId, originalNetworkRequest.loaderId, redirectURL,
        originalNetworkRequest.documentURL, originalNetworkRequest.initiator());
    newNetworkRequest.setRedirectSource(originalNetworkRequest);
    originalNetworkRequest.setRedirectDestination(newNetworkRequest);
    return newNetworkRequest;
  }

  /**
   * @param {string} requestId
   * @return {?NetworkRequest}
   */
  _maybeAdoptMainResourceRequest(requestId) {
    const request = self.SDK.multitargetNetworkManager._inflightMainResourceRequests.get(requestId);
    if (!request) {
      return null;
    }
    const oldDispatcher = NetworkManager.forRequest(request)._dispatcher;
    delete oldDispatcher._inflightRequestsById[requestId];
    delete oldDispatcher._inflightRequestsByURL[request.url()];
    this._inflightRequestsById[requestId] = request;
    this._inflightRequestsByURL[request.url()] = request;
    request[_networkManagerForRequestSymbol] = this._manager;
    return request;
  }

  /**
   * @param {!NetworkRequest} networkRequest
   */
  _startNetworkRequest(networkRequest) {
    this._inflightRequestsById[networkRequest.requestId()] = networkRequest;
    this._inflightRequestsByURL[networkRequest.url()] = networkRequest;
    // The following relies on the fact that loaderIds and requestIds are
    // globally unique and that the main request has them equal.
    if (networkRequest.loaderId === networkRequest.requestId()) {
      self.SDK.multitargetNetworkManager._inflightMainResourceRequests.set(networkRequest.requestId(), networkRequest);
    }

    this._manager.dispatchEventToListeners(Events.RequestStarted, networkRequest);
  }

  /**
   * @param {!NetworkRequest} networkRequest
   */
  _updateNetworkRequest(networkRequest) {
    this._manager.dispatchEventToListeners(Events.RequestUpdated, networkRequest);
  }

  /**
   * @param {!NetworkRequest} networkRequest
   * @param {!Protocol.Network.MonotonicTime} finishTime
   * @param {number} encodedDataLength
   * @param {boolean=} shouldReportCorbBlocking
   */
  _finishNetworkRequest(networkRequest, finishTime, encodedDataLength, shouldReportCorbBlocking) {
    networkRequest.endTime = finishTime;
    networkRequest.finished = true;
    if (encodedDataLength >= 0) {
      const redirectSource = networkRequest.redirectSource();
      if (redirectSource && redirectSource.signedExchangeInfo()) {
        networkRequest.setTransferSize(0);
        redirectSource.setTransferSize(encodedDataLength);
        this._updateNetworkRequest(redirectSource);
      } else {
        networkRequest.setTransferSize(encodedDataLength);
      }
    }
    this._manager.dispatchEventToListeners(Events.RequestFinished, networkRequest);
    delete this._inflightRequestsById[networkRequest.requestId()];
    delete this._inflightRequestsByURL[networkRequest.url()];
    self.SDK.multitargetNetworkManager._inflightMainResourceRequests.delete(networkRequest.requestId());

    if (shouldReportCorbBlocking) {
      const message = Common.UIString.UIString(
          'Cross-Origin Read Blocking (CORB) blocked cross-origin response %s with MIME type %s. See https://www.chromestatus.com/feature/5629709824032768 for more details.',
          networkRequest.url(), networkRequest.mimeType);
      this._manager.dispatchEventToListeners(
          Events.MessageGenerated, {message: message, requestId: networkRequest.requestId(), warning: true});
    }

    if (Common.Settings.Settings.instance().moduleSetting('monitoringXHREnabled').get() &&
        networkRequest.resourceType().category() === Common.ResourceType.resourceCategories.XHR) {
      let message;
      const failedToLoad = networkRequest.failed || networkRequest.hasErrorStatusCode();
      if (failedToLoad) {
        message = Common.UIString.UIString(
            '%s failed loading: %s "%s".', networkRequest.resourceType().title(), networkRequest.requestMethod,
            networkRequest.url());
      } else {
        message = Common.UIString.UIString(
            '%s finished loading: %s "%s".', networkRequest.resourceType().title(), networkRequest.requestMethod,
            networkRequest.url());
      }

      this._manager.dispatchEventToListeners(
          Events.MessageGenerated, {message: message, requestId: networkRequest.requestId(), warning: false});
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
    const request = new NetworkRequest(requestId, url, documentURL, frameId, loaderId, initiator);
    request[_networkManagerForRequestSymbol] = this._manager;
    return request;
  }
}

/**
 * @implements {SDKModelObserver<!NetworkManager>}
 * @unrestricted
 */
export class MultitargetNetworkManager extends Common.ObjectWrapper.ObjectWrapper {
  constructor() {
    super();
    this._userAgentOverride = '';
    /** @type {!Set<!Protocol.NetworkAgent>} */
    this._agents = new Set();
    /** @type {!Map<string, !NetworkRequest>} */
    this._inflightMainResourceRequests = new Map();
    /** @type {!Conditions} */
    this._networkConditions = NoThrottlingConditions;
    /** @type {?Promise} */
    this._updatingInterceptionPatternsPromise = null;

    // TODO(allada) Remove these and merge it with request interception.
    this._blockingEnabledSetting = Common.Settings.Settings.instance().moduleSetting('requestBlockingEnabled');
    this._blockedPatternsSetting = Common.Settings.Settings.instance().createSetting('networkBlockedPatterns', []);
    this._effectiveBlockedURLs = [];
    this._updateBlockedPatterns();

    /** @type {!Platform.Multimap<!RequestInterceptor, !InterceptionPattern>} */
    this._urlsForRequestInterceptor = new Platform.Multimap();

    TargetManager.instance().observeModels(NetworkManager, this);
  }

  /**
   * @param {string} uaString
   * @return {string}
   */
  static patchUserAgentWithChromeVersion(uaString) {
    // Patches Chrome/CriOS version from user agent ("1.2.3.4" when user agent is: "Chrome/1.2.3.4").
    // Edge also contains an appVersion which should be patched to match the Chrome major version.
    // Otherwise, ignore it. This assumes additional appVersions appear after the Chrome version.
    const chromeRegex = new RegExp('(?:^|\\W)Chrome/(\\S+)');
    const chromeMatch = navigator.userAgent.match(chromeRegex);
    if (chromeMatch && chromeMatch.length > 1) {
      // "1.2.3.4" becomes "1.0.100.0"
      const additionalAppVersion = chromeMatch[1].split('.', 1)[0] + '.0.100.0';
      return Platform.StringUtilities.sprintf(uaString, chromeMatch[1], additionalAppVersion);
    }
    return uaString;
  }

  /**
   * @override
   * @param {!NetworkManager} networkManager
   */
  modelAdded(networkManager) {
    const networkAgent = networkManager.target().networkAgent();
    if (this._extraHeaders) {
      networkAgent.setExtraHTTPHeaders(this._extraHeaders);
    }
    if (this.currentUserAgent()) {
      networkAgent.setUserAgentOverride(this.currentUserAgent());
    }
    if (this._effectiveBlockedURLs.length) {
      networkAgent.setBlockedURLs(this._effectiveBlockedURLs);
    }
    if (this.isIntercepting()) {
      networkAgent.setRequestInterception(this._urlsForRequestInterceptor.valuesArray());
    }
    this._agents.add(networkAgent);
    if (this.isThrottling()) {
      this._updateNetworkConditions(networkAgent);
    }
  }

  /**
   * @override
   * @param {!NetworkManager} networkManager
   */
  modelRemoved(networkManager) {
    for (const entry of this._inflightMainResourceRequests) {
      const manager = NetworkManager.forRequest(/** @type {!NetworkRequest} */ (entry[1]));
      if (manager !== networkManager) {
        continue;
      }
      this._inflightMainResourceRequests.delete(/** @type {string} */ (entry[0]));
    }
    this._agents.delete(networkManager.target().networkAgent());
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
   * @param {!Conditions} conditions
   */
  setNetworkConditions(conditions) {
    this._networkConditions = conditions;
    for (const agent of this._agents) {
      this._updateNetworkConditions(agent);
    }
    this.dispatchEventToListeners(MultitargetNetworkManager.Events.ConditionsChanged);
  }

  /**
   * @return {!Conditions}
   */
  networkConditions() {
    return this._networkConditions;
  }

  /**
   * @param {!Protocol.NetworkAgent} networkAgent
   */
  _updateNetworkConditions(networkAgent) {
    const conditions = this._networkConditions;
    if (!this.isThrottling()) {
      networkAgent.emulateNetworkConditions(false, 0, 0, 0);
    } else {
      networkAgent.emulateNetworkConditions(
          this.isOffline(), conditions.latency, conditions.download < 0 ? 0 : conditions.download,
          conditions.upload < 0 ? 0 : conditions.upload, NetworkManager._connectionType(conditions));
    }
  }

  /**
   * @param {!Protocol.Network.Headers} headers
   */
  setExtraHTTPHeaders(headers) {
    this._extraHeaders = headers;
    for (const agent of this._agents) {
      agent.setExtraHTTPHeaders(this._extraHeaders);
    }
  }

  /**
   * @return {string}
   */
  currentUserAgent() {
    return this._customUserAgent ? this._customUserAgent : this._userAgentOverride;
  }

  _updateUserAgentOverride() {
    const userAgent = this.currentUserAgent();
    for (const agent of this._agents) {
      agent.setUserAgentOverride(userAgent);
    }
  }

  /**
   * @param {string} userAgent
   */
  setUserAgentOverride(userAgent) {
    if (this._userAgentOverride === userAgent) {
      return;
    }
    this._userAgentOverride = userAgent;
    if (!this._customUserAgent) {
      this._updateUserAgentOverride();
    }
    this.dispatchEventToListeners(MultitargetNetworkManager.Events.UserAgentChanged);
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

  // TODO(allada) Move all request blocking into interception and let view manage blocking.
  /**
   * @return {!Array<!BlockedPattern>}
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
   * @param {!Array<!BlockedPattern>} patterns
   */
  setBlockedPatterns(patterns) {
    this._blockedPatternsSetting.set(patterns);
    this._updateBlockedPatterns();
    this.dispatchEventToListeners(MultitargetNetworkManager.Events.BlockedPatternsChanged);
  }

  /**
   * @param {boolean} enabled
   */
  setBlockingEnabled(enabled) {
    if (this._blockingEnabledSetting.get() === enabled) {
      return;
    }
    this._blockingEnabledSetting.set(enabled);
    this._updateBlockedPatterns();
    this.dispatchEventToListeners(MultitargetNetworkManager.Events.BlockedPatternsChanged);
  }

  _updateBlockedPatterns() {
    const urls = [];
    if (this._blockingEnabledSetting.get()) {
      for (const pattern of this._blockedPatternsSetting.get()) {
        if (pattern.enabled) {
          urls.push(pattern.url);
        }
      }
    }

    if (!urls.length && !this._effectiveBlockedURLs.length) {
      return;
    }
    this._effectiveBlockedURLs = urls;
    for (const agent of this._agents) {
      agent.setBlockedURLs(this._effectiveBlockedURLs);
    }
  }

  /**
   * @return {boolean}
   */
  isIntercepting() {
    return !!this._urlsForRequestInterceptor.size;
  }

  /**
   * @param {!Array<!InterceptionPattern>} patterns
   * @param {!RequestInterceptor} requestInterceptor
   * @return {!Promise}
   */
  setInterceptionHandlerForPatterns(patterns, requestInterceptor) {
    // Note: requestInterceptors may recieve interception requests for patterns they did not subscribe to.
    this._urlsForRequestInterceptor.deleteAll(requestInterceptor);
    for (const newPattern of patterns) {
      this._urlsForRequestInterceptor.set(requestInterceptor, newPattern);
    }
    return this._updateInterceptionPatternsOnNextTick();
  }

  /**
   * @return {!Promise}
   */
  _updateInterceptionPatternsOnNextTick() {
    // This is used so we can register and unregister patterns in loops without sending lots of protocol messages.
    if (!this._updatingInterceptionPatternsPromise) {
      this._updatingInterceptionPatternsPromise = Promise.resolve().then(this._updateInterceptionPatterns.bind(this));
    }
    return this._updatingInterceptionPatternsPromise;
  }

  /**
   * @return {!Promise}
   */
  _updateInterceptionPatterns() {
    if (!Common.Settings.Settings.instance().moduleSetting('cacheDisabled').get()) {
      Common.Settings.Settings.instance().moduleSetting('cacheDisabled').set(true);
    }
    this._updatingInterceptionPatternsPromise = null;
    const promises = /** @type {!Array<!Promise>} */ ([]);
    for (const agent of this._agents) {
      promises.push(agent.setRequestInterception(this._urlsForRequestInterceptor.valuesArray()));
    }
    this.dispatchEventToListeners(MultitargetNetworkManager.Events.InterceptorsChanged);
    return Promise.all(promises);
  }

  /**
   * @param {!InterceptedRequest} interceptedRequest
   */
  async _requestIntercepted(interceptedRequest) {
    for (const requestInterceptor of this._urlsForRequestInterceptor.keysArray()) {
      await requestInterceptor(interceptedRequest);
      if (interceptedRequest.hasResponded()) {
        return;
      }
    }
    if (!interceptedRequest.hasResponded()) {
      interceptedRequest.continueRequestWithoutChange();
    }
  }

  clearBrowserCache() {
    for (const agent of this._agents) {
      agent.clearBrowserCache();
    }
  }

  clearBrowserCookies() {
    for (const agent of this._agents) {
      agent.clearBrowserCookies();
    }
  }

  /**
   * @param {string} origin
   * @return {!Promise<!Array<string>>}
   */
  getCertificate(origin) {
    const target = TargetManager.instance().mainTarget();
    return target.networkAgent().getCertificate(origin).then(certificate => certificate || []);
  }

  /**
   * @param {string} url
   * @param {function(boolean, !Object.<string, string>, string, !Host.ResourceLoader.LoadErrorDescription)} callback
   */
  loadResource(url, callback) {
    const headers = {};

    const currentUserAgent = this.currentUserAgent();
    if (currentUserAgent) {
      headers['User-Agent'] = currentUserAgent;
    }

    if (Common.Settings.Settings.instance().moduleSetting('cacheDisabled').get()) {
      headers['Cache-Control'] = 'no-cache';
    }

    Host.ResourceLoader.load(url, headers, callback);
  }
}

/** @enum {symbol} */
MultitargetNetworkManager.Events = {
  BlockedPatternsChanged: Symbol('BlockedPatternsChanged'),
  ConditionsChanged: Symbol('ConditionsChanged'),
  UserAgentChanged: Symbol('UserAgentChanged'),
  InterceptorsChanged: Symbol('InterceptorsChanged')
};

export class InterceptedRequest {
  /**
   * @param {!Protocol.NetworkAgent} networkAgent
   * @param {!Protocol.Network.InterceptionId} interceptionId
   * @param {!Protocol.Network.Request} request
   * @param {!Protocol.Page.FrameId} frameId
   * @param {!Protocol.Network.ResourceType} resourceType
   * @param {boolean} isNavigationRequest
   * @param {boolean=} isDownload
   * @param {string=} redirectUrl
   * @param {!Protocol.Network.AuthChallenge=} authChallenge
   * @param {!Protocol.Network.ErrorReason=} responseErrorReason
   * @param {number=} responseStatusCode
   * @param {!Protocol.Network.Headers=} responseHeaders
   * @param {!Protocol.Network.RequestId=} requestId
   */
  constructor(
      networkAgent, interceptionId, request, frameId, resourceType, isNavigationRequest, isDownload, redirectUrl,
      authChallenge, responseErrorReason, responseStatusCode, responseHeaders, requestId) {
    this._networkAgent = networkAgent;
    this._interceptionId = interceptionId;
    this._hasResponded = false;
    this.request = request;
    this.frameId = frameId;
    this.resourceType = resourceType;
    this.isNavigationRequest = isNavigationRequest;
    this.isDownload = !!isDownload;
    this.redirectUrl = redirectUrl;
    this.authChallenge = authChallenge;
    this.responseErrorReason = responseErrorReason;
    this.responseStatusCode = responseStatusCode;
    this.responseHeaders = responseHeaders;
    this.requestId = requestId;
  }

  /**
   * @return {boolean}
   */
  hasResponded() {
    return this._hasResponded;
  }

  /**
   * @param {!Blob} contentBlob
   */
  async continueRequestWithContent(contentBlob) {
    this._hasResponded = true;
    const headers = [
      'HTTP/1.1 200 OK',
      'Date: ' + (new Date()).toUTCString(),
      'Server: Chrome Devtools Request Interceptor',
      'Connection: closed',
      'Content-Length: ' + contentBlob.size,
      'Content-Type: ' + contentBlob.type || 'text/x-unknown',
    ];
    const encodedResponse = await blobToBase64(new Blob([headers.join('\r\n'), '\r\n\r\n', contentBlob]));
    this._networkAgent.continueInterceptedRequest(this._interceptionId, undefined, encodedResponse);

    /**
     * @param {!Blob} blob
     * @return {!Promise<string>}
     */
    async function blobToBase64(blob) {
      const reader = new FileReader();
      const fileContentsLoadedPromise = new Promise(resolve => reader.onloadend = resolve);
      reader.readAsDataURL(blob);
      await fileContentsLoadedPromise;
      if (reader.error) {
        console.error('Could not convert blob to base64.', reader.error);
        return '';
      }
      const result = reader.result;
      if (result === undefined) {
        console.error('Could not convert blob to base64.');
        return '';
      }
      return result.substring(result.indexOf(',') + 1);
    }
  }

  continueRequestWithoutChange() {
    console.assert(!this._hasResponded);
    this._hasResponded = true;
    this._networkAgent.continueInterceptedRequest(this._interceptionId);
  }

  /**
   * @param {!Protocol.Network.ErrorReason} errorReason
   */
  continueRequestWithError(errorReason) {
    console.assert(!this._hasResponded);
    this._hasResponded = true;
    this._networkAgent.continueInterceptedRequest(this._interceptionId, errorReason);
  }

  /**
   * @return {!Promise<!ContentData>}
   */
  async responseBody() {
    const response =
        await this._networkAgent.invoke_getResponseBodyForInterception({interceptionId: this._interceptionId});
    const error = response[ProtocolClient.InspectorBackend.ProtocolError] || null;
    return {error: error, content: error ? null : response.body, encoded: response.base64Encoded};
  }
}

/**
 * Helper class to match requests created from requestWillBeSent with
 * requestWillBeSentExtraInfo and responseReceivedExtraInfo when they have the
 * same requestId due to redirects.
 */
class RedirectExtraInfoBuilder {
  /**
   * @param {function()} deleteCallback
   */
  constructor(deleteCallback) {
    /** @type {!Array<!NetworkRequest>} */
    this._requests = [];
    /** @type {!Array<?ExtraRequestInfo>} */
    this._requestExtraInfos = [];
    /** @type {!Array<?ExtraResponseInfo>} */
    this._responseExtraInfos = [];
    /** @type {boolean} */
    this._finished = false;
    /** @type {boolean} */
    this._hasExtraInfo = false;
    /** @type {function()} */
    this._deleteCallback = deleteCallback;
  }

  /**
   * @param {!NetworkRequest} req
   */
  addRequest(req) {
    this._requests.push(req);
    this._sync(this._requests.length - 1);
  }

  /**
   * @param {!ExtraRequestInfo} info
   */
  addRequestExtraInfo(info) {
    this._hasExtraInfo = true;
    this._requestExtraInfos.push(info);
    this._sync(this._requestExtraInfos.length - 1);
  }

  /**
   * @param {!ExtraResponseInfo} info
   */
  addResponseExtraInfo(info) {
    this._responseExtraInfos.push(info);
    this._sync(this._responseExtraInfos.length - 1);
  }

  finished() {
    this._finished = true;
    this._deleteIfComplete();
  }

  /**
   * @param {number} index
   */
  _sync(index) {
    const req = this._requests[index];
    if (!req) {
      return;
    }

    const requestExtraInfo = this._requestExtraInfos[index];
    if (requestExtraInfo) {
      req.addExtraRequestInfo(requestExtraInfo);
      this._requestExtraInfos[index] = null;
    }

    const responseExtraInfo = this._responseExtraInfos[index];
    if (responseExtraInfo) {
      req.addExtraResponseInfo(responseExtraInfo);
      this._responseExtraInfos[index] = null;
    }

    this._deleteIfComplete();
  }

  _deleteIfComplete() {
    if (!this._finished) {
      return;
    }

    if (this._hasExtraInfo) {
      // if we haven't gotten the last responseExtraInfo event, we have to wait for it.
      if (!this._requests.peekLast().hasExtraResponseInfo()) {
        return;
      }
    }

    this._deleteCallback();
  }
}

SDKModel.register(NetworkManager, Capability.Network, true);

/**
 * @typedef {{
  *   download: number,
  *   upload: number,
  *   latency: number,
  *   title: string,
  * }}
  */
export let Conditions;

/** @typedef {{url: string, enabled: boolean}} */
export let BlockedPattern;

/** @typedef {{message: string, requestId: string, warning: boolean}} */
export let Message;

/** @typedef {!{urlPattern: string, interceptionStage: !Protocol.Network.InterceptionStage}} */
export let InterceptionPattern;

/** @typedef {!function(!InterceptedRequest):!Promise} */
export let RequestInterceptor;

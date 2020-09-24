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

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Platform from '../platform/platform.js';
import * as TextUtils from '../text_utils/text_utils.js';  // eslint-disable-line no-unused-vars

import {Cookie} from './Cookie.js';
import {BlockedCookieWithReason, ContentData, Events as NetworkRequestEvents, ExtraRequestInfo, ExtraResponseInfo, MIME_TYPE, MIME_TYPE_TO_RESOURCE_TYPE, NameValue, NetworkRequest} from './NetworkRequest.js';  // eslint-disable-line no-unused-vars
import {Capability, SDKModel, SDKModelObserver, Target, TargetManager} from './SDKModel.js';  // eslint-disable-line no-unused-vars

/** @type {!WeakMap<!NetworkRequest, !NetworkManager>} */
const requestToManagerMap = new WeakMap();

const CONNECTION_TYPES = new Map([
  ['2g', Protocol.Network.ConnectionType.Cellular2g],
  ['3g', Protocol.Network.ConnectionType.Cellular3g],
  ['4g', Protocol.Network.ConnectionType.Cellular4g],
  ['bluetooth', Protocol.Network.ConnectionType.Bluetooth],
  ['wifi', Protocol.Network.ConnectionType.Wifi],
  ['wimax', Protocol.Network.ConnectionType.Wimax],
]);


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
      this._networkAgent.invoke_setCacheDisabled({cacheDisabled: true});
    }

    this._networkAgent.invoke_enable({maxPostDataSize: MAX_EAGER_POST_REQUEST_BODY_LENGTH});

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
    return requestToManagerMap.get(request) || null;
  }

  /**
   * @param {!NetworkRequest} request
   * @return {boolean}
   */
  static canReplayRequest(request) {
    return !!requestToManagerMap.get(request) && request.resourceType() === Common.ResourceType.resourceTypes.XHR;
  }

  /**
   * @param {!NetworkRequest} request
   */
  static replayRequest(request) {
    const manager = requestToManagerMap.get(request);
    if (!manager) {
      return;
    }
    manager._networkAgent.invoke_replayXHR({requestId: request.requestId()});
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
    const error = response.getError() || null;
    return {error: error, content: error ? null : response.body, encoded: response.base64Encoded};
  }

  /**
   * @param {!NetworkRequest} request
   * @return {!Promise<?string>}
   */
  static async requestPostData(request) {
    const manager = NetworkManager.forRequest(request);
    if (manager) {
      try {
        const {postData} =
            await manager._networkAgent.invoke_getRequestPostData({requestId: request.backendRequestId()});
        return postData;
      } catch (e) {
        return e.message;
      }
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
    const title = conditions.title.toLowerCase();
    for (const [name, protocolType] of CONNECTION_TYPES) {
      if (title.includes(name)) {
        return protocolType;
      }
    }
    return Protocol.Network.ConnectionType.Other;
  }

  /**
   * @param {!Object<string,string>} headers
   * @return {!Object<string, string>}
   */
  static lowercaseHeaders(headers) {
    /** @type {!Object<string, string>} */
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
    this._networkAgent.invoke_setCacheDisabled({cacheDisabled: enabled});
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
    this._networkAgent.invoke_setBypassServiceWorker({bypass: this._bypassServiceWorkerSetting.get()});
  }

  /**
   * @param {string} frameId
   * @returns {!Promise<?Protocol.Network.SecurityIsolationStatus>}
   */
  async getSecurityIsolationStatus(frameId) {
    const result = await this._networkAgent.invoke_getSecurityIsolationStatus({frameId});
    if (result.getError()) {
      return null;
    }
    return result.status;
  }

  /**
    * @param {string} frameId
    * @param {string} url
    * @param {!Protocol.Network.LoadNetworkResourceOptions} options
    * @return {!Promise<!Protocol.Network.LoadNetworkResourcePageResult>}
    */
  async loadNetworkResource(frameId, url, options) {
    const result = await this._networkAgent.invoke_loadNetworkResource({frameId, url, options});
    if (result.getError()) {
      throw new Error(result.getError());
    }
    return result.resource;
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

const MAX_EAGER_POST_REQUEST_BODY_LENGTH = 64 * 1024;  // bytes

/**
 * @implements {ProtocolProxyApi.NetworkDispatcher}
 * @unrestricted
 */
export class NetworkDispatcher {
  /**
   * @param {!NetworkManager} manager
   */
  constructor(manager) {
    this._manager = manager;
    /** @type {!Map<!Protocol.Network.RequestId, !NetworkRequest>} */
    this._inflightRequestsById = new Map();
    /** @type {!Object<string, !NetworkRequest>} */
    this._inflightRequestsByURL = {};
    /** @type {!Map<string, !RedirectExtraInfoBuilder>} */
    this._requestIdToRedirectExtraInfoBuilder = new Map();
  }

  /**
   * @return {!Protocol.UsesObjectNotation}
   */
  usesObjectNotation() {
    return true;
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
   * @param {!Protocol.Network.Response} response
   */
  _updateNetworkRequestWithResponse(networkRequest, response) {
    if (response.url && networkRequest.url() !== response.url) {
      networkRequest.setUrl(response.url);
    }
    networkRequest.mimeType = /** @type {!MIME_TYPE} */ (response.mimeType);
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

    if (response.cacheStorageCacheName) {
      networkRequest.setResponseCacheStorageCacheName(response.cacheStorageCacheName);
    }

    if (response.responseTime) {
      networkRequest.setResponseRetrievalTime(new Date(response.responseTime));
    }

    networkRequest.timing = response.timing;

    networkRequest.protocol = response.protocol || '';

    if (response.serviceWorkerResponseSource) {
      networkRequest.setServiceWorkerResponseSource(response.serviceWorkerResponseSource);
    }

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

    if (MIME_TYPE_TO_RESOURCE_TYPE.has(networkRequest.mimeType)) {
      return resourceType.name() in MIME_TYPE_TO_RESOURCE_TYPE.get(networkRequest.mimeType);
    }

    return false;
  }

  /**
   * @override
   * @param {!Protocol.Network.ResourceChangedPriorityEvent} request
   */
  resourceChangedPriority({requestId, newPriority, timestamp}) {
    const networkRequest = this._inflightRequestsById.get(requestId);
    if (networkRequest) {
      networkRequest.setPriority(newPriority);
    }
  }

  /**
   * @override
   * @param {!Protocol.Network.SignedExchangeReceivedEvent} request
   */
  signedExchangeReceived({requestId, info}) {
    // While loading a signed exchange, a signedExchangeReceived event is sent
    // between two requestWillBeSent events.
    // 1. The first requestWillBeSent is sent while starting the navigation (or
    //    prefetching).
    // 2. This signedExchangeReceived event is sent when the browser detects the
    //    signed exchange.
    // 3. The second requestWillBeSent is sent with the generated redirect
    //    response and a new redirected request which URL is the inner request
    //    URL of the signed exchange.
    let networkRequest = this._inflightRequestsById.get(requestId);
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
    this._manager.dispatchEventToListeners(
        Events.ResponseReceived, {request: networkRequest, response: info.outerResponse});
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestWillBeSentEvent} request
   */
  requestWillBeSent(
      {requestId, loaderId, documentURL, request, timestamp, wallTime, initiator, redirectResponse, type, frameId}) {
    let networkRequest = this._inflightRequestsById.get(requestId);
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
        this.responseReceived({
          requestId,
          loaderId,
          timestamp,
          type: type || Protocol.Network.ResourceType.Other,
          response: redirectResponse,
          frameId
        });
      }
      networkRequest = this._appendRedirect(requestId, timestamp, request.url);
      this._manager.dispatchEventToListeners(Events.RequestRedirected, networkRequest);
    } else {
      networkRequest =
          this._createNetworkRequest(requestId, frameId || '', loaderId, request.url, documentURL, initiator);
    }
    networkRequest.hasNetworkData = true;
    this._updateNetworkRequestWithRequest(networkRequest, request);
    networkRequest.setIssueTime(timestamp, wallTime);
    networkRequest.setResourceType(
        type ? Common.ResourceType.resourceTypes[type] : Common.ResourceType.resourceTypes.Other);

    this._getExtraInfoBuilder(requestId).addRequest(networkRequest);

    this._startNetworkRequest(networkRequest, request);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestServedFromCacheEvent} request
   */
  requestServedFromCache({requestId}) {
    const networkRequest = this._inflightRequestsById.get(requestId);
    if (!networkRequest) {
      return;
    }

    networkRequest.setFromMemoryCache();
  }

  /**
   * @override
   * @param {!Protocol.Network.ResponseReceivedEvent} request
   */
  responseReceived({requestId, loaderId, timestamp, type, response, frameId}) {
    const networkRequest = this._inflightRequestsById.get(requestId);
    const lowercaseHeaders = NetworkManager.lowercaseHeaders(response.headers);
    if (!networkRequest) {
      const lastModifiedHeader = lowercaseHeaders['last-modified'];
      // We missed the requestWillBeSent.
      /** @type {!RequestUpdateDroppedEventData} */
      const eventData = {
        url: response.url,
        frameId: frameId || '',
        loaderId: loaderId,
        resourceType: type,
        mimeType: response.mimeType,
        lastModified: lastModifiedHeader ? new Date(lastModifiedHeader) : null,
      };
      this._manager.dispatchEventToListeners(Events.RequestUpdateDropped, eventData);
      return;
    }

    networkRequest.responseReceivedTime = timestamp;
    networkRequest.setResourceType(Common.ResourceType.resourceTypes[type]);

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
    this._manager.dispatchEventToListeners(Events.ResponseReceived, {request: networkRequest, response});
  }

  /**
   * @override
   * @param {!Protocol.Network.DataReceivedEvent} request
   */
  dataReceived({requestId, timestamp, dataLength, encodedDataLength}) {
    /** @type {?(!NetworkRequest|undefined)} */
    let networkRequest = this._inflightRequestsById.get(requestId);
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
    networkRequest.endTime = timestamp;

    this._updateNetworkRequest(networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.LoadingFinishedEvent} request
   */
  loadingFinished({requestId, timestamp: finishTime, encodedDataLength, shouldReportCorbBlocking}) {
    /** @type {?(!NetworkRequest|undefined)} */
    let networkRequest = this._inflightRequestsById.get(requestId);
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
   * @param {!Protocol.Network.LoadingFailedEvent} request
   */
  loadingFailed(
      {requestId, timestamp: time, type: resourceType, errorText: localizedDescription, canceled, blockedReason}) {
    const networkRequest = this._inflightRequestsById.get(requestId);
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
   * @param {!Protocol.Network.WebSocketCreatedEvent} request
   */
  webSocketCreated({requestId, url: requestURL, initiator}) {
    const networkRequest = new NetworkRequest(requestId, requestURL, '', '', '', initiator || null);
    requestToManagerMap.set(networkRequest, this._manager);
    networkRequest.setResourceType(Common.ResourceType.resourceTypes.WebSocket);
    this._startNetworkRequest(networkRequest, null);
  }

  /**
   * @override
   * @param {!Protocol.Network.WebSocketWillSendHandshakeRequestEvent} request
   */
  webSocketWillSendHandshakeRequest({requestId, timestamp: time, wallTime, request}) {
    const networkRequest = this._inflightRequestsById.get(requestId);
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
   * @param {!Protocol.Network.WebSocketHandshakeResponseReceivedEvent} request
   */
  webSocketHandshakeResponseReceived({requestId, timestamp: time, response}) {
    const networkRequest = this._inflightRequestsById.get(requestId);
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
   * @param {!Protocol.Network.WebSocketFrameReceivedEvent} request
   */
  webSocketFrameReceived({requestId, timestamp: time, response}) {
    const networkRequest = this._inflightRequestsById.get(requestId);
    if (!networkRequest) {
      return;
    }

    networkRequest.addProtocolFrame(response, time, false);
    networkRequest.responseReceivedTime = time;

    this._updateNetworkRequest(networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.WebSocketFrameSentEvent} request
   */
  webSocketFrameSent({requestId, timestamp: time, response}) {
    const networkRequest = this._inflightRequestsById.get(requestId);
    if (!networkRequest) {
      return;
    }

    networkRequest.addProtocolFrame(response, time, true);
    networkRequest.responseReceivedTime = time;

    this._updateNetworkRequest(networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.WebSocketFrameErrorEvent} request
   */
  webSocketFrameError({requestId, timestamp: time, errorMessage}) {
    const networkRequest = this._inflightRequestsById.get(requestId);
    if (!networkRequest) {
      return;
    }

    networkRequest.addProtocolFrameError(errorMessage, time);
    networkRequest.responseReceivedTime = time;

    this._updateNetworkRequest(networkRequest);
  }

  /**
   * @override
   * @param {!Protocol.Network.WebSocketClosedEvent} request
   */
  webSocketClosed({requestId, timestamp: time}) {
    const networkRequest = this._inflightRequestsById.get(requestId);
    if (!networkRequest) {
      return;
    }
    this._finishNetworkRequest(networkRequest, time, -1);
  }

  /**
   * @override
   * @param {!Protocol.Network.EventSourceMessageReceivedEvent} request
   */
  eventSourceMessageReceived({requestId, timestamp: time, eventName, eventId, data}) {
    const networkRequest = this._inflightRequestsById.get(requestId);
    if (!networkRequest) {
      return;
    }
    networkRequest.addEventSourceMessage(time, eventName, eventId, data);
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestInterceptedEvent} request
   */
  requestIntercepted({
    interceptionId,
    request,
    frameId,
    resourceType,
    isNavigationRequest,
    isDownload,
    redirectUrl,
    authChallenge,
    responseErrorReason,
    responseStatusCode,
    responseHeaders,
    requestId
  }) {
    MultitargetNetworkManager.instance()._requestIntercepted(new InterceptedRequest(
        this._manager.target().networkAgent(), interceptionId, request, frameId, resourceType, isNavigationRequest,
        isDownload, redirectUrl, authChallenge, responseErrorReason, responseStatusCode, responseHeaders, requestId));
  }

  /**
   * @override
   * @param {!Protocol.Network.RequestWillBeSentExtraInfoEvent} request
   */
  requestWillBeSentExtraInfo({requestId, associatedCookies, headers}) {
    /** @type {!Array<!BlockedCookieWithReason>} */
    const blockedRequestCookies = [];
    const includedRequestCookies = [];
    for (const {blockedReasons, cookie} of associatedCookies) {
      if (blockedReasons.length === 0) {
        includedRequestCookies.push(Cookie.fromProtocolCookie(cookie));
      } else {
        blockedRequestCookies.push({blockedReasons, cookie: Cookie.fromProtocolCookie(cookie)});
      }
    }
    const extraRequestInfo = {
      blockedRequestCookies,
      includedRequestCookies,
      requestHeaders: this._headersMapToHeadersArray(headers)
    };
    this._getExtraInfoBuilder(requestId).addRequestExtraInfo(extraRequestInfo);
  }

  /**
   * @override
   * @param {!Protocol.Network.ResponseReceivedExtraInfoEvent} request
   */
  responseReceivedExtraInfo({requestId, blockedCookies, headers, headersText}) {
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
   * @param {string} requestId
   * @return {!RedirectExtraInfoBuilder}
   */
  _getExtraInfoBuilder(requestId) {
    /** @type {!RedirectExtraInfoBuilder} */
    let builder;
    if (!this._requestIdToRedirectExtraInfoBuilder.has(requestId)) {
      const deleteCallback = () => {
        this._requestIdToRedirectExtraInfoBuilder.delete(requestId);
      };
      builder = new RedirectExtraInfoBuilder(deleteCallback);
      this._requestIdToRedirectExtraInfoBuilder.set(requestId, builder);
    } else {
      builder = /** @type {!RedirectExtraInfoBuilder} */ (this._requestIdToRedirectExtraInfoBuilder.get(requestId));
    }
    return builder;
  }

  /**
   * @param {!Protocol.Network.RequestId} requestId
   * @param {!Protocol.Network.MonotonicTime} time
   * @param {string} redirectURL
   * @return {!NetworkRequest}
   */
  _appendRedirect(requestId, time, redirectURL) {
    const originalNetworkRequest = this._inflightRequestsById.get(requestId);
    if (!originalNetworkRequest) {
      throw new Error(`Could not find original network request for ${requestId}`);
    }
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
    const request = MultitargetNetworkManager.instance()._inflightMainResourceRequests.get(requestId);
    if (!request) {
      return null;
    }
    const oldDispatcher = /** @type {!NetworkManager} */ (NetworkManager.forRequest(request))._dispatcher;
    oldDispatcher._inflightRequestsById.delete(requestId);
    delete oldDispatcher._inflightRequestsByURL[request.url()];
    this._inflightRequestsById.set(requestId, request);
    this._inflightRequestsByURL[request.url()] = request;
    requestToManagerMap.set(request, this._manager);
    return request;
  }

  /**
   * @param {!NetworkRequest} networkRequest
   * @param {?Protocol.Network.Request} originalRequest
   */
  _startNetworkRequest(networkRequest, originalRequest) {
    this._inflightRequestsById.set(networkRequest.requestId(), networkRequest);
    this._inflightRequestsByURL[networkRequest.url()] = networkRequest;
    // The following relies on the fact that loaderIds and requestIds are
    // globally unique and that the main request has them equal.
    if (networkRequest.loaderId === networkRequest.requestId()) {
      MultitargetNetworkManager.instance()._inflightMainResourceRequests.set(
          networkRequest.requestId(), networkRequest);
    }

    this._manager.dispatchEventToListeners(Events.RequestStarted, {request: networkRequest, originalRequest});
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
    this._inflightRequestsById.delete(networkRequest.requestId());
    delete this._inflightRequestsByURL[networkRequest.url()];
    MultitargetNetworkManager.instance()._inflightMainResourceRequests.delete(networkRequest.requestId());

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
    requestToManagerMap.set(request, this._manager);
    return request;
  }
}

/**
 * @type {?MultitargetNetworkManager}
 */
let multiTargetNetworkManagerInstance;

/**
 * @implements {SDKModelObserver<!NetworkManager>}
 * @unrestricted
 */
export class MultitargetNetworkManager extends Common.ObjectWrapper.ObjectWrapper {
  constructor() {
    super();
    /** @type {string} */
    this._userAgentOverride = '';
    /** @type {?Protocol.Emulation.UserAgentMetadata} */
    this._userAgentMetadataOverride = null;
    /** @type {!Set<!ProtocolProxyApi.NetworkApi>} */
    this._agents = new Set();
    /** @type {!Map<string, !NetworkRequest>} */
    this._inflightMainResourceRequests = new Map();
    /** @type {!Conditions} */
    this._networkConditions = NoThrottlingConditions;
    /** @type {?Promise<void>} */
    this._updatingInterceptionPatternsPromise = null;

    // TODO(allada) Remove these and merge it with request interception.
    this._blockingEnabledSetting = Common.Settings.Settings.instance().moduleSetting('requestBlockingEnabled');
    this._blockedPatternsSetting = Common.Settings.Settings.instance().createSetting('networkBlockedPatterns', []);
    /** @type {!Array<string>} */
    this._effectiveBlockedURLs = [];
    this._updateBlockedPatterns();

    /** @type {!Platform.Multimap<!RequestInterceptor, !InterceptionPattern>} */
    this._urlsForRequestInterceptor = new Platform.Multimap();

    TargetManager.instance().observeModels(NetworkManager, this);
  }

  /**
   * @param {{forceNew: ?boolean}} opts
   * @return {!MultitargetNetworkManager}
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!multiTargetNetworkManagerInstance || forceNew) {
      multiTargetNetworkManagerInstance = new MultitargetNetworkManager();
    }

    return multiTargetNetworkManagerInstance;
  }

  /**
   * @return {string}
   */
  static getChromeVersion() {
    const chromeRegex = new RegExp('(?:^|\\W)Chrome/(\\S+)');
    const chromeMatch = navigator.userAgent.match(chromeRegex);
    if (chromeMatch && chromeMatch.length > 1) {
      return chromeMatch[1];
    }
    return '';
  }


  /**
    * Generate a brand version list for Chrome, including some randomization
    * to try to ensure proper parsing behavior. See
    *
    * https://wicg.github.io/ua-client-hints/#grease
    *
    * This implementation matches GenerateBrandVersionList() in
    * chrome_content_browser_client.cc
    * @param {number} seed
    * @param {string} brand
    * @param {string} majorVersion
    *
    * @return {!Array<!Protocol.Emulation.UserAgentBrandVersion>}
    */
  static _generateBrandVersionList(seed, brand, majorVersion) {
    // Pick a stable permutation seeded by major version number. any values here
    // and in order should be under three.
    const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    const permutation = seed % orders.length;
    const order = orders[permutation];

    const escapedChars = ['\\', '\"', ';'];
    const greaseyBrand =
        escapedChars[order[0]] + 'Not' + escapedChars[order[1]] + 'A' + escapedChars[order[2]] + 'Brand';

    const greasey = {brand: greaseyBrand, version: '99'};
    const chromium = {brand: 'Chromium', version: majorVersion};
    const branded = {brand: brand, version: majorVersion};

    const greasedBrandVersionList = /** @type {!Array<!Protocol.Emulation.UserAgentBrandVersion>} */ ([]);
    greasedBrandVersionList[order[0]] = greasey;
    greasedBrandVersionList[order[1]] = chromium;
    greasedBrandVersionList[order[2]] = branded;
    return greasedBrandVersionList;
  }

  /**
   * @return {!Array<!Protocol.Emulation.UserAgentBrandVersion>}
   */
  static getChromeBrands() {
    const chromeVersion = MultitargetNetworkManager.getChromeVersion();
    if (chromeVersion.length > 0) {
      const majorVersion = chromeVersion.split('.', 1)[0];
      return MultitargetNetworkManager._generateBrandVersionList(
          Number.parseInt(majorVersion, 10), 'Google Chrome', majorVersion);
    }
    return [];
  }

  /**
   * @param {string} uaString
   * @return {string}
   */
  static patchUserAgentWithChromeVersion(uaString) {
    // Patches Chrome/CriOS version from user agent ("1.2.3.4" when user agent is: "Chrome/1.2.3.4").
    // Edge also contains an appVersion which should be patched to match the Chrome major version.
    // Otherwise, ignore it. This assumes additional appVersions appear after the Chrome version.
    const chromeVersion = MultitargetNetworkManager.getChromeVersion();
    if (chromeVersion.length > 0) {
      // "1.2.3.4" becomes "1.0.100.0"
      const additionalAppVersion = chromeVersion.split('.', 1)[0] + '.0.100.0';
      return Platform.StringUtilities.sprintf(uaString, chromeVersion, additionalAppVersion);
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
      networkAgent.invoke_setExtraHTTPHeaders({headers: this._extraHeaders});
    }
    if (this.currentUserAgent()) {
      networkAgent.invoke_setUserAgentOverride(
          {userAgent: this.currentUserAgent(), userAgentMetadata: this._userAgentMetadataOverride || undefined});
    }
    if (this._effectiveBlockedURLs.length) {
      networkAgent.invoke_setBlockedURLs({urls: this._effectiveBlockedURLs});
    }
    if (this.isIntercepting()) {
      networkAgent.invoke_setRequestInterception({patterns: this._urlsForRequestInterceptor.valuesArray()});
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
   * @param {!ProtocolProxyApi.NetworkApi} networkAgent
   */
  _updateNetworkConditions(networkAgent) {
    const conditions = this._networkConditions;
    if (!this.isThrottling()) {
      networkAgent.invoke_emulateNetworkConditions(
          {offline: false, latency: 0, downloadThroughput: 0, uploadThroughput: 0});
    } else {
      networkAgent.invoke_emulateNetworkConditions({
        offline: this.isOffline(),
        latency: conditions.latency,
        downloadThroughput: conditions.download < 0 ? 0 : conditions.download,
        uploadThroughput: conditions.upload < 0 ? 0 : conditions.upload,
        connectionType: NetworkManager._connectionType(conditions)
      });
    }
  }

  /**
   * @param {!Protocol.Network.Headers} headers
   */
  setExtraHTTPHeaders(headers) {
    this._extraHeaders = headers;
    for (const agent of this._agents) {
      agent.invoke_setExtraHTTPHeaders({headers: this._extraHeaders});
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
      agent.invoke_setUserAgentOverride(
          {userAgent: userAgent, userAgentMetadata: this._userAgentMetadataOverride || undefined});
    }
  }

  /**
   * @param {string} userAgent
   * @param {?Protocol.Emulation.UserAgentMetadata} userAgentMetadataOverride
   */
  setUserAgentOverride(userAgent, userAgentMetadataOverride) {
    if (this._userAgentOverride === userAgent) {
      return;
    }
    this._userAgentOverride = userAgent;
    if (!this._customUserAgent) {
      this._userAgentMetadataOverride = userAgentMetadataOverride;
      this._updateUserAgentOverride();
    } else {
      this._userAgentMetadataOverride = null;
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
    this._userAgentMetadataOverride = null;
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
      agent.invoke_setBlockedURLs({urls: this._effectiveBlockedURLs});
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
   * @return {!Promise<void>}
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
   * @return {!Promise<void>}
   */
  _updateInterceptionPatternsOnNextTick() {
    // This is used so we can register and unregister patterns in loops without sending lots of protocol messages.
    if (!this._updatingInterceptionPatternsPromise) {
      this._updatingInterceptionPatternsPromise = Promise.resolve().then(this._updateInterceptionPatterns.bind(this));
    }
    return this._updatingInterceptionPatternsPromise;
  }

  /**
   * @return {!Promise<void>}
   */
  _updateInterceptionPatterns() {
    if (!Common.Settings.Settings.instance().moduleSetting('cacheDisabled').get()) {
      Common.Settings.Settings.instance().moduleSetting('cacheDisabled').set(true);
    }
    this._updatingInterceptionPatternsPromise = null;
    const promises = /** @type {!Array<!Promise<*>>} */ ([]);
    for (const agent of this._agents) {
      promises.push(agent.invoke_setRequestInterception({patterns: this._urlsForRequestInterceptor.valuesArray()}));
    }
    this.dispatchEventToListeners(MultitargetNetworkManager.Events.InterceptorsChanged);
    return Promise.all(promises).then(values => Promise.resolve());
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
      agent.invoke_clearBrowserCache();
    }
  }

  clearBrowserCookies() {
    for (const agent of this._agents) {
      agent.invoke_clearBrowserCookies();
    }
  }

  /**
   * @param {string} origin
   * @return {!Promise<!Array<string>>}
   */
  getCertificate(origin) {
    const target = TargetManager.instance().mainTarget();
    if (!target) {
      return Promise.resolve([]);
    }
    return target.networkAgent().invoke_getCertificate({origin}).then(
        certificate => (certificate && certificate.tableNames) || []);
  }

  /**
   * @param {string} url
   * @return {!Promise<!{success: boolean, content: string, errorDescription: !Host.ResourceLoader.LoadErrorDescription}>}
   */
  async loadResource(url) {
    /** @type {!Object<string, string>} */
    const headers = {};

    const currentUserAgent = this.currentUserAgent();
    if (currentUserAgent) {
      headers['User-Agent'] = currentUserAgent;
    }

    if (Common.Settings.Settings.instance().moduleSetting('cacheDisabled').get()) {
      headers['Cache-Control'] = 'no-cache';
    }

    return new Promise(
        resolve => Host.ResourceLoader.load(url, headers, (success, _responseHeaders, content, errorDescription) => {
          resolve({success, content, errorDescription});
        }));
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
   * @param {!ProtocolProxyApi.NetworkApi} networkAgent
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
    this._networkAgent.invoke_continueInterceptedRequest(
        {interceptionId: this._interceptionId, rawResponse: encodedResponse});

    /**
     * @param {!Blob} blob
     * @return {!Promise<string>}
     */
    async function blobToBase64(blob) {
      const reader = new FileReader();
      const fileContentsLoadedPromise = new Promise(resolve => {
        reader.onloadend = resolve;
      });
      reader.readAsDataURL(blob);
      await fileContentsLoadedPromise;
      if (reader.error) {
        console.error('Could not convert blob to base64.', reader.error);
        return '';
      }
      const result = reader.result;
      if (result === undefined || result === null || typeof result !== 'string') {
        console.error('Could not convert blob to base64.');
        return '';
      }
      return result.substring(result.indexOf(',') + 1);
    }
  }

  continueRequestWithoutChange() {
    console.assert(!this._hasResponded);
    this._hasResponded = true;
    this._networkAgent.invoke_continueInterceptedRequest({interceptionId: this._interceptionId});
  }

  /**
   * @param {!Protocol.Network.ErrorReason} errorReason
   */
  continueRequestWithError(errorReason) {
    console.assert(!this._hasResponded);
    this._hasResponded = true;
    this._networkAgent.invoke_continueInterceptedRequest({interceptionId: this._interceptionId, errorReason});
  }

  /**
   * @return {!Promise<!ContentData>}
   */
  async responseBody() {
    const response =
        await this._networkAgent.invoke_getResponseBodyForInterception({interceptionId: this._interceptionId});
    const error = response.getError() || null;
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
   * @param {function():void} deleteCallback
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
    /** @type {function():void} */
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
      const lastItem = this._requests.peekLast();
      if (lastItem && !lastItem.hasExtraResponseInfo()) {
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
// @ts-ignore typedef
export let Conditions;

/** @typedef {{url: string, enabled: boolean}} */
// @ts-ignore typedef
export let BlockedPattern;

/** @typedef {{message: string, requestId: string, warning: boolean}} */
// @ts-ignore typedef
export let Message;

/** @typedef {!{urlPattern: string, interceptionStage: !Protocol.Network.InterceptionStage}} */
// @ts-ignore typedef
export let InterceptionPattern;

/** @typedef {!function(!InterceptedRequest):!Promise<void>} */
// @ts-ignore typedef
export let RequestInterceptor;

/** @typedef {!{url: string, frameId: string, loaderId: string, resourceType: Protocol.Network.ResourceType, mimeType: string, lastModified: ?Date}} */
// @ts-ignore typedef
export let RequestUpdateDroppedEventData;

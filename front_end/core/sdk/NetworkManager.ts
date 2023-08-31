// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
 *     * Neither the #name of Google Inc. nor the names of its
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

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Common from '../common/common.js';
import {type Serializer} from '../common/Settings.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';

import {Cookie} from './Cookie.js';
import {
  type BlockedCookieWithReason,
  type ContentData,
  Events as NetworkRequestEvents,
  type ExtraRequestInfo,
  type ExtraResponseInfo,
  type MIME_TYPE,
  type NameValue,
  NetworkRequest,
  type WebBundleInfo,
  type WebBundleInnerRequestInfo,
} from './NetworkRequest.js';
import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';
import {type SDKModelObserver, TargetManager} from './TargetManager.js';

const UIStrings = {
  /**
   *@description Explanation why no content is shown for WebSocket connection.
   */
  noContentForWebSocket: 'Content for WebSockets is currently not supported',
  /**
   *@description Explanation why no content is shown for redirect response.
   */
  noContentForRedirect: 'No content available because this request was redirected',
  /**
   *@description Explanation why no content is shown for preflight request.
   */
  noContentForPreflight: 'No content available for preflight request',
  /**
   *@description Text to indicate that network throttling is disabled
   */
  noThrottling: 'No throttling',
  /**
   *@description Text to indicate the network connectivity is offline
   */
  offline: 'Offline',
  /**
   *@description Text in Network Manager
   */
  slowG: 'Slow 3G',
  /**
   *@description Text in Network Manager
   */
  fastG: 'Fast 3G',
  /**
   *@description Text in Network Manager
   *@example {https://example.com} PH1
   */
  requestWasBlockedByDevtoolsS: 'Request was blocked by DevTools: "{PH1}"',
  /**
   *@description Message in Network Manager
   *@example {XHR} PH1
   *@example {GET} PH2
   *@example {https://example.com} PH3
   */
  sFailedLoadingSS: '{PH1} failed loading: {PH2} "{PH3}".',
  /**
   *@description Message in Network Manager
   *@example {XHR} PH1
   *@example {GET} PH2
   *@example {https://example.com} PH3
   */
  sFinishedLoadingSS: '{PH1} finished loading: {PH2} "{PH3}".',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/NetworkManager.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

const requestToManagerMap = new WeakMap<NetworkRequest, NetworkManager>();

const CONNECTION_TYPES = new Map([
  ['2g', Protocol.Network.ConnectionType.Cellular2g],
  ['3g', Protocol.Network.ConnectionType.Cellular3g],
  ['4g', Protocol.Network.ConnectionType.Cellular4g],
  ['bluetooth', Protocol.Network.ConnectionType.Bluetooth],
  ['wifi', Protocol.Network.ConnectionType.Wifi],
  ['wimax', Protocol.Network.ConnectionType.Wimax],
]);

export class NetworkManager extends SDKModel<EventTypes> {
  readonly dispatcher: NetworkDispatcher;
  readonly fetchDispatcher: FetchDispatcher;
  readonly #networkAgent: ProtocolProxyApi.NetworkApi;
  readonly #bypassServiceWorkerSetting: Common.Settings.Setting<boolean>;

  constructor(target: Target) {
    super(target);
    this.dispatcher = new NetworkDispatcher(this);
    this.fetchDispatcher = new FetchDispatcher(target.fetchAgent(), this);
    this.#networkAgent = target.networkAgent();
    target.registerNetworkDispatcher(this.dispatcher);
    target.registerFetchDispatcher(this.fetchDispatcher);
    if (Common.Settings.Settings.instance().moduleSetting('cacheDisabled').get()) {
      void this.#networkAgent.invoke_setCacheDisabled({cacheDisabled: true});
    }

    void this.#networkAgent.invoke_enable({maxPostDataSize: MAX_EAGER_POST_REQUEST_BODY_LENGTH});
    void this.#networkAgent.invoke_setAttachDebugStack({enabled: true});

    this.#bypassServiceWorkerSetting = Common.Settings.Settings.instance().createSetting('bypassServiceWorker', false);
    if (this.#bypassServiceWorkerSetting.get()) {
      this.bypassServiceWorkerChanged();
    }
    this.#bypassServiceWorkerSetting.addChangeListener(this.bypassServiceWorkerChanged, this);

    Common.Settings.Settings.instance()
        .moduleSetting('cacheDisabled')
        .addChangeListener(this.cacheDisabledSettingChanged, this);
  }

  static forRequest(request: NetworkRequest): NetworkManager|null {
    return requestToManagerMap.get(request) || null;
  }

  static canReplayRequest(request: NetworkRequest): boolean {
    return Boolean(requestToManagerMap.get(request)) && Boolean(request.backendRequestId()) && !request.isRedirect() &&
        request.resourceType() === Common.ResourceType.resourceTypes.XHR;
  }

  static replayRequest(request: NetworkRequest): void {
    const manager = requestToManagerMap.get(request);
    const requestId = request.backendRequestId();
    if (!manager || !requestId || request.isRedirect()) {
      return;
    }
    void manager.#networkAgent.invoke_replayXHR({requestId});
  }

  static async searchInRequest(request: NetworkRequest, query: string, caseSensitive: boolean, isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]> {
    const manager = NetworkManager.forRequest(request);
    const requestId = request.backendRequestId();
    if (!manager || !requestId || request.isRedirect()) {
      return [];
    }
    const response = await manager.#networkAgent.invoke_searchInResponseBody(
        {requestId, query: query, caseSensitive: caseSensitive, isRegex: isRegex});
    return TextUtils.TextUtils.performSearchInSearchMatches(response.result || [], query, caseSensitive, isRegex);
  }

  static async requestContentData(request: NetworkRequest): Promise<ContentData> {
    if (request.resourceType() === Common.ResourceType.resourceTypes.WebSocket) {
      return {error: i18nString(UIStrings.noContentForWebSocket), content: null, encoded: false};
    }
    if (!request.finished) {
      await request.once(NetworkRequestEvents.FinishedLoading);
    }
    if (request.isRedirect()) {
      return {error: i18nString(UIStrings.noContentForRedirect), content: null, encoded: false};
    }
    if (request.isPreflightRequest()) {
      return {error: i18nString(UIStrings.noContentForPreflight), content: null, encoded: false};
    }
    const manager = NetworkManager.forRequest(request);
    if (!manager) {
      return {error: 'No network manager for request', content: null, encoded: false};
    }
    const requestId = request.backendRequestId();
    if (!requestId) {
      return {error: 'No backend request id for request', content: null, encoded: false};
    }
    const response = await manager.#networkAgent.invoke_getResponseBody({requestId});
    const error = response.getError() || null;
    return {error: error, content: error ? null : response.body, encoded: response.base64Encoded};
  }

  static async requestPostData(request: NetworkRequest): Promise<string|null> {
    const manager = NetworkManager.forRequest(request);
    if (!manager) {
      console.error('No network manager for request');
      return null;
    }
    const requestId = request.backendRequestId();
    if (!requestId) {
      console.error('No backend request id for request');
      return null;
    }
    try {
      const {postData} = await manager.#networkAgent.invoke_getRequestPostData({requestId});
      return postData;
    } catch (e) {
      return e.message;
    }
  }

  static connectionType(conditions: Conditions): Protocol.Network.ConnectionType {
    if (!conditions.download && !conditions.upload) {
      return Protocol.Network.ConnectionType.None;
    }
    const title =
        typeof conditions.title === 'function' ? conditions.title().toLowerCase() : conditions.title.toLowerCase();
    for (const [name, protocolType] of CONNECTION_TYPES) {
      if (title.includes(name)) {
        return protocolType;
      }
    }
    return Protocol.Network.ConnectionType.Other;
  }

  static lowercaseHeaders(headers: Protocol.Network.Headers): Protocol.Network.Headers {
    const newHeaders: Protocol.Network.Headers = {};
    for (const headerName in headers) {
      newHeaders[headerName.toLowerCase()] = headers[headerName];
    }
    return newHeaders;
  }

  requestForURL(url: Platform.DevToolsPath.UrlString): NetworkRequest|null {
    return this.dispatcher.requestForURL(url);
  }

  requestForId(id: string): NetworkRequest|null {
    return this.dispatcher.requestForId(id);
  }

  requestForLoaderId(loaderId: Protocol.Network.LoaderId): NetworkRequest|null {
    return this.dispatcher.requestForLoaderId(loaderId);
  }

  private cacheDisabledSettingChanged({data: enabled}: Common.EventTarget.EventTargetEvent<boolean>): void {
    void this.#networkAgent.invoke_setCacheDisabled({cacheDisabled: enabled});
  }

  override dispose(): void {
    Common.Settings.Settings.instance()
        .moduleSetting('cacheDisabled')
        .removeChangeListener(this.cacheDisabledSettingChanged, this);
  }

  private bypassServiceWorkerChanged(): void {
    void this.#networkAgent.invoke_setBypassServiceWorker({bypass: this.#bypassServiceWorkerSetting.get()});
  }

  async getSecurityIsolationStatus(frameId: Protocol.Page.FrameId|
                                   null): Promise<Protocol.Network.SecurityIsolationStatus|null> {
    const result = await this.#networkAgent.invoke_getSecurityIsolationStatus({frameId: frameId ?? undefined});
    if (result.getError()) {
      return null;
    }
    return result.status;
  }

  async enableReportingApi(enable: boolean = true): Promise<Promise<Protocol.ProtocolResponseWithError>> {
    return this.#networkAgent.invoke_enableReportingApi({enable});
  }

  async loadNetworkResource(
      frameId: Protocol.Page.FrameId|null, url: Platform.DevToolsPath.UrlString,
      options: Protocol.Network.LoadNetworkResourceOptions): Promise<Protocol.Network.LoadNetworkResourcePageResult> {
    const result = await this.#networkAgent.invoke_loadNetworkResource({frameId: frameId ?? undefined, url, options});
    if (result.getError()) {
      throw new Error(result.getError());
    }
    return result.resource;
  }

  clearRequests(): void {
    this.dispatcher.clearRequests();
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  RequestStarted = 'RequestStarted',
  RequestUpdated = 'RequestUpdated',
  RequestFinished = 'RequestFinished',
  RequestUpdateDropped = 'RequestUpdateDropped',
  ResponseReceived = 'ResponseReceived',
  MessageGenerated = 'MessageGenerated',
  RequestRedirected = 'RequestRedirected',
  LoadingFinished = 'LoadingFinished',
  ReportingApiReportAdded = 'ReportingApiReportAdded',
  ReportingApiReportUpdated = 'ReportingApiReportUpdated',
  ReportingApiEndpointsChangedForOrigin = 'ReportingApiEndpointsChangedForOrigin',
}

export interface RequestStartedEvent {
  request: NetworkRequest;
  originalRequest: Protocol.Network.Request|null;
}

export interface ResponseReceivedEvent {
  request: NetworkRequest;
  response: Protocol.Network.Response;
}

export interface MessageGeneratedEvent {
  message: Common.UIString.LocalizedString;
  requestId: string;
  warning: boolean;
}

export type EventTypes = {
  [Events.RequestStarted]: RequestStartedEvent,
  [Events.RequestUpdated]: NetworkRequest,
  [Events.RequestFinished]: NetworkRequest,
  [Events.RequestUpdateDropped]: RequestUpdateDroppedEventData,
  [Events.ResponseReceived]: ResponseReceivedEvent,
  [Events.MessageGenerated]: MessageGeneratedEvent,
  [Events.RequestRedirected]: NetworkRequest,
  [Events.LoadingFinished]: NetworkRequest,
  [Events.ReportingApiReportAdded]: Protocol.Network.ReportingApiReport,
  [Events.ReportingApiReportUpdated]: Protocol.Network.ReportingApiReport,
  [Events.ReportingApiEndpointsChangedForOrigin]: Protocol.Network.ReportingApiEndpointsChangedForOriginEvent,
};

export const NoThrottlingConditions: Conditions = {
  title: i18nLazyString(UIStrings.noThrottling),
  i18nTitleKey: UIStrings.noThrottling,
  download: -1,
  upload: -1,
  latency: 0,
};

export const OfflineConditions: Conditions = {
  title: i18nLazyString(UIStrings.offline),
  i18nTitleKey: UIStrings.offline,
  download: 0,
  upload: 0,
  latency: 0,
};

export const Slow3GConditions: Conditions = {
  title: i18nLazyString(UIStrings.slowG),
  i18nTitleKey: UIStrings.slowG,
  download: 500 * 1000 / 8 * .8,
  upload: 500 * 1000 / 8 * .8,
  latency: 400 * 5,
};

export const Fast3GConditions: Conditions = {
  title: i18nLazyString(UIStrings.fastG),
  i18nTitleKey: UIStrings.fastG,
  download: 1.6 * 1000 * 1000 / 8 * .9,
  upload: 750 * 1000 / 8 * .9,
  latency: 150 * 3.75,
};

const MAX_EAGER_POST_REQUEST_BODY_LENGTH = 64 * 1024;  // bytes

export class FetchDispatcher implements ProtocolProxyApi.FetchDispatcher {
  readonly #fetchAgent: ProtocolProxyApi.FetchApi;
  readonly #manager: NetworkManager;

  constructor(agent: ProtocolProxyApi.FetchApi, manager: NetworkManager) {
    this.#fetchAgent = agent;
    this.#manager = manager;
  }

  requestPaused({requestId, request, resourceType, responseStatusCode, responseHeaders, networkId}:
                    Protocol.Fetch.RequestPausedEvent): void {
    const networkRequest = networkId ? this.#manager.requestForId(networkId) : null;
    // If there was no 'Network.responseReceivedExtraInfo' event (e.g. for 'file:/' URLSs),
    // populate 'originalResponseHeaders' with the headers from the 'Fetch.requestPaused' event.
    if (networkRequest?.originalResponseHeaders.length === 0 && responseHeaders) {
      networkRequest.originalResponseHeaders = responseHeaders;
    }
    void MultitargetNetworkManager.instance().requestIntercepted(new InterceptedRequest(
        this.#fetchAgent, request, resourceType, requestId, networkRequest, responseStatusCode, responseHeaders));
  }

  authRequired({}: Protocol.Fetch.AuthRequiredEvent): void {
  }
}

export class NetworkDispatcher implements ProtocolProxyApi.NetworkDispatcher {
  readonly #manager: NetworkManager;
  #requestsById: Map<string, NetworkRequest>;
  #requestsByURL: Map<Platform.DevToolsPath.UrlString, NetworkRequest>;
  #requestsByLoaderId: Map<Protocol.Network.LoaderId, NetworkRequest>;
  #requestIdToExtraInfoBuilder: Map<string, ExtraInfoBuilder>;
  readonly #requestIdToTrustTokenEvent: Map<string, Protocol.Network.TrustTokenOperationDoneEvent>;
  constructor(manager: NetworkManager) {
    this.#manager = manager;
    this.#requestsById = new Map();
    this.#requestsByURL = new Map();
    this.#requestsByLoaderId = new Map();
    this.#requestIdToExtraInfoBuilder = new Map();
    /**
     * In case of an early abort or a cache hit, the Trust Token done event is
     * reported before the request itself is created in `requestWillBeSent`.
     * This causes the event to be lost as no `NetworkRequest` instance has been
     * created yet.
     * This map caches the events temporarliy and populates the NetworKRequest
     * once it is created in `requestWillBeSent`.
     */
    this.#requestIdToTrustTokenEvent = new Map();

    MultitargetNetworkManager.instance().addEventListener(
        MultitargetNetworkManager.Events.RequestIntercepted, this.#markAsIntercepted.bind(this));
  }

  #markAsIntercepted(event: Common.EventTarget.EventTargetEvent<string>): void {
    const request = this.requestForId(event.data);
    if (request) {
      request.setWasIntercepted(true);
    }
  }

  private headersMapToHeadersArray(headersMap: Protocol.Network.Headers): NameValue[] {
    const result = [];
    for (const name in headersMap) {
      const values = headersMap[name].split('\n');
      for (let i = 0; i < values.length; ++i) {
        result.push({name: name, value: values[i]});
      }
    }
    return result;
  }

  private updateNetworkRequestWithRequest(networkRequest: NetworkRequest, request: Protocol.Network.Request): void {
    networkRequest.requestMethod = request.method;
    networkRequest.setRequestHeaders(this.headersMapToHeadersArray(request.headers));
    networkRequest.setRequestFormData(Boolean(request.hasPostData), request.postData || null);
    networkRequest.setInitialPriority(request.initialPriority);
    networkRequest.mixedContentType = request.mixedContentType || Protocol.Security.MixedContentType.None;
    networkRequest.setReferrerPolicy(request.referrerPolicy);
    networkRequest.setIsSameSite(request.isSameSite || false);
  }

  private updateNetworkRequestWithResponse(networkRequest: NetworkRequest, response: Protocol.Network.Response): void {
    if (response.url && networkRequest.url() !== response.url) {
      networkRequest.setUrl(response.url as Platform.DevToolsPath.UrlString);
    }
    networkRequest.mimeType = (response.mimeType as MIME_TYPE);
    if (!networkRequest.statusCode || networkRequest.wasIntercepted()) {
      networkRequest.statusCode = response.status;
    }
    if (!networkRequest.statusText || networkRequest.wasIntercepted()) {
      networkRequest.statusText = response.statusText;
    }
    if (!networkRequest.hasExtraResponseInfo() || networkRequest.wasIntercepted()) {
      networkRequest.responseHeaders = this.headersMapToHeadersArray(response.headers);
    }

    if (response.encodedDataLength >= 0) {
      networkRequest.setTransferSize(response.encodedDataLength);
    }

    if (response.requestHeaders && !networkRequest.hasExtraRequestInfo()) {
      // TODO(http://crbug.com/1004979): Stop using response.requestHeaders and
      //   response.requestHeadersText once shared workers
      //   emit Network.*ExtraInfo events for their network #requests.
      networkRequest.setRequestHeaders(this.headersMapToHeadersArray(response.requestHeaders));
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

    networkRequest.alternateProtocolUsage = response.alternateProtocolUsage;

    if (response.serviceWorkerResponseSource) {
      networkRequest.setServiceWorkerResponseSource(response.serviceWorkerResponseSource);
    }

    networkRequest.setSecurityState(response.securityState);

    if (response.securityDetails) {
      networkRequest.setSecurityDetails(response.securityDetails);
    }

    const newResourceType = Common.ResourceType.ResourceType.fromMimeTypeOverride(networkRequest.mimeType);
    if (newResourceType) {
      networkRequest.setResourceType(newResourceType);
    }
  }

  requestForId(id: string): NetworkRequest|null {
    return this.#requestsById.get(id) || null;
  }

  requestForURL(url: Platform.DevToolsPath.UrlString): NetworkRequest|null {
    return this.#requestsByURL.get(url) || null;
  }

  requestForLoaderId(loaderId: Protocol.Network.LoaderId): NetworkRequest|null {
    return this.#requestsByLoaderId.get(loaderId) || null;
  }

  resourceChangedPriority({requestId, newPriority}: Protocol.Network.ResourceChangedPriorityEvent): void {
    const networkRequest = this.#requestsById.get(requestId);
    if (networkRequest) {
      networkRequest.setPriority(newPriority);
    }
  }

  signedExchangeReceived({requestId, info}: Protocol.Network.SignedExchangeReceivedEvent): void {
    // While loading a signed exchange, a signedExchangeReceived event is sent
    // between two requestWillBeSent events.
    // 1. The first requestWillBeSent is sent while starting the navigation (or
    //    prefetching).
    // 2. This signedExchangeReceived event is sent when the browser detects the
    //    signed exchange.
    // 3. The second requestWillBeSent is sent with the generated redirect
    //    response and a new redirected request which URL is the inner request
    //    URL of the signed exchange.
    let networkRequest = this.#requestsById.get(requestId);
    // |requestId| is available only for navigation #requests. If the request was
    // sent from a renderer process for prefetching, it is not available. In the
    // case, need to fallback to look for the URL.
    // TODO(crbug/841076): Sends the request ID of prefetching to the browser
    // process and DevTools to find the matching request.
    if (!networkRequest) {
      networkRequest = this.#requestsByURL.get(info.outerResponse.url as Platform.DevToolsPath.UrlString);
      if (!networkRequest) {
        return;
      }
    }
    networkRequest.setSignedExchangeInfo(info);
    networkRequest.setResourceType(Common.ResourceType.resourceTypes.SignedExchange);

    this.updateNetworkRequestWithResponse(networkRequest, info.outerResponse);
    this.updateNetworkRequest(networkRequest);
    this.#manager.dispatchEventToListeners(
        Events.ResponseReceived, {request: networkRequest, response: info.outerResponse});
  }

  requestWillBeSent({
    requestId,
    loaderId,
    documentURL,
    request,
    timestamp,
    wallTime,
    initiator,
    redirectResponse,
    type,
    frameId,
    hasUserGesture,
  }: Protocol.Network.RequestWillBeSentEvent): void {
    let networkRequest = this.#requestsById.get(requestId);
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
          hasExtraInfo: false,
          frameId,
        });
      }
      networkRequest = this.appendRedirect(requestId, timestamp, request.url as Platform.DevToolsPath.UrlString);
      this.#manager.dispatchEventToListeners(Events.RequestRedirected, networkRequest);
    } else {
      networkRequest = NetworkRequest.create(
          requestId, request.url as Platform.DevToolsPath.UrlString, documentURL as Platform.DevToolsPath.UrlString,
          frameId ?? null, loaderId, initiator, hasUserGesture);
      requestToManagerMap.set(networkRequest, this.#manager);
    }
    networkRequest.hasNetworkData = true;
    this.updateNetworkRequestWithRequest(networkRequest, request);
    networkRequest.setIssueTime(timestamp, wallTime);
    networkRequest.setResourceType(
        type ? Common.ResourceType.resourceTypes[type] : Common.ResourceType.resourceTypes.Other);
    if (request.trustTokenParams) {
      networkRequest.setTrustTokenParams(request.trustTokenParams);
    }
    const maybeTrustTokenEvent = this.#requestIdToTrustTokenEvent.get(requestId);
    if (maybeTrustTokenEvent) {
      networkRequest.setTrustTokenOperationDoneEvent(maybeTrustTokenEvent);
      this.#requestIdToTrustTokenEvent.delete(requestId);
    }

    this.getExtraInfoBuilder(requestId).addRequest(networkRequest);

    this.startNetworkRequest(networkRequest, request);
  }

  requestServedFromCache({requestId}: Protocol.Network.RequestServedFromCacheEvent): void {
    const networkRequest = this.#requestsById.get(requestId);
    if (!networkRequest) {
      return;
    }

    networkRequest.setFromMemoryCache();
  }

  responseReceived({requestId, loaderId, timestamp, type, response, frameId}: Protocol.Network.ResponseReceivedEvent):
      void {
    const networkRequest = this.#requestsById.get(requestId);
    const lowercaseHeaders = NetworkManager.lowercaseHeaders(response.headers);
    if (!networkRequest) {
      const lastModifiedHeader = lowercaseHeaders['last-modified'];
      // We missed the requestWillBeSent.
      const eventData: RequestUpdateDroppedEventData = {
        url: response.url as Platform.DevToolsPath.UrlString,
        frameId: frameId ?? null,
        loaderId: loaderId,
        resourceType: type,
        mimeType: response.mimeType,
        lastModified: lastModifiedHeader ? new Date(lastModifiedHeader) : null,
      };
      this.#manager.dispatchEventToListeners(Events.RequestUpdateDropped, eventData);
      return;
    }

    networkRequest.responseReceivedTime = timestamp;
    networkRequest.setResourceType(Common.ResourceType.resourceTypes[type]);

    this.updateNetworkRequestWithResponse(networkRequest, response);

    this.updateNetworkRequest(networkRequest);
    this.#manager.dispatchEventToListeners(Events.ResponseReceived, {request: networkRequest, response});
  }

  dataReceived({requestId, timestamp, dataLength, encodedDataLength}: Protocol.Network.DataReceivedEvent): void {
    let networkRequest: NetworkRequest|null|undefined = this.#requestsById.get(requestId);
    if (!networkRequest) {
      networkRequest = this.maybeAdoptMainResourceRequest(requestId);
    }
    if (!networkRequest) {
      return;
    }

    networkRequest.resourceSize += dataLength;
    if (encodedDataLength !== -1) {
      networkRequest.increaseTransferSize(encodedDataLength);
    }
    networkRequest.endTime = timestamp;

    this.updateNetworkRequest(networkRequest);
  }

  loadingFinished({requestId, timestamp: finishTime, encodedDataLength}: Protocol.Network.LoadingFinishedEvent): void {
    let networkRequest: NetworkRequest|null|undefined = this.#requestsById.get(requestId);
    if (!networkRequest) {
      networkRequest = this.maybeAdoptMainResourceRequest(requestId);
    }
    if (!networkRequest) {
      return;
    }
    this.getExtraInfoBuilder(requestId).finished();
    this.finishNetworkRequest(networkRequest, finishTime, encodedDataLength);
    this.#manager.dispatchEventToListeners(Events.LoadingFinished, networkRequest);
  }

  loadingFailed({
    requestId,
    timestamp: time,
    type: resourceType,
    errorText: localizedDescription,
    canceled,
    blockedReason,
    corsErrorStatus,
  }: Protocol.Network.LoadingFailedEvent): void {
    const networkRequest = this.#requestsById.get(requestId);
    if (!networkRequest) {
      return;
    }

    networkRequest.failed = true;
    networkRequest.setResourceType(Common.ResourceType.resourceTypes[resourceType]);
    networkRequest.canceled = Boolean(canceled);
    if (blockedReason) {
      networkRequest.setBlockedReason(blockedReason);
      if (blockedReason === Protocol.Network.BlockedReason.Inspector) {
        const message = i18nString(UIStrings.requestWasBlockedByDevtoolsS, {PH1: networkRequest.url()});
        this.#manager.dispatchEventToListeners(
            Events.MessageGenerated, {message: message, requestId: requestId, warning: true});
      }
    }
    if (corsErrorStatus) {
      networkRequest.setCorsErrorStatus(corsErrorStatus);
    }
    networkRequest.localizedFailDescription = localizedDescription;
    this.getExtraInfoBuilder(requestId).finished();
    this.finishNetworkRequest(networkRequest, time, -1);
  }

  webSocketCreated({requestId, url: requestURL, initiator}: Protocol.Network.WebSocketCreatedEvent): void {
    const networkRequest =
        NetworkRequest.createForWebSocket(requestId, requestURL as Platform.DevToolsPath.UrlString, initiator);
    requestToManagerMap.set(networkRequest, this.#manager);
    networkRequest.setResourceType(Common.ResourceType.resourceTypes.WebSocket);
    this.startNetworkRequest(networkRequest, null);
  }

  webSocketWillSendHandshakeRequest({requestId, timestamp: time, wallTime, request}:
                                        Protocol.Network.WebSocketWillSendHandshakeRequestEvent): void {
    const networkRequest = this.#requestsById.get(requestId);
    if (!networkRequest) {
      return;
    }

    networkRequest.requestMethod = 'GET';
    networkRequest.setRequestHeaders(this.headersMapToHeadersArray(request.headers));
    networkRequest.setIssueTime(time, wallTime);

    this.updateNetworkRequest(networkRequest);
  }

  webSocketHandshakeResponseReceived({requestId, timestamp: time, response}:
                                         Protocol.Network.WebSocketHandshakeResponseReceivedEvent): void {
    const networkRequest = this.#requestsById.get(requestId);
    if (!networkRequest) {
      return;
    }

    networkRequest.statusCode = response.status;
    networkRequest.statusText = response.statusText;
    networkRequest.responseHeaders = this.headersMapToHeadersArray(response.headers);
    networkRequest.responseHeadersText = response.headersText || '';
    if (response.requestHeaders) {
      networkRequest.setRequestHeaders(this.headersMapToHeadersArray(response.requestHeaders));
    }
    if (response.requestHeadersText) {
      networkRequest.setRequestHeadersText(response.requestHeadersText);
    }
    networkRequest.responseReceivedTime = time;
    networkRequest.protocol = 'websocket';

    this.updateNetworkRequest(networkRequest);
  }

  webSocketFrameReceived({requestId, timestamp: time, response}: Protocol.Network.WebSocketFrameReceivedEvent): void {
    const networkRequest = this.#requestsById.get(requestId);
    if (!networkRequest) {
      return;
    }

    networkRequest.addProtocolFrame(response, time, false);
    networkRequest.responseReceivedTime = time;

    this.updateNetworkRequest(networkRequest);
  }

  webSocketFrameSent({requestId, timestamp: time, response}: Protocol.Network.WebSocketFrameSentEvent): void {
    const networkRequest = this.#requestsById.get(requestId);
    if (!networkRequest) {
      return;
    }

    networkRequest.addProtocolFrame(response, time, true);
    networkRequest.responseReceivedTime = time;

    this.updateNetworkRequest(networkRequest);
  }

  webSocketFrameError({requestId, timestamp: time, errorMessage}: Protocol.Network.WebSocketFrameErrorEvent): void {
    const networkRequest = this.#requestsById.get(requestId);
    if (!networkRequest) {
      return;
    }

    networkRequest.addProtocolFrameError(errorMessage, time);
    networkRequest.responseReceivedTime = time;

    this.updateNetworkRequest(networkRequest);
  }

  webSocketClosed({requestId, timestamp: time}: Protocol.Network.WebSocketClosedEvent): void {
    const networkRequest = this.#requestsById.get(requestId);
    if (!networkRequest) {
      return;
    }
    this.finishNetworkRequest(networkRequest, time, -1);
  }

  eventSourceMessageReceived({requestId, timestamp: time, eventName, eventId, data}:
                                 Protocol.Network.EventSourceMessageReceivedEvent): void {
    const networkRequest = this.#requestsById.get(requestId);
    if (!networkRequest) {
      return;
    }
    networkRequest.addEventSourceMessage(time, eventName, eventId, data);
  }

  requestIntercepted({}: Protocol.Network.RequestInterceptedEvent): void {
  }

  requestWillBeSentExtraInfo(
      {requestId, associatedCookies, headers, clientSecurityState, connectTiming, siteHasCookieInOtherPartition}:
          Protocol.Network.RequestWillBeSentExtraInfoEvent): void {
    const blockedRequestCookies: BlockedCookieWithReason[] = [];
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
      requestHeaders: this.headersMapToHeadersArray(headers),
      clientSecurityState,
      connectTiming,
      siteHasCookieInOtherPartition,
    };
    this.getExtraInfoBuilder(requestId).addRequestExtraInfo(extraRequestInfo);
  }

  responseReceivedExtraInfo({
    requestId,
    blockedCookies,
    headers,
    headersText,
    resourceIPAddressSpace,
    statusCode,
    cookiePartitionKey,
    cookiePartitionKeyOpaque,
  }: Protocol.Network.ResponseReceivedExtraInfoEvent): void {
    const extraResponseInfo: ExtraResponseInfo = {
      blockedResponseCookies: blockedCookies.map(blockedCookie => {
        return {
          blockedReasons: blockedCookie.blockedReasons,
          cookieLine: blockedCookie.cookieLine,
          cookie: blockedCookie.cookie ? Cookie.fromProtocolCookie(blockedCookie.cookie) : null,
        };
      }),
      responseHeaders: this.headersMapToHeadersArray(headers),
      responseHeadersText: headersText,
      resourceIPAddressSpace,
      statusCode,
      cookiePartitionKey,
      cookiePartitionKeyOpaque,
    };
    this.getExtraInfoBuilder(requestId).addResponseExtraInfo(extraResponseInfo);
  }

  private getExtraInfoBuilder(requestId: string): ExtraInfoBuilder {
    let builder: ExtraInfoBuilder;
    if (!this.#requestIdToExtraInfoBuilder.has(requestId)) {
      builder = new ExtraInfoBuilder();
      this.#requestIdToExtraInfoBuilder.set(requestId, builder);
    } else {
      builder = (this.#requestIdToExtraInfoBuilder.get(requestId) as ExtraInfoBuilder);
    }
    return builder;
  }

  private appendRedirect(
      requestId: Protocol.Network.RequestId, time: number,
      redirectURL: Platform.DevToolsPath.UrlString): NetworkRequest {
    const originalNetworkRequest = this.#requestsById.get(requestId);
    if (!originalNetworkRequest) {
      throw new Error(`Could not find original network request for ${requestId}`);
    }
    let redirectCount = 0;
    for (let redirect = originalNetworkRequest.redirectSource(); redirect; redirect = redirect.redirectSource()) {
      redirectCount++;
    }

    originalNetworkRequest.markAsRedirect(redirectCount);
    this.finishNetworkRequest(originalNetworkRequest, time, -1);
    const newNetworkRequest = NetworkRequest.create(
        requestId, redirectURL, originalNetworkRequest.documentURL, originalNetworkRequest.frameId,
        originalNetworkRequest.loaderId, originalNetworkRequest.initiator(),
        originalNetworkRequest.hasUserGesture() ?? undefined);
    requestToManagerMap.set(newNetworkRequest, this.#manager);
    newNetworkRequest.setRedirectSource(originalNetworkRequest);
    originalNetworkRequest.setRedirectDestination(newNetworkRequest);
    return newNetworkRequest;
  }

  private maybeAdoptMainResourceRequest(requestId: string): NetworkRequest|null {
    const request = MultitargetNetworkManager.instance().inflightMainResourceRequests.get(requestId);
    if (!request) {
      return null;
    }
    const oldDispatcher = (NetworkManager.forRequest(request) as NetworkManager).dispatcher;
    oldDispatcher.#requestsById.delete(requestId);
    oldDispatcher.#requestsByURL.delete(request.url());
    const loaderId = request.loaderId;
    if (loaderId) {
      oldDispatcher.#requestsByLoaderId.delete(loaderId);
    }
    const builder = oldDispatcher.#requestIdToExtraInfoBuilder.get(requestId);
    oldDispatcher.#requestIdToExtraInfoBuilder.delete(requestId);
    this.#requestsById.set(requestId, request);
    this.#requestsByURL.set(request.url(), request);
    if (loaderId) {
      this.#requestsByLoaderId.set(loaderId, request);
    }
    if (builder) {
      this.#requestIdToExtraInfoBuilder.set(requestId, builder);
    }
    requestToManagerMap.set(request, this.#manager);
    return request;
  }

  private startNetworkRequest(networkRequest: NetworkRequest, originalRequest: Protocol.Network.Request|null): void {
    this.#requestsById.set(networkRequest.requestId(), networkRequest);
    this.#requestsByURL.set(networkRequest.url(), networkRequest);
    const loaderId = networkRequest.loaderId;
    if (loaderId) {
      this.#requestsByLoaderId.set(loaderId, networkRequest);
    }
    // The following relies on the fact that loaderIds and requestIds are
    // globally unique and that the main request has them equal.
    if (networkRequest.loaderId === networkRequest.requestId()) {
      MultitargetNetworkManager.instance().inflightMainResourceRequests.set(networkRequest.requestId(), networkRequest);
    }

    this.#manager.dispatchEventToListeners(Events.RequestStarted, {request: networkRequest, originalRequest});
  }

  private updateNetworkRequest(networkRequest: NetworkRequest): void {
    this.#manager.dispatchEventToListeners(Events.RequestUpdated, networkRequest);
  }

  private finishNetworkRequest(
      networkRequest: NetworkRequest,
      finishTime: number,
      encodedDataLength: number,
      ): void {
    networkRequest.endTime = finishTime;
    networkRequest.finished = true;
    if (encodedDataLength >= 0) {
      const redirectSource = networkRequest.redirectSource();
      if (redirectSource && redirectSource.signedExchangeInfo()) {
        networkRequest.setTransferSize(0);
        redirectSource.setTransferSize(encodedDataLength);
        this.updateNetworkRequest(redirectSource);
      } else {
        networkRequest.setTransferSize(encodedDataLength);
      }
    }
    this.#manager.dispatchEventToListeners(Events.RequestFinished, networkRequest);
    MultitargetNetworkManager.instance().inflightMainResourceRequests.delete(networkRequest.requestId());

    if (Common.Settings.Settings.instance().moduleSetting('monitoringXHREnabled').get() &&
        networkRequest.resourceType().category() === Common.ResourceType.resourceCategories.XHR) {
      let message;
      const failedToLoad = networkRequest.failed || networkRequest.hasErrorStatusCode();
      if (failedToLoad) {
        message = i18nString(
            UIStrings.sFailedLoadingSS,
            {PH1: networkRequest.resourceType().title(), PH2: networkRequest.requestMethod, PH3: networkRequest.url()});
      } else {
        message = i18nString(
            UIStrings.sFinishedLoadingSS,
            {PH1: networkRequest.resourceType().title(), PH2: networkRequest.requestMethod, PH3: networkRequest.url()});
      }

      this.#manager.dispatchEventToListeners(
          Events.MessageGenerated, {message: message, requestId: networkRequest.requestId(), warning: false});
    }
  }

  clearRequests(): void {
    for (const [requestId, request] of this.#requestsById) {
      if (request.finished) {
        this.#requestsById.delete(requestId);
      }
    }
    for (const [requestURL, request] of this.#requestsByURL) {
      if (request.finished) {
        this.#requestsByURL.delete(requestURL);
      }
    }
    for (const [requestLoaderId, request] of this.#requestsByLoaderId) {
      if (request.finished) {
        this.#requestsByLoaderId.delete(requestLoaderId);
      }
    }
    for (const [requestId, builder] of this.#requestIdToExtraInfoBuilder) {
      if (builder.isFinished()) {
        this.#requestIdToExtraInfoBuilder.delete(requestId);
      }
    }
  }

  webTransportCreated({transportId, url: requestURL, timestamp: time, initiator}:
                          Protocol.Network.WebTransportCreatedEvent): void {
    const networkRequest =
        NetworkRequest.createForWebSocket(transportId, requestURL as Platform.DevToolsPath.UrlString, initiator);
    networkRequest.hasNetworkData = true;
    requestToManagerMap.set(networkRequest, this.#manager);
    networkRequest.setResourceType(Common.ResourceType.resourceTypes.WebTransport);
    networkRequest.setIssueTime(time, 0);
    // TODO(yoichio): Add appropreate events to address abort cases.
    this.startNetworkRequest(networkRequest, null);
  }

  webTransportConnectionEstablished({transportId, timestamp: time}:
                                        Protocol.Network.WebTransportConnectionEstablishedEvent): void {
    const networkRequest = this.#requestsById.get(transportId);
    if (!networkRequest) {
      return;
    }

    // This dummy deltas are needed to show this request as being
    // downloaded(blue) given typical WebTransport is kept for a while.
    // TODO(yoichio): Add appropreate events to fix these dummy datas.
    // DNS lookup?
    networkRequest.responseReceivedTime = time;
    networkRequest.endTime = time + 0.001;
    this.updateNetworkRequest(networkRequest);
  }

  webTransportClosed({transportId, timestamp: time}: Protocol.Network.WebTransportClosedEvent): void {
    const networkRequest = this.#requestsById.get(transportId);
    if (!networkRequest) {
      return;
    }

    networkRequest.endTime = time;
    this.finishNetworkRequest(networkRequest, time, 0);
  }

  trustTokenOperationDone(event: Protocol.Network.TrustTokenOperationDoneEvent): void {
    const request = this.#requestsById.get(event.requestId);
    if (!request) {
      this.#requestIdToTrustTokenEvent.set(event.requestId, event);
      return;
    }
    request.setTrustTokenOperationDoneEvent(event);
  }

  subresourceWebBundleMetadataReceived({requestId, urls}: Protocol.Network.SubresourceWebBundleMetadataReceivedEvent):
      void {
    const extraInfoBuilder = this.getExtraInfoBuilder(requestId);
    extraInfoBuilder.setWebBundleInfo({resourceUrls: urls as Platform.DevToolsPath.UrlString[]});
    const finalRequest = extraInfoBuilder.finalRequest();
    if (finalRequest) {
      this.updateNetworkRequest(finalRequest);
    }
  }

  subresourceWebBundleMetadataError({requestId, errorMessage}: Protocol.Network.SubresourceWebBundleMetadataErrorEvent):
      void {
    const extraInfoBuilder = this.getExtraInfoBuilder(requestId);
    extraInfoBuilder.setWebBundleInfo({errorMessage});
    const finalRequest = extraInfoBuilder.finalRequest();
    if (finalRequest) {
      this.updateNetworkRequest(finalRequest);
    }
  }

  subresourceWebBundleInnerResponseParsed({innerRequestId, bundleRequestId}:
                                              Protocol.Network.SubresourceWebBundleInnerResponseParsedEvent): void {
    const extraInfoBuilder = this.getExtraInfoBuilder(innerRequestId);
    extraInfoBuilder.setWebBundleInnerRequestInfo({bundleRequestId});
    const finalRequest = extraInfoBuilder.finalRequest();
    if (finalRequest) {
      this.updateNetworkRequest(finalRequest);
    }
  }

  subresourceWebBundleInnerResponseError({innerRequestId, errorMessage}:
                                             Protocol.Network.SubresourceWebBundleInnerResponseErrorEvent): void {
    const extraInfoBuilder = this.getExtraInfoBuilder(innerRequestId);
    extraInfoBuilder.setWebBundleInnerRequestInfo({errorMessage});
    const finalRequest = extraInfoBuilder.finalRequest();
    if (finalRequest) {
      this.updateNetworkRequest(finalRequest);
    }
  }

  reportingApiReportAdded(data: Protocol.Network.ReportingApiReportAddedEvent): void {
    this.#manager.dispatchEventToListeners(Events.ReportingApiReportAdded, data.report);
  }

  reportingApiReportUpdated(data: Protocol.Network.ReportingApiReportUpdatedEvent): void {
    this.#manager.dispatchEventToListeners(Events.ReportingApiReportUpdated, data.report);
  }

  reportingApiEndpointsChangedForOrigin(data: Protocol.Network.ReportingApiEndpointsChangedForOriginEvent): void {
    this.#manager.dispatchEventToListeners(Events.ReportingApiEndpointsChangedForOrigin, data);
  }

  /**
   * @deprecated
   * This method is only kept for usage in a web test.
   */
  private createNetworkRequest(
      requestId: Protocol.Network.RequestId, frameId: Protocol.Page.FrameId, loaderId: Protocol.Network.LoaderId,
      url: string, documentURL: string, initiator: Protocol.Network.Initiator|null): NetworkRequest {
    const request = NetworkRequest.create(
        requestId, url as Platform.DevToolsPath.UrlString, documentURL as Platform.DevToolsPath.UrlString, frameId,
        loaderId, initiator);
    requestToManagerMap.set(request, this.#manager);
    return request;
  }
}

let multiTargetNetworkManagerInstance: MultitargetNetworkManager|null;

export class MultitargetNetworkManager extends Common.ObjectWrapper.ObjectWrapper<MultitargetNetworkManager.EventTypes>
    implements SDKModelObserver<NetworkManager> {
  #userAgentOverrideInternal: string;
  #userAgentMetadataOverride: Protocol.Emulation.UserAgentMetadata|null;
  #customAcceptedEncodings: Protocol.Network.ContentEncoding[]|null;
  readonly #networkAgents: Set<ProtocolProxyApi.NetworkApi>;
  readonly #fetchAgents: Set<ProtocolProxyApi.FetchApi>;
  readonly inflightMainResourceRequests: Map<string, NetworkRequest>;
  #networkConditionsInternal: Conditions;
  #updatingInterceptionPatternsPromise: Promise<void>|null;
  readonly #blockingEnabledSetting: Common.Settings.Setting<boolean>;
  readonly #blockedPatternsSetting: Common.Settings.Setting<BlockedPattern[]>;
  #effectiveBlockedURLs: string[];
  readonly #urlsForRequestInterceptor:
      Platform.MapUtilities.Multimap<(arg0: InterceptedRequest) => Promise<void>, InterceptionPattern>;
  #extraHeaders?: Protocol.Network.Headers;
  #customUserAgent?: string;

  constructor() {
    super();
    this.#userAgentOverrideInternal = '';
    this.#userAgentMetadataOverride = null;
    this.#customAcceptedEncodings = null;
    this.#networkAgents = new Set();
    this.#fetchAgents = new Set();
    this.inflightMainResourceRequests = new Map();
    this.#networkConditionsInternal = NoThrottlingConditions;
    this.#updatingInterceptionPatternsPromise = null;

    // TODO(allada) Remove these and merge it with request interception.
    this.#blockingEnabledSetting = Common.Settings.Settings.instance().moduleSetting('requestBlockingEnabled');
    this.#blockedPatternsSetting = Common.Settings.Settings.instance().createSetting('networkBlockedPatterns', []);
    this.#effectiveBlockedURLs = [];
    this.updateBlockedPatterns();

    this.#urlsForRequestInterceptor = new Platform.MapUtilities.Multimap();

    TargetManager.instance().observeModels(NetworkManager, this);
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): MultitargetNetworkManager {
    const {forceNew} = opts;
    if (!multiTargetNetworkManagerInstance || forceNew) {
      multiTargetNetworkManagerInstance = new MultitargetNetworkManager();
    }

    return multiTargetNetworkManagerInstance;
  }

  static dispose(): void {
    multiTargetNetworkManagerInstance = null;
  }

  static getChromeVersion(): string {
    const chromeRegex = /(?:^|\W)(?:Chrome|HeadlessChrome)\/(\S+)/;
    const chromeMatch = navigator.userAgent.match(chromeRegex);
    if (chromeMatch && chromeMatch.length > 1) {
      return chromeMatch[1];
    }
    return '';
  }

  static patchUserAgentWithChromeVersion(uaString: string): string {
    // Patches Chrome/ChrOS version from user #agent ("1.2.3.4" when user #agent is: "Chrome/1.2.3.4").
    // Otherwise, ignore it. This assumes additional appVersions appear after the Chrome version.
    const chromeVersion = MultitargetNetworkManager.getChromeVersion();
    if (chromeVersion.length > 0) {
      // "1.2.3.4" becomes "1.0.100.0"
      const additionalAppVersion = chromeVersion.split('.', 1)[0] + '.0.100.0';
      return Platform.StringUtilities.sprintf(uaString, chromeVersion, additionalAppVersion);
    }
    return uaString;
  }

  static patchUserAgentMetadataWithChromeVersion(userAgentMetadata: Protocol.Emulation.UserAgentMetadata): void {
    // Patches Chrome/ChrOS version from user #agent metadata ("1.2.3.4" when user #agent is: "Chrome/1.2.3.4").
    // Otherwise, ignore it. This assumes additional appVersions appear after the Chrome version.
    if (!userAgentMetadata.brands) {
      return;
    }
    const chromeVersion = MultitargetNetworkManager.getChromeVersion();
    if (chromeVersion.length === 0) {
      return;
    }

    const majorVersion = chromeVersion.split('.', 1)[0];
    for (const brand of userAgentMetadata.brands) {
      if (brand.version.includes('%s')) {
        brand.version = Platform.StringUtilities.sprintf(brand.version, majorVersion);
      }
    }

    if (userAgentMetadata.fullVersion) {
      if (userAgentMetadata.fullVersion.includes('%s')) {
        userAgentMetadata.fullVersion = Platform.StringUtilities.sprintf(userAgentMetadata.fullVersion, chromeVersion);
      }
    }
  }

  modelAdded(networkManager: NetworkManager): void {
    const networkAgent = networkManager.target().networkAgent();
    const fetchAgent = networkManager.target().fetchAgent();
    if (this.#extraHeaders) {
      void networkAgent.invoke_setExtraHTTPHeaders({headers: this.#extraHeaders});
    }
    if (this.currentUserAgent()) {
      void networkAgent.invoke_setUserAgentOverride(
          {userAgent: this.currentUserAgent(), userAgentMetadata: this.#userAgentMetadataOverride || undefined});
    }
    if (this.#effectiveBlockedURLs.length) {
      void networkAgent.invoke_setBlockedURLs({urls: this.#effectiveBlockedURLs});
    }
    if (this.isIntercepting()) {
      void fetchAgent.invoke_enable({patterns: this.#urlsForRequestInterceptor.valuesArray()});
    }
    if (this.#customAcceptedEncodings === null) {
      void networkAgent.invoke_clearAcceptedEncodingsOverride();
    } else {
      void networkAgent.invoke_setAcceptedEncodings({encodings: this.#customAcceptedEncodings});
    }
    this.#networkAgents.add(networkAgent);
    this.#fetchAgents.add(fetchAgent);
    if (this.isThrottling()) {
      this.updateNetworkConditions(networkAgent);
    }
  }

  modelRemoved(networkManager: NetworkManager): void {
    for (const entry of this.inflightMainResourceRequests) {
      const manager = NetworkManager.forRequest((entry[1] as NetworkRequest));
      if (manager !== networkManager) {
        continue;
      }
      this.inflightMainResourceRequests.delete((entry[0] as string));
    }
    this.#networkAgents.delete(networkManager.target().networkAgent());
    this.#fetchAgents.delete(networkManager.target().fetchAgent());
  }

  isThrottling(): boolean {
    return this.#networkConditionsInternal.download >= 0 || this.#networkConditionsInternal.upload >= 0 ||
        this.#networkConditionsInternal.latency > 0;
  }

  isOffline(): boolean {
    return !this.#networkConditionsInternal.download && !this.#networkConditionsInternal.upload;
  }

  setNetworkConditions(conditions: Conditions): void {
    this.#networkConditionsInternal = conditions;
    for (const agent of this.#networkAgents) {
      this.updateNetworkConditions(agent);
    }
    this.dispatchEventToListeners(MultitargetNetworkManager.Events.ConditionsChanged);
  }

  networkConditions(): Conditions {
    return this.#networkConditionsInternal;
  }

  private updateNetworkConditions(networkAgent: ProtocolProxyApi.NetworkApi): void {
    const conditions = this.#networkConditionsInternal;
    if (!this.isThrottling()) {
      void networkAgent.invoke_emulateNetworkConditions(
          {offline: false, latency: 0, downloadThroughput: 0, uploadThroughput: 0});
    } else {
      void networkAgent.invoke_emulateNetworkConditions({
        offline: this.isOffline(),
        latency: conditions.latency,
        downloadThroughput: conditions.download < 0 ? 0 : conditions.download,
        uploadThroughput: conditions.upload < 0 ? 0 : conditions.upload,
        connectionType: NetworkManager.connectionType(conditions),
      });
    }
  }

  setExtraHTTPHeaders(headers: Protocol.Network.Headers): void {
    this.#extraHeaders = headers;
    for (const agent of this.#networkAgents) {
      void agent.invoke_setExtraHTTPHeaders({headers: this.#extraHeaders});
    }
  }

  currentUserAgent(): string {
    return this.#customUserAgent ? this.#customUserAgent : this.#userAgentOverrideInternal;
  }

  private updateUserAgentOverride(): void {
    const userAgent = this.currentUserAgent();
    for (const agent of this.#networkAgents) {
      void agent.invoke_setUserAgentOverride(
          {userAgent: userAgent, userAgentMetadata: this.#userAgentMetadataOverride || undefined});
    }
  }

  setUserAgentOverride(userAgent: string, userAgentMetadataOverride: Protocol.Emulation.UserAgentMetadata|null): void {
    const uaChanged = (this.#userAgentOverrideInternal !== userAgent);
    this.#userAgentOverrideInternal = userAgent;
    if (!this.#customUserAgent) {
      this.#userAgentMetadataOverride = userAgentMetadataOverride;
      this.updateUserAgentOverride();
    } else {
      this.#userAgentMetadataOverride = null;
    }

    if (uaChanged) {
      this.dispatchEventToListeners(MultitargetNetworkManager.Events.UserAgentChanged);
    }
  }

  userAgentOverride(): string {
    return this.#userAgentOverrideInternal;
  }

  setCustomUserAgentOverride(
      userAgent: string, userAgentMetadataOverride: Protocol.Emulation.UserAgentMetadata|null = null): void {
    this.#customUserAgent = userAgent;
    this.#userAgentMetadataOverride = userAgentMetadataOverride;
    this.updateUserAgentOverride();
  }

  setCustomAcceptedEncodingsOverride(acceptedEncodings: Protocol.Network.ContentEncoding[]): void {
    this.#customAcceptedEncodings = acceptedEncodings;
    this.updateAcceptedEncodingsOverride();
    this.dispatchEventToListeners(MultitargetNetworkManager.Events.AcceptedEncodingsChanged);
  }

  clearCustomAcceptedEncodingsOverride(): void {
    this.#customAcceptedEncodings = null;
    this.updateAcceptedEncodingsOverride();
    this.dispatchEventToListeners(MultitargetNetworkManager.Events.AcceptedEncodingsChanged);
  }

  isAcceptedEncodingOverrideSet(): boolean {
    return this.#customAcceptedEncodings !== null;
  }

  private updateAcceptedEncodingsOverride(): void {
    const customAcceptedEncodings = this.#customAcceptedEncodings;
    for (const agent of this.#networkAgents) {
      if (customAcceptedEncodings === null) {
        void agent.invoke_clearAcceptedEncodingsOverride();
      } else {
        void agent.invoke_setAcceptedEncodings({encodings: customAcceptedEncodings});
      }
    }
  }

  // TODO(allada) Move all request blocking into interception and let view manage blocking.
  blockedPatterns(): BlockedPattern[] {
    return this.#blockedPatternsSetting.get().slice();
  }

  blockingEnabled(): boolean {
    return this.#blockingEnabledSetting.get();
  }

  isBlocking(): boolean {
    return Boolean(this.#effectiveBlockedURLs.length);
  }

  setBlockedPatterns(patterns: BlockedPattern[]): void {
    this.#blockedPatternsSetting.set(patterns);
    this.updateBlockedPatterns();
    this.dispatchEventToListeners(MultitargetNetworkManager.Events.BlockedPatternsChanged);
  }

  setBlockingEnabled(enabled: boolean): void {
    if (this.#blockingEnabledSetting.get() === enabled) {
      return;
    }
    this.#blockingEnabledSetting.set(enabled);
    this.updateBlockedPatterns();
    this.dispatchEventToListeners(MultitargetNetworkManager.Events.BlockedPatternsChanged);
  }

  private updateBlockedPatterns(): void {
    const urls = [];
    if (this.#blockingEnabledSetting.get()) {
      for (const pattern of this.#blockedPatternsSetting.get()) {
        if (pattern.enabled) {
          urls.push(pattern.url);
        }
      }
    }

    if (!urls.length && !this.#effectiveBlockedURLs.length) {
      return;
    }
    this.#effectiveBlockedURLs = urls;
    for (const agent of this.#networkAgents) {
      void agent.invoke_setBlockedURLs({urls: this.#effectiveBlockedURLs});
    }
  }

  isIntercepting(): boolean {
    return Boolean(this.#urlsForRequestInterceptor.size);
  }

  setInterceptionHandlerForPatterns(
      patterns: InterceptionPattern[], requestInterceptor: (arg0: InterceptedRequest) => Promise<void>): Promise<void> {
    // Note: requestInterceptors may receive interception #requests for patterns they did not subscribe to.
    this.#urlsForRequestInterceptor.deleteAll(requestInterceptor);
    for (const newPattern of patterns) {
      this.#urlsForRequestInterceptor.set(requestInterceptor, newPattern);
    }
    return this.updateInterceptionPatternsOnNextTick();
  }

  private updateInterceptionPatternsOnNextTick(): Promise<void> {
    // This is used so we can register and unregister patterns in loops without sending lots of protocol messages.
    if (!this.#updatingInterceptionPatternsPromise) {
      this.#updatingInterceptionPatternsPromise = Promise.resolve().then(this.updateInterceptionPatterns.bind(this));
    }
    return this.#updatingInterceptionPatternsPromise;
  }

  private async updateInterceptionPatterns(): Promise<void> {
    if (!Common.Settings.Settings.instance().moduleSetting('cacheDisabled').get()) {
      Common.Settings.Settings.instance().moduleSetting('cacheDisabled').set(true);
    }
    this.#updatingInterceptionPatternsPromise = null;
    const promises = ([] as Promise<unknown>[]);
    for (const agent of this.#fetchAgents) {
      promises.push(agent.invoke_enable({patterns: this.#urlsForRequestInterceptor.valuesArray()}));
    }
    this.dispatchEventToListeners(MultitargetNetworkManager.Events.InterceptorsChanged);
    await Promise.all(promises);
  }

  async requestIntercepted(interceptedRequest: InterceptedRequest): Promise<void> {
    for (const requestInterceptor of this.#urlsForRequestInterceptor.keysArray()) {
      await requestInterceptor(interceptedRequest);
      if (interceptedRequest.hasResponded() && interceptedRequest.networkRequest) {
        this.dispatchEventToListeners(
            MultitargetNetworkManager.Events.RequestIntercepted, interceptedRequest.networkRequest.requestId());
        return;
      }
    }
    if (!interceptedRequest.hasResponded()) {
      interceptedRequest.continueRequestWithoutChange();
    }
  }

  clearBrowserCache(): void {
    for (const agent of this.#networkAgents) {
      void agent.invoke_clearBrowserCache();
    }
  }

  clearBrowserCookies(): void {
    for (const agent of this.#networkAgents) {
      void agent.invoke_clearBrowserCookies();
    }
  }

  async getCertificate(origin: string): Promise<string[]> {
    const target = TargetManager.instance().primaryPageTarget();
    if (!target) {
      return [];
    }
    const certificate = await target.networkAgent().invoke_getCertificate({origin});
    if (!certificate) {
      return [];
    }
    return certificate.tableNames;
  }

  async loadResource(url: Platform.DevToolsPath.UrlString): Promise<{
    success: boolean,
    content: string,
    errorDescription: Host.ResourceLoader.LoadErrorDescription,
  }> {
    const headers: {
      [x: string]: string,
    } = {};

    const currentUserAgent = this.currentUserAgent();
    if (currentUserAgent) {
      headers['User-Agent'] = currentUserAgent;
    }

    if (Common.Settings.Settings.instance().moduleSetting('cacheDisabled').get()) {
      headers['Cache-Control'] = 'no-cache';
    }

    const allowRemoteFilePaths =
        Common.Settings.Settings.instance().moduleSetting('network.enable-remote-file-loading').get();

    return new Promise(
        resolve => Host.ResourceLoader.load(url, headers, (success, _responseHeaders, content, errorDescription) => {
          resolve({success, content, errorDescription});
        }, allowRemoteFilePaths));
  }
}

export namespace MultitargetNetworkManager {
  // TODO(crbug.com/1167717): Make this a const enum again
  // eslint-disable-next-line rulesdir/const_enum
  export enum Events {
    BlockedPatternsChanged = 'BlockedPatternsChanged',
    ConditionsChanged = 'ConditionsChanged',
    UserAgentChanged = 'UserAgentChanged',
    InterceptorsChanged = 'InterceptorsChanged',
    AcceptedEncodingsChanged = 'AcceptedEncodingsChanged',
    RequestIntercepted = 'RequestIntercepted',
    RequestFulfilled = 'RequestFulfilled',
  }

  export type EventTypes = {
    [Events.BlockedPatternsChanged]: void,
    [Events.ConditionsChanged]: void,
    [Events.UserAgentChanged]: void,
    [Events.InterceptorsChanged]: void,
    [Events.AcceptedEncodingsChanged]: void,
    [Events.RequestIntercepted]: string,
    [Events.RequestFulfilled]: Platform.DevToolsPath.UrlString,
  };
}

export class InterceptedRequest {
  readonly #fetchAgent: ProtocolProxyApi.FetchApi;
  #hasRespondedInternal: boolean;
  request: Protocol.Network.Request;
  resourceType: Protocol.Network.ResourceType;
  responseStatusCode: number|undefined;
  responseHeaders: Protocol.Fetch.HeaderEntry[]|undefined;
  requestId: Protocol.Fetch.RequestId;
  networkRequest: NetworkRequest|null;

  constructor(
      fetchAgent: ProtocolProxyApi.FetchApi,
      request: Protocol.Network.Request,
      resourceType: Protocol.Network.ResourceType,
      requestId: Protocol.Fetch.RequestId,
      networkRequest: NetworkRequest|null,
      responseStatusCode?: number,
      responseHeaders?: Protocol.Fetch.HeaderEntry[],
  ) {
    this.#fetchAgent = fetchAgent;
    this.#hasRespondedInternal = false;
    this.request = request;
    this.resourceType = resourceType;
    this.responseStatusCode = responseStatusCode;
    this.responseHeaders = responseHeaders;
    this.requestId = requestId;
    this.networkRequest = networkRequest;
  }

  hasResponded(): boolean {
    return this.#hasRespondedInternal;
  }

  static mergeSetCookieHeaders(
      originalSetCookieHeaders: Protocol.Fetch.HeaderEntry[],
      setCookieHeadersFromOverrides: Protocol.Fetch.HeaderEntry[]): Protocol.Fetch.HeaderEntry[] {
    // Generates a map containing the `set-cookie` headers. Valid `set-cookie`
    // headers are stored by the cookie name. Malformed `set-cookie` headers are
    // stored by the whole header value. Duplicates are allowed.
    const generateHeaderMap = (headers: Protocol.Fetch.HeaderEntry[]): Map<string, string[]> => {
      const result = new Map<string, string[]>();
      for (const header of headers) {
        // The regex matches cookie headers of the form '<header-name>=<header-value>'.
        // <header-name> is a token as defined in https://www.rfc-editor.org/rfc/rfc9110.html#name-tokens.
        // The shape of <header-value> is not being validated at all here.
        const match = header.value.match(/^([a-zA-Z0-9!#$%&'*+.^_`|~-]+=)(.*)$/);
        if (match) {
          if (result.has(match[1])) {
            result.get(match[1])?.push(header.value);
          } else {
            result.set(match[1], [header.value]);
          }
        } else {
          if (result.has(header.value)) {
            result.get(header.value)?.push(header.value);
          } else {
            result.set(header.value, [header.value]);
          }
        }
      }
      return result;
    };

    const originalHeadersMap = generateHeaderMap(originalSetCookieHeaders);
    const overridesHeaderMap = generateHeaderMap(setCookieHeadersFromOverrides);

    // Iterate over original headers. If the same key is found among the
    // overrides, use those instead.
    const mergedHeaders: Protocol.Fetch.HeaderEntry[] = [];
    for (const [key, headerValues] of originalHeadersMap) {
      if (overridesHeaderMap.has(key)) {
        for (const headerValue of overridesHeaderMap.get(key) || []) {
          mergedHeaders.push({name: 'set-cookie', value: headerValue});
        }
      } else {
        for (const headerValue of headerValues) {
          mergedHeaders.push({name: 'set-cookie', value: headerValue});
        }
      }
    }

    // Finally add all overrides which have not been added yet.
    for (const [key, headerValues] of overridesHeaderMap) {
      if (originalHeadersMap.has(key)) {
        continue;
      }
      for (const headerValue of headerValues) {
        mergedHeaders.push({name: 'set-cookie', value: headerValue});
      }
    }
    return mergedHeaders;
  }

  async continueRequestWithContent(
      contentBlob: Blob, encoded: boolean, responseHeaders: Protocol.Fetch.HeaderEntry[],
      isBodyOverridden: boolean): Promise<void> {
    this.#hasRespondedInternal = true;
    const body = encoded ? await contentBlob.text() : await blobToBase64(contentBlob);
    const responseCode = isBodyOverridden ? 200 : (this.responseStatusCode || 200);

    if (this.networkRequest) {
      const originalSetCookieHeaders =
          this.networkRequest?.originalResponseHeaders.filter(header => header.name === 'set-cookie') || [];
      const setCookieHeadersFromOverrides = responseHeaders.filter(header => header.name === 'set-cookie');
      this.networkRequest.setCookieHeaders =
          InterceptedRequest.mergeSetCookieHeaders(originalSetCookieHeaders, setCookieHeadersFromOverrides);
      this.networkRequest.hasOverriddenContent = isBodyOverridden;
    }

    void this.#fetchAgent.invoke_fulfillRequest({requestId: this.requestId, responseCode, body, responseHeaders});
    MultitargetNetworkManager.instance().dispatchEventToListeners(
        MultitargetNetworkManager.Events.RequestFulfilled, this.request.url as Platform.DevToolsPath.UrlString);

    async function blobToBase64(blob: Blob): Promise<string> {
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

  continueRequestWithoutChange(): void {
    console.assert(!this.#hasRespondedInternal);
    this.#hasRespondedInternal = true;
    void this.#fetchAgent.invoke_continueRequest({requestId: this.requestId});
  }

  continueRequestWithError(errorReason: Protocol.Network.ErrorReason): void {
    console.assert(!this.#hasRespondedInternal);
    this.#hasRespondedInternal = true;
    void this.#fetchAgent.invoke_failRequest({requestId: this.requestId, errorReason});
  }

  async responseBody(): Promise<ContentData> {
    const response = await this.#fetchAgent.invoke_getResponseBody({requestId: this.requestId});
    const error = response.getError() || null;
    return {error: error, content: error ? null : response.body, encoded: response.base64Encoded};
  }

  isRedirect(): boolean {
    return this.responseStatusCode !== undefined && this.responseStatusCode >= 300 && this.responseStatusCode < 400;
  }
}

/**
 * Helper class to match #requests created from requestWillBeSent with
 * requestWillBeSentExtraInfo and responseReceivedExtraInfo when they have the
 * same requestId due to redirects.
 */
class ExtraInfoBuilder {
  readonly #requests: NetworkRequest[];
  #requestExtraInfos: (ExtraRequestInfo|null)[];
  #responseExtraInfos: (ExtraResponseInfo|null)[];
  #finishedInternal: boolean;
  #webBundleInfo: WebBundleInfo|null;
  #webBundleInnerRequestInfo: WebBundleInnerRequestInfo|null;

  constructor() {
    this.#requests = [];
    this.#requestExtraInfos = [];
    this.#responseExtraInfos = [];
    this.#finishedInternal = false;
    this.#webBundleInfo = null;
    this.#webBundleInnerRequestInfo = null;
  }

  addRequest(req: NetworkRequest): void {
    this.#requests.push(req);
    this.sync(this.#requests.length - 1);
  }

  addRequestExtraInfo(info: ExtraRequestInfo): void {
    this.#requestExtraInfos.push(info);
    this.sync(this.#requestExtraInfos.length - 1);
  }

  addResponseExtraInfo(info: ExtraResponseInfo): void {
    this.#responseExtraInfos.push(info);
    this.sync(this.#responseExtraInfos.length - 1);
  }

  setWebBundleInfo(info: WebBundleInfo): void {
    this.#webBundleInfo = info;
    this.updateFinalRequest();
  }

  setWebBundleInnerRequestInfo(info: WebBundleInnerRequestInfo): void {
    this.#webBundleInnerRequestInfo = info;
    this.updateFinalRequest();
  }

  finished(): void {
    this.#finishedInternal = true;
    this.updateFinalRequest();
  }

  isFinished(): boolean {
    return this.#finishedInternal;
  }

  private sync(index: number): void {
    const req = this.#requests[index];
    if (!req) {
      return;
    }

    const requestExtraInfo = this.#requestExtraInfos[index];
    if (requestExtraInfo) {
      req.addExtraRequestInfo(requestExtraInfo);
      this.#requestExtraInfos[index] = null;
    }

    const responseExtraInfo = this.#responseExtraInfos[index];
    if (responseExtraInfo) {
      req.addExtraResponseInfo(responseExtraInfo);
      this.#responseExtraInfos[index] = null;
    }
  }

  finalRequest(): NetworkRequest|null {
    if (!this.#finishedInternal) {
      return null;
    }
    return this.#requests[this.#requests.length - 1] || null;
  }

  private updateFinalRequest(): void {
    if (!this.#finishedInternal) {
      return;
    }
    const finalRequest = this.finalRequest();
    finalRequest?.setWebBundleInfo(this.#webBundleInfo);
    finalRequest?.setWebBundleInnerRequestInfo(this.#webBundleInnerRequestInfo);
  }
}

SDKModel.register(NetworkManager, {capabilities: Capability.Network, autostart: true});

export class ConditionsSerializer implements Serializer<Conditions, Conditions> {
  stringify(value: unknown): string {
    const conditions = value as Conditions;
    return JSON.stringify({
      ...conditions,
      title: typeof conditions.title === 'function' ? conditions.title() : conditions.title,
    });
  }

  parse(serialized: string): Conditions {
    const parsed = JSON.parse(serialized);
    return {
      ...parsed,
      // eslint-disable-next-line rulesdir/l10n_i18nString_call_only_with_uistrings
      title: parsed.i18nTitleKey ? i18nLazyString(parsed.i18nTitleKey) : parsed.title,
    };
  }
}

export function networkConditionsEqual(first: Conditions, second: Conditions): boolean {
  // Caution: titles might be different function instances, which produce
  // the same value.
  const firstTitle = typeof first.title === 'function' ? first.title() : first.title;
  const secondTitle = typeof second.title === 'function' ? second.title() : second.title;
  return second.download === first.download && second.upload === first.upload && second.latency === first.latency &&
      secondTitle === firstTitle;
}

export interface Conditions {
  download: number;
  upload: number;
  latency: number;
  // TODO(crbug.com/1219425): In the future, it might be worthwhile to
  // consider avoiding mixing up presentation state (e.g.: displayed
  // titles) with behavioral state (e.g.: the throttling amounts). In
  // this particular case, the title (along with other properties)
  // doubles as both part of group of fields which (loosely) uniquely
  // identify instances, as well as the literal string displayed in the
  // UI, which leads to complications around persistance.
  title: string|(() => string);
  // Instances may be serialized to local storage, so localized titles
  // should not be irrecoverably baked, just in case the string changes
  // (or the user switches locales).
  i18nTitleKey?: string;
}

export interface BlockedPattern {
  url: string;
  enabled: boolean;
}

export interface Message {
  message: string;
  requestId: string;
  warning: boolean;
}

export interface InterceptionPattern {
  urlPattern: string;
  requestStage: Protocol.Fetch.RequestStage;
}

export type RequestInterceptor = (request: InterceptedRequest) => Promise<void>;

export interface RequestUpdateDroppedEventData {
  url: Platform.DevToolsPath.UrlString;
  frameId: Protocol.Page.FrameId|null;
  loaderId: Protocol.Network.LoaderId;
  resourceType: Protocol.Network.ResourceType;
  mimeType: string;
  lastModified: Date|null;
}

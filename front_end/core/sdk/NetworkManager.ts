// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

import {Cookie} from './Cookie.js';
import {
  type BlockedCookieWithReason,
  DirectSocketChunkType,
  DirectSocketStatus,
  DirectSocketType,
  Events as NetworkRequestEvents,
  type ExtraRequestInfo,
  type ExtraResponseInfo,
  type IncludedCookieWithReason,
  type NameValue,
  NetworkRequest,
} from './NetworkRequest.js';
import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';
import {type SDKModelObserver, TargetManager} from './TargetManager.js';

const UIStrings = {
  /**
   * @description Explanation why no content is shown for WebSocket connection.
   */
  noContentForWebSocket: 'Content for WebSockets is currently not supported',
  /**
   * @description Explanation why no content is shown for redirect response.
   */
  noContentForRedirect: 'No content available because this request was redirected',
  /**
   * @description Explanation why no content is shown for preflight request.
   */
  noContentForPreflight: 'No content available for preflight request',
  /**
   * @description Text to indicate that network throttling is disabled
   */
  noThrottling: 'No throttling',
  /**
   * @description Text to indicate the network connectivity is offline
   */
  offline: 'Offline',
  /**
   * @description Text in Network Manager representing the "3G" throttling preset.
   */
  slowG: '3G',  // Named `slowG` for legacy reasons and because this value
                // is serialized locally on the user's machine: if we
                // change it we break their stored throttling settings.
                // (See crrev.com/c/2947255)
  /**
   * @description Text in Network Manager representing the "Slow 4G" throttling preset
   */
  fastG: 'Slow 4G',  // Named `fastG` for legacy reasons and because this value
                     // is serialized locally on the user's machine: if we
                     // change it we break their stored throttling settings.
                     // (See crrev.com/c/2947255)
  /**
   * @description Text in Network Manager representing the "Fast 4G" throttling preset
   */
  fast4G: 'Fast 4G',
  /**
   * @description Text in Network Manager representing the "Blocking" throttling preset
   */
  block: 'Block',
  /**
   * @description Text in Network Manager
   * @example {https://example.com} PH1
   */
  requestWasBlockedByDevtoolsS: 'Request was blocked by DevTools: "{PH1}"',
  /**
   * @description Message in Network Manager
   * @example {XHR} PH1
   * @example {GET} PH2
   * @example {https://example.com} PH3
   */
  sFailedLoadingSS: '{PH1} failed loading: {PH2} "{PH3}".',
  /**
   * @description Message in Network Manager
   * @example {XHR} PH1
   * @example {GET} PH2
   * @example {https://example.com} PH3
   */
  sFinishedLoadingSS: '{PH1} finished loading: {PH2} "{PH3}".',
  /**
   * @description One of direct socket connection statuses
   */
  directSocketStatusOpening: 'Opening',
  /**
   * @description One of direct socket connection statuses
   */
  directSocketStatusOpen: 'Open',
  /**
   * @description One of direct socket connection statuses
   */
  directSocketStatusClosed: 'Closed',
  /**
   * @description One of direct socket connection statuses
   */
  directSocketStatusAborted: 'Aborted',
} as const;
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

/**
 * We store two settings to disk to persist network throttling.
 * 1. The custom conditions that the user has defined.
 * 2. The active `key` that applies the correct current preset.
 * The reason the setting creation functions are defined here is because they are referred
 * to in multiple places, and this ensures we don't have accidental typos which
 * mean extra settings get mistakenly created.
 */
export function customUserNetworkConditionsSetting(): Common.Settings.Setting<Conditions[]> {
  return Common.Settings.Settings.instance().moduleSetting<Conditions[]>('custom-network-conditions');
}

export function activeNetworkThrottlingKeySetting(): Common.Settings.Setting<ThrottlingConditionKey> {
  return Common.Settings.Settings.instance().createSetting(
      'active-network-condition-key', PredefinedThrottlingConditionKey.NO_THROTTLING);
}

export class NetworkManager extends SDKModel<EventTypes> {
  readonly dispatcher: NetworkDispatcher;
  readonly fetchDispatcher: FetchDispatcher;
  readonly #networkAgent: ProtocolProxyApi.NetworkApi;
  readonly #bypassServiceWorkerSetting: Common.Settings.Setting<boolean>;

  readonly activeNetworkThrottlingKey: Common.Settings.Setting<ThrottlingConditionKey> =
      activeNetworkThrottlingKeySetting();

  constructor(target: Target) {
    super(target);
    this.dispatcher = new NetworkDispatcher(this);
    this.fetchDispatcher = new FetchDispatcher(target.fetchAgent(), this);
    this.#networkAgent = target.networkAgent();
    target.registerNetworkDispatcher(this.dispatcher);
    target.registerFetchDispatcher(this.fetchDispatcher);
    if (Common.Settings.Settings.instance().moduleSetting('cache-disabled').get()) {
      void this.#networkAgent.invoke_setCacheDisabled({cacheDisabled: true});
    }

    if (Root.Runtime.hostConfig.devToolsPrivacyUI?.enabled &&
        Root.Runtime.hostConfig.thirdPartyCookieControls?.managedBlockThirdPartyCookies !== true &&
        (Common.Settings.Settings.instance().createSetting('cookie-control-override-enabled', undefined).get() ||
         Common.Settings.Settings.instance().createSetting('grace-period-mitigation-disabled', undefined).get() ||
         Common.Settings.Settings.instance().createSetting('heuristic-mitigation-disabled', undefined).get())) {
      this.cookieControlFlagsSettingChanged();
    }

    void this.#networkAgent.invoke_enable({
      maxPostDataSize: MAX_EAGER_POST_REQUEST_BODY_LENGTH,
      enableDurableMessages: Root.Runtime.hostConfig.devToolsEnableDurableMessages?.enabled,
      maxTotalBufferSize: MAX_RESPONSE_BODY_TOTAL_BUFFER_LENGTH,
      reportDirectSocketTraffic: true,
    });
    void this.#networkAgent.invoke_setAttachDebugStack({enabled: true});

    this.#bypassServiceWorkerSetting =
        Common.Settings.Settings.instance().createSetting('bypass-service-worker', false);
    if (this.#bypassServiceWorkerSetting.get()) {
      this.bypassServiceWorkerChanged();
    }
    this.#bypassServiceWorkerSetting.addChangeListener(this.bypassServiceWorkerChanged, this);

    Common.Settings.Settings.instance()
        .moduleSetting('cache-disabled')
        .addChangeListener(this.cacheDisabledSettingChanged, this);

    Common.Settings.Settings.instance()
        .createSetting('cookie-control-override-enabled', undefined)
        .addChangeListener(this.cookieControlFlagsSettingChanged, this);
    Common.Settings.Settings.instance()
        .createSetting('grace-period-mitigation-disabled', undefined)
        .addChangeListener(this.cookieControlFlagsSettingChanged, this);
    Common.Settings.Settings.instance()
        .createSetting('heuristic-mitigation-disabled', undefined)
        .addChangeListener(this.cookieControlFlagsSettingChanged, this);
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
    const response =
        await manager.#networkAgent.invoke_searchInResponseBody({requestId, query, caseSensitive, isRegex});
    return TextUtils.TextUtils.performSearchInSearchMatches(response.result || [], query, caseSensitive, isRegex);
  }

  static async requestContentData(request: NetworkRequest): Promise<TextUtils.ContentData.ContentDataOrError> {
    if (request.resourceType() === Common.ResourceType.resourceTypes.WebSocket) {
      return {error: i18nString(UIStrings.noContentForWebSocket)};
    }
    if (!request.finished) {
      await request.once(NetworkRequestEvents.FINISHED_LOADING);
    }
    if (request.isRedirect()) {
      return {error: i18nString(UIStrings.noContentForRedirect)};
    }
    if (request.isPreflightRequest()) {
      return {error: i18nString(UIStrings.noContentForPreflight)};
    }
    const manager = NetworkManager.forRequest(request);
    if (!manager) {
      return {error: 'No network manager for request'};
    }
    const requestId = request.backendRequestId();
    if (!requestId) {
      return {error: 'No backend request id for request'};
    }
    const response = await manager.#networkAgent.invoke_getResponseBody({requestId});
    const error = response.getError();
    if (error) {
      return {error};
    }
    return new TextUtils.ContentData.ContentData(
        response.body, response.base64Encoded, request.mimeType, request.charset() ?? undefined);
  }

  /**
   * Returns the already received bytes for an in-flight request. After calling this method
   * "dataReceived" events will contain additional data.
   */
  static async streamResponseBody(request: NetworkRequest): Promise<TextUtils.ContentData.ContentDataOrError> {
    if (request.finished) {
      return {error: 'Streaming the response body is only available for in-flight requests.'};
    }
    const manager = NetworkManager.forRequest(request);
    if (!manager) {
      return {error: 'No network manager for request'};
    }
    const requestId = request.backendRequestId();
    if (!requestId) {
      return {error: 'No backend request id for request'};
    }
    const response = await manager.#networkAgent.invoke_streamResourceContent({requestId});
    const error = response.getError();
    if (error) {
      return {error};
    }
    // Wait for at least the `responseReceived event so we have accurate mimetype and charset.
    await request.waitForResponseReceived();
    return new TextUtils.ContentData.ContentData(
        response.bufferedData, /* isBase64=*/ true, request.mimeType, request.charset() ?? undefined);
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
    try {
      const title =
          typeof conditions.title === 'function' ? conditions.title().toLowerCase() : conditions.title.toLowerCase();
      for (const [name, protocolType] of CONNECTION_TYPES) {
        if (title.includes(name)) {
          return protocolType;
        }
      }
    } catch {
      // If the i18nKey for this condition has changed, calling conditions.title() will break, so in that case we reset to NONE
      return Protocol.Network.ConnectionType.None;
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

  private cookieControlFlagsSettingChanged(): void {
    const overridesEnabled =
        Boolean(Common.Settings.Settings.instance().createSetting('cookie-control-override-enabled', undefined).get());
    const gracePeriodEnabled = overridesEnabled ?
        Boolean(
            Common.Settings.Settings.instance().createSetting('grace-period-mitigation-disabled', undefined).get()) :
        false;
    const heuristicEnabled = overridesEnabled ?
        Boolean(Common.Settings.Settings.instance().createSetting('heuristic-mitigation-disabled', undefined).get()) :
        false;
    void this.#networkAgent.invoke_setCookieControls({
      enableThirdPartyCookieRestriction: overridesEnabled,
      disableThirdPartyCookieMetadata: gracePeriodEnabled,
      disableThirdPartyCookieHeuristics: heuristicEnabled,
    });
  }

  override dispose(): void {
    Common.Settings.Settings.instance()
        .moduleSetting('cache-disabled')
        .removeChangeListener(this.cacheDisabledSettingChanged, this);
  }

  private bypassServiceWorkerChanged(): void {
    void this.#networkAgent.invoke_setBypassServiceWorker({bypass: this.#bypassServiceWorkerSetting.get()});
  }

  async getSecurityIsolationStatus(frameId: Protocol.Page.FrameId|null):
      Promise<Protocol.Network.SecurityIsolationStatus|null> {
    const result = await this.#networkAgent.invoke_getSecurityIsolationStatus({frameId: frameId ?? undefined});
    if (result.getError()) {
      return null;
    }
    return result.status;
  }

  async enableReportingApi(enable = true): Promise<Promise<Protocol.ProtocolResponseWithError>> {
    return await this.#networkAgent.invoke_enableReportingApi({enable});
  }

  async enableDeviceBoundSessions(enable = true): Promise<Promise<Protocol.ProtocolResponseWithError>> {
    return await this.#networkAgent.invoke_enableDeviceBoundSessions({enable});
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

export enum Events {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
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
  DeviceBoundSessionsAdded = 'DeviceBoundSessionsAdded',
  DeviceBoundSessionEventOccurred = 'DeviceBoundSessionEventOccurred',
  /* eslint-enable @typescript-eslint/naming-convention */
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

export interface EventTypes {
  [Events.RequestStarted]: RequestStartedEvent;
  [Events.RequestUpdated]: NetworkRequest;
  [Events.RequestFinished]: NetworkRequest;
  [Events.RequestUpdateDropped]: RequestUpdateDroppedEventData;
  [Events.ResponseReceived]: ResponseReceivedEvent;
  [Events.MessageGenerated]: MessageGeneratedEvent;
  [Events.RequestRedirected]: NetworkRequest;
  [Events.LoadingFinished]: NetworkRequest;
  [Events.ReportingApiReportAdded]: Protocol.Network.ReportingApiReport;
  [Events.ReportingApiReportUpdated]: Protocol.Network.ReportingApiReport;
  [Events.ReportingApiEndpointsChangedForOrigin]: Protocol.Network.ReportingApiEndpointsChangedForOriginEvent;
  [Events.DeviceBoundSessionsAdded]: Protocol.Network.DeviceBoundSession[];
  [Events.DeviceBoundSessionEventOccurred]: Protocol.Network.DeviceBoundSessionEventOccurredEvent;
}

/**
 * Define some built-in DevTools throttling presets.
 * Note that for the download, upload and RTT values we multiply them by adjustment factors to make DevTools' emulation more accurate.
 * @see https://docs.google.com/document/d/10lfVdS1iDWCRKQXPfbxEn4Or99D64mvNlugP1AQuFlE/edit for historical context.
 * @see https://crbug.com/342406608#comment10 for context around the addition of 4G presets in June 2024.
 */

export const BlockingConditions: ThrottlingConditions = {
  key: PredefinedThrottlingConditionKey.BLOCKING,
  block: true,
  title: i18nLazyString(UIStrings.block),
};

export const NoThrottlingConditions: Conditions = {
  key: PredefinedThrottlingConditionKey.NO_THROTTLING,
  title: i18nLazyString(UIStrings.noThrottling),
  i18nTitleKey: UIStrings.noThrottling,
  download: -1,
  upload: -1,
  latency: 0,
};

export const OfflineConditions: Conditions = {
  key: PredefinedThrottlingConditionKey.OFFLINE,
  title: i18nLazyString(UIStrings.offline),
  i18nTitleKey: UIStrings.offline,
  download: 0,
  upload: 0,
  latency: 0,
};

const slow3GTargetLatency = 400;
export const Slow3GConditions: Conditions = {
  key: PredefinedThrottlingConditionKey.SPEED_3G,
  title: i18nLazyString(UIStrings.slowG),
  i18nTitleKey: UIStrings.slowG,
  // ~500Kbps down
  download: 500 * 1000 / 8 * .8,
  // ~500Kbps up
  upload: 500 * 1000 / 8 * .8,
  // 400ms RTT
  latency: slow3GTargetLatency * 5,
  targetLatency: slow3GTargetLatency,
};

// Note for readers: this used to be called "Fast 3G" but it was renamed in May
// 2024 to align with LH (crbug.com/342406608).
const slow4GTargetLatency = 150;
export const Slow4GConditions: Conditions = {
  key: PredefinedThrottlingConditionKey.SPEED_SLOW_4G,
  title: i18nLazyString(UIStrings.fastG),
  i18nTitleKey: UIStrings.fastG,
  // ~1.6 Mbps down
  download: 1.6 * 1000 * 1000 / 8 * .9,
  // ~0.75 Mbps up
  upload: 750 * 1000 / 8 * .9,
  // 150ms RTT
  latency: slow4GTargetLatency * 3.75,
  targetLatency: slow4GTargetLatency,
};

const fast4GTargetLatency = 60;
export const Fast4GConditions: Conditions = {
  key: PredefinedThrottlingConditionKey.SPEED_FAST_4G,
  title: i18nLazyString(UIStrings.fast4G),
  i18nTitleKey: UIStrings.fast4G,
  // 9 Mbps down
  download: 9 * 1000 * 1000 / 8 * .9,
  // 1.5 Mbps up
  upload: 1.5 * 1000 * 1000 / 8 * .9,
  // 60ms RTT
  latency: fast4GTargetLatency * 2.75,
  targetLatency: fast4GTargetLatency,
};

const MAX_EAGER_POST_REQUEST_BODY_LENGTH = 64 * 1024;             // bytes
const MAX_RESPONSE_BODY_TOTAL_BUFFER_LENGTH = 250 * 1024 * 1024;  // bytes

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
  readonly #requestsById = new Map<string, NetworkRequest>();
  readonly #requestsByURL = new Map<Platform.DevToolsPath.UrlString, NetworkRequest>();
  readonly #requestsByLoaderId = new Map<Protocol.Network.LoaderId, NetworkRequest>();
  readonly #requestIdToExtraInfoBuilder = new Map<string, ExtraInfoBuilder>();
  /**
   * In case of an early abort or a cache hit, the Trust Token done event is
   * reported before the request itself is created in `requestWillBeSent`.
   * This causes the event to be lost as no `NetworkRequest` instance has been
   * created yet.
   * This map caches the events temporarily and populates the NetworkRequest
   * once it is created in `requestWillBeSent`.
   */
  readonly #requestIdToTrustTokenEvent = new Map<string, Protocol.Network.TrustTokenOperationDoneEvent>();

  constructor(manager: NetworkManager) {
    this.#manager = manager;

    MultitargetNetworkManager.instance().addEventListener(
        MultitargetNetworkManager.Events.REQUEST_INTERCEPTED, this.#markAsIntercepted.bind(this));
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
        result.push({name, value: values[i]});
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
    networkRequest.setIsAdRelated(request.isAdRelated || false);
  }

  private updateNetworkRequestWithResponse(networkRequest: NetworkRequest, response: Protocol.Network.Response): void {
    if (response.url && networkRequest.url() !== response.url) {
      networkRequest.setUrl(response.url as Platform.DevToolsPath.UrlString);
    }
    networkRequest.mimeType = response.mimeType;
    networkRequest.setCharset(response.charset);
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

    if (response.fromEarlyHints) {
      networkRequest.setFromEarlyHints();
    }

    if (response.cacheStorageCacheName) {
      networkRequest.setResponseCacheStorageCacheName(response.cacheStorageCacheName);
    }

    if (response.serviceWorkerRouterInfo) {
      networkRequest.serviceWorkerRouterInfo = response.serviceWorkerRouterInfo;
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
    if (networkRequest.responseReceivedPromiseResolve) {
      // Anyone interested in waiting for response headers being available?
      networkRequest.responseReceivedPromiseResolve();
    } else {
      // If not, make sure no one will wait on it in the future.
      networkRequest.responseReceivedPromise = Promise.resolve();
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
      // Or clause is never hit, but is here because we can't use non-null assertions.
      const backendRequestId = networkRequest.backendRequestId() || requestId;
      requestId = backendRequestId;
    }
    networkRequest.setSignedExchangeInfo(info);
    networkRequest.setResourceType(Common.ResourceType.resourceTypes.SignedExchange);

    this.updateNetworkRequestWithResponse(networkRequest, info.outerResponse);
    this.updateNetworkRequest(networkRequest);
    this.getExtraInfoBuilder(requestId).addHasExtraInfo(info.hasExtraInfo);

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
    redirectHasExtraInfo,
    redirectResponse,
    type,
    frameId,
    hasUserGesture,
    renderBlockingBehavior,
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
          hasExtraInfo: redirectHasExtraInfo,
          frameId,
        });
      }
      networkRequest = this.appendRedirect(requestId, timestamp, request.url as Platform.DevToolsPath.UrlString);
      this.#manager.dispatchEventToListeners(Events.RequestRedirected, networkRequest);
    } else {
      networkRequest = NetworkRequest.create(
          requestId, request.url as Platform.DevToolsPath.UrlString, documentURL as Platform.DevToolsPath.UrlString,
          frameId ?? null, loaderId, initiator, hasUserGesture);
      if (renderBlockingBehavior) {
        networkRequest.setRenderBlockingBehavior(renderBlockingBehavior);
      }
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

  responseReceived({requestId, loaderId, timestamp, type, response, hasExtraInfo, frameId}:
                       Protocol.Network.ResponseReceivedEvent): void {
    const networkRequest = this.#requestsById.get(requestId);
    const lowercaseHeaders = NetworkManager.lowercaseHeaders(response.headers);
    if (!networkRequest) {
      const lastModifiedHeader = lowercaseHeaders['last-modified'];
      // We missed the requestWillBeSent.
      const eventData: RequestUpdateDroppedEventData = {
        url: response.url as Platform.DevToolsPath.UrlString,
        frameId: frameId ?? null,
        loaderId,
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
    this.getExtraInfoBuilder(requestId).addHasExtraInfo(hasExtraInfo);
    this.#manager.dispatchEventToListeners(Events.ResponseReceived, {request: networkRequest, response});
  }

  dataReceived(event: Protocol.Network.DataReceivedEvent): void {
    let networkRequest: NetworkRequest|null|undefined = this.#requestsById.get(event.requestId);
    if (!networkRequest) {
      networkRequest = this.maybeAdoptMainResourceRequest(event.requestId);
    }
    if (!networkRequest) {
      return;
    }
    networkRequest.addDataReceivedEvent(event);
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
        this.#manager.dispatchEventToListeners(Events.MessageGenerated, {message, requestId, warning: true});
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
        NetworkRequest.createForSocket(requestId, requestURL as Platform.DevToolsPath.UrlString, initiator);
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

  requestWillBeSentExtraInfo({
    requestId,
    associatedCookies,
    headers,
    clientSecurityState,
    connectTiming,
    siteHasCookieInOtherPartition,
    appliedNetworkConditionsId
  }: Protocol.Network.RequestWillBeSentExtraInfoEvent): void {
    const blockedRequestCookies: BlockedCookieWithReason[] = [];
    const includedRequestCookies: IncludedCookieWithReason[] = [];
    for (const {blockedReasons, exemptionReason, cookie} of associatedCookies) {
      if (blockedReasons.length === 0) {
        includedRequestCookies.push({exemptionReason, cookie: Cookie.fromProtocolCookie(cookie)});
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
      appliedNetworkConditionsId,
    };
    this.getExtraInfoBuilder(requestId).addRequestExtraInfo(extraRequestInfo);

    const networkRequest = this.#requestsById.get(requestId);
    if (appliedNetworkConditionsId && networkRequest) {
      networkRequest.setAppliedNetworkConditions(appliedNetworkConditionsId);
      this.updateNetworkRequest(networkRequest);
    }
  }

  responseReceivedEarlyHints({
    requestId,
    headers,
  }: Protocol.Network.ResponseReceivedEarlyHintsEvent): void {
    this.getExtraInfoBuilder(requestId).setEarlyHintsHeaders(this.headersMapToHeadersArray(headers));
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
    exemptedCookies,
  }: Protocol.Network.ResponseReceivedExtraInfoEvent): void {
    const extraResponseInfo: ExtraResponseInfo = {
      blockedResponseCookies:
          blockedCookies.map(blockedCookie => ({
                               blockedReasons: blockedCookie.blockedReasons,
                               cookieLine: blockedCookie.cookieLine,
                               cookie: blockedCookie.cookie ? Cookie.fromProtocolCookie(blockedCookie.cookie) : null,
                             })),
      responseHeaders: this.headersMapToHeadersArray(headers),
      responseHeadersText: headersText,
      resourceIPAddressSpace,
      statusCode,
      cookiePartitionKey,
      cookiePartitionKeyOpaque,
      exemptedResponseCookies: exemptedCookies?.map(exemptedCookie => ({
                                                      cookie: Cookie.fromProtocolCookie(exemptedCookie.cookie),
                                                      cookieLine: exemptedCookie.cookieLine,
                                                      exemptionReason: exemptedCookie.exemptionReason,
                                                    })),
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
    // The following relies on the fact that loaderIds and requestIds
    // are globally unique and that the main request has them equal. If
    // loaderId is an empty string, it indicates a worker request. For the
    // request to fetch the main worker script, the request ID is the future
    // worker target ID and, therefore, it is unique.
    if (networkRequest.loaderId === networkRequest.requestId() || networkRequest.loaderId === '') {
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
      if (redirectSource?.signedExchangeInfo()) {
        networkRequest.setTransferSize(0);
        redirectSource.setTransferSize(encodedDataLength);
        this.updateNetworkRequest(redirectSource);
      } else {
        networkRequest.setTransferSize(encodedDataLength);
      }
    }
    this.#manager.dispatchEventToListeners(Events.RequestFinished, networkRequest);
    MultitargetNetworkManager.instance().inflightMainResourceRequests.delete(networkRequest.requestId());

    if (Common.Settings.Settings.instance().moduleSetting('monitoring-xhr-enabled').get() &&
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
          Events.MessageGenerated, {message, requestId: networkRequest.requestId(), warning: false});
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
        NetworkRequest.createForSocket(transportId, requestURL as Platform.DevToolsPath.UrlString, initiator);
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

  directTCPSocketCreated(event: Protocol.Network.DirectTCPSocketCreatedEvent): void {
    const requestURL = this.concatHostPort(event.remoteAddr, event.remotePort);
    const networkRequest = NetworkRequest.createForSocket(
        event.identifier, requestURL as Platform.DevToolsPath.UrlString, event.initiator);
    networkRequest.hasNetworkData = true;
    networkRequest.setRemoteAddress(event.remoteAddr, event.remotePort);
    networkRequest.protocol = i18n.i18n.lockedString('tcp');

    networkRequest.statusText = i18nString(UIStrings.directSocketStatusOpening);
    networkRequest.directSocketInfo = {
      type: DirectSocketType.TCP,
      status: DirectSocketStatus.OPENING,
      createOptions: {
        remoteAddr: event.remoteAddr,
        remotePort: event.remotePort,
        noDelay: event.options.noDelay,
        keepAliveDelay: event.options.keepAliveDelay,
        sendBufferSize: event.options.sendBufferSize,
        receiveBufferSize: event.options.receiveBufferSize,
        dnsQueryType: event.options.dnsQueryType,
      }
    };
    networkRequest.setResourceType(Common.ResourceType.resourceTypes.DirectSocket);
    networkRequest.setIssueTime(event.timestamp, event.timestamp);

    requestToManagerMap.set(networkRequest, this.#manager);
    this.startNetworkRequest(networkRequest, null);
  }

  directTCPSocketOpened(event: Protocol.Network.DirectTCPSocketOpenedEvent): void {
    const networkRequest = this.#requestsById.get(event.identifier);
    if (!networkRequest?.directSocketInfo) {
      return;
    }
    networkRequest.responseReceivedTime = event.timestamp;
    networkRequest.directSocketInfo.status = DirectSocketStatus.OPEN;
    networkRequest.statusText = i18nString(UIStrings.directSocketStatusOpen);
    networkRequest.directSocketInfo.openInfo = {
      remoteAddr: event.remoteAddr,
      remotePort: event.remotePort,
      localAddr: event.localAddr,
      localPort: event.localPort,
    };
    networkRequest.setRemoteAddress(event.remoteAddr, event.remotePort);
    const requestURL = this.concatHostPort(event.remoteAddr, event.remotePort);
    networkRequest.setUrl(requestURL as Platform.DevToolsPath.UrlString);
    this.updateNetworkRequest(networkRequest);
  }

  directTCPSocketAborted(event: Protocol.Network.DirectTCPSocketAbortedEvent): void {
    const networkRequest = this.#requestsById.get(event.identifier);
    if (!networkRequest?.directSocketInfo) {
      return;
    }
    networkRequest.failed = true;
    networkRequest.directSocketInfo.status = DirectSocketStatus.ABORTED;
    networkRequest.statusText = i18nString(UIStrings.directSocketStatusAborted);
    networkRequest.directSocketInfo.errorMessage = event.errorMessage;
    this.finishNetworkRequest(networkRequest, event.timestamp, 0);
  }

  directTCPSocketClosed(event: Protocol.Network.DirectTCPSocketClosedEvent): void {
    const networkRequest = this.#requestsById.get(event.identifier);
    if (!networkRequest?.directSocketInfo) {
      return;
    }
    networkRequest.statusText = i18nString(UIStrings.directSocketStatusClosed);
    networkRequest.directSocketInfo.status = DirectSocketStatus.CLOSED;
    this.finishNetworkRequest(networkRequest, event.timestamp, 0);
  }

  directTCPSocketChunkSent(event: Protocol.Network.DirectTCPSocketChunkSentEvent): void {
    const networkRequest = this.#requestsById.get(event.identifier);
    if (!networkRequest) {
      return;
    }

    networkRequest.addDirectSocketChunk({
      data: event.data,
      type: DirectSocketChunkType.SEND,
      timestamp: event.timestamp,
    });
    networkRequest.responseReceivedTime = event.timestamp;

    this.updateNetworkRequest(networkRequest);
  }

  directTCPSocketChunkReceived(event: Protocol.Network.DirectTCPSocketChunkReceivedEvent): void {
    const networkRequest = this.#requestsById.get(event.identifier);
    if (!networkRequest) {
      return;
    }

    networkRequest.addDirectSocketChunk({
      data: event.data,
      type: DirectSocketChunkType.RECEIVE,
      timestamp: event.timestamp,
    });
    networkRequest.responseReceivedTime = event.timestamp;

    this.updateNetworkRequest(networkRequest);
  }

  directUDPSocketCreated(event: Protocol.Network.DirectUDPSocketCreatedEvent): void {
    let requestURL = '';
    let type: DirectSocketType;
    if (event.options.remoteAddr && event.options.remotePort) {
      requestURL = this.concatHostPort(event.options.remoteAddr, event.options.remotePort);
      type = DirectSocketType.UDP_CONNECTED;
    } else if (event.options.localAddr) {
      requestURL = this.concatHostPort(event.options.localAddr, event.options.localPort);
      type = DirectSocketType.UDP_BOUND;
    } else {
      // Must be present in a valid command if remoteAddr
      // is not specified.
      return;
    }
    const networkRequest = NetworkRequest.createForSocket(
        event.identifier, requestURL as Platform.DevToolsPath.UrlString, event.initiator);
    networkRequest.hasNetworkData = true;
    if (event.options.remoteAddr && event.options.remotePort) {
      networkRequest.setRemoteAddress(event.options.remoteAddr, event.options.remotePort);
    }
    networkRequest.protocol = i18n.i18n.lockedString('udp');

    networkRequest.statusText = i18nString(UIStrings.directSocketStatusOpening);
    networkRequest.directSocketInfo = {
      type,
      status: DirectSocketStatus.OPENING,
      createOptions: {
        remoteAddr: event.options.remoteAddr,
        remotePort: event.options.remotePort,
        localAddr: event.options.localAddr,
        localPort: event.options.localPort,
        sendBufferSize: event.options.sendBufferSize,
        receiveBufferSize: event.options.receiveBufferSize,
        dnsQueryType: event.options.dnsQueryType,
        multicastLoopback: event.options.multicastLoopback,
        multicastTimeToLive: event.options.multicastTimeToLive,
        multicastAllowAddressSharing: event.options.multicastAllowAddressSharing,
      },
      joinedMulticastGroups: new Set(),
    };
    networkRequest.setResourceType(Common.ResourceType.resourceTypes.DirectSocket);
    networkRequest.setIssueTime(event.timestamp, event.timestamp);

    requestToManagerMap.set(networkRequest, this.#manager);
    this.startNetworkRequest(networkRequest, null);
  }

  directUDPSocketOpened(event: Protocol.Network.DirectUDPSocketOpenedEvent): void {
    const networkRequest = this.#requestsById.get(event.identifier);
    if (!networkRequest?.directSocketInfo) {
      return;
    }
    let requestURL: string;
    if (networkRequest.directSocketInfo.type === DirectSocketType.UDP_CONNECTED) {
      if (!event.remoteAddr || !event.remotePort) {
        // Connected socket must have remoteAdd and remotePort.
        return;
      }
      networkRequest.setRemoteAddress(event.remoteAddr, event.remotePort);
      requestURL = this.concatHostPort(event.remoteAddr, event.remotePort);
    } else {
      requestURL = this.concatHostPort(event.localAddr, event.localPort);
    }

    networkRequest.setUrl(requestURL as Platform.DevToolsPath.UrlString);
    networkRequest.responseReceivedTime = event.timestamp;
    networkRequest.directSocketInfo.status = DirectSocketStatus.OPEN;
    networkRequest.statusText = i18nString(UIStrings.directSocketStatusOpen);
    networkRequest.directSocketInfo.openInfo = {
      remoteAddr: event.remoteAddr,
      remotePort: event.remotePort,
      localAddr: event.localAddr,
      localPort: event.localPort,
    };

    this.updateNetworkRequest(networkRequest);
  }

  directUDPSocketAborted(event: Protocol.Network.DirectUDPSocketAbortedEvent): void {
    const networkRequest = this.#requestsById.get(event.identifier);
    if (!networkRequest?.directSocketInfo) {
      return;
    }
    networkRequest.failed = true;
    networkRequest.directSocketInfo.status = DirectSocketStatus.ABORTED;
    networkRequest.statusText = i18nString(UIStrings.directSocketStatusAborted);
    networkRequest.directSocketInfo.errorMessage = event.errorMessage;
    this.finishNetworkRequest(networkRequest, event.timestamp, 0);
  }

  directUDPSocketClosed(event: Protocol.Network.DirectUDPSocketClosedEvent): void {
    const networkRequest = this.#requestsById.get(event.identifier);
    if (!networkRequest?.directSocketInfo) {
      return;
    }
    networkRequest.statusText = i18nString(UIStrings.directSocketStatusClosed);
    networkRequest.directSocketInfo.status = DirectSocketStatus.CLOSED;
    this.finishNetworkRequest(networkRequest, event.timestamp, 0);
  }

  directUDPSocketChunkSent(event: Protocol.Network.DirectUDPSocketChunkSentEvent): void {
    const networkRequest = this.#requestsById.get(event.identifier);
    if (!networkRequest) {
      return;
    }

    networkRequest.addDirectSocketChunk({
      data: event.message.data,
      type: DirectSocketChunkType.SEND,
      timestamp: event.timestamp,
      remoteAddress: event.message.remoteAddr,
      remotePort: event.message.remotePort
    });
    networkRequest.responseReceivedTime = event.timestamp;

    this.updateNetworkRequest(networkRequest);
  }

  directUDPSocketChunkReceived(event: Protocol.Network.DirectUDPSocketChunkReceivedEvent): void {
    const networkRequest = this.#requestsById.get(event.identifier);
    if (!networkRequest) {
      return;
    }

    networkRequest.addDirectSocketChunk({
      data: event.message.data,
      type: DirectSocketChunkType.RECEIVE,
      timestamp: event.timestamp,
      remoteAddress: event.message.remoteAddr,
      remotePort: event.message.remotePort
    });
    networkRequest.responseReceivedTime = event.timestamp;

    this.updateNetworkRequest(networkRequest);
  }

  directUDPSocketJoinedMulticastGroup(event: Protocol.Network.DirectUDPSocketJoinedMulticastGroupEvent): void {
    const networkRequest = this.#requestsById.get(event.identifier);
    if (!networkRequest?.directSocketInfo) {
      return;
    }
    if (!networkRequest.directSocketInfo.joinedMulticastGroups) {
      networkRequest.directSocketInfo.joinedMulticastGroups = new Set();
    }
    if (!networkRequest.directSocketInfo.joinedMulticastGroups.has(event.IPAddress)) {
      networkRequest.directSocketInfo.joinedMulticastGroups.add(event.IPAddress);
      this.updateNetworkRequest(networkRequest);
    }
  }

  directUDPSocketLeftMulticastGroup(event: Protocol.Network.DirectUDPSocketLeftMulticastGroupEvent): void {
    const networkRequest = this.#requestsById.get(event.identifier);
    if (!networkRequest?.directSocketInfo?.joinedMulticastGroups) {
      return;
    }
    if (networkRequest.directSocketInfo.joinedMulticastGroups.delete(event.IPAddress)) {
      this.updateNetworkRequest(networkRequest);
    }
  }

  trustTokenOperationDone(event: Protocol.Network.TrustTokenOperationDoneEvent): void {
    const request = this.#requestsById.get(event.requestId);
    if (!request) {
      this.#requestIdToTrustTokenEvent.set(event.requestId, event);
      return;
    }
    request.setTrustTokenOperationDoneEvent(event);
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

  deviceBoundSessionsAdded(_params: Protocol.Network.DeviceBoundSessionsAddedEvent): void {
    this.#manager.dispatchEventToListeners(Events.DeviceBoundSessionsAdded, _params.sessions);
  }

  deviceBoundSessionEventOccurred(_params: Protocol.Network.DeviceBoundSessionEventOccurredEvent): void {
    this.#manager.dispatchEventToListeners(Events.DeviceBoundSessionEventOccurred, _params);
  }

  policyUpdated(): void {
  }

  /**
   * @deprecated
   * This method is only kept for usage in a web test.
   */
  protected createNetworkRequest(
      requestId: Protocol.Network.RequestId, frameId: Protocol.Page.FrameId, loaderId: Protocol.Network.LoaderId,
      url: string, documentURL: string, initiator: Protocol.Network.Initiator|null): NetworkRequest {
    const request = NetworkRequest.create(
        requestId, url as Platform.DevToolsPath.UrlString, documentURL as Platform.DevToolsPath.UrlString, frameId,
        loaderId, initiator);
    requestToManagerMap.set(request, this.#manager);
    return request;
  }

  private concatHostPort(host: string, port?: number): string {
    if (!port || port === 0) {
      return host;
    }
    return `${host}:${port}`;
  }
}

export type RequestConditionsSetting = {
  url: string,
  enabled: boolean,
}|{
  urlPattern: URLPatternConstructorString,
  conditions: ThrottlingConditionKey,
  enabled: boolean,
};

export type URLPatternConstructorString = Platform.Brand.Brand<string, 'URLPatternConstructorString'>;

export const enum RequestURLPatternValidity {
  VALID = 'valid',
  FAILED_TO_PARSE = 'failed-to-parse',
  HAS_REGEXP_GROUPS = 'has-regexp-groups',
}

export class RequestURLPattern {
  private constructor(readonly constructorString: URLPatternConstructorString, readonly pattern: URLPattern) {
    if (pattern.hasRegExpGroups) {
      throw new Error('RegExp groups are not allowed');
    }
  }

  static isValidPattern(pattern: string): RequestURLPatternValidity {
    try {
      const urlPattern = new URLPattern(pattern);
      return urlPattern.hasRegExpGroups ? RequestURLPatternValidity.HAS_REGEXP_GROUPS : RequestURLPatternValidity.VALID;
    } catch {
      return RequestURLPatternValidity.FAILED_TO_PARSE;
    }
  }

  static create(constructorString: URLPatternConstructorString): RequestURLPattern|null {
    try {
      const urlPattern = new URLPattern(constructorString);
      return urlPattern.hasRegExpGroups ? null : new RequestURLPattern(constructorString, urlPattern);
    } catch {
      return null;
    }
  }

  static upgradeFromWildcard(pattern: string): RequestURLPattern|null {
    const tryCreate = (constructorString: string): RequestURLPattern|null => {
      const result = this.create(constructorString as URLPatternConstructorString);
      if (result?.pattern.protocol === 'localhost' && result?.pattern.hostname === '') {
        // localhost:1234 parses as a valid pattern, do the right thing here instead
        return tryCreate(`*://${constructorString}`);
      }
      return result;
    };

    return tryCreate(pattern)  // try as is
        ??
        // Try to upgrade patterns created from the network panel, which either blocks the full url (sans
        // protocol) or just the domain name. In both cases the wildcard patterns had implicit wildcards at the end.
        // We explicitly add that here, which will match both domain names without path (implicitly setting pathname
        // to '*') and urls with path (appending * to the pathname).
        tryCreate(`*://${pattern}*`);
  }
}

export class RequestCondition extends Common.ObjectWrapper.ObjectWrapper<RequestCondition.EventTypes> {
  #pattern: RequestURLPattern|{wildcardURL: string, upgradedPattern?: RequestURLPattern};
  #enabled: boolean;
  #conditions: ThrottlingConditions;
  #ruleIds = new Set<string>();

  static createFromSetting(setting: RequestConditionsSetting): RequestCondition {
    if ('urlPattern' in setting) {
      const pattern = RequestURLPattern.create(setting.urlPattern) ?? {
        wildcardURL: setting.urlPattern,
        upgradedPattern: RequestURLPattern.upgradeFromWildcard(setting.urlPattern) ?? undefined,
      };

      const conditions = getPredefinedOrBlockingCondition(setting.conditions) ??
          customUserNetworkConditionsSetting().get().find(condition => condition.key === setting.conditions) ??
          NoThrottlingConditions;

      return new this(pattern, setting.enabled, conditions);
    }

    const pattern = {
      wildcardURL: setting.url,
      upgradedPattern: RequestURLPattern.upgradeFromWildcard(setting.url) ?? undefined
    };
    return new this(pattern, setting.enabled, BlockingConditions);
  }

  static create(pattern: RequestURLPattern, conditions: ThrottlingConditions): RequestCondition {
    return new this(pattern, /* enabled=*/ true, conditions);
  }

  private constructor(
      pattern: RequestURLPattern|{wildcardURL: string, upgradedPattern?: RequestURLPattern}, enabled: boolean,
      conditions: ThrottlingConditions) {
    super();
    this.#pattern = pattern;
    this.#enabled = enabled;
    this.#conditions = conditions;
  }

  get isBlocking(): boolean {
    return this.conditions === BlockingConditions;
  }

  get ruleIds(): Set<string> {
    return this.#ruleIds;
  }

  get constructorString(): string|undefined {
    return this.#pattern instanceof RequestURLPattern ? this.#pattern.constructorString :
                                                        this.#pattern.upgradedPattern?.constructorString;
  }

  get wildcardURL(): string|undefined {
    return 'wildcardURL' in this.#pattern ? this.#pattern.wildcardURL : undefined;
  }

  get constructorStringOrWildcardURL(): string {
    return this.#pattern instanceof RequestURLPattern ?
        this.#pattern.constructorString :
        (this.#pattern.upgradedPattern?.constructorString ?? this.#pattern.wildcardURL);
  }

  set pattern(pattern: RequestURLPattern|string) {
    if (typeof pattern === 'string') {
      // TODO(pfaffe) Remove once the feature flag is no longer required
      if (Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled) {
        throw new Error('Should not use wildcard urls');
      }
      this.#pattern = {
        wildcardURL: pattern,
        upgradedPattern: RequestURLPattern.upgradeFromWildcard(pattern) ?? undefined
      };
    } else {
      this.#pattern = pattern;
    }
    this.dispatchEventToListeners(RequestCondition.Events.REQUEST_CONDITION_CHANGED);
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  set enabled(enabled: boolean) {
    this.#enabled = enabled;
    this.dispatchEventToListeners(RequestCondition.Events.REQUEST_CONDITION_CHANGED);
  }

  get conditions(): ThrottlingConditions {
    return this.#conditions;
  }

  set conditions(conditions: ThrottlingConditions) {
    this.#conditions = conditions;
    this.#ruleIds = new Set();
    this.dispatchEventToListeners(RequestCondition.Events.REQUEST_CONDITION_CHANGED);
  }

  toSetting(): RequestConditionsSetting {
    const enabled = this.enabled;
    if (this.#pattern instanceof RequestURLPattern) {
      return {enabled, urlPattern: this.#pattern.constructorString, conditions: this.#conditions.key};
    }
    if (this.#conditions !== BlockingConditions && this.#pattern.upgradedPattern) {
      return {enabled, urlPattern: this.#pattern.upgradedPattern.constructorString, conditions: this.#conditions.key};
    }
    return {enabled, url: this.#pattern.wildcardURL};
  }

  get originalOrUpgradedURLPattern(): URLPattern|undefined {
    return this.#pattern instanceof RequestURLPattern ? this.#pattern.pattern : this.#pattern.upgradedPattern?.pattern;
  }
}

export namespace RequestCondition {
  export const enum Events {
    REQUEST_CONDITION_CHANGED = 'request-condition-changed',
  }

  export interface EventTypes {
    [Events.REQUEST_CONDITION_CHANGED]: void;
  }
}

export class RequestConditions extends Common.ObjectWrapper.ObjectWrapper<RequestConditions.EventTypes> {
  readonly #setting =
      Common.Settings.Settings.instance().createSetting<RequestConditionsSetting[]>('network-blocked-patterns', []);
  readonly #conditionsEnabledSetting =
      Common.Settings.Settings.instance().moduleSetting<boolean>('request-blocking-enabled');
  readonly #conditions: RequestCondition[] = [];
  readonly #requestConditionsById = new Map<string, {
    conditions: Conditions,
    urlPattern?: string,
  }>();
  #conditionsAppliedForTestPromise: Promise<unknown> = Promise.resolve();

  constructor() {
    super();
    for (const condition of this.#setting.get()) {
      try {
        this.#conditions.push(RequestCondition.createFromSetting(condition));
      } catch (e) {
        console.error('Error loading throttling settings: ', e);
      }
    }
    for (const condition of this.#conditions) {
      condition.addEventListener(RequestCondition.Events.REQUEST_CONDITION_CHANGED, this.#conditionsChanged, this);
    }
    this.#conditionsEnabledSetting.addChangeListener(
        () => this.dispatchEventToListeners(RequestConditions.Events.REQUEST_CONDITIONS_CHANGED));
  }

  get count(): number {
    return this.#conditions.length;
  }

  get conditionsEnabled(): boolean {
    return this.#conditionsEnabledSetting.get();
  }

  set conditionsEnabled(enabled: boolean) {
    if (this.#conditionsEnabledSetting.get() === enabled) {
      return;
    }
    this.#conditionsEnabledSetting.set(enabled);
  }

  findCondition(pattern: string): RequestCondition|undefined {
    if (Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled) {
      return this.#conditions.find(condition => condition.constructorString === pattern);
    }
    return this.#conditions.find(condition => condition.wildcardURL === pattern);
  }

  has(url: string): boolean {
    return Boolean(this.findCondition(url));
  }

  add(...conditions: RequestCondition[]): void {
    this.#conditions.push(...conditions);
    for (const condition of conditions) {
      condition.addEventListener(RequestCondition.Events.REQUEST_CONDITION_CHANGED, this.#conditionsChanged, this);
    }
    this.#conditionsChanged();
  }

  decreasePriority(condition: RequestCondition): void {
    const index = this.#conditions.indexOf(condition);
    if (index < 0 || index >= this.#conditions.length - 1) {
      return;
    }

    Platform.ArrayUtilities.swap(this.#conditions, index, index + 1);
    this.#conditionsChanged();
  }

  increasePriority(condition: RequestCondition): void {
    const index = this.#conditions.indexOf(condition);
    if (index <= 0) {
      return;
    }

    Platform.ArrayUtilities.swap(this.#conditions, index - 1, index);
    this.#conditionsChanged();
  }

  delete(condition: RequestCondition): void {
    const index = this.#conditions.indexOf(condition);
    if (index < 0) {
      return;
    }
    condition.removeEventListener(RequestCondition.Events.REQUEST_CONDITION_CHANGED, this.#conditionsChanged, this);
    this.#conditions.splice(index, 1);
    this.#conditionsChanged();
  }

  clear(): void {
    this.#conditions.splice(0);
    this.#conditionsChanged();
    for (const condition of this.#conditions) {
      condition.removeEventListener(RequestCondition.Events.REQUEST_CONDITION_CHANGED, this.#conditionsChanged, this);
    }
  }

  #conditionsChanged(): void {
    this.#setting.set(this.#conditions.map(condition => condition.toSetting()));
    this.dispatchEventToListeners(RequestConditions.Events.REQUEST_CONDITIONS_CHANGED);
  }

  get conditions(): IteratorObject<RequestCondition> {
    return this.#conditions.values();
  }

  applyConditions(offline: boolean, globalConditions: Conditions|null, ...agents: ProtocolProxyApi.NetworkApi[]):
      boolean {
    function isNonBlockingCondition(condition: ThrottlingConditions): condition is Conditions {
      return !('block' in condition);
    }
    if (Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled) {
      const urlPatterns: Protocol.Network.BlockPattern[] = [];
      // We store all this info out-of-band to prevent races with changing conditions while the promise is still pending
      const matchedNetworkConditions: Array<{conditions: Conditions, ruleIds?: Set<string>, urlPattern?: string}> = [];
      if (this.conditionsEnabled) {
        for (const condition of this.#conditions) {
          const urlPattern = condition.constructorString;
          const conditions = condition.conditions;
          if (!condition.enabled || !urlPattern || conditions === NoThrottlingConditions) {
            continue;
          }
          const block = !isNonBlockingCondition(conditions);
          urlPatterns.push({urlPattern, block});
          if (!block) {
            const {ruleIds} = condition;
            matchedNetworkConditions.push({ruleIds, urlPattern, conditions});
          }
        }
      }

      if (globalConditions) {
        matchedNetworkConditions.push({conditions: globalConditions});
      }

      const promises: Array<Promise<unknown>> = [];

      for (const agent of agents) {
        promises.push(agent.invoke_setBlockedURLs({urlPatterns}));
        promises.push(agent
                          .invoke_emulateNetworkConditionsByRule({
                            offline,
                            matchedNetworkConditions: matchedNetworkConditions.map(
                                ({urlPattern, conditions}) => ({
                                  urlPattern: urlPattern ?? '',
                                  latency: conditions.latency,
                                  downloadThroughput: conditions.download < 0 ? 0 : conditions.download,
                                  uploadThroughput: conditions.upload < 0 ? 0 : conditions.upload,
                                  packetLoss: (conditions.packetLoss ?? 0) < 0 ? 0 : conditions.packetLoss,
                                  packetQueueLength: conditions.packetQueueLength,
                                  packetReordering: conditions.packetReordering,
                                  connectionType: NetworkManager.connectionType(conditions),
                                }))
                          })
                          .then(response => {
                            if (!response.getError()) {
                              for (let i = 0; i < response.ruleIds.length; ++i) {
                                const ruleId = response.ruleIds[i];
                                const {ruleIds, conditions, urlPattern} = matchedNetworkConditions[i];
                                if (ruleIds) {
                                  this.#requestConditionsById.set(ruleId, {urlPattern, conditions});
                                  matchedNetworkConditions[i].ruleIds?.add(ruleId);
                                }
                              }
                            }
                          }));
        promises.push(agent.invoke_overrideNetworkState({
          offline,
          latency: globalConditions?.latency ?? 0,
          downloadThroughput: globalConditions?.download ?? -1,
          uploadThroughput: globalConditions?.upload ?? -1,
          connectionType: globalConditions ? NetworkManager.connectionType(globalConditions) :
                                             Protocol.Network.ConnectionType.None,
        }));
      }

      this.#conditionsAppliedForTestPromise = this.#conditionsAppliedForTestPromise.then(() => Promise.all(promises));
      return urlPatterns.length > 0;
    }

    const urls = this.conditionsEnabled ?
        this.#conditions.filter(condition => condition.enabled && condition.wildcardURL)
            .map(condition => condition.wildcardURL as string) :
        [];

    for (const agent of agents) {
      void agent.invoke_setBlockedURLs({urls});
    }
    return urls.length > 0;
  }

  conditionsAppliedForTest(): Promise<unknown> {
    return this.#conditionsAppliedForTestPromise;
  }

  conditionsForId(appliedNetworkConditionsId: string): AppliedNetworkConditions|undefined {
    const requestConditions = this.#requestConditionsById.get(appliedNetworkConditionsId);
    if (!requestConditions) {
      return undefined;
    }
    const {conditions, urlPattern} = requestConditions;
    return new AppliedNetworkConditions(conditions, appliedNetworkConditionsId, urlPattern);
  }
}

export namespace RequestConditions {
  export const enum Events {
    REQUEST_CONDITIONS_CHANGED = 'request-conditions-changed',
  }
  export interface EventTypes {
    [Events.REQUEST_CONDITIONS_CHANGED]: void;
  }
}

export class AppliedNetworkConditions {
  constructor(
      readonly conditions: Conditions, readonly appliedNetworkConditionsId: string, readonly urlPattern?: string) {
  }
}

export class MultitargetNetworkManager extends Common.ObjectWrapper.ObjectWrapper<MultitargetNetworkManager.EventTypes>
    implements SDKModelObserver<NetworkManager> {
  readonly #targetManager: TargetManager;
  #userAgentOverride = '';
  #userAgentMetadataOverride: Protocol.Emulation.UserAgentMetadata|null = null;
  #customAcceptedEncodings: Protocol.Network.ContentEncoding[]|null = null;
  readonly #networkAgents = new Set<ProtocolProxyApi.NetworkApi>();
  readonly #fetchAgents = new Set<ProtocolProxyApi.FetchApi>();
  readonly inflightMainResourceRequests = new Map<string, NetworkRequest>();
  #networkConditions: Conditions = NoThrottlingConditions;
  #updatingInterceptionPatternsPromise: Promise<void>|null = null;
  readonly #requestConditions = new RequestConditions();
  readonly #urlsForRequestInterceptor:
      Platform.MapUtilities.Multimap<(arg0: InterceptedRequest) => Promise<void>, InterceptionPattern> =
      new Platform.MapUtilities.Multimap();
  #extraHeaders?: Protocol.Network.Headers;
  #customUserAgent?: string;
  #isBlocking = false;

  constructor(targetManager: TargetManager) {
    super();
    this.#targetManager = targetManager;

    // TODO(allada) Remove these and merge it with request interception.
    const blockedPatternChanged: () => void = () => {
      this.updateBlockedPatterns();
      this.dispatchEventToListeners(MultitargetNetworkManager.Events.BLOCKED_PATTERNS_CHANGED);
    };
    this.#requestConditions.addEventListener(
        RequestConditions.Events.REQUEST_CONDITIONS_CHANGED, blockedPatternChanged);
    this.updateBlockedPatterns();

    this.#targetManager.observeModels(NetworkManager, this);
  }

  static instance(opts: {
    forceNew: boolean|null,
    targetManager?: TargetManager,
  } = {forceNew: null}): MultitargetNetworkManager {
    const {forceNew, targetManager} = opts;
    if (!Root.DevToolsContext.globalInstance().has(MultitargetNetworkManager) || forceNew) {
      Root.DevToolsContext.globalInstance().set(
          MultitargetNetworkManager, new MultitargetNetworkManager(targetManager ?? TargetManager.instance()));
    }

    return Root.DevToolsContext.globalInstance().get(MultitargetNetworkManager);
  }

  static dispose(): void {
    Root.DevToolsContext.globalInstance().delete(MultitargetNetworkManager);
  }

  static patchUserAgentWithChromeVersion(uaString: string): string {
    // Patches Chrome/ChrOS version from user #agent ("1.2.3.4" when user #agent is: "Chrome/1.2.3.4").
    // Otherwise, ignore it. This assumes additional appVersions appear after the Chrome version.
    const chromeVersion = Root.Runtime.getChromeVersion();
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
    const chromeVersion = Root.Runtime.getChromeVersion();
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
    this.#requestConditions.applyConditions(
        this.isOffline(), this.isThrottling() ? this.#networkConditions : null, networkAgent);
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
    if (this.isThrottling() && !Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled) {
      this.updateNetworkConditions(networkAgent);
    }
  }

  modelRemoved(networkManager: NetworkManager): void {
    for (const entry of this.inflightMainResourceRequests) {
      const manager = NetworkManager.forRequest((entry[1]));
      if (manager !== networkManager) {
        continue;
      }
      this.inflightMainResourceRequests.delete((entry[0]));
    }
    this.#networkAgents.delete(networkManager.target().networkAgent());
    this.#fetchAgents.delete(networkManager.target().fetchAgent());
  }

  isThrottling(): boolean {
    return this.#networkConditions.download >= 0 || this.#networkConditions.upload >= 0 ||
        this.#networkConditions.latency > 0;
  }

  isOffline(): boolean {
    return !this.#networkConditions.download && !this.#networkConditions.upload;
  }

  setNetworkConditions(conditions: Conditions): void {
    this.#networkConditions = conditions;
    if (Root.Runtime.hostConfig.devToolsIndividualRequestThrottling?.enabled) {
      this.#requestConditions.applyConditions(
          this.isOffline(), this.isThrottling() ? this.#networkConditions : null, ...this.#networkAgents);
    } else {
      for (const agent of this.#networkAgents) {
        this.updateNetworkConditions(agent);
      }
    }
    this.dispatchEventToListeners(MultitargetNetworkManager.Events.CONDITIONS_CHANGED);
  }

  networkConditions(): Conditions {
    return this.#networkConditions;
  }

  private updateNetworkConditions(networkAgent: ProtocolProxyApi.NetworkApi): void {
    const conditions = this.#networkConditions;
    if (!this.isThrottling()) {
      void networkAgent.invoke_emulateNetworkConditions({
        offline: false,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0,
      });
    } else {
      void networkAgent.invoke_emulateNetworkConditions({
        offline: this.isOffline(),
        latency: conditions.latency,
        downloadThroughput: conditions.download < 0 ? 0 : conditions.download,
        uploadThroughput: conditions.upload < 0 ? 0 : conditions.upload,
        packetLoss: (conditions.packetLoss ?? 0) < 0 ? 0 : conditions.packetLoss,
        packetQueueLength: conditions.packetQueueLength,
        packetReordering: conditions.packetReordering,
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
    return this.#customUserAgent ? this.#customUserAgent : this.#userAgentOverride;
  }

  private updateUserAgentOverride(): void {
    const userAgent = this.currentUserAgent();
    for (const agent of this.#networkAgents) {
      void agent.invoke_setUserAgentOverride(
          {userAgent, userAgentMetadata: this.#userAgentMetadataOverride || undefined});
    }
  }

  setUserAgentOverride(userAgent: string, userAgentMetadataOverride: Protocol.Emulation.UserAgentMetadata|null): void {
    const uaChanged = (this.#userAgentOverride !== userAgent);
    this.#userAgentOverride = userAgent;
    if (!this.#customUserAgent) {
      this.#userAgentMetadataOverride = userAgentMetadataOverride;
      this.updateUserAgentOverride();
    } else {
      this.#userAgentMetadataOverride = null;
    }

    if (uaChanged) {
      this.dispatchEventToListeners(MultitargetNetworkManager.Events.USER_AGENT_CHANGED);
    }
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
    this.dispatchEventToListeners(MultitargetNetworkManager.Events.ACCEPTED_ENCODINGS_CHANGED);
  }

  clearCustomAcceptedEncodingsOverride(): void {
    this.#customAcceptedEncodings = null;
    this.updateAcceptedEncodingsOverride();
    this.dispatchEventToListeners(MultitargetNetworkManager.Events.ACCEPTED_ENCODINGS_CHANGED);
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

  get requestConditions(): RequestConditions {
    return this.#requestConditions;
  }

  isBlocking(): boolean {
    return this.#isBlocking && this.requestConditions.conditionsEnabled;
  }

  /**
   * @deprecated Kept for layout tests
   * TODO(pfaffe) remove
   */
  private setBlockingEnabled(enabled: boolean): void {
    this.requestConditions.conditionsEnabled = enabled;
  }

  /**
   * @deprecated Kept for layout tests
   * TODO(pfaffe) remove
   */
  private setBlockedPatterns(patterns: Array<{url: string, enabled: boolean}>): void {
    this.requestConditions.clear();
    this.requestConditions.add(...patterns.map(pattern => RequestCondition.createFromSetting(pattern)));
  }

  private updateBlockedPatterns(): void {
    this.#isBlocking = this.#requestConditions.applyConditions(
        this.isOffline(), this.isThrottling() ? this.#networkConditions : null, ...this.#networkAgents);
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
    if (!Common.Settings.Settings.instance().moduleSetting('cache-disabled').get()) {
      Common.Settings.Settings.instance().moduleSetting('cache-disabled').set(true);
    }
    this.#updatingInterceptionPatternsPromise = null;
    const promises = ([] as Array<Promise<unknown>>);
    for (const agent of this.#fetchAgents) {
      promises.push(agent.invoke_enable({patterns: this.#urlsForRequestInterceptor.valuesArray()}));
    }
    this.dispatchEventToListeners(MultitargetNetworkManager.Events.INTERCEPTORS_CHANGED);
    await Promise.all(promises);
  }

  async requestIntercepted(interceptedRequest: InterceptedRequest): Promise<void> {
    for (const requestInterceptor of this.#urlsForRequestInterceptor.keysArray()) {
      await requestInterceptor(interceptedRequest);
      if (interceptedRequest.hasResponded() && interceptedRequest.networkRequest) {
        this.dispatchEventToListeners(
            MultitargetNetworkManager.Events.REQUEST_INTERCEPTED, interceptedRequest.networkRequest.requestId());
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
    const target = this.#targetManager.primaryPageTarget();
    if (!target) {
      return [];
    }
    const certificate = await target.networkAgent().invoke_getCertificate({origin});
    if (!certificate) {
      return [];
    }
    return certificate.tableNames;
  }

  appliedRequestConditions(requestInternal: NetworkRequest): AppliedNetworkConditions|undefined {
    if (!requestInternal.appliedNetworkConditionsId) {
      return undefined;
    }
    return this.requestConditions.conditionsForId(requestInternal.appliedNetworkConditionsId);
  }
}

export namespace MultitargetNetworkManager {
  export const enum Events {
    BLOCKED_PATTERNS_CHANGED = 'BlockedPatternsChanged',
    CONDITIONS_CHANGED = 'ConditionsChanged',
    USER_AGENT_CHANGED = 'UserAgentChanged',
    INTERCEPTORS_CHANGED = 'InterceptorsChanged',
    ACCEPTED_ENCODINGS_CHANGED = 'AcceptedEncodingsChanged',
    REQUEST_INTERCEPTED = 'RequestIntercepted',
    REQUEST_FULFILLED = 'RequestFulfilled',
  }

  export interface EventTypes {
    [Events.BLOCKED_PATTERNS_CHANGED]: void;
    [Events.CONDITIONS_CHANGED]: void;
    [Events.USER_AGENT_CHANGED]: void;
    [Events.INTERCEPTORS_CHANGED]: void;
    [Events.ACCEPTED_ENCODINGS_CHANGED]: void;
    [Events.REQUEST_INTERCEPTED]: string;
    [Events.REQUEST_FULFILLED]: Platform.DevToolsPath.UrlString;
  }
}

export class InterceptedRequest {
  readonly #fetchAgent: ProtocolProxyApi.FetchApi;
  #hasResponded = false;
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
    this.request = request;
    this.resourceType = resourceType;
    this.responseStatusCode = responseStatusCode;
    this.responseHeaders = responseHeaders;
    this.requestId = requestId;
    this.networkRequest = networkRequest;
  }

  hasResponded(): boolean {
    return this.#hasResponded;
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
        } else if (result.has(header.value)) {
          result.get(header.value)?.push(header.value);
        } else {
          result.set(header.value, [header.value]);
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
    this.#hasResponded = true;
    const body = encoded ? await contentBlob.text() : await Common.Base64.encode(contentBlob).catch(err => {
      console.error(err);
      return '';
    });
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
        MultitargetNetworkManager.Events.REQUEST_FULFILLED, this.request.url as Platform.DevToolsPath.UrlString);
  }

  continueRequestWithoutChange(): void {
    console.assert(!this.#hasResponded);
    this.#hasResponded = true;
    void this.#fetchAgent.invoke_continueRequest({requestId: this.requestId});
  }

  async responseBody(): Promise<TextUtils.ContentData.ContentDataOrError> {
    const response = await this.#fetchAgent.invoke_getResponseBody({requestId: this.requestId});
    const error = response.getError();
    if (error) {
      return {error};
    }

    const {mimeType, charset} = this.getMimeTypeAndCharset();
    return new TextUtils.ContentData.ContentData(
        response.body, response.base64Encoded, mimeType ?? 'application/octet-stream', charset ?? undefined);
  }

  isRedirect(): boolean {
    return this.responseStatusCode !== undefined && this.responseStatusCode >= 300 && this.responseStatusCode < 400;
  }

  /**
   * Tries to determine the MIME type and charset for this intercepted request.
   * Looks at the intercepted response headers first (for Content-Type header), then
   * checks the `NetworkRequest` if we have one.
   */
  getMimeTypeAndCharset(): {mimeType: string|null, charset: string|null} {
    for (const header of this.responseHeaders ?? []) {
      if (header.name.toLowerCase() === 'content-type') {
        return Platform.MimeType.parseContentType(header.value);
      }
    }

    const mimeType = this.networkRequest?.mimeType ?? null;
    const charset = this.networkRequest?.charset() ?? null;
    return {mimeType, charset};
  }
}

/**
 * Helper class to match #requests created from requestWillBeSent with
 * requestWillBeSentExtraInfo and responseReceivedExtraInfo when they have the
 * same requestId due to redirects.
 */
class ExtraInfoBuilder {
  readonly #requests: NetworkRequest[] = [];
  #responseExtraInfoFlag: Array<boolean|null> = [];
  #requestExtraInfos: Array<ExtraRequestInfo|null> = [];
  #responseExtraInfos: Array<ExtraResponseInfo|null> = [];
  #responseEarlyHintsHeaders: NameValue[] = [];
  #finished = false;

  addRequest(req: NetworkRequest): void {
    this.#requests.push(req);
    this.sync(this.#requests.length - 1);
  }

  addHasExtraInfo(hasExtraInfo: boolean): void {
    this.#responseExtraInfoFlag.push(hasExtraInfo);
    // This comes in response, so it can't come before request or after next
    // request in the redirect chain.
    console.assert(this.#requests.length === this.#responseExtraInfoFlag.length, 'request/response count mismatch');
    if (!hasExtraInfo) {
      // We may potentially have gotten extra infos from the next redirect
      // request already. Account for that by inserting null for missing
      // extra infos at current position.
      this.#requestExtraInfos.splice(this.#requests.length - 1, 0, null);
      this.#responseExtraInfos.splice(this.#requests.length - 1, 0, null);
    }
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

  setEarlyHintsHeaders(earlyHintsHeaders: NameValue[]): void {
    this.#responseEarlyHintsHeaders = earlyHintsHeaders;
    this.updateFinalRequest();
  }

  finished(): void {
    this.#finished = true;
    // We may have missed responseReceived event in case of failure.
    // That said, the ExtraInfo events still may be here, so mark them
    // as present. Event if they are not, this is harmless.
    // TODO(caseq): consider if we need to report hasExtraInfo in the
    // loadingFailed event.
    if (this.#responseExtraInfoFlag.length < this.#requests.length) {
      this.#responseExtraInfoFlag.push(true);
      this.sync(this.#responseExtraInfoFlag.length - 1);
    }
    console.assert(
        this.#requests.length === this.#responseExtraInfoFlag.length,
        'request/response count mismatch when request finished');
    this.updateFinalRequest();
  }

  isFinished(): boolean {
    return this.#finished;
  }

  private sync(index: number): void {
    const req = this.#requests[index];
    if (!req) {
      return;
    }

    // No response yet, so we don't know if extra info would
    // be there, bail out for now.
    if (index >= this.#responseExtraInfoFlag.length) {
      return;
    }
    if (!this.#responseExtraInfoFlag[index]) {
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
    if (!this.#finished) {
      return null;
    }
    return this.#requests[this.#requests.length - 1] || null;
  }

  private updateFinalRequest(): void {
    if (!this.#finished) {
      return;
    }
    const finalRequest = this.finalRequest();
    finalRequest?.setEarlyHintsHeaders(this.#responseEarlyHintsHeaders);
  }
}

SDKModel.register(NetworkManager, {capabilities: Capability.NETWORK, autostart: true});

export function networkConditionsEqual(first: ThrottlingConditions, second: ThrottlingConditions): boolean {
  if ('block' in first || 'block' in second) {
    if ('block' in first && 'block' in second) {
      const firstTitle = (typeof first.title === 'function' ? first.title() : first.title);
      const secondTitle = (typeof second.title === 'function' ? second.title() : second.title);
      return firstTitle === secondTitle && first.block === second.block;
    }
    return false;
  }
  // Caution: titles might be different function instances, which produce
  // the same value.
  // We prefer to use the i18nTitleKey to prevent against locale changes or
  // UIString changes that might change the value vs what the user has stored
  // locally.
  const firstTitle = first.i18nTitleKey || (typeof first.title === 'function' ? first.title() : first.title);
  const secondTitle = second.i18nTitleKey || (typeof second.title === 'function' ? second.title() : second.title);

  return second.download === first.download && second.upload === first.upload && second.latency === first.latency &&
      first.packetLoss === second.packetLoss && first.packetQueueLength === second.packetQueueLength &&
      first.packetReordering === second.packetReordering && secondTitle === firstTitle;
}

/**
 * IMPORTANT: this key is used as the value that is persisted so we remember
 * the user's throttling settings
 *
 * This means that it is very important that;
 * 1. Each Conditions that is defined must have a unique key.
 * 2. The keys & values DO NOT CHANGE for a particular condition, else we might break
 *    DevTools when restoring a user's persisted setting.
 *
 * If you do want to change them, you need to handle that in a migration, but
 * please talk to jacktfranklin@ first.
 */
export const enum PredefinedThrottlingConditionKey {
  BLOCKING = 'BLOCKING',
  NO_THROTTLING = 'NO_THROTTLING',
  OFFLINE = 'OFFLINE',
  SPEED_3G = 'SPEED_3G',
  SPEED_SLOW_4G = 'SPEED_SLOW_4G',
  SPEED_FAST_4G = 'SPEED_FAST_4G',
}

export type UserDefinedThrottlingConditionKey = `USER_CUSTOM_SETTING_${number}`;
export type ThrottlingConditionKey = PredefinedThrottlingConditionKey|UserDefinedThrottlingConditionKey;

export const THROTTLING_CONDITIONS_LOOKUP: ReadonlyMap<PredefinedThrottlingConditionKey, Conditions> = new Map([
  [PredefinedThrottlingConditionKey.NO_THROTTLING, NoThrottlingConditions],
  [PredefinedThrottlingConditionKey.OFFLINE, OfflineConditions],
  [PredefinedThrottlingConditionKey.SPEED_3G, Slow3GConditions],
  [PredefinedThrottlingConditionKey.SPEED_SLOW_4G, Slow4GConditions],
  [PredefinedThrottlingConditionKey.SPEED_FAST_4G, Fast4GConditions]
]);

function keyIsPredefined(key: ThrottlingConditionKey): key is PredefinedThrottlingConditionKey {
  return !key.startsWith('USER_CUSTOM_SETTING_');
}
export function keyIsCustomUser(key: ThrottlingConditionKey): key is UserDefinedThrottlingConditionKey {
  return key.startsWith('USER_CUSTOM_SETTING_');
}

export function getPredefinedCondition(key: ThrottlingConditionKey): Conditions|null {
  if (!keyIsPredefined(key)) {
    return null;
  }
  return THROTTLING_CONDITIONS_LOOKUP.get(key) ?? null;
}

export function getPredefinedOrBlockingCondition(key: ThrottlingConditionKey): ThrottlingConditions|null {
  return key === PredefinedThrottlingConditionKey.BLOCKING ? BlockingConditions : getPredefinedCondition(key);
}

export type ThrottlingConditions = Conditions|{
  readonly key: ThrottlingConditionKey,
  block: true,
  title: string | (() => string),
};
export interface Conditions {
  readonly key: ThrottlingConditionKey;
  download: number;
  upload: number;
  latency: number;
  packetLoss?: number;
  packetQueueLength?: number;
  packetReordering?: boolean;
  // TODO(crbug.com/422682525): make this just a function because we use lazy string everywhere.
  title: string|(() => string);
  // Instances may be serialized to local storage, so localized titles
  // should not be irrecoverably baked, just in case the string changes
  // (or the user switches locales).
  // TODO(crbug.com/422682525): get rid of this, there is no need to store on
  // the condition now we do not rely on it to reload a setting from disk.
  i18nTitleKey?: string;
  /**
   * RTT values are multiplied by adjustment factors to make DevTools' emulation more accurate.
   * This value represents the RTT value *before* the adjustment factor is applied.
   * @see https://docs.google.com/document/d/10lfVdS1iDWCRKQXPfbxEn4Or99D64mvNlugP1AQuFlE/edit for historical context.
   */
  targetLatency?: number;
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

/**
 * For the given Round Trip Time (in MilliSeconds), return the best throttling conditions.
 */
export function getRecommendedNetworkPreset(rtt: number): Conditions|null {
  const RTT_COMPARISON_THRESHOLD = 200;
  const RTT_MINIMUM = 60;

  if (!Number.isFinite(rtt)) {
    return null;
  }

  if (rtt < RTT_MINIMUM) {
    return null;
  }

  // We pick from the set of presets in the panel but do not want to allow
  // the "No Throttling" option to be picked.
  const presets = THROTTLING_CONDITIONS_LOOKUP.values()
                      .filter(condition => {
                        return condition !== NoThrottlingConditions;
                      })
                      .toArray();

  let closestPreset: Conditions|null = null;
  let smallestDiff = Infinity;
  for (const preset of presets) {
    const {targetLatency} = preset;
    if (!targetLatency) {
      continue;
    }

    const diff = Math.abs(targetLatency - rtt);
    if (diff > RTT_COMPARISON_THRESHOLD) {
      continue;
    }

    if (smallestDiff < diff) {
      continue;
    }

    closestPreset = preset;
    smallestDiff = diff;
  }

  return closestPreset;
}

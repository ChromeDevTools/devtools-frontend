/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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

/* eslint-disable rulesdir/no_underscored_properties */

import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';

import type {Cookie} from './Cookie.js';
import {Attributes} from './Cookie.js';  // eslint-disable-line no-unused-vars
import {CookieParser} from './CookieParser.js';
import {NetworkManager} from './NetworkManager.js';
import {Type} from './SDKModel.js';
import {ServerTiming} from './ServerTiming.js';

// clang-format off
const UIStrings = {
  /**
  *@description Text in Network Request
  */
  binary: '(binary)',
  /**
  *@description Tooltip to explain why a cookie was blocked
  */
  secureOnly: 'This cookie was blocked because it had the "`Secure`" attribute and the connection was not secure.',
  /**
  *@description Tooltip to explain why a cookie was blocked
  */
  notOnPath: 'This cookie was blocked because its path was not an exact match for or a superdirectory of the request url\'s path.',
  /**
  *@description Tooltip to explain why a cookie was blocked
  */
  domainMismatch: 'This cookie was blocked because neither did the request URL\'s domain exactly match the cookie\'s domain, nor was the request URL\'s domain a subdomain of the cookie\'s Domain attribute value.',
  /**
  *@description Tooltip to explain why a cookie was blocked
  */
  sameSiteStrict: 'This cookie was blocked because it had the "`SameSite=Strict`" attribute and the request was made from a different site. This includes top-level navigation requests initiated by other sites.',
  /**
  *@description Tooltip to explain why a cookie was blocked
  */
  sameSiteLax: 'This cookie was blocked because it had the "`SameSite=Lax`" attribute and the request was made from a different site and was not initiated by a top-level navigation.',
  /**
  *@description Tooltip to explain why a cookie was blocked
  */
  sameSiteUnspecifiedTreatedAsLax: 'This cookie didn\'t specify a "`SameSite`" attribute when it was stored and was defaulted to "SameSite=Lax," and was blocked because the request was made from a different site and was not initiated by a top-level navigation. The cookie had to have been set with "`SameSite=None`" to enable cross-site usage.',
  /**
  *@description Tooltip to explain why a cookie was blocked
  */
  sameSiteNoneInsecure: 'This cookie was blocked because it had the "`SameSite=None`" attribute but was not marked "Secure". Cookies without SameSite restrictions must be marked "Secure" and sent over a secure connection.',
  /**
  *@description Tooltip to explain why a cookie was blocked
  */
  userPreferences: 'This cookie was blocked due to user preferences.',
  /**
  *@description Tooltip to explain why a cookie was blocked
  */
  unknownError: 'An unknown error was encountered when trying to send this cookie.',
  /**
  *@description Tooltip to explain why a cookie was blocked due to Schemeful Same-Site
  */
  schemefulSameSiteStrict: 'This cookie was blocked because it had the "`SameSite=Strict`" attribute but the request was cross-site. This includes top-level navigation requests initiated by other sites. This request is considered cross-site because the URL has a different scheme than the current site.',
  /**
  *@description Tooltip to explain why a cookie was blocked due to Schemeful Same-Site
  */
  schemefulSameSiteLax: 'This cookie was blocked because it had the "`SameSite=Lax`" attribute but the request was cross-site and was not initiated by a top-level navigation. This request is considered cross-site because the URL has a different scheme than the current site.',
  /**
  *@description Tooltip to explain why a cookie was blocked due to Schemeful Same-Site
  */
  schemefulSameSiteUnspecifiedTreatedAsLax: 'This cookie didn\'t specify a "`SameSite`" attribute when it was stored, was defaulted to "`SameSite=Lax"`, and was blocked because the request was cross-site and was not initiated by a top-level navigation. This request is considered cross-site because the URL has a different scheme than the current site.',
  /**
  *@description Tooltip to explain why a cookie was blocked due to SameParty
  */
  samePartyFromCrossPartyContext: 'This cookie was blocked because it had the "`SameParty`" attribute but the request was cross-party. The request was considered cross-party because the domain of the resource\'s URL and the domains of the resource\'s enclosing frames/documents are neither owners nor members in the same First-Party Set.',
  /**
  *@description Tooltip to explain why an attempt to set a cookie via `Set-Cookie` HTTP header on a request's response was blocked.
  */
  thisSetcookieWasBlockedDueToUser: 'This attempt to set a cookie via a `Set-Cookie` header was blocked due to user preferences.',
  /**
  *@description Tooltip to explain why an attempt to set a cookie via `Set-Cookie` HTTP header on a request's response was blocked.
  */
  thisSetcookieHadInvalidSyntax: 'This `Set-Cookie` header had invalid syntax.',
  /**
  *@description Tooltip to explain why a cookie was blocked
  */
  theSchemeOfThisConnectionIsNot: 'The scheme of this connection is not allowed to store cookies.',
  /**
  *@description Tooltip to explain why a cookie was blocked
  */
  anUnknownErrorWasEncounteredWhenTrying: 'An unknown error was encountered when trying to store this cookie.',
  /**
  *@description Tooltip to explain why a cookie was blocked due to Schemeful Same-Site
  *@example {SameSite=Strict} PH1
  */
  thisSetcookieWasBlockedBecauseItHadTheSamesiteStrictLax: 'This attempt to set a cookie via a `Set-Cookie` header was blocked because it had the "{PH1}" attribute but came from a cross-site response which was not the response to a top-level navigation. This response is considered cross-site because the URL has a different scheme than the current site.',
  /**
  *@description Tooltip to explain why a cookie was blocked due to Schemeful Same-Site
  */
  thisSetcookieDidntSpecifyASamesite: 'This `Set-Cookie` header didn\'t specify a "`SameSite`" attribute, was defaulted to "`SameSite=Lax"`, and was blocked because it came from a cross-site response which was not the response to a top-level navigation. This response is considered cross-site because the URL has a different scheme than the current site.',
  /**
  *@description Tooltip to explain why a cookie was blocked due to SameParty
  */
  thisSetcookieWasBlockedBecauseItHadTheSameparty: 'This attempt to set a cookie via a `Set-Cookie` header was blocked because it had the "`SameParty`" attribute but the request was cross-party. The request was considered cross-party because the domain of the resource\'s URL and the domains of the resource\'s enclosing frames/documents are neither owners nor members in the same First-Party Set.',
  /**
  *@description Tooltip to explain why a cookie was blocked due to SameParty
  */
  thisSetcookieWasBlockedBecauseItHadTheSamepartyAttribute: 'This attempt to set a cookie via a `Set-Cookie` header was blocked because it had the "`SameParty`" attribute but also had other conflicting attributes. Chrome requires cookies that use the "`SameParty`" attribute to also have the "Secure" attribute, and to not be restricted to "`SameSite=Strict`".',
  /**
  *@description Tooltip to explain why an attempt to set a cookie via a `Set-Cookie` HTTP header on a request's response was blocked.
  */
  blockedReasonSecureOnly: 'This attempt to set a cookie via a `Set-Cookie` header was blocked because it had the "Secure" attribute but was not received over a secure connection.',
  /**
   *@description Tooltip to explain why an attempt to set a cookie via a `Set-Cookie` HTTP header on a request's response was blocked.
   *@example {SameSite=Strict} PH1
  */
  blockedReasonSameSiteStrictLax: 'This attempt to set a cookie via a `Set-Cookie` header was blocked because it had the "{PH1}" attribute but came from a cross-site response which was not the response to a top-level navigation.',
  /**
   *@description Tooltip to explain why an attempt to set a cookie via a `Set-Cookie` HTTP header on a request's response was blocked.
  */
  blockedReasonSameSiteUnspecifiedTreatedAsLax: 'This `Set-Cookie` header didn\'t specify a "`SameSite`" attribute and was defaulted to "`SameSite=Lax,`" and was blocked because it came from a cross-site response which was not the response to a top-level navigation. The `Set-Cookie` had to have been set with "`SameSite=None`" to enable cross-site usage.',
  /**
   *@description Tooltip to explain why an attempt to set a cookie via a `Set-Cookie` HTTP header on a request's response was blocked.
  */
  blockedReasonSameSiteNoneInsecure: 'This attempt to set a cookie via a `Set-Cookie` header was blocked because it had the "`SameSite=None`" attribute but did not have the "Secure" attribute, which is required in order to use "`SameSite=None`".',
  /**
   *@description Tooltip to explain why an attempt to set a cookie via a `Set-Cookie` HTTP header on a request's response was blocked.
  */
  blockedReasonOverwriteSecure: 'This attempt to set a cookie via a `Set-Cookie` header was blocked because it was not sent over a secure connection and would have overwritten a cookie with the Secure attribute.',
  /**
   *@description Tooltip to explain why an attempt to set a cookie via a `Set-Cookie` HTTP header on a request's response was blocked.
  */
  blockedReasonInvalidDomain: 'This attempt to set a cookie via a `Set-Cookie` header was blocked because its Domain attribute was invalid with regards to the current host url.',
  /**
   *@description Tooltip to explain why an attempt to set a cookie via a `Set-Cookie` HTTP header on a request's response was blocked.
  */
  blockedReasonInvalidPrefix: 'This attempt to set a cookie via a `Set-Cookie` header was blocked because it used the "`__Secure-`" or "`__Host-`" prefix in its name and broke the additional rules applied to cookies with these prefixes as defined in `https://tools.ietf.org/html/draft-west-cookie-prefixes-05`.',
};
// clang-format on

const str_ = i18n.i18n.registerUIStrings('core/sdk/NetworkRequest.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum, @typescript-eslint/naming-convention
export enum MIME_TYPE {
  HTML = 'text/html',
  XML = 'text/xml',
  PLAIN = 'text/plain',
  XHTML = 'application/xhtml+xml',
  SVG = 'image/svg+xml',
  CSS = 'text/css',
  XSL = 'text/xsl',
  VTT = 'text/vtt',
  PDF = 'application/pdf',
  EVENTSTREAM = 'text/event-stream',
}

export class NetworkRequest extends Common.ObjectWrapper.ObjectWrapper implements
    TextUtils.ContentProvider.ContentProvider {
  _requestId: string;
  _backendRequestId: string;
  _documentURL: string;
  _frameId: string;
  _loaderId: string;
  _initiator: Protocol.Network.Initiator|null|undefined;
  _redirectSource: NetworkRequest|null;
  _preflightRequest: NetworkRequest|null;
  _preflightInitiatorRequest: NetworkRequest|null;
  _isRedirect: boolean;
  _redirectDestination: NetworkRequest|null;
  _issueTime: number;
  _startTime: number;
  _endTime: number;
  _blockedReason: Protocol.Network.BlockedReason|undefined;
  _corsErrorStatus: Protocol.Network.CorsErrorStatus|undefined;
  statusCode: number;
  statusText: string;
  requestMethod: string;
  requestTime: number;
  protocol: string;
  mixedContentType: Protocol.Security.MixedContentType;
  _initialPriority: Protocol.Network.ResourcePriority|null;
  _currentPriority: Protocol.Network.ResourcePriority|null;
  _signedExchangeInfo: Protocol.Network.SignedExchangeInfo|null;
  _resourceType: Common.ResourceType.ResourceType;
  _contentData: Promise<ContentData>|null;
  _frames: WebSocketFrame[];
  _eventSourceMessages: EventSourceMessage[];
  _responseHeaderValues: {
    [x: string]: string|undefined,
  };
  _responseHeadersText: string;
  _requestHeaders: NameValue[];
  _requestHeaderValues: {
    [x: string]: string|undefined,
  };
  _remoteAddress: string;
  _remoteAddressSpace: Protocol.Network.IPAddressSpace;
  _referrerPolicy: Protocol.Network.RequestReferrerPolicy|null;
  _securityState: Protocol.Security.SecurityState;
  _securityDetails: Protocol.Network.SecurityDetails|null;
  connectionId: string;
  connectionReused: boolean;
  hasNetworkData: boolean;
  _formParametersPromise: Promise<NameValue[]|null>|null;
  _requestFormDataPromise: Promise<string|null>|null;
  _hasExtraRequestInfo: boolean;
  _hasExtraResponseInfo: boolean;
  _blockedRequestCookies: BlockedCookieWithReason[];
  _includedRequestCookies: Cookie[];
  _blockedResponseCookies: BlockedSetCookieWithReason[];
  localizedFailDescription: string|null;
  _url!: string;
  _responseReceivedTime!: number;
  _transferSize!: number;
  _finished!: boolean;
  _failed!: boolean;
  _canceled!: boolean;
  _mimeType!: MIME_TYPE;
  _parsedURL!: Common.ParsedURL.ParsedURL;
  _name!: string|undefined;
  _path!: string|undefined;
  _clientSecurityState!: Protocol.Network.ClientSecurityState|undefined;
  _trustTokenParams!: Protocol.Network.TrustTokenParams|undefined;
  _trustTokenOperationDoneEvent!: Protocol.Network.TrustTokenOperationDoneEvent|undefined;
  _responseCacheStorageCacheName?: string;
  _serviceWorkerResponseSource?: Protocol.Network.ServiceWorkerResponseSource;
  _wallIssueTime?: number;
  _responseRetrievalTime?: Date;
  _resourceSize?: number;
  _fromMemoryCache?: boolean;
  _fromDiskCache?: boolean;
  _fromPrefetchCache?: boolean;
  _fetchedViaServiceWorker?: boolean;
  _timing?: Protocol.Network.ResourceTiming;
  _requestHeadersText?: string;
  _responseHeaders?: NameValue[];
  _sortedResponseHeaders?: NameValue[];
  _responseCookies?: Cookie[];
  _serverTimings?: ServerTiming[]|null;
  _queryString?: string|null;
  _parsedQueryParameters?: NameValue[];
  _contentDataProvider?: (() => Promise<ContentData>);

  constructor(
      requestId: string, url: string, documentURL: string, frameId: string, loaderId: string,
      initiator: Protocol.Network.Initiator|null) {
    super();

    this._requestId = requestId;
    this._backendRequestId = requestId;
    this.setUrl(url);
    this._documentURL = documentURL;
    this._frameId = frameId;
    this._loaderId = loaderId;
    this._initiator = initiator;
    this._redirectSource = null;
    this._preflightRequest = null;
    this._preflightInitiatorRequest = null;
    this._isRedirect = false;
    this._redirectDestination = null;
    this._issueTime = -1;
    this._startTime = -1;
    this._endTime = -1;
    this._blockedReason = undefined;
    this._corsErrorStatus = undefined;

    this.statusCode = 0;
    this.statusText = '';
    this.requestMethod = '';
    this.requestTime = 0;
    this.protocol = '';
    this.mixedContentType = Protocol.Security.MixedContentType.None;

    this._initialPriority = null;
    this._currentPriority = null;

    this._signedExchangeInfo = null;

    this._resourceType = Common.ResourceType.resourceTypes.Other;
    this._contentData = null;
    this._frames = [];
    this._eventSourceMessages = [];

    this._responseHeaderValues = {};
    this._responseHeadersText = '';

    this._requestHeaders = [];
    this._requestHeaderValues = {};

    this._remoteAddress = '';
    this._remoteAddressSpace = Protocol.Network.IPAddressSpace.Unknown;

    this._referrerPolicy = null;

    this._securityState = Protocol.Security.SecurityState.Unknown;
    this._securityDetails = null;

    this.connectionId = '0';
    this.connectionReused = false;
    this.hasNetworkData = false;
    this._formParametersPromise = null;
    this._requestFormDataPromise = (Promise.resolve(null) as Promise<string|null>| null);

    this._hasExtraRequestInfo = false;
    this._hasExtraResponseInfo = false;

    this._blockedRequestCookies = [];
    this._includedRequestCookies = [];
    this._blockedResponseCookies = [];

    this.localizedFailDescription = null;
  }

  identityCompare(other: NetworkRequest): number {
    const thisId = this.requestId();
    const thatId = other.requestId();
    if (thisId > thatId) {
      return 1;
    }
    if (thisId < thatId) {
      return -1;
    }
    return 0;
  }

  requestId(): string {
    return this._requestId;
  }

  backendRequestId(): string {
    return this._backendRequestId;
  }

  url(): string {
    return this._url;
  }

  isBlobRequest(): boolean {
    return this._url.startsWith('blob:');
  }

  setUrl(x: string): void {
    if (this._url === x) {
      return;
    }

    this._url = x;
    this._parsedURL = new Common.ParsedURL.ParsedURL(x);
    delete this._queryString;
    delete this._parsedQueryParameters;
    delete this._name;
    delete this._path;
  }

  get documentURL(): string {
    return this._documentURL;
  }

  get parsedURL(): Common.ParsedURL.ParsedURL {
    return this._parsedURL;
  }

  get frameId(): Protocol.Page.FrameId {
    return this._frameId;
  }

  get loaderId(): Protocol.Network.LoaderId {
    return this._loaderId;
  }

  setRemoteAddress(ip: string, port: number): void {
    this._remoteAddress = ip + ':' + port;
    this.dispatchEventToListeners(Events.RemoteAddressChanged, this);
  }

  remoteAddress(): string {
    return this._remoteAddress;
  }

  remoteAddressSpace(): Protocol.Network.IPAddressSpace {
    return this._remoteAddressSpace;
  }

  /**
   * The cache name of the CacheStorage from where the response is served via
   * the ServiceWorker.
   */
  getResponseCacheStorageCacheName(): string|undefined {
    return this._responseCacheStorageCacheName;
  }

  setResponseCacheStorageCacheName(x: string): void {
    this._responseCacheStorageCacheName = x;
  }

  serviceWorkerResponseSource(): Protocol.Network.ServiceWorkerResponseSource|undefined {
    return this._serviceWorkerResponseSource;
  }

  setServiceWorkerResponseSource(serviceWorkerResponseSource: Protocol.Network.ServiceWorkerResponseSource): void {
    this._serviceWorkerResponseSource = serviceWorkerResponseSource;
  }

  setReferrerPolicy(referrerPolicy: Protocol.Network.RequestReferrerPolicy): void {
    this._referrerPolicy = referrerPolicy;
  }

  referrerPolicy(): Protocol.Network.RequestReferrerPolicy|null {
    return this._referrerPolicy;
  }

  securityState(): Protocol.Security.SecurityState {
    return this._securityState;
  }

  setSecurityState(securityState: Protocol.Security.SecurityState): void {
    this._securityState = securityState;
  }

  securityDetails(): Protocol.Network.SecurityDetails|null {
    return this._securityDetails;
  }

  securityOrigin(): string {
    return this._parsedURL.securityOrigin();
  }

  setSecurityDetails(securityDetails: Protocol.Network.SecurityDetails): void {
    this._securityDetails = securityDetails;
  }

  get startTime(): number {
    return this._startTime || -1;
  }

  setIssueTime(monotonicTime: number, wallTime: number): void {
    this._issueTime = monotonicTime;
    this._wallIssueTime = wallTime;
    this._startTime = monotonicTime;
  }

  issueTime(): number {
    return this._issueTime;
  }

  pseudoWallTime(monotonicTime: number): number {
    return this._wallIssueTime ? this._wallIssueTime - this._issueTime + monotonicTime : monotonicTime;
  }

  get responseReceivedTime(): number {
    return this._responseReceivedTime || -1;
  }

  set responseReceivedTime(x: number) {
    this._responseReceivedTime = x;
  }

  /**
   * The time at which the returned response was generated. For cached
   * responses, this is the last time the cache entry was validated.
   */
  getResponseRetrievalTime(): Date|undefined {
    return this._responseRetrievalTime;
  }

  setResponseRetrievalTime(x: Date): void {
    this._responseRetrievalTime = x;
  }

  get endTime(): number {
    return this._endTime || -1;
  }

  set endTime(x: number) {
    if (this.timing && this.timing.requestTime) {
      // Check against accurate responseReceivedTime.
      this._endTime = Math.max(x, this.responseReceivedTime);
    } else {
      // Prefer endTime since it might be from the network stack.
      this._endTime = x;
      if (this._responseReceivedTime > x) {
        this._responseReceivedTime = x;
      }
    }
    this.dispatchEventToListeners(Events.TimingChanged, this);
  }

  get duration(): number {
    if (this._endTime === -1 || this._startTime === -1) {
      return -1;
    }
    return this._endTime - this._startTime;
  }

  get latency(): number {
    if (this._responseReceivedTime === -1 || this._startTime === -1) {
      return -1;
    }
    return this._responseReceivedTime - this._startTime;
  }

  get resourceSize(): number {
    return this._resourceSize || 0;
  }

  set resourceSize(x: number) {
    this._resourceSize = x;
  }

  get transferSize(): number {
    return this._transferSize || 0;
  }

  increaseTransferSize(x: number): void {
    this._transferSize = (this._transferSize || 0) + x;
  }

  setTransferSize(x: number): void {
    this._transferSize = x;
  }

  get finished(): boolean {
    return this._finished;
  }

  set finished(x: boolean) {
    if (this._finished === x) {
      return;
    }

    this._finished = x;

    if (x) {
      this.dispatchEventToListeners(Events.FinishedLoading, this);
    }
  }

  get failed(): boolean {
    return this._failed;
  }

  set failed(x: boolean) {
    this._failed = x;
  }

  get canceled(): boolean {
    return this._canceled;
  }

  set canceled(x: boolean) {
    this._canceled = x;
  }

  blockedReason(): Protocol.Network.BlockedReason|undefined {
    return this._blockedReason;
  }

  setBlockedReason(reason: Protocol.Network.BlockedReason): void {
    this._blockedReason = reason;
  }

  corsErrorStatus(): Protocol.Network.CorsErrorStatus|undefined {
    return this._corsErrorStatus;
  }

  setCorsErrorStatus(corsErrorStatus: Protocol.Network.CorsErrorStatus): void {
    this._corsErrorStatus = corsErrorStatus;
  }

  wasBlocked(): boolean {
    return Boolean(this._blockedReason);
  }

  cached(): boolean {
    return (Boolean(this._fromMemoryCache) || Boolean(this._fromDiskCache)) && !this._transferSize;
  }

  cachedInMemory(): boolean {
    return Boolean(this._fromMemoryCache) && !this._transferSize;
  }

  fromPrefetchCache(): boolean {
    return Boolean(this._fromPrefetchCache);
  }

  setFromMemoryCache(): void {
    this._fromMemoryCache = true;
    delete this._timing;
  }

  setFromDiskCache(): void {
    this._fromDiskCache = true;
  }

  setFromPrefetchCache(): void {
    this._fromPrefetchCache = true;
  }

  /**
   * Returns true if the request was intercepted by a service worker and it
   * provided its own response.
   */
  get fetchedViaServiceWorker(): boolean {
    return Boolean(this._fetchedViaServiceWorker);
  }

  set fetchedViaServiceWorker(x: boolean) {
    this._fetchedViaServiceWorker = x;
  }

  /**
   * Returns true if the request was sent by a service worker.
   */
  initiatedByServiceWorker(): boolean {
    const networkManager = NetworkManager.forRequest(this);
    if (!networkManager) {
      return false;
    }
    return networkManager.target().type() === Type.ServiceWorker;
  }

  get timing(): Protocol.Network.ResourceTiming|undefined {
    return this._timing;
  }

  set timing(timingInfo: Protocol.Network.ResourceTiming|undefined) {
    if (!timingInfo || this._fromMemoryCache) {
      return;
    }
    // Take startTime and responseReceivedTime from timing data for better accuracy.
    // Timing's requestTime is a baseline in seconds, rest of the numbers there are ticks in millis.
    this._startTime = timingInfo.requestTime;
    const headersReceivedTime = timingInfo.requestTime + timingInfo.receiveHeadersEnd / 1000.0;
    if ((this._responseReceivedTime || -1) < 0 || this._responseReceivedTime > headersReceivedTime) {
      this._responseReceivedTime = headersReceivedTime;
    }
    if (this._startTime > this._responseReceivedTime) {
      this._responseReceivedTime = this._startTime;
    }

    this._timing = timingInfo;
    this.dispatchEventToListeners(Events.TimingChanged, this);
  }

  get mimeType(): MIME_TYPE {
    return this._mimeType;
  }

  set mimeType(x: MIME_TYPE) {
    this._mimeType = x;
  }

  get displayName(): string {
    return this._parsedURL.displayName;
  }

  name(): string {
    if (this._name) {
      return this._name;
    }
    this._parseNameAndPathFromURL();
    return this._name as string;
  }

  path(): string {
    if (this._path) {
      return this._path;
    }
    this._parseNameAndPathFromURL();
    return this._path as string;
  }

  _parseNameAndPathFromURL(): void {
    if (this._parsedURL.isDataURL()) {
      this._name = this._parsedURL.dataURLDisplayName();
      this._path = '';
    } else if (this._parsedURL.isBlobURL()) {
      this._name = this._parsedURL.url;
      this._path = '';
    } else if (this._parsedURL.isAboutBlank()) {
      this._name = this._parsedURL.url;
      this._path = '';
    } else {
      this._path = this._parsedURL.host + this._parsedURL.folderPathComponents;

      const networkManager = NetworkManager.forRequest(this);
      const inspectedURL =
          networkManager ? Common.ParsedURL.ParsedURL.fromString(networkManager.target().inspectedURL()) : null;
      this._path = Platform.StringUtilities.trimURL(this._path, inspectedURL ? inspectedURL.host : '');
      if (this._parsedURL.lastPathComponent || this._parsedURL.queryParams) {
        this._name =
            this._parsedURL.lastPathComponent + (this._parsedURL.queryParams ? '?' + this._parsedURL.queryParams : '');
      } else if (this._parsedURL.folderPathComponents) {
        this._name =
            this._parsedURL.folderPathComponents.substring(this._parsedURL.folderPathComponents.lastIndexOf('/') + 1) +
            '/';
        this._path = this._path.substring(0, this._path.lastIndexOf('/'));
      } else {
        this._name = this._parsedURL.host;
        this._path = '';
      }
    }
  }

  get folder(): string {
    let path: string = this._parsedURL.path;
    const indexOfQuery = path.indexOf('?');
    if (indexOfQuery !== -1) {
      path = path.substring(0, indexOfQuery);
    }
    const lastSlashIndex = path.lastIndexOf('/');
    return lastSlashIndex !== -1 ? path.substring(0, lastSlashIndex) : '';
  }

  get pathname(): string {
    return this._parsedURL.path;
  }

  resourceType(): Common.ResourceType.ResourceType {
    return this._resourceType;
  }

  setResourceType(resourceType: Common.ResourceType.ResourceType): void {
    this._resourceType = resourceType;
  }

  get domain(): string {
    return this._parsedURL.host;
  }

  get scheme(): string {
    return this._parsedURL.scheme;
  }

  redirectSource(): NetworkRequest|null {
    return this._redirectSource;
  }

  setRedirectSource(originatingRequest: NetworkRequest|null): void {
    this._redirectSource = originatingRequest;
  }

  preflightRequest(): NetworkRequest|null {
    return this._preflightRequest;
  }

  setPreflightRequest(preflightRequest: NetworkRequest|null): void {
    this._preflightRequest = preflightRequest;
  }

  preflightInitiatorRequest(): NetworkRequest|null {
    return this._preflightInitiatorRequest;
  }

  setPreflightInitiatorRequest(preflightInitiatorRequest: NetworkRequest|null): void {
    this._preflightInitiatorRequest = preflightInitiatorRequest;
  }

  isPreflightRequest(): boolean {
    return this._initiator !== null && this._initiator !== undefined &&
        this._initiator.type === Protocol.Network.InitiatorType.Preflight;
  }

  redirectDestination(): NetworkRequest|null {
    return this._redirectDestination;
  }

  setRedirectDestination(redirectDestination: NetworkRequest|null): void {
    this._redirectDestination = redirectDestination;
  }

  requestHeaders(): NameValue[] {
    return this._requestHeaders;
  }

  setRequestHeaders(headers: NameValue[]): void {
    this._requestHeaders = headers;

    this.dispatchEventToListeners(Events.RequestHeadersChanged);
  }

  requestHeadersText(): string|undefined {
    return this._requestHeadersText;
  }

  setRequestHeadersText(text: string): void {
    this._requestHeadersText = text;

    this.dispatchEventToListeners(Events.RequestHeadersChanged);
  }

  requestHeaderValue(headerName: string): string|undefined {
    if (this._requestHeaderValues[headerName]) {
      return this._requestHeaderValues[headerName];
    }
    this._requestHeaderValues[headerName] = this._computeHeaderValue(this.requestHeaders(), headerName);
    return this._requestHeaderValues[headerName];
  }

  requestFormData(): Promise<string|null> {
    if (!this._requestFormDataPromise) {
      this._requestFormDataPromise = NetworkManager.requestPostData(this);
    }
    return this._requestFormDataPromise;
  }

  setRequestFormData(hasData: boolean, data: string|null): void {
    this._requestFormDataPromise = (hasData && data === null) ? null : Promise.resolve(data);
    this._formParametersPromise = null;
  }

  _filteredProtocolName(): string {
    const protocol = this.protocol.toLowerCase();
    if (protocol === 'h2') {
      return 'http/2.0';
    }
    return protocol.replace(/^http\/2(\.0)?\+/, 'http/2.0+');
  }

  requestHttpVersion(): string {
    const headersText = this.requestHeadersText();
    if (!headersText) {
      const version = this.requestHeaderValue('version') || this.requestHeaderValue(':version');
      if (version) {
        return version;
      }
      return this._filteredProtocolName();
    }
    const firstLine = headersText.split(/\r\n/)[0];
    const match = firstLine.match(/(HTTP\/\d+\.\d+)$/);
    return match ? match[1] : 'HTTP/0.9';
  }

  get responseHeaders(): NameValue[] {
    return this._responseHeaders || [];
  }

  set responseHeaders(x: NameValue[]) {
    this._responseHeaders = x;
    delete this._sortedResponseHeaders;
    delete this._serverTimings;
    delete this._responseCookies;
    this._responseHeaderValues = {};

    this.dispatchEventToListeners(Events.ResponseHeadersChanged);
  }

  get responseHeadersText(): string {
    return this._responseHeadersText;
  }

  set responseHeadersText(x: string) {
    this._responseHeadersText = x;

    this.dispatchEventToListeners(Events.ResponseHeadersChanged);
  }

  get sortedResponseHeaders(): NameValue[] {
    if (this._sortedResponseHeaders !== undefined) {
      return this._sortedResponseHeaders;
    }

    this._sortedResponseHeaders = this.responseHeaders.slice();
    this._sortedResponseHeaders.sort(function(a, b) {
      return Platform.StringUtilities.compare(a.name.toLowerCase(), b.name.toLowerCase());
    });
    return this._sortedResponseHeaders;
  }

  responseHeaderValue(headerName: string): string|undefined {
    if (headerName in this._responseHeaderValues) {
      return this._responseHeaderValues[headerName];
    }
    this._responseHeaderValues[headerName] = this._computeHeaderValue(this.responseHeaders, headerName);
    return this._responseHeaderValues[headerName];
  }

  get responseCookies(): Cookie[] {
    if (!this._responseCookies) {
      this._responseCookies = CookieParser.parseSetCookie(this.responseHeaderValue('Set-Cookie'), this.domain) || [];
    }
    return this._responseCookies;
  }

  responseLastModified(): string|undefined {
    return this.responseHeaderValue('last-modified');
  }

  allCookiesIncludingBlockedOnes(): Cookie[] {
    return [
      ...this.includedRequestCookies(),
      ...this.responseCookies,
      ...this.blockedRequestCookies().map(blockedRequestCookie => blockedRequestCookie.cookie),
      ...this.blockedResponseCookies().map(blockedResponseCookie => blockedResponseCookie.cookie),
    ].filter(v => Boolean(v)) as Cookie[];
  }


  get serverTimings(): ServerTiming[]|null {
    if (typeof this._serverTimings === 'undefined') {
      this._serverTimings = ServerTiming.parseHeaders(this.responseHeaders);
    }
    return this._serverTimings;
  }

  queryString(): string|null {
    if (this._queryString !== undefined) {
      return this._queryString;
    }

    let queryString: string|null = null;
    const url = this.url();
    const questionMarkPosition = url.indexOf('?');
    if (questionMarkPosition !== -1) {
      queryString = url.substring(questionMarkPosition + 1);
      const hashSignPosition = queryString.indexOf('#');
      if (hashSignPosition !== -1) {
        queryString = queryString.substring(0, hashSignPosition);
      }
    }
    this._queryString = queryString;
    return this._queryString;
  }

  get queryParameters(): NameValue[]|null {
    if (this._parsedQueryParameters) {
      return this._parsedQueryParameters;
    }
    const queryString = this.queryString();
    if (!queryString) {
      return null;
    }
    this._parsedQueryParameters = this._parseParameters(queryString);
    return this._parsedQueryParameters;
  }

  async _parseFormParameters(): Promise<NameValue[]|null> {
    const requestContentType = this.requestContentType();

    if (!requestContentType) {
      return null;
    }

    // Handling application/x-www-form-urlencoded request bodies.
    if (requestContentType.match(/^application\/x-www-form-urlencoded\s*(;.*)?$/i)) {
      const formData = await this.requestFormData();
      if (!formData) {
        return null;
      }

      return this._parseParameters(formData);
    }

    // Handling multipart/form-data request bodies.
    const multipartDetails = requestContentType.match(/^multipart\/form-data\s*;\s*boundary\s*=\s*(\S+)\s*$/);

    if (!multipartDetails) {
      return null;
    }

    const boundary = multipartDetails[1];
    if (!boundary) {
      return null;
    }

    const formData = await this.requestFormData();
    if (!formData) {
      return null;
    }

    return this._parseMultipartFormDataParameters(formData, boundary);
  }

  formParameters(): Promise<NameValue[]|null> {
    if (!this._formParametersPromise) {
      this._formParametersPromise = this._parseFormParameters();
    }
    return this._formParametersPromise;
  }

  responseHttpVersion(): string {
    const headersText = this._responseHeadersText;
    if (!headersText) {
      const version = this.responseHeaderValue('version') || this.responseHeaderValue(':version');
      if (version) {
        return version;
      }
      return this._filteredProtocolName();
    }
    const firstLine = headersText.split(/\r\n/)[0];
    const match = firstLine.match(/^(HTTP\/\d+\.\d+)/);
    return match ? match[1] : 'HTTP/0.9';
  }

  _parseParameters(queryString: string): NameValue[] {
    function parseNameValue(pair: string): {
      name: string,
      value: string,
    } {
      const position = pair.indexOf('=');
      if (position === -1) {
        return {name: pair, value: ''};
      }
      return {name: pair.substring(0, position), value: pair.substring(position + 1)};
    }
    return queryString.split('&').map(parseNameValue);
  }

  /**
   * Parses multipart/form-data; boundary=boundaryString request bodies -
   * --boundaryString
   * Content-Disposition: form-data; name="field-name"; filename="r.gif"
   * Content-Type: application/octet-stream
   *
   * optionalValue
   * --boundaryString
   * Content-Disposition: form-data; name="field-name-2"
   *
   * optionalValue2
   * --boundaryString--
   */
  _parseMultipartFormDataParameters(data: string, boundary: string): NameValue[] {
    const sanitizedBoundary = Platform.StringUtilities.escapeForRegExp(boundary);
    const keyValuePattern = new RegExp(
        // Header with an optional file name.
        '^\\r\\ncontent-disposition\\s*:\\s*form-data\\s*;\\s*name="([^"]*)"(?:\\s*;\\s*filename="([^"]*)")?' +
            // Optional secondary header with the content type.
            '(?:\\r\\ncontent-type\\s*:\\s*([^\\r\\n]*))?' +
            // Padding.
            '\\r\\n\\r\\n' +
            // Value
            '(.*)' +
            // Padding.
            '\\r\\n$',
        'is');
    const fields = data.split(new RegExp(`--${sanitizedBoundary}(?:--\s*$)?`, 'g'));
    return fields.reduce(parseMultipartField, []);

    function parseMultipartField(result: NameValue[], field: string): NameValue[] {
      const [match, name, filename, contentType, value] = field.match(keyValuePattern) || [];

      if (!match) {
        return result;
      }

      const processedValue = (filename || contentType) ? i18nString(UIStrings.binary) : value;
      result.push({name, value: processedValue});

      return result;
    }
  }

  _computeHeaderValue(headers: NameValue[], headerName: string): string|undefined {
    headerName = headerName.toLowerCase();

    const values = [];
    for (let i = 0; i < headers.length; ++i) {
      if (headers[i].name.toLowerCase() === headerName) {
        values.push(headers[i].value);
      }
    }
    if (!values.length) {
      return undefined;
    }
    // Set-Cookie values should be separated by '\n', not comma, otherwise cookies could not be parsed.
    if (headerName === 'set-cookie') {
      return values.join('\n');
    }
    return values.join(', ');
  }

  contentData(): Promise<ContentData> {
    if (this._contentData) {
      return this._contentData;
    }
    if (this._contentDataProvider) {
      this._contentData = this._contentDataProvider();
    } else {
      this._contentData = NetworkManager.requestContentData(this);
    }
    return this._contentData;
  }

  setContentDataProvider(dataProvider: () => Promise<ContentData>): void {
    console.assert(!this._contentData, 'contentData can only be set once.');
    this._contentDataProvider = dataProvider;
  }

  contentURL(): string {
    return this._url;
  }

  contentType(): Common.ResourceType.ResourceType {
    return this._resourceType;
  }

  async contentEncoded(): Promise<boolean> {
    return (await this.contentData()).encoded;
  }

  async requestContent(): Promise<TextUtils.ContentProvider.DeferredContent> {
    const {content, error, encoded} = await this.contentData();
    return {
      content,
      error,
      isEncoded: encoded,
    } as TextUtils.ContentProvider.DeferredContent;
  }

  async searchInContent(query: string, caseSensitive: boolean, isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]> {
    if (!this._contentDataProvider) {
      return NetworkManager.searchInRequest(this, query, caseSensitive, isRegex);
    }

    const contentData = await this.contentData();
    let content: string|(string | null) = contentData.content;
    if (!content) {
      return [];
    }
    if (contentData.encoded) {
      content = window.atob(content);
    }
    return TextUtils.TextUtils.performSearchInContent(content, query, caseSensitive, isRegex);
  }

  isHttpFamily(): boolean {
    return Boolean(this.url().match(/^https?:/i));
  }

  requestContentType(): string|undefined {
    return this.requestHeaderValue('Content-Type');
  }

  hasErrorStatusCode(): boolean {
    return this.statusCode >= 400;
  }

  setInitialPriority(priority: Protocol.Network.ResourcePriority): void {
    this._initialPriority = priority;
  }

  initialPriority(): Protocol.Network.ResourcePriority|null {
    return this._initialPriority;
  }

  setPriority(priority: Protocol.Network.ResourcePriority): void {
    this._currentPriority = priority;
  }

  priority(): Protocol.Network.ResourcePriority|null {
    return this._currentPriority || this._initialPriority || null;
  }

  setSignedExchangeInfo(info: Protocol.Network.SignedExchangeInfo): void {
    this._signedExchangeInfo = info;
  }

  signedExchangeInfo(): Protocol.Network.SignedExchangeInfo|null {
    return this._signedExchangeInfo;
  }

  async populateImageSource(image: HTMLImageElement): Promise<void> {
    const {content, encoded} = await this.contentData();
    let imageSrc = TextUtils.ContentProvider.contentAsDataURL(content, this._mimeType, encoded);
    if (imageSrc === null && !this._failed) {
      const cacheControl = this.responseHeaderValue('cache-control') || '';
      if (!cacheControl.includes('no-cache')) {
        imageSrc = this._url;
      }
    }
    if (imageSrc !== null) {
      image.src = imageSrc;
    }
  }

  initiator(): Protocol.Network.Initiator|null {
    return this._initiator || null;
  }

  frames(): WebSocketFrame[] {
    return this._frames;
  }

  addProtocolFrameError(errorMessage: string, time: number): void {
    this.addFrame(
        {type: WebSocketFrameType.Error, text: errorMessage, time: this.pseudoWallTime(time), opCode: -1, mask: false});
  }

  addProtocolFrame(response: Protocol.Network.WebSocketFrame, time: number, sent: boolean): void {
    const type = sent ? WebSocketFrameType.Send : WebSocketFrameType.Receive;
    this.addFrame({
      type: type,
      text: response.payloadData,
      time: this.pseudoWallTime(time),
      opCode: response.opcode,
      mask: response.mask,
    });
  }

  addFrame(frame: WebSocketFrame): void {
    this._frames.push(frame);
    this.dispatchEventToListeners(Events.WebsocketFrameAdded, frame);
  }

  eventSourceMessages(): EventSourceMessage[] {
    return this._eventSourceMessages;
  }

  addEventSourceMessage(time: number, eventName: string, eventId: string, data: string): void {
    const message = {time: this.pseudoWallTime(time), eventName: eventName, eventId: eventId, data: data};
    this._eventSourceMessages.push(message);
    this.dispatchEventToListeners(Events.EventSourceMessageAdded, message);
  }

  markAsRedirect(redirectCount: number): void {
    this._isRedirect = true;
    this._requestId = `${this._backendRequestId}:redirected.${redirectCount}`;
  }

  isRedirect(): boolean {
    return this._isRedirect;
  }

  setRequestIdForTest(requestId: string): void {
    this._backendRequestId = requestId;
    this._requestId = requestId;
  }

  charset(): string|null {
    const contentTypeHeader = this.responseHeaderValue('content-type');
    if (!contentTypeHeader) {
      return null;
    }

    const responseCharsets = contentTypeHeader.replace(/ /g, '')
                                 .split(';')
                                 .filter(parameter => parameter.toLowerCase().startsWith('charset='))
                                 .map(parameter => parameter.slice('charset='.length));
    if (responseCharsets.length) {
      return responseCharsets[0];
    }

    return null;
  }

  addExtraRequestInfo(extraRequestInfo: ExtraRequestInfo): void {
    this._blockedRequestCookies = extraRequestInfo.blockedRequestCookies;
    this._includedRequestCookies = extraRequestInfo.includedRequestCookies;
    this.setRequestHeaders(extraRequestInfo.requestHeaders);
    this._hasExtraRequestInfo = true;
    this.setRequestHeadersText('');  // Mark request headers as non-provisional
    this._clientSecurityState = extraRequestInfo.clientSecurityState;
  }

  hasExtraRequestInfo(): boolean {
    return this._hasExtraRequestInfo;
  }

  blockedRequestCookies(): BlockedCookieWithReason[] {
    return this._blockedRequestCookies;
  }

  includedRequestCookies(): Cookie[] {
    return this._includedRequestCookies;
  }

  hasRequestCookies(): boolean {
    return this._includedRequestCookies.length > 0 || this._blockedRequestCookies.length > 0;
  }

  addExtraResponseInfo(extraResponseInfo: ExtraResponseInfo): void {
    this._blockedResponseCookies = extraResponseInfo.blockedResponseCookies;
    this.responseHeaders = extraResponseInfo.responseHeaders;

    if (extraResponseInfo.responseHeadersText) {
      this.responseHeadersText = extraResponseInfo.responseHeadersText;

      if (!this.requestHeadersText()) {
        // Generate request headers text from raw headers in extra request info because
        // Network.requestWillBeSentExtraInfo doesn't include headers text.
        let requestHeadersText = `${this.requestMethod} ${this.parsedURL.path}`;
        if (this.parsedURL.queryParams) {
          requestHeadersText += `?${this.parsedURL.queryParams}`;
        }
        requestHeadersText += ' HTTP/1.1\r\n';

        for (const {name, value} of this.requestHeaders()) {
          requestHeadersText += `${name}: ${value}\r\n`;
        }
        this.setRequestHeadersText(requestHeadersText);
      }
    }
    this._remoteAddressSpace = extraResponseInfo.resourceIPAddressSpace;

    this._hasExtraResponseInfo = true;
  }

  hasExtraResponseInfo(): boolean {
    return this._hasExtraResponseInfo;
  }

  blockedResponseCookies(): BlockedSetCookieWithReason[] {
    return this._blockedResponseCookies;
  }

  redirectSourceSignedExchangeInfoHasNoErrors(): boolean {
    return this._redirectSource !== null && this._redirectSource._signedExchangeInfo !== null &&
        !this._redirectSource._signedExchangeInfo.errors;
  }

  clientSecurityState(): Protocol.Network.ClientSecurityState|undefined {
    return this._clientSecurityState;
  }

  setTrustTokenParams(trustTokenParams: Protocol.Network.TrustTokenParams): void {
    this._trustTokenParams = trustTokenParams;
  }

  trustTokenParams(): Protocol.Network.TrustTokenParams|undefined {
    return this._trustTokenParams;
  }

  setTrustTokenOperationDoneEvent(doneEvent: Protocol.Network.TrustTokenOperationDoneEvent): void {
    this._trustTokenOperationDoneEvent = doneEvent;

    this.dispatchEventToListeners(Events.TrustTokenResultAdded);
  }

  trustTokenOperationDoneEvent(): Protocol.Network.TrustTokenOperationDoneEvent|undefined {
    return this._trustTokenOperationDoneEvent;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  FinishedLoading = 'FinishedLoading',
  TimingChanged = 'TimingChanged',
  RemoteAddressChanged = 'RemoteAddressChanged',
  RequestHeadersChanged = 'RequestHeadersChanged',
  ResponseHeadersChanged = 'ResponseHeadersChanged',
  WebsocketFrameAdded = 'WebsocketFrameAdded',
  EventSourceMessageAdded = 'EventSourceMessageAdded',
  TrustTokenResultAdded = 'TrustTokenResultAdded',
}


// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum InitiatorType {
  Other = 'other',
  Parser = 'parser',
  Redirect = 'redirect',
  Script = 'script',
  Preload = 'preload',
  SignedExchange = 'signedExchange',
  Preflight = 'preflight',
}


// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum WebSocketFrameType {
  Send = 'send',
  Receive = 'receive',
  Error = 'error',
}


export const cookieBlockedReasonToUiString = function(blockedReason: Protocol.Network.CookieBlockedReason): string {
  switch (blockedReason) {
    case Protocol.Network.CookieBlockedReason.SecureOnly:
      return i18nString(UIStrings.secureOnly);
    case Protocol.Network.CookieBlockedReason.NotOnPath:
      return i18nString(UIStrings.notOnPath);
    case Protocol.Network.CookieBlockedReason.DomainMismatch:
      return i18nString(UIStrings.domainMismatch);
    case Protocol.Network.CookieBlockedReason.SameSiteStrict:
      return i18nString(UIStrings.sameSiteStrict);
    case Protocol.Network.CookieBlockedReason.SameSiteLax:
      return i18nString(UIStrings.sameSiteLax);
    case Protocol.Network.CookieBlockedReason.SameSiteUnspecifiedTreatedAsLax:
      return i18nString(UIStrings.sameSiteUnspecifiedTreatedAsLax);
    case Protocol.Network.CookieBlockedReason.SameSiteNoneInsecure:
      return i18nString(UIStrings.sameSiteNoneInsecure);
    case Protocol.Network.CookieBlockedReason.UserPreferences:
      return i18nString(UIStrings.userPreferences);
    case Protocol.Network.CookieBlockedReason.UnknownError:
      return i18nString(UIStrings.unknownError);
    case Protocol.Network.CookieBlockedReason.SchemefulSameSiteStrict:
      return i18nString(UIStrings.schemefulSameSiteStrict);
    case Protocol.Network.CookieBlockedReason.SchemefulSameSiteLax:
      return i18nString(UIStrings.schemefulSameSiteLax);
    case Protocol.Network.CookieBlockedReason.SchemefulSameSiteUnspecifiedTreatedAsLax:
      return i18nString(UIStrings.schemefulSameSiteUnspecifiedTreatedAsLax);
    case Protocol.Network.CookieBlockedReason.SamePartyFromCrossPartyContext:
      return i18nString(UIStrings.samePartyFromCrossPartyContext);
  }
  return '';
};

export const setCookieBlockedReasonToUiString = function(blockedReason: Protocol.Network.SetCookieBlockedReason):
    string {
      switch (blockedReason) {
        case Protocol.Network.SetCookieBlockedReason.SecureOnly:
          return i18nString(UIStrings.blockedReasonSecureOnly);
        case Protocol.Network.SetCookieBlockedReason.SameSiteStrict:
          return i18nString(UIStrings.blockedReasonSameSiteStrictLax, {PH1: 'SameSite=Strict'});
        case Protocol.Network.SetCookieBlockedReason.SameSiteLax:
          return i18nString(UIStrings.blockedReasonSameSiteStrictLax, {PH1: 'SameSite=Lax'});
        case Protocol.Network.SetCookieBlockedReason.SameSiteUnspecifiedTreatedAsLax:
          return i18nString(UIStrings.blockedReasonSameSiteUnspecifiedTreatedAsLax);
        case Protocol.Network.SetCookieBlockedReason.SameSiteNoneInsecure:
          return i18nString(UIStrings.blockedReasonSameSiteNoneInsecure);
        case Protocol.Network.SetCookieBlockedReason.UserPreferences:
          return i18nString(UIStrings.thisSetcookieWasBlockedDueToUser);
        case Protocol.Network.SetCookieBlockedReason.SyntaxError:
          return i18nString(UIStrings.thisSetcookieHadInvalidSyntax);
        case Protocol.Network.SetCookieBlockedReason.SchemeNotSupported:
          return i18nString(UIStrings.theSchemeOfThisConnectionIsNot);
        case Protocol.Network.SetCookieBlockedReason.OverwriteSecure:
          return i18nString(UIStrings.blockedReasonOverwriteSecure);
        case Protocol.Network.SetCookieBlockedReason.InvalidDomain:
          return i18nString(UIStrings.blockedReasonInvalidDomain);
        case Protocol.Network.SetCookieBlockedReason.InvalidPrefix:
          return i18nString(UIStrings.blockedReasonInvalidPrefix);
        case Protocol.Network.SetCookieBlockedReason.UnknownError:
          return i18nString(UIStrings.anUnknownErrorWasEncounteredWhenTrying);
        case Protocol.Network.SetCookieBlockedReason.SchemefulSameSiteStrict:
          return i18nString(
              UIStrings.thisSetcookieWasBlockedBecauseItHadTheSamesiteStrictLax, {PH1: 'SameSite=Strict'});
        case Protocol.Network.SetCookieBlockedReason.SchemefulSameSiteLax:
          return i18nString(UIStrings.thisSetcookieWasBlockedBecauseItHadTheSamesiteStrictLax, {PH1: 'SameSite=Lax'});
        case Protocol.Network.SetCookieBlockedReason.SchemefulSameSiteUnspecifiedTreatedAsLax:
          return i18nString(UIStrings.thisSetcookieDidntSpecifyASamesite);
        case Protocol.Network.SetCookieBlockedReason.SamePartyFromCrossPartyContext:
          return i18nString(UIStrings.thisSetcookieWasBlockedBecauseItHadTheSameparty);
        case Protocol.Network.SetCookieBlockedReason.SamePartyConflictsWithOtherAttributes:
          return i18nString(UIStrings.thisSetcookieWasBlockedBecauseItHadTheSamepartyAttribute);
      }
      return '';
    };

export const cookieBlockedReasonToAttribute = function(blockedReason: Protocol.Network.CookieBlockedReason): Attributes|
    null {
      switch (blockedReason) {
        case Protocol.Network.CookieBlockedReason.SecureOnly:
          return Attributes.Secure;
        case Protocol.Network.CookieBlockedReason.NotOnPath:
          return Attributes.Path;
        case Protocol.Network.CookieBlockedReason.DomainMismatch:
          return Attributes.Domain;
        case Protocol.Network.CookieBlockedReason.SameSiteStrict:
        case Protocol.Network.CookieBlockedReason.SameSiteLax:
        case Protocol.Network.CookieBlockedReason.SameSiteUnspecifiedTreatedAsLax:
        case Protocol.Network.CookieBlockedReason.SameSiteNoneInsecure:
        case Protocol.Network.CookieBlockedReason.SchemefulSameSiteStrict:
        case Protocol.Network.CookieBlockedReason.SchemefulSameSiteLax:
        case Protocol.Network.CookieBlockedReason.SchemefulSameSiteUnspecifiedTreatedAsLax:
          return Attributes.SameSite;
        case Protocol.Network.CookieBlockedReason.SamePartyFromCrossPartyContext:
          return Attributes.SameParty;
        case Protocol.Network.CookieBlockedReason.UserPreferences:
        case Protocol.Network.CookieBlockedReason.UnknownError:
          return null;
      }
      return null;
    };

export const setCookieBlockedReasonToAttribute = function(blockedReason: Protocol.Network.SetCookieBlockedReason):
    Attributes|null {
      switch (blockedReason) {
        case Protocol.Network.SetCookieBlockedReason.SecureOnly:
        case Protocol.Network.SetCookieBlockedReason.OverwriteSecure:
          return Attributes.Secure;
        case Protocol.Network.SetCookieBlockedReason.SameSiteStrict:
        case Protocol.Network.SetCookieBlockedReason.SameSiteLax:
        case Protocol.Network.SetCookieBlockedReason.SameSiteUnspecifiedTreatedAsLax:
        case Protocol.Network.SetCookieBlockedReason.SameSiteNoneInsecure:
        case Protocol.Network.SetCookieBlockedReason.SchemefulSameSiteStrict:
        case Protocol.Network.SetCookieBlockedReason.SchemefulSameSiteLax:
        case Protocol.Network.SetCookieBlockedReason.SchemefulSameSiteUnspecifiedTreatedAsLax:
          return Attributes.SameSite;
        case Protocol.Network.SetCookieBlockedReason.InvalidDomain:
          return Attributes.Domain;
        case Protocol.Network.SetCookieBlockedReason.InvalidPrefix:
          return Attributes.Name;
        case Protocol.Network.SetCookieBlockedReason.SamePartyConflictsWithOtherAttributes:
        case Protocol.Network.SetCookieBlockedReason.SamePartyFromCrossPartyContext:
          return Attributes.SameParty;
        case Protocol.Network.SetCookieBlockedReason.UserPreferences:
        case Protocol.Network.SetCookieBlockedReason.SyntaxError:
        case Protocol.Network.SetCookieBlockedReason.SchemeNotSupported:
        case Protocol.Network.SetCookieBlockedReason.UnknownError:
          return null;
      }
      return null;
    };

export interface NameValue {
  name: string;
  value: string;
}

export interface WebSocketFrame {
  type: WebSocketFrameType;
  time: number;
  text: string;
  opCode: number;
  mask: boolean;
}

export interface BlockedSetCookieWithReason {
  blockedReasons: Protocol.Network.SetCookieBlockedReason[];
  cookieLine: string;
  cookie: Cookie|null;
}

export interface BlockedCookieWithReason {
  blockedReasons: Protocol.Network.CookieBlockedReason[];
  cookie: Cookie;
}

export interface ContentData {
  error: string|null;
  content: string|null;
  encoded: boolean;
}

export interface EventSourceMessage {
  time: number;
  eventName: string;
  eventId: string;
  data: string;
}

export interface ExtraRequestInfo {
  blockedRequestCookies: {
    blockedReasons: Protocol.Network.CookieBlockedReason[],
    cookie: Cookie,
  }[];
  requestHeaders: NameValue[];
  includedRequestCookies: Cookie[];
  clientSecurityState?: Protocol.Network.ClientSecurityState;
}

export interface ExtraResponseInfo {
  blockedResponseCookies: {
    blockedReasons: Protocol.Network.SetCookieBlockedReason[],
    cookieLine: string,
    cookie: Cookie|null,
  }[];
  responseHeaders: NameValue[];
  responseHeadersText?: string;
  resourceIPAddressSpace: Protocol.Network.IPAddressSpace;
}

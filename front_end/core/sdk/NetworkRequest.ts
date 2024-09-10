// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';

import {Attribute, type Cookie} from './Cookie.js';
import {CookieModel} from './CookieModel.js';
import {CookieParser} from './CookieParser.js';
import * as HttpReasonPhraseStrings from './HttpReasonPhraseStrings.js';
import {Events as NetworkManagerEvents, NetworkManager} from './NetworkManager.js';
import {ServerSentEvents} from './ServerSentEvents.js';
import {ServerTiming} from './ServerTiming.js';
import {Type} from './Target.js';

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
  thirdPartyPhaseout: 'This cookie was blocked either because of Chrome flags or browser configuration. Learn more in the Issues panel.',
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
   *@description Tooltip to explain why a cookie was blocked due to exceeding the maximum size
   */
  nameValuePairExceedsMaxSize: 'This cookie was blocked because it was too large. The combined size of the name and value must be less than or equal to 4096 characters.',
  /**
   *@description Tooltip to explain why an attempt to set a cookie via `Set-Cookie` HTTP header on a request's response was blocked.
   */
  thisSetcookieWasBlockedDueToUser: 'This attempt to set a cookie via a `Set-Cookie` header was blocked due to user preferences.',
  /**
   *@description Tooltip to explain why an attempt to set a cookie via `Set-Cookie` HTTP header on a request's response was blocked.
   */
   thisSetcookieWasBlockedDueThirdPartyPhaseout: 'Setting this cookie was blocked either because of Chrome flags or browser configuration. Learn more in the Issues panel.',
  /**
   *@description Tooltip to explain why an attempt to set a cookie via `Set-Cookie` HTTP header on a request's response was blocked.
   */
  thisSetcookieHadInvalidSyntax: 'This `Set-Cookie` header had invalid syntax.',
  /**
   *@description Tooltip to explain why a cookie was blocked
   */
  thisSetcookieHadADisallowedCharacter: 'This `Set-Cookie` header contained a disallowed character (a forbidden ASCII control character, or the tab character if it appears in the middle of the cookie name, value, an attribute name, or an attribute value).',
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
  /**
   *@description Tooltip to explain why a cookie was blocked when the size of the #name plus the size of the value exceeds the max size.
   */
  thisSetcookieWasBlockedBecauseTheNameValuePairExceedsMaxSize: 'This attempt to set a cookie via a `Set-Cookie` header was blocked because the cookie was too large. The combined size of the name and value must be less than or equal to 4096 characters.',
  /**
   *@description Text in Network Manager
   *@example {https://example.com} PH1
   */
  setcookieHeaderIsIgnoredIn: 'Set-Cookie header is ignored in response from url: {PH1}. The combined size of the name and value must be less than or equal to 4096 characters.',
  /**
   *@description Tooltip to explain why the cookie should have been blocked by third-party cookie phaseout but is exempted.
   */
   exemptionReasonUserSetting: 'This cookie is allowed by user preference.',
   /**
    *@description Tooltip to explain why the cookie should have been blocked by third-party cookie phaseout but is exempted.
    */
   exemptionReasonTPCDMetadata: 'This cookie is allowed by a third-party cookie deprecation trial grace period. Learn more: goo.gle/dt-grace.',
   /**
    *@description Tooltip to explain why the cookie should have been blocked by third-party cookie phaseout but is exempted.
    */
   exemptionReasonTPCDDeprecationTrial: 'This cookie is allowed by third-party cookie deprecation trial. Learn more: goo.gle/ps-dt.',
   /**
    *@description Tooltip to explain why the cookie should have been blocked by third-party cookie phaseout but is exempted.
    */
  exemptionReasonTopLevelTPCDDeprecationTrial: 'This cookie is allowed by top-level third-party cookie deprecation trial. Learn more: goo.gle/ps-dt.',
   /**
    *@description Tooltip to explain why the cookie should have been blocked by third-party cookie phaseout but is exempted.
    */
   exemptionReasonTPCDHeuristics: 'This cookie is allowed by third-party cookie heuristics. Learn more: goo.gle/hbe',
   /**
    *@description Tooltip to explain why the cookie should have been blocked by third-party cookie phaseout but is exempted.
    */
   exemptionReasonEnterprisePolicy: 'This cookie is allowed by Chrome Enterprise policy. Learn more: goo.gle/ce-3pc',
   /**
    *@description Tooltip to explain why the cookie should have been blocked by third-party cookie phaseout but is exempted.
    */
   exemptionReasonStorageAccessAPI: 'This cookie is allowed by the Storage Access API. Learn more: goo.gle/saa',
   /**
    *@description Tooltip to explain why the cookie should have been blocked by third-party cookie phaseout but is exempted.
    */
   exemptionReasonTopLevelStorageAccessAPI: 'This cookie is allowed by the top-level Storage Access API. Learn more: goo.gle/saa-top',
   /**
    *@description Tooltip to explain why the cookie should have been blocked by third-party cookie phaseout but is exempted.
    */
    exemptionReasonScheme: 'This cookie is allowed by the top-level url scheme',
};
// clang-format on

const str_ = i18n.i18n.registerUIStrings('core/sdk/NetworkRequest.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class NetworkRequest extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    TextUtils.ContentProvider.StreamingContentProvider {
  #requestIdInternal: string;
  #backendRequestIdInternal?: Protocol.Network.RequestId;
  readonly #documentURLInternal: Platform.DevToolsPath.UrlString;
  readonly #frameIdInternal: Protocol.Page.FrameId|null;
  readonly #loaderIdInternal: Protocol.Network.LoaderId|null;
  readonly #hasUserGesture: boolean|undefined;
  readonly #initiatorInternal: Protocol.Network.Initiator|null|undefined;
  #redirectSourceInternal: NetworkRequest|null;
  #preflightRequestInternal: NetworkRequest|null;
  #preflightInitiatorRequestInternal: NetworkRequest|null;
  #isRedirectInternal: boolean;
  #redirectDestinationInternal: NetworkRequest|null;
  #issueTimeInternal: number;
  #startTimeInternal: number;
  #endTimeInternal: number;
  #blockedReasonInternal: Protocol.Network.BlockedReason|undefined;
  #corsErrorStatusInternal: Protocol.Network.CorsErrorStatus|undefined;
  statusCode: number;
  statusText: string;
  requestMethod: string;
  requestTime: number;
  protocol: string;
  alternateProtocolUsage: Protocol.Network.AlternateProtocolUsage|undefined;
  mixedContentType: Protocol.Security.MixedContentType;
  #initialPriorityInternal: Protocol.Network.ResourcePriority|null;
  #currentPriority: Protocol.Network.ResourcePriority|null;
  #signedExchangeInfoInternal: Protocol.Network.SignedExchangeInfo|null;
  #webBundleInfoInternal: WebBundleInfo|null;
  #webBundleInnerRequestInfoInternal: WebBundleInnerRequestInfo|null;
  #resourceTypeInternal: Common.ResourceType.ResourceType;
  #contentDataInternal: Promise<TextUtils.ContentData.ContentDataOrError>|null;
  #streamingContentData: Promise<TextUtils.StreamingContentData.StreamingContentDataOrError>|null;
  readonly #framesInternal: WebSocketFrame[];
  #responseHeaderValues: {
    [x: string]: string|undefined,
  };
  #responseHeadersTextInternal: string;
  #originalResponseHeaders: Protocol.Fetch.HeaderEntry[];
  #sortedOriginalResponseHeaders?: NameValue[];

  // This field is only used when intercepting and overriding requests, because
  // in that case 'this.responseHeaders' does not contain 'set-cookie' headers.
  #setCookieHeaders: Protocol.Fetch.HeaderEntry[];

  #requestHeadersInternal: NameValue[];
  #requestHeaderValues: {
    [x: string]: string|undefined,
  };
  #remoteAddressInternal: string;
  #remoteAddressSpaceInternal: Protocol.Network.IPAddressSpace;
  #referrerPolicyInternal: Protocol.Network.RequestReferrerPolicy|null;
  #securityStateInternal: Protocol.Security.SecurityState;
  #securityDetailsInternal: Protocol.Network.SecurityDetails|null;
  connectionId: string;
  connectionReused: boolean;
  hasNetworkData: boolean;
  #formParametersPromise: Promise<NameValue[]|null>|null;
  #requestFormDataPromise: Promise<string|null>|null;
  #hasExtraRequestInfoInternal: boolean;
  #hasExtraResponseInfoInternal: boolean;
  #blockedRequestCookiesInternal: BlockedCookieWithReason[];
  #includedRequestCookiesInternal: IncludedCookieWithReason[];
  #blockedResponseCookiesInternal: BlockedSetCookieWithReason[];
  #exemptedResponseCookiesInternal: ExemptedSetCookieWithReason[];
  #responseCookiesPartitionKey: Protocol.Network.CookiePartitionKey|null;
  #responseCookiesPartitionKeyOpaque: boolean|null;
  #siteHasCookieInOtherPartition: boolean;
  localizedFailDescription: string|null;
  #urlInternal!: Platform.DevToolsPath.UrlString;
  #responseReceivedTimeInternal!: number;
  #transferSizeInternal!: number;
  #finishedInternal!: boolean;
  #failedInternal!: boolean;
  #canceledInternal!: boolean;
  #preservedInternal!: boolean;
  #mimeTypeInternal!: string;
  #charset!: string;
  #parsedURLInternal!: Common.ParsedURL.ParsedURL;
  #nameInternal!: string|undefined;
  #pathInternal!: string|undefined;
  #clientSecurityStateInternal!: Protocol.Network.ClientSecurityState|undefined;
  #trustTokenParamsInternal!: Protocol.Network.TrustTokenParams|undefined;
  #trustTokenOperationDoneEventInternal!: Protocol.Network.TrustTokenOperationDoneEvent|undefined;
  #responseCacheStorageCacheName?: string;
  #serviceWorkerResponseSourceInternal?: Protocol.Network.ServiceWorkerResponseSource;
  #wallIssueTime?: number;
  #responseRetrievalTime?: Date;
  #resourceSizeInternal?: number;
  #fromMemoryCache?: boolean;
  #fromDiskCache?: boolean;
  #fromPrefetchCacheInternal?: boolean;
  #fromEarlyHints?: boolean;
  #fetchedViaServiceWorkerInternal?: boolean;
  #serviceWorkerRouterInfoInternal?: Protocol.Network.ServiceWorkerRouterInfo;
  #timingInternal?: Protocol.Network.ResourceTiming;
  #requestHeadersTextInternal?: string;
  #responseHeadersInternal?: NameValue[];
  #earlyHintsHeadersInternal?: NameValue[];
  #sortedResponseHeadersInternal?: NameValue[];
  #responseCookiesInternal?: Cookie[];
  #serverTimingsInternal?: ServerTiming[]|null;
  #queryStringInternal?: string|null;
  #parsedQueryParameters?: NameValue[];
  #contentDataProvider?: (() => Promise<TextUtils.ContentData.ContentDataOrError>);
  #isSameSiteInternal: boolean|null;
  #wasIntercepted: boolean;
  #associatedData = new Map<string, object>();
  #hasOverriddenContent: boolean;
  #hasThirdPartyCookiePhaseoutIssue: boolean;
  #serverSentEvents?: ServerSentEvents;
  responseReceivedPromise?: Promise<void>;
  responseReceivedPromiseResolve?: () => void;

  constructor(
      requestId: string, backendRequestId: Protocol.Network.RequestId|undefined, url: Platform.DevToolsPath.UrlString,
      documentURL: Platform.DevToolsPath.UrlString, frameId: Protocol.Page.FrameId|null,
      loaderId: Protocol.Network.LoaderId|null, initiator: Protocol.Network.Initiator|null, hasUserGesture?: boolean) {
    super();

    this.#requestIdInternal = requestId;
    this.#backendRequestIdInternal = backendRequestId;
    this.setUrl(url);
    this.#documentURLInternal = documentURL;
    this.#frameIdInternal = frameId;
    this.#loaderIdInternal = loaderId;
    this.#initiatorInternal = initiator;
    this.#hasUserGesture = hasUserGesture;
    this.#redirectSourceInternal = null;
    this.#preflightRequestInternal = null;
    this.#preflightInitiatorRequestInternal = null;
    this.#isRedirectInternal = false;
    this.#redirectDestinationInternal = null;
    this.#issueTimeInternal = -1;
    this.#startTimeInternal = -1;
    this.#endTimeInternal = -1;
    this.#blockedReasonInternal = undefined;
    this.#corsErrorStatusInternal = undefined;

    this.statusCode = 0;
    this.statusText = '';
    this.requestMethod = '';
    this.requestTime = 0;
    this.protocol = '';
    this.alternateProtocolUsage = undefined;
    this.mixedContentType = Protocol.Security.MixedContentType.None;

    this.#initialPriorityInternal = null;
    this.#currentPriority = null;

    this.#signedExchangeInfoInternal = null;
    this.#webBundleInfoInternal = null;
    this.#webBundleInnerRequestInfoInternal = null;

    this.#resourceTypeInternal = Common.ResourceType.resourceTypes.Other;
    this.#contentDataInternal = null;
    this.#streamingContentData = null;
    this.#framesInternal = [];

    this.#responseHeaderValues = {};
    this.#responseHeadersTextInternal = '';
    this.#originalResponseHeaders = [];
    this.#setCookieHeaders = [];

    this.#requestHeadersInternal = [];
    this.#requestHeaderValues = {};

    this.#remoteAddressInternal = '';
    this.#remoteAddressSpaceInternal = Protocol.Network.IPAddressSpace.Unknown;

    this.#referrerPolicyInternal = null;

    this.#securityStateInternal = Protocol.Security.SecurityState.Unknown;
    this.#securityDetailsInternal = null;

    this.connectionId = '0';
    this.connectionReused = false;
    this.hasNetworkData = false;
    this.#formParametersPromise = null;
    this.#requestFormDataPromise = (Promise.resolve(null) as Promise<string|null>| null);

    this.#hasExtraRequestInfoInternal = false;
    this.#hasExtraResponseInfoInternal = false;

    this.#blockedRequestCookiesInternal = [];
    this.#includedRequestCookiesInternal = [];
    this.#blockedResponseCookiesInternal = [];
    this.#exemptedResponseCookiesInternal = [];
    this.#siteHasCookieInOtherPartition = false;
    this.#responseCookiesPartitionKey = null;
    this.#responseCookiesPartitionKeyOpaque = null;

    this.localizedFailDescription = null;
    this.#isSameSiteInternal = null;

    this.#wasIntercepted = false;
    this.#hasOverriddenContent = false;
    this.#hasThirdPartyCookiePhaseoutIssue = false;
  }

  static create(
      backendRequestId: Protocol.Network.RequestId, url: Platform.DevToolsPath.UrlString,
      documentURL: Platform.DevToolsPath.UrlString, frameId: Protocol.Page.FrameId|null,
      loaderId: Protocol.Network.LoaderId|null, initiator: Protocol.Network.Initiator|null,
      hasUserGesture?: boolean): NetworkRequest {
    return new NetworkRequest(
        backendRequestId, backendRequestId, url, documentURL, frameId, loaderId, initiator, hasUserGesture);
  }

  static createForWebSocket(
      backendRequestId: Protocol.Network.RequestId, requestURL: Platform.DevToolsPath.UrlString,
      initiator?: Protocol.Network.Initiator): NetworkRequest {
    return new NetworkRequest(
        backendRequestId, backendRequestId, requestURL, Platform.DevToolsPath.EmptyUrlString, null, null,
        initiator || null);
  }

  static createWithoutBackendRequest(
      requestId: string, url: Platform.DevToolsPath.UrlString, documentURL: Platform.DevToolsPath.UrlString,
      initiator: Protocol.Network.Initiator|null): NetworkRequest {
    return new NetworkRequest(requestId, undefined, url, documentURL, null, null, initiator);
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
    return this.#requestIdInternal;
  }

  backendRequestId(): Protocol.Network.RequestId|undefined {
    return this.#backendRequestIdInternal;
  }

  url(): Platform.DevToolsPath.UrlString {
    return this.#urlInternal;
  }

  isBlobRequest(): boolean {
    return Common.ParsedURL.schemeIs(this.#urlInternal, 'blob:');
  }

  setUrl(x: Platform.DevToolsPath.UrlString): void {
    if (this.#urlInternal === x) {
      return;
    }

    this.#urlInternal = x;
    this.#parsedURLInternal = new Common.ParsedURL.ParsedURL(x);
    this.#queryStringInternal = undefined;
    this.#parsedQueryParameters = undefined;
    this.#nameInternal = undefined;
    this.#pathInternal = undefined;
  }

  get documentURL(): Platform.DevToolsPath.UrlString {
    return this.#documentURLInternal;
  }

  get parsedURL(): Common.ParsedURL.ParsedURL {
    return this.#parsedURLInternal;
  }

  get frameId(): Protocol.Page.FrameId|null {
    return this.#frameIdInternal;
  }

  get loaderId(): Protocol.Network.LoaderId|null {
    return this.#loaderIdInternal;
  }

  setRemoteAddress(ip: string, port: number): void {
    this.#remoteAddressInternal = ip + ':' + port;
    this.dispatchEventToListeners(Events.REMOTE_ADDRESS_CHANGED, this);
  }

  remoteAddress(): string {
    return this.#remoteAddressInternal;
  }

  remoteAddressSpace(): Protocol.Network.IPAddressSpace {
    return this.#remoteAddressSpaceInternal;
  }

  /**
   * The cache #name of the CacheStorage from where the response is served via
   * the ServiceWorker.
   */
  getResponseCacheStorageCacheName(): string|undefined {
    return this.#responseCacheStorageCacheName;
  }

  setResponseCacheStorageCacheName(x: string): void {
    this.#responseCacheStorageCacheName = x;
  }

  serviceWorkerResponseSource(): Protocol.Network.ServiceWorkerResponseSource|undefined {
    return this.#serviceWorkerResponseSourceInternal;
  }

  setServiceWorkerResponseSource(serviceWorkerResponseSource: Protocol.Network.ServiceWorkerResponseSource): void {
    this.#serviceWorkerResponseSourceInternal = serviceWorkerResponseSource;
  }

  setReferrerPolicy(referrerPolicy: Protocol.Network.RequestReferrerPolicy): void {
    this.#referrerPolicyInternal = referrerPolicy;
  }

  referrerPolicy(): Protocol.Network.RequestReferrerPolicy|null {
    return this.#referrerPolicyInternal;
  }

  securityState(): Protocol.Security.SecurityState {
    return this.#securityStateInternal;
  }

  setSecurityState(securityState: Protocol.Security.SecurityState): void {
    this.#securityStateInternal = securityState;
  }

  securityDetails(): Protocol.Network.SecurityDetails|null {
    return this.#securityDetailsInternal;
  }

  securityOrigin(): string {
    return this.#parsedURLInternal.securityOrigin();
  }

  setSecurityDetails(securityDetails: Protocol.Network.SecurityDetails): void {
    this.#securityDetailsInternal = securityDetails;
  }

  get startTime(): number {
    return this.#startTimeInternal || -1;
  }

  setIssueTime(monotonicTime: number, wallTime: number): void {
    this.#issueTimeInternal = monotonicTime;
    this.#wallIssueTime = wallTime;
    this.#startTimeInternal = monotonicTime;
  }

  issueTime(): number {
    return this.#issueTimeInternal;
  }

  pseudoWallTime(monotonicTime: number): number {
    return this.#wallIssueTime ? this.#wallIssueTime - this.#issueTimeInternal + monotonicTime : monotonicTime;
  }

  get responseReceivedTime(): number {
    return this.#responseReceivedTimeInternal || -1;
  }

  set responseReceivedTime(x: number) {
    this.#responseReceivedTimeInternal = x;
  }

  /**
   * The time at which the returned response was generated. For cached
   * responses, this is the last time the cache entry was validated.
   */
  getResponseRetrievalTime(): Date|undefined {
    return this.#responseRetrievalTime;
  }

  setResponseRetrievalTime(x: Date): void {
    this.#responseRetrievalTime = x;
  }

  get endTime(): number {
    return this.#endTimeInternal || -1;
  }

  set endTime(x: number) {
    if (this.timing && this.timing.requestTime) {
      // Check against accurate responseReceivedTime.
      this.#endTimeInternal = Math.max(x, this.responseReceivedTime);
    } else {
      // Prefer endTime since it might be from the network stack.
      this.#endTimeInternal = x;
      if (this.#responseReceivedTimeInternal > x) {
        this.#responseReceivedTimeInternal = x;
      }
    }
    this.dispatchEventToListeners(Events.TIMING_CHANGED, this);
  }

  get duration(): number {
    if (this.#endTimeInternal === -1 || this.#startTimeInternal === -1) {
      return -1;
    }
    return this.#endTimeInternal - this.#startTimeInternal;
  }

  get latency(): number {
    if (this.#responseReceivedTimeInternal === -1 || this.#startTimeInternal === -1) {
      return -1;
    }
    return this.#responseReceivedTimeInternal - this.#startTimeInternal;
  }

  get resourceSize(): number {
    return this.#resourceSizeInternal || 0;
  }

  set resourceSize(x: number) {
    this.#resourceSizeInternal = x;
  }

  get transferSize(): number {
    return this.#transferSizeInternal || 0;
  }

  increaseTransferSize(x: number): void {
    this.#transferSizeInternal = (this.#transferSizeInternal || 0) + x;
  }

  setTransferSize(x: number): void {
    this.#transferSizeInternal = x;
  }

  get finished(): boolean {
    return this.#finishedInternal;
  }

  set finished(x: boolean) {
    if (this.#finishedInternal === x) {
      return;
    }

    this.#finishedInternal = x;

    if (x) {
      this.dispatchEventToListeners(Events.FINISHED_LOADING, this);
    }
  }

  get failed(): boolean {
    return this.#failedInternal;
  }

  set failed(x: boolean) {
    this.#failedInternal = x;
  }

  get canceled(): boolean {
    return this.#canceledInternal;
  }

  set canceled(x: boolean) {
    this.#canceledInternal = x;
  }

  get preserved(): boolean {
    return this.#preservedInternal;
  }

  set preserved(x: boolean) {
    this.#preservedInternal = x;
  }

  blockedReason(): Protocol.Network.BlockedReason|undefined {
    return this.#blockedReasonInternal;
  }

  setBlockedReason(reason: Protocol.Network.BlockedReason): void {
    this.#blockedReasonInternal = reason;
  }

  corsErrorStatus(): Protocol.Network.CorsErrorStatus|undefined {
    return this.#corsErrorStatusInternal;
  }

  setCorsErrorStatus(corsErrorStatus: Protocol.Network.CorsErrorStatus): void {
    this.#corsErrorStatusInternal = corsErrorStatus;
  }

  wasBlocked(): boolean {
    return Boolean(this.#blockedReasonInternal);
  }

  cached(): boolean {
    return (Boolean(this.#fromMemoryCache) || Boolean(this.#fromDiskCache)) && !this.#transferSizeInternal;
  }

  cachedInMemory(): boolean {
    return Boolean(this.#fromMemoryCache) && !this.#transferSizeInternal;
  }

  fromPrefetchCache(): boolean {
    return Boolean(this.#fromPrefetchCacheInternal);
  }

  setFromMemoryCache(): void {
    this.#fromMemoryCache = true;
    this.#timingInternal = undefined;
  }

  get fromDiskCache(): boolean|undefined {
    return this.#fromDiskCache;
  }

  setFromDiskCache(): void {
    this.#fromDiskCache = true;
  }

  setFromPrefetchCache(): void {
    this.#fromPrefetchCacheInternal = true;
  }

  fromEarlyHints(): boolean {
    return Boolean(this.#fromEarlyHints);
  }

  setFromEarlyHints(): void {
    this.#fromEarlyHints = true;
  }

  /**
   * Returns true if the request was intercepted by a service worker and it
   * provided its own response.
   */
  get fetchedViaServiceWorker(): boolean {
    return Boolean(this.#fetchedViaServiceWorkerInternal);
  }

  set fetchedViaServiceWorker(x: boolean) {
    this.#fetchedViaServiceWorkerInternal = x;
  }

  get serviceWorkerRouterInfo(): Protocol.Network.ServiceWorkerRouterInfo|undefined {
    return this.#serviceWorkerRouterInfoInternal;
  }

  set serviceWorkerRouterInfo(x: Protocol.Network.ServiceWorkerRouterInfo) {
    this.#serviceWorkerRouterInfoInternal = x;
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
    return this.#timingInternal;
  }

  set timing(timingInfo: Protocol.Network.ResourceTiming|undefined) {
    if (!timingInfo || this.#fromMemoryCache) {
      return;
    }
    // Take startTime and responseReceivedTime from timing data for better accuracy.
    // Timing's requestTime is a baseline in seconds, rest of the numbers there are ticks in millis.
    this.#startTimeInternal = timingInfo.requestTime;
    const headersReceivedTime = timingInfo.requestTime + timingInfo.receiveHeadersEnd / 1000.0;
    if ((this.#responseReceivedTimeInternal || -1) < 0 || this.#responseReceivedTimeInternal > headersReceivedTime) {
      this.#responseReceivedTimeInternal = headersReceivedTime;
    }
    if (this.#startTimeInternal > this.#responseReceivedTimeInternal) {
      this.#responseReceivedTimeInternal = this.#startTimeInternal;
    }

    this.#timingInternal = timingInfo;
    this.dispatchEventToListeners(Events.TIMING_CHANGED, this);
  }

  private setConnectTimingFromExtraInfo(connectTiming: Protocol.Network.ConnectTiming): void {
    this.#startTimeInternal = connectTiming.requestTime;
    this.dispatchEventToListeners(Events.TIMING_CHANGED, this);
  }

  get mimeType(): string {
    return this.#mimeTypeInternal;
  }

  set mimeType(x: string) {
    this.#mimeTypeInternal = x;
    if (x === Platform.MimeType.MimeType.EVENTSTREAM && !this.#serverSentEvents) {
      const parseFromStreamedData = this.resourceType() !== Common.ResourceType.resourceTypes.EventSource;
      this.#serverSentEvents = new ServerSentEvents(this, parseFromStreamedData);
    }
  }

  get displayName(): string {
    return this.#parsedURLInternal.displayName;
  }

  name(): string {
    if (this.#nameInternal) {
      return this.#nameInternal;
    }
    this.parseNameAndPathFromURL();
    return this.#nameInternal as string;
  }

  path(): string {
    if (this.#pathInternal) {
      return this.#pathInternal;
    }
    this.parseNameAndPathFromURL();
    return this.#pathInternal as string;
  }

  private parseNameAndPathFromURL(): void {
    if (this.#parsedURLInternal.isDataURL()) {
      this.#nameInternal = this.#parsedURLInternal.dataURLDisplayName();
      this.#pathInternal = '';
    } else if (this.#parsedURLInternal.isBlobURL()) {
      this.#nameInternal = this.#parsedURLInternal.url;
      this.#pathInternal = '';
    } else if (this.#parsedURLInternal.isAboutBlank()) {
      this.#nameInternal = this.#parsedURLInternal.url;
      this.#pathInternal = '';
    } else {
      this.#pathInternal = this.#parsedURLInternal.host + this.#parsedURLInternal.folderPathComponents;

      const networkManager = NetworkManager.forRequest(this);
      const inspectedURL =
          networkManager ? Common.ParsedURL.ParsedURL.fromString(networkManager.target().inspectedURL()) : null;
      this.#pathInternal = Platform.StringUtilities.trimURL(this.#pathInternal, inspectedURL ? inspectedURL.host : '');
      if (this.#parsedURLInternal.lastPathComponent || this.#parsedURLInternal.queryParams) {
        this.#nameInternal = this.#parsedURLInternal.lastPathComponent +
            (this.#parsedURLInternal.queryParams ? '?' + this.#parsedURLInternal.queryParams : '');
      } else if (this.#parsedURLInternal.folderPathComponents) {
        this.#nameInternal = this.#parsedURLInternal.folderPathComponents.substring(
                                 this.#parsedURLInternal.folderPathComponents.lastIndexOf('/') + 1) +
            '/';
        this.#pathInternal = this.#pathInternal.substring(0, this.#pathInternal.lastIndexOf('/'));
      } else {
        this.#nameInternal = this.#parsedURLInternal.host;
        this.#pathInternal = '';
      }
    }
  }

  get folder(): string {
    let path: string = this.#parsedURLInternal.path;
    const indexOfQuery = path.indexOf('?');
    if (indexOfQuery !== -1) {
      path = path.substring(0, indexOfQuery);
    }
    const lastSlashIndex = path.lastIndexOf('/');
    return lastSlashIndex !== -1 ? path.substring(0, lastSlashIndex) : '';
  }

  get pathname(): string {
    return this.#parsedURLInternal.path;
  }

  resourceType(): Common.ResourceType.ResourceType {
    return this.#resourceTypeInternal;
  }

  setResourceType(resourceType: Common.ResourceType.ResourceType): void {
    this.#resourceTypeInternal = resourceType;
  }

  get domain(): string {
    return this.#parsedURLInternal.host;
  }

  get scheme(): string {
    return this.#parsedURLInternal.scheme;
  }

  getInferredStatusText(): string {
    return this.statusText || HttpReasonPhraseStrings.getStatusText(this.statusCode);
  }

  redirectSource(): NetworkRequest|null {
    return this.#redirectSourceInternal;
  }

  setRedirectSource(originatingRequest: NetworkRequest|null): void {
    this.#redirectSourceInternal = originatingRequest;
  }

  preflightRequest(): NetworkRequest|null {
    return this.#preflightRequestInternal;
  }

  setPreflightRequest(preflightRequest: NetworkRequest|null): void {
    this.#preflightRequestInternal = preflightRequest;
  }

  preflightInitiatorRequest(): NetworkRequest|null {
    return this.#preflightInitiatorRequestInternal;
  }

  setPreflightInitiatorRequest(preflightInitiatorRequest: NetworkRequest|null): void {
    this.#preflightInitiatorRequestInternal = preflightInitiatorRequest;
  }

  isPreflightRequest(): boolean {
    return this.#initiatorInternal !== null && this.#initiatorInternal !== undefined &&
        this.#initiatorInternal.type === Protocol.Network.InitiatorType.Preflight;
  }

  redirectDestination(): NetworkRequest|null {
    return this.#redirectDestinationInternal;
  }

  setRedirectDestination(redirectDestination: NetworkRequest|null): void {
    this.#redirectDestinationInternal = redirectDestination;
  }

  requestHeaders(): NameValue[] {
    return this.#requestHeadersInternal;
  }

  setRequestHeaders(headers: NameValue[]): void {
    this.#requestHeadersInternal = headers;

    this.dispatchEventToListeners(Events.REQUEST_HEADERS_CHANGED);
  }

  requestHeadersText(): string|undefined {
    return this.#requestHeadersTextInternal;
  }

  setRequestHeadersText(text: string): void {
    this.#requestHeadersTextInternal = text;

    this.dispatchEventToListeners(Events.REQUEST_HEADERS_CHANGED);
  }

  requestHeaderValue(headerName: string): string|undefined {
    if (this.#requestHeaderValues[headerName]) {
      return this.#requestHeaderValues[headerName];
    }
    this.#requestHeaderValues[headerName] = this.computeHeaderValue(this.requestHeaders(), headerName);
    return this.#requestHeaderValues[headerName];
  }

  requestFormData(): Promise<string|null> {
    if (!this.#requestFormDataPromise) {
      this.#requestFormDataPromise = NetworkManager.requestPostData(this);
    }
    return this.#requestFormDataPromise;
  }

  setRequestFormData(hasData: boolean, data: string|null): void {
    this.#requestFormDataPromise = (hasData && data === null) ? null : Promise.resolve(data);
    this.#formParametersPromise = null;
  }

  private filteredProtocolName(): string {
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
      return this.filteredProtocolName();
    }
    const firstLine = headersText.split(/\r\n/)[0];
    const match = firstLine.match(/(HTTP\/\d+\.\d+)$/);
    return match ? match[1] : 'HTTP/0.9';
  }

  get responseHeaders(): NameValue[] {
    return this.#responseHeadersInternal || [];
  }

  set responseHeaders(x: NameValue[]) {
    this.#responseHeadersInternal = x;
    this.#sortedResponseHeadersInternal = undefined;
    this.#serverTimingsInternal = undefined;
    this.#responseCookiesInternal = undefined;
    this.#responseHeaderValues = {};

    this.dispatchEventToListeners(Events.RESPONSE_HEADERS_CHANGED);
  }

  get earlyHintsHeaders(): NameValue[] {
    return this.#earlyHintsHeadersInternal || [];
  }

  set earlyHintsHeaders(x: NameValue[]) {
    this.#earlyHintsHeadersInternal = x;
  }

  get originalResponseHeaders(): Protocol.Fetch.HeaderEntry[] {
    return this.#originalResponseHeaders;
  }

  set originalResponseHeaders(headers: Protocol.Fetch.HeaderEntry[]) {
    this.#originalResponseHeaders = headers;
    this.#sortedOriginalResponseHeaders = undefined;
  }

  get setCookieHeaders(): Protocol.Fetch.HeaderEntry[] {
    return this.#setCookieHeaders;
  }

  set setCookieHeaders(headers: Protocol.Fetch.HeaderEntry[]) {
    this.#setCookieHeaders = headers;
  }

  get responseHeadersText(): string {
    return this.#responseHeadersTextInternal;
  }

  set responseHeadersText(x: string) {
    this.#responseHeadersTextInternal = x;

    this.dispatchEventToListeners(Events.RESPONSE_HEADERS_CHANGED);
  }

  get sortedResponseHeaders(): NameValue[] {
    if (this.#sortedResponseHeadersInternal !== undefined) {
      return this.#sortedResponseHeadersInternal;
    }

    this.#sortedResponseHeadersInternal = this.responseHeaders.slice();
    return this.#sortedResponseHeadersInternal.sort(function(a, b) {
      return Platform.StringUtilities.compare(a.name.toLowerCase(), b.name.toLowerCase());
    });
  }

  get sortedOriginalResponseHeaders(): NameValue[] {
    if (this.#sortedOriginalResponseHeaders !== undefined) {
      return this.#sortedOriginalResponseHeaders;
    }

    this.#sortedOriginalResponseHeaders = this.originalResponseHeaders.slice();
    return this.#sortedOriginalResponseHeaders.sort(function(a, b) {
      return Platform.StringUtilities.compare(a.name.toLowerCase(), b.name.toLowerCase());
    });
  }

  get overrideTypes(): OverrideType[] {
    const types: OverrideType[] = [];

    if (this.hasOverriddenContent) {
      types.push('content');
    }

    if (this.hasOverriddenHeaders()) {
      types.push('headers');
    }

    return types;
  }

  get hasOverriddenContent(): boolean {
    return this.#hasOverriddenContent;
  }

  set hasOverriddenContent(value: boolean) {
    this.#hasOverriddenContent = value;
  }

  #deduplicateHeaders(sortedHeaders: NameValue[]): NameValue[] {
    const dedupedHeaders: NameValue[] = [];
    for (const header of sortedHeaders) {
      if (dedupedHeaders.length && dedupedHeaders[dedupedHeaders.length - 1].name === header.name) {
        dedupedHeaders[dedupedHeaders.length - 1].value += `, ${header.value}`;
      } else {
        dedupedHeaders.push({name: header.name, value: header.value});
      }
    }
    return dedupedHeaders;
  }

  hasOverriddenHeaders(): boolean {
    if (!this.#originalResponseHeaders.length) {
      return false;
    }
    const responseHeaders = this.#deduplicateHeaders(this.sortedResponseHeaders);
    const originalResponseHeaders = this.#deduplicateHeaders(this.sortedOriginalResponseHeaders);
    if (responseHeaders.length !== originalResponseHeaders.length) {
      return true;
    }
    for (let i = 0; i < responseHeaders.length; i++) {
      if (responseHeaders[i].name.toLowerCase() !== originalResponseHeaders[i].name.toLowerCase()) {
        return true;
      }
      if (responseHeaders[i].value !== originalResponseHeaders[i].value) {
        return true;
      }
    }
    return false;
  }

  responseHeaderValue(headerName: string): string|undefined {
    if (headerName in this.#responseHeaderValues) {
      return this.#responseHeaderValues[headerName];
    }
    this.#responseHeaderValues[headerName] = this.computeHeaderValue(this.responseHeaders, headerName);
    return this.#responseHeaderValues[headerName];
  }

  wasIntercepted(): boolean {
    return this.#wasIntercepted;
  }

  setWasIntercepted(wasIntercepted: boolean): void {
    this.#wasIntercepted = wasIntercepted;
  }

  setEarlyHintsHeaders(headers: NameValue[]): void {
    this.earlyHintsHeaders = headers;
  }

  get responseCookies(): Cookie[] {
    if (!this.#responseCookiesInternal) {
      this.#responseCookiesInternal =
          CookieParser.parseSetCookie(this.responseHeaderValue('Set-Cookie'), this.domain) || [];
      if (this.#responseCookiesPartitionKey) {
        for (const cookie of this.#responseCookiesInternal) {
          if (cookie.partitioned()) {
            cookie.setPartitionKey(
                this.#responseCookiesPartitionKey.topLevelSite, this.#responseCookiesPartitionKey.hasCrossSiteAncestor);
          }
        }
      } else if (this.#responseCookiesPartitionKeyOpaque) {
        for (const cookie of this.#responseCookiesInternal) {
          // Do not check cookie.partitioned() since most opaque partitions
          // are fenced/credentialless frames partitioned by default.
          cookie.setPartitionKeyOpaque();
        }
      }
    }
    return this.#responseCookiesInternal;
  }

  responseLastModified(): string|undefined {
    return this.responseHeaderValue('last-modified');
  }

  allCookiesIncludingBlockedOnes(): Cookie[] {
    return [
      ...this.includedRequestCookies().map(includedRequestCookie => includedRequestCookie.cookie),
      ...this.responseCookies,
      ...this.blockedRequestCookies().map(blockedRequestCookie => blockedRequestCookie.cookie),
      ...this.blockedResponseCookies().map(blockedResponseCookie => blockedResponseCookie.cookie),
    ].filter(v => Boolean(v)) as Cookie[];
  }

  get serverTimings(): ServerTiming[]|null {
    if (typeof this.#serverTimingsInternal === 'undefined') {
      this.#serverTimingsInternal = ServerTiming.parseHeaders(this.responseHeaders);
    }
    return this.#serverTimingsInternal;
  }

  queryString(): string|null {
    if (this.#queryStringInternal !== undefined) {
      return this.#queryStringInternal;
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
    this.#queryStringInternal = queryString;
    return this.#queryStringInternal;
  }

  get queryParameters(): NameValue[]|null {
    if (this.#parsedQueryParameters) {
      return this.#parsedQueryParameters;
    }
    const queryString = this.queryString();
    if (!queryString) {
      return null;
    }
    this.#parsedQueryParameters = this.parseParameters(queryString);
    return this.#parsedQueryParameters;
  }

  private async parseFormParameters(): Promise<NameValue[]|null> {
    const requestContentType = this.requestContentType();

    if (!requestContentType) {
      return null;
    }

    // Handling application/#x-www-form-urlencoded request bodies.
    if (requestContentType.match(/^application\/x-www-form-urlencoded\s*(;.*)?$/i)) {
      const formData = await this.requestFormData();
      if (!formData) {
        return null;
      }

      return this.parseParameters(formData);
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

    return this.parseMultipartFormDataParameters(formData, boundary);
  }

  formParameters(): Promise<NameValue[]|null> {
    if (!this.#formParametersPromise) {
      this.#formParametersPromise = this.parseFormParameters();
    }
    return this.#formParametersPromise;
  }

  responseHttpVersion(): string {
    const headersText = this.#responseHeadersTextInternal;
    if (!headersText) {
      const version = this.responseHeaderValue('version') || this.responseHeaderValue(':version');
      if (version) {
        return version;
      }
      return this.filteredProtocolName();
    }
    const firstLine = headersText.split(/\r\n/)[0];
    const match = firstLine.match(/^(HTTP\/\d+\.\d+)/);
    return match ? match[1] : 'HTTP/0.9';
  }

  private parseParameters(queryString: string): NameValue[] {
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
   * Content-Disposition: form-data; #name="field-#name"; filename="r.gif"
   * Content-Type: application/octet-stream
   *
   * optionalValue
   * --boundaryString
   * Content-Disposition: form-data; #name="field-#name-2"
   *
   * optionalValue2
   * --boundaryString--
   */
  private parseMultipartFormDataParameters(data: string, boundary: string): NameValue[] {
    const sanitizedBoundary = Platform.StringUtilities.escapeForRegExp(boundary);
    const keyValuePattern = new RegExp(
        // Header with an optional file #name.
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

  private computeHeaderValue(headers: NameValue[], headerName: string): string|undefined {
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
    // Set-Cookie #values should be separated by '\n', not comma, otherwise cookies could not be parsed.
    if (headerName === 'set-cookie') {
      return values.join('\n');
    }
    return values.join(', ');
  }

  requestContentData(): Promise<TextUtils.ContentData.ContentDataOrError> {
    if (this.#contentDataInternal) {
      return this.#contentDataInternal;
    }
    if (this.#contentDataProvider) {
      this.#contentDataInternal = this.#contentDataProvider();
    } else {
      this.#contentDataInternal = NetworkManager.requestContentData(this);
    }
    return this.#contentDataInternal;
  }

  setContentDataProvider(dataProvider: () => Promise<TextUtils.ContentData.ContentDataOrError>): void {
    console.assert(!this.#contentDataInternal, 'contentData can only be set once.');
    this.#contentDataProvider = dataProvider;
  }

  requestStreamingContent(): Promise<TextUtils.StreamingContentData.StreamingContentDataOrError> {
    if (this.#streamingContentData) {
      return this.#streamingContentData;
    }

    const contentPromise = this.finished ? this.requestContentData() : NetworkManager.streamResponseBody(this);
    this.#streamingContentData = contentPromise.then(contentData => {
      if (TextUtils.ContentData.ContentData.isError(contentData)) {
        return contentData;
      }
      // Note that this is save: "streamResponseBody()" always creates base64-based ContentData and
      // for "contentData()" we'll never call "addChunk".
      return TextUtils.StreamingContentData.StreamingContentData.from(contentData);
    });

    return this.#streamingContentData;
  }

  contentURL(): Platform.DevToolsPath.UrlString {
    return this.#urlInternal;
  }

  contentType(): Common.ResourceType.ResourceType {
    return this.#resourceTypeInternal;
  }

  async requestContent(): Promise<TextUtils.ContentProvider.DeferredContent> {
    return TextUtils.ContentData.ContentData.asDeferredContent(await this.requestContentData());
  }

  async searchInContent(query: string, caseSensitive: boolean, isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]> {
    if (!this.#contentDataProvider) {
      return NetworkManager.searchInRequest(this, query, caseSensitive, isRegex);
    }

    const contentData = await this.requestContentData();
    if (TextUtils.ContentData.ContentData.isError(contentData) || !contentData.isTextContent) {
      return [];
    }
    return TextUtils.TextUtils.performSearchInContentData(contentData, query, caseSensitive, isRegex);
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
    this.#initialPriorityInternal = priority;
  }

  initialPriority(): Protocol.Network.ResourcePriority|null {
    return this.#initialPriorityInternal;
  }

  setPriority(priority: Protocol.Network.ResourcePriority): void {
    this.#currentPriority = priority;
  }

  priority(): Protocol.Network.ResourcePriority|null {
    return this.#currentPriority || this.#initialPriorityInternal || null;
  }

  setSignedExchangeInfo(info: Protocol.Network.SignedExchangeInfo): void {
    this.#signedExchangeInfoInternal = info;
  }

  signedExchangeInfo(): Protocol.Network.SignedExchangeInfo|null {
    return this.#signedExchangeInfoInternal;
  }

  setWebBundleInfo(info: WebBundleInfo|null): void {
    this.#webBundleInfoInternal = info;
  }

  webBundleInfo(): WebBundleInfo|null {
    return this.#webBundleInfoInternal;
  }

  setWebBundleInnerRequestInfo(info: WebBundleInnerRequestInfo|null): void {
    this.#webBundleInnerRequestInfoInternal = info;
  }

  webBundleInnerRequestInfo(): WebBundleInnerRequestInfo|null {
    return this.#webBundleInnerRequestInfoInternal;
  }

  async populateImageSource(image: HTMLImageElement): Promise<void> {
    const contentData = await this.requestContentData();
    if (TextUtils.ContentData.ContentData.isError(contentData)) {
      return;
    }
    let imageSrc = contentData.asDataUrl();
    if (imageSrc === null && !this.#failedInternal) {
      const cacheControl = this.responseHeaderValue('cache-control') || '';
      if (!cacheControl.includes('no-cache')) {
        imageSrc = this.#urlInternal;
      }
    }
    if (imageSrc !== null) {
      image.src = imageSrc;
    }
  }

  initiator(): Protocol.Network.Initiator|null {
    return this.#initiatorInternal || null;
  }

  hasUserGesture(): boolean|null {
    return this.#hasUserGesture ?? null;
  }

  frames(): WebSocketFrame[] {
    return this.#framesInternal;
  }

  addProtocolFrameError(errorMessage: string, time: number): void {
    this.addFrame(
        {type: WebSocketFrameType.Error, text: errorMessage, time: this.pseudoWallTime(time), opCode: -1, mask: false});
  }

  addProtocolFrame(response: Protocol.Network.WebSocketFrame, time: number, sent: boolean): void {
    const type = sent ? WebSocketFrameType.Send : WebSocketFrameType.Receive;
    this.addFrame({
      type,
      text: response.payloadData,
      time: this.pseudoWallTime(time),
      opCode: response.opcode,
      mask: response.mask,
    });
  }

  addFrame(frame: WebSocketFrame): void {
    this.#framesInternal.push(frame);
    this.dispatchEventToListeners(Events.WEBSOCKET_FRAME_ADDED, frame);
  }

  eventSourceMessages(): readonly EventSourceMessage[] {
    return this.#serverSentEvents?.eventSourceMessages ?? [];
  }

  addEventSourceMessage(time: number, eventName: string, eventId: string, data: string): void {
    this.#serverSentEvents?.onProtocolEventSourceMessageReceived(eventName, data, eventId, this.pseudoWallTime(time));
  }

  markAsRedirect(redirectCount: number): void {
    this.#isRedirectInternal = true;
    this.#requestIdInternal = `${this.#backendRequestIdInternal}:redirected.${redirectCount}`;
  }

  isRedirect(): boolean {
    return this.#isRedirectInternal;
  }

  setRequestIdForTest(requestId: Protocol.Network.RequestId): void {
    this.#backendRequestIdInternal = requestId;
    this.#requestIdInternal = requestId;
  }

  charset(): string|null {
    return this.#charset ?? null;
  }

  setCharset(charset: string): void {
    this.#charset = charset;
  }

  addExtraRequestInfo(extraRequestInfo: ExtraRequestInfo): void {
    this.#blockedRequestCookiesInternal = extraRequestInfo.blockedRequestCookies;
    this.#includedRequestCookiesInternal = extraRequestInfo.includedRequestCookies;
    this.setRequestHeaders(extraRequestInfo.requestHeaders);
    this.#hasExtraRequestInfoInternal = true;
    this.setRequestHeadersText('');  // Mark request headers as non-provisional
    this.#clientSecurityStateInternal = extraRequestInfo.clientSecurityState;
    this.setConnectTimingFromExtraInfo(extraRequestInfo.connectTiming);
    this.#siteHasCookieInOtherPartition = extraRequestInfo.siteHasCookieInOtherPartition ?? false;

    this.#hasThirdPartyCookiePhaseoutIssue = this.#blockedRequestCookiesInternal.some(
        item => item.blockedReasons.includes(Protocol.Network.CookieBlockedReason.ThirdPartyPhaseout));
  }

  hasExtraRequestInfo(): boolean {
    return this.#hasExtraRequestInfoInternal;
  }

  blockedRequestCookies(): BlockedCookieWithReason[] {
    return this.#blockedRequestCookiesInternal;
  }

  includedRequestCookies(): IncludedCookieWithReason[] {
    return this.#includedRequestCookiesInternal;
  }

  hasRequestCookies(): boolean {
    return this.#includedRequestCookiesInternal.length > 0 || this.#blockedRequestCookiesInternal.length > 0;
  }

  siteHasCookieInOtherPartition(): boolean {
    return this.#siteHasCookieInOtherPartition;
  }

  // Parse the status text from the first line of the response headers text.
  // See net::HttpResponseHeaders::GetStatusText.
  static parseStatusTextFromResponseHeadersText(responseHeadersText: string): string {
    const firstLineParts = responseHeadersText.split('\r')[0].split(' ');
    return firstLineParts.slice(2).join(' ');
  }

  addExtraResponseInfo(extraResponseInfo: ExtraResponseInfo): void {
    this.#blockedResponseCookiesInternal = extraResponseInfo.blockedResponseCookies;
    if (extraResponseInfo.exemptedResponseCookies) {
      this.#exemptedResponseCookiesInternal = extraResponseInfo.exemptedResponseCookies;
    }
    this.#responseCookiesPartitionKey =
        extraResponseInfo.cookiePartitionKey ? extraResponseInfo.cookiePartitionKey : null;
    this.#responseCookiesPartitionKeyOpaque = extraResponseInfo.cookiePartitionKeyOpaque || null;
    this.responseHeaders = extraResponseInfo.responseHeaders;
    // We store a copy of the headers we initially received, so that after
    // potential header overrides, we can compare actual with original headers.
    this.originalResponseHeaders = extraResponseInfo.responseHeaders.map(headerEntry => ({...headerEntry}));

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

      this.statusText = NetworkRequest.parseStatusTextFromResponseHeadersText(extraResponseInfo.responseHeadersText);
    }
    this.#remoteAddressSpaceInternal = extraResponseInfo.resourceIPAddressSpace;

    if (extraResponseInfo.statusCode) {
      this.statusCode = extraResponseInfo.statusCode;
    }

    this.#hasExtraResponseInfoInternal = true;

    // TODO(crbug.com/1252463) Explore replacing this with a DevTools Issue.
    const networkManager = NetworkManager.forRequest(this);
    if (!networkManager) {
      return;
    }
    for (const blockedCookie of this.#blockedResponseCookiesInternal) {
      if (blockedCookie.blockedReasons.includes(Protocol.Network.SetCookieBlockedReason.NameValuePairExceedsMaxSize)) {
        const message = i18nString(UIStrings.setcookieHeaderIsIgnoredIn, {PH1: this.url()});
        networkManager.dispatchEventToListeners(
            NetworkManagerEvents.MessageGenerated, {message, requestId: this.#requestIdInternal, warning: true});
      }
    }

    const cookieModel = networkManager.target().model(CookieModel);
    if (!cookieModel) {
      return;
    }
    for (const exemptedCookie of this.#exemptedResponseCookiesInternal) {
      cookieModel.removeBlockedCookie(exemptedCookie.cookie);
    }
    for (const blockedCookie of this.#blockedResponseCookiesInternal) {
      const cookie = blockedCookie.cookie;
      if (!cookie) {
        continue;
      }
      if (blockedCookie.blockedReasons.includes(Protocol.Network.SetCookieBlockedReason.ThirdPartyPhaseout)) {
        this.#hasThirdPartyCookiePhaseoutIssue = true;
      }
      cookieModel.addBlockedCookie(
          cookie, blockedCookie.blockedReasons.map(blockedReason => ({
                                                     attribute: setCookieBlockedReasonToAttribute(blockedReason),
                                                     uiString: setCookieBlockedReasonToUiString(blockedReason),
                                                   })));
    }
  }

  hasExtraResponseInfo(): boolean {
    return this.#hasExtraResponseInfoInternal;
  }

  blockedResponseCookies(): BlockedSetCookieWithReason[] {
    return this.#blockedResponseCookiesInternal;
  }

  exemptedResponseCookies(): ExemptedSetCookieWithReason[] {
    return this.#exemptedResponseCookiesInternal;
  }

  nonBlockedResponseCookies(): Cookie[] {
    const blockedCookieLines: (string|null)[] =
        this.blockedResponseCookies().map(blockedCookie => blockedCookie.cookieLine);
    // Use array and remove 1 by 1 to handle the (potential) case of multiple
    // identical cookies, only some of which are blocked.
    const responseCookies = this.responseCookies.filter(cookie => {
      const index = blockedCookieLines.indexOf(cookie.getCookieLine());
      if (index !== -1) {
        blockedCookieLines[index] = null;
        return false;
      }
      return true;
    });
    return responseCookies;
  }

  responseCookiesPartitionKey(): Protocol.Network.CookiePartitionKey|null {
    return this.#responseCookiesPartitionKey;
  }

  responseCookiesPartitionKeyOpaque(): boolean|null {
    return this.#responseCookiesPartitionKeyOpaque;
  }

  redirectSourceSignedExchangeInfoHasNoErrors(): boolean {
    return this.#redirectSourceInternal !== null && this.#redirectSourceInternal.#signedExchangeInfoInternal !== null &&
        !this.#redirectSourceInternal.#signedExchangeInfoInternal.errors;
  }

  clientSecurityState(): Protocol.Network.ClientSecurityState|undefined {
    return this.#clientSecurityStateInternal;
  }

  setTrustTokenParams(trustTokenParams: Protocol.Network.TrustTokenParams): void {
    this.#trustTokenParamsInternal = trustTokenParams;
  }

  trustTokenParams(): Protocol.Network.TrustTokenParams|undefined {
    return this.#trustTokenParamsInternal;
  }

  setTrustTokenOperationDoneEvent(doneEvent: Protocol.Network.TrustTokenOperationDoneEvent): void {
    this.#trustTokenOperationDoneEventInternal = doneEvent;

    this.dispatchEventToListeners(Events.TRUST_TOKEN_RESULT_ADDED);
  }

  trustTokenOperationDoneEvent(): Protocol.Network.TrustTokenOperationDoneEvent|undefined {
    return this.#trustTokenOperationDoneEventInternal;
  }

  setIsSameSite(isSameSite: boolean): void {
    this.#isSameSiteInternal = isSameSite;
  }

  isSameSite(): boolean|null {
    return this.#isSameSiteInternal;
  }

  getAssociatedData(key: string): object|null {
    return this.#associatedData.get(key) || null;
  }

  setAssociatedData(key: string, data: object): void {
    this.#associatedData.set(key, data);
  }

  deleteAssociatedData(key: string): void {
    this.#associatedData.delete(key);
  }

  hasThirdPartyCookiePhaseoutIssue(): boolean {
    return this.#hasThirdPartyCookiePhaseoutIssue;
  }

  addDataReceivedEvent({timestamp, dataLength, encodedDataLength, data}: Protocol.Network.DataReceivedEvent): void {
    this.resourceSize += dataLength;
    if (encodedDataLength !== -1) {
      this.increaseTransferSize(encodedDataLength);
    }
    this.endTime = timestamp;
    if (data) {
      void this.#streamingContentData?.then(contentData => {
        if (!TextUtils.StreamingContentData.isError(contentData)) {
          contentData.addChunk(data);
        }
      });
    }
  }

  waitForResponseReceived(): Promise<void> {
    if (this.responseReceivedPromise) {
      return this.responseReceivedPromise;
    }
    const {promise, resolve} = Promise.withResolvers<void>();
    this.responseReceivedPromise = promise;
    this.responseReceivedPromiseResolve = resolve;
    return this.responseReceivedPromise;
  }
}

export enum Events {
  FINISHED_LOADING = 'FinishedLoading',
  TIMING_CHANGED = 'TimingChanged',
  REMOTE_ADDRESS_CHANGED = 'RemoteAddressChanged',
  REQUEST_HEADERS_CHANGED = 'RequestHeadersChanged',
  RESPONSE_HEADERS_CHANGED = 'ResponseHeadersChanged',
  WEBSOCKET_FRAME_ADDED = 'WebsocketFrameAdded',
  EVENT_SOURCE_MESSAGE_ADDED = 'EventSourceMessageAdded',
  TRUST_TOKEN_RESULT_ADDED = 'TrustTokenResultAdded',
}

export type EventTypes = {
  [Events.FINISHED_LOADING]: NetworkRequest,
  [Events.TIMING_CHANGED]: NetworkRequest,
  [Events.REMOTE_ADDRESS_CHANGED]: NetworkRequest,
  [Events.REQUEST_HEADERS_CHANGED]: void,
  [Events.RESPONSE_HEADERS_CHANGED]: void,
  [Events.WEBSOCKET_FRAME_ADDED]: WebSocketFrame,
  [Events.EVENT_SOURCE_MESSAGE_ADDED]: EventSourceMessage,
  [Events.TRUST_TOKEN_RESULT_ADDED]: void,
};

export const enum InitiatorType {
  OTHER = 'other',
  PARSER = 'parser',
  REDIRECT = 'redirect',
  SCRIPT = 'script',
  PRELOAD = 'preload',
  SIGNED_EXCHANGE = 'signedExchange',
  PREFLIGHT = 'preflight',
}

export enum WebSocketFrameType {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  Send = 'send',
  Receive = 'receive',
  Error = 'error',
  /* eslint-enable @typescript-eslint/naming-convention */
}

export const cookieExemptionReasonToUiString = function(exemptionReason: Protocol.Network.CookieExemptionReason):
    string {
      switch (exemptionReason) {
        case Protocol.Network.CookieExemptionReason.UserSetting:
          return i18nString(UIStrings.exemptionReasonUserSetting);
        case Protocol.Network.CookieExemptionReason.TPCDMetadata:
          return i18nString(UIStrings.exemptionReasonTPCDMetadata);
        case Protocol.Network.CookieExemptionReason.TopLevelTPCDDeprecationTrial:
          return i18nString(UIStrings.exemptionReasonTopLevelTPCDDeprecationTrial);
        case Protocol.Network.CookieExemptionReason.TPCDDeprecationTrial:
          return i18nString(UIStrings.exemptionReasonTPCDDeprecationTrial);
        case Protocol.Network.CookieExemptionReason.TPCDHeuristics:
          return i18nString(UIStrings.exemptionReasonTPCDHeuristics);
        case Protocol.Network.CookieExemptionReason.EnterprisePolicy:
          return i18nString(UIStrings.exemptionReasonEnterprisePolicy);
        case Protocol.Network.CookieExemptionReason.StorageAccess:
          return i18nString(UIStrings.exemptionReasonStorageAccessAPI);
        case Protocol.Network.CookieExemptionReason.TopLevelStorageAccess:
          return i18nString(UIStrings.exemptionReasonTopLevelStorageAccessAPI);
        case Protocol.Network.CookieExemptionReason.Scheme:
          return i18nString(UIStrings.exemptionReasonScheme);
      }
      return '';
    };

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
    case Protocol.Network.CookieBlockedReason.NameValuePairExceedsMaxSize:
      return i18nString(UIStrings.nameValuePairExceedsMaxSize);
    case Protocol.Network.CookieBlockedReason.ThirdPartyPhaseout:
      return i18nString(UIStrings.thirdPartyPhaseout);
  }
  return '';
};

export const setCookieBlockedReasonToUiString = function(
    blockedReason: Protocol.Network.SetCookieBlockedReason): string {
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
      return i18nString(UIStrings.thisSetcookieWasBlockedBecauseItHadTheSamesiteStrictLax, {PH1: 'SameSite=Strict'});
    case Protocol.Network.SetCookieBlockedReason.SchemefulSameSiteLax:
      return i18nString(UIStrings.thisSetcookieWasBlockedBecauseItHadTheSamesiteStrictLax, {PH1: 'SameSite=Lax'});
    case Protocol.Network.SetCookieBlockedReason.SchemefulSameSiteUnspecifiedTreatedAsLax:
      return i18nString(UIStrings.thisSetcookieDidntSpecifyASamesite);
    case Protocol.Network.SetCookieBlockedReason.SamePartyFromCrossPartyContext:
      return i18nString(UIStrings.thisSetcookieWasBlockedBecauseItHadTheSameparty);
    case Protocol.Network.SetCookieBlockedReason.SamePartyConflictsWithOtherAttributes:
      return i18nString(UIStrings.thisSetcookieWasBlockedBecauseItHadTheSamepartyAttribute);
    case Protocol.Network.SetCookieBlockedReason.NameValuePairExceedsMaxSize:
      return i18nString(UIStrings.thisSetcookieWasBlockedBecauseTheNameValuePairExceedsMaxSize);
    case Protocol.Network.SetCookieBlockedReason.DisallowedCharacter:
      return i18nString(UIStrings.thisSetcookieHadADisallowedCharacter);
    case Protocol.Network.SetCookieBlockedReason.ThirdPartyPhaseout:
      return i18nString(UIStrings.thisSetcookieWasBlockedDueThirdPartyPhaseout);
  }
  return '';
};

export const cookieBlockedReasonToAttribute = function(blockedReason: Protocol.Network.CookieBlockedReason): Attribute|
    null {
      switch (blockedReason) {
        case Protocol.Network.CookieBlockedReason.SecureOnly:
          return Attribute.SECURE;
        case Protocol.Network.CookieBlockedReason.NotOnPath:
          return Attribute.PATH;
        case Protocol.Network.CookieBlockedReason.DomainMismatch:
          return Attribute.DOMAIN;
        case Protocol.Network.CookieBlockedReason.SameSiteStrict:
        case Protocol.Network.CookieBlockedReason.SameSiteLax:
        case Protocol.Network.CookieBlockedReason.SameSiteUnspecifiedTreatedAsLax:
        case Protocol.Network.CookieBlockedReason.SameSiteNoneInsecure:
        case Protocol.Network.CookieBlockedReason.SchemefulSameSiteStrict:
        case Protocol.Network.CookieBlockedReason.SchemefulSameSiteLax:
        case Protocol.Network.CookieBlockedReason.SchemefulSameSiteUnspecifiedTreatedAsLax:
          return Attribute.SAME_SITE;
        case Protocol.Network.CookieBlockedReason.SamePartyFromCrossPartyContext:
        case Protocol.Network.CookieBlockedReason.NameValuePairExceedsMaxSize:
        case Protocol.Network.CookieBlockedReason.UserPreferences:
        case Protocol.Network.CookieBlockedReason.ThirdPartyPhaseout:
        case Protocol.Network.CookieBlockedReason.UnknownError:
          return null;
      }
      return null;
    };

export const setCookieBlockedReasonToAttribute = function(blockedReason: Protocol.Network.SetCookieBlockedReason):
    Attribute|null {
      switch (blockedReason) {
        case Protocol.Network.SetCookieBlockedReason.SecureOnly:
        case Protocol.Network.SetCookieBlockedReason.OverwriteSecure:
          return Attribute.SECURE;
        case Protocol.Network.SetCookieBlockedReason.SameSiteStrict:
        case Protocol.Network.SetCookieBlockedReason.SameSiteLax:
        case Protocol.Network.SetCookieBlockedReason.SameSiteUnspecifiedTreatedAsLax:
        case Protocol.Network.SetCookieBlockedReason.SameSiteNoneInsecure:
        case Protocol.Network.SetCookieBlockedReason.SchemefulSameSiteStrict:
        case Protocol.Network.SetCookieBlockedReason.SchemefulSameSiteLax:
        case Protocol.Network.SetCookieBlockedReason.SchemefulSameSiteUnspecifiedTreatedAsLax:
          return Attribute.SAME_SITE;
        case Protocol.Network.SetCookieBlockedReason.InvalidDomain:
          return Attribute.DOMAIN;
        case Protocol.Network.SetCookieBlockedReason.InvalidPrefix:
          return Attribute.NAME;
        case Protocol.Network.SetCookieBlockedReason.SamePartyConflictsWithOtherAttributes:
        case Protocol.Network.SetCookieBlockedReason.SamePartyFromCrossPartyContext:
        case Protocol.Network.SetCookieBlockedReason.NameValuePairExceedsMaxSize:
        case Protocol.Network.SetCookieBlockedReason.UserPreferences:
        case Protocol.Network.SetCookieBlockedReason.ThirdPartyPhaseout:
        case Protocol.Network.SetCookieBlockedReason.SyntaxError:
        case Protocol.Network.SetCookieBlockedReason.SchemeNotSupported:
        case Protocol.Network.SetCookieBlockedReason.UnknownError:
        case Protocol.Network.SetCookieBlockedReason.DisallowedCharacter:
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
  cookie: Cookie;
  blockedReasons: Protocol.Network.CookieBlockedReason[];
}

export interface IncludedCookieWithReason {
  cookie: Cookie;
  exemptionReason: Protocol.Network.CookieExemptionReason|undefined;
}

export interface ExemptedSetCookieWithReason {
  cookie: Cookie;
  cookieLine: string;
  exemptionReason: Protocol.Network.CookieExemptionReason;
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
  includedRequestCookies: IncludedCookieWithReason[];
  clientSecurityState?: Protocol.Network.ClientSecurityState;
  connectTiming: Protocol.Network.ConnectTiming;
  siteHasCookieInOtherPartition?: boolean;
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
  statusCode: number|undefined;
  cookiePartitionKey?: Protocol.Network.CookiePartitionKey;
  cookiePartitionKeyOpaque: boolean|undefined;
  exemptedResponseCookies: {
    cookie: Cookie,
    cookieLine: string,
    exemptionReason: Protocol.Network.CookieExemptionReason,
  }[]|undefined;
}

export interface EarlyHintsInfo {
  responseHeaders: NameValue[];
}

export interface WebBundleInfo {
  resourceUrls?: Platform.DevToolsPath.UrlString[];
  errorMessage?: string;
}

export interface WebBundleInnerRequestInfo {
  bundleRequestId?: string;
  errorMessage?: string;
}

export type OverrideType = 'content'|'headers';

// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file is auto-generated, do not edit manually.
// Re-generate with: npm run generate-protocol-resources

export const UIStrings = {
  /**
   * @description We show this warning when 1) an 'authorization' header is attached to the request by scripts, 2) there is no 'authorization' in the 'access-control-allow-headers' header in the response, and 3) there is a wildcard symbol ('*') in the 'access-control-allow-header' header in the response. This is allowed now, but we're planning to reject such responses and require responses to have an 'access-control-allow-headers' containing 'authorization'.
   */
  AuthorizationCoveredByWildcard: "Authorization will not be covered by the wildcard symbol (*) in CORS `Access-Control-Allow-Headers` handling.",
  /**
   * @description This warning occurs when a page attempts to request a resource whose URL contained both a newline character (`\n` or `\r`), and a less-than character (`<`). These resources are blocked.
   */
  CanRequestURLHTTPContainingNewline: "Resource requests whose URLs contained both removed whitespace `\\(n|r|t)` characters and less-than characters (`<`) are blocked. Please remove newlines and encode less-than characters from places like element attribute values in order to load these resources.",
  /**
   * @description This warning occurs when the website attempts to invoke the deprecated `chrome.loadTimes().connectionInfo` API.
   */
  ChromeLoadTimesConnectionInfo: "`chrome.loadTimes()` is deprecated, instead use standardized API: Navigation Timing 2.",
  /**
   * @description This warning occurs when the website attempts to invoke the deprecated `chrome.loadTimes().firstPaintAfterLoadTime` API.
   */
  ChromeLoadTimesFirstPaintAfterLoadTime: "`chrome.loadTimes()` is deprecated, instead use standardized API: Paint Timing.",
  /**
   * @description This warning occurs when the website attempts to invoke the deprecated `chrome.loadTimes().wasAlternateProtocolAvailable` API.
   */
  ChromeLoadTimesWasAlternateProtocolAvailable: "`chrome.loadTimes()` is deprecated, instead use standardized API: `nextHopProtocol` in Navigation Timing 2.",
  /**
   * @description This warning occurs when the browser attempts to store a cookie containing a banned character. Rather than the cookie string being truncated at the banned character, the entire cookie will be rejected now.
   */
  CookieWithTruncatingChar: "Cookies containing a `\\(0|r|n)` character will be rejected instead of truncated.",
  /**
   * @description This warning occurs when a frame accesses another frame's data after having set `document.domain` without having set the `Origin-Agent-Cluster` http header. This is a companion warning to `documentDomainSettingWithoutOriginAgentClusterHeader`, where that warning occurs when `document.domain` is set, and this warning occurs when an access has been made, based on that previous `document.domain` setting.
   */
  CrossOriginAccessBasedOnDocumentDomain: "Relaxing the same-origin policy by setting `document.domain` is deprecated, and will be disabled by default. This deprecation warning is for a cross-origin access that was enabled by setting `document.domain`.",
  /**
   * @description Issue text shown when the web page uses a deprecated web API. The window.alert is the deprecated web API function.
   */
  CrossOriginWindowAlert: "Triggering window.alert from cross origin iframes has been deprecated and will be removed in the future.",
  /**
   * @description Issue text shown when the web page uses a deprecated web API. The window.confirm is the deprecated web API function.
   */
  CrossOriginWindowConfirm: "Triggering window.confirm from cross origin iframes has been deprecated and will be removed in the future.",
  /**
   * @description Warning displayed to developers when their website uses `:--customstatename` in CSS. They can simply switch their CSS to `:state(customstatename)` and it will be the same.
   */
  CSSCustomStateDeprecatedSyntax: "`:--customstatename` is deprecated. Please use the `:state(customstatename)` syntax instead.",
  /**
   * @description Warning displayed to developers when they hide the Cast button on a video element using the deprecated CSS selector instead of using the disableRemotePlayback attribute on the element.
   */
  CSSSelectorInternalMediaControlsOverlayCastButton: "The `disableRemotePlayback` attribute should be used in order to disable the default Cast integration instead of using `-internal-media-controls-overlay-cast-button` selector.",
  /**
   * @description Warning displayed to developers to let them know the CSS appearance property values they used are deprecated and will be removed.
   */
  CSSValueAppearanceNonStandard: "CSS appearance values  `inner-spin-button`, `media-slider`, `media-sliderthumb`, `media-volume-slider`, `media-volume-sliderthumb`, `push-button`, `searchfield-cancel-button`, `slider-horizontal`, `sliderthumb-horizontal`, `sliderthumb-vertical`, `square-button` are not standardized and will be removed.",
  /**
   * @description Warning displayed to developers to let them know the CSS appearance property value they used is not standard and will be removed.
   */
  CSSValueAppearanceSliderVertical: "CSS appearance value `slider-vertical` is not standardized and will be removed.",
  /**
   * @description Warning displayed to developers when a data: URL is assigned to SVGUseElement to let them know that the support is deprecated.
   */
  DataUrlInSvgUse: "Support for data: URLs in SVGUseElement is deprecated and it will be removed in the future.",
  /**
   * @description This warning occurs when a script modifies `document.domain` without having set on `Origin-Agent-Cluster` http header. In other words, when a script relies on the default behaviour of `Origin-Agent-Cluster` when setting document.domain.
   */
  DocumentDomainSettingWithoutOriginAgentClusterHeader: "Relaxing the same-origin policy by setting `document.domain` is deprecated, and will be disabled by default. To continue using this feature, please opt-out of origin-keyed agent clusters by sending an `Origin-Agent-Cluster: ?0` header along with the HTTP response for the document and frames. See https://developer.chrome.com/blog/immutable-document-domain/ for more details.",
  /**
   * @description Warning displayed to developers when non-standard Mutation Events are used. These are deprecated and will be removed.
   */
  DOMMutationEvents: "DOM Mutation Events, including `DOMSubtreeModified`, `DOMNodeInserted`, `DOMNodeRemoved`, `DOMNodeRemovedFromDocument`, `DOMNodeInsertedIntoDocument`, and `DOMCharacterDataModified` are deprecated (https://w3c.github.io/uievents/#legacy-event-types) and will be removed. Please use `MutationObserver` instead.",
  /**
   * @description Warning displayed to developers when the Geolocation API is used from an insecure origin (one that isn't localhost or doesn't use HTTPS) to notify them that this use is no longer supported.
   */
  GeolocationInsecureOrigin: "`getCurrentPosition()` and `watchPosition()` no longer work on insecure origins. To use this feature, you should consider switching your application to a secure origin, such as HTTPS. See https://goo.gle/chrome-insecure-origins for more details.",
  /**
   * @description Warning displayed to developers when the Geolocation API is used from an insecure origin (one that isn't localhost or doesn't use HTTPS) to notify them that this use is deprecated.
   */
  GeolocationInsecureOriginDeprecatedNotRemoved: "`getCurrentPosition()` and `watchPosition()` are deprecated on insecure origins. To use this feature, you should consider switching your application to a secure origin, such as HTTPS. See https://goo.gle/chrome-insecure-origins for more details.",
  /**
   * @description This warning occurs when the `getUserMedia()` API is invoked on an insecure (e.g., HTTP) site. This is only permitted on secure sites (e.g., HTTPS).
   */
  GetUserMediaInsecureOrigin: "`getUserMedia()` no longer works on insecure origins. To use this feature, you should consider switching your application to a secure origin, such as HTTPS. See https://goo.gle/chrome-insecure-origins for more details.",
  /**
   * @description A deprecation warning shown to developers in the DevTools Issues tab when code tries to use the deprecated hostCandidate field, guiding developers to use the equivalent information in the .address and .port fields instead.
   */
  HostCandidateAttributeGetter: "`RTCPeerConnectionIceErrorEvent.hostCandidate` is deprecated. Please use `RTCPeerConnectionIceErrorEvent.address` or `RTCPeerConnectionIceErrorEvent.port` instead.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab, when a service worker reads one of the fields from an event named 'canmakepayment'.
   */
  IdentityInCanMakePaymentEvent: "The merchant origin and arbitrary data from the `canmakepayment` service worker event are deprecated and will be removed: `topOrigin`, `paymentRequestOrigin`, `methodData`, `modifiers`.",
  /**
   * @description This warning occurs when an insecure context (e.g., HTTP) requests a private resource (not on open internet). This is done to mitigate the potential for CSRF and other attacks.
   */
  InsecurePrivateNetworkSubresourceRequest: "The website requested a subresource from a network that it could only access because of its users' privileged network position. These requests expose non-public devices and servers to the internet, increasing the risk of a cross-site request forgery (CSRF) attack, and/or information leakage. To mitigate these risks, Chrome deprecates requests to non-public subresources when initiated from non-secure contexts, and will start blocking them.",
  /**
   * @description This is a deprecated warning to developers that a field in a structure has been renamed.
   */
  InterestGroupDailyUpdateUrl: "The `dailyUpdateUrl` field of `InterestGroups` passed to `joinAdInterestGroup()` has been renamed to `updateUrl`, to more accurately reflect its behavior.",
  /**
   * @description This warning occurs when a stylesheet loaded from a local file directive does not end in the file type `.css`.
   */
  LocalCSSFileExtensionRejected: "CSS cannot be loaded from `file:` URLs unless they end in a `.css` file extension.",
  /**
   * @description This is a deprecation warning to developers that occurs when the script attempts to use the Media Source Extensions API in a way that is no longer supported by the specification for the API. The usage that is problematic is when the script calls the `SourceBuffer.abort()` method at a time when there is still processing happening in response to a previous `SourceBuffer.remove()` call for the same SourceBuffer object. More precisely, we show this warning to developers when script calls the SourceBuffer abort() method while the asynchronous processing of a remove() call on that SourceBuffer is not yet complete. Early versions of the Media Source Extensions specification allowed such aborts, but standardization of the specification resulted in disallowing the aborts. The script should instead wait for the asynchronous remove() operation to complete, which is observable by listening for the associated 'updateend' event from the SourceBuffer. A note is also included in the warning, describing when abort() is meaningful and allowed by the specification for purposes other than interrupting a remove() operation's asynchronous steps. Those supported purposes include using abort() to interrupt processing that may still be happening in response to a previous appendBuffer() call on that SourceBuffer, or using abort() to clear the internal of any unprocessed data remaining from previous appendBuffer() calls. See https://www.w3.org/TR/media-source-2/#dom-sourcebuffer-abort for the currently specified behavior, which would throw an exception once the deprecated removal abort is no longer supported. See https://github.com/w3c/media-source/issues/19 for the discussion that led to the specification change.
   */
  MediaSourceAbortRemove: "Using `SourceBuffer.abort()` to abort `remove()`'s asynchronous range removal is deprecated due to specification change. Support will be removed in the future. You should listen to the `updateend` event instead. `abort()` is intended to only abort an asynchronous media append or reset parser state.",
  /**
   * @description This is a deprecation warning to developers that occurs when the script attempts to use the Media Source Extensions API in a way that is no longer supported by the specification for the API. The usage that is problematic is when the script sets the duration attribute of a MediaSource object too low. The duration attribute of a MediaSource must be longer than the actual duration of any media (audio or video) already in the MediaSource. When set too low, the MediaSource must remove audio and video content that is beyond the time indicated by the new duration. Content removal that is caused by setting the duration attribute too low is no longer allowed by the specification. The message describes the minimum allowable duration value as the 'highest presentation timestamp of any buffered coded frames' as a more precise way of describing the duration of content already in the MediaSource: 'coded frames' are the specification's way of describing compressed audio frames or compressed video frames, and they each have a 'presentation timestamp' that describes precisely when that frame's playback occurs in the overall media presentation. Early versions of the Media Source Extensions specification allowed this to happen, but standardization of the specification resulted in disallowing this behavior. The underlying issue leading to this specification change was that setting the duration attribute should be synchronous, but setting it lower than the timestamp of something currently buffered would cause confusing removal of media between that new duration and the previous, larger, duration. The script should instead explicitly remove that range of media first, before lowering the duration. See https://www.w3.org/TR/media-source-2/#dom-mediasource-duration and https://www.w3.org/TR/media-source-2/#dom-mediasource-duration for the currently specified behavior, which would throw an exception once support is removed for deprecated implicit asynchronous range removal when duration is truncated. See both https://github.com/w3c/media-source/issues/20 and https://github.com/w3c/media-source/issues/26 for the discussion that led to the specification change.
   */
  MediaSourceDurationTruncatingBuffered: "Setting `MediaSource.duration` below the highest presentation timestamp of any buffered coded frames is deprecated due to specification change. Support for implicit removal of truncated buffered media will be removed in the future. You should instead perform explicit `remove(newDuration, oldDuration)` on all `sourceBuffers`, where `newDuration < oldDuration`.",
  /**
   * @description This warning occurs when the browser requests Web MIDI access as sysex (system exclusive messages) can be allowed via prompt even if the browser did not specifically request it.
   */
  NoSysexWebMIDIWithoutPermission: "Web MIDI will ask a permission to use even if the sysex is not specified in the `MIDIOptions`.",
  /**
   * @description Warning displayed to developers when the Notification API is used from an insecure origin (one that isn't localhost or doesn't use HTTPS) to notify them that this use is no longer supported.
   */
  NotificationInsecureOrigin: "The Notification API may no longer be used from insecure origins. You should consider switching your application to a secure origin, such as HTTPS. See https://goo.gle/chrome-insecure-origins for more details.",
  /**
   * @description Warning displayed to developers when permission to use notifications has been requested by a cross-origin iframe, to notify them that this use is no longer supported.
   */
  NotificationPermissionRequestedIframe: "Permission for the Notification API may no longer be requested from a cross-origin iframe. You should consider requesting permission from a top-level frame or opening a new window instead.",
  /**
   * @description Warning displayed to developers when CreateImageBitmap is used with the newly deprecated option imageOrientation: 'none'.
   */
  ObsoleteCreateImageBitmapImageOrientationNone: "Option `imageOrientation: 'none'` in createImageBitmap is deprecated. Please use createImageBitmap with option {imageOrientation: 'from-image'} instead.",
  /**
   * @description This warning occurs when the WebRTC protocol attempts to negotiate a connection using an obsolete cipher and risks connection security.
   */
  ObsoleteWebRtcCipherSuite: "Your partner is negotiating an obsolete (D)TLS version. Please check with your partner to have this fixed.",
  /**
   * @description Warning displayed to developers that use overflow:visible for replaced elements. This declaration was earlier ignored but will now change the element's painting based on whether the overflow value allows the element to paint outside its bounds.
   */
  OverflowVisibleOnReplacedElement: "Specifying `overflow: visible` on img, video and canvas tags may cause them to produce visual content outside of the element bounds. See https://github.com/WICG/shared-element-transitions/blob/main/debugging_overflow_on_images.md.",
  /**
   * @description Warning displayed to developers when they use the PaymentInstruments API to let them know this API is deprecated.
   */
  PaymentInstruments: "`paymentManager.instruments` is deprecated. Please use just-in-time install for payment handlers instead.",
  /**
   * @description Warning displayed to developers when their Web Payment API usage violates their Content-Security-Policy (CSP) connect-src directive to let them know this CSP bypass has been deprecated.
   */
  PaymentRequestCSPViolation: "Your `PaymentRequest` call bypassed Content-Security-Policy (CSP) `connect-src` directive. This bypass is deprecated. Please add the payment method identifier from the `PaymentRequest` API (in `supportedMethods` field) to your CSP `connect-src` directive.",
  /**
   * @description Warning displayed to developers when persistent storage type is used to notify that storage type is deprecated.
   */
  PersistentQuotaType: "`StorageType.persistent` is deprecated. Please use standardized `navigator.storage` instead.",
  /**
   * @description This issue indicates that a `<source>` element with a `<picture>` parent was using an `src` attribute, which is not valid and is ignored by the browser. The `srcset` attribute should be used instead.
   */
  PictureSourceSrc: "`<source src>` with a `<picture>` parent is invalid and therefore ignored. Please use `<source srcset>` instead.",
  /**
   * @description Warning displayed to developers when the vendor-prefixed method (webkitCancelAnimationFrame) is used rather than the equivalent unprefixed method (cancelAnimationFrame).
   */
  PrefixedCancelAnimationFrame: "webkitCancelAnimationFrame is vendor-specific. Please use the standard cancelAnimationFrame instead.",
  /**
   * @description Warning displayed to developers when the vendor-prefixed method (webkitRequestAnimationFrame) is used rather than the equivalent unprefixed method (requestAnimationFrame).
   */
  PrefixedRequestAnimationFrame: "webkitRequestAnimationFrame is vendor-specific. Please use the standard requestAnimationFrame instead.",
  /**
   * @description Standard message when one web API is deprecated in favor of another.
   */
  PrefixedVideoDisplayingFullscreen: "HTMLVideoElement.webkitDisplayingFullscreen is deprecated. Please use Document.fullscreenElement instead.",
  /**
   * @description Standard message when one web API is deprecated in favor of another.
   */
  PrefixedVideoEnterFullScreen: "HTMLVideoElement.webkitEnterFullScreen() is deprecated. Please use Element.requestFullscreen() instead.",
  /**
   * @description Standard message when one web API is deprecated in favor of another.
   */
  PrefixedVideoEnterFullscreen: "HTMLVideoElement.webkitEnterFullscreen() is deprecated. Please use Element.requestFullscreen() instead.",
  /**
   * @description Standard message when one web API is deprecated in favor of another.
   */
  PrefixedVideoExitFullScreen: "HTMLVideoElement.webkitExitFullScreen() is deprecated. Please use Document.exitFullscreen() instead.",
  /**
   * @description Standard message when one web API is deprecated in favor of another.
   */
  PrefixedVideoExitFullscreen: "HTMLVideoElement.webkitExitFullscreen() is deprecated. Please use Document.exitFullscreen() instead.",
  /**
   * @description Standard message when one web API is deprecated in favor of another.
   */
  PrefixedVideoSupportsFullscreen: "HTMLVideoElement.webkitSupportsFullscreen is deprecated. Please use Document.fullscreenEnabled instead.",
  /**
   * @description Warning displayed to developers that the API `chrome.privacy.websites.privacySandboxEnabled` is being deprecated in favour of three new more granular APIs: topicsEnabled, FledgeEnabled and adMeasurementEnabled. The `privacySandboxEnabled` API allowed extensions to control the homologous Chrome Setting. The existing Chrome Setting for Privacy Sandbox is also going away in favor of more granular settings that are matched by the new extensions APIs- topicsEnabled, FledgeEnabled and adMeasurementEnabled.
   */
  PrivacySandboxExtensionsAPI: "We're deprecating the API `chrome.privacy.websites.privacySandboxEnabled`, though it will remain active for backward compatibility until release M113. Instead, please use `chrome.privacy.websites.topicsEnabled`, `chrome.privacy.websites.fledgeEnabled` and `chrome.privacy.websites.adMeasurementEnabled`. See https://developer.chrome.com/docs/extensions/reference/privacy/#property-websites-privacySandboxEnabled.",
  /**
   * @description Standard message when one web API is deprecated in favor of another.
   */
  RangeExpand: "Range.expand() is deprecated. Please use Selection.modify() instead.",
  /**
   * @description This warning occurs when a subresource loaded by a page has a URL with an authority portion. These are disallowed.
   */
  RequestedSubresourceWithEmbeddedCredentials: "Subresource requests whose URLs contain embedded credentials (e.g. `https://user:pass@host/`) are blocked.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. It's shown when a video conferencing website attempts to use a non-standard crypto method when performing a handshake to set up a connection with another endpoint.
   */
  RTCConstraintEnableDtlsSrtpFalse: "The constraint `DtlsSrtpKeyAgreement` is removed. You have specified a `false` value for this constraint, which is interpreted as an attempt to use the removed `SDES key negotiation` method. This functionality is removed; use a service that supports `DTLS key negotiation` instead.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. It's shown when a video conferencing website uses a non-standard API for controlling the crypto method used, but is not having an effect because the desired behavior is already enabled-by-default.
   */
  RTCConstraintEnableDtlsSrtpTrue: "The constraint `DtlsSrtpKeyAgreement` is removed. You have specified a `true` value for this constraint, which had no effect, but you can remove this constraint for tidiness.",
  /**
   * @description WebRTC is set of JavaScript APIs for sending and receiving data, audio and video. getStats() is a method used to obtain network and quality metrics. There are two versions of this method, one is being deprecated because it is non-standard.
   */
  RTCPeerConnectionGetStatsLegacyNonCompliant: "The callback-based getStats() is deprecated and will be removed. Use the spec-compliant getStats() instead.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. It's shown then a video conferencing website attempts to use the `RTCP MUX` policy.
   */
  RtcpMuxPolicyNegotiate: "The `rtcpMuxPolicy` option is deprecated and will be removed.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. The placeholder is always the noun 'SharedArrayBuffer' which refers to a JavaScript construct.
   */
  SharedArrayBufferConstructedWithoutIsolation: "`SharedArrayBuffer` will require cross-origin isolation. See https://developer.chrome.com/blog/enabling-shared-array-buffer/ for more details.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. It's shown when the speech synthesis API is called before the page receives a user activation.
   */
  TextToSpeech_DisallowedByAutoplay: "`speechSynthesis.speak()` without user activation is deprecated and will be removed.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. It's shown when a listener for the `unload` event is added.
   */
  UnloadHandler: "Unload event listeners are deprecated and will be removed.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. The placeholder is always the noun 'SharedArrayBuffer' which refers to a JavaScript construct. 'Extensions' refers to Chrome extensions. The warning is shown when Chrome Extensions attempt to use 'SharedArrayBuffer's under insecure circumstances.
   */
  V8SharedArrayBufferConstructedInExtensionWithoutIsolation: "Extensions should opt into cross-origin isolation to continue using `SharedArrayBuffer`. See https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/.",
  /**
   * @description Warning displayed to developers when the Web SQL API is used to let them know this API is deprecated.
   */
  WebSQL: "Web SQL is deprecated. Please use SQLite WebAssembly or Indexed Database",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. 'window-placement' and 'window-management' are the name of the javascript descriptors (do not translate). The warning is shown when web pages attempt to use 'window-placement' in permission APIs (e.g. navigator.permissions.query(...))
   */
  WindowPlacementPermissionDescriptorUsed: "The permission descriptor `window-placement` is deprecated. Use `window-management` instead. For more help, check https://bit.ly/window-placement-rename.",
  /**
   * @description A deprecation warning shown in the DevTools Issues tab. 'window-placement' and 'window-management' are the name of the policy descriptors (do not translate). The warning is shown when web pages attempt to use 'window-placement' as a permission policy (parsed in iframe or header).
   */
  WindowPlacementPermissionPolicyParsed: "The permission policy `window-placement` is deprecated. Use `window-management` instead. For more help, check https://bit.ly/window-placement-rename.",
  /**
   * @description Warning displayed to developers that they are using `XMLHttpRequest` API in a way that they expect an unsupported character encoding `UTF-16` could be used in the server reply.
   */
  XHRJSONEncodingDetection: "UTF-16 is not supported by response json in `XMLHttpRequest`",
  /**
   * @description Warning displayed to developers. It is shown when the `XMLHttpRequest` API is used in a way that it slows down the page load of the next page. The `main thread` refers to an operating systems thread used to run most of the processing of HTML documents, so please use a consistent wording.
   */
  XMLHttpRequestSynchronousInNonWorkerOutsideBeforeUnload: "Synchronous `XMLHttpRequest` on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help, check https://xhr.spec.whatwg.org/.",
  /**
   * @description Warning displayed to developers that instead of using `supportsSession()`, which returns a promise that resolves if the XR session can be supported and rejects if not, they should use `isSessionSupported()` which will return a promise which resolves to a boolean indicating if the XR session can be supported or not, but may reject to throw an exception.
   */
  XRSupportsSession: "`supportsSession()` is deprecated. Please use `isSessionSupported()` and check the resolved boolean value instead.",
};

export interface DeprecationDescriptor {
  milestone?: number;
  chromeStatusFeature?: number;
}

export const DEPRECATIONS_METADATA: Partial<Record<string, DeprecationDescriptor>> = {
  "AuthorizationCoveredByWildcard": {
    "milestone": 97
  },
  "CSSCustomStateDeprecatedSyntax": {
    "chromeStatusFeature": 5140610730426368,
    "milestone": 122
  },
  "CSSSelectorInternalMediaControlsOverlayCastButton": {
    "chromeStatusFeature": 5714245488476160
  },
  "CSSValueAppearanceNonStandard": {
    "chromeStatusFeature": 5066630972833792
  },
  "CSSValueAppearanceSliderVertical": {
    "chromeStatusFeature": 6001359429566464
  },
  "CanRequestURLHTTPContainingNewline": {
    "chromeStatusFeature": 5735596811091968
  },
  "ChromeLoadTimesConnectionInfo": {
    "chromeStatusFeature": 5637885046816768
  },
  "ChromeLoadTimesFirstPaintAfterLoadTime": {
    "chromeStatusFeature": 5637885046816768
  },
  "ChromeLoadTimesWasAlternateProtocolAvailable": {
    "chromeStatusFeature": 5637885046816768
  },
  "CookieWithTruncatingChar": {
    "milestone": 103
  },
  "CrossOriginAccessBasedOnDocumentDomain": {
    "milestone": 115
  },
  "DOMMutationEvents": {
    "chromeStatusFeature": 5083947249172480,
    "milestone": 127
  },
  "DataUrlInSvgUse": {
    "chromeStatusFeature": 5128825141198848,
    "milestone": 119
  },
  "DocumentDomainSettingWithoutOriginAgentClusterHeader": {
    "milestone": 115
  },
  "IdentityInCanMakePaymentEvent": {
    "chromeStatusFeature": 5190978431352832
  },
  "InsecurePrivateNetworkSubresourceRequest": {
    "chromeStatusFeature": 5436853517811712,
    "milestone": 92
  },
  "LocalCSSFileExtensionRejected": {
    "milestone": 64
  },
  "MediaSourceAbortRemove": {
    "chromeStatusFeature": 6107495151960064
  },
  "MediaSourceDurationTruncatingBuffered": {
    "chromeStatusFeature": 6107495151960064
  },
  "NoSysexWebMIDIWithoutPermission": {
    "chromeStatusFeature": 5138066234671104,
    "milestone": 82
  },
  "NotificationPermissionRequestedIframe": {
    "chromeStatusFeature": 6451284559265792
  },
  "ObsoleteCreateImageBitmapImageOrientationNone": {
    "milestone": 111
  },
  "ObsoleteWebRtcCipherSuite": {
    "milestone": 81
  },
  "OverflowVisibleOnReplacedElement": {
    "chromeStatusFeature": 5137515594383360,
    "milestone": 108
  },
  "PaymentInstruments": {
    "chromeStatusFeature": 5099285054488576
  },
  "PaymentRequestCSPViolation": {
    "chromeStatusFeature": 6286595631087616
  },
  "PersistentQuotaType": {
    "chromeStatusFeature": 5176235376246784,
    "milestone": 106
  },
  "RTCConstraintEnableDtlsSrtpFalse": {
    "milestone": 97
  },
  "RTCConstraintEnableDtlsSrtpTrue": {
    "milestone": 97
  },
  "RTCPeerConnectionGetStatsLegacyNonCompliant": {
    "chromeStatusFeature": 4631626228695040,
    "milestone": 117
  },
  "RequestedSubresourceWithEmbeddedCredentials": {
    "chromeStatusFeature": 5669008342777856
  },
  "RtcpMuxPolicyNegotiate": {
    "chromeStatusFeature": 5654810086866944,
    "milestone": 62
  },
  "SharedArrayBufferConstructedWithoutIsolation": {
    "milestone": 106
  },
  "TextToSpeech_DisallowedByAutoplay": {
    "chromeStatusFeature": 5687444770914304,
    "milestone": 71
  },
  "UnloadHandler": {
    "chromeStatusFeature": 5579556305502208
  },
  "V8SharedArrayBufferConstructedInExtensionWithoutIsolation": {
    "milestone": 96
  },
  "WebSQL": {
    "chromeStatusFeature": 5134293578285056,
    "milestone": 115
  },
  "WindowPlacementPermissionDescriptorUsed": {
    "chromeStatusFeature": 5137018030391296,
    "milestone": 112
  },
  "WindowPlacementPermissionPolicyParsed": {
    "chromeStatusFeature": 5137018030391296,
    "milestone": 112
  },
  "XHRJSONEncodingDetection": {
    "milestone": 93
  },
  "XRSupportsSession": {
    "milestone": 80
  }
};

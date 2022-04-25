// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {Issue, IssueCategory, IssueKind} from './Issue.js';
import type {MarkdownIssueDescription} from './MarkdownIssueDescription.js';
import {resolveLazyDescription} from './MarkdownIssueDescription.js';

const UIStrings = {
  // Store strings used across messages in this block.
  /**
   * @description This links to the chrome feature status page when one exists.
   */
  feature: 'Check the feature status page for more details.',
  /**
   * @description This links to the chromium dash schedule when a milestone is set.
   * @example {100} milestone
   */
  milestone: 'This change will go into effect with milestone {milestone}.',
  /**
   *@description Title of issue raised when a deprecated feature is used
   */
  title: 'Deprecated Feature Used',

  // Store alphabetized messages per DeprecationIssueType in this block.
  /**
   *@description TODO(crbug.com/1318846): Description needed for translation
   */
  authorizationCoveredByWildcard:
      'Authorization will not be covered by the wildcard symbol (*) in CORS `Access-Control-Allow-Headers` handling.',
  /**
   *@description TODO(crbug.com/1318847): Description needed for translation
   */
  cookieWithTruncatingChar: 'Cookies containing a `\\(0|r|n)` character will be rejected instead of truncated.',
  /**
   *@description TODO(crbug.com/1318849): Description needed for translation
   */
  crossOriginAccessBasedOnDocumentDomain:
      'Relaxing the same-origin policy by setting `document.domain` is deprecated, and will be disabled by default. This deprecation warning is for a cross-origin access that was enabled by setting `document.domain`.',
  /**
   *@description TODO(crbug.com/1318850): Description needed for translation
   */
  crossOriginWindowAlert:
      'Triggering `window.alert` from cross origin iframes has been deprecated and will be removed in the future.',
  /**
   *@description TODO(crbug.com/1318851): Description needed for translation
   */
  crossOriginWindowConfirm:
      'Triggering `window.confirm` from cross origin iframes has been deprecated and will be removed in the future.',
  /**
   *@description This message is shown when the example deprecated feature is used
   */
  deprecationExample: 'This is an example of a translated deprecation issue message.',
  /**
   *@description TODO(crbug.com/1318852): Description needed for translation
   */
  documentDomainSettingWithoutOriginAgentClusterHeader:
      'Relaxing the same-origin policy by setting `document.domain` is deprecated, and will be disabled by default. To continue using this feature, please opt-out of origin-keyed agent clusters by sending an `Origin-Agent-Cluster: ?0` header along with the HTTP response for the document and frames. See https://developer.chrome.com/blog/immutable-document-domain/ for more details.',
  /**
   *@description TODO(crbug.com/1318853): Description needed for translation
   */
  geolocationInsecureOrigin:
      '`getCurrentPosition()` and `watchPosition()` no longer work on insecure origins. To use this feature, you should consider switching your application to a secure origin, such as HTTPS. See https://goo.gl/rStTGz for more details.',
  /**
   *@description TODO(crbug.com/1318855): Description needed for translation
   */
  geolocationInsecureOriginDeprecatedNotRemoved:
      '`getCurrentPosition()` and `watchPosition()` are deprecated on insecure origins. To use this feature, you should consider switching your application to a secure origin, such as HTTPS. See https://goo.gl/rStTGz for more details.',
  /**
   *@description TODO(crbug.com/1318858): Description needed for translation
   */
  getUserMediaInsecureOrigin:
      '`getUserMedia()` no longer works on insecure origins. To use this feature, you should consider switching your application to a secure origin, such as HTTPS. See https://goo.gl/rStTGz for more details.',
  /**
   *@description TODO(crbug.com/1318860): Description needed for translation
   */
  legacyConstraintGoogCpuOveruseDetection:
      'CPU overuse detection is enabled-by-default and the ability to disable it using `googCpuOveruseDetection` will soon be removed. Please stop using this legacy constraint.',
  /**
   *@description TODO(crbug.com/1318861): Description needed for translation
   */
  legacyConstraintGoogIPv6:
      'IPv6 is enabled-by-default and the ability to disable it using `googIPv6` will soon be removed. Please stop using this legacy constraint.',
  /**
   *@description TODO(crbug.com/1318863): Description needed for translation
   */
  legacyConstraintGoogScreencastMinBitrate:
      'Screencast min bitrate is now set to 100 kbps by default and `googScreencastMinBitrate` will soon be ignored in favor of this new default. Please stop using this legacy constraint.',
  /**
   *@description TODO(crbug.com/1318864): Description needed for translation
   */
  legacyConstraintGoogSuspendBelowMinBitrate:
      'Support for the `googSuspendBelowMinBitrate` constraint is about to be removed. Please stop using this legacy constraint.',
  /**
   *@description TODO(crbug.com/1318865): Description needed for translation
   */
  localCSSFileExtensionRejected: 'CSS cannot be loaded from `file:` URLs unless they end in a `.css` file extension.',
  /**
   *@description TODO(crbug.com/1318866): Description needed for translation
   */
  notificationInsecureOrigin:
      'The Notification API may no longer be used from insecure origins. You should consider switching your application to a secure origin, such as HTTPS. See https://goo.gl/rStTGz for more details.',
  /**
   *@description TODO(crbug.com/1318867): Description needed for translation
   */
  obsoleteWebRtcCipherSuite:
      'Your partner is negotiating an obsolete (D)TLS version. Please check with your partner to have this fixed.',
  /**
   *@description This issue indicates that a `<source>` element with a `<picture>` parent was using an `src` attribute, which is not valid and is ignored by the browser. The `srcset` attribute should be used instead.
   */
  pictureSourceSrc:
      '`<source src>` with a `<picture>` parent is invalid and therefore ignored. Please use `<source srcset>` instead.',
  /**
   *@description TODO(crbug.com/1318869): Description needed for translation
   */
  prefixedCancelAnimationFrame:
      '`webkitCancelAnimationFrame` is vendor-specific. Please use the standard `cancelAnimationFrame` instead.',
  /**
   *@description TODO(crbug.com/1318871): Description needed for translation
   */
  prefixedRequestAnimationFrame:
      '`webkitRequestAnimationFrame` is vendor-specific. Please use the standard `requestAnimationFrame` instead.',
  /**
   *@description TODO(crbug.com/1318872): Description needed for translation
   */
  rtcConstraintEnableDtlsSrtpFalse:
      'The constraint `DtlsSrtpKeyAgreement` is removed. You have specified a `false` value for this constraint, which is interpreted as an attempt to use the removed `SDES` key negotiation method. This functionality is removed; use a service that supports DTLS key negotiation instead.',
  /**
   *@description TODO(crbug.com/1318873): Description needed for translation
   */
  rtcConstraintEnableDtlsSrtpTrue:
      'The constraint `DtlsSrtpKeyAgreement` is removed. You have specified a `true` value for this constraint, which had no effect, but you can remove this constraint for tidiness.',
  /**
   *@description TODO(crbug.com/1318874): Description needed for translation
   */
  rtcPeerConnectionComplexPlanBSdpUsingDefaultSdpSemantics:
      'Complex Plan B SDP detected! Chrome will switch the default `sdpSemantics` from `plan-b` to the standardized `unified-plan` format and this peer connection is relying on the default `sdpSemantics`. This SDP is not compatible with Unified Plan and will be rejected by clients expecting Unified Plan. For more information about how to prepare for the switch, see https://webrtc.org/web-apis/chrome/unified-plan/.',
  /**
   *@description TODO(crbug.com/1318875): Description needed for translation
   */
  rtcPeerConnectionLegacyCreateWithMediaConstraints:
      'The `mediaConstraints` version of `RTCOfferOptions/RTCAnswerOptions` are deprecated and will soon be removed, please migrate to the promise-based `createOffer`/`createAnswer` instead.',
  /**
   *@description TODO(crbug.com/1318876): Description needed for translation
   */
  rtpDataChannel:
      'RTP data channels are no longer supported. The `RtpDataChannels` constraint is currently ignored, and may cause an error at a later date.',
  /**
   *@description TODO(crbug.com/1318878): Description needed for translation
   */
  sharedArrayBufferConstructedWithoutIsolation:
      '`SharedArrayBuffer` will require cross-origin isolation. See https://developer.chrome.com/blog/enabling-shared-array-buffer/ for more details.',
  /**
   *@description TODO(crbug.com/1318879): Description needed for translation
   */
  v8SharedArrayBufferConstructedInExtensionWithoutIsolation:
      'Extensions should opt into cross-origin isolation to continue using `SharedArrayBuffer`. See https://developer.chrome.com/docs/extensions/mv3/cross-origin-isolation/.',
  /**
   *@description TODO(crbug.com/1318880): Description needed for translation
   */
  webCodecsVideoFrameDefaultTimestamp:
      'Constructing a `VideoFrame` without a timestamp is deprecated and support will be removed. Please provide a timestamp via `VideoFrameInit`.',
  /**
   *@description TODO(crbug.com/1318881): Description needed for translation
   */
  xhrJSONEncodingDetection: 'UTF-16 is not supported by response json in `XMLHttpRequest`',
  /**
   *@description TODO(crbug.com/1318882): Description needed for translation
   */
  xmlHttpRequestSynchronousInNonWorkerOutsideBeforeUnload:
      'Synchronous `XMLHttpRequest` on the main thread is deprecated because of its detrimental effects to the end user\'s experience. For more help, check https://xhr.spec.whatwg.org/.',
};
const str_ = i18n.i18n.registerUIStrings('models/issues_manager/DeprecationIssue.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export class DeprecationIssue extends Issue {
  #issueDetails: Protocol.Audits.DeprecationIssueDetails;

  constructor(issueDetails: Protocol.Audits.DeprecationIssueDetails, issuesModel: SDK.IssuesModel.IssuesModel) {
    let typeCode = String(issueDetails.type);
    // TODO(crbug.com/1264960): Remove legacy type when issues are translated.
    if (issueDetails.type === Protocol.Audits.DeprecationIssueType.Untranslated) {
      typeCode = String(issueDetails.deprecationType);
    }
    const issueCode = [
      Protocol.Audits.InspectorIssueCode.DeprecationIssue,
      typeCode,
    ].join('::');
    super({code: issueCode, umaCode: 'DeprecationIssue'}, issuesModel);
    this.#issueDetails = issueDetails;
  }

  getCategory(): IssueCategory {
    return IssueCategory.Other;
  }

  details(): Protocol.Audits.DeprecationIssueDetails {
    return this.#issueDetails;
  }

  getDescription(): MarkdownIssueDescription {
    let messageFunction = (): string => '';
    let feature = 0;
    let milestone = 0;
    // Keep case statements alphabetized per DeprecationIssueType.
    switch (this.#issueDetails.type) {
      case Protocol.Audits.DeprecationIssueType.AuthorizationCoveredByWildcard:
        messageFunction = i18nLazyString(UIStrings.authorizationCoveredByWildcard);
        milestone = 97;
        break;
      case Protocol.Audits.DeprecationIssueType.CookieWithTruncatingChar:
        messageFunction = i18nLazyString(UIStrings.cookieWithTruncatingChar);
        milestone = 103;
        break;
      case Protocol.Audits.DeprecationIssueType.CrossOriginAccessBasedOnDocumentDomain:
        messageFunction = i18nLazyString(UIStrings.crossOriginAccessBasedOnDocumentDomain);
        milestone = 106;
        break;
      case Protocol.Audits.DeprecationIssueType.CrossOriginWindowAlert:
        messageFunction = i18nLazyString(UIStrings.crossOriginWindowAlert);
        break;
      case Protocol.Audits.DeprecationIssueType.CrossOriginWindowConfirm:
        messageFunction = i18nLazyString(UIStrings.crossOriginWindowConfirm);
        break;
      case Protocol.Audits.DeprecationIssueType.DeprecationExample:
        messageFunction = i18nLazyString(UIStrings.deprecationExample);
        feature = 5684289032159232;
        milestone = 100;
        break;
      case Protocol.Audits.DeprecationIssueType.DocumentDomainSettingWithoutOriginAgentClusterHeader:
        messageFunction = i18nLazyString(UIStrings.documentDomainSettingWithoutOriginAgentClusterHeader);
        milestone = 106;
        break;
      case Protocol.Audits.DeprecationIssueType.GeolocationInsecureOrigin:
        messageFunction = i18nLazyString(UIStrings.geolocationInsecureOrigin);
        break;
      case Protocol.Audits.DeprecationIssueType.GeolocationInsecureOriginDeprecatedNotRemoved:
        messageFunction = i18nLazyString(UIStrings.geolocationInsecureOriginDeprecatedNotRemoved);
        break;
      case Protocol.Audits.DeprecationIssueType.GetUserMediaInsecureOrigin:
        messageFunction = i18nLazyString(UIStrings.getUserMediaInsecureOrigin);
        break;
      case Protocol.Audits.DeprecationIssueType.LegacyConstraintGoogCpuOveruseDetection:
        messageFunction = i18nLazyString(UIStrings.legacyConstraintGoogCpuOveruseDetection);
        milestone = 103;
        break;
      case Protocol.Audits.DeprecationIssueType.LegacyConstraintGoogIPv6:
        messageFunction = i18nLazyString(UIStrings.legacyConstraintGoogIPv6);
        milestone = 103;
        break;
      case Protocol.Audits.DeprecationIssueType.LegacyConstraintGoogScreencastMinBitrate:
        messageFunction = i18nLazyString(UIStrings.legacyConstraintGoogScreencastMinBitrate);
        milestone = 103;
        break;
      case Protocol.Audits.DeprecationIssueType.LegacyConstraintGoogSuspendBelowMinBitrate:
        messageFunction = i18nLazyString(UIStrings.legacyConstraintGoogSuspendBelowMinBitrate);
        milestone = 103;
        break;
      case Protocol.Audits.DeprecationIssueType.LocalCSSFileExtensionRejected:
        messageFunction = i18nLazyString(UIStrings.localCSSFileExtensionRejected);
        milestone = 64;
        break;
      case Protocol.Audits.DeprecationIssueType.NotificationInsecureOrigin:
        messageFunction = i18nLazyString(UIStrings.notificationInsecureOrigin);
        break;
      case Protocol.Audits.DeprecationIssueType.ObsoleteWebRtcCipherSuite:
        messageFunction = i18nLazyString(UIStrings.obsoleteWebRtcCipherSuite);
        milestone = 81;
        break;
      case Protocol.Audits.DeprecationIssueType.PictureSourceSrc:
        messageFunction = i18nLazyString(UIStrings.pictureSourceSrc);
        break;
      case Protocol.Audits.DeprecationIssueType.PrefixedCancelAnimationFrame:
        messageFunction = i18nLazyString(UIStrings.prefixedCancelAnimationFrame);
        break;
      case Protocol.Audits.DeprecationIssueType.PrefixedRequestAnimationFrame:
        messageFunction = i18nLazyString(UIStrings.prefixedRequestAnimationFrame);
        break;
      case Protocol.Audits.DeprecationIssueType.RTCConstraintEnableDtlsSrtpFalse:
        messageFunction = i18nLazyString(UIStrings.rtcConstraintEnableDtlsSrtpFalse);
        milestone = 97;
        break;
      case Protocol.Audits.DeprecationIssueType.RTCConstraintEnableDtlsSrtpTrue:
        messageFunction = i18nLazyString(UIStrings.rtcConstraintEnableDtlsSrtpTrue);
        milestone = 97;
        break;
      case Protocol.Audits.DeprecationIssueType.RTCPeerConnectionComplexPlanBSdpUsingDefaultSdpSemantics:
        messageFunction = i18nLazyString(UIStrings.rtcPeerConnectionComplexPlanBSdpUsingDefaultSdpSemantics);
        milestone = 72;
        break;
      case Protocol.Audits.DeprecationIssueType.RTCPeerConnectionLegacyCreateWithMediaConstraints:
        messageFunction = i18nLazyString(UIStrings.rtcPeerConnectionLegacyCreateWithMediaConstraints);
        milestone = 103;
        break;
      case Protocol.Audits.DeprecationIssueType.RTPDataChannel:
        messageFunction = i18nLazyString(UIStrings.rtpDataChannel);
        milestone = 88;
        break;
      case Protocol.Audits.DeprecationIssueType.SharedArrayBufferConstructedWithoutIsolation:
        messageFunction = i18nLazyString(UIStrings.sharedArrayBufferConstructedWithoutIsolation);
        milestone = 106;
        break;
      // TODO(crbug.com/1264960): Remove legacy type when issues are translated.
      case Protocol.Audits.DeprecationIssueType.Untranslated:
        messageFunction = (): string => this.#issueDetails.message ?? '';
        break;
      case Protocol.Audits.DeprecationIssueType.V8SharedArrayBufferConstructedInExtensionWithoutIsolation:
        messageFunction = i18nLazyString(UIStrings.v8SharedArrayBufferConstructedInExtensionWithoutIsolation);
        milestone = 96;
        break;
      case Protocol.Audits.DeprecationIssueType.WebCodecsVideoFrameDefaultTimestamp:
        messageFunction = i18nLazyString(UIStrings.webCodecsVideoFrameDefaultTimestamp);
        feature = 5667793157488640;
        milestone = 99;
        break;
      case Protocol.Audits.DeprecationIssueType.XHRJSONEncodingDetection:
        messageFunction = i18nLazyString(UIStrings.xhrJSONEncodingDetection);
        milestone = 93;
        break;
      case Protocol.Audits.DeprecationIssueType.XMLHttpRequestSynchronousInNonWorkerOutsideBeforeUnload:
        messageFunction = i18nLazyString(UIStrings.xmlHttpRequestSynchronousInNonWorkerOutsideBeforeUnload);
        break;
    }
    const links = [];
    if (feature !== 0) {
      links.push({
        link: `https://chromestatus.com/feature/${feature}`,
        linkTitle: i18nLazyString(UIStrings.feature),
      });
    }
    if (milestone !== 0) {
      links.push({
        link: 'https://chromiumdash.appspot.com/schedule',
        linkTitle: i18nLazyString(UIStrings.milestone, {milestone}),
      });
    }
    return resolveLazyDescription({
      file: 'deprecation.md',
      substitutions: new Map([
        ['PLACEHOLDER_title', i18nLazyString(UIStrings.title)],
        ['PLACEHOLDER_message', messageFunction],
      ]),
      links,
    });
  }

  sources(): Iterable<Protocol.Audits.SourceCodeLocation> {
    if (this.#issueDetails.sourceCodeLocation) {
      return [this.#issueDetails.sourceCodeLocation];
    }
    return [];
  }

  primaryKey(): string {
    return JSON.stringify(this.#issueDetails);
  }

  getKind(): IssueKind {
    return IssueKind.BreakingChange;
  }

  static fromInspectorIssue(issuesModel: SDK.IssuesModel.IssuesModel, inspectorIssue: Protocol.Audits.InspectorIssue):
      DeprecationIssue[] {
    const details = inspectorIssue.details.deprecationIssueDetails;
    if (!details) {
      console.warn('Deprecation issue without details received.');
      return [];
    }
    if (details.type !== Protocol.Audits.DeprecationIssueType.Untranslated &&
        (details.deprecationType || details.message)) {
      console.warn('Translated deprecation issue with malformed details received.');
      return [];
    }
    if (details.type === Protocol.Audits.DeprecationIssueType.Untranslated &&
        (!details.deprecationType || !details.message)) {
      console.warn('Untranslated deprecation issue with malformed details received.');
      return [];
    }
    return [new DeprecationIssue(details, issuesModel)];
  }
}

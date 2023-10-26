// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import * as Bindings from '../../../../models/bindings/bindings.js';

const UIStrings = {
  /**
   *@description  Description text for Prefetch status PrefetchFailedIneligibleRedirect.
   */
  PrefetchFailedIneligibleRedirect: 'The prefetch was redirected, but the redirect URL is not eligible for prefetch.',
  /**
   *@description  Description text for Prefetch status PrefetchFailedInvalidRedirect.
   */
  PrefetchFailedInvalidRedirect: 'The prefetch was redirected, but there was a problem with the redirect.',
  /**
   *@description  Description text for Prefetch status PrefetchFailedMIMENotSupported.
   */
  PrefetchFailedMIMENotSupported: 'The prefetch failed because the response\'s Content-Type header was not supported.',
  /**
   *@description  Description text for Prefetch status PrefetchFailedNetError.
   */
  PrefetchFailedNetError: 'The prefetch failed because of a network error.',
  /**
   *@description  Description text for Prefetch status PrefetchFailedNon2XX.
   */
  PrefetchFailedNon2XX: 'The prefetch failed because of a non-2xx HTTP response status code.',
  /**
   *@description  Description text for Prefetch status PrefetchFailedPerPageLimitExceeded.
   */
  PrefetchFailedPerPageLimitExceeded:
      'The prefetch was not performed because the initiating page already has too many prefetches ongoing.',
  /**
   *@description  Description text for Prefetch status PrefetchIneligibleRetryAfter.
   */
  PrefetchIneligibleRetryAfter:
      'A previous prefetch to the origin got a HTTP 503 response with an Retry-After header that has not elapsed yet.',
  /**
   *@description  Description text for Prefetch status PrefetchIsPrivacyDecoy.
   */
  PrefetchIsPrivacyDecoy:
      'The URL was not eligible to be prefetched because there was a registered service worker or cross-site cookies for that origin, but the prefetch was put on the network anyways and not used, to disguise that the user had some kind of previous relationship with the origin.',
  /**
   *@description  Description text for Prefetch status PrefetchIsStale.
   */
  PrefetchIsStale: 'Too much time elapsed between the prefetch and usage, so the prefetch was discarded.',
  /**
   *@description  Description text for Prefetch status PrefetchNotEligibleBrowserContextOffTheRecord.
   */
  PrefetchNotEligibleBrowserContextOffTheRecord:
      'The prefetch was not performed because the browser is in Incognito or Guest mode.',
  /**
   *@description  Description text for Prefetch status PrefetchNotEligibleDataSaverEnabled.
   */
  PrefetchNotEligibleDataSaverEnabled:
      'The prefetch was not performed because the operating system is in Data Saver mode.',
  /**
   *@description  Description text for Prefetch status PrefetchNotEligibleExistingProxy.
   */
  PrefetchNotEligibleExistingProxy:
      'The URL is not eligible to be prefetched, because in the default network context it is configured to use a proxy server.',
  /**
   *@description  Description text for Prefetch status PrefetchNotEligibleHostIsNonUnique.
   */
  PrefetchNotEligibleHostIsNonUnique:
      'The URL was not eligible to be prefetched because its host was not unique (e.g., a non publicly routable IP address or a hostname which is not registry-controlled), but the prefetch was required to be proxied.',
  /**
   *@description  Description text for Prefetch status PrefetchNotEligibleNonDefaultStoragePartition.
   */
  PrefetchNotEligibleNonDefaultStoragePartition:
      'The URL was not eligible to be prefetched because it uses a non-default storage partition.',
  /**
   *@description  Description text for Prefetch status PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy.
   */
  PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy:
      'The URL was not eligible to be prefetched because the default network context cannot be configured to use the prefetch proxy for a same-site cross-origin prefetch request.',
  /**
   *@description  Description text for Prefetch status PrefetchNotEligibleSchemeIsNotHttps.
   */
  PrefetchNotEligibleSchemeIsNotHttps: 'The URL was not eligible to be prefetched because its scheme was not https:.',
  /**
   *@description  Description text for Prefetch status PrefetchNotEligibleUserHasCookies.
   */
  PrefetchNotEligibleUserHasCookies:
      'The URL was not eligible to be prefetched because it was cross-site, but the user had cookies for that origin.',
  /**
   *@description  Description text for Prefetch status PrefetchNotEligibleUserHasServiceWorker.
   */
  PrefetchNotEligibleUserHasServiceWorker:
      'The URL was not eligible to be prefetched because there was a registered service worker for that origin, which is currently not supported.',
  /**
   *@description  Description text for Prefetch status PrefetchNotUsedCookiesChanged.
   */
  PrefetchNotUsedCookiesChanged:
      'The prefetch was not used because it was a cross-site prefetch, and cookies were added for that URL while the prefetch was ongoing, so the prefetched response is now out-of-date.',
  /**
   *@description  Description text for Prefetch status PrefetchProxyNotAvailable.
   */
  PrefetchProxyNotAvailable:
      'A network error was encountered when trying to set up a connection to the prefetching proxy.',
  /**
   *@description  Description text for Prefetch status PrefetchNotUsedProbeFailed.
   */
  PrefetchNotUsedProbeFailed: 'The prefetch was blocked by your Internet Service Provider or network administrator.',
  /**
   *@description  Description text for Prefetch status PrefetchEvicted.
   */
  PrefetchEvicted: 'The prefetch was discarded for a newer prefetch because |kPrefetchNewLimits| is enabled',
  /**
   *@description  Description text for Prefetch status PrefetchNotEligibleBatterySaverEnabled.
   */
  PrefetchNotEligibleBatterySaverEnabled:
      'The prefetch was not performed because the Battery Saver setting was enabled.',
  /**
   *@description  Description text for Prefetch status PrefetchNotEligiblePreloadingDisabled.
   */
  PrefetchNotEligiblePreloadingDisabled: 'The prefetch was not performed because speculative loading was disabled.',

  /**
   *  Description text for PrerenderFinalStatus::kLowEndDevice.
   */
  prerenderFinalStatusLowEndDevice:
      'The prerender was not performed because this device does not have enough total system memory to support prerendering.',
  /**
   *  Description text for PrerenderFinalStatus::kInvalidSchemeRedirect.
   */
  prerenderFinalStatusInvalidSchemeRedirect:
      'The prerendering navigation failed because it redirected to a URL whose scheme was not http: or https:.',
  /**
   *  Description text for PrerenderFinalStatus::kInvalidSchemeNavigation.
   */
  prerenderFinalStatusInvalidSchemeNavigation:
      'The URL was not eligible to be prerendered because its scheme was not http: or https:.',
  /**
   *  Description text for PrerenderFinalStatus::kNavigationRequestBlockedByCsp.
   */
  prerenderFinalStatusNavigationRequestBlockedByCsp:
      'The prerendering navigation was blocked by a Content Security Policy.',
  /**
   *  Description text for PrerenderFinalStatus::kMainFrameNavigation.
   */
  prerenderFinalStatusMainFrameNavigation:
      'The prerendered page navigated itself to another URL, which is currently not supported.',
  /**
   *@description Description text for PrerenderFinalStatus::kMojoBinderPolicy.
   *@example {device.mojom.GamepadMonitor} PH1
   */
  prerenderFinalStatusMojoBinderPolicy:
      'The prerendered page used a forbidden JavaScript API that is currently not supported. (Internal Mojo interface: {PH1})',
  /**
   *  Description text for PrerenderFinalStatus::kRendererProcessCrashed.
   */
  prerenderFinalStatusRendererProcessCrashed: 'The prerendered page crashed.',
  /**
   *  Description text for PrerenderFinalStatus::kRendererProcessKilled.
   */
  prerenderFinalStatusRendererProcessKilled: 'The prerendered page was killed.',
  /**
   *  Description text for PrerenderFinalStatus::kDownload.
   */
  prerenderFinalStatusDownload:
      'The prerendered page attempted to initiate a download, which is currently not supported.',
  /**
   *  Description text for PrerenderFinalStatus::kNavigationBadHttpStatus.
   */
  prerenderFinalStatusNavigationBadHttpStatus:
      'The prerendering navigation failed because of a non-2xx HTTP response status code.',
  /**
   *  Description text for PrerenderFinalStatus::kClientCertRequested.
   */
  prerenderFinalStatusClientCertRequested: 'The prerendering navigation required a HTTP client certificate.',
  /**
   *  Description text for PrerenderFinalStatus::kNavigationRequestNetworkError.
   */
  prerenderFinalStatusNavigationRequestNetworkError: 'The prerendering navigation encountered a network error.',
  /**
   *  Description text for PrerenderFinalStatus::kSslCertificateError.
   */
  prerenderFinalStatusSslCertificateError: 'The prerendering navigation failed because of an invalid SSL certificate.',
  /**
   *  Description text for PrerenderFinalStatus::kLoginAuthRequested.
   */
  prerenderFinalStatusLoginAuthRequested:
      'The prerendering navigation required HTTP authentication, which is currently not supported.',
  /**
   *  Description text for PrerenderFinalStatus::kUaChangeRequiresReload.
   */
  prerenderFinalStatusUaChangeRequiresReload: 'Changing User Agent occured in prerendering navigation.',
  /**
   *  Description text for PrerenderFinalStatus::kBlockedByClient.
   */
  prerenderFinalStatusBlockedByClient: 'Some resource load was blocked.',
  /**
   *  Description text for PrerenderFinalStatus::kAudioOutputDeviceRequested.
   */
  prerenderFinalStatusAudioOutputDeviceRequested:
      'The prerendered page requested audio output, which is currently not supported.',
  /**
   *  Description text for PrerenderFinalStatus::kMixedContent.
   */
  prerenderFinalStatusMixedContent: 'The prerendered page contained mixed content.',
  /**
   *  Description text for PrerenderFinalStatus::kTriggerBackgrounded.
   */
  prerenderFinalStatusTriggerBackgrounded:
      'The initiating page was backgrounded, so the prerendered page was discarded.',
  /**
   *  Description text for PrerenderFinalStatus::kMemoryLimitExceeded.
   */
  prerenderFinalStatusMemoryLimitExceeded:
      'The prerender was not performed because the browser exceeded the prerendering memory limit.',
  /**
   *  Description text for PrerenderFinalStatus::kDataSaverEnabled.
   */
  prerenderFinalStatusDataSaverEnabled:
      'The prerender was not performed because the user requested that the browser use less data.',
  /**
   *  Description text for PrerenderFinalStatus::TriggerUrlHasEffectiveUrl.
   */
  prerenderFinalStatusHasEffectiveUrl:
      'The initiating page cannot perform prerendering, because it has an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)',
  /**
   *  Description text for PrerenderFinalStatus::kTimeoutBackgrounded.
   */
  prerenderFinalStatusTimeoutBackgrounded:
      'The initiating page was backgrounded for a long time, so the prerendered page was discarded.',
  /**
   *  Description text for PrerenderFinalStatus::kCrossSiteRedirectInInitialNavigation.
   */
  prerenderFinalStatusCrossSiteRedirectInInitialNavigation:
      'The prerendering navigation failed because the prerendered URL redirected to a cross-site URL.',
  /**
   *  Description text for PrerenderFinalStatus::kCrossSiteNavigationInInitialNavigation.
   */
  prerenderFinalStatusCrossSiteNavigationInInitialNavigation:
      'The prerendering navigation failed because it targeted a cross-site URL.',
  /**
   *  Description text for PrerenderFinalStatus::kSameSiteCrossOriginRedirectNotOptInInInitialNavigation.
   */
  prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInInitialNavigation:
      'The prerendering navigation failed because the prerendered URL redirected to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.',
  /**
   *  Description text for PrerenderFinalStatus::kSameSiteCrossOriginNavigationNotOptInInInitialNavigation.
   */
  prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInInitialNavigation:
      'The prerendering navigation failed because it was to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.',
  /**
   *  Description text for PrerenderFinalStatus::kActivationNavigationParameterMismatch.
   */
  prerenderFinalStatusActivationNavigationParameterMismatch:
      'The prerender was not used because during activation time, different navigation parameters (e.g., HTTP headers) were calculated than during the original prerendering navigation request.',
  /**
   *  Description text for PrerenderFinalStatus::kPrimaryMainFrameRendererProcessCrashed.
   */
  prerenderFinalStatusPrimaryMainFrameRendererProcessCrashed: 'The initiating page crashed.',
  /**
   *  Description text for PrerenderFinalStatus::kPrimaryMainFrameRendererProcessKilled.
   */
  prerenderFinalStatusPrimaryMainFrameRendererProcessKilled: 'The initiating page was killed.',
  /**
   *  Description text for PrerenderFinalStatus::kActivationFramePolicyNotCompatible.
   */
  prerenderFinalStatusActivationFramePolicyNotCompatible:
      'The prerender was not used because the sandboxing flags or permissions policy of the initiating page was not compatible with those of the prerendering page.',
  /**
   *  Description text for PrerenderFinalStatus::kPreloadingDisabled.
   */
  prerenderFinalStatusPreloadingDisabled:
      'The prerender was not performed because the user disabled preloading in their browser settings.',
  /**
   *  Description text for PrerenderFinalStatus::kBatterySaverEnabled.
   */
  prerenderFinalStatusBatterySaverEnabled:
      'The prerender was not performed because the user requested that the browser use less battery.',
  /**
   *  Description text for PrerenderFinalStatus::kActivatedDuringMainFrameNavigation.
   */
  prerenderFinalStatusActivatedDuringMainFrameNavigation:
      'Prerendered page activated during initiating page\'s main frame navigation.',
  /**
   *  Description text for PrerenderFinalStatus::kCrossSiteRedirectInMainFrameNavigation.
   */
  prerenderFinalStatusCrossSiteRedirectInMainFrameNavigation:
      'The prerendered page navigated to a URL which redirected to a cross-site URL.',
  /**
   *  Description text for PrerenderFinalStatus::kCrossSiteNavigationInMainFrameNavigation.
   */
  prerenderFinalStatusCrossSiteNavigationInMainFrameNavigation: 'The prerendered page navigated to a cross-site URL.',
  /**
   *  Description text for PrerenderFinalStatus::kSameSiteCrossOriginRedirectNotOptInInMainFrameNavigation.
   */
  prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInMainFrameNavigation:
      'The prerendered page navigated to a URL which redirected to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.',
  /**
   *  Description text for PrerenderFinalStatus::kSameSiteCrossOriginNavigationNotOptInInMainFrameNavigation.
   */
  prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInMainFrameNavigation:
      'The prerendered page navigated to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.',
  /**
   *  Description text for PrerenderFinalStatus::kMemoryPressureOnTrigger.
   */
  prerenderFinalStatusMemoryPressureOnTrigger:
      'The prerender was not performed because the browser was under critical memory pressure.',
  /**
   *  Description text for PrerenderFinalStatus::kMemoryPressureAfterTriggered.
   */
  prerenderFinalStatusMemoryPressureAfterTriggered:
      'The prerendered page was unloaded because the browser came under critical memory pressure.',
  /**
   *  Description text for PrerenderFinalStatus::kPrerenderingDisabledByDevTools.
   */
  prerenderFinalStatusPrerenderingDisabledByDevTools:
      'The prerender was not performed because DevTools has been used to disable prerendering.',
  /**
   * Description text for PrerenderFinalStatus::kSpeculationRuleRemoved.
   */
  prerenderFinalStatusSpeculationRuleRemoved:
      'The prerendered page was unloaded because the initiating page removed the corresponding prerender rule from <script type="speculationrules">.',
  /**
   * Description text for PrerenderFinalStatus::kActivatedWithAuxiliaryBrowsingContexts.
   */
  prerenderFinalStatusActivatedWithAuxiliaryBrowsingContexts:
      'The prerender was not used because during activation time, there were other windows with an active opener reference to the initiating page, which is currently not supported.',
  /**
   * Description text for PrerenderFinalStatus::kMaxNumOfRunningEagerPrerendersExceeded.
   */
  prerenderFinalStatusMaxNumOfRunningEagerPrerendersExceeded:
      'The prerender whose eagerness is "eager" was not performed because the initiating page already has too many prerenders ongoing. Remove other speculation rules with "eager" to enable further prerendering.',
  /**
   * Description text for PrerenderFinalStatus::kMaxNumOfRunningEmbedderPrerendersExceeded.
   */
  prerenderFinalStatusMaxNumOfRunningEmbedderPrerendersExceeded:
      'The browser-triggered prerender was not performed because the initiating page already has too many prerenders ongoing.',
  /**
   * Description text for PrerenderFinalStatus::kMaxNumOfRunningNonEagerPrerendersExceeded.
   */
  prerenderFinalStatusMaxNumOfRunningNonEagerPrerendersExceeded:
      'The old non-eager prerender (with a "moderate" or "conservative" eagerness and triggered by hovering or clicking links) was automatically canceled due to starting a new non-eager prerender. It can be retriggered by interacting with the link again.',
  /**
   * Description text for PrenderFinalStatus::kPrerenderingUrlHasEffectiveUrl.
   */
  prerenderFinalStatusPrerenderingUrlHasEffectiveUrl:
      'The prerendering navigation failed because it has an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)',
  /**
   * Description text for PrenderFinalStatus::kRedirectedPrerenderingUrlHasEffectiveUrl.
   */
  prerenderFinalStatusRedirectedPrerenderingUrlHasEffectiveUrl:
      'The prerendering navigation failed because it redirected to an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)',
  /**
   * Description text for PrenderFinalStatus::kActivationUrlHasEffectiveUrl.
   */
  prerenderFinalStatusActivationUrlHasEffectiveUrl:
      'The prerender was not used because during activation time, navigation has an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)',

  /**
   *@description Text in grid and details: Preloading attempt is not yet triggered.
   */
  statusNotTriggered: 'Not triggered',
  /**
   *@description Text in grid and details: Preloading attempt is eligible but pending.
   */
  statusPending: 'Pending',
  /**
   *@description Text in grid and details: Preloading is running.
   */
  statusRunning: 'Running',
  /**
   *@description Text in grid and details: Preloading finished and the result is ready for the next navigation.
   */
  statusReady: 'Ready',
  /**
   *@description Text in grid and details: Ready, then used.
   */
  statusSuccess: 'Success',
  /**
   *@description Text in grid and details: Preloading failed.
   */
  statusFailure: 'Failure',
};

const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/components/PreloadingString.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const PrefetchReasonDescription: {[key: string]: {name: () => Platform.UIString.LocalizedString}} = {
  'PrefetchFailedIneligibleRedirect': {name: i18nLazyString(UIStrings.PrefetchFailedIneligibleRedirect)},
  'PrefetchFailedInvalidRedirect': {name: i18nLazyString(UIStrings.PrefetchFailedInvalidRedirect)},
  'PrefetchFailedMIMENotSupported': {name: i18nLazyString(UIStrings.PrefetchFailedMIMENotSupported)},
  'PrefetchFailedNetError': {name: i18nLazyString(UIStrings.PrefetchFailedNetError)},
  'PrefetchFailedNon2XX': {name: i18nLazyString(UIStrings.PrefetchFailedNon2XX)},
  'PrefetchFailedPerPageLimitExceeded': {name: i18nLazyString(UIStrings.PrefetchFailedPerPageLimitExceeded)},
  'PrefetchIneligibleRetryAfter': {name: i18nLazyString(UIStrings.PrefetchIneligibleRetryAfter)},
  'PrefetchIsPrivacyDecoy': {name: i18nLazyString(UIStrings.PrefetchIsPrivacyDecoy)},
  'PrefetchIsStale': {name: i18nLazyString(UIStrings.PrefetchIsStale)},
  'PrefetchNotEligibleBrowserContextOffTheRecord':
      {name: i18nLazyString(UIStrings.PrefetchNotEligibleBrowserContextOffTheRecord)},
  'PrefetchNotEligibleDataSaverEnabled': {name: i18nLazyString(UIStrings.PrefetchNotEligibleDataSaverEnabled)},
  'PrefetchNotEligibleExistingProxy': {name: i18nLazyString(UIStrings.PrefetchNotEligibleExistingProxy)},
  'PrefetchNotEligibleHostIsNonUnique': {name: i18nLazyString(UIStrings.PrefetchNotEligibleHostIsNonUnique)},
  'PrefetchNotEligibleNonDefaultStoragePartition':
      {name: i18nLazyString(UIStrings.PrefetchNotEligibleNonDefaultStoragePartition)},
  'PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy':
      {name: i18nLazyString(UIStrings.PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy)},
  'PrefetchNotEligibleSchemeIsNotHttps': {name: i18nLazyString(UIStrings.PrefetchNotEligibleSchemeIsNotHttps)},
  'PrefetchNotEligibleUserHasCookies': {name: i18nLazyString(UIStrings.PrefetchNotEligibleUserHasCookies)},
  'PrefetchNotEligibleUserHasServiceWorker': {name: i18nLazyString(UIStrings.PrefetchNotEligibleUserHasServiceWorker)},
  'PrefetchNotUsedCookiesChanged': {name: i18nLazyString(UIStrings.PrefetchNotUsedCookiesChanged)},
  'PrefetchProxyNotAvailable': {name: i18nLazyString(UIStrings.PrefetchProxyNotAvailable)},
  'PrefetchNotUsedProbeFailed': {name: i18nLazyString(UIStrings.PrefetchNotUsedProbeFailed)},
  'PrefetchEvicted': {name: i18nLazyString(UIStrings.PrefetchEvicted)},
  'PrefetchNotEligibleBatterySaverEnabled': {name: i18nLazyString(UIStrings.PrefetchNotEligibleBatterySaverEnabled)},
  'PrefetchNotEligiblePreloadingDisabled': {name: i18nLazyString(UIStrings.PrefetchNotEligiblePreloadingDisabled)},
};

// Decoding PrefetchFinalStatus prefetchAttempt to failure description.
export function prefetchFailureReason({prefetchStatus}: SDK.PreloadingModel.PrefetchAttempt): string|null {
  // If you face an error on rolling CDP changes, see
  // https://docs.google.com/document/d/1PnrfowsZMt62PX1EvvTp2Nqs3ji1zrklrAEe1JYbkTk
  switch (prefetchStatus) {
    case null:
      return null;
    // PrefetchNotStarted is mapped to Pending.
    case Protocol.Preload.PrefetchStatus.PrefetchNotStarted:
      return null;
    // PrefetchNotFinishedInTime is mapped to Running.
    case Protocol.Preload.PrefetchStatus.PrefetchNotFinishedInTime:
      return null;
    // PrefetchResponseUsed is mapped to Success.
    case Protocol.Preload.PrefetchStatus.PrefetchResponseUsed:
      return null;
    // Holdback related status is expected to be overridden when DevTools is
    // opened.
    case Protocol.Preload.PrefetchStatus.PrefetchAllowed:
    case Protocol.Preload.PrefetchStatus.PrefetchHeldback:
      return null;
    // TODO(https://crbug.com/1410709): deprecate PrefetchSuccessfulButNotUsed in the protocol.
    case Protocol.Preload.PrefetchStatus.PrefetchSuccessfulButNotUsed:
      return null;
    case Protocol.Preload.PrefetchStatus.PrefetchFailedIneligibleRedirect:
      return PrefetchReasonDescription['PrefetchFailedIneligibleRedirect'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchFailedInvalidRedirect:
      return PrefetchReasonDescription['PrefetchFailedInvalidRedirect'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchFailedMIMENotSupported:
      return PrefetchReasonDescription['PrefetchFailedMIMENotSupported'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchFailedNetError:
      return PrefetchReasonDescription['PrefetchFailedNetError'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchFailedNon2XX:
      return PrefetchReasonDescription['PrefetchFailedNon2XX'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchFailedPerPageLimitExceeded:
      return PrefetchReasonDescription['PrefetchFailedPerPageLimitExceeded'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchIneligibleRetryAfter:
      return PrefetchReasonDescription['PrefetchIneligibleRetryAfter'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchEvicted:
      return PrefetchReasonDescription['PrefetchEvicted'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchIsPrivacyDecoy:
      return PrefetchReasonDescription['PrefetchIsPrivacyDecoy'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchIsStale:
      return PrefetchReasonDescription['PrefetchIsStale'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchNotEligibleBrowserContextOffTheRecord:
      return PrefetchReasonDescription['PrefetchNotEligibleBrowserContextOffTheRecord'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchNotEligibleDataSaverEnabled:
      return PrefetchReasonDescription['PrefetchNotEligibleDataSaverEnabled'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchNotEligibleExistingProxy:
      return PrefetchReasonDescription['PrefetchNotEligibleExistingProxy'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchNotEligibleHostIsNonUnique:
      return PrefetchReasonDescription['PrefetchNotEligibleHostIsNonUnique'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchNotEligibleNonDefaultStoragePartition:
      return PrefetchReasonDescription['PrefetchNotEligibleNonDefaultStoragePartition'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy:
      return PrefetchReasonDescription['PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchNotEligibleSchemeIsNotHttps:
      return PrefetchReasonDescription['PrefetchNotEligibleSchemeIsNotHttps'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchNotEligibleUserHasCookies:
      return PrefetchReasonDescription['PrefetchNotEligibleUserHasCookies'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchNotEligibleUserHasServiceWorker:
      return PrefetchReasonDescription['PrefetchNotEligibleUserHasServiceWorker'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchNotUsedCookiesChanged:
      return PrefetchReasonDescription['PrefetchNotUsedCookiesChanged'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchProxyNotAvailable:
      return PrefetchReasonDescription['PrefetchProxyNotAvailable'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchNotUsedProbeFailed:
      return PrefetchReasonDescription['PrefetchNotUsedProbeFailed'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchNotEligibleBatterySaverEnabled:
      return PrefetchReasonDescription['PrefetchNotEligibleBatterySaverEnabled'].name();
    case Protocol.Preload.PrefetchStatus.PrefetchNotEligiblePreloadingDisabled:
      return PrefetchReasonDescription['PrefetchNotEligiblePreloadingDisabled'].name();
    default:
      // Note that we use switch and exhaustiveness check to prevent to
      // forget updating these strings, but allow to handle unknown
      // PrefetchStatus at runtime.
      return i18n.i18n.lockedString(`Unknown failure reason: ${
          prefetchStatus as 'See https://docs.google.com/document/d/1PnrfowsZMt62PX1EvvTp2Nqs3ji1zrklrAEe1JYbkTk'}`);
  }
}

// Detailed failure reason for PrerenderFinalStatus.
export function prerenderFailureReason(attempt: SDK.PreloadingModel.PrerenderAttempt): string|null {
  // If you face an error on rolling CDP changes, see
  // https://docs.google.com/document/d/1PnrfowsZMt62PX1EvvTp2Nqs3ji1zrklrAEe1JYbkTk
  switch (attempt.prerenderStatus) {
    case null:
    case Protocol.Preload.PrerenderFinalStatus.Activated:
      return null;
    case Protocol.Preload.PrerenderFinalStatus.Destroyed:
      // TODO(https://crbug.com/1410709): Fill it.
      return i18n.i18n.lockedString('Unknown');
    case Protocol.Preload.PrerenderFinalStatus.LowEndDevice:
      return i18nString(UIStrings.prerenderFinalStatusLowEndDevice);
    case Protocol.Preload.PrerenderFinalStatus.InvalidSchemeRedirect:
      return i18nString(UIStrings.prerenderFinalStatusInvalidSchemeRedirect);
    case Protocol.Preload.PrerenderFinalStatus.InvalidSchemeNavigation:
      return i18nString(UIStrings.prerenderFinalStatusInvalidSchemeNavigation);
    case Protocol.Preload.PrerenderFinalStatus.NavigationRequestBlockedByCsp:
      return i18nString(UIStrings.prerenderFinalStatusNavigationRequestBlockedByCsp);
    case Protocol.Preload.PrerenderFinalStatus.MainFrameNavigation:
      return i18nString(UIStrings.prerenderFinalStatusMainFrameNavigation);
    case Protocol.Preload.PrerenderFinalStatus.MojoBinderPolicy:
      assertNotNullOrUndefined(attempt.disallowedMojoInterface);
      return i18nString(UIStrings.prerenderFinalStatusMojoBinderPolicy, {PH1: attempt.disallowedMojoInterface});
    case Protocol.Preload.PrerenderFinalStatus.RendererProcessCrashed:
      return i18nString(UIStrings.prerenderFinalStatusRendererProcessCrashed);
    case Protocol.Preload.PrerenderFinalStatus.RendererProcessKilled:
      return i18nString(UIStrings.prerenderFinalStatusRendererProcessKilled);
    case Protocol.Preload.PrerenderFinalStatus.Download:
      return i18nString(UIStrings.prerenderFinalStatusDownload);
    case Protocol.Preload.PrerenderFinalStatus.TriggerDestroyed:
      // After https://crrev.com/c/4515841, this won't occur if DevTools is opened.
      return i18n.i18n.lockedString('Internal error');
    case Protocol.Preload.PrerenderFinalStatus.NavigationNotCommitted:
      // This looks internal error.
      //
      // TODO(https://crbug.com/1410709): Fill it.
      return i18n.i18n.lockedString('Internal error');
    case Protocol.Preload.PrerenderFinalStatus.NavigationBadHttpStatus:
      return i18nString(UIStrings.prerenderFinalStatusNavigationBadHttpStatus);
    case Protocol.Preload.PrerenderFinalStatus.ClientCertRequested:
      return i18nString(UIStrings.prerenderFinalStatusClientCertRequested);
    case Protocol.Preload.PrerenderFinalStatus.NavigationRequestNetworkError:
      return i18nString(UIStrings.prerenderFinalStatusNavigationRequestNetworkError);
    case Protocol.Preload.PrerenderFinalStatus.CancelAllHostsForTesting:
      // Used only in tests.
      throw new Error('unreachable');
    case Protocol.Preload.PrerenderFinalStatus.DidFailLoad:
      // TODO(https://crbug.com/1410709): Fill it.
      return i18n.i18n.lockedString('Unknown');
    case Protocol.Preload.PrerenderFinalStatus.Stop:
      // TODO(https://crbug.com/1410709): Fill it.
      return i18n.i18n.lockedString('Unknown');
    case Protocol.Preload.PrerenderFinalStatus.SslCertificateError:
      return i18nString(UIStrings.prerenderFinalStatusSslCertificateError);
    case Protocol.Preload.PrerenderFinalStatus.LoginAuthRequested:
      return i18nString(UIStrings.prerenderFinalStatusLoginAuthRequested);
    case Protocol.Preload.PrerenderFinalStatus.UaChangeRequiresReload:
      return i18nString(UIStrings.prerenderFinalStatusUaChangeRequiresReload);
    case Protocol.Preload.PrerenderFinalStatus.BlockedByClient:
      return i18nString(UIStrings.prerenderFinalStatusBlockedByClient);
    case Protocol.Preload.PrerenderFinalStatus.AudioOutputDeviceRequested:
      return i18nString(UIStrings.prerenderFinalStatusAudioOutputDeviceRequested);
    case Protocol.Preload.PrerenderFinalStatus.MixedContent:
      return i18nString(UIStrings.prerenderFinalStatusMixedContent);
    case Protocol.Preload.PrerenderFinalStatus.TriggerBackgrounded:
      return i18nString(UIStrings.prerenderFinalStatusTriggerBackgrounded);
    case Protocol.Preload.PrerenderFinalStatus.MemoryLimitExceeded:
      return i18nString(UIStrings.prerenderFinalStatusMemoryLimitExceeded);
    case Protocol.Preload.PrerenderFinalStatus.DataSaverEnabled:
      return i18nString(UIStrings.prerenderFinalStatusDataSaverEnabled);
    case Protocol.Preload.PrerenderFinalStatus.TriggerUrlHasEffectiveUrl:
      return i18nString(UIStrings.prerenderFinalStatusHasEffectiveUrl);
    case Protocol.Preload.PrerenderFinalStatus.ActivatedBeforeStarted:
      // Status for debugging.
      return i18n.i18n.lockedString('Internal error');
    case Protocol.Preload.PrerenderFinalStatus.InactivePageRestriction:
      // This looks internal error.
      //
      // TODO(https://crbug.com/1410709): Fill it.
      return i18n.i18n.lockedString('Internal error');
    case Protocol.Preload.PrerenderFinalStatus.StartFailed:
      // This looks internal error.
      //
      // TODO(https://crbug.com/1410709): Fill it.
      return i18n.i18n.lockedString('Internal error');
    case Protocol.Preload.PrerenderFinalStatus.TimeoutBackgrounded:
      return i18nString(UIStrings.prerenderFinalStatusTimeoutBackgrounded);
    case Protocol.Preload.PrerenderFinalStatus.CrossSiteRedirectInInitialNavigation:
      return i18nString(UIStrings.prerenderFinalStatusCrossSiteRedirectInInitialNavigation);
    case Protocol.Preload.PrerenderFinalStatus.CrossSiteNavigationInInitialNavigation:
      return i18nString(UIStrings.prerenderFinalStatusCrossSiteNavigationInInitialNavigation);
    case Protocol.Preload.PrerenderFinalStatus.SameSiteCrossOriginRedirectNotOptInInInitialNavigation:
      return i18nString(UIStrings.prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInInitialNavigation);
    case Protocol.Preload.PrerenderFinalStatus.SameSiteCrossOriginNavigationNotOptInInInitialNavigation:
      return i18nString(UIStrings.prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInInitialNavigation);
    case Protocol.Preload.PrerenderFinalStatus.ActivationNavigationParameterMismatch:
      return i18nString(UIStrings.prerenderFinalStatusActivationNavigationParameterMismatch);
    case Protocol.Preload.PrerenderFinalStatus.ActivatedInBackground:
      // Status for debugging.
      return i18n.i18n.lockedString('Internal error');
    case Protocol.Preload.PrerenderFinalStatus.EmbedderHostDisallowed:
      // Chrome as embedder doesn't use this.
      throw new Error('unreachable');
    case Protocol.Preload.PrerenderFinalStatus.ActivationNavigationDestroyedBeforeSuccess:
      // Should not occur in DevTools because tab is alive?
      return i18n.i18n.lockedString('Internal error');
    case Protocol.Preload.PrerenderFinalStatus.TabClosedByUserGesture:
      // Should not occur in DevTools because tab is alive.
      throw new Error('unreachable');
    case Protocol.Preload.PrerenderFinalStatus.TabClosedWithoutUserGesture:
      // Should not occur in DevTools because tab is alive.
      throw new Error('unreachable');
    case Protocol.Preload.PrerenderFinalStatus.PrimaryMainFrameRendererProcessCrashed:
      return i18nString(UIStrings.prerenderFinalStatusPrimaryMainFrameRendererProcessCrashed);
    case Protocol.Preload.PrerenderFinalStatus.PrimaryMainFrameRendererProcessKilled:
      return i18nString(UIStrings.prerenderFinalStatusPrimaryMainFrameRendererProcessKilled);
    case Protocol.Preload.PrerenderFinalStatus.ActivationFramePolicyNotCompatible:
      return i18nString(UIStrings.prerenderFinalStatusActivationFramePolicyNotCompatible);
    case Protocol.Preload.PrerenderFinalStatus.PreloadingDisabled:
      return i18nString(UIStrings.prerenderFinalStatusPreloadingDisabled);
    case Protocol.Preload.PrerenderFinalStatus.BatterySaverEnabled:
      return i18nString(UIStrings.prerenderFinalStatusBatterySaverEnabled);
    case Protocol.Preload.PrerenderFinalStatus.ActivatedDuringMainFrameNavigation:
      return i18nString(UIStrings.prerenderFinalStatusActivatedDuringMainFrameNavigation);
    case Protocol.Preload.PrerenderFinalStatus.PreloadingUnsupportedByWebContents:
      // Chrome as embedder doesn't use this.
      throw new Error('unreachable');
    case Protocol.Preload.PrerenderFinalStatus.CrossSiteRedirectInMainFrameNavigation:
      return i18nString(UIStrings.prerenderFinalStatusCrossSiteRedirectInMainFrameNavigation);
    case Protocol.Preload.PrerenderFinalStatus.CrossSiteNavigationInMainFrameNavigation:
      return i18nString(UIStrings.prerenderFinalStatusCrossSiteNavigationInMainFrameNavigation);
    case Protocol.Preload.PrerenderFinalStatus.SameSiteCrossOriginRedirectNotOptInInMainFrameNavigation:
      return i18nString(UIStrings.prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInMainFrameNavigation);
    case Protocol.Preload.PrerenderFinalStatus.SameSiteCrossOriginNavigationNotOptInInMainFrameNavigation:
      return i18nString(UIStrings.prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInMainFrameNavigation);
    case Protocol.Preload.PrerenderFinalStatus.MemoryPressureOnTrigger:
      return i18nString(UIStrings.prerenderFinalStatusMemoryPressureOnTrigger);
    case Protocol.Preload.PrerenderFinalStatus.MemoryPressureAfterTriggered:
      return i18nString(UIStrings.prerenderFinalStatusMemoryPressureAfterTriggered);
    case Protocol.Preload.PrerenderFinalStatus.PrerenderingDisabledByDevTools:
      return i18nString(UIStrings.prerenderFinalStatusPrerenderingDisabledByDevTools);
    case Protocol.Preload.PrerenderFinalStatus.SpeculationRuleRemoved:
      return i18nString(UIStrings.prerenderFinalStatusSpeculationRuleRemoved);
    case Protocol.Preload.PrerenderFinalStatus.ActivatedWithAuxiliaryBrowsingContexts:
      return i18nString(UIStrings.prerenderFinalStatusActivatedWithAuxiliaryBrowsingContexts);
    case Protocol.Preload.PrerenderFinalStatus.MaxNumOfRunningEagerPrerendersExceeded:
      return i18nString(UIStrings.prerenderFinalStatusMaxNumOfRunningEagerPrerendersExceeded);
    case Protocol.Preload.PrerenderFinalStatus.MaxNumOfRunningEmbedderPrerendersExceeded:
      return i18nString(UIStrings.prerenderFinalStatusMaxNumOfRunningEmbedderPrerendersExceeded);
    case Protocol.Preload.PrerenderFinalStatus.MaxNumOfRunningNonEagerPrerendersExceeded:
      return i18nString(UIStrings.prerenderFinalStatusMaxNumOfRunningNonEagerPrerendersExceeded);
    case Protocol.Preload.PrerenderFinalStatus.PrerenderingUrlHasEffectiveUrl:
      return i18nString(UIStrings.prerenderFinalStatusPrerenderingUrlHasEffectiveUrl);
    case Protocol.Preload.PrerenderFinalStatus.RedirectedPrerenderingUrlHasEffectiveUrl:
      return i18nString(UIStrings.prerenderFinalStatusRedirectedPrerenderingUrlHasEffectiveUrl);
    case Protocol.Preload.PrerenderFinalStatus.ActivationUrlHasEffectiveUrl:
      return i18nString(UIStrings.prerenderFinalStatusActivationUrlHasEffectiveUrl);
    default:
      // Note that we use switch and exhaustiveness check to prevent to
      // forget updating these strings, but allow to handle unknown
      // PrerenderFinalStatus at runtime.
      return i18n.i18n.lockedString(`Unknown failure reason: ${
          attempt.prerenderStatus as
          'See https://docs.google.com/document/d/1PnrfowsZMt62PX1EvvTp2Nqs3ji1zrklrAEe1JYbkTk'}`);
  }
}

export function ruleSetLocationShort(
    ruleSet: Protocol.Preload.RuleSet, pageURL: Platform.DevToolsPath.UrlString): string {
  const url = ruleSet.url === undefined ? pageURL : ruleSet.url as Platform.DevToolsPath.UrlString;
  return Bindings.ResourceUtils.displayNameForURL(url);
}

export function capitalizedAction(action: Protocol.Preload.SpeculationAction): Common.UIString.LocalizedString {
  // Use "prefetch"/"prerender" as is in SpeculationRules.
  switch (action) {
    case Protocol.Preload.SpeculationAction.Prefetch:
      return i18n.i18n.lockedString('Prefetch');
    case Protocol.Preload.SpeculationAction.Prerender:
      return i18n.i18n.lockedString('Prerender');
  }
}

export function status(status: SDK.PreloadingModel.PreloadingStatus): string {
  // See content/public/browser/preloading.h PreloadingAttemptOutcome.
  switch (status) {
    case SDK.PreloadingModel.PreloadingStatus.NotTriggered:
      return i18nString(UIStrings.statusNotTriggered);
    case SDK.PreloadingModel.PreloadingStatus.Pending:
      return i18nString(UIStrings.statusPending);
    case SDK.PreloadingModel.PreloadingStatus.Running:
      return i18nString(UIStrings.statusRunning);
    case SDK.PreloadingModel.PreloadingStatus.Ready:
      return i18nString(UIStrings.statusReady);
    case SDK.PreloadingModel.PreloadingStatus.Success:
      return i18nString(UIStrings.statusSuccess);
    case SDK.PreloadingModel.PreloadingStatus.Failure:
      return i18nString(UIStrings.statusFailure);
      // NotSupported is used to handle unreachable case. For example,
      // there is no code path for
      // PreloadingTriggeringOutcome::kTriggeredButPending in prefetch,
      // which is mapped to NotSupported. So, we regard it as an
      // internal error.
    case SDK.PreloadingModel.PreloadingStatus.NotSupported:
      return i18n.i18n.lockedString('Internal error');
  }
}

export function composedStatus(attempt: SDK.PreloadingModel.PreloadingAttempt): string {
  const short = status(attempt.status);

  if (attempt.status !== SDK.PreloadingModel.PreloadingStatus.Failure) {
    return short;
  }

  switch (attempt.action) {
    case Protocol.Preload.SpeculationAction.Prefetch: {
      const detail = prefetchFailureReason(attempt) ?? i18n.i18n.lockedString('Internal error');
      return short + ' - ' + detail;
    }
    case Protocol.Preload.SpeculationAction.Prerender: {
      const detail = prerenderFailureReason(attempt);
      assertNotNullOrUndefined(detail);
      return short + ' - ' + detail;
    }
  }
}

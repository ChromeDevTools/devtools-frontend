// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import { assertNotNullOrUndefined } from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Bindings from '../../../../models/bindings/bindings.js';
const UIStrings = {
    /**
     * @description  Description text for Prefetch status PrefetchFailedIneligibleRedirect.
     */
    PrefetchFailedIneligibleRedirect: 'The prefetch was redirected, but the redirect URL is not eligible for prefetch.',
    /**
     * @description  Description text for Prefetch status PrefetchFailedInvalidRedirect.
     */
    PrefetchFailedInvalidRedirect: 'The prefetch was redirected, but there was a problem with the redirect.',
    /**
     * @description  Description text for Prefetch status PrefetchFailedMIMENotSupported.
     */
    PrefetchFailedMIMENotSupported: 'The prefetch failed because the response\'s Content-Type header was not supported.',
    /**
     * @description  Description text for Prefetch status PrefetchFailedNetError.
     */
    PrefetchFailedNetError: 'The prefetch failed because of a network error.',
    /**
     * @description  Description text for Prefetch status PrefetchFailedNon2XX.
     */
    PrefetchFailedNon2XX: 'The prefetch failed because of a non-2xx HTTP response status code.',
    /**
     * @description  Description text for Prefetch status PrefetchIneligibleRetryAfter.
     */
    PrefetchIneligibleRetryAfter: 'A previous prefetch to the origin got a HTTP 503 response with an Retry-After header that has not elapsed yet.',
    /**
     * @description  Description text for Prefetch status PrefetchIsPrivacyDecoy.
     */
    PrefetchIsPrivacyDecoy: 'The URL was not eligible to be prefetched because there was a registered service worker or cross-site cookies for that origin, but the prefetch was put on the network anyways and not used, to disguise that the user had some kind of previous relationship with the origin.',
    /**
     * @description  Description text for Prefetch status PrefetchIsStale.
     */
    PrefetchIsStale: 'Too much time elapsed between the prefetch and usage, so the prefetch was discarded.',
    /**
     * @description  Description text for Prefetch status PrefetchNotEligibleBrowserContextOffTheRecord.
     */
    PrefetchNotEligibleBrowserContextOffTheRecord: 'The prefetch was not performed because the browser is in Incognito or Guest mode.',
    /**
     * @description  Description text for Prefetch status PrefetchNotEligibleDataSaverEnabled.
     */
    PrefetchNotEligibleDataSaverEnabled: 'The prefetch was not performed because the operating system is in Data Saver mode.',
    /**
     * @description  Description text for Prefetch status PrefetchNotEligibleExistingProxy.
     */
    PrefetchNotEligibleExistingProxy: 'The URL is not eligible to be prefetched, because in the default network context it is configured to use a proxy server.',
    /**
     * @description  Description text for Prefetch status PrefetchNotEligibleHostIsNonUnique.
     */
    PrefetchNotEligibleHostIsNonUnique: 'The URL was not eligible to be prefetched because its host was not unique (e.g., a non publicly routable IP address or a hostname which is not registry-controlled), but the prefetch was required to be proxied.',
    /**
     * @description  Description text for Prefetch status PrefetchNotEligibleNonDefaultStoragePartition.
     */
    PrefetchNotEligibleNonDefaultStoragePartition: 'The URL was not eligible to be prefetched because it uses a non-default storage partition.',
    /**
     * @description  Description text for Prefetch status PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy.
     */
    PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy: 'The URL was not eligible to be prefetched because the default network context cannot be configured to use the prefetch proxy for a same-site cross-origin prefetch request.',
    /**
     * @description  Description text for Prefetch status PrefetchNotEligibleSchemeIsNotHttps.
     */
    PrefetchNotEligibleSchemeIsNotHttps: 'The URL was not eligible to be prefetched because its scheme was not https:.',
    /**
     * @description  Description text for Prefetch status PrefetchNotEligibleUserHasCookies.
     */
    PrefetchNotEligibleUserHasCookies: 'The URL was not eligible to be prefetched because it was cross-site, but the user had cookies for that origin.',
    /**
     * @description  Description text for Prefetch status PrefetchNotEligibleUserHasServiceWorker.
     */
    PrefetchNotEligibleUserHasServiceWorker: 'The URL was not eligible to be prefetched because there was a registered service worker for that origin, which is currently not supported.',
    /**
     * @description  Description text for Prefetch status PrefetchNotUsedCookiesChanged.
     */
    PrefetchNotUsedCookiesChanged: 'The prefetch was not used because it was a cross-site prefetch, and cookies were added for that URL while the prefetch was ongoing, so the prefetched response is now out-of-date.',
    /**
     * @description  Description text for Prefetch status PrefetchProxyNotAvailable.
     */
    PrefetchProxyNotAvailable: 'A network error was encountered when trying to set up a connection to the prefetching proxy.',
    /**
     * @description  Description text for Prefetch status PrefetchNotUsedProbeFailed.
     */
    PrefetchNotUsedProbeFailed: 'The prefetch was blocked by your Internet Service Provider or network administrator.',
    /**
     * @description  Description text for Prefetch status PrefetchEvictedForNewerPrefetch.
     */
    PrefetchEvictedForNewerPrefetch: 'The prefetch was discarded because the initiating page has too many prefetches ongoing, and this was one of the oldest.',
    /**
     * @description Description text for Prefetch status PrefetchEvictedAfterCandidateRemoved.
     */
    PrefetchEvictedAfterCandidateRemoved: 'The prefetch was discarded because no speculation rule in the initating page triggers a prefetch for this URL anymore.',
    /**
     * @description  Description text for Prefetch status PrefetchNotEligibleBatterySaverEnabled.
     */
    PrefetchNotEligibleBatterySaverEnabled: 'The prefetch was not performed because the Battery Saver setting was enabled.',
    /**
     * @description  Description text for Prefetch status PrefetchNotEligiblePreloadingDisabled.
     */
    PrefetchNotEligiblePreloadingDisabled: 'The prefetch was not performed because speculative loading was disabled.',
    /**
     * @description  Description text for Prefetch status PrefetchEvictedAfterBrowsingDataRemoved.
     */
    PrefetchEvictedAfterBrowsingDataRemoved: 'The prefetch was discarded because browsing data was removed.',
    /**
     *  Description text for PrerenderFinalStatus::kLowEndDevice.
     */
    prerenderFinalStatusLowEndDevice: 'The prerender was not performed because this device does not have enough total system memory to support prerendering.',
    /**
     *  Description text for PrerenderFinalStatus::kInvalidSchemeRedirect.
     */
    prerenderFinalStatusInvalidSchemeRedirect: 'The prerendering navigation failed because it redirected to a URL whose scheme was not http: or https:.',
    /**
     *  Description text for PrerenderFinalStatus::kInvalidSchemeNavigation.
     */
    prerenderFinalStatusInvalidSchemeNavigation: 'The URL was not eligible to be prerendered because its scheme was not http: or https:.',
    /**
     *  Description text for PrerenderFinalStatus::kNavigationRequestBlockedByCsp.
     */
    prerenderFinalStatusNavigationRequestBlockedByCsp: 'The prerendering navigation was blocked by a Content Security Policy.',
    /**
     * @description Description text for PrerenderFinalStatus::kMojoBinderPolicy.
     * @example {device.mojom.GamepadMonitor} PH1
     */
    prerenderFinalStatusMojoBinderPolicy: 'The prerendered page used a forbidden JavaScript API that is currently not supported. (Internal Mojo interface: {PH1})',
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
    prerenderFinalStatusDownload: 'The prerendered page attempted to initiate a download, which is currently not supported.',
    /**
     *  Description text for PrerenderFinalStatus::kNavigationBadHttpStatus.
     */
    prerenderFinalStatusNavigationBadHttpStatus: 'The prerendering navigation failed because of a non-2xx HTTP response status code.',
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
    prerenderFinalStatusLoginAuthRequested: 'The prerendering navigation required HTTP authentication, which is currently not supported.',
    /**
     *  Description text for PrerenderFinalStatus::kUaChangeRequiresReload.
     */
    prerenderFinalStatusUaChangeRequiresReload: 'Changing User Agent occurred in prerendering navigation.',
    /**
     *  Description text for PrerenderFinalStatus::kBlockedByClient.
     */
    prerenderFinalStatusBlockedByClient: 'Some resource load was blocked.',
    /**
     *  Description text for PrerenderFinalStatus::kAudioOutputDeviceRequested.
     */
    prerenderFinalStatusAudioOutputDeviceRequested: 'The prerendered page requested audio output, which is currently not supported.',
    /**
     *  Description text for PrerenderFinalStatus::kMixedContent.
     */
    prerenderFinalStatusMixedContent: 'The prerendered page contained mixed content.',
    /**
     *  Description text for PrerenderFinalStatus::kTriggerBackgrounded.
     */
    prerenderFinalStatusTriggerBackgrounded: 'The initiating page was backgrounded, so the prerendered page was discarded.',
    /**
     *  Description text for PrerenderFinalStatus::kMemoryLimitExceeded.
     */
    prerenderFinalStatusMemoryLimitExceeded: 'The prerender was not performed because the browser exceeded the prerendering memory limit.',
    /**
     *  Description text for PrerenderFinalStatus::kDataSaverEnabled.
     */
    prerenderFinalStatusDataSaverEnabled: 'The prerender was not performed because the user requested that the browser use less data.',
    /**
     *  Description text for PrerenderFinalStatus::TriggerUrlHasEffectiveUrl.
     */
    prerenderFinalStatusHasEffectiveUrl: 'The initiating page cannot perform prerendering, because it has an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)',
    /**
     *  Description text for PrerenderFinalStatus::kTimeoutBackgrounded.
     */
    prerenderFinalStatusTimeoutBackgrounded: 'The initiating page was backgrounded for a long time, so the prerendered page was discarded.',
    /**
     *  Description text for PrerenderFinalStatus::kCrossSiteRedirectInInitialNavigation.
     */
    prerenderFinalStatusCrossSiteRedirectInInitialNavigation: 'The prerendering navigation failed because the prerendered URL redirected to a cross-site URL.',
    /**
     *  Description text for PrerenderFinalStatus::kCrossSiteNavigationInInitialNavigation.
     */
    prerenderFinalStatusCrossSiteNavigationInInitialNavigation: 'The prerendering navigation failed because it targeted a cross-site URL.',
    /**
     *  Description text for PrerenderFinalStatus::kSameSiteCrossOriginRedirectNotOptInInInitialNavigation.
     */
    prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInInitialNavigation: 'The prerendering navigation failed because the prerendered URL redirected to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.',
    /**
     *  Description text for PrerenderFinalStatus::kSameSiteCrossOriginNavigationNotOptInInInitialNavigation.
     */
    prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInInitialNavigation: 'The prerendering navigation failed because it was to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.',
    /**
     *  Description text for PrerenderFinalStatus::kActivationNavigationParameterMismatch.
     */
    prerenderFinalStatusActivationNavigationParameterMismatch: 'The prerender was not used because during activation time, different navigation parameters (e.g., HTTP headers) were calculated than during the original prerendering navigation request.',
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
    prerenderFinalStatusActivationFramePolicyNotCompatible: 'The prerender was not used because the sandboxing flags or permissions policy of the initiating page was not compatible with those of the prerendering page.',
    /**
     *  Description text for PrerenderFinalStatus::kPreloadingDisabled.
     */
    prerenderFinalStatusPreloadingDisabled: 'The prerender was not performed because the user disabled preloading in their browser settings.',
    /**
     *  Description text for PrerenderFinalStatus::kBatterySaverEnabled.
     */
    prerenderFinalStatusBatterySaverEnabled: 'The prerender was not performed because the user requested that the browser use less battery.',
    /**
     *  Description text for PrerenderFinalStatus::kActivatedDuringMainFrameNavigation.
     */
    prerenderFinalStatusActivatedDuringMainFrameNavigation: 'Prerendered page activated during initiating page\'s main frame navigation.',
    /**
     *  Description text for PrerenderFinalStatus::kCrossSiteRedirectInMainFrameNavigation.
     */
    prerenderFinalStatusCrossSiteRedirectInMainFrameNavigation: 'The prerendered page navigated to a URL which redirected to a cross-site URL.',
    /**
     *  Description text for PrerenderFinalStatus::kCrossSiteNavigationInMainFrameNavigation.
     */
    prerenderFinalStatusCrossSiteNavigationInMainFrameNavigation: 'The prerendered page navigated to a cross-site URL.',
    /**
     *  Description text for PrerenderFinalStatus::kSameSiteCrossOriginRedirectNotOptInInMainFrameNavigation.
     */
    prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInMainFrameNavigation: 'The prerendered page navigated to a URL which redirected to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.',
    /**
     *  Description text for PrerenderFinalStatus::kSameSiteCrossOriginNavigationNotOptInInMainFrameNavigation.
     */
    prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInMainFrameNavigation: 'The prerendered page navigated to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.',
    /**
     *  Description text for PrerenderFinalStatus::kMemoryPressureOnTrigger.
     */
    prerenderFinalStatusMemoryPressureOnTrigger: 'The prerender was not performed because the browser was under critical memory pressure.',
    /**
     *  Description text for PrerenderFinalStatus::kMemoryPressureAfterTriggered.
     */
    prerenderFinalStatusMemoryPressureAfterTriggered: 'The prerendered page was unloaded because the browser came under critical memory pressure.',
    /**
     *  Description text for PrerenderFinalStatus::kPrerenderingDisabledByDevTools.
     */
    prerenderFinalStatusPrerenderingDisabledByDevTools: 'The prerender was not performed because DevTools has been used to disable prerendering.',
    /**
     * Description text for PrerenderFinalStatus::kSpeculationRuleRemoved.
     */
    prerenderFinalStatusSpeculationRuleRemoved: 'The prerendered page was unloaded because the initiating page removed the corresponding prerender rule from <script type="speculationrules">.',
    /**
     * Description text for PrerenderFinalStatus::kActivatedWithAuxiliaryBrowsingContexts.
     */
    prerenderFinalStatusActivatedWithAuxiliaryBrowsingContexts: 'The prerender was not used because during activation time, there were other windows with an active opener reference to the initiating page, which is currently not supported.',
    /**
     * Description text for PrerenderFinalStatus::kMaxNumOfRunningEagerPrerendersExceeded.
     */
    prerenderFinalStatusMaxNumOfRunningEagerPrerendersExceeded: 'The prerender whose eagerness is "eager" was not performed because the initiating page already has too many prerenders ongoing. Remove other speculation rules with "eager" to enable further prerendering.',
    /**
     * Description text for PrerenderFinalStatus::kMaxNumOfRunningEmbedderPrerendersExceeded.
     */
    prerenderFinalStatusMaxNumOfRunningEmbedderPrerendersExceeded: 'The browser-triggered prerender was not performed because the initiating page already has too many prerenders ongoing.',
    /**
     * Description text for PrerenderFinalStatus::kMaxNumOfRunningNonEagerPrerendersExceeded.
     */
    prerenderFinalStatusMaxNumOfRunningNonEagerPrerendersExceeded: 'The old non-eager prerender (with a "moderate" or "conservative" eagerness and triggered by hovering or clicking links) was automatically canceled due to starting a new non-eager prerender. It can be retriggered by interacting with the link again.',
    /**
     * Description text for PrenderFinalStatus::kPrerenderingUrlHasEffectiveUrl.
     */
    prerenderFinalStatusPrerenderingUrlHasEffectiveUrl: 'The prerendering navigation failed because it has an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)',
    /**
     * Description text for PrenderFinalStatus::kRedirectedPrerenderingUrlHasEffectiveUrl.
     */
    prerenderFinalStatusRedirectedPrerenderingUrlHasEffectiveUrl: 'The prerendering navigation failed because it redirected to an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)',
    /**
     * Description text for PrenderFinalStatus::kActivationUrlHasEffectiveUrl.
     */
    prerenderFinalStatusActivationUrlHasEffectiveUrl: 'The prerender was not used because during activation time, navigation has an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)',
    /**
     * Description text for PrenderFinalStatus::kJavaScriptInterfaceAdded.
     */
    prerenderFinalStatusJavaScriptInterfaceAdded: 'The prerendered page was unloaded because a new JavaScript interface has been injected by WebView.addJavascriptInterface().',
    /**
     * Description text for PrenderFinalStatus::kJavaScriptInterfaceRemoved.
     */
    prerenderFinalStatusJavaScriptInterfaceRemoved: 'The prerendered page was unloaded because a JavaScript interface has been removed by WebView.removeJavascriptInterface().',
    /**
     * Description text for PrenderFinalStatus::kAllPrerenderingCanceled.
     */
    prerenderFinalStatusAllPrerenderingCanceled: 'All prerendered pages were unloaded by the browser for some reason (For example, WebViewCompat.addWebMessageListener() was called during prerendering.)',
    /**
     * Description text for PrenderFinalStatus::kWindowClosed.
     */
    prerenderFinalStatusWindowClosed: 'The prerendered page was unloaded because it called window.close().',
    /**
     * Description text for PrenderFinalStatus::kBrowsingDataRemoved.
     */
    prerenderFinalStatusBrowsingDataRemoved: 'The prerendered page was unloaded because browsing data was removed.',
    /**
     * @description Text in grid and details: Preloading attempt is not yet triggered.
     */
    statusNotTriggered: 'Not triggered',
    /**
     * @description Text in grid and details: Preloading attempt is eligible but pending.
     */
    statusPending: 'Pending',
    /**
     * @description Text in grid and details: Preloading is running.
     */
    statusRunning: 'Running',
    /**
     * @description Text in grid and details: Preloading finished and the result is ready for the next navigation.
     */
    statusReady: 'Ready',
    /**
     * @description Text in grid and details: Ready, then used.
     */
    statusSuccess: 'Success',
    /**
     * @description Text in grid and details: Preloading failed.
     */
    statusFailure: 'Failure',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/components/PreloadingString.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const PrefetchReasonDescription = {
    PrefetchFailedIneligibleRedirect: { name: i18nLazyString(UIStrings.PrefetchFailedIneligibleRedirect) },
    PrefetchFailedInvalidRedirect: { name: i18nLazyString(UIStrings.PrefetchFailedInvalidRedirect) },
    PrefetchFailedMIMENotSupported: { name: i18nLazyString(UIStrings.PrefetchFailedMIMENotSupported) },
    PrefetchFailedNetError: { name: i18nLazyString(UIStrings.PrefetchFailedNetError) },
    PrefetchFailedNon2XX: { name: i18nLazyString(UIStrings.PrefetchFailedNon2XX) },
    PrefetchIneligibleRetryAfter: { name: i18nLazyString(UIStrings.PrefetchIneligibleRetryAfter) },
    PrefetchIsPrivacyDecoy: { name: i18nLazyString(UIStrings.PrefetchIsPrivacyDecoy) },
    PrefetchIsStale: { name: i18nLazyString(UIStrings.PrefetchIsStale) },
    PrefetchNotEligibleBrowserContextOffTheRecord: { name: i18nLazyString(UIStrings.PrefetchNotEligibleBrowserContextOffTheRecord) },
    PrefetchNotEligibleDataSaverEnabled: { name: i18nLazyString(UIStrings.PrefetchNotEligibleDataSaverEnabled) },
    PrefetchNotEligibleExistingProxy: { name: i18nLazyString(UIStrings.PrefetchNotEligibleExistingProxy) },
    PrefetchNotEligibleHostIsNonUnique: { name: i18nLazyString(UIStrings.PrefetchNotEligibleHostIsNonUnique) },
    PrefetchNotEligibleNonDefaultStoragePartition: { name: i18nLazyString(UIStrings.PrefetchNotEligibleNonDefaultStoragePartition) },
    PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy: { name: i18nLazyString(UIStrings.PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy) },
    PrefetchNotEligibleSchemeIsNotHttps: { name: i18nLazyString(UIStrings.PrefetchNotEligibleSchemeIsNotHttps) },
    PrefetchNotEligibleUserHasCookies: { name: i18nLazyString(UIStrings.PrefetchNotEligibleUserHasCookies) },
    PrefetchNotEligibleUserHasServiceWorker: { name: i18nLazyString(UIStrings.PrefetchNotEligibleUserHasServiceWorker) },
    PrefetchNotUsedCookiesChanged: { name: i18nLazyString(UIStrings.PrefetchNotUsedCookiesChanged) },
    PrefetchProxyNotAvailable: { name: i18nLazyString(UIStrings.PrefetchProxyNotAvailable) },
    PrefetchNotUsedProbeFailed: { name: i18nLazyString(UIStrings.PrefetchNotUsedProbeFailed) },
    PrefetchEvictedForNewerPrefetch: { name: i18nLazyString(UIStrings.PrefetchEvictedForNewerPrefetch) },
    PrefetchEvictedAfterCandidateRemoved: { name: i18nLazyString(UIStrings.PrefetchEvictedAfterCandidateRemoved) },
    PrefetchNotEligibleBatterySaverEnabled: { name: i18nLazyString(UIStrings.PrefetchNotEligibleBatterySaverEnabled) },
    PrefetchNotEligiblePreloadingDisabled: { name: i18nLazyString(UIStrings.PrefetchNotEligiblePreloadingDisabled) },
    PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler: { name: () => i18n.i18n.lockedString('Unknown') },
    PrefetchNotEligibleRedirectFromServiceWorker: { name: () => i18n.i18n.lockedString('Unknown') },
    PrefetchNotEligibleRedirectToServiceWorker: { name: () => i18n.i18n.lockedString('Unknown') },
    PrefetchEvictedAfterBrowsingDataRemoved: { name: i18nLazyString(UIStrings.PrefetchEvictedAfterBrowsingDataRemoved) },
};
/** Decoding PrefetchFinalStatus prefetchAttempt to failure description. **/
export function prefetchFailureReason({ prefetchStatus }) {
    // If you face an error on rolling CDP changes, see
    // https://docs.google.com/document/d/1PnrfowsZMt62PX1EvvTp2Nqs3ji1zrklrAEe1JYbkTk
    switch (prefetchStatus) {
        case null:
            return null;
        // PrefetchNotStarted is mapped to Pending.
        case "PrefetchNotStarted" /* Protocol.Preload.PrefetchStatus.PrefetchNotStarted */:
            return null;
        // PrefetchNotFinishedInTime is mapped to Running.
        case "PrefetchNotFinishedInTime" /* Protocol.Preload.PrefetchStatus.PrefetchNotFinishedInTime */:
            return null;
        // PrefetchResponseUsed is mapped to Success.
        case "PrefetchResponseUsed" /* Protocol.Preload.PrefetchStatus.PrefetchResponseUsed */:
            return null;
        // Holdback related status is expected to be overridden when DevTools is
        // opened.
        case "PrefetchAllowed" /* Protocol.Preload.PrefetchStatus.PrefetchAllowed */:
        case "PrefetchHeldback" /* Protocol.Preload.PrefetchStatus.PrefetchHeldback */:
            return null;
        // TODO(https://crbug.com/1410709): deprecate PrefetchSuccessfulButNotUsed in the protocol.
        case "PrefetchSuccessfulButNotUsed" /* Protocol.Preload.PrefetchStatus.PrefetchSuccessfulButNotUsed */:
            return null;
        case "PrefetchFailedIneligibleRedirect" /* Protocol.Preload.PrefetchStatus.PrefetchFailedIneligibleRedirect */:
            return PrefetchReasonDescription['PrefetchFailedIneligibleRedirect'].name();
        case "PrefetchFailedInvalidRedirect" /* Protocol.Preload.PrefetchStatus.PrefetchFailedInvalidRedirect */:
            return PrefetchReasonDescription['PrefetchFailedInvalidRedirect'].name();
        case "PrefetchFailedMIMENotSupported" /* Protocol.Preload.PrefetchStatus.PrefetchFailedMIMENotSupported */:
            return PrefetchReasonDescription['PrefetchFailedMIMENotSupported'].name();
        case "PrefetchFailedNetError" /* Protocol.Preload.PrefetchStatus.PrefetchFailedNetError */:
            return PrefetchReasonDescription['PrefetchFailedNetError'].name();
        case "PrefetchFailedNon2XX" /* Protocol.Preload.PrefetchStatus.PrefetchFailedNon2XX */:
            return PrefetchReasonDescription['PrefetchFailedNon2XX'].name();
        case "PrefetchIneligibleRetryAfter" /* Protocol.Preload.PrefetchStatus.PrefetchIneligibleRetryAfter */:
            return PrefetchReasonDescription['PrefetchIneligibleRetryAfter'].name();
        case "PrefetchEvictedForNewerPrefetch" /* Protocol.Preload.PrefetchStatus.PrefetchEvictedForNewerPrefetch */:
            return PrefetchReasonDescription['PrefetchEvictedForNewerPrefetch'].name();
        case "PrefetchEvictedAfterCandidateRemoved" /* Protocol.Preload.PrefetchStatus.PrefetchEvictedAfterCandidateRemoved */:
            return PrefetchReasonDescription['PrefetchEvictedAfterCandidateRemoved'].name();
        case "PrefetchIsPrivacyDecoy" /* Protocol.Preload.PrefetchStatus.PrefetchIsPrivacyDecoy */:
            return PrefetchReasonDescription['PrefetchIsPrivacyDecoy'].name();
        case "PrefetchIsStale" /* Protocol.Preload.PrefetchStatus.PrefetchIsStale */:
            return PrefetchReasonDescription['PrefetchIsStale'].name();
        case "PrefetchNotEligibleBrowserContextOffTheRecord" /* Protocol.Preload.PrefetchStatus.PrefetchNotEligibleBrowserContextOffTheRecord */:
            return PrefetchReasonDescription['PrefetchNotEligibleBrowserContextOffTheRecord'].name();
        case "PrefetchNotEligibleDataSaverEnabled" /* Protocol.Preload.PrefetchStatus.PrefetchNotEligibleDataSaverEnabled */:
            return PrefetchReasonDescription['PrefetchNotEligibleDataSaverEnabled'].name();
        case "PrefetchNotEligibleExistingProxy" /* Protocol.Preload.PrefetchStatus.PrefetchNotEligibleExistingProxy */:
            return PrefetchReasonDescription['PrefetchNotEligibleExistingProxy'].name();
        case "PrefetchNotEligibleHostIsNonUnique" /* Protocol.Preload.PrefetchStatus.PrefetchNotEligibleHostIsNonUnique */:
            return PrefetchReasonDescription['PrefetchNotEligibleHostIsNonUnique'].name();
        case "PrefetchNotEligibleNonDefaultStoragePartition" /* Protocol.Preload.PrefetchStatus.PrefetchNotEligibleNonDefaultStoragePartition */:
            return PrefetchReasonDescription['PrefetchNotEligibleNonDefaultStoragePartition'].name();
        case "PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy" /* Protocol.Preload.PrefetchStatus.PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy */:
            return PrefetchReasonDescription['PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy'].name();
        case "PrefetchNotEligibleSchemeIsNotHttps" /* Protocol.Preload.PrefetchStatus.PrefetchNotEligibleSchemeIsNotHttps */:
            return PrefetchReasonDescription['PrefetchNotEligibleSchemeIsNotHttps'].name();
        case "PrefetchNotEligibleUserHasCookies" /* Protocol.Preload.PrefetchStatus.PrefetchNotEligibleUserHasCookies */:
            return PrefetchReasonDescription['PrefetchNotEligibleUserHasCookies'].name();
        case "PrefetchNotEligibleUserHasServiceWorker" /* Protocol.Preload.PrefetchStatus.PrefetchNotEligibleUserHasServiceWorker */:
            return PrefetchReasonDescription['PrefetchNotEligibleUserHasServiceWorker'].name();
        case "PrefetchNotUsedCookiesChanged" /* Protocol.Preload.PrefetchStatus.PrefetchNotUsedCookiesChanged */:
            return PrefetchReasonDescription['PrefetchNotUsedCookiesChanged'].name();
        case "PrefetchProxyNotAvailable" /* Protocol.Preload.PrefetchStatus.PrefetchProxyNotAvailable */:
            return PrefetchReasonDescription['PrefetchProxyNotAvailable'].name();
        case "PrefetchNotUsedProbeFailed" /* Protocol.Preload.PrefetchStatus.PrefetchNotUsedProbeFailed */:
            return PrefetchReasonDescription['PrefetchNotUsedProbeFailed'].name();
        case "PrefetchNotEligibleBatterySaverEnabled" /* Protocol.Preload.PrefetchStatus.PrefetchNotEligibleBatterySaverEnabled */:
            return PrefetchReasonDescription['PrefetchNotEligibleBatterySaverEnabled'].name();
        case "PrefetchNotEligiblePreloadingDisabled" /* Protocol.Preload.PrefetchStatus.PrefetchNotEligiblePreloadingDisabled */:
            return PrefetchReasonDescription['PrefetchNotEligiblePreloadingDisabled'].name();
        case "PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler" /* Protocol.Preload.PrefetchStatus.PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler */:
            return PrefetchReasonDescription['PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler'].name();
        case "PrefetchNotEligibleRedirectFromServiceWorker" /* Protocol.Preload.PrefetchStatus.PrefetchNotEligibleRedirectFromServiceWorker */:
            return PrefetchReasonDescription['PrefetchNotEligibleRedirectFromServiceWorker'].name();
        case "PrefetchNotEligibleRedirectToServiceWorker" /* Protocol.Preload.PrefetchStatus.PrefetchNotEligibleRedirectToServiceWorker */:
            return PrefetchReasonDescription['PrefetchNotEligibleRedirectToServiceWorker'].name();
        case "PrefetchEvictedAfterBrowsingDataRemoved" /* Protocol.Preload.PrefetchStatus.PrefetchEvictedAfterBrowsingDataRemoved */:
            return PrefetchReasonDescription['PrefetchEvictedAfterBrowsingDataRemoved'].name();
        default:
            // Note that we use switch and exhaustiveness check to prevent to
            // forget updating these strings, but allow to handle unknown
            // PrefetchStatus at runtime.
            return i18n.i18n.lockedString(`Unknown failure reason: ${prefetchStatus}`);
    }
}
/** Detailed failure reason for PrerenderFinalStatus. **/
export function prerenderFailureReason(attempt) {
    // If you face an error on rolling CDP changes, see
    // https://docs.google.com/document/d/1PnrfowsZMt62PX1EvvTp2Nqs3ji1zrklrAEe1JYbkTk
    switch (attempt.prerenderStatus) {
        case null:
        case "Activated" /* Protocol.Preload.PrerenderFinalStatus.Activated */:
            return null;
        case "Destroyed" /* Protocol.Preload.PrerenderFinalStatus.Destroyed */:
            // TODO(https://crbug.com/1410709): Fill it.
            return i18n.i18n.lockedString('Unknown');
        case "LowEndDevice" /* Protocol.Preload.PrerenderFinalStatus.LowEndDevice */:
            return i18nString(UIStrings.prerenderFinalStatusLowEndDevice);
        case "InvalidSchemeRedirect" /* Protocol.Preload.PrerenderFinalStatus.InvalidSchemeRedirect */:
            return i18nString(UIStrings.prerenderFinalStatusInvalidSchemeRedirect);
        case "InvalidSchemeNavigation" /* Protocol.Preload.PrerenderFinalStatus.InvalidSchemeNavigation */:
            return i18nString(UIStrings.prerenderFinalStatusInvalidSchemeNavigation);
        case "NavigationRequestBlockedByCsp" /* Protocol.Preload.PrerenderFinalStatus.NavigationRequestBlockedByCsp */:
            return i18nString(UIStrings.prerenderFinalStatusNavigationRequestBlockedByCsp);
        case "MojoBinderPolicy" /* Protocol.Preload.PrerenderFinalStatus.MojoBinderPolicy */:
            assertNotNullOrUndefined(attempt.disallowedMojoInterface);
            return i18nString(UIStrings.prerenderFinalStatusMojoBinderPolicy, { PH1: attempt.disallowedMojoInterface });
        case "RendererProcessCrashed" /* Protocol.Preload.PrerenderFinalStatus.RendererProcessCrashed */:
            return i18nString(UIStrings.prerenderFinalStatusRendererProcessCrashed);
        case "RendererProcessKilled" /* Protocol.Preload.PrerenderFinalStatus.RendererProcessKilled */:
            return i18nString(UIStrings.prerenderFinalStatusRendererProcessKilled);
        case "Download" /* Protocol.Preload.PrerenderFinalStatus.Download */:
            return i18nString(UIStrings.prerenderFinalStatusDownload);
        case "TriggerDestroyed" /* Protocol.Preload.PrerenderFinalStatus.TriggerDestroyed */:
            // After https://crrev.com/c/4515841, this won't occur if DevTools is opened.
            return i18n.i18n.lockedString('Internal error');
        case "NavigationNotCommitted" /* Protocol.Preload.PrerenderFinalStatus.NavigationNotCommitted */:
            // This looks internal error.
            //
            // TODO(https://crbug.com/1410709): Fill it.
            return i18n.i18n.lockedString('Internal error');
        case "NavigationBadHttpStatus" /* Protocol.Preload.PrerenderFinalStatus.NavigationBadHttpStatus */:
            return i18nString(UIStrings.prerenderFinalStatusNavigationBadHttpStatus);
        case "ClientCertRequested" /* Protocol.Preload.PrerenderFinalStatus.ClientCertRequested */:
            return i18nString(UIStrings.prerenderFinalStatusClientCertRequested);
        case "NavigationRequestNetworkError" /* Protocol.Preload.PrerenderFinalStatus.NavigationRequestNetworkError */:
            return i18nString(UIStrings.prerenderFinalStatusNavigationRequestNetworkError);
        case "CancelAllHostsForTesting" /* Protocol.Preload.PrerenderFinalStatus.CancelAllHostsForTesting */:
            // Used only in tests.
            throw new Error('unreachable');
        case "DidFailLoad" /* Protocol.Preload.PrerenderFinalStatus.DidFailLoad */:
            // TODO(https://crbug.com/1410709): Fill it.
            return i18n.i18n.lockedString('Unknown');
        case "Stop" /* Protocol.Preload.PrerenderFinalStatus.Stop */:
            // TODO(https://crbug.com/1410709): Fill it.
            return i18n.i18n.lockedString('Unknown');
        case "SslCertificateError" /* Protocol.Preload.PrerenderFinalStatus.SslCertificateError */:
            return i18nString(UIStrings.prerenderFinalStatusSslCertificateError);
        case "LoginAuthRequested" /* Protocol.Preload.PrerenderFinalStatus.LoginAuthRequested */:
            return i18nString(UIStrings.prerenderFinalStatusLoginAuthRequested);
        case "UaChangeRequiresReload" /* Protocol.Preload.PrerenderFinalStatus.UaChangeRequiresReload */:
            return i18nString(UIStrings.prerenderFinalStatusUaChangeRequiresReload);
        case "BlockedByClient" /* Protocol.Preload.PrerenderFinalStatus.BlockedByClient */:
            return i18nString(UIStrings.prerenderFinalStatusBlockedByClient);
        case "AudioOutputDeviceRequested" /* Protocol.Preload.PrerenderFinalStatus.AudioOutputDeviceRequested */:
            return i18nString(UIStrings.prerenderFinalStatusAudioOutputDeviceRequested);
        case "MixedContent" /* Protocol.Preload.PrerenderFinalStatus.MixedContent */:
            return i18nString(UIStrings.prerenderFinalStatusMixedContent);
        case "TriggerBackgrounded" /* Protocol.Preload.PrerenderFinalStatus.TriggerBackgrounded */:
            return i18nString(UIStrings.prerenderFinalStatusTriggerBackgrounded);
        case "MemoryLimitExceeded" /* Protocol.Preload.PrerenderFinalStatus.MemoryLimitExceeded */:
            return i18nString(UIStrings.prerenderFinalStatusMemoryLimitExceeded);
        case "DataSaverEnabled" /* Protocol.Preload.PrerenderFinalStatus.DataSaverEnabled */:
            return i18nString(UIStrings.prerenderFinalStatusDataSaverEnabled);
        case "TriggerUrlHasEffectiveUrl" /* Protocol.Preload.PrerenderFinalStatus.TriggerUrlHasEffectiveUrl */:
            return i18nString(UIStrings.prerenderFinalStatusHasEffectiveUrl);
        case "ActivatedBeforeStarted" /* Protocol.Preload.PrerenderFinalStatus.ActivatedBeforeStarted */:
            // Status for debugging.
            return i18n.i18n.lockedString('Internal error');
        case "InactivePageRestriction" /* Protocol.Preload.PrerenderFinalStatus.InactivePageRestriction */:
            // This looks internal error.
            //
            // TODO(https://crbug.com/1410709): Fill it.
            return i18n.i18n.lockedString('Internal error');
        case "StartFailed" /* Protocol.Preload.PrerenderFinalStatus.StartFailed */:
            // This looks internal error.
            //
            // TODO(https://crbug.com/1410709): Fill it.
            return i18n.i18n.lockedString('Internal error');
        case "TimeoutBackgrounded" /* Protocol.Preload.PrerenderFinalStatus.TimeoutBackgrounded */:
            return i18nString(UIStrings.prerenderFinalStatusTimeoutBackgrounded);
        case "CrossSiteRedirectInInitialNavigation" /* Protocol.Preload.PrerenderFinalStatus.CrossSiteRedirectInInitialNavigation */:
            return i18nString(UIStrings.prerenderFinalStatusCrossSiteRedirectInInitialNavigation);
        case "CrossSiteNavigationInInitialNavigation" /* Protocol.Preload.PrerenderFinalStatus.CrossSiteNavigationInInitialNavigation */:
            return i18nString(UIStrings.prerenderFinalStatusCrossSiteNavigationInInitialNavigation);
        case "SameSiteCrossOriginRedirectNotOptInInInitialNavigation" /* Protocol.Preload.PrerenderFinalStatus.SameSiteCrossOriginRedirectNotOptInInInitialNavigation */:
            return i18nString(UIStrings.prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInInitialNavigation);
        case "SameSiteCrossOriginNavigationNotOptInInInitialNavigation" /* Protocol.Preload.PrerenderFinalStatus.SameSiteCrossOriginNavigationNotOptInInInitialNavigation */:
            return i18nString(UIStrings.prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInInitialNavigation);
        case "ActivationNavigationParameterMismatch" /* Protocol.Preload.PrerenderFinalStatus.ActivationNavigationParameterMismatch */:
            return i18nString(UIStrings.prerenderFinalStatusActivationNavigationParameterMismatch);
        case "ActivatedInBackground" /* Protocol.Preload.PrerenderFinalStatus.ActivatedInBackground */:
            // Status for debugging.
            return i18n.i18n.lockedString('Internal error');
        case "EmbedderHostDisallowed" /* Protocol.Preload.PrerenderFinalStatus.EmbedderHostDisallowed */:
            // Chrome as embedder doesn't use this.
            throw new Error('unreachable');
        case "ActivationNavigationDestroyedBeforeSuccess" /* Protocol.Preload.PrerenderFinalStatus.ActivationNavigationDestroyedBeforeSuccess */:
            // Should not occur in DevTools because tab is alive?
            return i18n.i18n.lockedString('Internal error');
        case "TabClosedByUserGesture" /* Protocol.Preload.PrerenderFinalStatus.TabClosedByUserGesture */:
            // Should not occur in DevTools because tab is alive.
            throw new Error('unreachable');
        case "TabClosedWithoutUserGesture" /* Protocol.Preload.PrerenderFinalStatus.TabClosedWithoutUserGesture */:
            // Should not occur in DevTools because tab is alive.
            throw new Error('unreachable');
        case "PrimaryMainFrameRendererProcessCrashed" /* Protocol.Preload.PrerenderFinalStatus.PrimaryMainFrameRendererProcessCrashed */:
            return i18nString(UIStrings.prerenderFinalStatusPrimaryMainFrameRendererProcessCrashed);
        case "PrimaryMainFrameRendererProcessKilled" /* Protocol.Preload.PrerenderFinalStatus.PrimaryMainFrameRendererProcessKilled */:
            return i18nString(UIStrings.prerenderFinalStatusPrimaryMainFrameRendererProcessKilled);
        case "ActivationFramePolicyNotCompatible" /* Protocol.Preload.PrerenderFinalStatus.ActivationFramePolicyNotCompatible */:
            return i18nString(UIStrings.prerenderFinalStatusActivationFramePolicyNotCompatible);
        case "PreloadingDisabled" /* Protocol.Preload.PrerenderFinalStatus.PreloadingDisabled */:
            return i18nString(UIStrings.prerenderFinalStatusPreloadingDisabled);
        case "BatterySaverEnabled" /* Protocol.Preload.PrerenderFinalStatus.BatterySaverEnabled */:
            return i18nString(UIStrings.prerenderFinalStatusBatterySaverEnabled);
        case "ActivatedDuringMainFrameNavigation" /* Protocol.Preload.PrerenderFinalStatus.ActivatedDuringMainFrameNavigation */:
            return i18nString(UIStrings.prerenderFinalStatusActivatedDuringMainFrameNavigation);
        case "PreloadingUnsupportedByWebContents" /* Protocol.Preload.PrerenderFinalStatus.PreloadingUnsupportedByWebContents */:
            // Chrome as embedder doesn't use this.
            throw new Error('unreachable');
        case "CrossSiteRedirectInMainFrameNavigation" /* Protocol.Preload.PrerenderFinalStatus.CrossSiteRedirectInMainFrameNavigation */:
            return i18nString(UIStrings.prerenderFinalStatusCrossSiteRedirectInMainFrameNavigation);
        case "CrossSiteNavigationInMainFrameNavigation" /* Protocol.Preload.PrerenderFinalStatus.CrossSiteNavigationInMainFrameNavigation */:
            return i18nString(UIStrings.prerenderFinalStatusCrossSiteNavigationInMainFrameNavigation);
        case "SameSiteCrossOriginRedirectNotOptInInMainFrameNavigation" /* Protocol.Preload.PrerenderFinalStatus.SameSiteCrossOriginRedirectNotOptInInMainFrameNavigation */:
            return i18nString(UIStrings.prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInMainFrameNavigation);
        case "SameSiteCrossOriginNavigationNotOptInInMainFrameNavigation" /* Protocol.Preload.PrerenderFinalStatus.SameSiteCrossOriginNavigationNotOptInInMainFrameNavigation */:
            return i18nString(UIStrings.prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInMainFrameNavigation);
        case "MemoryPressureOnTrigger" /* Protocol.Preload.PrerenderFinalStatus.MemoryPressureOnTrigger */:
            return i18nString(UIStrings.prerenderFinalStatusMemoryPressureOnTrigger);
        case "MemoryPressureAfterTriggered" /* Protocol.Preload.PrerenderFinalStatus.MemoryPressureAfterTriggered */:
            return i18nString(UIStrings.prerenderFinalStatusMemoryPressureAfterTriggered);
        case "PrerenderingDisabledByDevTools" /* Protocol.Preload.PrerenderFinalStatus.PrerenderingDisabledByDevTools */:
            return i18nString(UIStrings.prerenderFinalStatusPrerenderingDisabledByDevTools);
        case "SpeculationRuleRemoved" /* Protocol.Preload.PrerenderFinalStatus.SpeculationRuleRemoved */:
            return i18nString(UIStrings.prerenderFinalStatusSpeculationRuleRemoved);
        case "ActivatedWithAuxiliaryBrowsingContexts" /* Protocol.Preload.PrerenderFinalStatus.ActivatedWithAuxiliaryBrowsingContexts */:
            return i18nString(UIStrings.prerenderFinalStatusActivatedWithAuxiliaryBrowsingContexts);
        case "MaxNumOfRunningEagerPrerendersExceeded" /* Protocol.Preload.PrerenderFinalStatus.MaxNumOfRunningEagerPrerendersExceeded */:
            return i18nString(UIStrings.prerenderFinalStatusMaxNumOfRunningEagerPrerendersExceeded);
        case "MaxNumOfRunningEmbedderPrerendersExceeded" /* Protocol.Preload.PrerenderFinalStatus.MaxNumOfRunningEmbedderPrerendersExceeded */:
            return i18nString(UIStrings.prerenderFinalStatusMaxNumOfRunningEmbedderPrerendersExceeded);
        case "MaxNumOfRunningNonEagerPrerendersExceeded" /* Protocol.Preload.PrerenderFinalStatus.MaxNumOfRunningNonEagerPrerendersExceeded */:
            return i18nString(UIStrings.prerenderFinalStatusMaxNumOfRunningNonEagerPrerendersExceeded);
        case "PrerenderingUrlHasEffectiveUrl" /* Protocol.Preload.PrerenderFinalStatus.PrerenderingUrlHasEffectiveUrl */:
            return i18nString(UIStrings.prerenderFinalStatusPrerenderingUrlHasEffectiveUrl);
        case "RedirectedPrerenderingUrlHasEffectiveUrl" /* Protocol.Preload.PrerenderFinalStatus.RedirectedPrerenderingUrlHasEffectiveUrl */:
            return i18nString(UIStrings.prerenderFinalStatusRedirectedPrerenderingUrlHasEffectiveUrl);
        case "ActivationUrlHasEffectiveUrl" /* Protocol.Preload.PrerenderFinalStatus.ActivationUrlHasEffectiveUrl */:
            return i18nString(UIStrings.prerenderFinalStatusActivationUrlHasEffectiveUrl);
        case "JavaScriptInterfaceAdded" /* Protocol.Preload.PrerenderFinalStatus.JavaScriptInterfaceAdded */:
            return i18nString(UIStrings.prerenderFinalStatusJavaScriptInterfaceAdded);
        case "JavaScriptInterfaceRemoved" /* Protocol.Preload.PrerenderFinalStatus.JavaScriptInterfaceRemoved */:
            return i18nString(UIStrings.prerenderFinalStatusJavaScriptInterfaceRemoved);
        case "AllPrerenderingCanceled" /* Protocol.Preload.PrerenderFinalStatus.AllPrerenderingCanceled */:
            return i18nString(UIStrings.prerenderFinalStatusAllPrerenderingCanceled);
        case "WindowClosed" /* Protocol.Preload.PrerenderFinalStatus.WindowClosed */:
            return i18nString(UIStrings.prerenderFinalStatusWindowClosed);
        case "BrowsingDataRemoved" /* Protocol.Preload.PrerenderFinalStatus.BrowsingDataRemoved */:
            return i18nString(UIStrings.prerenderFinalStatusBrowsingDataRemoved);
        case "SlowNetwork" /* Protocol.Preload.PrerenderFinalStatus.SlowNetwork */:
        case "OtherPrerenderedPageActivated" /* Protocol.Preload.PrerenderFinalStatus.OtherPrerenderedPageActivated */:
        case "V8OptimizerDisabled" /* Protocol.Preload.PrerenderFinalStatus.V8OptimizerDisabled */:
        case "PrerenderFailedDuringPrefetch" /* Protocol.Preload.PrerenderFinalStatus.PrerenderFailedDuringPrefetch */:
            // TODO(crbug.com/350870118): Add message for this.
            return '';
        default:
            // Note that we use switch and exhaustiveness check to prevent to
            // forget updating these strings, but allow to handle unknown
            // PrerenderFinalStatus at runtime.
            // See https://docs.google.com/document/d/1PnrfowsZMt62PX1EvvTp2Nqs3ji1zrklrAEe1JYbkTk'
            return i18n.i18n.lockedString(`Unknown failure reason: ${attempt.prerenderStatus}`);
    }
}
export function ruleSetLocationShort(ruleSet, pageURL) {
    const url = ruleSet.url === undefined ? pageURL : ruleSet.url;
    return Bindings.ResourceUtils.displayNameForURL(url);
}
export function ruleSetTagOrLocationShort(ruleSet, pageURL) {
    if (!ruleSet.errorMessage && ruleSet.tag) {
        return '"' + ruleSet.tag + '"';
    }
    return ruleSetLocationShort(ruleSet, pageURL);
}
export function capitalizedAction(action) {
    switch (action) {
        case "Prefetch" /* Protocol.Preload.SpeculationAction.Prefetch */:
            return i18n.i18n.lockedString('Prefetch');
        case "Prerender" /* Protocol.Preload.SpeculationAction.Prerender */:
            return i18n.i18n.lockedString('Prerender');
        case "PrerenderUntilScript" /* Protocol.Preload.SpeculationAction.PrerenderUntilScript */:
            return i18n.i18n.lockedString('Prerender until script');
    }
}
export function sortOrder(attempt) {
    switch (attempt.status) {
        case "NotSupported" /* SDK.PreloadingModel.PreloadingStatus.NOT_SUPPORTED */:
            return 0;
        case "Pending" /* SDK.PreloadingModel.PreloadingStatus.PENDING */:
            return 1;
        case "Running" /* SDK.PreloadingModel.PreloadingStatus.RUNNING */:
            return 2;
        case "Ready" /* SDK.PreloadingModel.PreloadingStatus.READY */:
            return 3;
        case "Success" /* SDK.PreloadingModel.PreloadingStatus.SUCCESS */:
            return 4;
        case "Failure" /* SDK.PreloadingModel.PreloadingStatus.FAILURE */: {
            switch (attempt.action) {
                case "Prefetch" /* Protocol.Preload.SpeculationAction.Prefetch */:
                    return 5;
                case "Prerender" /* Protocol.Preload.SpeculationAction.Prerender */:
                    return 6;
                case "PrerenderUntilScript" /* Protocol.Preload.SpeculationAction.PrerenderUntilScript */:
                    return 7;
            }
        }
        case "NotTriggered" /* SDK.PreloadingModel.PreloadingStatus.NOT_TRIGGERED */:
            return 8;
        default:
            Platform.assertNever(attempt.status, 'Unknown Preloading attempt status');
    }
}
export function status(status) {
    // See content/public/browser/preloading.h PreloadingAttemptOutcome.
    switch (status) {
        case "NotTriggered" /* SDK.PreloadingModel.PreloadingStatus.NOT_TRIGGERED */:
            return i18nString(UIStrings.statusNotTriggered);
        case "Pending" /* SDK.PreloadingModel.PreloadingStatus.PENDING */:
            return i18nString(UIStrings.statusPending);
        case "Running" /* SDK.PreloadingModel.PreloadingStatus.RUNNING */:
            return i18nString(UIStrings.statusRunning);
        case "Ready" /* SDK.PreloadingModel.PreloadingStatus.READY */:
            return i18nString(UIStrings.statusReady);
        case "Success" /* SDK.PreloadingModel.PreloadingStatus.SUCCESS */:
            return i18nString(UIStrings.statusSuccess);
        case "Failure" /* SDK.PreloadingModel.PreloadingStatus.FAILURE */:
            return i18nString(UIStrings.statusFailure);
        // NotSupported is used to handle unreachable case. For example,
        // there is no code path for
        // PreloadingTriggeringOutcome::kTriggeredButPending in prefetch,
        // which is mapped to NotSupported. So, we regard it as an
        // internal error.
        case "NotSupported" /* SDK.PreloadingModel.PreloadingStatus.NOT_SUPPORTED */:
            return i18n.i18n.lockedString('Internal error');
    }
}
export function composedStatus(attempt) {
    const short = status(attempt.status);
    if (attempt.status !== "Failure" /* SDK.PreloadingModel.PreloadingStatus.FAILURE */) {
        return short;
    }
    switch (attempt.action) {
        case "Prefetch" /* Protocol.Preload.SpeculationAction.Prefetch */: {
            const detail = prefetchFailureReason(attempt) ?? i18n.i18n.lockedString('Internal error');
            return short + ' - ' + detail;
        }
        case "Prerender" /* Protocol.Preload.SpeculationAction.Prerender */:
        case "PrerenderUntilScript" /* Protocol.Preload.SpeculationAction.PrerenderUntilScript */: {
            const detail = prerenderFailureReason(attempt);
            assertNotNullOrUndefined(detail);
            return short + ' - ' + detail;
        }
    }
}
//# sourceMappingURL=PreloadingString.js.map
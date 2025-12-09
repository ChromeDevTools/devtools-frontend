var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/application/preloading/components/MismatchedPreloadingGrid.js
var MismatchedPreloadingGrid_exports = {};
__export(MismatchedPreloadingGrid_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  MismatchedPreloadingGrid: () => MismatchedPreloadingGrid,
  i18nString: () => i18nString2
});
import "./../../../../ui/legacy/components/data_grid/data_grid.js";
import * as i18n3 from "./../../../../core/i18n/i18n.js";
import * as SDK2 from "./../../../../core/sdk/sdk.js";
import * as Diff from "./../../../../third_party/diff/diff.js";
import * as UI from "./../../../../ui/legacy/legacy.js";
import * as Lit from "./../../../../ui/lit/lit.js";

// gen/front_end/panels/application/preloading/components/PreloadingString.js
import * as i18n from "./../../../../core/i18n/i18n.js";
import * as Platform from "./../../../../core/platform/platform.js";
import { assertNotNullOrUndefined } from "./../../../../core/platform/platform.js";
import * as SDK from "./../../../../core/sdk/sdk.js";
import * as Bindings from "./../../../../models/bindings/bindings.js";
var UIStrings = {
  /**
   * @description  Description text for Prefetch status PrefetchFailedIneligibleRedirect.
   */
  PrefetchFailedIneligibleRedirect: "The prefetch was redirected, but the redirect URL is not eligible for prefetch.",
  /**
   * @description  Description text for Prefetch status PrefetchFailedInvalidRedirect.
   */
  PrefetchFailedInvalidRedirect: "The prefetch was redirected, but there was a problem with the redirect.",
  /**
   * @description  Description text for Prefetch status PrefetchFailedMIMENotSupported.
   */
  PrefetchFailedMIMENotSupported: "The prefetch failed because the response's Content-Type header was not supported.",
  /**
   * @description  Description text for Prefetch status PrefetchFailedNetError.
   */
  PrefetchFailedNetError: "The prefetch failed because of a network error.",
  /**
   * @description  Description text for Prefetch status PrefetchFailedNon2XX.
   */
  PrefetchFailedNon2XX: "The prefetch failed because of a non-2xx HTTP response status code.",
  /**
   * @description  Description text for Prefetch status PrefetchIneligibleRetryAfter.
   */
  PrefetchIneligibleRetryAfter: "A previous prefetch to the origin got a HTTP 503 response with an Retry-After header that has not elapsed yet.",
  /**
   * @description  Description text for Prefetch status PrefetchIsPrivacyDecoy.
   */
  PrefetchIsPrivacyDecoy: "The URL was not eligible to be prefetched because there was a registered service worker or cross-site cookies for that origin, but the prefetch was put on the network anyways and not used, to disguise that the user had some kind of previous relationship with the origin.",
  /**
   * @description  Description text for Prefetch status PrefetchIsStale.
   */
  PrefetchIsStale: "Too much time elapsed between the prefetch and usage, so the prefetch was discarded.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleBrowserContextOffTheRecord.
   */
  PrefetchNotEligibleBrowserContextOffTheRecord: "The prefetch was not performed because the browser is in Incognito or Guest mode.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleDataSaverEnabled.
   */
  PrefetchNotEligibleDataSaverEnabled: "The prefetch was not performed because the operating system is in Data Saver mode.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleExistingProxy.
   */
  PrefetchNotEligibleExistingProxy: "The URL is not eligible to be prefetched, because in the default network context it is configured to use a proxy server.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleHostIsNonUnique.
   */
  PrefetchNotEligibleHostIsNonUnique: "The URL was not eligible to be prefetched because its host was not unique (e.g., a non publicly routable IP address or a hostname which is not registry-controlled), but the prefetch was required to be proxied.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleNonDefaultStoragePartition.
   */
  PrefetchNotEligibleNonDefaultStoragePartition: "The URL was not eligible to be prefetched because it uses a non-default storage partition.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy.
   */
  PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy: "The URL was not eligible to be prefetched because the default network context cannot be configured to use the prefetch proxy for a same-site cross-origin prefetch request.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleSchemeIsNotHttps.
   */
  PrefetchNotEligibleSchemeIsNotHttps: "The URL was not eligible to be prefetched because its scheme was not https:.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleUserHasCookies.
   */
  PrefetchNotEligibleUserHasCookies: "The URL was not eligible to be prefetched because it was cross-site, but the user had cookies for that origin.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleUserHasServiceWorker.
   */
  PrefetchNotEligibleUserHasServiceWorker: "The URL was not eligible to be prefetched because there was a registered service worker for that origin, which is currently not supported.",
  /**
   * @description  Description text for Prefetch status PrefetchNotUsedCookiesChanged.
   */
  PrefetchNotUsedCookiesChanged: "The prefetch was not used because it was a cross-site prefetch, and cookies were added for that URL while the prefetch was ongoing, so the prefetched response is now out-of-date.",
  /**
   * @description  Description text for Prefetch status PrefetchProxyNotAvailable.
   */
  PrefetchProxyNotAvailable: "A network error was encountered when trying to set up a connection to the prefetching proxy.",
  /**
   * @description  Description text for Prefetch status PrefetchNotUsedProbeFailed.
   */
  PrefetchNotUsedProbeFailed: "The prefetch was blocked by your Internet Service Provider or network administrator.",
  /**
   * @description  Description text for Prefetch status PrefetchEvictedForNewerPrefetch.
   */
  PrefetchEvictedForNewerPrefetch: "The prefetch was discarded because the initiating page has too many prefetches ongoing, and this was one of the oldest.",
  /**
   * @description Description text for Prefetch status PrefetchEvictedAfterCandidateRemoved.
   */
  PrefetchEvictedAfterCandidateRemoved: "The prefetch was discarded because no speculation rule in the initating page triggers a prefetch for this URL anymore.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligibleBatterySaverEnabled.
   */
  PrefetchNotEligibleBatterySaverEnabled: "The prefetch was not performed because the Battery Saver setting was enabled.",
  /**
   * @description  Description text for Prefetch status PrefetchNotEligiblePreloadingDisabled.
   */
  PrefetchNotEligiblePreloadingDisabled: "The prefetch was not performed because speculative loading was disabled.",
  /**
   * @description  Description text for Prefetch status PrefetchEvictedAfterBrowsingDataRemoved.
   */
  PrefetchEvictedAfterBrowsingDataRemoved: "The prefetch was discarded because browsing data was removed.",
  /**
   *  Description text for PrerenderFinalStatus::kLowEndDevice.
   */
  prerenderFinalStatusLowEndDevice: "The prerender was not performed because this device does not have enough total system memory to support prerendering.",
  /**
   *  Description text for PrerenderFinalStatus::kInvalidSchemeRedirect.
   */
  prerenderFinalStatusInvalidSchemeRedirect: "The prerendering navigation failed because it redirected to a URL whose scheme was not http: or https:.",
  /**
   *  Description text for PrerenderFinalStatus::kInvalidSchemeNavigation.
   */
  prerenderFinalStatusInvalidSchemeNavigation: "The URL was not eligible to be prerendered because its scheme was not http: or https:.",
  /**
   *  Description text for PrerenderFinalStatus::kNavigationRequestBlockedByCsp.
   */
  prerenderFinalStatusNavigationRequestBlockedByCsp: "The prerendering navigation was blocked by a Content Security Policy.",
  /**
   * @description Description text for PrerenderFinalStatus::kMojoBinderPolicy.
   * @example {device.mojom.GamepadMonitor} PH1
   */
  prerenderFinalStatusMojoBinderPolicy: "The prerendered page used a forbidden JavaScript API that is currently not supported. (Internal Mojo interface: {PH1})",
  /**
   *  Description text for PrerenderFinalStatus::kRendererProcessCrashed.
   */
  prerenderFinalStatusRendererProcessCrashed: "The prerendered page crashed.",
  /**
   *  Description text for PrerenderFinalStatus::kRendererProcessKilled.
   */
  prerenderFinalStatusRendererProcessKilled: "The prerendered page was killed.",
  /**
   *  Description text for PrerenderFinalStatus::kDownload.
   */
  prerenderFinalStatusDownload: "The prerendered page attempted to initiate a download, which is currently not supported.",
  /**
   *  Description text for PrerenderFinalStatus::kNavigationBadHttpStatus.
   */
  prerenderFinalStatusNavigationBadHttpStatus: "The prerendering navigation failed because of a non-2xx HTTP response status code.",
  /**
   *  Description text for PrerenderFinalStatus::kClientCertRequested.
   */
  prerenderFinalStatusClientCertRequested: "The prerendering navigation required a HTTP client certificate.",
  /**
   *  Description text for PrerenderFinalStatus::kNavigationRequestNetworkError.
   */
  prerenderFinalStatusNavigationRequestNetworkError: "The prerendering navigation encountered a network error.",
  /**
   *  Description text for PrerenderFinalStatus::kSslCertificateError.
   */
  prerenderFinalStatusSslCertificateError: "The prerendering navigation failed because of an invalid SSL certificate.",
  /**
   *  Description text for PrerenderFinalStatus::kLoginAuthRequested.
   */
  prerenderFinalStatusLoginAuthRequested: "The prerendering navigation required HTTP authentication, which is currently not supported.",
  /**
   *  Description text for PrerenderFinalStatus::kUaChangeRequiresReload.
   */
  prerenderFinalStatusUaChangeRequiresReload: "Changing User Agent occurred in prerendering navigation.",
  /**
   *  Description text for PrerenderFinalStatus::kBlockedByClient.
   */
  prerenderFinalStatusBlockedByClient: "Some resource load was blocked.",
  /**
   *  Description text for PrerenderFinalStatus::kAudioOutputDeviceRequested.
   */
  prerenderFinalStatusAudioOutputDeviceRequested: "The prerendered page requested audio output, which is currently not supported.",
  /**
   *  Description text for PrerenderFinalStatus::kMixedContent.
   */
  prerenderFinalStatusMixedContent: "The prerendered page contained mixed content.",
  /**
   *  Description text for PrerenderFinalStatus::kTriggerBackgrounded.
   */
  prerenderFinalStatusTriggerBackgrounded: "The initiating page was backgrounded, so the prerendered page was discarded.",
  /**
   *  Description text for PrerenderFinalStatus::kMemoryLimitExceeded.
   */
  prerenderFinalStatusMemoryLimitExceeded: "The prerender was not performed because the browser exceeded the prerendering memory limit.",
  /**
   *  Description text for PrerenderFinalStatus::kDataSaverEnabled.
   */
  prerenderFinalStatusDataSaverEnabled: "The prerender was not performed because the user requested that the browser use less data.",
  /**
   *  Description text for PrerenderFinalStatus::TriggerUrlHasEffectiveUrl.
   */
  prerenderFinalStatusHasEffectiveUrl: "The initiating page cannot perform prerendering, because it has an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)",
  /**
   *  Description text for PrerenderFinalStatus::kTimeoutBackgrounded.
   */
  prerenderFinalStatusTimeoutBackgrounded: "The initiating page was backgrounded for a long time, so the prerendered page was discarded.",
  /**
   *  Description text for PrerenderFinalStatus::kCrossSiteRedirectInInitialNavigation.
   */
  prerenderFinalStatusCrossSiteRedirectInInitialNavigation: "The prerendering navigation failed because the prerendered URL redirected to a cross-site URL.",
  /**
   *  Description text for PrerenderFinalStatus::kCrossSiteNavigationInInitialNavigation.
   */
  prerenderFinalStatusCrossSiteNavigationInInitialNavigation: "The prerendering navigation failed because it targeted a cross-site URL.",
  /**
   *  Description text for PrerenderFinalStatus::kSameSiteCrossOriginRedirectNotOptInInInitialNavigation.
   */
  prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInInitialNavigation: "The prerendering navigation failed because the prerendered URL redirected to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.",
  /**
   *  Description text for PrerenderFinalStatus::kSameSiteCrossOriginNavigationNotOptInInInitialNavigation.
   */
  prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInInitialNavigation: "The prerendering navigation failed because it was to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.",
  /**
   *  Description text for PrerenderFinalStatus::kActivationNavigationParameterMismatch.
   */
  prerenderFinalStatusActivationNavigationParameterMismatch: "The prerender was not used because during activation time, different navigation parameters (e.g., HTTP headers) were calculated than during the original prerendering navigation request.",
  /**
   *  Description text for PrerenderFinalStatus::kPrimaryMainFrameRendererProcessCrashed.
   */
  prerenderFinalStatusPrimaryMainFrameRendererProcessCrashed: "The initiating page crashed.",
  /**
   *  Description text for PrerenderFinalStatus::kPrimaryMainFrameRendererProcessKilled.
   */
  prerenderFinalStatusPrimaryMainFrameRendererProcessKilled: "The initiating page was killed.",
  /**
   *  Description text for PrerenderFinalStatus::kActivationFramePolicyNotCompatible.
   */
  prerenderFinalStatusActivationFramePolicyNotCompatible: "The prerender was not used because the sandboxing flags or permissions policy of the initiating page was not compatible with those of the prerendering page.",
  /**
   *  Description text for PrerenderFinalStatus::kPreloadingDisabled.
   */
  prerenderFinalStatusPreloadingDisabled: "The prerender was not performed because the user disabled preloading in their browser settings.",
  /**
   *  Description text for PrerenderFinalStatus::kBatterySaverEnabled.
   */
  prerenderFinalStatusBatterySaverEnabled: "The prerender was not performed because the user requested that the browser use less battery.",
  /**
   *  Description text for PrerenderFinalStatus::kActivatedDuringMainFrameNavigation.
   */
  prerenderFinalStatusActivatedDuringMainFrameNavigation: "Prerendered page activated during initiating page's main frame navigation.",
  /**
   *  Description text for PrerenderFinalStatus::kCrossSiteRedirectInMainFrameNavigation.
   */
  prerenderFinalStatusCrossSiteRedirectInMainFrameNavigation: "The prerendered page navigated to a URL which redirected to a cross-site URL.",
  /**
   *  Description text for PrerenderFinalStatus::kCrossSiteNavigationInMainFrameNavigation.
   */
  prerenderFinalStatusCrossSiteNavigationInMainFrameNavigation: "The prerendered page navigated to a cross-site URL.",
  /**
   *  Description text for PrerenderFinalStatus::kSameSiteCrossOriginRedirectNotOptInInMainFrameNavigation.
   */
  prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInMainFrameNavigation: "The prerendered page navigated to a URL which redirected to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.",
  /**
   *  Description text for PrerenderFinalStatus::kSameSiteCrossOriginNavigationNotOptInInMainFrameNavigation.
   */
  prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInMainFrameNavigation: "The prerendered page navigated to a cross-origin same-site URL, but the destination response did not include the appropriate Supports-Loading-Mode header.",
  /**
   *  Description text for PrerenderFinalStatus::kMemoryPressureOnTrigger.
   */
  prerenderFinalStatusMemoryPressureOnTrigger: "The prerender was not performed because the browser was under critical memory pressure.",
  /**
   *  Description text for PrerenderFinalStatus::kMemoryPressureAfterTriggered.
   */
  prerenderFinalStatusMemoryPressureAfterTriggered: "The prerendered page was unloaded because the browser came under critical memory pressure.",
  /**
   *  Description text for PrerenderFinalStatus::kPrerenderingDisabledByDevTools.
   */
  prerenderFinalStatusPrerenderingDisabledByDevTools: "The prerender was not performed because DevTools has been used to disable prerendering.",
  /**
   * Description text for PrerenderFinalStatus::kSpeculationRuleRemoved.
   */
  prerenderFinalStatusSpeculationRuleRemoved: 'The prerendered page was unloaded because the initiating page removed the corresponding prerender rule from <script type="speculationrules">.',
  /**
   * Description text for PrerenderFinalStatus::kActivatedWithAuxiliaryBrowsingContexts.
   */
  prerenderFinalStatusActivatedWithAuxiliaryBrowsingContexts: "The prerender was not used because during activation time, there were other windows with an active opener reference to the initiating page, which is currently not supported.",
  /**
   * Description text for PrerenderFinalStatus::kMaxNumOfRunningEagerPrerendersExceeded.
   */
  prerenderFinalStatusMaxNumOfRunningEagerPrerendersExceeded: 'The prerender whose eagerness is "eager" was not performed because the initiating page already has too many prerenders ongoing. Remove other speculation rules with "eager" to enable further prerendering.',
  /**
   * Description text for PrerenderFinalStatus::kMaxNumOfRunningEmbedderPrerendersExceeded.
   */
  prerenderFinalStatusMaxNumOfRunningEmbedderPrerendersExceeded: "The browser-triggered prerender was not performed because the initiating page already has too many prerenders ongoing.",
  /**
   * Description text for PrerenderFinalStatus::kMaxNumOfRunningNonEagerPrerendersExceeded.
   */
  prerenderFinalStatusMaxNumOfRunningNonEagerPrerendersExceeded: 'The old non-eager prerender (with a "moderate" or "conservative" eagerness and triggered by hovering or clicking links) was automatically canceled due to starting a new non-eager prerender. It can be retriggered by interacting with the link again.',
  /**
   * Description text for PrenderFinalStatus::kPrerenderingUrlHasEffectiveUrl.
   */
  prerenderFinalStatusPrerenderingUrlHasEffectiveUrl: "The prerendering navigation failed because it has an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)",
  /**
   * Description text for PrenderFinalStatus::kRedirectedPrerenderingUrlHasEffectiveUrl.
   */
  prerenderFinalStatusRedirectedPrerenderingUrlHasEffectiveUrl: "The prerendering navigation failed because it redirected to an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)",
  /**
   * Description text for PrenderFinalStatus::kActivationUrlHasEffectiveUrl.
   */
  prerenderFinalStatusActivationUrlHasEffectiveUrl: "The prerender was not used because during activation time, navigation has an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)",
  /**
   * Description text for PrenderFinalStatus::kJavaScriptInterfaceAdded.
   */
  prerenderFinalStatusJavaScriptInterfaceAdded: "The prerendered page was unloaded because a new JavaScript interface has been injected by WebView.addJavascriptInterface().",
  /**
   * Description text for PrenderFinalStatus::kJavaScriptInterfaceRemoved.
   */
  prerenderFinalStatusJavaScriptInterfaceRemoved: "The prerendered page was unloaded because a JavaScript interface has been removed by WebView.removeJavascriptInterface().",
  /**
   * Description text for PrenderFinalStatus::kAllPrerenderingCanceled.
   */
  prerenderFinalStatusAllPrerenderingCanceled: "All prerendered pages were unloaded by the browser for some reason (For example, WebViewCompat.addWebMessageListener() was called during prerendering.)",
  /**
   * Description text for PrenderFinalStatus::kWindowClosed.
   */
  prerenderFinalStatusWindowClosed: "The prerendered page was unloaded because it called window.close().",
  /**
   * Description text for PrenderFinalStatus::kBrowsingDataRemoved.
   */
  prerenderFinalStatusBrowsingDataRemoved: "The prerendered page was unloaded because browsing data was removed.",
  /**
   * @description Text in grid and details: Preloading attempt is not yet triggered.
   */
  statusNotTriggered: "Not triggered",
  /**
   * @description Text in grid and details: Preloading attempt is eligible but pending.
   */
  statusPending: "Pending",
  /**
   * @description Text in grid and details: Preloading is running.
   */
  statusRunning: "Running",
  /**
   * @description Text in grid and details: Preloading finished and the result is ready for the next navigation.
   */
  statusReady: "Ready",
  /**
   * @description Text in grid and details: Ready, then used.
   */
  statusSuccess: "Success",
  /**
   * @description Text in grid and details: Preloading failed.
   */
  statusFailure: "Failure"
};
var str_ = i18n.i18n.registerUIStrings("panels/application/preloading/components/PreloadingString.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var PrefetchReasonDescription = {
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
  PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler: { name: () => i18n.i18n.lockedString("Unknown") },
  PrefetchNotEligibleRedirectFromServiceWorker: { name: () => i18n.i18n.lockedString("Unknown") },
  PrefetchNotEligibleRedirectToServiceWorker: { name: () => i18n.i18n.lockedString("Unknown") },
  PrefetchEvictedAfterBrowsingDataRemoved: { name: i18nLazyString(UIStrings.PrefetchEvictedAfterBrowsingDataRemoved) }
};
function prefetchFailureReason({ prefetchStatus }) {
  switch (prefetchStatus) {
    case null:
      return null;
    // PrefetchNotStarted is mapped to Pending.
    case "PrefetchNotStarted":
      return null;
    // PrefetchNotFinishedInTime is mapped to Running.
    case "PrefetchNotFinishedInTime":
      return null;
    // PrefetchResponseUsed is mapped to Success.
    case "PrefetchResponseUsed":
      return null;
    // Holdback related status is expected to be overridden when DevTools is
    // opened.
    case "PrefetchAllowed":
    case "PrefetchHeldback":
      return null;
    // TODO(https://crbug.com/1410709): deprecate PrefetchSuccessfulButNotUsed in the protocol.
    case "PrefetchSuccessfulButNotUsed":
      return null;
    case "PrefetchFailedIneligibleRedirect":
      return PrefetchReasonDescription["PrefetchFailedIneligibleRedirect"].name();
    case "PrefetchFailedInvalidRedirect":
      return PrefetchReasonDescription["PrefetchFailedInvalidRedirect"].name();
    case "PrefetchFailedMIMENotSupported":
      return PrefetchReasonDescription["PrefetchFailedMIMENotSupported"].name();
    case "PrefetchFailedNetError":
      return PrefetchReasonDescription["PrefetchFailedNetError"].name();
    case "PrefetchFailedNon2XX":
      return PrefetchReasonDescription["PrefetchFailedNon2XX"].name();
    case "PrefetchIneligibleRetryAfter":
      return PrefetchReasonDescription["PrefetchIneligibleRetryAfter"].name();
    case "PrefetchEvictedForNewerPrefetch":
      return PrefetchReasonDescription["PrefetchEvictedForNewerPrefetch"].name();
    case "PrefetchEvictedAfterCandidateRemoved":
      return PrefetchReasonDescription["PrefetchEvictedAfterCandidateRemoved"].name();
    case "PrefetchIsPrivacyDecoy":
      return PrefetchReasonDescription["PrefetchIsPrivacyDecoy"].name();
    case "PrefetchIsStale":
      return PrefetchReasonDescription["PrefetchIsStale"].name();
    case "PrefetchNotEligibleBrowserContextOffTheRecord":
      return PrefetchReasonDescription["PrefetchNotEligibleBrowserContextOffTheRecord"].name();
    case "PrefetchNotEligibleDataSaverEnabled":
      return PrefetchReasonDescription["PrefetchNotEligibleDataSaverEnabled"].name();
    case "PrefetchNotEligibleExistingProxy":
      return PrefetchReasonDescription["PrefetchNotEligibleExistingProxy"].name();
    case "PrefetchNotEligibleHostIsNonUnique":
      return PrefetchReasonDescription["PrefetchNotEligibleHostIsNonUnique"].name();
    case "PrefetchNotEligibleNonDefaultStoragePartition":
      return PrefetchReasonDescription["PrefetchNotEligibleNonDefaultStoragePartition"].name();
    case "PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy":
      return PrefetchReasonDescription["PrefetchNotEligibleSameSiteCrossOriginPrefetchRequiredProxy"].name();
    case "PrefetchNotEligibleSchemeIsNotHttps":
      return PrefetchReasonDescription["PrefetchNotEligibleSchemeIsNotHttps"].name();
    case "PrefetchNotEligibleUserHasCookies":
      return PrefetchReasonDescription["PrefetchNotEligibleUserHasCookies"].name();
    case "PrefetchNotEligibleUserHasServiceWorker":
      return PrefetchReasonDescription["PrefetchNotEligibleUserHasServiceWorker"].name();
    case "PrefetchNotUsedCookiesChanged":
      return PrefetchReasonDescription["PrefetchNotUsedCookiesChanged"].name();
    case "PrefetchProxyNotAvailable":
      return PrefetchReasonDescription["PrefetchProxyNotAvailable"].name();
    case "PrefetchNotUsedProbeFailed":
      return PrefetchReasonDescription["PrefetchNotUsedProbeFailed"].name();
    case "PrefetchNotEligibleBatterySaverEnabled":
      return PrefetchReasonDescription["PrefetchNotEligibleBatterySaverEnabled"].name();
    case "PrefetchNotEligiblePreloadingDisabled":
      return PrefetchReasonDescription["PrefetchNotEligiblePreloadingDisabled"].name();
    case "PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler":
      return PrefetchReasonDescription["PrefetchNotEligibleUserHasServiceWorkerNoFetchHandler"].name();
    case "PrefetchNotEligibleRedirectFromServiceWorker":
      return PrefetchReasonDescription["PrefetchNotEligibleRedirectFromServiceWorker"].name();
    case "PrefetchNotEligibleRedirectToServiceWorker":
      return PrefetchReasonDescription["PrefetchNotEligibleRedirectToServiceWorker"].name();
    case "PrefetchEvictedAfterBrowsingDataRemoved":
      return PrefetchReasonDescription["PrefetchEvictedAfterBrowsingDataRemoved"].name();
    default:
      return i18n.i18n.lockedString(`Unknown failure reason: ${prefetchStatus}`);
  }
}
function prerenderFailureReason(attempt) {
  switch (attempt.prerenderStatus) {
    case null:
    case "Activated":
      return null;
    case "Destroyed":
      return i18n.i18n.lockedString("Unknown");
    case "LowEndDevice":
      return i18nString(UIStrings.prerenderFinalStatusLowEndDevice);
    case "InvalidSchemeRedirect":
      return i18nString(UIStrings.prerenderFinalStatusInvalidSchemeRedirect);
    case "InvalidSchemeNavigation":
      return i18nString(UIStrings.prerenderFinalStatusInvalidSchemeNavigation);
    case "NavigationRequestBlockedByCsp":
      return i18nString(UIStrings.prerenderFinalStatusNavigationRequestBlockedByCsp);
    case "MojoBinderPolicy":
      assertNotNullOrUndefined(attempt.disallowedMojoInterface);
      return i18nString(UIStrings.prerenderFinalStatusMojoBinderPolicy, { PH1: attempt.disallowedMojoInterface });
    case "RendererProcessCrashed":
      return i18nString(UIStrings.prerenderFinalStatusRendererProcessCrashed);
    case "RendererProcessKilled":
      return i18nString(UIStrings.prerenderFinalStatusRendererProcessKilled);
    case "Download":
      return i18nString(UIStrings.prerenderFinalStatusDownload);
    case "TriggerDestroyed":
      return i18n.i18n.lockedString("Internal error");
    case "NavigationNotCommitted":
      return i18n.i18n.lockedString("Internal error");
    case "NavigationBadHttpStatus":
      return i18nString(UIStrings.prerenderFinalStatusNavigationBadHttpStatus);
    case "ClientCertRequested":
      return i18nString(UIStrings.prerenderFinalStatusClientCertRequested);
    case "NavigationRequestNetworkError":
      return i18nString(UIStrings.prerenderFinalStatusNavigationRequestNetworkError);
    case "CancelAllHostsForTesting":
      throw new Error("unreachable");
    case "DidFailLoad":
      return i18n.i18n.lockedString("Unknown");
    case "Stop":
      return i18n.i18n.lockedString("Unknown");
    case "SslCertificateError":
      return i18nString(UIStrings.prerenderFinalStatusSslCertificateError);
    case "LoginAuthRequested":
      return i18nString(UIStrings.prerenderFinalStatusLoginAuthRequested);
    case "UaChangeRequiresReload":
      return i18nString(UIStrings.prerenderFinalStatusUaChangeRequiresReload);
    case "BlockedByClient":
      return i18nString(UIStrings.prerenderFinalStatusBlockedByClient);
    case "AudioOutputDeviceRequested":
      return i18nString(UIStrings.prerenderFinalStatusAudioOutputDeviceRequested);
    case "MixedContent":
      return i18nString(UIStrings.prerenderFinalStatusMixedContent);
    case "TriggerBackgrounded":
      return i18nString(UIStrings.prerenderFinalStatusTriggerBackgrounded);
    case "MemoryLimitExceeded":
      return i18nString(UIStrings.prerenderFinalStatusMemoryLimitExceeded);
    case "DataSaverEnabled":
      return i18nString(UIStrings.prerenderFinalStatusDataSaverEnabled);
    case "TriggerUrlHasEffectiveUrl":
      return i18nString(UIStrings.prerenderFinalStatusHasEffectiveUrl);
    case "ActivatedBeforeStarted":
      return i18n.i18n.lockedString("Internal error");
    case "InactivePageRestriction":
      return i18n.i18n.lockedString("Internal error");
    case "StartFailed":
      return i18n.i18n.lockedString("Internal error");
    case "TimeoutBackgrounded":
      return i18nString(UIStrings.prerenderFinalStatusTimeoutBackgrounded);
    case "CrossSiteRedirectInInitialNavigation":
      return i18nString(UIStrings.prerenderFinalStatusCrossSiteRedirectInInitialNavigation);
    case "CrossSiteNavigationInInitialNavigation":
      return i18nString(UIStrings.prerenderFinalStatusCrossSiteNavigationInInitialNavigation);
    case "SameSiteCrossOriginRedirectNotOptInInInitialNavigation":
      return i18nString(UIStrings.prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInInitialNavigation);
    case "SameSiteCrossOriginNavigationNotOptInInInitialNavigation":
      return i18nString(UIStrings.prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInInitialNavigation);
    case "ActivationNavigationParameterMismatch":
      return i18nString(UIStrings.prerenderFinalStatusActivationNavigationParameterMismatch);
    case "ActivatedInBackground":
      return i18n.i18n.lockedString("Internal error");
    case "EmbedderHostDisallowed":
      throw new Error("unreachable");
    case "ActivationNavigationDestroyedBeforeSuccess":
      return i18n.i18n.lockedString("Internal error");
    case "TabClosedByUserGesture":
      throw new Error("unreachable");
    case "TabClosedWithoutUserGesture":
      throw new Error("unreachable");
    case "PrimaryMainFrameRendererProcessCrashed":
      return i18nString(UIStrings.prerenderFinalStatusPrimaryMainFrameRendererProcessCrashed);
    case "PrimaryMainFrameRendererProcessKilled":
      return i18nString(UIStrings.prerenderFinalStatusPrimaryMainFrameRendererProcessKilled);
    case "ActivationFramePolicyNotCompatible":
      return i18nString(UIStrings.prerenderFinalStatusActivationFramePolicyNotCompatible);
    case "PreloadingDisabled":
      return i18nString(UIStrings.prerenderFinalStatusPreloadingDisabled);
    case "BatterySaverEnabled":
      return i18nString(UIStrings.prerenderFinalStatusBatterySaverEnabled);
    case "ActivatedDuringMainFrameNavigation":
      return i18nString(UIStrings.prerenderFinalStatusActivatedDuringMainFrameNavigation);
    case "PreloadingUnsupportedByWebContents":
      throw new Error("unreachable");
    case "CrossSiteRedirectInMainFrameNavigation":
      return i18nString(UIStrings.prerenderFinalStatusCrossSiteRedirectInMainFrameNavigation);
    case "CrossSiteNavigationInMainFrameNavigation":
      return i18nString(UIStrings.prerenderFinalStatusCrossSiteNavigationInMainFrameNavigation);
    case "SameSiteCrossOriginRedirectNotOptInInMainFrameNavigation":
      return i18nString(UIStrings.prerenderFinalStatusSameSiteCrossOriginRedirectNotOptInInMainFrameNavigation);
    case "SameSiteCrossOriginNavigationNotOptInInMainFrameNavigation":
      return i18nString(UIStrings.prerenderFinalStatusSameSiteCrossOriginNavigationNotOptInInMainFrameNavigation);
    case "MemoryPressureOnTrigger":
      return i18nString(UIStrings.prerenderFinalStatusMemoryPressureOnTrigger);
    case "MemoryPressureAfterTriggered":
      return i18nString(UIStrings.prerenderFinalStatusMemoryPressureAfterTriggered);
    case "PrerenderingDisabledByDevTools":
      return i18nString(UIStrings.prerenderFinalStatusPrerenderingDisabledByDevTools);
    case "SpeculationRuleRemoved":
      return i18nString(UIStrings.prerenderFinalStatusSpeculationRuleRemoved);
    case "ActivatedWithAuxiliaryBrowsingContexts":
      return i18nString(UIStrings.prerenderFinalStatusActivatedWithAuxiliaryBrowsingContexts);
    case "MaxNumOfRunningEagerPrerendersExceeded":
      return i18nString(UIStrings.prerenderFinalStatusMaxNumOfRunningEagerPrerendersExceeded);
    case "MaxNumOfRunningEmbedderPrerendersExceeded":
      return i18nString(UIStrings.prerenderFinalStatusMaxNumOfRunningEmbedderPrerendersExceeded);
    case "MaxNumOfRunningNonEagerPrerendersExceeded":
      return i18nString(UIStrings.prerenderFinalStatusMaxNumOfRunningNonEagerPrerendersExceeded);
    case "PrerenderingUrlHasEffectiveUrl":
      return i18nString(UIStrings.prerenderFinalStatusPrerenderingUrlHasEffectiveUrl);
    case "RedirectedPrerenderingUrlHasEffectiveUrl":
      return i18nString(UIStrings.prerenderFinalStatusRedirectedPrerenderingUrlHasEffectiveUrl);
    case "ActivationUrlHasEffectiveUrl":
      return i18nString(UIStrings.prerenderFinalStatusActivationUrlHasEffectiveUrl);
    case "JavaScriptInterfaceAdded":
      return i18nString(UIStrings.prerenderFinalStatusJavaScriptInterfaceAdded);
    case "JavaScriptInterfaceRemoved":
      return i18nString(UIStrings.prerenderFinalStatusJavaScriptInterfaceRemoved);
    case "AllPrerenderingCanceled":
      return i18nString(UIStrings.prerenderFinalStatusAllPrerenderingCanceled);
    case "WindowClosed":
      return i18nString(UIStrings.prerenderFinalStatusWindowClosed);
    case "BrowsingDataRemoved":
      return i18nString(UIStrings.prerenderFinalStatusBrowsingDataRemoved);
    case "SlowNetwork":
    case "OtherPrerenderedPageActivated":
    case "V8OptimizerDisabled":
    case "PrerenderFailedDuringPrefetch":
      return "";
    default:
      return i18n.i18n.lockedString(`Unknown failure reason: ${attempt.prerenderStatus}`);
  }
}
function ruleSetLocationShort(ruleSet, pageURL) {
  const url2 = ruleSet.url === void 0 ? pageURL : ruleSet.url;
  return Bindings.ResourceUtils.displayNameForURL(url2);
}
function ruleSetTagOrLocationShort(ruleSet, pageURL) {
  if (!ruleSet.errorMessage && ruleSet.tag) {
    return '"' + ruleSet.tag + '"';
  }
  return ruleSetLocationShort(ruleSet, pageURL);
}
function capitalizedAction(action5) {
  switch (action5) {
    case "Prefetch":
      return i18n.i18n.lockedString("Prefetch");
    case "Prerender":
      return i18n.i18n.lockedString("Prerender");
    case "PrerenderUntilScript":
      return i18n.i18n.lockedString("Prerender until script");
  }
}
function sortOrder(attempt) {
  switch (attempt.status) {
    case "NotSupported":
      return 0;
    case "Pending":
      return 1;
    case "Running":
      return 2;
    case "Ready":
      return 3;
    case "Success":
      return 4;
    case "Failure": {
      switch (attempt.action) {
        case "Prefetch":
          return 5;
        case "Prerender":
          return 6;
        case "PrerenderUntilScript":
          return 7;
      }
    }
    case "NotTriggered":
      return 8;
    default:
      Platform.assertNever(attempt.status, "Unknown Preloading attempt status");
  }
}
function status(status3) {
  switch (status3) {
    case "NotTriggered":
      return i18nString(UIStrings.statusNotTriggered);
    case "Pending":
      return i18nString(UIStrings.statusPending);
    case "Running":
      return i18nString(UIStrings.statusRunning);
    case "Ready":
      return i18nString(UIStrings.statusReady);
    case "Success":
      return i18nString(UIStrings.statusSuccess);
    case "Failure":
      return i18nString(UIStrings.statusFailure);
    // NotSupported is used to handle unreachable case. For example,
    // there is no code path for
    // PreloadingTriggeringOutcome::kTriggeredButPending in prefetch,
    // which is mapped to NotSupported. So, we regard it as an
    // internal error.
    case "NotSupported":
      return i18n.i18n.lockedString("Internal error");
  }
}
function composedStatus(attempt) {
  const short = status(attempt.status);
  if (attempt.status !== "Failure") {
    return short;
  }
  switch (attempt.action) {
    case "Prefetch": {
      const detail = prefetchFailureReason(attempt) ?? i18n.i18n.lockedString("Internal error");
      return short + " - " + detail;
    }
    case "Prerender":
    case "PrerenderUntilScript": {
      const detail = prerenderFailureReason(attempt);
      assertNotNullOrUndefined(detail);
      return short + " - " + detail;
    }
  }
}

// gen/front_end/panels/application/preloading/components/MismatchedPreloadingGrid.js
var { charDiff } = Diff.Diff.DiffWrapper;
var { render, html, Directives: { styleMap } } = Lit;
var UIStrings2 = {
  /**
   * @description Column header
   */
  url: "URL",
  /**
   * @description Column header: Action of preloading (prefetch/prerender)
   */
  action: "Action",
  /**
   * @description Column header: Status of preloading attempt
   */
  status: "Status",
  /**
   * @description Text in grid and details: Preloading attempt is not yet triggered.
   */
  statusNotTriggered: "Not triggered",
  /**
   * @description Text in grid and details: Preloading attempt is eligible but pending.
   */
  statusPending: "Pending",
  /**
   * @description Text in grid and details: Preloading is running.
   */
  statusRunning: "Running",
  /**
   * @description Text in grid and details: Preloading finished and the result is ready for the next navigation.
   */
  statusReady: "Ready",
  /**
   * @description Text in grid and details: Ready, then used.
   */
  statusSuccess: "Success",
  /**
   * @description Text in grid and details: Preloading failed.
   */
  statusFailure: "Failure"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/application/preloading/components/MismatchedPreloadingGrid.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var PreloadingUIUtils = class {
  static status(status3) {
    switch (status3) {
      case "NotTriggered":
        return i18nString2(UIStrings2.statusNotTriggered);
      case "Pending":
        return i18nString2(UIStrings2.statusPending);
      case "Running":
        return i18nString2(UIStrings2.statusRunning);
      case "Ready":
        return i18nString2(UIStrings2.statusReady);
      case "Success":
        return i18nString2(UIStrings2.statusSuccess);
      case "Failure":
        return i18nString2(UIStrings2.statusFailure);
      // NotSupported is used to handle unreachable case. For example,
      // there is no code path for
      // PreloadingTriggeringOutcome::kTriggeredButPending in prefetch,
      // which is mapped to NotSupported. So, we regard it as an
      // internal error.
      case "NotSupported":
        return i18n3.i18n.lockedString("Internal error");
    }
  }
};
var DEFAULT_VIEW = (input, _output, target) => {
  render(html`
    <devtools-data-grid striped inline>
      <table>
        <tr>
          <th id="url" weight="40" sortable>
            ${i18nString2(UIStrings2.url)}
          </th>
          <th id="action" weight="15" sortable>
            ${i18nString2(UIStrings2.action)}
          </th>
          <th id="status" weight="15" sortable>
            ${i18nString2(UIStrings2.status)}
          </th>
        </tr>
        ${input.rows.map((row) => ({
    row,
    diffScore: Diff.Diff.DiffWrapper.characterScore(row.url, input.pageURL)
  })).sort((a, b) => b.diffScore - a.diffScore).map(({ row }) => html`
              <tr>
                <td>
                  <div>${charDiff(row.url, input.pageURL).map((diffOp) => {
    const s = diffOp[1];
    switch (diffOp[0]) {
      case Diff.Diff.Operation.Equal:
        return html`<span>${s}</span>`;
      case Diff.Diff.Operation.Insert:
        return html`<span style=${styleMap({
          color: "var(--sys-color-green)",
          "text-decoration": "line-through"
        })}
                              >${s}</span>`;
      case Diff.Diff.Operation.Delete:
        return html`<span style=${styleMap({ color: "var(--sys-color-error)" })}>${s}</span>`;
      case Diff.Diff.Operation.Edit:
        return html`<span style=${styleMap({
          color: "var(--sys-color-green",
          "text-decoration": "line-through"
        })}
                          >${s}</span>`;
      default:
        throw new Error("unreachable");
    }
  })}
                  </div>
                </td>
                <td>${capitalizedAction(row.action)}</td>
                <td>${PreloadingUIUtils.status(row.status)}</td>
              </tr>
            `)}
      </table>
    </devtools-data-grid>`, target);
};
var MismatchedPreloadingGrid = class extends UI.Widget.Widget {
  #data = null;
  #view;
  constructor(element, view = DEFAULT_VIEW) {
    super(element, { classes: ["devtools-resources-mismatched-preloading-grid"], useShadowDom: true });
    this.#view = view;
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
  }
  set data(data) {
    this.#data = data;
    this.requestUpdate();
  }
  performUpdate() {
    if (!this.#data) {
      return;
    }
    this.#view(this.#data, {}, this.contentElement);
  }
};

// gen/front_end/panels/application/preloading/components/PreloadingDetailsReportView.js
var PreloadingDetailsReportView_exports = {};
__export(PreloadingDetailsReportView_exports, {
  PreloadingDetailsReportView: () => PreloadingDetailsReportView
});
import "./../../../../ui/components/report_view/report_view.js";
import "./../../../../ui/components/request_link_icon/request_link_icon.js";
import "./../../../../ui/legacy/components/utils/utils.js";
import * as Common from "./../../../../core/common/common.js";
import * as i18n5 from "./../../../../core/i18n/i18n.js";
import { assertNotNullOrUndefined as assertNotNullOrUndefined2 } from "./../../../../core/platform/platform.js";
import * as SDK3 from "./../../../../core/sdk/sdk.js";
import * as Logs from "./../../../../models/logs/logs.js";
import * as Buttons from "./../../../../ui/components/buttons/buttons.js";
import * as UI2 from "./../../../../ui/legacy/legacy.js";
import * as Lit2 from "./../../../../ui/lit/lit.js";
import * as VisualLogging from "./../../../../ui/visual_logging/visual_logging.js";
import * as PreloadingHelper from "./../helper/helper.js";

// gen/front_end/panels/application/preloading/components/preloadingDetailsReportView.css.js
var preloadingDetailsReportView_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
:host {
  display: flex;
  height: 100%;
}

devtools-report {
  flex-grow: 1;
}

button.link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: inherit;
  height: 16px;
}

button.link devtools-icon {
  vertical-align: sub;
}

.link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
}

/*# sourceURL=${import.meta.resolve("./preloadingDetailsReportView.css")} */`;

// gen/front_end/panels/application/preloading/components/PreloadingDetailsReportView.js
var { html: html2 } = Lit2;
var UIStrings3 = {
  /**
   * @description Text in PreloadingDetailsReportView of the Application panel if no element is selected. An element here is an item in a
   * table of target URLs and additional prefetching states. https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules
   */
  noElementSelected: "No element selected",
  /**
   * @description Text in PreloadingDetailsReportView of the Application panel to prompt user to select an element in a table. An element here is an item in a
   * table of target URLs and additional prefetching states. https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules
   */
  selectAnElementForMoreDetails: "Select an element for more details",
  /**
   * @description Text in details
   */
  detailsDetailedInformation: "Detailed information",
  /**
   * @description Text in details
   */
  detailsAction: "Action",
  /**
   * @description Text in details
   */
  detailsStatus: "Status",
  /**
   * @description Text in details
   */
  detailsTargetHint: "Target hint",
  /**
   * @description Text in details
   */
  detailsFailureReason: "Failure reason",
  /**
   * @description Header of rule set
   */
  detailsRuleSet: "Rule set",
  /**
   * @description Description: status
   */
  automaticallyFellBackToPrefetch: "(automatically fell back to prefetch)",
  /**
   * @description Description: status
   */
  detailedStatusNotTriggered: "Speculative load attempt is not yet triggered.",
  /**
   * @description Description: status
   */
  detailedStatusPending: "Speculative load attempt is eligible but pending.",
  /**
   * @description Description: status
   */
  detailedStatusRunning: "Speculative load is running.",
  /**
   * @description Description: status
   */
  detailedStatusReady: "Speculative load finished and the result is ready for the next navigation.",
  /**
   * @description Description: status
   */
  detailedStatusSuccess: "Speculative load finished and used for a navigation.",
  /**
   * @description Description: status
   */
  detailedStatusFailure: "Speculative load failed.",
  /**
   * @description Description: status
   */
  detailedStatusFallbackToPrefetch: "Speculative load failed, but fallback to prefetch succeeded.",
  /**
   * @description button: Contents of button to inspect prerendered page
   */
  buttonInspect: "Inspect",
  /**
   * @description button: Title of button to inspect prerendered page
   */
  buttonClickToInspect: "Click to inspect prerendered page",
  /**
   * @description button: Title of button to reveal rule set
   */
  buttonClickToRevealRuleSet: "Click to reveal rule set"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/application/preloading/components/PreloadingDetailsReportView.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var PreloadingUIUtils2 = class {
  static detailedStatus({ status: status3 }) {
    switch (status3) {
      case "NotTriggered":
        return i18nString3(UIStrings3.detailedStatusNotTriggered);
      case "Pending":
        return i18nString3(UIStrings3.detailedStatusPending);
      case "Running":
        return i18nString3(UIStrings3.detailedStatusRunning);
      case "Ready":
        return i18nString3(UIStrings3.detailedStatusReady);
      case "Success":
        return i18nString3(UIStrings3.detailedStatusSuccess);
      case "Failure":
        return i18nString3(UIStrings3.detailedStatusFailure);
      // NotSupported is used to handle unreachable case. For example,
      // there is no code path for
      // PreloadingTriggeringOutcome::kTriggeredButPending in prefetch,
      // which is mapped to NotSupported. So, we regard it as an
      // internal error.
      case "NotSupported":
        return i18n5.i18n.lockedString("Internal error");
    }
  }
  static detailedTargetHint(key) {
    assertNotNullOrUndefined2(key.targetHint);
    switch (key.targetHint) {
      case "Blank":
        return "_blank";
      case "Self":
        return "_self";
    }
  }
};
function url(data) {
  const attempt = data.pipeline.getOriginallyTriggered();
  const prefetchStatus = data.pipeline.getPrefetch()?.status;
  let value;
  if (attempt.action === "Prefetch" && attempt.requestId !== void 0 && prefetchStatus !== "NotTriggered") {
    const { requestId, key: { url: url2 } } = attempt;
    const affectedRequest = { requestId, url: url2 };
    value = html2`
        <devtools-request-link-icon
          .data=${{
      affectedRequest,
      requestResolver: data.requestResolver || new Logs.RequestResolver.RequestResolver(),
      displayURL: true,
      urlToDisplay: url2
    }}
        >
        </devtools-request-link-icon>
    `;
  } else {
    value = html2`<div class="text-ellipsis" title=${attempt.key.url}>${attempt.key.url}</div>`;
  }
  return html2`
      <devtools-report-key>${i18n5.i18n.lockedString("URL")}</devtools-report-key>
      <devtools-report-value>
        ${value}
      </devtools-report-value>
  `;
}
function isPrerenderLike(speculationAction) {
  return [
    "Prerender",
    "PrerenderUntilScript"
    /* Protocol.Preload.SpeculationAction.PrerenderUntilScript */
  ].includes(speculationAction);
}
function action2(data, isFallbackToPrefetch) {
  const attempt = data.pipeline.getOriginallyTriggered();
  const action5 = capitalizedAction(attempt.action);
  let maybeFallback = Lit2.nothing;
  if (isFallbackToPrefetch) {
    maybeFallback = html2`${i18nString3(UIStrings3.automaticallyFellBackToPrefetch)}`;
  }
  let maybeInspectButton = Lit2.nothing;
  (() => {
    if (!isPrerenderLike(attempt.action)) {
      return;
    }
    const target = SDK3.TargetManager.TargetManager.instance().primaryPageTarget();
    if (target === null) {
      return;
    }
    const prerenderTarget = SDK3.TargetManager.TargetManager.instance().targets().find((child) => child.targetInfo()?.subtype === "prerender" && child.inspectedURL() === attempt.key.url);
    const disabled = prerenderTarget === void 0;
    const inspect = () => {
      if (prerenderTarget === void 0) {
        return;
      }
      UI2.Context.Context.instance().setFlavor(SDK3.Target.Target, prerenderTarget);
    };
    maybeInspectButton = html2`
        <devtools-button
          @click=${inspect}
          .title=${i18nString3(UIStrings3.buttonClickToInspect)}
          .size=${"SMALL"}
          .variant=${"outlined"}
          .disabled=${disabled}
          jslog=${VisualLogging.action("inspect-prerendered-page").track({ click: true })}
        >
          ${i18nString3(UIStrings3.buttonInspect)}
        </devtools-button>
    `;
  })();
  return html2`
      <devtools-report-key>${i18nString3(UIStrings3.detailsAction)}</devtools-report-key>
      <devtools-report-value>
        <div class="text-ellipsis" title="">
          ${action5} ${maybeFallback} ${maybeInspectButton}
        </div>
      </devtools-report-value>
  `;
}
function status2(data, isFallbackToPrefetch) {
  const attempt = data.pipeline.getOriginallyTriggered();
  const detailedStatus = isFallbackToPrefetch ? i18nString3(UIStrings3.detailedStatusFallbackToPrefetch) : PreloadingUIUtils2.detailedStatus(attempt);
  return html2`
      <devtools-report-key>${i18nString3(UIStrings3.detailsStatus)}</devtools-report-key>
      <devtools-report-value>
        ${detailedStatus}
      </devtools-report-value>
  `;
}
function maybePrefetchFailureReason(data) {
  const attempt = data.pipeline.getOriginallyTriggered();
  if (attempt.action !== "Prefetch") {
    return Lit2.nothing;
  }
  const failureDescription = prefetchFailureReason(attempt);
  if (failureDescription === null) {
    return Lit2.nothing;
  }
  return html2`
      <devtools-report-key>${i18nString3(UIStrings3.detailsFailureReason)}</devtools-report-key>
      <devtools-report-value>
        ${failureDescription}
      </devtools-report-value>
  `;
}
function targetHint(data) {
  const attempt = data.pipeline.getOriginallyTriggered();
  const hasTargetHint = isPrerenderLike(attempt.action) && attempt.key.targetHint !== void 0;
  if (!hasTargetHint) {
    return Lit2.nothing;
  }
  return html2`
      <devtools-report-key>${i18nString3(UIStrings3.detailsTargetHint)}</devtools-report-key>
      <devtools-report-value>
        ${PreloadingUIUtils2.detailedTargetHint(attempt.key)}
      </devtools-report-value>
  `;
}
function maybePrerenderFailureReason(data) {
  const attempt = data.pipeline.getOriginallyTriggered();
  if (!isPrerenderLike(attempt.action)) {
    return Lit2.nothing;
  }
  const failureReason = prerenderFailureReason(attempt);
  if (failureReason === null) {
    return Lit2.nothing;
  }
  return html2`
      <devtools-report-key>${i18nString3(UIStrings3.detailsFailureReason)}</devtools-report-key>
      <devtools-report-value>
        ${failureReason}
      </devtools-report-value>
  `;
}
var DEFAULT_VIEW2 = ({ data, onRevealRuleSet }, _, target) => {
  if (data === null) {
    Lit2.render(html2`
      <style>${preloadingDetailsReportView_css_default}</style>
      <style>${UI2.inspectorCommonStyles}</style>
      <div class="empty-state">
        <span class="empty-state-header">${i18nString3(UIStrings3.noElementSelected)}</span>
        <span class="empty-state-description">${i18nString3(UIStrings3.selectAnElementForMoreDetails)}</span>
      </div>
    `, target, { host: target });
    return;
  }
  const pipeline = data.pipeline;
  const pageURL = data.pageURL;
  const isFallbackToPrefetch = pipeline.getPrerender()?.status === "Failure" && (pipeline.getPrefetch()?.status === "Ready" || pipeline.getPrefetch()?.status === "Success");
  Lit2.render(html2`
    <style>${preloadingDetailsReportView_css_default}</style>
    <style>${UI2.inspectorCommonStyles}</style>
    <devtools-report
      .data=${{ reportTitle: "Speculative Loading Attempt" }}
      jslog=${VisualLogging.section("preloading-details")}>
      <devtools-report-section-header>${i18nString3(UIStrings3.detailsDetailedInformation)}</devtools-report-section-header>

      ${url(data)}
      ${action2(data, isFallbackToPrefetch)}
      ${status2(data, isFallbackToPrefetch)}
      ${targetHint(data)}
      ${maybePrefetchFailureReason(data)}
      ${maybePrerenderFailureReason(data)}

      ${data.ruleSets.map((ruleSet) => {
    const location = ruleSetLocationShort(ruleSet, pageURL);
    return html2`
          <devtools-report-key>${i18nString3(UIStrings3.detailsRuleSet)}</devtools-report-key>
          <devtools-report-value>
            <div class="text-ellipsis" title="">
              <button class="link" role="link"
                @click=${() => onRevealRuleSet(ruleSet)}
                title=${i18nString3(UIStrings3.buttonClickToRevealRuleSet)}
                style=${Lit2.Directives.styleMap({
      color: "var(--sys-color-primary)",
      "text-decoration": "underline"
    })}
                jslog=${VisualLogging.action("reveal-rule-set").track({ click: true })}
              >
                ${location}
              </button>
            </div>
          </devtools-report-value>
        `;
  })}
    </devtools-report>
  `, target, { host: target });
};
var PreloadingDetailsReportView = class extends UI2.Widget.VBox {
  #view;
  #data = null;
  constructor(view = DEFAULT_VIEW2) {
    super();
    this.#view = view;
  }
  set data(data) {
    this.#data = data;
    this.requestUpdate();
  }
  performUpdate() {
    this.#view({
      data: this.#data,
      onRevealRuleSet: (ruleSet) => {
        void Common.Revealer.reveal(new PreloadingHelper.PreloadingForward.RuleSetView(ruleSet.id));
      }
    }, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/preloading/components/PreloadingDisabledInfobar.js
var PreloadingDisabledInfobar_exports = {};
__export(PreloadingDisabledInfobar_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW3,
  PreloadingDisabledInfobar: () => PreloadingDisabledInfobar
});
import "./../../../../ui/components/report_view/report_view.js";
import "./../../../../ui/kit/kit.js";
import * as i18n7 from "./../../../../core/i18n/i18n.js";
import * as Platform2 from "./../../../../core/platform/platform.js";
import * as Buttons2 from "./../../../../ui/components/buttons/buttons.js";
import * as Dialogs from "./../../../../ui/components/dialogs/dialogs.js";
import * as UI3 from "./../../../../ui/legacy/legacy.js";
import { html as html3, i18nTemplate, nothing as nothing2, render as render3 } from "./../../../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/application/preloading/components/preloadingDisabledInfobar.css.js
var preloadingDisabledInfobar_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

#container {
  padding: 6px 12px;
  border-bottom: 1px solid var(--sys-color-divider);
  align-items: center;
  display: flex;
}

#contents .key {
  grid-column-start: span 2;
  font-weight: bold;
}

#contents .value {
  grid-column-start: span 2;
  margin-top: var(--sys-size-6);
}

#footer {
  margin-top: var(--sys-size-6);
  margin-bottom: var(--sys-size-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  grid-column-start: span 2;
}

x-link {
  color: var(--sys-color-primary);
  text-decoration-line: underline;
}

/*# sourceURL=${import.meta.resolve("./preloadingDisabledInfobar.css")} */`;

// gen/front_end/panels/application/preloading/components/PreloadingDisabledInfobar.js
var { urlString } = Platform2.DevToolsPath;
var UIStrings4 = {
  /**
   * @description Infobar text for disabled case
   */
  infobarPreloadingIsDisabled: "Speculative loading is disabled",
  /**
   * @description Infobar text for force-enabled case
   */
  infobarPreloadingIsForceEnabled: "Speculative loading is force-enabled",
  /**
   * @description Title for dialog
   */
  titleReasonsPreventingPreloading: "Reasons preventing speculative loading",
  /**
   * @description Header in dialog
   */
  headerDisabledByPreference: "User settings or extensions",
  /**
   * @description Description in dialog
   * @example {Preload pages settings (linked to chrome://settings/performance)} PH1
   * @example {Extensions settings (linked to chrome://extensions)} PH2
   */
  descriptionDisabledByPreference: "Speculative loading is disabled because of user settings or an extension. Go to {PH1} to update your preference. Go to {PH2} to disable any extension that blocks speculative loading.",
  /**
   * @description Text of link
   */
  preloadingPagesSettings: "Preload pages settings",
  /**
   * @description Text of link
   */
  extensionsSettings: "Extensions settings",
  /**
   * @description Header in dialog
   */
  headerDisabledByDataSaver: "Data Saver",
  /**
   * @description Description in dialog
   */
  descriptionDisabledByDataSaver: "Speculative loading is disabled because of the operating system's Data Saver mode.",
  /**
   * @description Header in dialog
   */
  headerDisabledByBatterySaver: "Battery Saver",
  /**
   * @description Description in dialog
   */
  descriptionDisabledByBatterySaver: "Speculative loading is disabled because of the operating system's Battery Saver mode.",
  /**
   * @description Header in dialog
   */
  headerDisabledByHoldbackPrefetchSpeculationRules: "Prefetch was disabled, but is force-enabled now",
  /**
   * @description Description in infobar
   */
  descriptionDisabledByHoldbackPrefetchSpeculationRules: "Prefetch is forced-enabled because DevTools is open. When DevTools is closed, prefetch will be disabled because this browser session is part of a holdback group used for performance comparisons.",
  /**
   * @description Header in dialog
   */
  headerDisabledByHoldbackPrerenderSpeculationRules: "Prerendering was disabled, but is force-enabled now",
  /**
   * @description Description in infobar
   */
  descriptionDisabledByHoldbackPrerenderSpeculationRules: "Prerendering is forced-enabled because DevTools is open. When DevTools is closed, prerendering will be disabled because this browser session is part of a holdback group used for performance comparisons.",
  /**
   * @description Footer link for more details
   */
  footerLearnMore: "Learn more"
};
var str_4 = i18n7.i18n.registerUIStrings("panels/application/preloading/components/PreloadingDisabledInfobar.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var LINK = "https://developer.chrome.com/blog/prerender-pages/";
var DEFAULT_VIEW3 = (input, _output, target) => {
  let template = nothing2;
  if (input.header !== null) {
    template = html3`
        <style>${preloadingDisabledInfobar_css_default}</style>
        <div id="container">
          <span id="header">${input.header}</span>
          <devtools-button-dialog .data=${{
      iconName: "info",
      variant: "icon",
      closeButton: true,
      position: "auto",
      horizontalAlignment: "auto",
      closeOnESC: true,
      closeOnScroll: false,
      dialogTitle: i18nString4(UIStrings4.titleReasonsPreventingPreloading)
    }}
                                  jslog=${VisualLogging2.dialog("preloading-disabled").track({ resize: true, keydown: "Escape" })}>
            <div id="contents">
              <devtools-report>
                ${input.warnings.map(({ key, valueId, placeholders = {} }) => {
      const value = i18nTemplate(str_4, valueId, Object.fromEntries(Object.entries(placeholders).map(([key2, { title, href }]) => [key2, html3`<devtools-link href=${href}>${title}</devtools-link>`])));
      return html3`
                      <div class="key">${key}</div>
                      <div class="value">${value}</div>
                    `;
    })}
              </devtools-report>
              <div id="footer">
                <devtools-link href=${LINK} jslogcontext="learn-more">
                  ${i18nString4(UIStrings4.footerLearnMore)}
                </devtools-link>
              </div>
            </div>
          </devtools-button-dialog>
        </div>`;
  }
  render3(template, target);
};
var PreloadingDisabledInfobar = class extends UI3.Widget.VBox {
  #view;
  #disabledByPreference = false;
  #disabledByDataSaver = false;
  #disabledByBatterySaver = false;
  #disabledByHoldbackPrefetchSpeculationRules = false;
  #disabledByHoldbackPrerenderSpeculationRules = false;
  constructor(view = DEFAULT_VIEW3) {
    super({ useShadowDom: true });
    this.#view = view;
  }
  get disabledByPreference() {
    return this.#disabledByPreference;
  }
  set disabledByPreference(value) {
    if (this.#disabledByPreference !== value) {
      this.#disabledByPreference = value;
      this.requestUpdate();
    }
  }
  get disabledByDataSaver() {
    return this.#disabledByDataSaver;
  }
  set disabledByDataSaver(value) {
    if (this.#disabledByDataSaver !== value) {
      this.#disabledByDataSaver = value;
      this.requestUpdate();
    }
  }
  get disabledByBatterySaver() {
    return this.#disabledByBatterySaver;
  }
  set disabledByBatterySaver(value) {
    if (this.#disabledByBatterySaver !== value) {
      this.#disabledByBatterySaver = value;
      this.requestUpdate();
    }
  }
  get disabledByHoldbackPrefetchSpeculationRules() {
    return this.#disabledByHoldbackPrefetchSpeculationRules;
  }
  set disabledByHoldbackPrefetchSpeculationRules(value) {
    if (this.#disabledByHoldbackPrefetchSpeculationRules !== value) {
      this.#disabledByHoldbackPrefetchSpeculationRules = value;
      this.requestUpdate();
    }
  }
  get disabledByHoldbackPrerenderSpeculationRules() {
    return this.#disabledByHoldbackPrerenderSpeculationRules;
  }
  set disabledByHoldbackPrerenderSpeculationRules(value) {
    if (this.#disabledByHoldbackPrerenderSpeculationRules !== value) {
      this.#disabledByHoldbackPrerenderSpeculationRules = value;
      this.requestUpdate();
    }
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
  }
  performUpdate() {
    let header = null;
    if (this.#disabledByPreference || this.#disabledByDataSaver || this.#disabledByBatterySaver) {
      header = i18nString4(UIStrings4.infobarPreloadingIsDisabled);
    } else if (this.#disabledByHoldbackPrefetchSpeculationRules || this.#disabledByHoldbackPrerenderSpeculationRules) {
      header = i18nString4(UIStrings4.infobarPreloadingIsForceEnabled);
    }
    const warnings = [];
    if (this.#disabledByPreference) {
      warnings.push({
        key: i18nString4(UIStrings4.headerDisabledByPreference),
        valueId: UIStrings4.descriptionDisabledByPreference,
        placeholders: {
          PH1: {
            title: i18nString4(UIStrings4.preloadingPagesSettings),
            href: urlString`chrome://settings/performance`
          },
          PH2: {
            title: i18nString4(UIStrings4.extensionsSettings),
            href: urlString`chrome://extensions`
          }
        }
      });
    }
    if (this.#disabledByDataSaver) {
      warnings.push({
        key: i18nString4(UIStrings4.headerDisabledByDataSaver),
        valueId: UIStrings4.descriptionDisabledByDataSaver
      });
    }
    if (this.#disabledByBatterySaver) {
      warnings.push({
        key: i18nString4(UIStrings4.headerDisabledByBatterySaver),
        valueId: UIStrings4.descriptionDisabledByBatterySaver
      });
    }
    if (this.#disabledByHoldbackPrefetchSpeculationRules) {
      warnings.push({
        key: i18nString4(UIStrings4.headerDisabledByHoldbackPrefetchSpeculationRules),
        valueId: UIStrings4.descriptionDisabledByHoldbackPrefetchSpeculationRules
      });
    }
    if (this.#disabledByHoldbackPrerenderSpeculationRules) {
      warnings.push({
        key: i18nString4(UIStrings4.headerDisabledByHoldbackPrerenderSpeculationRules),
        valueId: UIStrings4.descriptionDisabledByHoldbackPrerenderSpeculationRules
      });
    }
    const input = {
      header,
      warnings
    };
    const output = void 0;
    this.#view(input, output, this.contentElement);
  }
};

// gen/front_end/panels/application/preloading/components/PreloadingGrid.js
var PreloadingGrid_exports = {};
__export(PreloadingGrid_exports, {
  PRELOADING_GRID_DEFAULT_VIEW: () => PRELOADING_GRID_DEFAULT_VIEW,
  PreloadingGrid: () => PreloadingGrid,
  i18nString: () => i18nString5
});
import "./../../../../ui/legacy/components/data_grid/data_grid.js";
import "./../../../../ui/kit/kit.js";
import * as Common2 from "./../../../../core/common/common.js";
import * as i18n9 from "./../../../../core/i18n/i18n.js";
import * as SDK4 from "./../../../../core/sdk/sdk.js";
import * as UI4 from "./../../../../ui/legacy/legacy.js";
import * as Lit3 from "./../../../../ui/lit/lit.js";

// gen/front_end/panels/application/preloading/components/preloadingGrid.css.js
var preloadingGrid_css_default = `/*
 * Copyright 2022 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
@scope to (devtools-widget > *){
  .preloading-container {
    overflow: auto;
    height: 100%;
    display: flex;
    flex-direction: column;

    devtools-data-grid {
      flex: auto;
    }

    .inline-icon {
      vertical-align: text-bottom;
    }
  }

  .preloading-header {
    font-size: 15px;
    background-color: var(--sys-color-cdt-base-container);
    padding: 1px 4px;
  }

  .preloading-placeholder {
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--sys-color-token-subtle);
  }
}

/*# sourceURL=${import.meta.resolve("./preloadingGrid.css")} */`;

// gen/front_end/panels/application/preloading/components/PreloadingGrid.js
var { PreloadingStatus } = SDK4.PreloadingModel;
var UIStrings5 = {
  /**
   * @description Column header: Action of preloading (prefetch/prerender)
   */
  action: "Action",
  /**
   * @description Column header: A rule set of preloading
   */
  ruleSet: "Rule set",
  /**
   * @description Column header: Status of preloading attempt
   */
  status: "Status",
  /**
   * @description Status: Prerender failed, but prefetch is available
   */
  prefetchFallbackReady: "Prefetch fallback ready"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/application/preloading/components/PreloadingGrid.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var { render: render4, html: html4, nothing: nothing3, Directives: { styleMap: styleMap2 } } = Lit3;
function urlShort(row, securityOrigin) {
  const url2 = row.pipeline.getOriginallyTriggered().key.url;
  return securityOrigin && url2.startsWith(securityOrigin) ? url2.slice(securityOrigin.length) : url2;
}
var PRELOADING_GRID_DEFAULT_VIEW = (input, _output, target) => {
  if (!input.rows || input.pageURL === void 0) {
    render4(nothing3, target);
    return;
  }
  const { rows, pageURL } = input;
  const securityOrigin = pageURL === "" ? null : new Common2.ParsedURL.ParsedURL(pageURL).securityOrigin();
  render4(html4`
    <style>${preloadingGrid_css_default}</style>
    <div class="preloading-container">
      <devtools-data-grid striped>
        <table>
          <tr>
            <th id="url" weight="40" sortable>${i18n9.i18n.lockedString("URL")}</th>
            <th id="action" weight="15" sortable>${i18nString5(UIStrings5.action)}</th>
            <th id="rule-set" weight="20" sortable>${i18nString5(UIStrings5.ruleSet)}</th>
            <th id="status" weight="40" sortable>${i18nString5(UIStrings5.status)}</th>
          </tr>
          ${rows.map((row) => {
    const attempt = row.pipeline.getOriginallyTriggered();
    const prefetchStatus = row.pipeline.getPrefetch()?.status;
    const prerenderStatus = row.pipeline.getPrerender()?.status;
    const hasWarning = prerenderStatus === "Failure" && (prefetchStatus === "Ready" || prefetchStatus === "Success");
    const hasError = row.pipeline.getOriginallyTriggered().status === "Failure";
    return html4`<tr @select=${() => input.onSelect?.({ rowId: row.id })}>
              <td title=${attempt.key.url}>${urlShort(row, securityOrigin)}</td>
              <td>${capitalizedAction(attempt.action)}</td>
              <td>${row.ruleSets.length === 0 ? "" : ruleSetTagOrLocationShort(row.ruleSets[0], pageURL)}</td>
              <td data-value=${sortOrder(attempt)}>
                <div style=${styleMap2({ color: hasWarning ? "var(--sys-color-orange-bright)" : hasError ? "var(--sys-color-error)" : "var(--sys-color-on-surface)" })}>
                  ${hasError || hasWarning ? html4`
                    <devtools-icon
                      name=${hasWarning ? "warning-filled" : "cross-circle-filled"}
                      class='medium'
                      style=${styleMap2({
      "vertical-align": "sub"
    })}
                    ></devtools-icon>` : ""}
                  ${hasWarning ? i18nString5(UIStrings5.prefetchFallbackReady) : composedStatus(attempt)}
                </div>
              </td>
            </tr>`;
  })}
        </table>
      </devtools-data-grid>
    </div>
  `, target);
};
var PreloadingGrid = class extends UI4.Widget.VBox {
  #view;
  #rows;
  #pageURL;
  #onSelect;
  constructor(view) {
    super();
    this.#view = view ?? PRELOADING_GRID_DEFAULT_VIEW;
    this.requestUpdate();
  }
  set rows(rows) {
    this.#rows = rows;
    this.requestUpdate();
  }
  set pageURL(pageURL) {
    this.#pageURL = pageURL;
    this.requestUpdate();
  }
  set onSelect(onSelect) {
    this.#onSelect = onSelect;
    this.requestUpdate();
  }
  performUpdate() {
    const viewInput = {
      rows: this.#rows,
      pageURL: this.#pageURL,
      onSelect: this.#onSelect?.bind(this)
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
};

// gen/front_end/panels/application/preloading/components/RuleSetDetailsView.js
var RuleSetDetailsView_exports = {};
__export(RuleSetDetailsView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW4,
  RuleSetDetailsView: () => RuleSetDetailsView
});
import * as i18n11 from "./../../../../core/i18n/i18n.js";
import * as SDK5 from "./../../../../core/sdk/sdk.js";
import * as Formatter from "./../../../../models/formatter/formatter.js";
import * as CodeMirror from "./../../../../third_party/codemirror.next/codemirror.next.js";
import * as CodeHighlighter from "./../../../../ui/components/code_highlighter/code_highlighter.js";
import * as TextEditor from "./../../../../ui/components/text_editor/text_editor.js";
import * as UI5 from "./../../../../ui/legacy/legacy.js";
import { html as html5, nothing as nothing4, render as render5 } from "./../../../../ui/lit/lit.js";

// gen/front_end/panels/application/preloading/components/RuleSetDetailsView.css.js
var RuleSetDetailsView_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  display: block;
  height: 100%;
}

.placeholder {
  display: flex;
  height: 100%;
}

.ruleset-header {
  padding: 4px 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid var(--sys-color-divider);
}

.ruleset-header devtools-icon {
  vertical-align: sub;
}

/*# sourceURL=${import.meta.resolve("./RuleSetDetailsView.css")} */`;

// gen/front_end/panels/application/preloading/components/RuleSetDetailsView.js
var UIStrings6 = {
  /**
   * @description Text in RuleSetDetailsView of the Application panel if no element is selected. An element here is an item in a
   *             table of speculation rules. Speculation rules define the rules when and which urls should be prefetched.
   *             https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules
   */
  noElementSelected: "No element selected",
  /**
   * @description Text in RuleSetDetailsView of the Application panel if no element is selected. An element here is an item in a
   *             table of speculation rules. Speculation rules define the rules when and which urls should be prefetched.
   *             https://developer.chrome.com/docs/devtools/application/debugging-speculation-rules
   */
  selectAnElementForMoreDetails: "Select an element for more details"
};
var str_6 = i18n11.i18n.registerUIStrings("panels/application/preloading/components/RuleSetDetailsView.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var codeMirrorJsonType = await CodeHighlighter.CodeHighlighter.languageFromMIME("application/json");
var DEFAULT_VIEW4 = (input, _output, target) => {
  render5(html5`
    <style>${RuleSetDetailsView_css_default}</style>
    <style>${UI5.inspectorCommonStyles}</style>
    ${input ? html5`
        <div class="content">
          <div class="ruleset-header" id="ruleset-url">${input.url}</div>
          ${input.errorMessage ? html5`
            <div class="ruleset-header">
              <devtools-icon name="cross-circle" class="medium">
              </devtools-icon>
              <span id="error-message-text">${input.errorMessage}</span>
            </div>
          ` : nothing4}
        </div>
        <div class="text-ellipsis">
          <devtools-text-editor .style.flexGrow=${"1"} .state=${input.editorState}></devtools-text-editor>
        </div>` : html5`
          <div class="placeholder">
            <div class="empty-state">
              <span class="empty-state-header">${i18nString6(UIStrings6.noElementSelected)}</span>
              <span class="empty-state-description">${i18nString6(UIStrings6.selectAnElementForMoreDetails)}</span>
            </div>
          </div>`}
    `, target);
};
var RuleSetDetailsView = class extends UI5.Widget.VBox {
  #view;
  #ruleSet = null;
  #shouldPrettyPrint = true;
  constructor(element, view = DEFAULT_VIEW4) {
    super(element, { useShadowDom: true });
    this.#view = view;
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
  }
  set ruleSet(ruleSet) {
    this.#ruleSet = ruleSet;
    this.requestUpdate();
  }
  set shouldPrettyPrint(shouldPrettyPrint) {
    this.#shouldPrettyPrint = shouldPrettyPrint;
    this.requestUpdate();
  }
  async performUpdate() {
    if (!this.#ruleSet) {
      this.#view(null, {}, this.contentElement);
      return;
    }
    const sourceText = await this.#getSourceText();
    const editorState = CodeMirror.EditorState.create({
      doc: sourceText,
      extensions: [
        TextEditor.Config.baseConfiguration(sourceText),
        CodeMirror.lineNumbers(),
        CodeMirror.EditorState.readOnly.of(true),
        codeMirrorJsonType,
        CodeMirror.syntaxHighlighting(CodeHighlighter.CodeHighlighter.highlightStyle)
      ]
    });
    this.#view({
      url: this.#ruleSet.url || SDK5.TargetManager.TargetManager.instance().inspectedURL(),
      errorMessage: this.#ruleSet.errorMessage,
      editorState,
      sourceText
    }, {}, this.contentElement);
  }
  async #getSourceText() {
    if (this.#shouldPrettyPrint && this.#ruleSet?.sourceText !== void 0) {
      const formattedResult = await Formatter.ScriptFormatter.formatScriptContent("application/json", this.#ruleSet.sourceText);
      return formattedResult.formattedContent;
    }
    return this.#ruleSet?.sourceText || "";
  }
};

// gen/front_end/panels/application/preloading/components/RuleSetGrid.js
var RuleSetGrid_exports = {};
__export(RuleSetGrid_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW5,
  RuleSetGrid: () => RuleSetGrid,
  i18nString: () => i18nString7
});
import "./../../../../ui/legacy/components/data_grid/data_grid.js";
import "./../../../../ui/kit/kit.js";
import * as Common3 from "./../../../../core/common/common.js";
import * as i18n13 from "./../../../../core/i18n/i18n.js";
import { assertNotNullOrUndefined as assertNotNullOrUndefined3 } from "./../../../../core/platform/platform.js";
import * as SDK6 from "./../../../../core/sdk/sdk.js";
import * as UI6 from "./../../../../ui/legacy/legacy.js";
import { Directives as Directives2, html as html6, nothing as nothing5, render as render6 } from "./../../../../ui/lit/lit.js";
import * as VisualLogging3 from "./../../../../ui/visual_logging/visual_logging.js";
import * as NetworkForward from "./../../../network/forward/forward.js";
import * as PreloadingHelper2 from "./../helper/helper.js";

// gen/front_end/panels/application/preloading/components/ruleSetGrid.css.js
var ruleSetGrid_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  overflow: auto;
  height: 100%;
}

.ruleset-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

devtools-data-grid {
  flex: auto;
}

.inline-icon {
  vertical-align: text-bottom;
}

/*# sourceURL=${import.meta.resolve("./ruleSetGrid.css")} */`;

// gen/front_end/panels/application/preloading/components/RuleSetGrid.js
var { styleMap: styleMap3 } = Directives2;
var UIStrings7 = {
  /**
   * @description Column header: Short URL of rule set.
   */
  ruleSet: "Rule set",
  /**
   * @description Column header: Show how many preloads are associated if valid, error counts if invalid.
   */
  status: "Status",
  /**
   * @description button: Title of button to reveal the corresponding request of rule set in Elements panel
   */
  clickToOpenInElementsPanel: "Click to open in Elements panel",
  /**
   * @description button: Title of button to reveal the corresponding request of rule set in Network panel
   */
  clickToOpenInNetworkPanel: "Click to open in Network panel",
  /**
   * @description Value of status, specifying rule set contains how many errors.
   */
  errors: "{errorCount, plural, =1 {# error} other {# errors}}",
  /**
   * @description button: Title of button to reveal preloading attempts with filter by selected rule set
   */
  buttonRevealPreloadsAssociatedWithRuleSet: "Reveal speculative loads associated with this rule set"
};
var str_7 = i18n13.i18n.registerUIStrings("panels/application/preloading/components/RuleSetGrid.ts", UIStrings7);
var i18nString7 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
var DEFAULT_VIEW5 = (input, _output, target) => {
  let template = nothing5;
  if (input.data !== null) {
    const { rows, pageURL } = input.data;
    template = html6`
          <style>${ruleSetGrid_css_default}</style>
          <div class="ruleset-container" jslog=${VisualLogging3.pane("preloading-rules")}>
            <devtools-data-grid striped>
              <table>
                <tr>
                  <th id="rule-set" weight="20" sortable>
                    ${i18nString7(UIStrings7.ruleSet)}
                  </th>
                  <th id="status" weight="80" sortable>
                    ${i18nString7(UIStrings7.status)}
                  </th>
                </tr>
                ${rows.map(({ ruleSet, preloadsStatusSummary }) => {
      const location = ruleSetTagOrLocationShort(ruleSet, pageURL);
      const revealInElements = ruleSet.backendNodeId !== void 0;
      const revealInNetwork = ruleSet.url !== void 0 && ruleSet.requestId;
      return html6`
                    <tr @select=${() => input.onSelect(ruleSet.id)}>
                      <td>
                        ${revealInElements || revealInNetwork ? html6`
                          <button class="link" role="link"
                              @click=${() => {
        if (revealInElements) {
          input.onRevealInElements(ruleSet);
        } else {
          input.onRevealInNetwork(ruleSet);
        }
      }}
                              title=${revealInElements ? i18nString7(UIStrings7.clickToOpenInElementsPanel) : i18nString7(UIStrings7.clickToOpenInNetworkPanel)}
                              style=${styleMap3({
        border: "none",
        background: "none",
        color: "var(--icon-link)",
        cursor: "pointer",
        "text-decoration": "underline",
        "padding-inline-start": "0",
        "padding-inline-end": "0"
      })}
                              jslog=${VisualLogging3.action(revealInElements ? "reveal-in-elements" : "reveal-in-network").track({ click: true })}
                            >
                              <devtools-icon name=${revealInElements ? "code-circle" : "arrow-up-down-circle"} class="medium"
                                style=${styleMap3({
        color: "var(--icon-link)",
        "vertical-align": "sub"
      })}
                              ></devtools-icon>
                              ${location}
                            </button>` : location}
                    </td>
                    <td>
                      ${ruleSet.errorType !== void 0 ? html6`
                        <span style=${styleMap3({ color: "var(--sys-color-error)" })}>
                          ${i18nString7(UIStrings7.errors, { errorCount: 1 })}
                        </span>` : ""} ${ruleSet.errorType !== "SourceIsNotJsonObject" && ruleSet.errorType !== "InvalidRulesetLevelTag" ? html6`
                        <button class="link" role="link"
                          @click=${() => input.onRevealPreloadsAssociatedWithRuleSet(ruleSet)}
                          title=${i18nString7(UIStrings7.buttonRevealPreloadsAssociatedWithRuleSet)}
                          style=${styleMap3({
        color: "var(--sys-color-primary)",
        "text-decoration": "underline",
        cursor: "pointer",
        border: "none",
        background: "none",
        "padding-inline-start": "0",
        "padding-inline-end": "0"
      })}
                          jslog=${VisualLogging3.action("reveal-preloads").track({ click: true })}>
                          ${preloadsStatusSummary}
                        </button>` : ""}
                    </td>
                  </tr>
                `;
    })}
              </table>
            </devtools-data-grid>
          </div>`;
  }
  render6(template, target);
};
var RuleSetGrid = class extends Common3.ObjectWrapper.eventMixin(UI6.Widget.VBox) {
  #view;
  #data = null;
  constructor(view = DEFAULT_VIEW5) {
    super({ useShadowDom: true });
    this.#view = view;
  }
  get data() {
    return this.#data;
  }
  set data(data) {
    this.#data = data;
    this.requestUpdate();
  }
  performUpdate() {
    const input = {
      data: this.#data,
      onSelect: this.dispatchEventToListeners.bind(
        this,
        "select"
        /* Events.SELECT */
      ),
      onRevealInElements: this.#revealSpeculationRulesInElements.bind(this),
      onRevealInNetwork: this.#revealSpeculationRulesInNetwork.bind(this),
      onRevealPreloadsAssociatedWithRuleSet: this.#revealAttemptViewWithFilter.bind(this)
    };
    const output = void 0;
    this.#view(input, output, this.contentElement);
  }
  #revealSpeculationRulesInElements(ruleSet) {
    assertNotNullOrUndefined3(ruleSet.backendNodeId);
    const target = SDK6.TargetManager.TargetManager.instance().scopeTarget();
    if (target === null) {
      return;
    }
    void Common3.Revealer.reveal(new SDK6.DOMModel.DeferredDOMNode(target, ruleSet.backendNodeId));
  }
  #revealSpeculationRulesInNetwork(ruleSet) {
    assertNotNullOrUndefined3(ruleSet.requestId);
    const request = SDK6.TargetManager.TargetManager.instance().scopeTarget()?.model(SDK6.NetworkManager.NetworkManager)?.requestForId(ruleSet.requestId) || null;
    if (request === null) {
      return;
    }
    const requestLocation = NetworkForward.UIRequestLocation.UIRequestLocation.tab(request, "preview", { clearFilter: false });
    void Common3.Revealer.reveal(requestLocation);
  }
  #revealAttemptViewWithFilter(ruleSet) {
    void Common3.Revealer.reveal(new PreloadingHelper2.PreloadingForward.AttemptViewWithFilter(ruleSet.id));
  }
};

// gen/front_end/panels/application/preloading/components/UsedPreloadingView.js
var UsedPreloadingView_exports = {};
__export(UsedPreloadingView_exports, {
  UsedPreloadingView: () => UsedPreloadingView
});
import "./../../../../ui/kit/kit.js";
import "./../../../../ui/components/report_view/report_view.js";
import * as Common4 from "./../../../../core/common/common.js";
import * as i18n15 from "./../../../../core/i18n/i18n.js";
import { assertNotNullOrUndefined as assertNotNullOrUndefined4 } from "./../../../../core/platform/platform.js";
import * as SDK7 from "./../../../../core/sdk/sdk.js";
import * as LegacyWrapper from "./../../../../ui/components/legacy_wrapper/legacy_wrapper.js";
import * as RenderCoordinator from "./../../../../ui/components/render_coordinator/render_coordinator.js";
import * as UI7 from "./../../../../ui/legacy/legacy.js";
import * as Lit4 from "./../../../../ui/lit/lit.js";
import * as VisualLogging4 from "./../../../../ui/visual_logging/visual_logging.js";
import * as PreloadingHelper3 from "./../helper/helper.js";

// gen/front_end/panels/application/preloading/components/usedPreloadingView.css.js
var usedPreloadingView_css_default = `/*
 * Copyright 2023 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  overflow: auto;
  height: 100%;
}

button {
  font-size: inherit;
}

devtools-report {
  padding: 1em 0;
}

devtools-report-section-header {
  padding-bottom: 0;
  margin-bottom: -1.5em;
}

devtools-report-section {
  min-width: fit-content;
}

devtools-report-divider {
  margin: 1em 0;
}

.reveal-links {
  white-space: nowrap;
}

.link {
  border: none;
  background: none;
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
  padding: 0;
}

.status-badge-container {
  white-space: nowrap;
  margin: 8px 0 24px;
}

.status-badge-container span {
  margin-right: 2px;
}

.status-badge {
  border-radius: 4px;
  padding: 4px;

  devtools-icon {
    width: 16px;
    height: 16px;
  }
}

.status-badge-success {
  background: var(--sys-color-surface-green);
}

.status-badge-failure {
  background: var(--sys-color-error-container);
}

.status-badge-neutral {
  background: var(--sys-color-neutral-container);
}

/*# sourceURL=${import.meta.resolve("./usedPreloadingView.css")} */`;

// gen/front_end/panels/application/preloading/components/UsedPreloadingView.js
var { html: html7 } = Lit4;
var UIStrings8 = {
  /**
   * @description Header for preloading status.
   */
  speculativeLoadingStatusForThisPage: "Speculative loading status for this page",
  /**
   * @description Label for failure reason of preloading
   */
  detailsFailureReason: "Failure reason",
  /**
   * @description Message that tells this page was prerendered.
   */
  downgradedPrefetchUsed: "The initiating page attempted to prerender this page's URL. The prerender failed, but the resulting response body was still used as a prefetch.",
  /**
   * @description Message that tells this page was prefetched.
   */
  prefetchUsed: "This page was successfully prefetched.",
  /**
   * @description Message that tells this page was prerendered.
   */
  prerenderUsed: "This page was successfully prerendered.",
  /**
   * @description Message that tells this page was prefetched.
   */
  prefetchFailed: "The initiating page attempted to prefetch this page's URL, but the prefetch failed, so a full navigation was performed instead.",
  /**
   * @description Message that tells this page was prerendered.
   */
  prerenderFailed: "The initiating page attempted to prerender this page's URL, but the prerender failed, so a full navigation was performed instead.",
  /**
   * @description Message that tells this page was not preloaded.
   */
  noPreloads: "The initiating page did not attempt to speculatively load this page's URL.",
  /**
   * @description Header for current URL.
   */
  currentURL: "Current URL",
  /**
   * @description Header for mismatched preloads.
   */
  preloadedURLs: "URLs being speculatively loaded by the initiating page",
  /**
   * @description Header for summary.
   */
  speculationsInitiatedByThisPage: "Speculations initiated by this page",
  /**
   * @description Link text to reveal rules.
   */
  viewAllRules: "View all speculation rules",
  /**
   * @description Link text to reveal preloads.
   */
  viewAllSpeculations: "View all speculations",
  /**
   * @description Link to learn more about Preloading
   */
  learnMore: "Learn more: Speculative loading on developer.chrome.com",
  /**
   * @description Header for the table of mismatched network request header.
   */
  mismatchedHeadersDetail: "Mismatched HTTP request headers",
  /**
   * @description Label for badge, indicating speculative load successfully used for this page.
   */
  badgeSuccess: "Success",
  /**
   * @description Label for badge, indicating speculative load failed for this page.
   */
  badgeFailure: "Failure",
  /**
   * @description Label for badge, indicating no speculative loads used for this page.
   */
  badgeNoSpeculativeLoads: "No speculative loads",
  /**
   * @description Label for badge, indicating how many not triggered speculations there are.
   */
  badgeNotTriggeredWithCount: "{n, plural, =1 {# not triggered} other {# not triggered}}",
  /**
   * @description Label for badge, indicating how many in progress speculations there are.
   */
  badgeInProgressWithCount: "{n, plural, =1 {# in progress} other {# in progress}}",
  /**
   * @description Label for badge, indicating how many succeeded speculations there are.
   */
  badgeSuccessWithCount: "{n, plural, =1 {# success} other {# success}}",
  /**
   * @description Label for badge, indicating how many failed speculations there are.
   */
  badgeFailureWithCount: "{n, plural, =1 {# failure} other {# failures}}",
  /**
   * @description The name of the HTTP request header.
   */
  headerName: "Header name",
  /**
   * @description The value of the HTTP request header in initial navigation.
   */
  initialNavigationValue: "Value in initial navigation",
  /**
   * @description The value of the HTTP request header in activation navigation.
   */
  activationNavigationValue: "Value in activation navigation",
  /**
   * @description The string to indicate the value of the header is missing.
   */
  missing: "(missing)"
};
var str_8 = i18n15.i18n.registerUIStrings("panels/application/preloading/components/UsedPreloadingView.ts", UIStrings8);
var i18nString8 = i18n15.i18n.getLocalizedString.bind(void 0, str_8);
var UsedPreloadingView = class extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  #shadow = this.attachShadow({ mode: "open" });
  #data = {
    pageURL: "",
    previousAttempts: [],
    currentAttempts: []
  };
  set data(data) {
    this.#data = data;
    void this.#render();
  }
  async #render() {
    await RenderCoordinator.write("UsedPreloadingView render", () => {
      Lit4.render(this.#renderTemplate(), this.#shadow, { host: this });
    });
  }
  #renderTemplate() {
    return html7`
      <style>${usedPreloadingView_css_default}</style>
      <devtools-report>
        ${this.#speculativeLoadingStatusForThisPageSections()}

        <devtools-report-divider></devtools-report-divider>

        ${this.#speculationsInitiatedByThisPageSummarySections()}

        <devtools-report-divider></devtools-report-divider>

        <devtools-report-section>
          <x-link
            class="link devtools-link"
            href=${"https://developer.chrome.com/blog/prerender-pages/"}
            jslog=${VisualLogging4.link().track({ click: true, keydown: "Enter|Space" }).context("learn-more")}
          >${i18nString8(UIStrings8.learnMore)}</x-link>
        </devtools-report-section>
      </devtools-report>
    `;
  }
  #isPrerenderLike(speculationAction) {
    return [
      "Prerender",
      "PrerenderUntilScript"
      /* Protocol.Preload.SpeculationAction.PrerenderUntilScript */
    ].includes(speculationAction);
  }
  #isPrerenderAttempt(attempt) {
    return this.#isPrerenderLike(attempt.action);
  }
  #speculativeLoadingStatusForThisPageSections() {
    const pageURL = Common4.ParsedURL.ParsedURL.urlWithoutHash(this.#data.pageURL);
    const forThisPage = this.#data.previousAttempts.filter((attempt) => Common4.ParsedURL.ParsedURL.urlWithoutHash(attempt.key.url) === pageURL);
    const prefetch = forThisPage.filter(
      (attempt) => attempt.key.action === "Prefetch"
      /* Protocol.Preload.SpeculationAction.Prefetch */
    )[0];
    const prerenderLike = forThisPage.filter((attempt) => this.#isPrerenderLike(attempt.action))[0];
    let kind = "NoPreloads";
    if (prerenderLike?.status === "Failure" && prefetch?.status === "Success") {
      kind = "DowngradedPrerenderToPrefetchAndUsed";
    } else if (prefetch?.status === "Success") {
      kind = "PrefetchUsed";
    } else if (prerenderLike?.status === "Success") {
      kind = "PrerenderUsed";
    } else if (prefetch?.status === "Failure") {
      kind = "PrefetchFailed";
    } else if (prerenderLike?.status === "Failure") {
      kind = "PrerenderFailed";
    } else {
      kind = "NoPreloads";
    }
    let badge;
    let basicMessage;
    switch (kind) {
      case "DowngradedPrerenderToPrefetchAndUsed":
        badge = this.#badgeSuccess();
        basicMessage = html7`${i18nString8(UIStrings8.downgradedPrefetchUsed)}`;
        break;
      case "PrefetchUsed":
        badge = this.#badgeSuccess();
        basicMessage = html7`${i18nString8(UIStrings8.prefetchUsed)}`;
        break;
      case "PrerenderUsed":
        badge = this.#badgeSuccess();
        basicMessage = html7`${i18nString8(UIStrings8.prerenderUsed)}`;
        break;
      case "PrefetchFailed":
        badge = this.#badgeFailure();
        basicMessage = html7`${i18nString8(UIStrings8.prefetchFailed)}`;
        break;
      case "PrerenderFailed":
        badge = this.#badgeFailure();
        basicMessage = html7`${i18nString8(UIStrings8.prerenderFailed)}`;
        break;
      case "NoPreloads":
        badge = this.#badgeNeutral(i18nString8(UIStrings8.badgeNoSpeculativeLoads));
        basicMessage = html7`${i18nString8(UIStrings8.noPreloads)}`;
        break;
    }
    let maybeFailureReasonMessage;
    if (kind === "PrefetchFailed") {
      assertNotNullOrUndefined4(prefetch);
      maybeFailureReasonMessage = prefetchFailureReason(prefetch);
    } else if (kind === "PrerenderFailed" || kind === "DowngradedPrerenderToPrefetchAndUsed") {
      assertNotNullOrUndefined4(prerenderLike);
      maybeFailureReasonMessage = prerenderFailureReason(prerenderLike);
    }
    let maybeFailureReason = Lit4.nothing;
    if (maybeFailureReasonMessage !== void 0) {
      maybeFailureReason = html7`
      <devtools-report-section-header>${i18nString8(UIStrings8.detailsFailureReason)}</devtools-report-section-header>
      <devtools-report-section>
        ${maybeFailureReasonMessage}
      </devtools-report-section>
      `;
    }
    return html7`
      <devtools-report-section-header>${i18nString8(UIStrings8.speculativeLoadingStatusForThisPage)}</devtools-report-section-header>
      <devtools-report-section>
        <div>
          <div class="status-badge-container">
            ${badge}
          </div>
          <div>
            ${basicMessage}
          </div>
        </div>
      </devtools-report-section>

      ${maybeFailureReason}

      ${this.#maybeMismatchedSections(kind)}
      ${this.#maybeMismatchedHTTPHeadersSections()}
    `;
  }
  #maybeMismatchedSections(kind) {
    if (kind !== "NoPreloads" || this.#data.previousAttempts.length === 0) {
      return Lit4.nothing;
    }
    const rows = this.#data.previousAttempts.map((attempt) => {
      return {
        url: attempt.key.url,
        action: attempt.key.action,
        status: attempt.status
      };
    });
    const data = {
      pageURL: this.#data.pageURL,
      rows
    };
    return html7`
      <devtools-report-section-header>${i18nString8(UIStrings8.currentURL)}</devtools-report-section-header>
      <devtools-report-section>
        <x-link
          class="link devtools-link"
          href=${this.#data.pageURL}
          jslog=${VisualLogging4.link().track({ click: true, keydown: "Enter|Space" }).context("current-url")}
        >${this.#data.pageURL}</x-link>
      </devtools-report-section>

      <devtools-report-section-header>${i18nString8(UIStrings8.preloadedURLs)}</devtools-report-section-header>
      <devtools-report-section
      jslog=${VisualLogging4.section("preloaded-urls")}>
        <devtools-widget
          .widgetConfig=${UI7.Widget.widgetConfig(MismatchedPreloadingGrid, { data })}
        ></devtools-widget>
      </devtools-report-section>
    `;
  }
  #maybeMismatchedHTTPHeadersSections() {
    const attempt = this.#data.previousAttempts.find((attempt2) => this.#isPrerenderAttempt(attempt2) && attempt2.mismatchedHeaders !== null);
    if (!attempt?.mismatchedHeaders) {
      return Lit4.nothing;
    }
    if (attempt.key.url !== this.#data.pageURL) {
      throw new Error("unreachable");
    }
    return html7`
      <devtools-report-section-header>${i18nString8(UIStrings8.mismatchedHeadersDetail)}</devtools-report-section-header>
      <devtools-report-section>
        <style>${preloadingGrid_css_default}</style>
        <div class="preloading-container">
          <devtools-data-grid striped inline>
            <table>
              <tr>
                <th id="header-name" weight="30" sortable>
                  ${i18nString8(UIStrings8.headerName)}
                </th>
                <th id="initial-value" weight="30" sortable>
                  ${i18nString8(UIStrings8.initialNavigationValue)}
                </th>
                <th id="activation-value" weight="30" sortable>
                  ${i18nString8(UIStrings8.activationNavigationValue)}
                </th>
              </tr>
              ${attempt.mismatchedHeaders.map((mismatchedHeaders) => html7`
                <tr>
                  <td>${mismatchedHeaders.headerName}</td>
                  <td>${mismatchedHeaders.initialValue ?? i18nString8(UIStrings8.missing)}</td>
                  <td>${mismatchedHeaders.activationValue ?? i18nString8(UIStrings8.missing)}</td>
                </tr>
              `)}
            </table>
          </devtools-data-grid>
        </div>
      </devtools-report-section>
    `;
  }
  #speculationsInitiatedByThisPageSummarySections() {
    const count = this.#data.currentAttempts.reduce((acc, attempt) => {
      acc.set(attempt.status, (acc.get(attempt.status) ?? 0) + 1);
      return acc;
    }, /* @__PURE__ */ new Map());
    const notTriggeredCount = count.get(
      "NotTriggered"
      /* SDK.PreloadingModel.PreloadingStatus.NOT_TRIGGERED */
    ) ?? 0;
    const readyCount = count.get(
      "Ready"
      /* SDK.PreloadingModel.PreloadingStatus.READY */
    ) ?? 0;
    const failureCount = count.get(
      "Failure"
      /* SDK.PreloadingModel.PreloadingStatus.FAILURE */
    ) ?? 0;
    const inProgressCount = (count.get(
      "Pending"
      /* SDK.PreloadingModel.PreloadingStatus.PENDING */
    ) ?? 0) + (count.get(
      "Running"
      /* SDK.PreloadingModel.PreloadingStatus.RUNNING */
    ) ?? 0);
    const badges = [];
    if (this.#data.currentAttempts.length === 0) {
      badges.push(this.#badgeNeutral(i18nString8(UIStrings8.badgeNoSpeculativeLoads)));
    }
    if (notTriggeredCount > 0) {
      badges.push(this.#badgeNeutral(i18nString8(UIStrings8.badgeNotTriggeredWithCount, { n: notTriggeredCount })));
    }
    if (inProgressCount > 0) {
      badges.push(this.#badgeNeutral(i18nString8(UIStrings8.badgeInProgressWithCount, { n: inProgressCount })));
    }
    if (readyCount > 0) {
      badges.push(this.#badgeSuccess(readyCount));
    }
    if (failureCount > 0) {
      badges.push(this.#badgeFailure(failureCount));
    }
    const revealRuleSetView = () => {
      void Common4.Revealer.reveal(new PreloadingHelper3.PreloadingForward.RuleSetView(null));
    };
    const revealAttemptViewWithFilter = () => {
      void Common4.Revealer.reveal(new PreloadingHelper3.PreloadingForward.AttemptViewWithFilter(null));
    };
    return html7`
      <devtools-report-section-header>${i18nString8(UIStrings8.speculationsInitiatedByThisPage)}</devtools-report-section-header>
      <devtools-report-section>
        <div>
          <div class="status-badge-container">
            ${badges}
          </div>

          <div class="reveal-links">
            <button class="link devtools-link" @click=${revealRuleSetView}
            jslog=${VisualLogging4.action("view-all-rules").track({ click: true })}>
              ${i18nString8(UIStrings8.viewAllRules)}
            </button>
           ・
            <button class="link devtools-link" @click=${revealAttemptViewWithFilter}
            jslog=${VisualLogging4.action("view-all-speculations").track({ click: true })}>
             ${i18nString8(UIStrings8.viewAllSpeculations)}
            </button>
          </div>
        </div>
      </devtools-report-section>
    `;
  }
  #badgeSuccess(count) {
    let message;
    if (count === void 0) {
      message = i18nString8(UIStrings8.badgeSuccess);
    } else {
      message = i18nString8(UIStrings8.badgeSuccessWithCount, { n: count });
    }
    return this.#badge("status-badge status-badge-success", "check-circle", message);
  }
  #badgeFailure(count) {
    let message;
    if (count === void 0) {
      message = i18nString8(UIStrings8.badgeFailure);
    } else {
      message = i18nString8(UIStrings8.badgeFailureWithCount, { n: count });
    }
    return this.#badge("status-badge status-badge-failure", "cross-circle", message);
  }
  #badgeNeutral(message) {
    return this.#badge("status-badge status-badge-neutral", "clear", message);
  }
  #badge(klass, iconName, message) {
    return html7`
      <span class=${klass}>
        <devtools-icon name=${iconName}></devtools-icon>
        <span>
          ${message}
        </span>
      </span>
    `;
  }
};
customElements.define("devtools-resources-used-preloading-view", UsedPreloadingView);
export {
  MismatchedPreloadingGrid_exports as MismatchedPreloadingGrid,
  PreloadingDetailsReportView_exports as PreloadingDetailsReportView,
  PreloadingDisabledInfobar_exports as PreloadingDisabledInfobar,
  PreloadingGrid_exports as PreloadingGrid,
  RuleSetDetailsView_exports as RuleSetDetailsView,
  RuleSetGrid_exports as RuleSetGrid,
  UsedPreloadingView_exports as UsedPreloadingView
};
//# sourceMappingURL=components.js.map

// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';

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
  PrefetchNotEligiblePreloadingDisabled: 'The prefetch was not performed because preloading was disabled.',
};

const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/components/PreloadingString.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

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

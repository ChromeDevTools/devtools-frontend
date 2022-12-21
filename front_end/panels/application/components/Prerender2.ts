// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';

const UIStrings = {
  /**
   *@description  Description text for Prerender2 status Activated.
   */
  Activated: 'Activated.',
  /**
   *@description  Description text for Prerender2 cancellation status Destroyed.
   */
  Destroyed: 'A prerendered page was abandoned for unknown reasons.',
  /**
   *@description  Description text for Prerender2 cancellation status LowEndDevice.
   */
  LowEndDevice: 'Prerendering is not supported for low-memory devices.',
  /**
   *@description  Description text for Prerender2 cancellation status InvalidSchemeRedirect.
   */
  InvalidSchemeRedirect:
      'Attempted to prerender a URL that redirected to a non-HTTP(S) URL. Only HTTP(S) pages can be prerendered.',
  /**
   *@description  Description text for Prerender2 cancellation status InvalidSchemeNavigation.
   */
  InvalidSchemeNavigation: 'Only HTTP(S) navigation allowed for Prerender.',
  /**
   *@description  Description text for Prerender2 cancellation status InProgressNavigation.
   */
  InProgressNavigation: 'InProgressNavigation.',
  /**
   *@description  Description text for Prerender2 cancellation status NavigationRequestBlockedByCsp.
   */
  NavigationRequestBlockedByCsp: 'Navigation request is blocked by CSP.',
  /**
   *@description  Description text for Prerender2 cancellation status MainFrameNavigation.
   */
  MainFrameNavigation: 'Navigations after the initial prerendering navigation are disallowed',
  /**
   *@description  Description text for Prerender2 cancellation status MojoBinderPolicy.
   */
  MojoBinderPolicy: 'A disallowed API was used by the prerendered page',
  /**
   *@description  Description text for Prerender2 cancellation status RendererProcessCrashed.
   */
  RendererProcessCrashed: 'The prerendered page crashed.',
  /**
   *@description  Description text for Prerender2 cancellation status RendererProcessKilled.
   */
  RendererProcessKilled: 'The renderer process for the prerendering page was killed.',
  /**
   *@description  Description text for Prerender2 cancellation status Download.
   */
  Download: 'Download is disallowed in Prerender.',
  /**
   *@description  Description text for Prerender2 cancellation status TriggerDestroyed.
   */
  TriggerDestroyed: 'Prerender is not activated and destroyed with the trigger.',
  /**
   *@description  Description text for Prerender2 cancellation status NavigationNotCommitted.
   */
  NavigationNotCommitted: 'The prerendering page is not committed in the end.',
  /**
   *@description  Description text for Prerender2 cancellation status NavigationBadHttpStatus.
   */
  NavigationBadHttpStatus:
      'The initial prerendering navigation was not successful due to the server returning a non-200/204/205 status code.',
  /**
   *@description  Description text for Prerender2 cancellation status ClientCertRequested.
   */
  ClientCertRequested: 'The page is requesting client cert, which is not suitable for a hidden page like prerendering.',
  /**
   *@description  Description text for Prerender2 cancellation status NavigationRequestNetworkError.
   */
  NavigationRequestNetworkError: 'Encountered a network error during prerendering.',
  /**
   *@description  Description text for Prerender2 cancellation status MaxNumOfRunningPrerendersExceeded.
   */
  MaxNumOfRunningPrerendersExceeded: 'Max number of prerendering exceeded.',
  /**
   *@description  Description text for Prerender2 cancellation status CancelAllHostsForTesting.
   */
  CancelAllHostsForTesting: 'CancelAllHostsForTesting.',
  /**
   *@description  Description text for Prerender2 cancellation status DidFailLoad.
   */
  DidFailLoad: 'DidFailLoadWithError happened during prerendering.',
  /**
   *@description  Description text for Prerender2 cancellation status Stop.
   */
  Stop: 'The tab is stopped.',
  /**
   *@description  Description text for Prerender2 cancellation status SslCertificateError.
   */
  SslCertificateError: 'SSL certificate error.',
  /**
   *@description  Description text for Prerender2 cancellation status LoginAuthRequested.
   */
  LoginAuthRequested: 'Prerender does not support auth requests from UI.',
  /**
   *@description  Description text for Prerender2 cancellation status UaChangeRequiresReload.
   */
  UaChangeRequiresReload: 'Reload is needed after UserAgentOverride.',
  /**
   *@description  Description text for Prerender2 cancellation status BlockedByClient.
   */
  BlockedByClient: 'Resource load is blocked by the client.',
  /**
   *@description  Description text for Prerender2 cancellation status AudioOutputDeviceRequested.
   */
  AudioOutputDeviceRequested: 'Prerendering has not supported the AudioContext API yet.',
  /**
   *@description  Description text for Prerender2 cancellation status MixedContent.
   */
  MixedContent: 'Prerendering is canceled by a mixed content frame.',
  /**
   *@description  Description text for Prerender2 cancellation status TriggerBackgrounded.
   */
  TriggerBackgrounded: 'The tab is in the background',
  /**
   *@description  Description text for Prerender2 cancellation status EmbedderTriggeredAndSameOriginRedirected.
   */
  EmbedderTriggeredAndSameOriginRedirected:
      'Prerendering triggered by Chrome internal (e.g., Omnibox prerendering) is canceled because the navigation is redirected to another same-origin page.',
  /**
   *@description  Description text for Prerender2 cancellation status EmbedderTriggeredAndCrossOriginRedirected.
   */
  EmbedderTriggeredAndCrossOriginRedirected:
      'Prerendering triggered by Chrome internal (e.g., Omnibox prerendering) is is canceled because the navigation is redirected to another cross-origin page.',
  /**
   *@description  Description text for Prerender2 cancellation status MemoryLimitExceeded.
   */
  MemoryLimitExceeded: 'Memory limit exceeded',
  /**
   *@description  Description text for Prerender2 cancellation status FailToGetMemoryUsage.
   */
  FailToGetMemoryUsage: 'Fail to get memory usage',
  /**
   *@description  Description text for Prerender2 cancellation status DataSaverEnabled.
   */
  DataSaverEnabled: 'Data saver enabled',
  /**
   *@description  Description text for Prerender2 cancellation status HasEffectiveUrl.
   */
  HasEffectiveUrl: 'Has effective URL',
  /**
   *@description  Description text for Prerender2 cancellation status ActivatedBeforeStarted.
   */
  ActivatedBeforeStarted: 'Activated before started',
  /**
   *@description  Description text for Prerender2 cancellation status InactivePageRestriction.
   */
  InactivePageRestriction: 'Inactive page restriction',
  /**
   *@description  Description text for Prerender2 cancellation status StartFailed.
   */
  StartFailed: 'Start failed',
  /**
   *@description  Detail section description text for Prerender2 cancellation status MojoBinderPolicy.
   */
  DisallowedApiMethod: 'Disallowed API method',
  /**
   *@description  Description text for Prerender2 is ongoing.
   */
  PrerenderingOngoing: 'Prerendering ongoing',
  /**
   *@description  Description text for Prerender2 cancellation status CrossSiteRedirect.
   */
  CrossSiteRedirect:
      'Attempted to prerender a URL which redirected to a cross-site URL. Currently prerendering cross-site pages is disallowed.',
  /**
   *@description  Description text for Prerender2 cancellation status CrossSiteNavigation.
   */
  CrossSiteNavigation:
      'The prerendered page navigated to a cross-site URL after loading. Currently prerendering cross-site pages is disallowed.',
  /**
   *@description  Description text for Prerender2 cancellation status SameSiteCrossOriginRedirect.
   */
  SameSiteCrossOriginRedirect:
      'Attempted to prerender a URL which redirected to a same-site cross-origin URL. Currently prerendering cross-origin pages is disallowed.',
  /**
   *@description  Description text for Prerender2 cancellation status SameSiteCrossOriginNavigation.
   */
  SameSiteCrossOriginNavigation:
      'The prerendered page navigated to a same-site cross-origin URL after loading. Currently prerendering cross-origin pages is disallowed.',
  /**
   *@description  Description text for Prerender2 cancellation status SameSiteCrossOriginRedirectNotOptIn.
   */
  SameSiteCrossOriginRedirectNotOptIn:
      'Attempted to prerender a URL which redirected to a same-site cross-origin URL. This is disallowed unless the destination site sends a Supports-Loading-Mode: credentialed-prerender header.',
  /**
   *@description  Description text for Prerender2 cancellation status SameSiteCrossOriginNavigationNotOptIn.
   */
  SameSiteCrossOriginNavigationNotOptIn:
      'The prerendered page navigated to a same-site cross-origin URL after loading. This is disallowed unless the destination site sends a Supports-Loading-Mode: credentialed-prerender header.',
  /**
   *@description  Description text for Prerender2 cancellation status ActivationNavigationParameterMismatch.
   */
  ActivationNavigationParameterMismatch:
      'The page was prerendered, but the navigation ended up being performed differently than the original prerender, so the prerendered page could not be activated.',
};

const str_ = i18n.i18n.registerUIStrings('panels/application/components/Prerender2.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

export const Prerender2ReasonDescription: {[key: string]: {name: () => Platform.UIString.LocalizedString}} = {
  'Activated': {name: i18nLazyString(UIStrings.Activated)},
  'Destroyed': {name: i18nLazyString(UIStrings.Destroyed)},
  'LowEndDevice': {name: i18nLazyString(UIStrings.LowEndDevice)},
  'InvalidSchemeRedirect': {name: i18nLazyString(UIStrings.InvalidSchemeRedirect)},
  'InvalidSchemeNavigation': {name: i18nLazyString(UIStrings.InvalidSchemeNavigation)},
  'InProgressNavigation': {name: i18nLazyString(UIStrings.InProgressNavigation)},
  'NavigationRequestBlockedByCsp': {name: i18nLazyString(UIStrings.NavigationRequestBlockedByCsp)},
  'MainFrameNavigation': {name: i18nLazyString(UIStrings.MainFrameNavigation)},
  'MojoBinderPolicy': {name: i18nLazyString(UIStrings.MojoBinderPolicy)},
  'RendererProcessCrashed': {name: i18nLazyString(UIStrings.RendererProcessCrashed)},
  'RendererProcessKilled': {name: i18nLazyString(UIStrings.RendererProcessKilled)},
  'Download': {name: i18nLazyString(UIStrings.Download)},
  'TriggerDestroyed': {name: i18nLazyString(UIStrings.TriggerDestroyed)},
  'NavigationNotCommitted': {name: i18nLazyString(UIStrings.NavigationNotCommitted)},
  'NavigationBadHttpStatus': {name: i18nLazyString(UIStrings.NavigationBadHttpStatus)},
  'ClientCertRequested': {name: i18nLazyString(UIStrings.ClientCertRequested)},
  'NavigationRequestNetworkError': {name: i18nLazyString(UIStrings.NavigationRequestNetworkError)},
  'MaxNumOfRunningPrerendersExceeded': {name: i18nLazyString(UIStrings.MaxNumOfRunningPrerendersExceeded)},
  'CancelAllHostsForTesting': {name: i18nLazyString(UIStrings.CancelAllHostsForTesting)},
  'DidFailLoad': {name: i18nLazyString(UIStrings.DidFailLoad)},
  'Stop': {name: i18nLazyString(UIStrings.Stop)},
  'SslCertificateError': {name: i18nLazyString(UIStrings.SslCertificateError)},
  'LoginAuthRequested': {name: i18nLazyString(UIStrings.LoginAuthRequested)},
  'UaChangeRequiresReload': {name: i18nLazyString(UIStrings.UaChangeRequiresReload)},
  'BlockedByClient': {name: i18nLazyString(UIStrings.BlockedByClient)},
  'AudioOutputDeviceRequested': {name: i18nLazyString(UIStrings.AudioOutputDeviceRequested)},
  'MixedContent': {name: i18nLazyString(UIStrings.MixedContent)},
  'TriggerBackgrounded': {name: i18nLazyString(UIStrings.TriggerBackgrounded)},
  'EmbedderTriggeredAndSameOriginRedirected':
      {name: i18nLazyString(UIStrings.EmbedderTriggeredAndSameOriginRedirected)},
  'EmbedderTriggeredAndCrossOriginRedirected':
      {name: i18nLazyString(UIStrings.EmbedderTriggeredAndCrossOriginRedirected)},
  'MemoryLimitExceeded': {name: i18nLazyString(UIStrings.MemoryLimitExceeded)},
  'FailToGetMemoryUsage': {name: i18nLazyString(UIStrings.FailToGetMemoryUsage)},
  'DataSaverEnabled': {name: i18nLazyString(UIStrings.DataSaverEnabled)},
  'HasEffectiveUrl': {name: i18nLazyString(UIStrings.HasEffectiveUrl)},
  'ActivatedBeforeStarted': {name: i18nLazyString(UIStrings.ActivatedBeforeStarted)},
  'InactivePageRestriction': {name: i18nLazyString(UIStrings.InactivePageRestriction)},
  'StartFailed': {name: i18nLazyString(UIStrings.StartFailed)},
  'DisallowedApiMethod': {name: i18nLazyString(UIStrings.DisallowedApiMethod)},
  'PrerenderingOngoing': {name: i18nLazyString(UIStrings.PrerenderingOngoing)},
  'CrossSiteRedirect': {name: i18nLazyString(UIStrings.CrossSiteRedirect)},
  'CrossSiteNavigation': {name: i18nLazyString(UIStrings.CrossSiteNavigation)},
  'SameSiteCrossOriginRedirect': {name: i18nLazyString(UIStrings.SameSiteCrossOriginRedirect)},
  'SameSiteCrossOriginNavigation': {name: i18nLazyString(UIStrings.SameSiteCrossOriginNavigation)},
  'SameSiteCrossOriginRedirectNotOptIn': {name: i18nLazyString(UIStrings.SameSiteCrossOriginRedirectNotOptIn)},
  'SameSiteCrossOriginNavigationNotOptIn': {name: i18nLazyString(UIStrings.SameSiteCrossOriginNavigationNotOptIn)},
  'ActivationNavigationParameterMismatch': {name: i18nLazyString(UIStrings.ActivationNavigationParameterMismatch)},
};

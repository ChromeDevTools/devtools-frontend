// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/components/icon_button/icon_button.js';
import '../../../../ui/components/report_view/report_view.js';
import './PreloadingMismatchedHeadersGrid.js';
import './MismatchedPreloadingGrid.js';

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as RenderCoordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import * as PreloadingHelper from '../helper/helper.js';

import type * as MismatchedPreloadingGrid from './MismatchedPreloadingGrid.js';
import {prefetchFailureReason, prerenderFailureReason} from './PreloadingString.js';
import usedPreloadingStylesRaw from './usedPreloadingView.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const usedPreloadingStyles = new CSSStyleSheet();
usedPreloadingStyles.replaceSync(usedPreloadingStylesRaw.cssContent);

const {html} = Lit;

const UIStrings = {
  /**
   *@description Header for preloading status.
   */
  speculativeLoadingStatusForThisPage: 'Speculative loading status for this page',
  /**
   *@description Label for failure reason of preloeading
   */
  detailsFailureReason: 'Failure reason',
  /**
   *@description Message that tells this page was prerendered.
   */
  downgradedPrefetchUsed:
      'The initiating page attempted to prerender this page\'s URL. The prerender failed, but the resulting response body was still used as a prefetch.',
  /**
   *@description Message that tells this page was prefetched.
   */
  prefetchUsed: 'This page was successfully prefetched.',
  /**
   *@description Message that tells this page was prerendered.
   */
  prerenderUsed: 'This page was successfully prerendered.',
  /**
   *@description Message that tells this page was prefetched.
   */
  prefetchFailed:
      'The initiating page attempted to prefetch this page\'s URL, but the prefetch failed, so a full navigation was performed instead.',
  /**
   *@description Message that tells this page was prerendered.
   */
  prerenderFailed:
      'The initiating page attempted to prerender this page\'s URL, but the prerender failed, so a full navigation was performed instead.',
  /**
   *@description Message that tells this page was not preloaded.
   */
  noPreloads: 'The initiating page did not attempt to speculatively load this page\'s URL.',
  /**
   *@description Header for current URL.
   */
  currentURL: 'Current URL',
  /**
   *@description Header for mismatched preloads.
   */
  preloadedURLs: 'URLs being speculatively loaded by the initiating page',
  /**
   *@description Header for summary.
   */
  speculationsInitiatedByThisPage: 'Speculations initiated by this page',
  /**
   *@description Link text to reveal rules.
   */
  viewAllRules: 'View all speculation rules',
  /**
   *@description Link text to reveal preloads.
   */
  viewAllSpeculations: 'View all speculations',
  /**
   *@description Link to learn more about Preloading
   */
  learnMore: 'Learn more: Speculative loading on developer.chrome.com',
  /**
   *@description Header for the table of mismatched network request header.
   */
  mismatchedHeadersDetail: 'Mismatched HTTP request headers',
  /**
   *@description Label for badge, indicating speculative load successfully used for this page.
   */
  badgeSuccess: 'Success',
  /**
   *@description Label for badge, indicating speculative load failed for this page.
   */
  badgeFailure: 'Failure',
  /**
   *@description Label for badge, indicating no speculative loads used for this page.
   */
  badgeNoSpeculativeLoads: 'No speculative loads',
  /**
   *@description Label for badge, indicating how many not triggered speculations there are.
   */
  badgeNotTriggeredWithCount: '{n, plural, =1 {# not triggered} other {# not triggered}}',
  /**
   *@description Label for badge, indicating how many in progress speculations there are.
   */
  badgeInProgressWithCount: '{n, plural, =1 {# in progress} other {# in progress}}',
  /**
   *@description Label for badge, indicating how many succeeded speculations there are.
   */
  badgeSuccessWithCount: '{n, plural, =1 {# success} other {# success}}',
  /**
   *@description Label for badge, indicating how many failed speculations there are.
   */
  badgeFailureWithCount: '{n, plural, =1 {# failure} other {# failures}}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/components/UsedPreloadingView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface UsedPreloadingViewData {
  pageURL: Platform.DevToolsPath.UrlString;
  previousAttempts: SDK.PreloadingModel.PreloadingAttempt[];
  currentAttempts: SDK.PreloadingModel.PreloadingAttempt[];
}

export const enum UsedKind {
  DOWNGRADED_PRERENDER_TO_PREFETCH_AND_USED = 'DowngradedPrerenderToPrefetchAndUsed',
  PREFETCH_USED = 'PrefetchUsed',
  PRERENDER_USED = 'PrerenderUsed',
  PREFETCH_FAILED = 'PrefetchFailed',
  PRERENDER_FAILED = 'PrerenderFailed',
  NO_PRELOADS = 'NoPreloads',
}

// TODO(kenoss): Rename this class and file once https://crrev.com/c/4933567 landed.
// This also shows summary of speculations initiated by this page.
export class UsedPreloadingView extends LegacyWrapper.LegacyWrapper.WrappableComponent<UI.Widget.VBox> {

  readonly #shadow = this.attachShadow({mode: 'open'});
  #data: UsedPreloadingViewData = {
    pageURL: '' as Platform.DevToolsPath.UrlString,
    previousAttempts: [],
    currentAttempts: [],
  };

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [usedPreloadingStyles];
  }

  set data(data: UsedPreloadingViewData) {
    this.#data = data;
    void this.#render();
  }

  async #render(): Promise<void> {
    await RenderCoordinator.write('UsedPreloadingView render', () => {
      Lit.render(this.#renderInternal(), this.#shadow, {host: this});
    });
  }

  #renderInternal(): Lit.LitTemplate {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <devtools-report>
        ${this.#speculativeLoadingStatusForThisPageSections()}

        <devtools-report-divider></devtools-report-divider>

        ${this.#speculationsInitiatedByThisPageSummarySections()}

        <devtools-report-divider></devtools-report-divider>

        <devtools-report-section>
          ${UI.XLink.XLink.create('https://developer.chrome.com/blog/prerender-pages/', i18nString(UIStrings.learnMore), 'link', undefined, 'learn-more')}
        </devtools-report-section>
      </devtools-report>
    `;
    // clang-format on
  }

  #speculativeLoadingStatusForThisPageSections(): Lit.LitTemplate {
    const pageURL = Common.ParsedURL.ParsedURL.urlWithoutHash(this.#data.pageURL);
    const forThisPage = this.#data.previousAttempts.filter(
        attempt => Common.ParsedURL.ParsedURL.urlWithoutHash(attempt.key.url) === pageURL);
    const prefetch =
        forThisPage.filter(attempt => attempt.key.action === Protocol.Preload.SpeculationAction.Prefetch)[0];
    const prerender =
        forThisPage.filter(attempt => attempt.key.action === Protocol.Preload.SpeculationAction.Prerender)[0];

    let kind = UsedKind.NO_PRELOADS;
    // Prerender -> prefetch downgrade case
    //
    // This code does not handle the case SpecRules designate these preloads rather than prerenderer automatically downgrade prerendering.
    // TODO(https://crbug.com/1410709): Improve this logic once automatic downgrade implemented.
    if (prerender?.status === SDK.PreloadingModel.PreloadingStatus.FAILURE &&
        prefetch?.status === SDK.PreloadingModel.PreloadingStatus.SUCCESS) {
      kind = UsedKind.DOWNGRADED_PRERENDER_TO_PREFETCH_AND_USED;
    } else if (prefetch?.status === SDK.PreloadingModel.PreloadingStatus.SUCCESS) {
      kind = UsedKind.PREFETCH_USED;
    } else if (prerender?.status === SDK.PreloadingModel.PreloadingStatus.SUCCESS) {
      kind = UsedKind.PRERENDER_USED;
    } else if (prefetch?.status === SDK.PreloadingModel.PreloadingStatus.FAILURE) {
      kind = UsedKind.PREFETCH_FAILED;
    } else if (prerender?.status === SDK.PreloadingModel.PreloadingStatus.FAILURE) {
      kind = UsedKind.PRERENDER_FAILED;
    } else {
      kind = UsedKind.NO_PRELOADS;
    }

    let badge;
    let basicMessage;
    switch (kind) {
      case UsedKind.DOWNGRADED_PRERENDER_TO_PREFETCH_AND_USED:
        badge = this.#badgeSuccess();
        basicMessage = html`${i18nString(UIStrings.downgradedPrefetchUsed)}`;
        break;
      case UsedKind.PREFETCH_USED:
        badge = this.#badgeSuccess();
        basicMessage = html`${i18nString(UIStrings.prefetchUsed)}`;
        break;
      case UsedKind.PRERENDER_USED:
        badge = this.#badgeSuccess();
        basicMessage = html`${i18nString(UIStrings.prerenderUsed)}`;
        break;
      case UsedKind.PREFETCH_FAILED:
        badge = this.#badgeFailure();
        basicMessage = html`${i18nString(UIStrings.prefetchFailed)}`;
        break;
      case UsedKind.PRERENDER_FAILED:
        badge = this.#badgeFailure();
        basicMessage = html`${i18nString(UIStrings.prerenderFailed)}`;
        break;
      case UsedKind.NO_PRELOADS:
        badge = this.#badgeNeutral(i18nString(UIStrings.badgeNoSpeculativeLoads));
        basicMessage = html`${i18nString(UIStrings.noPreloads)}`;
        break;
    }

    let maybeFailureReasonMessage;
    if (kind === UsedKind.PREFETCH_FAILED) {
      assertNotNullOrUndefined(prefetch);
      maybeFailureReasonMessage = prefetchFailureReason(prefetch as SDK.PreloadingModel.PrefetchAttempt);
    } else if (kind === UsedKind.PRERENDER_FAILED || kind === UsedKind.DOWNGRADED_PRERENDER_TO_PREFETCH_AND_USED) {
      assertNotNullOrUndefined(prerender);
      maybeFailureReasonMessage = prerenderFailureReason(prerender as SDK.PreloadingModel.PrerenderAttempt);
    }

    let maybeFailureReason: Lit.LitTemplate = Lit.nothing;
    if (maybeFailureReasonMessage !== undefined) {
      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      maybeFailureReason = html`
      <devtools-report-section-header>${i18nString(UIStrings.detailsFailureReason)}</devtools-report-section-header>
      <devtools-report-section>
        ${maybeFailureReasonMessage}
      </devtools-report-section>
      `;
      // clang-format on
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <devtools-report-section-header>${i18nString(UIStrings.speculativeLoadingStatusForThisPage)}</devtools-report-section-header>
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
    // clang-format on
  }

  #maybeMismatchedSections(kind: UsedKind): Lit.LitTemplate {
    if (kind !== UsedKind.NO_PRELOADS || this.#data.previousAttempts.length === 0) {
      return Lit.nothing;
    }

    const rows = this.#data.previousAttempts.map(attempt => {
      return {
        url: attempt.key.url,
        action: attempt.key.action,
        status: attempt.status,
      };
    });
    const data = {
      pageURL: this.#data.pageURL,
      rows,
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <devtools-report-section-header>${i18nString(UIStrings.currentURL)}</devtools-report-section-header>
      <devtools-report-section>
        ${UI.XLink.XLink.create(this.#data.pageURL, undefined, 'link', undefined, 'current-url')}
      </devtools-report-section>

      <devtools-report-section-header>${i18nString(UIStrings.preloadedURLs)}</devtools-report-section-header>
      <devtools-report-section
      jslog=${VisualLogging.section('preloaded-urls')}>
        <devtools-resources-mismatched-preloading-grid
          .data=${data as MismatchedPreloadingGrid.MismatchedPreloadingGridData}></devtools-resources-mismatched-preloading-grid>
      </devtools-report-section>
    `;
    // clang-format on
  }

  #maybeMismatchedHTTPHeadersSections(): Lit.LitTemplate {
    const attempt = this.#data.previousAttempts.find(
        attempt =>
            attempt.action === Protocol.Preload.SpeculationAction.Prerender && attempt.mismatchedHeaders !== null);
    if (attempt === undefined) {
      return Lit.nothing;
    }

    if (attempt.key.url !== this.#data.pageURL) {
      // This place should never be reached since mismatched headers is reported only if the activation is attempted.
      // TODO(crbug.com/1456673): remove this check once DevTools support embedder-triggered prerender or prerender
      // supports non-vary-search.
      throw new Error('unreachable');
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <devtools-report-section-header>${i18nString(UIStrings.mismatchedHeadersDetail)}</devtools-report-section-header>
      <devtools-report-section>
        <devtools-resources-preloading-mismatched-headers-grid
          .data=${attempt as SDK.PreloadingModel.PrerenderAttempt}></devtools-resources-preloading-mismatched-headers-grid>
      </devtools-report-section>
    `;
    // clang-format on
  }

  #speculationsInitiatedByThisPageSummarySections(): Lit.LitTemplate {
    const count = this.#data.currentAttempts.reduce((acc, attempt) => {
      acc.set(attempt.status, (acc.get(attempt.status) ?? 0) + 1);
      return acc;
    }, new Map());
    const notTriggeredCount = count.get(SDK.PreloadingModel.PreloadingStatus.NOT_TRIGGERED) ?? 0;
    const readyCount = count.get(SDK.PreloadingModel.PreloadingStatus.READY) ?? 0;
    const failureCount = count.get(SDK.PreloadingModel.PreloadingStatus.FAILURE) ?? 0;
    const inProgressCount = (count.get(SDK.PreloadingModel.PreloadingStatus.PENDING) ?? 0) +
        (count.get(SDK.PreloadingModel.PreloadingStatus.RUNNING) ?? 0);
    const badges = [];
    if (this.#data.currentAttempts.length === 0) {
      badges.push(this.#badgeNeutral(i18nString(UIStrings.badgeNoSpeculativeLoads)));
    }
    if (notTriggeredCount > 0) {
      badges.push(this.#badgeNeutral(i18nString(UIStrings.badgeNotTriggeredWithCount, {n: notTriggeredCount})));
    }
    if (inProgressCount > 0) {
      badges.push(this.#badgeNeutral(i18nString(UIStrings.badgeInProgressWithCount, {n: inProgressCount})));
    }
    if (readyCount > 0) {
      badges.push(this.#badgeSuccess(readyCount));
    }
    if (failureCount > 0) {
      badges.push(this.#badgeFailure(failureCount));
    }

    const revealRuleSetView = (): void => {
      void Common.Revealer.reveal(new PreloadingHelper.PreloadingForward.RuleSetView(null));
    };
    const revealAttemptViewWithFilter = (): void => {
      void Common.Revealer.reveal(new PreloadingHelper.PreloadingForward.AttemptViewWithFilter(null));
    };

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <devtools-report-section-header>${i18nString(UIStrings.speculationsInitiatedByThisPage)}</devtools-report-section-header>
      <devtools-report-section>
        <div>
          <div class="status-badge-container">
            ${badges}
          </div>

          <div class="reveal-links">
            <button class="link devtools-link" @click=${revealRuleSetView}
            jslog=${VisualLogging.action('view-all-rules').track({click: true})}>
              ${i18nString(UIStrings.viewAllRules)}
            </button>
           ・
            <button class="link devtools-link" @click=${revealAttemptViewWithFilter}
            jslog=${VisualLogging.action('view-all-speculations').track({click: true})}>
             ${i18nString(UIStrings.viewAllSpeculations)}
            </button>
          </div>
        </div>
      </devtools-report-section>
    `;
    // clang-format on
  }

  #badgeSuccess(count?: number): Lit.LitTemplate {
    let message;
    if (count === undefined) {
      message = i18nString(UIStrings.badgeSuccess);
    } else {
      message = i18nString(UIStrings.badgeSuccessWithCount, {n: count});
    }
    return this.#badge('status-badge status-badge-success', 'check-circle', message);
  }

  #badgeFailure(count?: number): Lit.LitTemplate {
    let message;
    if (count === undefined) {
      message = i18nString(UIStrings.badgeFailure);
    } else {
      message = i18nString(UIStrings.badgeFailureWithCount, {n: count});
    }
    return this.#badge('status-badge status-badge-failure', 'cross-circle', message);
  }

  #badgeNeutral(message: string): Lit.LitTemplate {
    return this.#badge('status-badge status-badge-neutral', 'clear', message);
  }

  #badge(klass: string, iconName: string, message: string): Lit.LitTemplate {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <span class=${klass}>
        <devtools-icon name=${iconName}></devtools-icon>
        <span>
          ${message}
        </span>
      </span>
    `;
    // clang-format on
  }
}

customElements.define('devtools-resources-used-preloading-view', UsedPreloadingView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-used-preloading-view': UsedPreloadingView;
  }
}

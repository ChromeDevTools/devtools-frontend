// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as IconButton from '../../../../ui/components/icon_button/icon_button.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import {eventRef} from './EventRef.js';
import {BaseInsight, shouldRenderForCategory} from './Helpers.js';
import * as SidebarInsight from './SidebarInsight.js';
import {Category} from './types.js';

const UIStrings = {
  /**
   *@description Title of an insight that provides details about the LCP metric, and the network requests necessary to load it.
   */
  title: 'LCP request discovery',
  /**
   *@description Description of an insight that provides details about the LCP metric, and the network requests necessary to load it.
   */
  description:
      'Optimize LCP by making the LCP image [discoverable](https://web.dev/articles/optimize-lcp#1_eliminate_resource_load_delay) from the HTML immediately, and [avoiding lazy-loading](https://web.dev/articles/lcp-lazy-loading)',
  /**
   * @description Text to tell the user how long after the earliest discovery time their LCP element loaded.
   * @example {401ms} PH1
   */
  lcpLoadDelay: 'LCP image loaded {PH1} after earliest start point.',
  /**
   * @description Text to tell the user that a fetchpriority property value of "high" is applied to the LCP request.
   */
  fetchPriorityApplied: 'fetchpriority=high applied',
  /**
   * @description Text to tell the user that the LCP request is discoverable in the initial document.
   */
  requestDiscoverable: 'Request is discoverable in initial document',
  /**
   * @description Text to tell the user that the LCP request does not have the lazy load property applied.
   */
  lazyLoadNotApplied: 'lazy load not applied',
  /**
   *@description Text for a screen-reader label to tell the user that the icon represents a successful check
   *@example {Server response time} PH1
   */
  successAriaLabel: 'Success: {PH1}',
  /**
   *@description Text for a screen-reader label to tell the user that the icon represents an unsuccessful check
   *@example {Server response time} PH1
   */
  failedAriaLabel: 'Failure: {PH1}',

};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/LCPDiscovery.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface LCPImageDiscoveryData {
  shouldIncreasePriorityHint: boolean;
  shouldPreloadImage: boolean;
  shouldRemoveLazyLoading: boolean;
  request: Trace.Types.Events.SyntheticNetworkRequest;
  discoveryDelay: Trace.Types.Timing.MicroSeconds|null;
  estimatedSavings: Trace.Types.Timing.MilliSeconds|null;
}

function getImageData(
    insights: Trace.Insights.Types.TraceInsightSets|null, insightSetKey: string|null): LCPImageDiscoveryData|null {
  const insight = Trace.Insights.Common.getInsight('LargestContentfulPaint', insights, insightSetKey);
  if (!insight) {
    return null;
  }

  if (insight.lcpRequest === undefined) {
    return null;
  }

  const shouldIncreasePriorityHint = insight.shouldIncreasePriorityHint;
  const shouldPreloadImage = insight.shouldPreloadImage;
  const shouldRemoveLazyLoading = insight.shouldRemoveLazyLoading;

  const imageLCP = shouldIncreasePriorityHint !== undefined && shouldPreloadImage !== undefined &&
      shouldRemoveLazyLoading !== undefined;

  // Shouldn't render anything if lcp insight is null or lcp is text.
  if (!imageLCP) {
    return null;
  }

  const data: LCPImageDiscoveryData = {
    shouldIncreasePriorityHint,
    shouldPreloadImage,
    shouldRemoveLazyLoading,
    request: insight.lcpRequest,
    discoveryDelay: null,
    estimatedSavings: insight.metricSavings?.LCP ?? null,
  };

  if (insight.earliestDiscoveryTimeTs && insight.lcpRequest) {
    const discoveryDelay = insight.lcpRequest.ts - insight.earliestDiscoveryTimeTs;
    data.discoveryDelay = Trace.Types.Timing.MicroSeconds(discoveryDelay);
  }

  return data;
}

export class LCPDiscovery extends BaseInsight {
  static override readonly litTagName = LitHtml.literal`devtools-performance-lcp-discovery`;
  override insightCategory: Category = Category.LCP;
  override internalName: string = 'lcp-discovery';
  override userVisibleTitle: string = i18nString(UIStrings.title);
  override description: string = i18nString(UIStrings.description);

  #adviceIcon(didFail: boolean, label: string): LitHtml.TemplateResult {
    const icon = didFail ? 'clear' : 'check-circle';

    const ariaLabel = didFail ? i18nString(UIStrings.successAriaLabel, {PH1: label}) :
                                i18nString(UIStrings.failedAriaLabel, {PH1: label});
    return LitHtml.html`
      <${IconButton.Icon.Icon.litTagName}
        aria-label=${ariaLabel}
        name=${icon}
        class=${didFail ? 'metric-value-bad' : 'metric-value-good'}
      ></${IconButton.Icon.Icon.litTagName}>
    `;
  }

  #renderDiscoveryDelay(delay: Trace.Types.Timing.MicroSeconds): Element {
    const timeWrapper = document.createElement('span');
    timeWrapper.classList.add('discovery-time-ms');
    timeWrapper.innerText = i18n.TimeUtilities.formatMicroSecondsTime(delay);
    return i18n.i18n.getFormatLocalizedString(str_, UIStrings.lcpLoadDelay, {PH1: timeWrapper});
  }

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    const imageResults = getImageData(this.data.insights, this.data.insightSetKey);
    if (!imageResults || !imageResults.discoveryDelay) {
      return [];
    }

    const delay = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
        Trace.Types.Timing.MicroSeconds(imageResults.request.ts - imageResults.discoveryDelay),
        imageResults.request.ts,
    );

    const label = LitHtml.html`<div class="discovery-delay"> ${this.#renderDiscoveryDelay(delay.range)}</div>`;

    return [
      {
        type: 'ENTRY_OUTLINE',
        entry: imageResults.request,
        outlineReason: 'ERROR',
      },
      {
        type: 'CANDY_STRIPED_TIME_RANGE',
        bounds: delay,
        entry: imageResults.request,
      },
      {
        type: 'TIMESPAN_BREAKDOWN',
        sections: [{
          bounds: delay,
          label,
          showDuration: false,
        }],
        entry: imageResults.request,
        renderLocation: 'ABOVE_EVENT',
      },
    ];
  }

  #handleBadImage(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  #renderImage(imageData: LCPImageDiscoveryData): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`
      <div class="lcp-element">
        ${imageData.request.args.data.mimeType.includes('image') ?
          LitHtml.html`
        <img
          class="element-img"
          src=${imageData.request.args.data.url}
          @error=${this.#handleBadImage}
           />`: LitHtml.nothing}
        <span class="element-img-details">
          ${eventRef(imageData.request)}
          <span class="element-img-details-size">${Platform.NumberUtilities.bytesToString(imageData.request.args.data.decodedBodyLength ?? 0)}</span>
        </span>
      </div>`;
    // clang-format on
  }

  #renderDiscovery(imageData: LCPImageDiscoveryData): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`
        <div class="insights">
          <${SidebarInsight.SidebarInsight.litTagName} .data=${{
            title: this.userVisibleTitle,
            description: this.description,
            internalName: this.internalName,
            expanded: this.isActive(),
            estimatedSavingsTime: imageData.estimatedSavings,
          } as SidebarInsight.InsightDetails}
          @insighttoggleclick=${this.onSidebarClick}
        >
          <div slot="insight-content" class="insight-section">
            <div class="insight-results">
              <ul class="insight-icon-results">
                <li class="insight-entry">
                  ${this.#adviceIcon(imageData.shouldIncreasePriorityHint, i18nString(UIStrings.fetchPriorityApplied))}
                  <span>${i18nString(UIStrings.fetchPriorityApplied)}</span>
                </li>
                <li class="insight-entry">
                  ${this.#adviceIcon(imageData.shouldPreloadImage, i18nString(UIStrings.requestDiscoverable))}
                  <span>${i18nString(UIStrings.requestDiscoverable)}</span>
                </li>
                <li class="insight-entry">
                  ${this.#adviceIcon(imageData.shouldRemoveLazyLoading, i18nString(UIStrings.lazyLoadNotApplied))}
                  <span>${i18nString(UIStrings.lazyLoadNotApplied)}</span>
                </li>
              </ul>
            </div>
            ${this.#renderImage(imageData)}
          </div>
        </${SidebarInsight.SidebarInsight}>
      </div>`;
    // clang-format on
  }

  override getRelatedEvents(): Trace.Types.Events.Event[] {
    const insight =
        Trace.Insights.Common.getInsight('LargestContentfulPaint', this.data.insights, this.data.insightSetKey);
    if (!insight?.lcpEvent || !insight?.lcpRequest) {
      return [];
    }

    // TODO: add entire request initiator chain?
    return [insight.lcpEvent, insight.lcpRequest];
  }

  override render(): void {
    const imageResults = getImageData(this.data.insights, this.data.insightSetKey);
    const matchesCategory = shouldRenderForCategory({
      activeCategory: this.data.activeCategory,
      insightCategory: this.insightCategory,
    });
    const output = imageResults && matchesCategory ? this.#renderDiscovery(imageResults) : LitHtml.nothing;
    LitHtml.render(output, this.shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-lcp-discovery': LCPDiscovery;
  }
}

customElements.define('devtools-performance-lcp-discovery', LCPDiscovery);

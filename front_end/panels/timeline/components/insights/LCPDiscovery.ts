// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/components/icon_button/icon_button.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type {LCPDiscoveryInsightModel} from '../../../../models/trace/insights/LCPDiscovery.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {imageRef} from './EventRef.js';

const {html} = LitHtml;

const UIStrings = {
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
   *@description Text for a screen-reader label to tell the user that the icon represents a successful insight check
   *@example {Server response time} PH1
   */
  successAriaLabel: 'Insight check passed: {PH1}',
  /**
   *@description Text for a screen-reader label to tell the user that the icon represents an unsuccessful insight check
   *@example {Server response time} PH1
   */
  failedAriaLabel: 'Insight check failed: {PH1}',
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

function getImageData(model: LCPDiscoveryInsightModel|null): LCPImageDiscoveryData|null {
  if (!model) {
    return null;
  }

  if (model.lcpRequest === undefined) {
    return null;
  }

  const shouldIncreasePriorityHint = model.shouldIncreasePriorityHint;
  const shouldPreloadImage = model.shouldPreloadImage;
  const shouldRemoveLazyLoading = model.shouldRemoveLazyLoading;

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
    request: model.lcpRequest,
    discoveryDelay: null,
    estimatedSavings: model.metricSavings?.LCP ?? null,
  };

  if (model.earliestDiscoveryTimeTs && model.lcpRequest) {
    const discoveryDelay = model.lcpRequest.ts - model.earliestDiscoveryTimeTs;
    data.discoveryDelay = Trace.Types.Timing.MicroSeconds(discoveryDelay);
  }

  return data;
}

export class LCPDiscovery extends BaseInsightComponent<LCPDiscoveryInsightModel> {
  static override readonly litTagName = LitHtml.literal`devtools-performance-lcp-discovery`;
  override internalName: string = 'lcp-discovery';

  #adviceIcon(didFail: boolean, label: string): LitHtml.TemplateResult {
    const icon = didFail ? 'clear' : 'check-circle';

    const ariaLabel = didFail ? i18nString(UIStrings.failedAriaLabel, {PH1: label}) :
                                i18nString(UIStrings.successAriaLabel, {PH1: label});
    return html`
      <devtools-icon
        aria-label=${ariaLabel}
        name=${icon}
        class=${didFail ? 'metric-value-bad' : 'metric-value-good'}
      ></devtools-icon>
    `;
  }

  #renderDiscoveryDelay(delay: Trace.Types.Timing.MicroSeconds): Element {
    const timeWrapper = document.createElement('span');
    timeWrapper.classList.add('discovery-time-ms');
    timeWrapper.innerText = i18n.TimeUtilities.formatMicroSecondsTime(delay);
    return i18n.i18n.getFormatLocalizedString(str_, UIStrings.lcpLoadDelay, {PH1: timeWrapper});
  }

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    const imageResults = getImageData(this.model);
    if (!imageResults || !imageResults.discoveryDelay) {
      return [];
    }

    const delay = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
        Trace.Types.Timing.MicroSeconds(imageResults.request.ts - imageResults.discoveryDelay),
        imageResults.request.ts,
    );

    const label = html`<div class="discovery-delay"> ${this.#renderDiscoveryDelay(delay.range)}</div>`;

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

  override getEstimatedSavingsTime(): Trace.Types.Timing.MilliSeconds|null {
    return getImageData(this.model)?.estimatedSavings ?? null;
  }

  #renderContent(imageData: LCPImageDiscoveryData): LitHtml.LitTemplate {
    if (!this.model) {
      return LitHtml.nothing;
    }

    // clang-format off
    return html`
      <div class="insight-section">
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
        ${imageRef(imageData.request)}
      </div>`;
    // clang-format on
  }

  override render(): void {
    const imageResults = getImageData(this.model);
    const output = imageResults ? this.#renderContent(imageResults) : LitHtml.nothing;
    this.renderWithContent(output);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-lcp-discovery': LCPDiscovery;
  }
}

customElements.define('devtools-performance-lcp-discovery', LCPDiscovery);

// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/components/icon_button/icon_button.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type {LCPDiscoveryInsightModel} from '../../../../models/trace/insights/LCPDiscovery.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {imageRef} from './EventRef.js';

const {UIStrings, i18nString} = Trace.Insights.Models.LCPDiscovery;

const {html} = Lit;

// eslint-disable-next-line rulesdir/l10n-filename-matches
const str_ = i18n.i18n.registerUIStrings('models/trace/insights/LCPDiscovery.ts', UIStrings);

interface LCPImageDiscoveryData {
  shouldIncreasePriorityHint: boolean;
  shouldPreloadImage: boolean;
  shouldRemoveLazyLoading: boolean;
  request: Trace.Types.Events.SyntheticNetworkRequest;
  discoveryDelay: Trace.Types.Timing.Micro|null;
  estimatedSavings: Trace.Types.Timing.Milli|null;
}

function getImageData(model: LCPDiscoveryInsightModel): LCPImageDiscoveryData|null {
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
    data.discoveryDelay = Trace.Types.Timing.Micro(discoveryDelay);
  }

  return data;
}

export class LCPDiscovery extends BaseInsightComponent<LCPDiscoveryInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-lcp-discovery`;
  override internalName: string = 'lcp-discovery';

  #adviceIcon(didFail: boolean, label: string): Lit.TemplateResult {
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

  #renderDiscoveryDelay(delay: Trace.Types.Timing.Micro): Element {
    const timeWrapper = document.createElement('span');
    timeWrapper.classList.add('discovery-time-ms');
    timeWrapper.innerText = i18n.TimeUtilities.formatMicroSecondsTime(delay);
    return i18n.i18n.getFormatLocalizedString(str_, UIStrings.lcpLoadDelay, {PH1: timeWrapper});
  }

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    if (!this.model) {
      return [];
    }

    const imageResults = getImageData(this.model);
    if (!imageResults || !imageResults.discoveryDelay) {
      return [];
    }

    const delay = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
        Trace.Types.Timing.Micro(imageResults.request.ts - imageResults.discoveryDelay),
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

  override getEstimatedSavingsTime(): Trace.Types.Timing.Milli|null {
    if (!this.model) {
      return null;
    }

    return getImageData(this.model)?.estimatedSavings ?? null;
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    const imageData = getImageData(this.model);
    if (!imageData) {
      if (!this.model.lcpEvent) {
        return html`<div class="insight-section">${i18nString(UIStrings.noLcp)}</div>`;
      }
      return html`<div class="insight-section">${i18nString(UIStrings.noLcpResource)}</div>`;
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
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-lcp-discovery': LCPDiscovery;
  }
}

customElements.define('devtools-performance-lcp-discovery', LCPDiscovery);

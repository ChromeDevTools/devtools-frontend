// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/components/icon_button/icon_button.js';

import type {DocumentLatencyInsightModel} from '../../../../models/trace/insights/DocumentLatency.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';

const {UIStrings, i18nString} = Trace.Insights.Models.DocumentLatency;

const {html} = Lit;

export class DocumentLatency extends BaseInsightComponent<DocumentLatencyInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-document-latency`;
  override internalName: string = 'document-latency';

  #check(didPass: boolean, good: string, bad: string): Lit.TemplateResult {
    const icon = didPass ? 'check-circle' : 'clear';

    const ariaLabel = didPass ? i18nString(UIStrings.successAriaLabel, {PH1: good}) :
                                i18nString(UIStrings.failedAriaLabel, {PH1: bad});
    return html`
      <devtools-icon
        aria-label=${ariaLabel}
        name=${icon}
        class=${didPass ? 'metric-value-good' : 'metric-value-bad'}
      ></devtools-icon>
      <span>${didPass ? good : bad}</span>
    `;
  }

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    if (!this.model?.data?.documentRequest) {
      return [];
    }

    const overlays: Overlays.Overlays.TimelineOverlay[] = [];
    const event = this.model.data.documentRequest;
    const redirectDurationMicro = Trace.Helpers.Timing.milliToMicro(this.model.data.redirectDuration);

    const sections = [];
    if (this.model.data.redirectDuration) {
      const bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          event.ts,
          (event.ts + redirectDurationMicro) as Trace.Types.Timing.Micro,
      );
      sections.push({bounds, label: i18nString(UIStrings.redirectsLabel), showDuration: true});
      overlays.push({type: 'CANDY_STRIPED_TIME_RANGE', bounds, entry: event});
    }
    if (this.model.data.serverResponseTooSlow) {
      const serverResponseTimeMicro = Trace.Helpers.Timing.milliToMicro(this.model.data.serverResponseTime);
      // NOTE: NetworkRequestHandlers never makes a synthetic network request event if `timing` is missing.
      const sendEnd = event.args.data.timing?.sendEnd ?? Trace.Types.Timing.Milli(0);
      const sendEndMicro = Trace.Helpers.Timing.milliToMicro(sendEnd);
      const bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          sendEndMicro,
          (sendEndMicro + serverResponseTimeMicro) as Trace.Types.Timing.Micro,
      );
      sections.push({bounds, label: i18nString(UIStrings.serverResponseTimeLabel), showDuration: true});
    }
    if (this.model.data.uncompressedResponseBytes) {
      const bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          event.args.data.syntheticData.downloadStart,
          (event.args.data.syntheticData.downloadStart + event.args.data.syntheticData.download) as
              Trace.Types.Timing.Micro,
      );
      sections.push({bounds, label: i18nString(UIStrings.uncompressedDownload), showDuration: true});
      overlays.push({type: 'CANDY_STRIPED_TIME_RANGE', bounds, entry: event});
    }

    if (sections.length) {
      overlays.push({
        type: 'TIMESPAN_BREAKDOWN',
        sections,
        entry: this.model.data.documentRequest,
        // Always render below because the document request is guaranteed to be
        // the first request in the network track.
        renderLocation: 'BELOW_EVENT',
      });
    }
    overlays.push({
      type: 'ENTRY_SELECTED',
      entry: this.model.data.documentRequest,
    });

    return overlays;
  }

  override getEstimatedSavingsTime(): Trace.Types.Timing.Milli|null {
    return this.model?.metricSavings?.FCP ?? null;
  }

  override getEstimatedSavingsBytes(): number|null {
    return this.model?.data?.uncompressedResponseBytes ?? null;
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model?.data) {
      return Lit.nothing;
    }

    // clang-format off
    return html`
      <div class="insight-section">
        <ul class="insight-results insight-icon-results">
          <li class="insight-entry">
            ${this.#check(this.model.data.redirectDuration === 0,
              i18nString(UIStrings.passingRedirects), i18nString(UIStrings.failedRedirects))}
          </li>
          <li class="insight-entry">
            ${this.#check(!this.model.data.serverResponseTooSlow,
              i18nString(UIStrings.passingServerResponseTime), i18nString(UIStrings.failedServerResponseTime))}
          </li>
          <li class="insight-entry">
            ${this.#check(this.model.data.uncompressedResponseBytes === 0,
              i18nString(UIStrings.passingTextCompression), i18nString(UIStrings.failedTextCompression))}
          </li>
        </ul>
      </div>`;
    // clang-format on
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-document-latency': DocumentLatency;
  }
}

customElements.define('devtools-performance-document-latency', DocumentLatency);

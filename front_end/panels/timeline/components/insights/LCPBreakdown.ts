// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Table.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type {LCPBreakdownInsightModel} from '../../../../models/trace/insights/LCPBreakdown.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import type {TableData} from './Table.js';

const {UIStrings, i18nString} = Trace.Insights.Models.LCPBreakdown;

const {html} = Lit;

export class LCPBreakdown extends BaseInsightComponent<LCPBreakdownInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-lcp-breakdown`;
  override internalName = 'lcp-by-phase';
  #overlay: Trace.Types.Overlays.TimespanBreakdown|null = null;

  protected override hasAskAiSupport(): boolean {
    return true;
  }

  protected override createOverlays(): Trace.Types.Overlays.Overlay[] {
    this.#overlay = null;

    if (!this.model || !this.model.subparts || !this.model.lcpTs) {
      return [];
    }

    const overlays = this.model.createOverlays?.();
    if (!overlays) {
      return [];
    }

    this.#overlay = overlays[0] as Trace.Types.Overlays.TimespanBreakdown;
    return overlays;
  }

  #renderFieldSubparts(): Lit.LitTemplate|null {
    if (!this.fieldMetrics) {
      return null;
    }

    const {ttfb, loadDelay, loadDuration, renderDelay} = this.fieldMetrics.lcpBreakdown;
    if (!ttfb || !loadDelay || !loadDuration || !renderDelay) {
      return null;
    }

    const ttfbMillis = i18n.TimeUtilities.preciseMillisToString(Trace.Helpers.Timing.microToMilli(ttfb.value));
    const loadDelayMillis =
        i18n.TimeUtilities.preciseMillisToString(Trace.Helpers.Timing.microToMilli(loadDelay.value));
    const loadDurationMillis =
        i18n.TimeUtilities.preciseMillisToString(Trace.Helpers.Timing.microToMilli(loadDuration.value));
    const renderDelayMillis =
        i18n.TimeUtilities.preciseMillisToString(Trace.Helpers.Timing.microToMilli(renderDelay.value));

    const rows = [
      {values: [i18nString(UIStrings.timeToFirstByte), ttfbMillis]},
      {values: [i18nString(UIStrings.resourceLoadDelay), loadDelayMillis]},
      {values: [i18nString(UIStrings.resourceLoadDuration), loadDurationMillis]},
      {values: [i18nString(UIStrings.elementRenderDelay), renderDelayMillis]},
    ];

    // clang-format off
    return html`
      <div class="insight-section">
        <devtools-performance-table
          .data=${{
            insight: this,
            headers: [i18nString(UIStrings.subpart), i18nString(UIStrings.fieldDuration)],
            rows,
          } as TableData}>
        </devtools-performance-table>
      </div>
    `;
    // clang-format on
  }

  override toggleTemporaryOverlays(
      overlays: Trace.Types.Overlays.Overlay[]|null, options: Overlays.Overlays.TimelineOverlaySetOptions): void {
    super.toggleTemporaryOverlays(overlays, {...options, updateTraceWindowPercentage: 0});
  }

  override getOverlayOptionsForInitialOverlays(): Overlays.Overlays.TimelineOverlaySetOptions {
    return {updateTraceWindow: true, updateTraceWindowPercentage: 0};
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    const {subparts} = this.model;

    if (!subparts) {
      return html`<div class="insight-section">${i18nString(UIStrings.noLcp)}</div>`;
    }

    const rows = Object.values(subparts).map((subpart: Trace.Insights.Models.LCPBreakdown.Subpart) => {
      const section = this.#overlay?.sections.find(section => subpart.label === section.label);
      const timing = Trace.Helpers.Timing.microToMilli(subpart.range);
      return {
        values: [subpart.label, i18n.TimeUtilities.preciseMillisToString(timing)],
        overlays: section && [{
                    type: 'TIMESPAN_BREAKDOWN',
                    sections: [section],
                  }],
      };
    });

    // clang-format off
    const sections: Lit.LitTemplate[] = [html`
      <div class="insight-section">
        <devtools-performance-table
          .data=${{
            insight: this,
            headers: [i18nString(UIStrings.subpart), i18nString(UIStrings.duration)],
            rows,
          } as TableData}>
        </devtools-performance-table>
      </div>`
    ];
    // clang-format on

    const fieldDataSection = this.#renderFieldSubparts();
    if (fieldDataSection) {
      sections.push(fieldDataSection);
    }

    return html`${sections}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-lcp-breakdown': LCPBreakdown;
  }
}

customElements.define('devtools-performance-lcp-breakdown', LCPBreakdown);

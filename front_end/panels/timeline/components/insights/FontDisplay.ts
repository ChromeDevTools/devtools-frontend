// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Table.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type {FontDisplayInsightModel} from '../../../../models/trace/insights/FontDisplay.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {eventRef} from './EventRef.js';
import {createLimitedRows, renderOthersLabel, type TableData, type TableDataRow} from './Table.js';

const {UIStrings, i18nString} = Trace.Insights.Models.FontDisplay;

const {html} = Lit;

export class FontDisplay extends BaseInsightComponent<FontDisplayInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-font-display`;
  override internalName = 'font-display';
  #overlayForRequest = new Map<Trace.Types.Events.Event, Trace.Types.Overlays.Overlay>();

  protected override createOverlays(): Trace.Types.Overlays.Overlay[] {
    this.#overlayForRequest.clear();

    if (!this.model) {
      return [];
    }

    const overlays = this.model.createOverlays?.();
    if (!overlays) {
      return [];
    }

    for (const overlay of overlays.filter(overlay => overlay.type === 'ENTRY_OUTLINE')) {
      this.#overlayForRequest.set(overlay.entry, overlay);
    }

    return overlays;
  }

  mapToRow(font: Trace.Insights.Models.FontDisplay.RemoteFont): TableDataRow {
    const overlay = this.#overlayForRequest.get(font.request);
    return {
      values: [
        eventRef(font.request, {text: font.name}),
        i18n.TimeUtilities.millisToString(font.wastedTime),
      ],
      overlays: overlay ? [overlay] : [],
    };
  }

  createAggregatedTableRow(remaining: Trace.Insights.Models.FontDisplay.RemoteFont[]): TableDataRow {
    return {
      values: [renderOthersLabel(remaining.length), ''],
      overlays: remaining.map(r => this.#overlayForRequest.get(r.request)).filter(o => !!o),
    };
  }

  override getEstimatedSavingsTime(): Trace.Types.Timing.Milli|null {
    return this.model?.metricSavings?.FCP ?? null;
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    const rows = createLimitedRows(this.model.fonts, this);

    // clang-format off
    return html`
      <div class="insight-section">
        ${html`<devtools-performance-table
          .data=${{
            insight: this,
            headers: [i18nString(UIStrings.fontColumn), i18nString(UIStrings.wastedTimeColumn)],
            rows,
          } as TableData}>
        </devtools-performance-table>`}
      </div>`;
    // clang-format on
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-font-display': FontDisplay;
  }
}

customElements.define('devtools-performance-font-display', FontDisplay);

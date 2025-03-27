// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Table.js';

import type {UseModernHTTPInsightModel} from '../../../../models/trace/insights/ModernHTTP.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {eventRef} from './EventRef.js';
import {createLimitedRows, renderOthersLabel, type TableData, type TableDataRow} from './Table.js';

const {UIStrings, i18nString} = Trace.Insights.Models.ModernHTTP;

const {html} = Lit;

export class ModernHTTP extends BaseInsightComponent<UseModernHTTPInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-modern-http`;
  override internalName = 'modern-http';

  mapToRow(req: Trace.Types.Events.SyntheticNetworkRequest): TableDataRow {
    return {values: [eventRef(req), req.args.data.protocol], overlays: [this.#createOverlayForRequest(req)]};
  }

  createAggregatedTableRow(remaining: Trace.Types.Events.SyntheticNetworkRequest[]): TableDataRow {
    return {
      values: [renderOthersLabel(remaining.length), ''],
      overlays: remaining.map(req => this.#createOverlayForRequest(req)),
    };
  }

  override getEstimatedSavingsTime(): Trace.Types.Timing.Milli|null {
    return this.model?.metricSavings?.LCP ?? null;
  }

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    return this.model?.requests.map(req => this.#createOverlayForRequest(req)) ?? [];
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    const rows = createLimitedRows(this.model.requests, this);

    if (!rows.length) {
      return html`<div class="insight-section">${i18nString(UIStrings.noOldProtocolRequests)}</div>`;
    }

    // clang-format off
    return html`
      <div class="insight-section">
        <devtools-performance-table
          .data=${{
            insight: this,
            headers: [i18nString(UIStrings.request), i18nString(UIStrings.protocol)],
            rows,
          } as TableData}>
        </devtools-performance-table>
      </div>`;
    // clang-format on
  }

  #createOverlayForRequest(request: Trace.Types.Events.SyntheticNetworkRequest): Overlays.Overlays.EntryOutline {
    return {
      type: 'ENTRY_OUTLINE',
      entry: request,
      outlineReason: 'ERROR',
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-modern-http': ModernHTTP;
  }
}

customElements.define('devtools-performance-modern-http', ModernHTTP);

// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Table.js';

import type {ModernHTTPInsightModel} from '../../../../models/trace/insights/ModernHTTP.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {eventRef} from './EventRef.js';
import {createLimitedRows, renderOthersLabel, type TableData, type TableDataRow} from './Table.js';

const {UIStrings, i18nString, createOverlayForRequest} = Trace.Insights.Models.ModernHTTP;

const {html} = Lit;

export class ModernHTTP extends BaseInsightComponent<ModernHTTPInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-modern-http`;
  override internalName = 'modern-http';

  protected override hasAskAiSupport(): boolean {
    return true;
  }

  override getEstimatedSavingsTime(): Trace.Types.Timing.Milli|null {
    return this.model?.metricSavings?.LCP ?? null;
  }

  override createOverlays(): Trace.Types.Overlays.Overlay[] {
    return this.model?.http1Requests.map(req => createOverlayForRequest(req)) ?? [];
  }

  mapToRow(req: Trace.Types.Events.SyntheticNetworkRequest): TableDataRow {
    return {values: [eventRef(req), req.args.data.protocol], overlays: [createOverlayForRequest(req)]};
  }

  createAggregatedTableRow(remaining: Trace.Types.Events.SyntheticNetworkRequest[]): TableDataRow {
    return {
      values: [renderOthersLabel(remaining.length), ''],
      overlays: remaining.map(req => createOverlayForRequest(req)),
    };
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    const rows = createLimitedRows(this.model.http1Requests, this);

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
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-modern-http': ModernHTTP;
  }
}

customElements.define('devtools-performance-modern-http', ModernHTTP);

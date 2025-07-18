// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import type {RenderBlockingInsightModel} from '../../../../models/trace/insights/RenderBlocking.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {eventRef} from './EventRef.js';
import {createLimitedRows, renderOthersLabel, type TableDataRow} from './Table.js';

const {UIStrings, i18nString, createOverlayForRequest} = Trace.Insights.Models.RenderBlocking;

const {html} = Lit;

export class RenderBlocking extends BaseInsightComponent<RenderBlockingInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-render-blocking-requests`;
  override internalName = 'render-blocking-requests';

  mapToRow(request: Trace.Types.Events.SyntheticNetworkRequest): TableDataRow {
    return {
      values: [
        eventRef(request),
        i18n.TimeUtilities.formatMicroSecondsTime(request.dur),
      ],
      overlays: [createOverlayForRequest(request)],
    };
  }

  createAggregatedTableRow(remaining: Trace.Types.Events.SyntheticNetworkRequest[]): TableDataRow {
    return {
      values: [renderOthersLabel(remaining.length), ''],
      overlays: remaining.map(r => createOverlayForRequest(r)),
    };
  }

  protected override hasAskAiSupport(): boolean {
    return !!this.model;
  }

  override getEstimatedSavingsTime(): Trace.Types.Timing.Milli|null {
    return this.model?.metricSavings?.FCP ?? null;
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    const requests = this.model.renderBlockingRequests;
    if (!requests.length) {
      return html`<div class="insight-section">${i18nString(UIStrings.noRenderBlocking)}</div>`;
    }

    const rows = createLimitedRows(requests, this);

    // clang-format off
    return html`
      <div class="insight-section">
        <devtools-performance-table
          .data=${{
            insight: this,
            headers: [i18nString(UIStrings.renderBlockingRequest), i18nString(UIStrings.duration)],
            rows,
          }}>
        </devtools-performance-table>
      </div>
    `;
    // clang-format on
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-render-blocking-requests': RenderBlocking;
  }
}

customElements.define('devtools-performance-render-blocking-requests', RenderBlocking);

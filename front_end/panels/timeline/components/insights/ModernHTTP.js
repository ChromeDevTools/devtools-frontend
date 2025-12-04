// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import './Table.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { eventRef } from './EventRef.js';
import { createLimitedRows, renderOthersLabel } from './Table.js';
const { UIStrings, i18nString, createOverlayForRequest } = Trace.Insights.Models.ModernHTTP;
const { html } = Lit;
export class ModernHTTP extends BaseInsightComponent {
    internalName = 'modern-http';
    hasAskAiSupport() {
        return true;
    }
    getEstimatedSavingsTime() {
        return this.model?.metricSavings?.LCP ?? null;
    }
    createOverlays() {
        return this.model?.http1Requests.map(req => createOverlayForRequest(req)) ?? [];
    }
    mapToRow(req) {
        return { values: [eventRef(req), req.args.data.protocol], overlays: [createOverlayForRequest(req)] };
    }
    createAggregatedTableRow(remaining) {
        return {
            values: [renderOthersLabel(remaining.length), ''],
            overlays: remaining.map(req => createOverlayForRequest(req)),
        };
    }
    renderContent() {
        if (!this.model) {
            return Lit.nothing;
        }
        const rows = createLimitedRows(this.model.http1Requests, this);
        if (!rows.length) {
            return html `<div class="insight-section">${i18nString(UIStrings.noOldProtocolRequests)}</div>`;
        }
        // clang-format off
        return html `
      <div class="insight-section">
        <devtools-performance-table
          .data=${{
            insight: this,
            headers: [i18nString(UIStrings.request), i18nString(UIStrings.protocol)],
            rows,
        }}>
        </devtools-performance-table>
      </div>`;
        // clang-format on
    }
}
//# sourceMappingURL=ModernHTTP.js.map
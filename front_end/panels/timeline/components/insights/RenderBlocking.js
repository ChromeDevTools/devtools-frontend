// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { eventRef } from './EventRef.js';
import { createLimitedRows, renderOthersLabel } from './Table.js';
const { UIStrings, i18nString, createOverlayForRequest } = Trace.Insights.Models.RenderBlocking;
const { html } = Lit;
export class RenderBlocking extends BaseInsightComponent {
    internalName = 'render-blocking-requests';
    mapToRow(request) {
        return {
            values: [
                eventRef(request),
                i18n.TimeUtilities.formatMicroSecondsTime(request.dur),
            ],
            overlays: [createOverlayForRequest(request)],
        };
    }
    createAggregatedTableRow(remaining) {
        return {
            values: [renderOthersLabel(remaining.length), ''],
            overlays: remaining.map(r => createOverlayForRequest(r)),
        };
    }
    hasAskAiSupport() {
        return !!this.model;
    }
    getEstimatedSavingsTime() {
        return this.model?.metricSavings?.FCP ?? null;
    }
    renderContent() {
        if (!this.model) {
            return Lit.nothing;
        }
        const requests = this.model.renderBlockingRequests;
        if (!requests.length) {
            return html `<div class="insight-section">${i18nString(UIStrings.noRenderBlocking)}</div>`;
        }
        const rows = createLimitedRows(requests, this);
        // clang-format off
        return html `
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
//# sourceMappingURL=RenderBlocking.js.map
// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import './Table.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { eventRef } from './EventRef.js';
import { createLimitedRows, renderOthersLabel, Table } from './Table.js';
const { UIStrings, i18nString, createOverlayForRequest } = Trace.Insights.Models.Cache;
const { html } = Lit;
const { widgetConfig } = UI.Widget;
export class Cache extends BaseInsightComponent {
    internalName = 'cache';
    hasAskAiSupport() {
        return true;
    }
    mapToRow(req) {
        return {
            values: [eventRef(req.request), i18n.TimeUtilities.secondsToString(req.ttl)],
            overlays: [createOverlayForRequest(req.request)],
        };
    }
    createAggregatedTableRow(remaining) {
        return {
            values: [renderOthersLabel(remaining.length), ''],
            overlays: remaining.flatMap(r => createOverlayForRequest(r.request)),
        };
    }
    renderContent() {
        if (!this.model) {
            return Lit.nothing;
        }
        const cacheableRequests = [...this.model.requests];
        const topRequests = cacheableRequests.sort((a, b) => b.request.args.data.decodedBodyLength - a.request.args.data.decodedBodyLength);
        const rows = createLimitedRows(topRequests, this);
        if (!rows.length) {
            return html `<div class="insight-section">${i18nString(UIStrings.noRequestsToCache)}</div>`;
        }
        // clang-format off
        return html `
      <div class="insight-section">
        <devtools-widget
          .widgetConfig=${widgetConfig(Table, {
            data: {
                insight: this,
                headers: [i18nString(UIStrings.requestColumn), i18nString(UIStrings.cacheTTL)],
                rows,
            },
        })}>
        </devtools-widget>
      </div>`;
        // clang-format on
    }
}
//# sourceMappingURL=Cache.js.map
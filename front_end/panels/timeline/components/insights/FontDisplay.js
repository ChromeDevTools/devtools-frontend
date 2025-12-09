// Copyright 2024 The Chromium Authors
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
const { UIStrings, i18nString } = Trace.Insights.Models.FontDisplay;
const { html } = Lit;
const { widgetConfig } = UI.Widget;
export class FontDisplay extends BaseInsightComponent {
    internalName = 'font-display';
    #overlayForRequest = new Map();
    hasAskAiSupport() {
        return true;
    }
    createOverlays() {
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
    mapToRow(font) {
        const overlay = this.#overlayForRequest.get(font.request);
        return {
            values: [
                eventRef(font.request, { text: font.name }),
                i18n.TimeUtilities.millisToString(font.wastedTime),
            ],
            overlays: overlay ? [overlay] : [],
        };
    }
    createAggregatedTableRow(remaining) {
        return {
            values: [renderOthersLabel(remaining.length), ''],
            overlays: remaining.map(r => this.#overlayForRequest.get(r.request)).filter(o => !!o),
        };
    }
    getEstimatedSavingsTime() {
        return this.model?.metricSavings?.FCP ?? null;
    }
    renderContent() {
        if (!this.model) {
            return Lit.nothing;
        }
        const rows = createLimitedRows(this.model.fonts, this);
        // clang-format off
        return html `
      <div class="insight-section">
        ${html `<devtools-widget .widgetConfig=${widgetConfig(Table, {
            data: {
                insight: this,
                headers: [i18nString(UIStrings.fontColumn), i18nString(UIStrings.wastedTimeColumn)],
                rows,
            }
        })}>
        </devtools-widget>`}
      </div>`;
        // clang-format on
    }
}
//# sourceMappingURL=FontDisplay.js.map
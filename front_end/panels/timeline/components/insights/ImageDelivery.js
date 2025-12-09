// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../../ui/kit/kit.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { imageRef } from './ImageRef.js';
import { createLimitedRows, renderOthersLabel, Table } from './Table.js';
const { UIStrings, i18nString, createOverlayForRequest } = Trace.Insights.Models.ImageDelivery;
const { html } = Lit;
const { widgetConfig } = UI.Widget;
export class ImageDelivery extends BaseInsightComponent {
    internalName = 'image-delivery';
    mapToRow(image) {
        return {
            values: [imageRef(image.request)],
            overlays: [createOverlayForRequest(image.request)],
        };
    }
    hasAskAiSupport() {
        return true;
    }
    createAggregatedTableRow(remaining) {
        return {
            values: [renderOthersLabel(remaining.length)],
            overlays: remaining.map(r => createOverlayForRequest(r.request)),
        };
    }
    renderContent() {
        if (!this.model) {
            return Lit.nothing;
        }
        const optimizableImages = [...this.model.optimizableImages];
        const topImages = optimizableImages.sort((a, b) => b.request.args.data.decodedBodyLength - a.request.args.data.decodedBodyLength);
        const rows = createLimitedRows(topImages, this);
        if (!rows.length) {
            return html `<div class="insight-section">${i18nString(UIStrings.noOptimizableImages)}</div>`;
        }
        // clang-format off
        return html `
      <div class="insight-section">
        <devtools-widget .widgetConfig=${widgetConfig(Table, {
            data: {
                insight: this,
                headers: [i18nString(UIStrings.optimizeFile)],
                rows,
            }
        })}>
        </devtools-widget>
      </div>
    `;
        // clang-format on
    }
}
//# sourceMappingURL=ImageDelivery.js.map
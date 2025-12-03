// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/kit/kit.js';

import type {ImageDeliveryInsightModel} from '../../../../models/trace/insights/ImageDelivery.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {imageRef} from './ImageRef.js';
import {createLimitedRows, renderOthersLabel, type TableDataRow} from './Table.js';

const {UIStrings, i18nString, createOverlayForRequest} = Trace.Insights.Models.ImageDelivery;

const {html} = Lit;

export class ImageDelivery extends BaseInsightComponent<ImageDeliveryInsightModel> {
  override internalName = 'image-delivery';

  mapToRow(image: Trace.Insights.Models.ImageDelivery.OptimizableImage): TableDataRow {
    return {
      values: [imageRef(image.request)],
      overlays: [createOverlayForRequest(image.request)],
    };
  }

  protected override hasAskAiSupport(): boolean {
    return true;
  }

  createAggregatedTableRow(remaining: Trace.Insights.Models.ImageDelivery.OptimizableImage[]): TableDataRow {
    return {
      values: [renderOthersLabel(remaining.length)],
      overlays: remaining.map(r => createOverlayForRequest(r.request)),
    };
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    const optimizableImages = [...this.model.optimizableImages];

    const topImages =
        optimizableImages.sort((a, b) => b.request.args.data.decodedBodyLength - a.request.args.data.decodedBodyLength);

    const rows = createLimitedRows(topImages, this);

    if (!rows.length) {
      return html`<div class="insight-section">${i18nString(UIStrings.noOptimizableImages)}</div>`;
    }

    // clang-format off
    return html`
      <div class="insight-section">
        <devtools-performance-table
          .data=${{
            insight: this,
            headers: [i18nString(UIStrings.optimizeFile)],
            rows,
          }}>
        </devtools-performance-table>
      </div>
    `;
    // clang-format on
  }
}

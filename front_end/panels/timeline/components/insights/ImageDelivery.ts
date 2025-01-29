// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../../ui/components/icon_button/icon_button.js';
import './Table.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type {ImageDeliveryInsightModel} from '../../../../models/trace/insights/ImageDelivery.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {imageRef} from './EventRef.js';
import type {TableDataRow} from './Table.js';

const {html} = Lit;

const UIStrings = {
  /**
   * @description Column header for a table column containing network requests for images which can improve their file size (e.g. use a different format, increase compression, etc).
   */
  optimizeFile: 'Optimize file size',
  /**
   * @description Table row value representing the remaining items not shown in the table due to size constraints. This row will always represent at least 2 items.
   * @example {5} PH1
   */
  others: '{PH1} others',
  /**
   * @description Text status indicating that no potential optimizations were found for any image file
   */
  noOptimizableImages: 'No optimizable images',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/ImageDelivery.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const MAX_REQUESTS = 10;

export class ImageDelivery extends BaseInsightComponent<ImageDeliveryInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-image-delivery`;
  override internalName: string = 'image-delivery';

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    if (!this.model) {
      return [];
    }

    const {optimizableImages} = this.model;
    return optimizableImages.map(image => this.#createOverlayForRequest(image.request));
  }

  #createOverlayForRequest(request: Trace.Types.Events.SyntheticNetworkRequest): Overlays.Overlays.EntryOutline {
    return {
      type: 'ENTRY_OUTLINE',
      entry: request,
      outlineReason: 'ERROR',
    };
  }

  override getEstimatedSavingsBytes(): number|null {
    return this.model?.totalByteSavings ?? null;
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    const optimizableImages = [...this.model.optimizableImages];

    const topImages =
        optimizableImages.sort((a, b) => b.request.args.data.decodedBodyLength - a.request.args.data.decodedBodyLength);

    const remaining = topImages.splice(MAX_REQUESTS);
    const rows: TableDataRow[] = topImages.map(image => ({
                                                 values: [imageRef(image.request)],
                                                 overlays: [this.#createOverlayForRequest(image.request)],
                                               }));

    if (remaining.length > 0) {
      const value =
          remaining.length > 1 ? i18nString(UIStrings.others, {PH1: remaining.length}) : imageRef(remaining[0].request);
      rows.push({
        values: [value],
        overlays: remaining.map(r => this.#createOverlayForRequest(r.request)),
      });
    }

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

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-image-delivery': ImageDelivery;
  }
}

customElements.define('devtools-performance-image-delivery', ImageDelivery);

// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Table.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type {FontDisplayInsightModel} from '../../../../models/trace/insights/FontDisplay.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {eventRef} from './EventRef.js';
import type {TableData} from './Table.js';

const {UIStrings, i18nString} = Trace.Insights.Models.FontDisplay;

const {html} = Lit;

export class FontDisplay extends BaseInsightComponent<FontDisplayInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-font-display`;
  override internalName = 'font-display';

  #overlayForRequest = new Map<Trace.Types.Events.SyntheticNetworkRequest, Overlays.Overlays.TimelineOverlay>();

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    this.#overlayForRequest.clear();

    if (!this.model) {
      return [];
    }

    for (const font of this.model.fonts) {
      this.#overlayForRequest.set(font.request, {
        type: 'ENTRY_OUTLINE',
        entry: font.request,
        outlineReason: font.wastedTime ? 'ERROR' : 'INFO',
      });
    }

    return [...this.#overlayForRequest.values()];
  }

  override getEstimatedSavingsTime(): Trace.Types.Timing.Milli|null {
    return this.model?.metricSavings?.FCP ?? null;
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    // clang-format off
    return html`
      <div class="insight-section">
        ${html`<devtools-performance-table
          .data=${{
            insight: this,
            headers: [i18nString(UIStrings.fontColumn), i18nString(UIStrings.wastedTimeColumn)],
            rows: this.model.fonts.map(font => ({
              values: [
                // TODO(crbug.com/369422196): the font name would be nicer here.
                eventRef(font.request),
                i18n.TimeUtilities.millisToString(font.wastedTime),
              ],
              overlays: [this.#overlayForRequest.get(font.request)],
            })),
          } as TableData}>
        </devtools-performance-table>`}
      </div>`;
    // clang-format on
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-font-display': FontDisplay;
  }
}

customElements.define('devtools-performance-font-display', FontDisplay);

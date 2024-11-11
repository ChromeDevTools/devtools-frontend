// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Table.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type {FontDisplayInsightModel} from '../../../../models/trace/insights/FontDisplay.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import {eventRef} from './EventRef.js';
import {BaseInsightComponent, shouldRenderForCategory} from './Helpers.js';
import type * as SidebarInsight from './SidebarInsight.js';
import type {TableData} from './Table.js';
import {Category} from './types.js';

const {html} = LitHtml;

const UIStrings = {
  /** Column for a font loaded by the page to render text. */
  fontColumn: 'Font',
  /** Column for the amount of time wasted. */
  wastedTimeColumn: 'Wasted time',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/FontDisplay.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class FontDisplay extends BaseInsightComponent<FontDisplayInsightModel> {
  static override readonly litTagName = LitHtml.literal`devtools-performance-font-display`;
  override insightCategory = Category.INP;
  override internalName: string = 'font-display';

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

  #render(insight: Trace.Insights.Types.InsightModels['FontDisplay']): LitHtml.LitTemplate {
    if (!this.model) {
      return LitHtml.nothing;
    }

    // clang-format off
    return html`
        <div class="insights">
            <devtools-performance-sidebar-insight .data=${{
              title: this.model.title,
              description: this.model.description,
              expanded: this.isActive(),
              internalName: this.internalName,
              estimatedSavingsTime: insight.metricSavings?.FCP,
            } as SidebarInsight.InsightDetails}
            @insighttoggleclick=${this.onSidebarClick}>
                <div slot="insight-content" class="insight-section">
                  ${html`<devtools-performance-table
                    .data=${{
                      insight: this,
                      headers: [i18nString(UIStrings.fontColumn), 'font-display', i18nString(UIStrings.wastedTimeColumn)],
                      rows: insight.fonts.map(font => ({
                        values: [
                          // TODO(crbug.com/369422196): the font name would be nicer here.
                          eventRef(font.request),
                          font.display,
                          i18n.TimeUtilities.millisToString(font.wastedTime),
                        ],
                        overlays: [this.#overlayForRequest.get(font.request)],
                      })),
                    } as TableData}>
                  </devtools-performance-table>`}
                </div>
            </devtools-performance-sidebar-insight>
        </div>`;
    // clang-format on
  }

  override render(): void {
    const model = this.model;
    const shouldShow = model && model.fonts.find(font => font.wastedTime);

    const matchesCategory = shouldRenderForCategory({
      activeCategory: this.data.activeCategory,
      insightCategory: this.insightCategory,
    });
    const output = shouldShow && matchesCategory ? this.#render(model) : LitHtml.nothing;
    LitHtml.render(output, this.shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-font-display': FontDisplay;
  }
}

customElements.define('devtools-performance-font-display', FontDisplay);

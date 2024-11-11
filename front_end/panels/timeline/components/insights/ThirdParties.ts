// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Table.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import type {ThirdPartiesInsightModel} from '../../../../models/trace/insights/ThirdParties.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent, shouldRenderForCategory} from './Helpers.js';
import {Category} from './types.js';

const {html} = LitHtml;

type ThirdPartiesEntries = Array<[
  Trace.Extras.ThirdParties.Entity,
  Trace.Extras.ThirdParties.Summary,
]>;

const UIStrings = {
  /** Label for a table column that displays the name of a third-party provider. */
  columnThirdParty: 'Third party',
  /** Label for a column in a data table; entries will be the download size of a web resource in kilobytes. */
  columnTransferSize: 'Transfer size',
  /** Label for a table column that displays how much time each row spent blocking other work on the main thread, entries will be the number of milliseconds spent. */
  columnBlockingTime: 'Blocking time',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/ThirdParties.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ThirdParties extends BaseInsightComponent<ThirdPartiesInsightModel> {
  static override readonly litTagName = LitHtml.literal`devtools-performance-third-parties`;
  override insightCategory: Category = Category.ALL;
  override internalName: string = 'third-parties';

  #overlaysForEntity = new Map<Trace.Extras.ThirdParties.Entity, Overlays.Overlays.TimelineOverlay[]>();

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    this.#overlaysForEntity.clear();

    if (!this.model) {
      return [];
    }

    const overlays: Overlays.Overlays.TimelineOverlay[] = [];
    for (const [entity, requests] of this.model.requestsByEntity) {
      if (entity === this.model.firstPartyEntity) {
        continue;
      }

      const overlaysForThisEntity = [];
      for (const request of requests) {
        const overlay: Overlays.Overlays.TimelineOverlay = {
          type: 'ENTRY_OUTLINE',
          entry: request,
          outlineReason: 'INFO',
        };
        overlaysForThisEntity.push(overlay);
        overlays.push(overlay);
      }

      this.#overlaysForEntity.set(entity, overlaysForThisEntity);
    }

    return overlays;
  }

  #render(entries: ThirdPartiesEntries): LitHtml.LitTemplate {
    if (!this.model) {
      return LitHtml.nothing;
    }

    const topTransferSizeEntries = entries.sort((a, b) => b[1].transferSize - a[1].transferSize).slice(0, 6);
    const topMainThreadTimeEntries = entries.sort((a, b) => b[1].mainThreadTime - a[1].mainThreadTime).slice(0, 6);

    // clang-format off
    return html`
        <div class="insights">
            <devtools-performance-sidebar-insight .data=${{
              title: this.model.title,
              description: this.model.description,
              internalName: this.internalName,
              expanded: this.isActive(),
            }}
            @insighttoggleclick=${this.onSidebarClick}>
                <div slot="insight-content">
                  <div class="insight-section">
                    ${html`<devtools-performance-table
                      .data=${{
                        insight: this,
                        headers: [i18nString(UIStrings.columnThirdParty), i18nString(UIStrings.columnTransferSize)],
                        rows: topTransferSizeEntries.map(([entity, summary]) => ({
                          values: [
                            entity.name,
                            i18n.ByteUtilities.bytesToString(summary.transferSize),
                          ],
                          overlays: this.#overlaysForEntity.get(entity),
                        })),
                      }}>
                    </devtools-performance-table>`}
                  </div>

                  <div class="insight-section">
                    ${html`<devtools-performance-table
                      .data=${{
                        insight: this,
                        headers: [i18nString(UIStrings.columnThirdParty), i18nString(UIStrings.columnBlockingTime)],
                        rows: topMainThreadTimeEntries.map(([entity, summary]) => ({
                          values: [
                            entity.name,
                            i18n.TimeUtilities.millisToString(Platform.Timing.microSecondsToMilliSeconds(summary.mainThreadTime)),
                          ],
                          overlays: this.#overlaysForEntity.get(entity),
                        })),
                      }}>
                    </devtools-performance-table>`}
                  </div>
                </div>
            </devtools-performance-sidebar-insight>
        </div>`;
    // clang-format on
  }

  override render(): void {
    const model = this.model;
    const entries = model && [...model.summaryByEntity.entries()].filter(kv => kv[0] !== model.firstPartyEntity);
    const shouldShow = entries?.length;

    const matchesCategory = shouldRenderForCategory({
      activeCategory: this.data.activeCategory,
      insightCategory: this.insightCategory,
    });
    const output = shouldShow && matchesCategory ? this.#render(entries) : LitHtml.nothing;
    LitHtml.render(output, this.shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-third-parties': ThirdParties;
  }
}

customElements.define('devtools-performance-third-parties', ThirdParties);

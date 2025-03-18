// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import type {ThirdPartiesInsightModel} from '../../../../models/trace/insights/ThirdParties.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {createLimitedRows, renderOthersLabel, type RowLimitAggregator} from './Table.js';

const {UIStrings, i18nString} = Trace.Insights.Models.ThirdParties;

const {html} = Lit;

const MAX_TO_SHOW = 5;

export class ThirdParties extends BaseInsightComponent<ThirdPartiesInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-third-parties`;
  override internalName = 'third-parties';

  #overlaysForEntity = new Map<Trace.Extras.ThirdParties.Entity, Overlays.Overlays.TimelineOverlay[]>();

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    this.#overlaysForEntity.clear();

    if (!this.model) {
      return [];
    }

    const overlays: Overlays.Overlays.TimelineOverlay[] = [];
    for (const [entity, events] of this.model.eventsByEntity) {
      if (entity === this.model.firstPartyEntity) {
        continue;
      }

      const overlaysForThisEntity = [];
      for (const event of events) {
        const overlay: Overlays.Overlays.TimelineOverlay = {
          type: 'ENTRY_OUTLINE',
          entry: event,
          outlineReason: 'INFO',
        };
        overlaysForThisEntity.push(overlay);
        overlays.push(overlay);
      }

      this.#overlaysForEntity.set(entity, overlaysForThisEntity);
    }

    return overlays;
  }

  #mainThreadTimeAggregator:
      RowLimitAggregator<[Trace.Extras.ThirdParties.Entity, Trace.Extras.ThirdParties.Summary]> = {
        mapToRow: ([entity, summary]) => ({
          values: [entity.name, i18n.TimeUtilities.formatMicroSecondsTime(summary.mainThreadTime)],
          overlays: this.#overlaysForEntity.get(entity),
        }),
        createAggregatedTableRow:
            remaining => {
              const totalMainThreadTime =
                  remaining.reduce((acc, [, summary]) => acc + summary.mainThreadTime, 0) as Trace.Types.Timing.Micro;
              return {
                values: [
                  renderOthersLabel(remaining.length), i18n.TimeUtilities.formatMicroSecondsTime(totalMainThreadTime)
                ],
                overlays: remaining.flatMap(([entity]) => this.#overlaysForEntity.get(entity) ?? []),
              };
            },
      };

  #transferSizeAggregator: RowLimitAggregator<[Trace.Extras.ThirdParties.Entity, Trace.Extras.ThirdParties.Summary]> = {
    mapToRow: ([entity, summary]) => ({
      values: [entity.name, i18n.ByteUtilities.bytesToString(summary.transferSize)],
      overlays: this.#overlaysForEntity.get(entity),
    }),
    createAggregatedTableRow:
        remaining => {
          const totalBytes = remaining.reduce((acc, [, summary]) => acc + summary.transferSize, 0);
          return {
            values: [renderOthersLabel(remaining.length), i18n.ByteUtilities.bytesToString(totalBytes)],
            overlays: remaining.flatMap(([entity]) => this.#overlaysForEntity.get(entity) ?? []),
          };
        },
  };

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    const entries = [...this.model.summaryByEntity.entries()].filter(kv => kv[0] !== this.model?.firstPartyEntity);
    if (!entries.length) {
      return html`<div class="insight-section">${i18nString(UIStrings.noThirdParties)}</div>`;
    }

    const topTransferSizeEntries = entries.toSorted((a, b) => b[1].transferSize - a[1].transferSize);
    const topMainThreadTimeEntries = entries.toSorted((a, b) => b[1].mainThreadTime - a[1].mainThreadTime);

    const sections = [];

    if (topTransferSizeEntries.length) {
      const rows = createLimitedRows(topTransferSizeEntries, this.#transferSizeAggregator, MAX_TO_SHOW);

      // clang-format off
      sections.push(html`
        <div class="insight-section">
          <devtools-performance-table
            .data=${{
              insight: this,
              headers: [i18nString(UIStrings.columnThirdParty), i18nString(UIStrings.columnTransferSize)],
              rows,
            }}>
          </devtools-performance-table>
        </div>
      `);
      // clang-format on
    }

    if (topMainThreadTimeEntries.length) {
      const rows = createLimitedRows(topMainThreadTimeEntries, this.#mainThreadTimeAggregator, MAX_TO_SHOW);

      // clang-format off
      sections.push(html`
        <div class="insight-section">
          <devtools-performance-table
            .data=${{
              insight: this,
              headers: [i18nString(UIStrings.columnThirdParty), i18nString(UIStrings.columnMainThreadTime)],
              rows,
            }}>
          </devtools-performance-table>
        </div>
      `);
      // clang-format on
    }

    return html`${sections}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-third-parties': ThirdParties;
  }
}

customElements.define('devtools-performance-third-parties', ThirdParties);

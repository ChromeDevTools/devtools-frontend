// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import type {CLSCulpritsInsightModel} from '../../../../models/trace/insights/CLSCulprits.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {EventReferenceClick} from './EventRef.js';

const {UIStrings, i18nString} = Trace.Insights.Models.CLSCulprits;

const {html} = Lit;

export class CLSCulprits extends BaseInsightComponent<CLSCulpritsInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-cls-culprits`;
  override internalName: string = 'cls-culprits';

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    const clustersByScore =
        this.model?.clusters.toSorted((a, b) => b.clusterCumulativeScore - a.clusterCumulativeScore) ?? [];
    const worstCluster = clustersByScore[0];
    if (!worstCluster) {
      return [];
    }

    const range = Trace.Types.Timing.Micro(worstCluster.dur ?? 0);
    const max = Trace.Types.Timing.Micro(worstCluster.ts + range);

    const label = html`<div>${i18nString(UIStrings.worstLayoutShiftCluster)}</div>`;
    return [{
      type: 'TIMESPAN_BREAKDOWN',
      sections: [
        {bounds: {min: worstCluster.ts, range, max}, label, showDuration: false},
      ],
      // This allows for the overlay to sit over the layout shift.
      entry: worstCluster.events[0],
      renderLocation: 'ABOVE_EVENT',
    }];
  }

  #clickEvent(event: Trace.Types.Events.Event): void {
    this.dispatchEvent(new EventReferenceClick(event));
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model || !this.bounds) {
      return Lit.nothing;
    }

    if (!this.model.clusters.length || !this.model.worstCluster) {
      return html`<div class="insight-section">${i18nString(UIStrings.noLayoutShifts)}</div>`;
    }

    const worstCluster = this.model.worstCluster;
    const culprits = this.model.topCulpritsByCluster.get(worstCluster) ?? [];
    if (culprits.length === 0) {
      return html`<div class="insight-section">${i18nString(UIStrings.noCulprits)}</div>`;
    }

    const ts = Trace.Types.Timing.Micro(worstCluster.ts - this.bounds.min);
    const clusterTs = i18n.TimeUtilities.formatMicroSecondsTime(ts);

    // clang-format off
    return html`
      <div class="insight-section">
        <span class="worst-cluster">${i18nString(UIStrings.worstCluster)}: <button type="button" class="timeline-link" @click=${() => this.#clickEvent(worstCluster)}>${i18nString(UIStrings.layoutShiftCluster, {PH1: clusterTs})}</button></span>
          <p class="list-title">${i18nString(UIStrings.topCulprits)}:</p>
          <ul class="worst-culprits">
            ${culprits.map(culprit => {
              return html `
                <li>${culprit}</li>
              `;
            })}
          </ul>
      </div>`;
    // clang-format on
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-cls-culprits': CLSCulprits;
  }
}

customElements.define('devtools-performance-cls-culprits', CLSCulprits);

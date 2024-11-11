// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import type {CLSCulpritsInsightModel} from '../../../../models/trace/insights/CLSCulprits.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import {EventReferenceClick} from './EventRef.js';
import {BaseInsightComponent, shouldRenderForCategory} from './Helpers.js';
import {Category} from './types.js';

const {html} = LitHtml;

const UIStrings = {
  /**
   *@description Text indicating the worst layout shift cluster.
   */
  worstLayoutShiftCluster: 'Worst layout shift cluster',
  /**
   * @description Text indicating the worst layout shift cluster.
   */
  worstCluster: 'Worst cluster',
  /**
   * @description Text indicating a layout shift cluster and its start time.
   * @example {32 ms} PH1
   */
  layoutShiftCluster: 'Layout shift cluster @ {PH1}',
  /**
   *@description Text indicating the biggest reasons for the layout shifts.
   */
  topCulprits: 'Top layout shift culprits',
  /**
   * @description Text for a culprit type of Injected iframe.
   */
  injectedIframe: 'Injected iframe',
  /**
   * @description Text for a culprit type of Font request.
   */
  fontRequest: 'Font request',
  /**
   * @description Text for a culprit type of Animation.
   */
  animation: 'Animation',
  /**
   * @description Text for a culprit type of Unsized images.
   */
  unsizedImages: 'Unsized Images',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/CLSCulprits.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class CLSCulprits extends BaseInsightComponent<CLSCulpritsInsightModel> {
  static override readonly litTagName = LitHtml.literal`devtools-performance-cls-culprits`;
  override insightCategory: Category = Category.CLS;
  override internalName: string = 'cls-culprits';

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    const clustersByScore =
        this.model?.clusters.toSorted((a, b) => b.clusterCumulativeScore - a.clusterCumulativeScore) ?? [];
    const worstCluster = clustersByScore[0];
    if (!worstCluster) {
      return [];
    }

    const range = Trace.Types.Timing.MicroSeconds(worstCluster.dur ?? 0);
    const max = Trace.Types.Timing.MicroSeconds(worstCluster.ts + range);

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

  /**
   * getTopCulprits gets the top 3 shift root causes based on worst cluster.
   */
  getTopCulprits(
      cluster: Trace.Types.Events.SyntheticLayoutShiftCluster,
      culpritsByShift:
          Map<Trace.Types.Events.LayoutShift, Trace.Insights.Models.CLSCulprits.LayoutShiftRootCausesData>): string[] {
    const MAX_TOP_CULPRITS = 3;
    const causes: Array<string> = [];
    if (causes.length === MAX_TOP_CULPRITS) {
      return causes;
    }
    const shifts = cluster.events;
    for (const shift of shifts) {
      if (causes.length === MAX_TOP_CULPRITS) {
        break;
      }

      const culprits = culpritsByShift.get(shift);
      if (!culprits) {
        continue;
      }
      const fontReq = culprits.fontRequests;
      const iframes = culprits.iframeIds;
      const animations = culprits.nonCompositedAnimations;
      const unsizedImages = culprits.unsizedImages;

      for (let i = 0; i < fontReq.length && causes.length < MAX_TOP_CULPRITS; i++) {
        causes.push(i18nString(UIStrings.fontRequest));
      }
      for (let i = 0; i < iframes.length && causes.length < MAX_TOP_CULPRITS; i++) {
        causes.push(i18nString(UIStrings.injectedIframe));
      }
      for (let i = 0; i < animations.length && causes.length < MAX_TOP_CULPRITS; i++) {
        causes.push(i18nString(UIStrings.animation));
      }
      for (let i = 0; i < unsizedImages.length && causes.length < MAX_TOP_CULPRITS; i++) {
        causes.push(i18nString(UIStrings.unsizedImages));
      }
    }
    return causes.slice(0, MAX_TOP_CULPRITS);
  }

  #clickEvent(event: Trace.Types.Events.Event): void {
    this.dispatchEvent(new EventReferenceClick(event));
  }

  #render(culprits: Array<string>, worstCluster: Trace.Types.Events.SyntheticLayoutShiftCluster): LitHtml.LitTemplate {
    if (!this.model) {
      return LitHtml.nothing;
    }

    const ts = Trace.Types.Timing.MicroSeconds(worstCluster.ts - (this.data.parsedTrace?.Meta.traceBounds.min ?? 0));
    const clusterTs = i18n.TimeUtilities.formatMicroSecondsTime(ts);

    // TODO(crbug.com/369102516): use Table for hover/click ux.
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
                <div slot="insight-content" class="insight-section">
                  <span class="worst-cluster">${i18nString(UIStrings.worstCluster)}: <button type="button" class="timeline-link" @click=${() => this.#clickEvent(worstCluster)}>${i18nString(UIStrings.layoutShiftCluster, {PH1: clusterTs})}</button></span>
                    <p>${i18nString(UIStrings.topCulprits)}:</p>
                        ${culprits.map(culprit => {
                          return html `
                            <li>${culprit}</li>
                          `;
                        })}
                </div>
            </devtools-performance-sidebar-insight>
        </div>`;
              // clang-format on
  }

  override render(): void {
    if (!this.model) {
      return;
    }

    const culpritsByShift = this.model.shifts;
    const clusters = this.model.clusters ?? [];
    if (!clusters.length || !this.model.worstCluster) {
      return;
    }

    const causes = this.getTopCulprits(this.model.worstCluster, culpritsByShift);

    const hasCulprits = causes.length > 0;

    const matchesCategory = shouldRenderForCategory({
      activeCategory: this.data.activeCategory,
      insightCategory: this.insightCategory,
    });
    const output = hasCulprits && matchesCategory ? this.#render(causes, this.model.worstCluster) : LitHtml.nothing;
    LitHtml.render(output, this.shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-cls-culprits': CLSCulprits;
  }
}

customElements.define('devtools-performance-cls-culprits', CLSCulprits);

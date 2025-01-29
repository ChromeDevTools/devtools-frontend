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

const {html} = Lit;

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
  /**
   * @description Text status when there were no layout shifts detected.
   */
  noLayoutShifts: 'No layout shifts',
  /**
   * @description Text status when there no layout shifts culprits/root causes were found.
   */
  noCulprits: 'Could not detect any layout shift culprits',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/CLSCulprits.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

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

  /**
   * getTopCulprits gets the top 3 shift root causes based on worst cluster.
   */
  getTopCulprits(
      cluster: Trace.Types.Events.SyntheticLayoutShiftCluster,
      culpritsByShift:
          Map<Trace.Types.Events.SyntheticLayoutShift, Trace.Insights.Models.CLSCulprits.LayoutShiftRootCausesData>):
      string[] {
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

  override renderContent(): Lit.LitTemplate {
    if (!this.model || !this.bounds) {
      return Lit.nothing;
    }

    if (!this.model.clusters.length || !this.model.worstCluster) {
      return html`<div class="insight-section">${i18nString(UIStrings.noLayoutShifts)}</div>`;
    }

    const worstCluster = this.model.worstCluster;
    const culpritsByShift = this.model.shifts;

    // TODO: getTopCulprits needs to move to model.
    const culprits = this.getTopCulprits(worstCluster, culpritsByShift);
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

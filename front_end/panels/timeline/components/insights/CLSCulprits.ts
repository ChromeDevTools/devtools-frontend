// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './NodeLink.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type {CLSCulpritsInsightModel} from '../../../../models/trace/insights/CLSCulprits.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {EventReferenceClick} from './EventRef.js';
import type * as NodeLink from './NodeLink.js';

const {UIStrings, i18nString} = Trace.Insights.Models.CLSCulprits;

const {html} = Lit;

export class CLSCulprits extends BaseInsightComponent<CLSCulpritsInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-cls-culprits`;
  override internalName = 'cls-culprits';

  protected override hasAskAiSupport(): boolean {
    return true;
  }

  override createOverlays(): Trace.Types.Overlays.Overlay[] {
    if (!this.model) {
      return [];
    }

    const overlays = this.model.createOverlays?.();
    if (!overlays) {
      return [];
    }

    const timespanOverlaySection = overlays.find(overlay => overlay.type === 'TIMESPAN_BREAKDOWN')?.sections[0];
    if (timespanOverlaySection) {
      timespanOverlaySection.label = html`<div>${i18nString(UIStrings.worstLayoutShiftCluster)}</div>`;
    }

    return overlays;
  }

  #clickEvent(event: Trace.Types.Events.Event): void {
    this.dispatchEvent(new EventReferenceClick(event));
  }

  #renderCulpritsSection(culprits: Trace.Insights.Models.CLSCulprits.LayoutShiftItem[]): Lit.LitTemplate {
    if (culprits.length === 0) {
      return html`<div class="insight-section">${i18nString(UIStrings.noCulprits)}</div>`;
    }

    // clang-format off
    return html`
      <div class="insight-section">
        <p class="list-title">${i18nString(UIStrings.topCulprits)}:</p>
        <ul class="worst-culprits">
          ${culprits.map(culprit => {
            if (culprit.type === Trace.Insights.Models.CLSCulprits.LayoutShiftType.UNSIZED_IMAGE) {
              return html`
                <li>
                  ${culprit.description}
                  <devtools-performance-node-link
                    .data=${{
                      backendNodeId: culprit.backendNodeId,
                      frame: culprit.frame,
                      fallbackUrl: culprit.url,
                    } as NodeLink.NodeLinkData}>
                  </devtools-performance-node-link>
                </li>`;
            }

            return html `<li>${culprit.description}</li>`;
          })}
        </ul>
      </div>`;
    // clang-format on
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

    const ts = Trace.Types.Timing.Micro(worstCluster.ts - this.bounds.min);
    const clusterTs = i18n.TimeUtilities.formatMicroSecondsTime(ts);

    // clang-format off
    return html`
      <div class="insight-section">
        <span class="worst-cluster">${i18nString(UIStrings.worstCluster)}: <button type="button" class="timeline-link" @click=${() => this.#clickEvent(worstCluster)}>${i18nString(UIStrings.layoutShiftCluster, {PH1: clusterTs})}</button></span>
      </div>
      ${this.#renderCulpritsSection(culprits)}
    `;
    // clang-format on
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-cls-culprits': CLSCulprits;
  }
}

customElements.define('devtools-performance-cls-culprits', CLSCulprits);

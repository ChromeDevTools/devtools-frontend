// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import './NodeLink.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { EventReferenceClick } from './EventRef.js';
const { UIStrings, i18nString } = Trace.Insights.Models.CLSCulprits;
const { html } = Lit;
export class CLSCulprits extends BaseInsightComponent {
    static litTagName = Lit.StaticHtml.literal `devtools-performance-cls-culprits`;
    internalName = 'cls-culprits';
    hasAskAiSupport() {
        return true;
    }
    createOverlays() {
        if (!this.model) {
            return [];
        }
        return this.model.createOverlays?.() ?? [];
    }
    #clickEvent(event) {
        this.dispatchEvent(new EventReferenceClick(event));
    }
    #renderCulpritsSection(culprits) {
        if (culprits.length === 0) {
            return html `<div class="insight-section">${i18nString(UIStrings.noCulprits)}</div>`;
        }
        // clang-format off
        return html `
      <div class="insight-section">
        <p class="list-title">${i18nString(UIStrings.topCulprits)}:</p>
        <ul class="worst-culprits">
          ${culprits.map(culprit => {
            if (culprit.type === 3 /* Trace.Insights.Models.CLSCulprits.LayoutShiftType.UNSIZED_IMAGE */) {
                return html `
                <li>
                  ${culprit.description}
                  <devtools-performance-node-link
                    .data=${{
                    backendNodeId: culprit.backendNodeId,
                    frame: culprit.frame,
                    fallbackUrl: culprit.url,
                }}>
                  </devtools-performance-node-link>
                </li>`;
            }
            return html `<li>${culprit.description}</li>`;
        })}
        </ul>
      </div>`;
        // clang-format on
    }
    renderContent() {
        if (!this.model || !this.bounds) {
            return Lit.nothing;
        }
        if (!this.model.clusters.length || !this.model.worstCluster) {
            return html `<div class="insight-section">${i18nString(UIStrings.noLayoutShifts)}</div>`;
        }
        const worstCluster = this.model.worstCluster;
        const culprits = this.model.topCulpritsByCluster.get(worstCluster) ?? [];
        const ts = Trace.Types.Timing.Micro(worstCluster.ts - this.bounds.min);
        const clusterTs = i18n.TimeUtilities.formatMicroSecondsTime(ts);
        // clang-format off
        return html `
      <div class="insight-section">
        <span class="worst-cluster">${i18nString(UIStrings.worstCluster)}: <button type="button" class="timeline-link" @click=${() => this.#clickEvent(worstCluster)}>${i18nString(UIStrings.layoutShiftCluster, { PH1: clusterTs })}</button></span>
      </div>
      ${this.#renderCulpritsSection(culprits)}
    `;
        // clang-format on
    }
}
customElements.define('devtools-performance-cls-culprits', CLSCulprits);
//# sourceMappingURL=CLSCulprits.js.map
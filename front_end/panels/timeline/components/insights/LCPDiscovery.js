// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import './Checklist.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as uiI18n from '../../../../ui/i18n/i18n.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { imageRef } from './ImageRef.js';
const { UIStrings, i18nString, getImageData } = Trace.Insights.Models.LCPDiscovery;
const { html } = Lit;
// eslint-disable-next-line @devtools/l10n-filename-matches
const str_ = i18n.i18n.registerUIStrings('models/trace/insights/LCPDiscovery.ts', UIStrings);
export class LCPDiscovery extends BaseInsightComponent {
    static litTagName = Lit.StaticHtml.literal `devtools-performance-lcp-discovery`;
    internalName = 'lcp-discovery';
    hasAskAiSupport() {
        return true;
    }
    createOverlays() {
        if (!this.model) {
            return [];
        }
        const overlays = this.model.createOverlays?.();
        if (!overlays) {
            return [];
        }
        const imageResults = getImageData(this.model);
        if (!imageResults?.discoveryDelay) {
            return [];
        }
        const timespanOverlaySection = overlays.find(overlay => overlay.type === 'TIMESPAN_BREAKDOWN')?.sections[0];
        if (timespanOverlaySection) {
            timespanOverlaySection.label = this.#renderDiscoveryDelay(imageResults.discoveryDelay);
        }
        return overlays;
    }
    getEstimatedSavingsTime() {
        if (!this.model) {
            return null;
        }
        return getImageData(this.model)?.estimatedSavings ?? null;
    }
    #renderDiscoveryDelay(delay) {
        const timeWrapper = document.createElement('span');
        timeWrapper.classList.add('discovery-time-ms');
        timeWrapper.innerText = i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(delay);
        return uiI18n.getFormatLocalizedString(str_, UIStrings.lcpLoadDelay, { PH1: timeWrapper });
    }
    renderContent() {
        if (!this.model) {
            return Lit.nothing;
        }
        const imageData = getImageData(this.model);
        if (!imageData) {
            if (!this.model.lcpEvent) {
                return html `<div class="insight-section">${i18nString(UIStrings.noLcp)}</div>`;
            }
            return html `<div class="insight-section">${i18nString(UIStrings.noLcpResource)}</div>`;
        }
        let delayEl;
        if (imageData.discoveryDelay) {
            delayEl = html `<div>${this.#renderDiscoveryDelay(imageData.discoveryDelay)}</div>`;
        }
        // clang-format off
        return html `
      <div class="insight-section">
        <devtools-performance-checklist class="insight-section" .checklist=${imageData.checklist}></devtools-performance-checklist>
        <div class="insight-section">${imageRef(imageData.request)}${delayEl}</div>
      </div>`;
        // clang-format on
    }
}
customElements.define('devtools-performance-lcp-discovery', LCPDiscovery);
//# sourceMappingURL=LCPDiscovery.js.map
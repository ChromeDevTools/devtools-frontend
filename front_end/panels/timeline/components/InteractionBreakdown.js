// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as i18n from '../../../core/i18n/i18n.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Lit from '../../../ui/lit/lit.js';
import interactionBreakdownStyles from './interactionBreakdown.css.js';
const { html } = Lit;
const UIStrings = {
    /**
     * @description Text shown next to the interaction event's input delay time in the detail view.
     */
    inputDelay: 'Input delay',
    /**
     * @description Text shown next to the interaction event's thread processing duration in the detail view.
     */
    processingDuration: 'Processing duration',
    /**
     * @description Text shown next to the interaction event's presentation delay time in the detail view.
     */
    presentationDelay: 'Presentation delay',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/InteractionBreakdown.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class InteractionBreakdown extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #entry = null;
    set entry(entry) {
        if (entry === this.#entry) {
            return;
        }
        this.#entry = entry;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    #render() {
        if (!this.#entry) {
            return;
        }
        const inputDelay = i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(this.#entry.inputDelay);
        const mainThreadTime = i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(this.#entry.mainThreadHandling);
        const presentationDelay = i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(this.#entry.presentationDelay);
        Lit.render(html `<style>${interactionBreakdownStyles}</style>
             <ul class="breakdown">
                     <li data-entry="input-delay">${i18nString(UIStrings.inputDelay)}<span class="value">${inputDelay}</span></li>
                     <li data-entry="processing-duration">${i18nString(UIStrings.processingDuration)}<span class="value">${mainThreadTime}</span></li>
                     <li data-entry="presentation-delay">${i18nString(UIStrings.presentationDelay)}<span class="value">${presentationDelay}</span></li>
                   </ul>
                   `, this.#shadow, { host: this });
    }
}
customElements.define('devtools-interaction-breakdown', InteractionBreakdown);
//# sourceMappingURL=InteractionBreakdown.js.map
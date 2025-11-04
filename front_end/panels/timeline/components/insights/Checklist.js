// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
/**
 * @file A list of pass/fail conditions for an insight.
 */
import '../../../../ui/components/icon_button/icon_button.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as Lit from '../../../../ui/lit/lit.js';
import checklistStyles from './checklist.css.js';
const UIStrings = {
    /**
     * @description Text for a screen-reader label to tell the user that the icon represents a successful insight check
     * @example {Server response time} PH1
     */
    successAriaLabel: 'Insight check passed: {PH1}',
    /**
     * @description Text for a screen-reader label to tell the user that the icon represents an unsuccessful insight check
     * @example {Server response time} PH1
     */
    failedAriaLabel: 'Insight check failed: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/Checklist.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { html } = Lit;
export class Checklist extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #checklist;
    set checklist(checklist) {
        this.#checklist = checklist;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    connectedCallback() {
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    #getIcon(check) {
        const icon = check.value ? 'check-circle' : 'clear';
        const ariaLabel = check.value ? i18nString(UIStrings.successAriaLabel, { PH1: check.label }) :
            i18nString(UIStrings.failedAriaLabel, { PH1: check.label });
        return html `
        <devtools-icon
          aria-label=${ariaLabel}
          name=${icon}
          class=${check.value ? 'check-passed' : 'check-failed'}
        ></devtools-icon>
      `;
    }
    async #render() {
        if (!this.#checklist) {
            return;
        }
        Lit.render(html `
          <style>${checklistStyles}</style>
          <ul>
            ${Object.values(this.#checklist).map(check => html `<li>
                ${this.#getIcon(check)}
                <span data-checklist-label>${check.label}</span>
            </li>`)}
          </ul>`, this.#shadow, { host: this });
    }
}
customElements.define('devtools-performance-checklist', Checklist);
//# sourceMappingURL=Checklist.js.map
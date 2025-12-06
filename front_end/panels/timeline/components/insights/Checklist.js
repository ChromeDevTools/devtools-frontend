// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A list of pass/fail conditions for an insight.
 */
import '../../../../ui/kit/kit.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import checklistStyles from './checklist.css.js';
const { html } = Lit;
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
export const DEFAULT_VIEW = (input, output, target) => {
    const { checklist, } = input;
    function getIcon(check) {
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
    // clang-format off
    Lit.render(html `
    <style>${checklistStyles}</style>
    <ul>
      ${Object.values(checklist).map(check => html `<li>
          ${getIcon(check)}
          <span data-checklist-label>${check.label}</span>
      </li>`)}
    </ul>
  `, target);
    // clang-format on
};
export class Checklist extends UI.Widget.Widget {
    #view;
    #checklist;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
    }
    set checklist(checklist) {
        this.#checklist = checklist;
        this.requestUpdate();
    }
    performUpdate() {
        if (!this.#checklist) {
            return;
        }
        const input = {
            checklist: this.#checklist,
        };
        this.#view(input, undefined, this.contentElement);
    }
}
//# sourceMappingURL=Checklist.js.map
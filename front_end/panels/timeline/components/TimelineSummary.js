// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import timelineSummaryStyles from './timelineSummary.css.js';
const { render, html } = Lit;
const UIStrings = {
    /**
     * @description Text for total
     */
    total: 'Total',
    /**
     * @description Range in Timeline Details View's Summary
     * @example {1ms} PH1
     * @example {10ms} PH2
     */
    rangeSS: 'Range:  {PH1} – {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/TimelineSummary.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const CATEGORY_SUMMARY_DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
        <style>${timelineSummaryStyles}</style>
        <style>@scope to (devtools-widget > *) { ${UI.inspectorCommonStyles} }</style>
        <style>@scope to (devtools-widget > *) { ${Buttons.textButtonStyles} }</style>
        <div class="timeline-summary">
            <div class="summary-range">${i18nString(UIStrings.rangeSS, { PH1: i18n.TimeUtilities.millisToString(input.rangeStart), PH2: i18n.TimeUtilities.millisToString(input.rangeEnd) })}</div>
            <div class="category-summary">
                ${input.categories.map(category => {
        return html `
                        <div class="category-row">
                        <div class="category-swatch" style="background-color: ${category.color};"></div>
                        <div class="category-name">${category.title}</div>
                        <div class="category-value">
                            ${i18n.TimeUtilities.preciseMillisToString(category.value)}
                            <div class="background-bar-container">
                                <div class="background-bar" style='width: ${(category.value * 100 / input.total).toFixed(1)}%;'></div>
                            </div>
                        </div>
                        </div>`;
    })}
                <div class="category-row">
                    <div class="category-swatch"></div>
                    <div class="category-name">${i18nString(UIStrings.total)}</div>
                    <div class="category-value">
                        ${i18n.TimeUtilities.preciseMillisToString(input.total)}
                        <div class="background-bar-container">
                            <div class="background-bar"></div>
                        </div>
                    </div>
                </div>
              </div>
        </div>
        </div>

      </div>`, target);
    // clang-format on
};
export class CategorySummary extends UI.Widget.Widget {
    #view;
    #rangeStart = 0;
    #rangeEnd = 0;
    #total = 0;
    #categories = [];
    constructor(view) {
        super();
        this.#view = view ?? CATEGORY_SUMMARY_DEFAULT_VIEW;
        this.requestUpdate();
    }
    set total(total) {
        this.#total = total;
        this.requestUpdate();
    }
    set rangeStart(rangeStart) {
        this.#rangeStart = rangeStart;
        this.requestUpdate();
    }
    set rangeEnd(rangeEnd) {
        this.#rangeEnd = rangeEnd;
        this.requestUpdate();
    }
    set categories(categories) {
        this.#categories = categories;
        this.requestUpdate();
    }
    performUpdate() {
        const viewInput = {
            rangeStart: this.#rangeStart,
            rangeEnd: this.#rangeEnd,
            total: this.#total,
            categories: this.#categories,
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
}
//# sourceMappingURL=TimelineSummary.js.map
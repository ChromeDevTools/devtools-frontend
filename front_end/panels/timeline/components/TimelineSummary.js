// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as i18n from '../../../core/i18n/i18n.js';
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
export class CategorySummary extends HTMLElement {
    #shadow = UI.UIUtils.createShadowRootWithCoreStyles(this, { cssFile: timelineSummaryStyles, delegatesFocus: undefined });
    #rangeStart = 0;
    #rangeEnd = 0;
    #total = 0;
    #categories = [];
    set data(data) {
        this.#total = data.total;
        this.#categories = data.categories;
        this.#rangeStart = data.rangeStart;
        this.#rangeEnd = data.rangeEnd;
        this.#render();
    }
    #render() {
        // clang-format off
        const output = html `
          <div class="timeline-summary">
              <div class="summary-range">${i18nString(UIStrings.rangeSS, { PH1: i18n.TimeUtilities.millisToString(this.#rangeStart), PH2: i18n.TimeUtilities.millisToString(this.#rangeEnd) })}</div>
              <div class="category-summary">
                  ${this.#categories.map(category => {
            return html `
                          <div class="category-row">
                          <div class="category-swatch" style="background-color: ${category.color};"></div>
                          <div class="category-name">${category.title}</div>
                          <div class="category-value">
                              ${i18n.TimeUtilities.preciseMillisToString(category.value)}
                              <div class="background-bar-container">
                                  <div class="background-bar" style='width: ${(category.value * 100 / this.#total).toFixed(1)}%;'></div>
                              </div>
                          </div>
                          </div>`;
        })}
                  <div class="category-row">
                      <div class="category-swatch"></div>
                      <div class="category-name">${i18nString(UIStrings.total)}</div>
                      <div class="category-value">
                          ${i18n.TimeUtilities.preciseMillisToString(this.#total)}
                          <div class="background-bar-container">
                              <div class="background-bar"></div>
                          </div>
                      </div>
                  </div>
                </div>
          </div>
          </div>

        </div>`;
        // clang-format on
        render(output, this.#shadow, { host: this });
    }
}
customElements.define('devtools-performance-timeline-summary', CategorySummary);
//# sourceMappingURL=TimelineSummary.js.map
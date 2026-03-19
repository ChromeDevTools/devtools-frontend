// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import timelineRangeSummaryViewStyles from './timelineRangeSummaryView.css.js';
import * as TimelineSummary from './TimelineSummary.js';
const { render, html } = Lit;
const { widget } = UI.Widget;
export const TIMELINE_RANGE_SUMMARY_VIEW_DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <style>${timelineRangeSummaryViewStyles}</style>
    <div class="timeline-details-range-summary">
      <devtools-widget class="timeline-summary"
        ${widget(TimelineSummary.CategorySummary, {
        data: {
            rangeStart: input.rangeStart,
            rangeEnd: input.rangeEnd,
            categories: input.categories,
            total: input.total,
        }
    })}
      ></devtools-widget>
      ${input.thirdPartyTreeTemplate ?? Lit.nothing}
    </div>
  `, target);
    // clang-format on
};
export class TimelineRangeSummaryView extends UI.Widget.Widget {
    #view;
    #summaryData;
    constructor(element, view = TIMELINE_RANGE_SUMMARY_VIEW_DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
        this.requestUpdate();
    }
    set data(data) {
        this.#summaryData = data;
        this.requestUpdate();
    }
    performUpdate() {
        if (!this.#summaryData) {
            return;
        }
        this.#view(this.#summaryData, undefined, this.contentElement);
    }
}
//# sourceMappingURL=TimelineRangeSummaryView.js.map
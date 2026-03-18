// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';

import timelineRangeSummaryViewStyles from './timelineRangeSummaryView.css.js';
import * as TimelineSummary from './TimelineSummary.js';

const {render, html} = Lit;
const {widget} = UI.Widget;

export interface TimelineRangeSummaryViewData {
  rangeStart: number;
  rangeEnd: number;
  total: number;
  categories: TimelineSummary.CategoryData[];
  thirdPartyTreeTemplate?: Lit.LitTemplate;
}

type View = (input: TimelineRangeSummaryViewData, output: undefined, target: HTMLElement) => void;

export const TIMELINE_RANGE_SUMMARY_VIEW_DEFAULT_VIEW: View = (input, _output, target): void => {
  // clang-format off
  render(html`
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
  #view: View;
  #summaryData?: TimelineRangeSummaryViewData;

  constructor(element?: HTMLElement, view: View = TIMELINE_RANGE_SUMMARY_VIEW_DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
    this.requestUpdate();
  }

  set data(data: TimelineRangeSummaryViewData) {
    this.#summaryData = data;
    this.requestUpdate();
  }

  override performUpdate(): void {
    if (!this.#summaryData) {
      return;
    }
    this.#view(this.#summaryData, undefined, this.contentElement);
  }
}

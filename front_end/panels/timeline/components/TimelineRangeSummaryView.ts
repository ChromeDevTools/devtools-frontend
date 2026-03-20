// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';

import timelineRangeSummaryViewStyles from './timelineRangeSummaryView.css.js';
import * as TimelineSummary from './TimelineSummary.js';

const {render, html} = Lit;
const {widget} = UI.Widget;

const categoryBreakdownCacheSymbol = Symbol('categoryBreakdownCache');

export interface TimelineRangeSummaryViewData {
  events: Trace.Types.Events.Event[];
  startTime: Trace.Types.Timing.Milli;
  endTime: Trace.Types.Timing.Milli;
  parsedTrace: Trace.TraceModel.ParsedTrace|null;
  thirdPartyTreeTemplate: Lit.TemplateResult|null;
}

type View = (input: TimelineRangeSummaryViewData, output: undefined, target: HTMLElement) => void;
type TimeRangeCategoryStats = Record<string, number>;

export const TIMELINE_RANGE_SUMMARY_VIEW_DEFAULT_VIEW: View = (input, _output, target): void => {
  const {parsedTrace, events, startTime, endTime} = input;
  if (!events || !parsedTrace) {
    render(html`<div class="timeline-details-range-summary"></div>`, target);
    return;
  }

  const minBoundsMilli = Trace.Helpers.Timing.microToMilli(parsedTrace.data.Meta.traceBounds.min);
  const aggregatedStats = statsForTimeRange(events, startTime, endTime);
  const startOffset = startTime - minBoundsMilli;
  const endOffset = endTime - minBoundsMilli;

  let total = 0;
  for (const categoryName in aggregatedStats) {
    total += aggregatedStats[categoryName];
  }

  const categories: TimelineSummary.CategoryData[] = [];
  for (const categoryName in Trace.Styles.getCategoryStyles()) {
    const category = Trace.Styles.getCategoryStyles()[categoryName as keyof Trace.Styles.CategoryPalette];
    if (category.name === Trace.Styles.EventCategory.IDLE) {
      continue;
    }
    const value = aggregatedStats[category.name];
    if (!value) {
      continue;
    }
    categories.push({value, color: category.getCSSValue(), title: category.title});
  }
  categories.sort((a, b) => b.value - a.value);

  // clang-format off
  render(html`
    <style>${timelineRangeSummaryViewStyles}</style>
    <div class="timeline-details-range-summary">
      <devtools-widget class="timeline-summary"
        ${widget(TimelineSummary.CategorySummary, {
          data: {
            rangeStart: startOffset,
            rangeEnd: endOffset,
            categories,
            total,
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

export function statsForTimeRange(
    events: Trace.Types.Events.Event[], startTime: Trace.Types.Timing.Milli,
    endTime: Trace.Types.Timing.Milli): TimeRangeCategoryStats {
  if (!events.length) {
    return {idle: endTime - startTime};
  }

  buildRangeStatsCacheIfNeeded(events);
  const aggregatedStats = subtractStats(aggregatedStatsAtTime(endTime), aggregatedStatsAtTime(startTime));
  const aggregatedTotal = Object.values(aggregatedStats).reduce((a, b) => a + b, 0);
  aggregatedStats['idle'] = Math.max(0, endTime - startTime - aggregatedTotal);
  return aggregatedStats;

  function aggregatedStatsAtTime(time: number): TimeRangeCategoryStats {
    const stats: TimeRangeCategoryStats = {};
    // @ts-expect-error TODO(crbug.com/1011811): Remove symbol usage.
    const cache = events[categoryBreakdownCacheSymbol];
    for (const category in cache) {
      const categoryCache = cache[category];
      const index =
          Platform.ArrayUtilities.upperBound(categoryCache.time, time, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
      let value;
      if (index === 0) {
        value = 0;
      } else if (index === categoryCache.time.length) {
        value = categoryCache.value[categoryCache.value.length - 1];
      } else {
        const t0 = categoryCache.time[index - 1];
        const t1 = categoryCache.time[index];
        const v0 = categoryCache.value[index - 1];
        const v1 = categoryCache.value[index];
        value = v0 + (v1 - v0) * (time - t0) / (t1 - t0);
      }
      stats[category] = value;
    }
    return stats;
  }

  function subtractStats(a: TimeRangeCategoryStats, b: TimeRangeCategoryStats): TimeRangeCategoryStats {
    const result = Object.assign({}, a);
    for (const key in b) {
      result[key] -= b[key];
    }
    return result;
  }

  function buildRangeStatsCacheIfNeeded(events: Trace.Types.Events.Event[]): void {
    // @ts-expect-error TODO(crbug.com/1011811): Remove symbol usage.
    if (events[categoryBreakdownCacheSymbol]) {
      return;
    }

    // aggregatedStats is a map by categories. For each category there's an array
    // containing sorted time points which records accumulated value of the category.
    const aggregatedStats: Record<string, {
      time: number[],
      value: number[],
    }> = {};
    const categoryStack: string[] = [];
    let lastTime = 0;
    Trace.Helpers.Trace.forEachEvent(events, {
      onStartEvent,
      onEndEvent,
    });

    function updateCategory(category: string, time: number): void {
      let statsArrays: {
        time: number[],
        value: number[],
      } = aggregatedStats[category];
      if (!statsArrays) {
        statsArrays = {time: [], value: []};
        aggregatedStats[category] = statsArrays;
      }
      if (statsArrays.time.length && statsArrays.time[statsArrays.time.length - 1] === time || lastTime > time) {
        return;
      }
      const lastValue = statsArrays.value.length > 0 ? statsArrays.value[statsArrays.value.length - 1] : 0;
      statsArrays.value.push(lastValue + time - lastTime);
      statsArrays.time.push(time);
    }

    function categoryChange(from: string|null, to: string|null, time: number): void {
      if (from) {
        updateCategory(from, time);
      }
      lastTime = time;
      if (to) {
        updateCategory(to, time);
      }
    }

    function onStartEvent(e: Trace.Types.Events.Event): void {
      const {startTime} = Trace.Helpers.Timing.eventTimingsMilliSeconds(e);
      const category = Trace.Styles.getEventStyle(e.name as Trace.Types.Events.Name)?.category.name ||
          Trace.Styles.getCategoryStyles().other.name;
      const parentCategory = categoryStack.length ? categoryStack[categoryStack.length - 1] : null;
      if (category !== parentCategory) {
        categoryChange(parentCategory || null, category, startTime);
      }
      categoryStack.push(category);
    }

    function onEndEvent(e: Trace.Types.Events.Event): void {
      const {endTime} = Trace.Helpers.Timing.eventTimingsMilliSeconds(e);
      const category = categoryStack.pop();
      const parentCategory = categoryStack.length ? categoryStack[categoryStack.length - 1] : null;
      if (category !== parentCategory) {
        categoryChange(category || null, parentCategory || null, endTime || 0);
      }
    }

    const obj = (events as Object);
    // @ts-expect-error TODO(crbug.com/1011811): Remove symbol usage.
    obj[categoryBreakdownCacheSymbol] = aggregatedStats;
  }
}

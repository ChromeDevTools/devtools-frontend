// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Handlers from '../handlers/handlers.js';
import type {SelectorStatsData} from '../handlers/SelectorStatsHandler.js';
import * as Helpers from '../helpers/helpers.js';
import {type SelectorTiming, SelectorTimingsKey} from '../types/TraceEvents.js';
import * as Types from '../types/types.js';

import {
  InsightCategory,
  InsightKeys,
  type InsightModel,
  type InsightSetContext,
  type PartialInsightModel,
} from './types.js';

export const UIStrings = {
  /**
   * @description Title of an insight that provides details about slow CSS selectors.
   */
  title: 'CSS Selector costs',

  /**
   * @description Text to describe how to improve the performance of CSS selectors.
   */
  description:
      'If Recalculate Style costs remain high, selector optimization can reduce them. [Optimize the selectors](https://developer.chrome.com/docs/devtools/performance/selector-stats) with both high elapsed time and high slow-path %. Simpler selectors, fewer selectors, a smaller DOM, and a shallower DOM will all reduce matching costs.',
  /**
   * @description Column name for count of elements that the engine attempted to match against a style rule
   */
  matchAttempts: 'Match attempts',
  /**
   * @description Column name for count of elements that matched a style rule
   */
  matchCount: 'Match count',
  /**
   * @description Column name for elapsed time spent computing a style rule
   */
  elapsed: 'Elapsed time',
  /**
   * @description Column name for the selectors that took the longest amount of time/effort.
   */
  topSelectors: 'Top selectors',
  /**
   * @description Column name for a total sum.
   */
  total: 'Total',
  /**
   * @description Text status indicating that no CSS selector data was found.
   */
  enableSelectorData:
      'No CSS selector data was found. CSS selector stats need to be enabled in the performance panel settings.',
  /**
   * @description top CSS selector when ranked by elapsed time in ms
   */
  topSelectorElapsedTime: 'Top selector elaspsed time',
  /**
   * @description top CSS selector when ranked by match attempt
   */
  topSelectorMatchAttempt: 'Top selector match attempt',
} as const;

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/SlowCSSSelector.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const slowCSSSelectorThreshold = 500;  // 500us threshold for slow selectors

export type SlowCSSSelectorInsightModel = InsightModel<typeof UIStrings, {
  totalElapsedMs: Types.Timing.Milli,
  totalMatchAttempts: number,
  totalMatchCount: number,
  topSelectorElapsedMs: Types.Events.SelectorTiming | null,
  topSelectorMatchAttempts: Types.Events.SelectorTiming | null,
}>;

function aggregateSelectorStats(data: SelectorStatsData, context: InsightSetContext): SelectorTiming[] {
  const selectorMap = new Map<String, SelectorTiming>();

  for (const [event, value] of data.dataForUpdateLayoutEvent) {
    if (event.args.beginData?.frame !== context.frameId) {
      continue;
    }
    if (!Helpers.Timing.eventIsInBounds(event, context.bounds)) {
      continue;
    }
    for (const timing of value.timings) {
      const key = timing[SelectorTimingsKey.Selector] + '_' + timing[SelectorTimingsKey.StyleSheetId];
      const findTiming = selectorMap.get(key);
      if (findTiming !== undefined) {
        findTiming[SelectorTimingsKey.Elapsed] += timing[SelectorTimingsKey.Elapsed];
        findTiming[SelectorTimingsKey.FastRejectCount] += timing[SelectorTimingsKey.FastRejectCount];
        findTiming[SelectorTimingsKey.MatchAttempts] += timing[SelectorTimingsKey.MatchAttempts];
        findTiming[SelectorTimingsKey.MatchCount] += timing[SelectorTimingsKey.MatchCount];
      } else {
        selectorMap.set(key, {...timing});
      }
    }
  }

  return [...selectorMap.values()];
}

function finalize(partialModel: PartialInsightModel<SlowCSSSelectorInsightModel>): SlowCSSSelectorInsightModel {
  return {
    insightKey: InsightKeys.SLOW_CSS_SELECTOR,
    strings: UIStrings,
    title: i18nString(UIStrings.title),
    description: i18nString(UIStrings.description),
    category: InsightCategory.ALL,
    state: partialModel.topSelectorElapsedMs && partialModel.topSelectorMatchAttempts ? 'informative' : 'pass',
    ...partialModel,
  };
}

export function generateInsight(
    parsedTrace: Handlers.Types.ParsedTrace, context: InsightSetContext): SlowCSSSelectorInsightModel {
  const selectorStatsData = parsedTrace.SelectorStats;

  if (!selectorStatsData) {
    throw new Error('no selector stats data');
  }

  const selectorTimings = aggregateSelectorStats(selectorStatsData, context);

  let totalElapsedUs = 0;
  let totalMatchAttempts = 0;
  let totalMatchCount = 0;

  selectorTimings.map(timing => {
    totalElapsedUs += timing[SelectorTimingsKey.Elapsed];
    totalMatchAttempts += timing[SelectorTimingsKey.MatchAttempts];
    totalMatchCount += timing[SelectorTimingsKey.MatchCount];
  });

  let topSelectorElapsedMs: SelectorTiming|null = null;
  let topSelectorMatchAttempts: SelectorTiming|null = null;

  if (selectorTimings.length > 0) {
    // find the selector with most elapsed time
    topSelectorElapsedMs = selectorTimings.reduce((a, b) => {
      return a[SelectorTimingsKey.Elapsed] > b[SelectorTimingsKey.Elapsed] ? a : b;
    });

    // check if the slowest selector is slow enough to trigger insights info
    if (topSelectorElapsedMs && topSelectorElapsedMs[SelectorTimingsKey.Elapsed] < slowCSSSelectorThreshold) {
      topSelectorElapsedMs = null;
    }

    // find the selector with most match attempts
    topSelectorMatchAttempts = selectorTimings.reduce((a, b) => {
      return a[SelectorTimingsKey.MatchAttempts] > b[SelectorTimingsKey.MatchAttempts] ? a : b;
    });
  }

  return finalize({
    // TODO: should we identify UpdateLayout events as linked to this insight?
    relatedEvents: [],
    totalElapsedMs: Types.Timing.Milli(totalElapsedUs / 1000.0),
    totalMatchAttempts,
    totalMatchCount,
    topSelectorElapsedMs,
    topSelectorMatchAttempts,
  });
}

export function createOverlays(_: SlowCSSSelectorInsightModel): Types.Overlays.Overlay[] {
  return [];
}

// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Helpers from '../helpers/helpers.js';
import {type SelectorTiming, SelectorTimingsKey} from '../types/TraceEvents.js';
import * as Types from '../types/types.js';

import type {InsightModel, InsightSetContext, RequiredData} from './types.js';

const UIStrings = {
  /**
   *@description Title of an insight that provides details about slow CSS selectors.
   */
  title: 'CSS Selector costs',

  /**
   * @description Text to describe how to improve the performance of CSS selectors.
   */
  description:
      'If Recalculate Style costs remain high, selector optimization can reduce them. [Optimize the selectors](https://developer.chrome.com/docs/devtools/performance/selector-stats) with both high elapsed time and high slow-path %. Simpler selectors, fewer selectors, a smaller DOM, and a shallower DOM will all reduce matching costs.',
};

const str_ = i18n.i18n.registerUIStrings('models/trace/insights/SlowCSSSelector.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function deps(): ['SelectorStats'] {
  return ['SelectorStats'];
}

export type SlowCSSSelectorInsightModel = InsightModel<{
  totalElapsedMs: Types.Timing.MilliSeconds,
  totalMatchAttempts: number,
  totalMatchCount: number,
  topElapsedMs: Types.Events.SelectorTiming[],
  topMatchAttempts: Types.Events.SelectorTiming[],
}>;

function aggregateSelectorStats(
    data: Map<Types.Events.UpdateLayoutTree, {
      timings: Types.Events.SelectorTiming[],
    }>,
    context: InsightSetContext): SelectorTiming[] {
  const selectorMap = new Map<String, SelectorTiming>();

  for (const [event, value] of data) {
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

function finalize(partialModel: Omit<SlowCSSSelectorInsightModel, 'title'|'description'>): SlowCSSSelectorInsightModel {
  return {title: i18nString(UIStrings.title), description: i18nString(UIStrings.description), ...partialModel};
}

export function generateInsight(
    parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): SlowCSSSelectorInsightModel {
  const selectorStatsData = parsedTrace.SelectorStats;

  if (!selectorStatsData) {
    throw new Error('no selector stats data');
  }

  const selectorTimings = aggregateSelectorStats(selectorStatsData.dataForUpdateLayoutEvent, context);

  let totalElapsedUs = 0;
  let totalMatchAttempts = 0;
  let totalMatchCount = 0;

  selectorTimings.map(timing => {
    totalElapsedUs += timing[SelectorTimingsKey.Elapsed];
    totalMatchAttempts += timing[SelectorTimingsKey.MatchAttempts];
    totalMatchCount += timing[SelectorTimingsKey.MatchCount];
  });

  // sort by elapsed time
  const sortByElapsedMs = selectorTimings.toSorted((a, b) => {
    return b[SelectorTimingsKey.Elapsed] - a[SelectorTimingsKey.Elapsed];
  });

  // sort by match attempts
  const sortByMatchAttempts = selectorTimings.toSorted((a, b) => {
    return b[SelectorTimingsKey.MatchAttempts] - a[SelectorTimingsKey.MatchAttempts];
  });

  return finalize({
    // TODO: should we identify UpdateLayout events as linked to this insight?
    relatedEvents: [],
    totalElapsedMs: Types.Timing.MilliSeconds(totalElapsedUs / 1000.0),
    totalMatchAttempts,
    totalMatchCount,
    topElapsedMs: sortByElapsedMs.slice(0, 3),
    topMatchAttempts: sortByMatchAttempts.slice(0, 3),
  });
}

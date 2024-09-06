// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type SelectorTiming, SelectorTimingsKey} from '../types/TraceEvents.js';
import * as Types from '../types/types.js';

import {type InsightResult, type NavigationInsightContext, type RequiredData} from './types.js';

export function deps(): ['SelectorStats'] {
  return ['SelectorStats'];
}

export type SlowCSSSelectorInsightResult = InsightResult<{
  totalElapsedMs: Types.Timing.MilliSeconds,
  totalMatchAttempts: number,
  totalMatchCount: number,
  topElapsedMs: Types.TraceEvents.SelectorTiming[],
  topMatchAttempts: Types.TraceEvents.SelectorTiming[],
}>;

function aggregateSelectorStats(data: Map<Types.TraceEvents.TraceEventUpdateLayoutTree, {
  timings: Types.TraceEvents.SelectorTiming[],
}>): SelectorTiming[] {
  const selectorMap = new Map<String, SelectorTiming>();

  for (const value of data.values()) {
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

export function generateInsight(
    traceParsedData: RequiredData<typeof deps>, context: NavigationInsightContext): SlowCSSSelectorInsightResult {
  const selectorStatsData = traceParsedData.SelectorStats;

  const nav = traceParsedData.Meta.navigationsByNavigationId.get(context.navigationId);
  if (!nav) {
    throw new Error('no trace navigation');
  }

  if (!selectorStatsData) {
    throw new Error('no selector stats data');
  }

  const selectorTimings = aggregateSelectorStats(selectorStatsData.dataForUpdateLayoutEvent);

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

  return {
    totalElapsedMs: Types.Timing.MilliSeconds(totalElapsedUs / 1000.0),
    totalMatchAttempts,
    totalMatchCount,
    topElapsedMs: sortByElapsedMs.slice(0, 3),
    topMatchAttempts: sortByMatchAttempts.slice(0, 3),
  };
}

// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../models/trace/trace.js';

export function createContextForNavigation(navigation: Trace.Types.Events.NavigationStart, frameId: string):
    Trace.Insights.Types.InsightSetContextWithNavigation {
  if (!navigation.args.data?.navigationId) {
    throw new Error('expected navigationId');
  }

  const min = navigation.ts;
  const max = (navigation.ts + (navigation?.dur ?? 0)) as Trace.Types.Timing.MicroSeconds;
  const bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(min, max);

  return {
    bounds,
    frameId,
    navigation,
    navigationId: navigation.args.data?.navigationId,
  };
}

export function getInsight<Key extends keyof Trace.Insights.Types.InsightResults>(
    insightKey: Key, insights: Trace.Insights.Types.TraceInsightSets,
    navigation?: Trace.Types.Events.NavigationStart): Trace.Insights.Types.InsightResults[Key] {
  let key;
  if (navigation) {
    if (!navigation.args.data?.navigationId) {
      throw new Error('expected navigationId');
    }
    key = navigation.args.data.navigationId;
  } else {
    key = Trace.Insights.Types.NO_NAVIGATION;
  }

  const insightSets = insights.get(key);
  if (!insightSets) {
    throw new Error('missing navInsights');
  }

  const insight = insightSets.data[insightKey];
  if (insight instanceof Error) {
    throw insight;
  }

  // For some reason typescript won't narrow the type by removing Error, so do it manually.
  return insight as Trace.Insights.Types.InsightResults[Key];
}

export function getFirstOrError<T>(iterator: IterableIterator<T>): T {
  const result = iterator.next();
  if (result.done || result.value === undefined) {
    throw new Error('iterator has zero values');
  }

  return result.value;
}

export function getFirst<T>(iterator: IterableIterator<T>): T|undefined {
  return iterator.next().value;
}

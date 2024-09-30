// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../models/trace/trace.js';

export function createContextForNavigation(
    parsedTrace: Trace.Handlers.Types.ParsedTrace, navigation: Trace.Types.Events.NavigationStart,
    frameId: string): Trace.Insights.Types.InsightSetContextWithNavigation {
  if (!navigation.args.data?.navigationId) {
    throw new Error('expected navigationId');
  }

  const navigationIndex = parsedTrace.Meta.mainFrameNavigations.indexOf(navigation);
  if (navigationIndex === -1) {
    throw new Error('unexpected navigation');
  }

  const min = navigation.ts;
  const max = navigationIndex + 1 < parsedTrace.Meta.mainFrameNavigations.length ?
      parsedTrace.Meta.mainFrameNavigations[navigationIndex + 1].ts :
      parsedTrace.Meta.traceBounds.max;
  const bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(min, max);

  return {
    bounds,
    frameId,
    navigation,
    navigationId: navigation.args.data?.navigationId,
  };
}

export function getInsightOrError<InsightName extends keyof Trace.Insights.Types.InsightResults>(
    insightName: InsightName, insights: Trace.Insights.Types.TraceInsightSets,
    navigation?: Trace.Types.Events.NavigationStart): Trace.Insights.Types.InsightResults[InsightName] {
  let key;
  if (navigation) {
    if (!navigation.args.data?.navigationId) {
      throw new Error('expected navigationId');
    }
    key = navigation.args.data.navigationId;
  } else {
    key = Trace.Types.Events.NO_NAVIGATION;
  }

  const insightSets = insights.get(key);
  if (!insightSets) {
    throw new Error('missing navInsights');
  }

  const insight = insightSets.data[insightName];
  if (insight instanceof Error) {
    throw insight;
  }

  // For some reason typescript won't narrow the type by removing Error, so do it manually.
  return insight as Trace.Insights.Types.InsightResults[InsightName];
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

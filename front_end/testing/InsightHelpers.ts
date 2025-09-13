// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../models/trace/trace.js';

import {TraceLoader} from './TraceLoader.js';

export async function processTrace(context: Mocha.Suite|Mocha.Context, traceFile: string):
    Promise<Trace.TraceModel.ParsedTrace&{insights: Trace.Insights.Types.TraceInsightSets}> {
  const parsedTrace = await TraceLoader.traceEngine(context, traceFile);
  if (!parsedTrace.insights) {
    throw new Error('No insights');
  }

  return parsedTrace as Trace.TraceModel.ParsedTrace & {insights: Trace.Insights.Types.TraceInsightSets};
}

export function createContextForNavigation(
    data: Trace.Handlers.Types.HandlerData, navigation: Trace.Types.Events.NavigationStart,
    frameId: string): Trace.Insights.Types.InsightSetContextWithNavigation {
  if (!navigation.args.data?.navigationId) {
    throw new Error('expected navigationId');
  }

  const navigationIndex = data.Meta.mainFrameNavigations.indexOf(navigation);
  if (navigationIndex === -1) {
    throw new Error('unexpected navigation');
  }

  const min = navigation.ts;
  const max = navigationIndex + 1 < data.Meta.mainFrameNavigations.length ?
      data.Meta.mainFrameNavigations[navigationIndex + 1].ts :
      data.Meta.traceBounds.max;
  const bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(min, max);

  return {
    bounds,
    frameId,
    navigation,
    navigationId: navigation.args.data?.navigationId,
  };
}

export function getInsightSetOrError(
    insights: Trace.Insights.Types.TraceInsightSets,
    navigation?: Trace.Types.Events.NavigationStart): Trace.Insights.Types.InsightSet {
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
    throw new Error(`Could not find Insights for navigation ${
        key}. If you are trying to load an Insight for a particular navigation, you must supply it as an argument to \`getInsightOrError\``);
  }

  return insightSets;
}

export function getInsightOrError<InsightName extends keyof Trace.Insights.Types.InsightModels>(
    insightName: InsightName, insights: Trace.Insights.Types.TraceInsightSets,
    navigation?: Trace.Types.Events.NavigationStart): Trace.Insights.Types.InsightModels[InsightName] {
  const insightSet = getInsightSetOrError(insights, navigation);
  const insight = insightSet.model[insightName];
  if (insight instanceof Error) {
    throw insight;
  }

  return insight;
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

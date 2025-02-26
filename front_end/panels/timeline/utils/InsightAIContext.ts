// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Trace from '../../../models/trace/trace.js';

import {AICallTree} from './AICallTree.js';

/**
 * This class holds the Insight that is active when the user has entered the
 * Ask AI flow from the Insights sidebar.
 * Ideally we would just use the InsightModel instance itself, but we need to
 * also store a reference to the parsed trace as we use that to populate the
 * data provided to the LLM, so we use this class as a container for the insight
 * and the parsed trace.
 */
export class ActiveInsight {
  #insight: Trace.Insights.Types.InsightModel<{}, {}>;
  #parsedTrace: Trace.Handlers.Types.ParsedTrace;

  constructor(insight: Trace.Insights.Types.InsightModel<{}, {}>, parsedTrace: Trace.Handlers.Types.ParsedTrace) {
    this.#insight = insight;
    this.#parsedTrace = parsedTrace;
  }

  get insight(): Readonly<Trace.Insights.Types.InsightModel<{}, {}>> {
    return this.#insight;
  }
  get parsedTrace(): Trace.Handlers.Types.ParsedTrace {
    return this.#parsedTrace;
  }

  title(): string {
    return this.#insight.title;
  }
}

export class AIQueries {
  /**
   * Returns the set of network requests that occurred within the timeframe of this Insight.
   */
  static networkRequests(
      insight: Trace.Insights.Types.InsightModel<{}, {}>,
      parsedTrace: Trace.Handlers.Types.ParsedTrace): readonly Trace.Types.Events.SyntheticNetworkRequest[] {
    const bounds = insightBounds(insight, parsedTrace);

    // Now we find network requests that:
    // 1. began within the bounds
    // 2. completed within the bounds
    const matchedRequests: Trace.Types.Events.SyntheticNetworkRequest[] = [];
    for (const request of parsedTrace.NetworkRequests.byTime) {
      // Requests are ordered by time ASC, so if we find one request that is
      // beyond the max, the rest are guaranteed to be also and we can break early.
      if (request.ts > bounds.max) {
        break;
      }
      if (request.args.data.url.startsWith('data:')) {
        // For the sake of the LLM querying data, we don't care about data: URLs.
        continue;
      }
      if (request.ts >= bounds.min && request.ts + request.dur <= bounds.max) {
        matchedRequests.push(request);
      }
    }

    return matchedRequests;
  }

  /**
   * Returns an AI Call Tree representing the activity on the main thread for
   * the relevant time range of the given insight.
   */
  static mainThreadActivity(
      insight: Trace.Insights.Types.InsightModel<{}, {}>, parsedTrace: Trace.Handlers.Types.ParsedTrace): AICallTree
      |null {
    const bounds = insightBounds(insight, parsedTrace);
    return AICallTree.fromTime(bounds.min, bounds.max, parsedTrace);
  }
}

/**
 * Calculates the time bounds for the given insight that are relevant.
 * If the insight is attached to a navigation, this will be the start of that
 * navigation through to either the next navigation, or the end of the trace.
 * For some insights we change the bounds; for LCP insights we treat the max
 * bound as LCP time, as anything that happens after that cannot have impacted
 * it.
 */
function insightBounds(
    insight: Trace.Insights.Types.InsightModel<{}, {}>,
    parsedTrace: Trace.Handlers.Types.ParsedTrace): Trace.Types.Timing.TraceWindowMicro {
  const navigationStart =
      insight.navigationId ? parsedTrace.Meta.navigationsByNavigationId.get(insight.navigationId) : undefined;
  const minBound = navigationStart?.ts ?? parsedTrace.Meta.traceBounds.min;

  let maxBound = customMaxBoundForInsight(insight);
  if (!maxBound) {
    maxBound = parsedTrace.Meta.traceBounds.max;
    if (navigationStart) {
      const nextNavigation = getNextNavigation(navigationStart, parsedTrace);
      if (nextNavigation) {
        maxBound = nextNavigation.ts;
      }
    }
  }
  return Trace.Helpers.Timing.traceWindowFromMicroSeconds(minBound, maxBound);
}

/**
 * For a given navigation on the main frame, return the next navigation, if there was one.
 */
function getNextNavigation(
    navigation: Trace.Types.Events.NavigationStart,
    parsedTrace: Trace.Handlers.Types.ParsedTrace): Trace.Types.Events.NavigationStart|null {
  for (let i = 0; i < parsedTrace.Meta.mainFrameNavigations.length; i++) {
    const currentNavigationStart = parsedTrace.Meta.mainFrameNavigations[i];
    if (currentNavigationStart.args.data?.navigationId === navigation.args.data?.navigationId) {
      return parsedTrace.Meta.mainFrameNavigations.at(i + 1) ?? null;
    }
  }
  return null;
}

function customMaxBoundForInsight(insight: Trace.Insights.Types.InsightModel<{}, {}>): Trace.Types.Timing.Micro|null {
  if (Trace.Insights.Models.LCPPhases.isLCPPhases(insight) && insight.lcpEvent) {
    return insight.lcpEvent.ts;
  }
  return null;
}

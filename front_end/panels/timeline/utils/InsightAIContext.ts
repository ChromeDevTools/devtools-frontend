// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';

import {AICallTree} from './AICallTree.js';

export class AIQueries {
  /**
   * Returns the set of network requests that occurred within the timeframe of this Insight.
   */
  static networkRequests(
      insight: Trace.Insights.Types.InsightModel, insightSetBounds: Trace.Types.Timing.TraceWindowMicro,
      parsedTrace: Trace.Handlers.Types.ParsedTrace): readonly Trace.Types.Events.SyntheticNetworkRequest[] {
    const bounds = insightBounds(insight, insightSetBounds);

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
   * Returns the single network request. We do not check to filter this by the
   * bounds of the insight, because the only way that the LLM has found this
   * request is by first inspecting a summary of relevant network requests for
   * the given insight. So if it then looks up a request by URL, we know that
   * is a valid and relevant request.
   */
  static networkRequest(parsedTrace: Trace.Handlers.Types.ParsedTrace, url: string):
      Trace.Types.Events.SyntheticNetworkRequest|null {
    return parsedTrace.NetworkRequests.byTime.find(r => r.args.data.url === url) ?? null;
  }

  static findMainThread(navigationId: string|undefined, parsedTrace: Trace.Handlers.Types.ParsedTrace):
      Trace.Handlers.Threads.ThreadData|null {
    /**
     * We cannot assume that there is one main thread as there are scenarios
     * where there can be multiple (see crbug.com/402658800) as an example.
     * Therefore we calculate the main thread by using the thread that the
     * Insight has been associated to. Most Insights relate to a navigation, so
     * in this case we can use the navigation's PID/TID as we know that will
     * have run on the main thread that we are interested in.
     * If we do not have a navigation, we fall back to looking for the first
     * thread we find that is of type MAIN_THREAD.
     * Longer term we should solve this at the Trace Engine level to avoid
     * look-ups like this; this is the work that is tracked in
     * crbug.com/402658800.
     */
    let mainThreadPID: Trace.Types.Events.ProcessID|null = null;
    let mainThreadTID: Trace.Types.Events.ThreadID|null = null;

    if (navigationId) {
      const navigation = parsedTrace.Meta.navigationsByNavigationId.get(navigationId);
      if (navigation?.args.data?.isOutermostMainFrame) {
        mainThreadPID = navigation.pid;
        mainThreadTID = navigation.tid;
      }
    }

    const threads = Trace.Handlers.Threads.threadsInTrace(parsedTrace);
    const thread = threads.find(thread => {
      if (mainThreadPID && mainThreadTID) {
        return thread.pid === mainThreadPID && thread.tid === mainThreadTID;
      }
      return thread.type === Trace.Handlers.Threads.ThreadType.MAIN_THREAD;
    });

    return thread ?? null;
  }

  /**
   * Returns bottom up activity for the given range.
   */
  static mainThreadActivityBottomUp(
      navigationId: string|undefined, bounds: Trace.Types.Timing.TraceWindowMicro,
      parsedTrace: Trace.Handlers.Types.ParsedTrace): Trace.Extras.TraceTree.BottomUpRootNode|null {
    const thread = this.findMainThread(navigationId, parsedTrace);
    if (!thread) {
      return null;
    }

    const events = AICallTree.findEventsForThread({thread, parsedTrace, bounds});
    if (!events) {
      return null;
    }

    // Use the same filtering as front_end/panels/timeline/TimelineTreeView.ts.
    const visibleEvents = Trace.Helpers.Trace.VISIBLE_TRACE_EVENT_TYPES.values().toArray();
    const filter = new Trace.Extras.TraceFilter.VisibleEventsFilter(
        visibleEvents.concat([Trace.Types.Events.Name.SYNTHETIC_NETWORK_REQUEST]));

    // The bottom up root node handles all the "in Tracebounds" checks we need for the insight.
    const startTime = Trace.Helpers.Timing.microToMilli(bounds.min);
    const endTime = Trace.Helpers.Timing.microToMilli(bounds.max);
    return new Trace.Extras.TraceTree.BottomUpRootNode(events, {
      textFilter: new Trace.Extras.TraceFilter.ExclusiveNameFilter([]),
      filters: [filter],
      startTime,
      endTime,
    });
  }

  /**
   * Returns an AI Call Tree representing the activity on the main thread for
   * the relevant time range of the given insight.
   */
  static mainThreadActivityTopDown(
      navigationId: string|undefined, bounds: Trace.Types.Timing.TraceWindowMicro,
      parsedTrace: Trace.Handlers.Types.ParsedTrace): AICallTree|null {
    const thread = this.findMainThread(navigationId, parsedTrace);
    if (!thread) {
      return null;
    }

    return AICallTree.fromTimeOnThread({
      thread: {
        pid: thread.pid,
        tid: thread.tid,
      },
      parsedTrace,
      bounds,
    });
  }

  /**
   * Returns an AI Call Tree representing the activity on the main thread for
   * the relevant time range of the given insight.
   */
  static mainThreadActivityForInsight(
      insight: Trace.Insights.Types.InsightModel, insightSetBounds: Trace.Types.Timing.TraceWindowMicro,
      parsedTrace: Trace.Handlers.Types.ParsedTrace): AICallTree|null {
    const bounds = insightBounds(insight, insightSetBounds);
    return this.mainThreadActivityTopDown(insight.navigationId, bounds, parsedTrace);
  }

  /**
   * Returns the top longest tasks as AI Call Trees.
   */
  static longestTasks(
      navigationId: string|undefined, bounds: Trace.Types.Timing.TraceWindowMicro,
      parsedTrace: Trace.Handlers.Types.ParsedTrace, limit = 3): AICallTree[]|null {
    const thread = this.findMainThread(navigationId, parsedTrace);
    if (!thread) {
      return null;
    }

    const tasks = AICallTree.findMainThreadTasks({thread, parsedTrace, bounds});
    if (!tasks) {
      return null;
    }

    const topTasks = tasks.filter(e => e.name === 'RunTask').sort((a, b) => b.dur - a.dur).slice(0, limit);
    return topTasks
        .map(task => {
          const tree = AICallTree.fromEvent(task, parsedTrace);
          if (tree) {
            tree.selectedNode = null;
          }
          return tree;
        })
        .filter(tree => !!tree);
  }
}

/**
 * Calculates the trace bounds for the given insight that are relevant.
 *
 * Uses the insight's overlays to determine the relevant trace bounds. If there are
 * no overlays, falls back to the insight set's navigation bounds.
 */
export function insightBounds(
    insight: Trace.Insights.Types.InsightModel,
    insightSetBounds: Trace.Types.Timing.TraceWindowMicro): Trace.Types.Timing.TraceWindowMicro {
  const overlays = insight.createOverlays?.() ?? [];
  const windows = overlays.map(Trace.Helpers.Timing.traceWindowFromOverlay).filter(bounds => !!bounds);
  const overlaysBounds = Trace.Helpers.Timing.combineTraceWindowsMicro(windows);
  if (overlaysBounds) {
    return overlaysBounds;
  }

  return insightSetBounds;
}

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
  #insight: Trace.Insights.Types.InsightModel;
  #insightSetBounds: Trace.Types.Timing.TraceWindowMicro;
  #parsedTrace: Trace.Handlers.Types.ParsedTrace;

  constructor(
      insight: Trace.Insights.Types.InsightModel, insightSetBounds: Trace.Types.Timing.TraceWindowMicro,
      parsedTrace: Trace.Handlers.Types.ParsedTrace) {
    this.#insight = insight;
    this.#insightSetBounds = insightSetBounds;
    this.#parsedTrace = parsedTrace;
  }

  get insight(): Readonly<Trace.Insights.Types.InsightModel> {
    return this.#insight;
  }

  get insightSetBounds(): Readonly<Trace.Types.Timing.TraceWindowMicro> {
    return this.#insightSetBounds;
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

  /**
   * Returns an AI Call Tree representing the activity on the main thread for
   * the relevant time range of the given insight.
   */
  static mainThreadActivity(
      insight: Trace.Insights.Types.InsightModel, insightSetBounds: Trace.Types.Timing.TraceWindowMicro,
      parsedTrace: Trace.Handlers.Types.ParsedTrace): AICallTree|null {
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

    if (insight.navigationId) {
      const navigation = parsedTrace.Meta.navigationsByNavigationId.get(insight.navigationId);
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
    if (!thread) {
      return null;
    }

    const bounds = insightBounds(insight, insightSetBounds);
    return AICallTree.fromTimeOnThread({
      thread: {
        pid: thread.pid,
        tid: thread.tid,
      },
      parsedTrace,
      bounds,
    });
  }
}

/**
 * Calculates the trace bounds for the given insight that are relevant.
 *
 * Uses the insight's overlays to determine the relevant trace bounds. If there are
 * no overlays, falls back to the insight set's navigation bounds.
 */
function insightBounds(
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

// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';

import {AICallTree} from './AICallTree.js';

interface AgentFocusData {
  parsedTrace: Trace.TraceModel.ParsedTrace;
  insightSet: Trace.Insights.Types.InsightSet|null;
  /** Note: at most one of event or callTree is non-null. */
  event: Trace.Types.Events.Event|null;
  /** Note: at most one of event or callTree is non-null. */
  callTree: AICallTree|null;
  insight: Trace.Insights.Types.InsightModel|null;
}

function getFirstInsightSet(insights: Trace.Insights.Types.TraceInsightSets): Trace.Insights.Types.InsightSet|null {
  // Currently only support a single insight set. Pick the first one with a navigation.
  // TODO(cjamcl): we should just give the agent the entire insight set, and give
  // summary detail about all of them + the ability to query each.
  return [...insights.values()].filter(insightSet => insightSet.navigation).at(0) ?? null;
}

export class AgentFocus {
  static fromParsedTrace(parsedTrace: Trace.TraceModel.ParsedTrace): AgentFocus {
    if (!parsedTrace.insights) {
      throw new Error('missing insights');
    }

    const insightSet = getFirstInsightSet(parsedTrace.insights);
    return new AgentFocus({
      parsedTrace,
      insightSet,
      event: null,
      callTree: null,
      insight: null,
    });
  }

  static fromInsight(parsedTrace: Trace.TraceModel.ParsedTrace, insight: Trace.Insights.Types.InsightModel):
      AgentFocus {
    if (!parsedTrace.insights) {
      throw new Error('missing insights');
    }

    const insightSet = getFirstInsightSet(parsedTrace.insights);
    return new AgentFocus({
      parsedTrace,
      insightSet,
      event: null,
      callTree: null,
      insight,
    });
  }

  static fromEvent(parsedTrace: Trace.TraceModel.ParsedTrace, event: Trace.Types.Events.Event): AgentFocus {
    if (!parsedTrace.insights) {
      throw new Error('missing insights');
    }

    const insightSet = getFirstInsightSet(parsedTrace.insights);
    const result = AgentFocus.#getCallTreeOrEvent(parsedTrace, event);
    return new AgentFocus({parsedTrace, insightSet, event: result.event, callTree: result.callTree, insight: null});
  }

  static fromCallTree(callTree: AICallTree): AgentFocus {
    const insights = callTree.parsedTrace.insights;

    // Select the insight set containing the call tree.
    // If for some reason that fails, fallback to the first one.
    let insightSet = null;
    if (insights) {
      const callTreeTimeRange = Trace.Helpers.Timing.traceWindowFromEvent(callTree.rootNode.event);
      insightSet = insights.values().find(set => Trace.Helpers.Timing.boundsIncludeTimeRange({
        timeRange: callTreeTimeRange,
        bounds: set.bounds,
      })) ??
          getFirstInsightSet(insights);
    }

    return new AgentFocus({parsedTrace: callTree.parsedTrace, insightSet, event: null, callTree, insight: null});
  }

  #data: AgentFocusData;
  readonly eventsSerializer = new Trace.EventsSerializer.EventsSerializer();

  constructor(data: AgentFocusData) {
    this.#data = data;
  }

  get parsedTrace(): Trace.TraceModel.ParsedTrace {
    return this.#data.parsedTrace;
  }

  get insightSet(): Trace.Insights.Types.InsightSet|null {
    return this.#data.insightSet;
  }

  /** Note: at most one of event or callTree is non-null. */
  get event(): Trace.Types.Events.Event|null {
    return this.#data.event;
  }

  /** Note: at most one of event or callTree is non-null. */
  get callTree(): AICallTree|null {
    return this.#data.callTree;
  }

  get insight(): Trace.Insights.Types.InsightModel|null {
    return this.#data.insight;
  }

  withInsight(insight: Trace.Insights.Types.InsightModel|null): AgentFocus {
    const focus = new AgentFocus(this.#data);
    focus.#data.insight = insight;
    return focus;
  }

  withEvent(event: Trace.Types.Events.Event|null): AgentFocus {
    const focus = new AgentFocus(this.#data);
    const result = AgentFocus.#getCallTreeOrEvent(this.#data.parsedTrace, event);
    focus.#data.callTree = result.callTree;
    focus.#data.event = result.event;
    return focus;
  }

  lookupEvent(key: Trace.Types.File.SerializableKey): Trace.Types.Events.Event|null {
    try {
      return this.eventsSerializer.eventForKey(key, this.#data.parsedTrace);
    } catch (err) {
      if (err.toString().includes('Unknown trace event') || err.toString().includes('Unknown profile call')) {
        return null;
      }

      throw err;
    }
  }

  /**
   * If an event is a call tree, this returns that call tree and a null event.
   * If not a call tree, this only returns a non-null event if the event is a network
   * request.
   * This is an arbitrary limitation – it should be removed, but first we need to
   * improve the agent's knowledge of events that are not main-thread or network
   * events.
   */
  static #getCallTreeOrEvent(parsedTrace: Trace.TraceModel.ParsedTrace, event: Trace.Types.Events.Event|null):
      {callTree: AICallTree|null, event: Trace.Types.Events.Event|null} {
    const callTree = event && AICallTree.fromEvent(event, parsedTrace);
    if (callTree) {
      return {callTree, event: null};
    }
    if (event && Trace.Types.Events.isSyntheticNetworkRequest(event)) {
      return {callTree: null, event};
    }
    return {callTree: null, event: null};
  }
}

export function getPerformanceAgentFocusFromModel(model: Trace.TraceModel.Model): AgentFocus|null {
  const parsedTrace = model.parsedTrace();
  if (!parsedTrace) {
    return null;
  }

  return AgentFocus.fromParsedTrace(parsedTrace);
}

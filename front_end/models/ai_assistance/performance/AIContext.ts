// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';

import type {AICallTree} from './AICallTree.js';

export interface AgentFocusData {
  parsedTrace: Trace.TraceModel.ParsedTrace;
  insightSet: Trace.Insights.Types.InsightSet|null;
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
  static full(parsedTrace: Trace.TraceModel.ParsedTrace): AgentFocus {
    if (!parsedTrace.insights) {
      throw new Error('missing insights');
    }

    const insightSet = getFirstInsightSet(parsedTrace.insights);
    return new AgentFocus({
      parsedTrace,
      insightSet,
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
      callTree: null,
      insight,
    });
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

    return new AgentFocus({parsedTrace: callTree.parsedTrace, insightSet, callTree, insight: null});
  }

  #data: AgentFocusData;

  constructor(data: AgentFocusData) {
    this.#data = data;
  }

  get data(): AgentFocusData {
    return this.#data;
  }

  withInsight(insight: Trace.Insights.Types.InsightModel|null): AgentFocus {
    const focus = new AgentFocus(this.#data);
    focus.#data.insight = insight;
    return focus;
  }

  withCallTree(callTree: AICallTree|null): AgentFocus {
    const focus = new AgentFocus(this.#data);
    focus.#data.callTree = callTree;
    return focus;
  }
}

export function getPerformanceAgentFocusFromModel(model: Trace.TraceModel.Model): AgentFocus|null {
  const parsedTrace = model.parsedTrace();
  if (!parsedTrace) {
    return null;
  }

  return AgentFocus.full(parsedTrace);
}

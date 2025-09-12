// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';

import type {AICallTree} from './AICallTree.js';

export interface AgentFocusDataFull {
  type: 'full';
  parsedTrace: Trace.TraceModel.ParsedTrace;
  insightSet: Trace.Insights.Types.InsightSet|null;
}

interface AgentFocusDataCallTree {
  type: 'call-tree';
  parsedTrace: Trace.TraceModel.ParsedTrace;
  insightSet: Trace.Insights.Types.InsightSet|null;
  callTree: AICallTree;
}

export interface AgentFocusDataInsight {
  type: 'insight';
  parsedTrace: Trace.TraceModel.ParsedTrace;
  insightSet: Trace.Insights.Types.InsightSet|null;
  insight: Trace.Insights.Types.InsightModel;
}

type AgentFocusData = AgentFocusDataCallTree|AgentFocusDataInsight|AgentFocusDataFull;

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
      type: 'full',
      parsedTrace,
      insightSet,
    });
  }

  static fromInsight(parsedTrace: Trace.TraceModel.ParsedTrace, insight: Trace.Insights.Types.InsightModel):
      AgentFocus {
    if (!parsedTrace.insights) {
      throw new Error('missing insights');
    }

    const insightSet = getFirstInsightSet(parsedTrace.insights);
    return new AgentFocus({
      type: 'insight',
      parsedTrace,
      insightSet,
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

    return new AgentFocus({type: 'call-tree', parsedTrace: callTree.parsedTrace, insightSet, callTree});
  }

  #data: AgentFocusData;

  constructor(data: AgentFocusData) {
    this.#data = data;
  }

  get data(): AgentFocusData {
    return this.#data;
  }
}

export function getPerformanceAgentFocusFromModel(model: Trace.TraceModel.Model): AgentFocus|null {
  const parsedTrace = model.parsedTrace();
  if (!parsedTrace) {
    return null;
  }

  return AgentFocus.full(parsedTrace);
}

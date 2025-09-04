// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../models/trace/trace.js';

import type {AICallTree} from './AICallTree.js';

export interface AgentFocusDataFull {
  type: 'full';
  parsedTrace: Trace.Handlers.Types.ParsedTrace;
  insightSet: Trace.Insights.Types.InsightSet|null;
  traceMetadata: Trace.Types.File.MetaData;
}

interface AgentFocusDataCallTree {
  type: 'call-tree';
  parsedTrace: Trace.Handlers.Types.ParsedTrace;
  callTree: AICallTree;
}

export interface AgentFocusDataInsight {
  type: 'insight';
  parsedTrace: Trace.Handlers.Types.ParsedTrace;
  insightSet: Trace.Insights.Types.InsightSet|null;
  traceMetadata: Trace.Types.File.MetaData;
  insight: Trace.Insights.Types.InsightModel;
}

type AgentFocusData = AgentFocusDataCallTree|AgentFocusDataInsight|AgentFocusDataFull;

export class AgentFocus {
  static full(
      parsedTrace: Trace.Handlers.Types.ParsedTrace, insights: Trace.Insights.Types.TraceInsightSets,
      traceMetadata: Trace.Types.File.MetaData): AgentFocus {
    // Currently only support a single insight set. Pick the first one with a navigation.
    const insightSet = [...insights.values()].filter(insightSet => insightSet.navigation).at(0) ?? null;
    return new AgentFocus({
      type: 'full',
      parsedTrace,
      insightSet,
      traceMetadata,
    });
  }

  static fromInsight(
      parsedTrace: Trace.Handlers.Types.ParsedTrace, insights: Trace.Insights.Types.TraceInsightSets,
      traceMetadata: Trace.Types.File.MetaData, insight: Trace.Insights.Types.InsightModel): AgentFocus {
    // Currently only support a single insight set. Pick the first one with a navigation.
    const insightSet = [...insights.values()].filter(insightSet => insightSet.navigation).at(0) ?? null;
    return new AgentFocus({
      type: 'insight',
      parsedTrace,
      insightSet,
      traceMetadata,
      insight,
    });
  }

  static fromCallTree(callTree: AICallTree): AgentFocus {
    return new AgentFocus({type: 'call-tree', parsedTrace: callTree.parsedTrace, callTree});
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
  const insights = model.traceInsights();
  const traceMetadata = model.metadata();
  if (!insights || !parsedTrace || !traceMetadata) {
    return null;
  }

  return AgentFocus.full(parsedTrace, insights, traceMetadata);
}

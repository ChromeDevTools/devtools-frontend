// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../models/trace/trace.js';

import type {AICallTree} from './AICallTree.js';

export interface AgentFocusDataFull {
  type: 'full';
  parsedTrace: Trace.TraceModel.ParsedTrace;
  insightSet: Trace.Insights.Types.InsightSet|null;
}

interface AgentFocusDataCallTree {
  type: 'call-tree';
  parsedTrace: Trace.TraceModel.ParsedTrace;
  callTree: AICallTree;
}

export interface AgentFocusDataInsight {
  type: 'insight';
  parsedTrace: Trace.TraceModel.ParsedTrace;
  insightSet: Trace.Insights.Types.InsightSet|null;
  insight: Trace.Insights.Types.InsightModel;
}

type AgentFocusData = AgentFocusDataCallTree|AgentFocusDataInsight|AgentFocusDataFull;

export class AgentFocus {
  static full(parsedTrace: Trace.TraceModel.ParsedTrace): AgentFocus {
    if (!parsedTrace.insights) {
      throw new Error('missing insights');
    }

    // Currently only support a single insight set. Pick the first one with a navigation.
    const insightSet = [...parsedTrace.insights.values()].filter(insightSet => insightSet.navigation).at(0) ?? null;
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
    // Currently only support a single insight set. Pick the first one with a navigation.
    const insightSet = [...parsedTrace.insights.values()].filter(insightSet => insightSet.navigation).at(0) ?? null;
    return new AgentFocus({
      type: 'insight',
      parsedTrace,
      insightSet,
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
  if (!parsedTrace) {
    return null;
  }

  return AgentFocus.full(parsedTrace);
}

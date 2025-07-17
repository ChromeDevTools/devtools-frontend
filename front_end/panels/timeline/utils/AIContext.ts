// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../models/trace/trace.js';

import type {AICallTree} from './AICallTree.js';
import type {ActiveInsight} from './InsightAIContext.js';

interface AgentFocusDataCallTree {
  type: 'call-tree';
  parsedTrace: Trace.Handlers.Types.ParsedTrace;
  callTree: AICallTree;
}

interface AgentFocusDataInsight {
  type: 'insight';
  parsedTrace: Trace.Handlers.Types.ParsedTrace;
  insight: Trace.Insights.Types.InsightModel;
  insightSetBounds: Trace.Types.Timing.TraceWindowMicro;
}

type AgentFocusData = AgentFocusDataCallTree|AgentFocusDataInsight;

export class AgentFocus {
  static fromInsight(insight: ActiveInsight): AgentFocus {
    return new AgentFocus({
      type: 'insight',
      parsedTrace: insight.parsedTrace,
      insight: insight.insight,
      insightSetBounds: insight.insightSetBounds
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

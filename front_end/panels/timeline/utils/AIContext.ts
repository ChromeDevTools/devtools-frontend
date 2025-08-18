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

interface AgentFocusDataInsight {
  type: 'insight';
  parsedTrace: Trace.Handlers.Types.ParsedTrace;
  insight: Trace.Insights.Types.InsightModel;
  insightSetBounds: Trace.Types.Timing.TraceWindowMicro;
}

type AgentFocusData = AgentFocusDataCallTree|AgentFocusDataInsight|AgentFocusDataFull;

export class AgentFocus {
  static full(
      parsedTrace: Trace.Handlers.Types.ParsedTrace, insightSet: Trace.Insights.Types.InsightSet|null,
      traceMetadata: Trace.Types.File.MetaData): AgentFocus {
    return new AgentFocus({
      type: 'full',
      parsedTrace,
      insightSet,
      traceMetadata,
    });
  }

  static fromInsight(
      parsedTrace: Trace.Handlers.Types.ParsedTrace, insight: Trace.Insights.Types.InsightModel,
      insightSetBounds: Trace.Types.Timing.TraceWindowMicro): AgentFocus {
    return new AgentFocus({
      type: 'insight',
      parsedTrace,
      insight,
      insightSetBounds,
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

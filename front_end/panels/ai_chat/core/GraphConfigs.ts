// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type { GraphConfig } from './ConfigurableGraph.js';
// Import NodeType from Types.ts where it's now defined
import { NodeType } from './Types.js';

/**
 * Defines the default agent graph configuration.
 */
export const defaultAgentGraphConfig: GraphConfig = {
  name: 'defaultAgentGraph',
  // Revert to using NodeType enum members
  entryPoint: NodeType.AGENT.toString(),
  nodes: [
    { name: NodeType.AGENT.toString(), type: 'agent' },
    { name: NodeType.TOOL_EXECUTOR.toString(), type: 'toolExecutor' },
    { name: NodeType.FINAL.toString(), type: 'final' },
  ],
  edges: [
    {
      source: NodeType.AGENT.toString(),
      conditionType: 'routeOrPrepareToolExecutor',
      targetMap: {
        [NodeType.AGENT.toString()]: NodeType.AGENT.toString(),
        [NodeType.TOOL_EXECUTOR.toString()]: NodeType.TOOL_EXECUTOR.toString(),
        [NodeType.FINAL.toString()]: NodeType.FINAL.toString(),
        __end__: '__end__',
      },
    },
    {
      source: NodeType.TOOL_EXECUTOR.toString(),
      conditionType: 'alwaysAgent',
      targetMap: {
        [NodeType.AGENT.toString()]: NodeType.AGENT.toString(),
      },
    },
  ],
};

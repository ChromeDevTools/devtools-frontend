// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { type AgentState } from './State.js';
import { type CompiledGraph, NodeType } from './Types.js';
import { ChatOpenAI } from './ChatOpenAI.js';
import { createAgentGraphFromConfig } from './ConfigurableGraph.js';
import { defaultAgentGraphConfig } from './GraphConfigs.js';
import {
  ChatPromptFormatter,
  createSystemPrompt,
  getAgentToolsFromState,
  routeNextNode,
} from './GraphHelpers.js';
import {
  createAgentNode,
  createToolExecutorNode,
  createFinalNode,
} from './AgentNodes.js';

// createAgentGraph now uses the imported typed configuration object
export function createAgentGraph(apiKey: string, customModelName?: string): CompiledGraph {
  const modelName = customModelName || 'o4-mini-2025-04-16';

  const model = new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName,
    temperature: 0,
  });

  // Use the imported configuration object directly
  console.log('Using defaultAgentGraphConfig to create graph.');
  return createAgentGraphFromConfig(defaultAgentGraphConfig, model);
}

export { ChatPromptFormatter, createAgentNode, createToolExecutorNode, createFinalNode, routeNextNode, createSystemPrompt, getAgentToolsFromState, NodeType };

// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  createAgentNode,
  createToolExecutorNode,
  createFinalNode,
} from './AgentNodes.js';
import { createAgentGraphFromConfig } from './ConfigurableGraph.js';
import { defaultAgentGraphConfig } from './GraphConfigs.js';
import { createLogger } from './Logger.js';
import {
  createSystemPrompt,
  getAgentToolsFromState,
  routeNextNode,
} from './GraphHelpers.js';
import { type CompiledGraph, NodeType } from './Types.js';
import type { LLMProvider } from '../LLM/LLMTypes.js';

const logger = createLogger('Graph');

// createAgentGraph now uses the LLM SDK directly
export function createAgentGraph(_apiKey: string | null, modelName: string, provider?: LLMProvider): CompiledGraph {
  if (!modelName) {
    throw new Error('Model name is required');
  }

  logger.debug('Creating graph for model:', modelName);

  // Create graph configuration with model name - nodes will use LLMClient directly
  const graphConfigWithModel = {
    ...defaultAgentGraphConfig,
    modelName: modelName,
    temperature: 0,
    ...(provider ? { provider } : {}),
  };

  return createAgentGraphFromConfig(graphConfigWithModel);
}

export { createAgentNode, createToolExecutorNode, createFinalNode, routeNextNode, createSystemPrompt, getAgentToolsFromState, NodeType };

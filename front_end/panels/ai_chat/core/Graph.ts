// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  createAgentNode,
  createToolExecutorNode,
  createFinalNode,
} from './AgentNodes.js';
import { ChatLiteLLM } from './ChatLiteLLM.js';
import { ChatOpenAI } from './ChatOpenAI.js';
import { createAgentGraphFromConfig } from './ConfigurableGraph.js';
import { defaultAgentGraphConfig } from './GraphConfigs.js';
import { createLogger } from './Logger.js';
import { AIChatPanel } from '../ui/AIChatPanel.js';
import {
  createSystemPrompt,
  getAgentToolsFromState,
  routeNextNode,
} from './GraphHelpers.js';
import type { AgentState } from './State.js';
import { type CompiledGraph, NodeType } from './Types.js';

const logger = createLogger('Graph');

// createAgentGraph now uses the imported typed configuration object
export function createAgentGraph(apiKey: string | null, modelName: string): CompiledGraph {
  if (!modelName) {
    throw new Error('Model name is required');
  }

  let model;
  // Get model options using the centralized method
  const modelOptions = AIChatPanel.getModelOptions();
  
  const modelOption = modelOptions.find((opt: {value: string, type: string}) => opt.value === modelName);
  const isLiteLLMModel = modelOption?.type === 'litellm' || modelName.startsWith('litellm/');

  if (isLiteLLMModel) {
    // Get LiteLLM configuration from localStorage
    const liteLLMEndpoint = localStorage.getItem('ai_chat_litellm_endpoint');
    
    // Check if endpoint is configured
    if (!liteLLMEndpoint) {
      throw new Error('LiteLLM endpoint is required for LiteLLM models');
    }

    // Handle both cases: models with and without 'litellm/' prefix
    const actualModelName = modelName.startsWith('litellm/') ?
      modelName.substring('litellm/'.length) :
      modelName;
      
    logger.debug('Creating ChatLiteLLM model:', {
      modelName: actualModelName,
      endpoint: liteLLMEndpoint,
      hasApiKey: Boolean(apiKey)
    });

    model = new ChatLiteLLM({
      liteLLMApiKey: apiKey,
      modelName: actualModelName,
      temperature: 0,
    });
  } else {
    // Standard OpenAI model - requires API key
    if (!apiKey) {
      throw new Error('OpenAI API key is required for OpenAI models');
    }
    model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName,
      temperature: 0,
    });
  }

  // Use the imported configuration object directly
  logger.debug('Using defaultAgentGraphConfig to create graph.');
  return createAgentGraphFromConfig(defaultAgentGraphConfig, model);
}

export { createAgentNode, createToolExecutorNode, createFinalNode, routeNextNode, createSystemPrompt, getAgentToolsFromState, NodeType };

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
import {
  ChatPromptFormatter,
  createSystemPrompt,
  getAgentToolsFromState,
  routeNextNode,
} from './GraphHelpers.js';
import type { AgentState } from './State.js';
import { type CompiledGraph, NodeType } from './Types.js';

// createAgentGraph now uses the imported typed configuration object
export function createAgentGraph(apiKey: string | null, modelName: string): CompiledGraph {
  if (!modelName) {
    throw new Error('Model name is required');
  }

  let model;
  // Get model options to check type
  const modelOptions = JSON.parse(localStorage.getItem('ai_chat_model_options') || '[]');
  const modelOption = modelOptions.find((opt: {value: string, type: string}) => opt.value === modelName);
  const isLiteLLMModel = modelOption?.type === 'litellm' || modelName.startsWith('litellm/');

  if (isLiteLLMModel) {
    // Get LiteLLM configuration from localStorage
    const liteLLMEndpoint = localStorage.getItem('ai_chat_litellm_endpoint');

    // Handle both cases: models with and without 'litellm/' prefix
    const actualModelName = modelName.startsWith('litellm/') ?
      modelName.substring('litellm/'.length) :
      modelName;

    model = new ChatLiteLLM({
      liteLLMApiKey: apiKey,
      modelName: actualModelName,
      temperature: 0,
      baseUrl: liteLLMEndpoint || undefined,
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
  console.log('Using defaultAgentGraphConfig to create graph.');
  return createAgentGraphFromConfig(defaultAgentGraphConfig, model);
}

export { ChatPromptFormatter, createAgentNode, createToolExecutorNode, createFinalNode, routeNextNode, createSystemPrompt, getAgentToolsFromState, NodeType };

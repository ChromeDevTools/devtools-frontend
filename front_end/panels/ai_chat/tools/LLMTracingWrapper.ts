// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { getCurrentTracingContext, createTracingProvider } from '../tracing/TracingConfig.js';
import { LLMClient } from '../LLM/LLMClient.js';
import type { LLMMessage, LLMResponse, LLMCallOptions } from '../LLM/LLMTypes.js';

/**
 * Configuration for LLM tracing wrapper
 */
export interface LLMTracingConfig {
  toolName: string;
  operationName?: string;
  context?: string;
  additionalMetadata?: Record<string, any>;
}

/**
 * Wrapper function that adds tracing to LLM calls from tools
 * 
 * This ensures every LLM call is properly traced in Langfuse with:
 * - Generation observations for the LLM call
 * - Proper parent/child relationships in the trace hierarchy
 * - Usage statistics and error handling
 * - Tool-specific metadata
 */
export async function callLLMWithTracing(
  llmCallConfig: {
    provider: any;
    model: string;
    messages: LLMMessage[];
    systemPrompt?: string;
    temperature?: number;
    options?: LLMCallOptions;
  },
  tracingConfig: LLMTracingConfig
): Promise<LLMResponse> {
  // Get tracing context and setup
  const tracingContext = getCurrentTracingContext();
  const tracingProvider = createTracingProvider();
  const generationStartTime = new Date();
  let generationId: string | undefined;

  // Create generation observation if tracing is enabled
  if (tracingContext?.traceId) {
    const operationSuffix = tracingConfig.operationName ? `-${tracingConfig.operationName}` : '';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    
    generationId = `gen-tool-${tracingConfig.toolName}${operationSuffix}-${timestamp}-${randomId}`;
    
    await tracingProvider.createObservation({
      id: generationId,
      name: `${tracingConfig.toolName} Tool LLM Generation${tracingConfig.operationName ? ` (${tracingConfig.operationName})` : ''}`,
      type: 'generation',
      startTime: generationStartTime,
      parentObservationId: tracingContext.currentToolCallId || tracingContext.currentAgentSpanId || tracingContext.parentObservationId,
      model: llmCallConfig.model,
      modelParameters: { 
        temperature: llmCallConfig.temperature ?? 0,
        ...llmCallConfig.options 
      },
      input: {
        systemPrompt: llmCallConfig.systemPrompt,
        messages: llmCallConfig.messages,
        messageCount: llmCallConfig.messages.length
      },
      metadata: {
        toolName: tracingConfig.toolName,
        toolType: 'llm_calling_tool',
        phase: 'llm_generation',
        context: tracingConfig.context,
        ...tracingConfig.additionalMetadata
      }
    }, tracingContext.traceId);
  }

  try {
    // Make the actual LLM call
    const llm = LLMClient.getInstance();
    const llmResponse = await llm.call({
      provider: llmCallConfig.provider,
      model: llmCallConfig.model,
      messages: llmCallConfig.messages,
      systemPrompt: llmCallConfig.systemPrompt || '',
      temperature: llmCallConfig.temperature,
      ...llmCallConfig.options
    });

    // Complete the generation observation with success
    if (generationId && tracingContext?.traceId) {
      const rawUsage = llmResponse.rawResponse?.usage;
      const usage = rawUsage ? {
        promptTokens: rawUsage.prompt_tokens || 0,
        completionTokens: rawUsage.completion_tokens || 0,
        totalTokens: rawUsage.total_tokens || 0
      } : undefined;

      await tracingProvider.updateObservation(generationId, {
        endTime: new Date(),
        output: {
          type: 'llm_response',
          text: llmResponse.text,
          functionCall: llmResponse.functionCall,
          hasText: !!llmResponse.text,
          hasFunctionCall: !!llmResponse.functionCall
        },
        usage,
        metadata: {
          toolName: tracingConfig.toolName,
          phase: 'completed',
          outputLength: llmResponse.text?.length || 0,
          duration: Date.now() - generationStartTime.getTime(),
          success: true
        }
      });
    }

    return llmResponse;
  } catch (error) {
    // Complete generation observation with error
    if (generationId && tracingContext?.traceId) {
      await tracingProvider.updateObservation(generationId, {
        endTime: new Date(),
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          toolName: tracingConfig.toolName,
          phase: 'error',
          duration: Date.now() - generationStartTime.getTime(),
          success: false
        }
      });
    }
    
    // Re-throw the error to maintain original behavior
    throw error;
  }
}
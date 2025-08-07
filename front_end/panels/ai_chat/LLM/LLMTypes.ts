// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Core type definitions and interfaces for the unified LLM client system.
 * This file contains all shared types used across the LLM infrastructure.
 */

/**
 * Error types that can occur during LLM calls
 */
export enum LLMErrorType {
  JSON_PARSE_ERROR = 'JSON_PARSE_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  QUOTA_ERROR = 'QUOTA_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Retry configuration for specific error types
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
}

/**
 * Unified options for LLM calls that work across different providers
 */
export interface UnifiedLLMOptions {
  // Core LLM parameters
  systemPrompt: string; // Required - all calls must have context
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  responseFormat?: any;
  n?: number;
  stream?: boolean;
  
  // Connection and timeout settings
  endpoint?: string;
  timeout?: number;
  signal?: AbortSignal;
  
  // Tool usage (for function calling)
  tools?: any[];
  tool_choice?: any;
  
  // Feature flags
  strictJsonMode?: boolean; // Enables strict JSON parsing with retries
  
  // Retry configuration override
  customRetryConfig?: Partial<RetryConfig>;
  
  // Legacy compatibility (deprecated - use customRetryConfig instead)
  maxRetries?: number;
}

/**
 * Unified response that includes function calls and parsed data
 */
export interface UnifiedLLMResponse {
  text?: string;
  functionCall?: {
    name: string;
    arguments: any;
  };
  rawResponse?: any;
  reasoning?: {
    summary?: string[] | null;
    effort?: string;
  };
  parsedJson?: any; // Parsed JSON when strictJsonMode is enabled
}

/**
 * Model configuration from localStorage
 */
export interface ModelOption {
  value: string;
  type: 'openai' | 'litellm';
  label?: string;
}

/**
 * Standardized structure for parsed LLM actions
 */
export type ParsedLLMAction =
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | { type: 'final_answer'; answer: string }
  | { type: 'error'; error: string };

/**
 * Configuration for error-specific retry behavior
 */
export interface ErrorRetryConfig {
  [LLMErrorType.RATE_LIMIT_ERROR]?: RetryConfig;
  [LLMErrorType.NETWORK_ERROR]?: RetryConfig;
  [LLMErrorType.JSON_PARSE_ERROR]?: RetryConfig;
  [LLMErrorType.SERVER_ERROR]?: RetryConfig;
  [LLMErrorType.AUTH_ERROR]?: RetryConfig;
  [LLMErrorType.QUOTA_ERROR]?: RetryConfig;
  [LLMErrorType.UNKNOWN_ERROR]?: RetryConfig;
}

/**
 * Callback for retry events (useful for logging and monitoring)
 */
export interface RetryCallback {
  (attempt: number, error: Error, errorType: LLMErrorType, delayMs: number): void;
}

/**
 * Extended retry configuration with callbacks and custom settings
 */
export interface ExtendedRetryConfig extends ErrorRetryConfig {
  // Default configuration for unspecified error types
  defaultConfig?: RetryConfig;
  
  // Global callback for all retry events
  onRetry?: RetryCallback;
  
  // Maximum total time to spend on retries (across all attempts)
  maxTotalTimeMs?: number;
  
  // Whether to enable retry logging
  enableLogging?: boolean;
}

/**
 * LLM Provider types
 */
export type LLMProvider = 'openai' | 'litellm' | 'groq' | 'openrouter';

/**
 * Content types for multimodal messages (text + images + files)
 */
export type MessageContent = 
  | string 
  | Array<TextContent | ImageContent | FileContent>;

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string; // Can be URL or base64 data URL
    detail?: 'low' | 'high' | 'auto';
  };
}

export interface FileContent {
  type: 'file';
  file: {
    filename: string;
    file_data: string; // Base64 encoded data URL (e.g., "data:application/pdf;base64,...")
  };
}

/**
 * Message format compatible with OpenAI and LiteLLM APIs
 * Supports both text-only and multimodal (text + images + PDFs) content
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: MessageContent;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
}

/**
 * Options for LLM calls
 */
export interface LLMCallOptions {
  tools?: any[];
  tool_choice?: any;
  temperature?: number;
  reasoningLevel?: 'low' | 'medium' | 'high'; // For O-series models
  retryConfig?: Partial<RetryConfig>;
}

/**
 * Unified LLM response format
 */
export interface LLMResponse {
  text?: string;
  functionCall?: {
    name: string;
    arguments: any;
  };
  rawResponse: any;
  reasoning?: {
    summary?: string[] | null;
    effort?: string;
  };
}

/**
 * Model capabilities
 */
export interface ModelCapabilities {
  functionCalling: boolean;
  reasoning: boolean;
  vision: boolean;
  structured: boolean;
}

/**
 * Model information with provider and capabilities
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: LLMProvider;
  capabilities?: ModelCapabilities;
}
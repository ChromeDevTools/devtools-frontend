// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Protocol definitions for WebSocket evaluation communication
 */

// Client → Server Messages

export interface RegisterMessage {
  type: 'register';
  clientId: string;
  secretKey?: string;
  capabilities: ClientCapabilities;
}

export interface ClientCapabilities {
  tools: string[];
  maxConcurrency: number;
  version: string;
}

export interface ReadyMessage {
  type: 'ready';
  timestamp: string;
}

export interface StatusMessage {
  type: 'status';
  evaluationId: string;
  status: 'running' | 'completed' | 'failed';
  progress?: number;  // 0-1
  message?: string;
}

export interface PingMessage {
  type: 'ping';
  timestamp: string;
}

// Server → Client Messages

export interface WelcomeMessage {
  type: 'welcome';
  serverId: string;
  version: string;
  timestamp: string;
}

export interface RegistrationAckMessage {
  type: 'registration_ack';
  clientId: string;
  status: 'accepted' | 'rejected' | 'auth_required';
  message?: string;
  evaluationsCount?: number;
  reason?: string;  // Only present if rejected
  serverSecretKey?: string;  // Present when status is 'auth_required'
  newClient?: boolean;  // Present when a new client was created
}

export interface AuthVerifyMessage {
  type: 'auth_verify';
  clientId: string;
  verified: boolean;
}

export interface PongMessage {
  type: 'pong';
  timestamp: string;
}

// JSON-RPC Messages

export interface EvaluationRequest {
  jsonrpc: '2.0';
  method: 'evaluate';
  params: EvaluationParams;
  id: string;
}

export interface EvaluationParams {
  evaluationId: string;
  name: string;
  url: string;
  tool: string;
  input: any;
  model?: {
    main_model?: string;
    mini_model?: string;
    nano_model?: string;
    provider?: string;
    api_key?: string;    // New: per-request API key
    endpoint?: string;   // New: per-request endpoint (LiteLLM)
  };
  timeout: number;
  metadata: {
    tags: string[];
    retries: number;
    priority?: 'low' | 'normal' | 'high';
  };
}

export interface EvaluationSuccessResponse {
  jsonrpc: '2.0';
  result: {
    status: 'success';
    output: any;
    executionTime: number;
    toolCalls?: ToolCall[];
    metadata?: Record<string, any>;
  };
  id: string;
}

export interface ToolCall {
  tool: string;
  timestamp: string;
  duration: number;
  status: 'success' | 'failed';
  error?: string;
}

export interface EvaluationErrorResponse {
  jsonrpc: '2.0';
  error: {
    code: number;
    message: string;
    data?: {
      tool: string;
      error: string;
      url?: string;
      timestamp: string;
      stackTrace?: string;
    };
  };
  id: string;
}

// Error codes
export const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // Custom error codes
  TOOL_EXECUTION_ERROR: -32000,
  TIMEOUT_ERROR: -32001,
  AUTHENTICATION_ERROR: -32002,
  RATE_LIMIT_EXCEEDED: -32003,
  INVALID_TOOL: -32004,
  RESOURCE_ERROR: -32005
} as const;

// Type guards

export function isWelcomeMessage(msg: any): msg is WelcomeMessage {
  return msg?.type === 'welcome';
}

export function isRegistrationAckMessage(msg: any): msg is RegistrationAckMessage {
  return msg?.type === 'registration_ack';
}

export function isEvaluationRequest(msg: any): msg is EvaluationRequest {
  return msg?.jsonrpc === '2.0' && msg?.method === 'evaluate';
}

export function isPongMessage(msg: any): msg is PongMessage {
  return msg?.type === 'pong';
}

// Helper functions

export function createRegisterMessage(
  clientId: string,
  capabilities: ClientCapabilities,
  secretKey?: string
): RegisterMessage {
  return {
    type: 'register',
    clientId,
    secretKey,
    capabilities
  };
}

export function createReadyMessage(): ReadyMessage {
  return {
    type: 'ready',
    timestamp: new Date().toISOString()
  };
}

export function createAuthVerifyMessage(clientId: string, verified: boolean): AuthVerifyMessage {
  return {
    type: 'auth_verify',
    clientId,
    verified
  };
}

export function createStatusMessage(
  evaluationId: string,
  status: 'running' | 'completed' | 'failed',
  progress?: number,
  message?: string
): StatusMessage {
  return {
    type: 'status',
    evaluationId,
    status,
    progress,
    message
  };
}

export function createSuccessResponse(
  id: string,
  output: any,
  executionTime: number,
  toolCalls?: ToolCall[],
  metadata?: Record<string, any>
): EvaluationSuccessResponse {
  return {
    jsonrpc: '2.0',
    result: {
      status: 'success',
      output,
      executionTime,
      toolCalls,
      metadata
    },
    id
  };
}

export function createErrorResponse(
  id: string,
  code: number,
  message: string,
  data?: any
): EvaluationErrorResponse {
  return {
    jsonrpc: '2.0',
    error: {
      code,
      message,
      data
    },
    id
  };
}

// LLM Configuration JSON-RPC Messages

export interface LLMConfigurationRequest {
  jsonrpc: '2.0';
  method: 'configure_llm';
  params: LLMConfigurationParams;
  id: string;
}

export interface LLMConfigurationParams {
  provider: 'openai' | 'litellm' | 'groq' | 'openrouter';
  apiKey?: string;
  endpoint?: string; // For LiteLLM
  models: {
    main: string;
    mini?: string;
    nano?: string;
  };
  // Optional: only update specific fields
  partial?: boolean;
}

export interface LLMConfigurationResponse {
  jsonrpc: '2.0';
  result: {
    status: 'success';
    message: string;
    appliedConfig: {
      provider: string;
      models: {
        main: string;
        mini: string;
        nano: string;
      };
    };
  };
  id: string;
}

// Type guard for LLM configuration
export function isLLMConfigurationRequest(msg: any): msg is LLMConfigurationRequest {
  return msg?.jsonrpc === '2.0' && msg?.method === 'configure_llm';
}

// Helper function for LLM configuration
export function createLLMConfigurationRequest(
  id: string,
  params: LLMConfigurationParams
): LLMConfigurationRequest {
  return {
    jsonrpc: '2.0',
    method: 'configure_llm',
    params,
    id
  };
}

export function createLLMConfigurationResponse(
  id: string,
  appliedConfig: {
    provider: string;
    models: {
      main: string;
      mini: string;
      nano: string;
    };
  }
): LLMConfigurationResponse {
  return {
    jsonrpc: '2.0',
    result: {
      status: 'success',
      message: 'LLM configuration updated successfully',
      appliedConfig
    },
    id
  };
}
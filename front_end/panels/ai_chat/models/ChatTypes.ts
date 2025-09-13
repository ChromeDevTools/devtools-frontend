// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Shared chat types extracted from ChatView. Keep UI-agnostic.

// Define possible entities for chat messages
export enum ChatMessageEntity {
  USER = 'user',
  MODEL = 'model',
  TOOL_RESULT = 'tool_result',
  AGENT_SESSION = 'agent_session',
}

// Base structure for all chat messages
export type UILane = 'chat' | 'agent';

export interface BaseChatMessage {
  entity: ChatMessageEntity;
  error?: string;
  // UI routing hint: which lane should render this message
  uiLane?: UILane;
  // If managed by an AgentSession, provide the session id for traceability
  managedByAgentSessionId?: string;
}

// Image input used by user messages
export interface ImageInputData {
  url: string;
  bytesBase64: string;
}

// User message
export interface UserChatMessage extends BaseChatMessage {
  entity: ChatMessageEntity.USER;
  text: string;
  imageInput?: ImageInputData;
}

// Model message
export interface ModelChatMessage extends BaseChatMessage {
  entity: ChatMessageEntity.MODEL;
  action: 'tool' | 'final';
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  answer?: string;
  isFinalAnswer: boolean;
  reasoning?: string[] | null;
  toolCallId?: string;
}

// Tool result message
export interface ToolResultMessage extends BaseChatMessage {
  entity: ChatMessageEntity.TOOL_RESULT;
  toolName: string;
  resultText: string;
  isError: boolean;
  resultData?: unknown;
  toolCallId?: string;
  isFromConfigurableAgent?: boolean;
  imageData?: string;
  summary?: string;
}

// Agent session message (lightweight reference; AgentSession type lives in agent_framework)
export interface AgentSessionMessage extends BaseChatMessage {
  entity: ChatMessageEntity.AGENT_SESSION;
  // Use `any` to avoid tight coupling here; UI components import the precise type.
  agentSession: any;
  triggerMessageId?: string;
  summary?: string;
}

export type ChatMessage =
    UserChatMessage|ModelChatMessage|ToolResultMessage|AgentSessionMessage;

// View state for the chat container
export enum State {
  IDLE = 'idle',
  LOADING = 'loading',
  ERROR = 'error',
}

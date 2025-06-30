// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import {type ChatMessage, ChatMessageEntity, type ImageInputData} from '../ui/ChatView.js';

const UIStrings = {
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/ai_chat/core/State.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * Represents the next action the agent intends to take.
 * This might become part of ModelChatMessage directly.
 */
export type NextAction =
    | { type: 'tool', toolName: string, toolArgs: Record<string, unknown> }
    | { type: 'final', answer: string }
    | { type: 'error', message: string }
    | null;

/**
 * Represents the state of the orchestrator agent
 */
export interface AgentState {
  messages: ChatMessage[];
  context: DevToolsContext;
  error?: string;
  selectedAgentType?: string | null; // Type of agent selected via UI button
  currentPageUrl?: string; // URL of the page when the message was sent
  currentPageTitle?: string; // Title of the page when the message was sent
}

/**
 * Represents the context from DevTools that the agent can use
 */
export interface DevToolsContext {
  // The currently selected DOM element
  selectedElement?: string;
  // The current network requests
  networkRequests?: NetworkRequest[];
  // The current console messages
  consoleMessages?: ConsoleMessage[];
  // The current performance metrics
  performanceMetrics?: PerformanceMetric[];
  // Last response from intermediate node that wasn't a valid tool or final action
  lastIntermediateResponse?: Record<string, unknown>;
  // Flag to indicate that the model needs to continue processing
  needsFollowUp?: boolean;
  // Counter for tracking the number of intermediate steps in the current chain
  intermediateStepsCount?: number;
  // Tracing context for distributed tracing
  tracingContext?: {
    sessionId: string;
    traceId: string;
    parentObservationId?: string;
  };
}

/**
 * Represents a network request
 */
export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  statusText: string;
  responseTime: number;
  size: number;
}

/**
 * Represents a console message
 */
export interface ConsoleMessage {
  text: string;
  level: 'log'|'info'|'warning'|'error';
  timestamp: number;
}

/**
 * Represents a performance metric
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
}

/**
 * Creates an initial state for the agent
 */
export function createInitialState(): AgentState {
  return {
    messages: [],
    context: {
      intermediateStepsCount: 0
    },
    selectedAgentType: null, // Default to no specific agent type
    currentPageUrl: '',
    currentPageTitle: '',
  };
}

/**
 * Creates a new user message
 */
export function createUserMessage(text: string, imageInput?: ImageInputData): ChatMessage {
  return {
    entity: ChatMessageEntity.USER,
    text,
    ...(imageInput && { imageInput }),
  };
}

/**
 * Creates a new model message
 * NOTE: This will likely be replaced by direct object creation in AgentNode
 */
export function createModelMessage(answer: string, isFinalAnswer = false): ChatMessage {
  // This function is now less useful as AgentNode creates the object directly
  // with action details. Keeping it temporarily might require updates later.
  return {
    entity: ChatMessageEntity.MODEL,
    action: 'final', // Assuming this simplified version is only for final answers now
    answer,
    isFinalAnswer,
  };
}

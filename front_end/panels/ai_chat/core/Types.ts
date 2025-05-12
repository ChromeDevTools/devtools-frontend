// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {AgentState} from './State.js';

/**
 * Interface for a runnable unit of work.
 */
export interface Runnable<TInput, TOutput> {
  invoke(input: TInput): Promise<TOutput>;
}

/**
 * Defines the types of nodes in the agent graph.
 */
export enum NodeType {
  AGENT = 'agent',
  TOOL_EXECUTOR = 'tool_executor',
  FINAL = 'final',
}

/**
 * Interface for the compiled orchestrator agent
 */
export interface CompiledGraph {
  invoke(state: AgentState): AsyncGenerator<AgentState, AgentState, void>;
  onStep?: (stepData: {text: string, type: string}) => void;
}

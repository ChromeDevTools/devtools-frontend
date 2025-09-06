// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';

export interface AgentRunnerProgressEvent {
  type: 'session_started' | 'tool_started' | 'tool_completed' | 'session_updated' | 'child_agent_started';
  sessionId: string;
  parentSessionId?: string;
  agentName: string;
  timestamp: Date;
  data: any;
}

export class AgentRunnerEventBus extends Common.ObjectWrapper.ObjectWrapper<{
  'agent-progress': AgentRunnerProgressEvent
}> {
  private static instance: AgentRunnerEventBus;
  
  static getInstance(): AgentRunnerEventBus {
    if (!this.instance) {
      this.instance = new AgentRunnerEventBus();
    }
    return this.instance;
  }
  
  emitProgress(event: AgentRunnerProgressEvent): void {
    this.dispatchEventToListeners('agent-progress', event);
  }
}

// Alternative: Callback-based approach for static context
export type ProgressCallback = (event: AgentRunnerProgressEvent) => void;
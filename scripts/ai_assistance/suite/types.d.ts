// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {SessionId, TaskId} from '../types.d.ts';

/* eslint-disable @typescript-eslint/naming-convention */
export interface Turn {
  turn_id: string;
  role: 'user'|'gemini';
  timestamp: number;
  tokens: Record<string, never>;
  content: string[];
  thoughts: Array<{
    subject: string,
    description: string,
    timestamp: number,
  }>;
  tool_calls: Array<{
    name: string,
    args: Record<string, unknown>,
    timestamp: number,
    status?: 'success'|'error',
    result?: unknown,
  }>;
}

/**
 * Represents the evaluation output format for a single conversation session,
 * containing metadata and the query/response turns.
 */
export interface Trajectory {
  metadata: {
    /**
     * Deterministic identifier for this trajectory session (`<15-char-hash>-<index>`,
     * e.g. `'07a8fb33eca1976-0'`), used in HTML reports and `.eval.json` filenames.
     */
    session_id: SessionId,
    /** LLM model identifier resolved by AIDA (e.g. `'gemini-2.5-pro'`). */
    model: string,
    chrome_version: string,
    /**
     * Identifies the auto-run task/example that produced this trajectory (e.g. `'life-with-charlie'`).
     * Matches `task_id` in `eval_task_completed.json` and the GCS `tasks/<taskId>/` directory.
     */
    task_id: TaskId,
  };
  data: Turn[];
}
/* eslint-enable @typescript-eslint/naming-convention */

// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
    session_id: string,
    model: string,
    chrome_version: string,
    auto_run_example_id: string,
  };
  data: Turn[];
}
/* eslint-enable @typescript-eslint/naming-convention */

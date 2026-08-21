// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @typescript-eslint/naming-convention */
export enum Role {
  USER = 'user',
  GEMINI = 'gemini',
}

export interface Turn {
  turn_id: string;
  role: Role;
  content: string[];
  tool_calls?: Array<{
    name: string,
    args: Record<string, unknown>,
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
    chromeVersion: string,
    autoRunExampleId: string,
    // These are explanations found in the input example HTML that can be used to
    // judge the AI's output.
    explanation: string,
  };
  data: Turn[];
}
/* eslint-enable @typescript-eslint/naming-convention */

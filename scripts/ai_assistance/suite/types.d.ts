// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @typescript-eslint/naming-convention */
export interface ProcessedQuery {
  request: {
    availableFunctionNames: string[],
    // Populated if the user typed a query
    content?: string,
    // Populated if the model decided it needed to call a function; this is the
    // frontend sending the data back to the server.
    functionCallResponse?: string,
  };
  response: {
    rpcGlobalId: string,
    // Populated if the LLM returned a text explanation that was complete.
    content?: string,
    // Populated as the name of the functions if the LLM requested it to be called
    tool_calls?: Array<{name: string, args: Record<string, unknown>}>,
  };
}

export interface EvalFileOutput {
  metadata: {
    start_time: string,
    id: string,
  };
  conversations: Conversation[];
}

export interface Conversation {
  session_id: string;
  chromeVersion: string;
  autoRunExampleId: string;
  // These are explanations found in the input example HTML that can be used to
  // judge the AI's output.
  explanation: string;
  model: {id: string, version: string};
  queries: ProcessedQuery[];
}
/* eslint-enable @typescript-eslint/naming-convention */

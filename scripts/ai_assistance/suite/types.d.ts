// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export interface ProcessedQuery {
  request: {
    availableFunctionNames: string[],
    // Populated if the user typed a query
    prompt?: string,
    // Populated if the model decided it needed to call a function; this is the
    // frontend sending the data back to the server.
    functionCallResponse?: string,
  };
  response: {
    rpcGlobalId: string,
    // Populated if the LLM returned a text explanation that was complete.
    text?: string,
    // Populated as the name of the functions if the LLM requested it to be called
    functionCallRequests?: Array<{name: string, args: Record<string, unknown>}>,
  };
}

export interface EvalFileOutput {
  metadata: {
    createdAt: string,
    id: string,
  };
  conversations: Conversation[];
}

export interface Conversation {
  id: string;
  chromeVersion: string;
  autoRunExampleId: string;
  // These are explanations found in the input example HTML that can be used to
  // judge the AI's output.
  explanation: string;
  model: {id: string, version: string};
  queries: ProcessedQuery[];
}

// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// We use ts-ignore here because the error is about the imported file not being
// part of this project. We do not want to make it part of the project & start
// pulling in half of DevTools, so we import the types but ignore the error.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import type {DoConversationRequest, DoConversationResponse} from '../../front_end/core/host/AidaClient.ts';

export type {RpcGlobalId} from '../../front_end/core/host/AidaClient.ts';

declare global {
  interface Window {
    aiAssistanceTestPatchPrompt?(folderName: string, query: string, changedFiles: Array<{
                                   path: string,
                                   matches: string[],
                                   doesNotMatch?: string[],
                                 }>): Promise<{assertionFailures: string[], debugInfo: string, error?: string}>;
    setDebugAiAssistanceEnabled?(enabled: boolean): void;
    // Define the structure expected for __commentElements if possible
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __commentElements?: Array<{comment: string, commentElement: Comment, targetElement: Element|null}>;
  }
  /** Define the custom event if needed **/
  interface WindowEventMap {
    aiassistancedone: CustomEvent;
  }
}

/**
 * The result of running auto_freestyler against all the provided examples.
 */
export interface RunResult {
  allExampleResults: IndividualPromptRequestResponse[];
  metadata: ExampleMetadata[];
}

/**
 * The result of running a single example.
 */
export interface ExecutedExample {
  results: IndividualPromptRequestResponse[];
  metadata: ExampleMetadata;
}

/**
 * The result of making a single request to Aida.
 */
/* eslint-disable @typescript-eslint/naming-convention */
export interface IndividualPromptRequestResponse {
  request: string|DoConversationRequest;
  aidaResponse: string|DoConversationResponse;
  session_id: string;
  /** Automatically computed score [0-1]. */
  score?: number;
  error?: string;
  assertionFailures?: string[];
}

export interface ExampleMetadata {
  session_id: string;
  explanation: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

export type TestTarget =
    'elements'|'performance-main-thread'|'performance'|'performance-insights'|'elements-multimodal'|'patching';

// Clang cannot handle the Record<> syntax over multiple lines, it seems.
/* clang-format off */
export type Logs = Record<string, {
  index: number,
  text: string,
}> ;
/* clang-format on */

export interface PatchTest {
  repository: string;
  folderName: string;
  query: string;
  changedFiles: Array<{path: string, matches: string[], doesNotMatch?: string[]}>;
}

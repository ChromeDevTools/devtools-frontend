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

/**
 * Overview of identifiers used across `auto-run`, the eval suite, and GCS uploads:
 *
 * 1. `PROJECT_ID` (`'ai_evals'`): Top-level GCS namespace and BigQuery project prefix
 *    (`gs://<bucket>/<PROJECT_ID>/runs/<runId>/...`).
 * 2. `RunId` (`runId` / `run_id`): Unique identifier for one `auto-run` suite execution,
 *    formatted as `<YYYY-MM-DD-HHmmss>-<4-hex>-<7-hex>` (e.g. `'2026-09-09-163101-41bf-5d75f29'`).
 * 3. `TaskId` (`taskId` / `task_id`): Identifies a single example/task within a run,
 *    derived from the example URL filename without `.html` (e.g. `'life-with-charlie'`).
 *    Used consistently as the GCS task folder (`runs/<runId>/tasks/<taskId>/output/`),
 *    `task_id` in `eval_task_completed.json`, `taskId` on raw prompt logs, and
 *    `Trajectory['metadata']['task_id']`.
 * 4. `SessionId` (`Trajectory['metadata']['session_id']`): Deterministic trajectory identifier
 *    formatted as `<15-char-hash>-<index>` (e.g. `'07a8fb33eca1976-0'`), minted by
 *    `convertRawOutputToEval` and used in `trajectory.json` and local `.eval.json` filenames.
 * 5. `TurnId` (`Turn['turn_id']`): 1-based sequential string counter (`'1'`, `'2'`, ...)
 *    identifying each chronological user or Gemini turn inside `Trajectory['data']`.
 * 6. `RpcGlobalId` (`rpcGlobalId`): Unique per-response RPC identifier from the AIDA backend,
 *    used in `Example.execute()` to deduplicate cumulative `localStorage` logs across turns.
 */
export type RunId = string;
export type TaskId = string;
export type SessionId = string;

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
export interface IndividualPromptRequestResponse {
  request: string|DoConversationRequest;
  aidaResponse: string|DoConversationResponse;
  /** Identifies the auto-run example/task that produced this prompt turn (e.g. `'life-with-charlie'`). */
  taskId: TaskId;
  /** Automatically computed score [0-1]. */
  score?: number;
  error?: string;
  assertionFailures?: string[];
}

export interface ExampleMetadata {
  /** Identifies the auto-run example/task (e.g. `'life-with-charlie'`). */
  taskId: TaskId;
  explanation: string;
}

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

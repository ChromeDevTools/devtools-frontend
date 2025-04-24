// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {AidaRequest} from '../../front_end/core/host/AidaClient.ts';

/**
 * Some types used in auto-run.js. They only exist here because it's
 * nicer to define these types in a .d.ts file than JSDOc syntax.
 */

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
  request: AidaRequest|string;
  response: string|object;
  exampleId: string;
  /** Automatically computed score [0-1]. */
  score?: number;
}

export interface ExampleMetadata {
  exampleId: string;
  explanation: string;
}

/**
 * The CLI arguments people can use to configure the run.
 */
export interface YargsInput {
  exampleUrls: string[];
  label: string;
  parallel: boolean;
  includeFollowUp: boolean;
  times: number;
  testTarget: TestTarget;
}
export type TestTarget = 'elements'|'performance-main-thread'|'performance-insights'|'elements-multimodal'|'patching';

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

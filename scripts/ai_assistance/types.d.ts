import {AidaRequest} from '../../front_end/core/host/AidaClient.ts'

/**
 * Some types used in auto-run.js. They only exist here because it's
 * nicer to define these types in a .d.ts file than JSDOc syntax.
 */

/**
 * The result of running auto_freestyler against all the provided examples.
 */
export interface RunResult {
  allExampleResults: IndividualPromptRequestResponse[];
  metadata: ExampleMetadata[]
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
  request: AidaRequest;
  response: string;
  exampleId: string;
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
  testTarget: 'elements'|'performance';
}

// Clang cannot handle the Record<> syntax over multiple lines, it seems.
/* clang-format off */
export type Logs = Record<string, {
  index: number;
  text: string;
}> ;
/* clang-format on */

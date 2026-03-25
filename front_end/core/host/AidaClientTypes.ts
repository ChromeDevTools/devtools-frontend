// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export enum Role {
  /** Provide this role when giving a function call response  */
  ROLE_UNSPECIFIED = 0,
  /** Tags the content came from the user */
  USER = 1,
  /** Tags the content came from the LLM */
  MODEL = 2,
}

export const enum Rating {
  // Resets the vote to null in the logs
  SENTIMENT_UNSPECIFIED = 'SENTIMENT_UNSPECIFIED',
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
}

/**
 * A `Content` represents a single turn message.
 */
export interface Content {
  parts: Part[];
  /** The producer of the content. */
  role: Role;
}

export type Part = {
  text: string,
}|{
  functionCall: {
    name: string,
    args: Record<string, unknown>,
  },
}|{
  functionResponse: {
    name: string,
    response: Record<string, unknown>,
  },
}|{
  /** Inline media bytes. */
  inlineData: MediaBlob,
};

export const enum ParametersTypes {
  STRING = 1,
  NUMBER = 2,
  INTEGER = 3,
  BOOLEAN = 4,
  ARRAY = 5,
  OBJECT = 6,
}

interface BaseFunctionParam {
  description: string;
  nullable?: boolean;
}

export interface FunctionPrimitiveParams extends BaseFunctionParam {
  type: ParametersTypes.BOOLEAN|ParametersTypes.INTEGER|ParametersTypes.STRING;
}

export interface FunctionArrayParam extends BaseFunctionParam {
  type: ParametersTypes.ARRAY;
  items: FunctionPrimitiveParams;
}

export interface FunctionObjectParam<T extends string|number|symbol = string> extends BaseFunctionParam {
  type: ParametersTypes.OBJECT;
  // TODO: this can be also be ObjectParams
  properties: Record<T, FunctionPrimitiveParams|FunctionArrayParam>;
  required: T[];
}

/**
 * More about function declaration can be read at
 * https://ai.google.dev/gemini-api/docs/function-calling
 */
export interface FunctionDeclaration<T extends string|number|symbol = string> {
  name: string;
  /**
   * A description for the LLM to understand what the specific function will do once called.
   */
  description: string;
  parameters: FunctionObjectParam<T>;
}

/** Raw media bytes. **/
export interface MediaBlob {
  // The IANA standard MIME type of the source data.
  // Currently supported types are: image/png, image/jpeg.
  // Format: base64-encoded
  // For reference: google3/google/x/pitchfork/aida/v1/content.proto
  mimeType: string;
  data: string;
}

export enum FunctionalityType {
  // Unspecified functionality type.
  FUNCTIONALITY_TYPE_UNSPECIFIED = 0,
  // The generic AI chatbot functionality.
  CHAT = 1,
  // The explain error functionality.
  EXPLAIN_ERROR = 2,
  AGENTIC_CHAT = 5,
}

/** See: cs/aida.proto (google3). **/
export enum ClientFeature {
  // Unspecified client feature.
  CLIENT_FEATURE_UNSPECIFIED = 0,
  // Chrome console insights feature.
  CHROME_CONSOLE_INSIGHTS = 1,
  // Chrome AI Assistance Styling Agent.
  CHROME_STYLING_AGENT = 2,
  // Chrome AI Assistance Network Agent.
  CHROME_NETWORK_AGENT = 7,
  // Chrome AI Annotations Performance Agent
  CHROME_PERFORMANCE_ANNOTATIONS_AGENT = 20,
  // Chrome AI Assistance File Agent.
  CHROME_FILE_AGENT = 9,
  // Chrome AI Patch Agent.
  CHROME_PATCH_AGENT = 12,
  // Chrome AI Assistance Performance Agent.
  CHROME_PERFORMANCE_FULL_AGENT = 24,
  // Chrome Context Selection Agent.
  CHROME_CONTEXT_SELECTION_AGENT = 25,
  // Chrome Accessibility Agent
  CHROME_ACCESSIBILITY_AGENT = 26,
  // Chrome AI Assistance Conversation Summary Agent.
  CHROME_CONVERSATION_SUMMARY_AGENT = 27,
}

export enum UserTier {
  // Unspecified user tier.
  USER_TIER_UNSPECIFIED = 0,
  // Users who are internal testers.
  TESTERS = 1,
  // Users who are early adopters.
  BETA = 2,
  // Users in the general public.
  PUBLIC = 3,
}

/** Googlers: see the Aida `retrieval` proto; this type is based on that. **/
export interface RequestFactMetadata {
  /**
   * A description of where the fact comes from.
   */
  source: string;
  /**
   * Optional: a score to give this fact. Used because
   * if there are more facts than space in the context window,
   * higher scoring facts will be prioritized.
   */
  score?: number;
}
export interface RequestFact {
  /**
   * Content of the fact.
   */
  text: string;
  metadata: RequestFactMetadata;
}

export type RpcGlobalId = string|number;

/* eslint-disable @typescript-eslint/naming-convention */
export interface RequestMetadata {
  string_session_id?: string;
  user_tier?: UserTier;
  disable_user_content_logging: boolean;
  client_version: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
export interface ConversationOptions {
  temperature?: number;
  model_id?: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
export interface DoConversationRequest {
  client: string;
  current_message: Content;
  preamble?: string;
  historical_contexts?: Content[];
  function_declarations?: FunctionDeclaration[];
  facts?: RequestFact[];
  options?: ConversationOptions;
  metadata: RequestMetadata;
  functionality_type?: FunctionalityType;
  client_feature?: ClientFeature;
}
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
export interface CompleteCodeOptions {
  temperature?: number;
  model_id?: string;
  inference_language?: AidaInferenceLanguage;
  stop_sequences?: string[];
}
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
export interface GenerateCodeOptions {
  temperature?: number;
  model_id?: string;
  inference_language?: AidaInferenceLanguage;
  expect_code_output?: boolean;
}
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention */
export interface ContextFile {
  path: string;
  full_content: string;
  selected_content?: string;
  programming_language: AidaInferenceLanguage;
}
/* eslint-enable @typescript-eslint/naming-convention */

export enum EditType {
  // Unknown edit type
  EDIT_TYPE_UNSPECIFIED = 0,
  // User typed code/text into file
  ADD = 1,
  // User deleted code/text from file
  DELETE = 2,
  // User pasted into file (this includes smart paste)
  PASTE = 3,
  // User performs an undo action
  UNDO = 4,
  // User performs a redo action
  REDO = 5,
  // User accepted a completion from AIDA
  ACCEPT_COMPLETION = 6,
}

export enum Reason {
  // Unknown reason.
  UNKNOWN = 0,

  // The file is currently open.
  CURRENTLY_OPEN = 1,

  // The file is opened recently.
  RECENTLY_OPENED = 2,

  // The file is edited recently.
  RECENTLY_EDITED = 3,

  // The file is located within the same directory.
  COLOCATED = 4,

  // Included based on relation to code around the cursor (e.g: could be
  // provided by local IDE analysis)
  RELATED_FILE = 5,
}

/* eslint-disable @typescript-eslint/naming-convention */
export interface AdditionalFile {
  path: string;
  content: string;
  included_reason: Reason;
}

export interface CompletionRequest {
  client: string;
  prefix: string;
  suffix?: string;
  options?: CompleteCodeOptions;
  metadata: RequestMetadata;
  last_user_action?: EditType;
  additional_files?: AdditionalFile[];
}
/* eslint-enable @typescript-eslint/naming-convention */

export enum UseCase {
  // Unspecified usecase.
  USE_CASE_UNSPECIFIED = 0,

  // Code generation use case is expected to generate code from scratch
  CODE_GENERATION = 1,

  // Code transformation or code editing use case.
  CODE_TRANSFORMATION = 2,
}

/* eslint-disable @typescript-eslint/naming-convention */
export interface GenerateCodeRequest {
  client: string;
  preamble: string;
  current_message: Content;
  options?: GenerateCodeOptions;
  context_files?: ContextFile[];
  use_case: UseCase;
  metadata: RequestMetadata;
  client_feature?: ClientFeature;
}
/* eslint-enable @typescript-eslint/naming-convention */

/* eslint-disable @typescript-eslint/naming-convention  */
export interface DoConversationClientEvent {
  user_feedback: {
    sentiment?: Rating,
    user_input?: {
      comment?: string,
    },
  };
}

export interface UserImpression {
  sample: {
    sample_id?: number,
  };
  latency: {
    duration: {
      seconds: number,
      nanos: number,
    },
  };
}

export interface UserAcceptance {
  sample: {
    sample_id?: number,
  };
}

export interface AidaRegisterClientEvent {
  corresponding_aida_rpc_global_id: RpcGlobalId;
  disable_user_content_logging: boolean;
  do_conversation_client_event?: DoConversationClientEvent;
  complete_code_client_event?: {user_acceptance: UserAcceptance}|{user_impression: UserImpression};
  generate_code_client_event?: {user_acceptance: UserAcceptance}|{user_impression: UserImpression};
}
/* eslint-enable @typescript-eslint/naming-convention */

export enum RecitationAction {
  ACTION_UNSPECIFIED = 'ACTION_UNSPECIFIED',
  CITE = 'CITE',
  BLOCK = 'BLOCK',
  NO_ACTION = 'NO_ACTION',
  EXEMPT_FOUND_IN_PROMPT = 'EXEMPT_FOUND_IN_PROMPT',
}

export enum CitationSourceType {
  CITATION_SOURCE_TYPE_UNSPECIFIED = 'CITATION_SOURCE_TYPE_UNSPECIFIED',
  TRAINING_DATA = 'TRAINING_DATA',
  WORLD_FACTS = 'WORLD_FACTS',
  LOCAL_FACTS = 'LOCAL_FACTS',
  INDIRECT = 'INDIRECT',
}

export interface Citation {
  startIndex?: number;
  endIndex?: number;
  uri?: string;
  sourceType?: CitationSourceType;
  repository?: string;
}

export interface AttributionMetadata {
  attributionAction: RecitationAction;
  citations: Citation[];
}

export interface AidaFunctionCallResponse {
  name: string;
  args: Record<string, unknown>;
}

export interface FactualityFact {
  sourceUri?: string;
}

export interface FactualityMetadata {
  facts: FactualityFact[];
}

export interface ResponseMetadata {
  rpcGlobalId?: RpcGlobalId;
  attributionMetadata?: AttributionMetadata;
  factualityMetadata?: FactualityMetadata;
}

export interface DoConversationResponse {
  explanation: string;
  metadata: ResponseMetadata;
  functionCalls?: [AidaFunctionCallResponse, ...AidaFunctionCallResponse[]];
  completed: boolean;
}

export interface CompletionResponse {
  generatedSamples: GenerationSample[];
  metadata: ResponseMetadata;
}

export interface GenerateCodeResponse {
  samples: GenerationSample[];
  metadata: ResponseMetadata;
}

export interface GenerationSample {
  generationString: string;
  score: number;
  sampleId?: number;
  attributionMetadata?: AttributionMetadata;
}

export const enum AidaAccessPreconditions {
  AVAILABLE = 'available',
  NO_ACCOUNT_EMAIL = 'no-account-email',
  NO_INTERNET = 'no-internet',
  // This is the state (mostly enterprise) users are in, when they are automatically logged out from
  // Chrome after a certain time period. For making AIDA requests, they need to log in again.
  SYNC_IS_PAUSED = 'sync-is-paused',
}

export const enum AidaInferenceLanguage {
  CPP = 'CPP',
  PYTHON = 'PYTHON',
  KOTLIN = 'KOTLIN',
  JAVA = 'JAVA',
  JAVASCRIPT = 'JAVASCRIPT',
  GO = 'GO',
  TYPESCRIPT = 'TYPESCRIPT',
  HTML = 'HTML',
  BASH = 'BASH',
  CSS = 'CSS',
  DART = 'DART',
  JSON = 'JSON',
  MARKDOWN = 'MARKDOWN',
  VUE = 'VUE',
  XML = 'XML',
  UNKNOWN = 'UNKNOWN',
}

export interface AidaChunkResponse {
  metadata?: ResponseMetadata;
  textChunk?: {
    text: string,
  };
  codeChunk?: {
    code: string,
    inferenceLanguage: AidaInferenceLanguage,
  };
  functionCallChunk?: {
    functionCall: {
      name: string,
      args: Record<string, unknown>,
    },
  };
  error?: string;
}

export function debugLog(...log: unknown[]): void {
  if (!Boolean(localStorage.getItem('debugAiServicesEnabled'))) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(...log);
}

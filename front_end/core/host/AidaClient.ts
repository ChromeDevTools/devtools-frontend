// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Root from '../root/root.js';

import * as DispatchHttpRequestClient from './DispatchHttpRequestClient.js';
import {InspectorFrontendHostInstance} from './InspectorFrontendHost.js';
import type {AidaClientResult, AidaCodeCompleteResult, SyncInformation} from './InspectorFrontendHostAPI.js';
import {bindOutputStream} from './ResourceLoader.js';

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
  type: ParametersTypes.BOOLEAN|ParametersTypes.INTEGER|ParametersTypes.STRING|ParametersTypes.BOOLEAN;
}

interface FunctionArrayParam extends BaseFunctionParam {
  type: ParametersTypes.ARRAY;
  items: FunctionPrimitiveParams;
}

export interface FunctionObjectParam<T extends string|number|symbol = string> extends BaseFunctionParam {
  type: ParametersTypes.OBJECT;
  // TODO: this can be also be ObjectParams
  properties: Record<T, FunctionPrimitiveParams|FunctionArrayParam>;
  required: string[];
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

  // Removed features (for reference).
  // Chrome AI Assistance Performance Insights Agent.
  // CHROME_PERFORMANCE_INSIGHTS_AGENT = 13,
  // Chrome AI Assistance Performance Agent (call trees).
  // CHROME_PERFORMANCE_AGENT = 8,
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
}

const AidaLanguageToMarkdown: Record<AidaInferenceLanguage, string> = {
  CPP: 'cpp',
  PYTHON: 'py',
  KOTLIN: 'kt',
  JAVA: 'java',
  JAVASCRIPT: 'js',
  GO: 'go',
  TYPESCRIPT: 'ts',
  HTML: 'html',
  BASH: 'sh',
  CSS: 'css',
  DART: 'dart',
  JSON: 'json',
  MARKDOWN: 'md',
  VUE: 'vue',
  XML: 'xml',
};

export const CLIENT_NAME = 'CHROME_DEVTOOLS';
export const SERVICE_NAME = 'aidaService';

const CODE_CHUNK_SEPARATOR = (lang = ''): string => ('\n`````' + lang + '\n');

export class AidaAbortError extends Error {}
export class AidaBlockError extends Error {}

export class AidaClient {
  static buildConsoleInsightsRequest(input: string): DoConversationRequest {
    const disallowLogging = Root.Runtime.hostConfig.aidaAvailability?.disallowLogging ?? true;
    const chromeVersion = Root.Runtime.getChromeVersion();
    if (!chromeVersion) {
      throw new Error('Cannot determine Chrome version');
    }
    const request: DoConversationRequest = {
      current_message: {parts: [{text: input}], role: Role.USER},
      client: CLIENT_NAME,
      functionality_type: FunctionalityType.EXPLAIN_ERROR,
      client_feature: ClientFeature.CHROME_CONSOLE_INSIGHTS,
      metadata: {
        disable_user_content_logging: disallowLogging,
        client_version: chromeVersion,
      },
    };

    let temperature = -1;
    let modelId;
    if (Root.Runtime.hostConfig.devToolsConsoleInsights?.enabled) {
      temperature = Root.Runtime.hostConfig.devToolsConsoleInsights.temperature ?? -1;
      modelId = Root.Runtime.hostConfig.devToolsConsoleInsights.modelId;
    }
    if (temperature >= 0) {
      request.options ??= {};
      request.options.temperature = temperature;
    }
    if (modelId) {
      request.options ??= {};
      request.options.model_id = modelId;
    }
    return request;
  }

  static async checkAccessPreconditions(): Promise<AidaAccessPreconditions> {
    if (!navigator.onLine) {
      return AidaAccessPreconditions.NO_INTERNET;
    }

    const syncInfo = await new Promise<SyncInformation>(
        resolve => InspectorFrontendHostInstance.getSyncInformation(syncInfo => resolve(syncInfo)));
    if (!syncInfo.accountEmail) {
      return AidaAccessPreconditions.NO_ACCOUNT_EMAIL;
    }

    if (syncInfo.isSyncPaused) {
      return AidaAccessPreconditions.SYNC_IS_PAUSED;
    }

    return AidaAccessPreconditions.AVAILABLE;
  }

  async *
      doConversation(request: DoConversationRequest, options?: {signal?: AbortSignal}):
          AsyncGenerator<DoConversationResponse, void, void> {
    if (!InspectorFrontendHostInstance.doAidaConversation) {
      throw new Error('doAidaConversation is not available');
    }
    const stream = (() => {
      let {promise, resolve, reject} = Promise.withResolvers<string|null>();
      options?.signal?.addEventListener('abort', () => {
        reject(new AidaAbortError());
      }, {once: true});
      return {
        write: async(data: string): Promise<void> => {
          resolve(data);
          ({promise, resolve, reject} = Promise.withResolvers<string|null>());
        },
        close: async(): Promise<void> => {
          resolve(null);
        },
        read: (): Promise<string|null> => {
          return promise;
        },
        fail: (e: Error) => reject(e),
      };
    })();
    const streamId = bindOutputStream(stream);
    InspectorFrontendHostInstance.doAidaConversation(JSON.stringify(request), streamId, result => {
      if (result.statusCode === 403) {
        stream.fail(new Error('Server responded: permission denied'));
      } else if (result.error) {
        stream.fail(new Error(`Cannot send request: ${result.error} ${result.detail || ''}`));
      } else if (result.netErrorName === 'net::ERR_TIMED_OUT') {
        stream.fail(new Error('doAidaConversation timed out'));
      } else if (result.statusCode !== 200) {
        stream.fail(new Error(`Request failed: ${JSON.stringify(result)}`));
      } else {
        void stream.close();
      }
    });
    let chunk;
    const text = [];
    let inCodeChunk = false;
    const functionCalls: AidaFunctionCallResponse[] = [];
    let metadata: ResponseMetadata = {rpcGlobalId: 0};
    while ((chunk = await stream.read())) {
      let textUpdated = false;
      // The AIDA response is a JSON array of objects, split at the object
      // boundary. Therefore each chunk may start with `[` or `,` and possibly
      // followed by `]`. Each chunk may include one or more objects, so we
      // make sure that each chunk becomes a well-formed JSON array when we
      // parse it by adding `[` and `]` and removing `,` where appropriate.
      if (!chunk.length) {
        continue;
      }
      if (chunk.startsWith(',')) {
        chunk = chunk.slice(1);
      }
      if (!chunk.startsWith('[')) {
        chunk = '[' + chunk;
      }
      if (!chunk.endsWith(']')) {
        chunk = chunk + ']';
      }
      let results;
      try {
        results = JSON.parse(chunk);
      } catch (error) {
        throw new Error('Cannot parse chunk: ' + chunk, {cause: error});
      }

      for (const result of results) {
        if ('metadata' in result) {
          metadata = result.metadata;
          if (metadata?.attributionMetadata?.attributionAction === RecitationAction.BLOCK) {
            throw new AidaBlockError();
          }
        }
        if ('textChunk' in result) {
          if (inCodeChunk) {
            text.push(CODE_CHUNK_SEPARATOR());
            inCodeChunk = false;
          }

          text.push(result.textChunk.text);
          textUpdated = true;
        } else if ('codeChunk' in result) {
          if (!inCodeChunk) {
            const language = AidaLanguageToMarkdown[result.codeChunk.inferenceLanguage as AidaInferenceLanguage] ?? '';
            text.push(CODE_CHUNK_SEPARATOR(language));
            inCodeChunk = true;
          }

          text.push(result.codeChunk.code);
          textUpdated = true;
        } else if ('functionCallChunk' in result) {
          functionCalls.push({
            name: result.functionCallChunk.functionCall.name,
            args: result.functionCallChunk.functionCall.args,
          });
        } else if ('error' in result) {
          throw new Error(`Server responded: ${JSON.stringify(result)}`);
        } else {
          throw new Error('Unknown chunk result');
        }
      }
      if (textUpdated) {
        yield {
          explanation: text.join('') + (inCodeChunk ? CODE_CHUNK_SEPARATOR() : ''),
          metadata,
          completed: false,
        };
      }
    }
    yield {
      explanation: text.join('') + (inCodeChunk ? CODE_CHUNK_SEPARATOR() : ''),
      metadata,
      functionCalls: functionCalls.length ? functionCalls as [AidaFunctionCallResponse, ...AidaFunctionCallResponse[]] :
                                            undefined,
      completed: true,
    };
  }

  registerClientEvent(clientEvent: AidaRegisterClientEvent): Promise<AidaClientResult> {
    const {promise, resolve} = Promise.withResolvers<AidaClientResult>();
    InspectorFrontendHostInstance.registerAidaClientEvent(
        JSON.stringify({
          client: CLIENT_NAME,
          event_time: new Date().toISOString(),
          ...clientEvent,
        }),
        resolve,
    );

    return promise;
  }

  async completeCode(request: CompletionRequest): Promise<CompletionResponse|null> {
    if (!InspectorFrontendHostInstance.aidaCodeComplete) {
      throw new Error('aidaCodeComplete is not available');
    }
    const {promise, resolve} = Promise.withResolvers<AidaCodeCompleteResult>();
    InspectorFrontendHostInstance.aidaCodeComplete(JSON.stringify(request), resolve);
    const completeCodeResult = await promise;

    if (completeCodeResult.error) {
      throw new Error(`Cannot send request: ${completeCodeResult.error} ${completeCodeResult.detail || ''}`);
    }
    const response = completeCodeResult.response;
    if (!response?.length) {
      throw new Error('Empty response');
    }
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (error) {
      throw new Error('Cannot parse response: ' + response, {cause: error});
    }

    const generatedSamples: GenerationSample[] = [];
    let metadata: ResponseMetadata = {rpcGlobalId: 0};
    if ('metadata' in parsedResponse) {
      metadata = parsedResponse.metadata;
    }

    if ('generatedSamples' in parsedResponse) {
      for (const generatedSample of parsedResponse.generatedSamples) {
        const sample: GenerationSample = {
          generationString: generatedSample.generationString,
          score: generatedSample.score,
          sampleId: generatedSample.sampleId,
        };
        if ('metadata' in generatedSample && 'attributionMetadata' in generatedSample.metadata) {
          sample.attributionMetadata = generatedSample.metadata.attributionMetadata;
        }
        generatedSamples.push(sample);
      }
    } else {
      return null;
    }

    return {generatedSamples, metadata};
  }

  async generateCode(request: GenerateCodeRequest, options?: {signal?: AbortSignal}):
      Promise<GenerateCodeResponse|null> {
    const response = await DispatchHttpRequestClient.makeHttpRequest<GenerateCodeResponse>(
        {
          service: SERVICE_NAME,
          path: '/v1/aida:generateCode',
          method: 'POST',
          body: JSON.stringify(request),
        },
        options);

    return response;
  }
}

export function convertToUserTierEnum(userTier: string|undefined): UserTier {
  if (userTier) {
    switch (userTier) {
      case 'TESTERS':
        return UserTier.TESTERS;
      case 'BETA':
        return UserTier.BETA;
      case 'PUBLIC':
        return UserTier.PUBLIC;
    }
  }
  return UserTier.PUBLIC;
}

let hostConfigTrackerInstance: HostConfigTracker|undefined;

export class HostConfigTracker extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #pollTimer?: number;
  #aidaAvailability?: AidaAccessPreconditions;

  private constructor() {
    super();
  }

  static instance(): HostConfigTracker {
    if (!hostConfigTrackerInstance) {
      hostConfigTrackerInstance = new HostConfigTracker();
    }
    return hostConfigTrackerInstance;
  }

  override addEventListener(eventType: Events, listener: Common.EventTarget.EventListener<EventTypes, Events>):
      Common.EventTarget.EventDescriptor<EventTypes> {
    const isFirst = !this.hasEventListeners(eventType);
    const eventDescriptor = super.addEventListener(eventType, listener);
    if (isFirst) {
      window.clearTimeout(this.#pollTimer);
      void this.pollAidaAvailability();
    }
    return eventDescriptor;
  }

  override removeEventListener(eventType: Events, listener: Common.EventTarget.EventListener<EventTypes, Events>):
      void {
    super.removeEventListener(eventType, listener);
    if (!this.hasEventListeners(eventType)) {
      window.clearTimeout(this.#pollTimer);
    }
  }

  async pollAidaAvailability(): Promise<void> {
    this.#pollTimer = window.setTimeout(() => this.pollAidaAvailability(), 2000);
    const currentAidaAvailability = await AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = currentAidaAvailability;
      const config =
          await new Promise<Root.Runtime.HostConfig>(resolve => InspectorFrontendHostInstance.getHostConfig(resolve));
      Object.assign(Root.Runtime.hostConfig, config);
      // TODO(crbug.com/442545623): Send `currentAidaAvailability` to the listeners as part of the event so that
      // `await AidaClient.checkAccessPreconditions()` does not need to be called again in the event handlers.
      this.dispatchEventToListeners(Events.AIDA_AVAILABILITY_CHANGED);
    }
  }
}

export const enum Events {
  AIDA_AVAILABILITY_CHANGED = 'aidaAvailabilityChanged',
}

export interface EventTypes {
  [Events.AIDA_AVAILABILITY_CHANGED]: void;
}

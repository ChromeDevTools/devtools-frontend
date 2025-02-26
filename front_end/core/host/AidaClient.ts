// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Root from '../root/root.js';

import {InspectorFrontendHostInstance} from './InspectorFrontendHost.js';
import type {AidaClientResult, SyncInformation} from './InspectorFrontendHostAPI.js';
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

// Raw media bytes.
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

export enum ClientFeature {
  // Unspecified client feature.
  CLIENT_FEATURE_UNSPECIFIED = 0,
  // Chrome console insights feature.
  CHROME_CONSOLE_INSIGHTS = 1,
  // Chrome AI Assistance Styling Agent.
  CHROME_STYLING_AGENT = 2,
  // Chrome AI Assistance Network Agent.
  CHROME_NETWORK_AGENT = 7,
  // Chrome AI Assistance Performance Agent.
  CHROME_PERFORMANCE_AGENT = 8,
  // Chrome AI Assistance File Agent.
  CHROME_FILE_AGENT = 9,
  // Chrome AI Patch Agent.
  CHROME_PATCH_AGENT = 12,
  // Chrome AI Assistance Performance Insights Agent.
  CHROME_PERFORMANCE_INSIGHTS_AGENT = 14,
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

export type RpcGlobalId = string|number;

export interface AidaRequest {
  client: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  current_message: Content;
  preamble?: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  historical_contexts?: Content[];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  function_declarations?: FunctionDeclaration[];
  options?: {
    temperature?: number,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    model_id?: string,
  };
  metadata: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    disable_user_content_logging: boolean,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    client_version: string,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    string_session_id?: string,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    user_tier?: UserTier,
  };
  // eslint-disable-next-line @typescript-eslint/naming-convention
  functionality_type?: FunctionalityType;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  client_feature?: ClientFeature;
}

export interface AidaDoConversationClientEvent {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  corresponding_aida_rpc_global_id: RpcGlobalId;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  disable_user_content_logging: boolean;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  do_conversation_client_event: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    user_feedback: {
      sentiment?: Rating,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      user_input?: {
        comment?: string,
      },
    },
  };
}

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
  INDIRECT = 'INDERECT',
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

export interface AidaResponseMetadata {
  rpcGlobalId?: RpcGlobalId;
  attributionMetadata?: AttributionMetadata;
  factualityMetadata?: FactualityMetadata;
}

export interface AidaResponse {
  explanation: string;
  metadata: AidaResponseMetadata;
  functionCalls?: [AidaFunctionCallResponse, ...AidaFunctionCallResponse[]];
  completed: boolean;
}

export const enum AidaAccessPreconditions {
  AVAILABLE = 'available',
  NO_ACCOUNT_EMAIL = 'no-account-email',
  NO_INTERNET = 'no-internet',
  // This is the state (mostly enterprise) users are in, when they are automatically logged out from
  // Chrome after a certain time period. For making AIDA requests, they need to log in again.
  SYNC_IS_PAUSED = 'sync-is-paused',
}

export const CLIENT_NAME = 'CHROME_DEVTOOLS';

const CODE_CHUNK_SEPARATOR = '\n`````\n';

export class AidaAbortError extends Error {}
export class AidaBlockError extends Error {}

export class AidaClient {
  static buildConsoleInsightsRequest(input: string): AidaRequest {
    const {hostConfig} = Root.Runtime;
    let temperature = -1;
    let modelId = '';
    if (hostConfig.devToolsConsoleInsights?.enabled) {
      temperature = hostConfig.devToolsConsoleInsights.temperature ?? -1;
      modelId = hostConfig.devToolsConsoleInsights.modelId || '';
    }
    const disallowLogging = hostConfig.aidaAvailability?.disallowLogging ?? true;
    const chromeVersion = Root.Runtime.getChromeVersion();
    if (!chromeVersion) {
      throw new Error('Cannot determine Chrome version');
    }
    const request: AidaRequest = {
      current_message: {parts: [{text: input}], role: Role.USER},
      client: CLIENT_NAME,
      functionality_type: FunctionalityType.EXPLAIN_ERROR,
      client_feature: ClientFeature.CHROME_CONSOLE_INSIGHTS,
      metadata: {
        disable_user_content_logging: disallowLogging,
        client_version: chromeVersion,
      },
    };

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

  async * fetch(request: AidaRequest, options?: {signal?: AbortSignal}): AsyncGenerator<AidaResponse, void, void> {
    if (!InspectorFrontendHostInstance.doAidaConversation) {
      throw new Error('doAidaConversation is not available');
    }
    const stream = (() => {
      let {promise, resolve, reject} = Promise.withResolvers<string|null>();
      options?.signal?.addEventListener('abort', () => {
        reject(new AidaAbortError());
      });
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
    let metadata: AidaResponseMetadata = {rpcGlobalId: 0};
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
            text.push(CODE_CHUNK_SEPARATOR);
            inCodeChunk = false;
          }
          text.push(result.textChunk.text);
          textUpdated = true;
        } else if ('codeChunk' in result) {
          if (!inCodeChunk) {
            text.push(CODE_CHUNK_SEPARATOR);
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
          explanation: text.join('') + (inCodeChunk ? CODE_CHUNK_SEPARATOR : ''),
          metadata,
          completed: false,
        };
      }
    }
    yield {
      explanation: text.join('') + (inCodeChunk ? CODE_CHUNK_SEPARATOR : ''),
      metadata,
      functionCalls: functionCalls.length ? functionCalls as [AidaFunctionCallResponse, ...AidaFunctionCallResponse[]] :
                                            undefined,
      completed: true,
    };
  }

  registerClientEvent(clientEvent: AidaDoConversationClientEvent): Promise<AidaClientResult> {
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
  return UserTier.BETA;
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

  private async pollAidaAvailability(): Promise<void> {
    this.#pollTimer = window.setTimeout(() => this.pollAidaAvailability(), 2000);
    const currentAidaAvailability = await AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = currentAidaAvailability;
      const config =
          await new Promise<Root.Runtime.HostConfig>(resolve => InspectorFrontendHostInstance.getHostConfig(resolve));
      Object.assign(Root.Runtime.hostConfig, config);
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

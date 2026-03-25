// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Root from '../root/root.js';

import {
  AidaAccessPreconditions,
  type AidaFunctionCallResponse,
  AidaInferenceLanguage,
  type AidaRegisterClientEvent,
  ClientFeature,
  type CompletionRequest,
  type CompletionResponse,
  type DoConversationRequest,
  type DoConversationResponse,
  FunctionalityType,
  type GenerateCodeRequest,
  type GenerateCodeResponse,
  type GenerationSample,
  RecitationAction,
  type ResponseMetadata,
  Role,
  UserTier,
} from './AidaClientTypes.js';
import * as DispatchHttpRequestClient from './DispatchHttpRequestClient.js';
import {InspectorFrontendHostInstance} from './InspectorFrontendHost.js';
import type {AidaClientResult, AidaCodeCompleteResult, SyncInformation} from './InspectorFrontendHostAPI.js';
import {bindOutputStream} from './ResourceLoader.js';

export * from './AidaClientTypes.js';

export const CLIENT_NAME = 'CHROME_DEVTOOLS';
export const SERVICE_NAME = 'aidaService';

const CODE_CHUNK_SEPARATOR = (lang = ''): string => ('\n`````' + lang + '\n');

const AidaLanguageToMarkdown: Record<AidaInferenceLanguage, string> = {
  [AidaInferenceLanguage.CPP]: 'cpp',
  [AidaInferenceLanguage.PYTHON]: 'py',
  [AidaInferenceLanguage.KOTLIN]: 'kt',
  [AidaInferenceLanguage.JAVA]: 'java',
  [AidaInferenceLanguage.JAVASCRIPT]: 'js',
  [AidaInferenceLanguage.GO]: 'go',
  [AidaInferenceLanguage.TYPESCRIPT]: 'ts',
  [AidaInferenceLanguage.HTML]: 'html',
  [AidaInferenceLanguage.BASH]: 'sh',
  [AidaInferenceLanguage.CSS]: 'css',
  [AidaInferenceLanguage.DART]: 'dart',
  [AidaInferenceLanguage.JSON]: 'json',
  [AidaInferenceLanguage.MARKDOWN]: 'md',
  [AidaInferenceLanguage.VUE]: 'vue',
  [AidaInferenceLanguage.XML]: 'xml',
  [AidaInferenceLanguage.UNKNOWN]: 'unknown',
};

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
    if (!InspectorFrontendHostInstance.dispatchHttpRequest) {
      throw new Error('dispatchHttpRequest is not available');
    }

    // Disable logging for now.
    // For context, see b/454563259#comment35.
    // We should be able to remove this ~end of April.
    if (Root.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
      request.metadata.disable_user_content_logging = true;
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
    DispatchHttpRequestClient
        .makeHttpRequest(
            {
              service: SERVICE_NAME,
              path: '/v1/aida:doConversation',
              method: 'POST',
              body: JSON.stringify(request),
              streamId,
            },
            options)
        .then(
            () => {
              void stream.close();
            },
            err => {
              if (err instanceof DispatchHttpRequestClient.DispatchHttpRequestError && err.response) {
                const result = err.response;
                if (result.statusCode === 403) {
                  stream.fail(new Error('Server responded: permission denied'));
                  return;
                }
                if ('error' in result && result.error) {
                  stream.fail(new Error(`Cannot send request: ${result.error} ${result.detail || ''}`));
                  return;
                }
                if ('netErrorName' in result && result.netErrorName === 'net::ERR_TIMED_OUT') {
                  stream.fail(new Error('doAidaConversation timed out'));
                  return;
                }
                if (result.statusCode !== 200) {
                  stream.fail(new Error(`Request failed: ${JSON.stringify(result)}`));
                  return;
                }
              }
              stream.fail(err);
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
    // Disable logging for now.
    // For context, see b/454563259#comment35.
    // We should be able to remove this ~end of April.
    if (Root.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
      clientEvent.disable_user_content_logging = true;
    }

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

    // Disable logging for now.
    // For context, see b/454563259#comment35.
    // We should be able to remove this ~end of April.
    if (Root.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
      request.metadata.disable_user_content_logging = true;
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
    // Disable logging for now.
    // For context, see b/454563259#comment35.
    // We should be able to remove this ~end of April.
    if (Root.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
      request.metadata.disable_user_content_logging = true;
    }
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

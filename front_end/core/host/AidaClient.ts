// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

import {
  AidaAccessPreconditions,
  type AidaChunkResponse,
  type AidaFunctionCall,
  AidaInferenceLanguage,
  type AidaRegisterClientEvent,
  ClientFeature,
  type CompletionRequest,
  type CompletionResponse,
  debugLog,
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
import {gcaChunkResponseToAidaChunkResponse} from './AidaGcaTranslation.js';
import * as DispatchHttpRequestClient from './DispatchHttpRequestClient.js';
import * as GcaClient from './GcaClient.js';
import type {GenerateContentResponse} from './GcaTypes.js';
import {InspectorFrontendHostInstance} from './InspectorFrontendHost.js';
import type {AidaClientResult, AidaCodeCompleteResult, SyncInformation} from './InspectorFrontendHostAPI.js';
import {bindOutputStream, discardOutputStream} from './ResourceLoader.js';

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

export abstract class AidaClientError extends Error {
  override name = 'AidaClientError';
}
export class AidaUnknownError extends AidaClientError {
  override name = 'AidaUnknownError';
}
export class AidaAbortError extends AidaClientError {
  override name = 'AidaAbortError';
}
export class AidaBlockError extends AidaClientError {
  override name = 'AidaBlockError';
}
export class AidaQuotaError extends AidaClientError {
  override name = 'AidaQuotaError';
}
export class AidaPayloadTooLargeError extends AidaClientError {
  override name = 'AidaPayloadTooLargeError';
}
export class AidaPermissionDeniedError extends AidaClientError {
  override name = 'AidaPermissionDeniedError';
}
export class AidaTimeoutError extends AidaClientError {
  override name = 'AidaTimeoutError';
}
export class AidaInvalidJsonResponseError extends AidaClientError {
  override name = 'AidaInvalidJsonResponseError';
}

interface AiStream {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
  read: () => Promise<string|null>;
  fail: (e: Error) => void;
}

export class AidaClient {
  // Delegate client
  #gcaClient = new GcaClient.GcaClient();

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
    if (!Platform.HostRuntime.HOST_RUNTIME.getOnLine()) {
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

    if (options?.signal?.aborted) {
      throw new AidaAbortError();
    }

    // Disable logging for now.
    // For context, see b/454563259#comment35.
    // We should be able to remove this ~end of April.
    if (Root.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
      request.metadata.disable_user_content_logging = true;
    }

    let abortListener: (() => void)|undefined;
    let streamId: number|undefined;
    try {
      const stream = (() => {
        let {promise, resolve, reject} = Promise.withResolvers<string|null>();
        // Prevent unhandled promise rejections if stream.fail() is called after
        // doConversation has already exited early (e.g. on recitation block or abort).
        // Active readers calling await stream.read() will still receive the rejection.
        promise.catch(() => {});
        abortListener = () => {
          reject(new AidaAbortError());
        };
        options?.signal?.addEventListener('abort', abortListener, {once: true});
        return {
          write: async(data: string): Promise<void> => {
            resolve(data);
            ({promise, resolve, reject} = Promise.withResolvers<string|null>());
            promise.catch(() => {});
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
      streamId = bindOutputStream(stream);

      let response;
      if (this.#gcaClient.enabled()) {
        // Inline and remove the else clause after migration
        response = this.#gcaClient.conversationRequest(request, streamId, options);
      } else {
        response = DispatchHttpRequestClient.makeHttpRequest({
          service: SERVICE_NAME,
          path: '/v1/aida:doConversation',
          method: 'POST',
          body: JSON.stringify(request),
          streamId,
        },
                                                             options);
      }
      response.then(
          () => {
            void stream.close();
          },
          err => {
            debugLog('doConversation failed with error:', JSON.stringify(err));
            stream.fail(mapError(err));
          });
      yield* this.#handleResponseStream(stream);
    } finally {
      if (options?.signal && abortListener) {
        options.signal.removeEventListener('abort', abortListener);
      }
      if (streamId !== undefined) {
        discardOutputStream(streamId);
      }
    }
  }

  async * #handleResponseStream(stream: AiStream): AsyncGenerator<DoConversationResponse, void, void> {
    let chunk;
    const text = [];
    let inCodeChunk = false;
    const functionCalls: AidaFunctionCall[] = [];
    let metadata: ResponseMetadata = {rpcGlobalId: 0};
    while ((chunk = await stream.read())) {
      debugLog('doConversation stream chunk:', chunk);
      let textUpdated = false;
      const results = this.#parseAndTranslate(chunk);

      for (const result of results) {
        if (result.metadata) {
          metadata = result.metadata;
          if (metadata?.attributionMetadata?.attributionAction === RecitationAction.BLOCK) {
            throw new AidaBlockError();
          }
        }
        if (result.textChunk) {
          if (inCodeChunk) {
            text.push(CODE_CHUNK_SEPARATOR());
            inCodeChunk = false;
          }

          text.push(result.textChunk.text);
          textUpdated = true;
        } else if (result.codeChunk) {
          if (!inCodeChunk) {
            const language = AidaLanguageToMarkdown[result.codeChunk.inferenceLanguage as AidaInferenceLanguage] ?? '';
            text.push(CODE_CHUNK_SEPARATOR(language));
            inCodeChunk = true;
          }

          text.push(result.codeChunk.code);
          textUpdated = true;
        } else if (result.functionCallChunk) {
          functionCalls.push({
            name: result.functionCallChunk.functionCall.name,
            args: result.functionCallChunk.functionCall.args,
            thoughtSignature: result.functionCallChunk.functionCall.thoughtSignature,
          });
        } else if ('error' in result) {
          throw mapError(result.error);
        } else {
          throw new Error(`Unknown chunk result ${JSON.stringify(result)}`);
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
      functionCalls: functionCalls.length ? functionCalls as [AidaFunctionCall, ...AidaFunctionCall[]] : undefined,
      completed: true,
    };
  }

  #parseAndTranslate(chunk: string): AidaChunkResponse[] {
    const results: AidaChunkResponse[] = this.#parseStreamChunk(chunk);
    if (this.#gcaClient.enabled()) {
      return (results as GenerateContentResponse[]).flatMap(gcaChunkResponseToAidaChunkResponse);
    }
    return results as AidaChunkResponse[];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #parseStreamChunk(chunk: string): any {
    // The streamed response is a JSON array of objects, split at the object
    // boundary. Therefore each chunk may start with `[` or `,` and possibly
    // followed by `]`. Each chunk may include one or more objects, so we
    // make sure that each chunk becomes a well-formed JSON array when we
    // parse it by adding `[` and `]` and removing `,` where appropriate.
    if (!chunk.length) {
      return [];
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
    try {
      return JSON.parse(chunk);
    } catch (error) {
      throw new Error('Cannot parse chunk: ' + chunk, {cause: error});
    }
  }

  registerClientEvent(clientEvent: AidaRegisterClientEvent): Promise<AidaClientResult> {
    // Disable logging for now.
    // For context, see b/454563259#comment35.
    // We should be able to remove this ~end of April.
    if (Root.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
      clientEvent.disable_user_content_logging = true;
    }

    if (this.#gcaClient.enabled()) {
      return this.#gcaClient.registerClientEvent(clientEvent);
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

    if (this.#gcaClient.enabled()) {
      try {
        return await this.#gcaClient.completeCode(request);
      } catch (err) {
        throw mapError(err);
      }
    }
    const {promise, resolve} = Promise.withResolvers<AidaCodeCompleteResult>();
    InspectorFrontendHostInstance.aidaCodeComplete(JSON.stringify(request), resolve);
    const completeCodeResult = await promise;

    if (completeCodeResult.error) {
      throw mapError(completeCodeResult.error, completeCodeResult.detail);
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

  async generateCode(request: GenerateCodeRequest, options?: {signal?: AbortSignal}): Promise<GenerateCodeResponse> {
    // Disable logging for now.
    // For context, see b/454563259#comment35.
    // We should be able to remove this ~end of April.
    if (Root.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
      request.metadata.disable_user_content_logging = true;
    }

    if (this.#gcaClient.enabled()) {
      // Inline and remove the else clause after migration
      try {
        return await this.#gcaClient.generateCode(request, options);
      } catch (err) {
        throw mapError(err);
      }
    }
    try {
      const response = await DispatchHttpRequestClient.makeHttpRequest<GenerateCodeResponse>({
        service: SERVICE_NAME,
        path: '/v1/aida:generateCode',
        method: 'POST',
        body: JSON.stringify(request),
      },
                                                                                             options);

      return response;
    } catch (err) {
      throw mapError(err);
    }
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

export function getClientFeatureName(feature: ClientFeature): string {
  const name = ClientFeature[feature];
  if (typeof name !== 'string') {
    throw new Error(`Invalid ClientFeature: ${feature}`);
  }
  return name;
}

export class HostConfigTracker extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #pollTimer?: ReturnType<typeof setTimeout>;
  #aidaAvailability?: AidaAccessPreconditions;

  get aidaAvailability(): AidaAccessPreconditions|undefined {
    return this.#aidaAvailability;
  }

  static instance({forceNew}: {
    forceNew: boolean,
  } = {forceNew: false}): HostConfigTracker {
    if (!Root.DevToolsContext.globalInstance().has(HostConfigTracker) || forceNew) {
      Root.DevToolsContext.globalInstance().set(
          HostConfigTracker,
          new HostConfigTracker(),
      );
    }
    return Root.DevToolsContext.globalInstance().get(HostConfigTracker);
  }

  dispose(): void {
    clearTimeout(this.#pollTimer);
    this.listeners = undefined;
  }

  static removeInstance(): void {
    if (Root.DevToolsContext.globalInstance().has(HostConfigTracker)) {
      Root.DevToolsContext.globalInstance().get(HostConfigTracker).dispose();
      Root.DevToolsContext.globalInstance().delete(HostConfigTracker);
    }
  }

  override addEventListener(eventType: Events, listener: Common.EventTarget.EventListener<EventTypes, Events>):
      Common.EventTarget.EventDescriptor<EventTypes> {
    const isFirst = !this.hasEventListeners(eventType);
    const eventDescriptor = super.addEventListener(eventType, listener);
    if (isFirst) {
      clearTimeout(this.#pollTimer);
      void this.pollAidaAvailability();
    }
    return eventDescriptor;
  }

  override removeEventListener(eventType: Events,
                               listener: Common.EventTarget.EventListener<EventTypes, Events>): void {
    super.removeEventListener(eventType, listener);
    if (!this.hasEventListeners(eventType)) {
      clearTimeout(this.#pollTimer);
    }
  }

  async pollAidaAvailability(): Promise<void> {
    this.#pollTimer = setTimeout(() => this.pollAidaAvailability(), 2000);
    const currentAidaAvailability = await AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = currentAidaAvailability;
      const config =
          await new Promise<Root.Runtime.HostConfig>(resolve => InspectorFrontendHostInstance.getHostConfig(resolve));
      Object.assign(Root.Runtime.hostConfig, config);
      this.dispatchEventToListeners(Events.AIDA_AVAILABILITY_CHANGED, currentAidaAvailability);
    }
  }
}

export const enum Events {
  AIDA_AVAILABILITY_CHANGED = 'aidaAvailabilityChanged',
}

export interface EventTypes {
  [Events.AIDA_AVAILABILITY_CHANGED]: AidaAccessPreconditions;
}

export function isQuotaError(...inputs: Array<string|undefined>): boolean {
  return inputs.some(input => input?.toLowerCase().includes('quota'));
}

export function isPayloadTooLargeError(...inputs: Array<string|undefined>): boolean {
  return inputs.some(input => input?.toLowerCase().includes('payload size exceeds the limit'));
}

/**
 * Maps AIDA-specific errors, DispatchHttpRequestErrors, strings, and generic
 * Errors to dedicated AidaClientError subclasses.
 */
export function mapError(err: unknown, detail?: string): AidaClientError {
  if (err instanceof AidaClientError) {
    return err;
  }

  if (err instanceof DispatchHttpRequestClient.DispatchHttpRequestError) {
    if (err.type === DispatchHttpRequestClient.ErrorType.ABORT) {
      return new AidaAbortError();
    }
    const response = err.response;
    if (response) {
      if (response.statusCode === 429) {
        return new AidaQuotaError('Server responded: quota exceeded');
      }
      if (response.statusCode === 403) {
        return new AidaPermissionDeniedError('Server responded: permission denied');
      }
      if ('netErrorName' in response && response.netErrorName === 'net::ERR_TIMED_OUT') {
        return new AidaTimeoutError('AIDA request timed out');
      }
      if ('error' in response && response.error) {
        return mapError(response.error, response.detail);
      }
      // The dispatcher throws HTTP_RESPONSE_UNAVAILABLE with status code 200
      // when it successfully receives the HTTP response but fails to parse its JSON body.
      if (response.statusCode === 200 && err.type === DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE) {
        return new AidaInvalidJsonResponseError('Server responded with invalid JSON', {cause: err});
      }
      if (response.statusCode !== 200) {
        return new AidaUnknownError(`Request failed: ${JSON.stringify(response)}`);
      }
    }
  }

  if (typeof err === 'string') {
    if (isQuotaError(err, detail)) {
      return new AidaQuotaError(`Cannot send request: ${err}${detail ? ` ${detail}` : ''}`);
    }
    if (isPayloadTooLargeError(err, detail)) {
      return new AidaPayloadTooLargeError(`Cannot send request: ${err}${detail ? ` ${detail}` : ''}`);
    }
    return new AidaUnknownError(`Cannot send request: ${err}${detail ? ` ${detail}` : ''}`);
  }

  if (err instanceof Error) {
    return new AidaUnknownError(err.message, {cause: err});
  }
  return new AidaUnknownError(String(err));
}

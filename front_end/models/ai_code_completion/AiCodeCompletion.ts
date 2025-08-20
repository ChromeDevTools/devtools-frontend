// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';

import {debugLog} from './debug.js';

export const DELAY_BEFORE_SHOWING_RESPONSE_MS = 500;
export const AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS = 200;

// TODO(b/404796739): Remove these definitions of AgentOptions and RequestOptions and
// use the existing ones which are used for AI assistance panel agents.
interface AgentOptions {
  aidaClient: Host.AidaClient.AidaClient;
  serverSideLoggingEnabled?: boolean;
  confirmSideEffectForTest?: typeof Promise.withResolvers;
}

interface RequestOptions {
  temperature?: number;
  modelId?: string;
}

interface CachedRequest {
  request: Host.AidaClient.CompletionRequest;
  response: Host.AidaClient.CompletionResponse;
}

/**
 * The AiCodeCompletion class is responsible for fetching code completion suggestions
 * from the AIDA backend and displaying them in the text editor.
 *
 * 1. **Debouncing requests:** As the user types, we don't want to send a request
 *    for every keystroke. Instead, we use debouncing to schedule a request
 *    only after the user has paused typing for a short period
 *    (AIDA_REQUEST_THROTTLER_TIMEOUT_MS). This prevents spamming the backend with
 *    requests for intermediate typing states.
 *
 * 2. **Delaying suggestions:** When a suggestion is received from the AIDA
 *    backend, we don't show it immediately. There is a minimum delay
 *    (DELAY_BEFORE_SHOWING_RESPONSE_MS) from when the request was sent to when
 *    the suggestion is displayed.
 */
export class AiCodeCompletion extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  #editor: TextEditor.TextEditor.TextEditor;
  #stopSequences: string[];
  #renderingTimeout?: number;
  #aidaRequestCache?: CachedRequest;

  readonly #sessionId: string = crypto.randomUUID();
  readonly #aidaClient: Host.AidaClient.AidaClient;
  readonly #serverSideLoggingEnabled: boolean;

  constructor(opts: AgentOptions, editor: TextEditor.TextEditor.TextEditor, stopSequences?: string[]) {
    super();
    this.#aidaClient = opts.aidaClient;
    this.#serverSideLoggingEnabled = opts.serverSideLoggingEnabled ?? false;
    this.#editor = editor;
    this.#stopSequences = stopSequences ?? [];
  }

  #debouncedRequestAidaSuggestion = Common.Debouncer.debounce(
      (prefix: string, suffix: string, cursor: number, inferenceLanguage?: Host.AidaClient.AidaInferenceLanguage) => {
        void this.#requestAidaSuggestion(this.#buildRequest(prefix, suffix, inferenceLanguage), cursor);
      },
      AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS);

  #buildRequest(
      prefix: string, suffix: string,
      inferenceLanguage: Host.AidaClient.AidaInferenceLanguage = Host.AidaClient.AidaInferenceLanguage.JAVASCRIPT):
      Host.AidaClient.CompletionRequest {
    const userTier = Host.AidaClient.convertToUserTierEnum(this.#userTier);
    function validTemperature(temperature: number|undefined): number|undefined {
      return typeof temperature === 'number' && temperature >= 0 ? temperature : undefined;
    }
    return {
      client: Host.AidaClient.CLIENT_NAME,
      prefix,
      suffix,
      options: {
        inference_language: inferenceLanguage,
        temperature: validTemperature(this.#options.temperature),
        model_id: this.#options.modelId || undefined,
        stop_sequences: this.#stopSequences,
      },
      metadata: {
        disable_user_content_logging: !(this.#serverSideLoggingEnabled ?? false),
        string_session_id: this.#sessionId,
        user_tier: userTier,
        client_version: Root.Runtime.getChromeVersion(),
      },
    };
  }

  async #requestAidaSuggestion(request: Host.AidaClient.CompletionRequest, cursor: number): Promise<void> {
    const startTime = performance.now();
    let servedFromCache = false;
    this.dispatchEventToListeners(Events.REQUEST_TRIGGERED, {});

    try {
      let response = this.#checkCachedRequestForResponse(request);
      if (!response) {
        response = await this.#aidaClient.completeCode(request);
        if (response) {
          this.#updateCachedRequest(request, response);
        }
      } else {
        servedFromCache = true;
      }
      debugLog('At cursor position', cursor, {request, response});
      if (response && response.generatedSamples.length > 0 && response.generatedSamples[0].generationString) {
        if (response.generatedSamples[0].attributionMetadata?.attributionAction ===
            Host.AidaClient.RecitationAction.BLOCK) {
          this.dispatchEventToListeners(Events.RESPONSE_RECEIVED, {});
          return;
        }

        // Use the suffix from the request to find and remove any overlap.
        let suggestionText = response.generatedSamples[0].generationString;
        if (request.suffix && request.suffix.length > 0) {
          suggestionText = this.#trimSuggestionOverlap(response.generatedSamples[0].generationString, request.suffix);
        }
        if (suggestionText.length === 0) {
          this.dispatchEventToListeners(Events.RESPONSE_RECEIVED, {});
          return;
        }

        const remainderDelay = Math.max(DELAY_BEFORE_SHOWING_RESPONSE_MS - (performance.now() - startTime), 0);
        // Delays the rendering of the Code completion
        this.#renderingTimeout = window.setTimeout(() => {
          // We are not cancelling the previous responses even when there are more recent responses
          // from the LLM as:
          // In case the user kept typing characters that are prefix of the previous suggestion, it
          // is a valid suggestion and we should display it to the user.
          // In case the user typed a different character, the config for AI auto complete suggestion
          // will set the suggestion to null.
          this.#editor.dispatch({
            effects: TextEditor.Config.setAiAutoCompleteSuggestion.of({
              text: suggestionText,
              from: cursor,
              rpcGlobalId: response.metadata.rpcGlobalId,
              sampleId: response.generatedSamples[0].sampleId,
            })
          });
          if (servedFromCache) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeCompletionResponseServedFromCache);
          }
          debugLog('Suggestion dispatched to the editor', response.generatedSamples[0], 'at cursor position', cursor);
          if (response.metadata.rpcGlobalId) {
            const latency = performance.now() - startTime;
            this.#registerUserImpression(response.metadata.rpcGlobalId, response.generatedSamples[0].sampleId, latency);
          }
          const citations = response.generatedSamples[0].attributionMetadata?.citations;
          this.dispatchEventToListeners(Events.RESPONSE_RECEIVED, {citations});
        }, remainderDelay);
      } else {
        this.dispatchEventToListeners(Events.RESPONSE_RECEIVED, {});
      }
    } catch {
      this.dispatchEventToListeners(Events.RESPONSE_RECEIVED, {});
    }
  }

  get #userTier(): string|undefined {
    return Root.Runtime.hostConfig.devToolsAiCodeCompletion?.userTier;
  }

  get #options(): RequestOptions {
    const temperature = Root.Runtime.hostConfig.devToolsAiCodeCompletion?.temperature;
    const modelId = Root.Runtime.hostConfig.devToolsAiCodeCompletion?.modelId;

    return {
      temperature,
      modelId,
    };
  }

  /**
   * Removes the end of a suggestion if it overlaps with the start of the suffix.
   */
  #trimSuggestionOverlap(generationString: string, suffix: string): string {
    // Iterate from the longest possible overlap down to the shortest
    for (let i = Math.min(generationString.length, suffix.length); i > 0; i--) {
      const overlapCandidate = suffix.substring(0, i);
      if (generationString.endsWith(overlapCandidate)) {
        return generationString.slice(0, -i);
      }
    }
    return generationString;
  }

  #checkCachedRequestForResponse(request: Host.AidaClient.CompletionRequest): Host.AidaClient.CompletionResponse|null {
    if (!this.#aidaRequestCache || this.#aidaRequestCache.request.suffix !== request.suffix ||
        JSON.stringify(this.#aidaRequestCache.request.options) !== JSON.stringify(request.options)) {
      return null;
    }
    const possibleGeneratedSamples: Host.AidaClient.GenerationSample[] = [];
    for (const sample of this.#aidaRequestCache.response.generatedSamples) {
      const prefixWithSample = this.#aidaRequestCache.request.prefix + sample.generationString;
      if (prefixWithSample.startsWith(request.prefix)) {
        possibleGeneratedSamples.push({
          generationString: prefixWithSample.substring(request.prefix.length),
          sampleId: sample.sampleId,
          score: sample.score,
          attributionMetadata: sample.attributionMetadata,
        });
      }
    }
    if (possibleGeneratedSamples.length === 0) {
      return null;
    }
    return {generatedSamples: possibleGeneratedSamples, metadata: this.#aidaRequestCache.response.metadata};
  }

  #updateCachedRequest(request: Host.AidaClient.CompletionRequest, response: Host.AidaClient.CompletionResponse): void {
    this.#aidaRequestCache = {request, response};
  }

  #registerUserImpression(rpcGlobalId: Host.AidaClient.RpcGlobalId, sampleId: number, latency: number): void {
    const seconds = Math.floor(latency / 1_000);
    const remainingMs = latency % 1_000;
    const nanos = Math.floor(remainingMs * 1_000_000);

    void this.#aidaClient.registerClientEvent({
      corresponding_aida_rpc_global_id: rpcGlobalId,
      disable_user_content_logging: true,
      complete_code_client_event: {
        user_impression: {
          sample: {
            sample_id: sampleId,
          },
          latency: {
            duration: {
              seconds,
              nanos,
            },
          }
        },
      },
    });
    debugLog('Registered user impression with latency {seconds:', seconds, ', nanos:', nanos, '}');
  }

  registerUserAcceptance(rpcGlobalId: Host.AidaClient.RpcGlobalId, sampleId: number): void {
    void this.#aidaClient.registerClientEvent({
      corresponding_aida_rpc_global_id: rpcGlobalId,
      disable_user_content_logging: true,
      complete_code_client_event: {
        user_acceptance: {
          sample: {
            sample_id: sampleId,
          }
        },
      },
    });
    debugLog('Registered user acceptance');
  }

  onTextChanged(
      prefix: string, suffix: string, cursor: number, inferenceLanguage?: Host.AidaClient.AidaInferenceLanguage): void {
    this.#debouncedRequestAidaSuggestion(prefix, suffix, cursor, inferenceLanguage);
  }

  remove(): void {
    if (this.#renderingTimeout) {
      clearTimeout(this.#renderingTimeout);
      this.#renderingTimeout = undefined;
    }
  }
}

export const enum Events {
  RESPONSE_RECEIVED = 'ResponseReceived',
  REQUEST_TRIGGERED = 'RequestTriggered',
}

export interface ResponseReceivedEvent {
  citations?: Host.AidaClient.Citation[];
}

export interface EventTypes {
  [Events.RESPONSE_RECEIVED]: ResponseReceivedEvent;
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  [Events.REQUEST_TRIGGERED]: {};
}

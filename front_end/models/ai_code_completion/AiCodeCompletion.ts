// Copyright 2025 The Chromium Authors
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

/* clang-format off */
const consoleAdditionalContextFileContent = `/**
 * This file describes the execution environment of the Chrome DevTools Console.
 * The code is JavaScript, but with special global functions and variables.
 * Top-level await is available.
 * The console has direct access to the inspected page's \`window\` and \`document\`.
 */

/**
 * @description Returns the value of the most recently evaluated expression.
 */
let $_;

/**
 * @description A reference to the most recently selected DOM element.
 * $0, $1, $2, $3, $4 can be used to reference the last five selected DOM elements.
 */
let $0;

/**
 * @description A query selector alias. $$('.my-class') is equivalent to document.querySelectorAll('.my-class').
 */
function $$(selector, startNode) {}

/**
 * @description An XPath selector. $x('//p') returns an array of all <p> elements.
 */
function $x(path, startNode) {}

function clear() {}

function copy(object) {}

/**
 * @description Selects and reveals the specified element in the Elements panel.
 */
function inspect(object) {}

function keys(object) {}

function values(object) {}

/**
 * @description When the specified function is called, the debugger is invoked.
 */
function debug(func) {}

/**
 * @description Stops the debugging of the specified function.
 */
function undebug(func) {}

/**
 * @description Logs a message to the console whenever the specified function is called,
 * along with the arguments passed to it.
 */
function monitor(func) {}

/**
 * @description Stops monitoring the specified function.
 */
function unmonitor(func) {}

/**
 * @description Logs all events dispatched to the specified object to the console.
 */
function monitorEvents(object, events) {}

/**
 * @description Returns an object containing all event listeners registered on the specified object.
 */
function getEventListeners(object) {}

/**
 * The global \`console\` object has several helpful methods
 */
const console = {
  log: (...args) => {},
  warn: (...args) => {},
  error: (...args) => {},
  info: (...args) => {},
  debug: (...args) => {},
  assert: (assertion, ...args) => {},
  dir: (object) => {}, // Displays an interactive property listing of an object.
  dirxml: (object) => {}, // Displays an XML/HTML representation of an object.
  table: (data, columns) => {}, // Displays tabular data as a table.
  group: (label) => {}, // Creates a new inline collapsible group.
  groupEnd: () => {},
  time: (label) => {}, // Starts a timer.
  timeEnd: (label) => {} // Stops a timer and logs the elapsed time.
};`;
/* clang-format on */

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
  #panel: ContextFlavor;

  readonly #sessionId: string = crypto.randomUUID();
  readonly #aidaClient: Host.AidaClient.AidaClient;
  readonly #serverSideLoggingEnabled: boolean;

  constructor(
      opts: AgentOptions, editor: TextEditor.TextEditor.TextEditor, panel: ContextFlavor, stopSequences?: string[]) {
    super();
    this.#aidaClient = opts.aidaClient;
    this.#serverSideLoggingEnabled = opts.serverSideLoggingEnabled ?? false;
    this.#editor = editor;
    this.#panel = panel;
    this.#stopSequences = stopSequences ?? [];
  }

  #debouncedRequestAidaSuggestion = Common.Debouncer.debounce(
      (prefix: string, suffix: string, cursorPositionAtRequest: number,
       inferenceLanguage?: Host.AidaClient.AidaInferenceLanguage) => {
        void this.#requestAidaSuggestion(
            this.#buildRequest(prefix, suffix, inferenceLanguage), cursorPositionAtRequest);
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
    // As a temporary fix for b/441221870 we are prepending a newline for each prefix.
    prefix = '\n' + prefix;

    const additionalFiles = this.#panel === ContextFlavor.CONSOLE ? [{
      path: 'devtools-console-context.js',
      content: consoleAdditionalContextFileContent,
      included_reason: Host.AidaClient.Reason.RELATED_FILE,
    }] :
                                                                    undefined;

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
      additional_files: additionalFiles,
    };
  }

  async #completeCodeCached(request: Host.AidaClient.CompletionRequest): Promise<{
    response: Host.AidaClient.CompletionResponse | null,
    fromCache: boolean,
  }> {
    const cachedResponse = this.#checkCachedRequestForResponse(request);
    if (cachedResponse) {
      return {response: cachedResponse, fromCache: true};
    }

    const response = await this.#aidaClient.completeCode(request);
    if (!response) {
      return {
        response: null,
        fromCache: false,
      };
    }

    this.#updateCachedRequest(request, response);
    return {
      response,
      fromCache: false,
    };
  }

  #pickSampleFromResponse(response: Host.AidaClient.CompletionResponse): Host.AidaClient.GenerationSample|null {
    if (!response.generatedSamples.length) {
      return null;
    }

    // `currentHint` is the portion of a standard autocomplete suggestion that the user has not yet typed.
    // For example, if the user types `document.queryS` and the autocomplete suggests `document.querySelector`,
    // the `currentHint` is `elector`.
    const currentHintInMenu = this.#editor.editor.plugin(TextEditor.Config.showCompletionHint)?.currentHint;
    // TODO(ergunsh): We should not do this check here. Instead, the AI code suggestions should be provided
    // as it is to the view plugin. The view plugin should choose which one to use based on the completion hint
    // and selected completion.
    if (!currentHintInMenu) {
      return response.generatedSamples[0];
    }

    // TODO(ergunsh): This does not handle looking for `selectedCompletion`. The `currentHint` is `null`
    // for the Sources panel case.
    // Even though there is no match, we still return the first suggestion which will be displayed
    // when the traditional autocomplete menu is closed.
    return response.generatedSamples.find(sample => sample.generationString.startsWith(currentHintInMenu)) ??
        response.generatedSamples[0];
  }

  async #generateSampleForRequest(request: Host.AidaClient.CompletionRequest, cursor: number): Promise<{
    suggestionText: string,
    sampleId: number,
    fromCache: boolean,
    citations: Host.AidaClient.Citation[],
    rpcGlobalId?: Host.AidaClient.RpcGlobalId,
  }|null> {
    const {response, fromCache} = await this.#completeCodeCached(request);
    debugLog('At cursor position', cursor, {request, response, fromCache});
    if (!response) {
      return null;
    }

    const suggestionSample = this.#pickSampleFromResponse(response);
    if (!suggestionSample) {
      return null;
    }

    const shouldBlock =
        suggestionSample.attributionMetadata?.attributionAction === Host.AidaClient.RecitationAction.BLOCK;
    if (shouldBlock) {
      return null;
    }

    const suggestionText = this.#trimSuggestionOverlap(suggestionSample.generationString, request);
    if (suggestionText.length === 0) {
      return null;
    }

    return {
      suggestionText,
      sampleId: suggestionSample.sampleId,
      fromCache,
      citations: suggestionSample.attributionMetadata?.citations ?? [],
      rpcGlobalId: response.metadata.rpcGlobalId,
    };
  }

  async #requestAidaSuggestion(request: Host.AidaClient.CompletionRequest, cursorPositionAtRequest: number):
      Promise<void> {
    const startTime = performance.now();
    this.dispatchEventToListeners(Events.REQUEST_TRIGGERED, {});
    // Registering AiCodeCompletionRequestTriggered metric even if the request is served from cache
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeCompletionRequestTriggered);

    try {
      const sampleResponse = await this.#generateSampleForRequest(request, cursorPositionAtRequest);
      if (!sampleResponse) {
        this.dispatchEventToListeners(Events.RESPONSE_RECEIVED, {});
        return;
      }

      const {
        suggestionText,
        sampleId,
        fromCache,
        citations,
        rpcGlobalId,
      } = sampleResponse;
      const remainingDelay = Math.max(DELAY_BEFORE_SHOWING_RESPONSE_MS - (performance.now() - startTime), 0);
      this.#renderingTimeout = window.setTimeout(() => {
        const currentCursorPosition = this.#editor.editor.state.selection.main.head;
        if (currentCursorPosition !== cursorPositionAtRequest) {
          this.dispatchEventToListeners(Events.RESPONSE_RECEIVED, {});
          return;
        }
        this.#editor.dispatch({
          effects: TextEditor.Config.setAiAutoCompleteSuggestion.of({
            text: suggestionText,
            from: cursorPositionAtRequest,
            rpcGlobalId,
            sampleId,
            startTime,
            onImpression: this.#registerUserImpression.bind(this),
          })
        });

        if (fromCache) {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeCompletionResponseServedFromCache);
        }

        debugLog('Suggestion dispatched to the editor', suggestionText, 'at cursor position', cursorPositionAtRequest);
        this.dispatchEventToListeners(Events.RESPONSE_RECEIVED, {citations});
      }, remainingDelay);
    } catch (e) {
      debugLog('Error while fetching code completion suggestions from AIDA', e);
      this.dispatchEventToListeners(Events.RESPONSE_RECEIVED, {});
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeCompletionError);
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
  #trimSuggestionOverlap(generationString: string, request: Host.AidaClient.CompletionRequest): string {
    const suffix = request.suffix;
    if (!suffix) {
      return generationString;
    }

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
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeCompletionSuggestionDisplayed);
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
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeCompletionSuggestionAccepted);
  }

  onTextChanged(
      prefix: string, suffix: string, cursorPositionAtRequest: number,
      inferenceLanguage?: Host.AidaClient.AidaInferenceLanguage): void {
    this.#debouncedRequestAidaSuggestion(prefix, suffix, cursorPositionAtRequest, inferenceLanguage);
  }

  remove(): void {
    if (this.#renderingTimeout) {
      clearTimeout(this.#renderingTimeout);
      this.#renderingTimeout = undefined;
    }
    this.#editor.dispatch({
      effects: TextEditor.Config.setAiAutoCompleteSuggestion.of(null),
    });
  }
}

export const enum ContextFlavor {
  CONSOLE = 'console',  // generated code can contain console specific APIs like `$0`.
  SOURCES = 'sources',
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

var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/ai_code_completion/debug.js
function isDebugMode() {
  return Boolean(localStorage.getItem("debugAiCodeCompletionEnabled"));
}
function debugLog(...log) {
  if (!isDebugMode()) {
    return;
  }
  console.log(...log);
}
function setDebugAiCodeCompletionEnabled(enabled) {
  if (enabled) {
    localStorage.setItem("debugAiCodeCompletionEnabled", "true");
  } else {
    localStorage.removeItem("debugAiCodeCompletionEnabled");
  }
}
globalThis.setDebugAiCodeCompletionEnabled = setDebugAiCodeCompletionEnabled;

// gen/front_end/models/ai_code_completion/AiCodeCompletion.js
var AiCodeCompletion_exports = {};
__export(AiCodeCompletion_exports, {
  AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS: () => AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS,
  AiCodeCompletion: () => AiCodeCompletion,
  DELAY_BEFORE_SHOWING_RESPONSE_MS: () => DELAY_BEFORE_SHOWING_RESPONSE_MS
});
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as Root from "./../../core/root/root.js";
import * as TextEditor from "./../../ui/components/text_editor/text_editor.js";
var DELAY_BEFORE_SHOWING_RESPONSE_MS = 500;
var AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS = 200;
var consoleAdditionalContextFileContent = `/**
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
var AiCodeCompletion = class extends Common.ObjectWrapper.ObjectWrapper {
  #editor;
  #stopSequences;
  #renderingTimeout;
  #aidaRequestCache;
  #panel;
  #sessionId = crypto.randomUUID();
  #aidaClient;
  #serverSideLoggingEnabled;
  constructor(opts, editor, panel, stopSequences) {
    super();
    this.#aidaClient = opts.aidaClient;
    this.#serverSideLoggingEnabled = opts.serverSideLoggingEnabled ?? false;
    this.#editor = editor;
    this.#panel = panel;
    this.#stopSequences = stopSequences ?? [];
  }
  #debouncedRequestAidaSuggestion = Common.Debouncer.debounce((prefix, suffix, cursorPositionAtRequest, inferenceLanguage) => {
    void this.#requestAidaSuggestion(this.#buildRequest(prefix, suffix, inferenceLanguage), cursorPositionAtRequest);
  }, AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS);
  #buildRequest(prefix, suffix, inferenceLanguage = "JAVASCRIPT") {
    const userTier = Host.AidaClient.convertToUserTierEnum(this.#userTier);
    function validTemperature(temperature) {
      return typeof temperature === "number" && temperature >= 0 ? temperature : void 0;
    }
    prefix = "\n" + prefix;
    const additionalFiles = this.#panel === "console" ? [{
      path: "devtools-console-context.js",
      content: consoleAdditionalContextFileContent,
      included_reason: Host.AidaClient.Reason.RELATED_FILE
    }] : void 0;
    return {
      client: Host.AidaClient.CLIENT_NAME,
      prefix,
      suffix,
      options: {
        inference_language: inferenceLanguage,
        temperature: validTemperature(this.#options.temperature),
        model_id: this.#options.modelId || void 0,
        stop_sequences: this.#stopSequences
      },
      metadata: {
        disable_user_content_logging: !(this.#serverSideLoggingEnabled ?? false),
        string_session_id: this.#sessionId,
        user_tier: userTier,
        client_version: Root.Runtime.getChromeVersion()
      },
      additional_files: additionalFiles
    };
  }
  async #completeCodeCached(request) {
    const cachedResponse = this.#checkCachedRequestForResponse(request);
    if (cachedResponse) {
      return { response: cachedResponse, fromCache: true };
    }
    const response = await this.#aidaClient.completeCode(request);
    if (!response) {
      return {
        response: null,
        fromCache: false
      };
    }
    this.#updateCachedRequest(request, response);
    return {
      response,
      fromCache: false
    };
  }
  #pickSampleFromResponse(response) {
    if (!response.generatedSamples.length) {
      return null;
    }
    const currentHintInMenu = this.#editor.editor.plugin(TextEditor.Config.showCompletionHint)?.currentHint;
    if (!currentHintInMenu) {
      return response.generatedSamples[0];
    }
    return response.generatedSamples.find((sample) => sample.generationString.startsWith(currentHintInMenu)) ?? response.generatedSamples[0];
  }
  async #generateSampleForRequest(request, cursor) {
    const { response, fromCache } = await this.#completeCodeCached(request);
    debugLog("At cursor position", cursor, { request, response, fromCache });
    if (!response) {
      return null;
    }
    const suggestionSample = this.#pickSampleFromResponse(response);
    if (!suggestionSample) {
      return null;
    }
    const shouldBlock = suggestionSample.attributionMetadata?.attributionAction === Host.AidaClient.RecitationAction.BLOCK;
    if (shouldBlock) {
      return null;
    }
    const isRepetitive = this.#checkIfSuggestionRepeatsExistingText(suggestionSample.generationString, request);
    if (isRepetitive) {
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
      rpcGlobalId: response.metadata.rpcGlobalId
    };
  }
  async #requestAidaSuggestion(request, cursorPositionAtRequest) {
    const startTime = performance.now();
    this.dispatchEventToListeners("RequestTriggered", {});
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeCompletionRequestTriggered);
    try {
      const sampleResponse = await this.#generateSampleForRequest(request, cursorPositionAtRequest);
      if (!sampleResponse) {
        this.dispatchEventToListeners("ResponseReceived", {});
        return;
      }
      const { suggestionText, sampleId, fromCache, citations, rpcGlobalId } = sampleResponse;
      const remainingDelay = Math.max(DELAY_BEFORE_SHOWING_RESPONSE_MS - (performance.now() - startTime), 0);
      this.#renderingTimeout = window.setTimeout(() => {
        const currentCursorPosition = this.#editor.editor.state.selection.main.head;
        if (currentCursorPosition !== cursorPositionAtRequest) {
          this.dispatchEventToListeners("ResponseReceived", {});
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
            clearCachedRequest: this.clearCachedRequest.bind(this)
          })
        });
        if (fromCache) {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeCompletionResponseServedFromCache);
        }
        debugLog("Suggestion dispatched to the editor", suggestionText, "at cursor position", cursorPositionAtRequest);
        this.dispatchEventToListeners("ResponseReceived", { citations });
      }, remainingDelay);
    } catch (e) {
      debugLog("Error while fetching code completion suggestions from AIDA", e);
      this.dispatchEventToListeners("ResponseReceived", {});
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeCompletionError);
    }
  }
  get #userTier() {
    return Root.Runtime.hostConfig.devToolsAiCodeCompletion?.userTier;
  }
  get #options() {
    const temperature = Root.Runtime.hostConfig.devToolsAiCodeCompletion?.temperature;
    const modelId = Root.Runtime.hostConfig.devToolsAiCodeCompletion?.modelId;
    return {
      temperature,
      modelId
    };
  }
  /**
   * Removes the end of a suggestion if it overlaps with the start of the suffix.
   */
  #trimSuggestionOverlap(generationString, request) {
    const suffix = request.suffix;
    if (!suffix) {
      return generationString;
    }
    for (let i = Math.min(generationString.length, suffix.length); i > 0; i--) {
      const overlapCandidate = suffix.substring(0, i);
      if (generationString.endsWith(overlapCandidate)) {
        return generationString.slice(0, -i);
      }
    }
    return generationString;
  }
  #checkIfSuggestionRepeatsExistingText(generationString, request) {
    const { prefix, suffix } = request;
    return Boolean(prefix.includes(generationString.trim()) || suffix?.includes(generationString.trim()));
  }
  #checkCachedRequestForResponse(request) {
    if (!this.#aidaRequestCache || this.#aidaRequestCache.request.suffix !== request.suffix || JSON.stringify(this.#aidaRequestCache.request.options) !== JSON.stringify(request.options)) {
      return null;
    }
    const possibleGeneratedSamples = [];
    for (const sample of this.#aidaRequestCache.response.generatedSamples) {
      const prefixWithSample = this.#aidaRequestCache.request.prefix + sample.generationString;
      if (prefixWithSample.startsWith(request.prefix)) {
        possibleGeneratedSamples.push({
          generationString: prefixWithSample.substring(request.prefix.length),
          sampleId: sample.sampleId,
          score: sample.score,
          attributionMetadata: sample.attributionMetadata
        });
      }
    }
    if (possibleGeneratedSamples.length === 0) {
      return null;
    }
    return { generatedSamples: possibleGeneratedSamples, metadata: this.#aidaRequestCache.response.metadata };
  }
  #updateCachedRequest(request, response) {
    this.#aidaRequestCache = { request, response };
  }
  #registerUserImpression(rpcGlobalId, latency, sampleId) {
    const seconds = Math.floor(latency / 1e3);
    const remainingMs = latency % 1e3;
    const nanos = Math.floor(remainingMs * 1e6);
    void this.#aidaClient.registerClientEvent({
      corresponding_aida_rpc_global_id: rpcGlobalId,
      disable_user_content_logging: true,
      complete_code_client_event: {
        user_impression: {
          sample: {
            sample_id: sampleId
          },
          latency: {
            duration: {
              seconds,
              nanos
            }
          }
        }
      }
    });
    debugLog("Registered user impression with latency {seconds:", seconds, ", nanos:", nanos, "}");
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeCompletionSuggestionDisplayed);
  }
  registerUserAcceptance(rpcGlobalId, sampleId) {
    void this.#aidaClient.registerClientEvent({
      corresponding_aida_rpc_global_id: rpcGlobalId,
      disable_user_content_logging: true,
      complete_code_client_event: {
        user_acceptance: {
          sample: {
            sample_id: sampleId
          }
        }
      }
    });
    debugLog("Registered user acceptance");
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiCodeCompletionSuggestionAccepted);
  }
  clearCachedRequest() {
    this.#aidaRequestCache = void 0;
  }
  onTextChanged(prefix, suffix, cursorPositionAtRequest, inferenceLanguage) {
    this.#debouncedRequestAidaSuggestion(prefix, suffix, cursorPositionAtRequest, inferenceLanguage);
  }
  remove() {
    if (this.#renderingTimeout) {
      clearTimeout(this.#renderingTimeout);
      this.#renderingTimeout = void 0;
    }
    this.#editor.dispatch({
      effects: TextEditor.Config.setAiAutoCompleteSuggestion.of(null)
    });
  }
};
export {
  AiCodeCompletion_exports as AiCodeCompletion,
  debugLog,
  isDebugMode
};
//# sourceMappingURL=ai_code_completion.js.map

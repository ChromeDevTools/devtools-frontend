// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import { debugLog } from './debug.js';
/* clang-format off */
export const consoleAdditionalContextFileContent = `/**
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
 * from the AIDA backend.
 */
export class AiCodeCompletion {
    #stopSequences;
    #renderingTimeout;
    #aidaRequestCache;
    // TODO(b/445394511): Remove panel from the class
    #panel;
    #callbacks;
    #sessionId = crypto.randomUUID();
    #aidaClient;
    #serverSideLoggingEnabled;
    constructor(opts, panel, callbacks, stopSequences) {
        this.#aidaClient = opts.aidaClient;
        this.#serverSideLoggingEnabled = opts.serverSideLoggingEnabled ?? false;
        this.#panel = panel;
        this.#stopSequences = stopSequences ?? [];
        this.#callbacks = callbacks;
    }
    #buildRequest(prefix, suffix, inferenceLanguage = "JAVASCRIPT" /* Host.AidaClient.AidaInferenceLanguage.JAVASCRIPT */, additionalFiles) {
        const userTier = Host.AidaClient.convertToUserTierEnum(this.#userTier);
        function validTemperature(temperature) {
            return typeof temperature === 'number' && temperature >= 0 ? temperature : undefined;
        }
        // As a temporary fix for b/441221870 we are prepending a newline for each prefix.
        prefix = '\n' + prefix;
        let additionalContextFiles = additionalFiles ?? undefined;
        if (!additionalContextFiles) {
            additionalContextFiles = this.#panel === "console" /* ContextFlavor.CONSOLE */ ? [{
                    path: 'devtools-console-context.js',
                    content: consoleAdditionalContextFileContent,
                    included_reason: Host.AidaClient.Reason.RELATED_FILE,
                }] :
                undefined;
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
            additional_files: additionalContextFiles,
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
                fromCache: false,
            };
        }
        this.#updateCachedRequest(request, response);
        return {
            response,
            fromCache: false,
        };
    }
    get #userTier() {
        return Root.Runtime.hostConfig.devToolsAiCodeCompletion?.userTier;
    }
    get #options() {
        const temperature = Root.Runtime.hostConfig.devToolsAiCodeCompletion?.temperature;
        const modelId = Root.Runtime.hostConfig.devToolsAiCodeCompletion?.modelId;
        return {
            temperature,
            modelId,
        };
    }
    #checkCachedRequestForResponse(request) {
        if (!this.#aidaRequestCache || this.#aidaRequestCache.request.suffix !== request.suffix ||
            JSON.stringify(this.#aidaRequestCache.request.options) !== JSON.stringify(request.options)) {
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
                    attributionMetadata: sample.attributionMetadata,
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
    registerUserImpression(rpcGlobalId, latency, sampleId) {
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
    registerUserAcceptance(rpcGlobalId, sampleId) {
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
    clearCachedRequest() {
        this.#aidaRequestCache = undefined;
    }
    async completeCode(prefix, suffix, cursorPositionAtRequest, inferenceLanguage, additionalFiles) {
        const request = this.#buildRequest(prefix, suffix, inferenceLanguage, additionalFiles);
        const { response, fromCache } = await this.#completeCodeCached(request);
        debugLog('At cursor position', cursorPositionAtRequest, { request, response, fromCache });
        if (!response) {
            return { response: null, fromCache: false };
        }
        return { response, fromCache };
    }
    remove() {
        if (this.#renderingTimeout) {
            clearTimeout(this.#renderingTimeout);
            this.#renderingTimeout = undefined;
        }
        this.#callbacks?.setAiAutoCompletion(null);
    }
    static isAiCodeCompletionEnabled(locale) {
        if (!locale.startsWith('en-')) {
            return false;
        }
        const aidaAvailability = Root.Runtime.hostConfig.aidaAvailability;
        if (!aidaAvailability || aidaAvailability.blockedByGeo || aidaAvailability.blockedByAge ||
            aidaAvailability.blockedByEnterprisePolicy) {
            return false;
        }
        return Boolean(aidaAvailability.enabled && Root.Runtime.hostConfig.devToolsAiCodeCompletion?.enabled);
    }
}
//# sourceMappingURL=AiCodeCompletion.js.map
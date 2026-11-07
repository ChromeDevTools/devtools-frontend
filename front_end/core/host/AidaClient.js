// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';
import { ClientFeature, debugLog, FunctionalityType, RecitationAction, Role, UserTier, } from './AidaClientTypes.js';
import { AidaAbortError, AidaBlockError, classifyRequestError, mapError, StreamChunkParseError, } from './AidaErrors.js';
import { gcaChunkResponseToAidaChunkResponse } from './AidaGcaTranslation.js';
import * as DispatchHttpRequestClient from './DispatchHttpRequestClient.js';
import * as GcaClient from './GcaClient.js';
import { InspectorFrontendHostInstance } from './InspectorFrontendHost.js';
import { bindOutputStream, discardOutputStream } from './ResourceLoader.js';
import * as UserMetrics from './UserMetrics.js';
export * from './AidaClientTypes.js';
export { AidaAbortError, AidaBlockError, AidaClientError, AidaInvalidJsonResponseError, AidaPayloadTooLargeError, AidaPermissionDeniedError, AidaQuotaError, AidaTimeoutError, AidaUnknownError, isPayloadTooLargeError, isQuotaError, mapError, } from './AidaErrors.js';
export const CLIENT_NAME = 'CHROME_DEVTOOLS';
export const SERVICE_NAME = 'aidaService';
const CODE_CHUNK_SEPARATOR = (lang = '') => ('\n`````' + lang + '\n');
const AidaLanguageToMarkdown = {
    ["CPP" /* AidaInferenceLanguage.CPP */]: 'cpp',
    ["PYTHON" /* AidaInferenceLanguage.PYTHON */]: 'py',
    ["KOTLIN" /* AidaInferenceLanguage.KOTLIN */]: 'kt',
    ["JAVA" /* AidaInferenceLanguage.JAVA */]: 'java',
    ["JAVASCRIPT" /* AidaInferenceLanguage.JAVASCRIPT */]: 'js',
    ["GO" /* AidaInferenceLanguage.GO */]: 'go',
    ["TYPESCRIPT" /* AidaInferenceLanguage.TYPESCRIPT */]: 'ts',
    ["HTML" /* AidaInferenceLanguage.HTML */]: 'html',
    ["BASH" /* AidaInferenceLanguage.BASH */]: 'sh',
    ["CSS" /* AidaInferenceLanguage.CSS */]: 'css',
    ["DART" /* AidaInferenceLanguage.DART */]: 'dart',
    ["JSON" /* AidaInferenceLanguage.JSON */]: 'json',
    ["MARKDOWN" /* AidaInferenceLanguage.MARKDOWN */]: 'md',
    ["VUE" /* AidaInferenceLanguage.VUE */]: 'vue',
    ["XML" /* AidaInferenceLanguage.XML */]: 'xml',
    ["UNKNOWN" /* AidaInferenceLanguage.UNKNOWN */]: 'unknown',
};
function conversationSurfaceHistogram(feature) {
    switch (feature) {
        case ClientFeature.CHROME_DEVTOOLS_V2_AGENT:
            return "DevTools.AiClient.RequestResult.AiAssistance" /* EnumeratedHistogram.AiClientRequestResultAiAssistance */;
        case ClientFeature.CHROME_CONSOLE_INSIGHTS:
            return "DevTools.AiClient.RequestResult.ConsoleInsights" /* EnumeratedHistogram.AiClientRequestResultConsoleInsights */;
        case ClientFeature.CHROME_CONVERSATION_SUMMARY_AGENT:
            return "DevTools.AiClient.RequestResult.ConversationSummary" /* EnumeratedHistogram.AiClientRequestResultConversationSummary */;
        case ClientFeature.CHROME_PERFORMANCE_ANNOTATIONS_AGENT:
            return "DevTools.AiClient.RequestResult.PerformanceAnnotations" /* EnumeratedHistogram.AiClientRequestResultPerformanceAnnotations */;
        default:
            // Legacy V1 per-panel agents intentionally omit surface slices and record only to the aggregate histogram.
            return undefined;
    }
}
/**
 * Returns a closure that records the request outcome histogram once per call.
 * One-shot recording prevents early generator returns or nested catch/finally blocks from double-counting outcomes.
 */
function createOutcomeRecorder(surfaceHistogram) {
    let recorded = false;
    return (result) => {
        if (recorded) {
            return;
        }
        recorded = true;
        UserMetrics.userMetrics.aiClientRequestResult(result, surfaceHistogram);
    };
}
export class AidaClient {
    // Delegate client
    #gcaClient = new GcaClient.GcaClient();
    static buildConsoleInsightsRequest(input) {
        const disallowLogging = Root.Runtime.hostConfig.aidaAvailability?.disallowLogging ?? true;
        const chromeVersion = Root.Runtime.getChromeVersion();
        if (!chromeVersion) {
            throw new Error('Cannot determine Chrome version');
        }
        const request = {
            current_message: { parts: [{ text: input }], role: Role.USER },
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
    static async checkAccessPreconditions() {
        if (!Platform.HostRuntime.HOST_RUNTIME.getOnLine()) {
            return "no-internet" /* AidaAccessPreconditions.NO_INTERNET */;
        }
        const syncInfo = await new Promise(resolve => InspectorFrontendHostInstance.getSyncInformation(syncInfo => resolve(syncInfo)));
        if (!syncInfo.accountEmail) {
            return "no-account-email" /* AidaAccessPreconditions.NO_ACCOUNT_EMAIL */;
        }
        if (syncInfo.isSyncPaused) {
            return "sync-is-paused" /* AidaAccessPreconditions.SYNC_IS_PAUSED */;
        }
        return "available" /* AidaAccessPreconditions.AVAILABLE */;
    }
    async *doConversation(request, options) {
        if (!InspectorFrontendHostInstance.dispatchHttpRequest) {
            throw new Error('dispatchHttpRequest is not available');
        }
        const recordOutcome = createOutcomeRecorder(conversationSurfaceHistogram(request.client_feature));
        let abortListener;
        let streamId;
        try {
            if (options?.signal?.aborted) {
                throw new AidaAbortError();
            }
            // Disable logging for now.
            // For context, see b/454563259#comment35.
            // We should be able to remove this ~end of April.
            if (Root.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
                request.metadata.disable_user_content_logging = true;
            }
            const stream = (() => {
                let { promise, resolve, reject } = Promise.withResolvers();
                // Prevent unhandled promise rejections if stream.fail() is called after
                // doConversation has already exited early (e.g. on recitation block or abort).
                // Active readers calling await stream.read() will still receive the rejection.
                promise.catch(() => { });
                abortListener = () => {
                    reject(new AidaAbortError());
                };
                options?.signal?.addEventListener('abort', abortListener, { once: true });
                return {
                    write: async (data) => {
                        resolve(data);
                        ({ promise, resolve, reject } = Promise.withResolvers());
                        promise.catch(() => { });
                    },
                    close: async () => {
                        resolve(null);
                    },
                    read: () => {
                        return promise;
                    },
                    fail: (e) => reject(e),
                };
            })();
            streamId = bindOutputStream(stream);
            let response;
            if (this.#gcaClient.enabled()) {
                // Inline and remove the else clause after migration
                response = this.#gcaClient.conversationRequest(request, streamId, options);
            }
            else {
                response = DispatchHttpRequestClient.makeHttpRequest({
                    service: SERVICE_NAME,
                    path: '/v1/aida:doConversation',
                    method: 'POST',
                    body: JSON.stringify(request),
                    streamId,
                }, options);
            }
            response.then(() => {
                void stream.close();
            }, err => {
                debugLog('doConversation failed with error:', JSON.stringify(err));
                stream.fail(mapError(err));
            });
            yield* this.#handleResponseStream(stream);
            recordOutcome(UserMetrics.AiClientRequestResult.SUCCESS);
        }
        catch (err) {
            recordOutcome(classifyRequestError(err));
            throw err;
        }
        finally {
            // Fallback when a caller exits the generator early (such as breaking out of a for-await loop) before stream completion.
            recordOutcome(UserMetrics.AiClientRequestResult.ABORTED);
            if (options?.signal && abortListener) {
                options.signal.removeEventListener('abort', abortListener);
            }
            if (streamId !== undefined) {
                discardOutputStream(streamId);
            }
        }
    }
    async *#handleResponseStream(stream) {
        let chunk;
        const text = [];
        let inCodeChunk = false;
        const functionCalls = [];
        let metadata = { rpcGlobalId: 0 };
        while ((chunk = await stream.read())) {
            debugLog('doConversation stream chunk:', chunk);
            let textUpdated = false;
            const results = this.#parseAndTranslate(chunk);
            for (const result of results) {
                if (result.metadata) {
                    metadata = {
                        ...metadata,
                        ...result.metadata,
                    };
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
                }
                else if (result.codeChunk) {
                    if (!inCodeChunk) {
                        const language = AidaLanguageToMarkdown[result.codeChunk.inferenceLanguage] ?? '';
                        text.push(CODE_CHUNK_SEPARATOR(language));
                        inCodeChunk = true;
                    }
                    text.push(result.codeChunk.code);
                    textUpdated = true;
                }
                else if (result.functionCallChunk) {
                    functionCalls.push({
                        name: result.functionCallChunk.functionCall.name,
                        args: result.functionCallChunk.functionCall.args,
                        thoughtSignature: result.functionCallChunk.functionCall.thoughtSignature,
                    });
                }
                else if ('error' in result) {
                    throw mapError(result.error);
                }
                else {
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
            functionCalls: functionCalls.length ? functionCalls : undefined,
            completed: true,
        };
    }
    #parseAndTranslate(chunk) {
        const results = this.#parseStreamChunk(chunk);
        if (this.#gcaClient.enabled()) {
            return results.flatMap(gcaChunkResponseToAidaChunkResponse);
        }
        return results;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    #parseStreamChunk(chunk) {
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
        }
        catch (error) {
            throw new StreamChunkParseError('Cannot parse chunk: ' + chunk, { cause: error });
        }
    }
    registerClientEvent(clientEvent) {
        // Disable logging for now.
        // For context, see b/454563259#comment35.
        // We should be able to remove this ~end of April.
        if (Root.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
            clientEvent.disable_user_content_logging = true;
        }
        if (this.#gcaClient.enabled()) {
            return this.#gcaClient.registerClientEvent(clientEvent);
        }
        const { promise, resolve } = Promise.withResolvers();
        InspectorFrontendHostInstance.registerAidaClientEvent(JSON.stringify({
            client: CLIENT_NAME,
            event_time: new Date().toISOString(),
            ...clientEvent,
        }), resolve);
        return promise;
    }
    async completeCode(request) {
        if (!InspectorFrontendHostInstance.aidaCodeComplete) {
            throw new Error('aidaCodeComplete is not available');
        }
        // Disable logging for now.
        // For context, see b/454563259#comment35.
        // We should be able to remove this ~end of April.
        if (Root.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
            request.metadata.disable_user_content_logging = true;
        }
        const recordOutcome = createOutcomeRecorder("DevTools.AiClient.RequestResult.CodeComplete" /* EnumeratedHistogram.AiClientRequestResultCodeComplete */);
        try {
            if (this.#gcaClient.enabled()) {
                try {
                    const result = await this.#gcaClient.completeCode(request);
                    recordOutcome(UserMetrics.AiClientRequestResult.SUCCESS);
                    return result;
                }
                catch (err) {
                    recordOutcome(classifyRequestError(err));
                    throw mapError(err);
                }
            }
            const { promise, resolve } = Promise.withResolvers();
            InspectorFrontendHostInstance.aidaCodeComplete(JSON.stringify(request), resolve);
            const completeCodeResult = await promise;
            if (completeCodeResult.error) {
                recordOutcome(classifyRequestError(completeCodeResult.error, completeCodeResult.detail));
                throw mapError(completeCodeResult.error, completeCodeResult.detail);
            }
            const response = completeCodeResult.response;
            if (!response?.length) {
                recordOutcome(UserMetrics.AiClientRequestResult.INVALID_JSON_RESPONSE);
                throw new Error('Empty response');
            }
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(response);
            }
            catch (error) {
                recordOutcome(UserMetrics.AiClientRequestResult.INVALID_JSON_RESPONSE);
                throw new Error('Cannot parse response: ' + response, { cause: error });
            }
            const generatedSamples = [];
            let metadata = { rpcGlobalId: 0 };
            if ('metadata' in parsedResponse) {
                metadata = parsedResponse.metadata;
            }
            if ('generatedSamples' in parsedResponse) {
                for (const generatedSample of parsedResponse.generatedSamples) {
                    const sample = {
                        generationString: generatedSample.generationString,
                        score: generatedSample.score,
                        sampleId: generatedSample.sampleId,
                    };
                    if ('metadata' in generatedSample && 'attributionMetadata' in generatedSample.metadata) {
                        sample.attributionMetadata = generatedSample.metadata.attributionMetadata;
                    }
                    generatedSamples.push(sample);
                }
            }
            else {
                recordOutcome(UserMetrics.AiClientRequestResult.SUCCESS);
                return null;
            }
            recordOutcome(UserMetrics.AiClientRequestResult.SUCCESS);
            return { generatedSamples, metadata };
        }
        catch (err) {
            recordOutcome(classifyRequestError(err));
            throw err;
        }
    }
    async generateCode(request, options) {
        // Disable logging for now.
        // For context, see b/454563259#comment35.
        // We should be able to remove this ~end of April.
        if (Root.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
            request.metadata.disable_user_content_logging = true;
        }
        const surfaceHistogram = "DevTools.AiClient.RequestResult.CodeGenerate" /* EnumeratedHistogram.AiClientRequestResultCodeGenerate */;
        try {
            const response = this.#gcaClient.enabled() ?
                await this.#gcaClient.generateCode(request, options) :
                await DispatchHttpRequestClient.makeHttpRequest({
                    service: SERVICE_NAME,
                    path: '/v1/aida:generateCode',
                    method: 'POST',
                    body: JSON.stringify(request),
                }, options);
            UserMetrics.userMetrics.aiClientRequestResult(UserMetrics.AiClientRequestResult.SUCCESS, surfaceHistogram);
            return response;
        }
        catch (err) {
            UserMetrics.userMetrics.aiClientRequestResult(classifyRequestError(err), surfaceHistogram);
            throw mapError(err);
        }
    }
}
export function convertToUserTierEnum(userTier) {
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
export function getClientFeatureName(feature) {
    const name = ClientFeature[feature];
    if (typeof name !== 'string') {
        throw new Error(`Invalid ClientFeature: ${feature}`);
    }
    return name;
}
export class HostConfigTracker extends Common.ObjectWrapper.ObjectWrapper {
    #pollTimer;
    #aidaAvailability;
    get aidaAvailability() {
        return this.#aidaAvailability;
    }
    static instance({ forceNew } = { forceNew: false }) {
        if (!Root.DevToolsContext.globalInstance().has(HostConfigTracker) || forceNew) {
            Root.DevToolsContext.globalInstance().set(HostConfigTracker, new HostConfigTracker());
        }
        return Root.DevToolsContext.globalInstance().get(HostConfigTracker);
    }
    dispose() {
        clearTimeout(this.#pollTimer);
        this.listeners = undefined;
    }
    static removeInstance() {
        if (Root.DevToolsContext.globalInstance().has(HostConfigTracker)) {
            Root.DevToolsContext.globalInstance().get(HostConfigTracker).dispose();
            Root.DevToolsContext.globalInstance().delete(HostConfigTracker);
        }
    }
    addEventListener(eventType, listener) {
        const isFirst = !this.hasEventListeners(eventType);
        const eventDescriptor = super.addEventListener(eventType, listener);
        if (isFirst) {
            clearTimeout(this.#pollTimer);
            void this.pollAidaAvailability();
        }
        return eventDescriptor;
    }
    removeEventListener(eventType, listener) {
        super.removeEventListener(eventType, listener);
        if (!this.hasEventListeners(eventType)) {
            clearTimeout(this.#pollTimer);
        }
    }
    async pollAidaAvailability() {
        this.#pollTimer = setTimeout(() => this.pollAidaAvailability(), 2000);
        const currentAidaAvailability = await AidaClient.checkAccessPreconditions();
        if (currentAidaAvailability !== this.#aidaAvailability) {
            this.#aidaAvailability = currentAidaAvailability;
            const config = await new Promise(resolve => InspectorFrontendHostInstance.getHostConfig(resolve));
            Object.assign(Root.Runtime.hostConfig, config);
            this.dispatchEventToListeners("aidaAvailabilityChanged" /* Events.AIDA_AVAILABILITY_CHANGED */, currentAidaAvailability);
        }
    }
}
export var Events;
(function (Events) {
    Events["AIDA_AVAILABILITY_CHANGED"] = "aidaAvailabilityChanged";
})(Events || (Events = {}));
//# sourceMappingURL=AidaClient.js.map
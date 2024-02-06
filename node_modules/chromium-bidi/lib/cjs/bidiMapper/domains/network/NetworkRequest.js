"use strict";
/*
 * Copyright 2023 Google LLC.
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkRequest = void 0;
const protocol_js_1 = require("../../../protocol/protocol.js");
const assert_js_1 = require("../../../utils/assert.js");
const Deferred_js_1 = require("../../../utils/Deferred.js");
const NetworkUtils_js_1 = require("./NetworkUtils.js");
/** Abstracts one individual network request. */
class NetworkRequest {
    static #unknown = 'UNKNOWN';
    /**
     * Each network request has an associated request id, which is a string
     * uniquely identifying that request.
     *
     * The identifier for a request resulting from a redirect matches that of the
     * request that initiated it.
     */
    #requestId;
    // TODO: Handle auth required?
    /**
     * Indicates the network intercept phase, if the request is currently blocked.
     * Undefined necessarily implies that the request is not blocked.
     */
    #interceptPhase = undefined;
    #servedFromCache = false;
    #redirectCount;
    #eventManager;
    #networkStorage;
    #request = {};
    #response = {};
    #beforeRequestSentDeferred = new Deferred_js_1.Deferred();
    #responseStartedDeferred = new Deferred_js_1.Deferred();
    #responseCompletedDeferred = new Deferred_js_1.Deferred();
    #cdpTarget;
    constructor(requestId, eventManager, networkStorage, cdpTarget, redirectCount = 0) {
        this.#requestId = requestId;
        this.#eventManager = eventManager;
        this.#networkStorage = networkStorage;
        this.#cdpTarget = cdpTarget;
        this.#redirectCount = redirectCount;
    }
    get requestId() {
        return this.#requestId;
    }
    get url() {
        return this.#response.info?.url ?? this.#request.info?.request.url;
    }
    get redirectCount() {
        return this.#redirectCount;
    }
    get cdpTarget() {
        return this.#cdpTarget;
    }
    isRedirecting() {
        return Boolean(this.#request.info);
    }
    handleRedirect(event) {
        this.#queueResponseStartedEvent();
        this.#queueResponseCompletedEvent();
        this.#response.hasExtraInfo = event.redirectHasExtraInfo;
        this.#response.info = event.redirectResponse;
        this.#emitEventsIfReady(true);
    }
    #emitEventsIfReady(wasRedirected = false) {
        const requestExtraInfoCompleted = 
        // Flush redirects
        wasRedirected ||
            Boolean(this.#request.extraInfo) ||
            // Requests from cache don't have extra info
            this.#servedFromCache ||
            // Sometimes there is no extra info and the response
            // is the only place we can find out
            Boolean(this.#response.info && !this.#response.hasExtraInfo) ||
            this.#interceptPhase === "beforeRequestSent" /* Network.InterceptPhase.BeforeRequestSent */;
        if (this.#request.info && requestExtraInfoCompleted) {
            this.#beforeRequestSentDeferred.resolve({
                kind: 'success',
                value: undefined,
            });
        }
        const responseExtraInfoCompleted = Boolean(this.#response.extraInfo) ||
            // Response from cache don't have extra info
            this.#servedFromCache ||
            // Don't expect extra info if the flag is false
            Boolean(this.#response.info && !this.#response.hasExtraInfo) ||
            this.#interceptPhase === "responseStarted" /* Network.InterceptPhase.ResponseStarted */;
        if (this.#response.info && responseExtraInfoCompleted) {
            this.#responseStartedDeferred.resolve({
                kind: 'success',
                value: undefined,
            });
            this.#responseCompletedDeferred.resolve({
                kind: 'success',
                value: undefined,
            });
        }
    }
    onRequestWillBeSentEvent(event) {
        this.#request.info = event;
        this.#queueBeforeRequestSentEvent();
        this.#emitEventsIfReady();
    }
    onRequestWillBeSentExtraInfoEvent(event) {
        this.#request.extraInfo = event;
        this.#emitEventsIfReady();
    }
    onResponseReceivedExtraInfoEvent(event) {
        this.#response.extraInfo = event;
        this.#emitEventsIfReady();
    }
    onResponseReceivedEvent(event) {
        this.#response.hasExtraInfo = event.hasExtraInfo;
        this.#response.info = event.response;
        this.#queueResponseStartedEvent();
        this.#queueResponseCompletedEvent();
        this.#emitEventsIfReady();
    }
    onServedFromCache() {
        this.#servedFromCache = true;
        this.#emitEventsIfReady();
    }
    onLoadingFailedEvent(event) {
        this.#beforeRequestSentDeferred.resolve({
            kind: 'success',
            value: undefined,
        });
        this.#responseStartedDeferred.resolve({
            kind: 'error',
            error: new Error('Network event loading failed'),
        });
        this.#responseCompletedDeferred.resolve({
            kind: 'error',
            error: new Error('Network event loading failed'),
        });
        this.#eventManager.registerEvent({
            type: 'event',
            method: protocol_js_1.ChromiumBidi.Network.EventNames.FetchError,
            params: {
                ...this.#getBaseEventParams(),
                errorText: event.errorText,
            },
        }, this.#context);
    }
    /** Fired whenever a network request interception is hit. */
    onRequestPaused(params) {
        if (this.#isIgnoredEvent()) {
            void this.continueRequest(params.requestId).catch(() => {
                // TODO: Add some logging
            });
            return;
        }
        // The stage of the request can be determined by presence of
        // responseErrorReason and responseStatusCode -- the request is at
        // the response stage if either of these fields is present and in the
        // request stage otherwise.
        let phase;
        if (params.responseErrorReason === undefined &&
            params.responseStatusCode === undefined) {
            phase = "beforeRequestSent" /* Network.InterceptPhase.BeforeRequestSent */;
        }
        else if (params.responseStatusCode === 401 &&
            params.responseStatusText === 'Unauthorized') {
            // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401
            phase = "authRequired" /* Network.InterceptPhase.AuthRequired */;
        }
        else {
            phase = "responseStarted" /* Network.InterceptPhase.ResponseStarted */;
        }
        const headers = (0, NetworkUtils_js_1.bidiNetworkHeadersFromCdpFetchHeaders)(
        // TODO: Use params.request.headers if request?
        params.responseHeaders);
        this.#networkStorage.addBlockedRequest(this.requestId, {
            request: params.requestId, // intercept request id
            phase,
            // TODO: Finish populating response / ResponseData.
            response: {
                url: params.request.url,
                // TODO: populate.
                protocol: '',
                status: params.responseStatusCode ?? 0,
                statusText: params.responseStatusText ?? '',
                // TODO: populate.
                fromCache: false,
                headers,
                // TODO: populate.
                mimeType: '',
                // TODO: populate.
                bytesReceived: 0,
                headersSize: (0, NetworkUtils_js_1.computeHeadersSize)(headers),
                // TODO: consider removing from spec.
                bodySize: 0,
                // TODO: consider removing from spec.
                content: {
                    size: 0,
                },
                // TODO: populate.
                authChallenge: undefined,
            },
        });
        this.#interceptPhase = phase;
        this.#emitEventsIfReady();
    }
    /** @see https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#method-failRequest */
    async failRequest(networkId, errorReason) {
        await this.#cdpTarget.cdpClient.sendCommand('Fetch.failRequest', {
            requestId: networkId,
            errorReason,
        });
        this.#interceptPhase = undefined;
    }
    /** @see https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#method-continueRequest */
    async continueRequest(cdpFetchRequestId, url, method, headers) {
        // TODO: Expand.
        await this.#cdpTarget.cdpClient.sendCommand('Fetch.continueRequest', {
            requestId: cdpFetchRequestId,
            url,
            method,
            headers,
            // TODO: Set?
            // postData:,
            // interceptResponse:,
        });
        this.#interceptPhase = undefined;
    }
    /** @see https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#method-continueResponse */
    async continueResponse(cdpFetchRequestId, responseCode, responsePhrase, responseHeaders) {
        await this.#cdpTarget.cdpClient.sendCommand('Fetch.continueResponse', {
            requestId: cdpFetchRequestId,
            responseCode,
            responsePhrase,
            responseHeaders,
        });
        this.#interceptPhase = undefined;
    }
    /** @see https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#method-continueWithAuth */
    async continueWithAuth(cdpFetchRequestId, response, username, password) {
        await this.#cdpTarget.cdpClient.sendCommand('Fetch.continueWithAuth', {
            requestId: cdpFetchRequestId,
            authChallengeResponse: {
                response,
                username,
                password,
            },
        });
        this.#interceptPhase = undefined;
    }
    /** @see https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#method-provideResponse */
    async provideResponse(cdpFetchRequestId, responseCode, responsePhrase, responseHeaders, body) {
        await this.#cdpTarget.cdpClient.sendCommand('Fetch.fulfillRequest', {
            requestId: cdpFetchRequestId,
            responseCode,
            responsePhrase,
            responseHeaders,
            ...(body ? { body: btoa(body) } : {}), // TODO: Double-check if btoa usage is correct.
        });
        this.#interceptPhase = undefined;
    }
    dispose() {
        const result = {
            kind: 'error',
            error: new Error('Network processor detached'),
        };
        this.#beforeRequestSentDeferred.resolve(result);
        this.#responseStartedDeferred.resolve(result);
        this.#responseCompletedDeferred.resolve(result);
    }
    get #context() {
        return this.#request.info?.frameId ?? null;
    }
    /** Returns the HTTP status code associated with this request if any. */
    get statusCode() {
        return (this.#response.info?.status ?? this.#response.extraInfo?.statusCode ?? -1 // TODO: Throw an exception or use some other status code?
        );
    }
    #getBaseEventParams(phase) {
        // TODO: Set this in terms of intercepts?
        const isBlocked = phase !== undefined && phase === this.#interceptPhase;
        const intercepts = this.#networkStorage.getNetworkIntercepts(this.#requestId, phase);
        return {
            isBlocked,
            context: this.#context,
            navigation: this.#getNavigationId(),
            redirectCount: this.#redirectCount,
            request: this.#getRequestData(),
            // Timestamp should be in milliseconds, while CDP provides it in seconds.
            timestamp: Math.round((this.#request.info?.wallTime ?? 0) * 1000),
            // XXX: we should return correct types from the function.
            intercepts: isBlocked ? intercepts : undefined,
        };
    }
    #getNavigationId() {
        if (!this.#request.info ||
            !this.#request.info.loaderId ||
            // When we navigate all CDP network events have `loaderId`
            // CDP's `loaderId` and `requestId` match when
            // that request triggered the loading
            this.#request.info.loaderId !== this.#request.info.requestId) {
            return null;
        }
        return this.#request.info.loaderId;
    }
    #getRequestData() {
        const cookies = this.#request.extraInfo
            ? NetworkRequest.#getCookies(this.#request.extraInfo.associatedCookies)
            : [];
        const headers = (0, NetworkUtils_js_1.bidiNetworkHeadersFromCdpNetworkHeaders)(this.#request.info?.request.headers);
        return {
            request: this.#request.info?.requestId ?? NetworkRequest.#unknown,
            url: this.#request.info?.request.url ?? NetworkRequest.#unknown,
            method: this.#request.info?.request.method ?? NetworkRequest.#unknown,
            headers,
            cookies,
            headersSize: (0, NetworkUtils_js_1.computeHeadersSize)(headers),
            // TODO: implement.
            bodySize: 0,
            timings: this.#getTimings(),
        };
    }
    // TODO: implement.
    #getTimings() {
        return {
            timeOrigin: 0,
            requestTime: 0,
            redirectStart: 0,
            redirectEnd: 0,
            fetchStart: 0,
            dnsStart: 0,
            dnsEnd: 0,
            connectStart: 0,
            connectEnd: 0,
            tlsStart: 0,
            requestStart: 0,
            responseStart: 0,
            responseEnd: 0,
        };
    }
    #queueBeforeRequestSentEvent() {
        if (this.#isIgnoredEvent()) {
            return;
        }
        this.#eventManager.registerPromiseEvent(this.#beforeRequestSentDeferred.then((result) => {
            if (result.kind === 'success') {
                try {
                    return {
                        kind: 'success',
                        value: Object.assign(this.#getBeforeRequestEvent(), {
                            type: 'event',
                        }),
                    };
                }
                catch (error) {
                    return {
                        kind: 'error',
                        error: error instanceof Error ? error : new Error('Unknown'),
                    };
                }
            }
            return result;
        }), this.#context, protocol_js_1.ChromiumBidi.Network.EventNames.BeforeRequestSent);
    }
    #getBeforeRequestEvent() {
        (0, assert_js_1.assert)(this.#request.info, 'RequestWillBeSentEvent is not set');
        return {
            method: protocol_js_1.ChromiumBidi.Network.EventNames.BeforeRequestSent,
            params: {
                ...this.#getBaseEventParams("beforeRequestSent" /* Network.InterceptPhase.BeforeRequestSent */),
                initiator: {
                    type: NetworkRequest.#getInitiatorType(this.#request.info.initiator.type),
                },
            },
        };
    }
    #queueResponseStartedEvent() {
        if (this.#isIgnoredEvent()) {
            return;
        }
        this.#eventManager.registerPromiseEvent(this.#responseStartedDeferred.then((result) => {
            if (result.kind === 'success') {
                try {
                    return {
                        kind: 'success',
                        value: Object.assign(this.#getResponseStartedEvent(), {
                            type: 'event',
                        }),
                    };
                }
                catch (error) {
                    return {
                        kind: 'error',
                        error: error instanceof Error ? error : new Error('Unknown'),
                    };
                }
            }
            return result;
        }), this.#context, protocol_js_1.ChromiumBidi.Network.EventNames.ResponseStarted);
    }
    #getResponseStartedEvent() {
        (0, assert_js_1.assert)(this.#request.info, 'RequestWillBeSentEvent is not set');
        (0, assert_js_1.assert)(this.#response.info, 'ResponseReceivedEvent is not set');
        // Chromium sends wrong extraInfo events for responses served from cache.
        // See https://github.com/puppeteer/puppeteer/issues/9965 and
        // https://crbug.com/1340398.
        if (this.#response.info.fromDiskCache) {
            this.#response.extraInfo = undefined;
        }
        const headers = (0, NetworkUtils_js_1.bidiNetworkHeadersFromCdpNetworkHeaders)(this.#response.info.headers);
        return {
            method: protocol_js_1.ChromiumBidi.Network.EventNames.ResponseStarted,
            params: {
                ...this.#getBaseEventParams(),
                response: {
                    url: this.#response.info.url ?? NetworkRequest.#unknown,
                    protocol: this.#response.info.protocol ?? '',
                    status: this.statusCode,
                    statusText: this.#response.info.statusText,
                    fromCache: this.#response.info.fromDiskCache ||
                        this.#response.info.fromPrefetchCache ||
                        this.#servedFromCache,
                    headers,
                    mimeType: this.#response.info.mimeType,
                    bytesReceived: this.#response.info.encodedDataLength,
                    headersSize: (0, NetworkUtils_js_1.computeHeadersSize)(headers),
                    // TODO: consider removing from spec.
                    bodySize: 0,
                    content: {
                        // TODO: consider removing from spec.
                        size: 0,
                    },
                },
            },
        };
    }
    #queueResponseCompletedEvent() {
        if (this.#isIgnoredEvent()) {
            return;
        }
        this.#eventManager.registerPromiseEvent(this.#responseCompletedDeferred.then((result) => {
            if (result.kind === 'success') {
                try {
                    return {
                        kind: 'success',
                        value: Object.assign(this.#getResponseReceivedEvent(), {
                            type: 'event',
                        }),
                    };
                }
                catch (error) {
                    return {
                        kind: 'error',
                        error: error instanceof Error ? error : new Error('Unknown'),
                    };
                }
            }
            return result;
        }), this.#context, protocol_js_1.ChromiumBidi.Network.EventNames.ResponseCompleted);
    }
    #getResponseReceivedEvent() {
        (0, assert_js_1.assert)(this.#request.info, 'RequestWillBeSentEvent is not set');
        (0, assert_js_1.assert)(this.#response.info, 'ResponseReceivedEvent is not set');
        // Chromium sends wrong extraInfo events for responses served from cache.
        // See https://github.com/puppeteer/puppeteer/issues/9965 and
        // https://crbug.com/1340398.
        if (this.#response.info.fromDiskCache) {
            this.#response.extraInfo = undefined;
        }
        const headers = (0, NetworkUtils_js_1.bidiNetworkHeadersFromCdpNetworkHeaders)(this.#response.info.headers);
        return {
            method: protocol_js_1.ChromiumBidi.Network.EventNames.ResponseCompleted,
            params: {
                ...this.#getBaseEventParams(),
                response: {
                    url: this.#response.info.url ?? NetworkRequest.#unknown,
                    protocol: this.#response.info.protocol ?? '',
                    status: this.statusCode,
                    statusText: this.#response.info.statusText,
                    fromCache: this.#response.info.fromDiskCache ||
                        this.#response.info.fromPrefetchCache ||
                        this.#servedFromCache,
                    headers,
                    mimeType: this.#response.info.mimeType,
                    bytesReceived: this.#response.info.encodedDataLength,
                    headersSize: (0, NetworkUtils_js_1.computeHeadersSize)(headers),
                    // TODO: consider removing from spec.
                    bodySize: 0,
                    content: {
                        // TODO: consider removing from spec.
                        size: 0,
                    },
                },
            },
        };
    }
    #isIgnoredEvent() {
        return this.#request.info?.request.url.endsWith('/favicon.ico') ?? false;
    }
    static #getInitiatorType(initiatorType) {
        switch (initiatorType) {
            case 'parser':
            case 'script':
            case 'preflight':
                return initiatorType;
            default:
                return 'other';
        }
    }
    static #getCookies(associatedCookies) {
        return associatedCookies
            .filter(({ blockedReasons }) => {
            return !Array.isArray(blockedReasons) || blockedReasons.length === 0;
        })
            .map(({ cookie }) => (0, NetworkUtils_js_1.cdpToBiDiCookie)(cookie));
    }
}
exports.NetworkRequest = NetworkRequest;
//# sourceMappingURL=NetworkRequest.js.map
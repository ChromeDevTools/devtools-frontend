"use strict";
/**
 * Copyright 2017 Google Inc. All rights reserved.
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
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkManager = exports.NetworkManagerEmittedEvents = void 0;
const assert_js_1 = require("../util/assert.js");
const DebuggableDeferred_js_1 = require("../util/DebuggableDeferred.js");
const EventEmitter_js_1 = require("./EventEmitter.js");
const HTTPRequest_js_1 = require("./HTTPRequest.js");
const HTTPResponse_js_1 = require("./HTTPResponse.js");
const NetworkEventManager_js_1 = require("./NetworkEventManager.js");
const util_js_1 = require("./util.js");
/**
 * We use symbols to prevent any external parties listening to these events.
 * They are internal to Puppeteer.
 *
 * @internal
 */
exports.NetworkManagerEmittedEvents = {
    Request: Symbol('NetworkManager.Request'),
    RequestServedFromCache: Symbol('NetworkManager.RequestServedFromCache'),
    Response: Symbol('NetworkManager.Response'),
    RequestFailed: Symbol('NetworkManager.RequestFailed'),
    RequestFinished: Symbol('NetworkManager.RequestFinished'),
};
/**
 * @internal
 */
class NetworkManager extends EventEmitter_js_1.EventEmitter {
    #client;
    #ignoreHTTPSErrors;
    #frameManager;
    #networkEventManager = new NetworkEventManager_js_1.NetworkEventManager();
    #extraHTTPHeaders = {};
    #credentials;
    #attemptedAuthentications = new Set();
    #userRequestInterceptionEnabled = false;
    #protocolRequestInterceptionEnabled = false;
    #userCacheDisabled = false;
    #emulatedNetworkConditions = {
        offline: false,
        upload: -1,
        download: -1,
        latency: 0,
    };
    #deferredInit;
    #handlers = new Map([
        ['Fetch.requestPaused', this.#onRequestPaused.bind(this)],
        ['Fetch.authRequired', this.#onAuthRequired.bind(this)],
        ['Network.requestWillBeSent', this.#onRequestWillBeSent.bind(this)],
        [
            'Network.requestServedFromCache',
            this.#onRequestServedFromCache.bind(this),
        ],
        ['Network.responseReceived', this.#onResponseReceived.bind(this)],
        ['Network.loadingFinished', this.#onLoadingFinished.bind(this)],
        ['Network.loadingFailed', this.#onLoadingFailed.bind(this)],
        [
            'Network.responseReceivedExtraInfo',
            this.#onResponseReceivedExtraInfo.bind(this),
        ],
    ]);
    constructor(client, ignoreHTTPSErrors, frameManager) {
        super();
        this.#client = client;
        this.#ignoreHTTPSErrors = ignoreHTTPSErrors;
        this.#frameManager = frameManager;
        for (const [event, handler] of this.#handlers) {
            this.#client.on(event, handler);
        }
    }
    async updateClient(client) {
        this.#client = client;
        for (const [event, handler] of this.#handlers) {
            this.#client.on(event, handler);
        }
        this.#deferredInit = undefined;
        await this.initialize();
    }
    /**
     * Initialize calls should avoid async dependencies between CDP calls as those
     * might not resolve until after the target is resumed causing a deadlock.
     */
    initialize() {
        if (this.#deferredInit) {
            return this.#deferredInit.valueOrThrow();
        }
        this.#deferredInit = (0, DebuggableDeferred_js_1.createDebuggableDeferred)('NetworkManager initialization timed out');
        const init = Promise.all([
            this.#ignoreHTTPSErrors
                ? this.#client.send('Security.setIgnoreCertificateErrors', {
                    ignore: true,
                })
                : null,
            this.#client.send('Network.enable'),
        ]);
        const deferredInitPromise = this.#deferredInit;
        init
            .then(() => {
            deferredInitPromise.resolve();
        })
            .catch(err => {
            deferredInitPromise.reject(err);
        });
        return this.#deferredInit.valueOrThrow();
    }
    async authenticate(credentials) {
        this.#credentials = credentials;
        await this.#updateProtocolRequestInterception();
    }
    async setExtraHTTPHeaders(extraHTTPHeaders) {
        this.#extraHTTPHeaders = {};
        for (const key of Object.keys(extraHTTPHeaders)) {
            const value = extraHTTPHeaders[key];
            (0, assert_js_1.assert)((0, util_js_1.isString)(value), `Expected value of header "${key}" to be String, but "${typeof value}" is found.`);
            this.#extraHTTPHeaders[key.toLowerCase()] = value;
        }
        await this.#client.send('Network.setExtraHTTPHeaders', {
            headers: this.#extraHTTPHeaders,
        });
    }
    extraHTTPHeaders() {
        return Object.assign({}, this.#extraHTTPHeaders);
    }
    inFlightRequestsCount() {
        return this.#networkEventManager.inFlightRequestsCount();
    }
    async setOfflineMode(value) {
        this.#emulatedNetworkConditions.offline = value;
        await this.#updateNetworkConditions();
    }
    async emulateNetworkConditions(networkConditions) {
        this.#emulatedNetworkConditions.upload = networkConditions
            ? networkConditions.upload
            : -1;
        this.#emulatedNetworkConditions.download = networkConditions
            ? networkConditions.download
            : -1;
        this.#emulatedNetworkConditions.latency = networkConditions
            ? networkConditions.latency
            : 0;
        await this.#updateNetworkConditions();
    }
    async #updateNetworkConditions() {
        await this.#client.send('Network.emulateNetworkConditions', {
            offline: this.#emulatedNetworkConditions.offline,
            latency: this.#emulatedNetworkConditions.latency,
            uploadThroughput: this.#emulatedNetworkConditions.upload,
            downloadThroughput: this.#emulatedNetworkConditions.download,
        });
    }
    async setUserAgent(userAgent, userAgentMetadata) {
        await this.#client.send('Network.setUserAgentOverride', {
            userAgent: userAgent,
            userAgentMetadata: userAgentMetadata,
        });
    }
    async setCacheEnabled(enabled) {
        this.#userCacheDisabled = !enabled;
        await this.#updateProtocolCacheDisabled();
    }
    async setRequestInterception(value) {
        this.#userRequestInterceptionEnabled = value;
        await this.#updateProtocolRequestInterception();
    }
    async #updateProtocolRequestInterception() {
        const enabled = this.#userRequestInterceptionEnabled || !!this.#credentials;
        if (enabled === this.#protocolRequestInterceptionEnabled) {
            return;
        }
        this.#protocolRequestInterceptionEnabled = enabled;
        if (enabled) {
            await Promise.all([
                this.#updateProtocolCacheDisabled(),
                this.#client.send('Fetch.enable', {
                    handleAuthRequests: true,
                    patterns: [{ urlPattern: '*' }],
                }),
            ]);
        }
        else {
            await Promise.all([
                this.#updateProtocolCacheDisabled(),
                this.#client.send('Fetch.disable'),
            ]);
        }
    }
    #cacheDisabled() {
        return this.#userCacheDisabled;
    }
    async #updateProtocolCacheDisabled() {
        await this.#client.send('Network.setCacheDisabled', {
            cacheDisabled: this.#cacheDisabled(),
        });
    }
    #onRequestWillBeSent(event) {
        // Request interception doesn't happen for data URLs with Network Service.
        if (this.#userRequestInterceptionEnabled &&
            !event.request.url.startsWith('data:')) {
            const { requestId: networkRequestId } = event;
            this.#networkEventManager.storeRequestWillBeSent(networkRequestId, event);
            /**
             * CDP may have sent a Fetch.requestPaused event already. Check for it.
             */
            const requestPausedEvent = this.#networkEventManager.getRequestPaused(networkRequestId);
            if (requestPausedEvent) {
                const { requestId: fetchRequestId } = requestPausedEvent;
                this.#patchRequestEventHeaders(event, requestPausedEvent);
                this.#onRequest(event, fetchRequestId);
                this.#networkEventManager.forgetRequestPaused(networkRequestId);
            }
            return;
        }
        this.#onRequest(event, undefined);
    }
    #onAuthRequired(event) {
        let response = 'Default';
        if (this.#attemptedAuthentications.has(event.requestId)) {
            response = 'CancelAuth';
        }
        else if (this.#credentials) {
            response = 'ProvideCredentials';
            this.#attemptedAuthentications.add(event.requestId);
        }
        const { username, password } = this.#credentials || {
            username: undefined,
            password: undefined,
        };
        this.#client
            .send('Fetch.continueWithAuth', {
            requestId: event.requestId,
            authChallengeResponse: { response, username, password },
        })
            .catch(util_js_1.debugError);
    }
    /**
     * CDP may send a Fetch.requestPaused without or before a
     * Network.requestWillBeSent
     *
     * CDP may send multiple Fetch.requestPaused
     * for the same Network.requestWillBeSent.
     */
    #onRequestPaused(event) {
        if (!this.#userRequestInterceptionEnabled &&
            this.#protocolRequestInterceptionEnabled) {
            this.#client
                .send('Fetch.continueRequest', {
                requestId: event.requestId,
            })
                .catch(util_js_1.debugError);
        }
        const { networkId: networkRequestId, requestId: fetchRequestId } = event;
        if (!networkRequestId) {
            this.#onRequestWithoutNetworkInstrumentation(event);
            return;
        }
        const requestWillBeSentEvent = (() => {
            const requestWillBeSentEvent = this.#networkEventManager.getRequestWillBeSent(networkRequestId);
            // redirect requests have the same `requestId`,
            if (requestWillBeSentEvent &&
                (requestWillBeSentEvent.request.url !== event.request.url ||
                    requestWillBeSentEvent.request.method !== event.request.method)) {
                this.#networkEventManager.forgetRequestWillBeSent(networkRequestId);
                return;
            }
            return requestWillBeSentEvent;
        })();
        if (requestWillBeSentEvent) {
            this.#patchRequestEventHeaders(requestWillBeSentEvent, event);
            this.#onRequest(requestWillBeSentEvent, fetchRequestId);
        }
        else {
            this.#networkEventManager.storeRequestPaused(networkRequestId, event);
        }
    }
    #patchRequestEventHeaders(requestWillBeSentEvent, requestPausedEvent) {
        requestWillBeSentEvent.request.headers = {
            ...requestWillBeSentEvent.request.headers,
            // includes extra headers, like: Accept, Origin
            ...requestPausedEvent.request.headers,
        };
    }
    #onRequestWithoutNetworkInstrumentation(event) {
        // If an event has no networkId it should not have any network events. We
        // still want to dispatch it for the interception by the user.
        const frame = event.frameId
            ? this.#frameManager.frame(event.frameId)
            : null;
        const request = new HTTPRequest_js_1.HTTPRequest(this.#client, frame, event.requestId, this.#userRequestInterceptionEnabled, event, []);
        this.emit(exports.NetworkManagerEmittedEvents.Request, request);
        void request.finalizeInterceptions();
    }
    #onRequest(event, fetchRequestId) {
        let redirectChain = [];
        if (event.redirectResponse) {
            // We want to emit a response and requestfinished for the
            // redirectResponse, but we can't do so unless we have a
            // responseExtraInfo ready to pair it up with. If we don't have any
            // responseExtraInfos saved in our queue, they we have to wait until
            // the next one to emit response and requestfinished, *and* we should
            // also wait to emit this Request too because it should come after the
            // response/requestfinished.
            let redirectResponseExtraInfo = null;
            if (event.redirectHasExtraInfo) {
                redirectResponseExtraInfo = this.#networkEventManager
                    .responseExtraInfo(event.requestId)
                    .shift();
                if (!redirectResponseExtraInfo) {
                    this.#networkEventManager.queueRedirectInfo(event.requestId, {
                        event,
                        fetchRequestId,
                    });
                    return;
                }
            }
            const request = this.#networkEventManager.getRequest(event.requestId);
            // If we connect late to the target, we could have missed the
            // requestWillBeSent event.
            if (request) {
                this.#handleRequestRedirect(request, event.redirectResponse, redirectResponseExtraInfo);
                redirectChain = request._redirectChain;
            }
        }
        const frame = event.frameId
            ? this.#frameManager.frame(event.frameId)
            : null;
        const request = new HTTPRequest_js_1.HTTPRequest(this.#client, frame, fetchRequestId, this.#userRequestInterceptionEnabled, event, redirectChain);
        this.#networkEventManager.storeRequest(event.requestId, request);
        this.emit(exports.NetworkManagerEmittedEvents.Request, request);
        void request.finalizeInterceptions();
    }
    #onRequestServedFromCache(event) {
        const request = this.#networkEventManager.getRequest(event.requestId);
        if (request) {
            request._fromMemoryCache = true;
        }
        this.emit(exports.NetworkManagerEmittedEvents.RequestServedFromCache, request);
    }
    #handleRequestRedirect(request, responsePayload, extraInfo) {
        const response = new HTTPResponse_js_1.HTTPResponse(this.#client, request, responsePayload, extraInfo);
        request._response = response;
        request._redirectChain.push(request);
        response._resolveBody(new Error('Response body is unavailable for redirect responses'));
        this.#forgetRequest(request, false);
        this.emit(exports.NetworkManagerEmittedEvents.Response, response);
        this.emit(exports.NetworkManagerEmittedEvents.RequestFinished, request);
    }
    #emitResponseEvent(responseReceived, extraInfo) {
        const request = this.#networkEventManager.getRequest(responseReceived.requestId);
        // FileUpload sends a response without a matching request.
        if (!request) {
            return;
        }
        const extraInfos = this.#networkEventManager.responseExtraInfo(responseReceived.requestId);
        if (extraInfos.length) {
            (0, util_js_1.debugError)(new Error('Unexpected extraInfo events for request ' +
                responseReceived.requestId));
        }
        // Chromium sends wrong extraInfo events for responses served from cache.
        // See https://github.com/puppeteer/puppeteer/issues/9965 and
        // https://crbug.com/1340398.
        if (responseReceived.response.fromDiskCache) {
            extraInfo = null;
        }
        const response = new HTTPResponse_js_1.HTTPResponse(this.#client, request, responseReceived.response, extraInfo);
        request._response = response;
        this.emit(exports.NetworkManagerEmittedEvents.Response, response);
    }
    #onResponseReceived(event) {
        const request = this.#networkEventManager.getRequest(event.requestId);
        let extraInfo = null;
        if (request && !request._fromMemoryCache && event.hasExtraInfo) {
            extraInfo = this.#networkEventManager
                .responseExtraInfo(event.requestId)
                .shift();
            if (!extraInfo) {
                // Wait until we get the corresponding ExtraInfo event.
                this.#networkEventManager.queueEventGroup(event.requestId, {
                    responseReceivedEvent: event,
                });
                return;
            }
        }
        this.#emitResponseEvent(event, extraInfo);
    }
    #onResponseReceivedExtraInfo(event) {
        // We may have skipped a redirect response/request pair due to waiting for
        // this ExtraInfo event. If so, continue that work now that we have the
        // request.
        const redirectInfo = this.#networkEventManager.takeQueuedRedirectInfo(event.requestId);
        if (redirectInfo) {
            this.#networkEventManager.responseExtraInfo(event.requestId).push(event);
            this.#onRequest(redirectInfo.event, redirectInfo.fetchRequestId);
            return;
        }
        // We may have skipped response and loading events because we didn't have
        // this ExtraInfo event yet. If so, emit those events now.
        const queuedEvents = this.#networkEventManager.getQueuedEventGroup(event.requestId);
        if (queuedEvents) {
            this.#networkEventManager.forgetQueuedEventGroup(event.requestId);
            this.#emitResponseEvent(queuedEvents.responseReceivedEvent, event);
            if (queuedEvents.loadingFinishedEvent) {
                this.#emitLoadingFinished(queuedEvents.loadingFinishedEvent);
            }
            if (queuedEvents.loadingFailedEvent) {
                this.#emitLoadingFailed(queuedEvents.loadingFailedEvent);
            }
            return;
        }
        // Wait until we get another event that can use this ExtraInfo event.
        this.#networkEventManager.responseExtraInfo(event.requestId).push(event);
    }
    #forgetRequest(request, events) {
        const requestId = request._requestId;
        const interceptionId = request._interceptionId;
        this.#networkEventManager.forgetRequest(requestId);
        interceptionId !== undefined &&
            this.#attemptedAuthentications.delete(interceptionId);
        if (events) {
            this.#networkEventManager.forget(requestId);
        }
    }
    #onLoadingFinished(event) {
        // If the response event for this request is still waiting on a
        // corresponding ExtraInfo event, then wait to emit this event too.
        const queuedEvents = this.#networkEventManager.getQueuedEventGroup(event.requestId);
        if (queuedEvents) {
            queuedEvents.loadingFinishedEvent = event;
        }
        else {
            this.#emitLoadingFinished(event);
        }
    }
    #emitLoadingFinished(event) {
        const request = this.#networkEventManager.getRequest(event.requestId);
        // For certain requestIds we never receive requestWillBeSent event.
        // @see https://crbug.com/750469
        if (!request) {
            return;
        }
        // Under certain conditions we never get the Network.responseReceived
        // event from protocol. @see https://crbug.com/883475
        if (request.response()) {
            request.response()?._resolveBody(null);
        }
        this.#forgetRequest(request, true);
        this.emit(exports.NetworkManagerEmittedEvents.RequestFinished, request);
    }
    #onLoadingFailed(event) {
        // If the response event for this request is still waiting on a
        // corresponding ExtraInfo event, then wait to emit this event too.
        const queuedEvents = this.#networkEventManager.getQueuedEventGroup(event.requestId);
        if (queuedEvents) {
            queuedEvents.loadingFailedEvent = event;
        }
        else {
            this.#emitLoadingFailed(event);
        }
    }
    #emitLoadingFailed(event) {
        const request = this.#networkEventManager.getRequest(event.requestId);
        // For certain requestIds we never receive requestWillBeSent event.
        // @see https://crbug.com/750469
        if (!request) {
            return;
        }
        request._failureText = event.errorText;
        const response = request.response();
        if (response) {
            response._resolveBody(null);
        }
        this.#forgetRequest(request, true);
        this.emit(exports.NetworkManagerEmittedEvents.RequestFailed, request);
    }
}
exports.NetworkManager = NetworkManager;
//# sourceMappingURL=NetworkManager.js.map
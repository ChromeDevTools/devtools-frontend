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
const EventEmitter_js_1 = require("./EventEmitter.js");
const assert_js_1 = require("./assert.js");
const helper_js_1 = require("./helper.js");
const HTTPRequest_js_1 = require("./HTTPRequest.js");
const HTTPResponse_js_1 = require("./HTTPResponse.js");
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
    constructor(client, ignoreHTTPSErrors, frameManager) {
        super();
        /*
         * There are four possible orders of events:
         *  A. `_onRequestWillBeSent`
         *  B. `_onRequestWillBeSent`, `_onRequestPaused`
         *  C. `_onRequestPaused`, `_onRequestWillBeSent`
         *  D. `_onRequestPaused`, `_onRequestWillBeSent`, `_onRequestPaused`
         *     (see crbug.com/1196004)
         *
         * For `_onRequest` we need the event from `_onRequestWillBeSent` and
         * optionally the `interceptionId` from `_onRequestPaused`.
         *
         * If request interception is disabled, call `_onRequest` once per call to
         * `_onRequestWillBeSent`.
         * If request interception is enabled, call `_onRequest` once per call to
         * `_onRequestPaused` (once per `interceptionId`).
         *
         * Events are stored to allow for subsequent events to call `_onRequest`.
         *
         * Note that (chains of) redirect requests have the same `requestId` (!) as
         * the original request. We have to anticipate series of events like these:
         *  A. `_onRequestWillBeSent`,
         *     `_onRequestWillBeSent`, ...
         *  B. `_onRequestWillBeSent`, `_onRequestPaused`,
         *     `_onRequestWillBeSent`, `_onRequestPaused`, ...
         *  C. `_onRequestWillBeSent`, `_onRequestPaused`,
         *     `_onRequestPaused`, `_onRequestWillBeSent`, ...
         *  D. `_onRequestPaused`, `_onRequestWillBeSent`,
         *     `_onRequestPaused`, `_onRequestWillBeSent`, `_onRequestPaused`, ...
         *     (see crbug.com/1196004)
         */
        this._requestIdToRequestWillBeSentEvent = new Map();
        this._requestIdToRequestPausedEvent = new Map();
        this._requestIdToRequest = new Map();
        /*
         * The below maps are used to reconcile Network.responseReceivedExtraInfo
         * events with their corresponding request. Each response and redirect
         * response gets an ExtraInfo event, and we don't know which will come first.
         * This means that we have to store a Response or an ExtraInfo for each
         * response, and emit the event when we get both of them. In addition, to
         * handle redirects, we have to make them Arrays to represent the chain of
         * events.
         */
        this._requestIdToResponseReceivedExtraInfo = new Map();
        this._requestIdToQueuedRedirectInfoMap = new Map();
        this._requestIdToQueuedEvents = new Map();
        this._extraHTTPHeaders = {};
        this._credentials = null;
        this._attemptedAuthentications = new Set();
        this._userRequestInterceptionEnabled = false;
        this._protocolRequestInterceptionEnabled = false;
        this._userCacheDisabled = false;
        this._emulatedNetworkConditions = {
            offline: false,
            upload: -1,
            download: -1,
            latency: 0,
        };
        this._client = client;
        this._ignoreHTTPSErrors = ignoreHTTPSErrors;
        this._frameManager = frameManager;
        this._client.on('Fetch.requestPaused', this._onRequestPaused.bind(this));
        this._client.on('Fetch.authRequired', this._onAuthRequired.bind(this));
        this._client.on('Network.requestWillBeSent', this._onRequestWillBeSent.bind(this));
        this._client.on('Network.requestServedFromCache', this._onRequestServedFromCache.bind(this));
        this._client.on('Network.responseReceived', this._onResponseReceived.bind(this));
        this._client.on('Network.loadingFinished', this._onLoadingFinished.bind(this));
        this._client.on('Network.loadingFailed', this._onLoadingFailed.bind(this));
        this._client.on('Network.responseReceivedExtraInfo', this._onResponseReceivedExtraInfo.bind(this));
    }
    async initialize() {
        await this._client.send('Network.enable');
        if (this._ignoreHTTPSErrors)
            await this._client.send('Security.setIgnoreCertificateErrors', {
                ignore: true,
            });
    }
    async authenticate(credentials) {
        this._credentials = credentials;
        await this._updateProtocolRequestInterception();
    }
    async setExtraHTTPHeaders(extraHTTPHeaders) {
        this._extraHTTPHeaders = {};
        for (const key of Object.keys(extraHTTPHeaders)) {
            const value = extraHTTPHeaders[key];
            (0, assert_js_1.assert)(helper_js_1.helper.isString(value), `Expected value of header "${key}" to be String, but "${typeof value}" is found.`);
            this._extraHTTPHeaders[key.toLowerCase()] = value;
        }
        await this._client.send('Network.setExtraHTTPHeaders', {
            headers: this._extraHTTPHeaders,
        });
    }
    extraHTTPHeaders() {
        return Object.assign({}, this._extraHTTPHeaders);
    }
    numRequestsInProgress() {
        return [...this._requestIdToRequest].filter(([, request]) => {
            return !request.response();
        }).length;
    }
    async setOfflineMode(value) {
        this._emulatedNetworkConditions.offline = value;
        await this._updateNetworkConditions();
    }
    async emulateNetworkConditions(networkConditions) {
        this._emulatedNetworkConditions.upload = networkConditions
            ? networkConditions.upload
            : -1;
        this._emulatedNetworkConditions.download = networkConditions
            ? networkConditions.download
            : -1;
        this._emulatedNetworkConditions.latency = networkConditions
            ? networkConditions.latency
            : 0;
        await this._updateNetworkConditions();
    }
    async _updateNetworkConditions() {
        await this._client.send('Network.emulateNetworkConditions', {
            offline: this._emulatedNetworkConditions.offline,
            latency: this._emulatedNetworkConditions.latency,
            uploadThroughput: this._emulatedNetworkConditions.upload,
            downloadThroughput: this._emulatedNetworkConditions.download,
        });
    }
    async setUserAgent(userAgent, userAgentMetadata) {
        await this._client.send('Network.setUserAgentOverride', {
            userAgent: userAgent,
            userAgentMetadata: userAgentMetadata,
        });
    }
    async setCacheEnabled(enabled) {
        this._userCacheDisabled = !enabled;
        await this._updateProtocolCacheDisabled();
    }
    async setRequestInterception(value) {
        this._userRequestInterceptionEnabled = value;
        await this._updateProtocolRequestInterception();
    }
    async _updateProtocolRequestInterception() {
        const enabled = this._userRequestInterceptionEnabled || !!this._credentials;
        if (enabled === this._protocolRequestInterceptionEnabled)
            return;
        this._protocolRequestInterceptionEnabled = enabled;
        if (enabled) {
            await Promise.all([
                this._updateProtocolCacheDisabled(),
                this._client.send('Fetch.enable', {
                    handleAuthRequests: true,
                    patterns: [{ urlPattern: '*' }],
                }),
            ]);
        }
        else {
            await Promise.all([
                this._updateProtocolCacheDisabled(),
                this._client.send('Fetch.disable'),
            ]);
        }
    }
    _cacheDisabled() {
        return this._userCacheDisabled;
    }
    async _updateProtocolCacheDisabled() {
        await this._client.send('Network.setCacheDisabled', {
            cacheDisabled: this._cacheDisabled(),
        });
    }
    _onRequestWillBeSent(event) {
        // Request interception doesn't happen for data URLs with Network Service.
        if (this._userRequestInterceptionEnabled &&
            !event.request.url.startsWith('data:')) {
            const requestId = event.requestId;
            const requestPausedEvent = this._requestIdToRequestPausedEvent.get(requestId);
            this._requestIdToRequestWillBeSentEvent.set(requestId, event);
            if (requestPausedEvent) {
                const interceptionId = requestPausedEvent.requestId;
                this._onRequest(event, interceptionId);
                this._requestIdToRequestPausedEvent.delete(requestId);
            }
            return;
        }
        this._onRequest(event, null);
    }
    _onAuthRequired(event) {
        let response = 'Default';
        if (this._attemptedAuthentications.has(event.requestId)) {
            response = 'CancelAuth';
        }
        else if (this._credentials) {
            response = 'ProvideCredentials';
            this._attemptedAuthentications.add(event.requestId);
        }
        const { username, password } = this._credentials || {
            username: undefined,
            password: undefined,
        };
        this._client
            .send('Fetch.continueWithAuth', {
            requestId: event.requestId,
            authChallengeResponse: { response, username, password },
        })
            .catch(helper_js_1.debugError);
    }
    _onRequestPaused(event) {
        if (!this._userRequestInterceptionEnabled &&
            this._protocolRequestInterceptionEnabled) {
            this._client
                .send('Fetch.continueRequest', {
                requestId: event.requestId,
            })
                .catch(helper_js_1.debugError);
        }
        const requestId = event.networkId;
        const interceptionId = event.requestId;
        if (!requestId) {
            return;
        }
        let requestWillBeSentEvent = this._requestIdToRequestWillBeSentEvent.get(requestId);
        // redirect requests have the same `requestId`,
        if (requestWillBeSentEvent &&
            (requestWillBeSentEvent.request.url !== event.request.url ||
                requestWillBeSentEvent.request.method !== event.request.method)) {
            this._requestIdToRequestWillBeSentEvent.delete(requestId);
            requestWillBeSentEvent = null;
        }
        if (requestWillBeSentEvent) {
            this._onRequest(requestWillBeSentEvent, interceptionId);
            this._requestIdToRequestWillBeSentEvent.delete(requestId);
        }
        else {
            this._requestIdToRequestPausedEvent.set(requestId, event);
        }
    }
    _requestIdToQueuedRedirectInfo(requestId) {
        if (!this._requestIdToQueuedRedirectInfoMap.has(requestId)) {
            this._requestIdToQueuedRedirectInfoMap.set(requestId, []);
        }
        return this._requestIdToQueuedRedirectInfoMap.get(requestId);
    }
    _requestIdToResponseExtraInfo(requestId) {
        if (!this._requestIdToResponseReceivedExtraInfo.has(requestId)) {
            this._requestIdToResponseReceivedExtraInfo.set(requestId, []);
        }
        return this._requestIdToResponseReceivedExtraInfo.get(requestId);
    }
    _onRequest(event, interceptionId) {
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
                redirectResponseExtraInfo = this._requestIdToResponseExtraInfo(event.requestId).shift();
                if (!redirectResponseExtraInfo) {
                    this._requestIdToQueuedRedirectInfo(event.requestId).push({
                        event,
                        interceptionId,
                    });
                    return;
                }
            }
            const request = this._requestIdToRequest.get(event.requestId);
            // If we connect late to the target, we could have missed the
            // requestWillBeSent event.
            if (request) {
                this._handleRequestRedirect(request, event.redirectResponse, redirectResponseExtraInfo);
                redirectChain = request._redirectChain;
            }
        }
        const frame = event.frameId
            ? this._frameManager.frame(event.frameId)
            : null;
        const request = new HTTPRequest_js_1.HTTPRequest(this._client, frame, interceptionId, this._userRequestInterceptionEnabled, event, redirectChain);
        this._requestIdToRequest.set(event.requestId, request);
        this.emit(exports.NetworkManagerEmittedEvents.Request, request);
        request.finalizeInterceptions();
    }
    _onRequestServedFromCache(event) {
        const request = this._requestIdToRequest.get(event.requestId);
        if (request)
            request._fromMemoryCache = true;
        this.emit(exports.NetworkManagerEmittedEvents.RequestServedFromCache, request);
    }
    _handleRequestRedirect(request, responsePayload, extraInfo) {
        const response = new HTTPResponse_js_1.HTTPResponse(this._client, request, responsePayload, extraInfo);
        request._response = response;
        request._redirectChain.push(request);
        response._resolveBody(new Error('Response body is unavailable for redirect responses'));
        this._forgetRequest(request, false);
        this.emit(exports.NetworkManagerEmittedEvents.Response, response);
        this.emit(exports.NetworkManagerEmittedEvents.RequestFinished, request);
    }
    _emitResponseEvent(responseReceived, extraInfo) {
        const request = this._requestIdToRequest.get(responseReceived.requestId);
        // FileUpload sends a response without a matching request.
        if (!request)
            return;
        const extraInfos = this._requestIdToResponseExtraInfo(responseReceived.requestId);
        if (extraInfos.length) {
            (0, helper_js_1.debugError)(new Error('Unexpected extraInfo events for request ' +
                responseReceived.requestId));
        }
        const response = new HTTPResponse_js_1.HTTPResponse(this._client, request, responseReceived.response, extraInfo);
        request._response = response;
        this.emit(exports.NetworkManagerEmittedEvents.Response, response);
    }
    _onResponseReceived(event) {
        const request = this._requestIdToRequest.get(event.requestId);
        let extraInfo = null;
        if (request && !request._fromMemoryCache && event.hasExtraInfo) {
            extraInfo = this._requestIdToResponseExtraInfo(event.requestId).shift();
            if (!extraInfo) {
                // Wait until we get the corresponding ExtraInfo event.
                let resolver = null;
                const promise = new Promise((resolve) => (resolver = resolve));
                this._requestIdToQueuedEvents.set(event.requestId, {
                    responseReceived: event,
                    promise,
                    resolver,
                });
                return;
            }
        }
        this._emitResponseEvent(event, extraInfo);
    }
    responseWaitingForExtraInfoPromise(requestId) {
        const responseReceived = this._requestIdToQueuedEvents.get(requestId);
        if (!responseReceived)
            return Promise.resolve();
        return responseReceived.promise;
    }
    _onResponseReceivedExtraInfo(event) {
        // We may have skipped a redirect response/request pair due to waiting for
        // this ExtraInfo event. If so, continue that work now that we have the
        // request.
        const redirectInfo = this._requestIdToQueuedRedirectInfo(event.requestId).shift();
        if (redirectInfo) {
            this._requestIdToResponseExtraInfo(event.requestId).push(event);
            this._onRequest(redirectInfo.event, redirectInfo.interceptionId);
            return;
        }
        // We may have skipped response and loading events because we didn't have
        // this ExtraInfo event yet. If so, emit those events now.
        const queuedEvents = this._requestIdToQueuedEvents.get(event.requestId);
        if (queuedEvents) {
            this._emitResponseEvent(queuedEvents.responseReceived, event);
            if (queuedEvents.loadingFinished) {
                this._emitLoadingFinished(queuedEvents.loadingFinished);
            }
            if (queuedEvents.loadingFailed) {
                this._emitLoadingFailed(queuedEvents.loadingFailed);
            }
            queuedEvents.resolver();
            return;
        }
        // Wait until we get another event that can use this ExtraInfo event.
        this._requestIdToResponseExtraInfo(event.requestId).push(event);
    }
    _forgetRequest(request, events) {
        const requestId = request._requestId;
        const interceptionId = request._interceptionId;
        this._requestIdToRequest.delete(requestId);
        this._attemptedAuthentications.delete(interceptionId);
        if (events) {
            this._requestIdToRequestWillBeSentEvent.delete(requestId);
            this._requestIdToRequestPausedEvent.delete(requestId);
            this._requestIdToQueuedEvents.delete(requestId);
            this._requestIdToQueuedRedirectInfoMap.delete(requestId);
            this._requestIdToResponseReceivedExtraInfo.delete(requestId);
        }
    }
    _onLoadingFinished(event) {
        // If the response event for this request is still waiting on a
        // corresponding ExtraInfo event, then wait to emit this event too.
        const queuedEvents = this._requestIdToQueuedEvents.get(event.requestId);
        if (queuedEvents) {
            queuedEvents.loadingFinished = event;
        }
        else {
            this._emitLoadingFinished(event);
        }
    }
    _emitLoadingFinished(event) {
        const request = this._requestIdToRequest.get(event.requestId);
        // For certain requestIds we never receive requestWillBeSent event.
        // @see https://crbug.com/750469
        if (!request)
            return;
        // Under certain conditions we never get the Network.responseReceived
        // event from protocol. @see https://crbug.com/883475
        if (request.response())
            request.response()._resolveBody(null);
        this._forgetRequest(request, true);
        this.emit(exports.NetworkManagerEmittedEvents.RequestFinished, request);
    }
    _onLoadingFailed(event) {
        // If the response event for this request is still waiting on a
        // corresponding ExtraInfo event, then wait to emit this event too.
        const queuedEvents = this._requestIdToQueuedEvents.get(event.requestId);
        if (queuedEvents) {
            queuedEvents.loadingFailed = event;
        }
        else {
            this._emitLoadingFailed(event);
        }
    }
    _emitLoadingFailed(event) {
        const request = this._requestIdToRequest.get(event.requestId);
        // For certain requestIds we never receive requestWillBeSent event.
        // @see https://crbug.com/750469
        if (!request)
            return;
        request._failureText = event.errorText;
        const response = request.response();
        if (response)
            response._resolveBody(null);
        this._forgetRequest(request, true);
        this.emit(exports.NetworkManagerEmittedEvents.RequestFailed, request);
    }
}
exports.NetworkManager = NetworkManager;
//# sourceMappingURL=NetworkManager.js.map
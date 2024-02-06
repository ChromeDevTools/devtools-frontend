"use strict";
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidiNetworkManager = void 0;
const EventEmitter_js_1 = require("../common/EventEmitter.js");
const NetworkManagerEvents_js_1 = require("../common/NetworkManagerEvents.js");
const disposable_js_1 = require("../util/disposable.js");
const HTTPRequest_js_1 = require("./HTTPRequest.js");
const HTTPResponse_js_1 = require("./HTTPResponse.js");
/**
 * @internal
 */
class BidiNetworkManager extends EventEmitter_js_1.EventEmitter {
    #connection;
    #page;
    #subscriptions = new disposable_js_1.DisposableStack();
    #requestMap = new Map();
    #navigationMap = new Map();
    constructor(connection, page) {
        super();
        this.#connection = connection;
        this.#page = page;
        // TODO: Subscribe to the Frame individually
        this.#subscriptions.use(new EventEmitter_js_1.EventSubscription(this.#connection, 'network.beforeRequestSent', this.#onBeforeRequestSent.bind(this)));
        this.#subscriptions.use(new EventEmitter_js_1.EventSubscription(this.#connection, 'network.responseStarted', this.#onResponseStarted.bind(this)));
        this.#subscriptions.use(new EventEmitter_js_1.EventSubscription(this.#connection, 'network.responseCompleted', this.#onResponseCompleted.bind(this)));
        this.#subscriptions.use(new EventEmitter_js_1.EventSubscription(this.#connection, 'network.fetchError', this.#onFetchError.bind(this)));
    }
    #onBeforeRequestSent(event) {
        const frame = this.#page.frame(event.context ?? '');
        if (!frame) {
            return;
        }
        const request = this.#requestMap.get(event.request.request);
        let upsertRequest;
        if (request) {
            request._redirectChain.push(request);
            upsertRequest = new HTTPRequest_js_1.BidiHTTPRequest(event, frame, request._redirectChain);
        }
        else {
            upsertRequest = new HTTPRequest_js_1.BidiHTTPRequest(event, frame, []);
        }
        this.#requestMap.set(event.request.request, upsertRequest);
        this.emit(NetworkManagerEvents_js_1.NetworkManagerEvent.Request, upsertRequest);
    }
    #onResponseStarted(_event) { }
    #onResponseCompleted(event) {
        const request = this.#requestMap.get(event.request.request);
        if (!request) {
            return;
        }
        const response = new HTTPResponse_js_1.BidiHTTPResponse(request, event);
        request._response = response;
        if (event.navigation) {
            this.#navigationMap.set(event.navigation, response);
        }
        if (response.fromCache()) {
            this.emit(NetworkManagerEvents_js_1.NetworkManagerEvent.RequestServedFromCache, request);
        }
        this.emit(NetworkManagerEvents_js_1.NetworkManagerEvent.Response, response);
        this.emit(NetworkManagerEvents_js_1.NetworkManagerEvent.RequestFinished, request);
    }
    #onFetchError(event) {
        const request = this.#requestMap.get(event.request.request);
        if (!request) {
            return;
        }
        request._failureText = event.errorText;
        this.emit(NetworkManagerEvents_js_1.NetworkManagerEvent.RequestFailed, request);
        this.#requestMap.delete(event.request.request);
    }
    getNavigationResponse(navigationId) {
        if (!navigationId) {
            return null;
        }
        const response = this.#navigationMap.get(navigationId);
        return response ?? null;
    }
    inFlightRequestsCount() {
        let inFlightRequestCounter = 0;
        for (const request of this.#requestMap.values()) {
            if (!request.response() || request._failureText) {
                inFlightRequestCounter++;
            }
        }
        return inFlightRequestCounter;
    }
    clearMapAfterFrameDispose(frame) {
        for (const [id, request] of this.#requestMap.entries()) {
            if (request.frame() === frame) {
                this.#requestMap.delete(id);
            }
        }
        for (const [id, response] of this.#navigationMap.entries()) {
            if (response.frame() === frame) {
                this.#navigationMap.delete(id);
            }
        }
    }
    dispose() {
        this.removeAllListeners();
        this.#requestMap.clear();
        this.#navigationMap.clear();
        this.#subscriptions.dispose();
    }
}
exports.BidiNetworkManager = BidiNetworkManager;
//# sourceMappingURL=NetworkManager.js.map
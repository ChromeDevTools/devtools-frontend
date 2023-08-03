"use strict";
/**
 * Copyright 2023 Google Inc. All rights reserved.
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
exports.NetworkManager = void 0;
const EventEmitter_js_1 = require("../EventEmitter.js");
const NetworkManager_js_1 = require("../NetworkManager.js");
const HTTPRequest_js_1 = require("./HTTPRequest.js");
const HTTPResponse_js_1 = require("./HTTPResponse.js");
/**
 * @internal
 */
class NetworkManager extends EventEmitter_js_1.EventEmitter {
    #connection;
    #page;
    #subscribedEvents = new Map([
        ['network.beforeRequestSent', this.#onBeforeRequestSent.bind(this)],
        ['network.responseStarted', this.#onResponseStarted.bind(this)],
        ['network.responseCompleted', this.#onResponseCompleted.bind(this)],
        ['network.fetchError', this.#onFetchError.bind(this)],
    ]);
    #requestMap = new Map();
    #navigationMap = new Map();
    constructor(connection, page) {
        super();
        this.#connection = connection;
        this.#page = page;
        // TODO: Subscribe to the Frame indivutally
        for (const [event, subscriber] of this.#subscribedEvents) {
            this.#connection.on(event, subscriber);
        }
    }
    #onBeforeRequestSent(event) {
        const frame = this.#page.frame(event.context ?? '');
        if (!frame) {
            return;
        }
        const request = this.#requestMap.get(event.request.request);
        let upsertRequest;
        if (request) {
            const requestChain = request._redirectChain;
            upsertRequest = new HTTPRequest_js_1.HTTPRequest(event, frame, requestChain);
        }
        else {
            upsertRequest = new HTTPRequest_js_1.HTTPRequest(event, frame, []);
        }
        this.#requestMap.set(event.request.request, upsertRequest);
        this.emit(NetworkManager_js_1.NetworkManagerEmittedEvents.Request, upsertRequest);
    }
    #onResponseStarted(_event) { }
    #onResponseCompleted(event) {
        const request = this.#requestMap.get(event.request.request);
        if (!request) {
            return;
        }
        const response = new HTTPResponse_js_1.HTTPResponse(request, event);
        request._response = response;
        if (event.navigation) {
            this.#navigationMap.set(event.navigation, response);
        }
        if (response.fromCache()) {
            this.emit(NetworkManager_js_1.NetworkManagerEmittedEvents.RequestServedFromCache, request);
        }
        this.emit(NetworkManager_js_1.NetworkManagerEmittedEvents.Response, response);
        this.emit(NetworkManager_js_1.NetworkManagerEmittedEvents.RequestFinished, request);
        this.#requestMap.delete(event.request.request);
    }
    #onFetchError(event) {
        const request = this.#requestMap.get(event.request.request);
        if (!request) {
            return;
        }
        request._failureText = event.errorText;
        this.emit(NetworkManager_js_1.NetworkManagerEmittedEvents.RequestFailed, request);
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
                this.#requestMap.delete(id);
            }
        }
    }
    dispose() {
        this.removeAllListeners();
        this.#requestMap.clear();
        this.#navigationMap.clear();
        for (const [event, subscriber] of this.#subscribedEvents) {
            this.#connection.off(event, subscriber);
        }
    }
}
exports.NetworkManager = NetworkManager;
//# sourceMappingURL=NetworkManager.js.map
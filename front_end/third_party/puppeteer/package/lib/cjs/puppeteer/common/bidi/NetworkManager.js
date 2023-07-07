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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _NetworkManager_instances, _NetworkManager_connection, _NetworkManager_page, _NetworkManager_subscribedEvents, _NetworkManager_requestMap, _NetworkManager_navigationMap, _NetworkManager_onBeforeRequestSent, _NetworkManager_onResponseStarted, _NetworkManager_onResponseCompleted, _NetworkManager_onFetchError;
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
    constructor(connection, page) {
        super();
        _NetworkManager_instances.add(this);
        _NetworkManager_connection.set(this, void 0);
        _NetworkManager_page.set(this, void 0);
        _NetworkManager_subscribedEvents.set(this, new Map([
            ['network.beforeRequestSent', __classPrivateFieldGet(this, _NetworkManager_instances, "m", _NetworkManager_onBeforeRequestSent).bind(this)],
            ['network.responseStarted', __classPrivateFieldGet(this, _NetworkManager_instances, "m", _NetworkManager_onResponseStarted).bind(this)],
            ['network.responseCompleted', __classPrivateFieldGet(this, _NetworkManager_instances, "m", _NetworkManager_onResponseCompleted).bind(this)],
            ['network.fetchError', __classPrivateFieldGet(this, _NetworkManager_instances, "m", _NetworkManager_onFetchError).bind(this)],
        ]));
        _NetworkManager_requestMap.set(this, new Map());
        _NetworkManager_navigationMap.set(this, new Map());
        __classPrivateFieldSet(this, _NetworkManager_connection, connection, "f");
        __classPrivateFieldSet(this, _NetworkManager_page, page, "f");
        // TODO: Subscribe to the Frame indivutally
        for (const [event, subscriber] of __classPrivateFieldGet(this, _NetworkManager_subscribedEvents, "f")) {
            __classPrivateFieldGet(this, _NetworkManager_connection, "f").on(event, subscriber);
        }
    }
    getNavigationResponse(navigationId) {
        if (!navigationId) {
            return null;
        }
        const response = __classPrivateFieldGet(this, _NetworkManager_navigationMap, "f").get(navigationId);
        return response ?? null;
    }
    inFlightRequestsCount() {
        let inFlightRequestCounter = 0;
        for (const request of __classPrivateFieldGet(this, _NetworkManager_requestMap, "f").values()) {
            if (!request.response() || request._failureText) {
                inFlightRequestCounter++;
            }
        }
        return inFlightRequestCounter;
    }
    clearMapAfterFrameDispose(frame) {
        for (const [id, request] of __classPrivateFieldGet(this, _NetworkManager_requestMap, "f").entries()) {
            if (request.frame() === frame) {
                __classPrivateFieldGet(this, _NetworkManager_requestMap, "f").delete(id);
            }
        }
        for (const [id, response] of __classPrivateFieldGet(this, _NetworkManager_navigationMap, "f").entries()) {
            if (response.frame() === frame) {
                __classPrivateFieldGet(this, _NetworkManager_requestMap, "f").delete(id);
            }
        }
    }
    dispose() {
        this.removeAllListeners();
        __classPrivateFieldGet(this, _NetworkManager_requestMap, "f").clear();
        __classPrivateFieldGet(this, _NetworkManager_navigationMap, "f").clear();
        for (const [event, subscriber] of __classPrivateFieldGet(this, _NetworkManager_subscribedEvents, "f")) {
            __classPrivateFieldGet(this, _NetworkManager_connection, "f").off(event, subscriber);
        }
    }
}
exports.NetworkManager = NetworkManager;
_NetworkManager_connection = new WeakMap(), _NetworkManager_page = new WeakMap(), _NetworkManager_subscribedEvents = new WeakMap(), _NetworkManager_requestMap = new WeakMap(), _NetworkManager_navigationMap = new WeakMap(), _NetworkManager_instances = new WeakSet(), _NetworkManager_onBeforeRequestSent = function _NetworkManager_onBeforeRequestSent(event) {
    const frame = __classPrivateFieldGet(this, _NetworkManager_page, "f").frame(event.context ?? '');
    if (!frame) {
        return;
    }
    const request = __classPrivateFieldGet(this, _NetworkManager_requestMap, "f").get(event.request.request);
    let upsertRequest;
    if (request) {
        const requestChain = request._redirectChain;
        upsertRequest = new HTTPRequest_js_1.HTTPRequest(event, frame, requestChain);
    }
    else {
        upsertRequest = new HTTPRequest_js_1.HTTPRequest(event, frame, []);
    }
    __classPrivateFieldGet(this, _NetworkManager_requestMap, "f").set(event.request.request, upsertRequest);
    this.emit(NetworkManager_js_1.NetworkManagerEmittedEvents.Request, upsertRequest);
}, _NetworkManager_onResponseStarted = function _NetworkManager_onResponseStarted(_event) { }, _NetworkManager_onResponseCompleted = function _NetworkManager_onResponseCompleted(event) {
    const request = __classPrivateFieldGet(this, _NetworkManager_requestMap, "f").get(event.request.request);
    if (!request) {
        return;
    }
    const response = new HTTPResponse_js_1.HTTPResponse(request, event);
    request._response = response;
    if (event.navigation) {
        __classPrivateFieldGet(this, _NetworkManager_navigationMap, "f").set(event.navigation, response);
    }
    if (response.fromCache()) {
        this.emit(NetworkManager_js_1.NetworkManagerEmittedEvents.RequestServedFromCache, request);
    }
    this.emit(NetworkManager_js_1.NetworkManagerEmittedEvents.Response, response);
    this.emit(NetworkManager_js_1.NetworkManagerEmittedEvents.RequestFinished, request);
    __classPrivateFieldGet(this, _NetworkManager_requestMap, "f").delete(event.request.request);
}, _NetworkManager_onFetchError = function _NetworkManager_onFetchError(event) {
    const request = __classPrivateFieldGet(this, _NetworkManager_requestMap, "f").get(event.request.request);
    if (!request) {
        return;
    }
    request._failureText = event.errorText;
    this.emit(NetworkManager_js_1.NetworkManagerEmittedEvents.RequestFailed, request);
    __classPrivateFieldGet(this, _NetworkManager_requestMap, "f").delete(event.request.request);
};
//# sourceMappingURL=NetworkManager.js.map
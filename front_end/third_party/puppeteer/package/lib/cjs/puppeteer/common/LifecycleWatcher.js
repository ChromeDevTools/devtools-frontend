"use strict";
/**
 * Copyright 2019 Google Inc. All rights reserved.
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
exports.LifecycleWatcher = void 0;
const assert_js_1 = require("../util/assert.js");
const Deferred_js_1 = require("../util/Deferred.js");
const Frame_js_1 = require("./Frame.js");
const NetworkManager_js_1 = require("./NetworkManager.js");
const util_js_1 = require("./util.js");
const puppeteerToProtocolLifecycle = new Map([
    ['load', 'load'],
    ['domcontentloaded', 'DOMContentLoaded'],
    ['networkidle0', 'networkIdle'],
    ['networkidle2', 'networkAlmostIdle'],
]);
/**
 * @internal
 */
class LifecycleWatcher {
    #expectedLifecycle;
    #frame;
    #timeout;
    #navigationRequest = null;
    #eventListeners;
    #initialLoaderId;
    #terminationDeferred;
    #sameDocumentNavigationDeferred = Deferred_js_1.Deferred.create();
    #lifecycleDeferred = Deferred_js_1.Deferred.create();
    #newDocumentNavigationDeferred = Deferred_js_1.Deferred.create();
    #hasSameDocumentNavigation;
    #swapped;
    #navigationResponseReceived;
    constructor(networkManager, frame, waitUntil, timeout) {
        if (Array.isArray(waitUntil)) {
            waitUntil = waitUntil.slice();
        }
        else if (typeof waitUntil === 'string') {
            waitUntil = [waitUntil];
        }
        this.#initialLoaderId = frame._loaderId;
        this.#expectedLifecycle = waitUntil.map(value => {
            const protocolEvent = puppeteerToProtocolLifecycle.get(value);
            (0, assert_js_1.assert)(protocolEvent, 'Unknown value for options.waitUntil: ' + value);
            return protocolEvent;
        });
        this.#frame = frame;
        this.#timeout = timeout;
        this.#eventListeners = [
            (0, util_js_1.addEventListener)(frame, Frame_js_1.FrameEmittedEvents.LifecycleEvent, this.#checkLifecycleComplete.bind(this)),
            (0, util_js_1.addEventListener)(frame, Frame_js_1.FrameEmittedEvents.FrameNavigatedWithinDocument, this.#navigatedWithinDocument.bind(this)),
            (0, util_js_1.addEventListener)(frame, Frame_js_1.FrameEmittedEvents.FrameNavigated, this.#navigated.bind(this)),
            (0, util_js_1.addEventListener)(frame, Frame_js_1.FrameEmittedEvents.FrameSwapped, this.#frameSwapped.bind(this)),
            (0, util_js_1.addEventListener)(frame, Frame_js_1.FrameEmittedEvents.FrameSwappedByActivation, this.#frameSwapped.bind(this)),
            (0, util_js_1.addEventListener)(frame, Frame_js_1.FrameEmittedEvents.FrameDetached, this.#onFrameDetached.bind(this)),
            (0, util_js_1.addEventListener)(networkManager, NetworkManager_js_1.NetworkManagerEmittedEvents.Request, this.#onRequest.bind(this)),
            (0, util_js_1.addEventListener)(networkManager, NetworkManager_js_1.NetworkManagerEmittedEvents.Response, this.#onResponse.bind(this)),
            (0, util_js_1.addEventListener)(networkManager, NetworkManager_js_1.NetworkManagerEmittedEvents.RequestFailed, this.#onRequestFailed.bind(this)),
        ];
        this.#terminationDeferred = Deferred_js_1.Deferred.create({
            timeout: this.#timeout,
            message: `Navigation timeout of ${this.#timeout} ms exceeded`,
        });
        this.#checkLifecycleComplete();
    }
    #onRequest(request) {
        if (request.frame() !== this.#frame || !request.isNavigationRequest()) {
            return;
        }
        this.#navigationRequest = request;
        // Resolve previous navigation response in case there are multiple
        // navigation requests reported by the backend. This generally should not
        // happen by it looks like it's possible.
        this.#navigationResponseReceived?.resolve();
        this.#navigationResponseReceived = Deferred_js_1.Deferred.create();
        if (request.response() !== null) {
            this.#navigationResponseReceived?.resolve();
        }
    }
    #onRequestFailed(request) {
        if (this.#navigationRequest?._requestId !== request._requestId) {
            return;
        }
        this.#navigationResponseReceived?.resolve();
    }
    #onResponse(response) {
        if (this.#navigationRequest?._requestId !== response.request()._requestId) {
            return;
        }
        this.#navigationResponseReceived?.resolve();
    }
    #onFrameDetached(frame) {
        if (this.#frame === frame) {
            this.#terminationDeferred.resolve(new Error('Navigating frame was detached'));
            return;
        }
        this.#checkLifecycleComplete();
    }
    async navigationResponse() {
        // Continue with a possibly null response.
        await this.#navigationResponseReceived?.valueOrThrow();
        return this.#navigationRequest ? this.#navigationRequest.response() : null;
    }
    sameDocumentNavigationPromise() {
        return this.#sameDocumentNavigationDeferred.valueOrThrow();
    }
    newDocumentNavigationPromise() {
        return this.#newDocumentNavigationDeferred.valueOrThrow();
    }
    lifecyclePromise() {
        return this.#lifecycleDeferred.valueOrThrow();
    }
    terminationPromise() {
        return this.#terminationDeferred.valueOrThrow();
    }
    #navigatedWithinDocument() {
        this.#hasSameDocumentNavigation = true;
        this.#checkLifecycleComplete();
    }
    #navigated() {
        this.#checkLifecycleComplete();
    }
    #frameSwapped() {
        this.#swapped = true;
        this.#checkLifecycleComplete();
    }
    #checkLifecycleComplete() {
        // We expect navigation to commit.
        if (!checkLifecycle(this.#frame, this.#expectedLifecycle)) {
            return;
        }
        this.#lifecycleDeferred.resolve();
        if (this.#hasSameDocumentNavigation) {
            this.#sameDocumentNavigationDeferred.resolve(undefined);
        }
        if (this.#swapped || this.#frame._loaderId !== this.#initialLoaderId) {
            this.#newDocumentNavigationDeferred.resolve(undefined);
        }
        function checkLifecycle(frame, expectedLifecycle) {
            for (const event of expectedLifecycle) {
                if (!frame._lifecycleEvents.has(event)) {
                    return false;
                }
            }
            for (const child of frame.childFrames()) {
                if (child._hasStartedLoading &&
                    !checkLifecycle(child, expectedLifecycle)) {
                    return false;
                }
            }
            return true;
        }
    }
    dispose() {
        (0, util_js_1.removeEventListeners)(this.#eventListeners);
        this.#terminationDeferred.resolve(new Error('LifecycleWatcher disposed'));
    }
}
exports.LifecycleWatcher = LifecycleWatcher;
//# sourceMappingURL=LifecycleWatcher.js.map
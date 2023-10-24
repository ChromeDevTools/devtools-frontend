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
import { FrameEvent } from '../api/Frame.js';
import { EventSubscription } from '../common/EventEmitter.js';
import { NetworkManagerEvent } from '../common/NetworkManagerEvents.js';
import { assert } from '../util/assert.js';
import { Deferred } from '../util/Deferred.js';
import { DisposableStack } from '../util/disposable.js';
import { FrameManagerEvent } from './FrameManagerEvents.js';
const puppeteerToProtocolLifecycle = new Map([
    ['load', 'load'],
    ['domcontentloaded', 'DOMContentLoaded'],
    ['networkidle0', 'networkIdle'],
    ['networkidle2', 'networkAlmostIdle'],
]);
/**
 * @internal
 */
export class LifecycleWatcher {
    #expectedLifecycle;
    #frame;
    #timeout;
    #navigationRequest = null;
    #subscriptions = new DisposableStack();
    #initialLoaderId;
    #terminationDeferred;
    #sameDocumentNavigationDeferred = Deferred.create();
    #lifecycleDeferred = Deferred.create();
    #newDocumentNavigationDeferred = Deferred.create();
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
            assert(protocolEvent, 'Unknown value for options.waitUntil: ' + value);
            return protocolEvent;
        });
        this.#frame = frame;
        this.#timeout = timeout;
        this.#subscriptions.use(
        // Revert if TODO #1 is done
        new EventSubscription(frame._frameManager, FrameManagerEvent.LifecycleEvent, this.#checkLifecycleComplete.bind(this)));
        this.#subscriptions.use(new EventSubscription(frame, FrameEvent.FrameNavigatedWithinDocument, this.#navigatedWithinDocument.bind(this)));
        this.#subscriptions.use(new EventSubscription(frame, FrameEvent.FrameNavigated, this.#navigated.bind(this)));
        this.#subscriptions.use(new EventSubscription(frame, FrameEvent.FrameSwapped, this.#frameSwapped.bind(this)));
        this.#subscriptions.use(new EventSubscription(frame, FrameEvent.FrameSwappedByActivation, this.#frameSwapped.bind(this)));
        this.#subscriptions.use(new EventSubscription(frame, FrameEvent.FrameDetached, this.#onFrameDetached.bind(this)));
        this.#subscriptions.use(new EventSubscription(networkManager, NetworkManagerEvent.Request, this.#onRequest.bind(this)));
        this.#subscriptions.use(new EventSubscription(networkManager, NetworkManagerEvent.Response, this.#onResponse.bind(this)));
        this.#subscriptions.use(new EventSubscription(networkManager, NetworkManagerEvent.RequestFailed, this.#onRequestFailed.bind(this)));
        this.#terminationDeferred = Deferred.create({
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
        this.#navigationResponseReceived = Deferred.create();
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
    #navigated(navigationType) {
        if (navigationType === 'BackForwardCacheRestore') {
            return this.#frameSwapped();
        }
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
            // TODO(#1): Its possible we don't need this check
            // CDP provided the correct order for Loading Events
            // And NetworkIdle is a global state
            // Consider removing
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
        this.#subscriptions.dispose();
        this.#terminationDeferred.resolve(new Error('LifecycleWatcher disposed'));
    }
}
//# sourceMappingURL=LifecycleWatcher.js.map
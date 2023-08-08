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
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkManager = void 0;
const DefaultMap_js_1 = require("../../../utils/DefaultMap.js");
const networkRequest_js_1 = require("./networkRequest.js");
class NetworkManager {
    #eventManager;
    /**
     * Map of request ID to NetworkRequest objects. Needed as long as information
     * about requests comes from different events.
     */
    #requestMap;
    constructor(eventManager) {
        this.#eventManager = eventManager;
        this.#requestMap = new DefaultMap_js_1.DefaultMap((requestId) => new networkRequest_js_1.NetworkRequest(requestId, this.#eventManager));
    }
    static create(cdpClient, eventManager) {
        const networkProcessor = new NetworkManager(eventManager);
        cdpClient
            .browserClient()
            .on('Target.detachedFromTarget', (params) => {
            if (cdpClient.sessionId === params.sessionId) {
                networkProcessor.dispose();
            }
        });
        cdpClient.on('Network.requestWillBeSent', (params) => {
            networkProcessor
                .#getOrCreateNetworkRequest(params.requestId)
                .onRequestWillBeSentEvent(params);
        });
        cdpClient.on('Network.requestWillBeSentExtraInfo', (params) => {
            networkProcessor
                .#getOrCreateNetworkRequest(params.requestId)
                .onRequestWillBeSentExtraInfoEvent(params);
        });
        cdpClient.on('Network.responseReceived', (params) => {
            networkProcessor
                .#getOrCreateNetworkRequest(params.requestId)
                .onResponseReceivedEvent(params);
        });
        cdpClient.on('Network.responseReceivedExtraInfo', (params) => {
            networkProcessor
                .#getOrCreateNetworkRequest(params.requestId)
                .onResponseReceivedEventExtraInfo(params);
        });
        cdpClient.on('Network.requestServedFromCache', (params) => {
            networkProcessor
                .#getOrCreateNetworkRequest(params.requestId)
                .onServedFromCache();
        });
        cdpClient.on('Network.loadingFailed', (params) => {
            networkProcessor
                .#getOrCreateNetworkRequest(params.requestId)
                .onLoadingFailedEvent(params);
            networkProcessor.#forgetRequest(params.requestId);
        });
        cdpClient.on('Network.loadingFinished', (params) => {
            networkProcessor.#forgetRequest(params.requestId);
        });
        return networkProcessor;
    }
    dispose() {
        for (const request of this.#requestMap.values()) {
            request.dispose();
        }
        this.#requestMap.clear();
    }
    #getOrCreateNetworkRequest(requestId) {
        return this.#requestMap.get(requestId);
    }
    #forgetRequest(requestId) {
        const request = this.#requestMap.get(requestId);
        if (request) {
            request.dispose();
            this.#requestMap.delete(requestId);
        }
    }
}
exports.NetworkManager = NetworkManager;
//# sourceMappingURL=NetworkManager.js.map
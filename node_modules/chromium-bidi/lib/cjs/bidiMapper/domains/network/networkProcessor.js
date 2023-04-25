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
exports.NetworkProcessor = void 0;
const DefaultMap_1 = require("../../../utils/DefaultMap");
const networkRequest_1 = require("./networkRequest");
class NetworkProcessor {
    #eventManager;
    /**
     * Map of request ID to NetworkRequest objects. Needed as long as information
     * about requests comes from different events.
     */
    #requestMap;
    constructor(eventManager) {
        this.#eventManager = eventManager;
        this.#requestMap = new DefaultMap_1.DefaultMap((requestId) => new networkRequest_1.NetworkRequest(requestId, this.#eventManager));
    }
    static async create(cdpClient, eventManager) {
        const networkProcessor = new NetworkProcessor(eventManager);
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
        cdpClient.on('Network.loadingFailed', (params) => {
            networkProcessor
                .#getOrCreateNetworkRequest(params.requestId)
                .onLoadingFailedEvent(params);
        });
        await cdpClient.sendCommand('Network.enable');
        return networkProcessor;
    }
    #getOrCreateNetworkRequest(requestId) {
        return this.#requestMap.get(requestId);
    }
}
exports.NetworkProcessor = NetworkProcessor;
//# sourceMappingURL=networkProcessor.js.map
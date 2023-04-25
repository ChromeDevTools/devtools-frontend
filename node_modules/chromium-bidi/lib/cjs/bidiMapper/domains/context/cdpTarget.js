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
exports.CdpTarget = void 0;
const logManager_1 = require("../log/logManager");
const protocol_1 = require("../../../protocol/protocol");
const deferred_1 = require("../../../utils/deferred");
const networkProcessor_1 = require("../network/networkProcessor");
class CdpTarget {
    #targetUnblocked;
    #targetId;
    #cdpClient;
    #eventManager;
    #cdpSessionId;
    #networkDomainActivated;
    static create(targetId, cdpClient, cdpSessionId, realmStorage, eventManager) {
        const cdpTarget = new CdpTarget(targetId, cdpClient, cdpSessionId, eventManager);
        logManager_1.LogManager.create(cdpTarget, realmStorage, eventManager);
        cdpTarget.#setEventListeners();
        // No need in waiting. Deferred will be resolved when the target is unblocked.
        void cdpTarget.#unblock();
        return cdpTarget;
    }
    constructor(targetId, cdpClient, cdpSessionId, eventManager) {
        this.#targetId = targetId;
        this.#cdpClient = cdpClient;
        this.#cdpSessionId = cdpSessionId;
        this.#eventManager = eventManager;
        this.#networkDomainActivated = false;
        this.#targetUnblocked = new deferred_1.Deferred();
    }
    /**
     * Returns a promise that resolves when the target is unblocked.
     */
    get targetUnblocked() {
        return this.#targetUnblocked;
    }
    get targetId() {
        return this.#targetId;
    }
    get cdpClient() {
        return this.#cdpClient;
    }
    /**
     * Needed for CDP escape path.
     */
    get cdpSessionId() {
        return this.#cdpSessionId;
    }
    /**
     * Enables all the required CDP domains and unblocks the target.
     */
    async #unblock() {
        // Enable Network domain, if it is enabled globally.
        // TODO: enable Network domain for OOPiF targets.
        if (this.#eventManager.isNetworkDomainEnabled) {
            await this.enableNetworkDomain();
        }
        await this.#cdpClient.sendCommand('Runtime.enable');
        await this.#cdpClient.sendCommand('Page.enable');
        await this.#cdpClient.sendCommand('Page.setLifecycleEventsEnabled', {
            enabled: true,
        });
        await this.#cdpClient.sendCommand('Target.setAutoAttach', {
            autoAttach: true,
            waitForDebuggerOnStart: true,
            flatten: true,
        });
        await this.#cdpClient.sendCommand('Runtime.runIfWaitingForDebugger');
        this.#targetUnblocked.resolve();
    }
    /**
     * Enables the Network domain (creates NetworkProcessor on the target's cdp
     * client) if it is not enabled yet.
     */
    async enableNetworkDomain() {
        if (!this.#networkDomainActivated) {
            this.#networkDomainActivated = true;
            await networkProcessor_1.NetworkProcessor.create(this.cdpClient, this.#eventManager);
        }
    }
    #setEventListeners() {
        this.#cdpClient.on('*', (method, params) => {
            this.#eventManager.registerEvent({
                method: protocol_1.CDP.EventNames.EventReceivedEvent,
                params: {
                    cdpMethod: method,
                    cdpParams: params || {},
                    cdpSession: this.#cdpSessionId,
                },
            }, null);
        });
    }
}
exports.CdpTarget = CdpTarget;
//# sourceMappingURL=cdpTarget.js.map
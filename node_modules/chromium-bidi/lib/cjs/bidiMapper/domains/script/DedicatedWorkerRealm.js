"use strict";
/**
 * Copyright 2024 Google LLC.
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
exports.DedicatedWorkerRealm = void 0;
const Realm_js_1 = require("./Realm.js");
class DedicatedWorkerRealm extends Realm_js_1.Realm {
    #ownerRealm;
    constructor(cdpClient, eventManager, executionContextId, logger, origin, ownerRealm, realmId, realmStorage) {
        super(cdpClient, eventManager, executionContextId, logger, origin, realmId, realmStorage);
        this.#ownerRealm = ownerRealm;
        this.initialize();
    }
    get associatedBrowsingContexts() {
        return this.#ownerRealm.associatedBrowsingContexts;
    }
    get realmType() {
        return 'dedicated-worker';
    }
    get source() {
        return {
            realm: this.realmId,
            // This is a hack to make Puppeteer able to track workers.
            // TODO: remove after Puppeteer tracks workers by owners and use the base version.
            context: this.associatedBrowsingContexts[0]?.id,
        };
    }
    get realmInfo() {
        return {
            ...this.baseInfo,
            type: this.realmType,
            owners: [this.#ownerRealm.realmId],
        };
    }
}
exports.DedicatedWorkerRealm = DedicatedWorkerRealm;
//# sourceMappingURL=DedicatedWorkerRealm.js.map
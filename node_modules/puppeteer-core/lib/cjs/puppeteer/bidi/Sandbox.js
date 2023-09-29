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
exports.Sandbox = exports.PUPPETEER_SANDBOX = exports.MAIN_SANDBOX = void 0;
const Realm_js_1 = require("../api/Realm.js");
const util_js_1 = require("../common/util.js");
const ElementHandle_js_1 = require("./ElementHandle.js");
/**
 * A unique key for {@link SandboxChart} to denote the default world.
 * Realms are automatically created in the default sandbox.
 *
 * @internal
 */
exports.MAIN_SANDBOX = Symbol('mainSandbox');
/**
 * A unique key for {@link SandboxChart} to denote the puppeteer sandbox.
 * This world contains all puppeteer-internal bindings/code.
 *
 * @internal
 */
exports.PUPPETEER_SANDBOX = Symbol('puppeteerSandbox');
/**
 * @internal
 */
class Sandbox extends Realm_js_1.Realm {
    name;
    realm;
    #frame;
    constructor(name, frame, 
    // TODO: We should split the Realm and BrowsingContext
    realm, timeoutSettings) {
        super(timeoutSettings);
        this.name = name;
        this.realm = realm;
        this.#frame = frame;
        this.realm.setSandbox(this);
    }
    get environment() {
        return this.#frame;
    }
    async evaluateHandle(pageFunction, ...args) {
        pageFunction = (0, util_js_1.withSourcePuppeteerURLIfNone)(this.evaluateHandle.name, pageFunction);
        return await this.realm.evaluateHandle(pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        pageFunction = (0, util_js_1.withSourcePuppeteerURLIfNone)(this.evaluate.name, pageFunction);
        return await this.realm.evaluate(pageFunction, ...args);
    }
    async adoptHandle(handle) {
        return (await this.evaluateHandle(node => {
            return node;
        }, handle));
    }
    async transferHandle(handle) {
        if (handle.realm === this) {
            return handle;
        }
        const transferredHandle = await this.evaluateHandle(node => {
            return node;
        }, handle);
        await handle.dispose();
        return transferredHandle;
    }
    async adoptBackendNode(backendNodeId) {
        const { object } = await this.environment.client.send('DOM.resolveNode', {
            backendNodeId: backendNodeId,
        });
        return new ElementHandle_js_1.BidiElementHandle(this, {
            handle: object.objectId,
            type: 'node',
        });
    }
}
exports.Sandbox = Sandbox;
//# sourceMappingURL=Sandbox.js.map
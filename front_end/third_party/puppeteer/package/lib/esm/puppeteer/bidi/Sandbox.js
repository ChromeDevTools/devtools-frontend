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
import { Realm } from '../api/Realm.js';
import { withSourcePuppeteerURLIfNone } from '../common/util.js';
import { BidiElementHandle } from './ElementHandle.js';
/**
 * A unique key for {@link SandboxChart} to denote the default world.
 * Realms are automatically created in the default sandbox.
 *
 * @internal
 */
export const MAIN_SANDBOX = Symbol('mainSandbox');
/**
 * A unique key for {@link SandboxChart} to denote the puppeteer sandbox.
 * This world contains all puppeteer-internal bindings/code.
 *
 * @internal
 */
export const PUPPETEER_SANDBOX = Symbol('puppeteerSandbox');
/**
 * @internal
 */
export class Sandbox extends Realm {
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
        pageFunction = withSourcePuppeteerURLIfNone(this.evaluateHandle.name, pageFunction);
        return await this.realm.evaluateHandle(pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        pageFunction = withSourcePuppeteerURLIfNone(this.evaluate.name, pageFunction);
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
        return new BidiElementHandle(this, {
            handle: object.objectId,
            type: 'node',
        });
    }
}
//# sourceMappingURL=Sandbox.js.map
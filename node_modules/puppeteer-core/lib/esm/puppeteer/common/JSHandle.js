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
import { JSHandle } from '../api/JSHandle.js';
import { assert } from '../util/assert.js';
import { createJSHandle, releaseObject, valueFromRemoteObject, withSourcePuppeteerURLIfNone, } from './util.js';
/**
 * @internal
 */
export class CDPJSHandle extends JSHandle {
    #disposed = false;
    #context;
    #remoteObject;
    get disposed() {
        return this.#disposed;
    }
    constructor(context, remoteObject) {
        super();
        this.#context = context;
        this.#remoteObject = remoteObject;
    }
    executionContext() {
        return this.#context;
    }
    get client() {
        return this.#context._client;
    }
    /**
     * @see {@link ExecutionContext.evaluate} for more details.
     */
    async evaluate(pageFunction, ...args) {
        pageFunction = withSourcePuppeteerURLIfNone(this.evaluate.name, pageFunction);
        return await this.executionContext().evaluate(pageFunction, this, ...args);
    }
    /**
     * @see {@link ExecutionContext.evaluateHandle} for more details.
     */
    async evaluateHandle(pageFunction, ...args) {
        pageFunction = withSourcePuppeteerURLIfNone(this.evaluateHandle.name, pageFunction);
        return await this.executionContext().evaluateHandle(pageFunction, this, ...args);
    }
    async getProperty(propertyName) {
        return this.evaluateHandle((object, propertyName) => {
            return object[propertyName];
        }, propertyName);
    }
    async getProperties() {
        assert(this.#remoteObject.objectId);
        // We use Runtime.getProperties rather than iterative building because the
        // iterative approach might create a distorted snapshot.
        const response = await this.client.send('Runtime.getProperties', {
            objectId: this.#remoteObject.objectId,
            ownProperties: true,
        });
        const result = new Map();
        for (const property of response.result) {
            if (!property.enumerable || !property.value) {
                continue;
            }
            result.set(property.name, createJSHandle(this.#context, property.value));
        }
        return result;
    }
    async jsonValue() {
        if (!this.#remoteObject.objectId) {
            return valueFromRemoteObject(this.#remoteObject);
        }
        const value = await this.evaluate(object => {
            return object;
        });
        if (value === undefined) {
            throw new Error('Could not serialize referenced object');
        }
        return value;
    }
    /**
     * Either `null` or the handle itself if the handle is an
     * instance of {@link ElementHandle}.
     */
    asElement() {
        return null;
    }
    async dispose() {
        if (this.#disposed) {
            return;
        }
        this.#disposed = true;
        await releaseObject(this.client, this.#remoteObject);
    }
    toString() {
        if (!this.#remoteObject.objectId) {
            return 'JSHandle:' + valueFromRemoteObject(this.#remoteObject);
        }
        const type = this.#remoteObject.subtype || this.#remoteObject.type;
        return 'JSHandle@' + type;
    }
    get id() {
        return this.#remoteObject.objectId;
    }
    remoteObject() {
        return this.#remoteObject;
    }
}
//# sourceMappingURL=JSHandle.js.map
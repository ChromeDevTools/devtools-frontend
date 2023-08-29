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
import { JSHandle as BaseJSHandle } from '../../api/JSHandle.js';
import { withSourcePuppeteerURLIfNone } from '../util.js';
import { BidiSerializer } from './Serializer.js';
import { releaseReference } from './utils.js';
export class JSHandle extends BaseJSHandle {
    #disposed = false;
    #realm;
    #remoteValue;
    constructor(realm, remoteValue) {
        super();
        this.#realm = realm;
        this.#remoteValue = remoteValue;
    }
    context() {
        return this.#realm;
    }
    get disposed() {
        return this.#disposed;
    }
    async evaluate(pageFunction, ...args) {
        pageFunction = withSourcePuppeteerURLIfNone(this.evaluate.name, pageFunction);
        return await this.context().evaluate(pageFunction, this, ...args);
    }
    async evaluateHandle(pageFunction, ...args) {
        pageFunction = withSourcePuppeteerURLIfNone(this.evaluateHandle.name, pageFunction);
        return this.context().evaluateHandle(pageFunction, this, ...args);
    }
    async getProperty(propertyName) {
        return await this.evaluateHandle((object, propertyName) => {
            return object[propertyName];
        }, propertyName);
    }
    async getProperties() {
        // TODO(lightning00blade): Either include return of depth Handles in RemoteValue
        // or new BiDi command that returns array of remote value
        const keys = await this.evaluate(object => {
            const enumerableKeys = [];
            const descriptors = Object.getOwnPropertyDescriptors(object);
            for (const key in descriptors) {
                if (descriptors[key]?.enumerable) {
                    enumerableKeys.push(key);
                }
            }
            return enumerableKeys;
        });
        const map = new Map();
        const results = await Promise.all(keys.map(key => {
            return this.getProperty(key);
        }));
        for (const [key, value] of Object.entries(keys)) {
            const handle = results[key];
            if (handle) {
                map.set(value, handle);
            }
        }
        return map;
    }
    async jsonValue() {
        return await this.evaluate(value => {
            return value;
        });
    }
    asElement() {
        return null;
    }
    async dispose() {
        if (this.#disposed) {
            return;
        }
        this.#disposed = true;
        if ('handle' in this.#remoteValue) {
            await releaseReference(this.#realm, this.#remoteValue);
        }
    }
    get isPrimitiveValue() {
        switch (this.#remoteValue.type) {
            case 'string':
            case 'number':
            case 'bigint':
            case 'boolean':
            case 'undefined':
            case 'null':
                return true;
            default:
                return false;
        }
    }
    toString() {
        if (this.isPrimitiveValue) {
            return 'JSHandle:' + BidiSerializer.deserialize(this.#remoteValue);
        }
        return 'JSHandle@' + this.#remoteValue.type;
    }
    get id() {
        return 'handle' in this.#remoteValue ? this.#remoteValue.handle : undefined;
    }
    remoteValue() {
        return this.#remoteValue;
    }
    remoteObject() {
        throw new Error('Not available in WebDriver BiDi');
    }
}
//# sourceMappingURL=JSHandle.js.map
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
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _CDPJSHandle_disposed, _CDPJSHandle_context, _CDPJSHandle_remoteObject;
import { JSHandle } from '../api/JSHandle.js';
import { assert } from '../util/assert.js';
import { createJSHandle, releaseObject, valueFromRemoteObject, withSourcePuppeteerURLIfNone, } from './util.js';
/**
 * @internal
 */
export class CDPJSHandle extends JSHandle {
    get disposed() {
        return __classPrivateFieldGet(this, _CDPJSHandle_disposed, "f");
    }
    constructor(context, remoteObject) {
        super();
        _CDPJSHandle_disposed.set(this, false);
        _CDPJSHandle_context.set(this, void 0);
        _CDPJSHandle_remoteObject.set(this, void 0);
        __classPrivateFieldSet(this, _CDPJSHandle_context, context, "f");
        __classPrivateFieldSet(this, _CDPJSHandle_remoteObject, remoteObject, "f");
    }
    executionContext() {
        return __classPrivateFieldGet(this, _CDPJSHandle_context, "f");
    }
    get client() {
        return __classPrivateFieldGet(this, _CDPJSHandle_context, "f")._client;
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
        assert(__classPrivateFieldGet(this, _CDPJSHandle_remoteObject, "f").objectId);
        // We use Runtime.getProperties rather than iterative building because the
        // iterative approach might create a distorted snapshot.
        const response = await this.client.send('Runtime.getProperties', {
            objectId: __classPrivateFieldGet(this, _CDPJSHandle_remoteObject, "f").objectId,
            ownProperties: true,
        });
        const result = new Map();
        for (const property of response.result) {
            if (!property.enumerable || !property.value) {
                continue;
            }
            result.set(property.name, createJSHandle(__classPrivateFieldGet(this, _CDPJSHandle_context, "f"), property.value));
        }
        return result;
    }
    async jsonValue() {
        if (!__classPrivateFieldGet(this, _CDPJSHandle_remoteObject, "f").objectId) {
            return valueFromRemoteObject(__classPrivateFieldGet(this, _CDPJSHandle_remoteObject, "f"));
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
        if (__classPrivateFieldGet(this, _CDPJSHandle_disposed, "f")) {
            return;
        }
        __classPrivateFieldSet(this, _CDPJSHandle_disposed, true, "f");
        await releaseObject(this.client, __classPrivateFieldGet(this, _CDPJSHandle_remoteObject, "f"));
    }
    toString() {
        if (!__classPrivateFieldGet(this, _CDPJSHandle_remoteObject, "f").objectId) {
            return 'JSHandle:' + valueFromRemoteObject(__classPrivateFieldGet(this, _CDPJSHandle_remoteObject, "f"));
        }
        const type = __classPrivateFieldGet(this, _CDPJSHandle_remoteObject, "f").subtype || __classPrivateFieldGet(this, _CDPJSHandle_remoteObject, "f").type;
        return 'JSHandle@' + type;
    }
    get id() {
        return __classPrivateFieldGet(this, _CDPJSHandle_remoteObject, "f").objectId;
    }
    remoteObject() {
        return __classPrivateFieldGet(this, _CDPJSHandle_remoteObject, "f");
    }
}
_CDPJSHandle_disposed = new WeakMap(), _CDPJSHandle_context = new WeakMap(), _CDPJSHandle_remoteObject = new WeakMap();
//# sourceMappingURL=JSHandle.js.map
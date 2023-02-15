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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _JSHandle_disposed, _JSHandle_context, _JSHandle_remoteValue;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSHandle = void 0;
const utils_js_1 = require("./utils.js");
const JSHandle_js_1 = require("../../api/JSHandle.js");
const Serializer_js_1 = require("./Serializer.js");
class JSHandle extends JSHandle_js_1.JSHandle {
    constructor(context, remoteValue) {
        super();
        _JSHandle_disposed.set(this, false);
        _JSHandle_context.set(this, void 0);
        _JSHandle_remoteValue.set(this, void 0);
        __classPrivateFieldSet(this, _JSHandle_context, context, "f");
        __classPrivateFieldSet(this, _JSHandle_remoteValue, remoteValue, "f");
    }
    context() {
        return __classPrivateFieldGet(this, _JSHandle_context, "f");
    }
    get connecton() {
        return __classPrivateFieldGet(this, _JSHandle_context, "f").connection;
    }
    get disposed() {
        return __classPrivateFieldGet(this, _JSHandle_disposed, "f");
    }
    async evaluate(pageFunction, ...args) {
        return await this.context().evaluate(pageFunction, this, ...args);
    }
    async evaluateHandle(pageFunction, ...args) {
        return await this.context().evaluateHandle(pageFunction, this, ...args);
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
            return Object.getOwnPropertyNames(object);
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
        if (!('handle' in __classPrivateFieldGet(this, _JSHandle_remoteValue, "f"))) {
            return Serializer_js_1.BidiSerializer.deserialize(__classPrivateFieldGet(this, _JSHandle_remoteValue, "f"));
        }
        const value = await this.evaluate(object => {
            return object;
        });
        if (value === undefined) {
            throw new Error('Could not serialize referenced object');
        }
        return value;
    }
    asElement() {
        return null;
    }
    async dispose() {
        if (__classPrivateFieldGet(this, _JSHandle_disposed, "f")) {
            return;
        }
        __classPrivateFieldSet(this, _JSHandle_disposed, true, "f");
        if ('handle' in __classPrivateFieldGet(this, _JSHandle_remoteValue, "f")) {
            await (0, utils_js_1.releaseReference)(this.connecton, __classPrivateFieldGet(this, _JSHandle_remoteValue, "f"));
        }
    }
    toString() {
        if (!('handle' in __classPrivateFieldGet(this, _JSHandle_remoteValue, "f"))) {
            return 'JSHandle:' + Serializer_js_1.BidiSerializer.deserialize(__classPrivateFieldGet(this, _JSHandle_remoteValue, "f"));
        }
        return 'JSHandle@' + __classPrivateFieldGet(this, _JSHandle_remoteValue, "f").type;
    }
    get id() {
        return 'handle' in __classPrivateFieldGet(this, _JSHandle_remoteValue, "f") ? __classPrivateFieldGet(this, _JSHandle_remoteValue, "f").handle : undefined;
    }
    bidiObject() {
        return __classPrivateFieldGet(this, _JSHandle_remoteValue, "f");
    }
}
exports.JSHandle = JSHandle;
_JSHandle_disposed = new WeakMap(), _JSHandle_context = new WeakMap(), _JSHandle_remoteValue = new WeakMap();
//# sourceMappingURL=JSHandle.js.map
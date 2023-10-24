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
exports.BidiJSHandle = void 0;
const JSHandle_js_1 = require("../api/JSHandle.js");
const Deserializer_js_1 = require("./Deserializer.js");
const util_js_1 = require("./util.js");
/**
 * @internal
 */
class BidiJSHandle extends JSHandle_js_1.JSHandle {
    #disposed = false;
    #sandbox;
    #remoteValue;
    constructor(sandbox, remoteValue) {
        super();
        this.#sandbox = sandbox;
        this.#remoteValue = remoteValue;
    }
    context() {
        return this.realm.environment.context();
    }
    get realm() {
        return this.#sandbox;
    }
    get disposed() {
        return this.#disposed;
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
            await (0, util_js_1.releaseReference)(this.context(), this.#remoteValue);
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
            return 'JSHandle:' + Deserializer_js_1.BidiDeserializer.deserialize(this.#remoteValue);
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
exports.BidiJSHandle = BidiJSHandle;
//# sourceMappingURL=JSHandle.js.map
"use strict";
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidiJSHandle = void 0;
const JSHandle_js_1 = require("../api/JSHandle.js");
const Errors_js_1 = require("../common/Errors.js");
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
        throw new Errors_js_1.UnsupportedOperation('Not available in WebDriver BiDi');
    }
}
exports.BidiJSHandle = BidiJSHandle;
//# sourceMappingURL=JSHandle.js.map
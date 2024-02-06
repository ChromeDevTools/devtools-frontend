/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { JSHandle } from '../api/JSHandle.js';
import { UnsupportedOperation } from '../common/Errors.js';
import { BidiDeserializer } from './Deserializer.js';
import { releaseReference } from './util.js';
/**
 * @internal
 */
export class BidiJSHandle extends JSHandle {
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
            await releaseReference(this.context(), this.#remoteValue);
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
            return 'JSHandle:' + BidiDeserializer.deserialize(this.#remoteValue);
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
        throw new UnsupportedOperation('Not available in WebDriver BiDi');
    }
}
//# sourceMappingURL=JSHandle.js.map
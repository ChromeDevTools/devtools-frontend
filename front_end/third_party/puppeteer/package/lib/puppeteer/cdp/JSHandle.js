/**
 * @license
 * Copyright 2019 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { JSHandle } from '../api/JSHandle.js';
import { DEBUG_PREFIXES } from '../common/Debug.js';
import { throwIfDisposed } from '../util/decorators.js';
import { valueFromPrimitiveRemoteObject } from './utils.js';
/**
 * @internal
 */
let CdpJSHandle = (() => {
    let _classSuper = JSHandle;
    let _instanceExtraInitializers = [];
    let _getProperties_decorators;
    return class CdpJSHandle extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _getProperties_decorators = [throwIfDisposed()];
            __esDecorate(this, null, _getProperties_decorators, { kind: "method", name: "getProperties", static: false, private: false, access: { has: obj => "getProperties" in obj, get: obj => obj.getProperties }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        #disposed = (__runInitializers(this, _instanceExtraInitializers), false);
        #remoteObject;
        #world;
        #logger;
        constructor(world, remoteObject, logger) {
            super(logger);
            this.#world = world;
            this.#remoteObject = remoteObject;
            this.#logger = logger;
        }
        get disposed() {
            return this.#disposed;
        }
        get realm() {
            return this.#world;
        }
        get client() {
            return this.realm.environment.client;
        }
        async jsonValue() {
            if (!this.#remoteObject.objectId) {
                return valueFromPrimitiveRemoteObject(this.#remoteObject);
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
            await releaseObject(this.client, this.#remoteObject, this.#logger);
        }
        toString() {
            if (!this.#remoteObject.objectId) {
                return 'JSHandle:' + valueFromPrimitiveRemoteObject(this.#remoteObject);
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
        async getProperties() {
            if (!this.#remoteObject.objectId) {
                return await super.getProperties();
            }
            // We use Runtime.getProperties rather than iterative version for
            // improved performance as it allows getting everything at once.
            const response = await this.client.send('Runtime.getProperties', {
                objectId: this.#remoteObject.objectId,
                ownProperties: true,
            });
            const result = new Map();
            for (const property of response.result) {
                if (!property.enumerable || !property.value) {
                    continue;
                }
                result.set(property.name, this.#world.createCdpHandle(property.value));
            }
            return result;
        }
    };
})();
export { CdpJSHandle };
/**
 * @internal
 */
export async function releaseObject(client, remoteObject, logger) {
    if (!remoteObject.objectId) {
        return;
    }
    await client
        .send('Runtime.releaseObject', { objectId: remoteObject.objectId })
        .catch(error => {
        // Exceptions might happen in case of a page been navigated or closed.
        // Swallow these since they are harmless and we don't leak anything in this case.
        logger?.(DEBUG_PREFIXES.error)?.(error);
    });
}
//# sourceMappingURL=JSHandle.js.map
"use strict";
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        function next() {
            while (env.stack.length) {
                var rec = env.stack.pop();
                try {
                    var result = rec.dispose && rec.dispose.call(rec.value);
                    if (rec.async) return Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                }
                catch (e) {
                    fail(e);
                }
            }
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidiElementHandle = void 0;
const ElementHandle_js_1 = require("../api/ElementHandle.js");
const decorators_js_1 = require("../util/decorators.js");
const JSHandle_js_1 = require("./JSHandle.js");
/**
 * @internal
 */
let BidiElementHandle = (() => {
    var _a;
    let _classSuper = ElementHandle_js_1.ElementHandle;
    let _instanceExtraInitializers = [];
    let _autofill_decorators;
    let _contentFrame_decorators;
    return class BidiElementHandle extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _autofill_decorators = [(0, decorators_js_1.throwIfDisposed)()];
            _contentFrame_decorators = [(0, decorators_js_1.throwIfDisposed)(), (_a = ElementHandle_js_1.ElementHandle).bindIsolatedHandle.bind(_a)];
            __esDecorate(this, null, _autofill_decorators, { kind: "method", name: "autofill", static: false, private: false, access: { has: obj => "autofill" in obj, get: obj => obj.autofill }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _contentFrame_decorators, { kind: "method", name: "contentFrame", static: false, private: false, access: { has: obj => "contentFrame" in obj, get: obj => obj.contentFrame }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static from(value, realm) {
            return new BidiElementHandle(value, realm);
        }
        constructor(value, realm) {
            super(JSHandle_js_1.BidiJSHandle.from(value, realm));
            __runInitializers(this, _instanceExtraInitializers);
        }
        get realm() {
            // SAFETY: See the super call in the constructor.
            return this.handle.realm;
        }
        get frame() {
            return this.realm.environment;
        }
        remoteValue() {
            return this.handle.remoteValue();
        }
        async autofill(data) {
            const client = this.frame.client;
            const nodeInfo = await client.send('DOM.describeNode', {
                objectId: this.handle.id,
            });
            const fieldId = nodeInfo.node.backendNodeId;
            const frameId = this.frame._id;
            await client.send('Autofill.trigger', {
                fieldId,
                frameId,
                card: data.creditCard,
            });
        }
        async contentFrame() {
            const env_1 = { stack: [], error: void 0, hasError: false };
            try {
                const handle = __addDisposableResource(env_1, (await this.evaluateHandle(element => {
                    if (element instanceof HTMLIFrameElement ||
                        element instanceof HTMLFrameElement) {
                        return element.contentWindow;
                    }
                    return;
                })), false);
                const value = handle.remoteValue();
                if (value.type === 'window') {
                    return (this.frame
                        .page()
                        .frames()
                        .find(frame => {
                        return frame._id === value.value.context;
                    }) ?? null);
                }
                return null;
            }
            catch (e_1) {
                env_1.error = e_1;
                env_1.hasError = true;
            }
            finally {
                __disposeResources(env_1);
            }
        }
        async uploadFile(...files) {
            // Locate all files and confirm that they exist.
            // eslint-disable-next-line @typescript-eslint/consistent-type-imports
            let path;
            try {
                path = await Promise.resolve().then(() => __importStar(require('path')));
            }
            catch (error) {
                if (error instanceof TypeError) {
                    throw new Error(`JSHandle#uploadFile can only be used in Node-like environments.`);
                }
                throw error;
            }
            files = files.map(file => {
                if (path.win32.isAbsolute(file) || path.posix.isAbsolute(file)) {
                    return file;
                }
                else {
                    return path.resolve(file);
                }
            });
            await this.frame.setFiles(this, files);
        }
    };
})();
exports.BidiElementHandle = BidiElementHandle;
//# sourceMappingURL=ElementHandle.js.map
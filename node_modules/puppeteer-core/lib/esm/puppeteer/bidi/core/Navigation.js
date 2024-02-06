/**
 * @license
 * Copyright 2024 Google Inc.
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
import { EventEmitter } from '../../common/EventEmitter.js';
import { inertIfDisposed } from '../../util/decorators.js';
import { Deferred } from '../../util/Deferred.js';
import { DisposableStack, disposeSymbol } from '../../util/disposable.js';
/**
 * @internal
 */
let Navigation = (() => {
    let _classSuper = EventEmitter;
    let _instanceExtraInitializers = [];
    let _dispose_decorators;
    return class Navigation extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(this, null, _dispose_decorators, { kind: "method", name: "dispose", static: false, private: false, access: { has: obj => "dispose" in obj, get: obj => obj.dispose }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static from(context) {
            const navigation = new Navigation(context);
            navigation.#initialize();
            return navigation;
        }
        // keep-sorted start
        #request = (__runInitializers(this, _instanceExtraInitializers), void 0);
        #browsingContext;
        #disposables = new DisposableStack();
        #id = new Deferred();
        // keep-sorted end
        constructor(context) {
            super();
            // keep-sorted start
            this.#browsingContext = context;
            // keep-sorted end
        }
        #initialize() {
            const browsingContextEmitter = this.#disposables.use(new EventEmitter(this.#browsingContext));
            browsingContextEmitter.once('closed', () => {
                this.emit('failed', {
                    url: this.#browsingContext.url,
                    timestamp: new Date(),
                });
                this.dispose();
            });
            this.#browsingContext.on('request', ({ request }) => {
                if (request.navigation === this.#id.value()) {
                    this.#request = request;
                    this.emit('request', request);
                }
            });
            const sessionEmitter = this.#disposables.use(new EventEmitter(this.#session));
            // To get the navigation ID if any.
            for (const eventName of [
                'browsingContext.domContentLoaded',
                'browsingContext.load',
            ]) {
                sessionEmitter.on(eventName, info => {
                    if (info.context !== this.#browsingContext.id) {
                        return;
                    }
                    if (!info.navigation) {
                        return;
                    }
                    if (!this.#id.resolved()) {
                        this.#id.resolve(info.navigation);
                    }
                });
            }
            for (const [eventName, event] of [
                ['browsingContext.fragmentNavigated', 'fragment'],
                ['browsingContext.navigationFailed', 'failed'],
                ['browsingContext.navigationAborted', 'aborted'],
            ]) {
                sessionEmitter.on(eventName, info => {
                    if (info.context !== this.#browsingContext.id) {
                        return;
                    }
                    if (!info.navigation) {
                        return;
                    }
                    if (!this.#id.resolved()) {
                        this.#id.resolve(info.navigation);
                    }
                    if (this.#id.value() !== info.navigation) {
                        return;
                    }
                    this.emit(event, {
                        url: info.url,
                        timestamp: new Date(info.timestamp),
                    });
                    this.dispose();
                });
            }
        }
        // keep-sorted start block=yes
        get #session() {
            return this.#browsingContext.userContext.browser.session;
        }
        get disposed() {
            return this.#disposables.disposed;
        }
        get request() {
            return this.#request;
        }
        // keep-sorted end
        dispose() {
            this[disposeSymbol]();
        }
        [(_dispose_decorators = [inertIfDisposed], disposeSymbol)]() {
            this.#disposables.dispose();
            super[disposeSymbol]();
        }
    };
})();
export { Navigation };
//# sourceMappingURL=Navigation.js.map
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedWorkerRealm = exports.DedicatedWorkerRealm = exports.WindowRealm = exports.Realm = void 0;
const EventEmitter_js_1 = require("../../common/EventEmitter.js");
const decorators_js_1 = require("../../util/decorators.js");
const disposable_js_1 = require("../../util/disposable.js");
/**
 * @internal
 */
let Realm = (() => {
    let _classSuper = EventEmitter_js_1.EventEmitter;
    let _instanceExtraInitializers = [];
    let _dispose_decorators;
    let _disown_decorators;
    let _callFunction_decorators;
    let _evaluate_decorators;
    return class Realm extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(this, null, _dispose_decorators, { kind: "method", name: "dispose", static: false, private: false, access: { has: obj => "dispose" in obj, get: obj => obj.dispose }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _disown_decorators, { kind: "method", name: "disown", static: false, private: false, access: { has: obj => "disown" in obj, get: obj => obj.disown }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _callFunction_decorators, { kind: "method", name: "callFunction", static: false, private: false, access: { has: obj => "callFunction" in obj, get: obj => obj.callFunction }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _evaluate_decorators, { kind: "method", name: "evaluate", static: false, private: false, access: { has: obj => "evaluate" in obj, get: obj => obj.evaluate }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        // keep-sorted start
        #reason = (__runInitializers(this, _instanceExtraInitializers), void 0);
        disposables = new disposable_js_1.DisposableStack();
        id;
        origin;
        // keep-sorted end
        constructor(id, origin) {
            super();
            // keep-sorted start
            this.id = id;
            this.origin = origin;
            // keep-sorted end
        }
        initialize() {
            const sessionEmitter = this.disposables.use(new EventEmitter_js_1.EventEmitter(this.session));
            sessionEmitter.on('script.realmDestroyed', info => {
                if (info.realm !== this.id) {
                    return;
                }
                this.dispose('Realm already destroyed.');
            });
        }
        // keep-sorted start block=yes
        get disposed() {
            return this.#reason !== undefined;
        }
        get target() {
            return { realm: this.id };
        }
        // keep-sorted end
        dispose(reason) {
            this.#reason = reason;
            this[disposable_js_1.disposeSymbol]();
        }
        async disown(handles) {
            await this.session.send('script.disown', {
                target: this.target,
                handles,
            });
        }
        async callFunction(functionDeclaration, awaitPromise, options = {}) {
            const { result } = await this.session.send('script.callFunction', {
                functionDeclaration,
                awaitPromise,
                target: this.target,
                ...options,
            });
            return result;
        }
        async evaluate(expression, awaitPromise, options = {}) {
            const { result } = await this.session.send('script.evaluate', {
                expression,
                awaitPromise,
                target: this.target,
                ...options,
            });
            return result;
        }
        [(_dispose_decorators = [decorators_js_1.inertIfDisposed], _disown_decorators = [(0, decorators_js_1.throwIfDisposed)(realm => {
                // SAFETY: Disposal implies this exists.
                return realm.#reason;
            })], _callFunction_decorators = [(0, decorators_js_1.throwIfDisposed)(realm => {
                // SAFETY: Disposal implies this exists.
                return realm.#reason;
            })], _evaluate_decorators = [(0, decorators_js_1.throwIfDisposed)(realm => {
                // SAFETY: Disposal implies this exists.
                return realm.#reason;
            })], disposable_js_1.disposeSymbol)]() {
            this.#reason ??=
                'Realm already destroyed, probably because all associated browsing contexts closed.';
            this.emit('destroyed', { reason: this.#reason });
            this.disposables.dispose();
            super[disposable_js_1.disposeSymbol]();
        }
    };
})();
exports.Realm = Realm;
/**
 * @internal
 */
class WindowRealm extends Realm {
    static from(context, sandbox) {
        const realm = new WindowRealm(context, sandbox);
        realm.initialize();
        return realm;
    }
    // keep-sorted start
    browsingContext;
    sandbox;
    // keep-sorted end
    #workers = {
        dedicated: new Map(),
        shared: new Map(),
    };
    constructor(context, sandbox) {
        super('', '');
        // keep-sorted start
        this.browsingContext = context;
        this.sandbox = sandbox;
        // keep-sorted end
    }
    initialize() {
        super.initialize();
        const sessionEmitter = this.disposables.use(new EventEmitter_js_1.EventEmitter(this.session));
        sessionEmitter.on('script.realmCreated', info => {
            if (info.type !== 'window') {
                return;
            }
            this.id = info.realm;
            this.origin = info.origin;
        });
        sessionEmitter.on('script.realmCreated', info => {
            if (info.type !== 'dedicated-worker') {
                return;
            }
            if (!info.owners.includes(this.id)) {
                return;
            }
            const realm = DedicatedWorkerRealm.from(this, info.realm, info.origin);
            this.#workers.dedicated.set(realm.id, realm);
            const realmEmitter = this.disposables.use(new EventEmitter_js_1.EventEmitter(realm));
            realmEmitter.once('destroyed', () => {
                realmEmitter.removeAllListeners();
                this.#workers.dedicated.delete(realm.id);
            });
            this.emit('worker', realm);
        });
        this.browsingContext.userContext.browser.on('sharedworker', ({ realm }) => {
            if (!realm.owners.has(this)) {
                return;
            }
            this.#workers.shared.set(realm.id, realm);
            const realmEmitter = this.disposables.use(new EventEmitter_js_1.EventEmitter(realm));
            realmEmitter.once('destroyed', () => {
                realmEmitter.removeAllListeners();
                this.#workers.shared.delete(realm.id);
            });
            this.emit('sharedworker', realm);
        });
    }
    get session() {
        return this.browsingContext.userContext.browser.session;
    }
    get target() {
        return { context: this.browsingContext.id, sandbox: this.sandbox };
    }
}
exports.WindowRealm = WindowRealm;
/**
 * @internal
 */
class DedicatedWorkerRealm extends Realm {
    static from(owner, id, origin) {
        const realm = new DedicatedWorkerRealm(owner, id, origin);
        realm.initialize();
        return realm;
    }
    // keep-sorted start
    #workers = new Map();
    owners;
    // keep-sorted end
    constructor(owner, id, origin) {
        super(id, origin);
        this.owners = new Set([owner]);
    }
    initialize() {
        super.initialize();
        const sessionEmitter = this.disposables.use(new EventEmitter_js_1.EventEmitter(this.session));
        sessionEmitter.on('script.realmCreated', info => {
            if (info.type !== 'dedicated-worker') {
                return;
            }
            if (!info.owners.includes(this.id)) {
                return;
            }
            const realm = DedicatedWorkerRealm.from(this, info.realm, info.origin);
            this.#workers.set(realm.id, realm);
            const realmEmitter = this.disposables.use(new EventEmitter_js_1.EventEmitter(realm));
            realmEmitter.once('destroyed', () => {
                this.#workers.delete(realm.id);
            });
            this.emit('worker', realm);
        });
    }
    get session() {
        // SAFETY: At least one owner will exist.
        return this.owners.values().next().value.session;
    }
}
exports.DedicatedWorkerRealm = DedicatedWorkerRealm;
/**
 * @internal
 */
class SharedWorkerRealm extends Realm {
    static from(owners, id, origin) {
        const realm = new SharedWorkerRealm(owners, id, origin);
        realm.initialize();
        return realm;
    }
    // keep-sorted start
    #workers = new Map();
    owners;
    // keep-sorted end
    constructor(owners, id, origin) {
        super(id, origin);
        this.owners = new Set(owners);
    }
    initialize() {
        super.initialize();
        const sessionEmitter = this.disposables.use(new EventEmitter_js_1.EventEmitter(this.session));
        sessionEmitter.on('script.realmCreated', info => {
            if (info.type !== 'dedicated-worker') {
                return;
            }
            if (!info.owners.includes(this.id)) {
                return;
            }
            const realm = DedicatedWorkerRealm.from(this, info.realm, info.origin);
            this.#workers.set(realm.id, realm);
            const realmEmitter = this.disposables.use(new EventEmitter_js_1.EventEmitter(realm));
            realmEmitter.once('destroyed', () => {
                this.#workers.delete(realm.id);
            });
            this.emit('worker', realm);
        });
    }
    get session() {
        // SAFETY: At least one owner will exist.
        return this.owners.values().next().value.session;
    }
}
exports.SharedWorkerRealm = SharedWorkerRealm;
//# sourceMappingURL=Realm.js.map
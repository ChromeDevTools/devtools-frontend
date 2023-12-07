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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidiFrame = void 0;
const Bidi = __importStar(require("chromium-bidi/lib/cjs/protocol/protocol.js"));
const rxjs_js_1 = require("../../third_party/rxjs/rxjs.js");
const Frame_js_1 = require("../api/Frame.js");
const Errors_js_1 = require("../common/Errors.js");
const util_js_1 = require("../common/util.js");
const Deferred_js_1 = require("../util/Deferred.js");
const disposable_js_1 = require("../util/disposable.js");
const ExposedFunction_js_1 = require("./ExposedFunction.js");
const lifecycle_js_1 = require("./lifecycle.js");
const Sandbox_js_1 = require("./Sandbox.js");
/**
 * Puppeteer's Frame class could be viewed as a BiDi BrowsingContext implementation
 * @internal
 */
let BidiFrame = (() => {
    let _classSuper = Frame_js_1.Frame;
    let _instanceExtraInitializers = [];
    let _goto_decorators;
    let _setContent_decorators;
    let _waitForNavigation_decorators;
    return class BidiFrame extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(this, null, _goto_decorators, { kind: "method", name: "goto", static: false, private: false, access: { has: obj => "goto" in obj, get: obj => obj.goto }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _setContent_decorators, { kind: "method", name: "setContent", static: false, private: false, access: { has: obj => "setContent" in obj, get: obj => obj.setContent }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _waitForNavigation_decorators, { kind: "method", name: "waitForNavigation", static: false, private: false, access: { has: obj => "waitForNavigation" in obj, get: obj => obj.waitForNavigation }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        #page = (__runInitializers(this, _instanceExtraInitializers), void 0);
        #context;
        #timeoutSettings;
        #abortDeferred = Deferred_js_1.Deferred.create();
        #disposed = false;
        sandboxes;
        _id;
        constructor(page, context, timeoutSettings, parentId) {
            super();
            this.#page = page;
            this.#context = context;
            this.#timeoutSettings = timeoutSettings;
            this._id = this.#context.id;
            this._parentId = parentId ?? undefined;
            this.sandboxes = {
                [Sandbox_js_1.MAIN_SANDBOX]: new Sandbox_js_1.Sandbox(undefined, this, context, timeoutSettings),
                [Sandbox_js_1.PUPPETEER_SANDBOX]: new Sandbox_js_1.Sandbox(util_js_1.UTILITY_WORLD_NAME, this, context.createRealmForSandbox(), timeoutSettings),
            };
        }
        get client() {
            return this.context().cdpSession;
        }
        mainRealm() {
            return this.sandboxes[Sandbox_js_1.MAIN_SANDBOX];
        }
        isolatedRealm() {
            return this.sandboxes[Sandbox_js_1.PUPPETEER_SANDBOX];
        }
        page() {
            return this.#page;
        }
        isOOPFrame() {
            throw new Errors_js_1.UnsupportedOperation();
        }
        url() {
            return this.#context.url;
        }
        parentFrame() {
            return this.#page.frame(this._parentId ?? '');
        }
        childFrames() {
            return this.#page.childFrames(this.#context.id);
        }
        async goto(url, options = {}) {
            const { waitUntil = 'load', timeout: ms = this.#timeoutSettings.navigationTimeout(), } = options;
            const [readiness, networkIdle] = (0, lifecycle_js_1.getBiDiReadinessState)(waitUntil);
            const response = await (0, rxjs_js_1.firstValueFrom)(this.#page
                ._waitWithNetworkIdle(this.#context.connection.send('browsingContext.navigate', {
                context: this.#context.id,
                url,
                wait: readiness,
            }), networkIdle)
                .pipe((0, rxjs_js_1.raceWith)((0, util_js_1.timeout)(ms), (0, rxjs_js_1.from)(this.#abortDeferred.valueOrThrow())))
                .pipe((0, lifecycle_js_1.rewriteNavigationError)(url, ms)));
            return this.#page.getNavigationResponse(response?.result.navigation);
        }
        async setContent(html, options = {}) {
            const { waitUntil = 'load', timeout: ms = this.#timeoutSettings.navigationTimeout(), } = options;
            const [waitEvent, networkIdle] = (0, lifecycle_js_1.getBiDiLifecycleEvent)(waitUntil);
            await (0, rxjs_js_1.firstValueFrom)(this.#page
                ._waitWithNetworkIdle((0, rxjs_js_1.forkJoin)([
                (0, rxjs_js_1.fromEvent)(this.#context, waitEvent).pipe((0, rxjs_js_1.first)()),
                (0, rxjs_js_1.from)(this.setFrameContent(html)),
            ]).pipe((0, rxjs_js_1.map)(() => {
                return null;
            })), networkIdle)
                .pipe((0, rxjs_js_1.raceWith)((0, util_js_1.timeout)(ms), (0, rxjs_js_1.from)(this.#abortDeferred.valueOrThrow())))
                .pipe((0, lifecycle_js_1.rewriteNavigationError)('setContent', ms)));
        }
        context() {
            return this.#context;
        }
        async waitForNavigation(options = {}) {
            const { waitUntil = 'load', timeout: ms = this.#timeoutSettings.navigationTimeout(), } = options;
            const [waitUntilEvent, networkIdle] = (0, lifecycle_js_1.getBiDiLifecycleEvent)(waitUntil);
            const navigatedObservable = (0, rxjs_js_1.merge)((0, rxjs_js_1.forkJoin)([
                (0, rxjs_js_1.fromEvent)(this.#context, Bidi.ChromiumBidi.BrowsingContext.EventNames.NavigationStarted).pipe((0, rxjs_js_1.first)()),
                (0, rxjs_js_1.fromEvent)(this.#context, waitUntilEvent).pipe((0, rxjs_js_1.first)()),
            ]), (0, rxjs_js_1.fromEvent)(this.#context, Bidi.ChromiumBidi.BrowsingContext.EventNames.FragmentNavigated)).pipe((0, rxjs_js_1.map)(result => {
                if (Array.isArray(result)) {
                    return { result: result[1] };
                }
                return { result };
            }));
            const response = await (0, rxjs_js_1.firstValueFrom)(this.#page
                ._waitWithNetworkIdle(navigatedObservable, networkIdle)
                .pipe((0, rxjs_js_1.raceWith)((0, util_js_1.timeout)(ms), (0, rxjs_js_1.from)(this.#abortDeferred.valueOrThrow()))));
            return this.#page.getNavigationResponse(response?.result.navigation);
        }
        waitForDevicePrompt() {
            throw new Errors_js_1.UnsupportedOperation();
        }
        get detached() {
            return this.#disposed;
        }
        [(_goto_decorators = [Frame_js_1.throwIfDetached], _setContent_decorators = [Frame_js_1.throwIfDetached], _waitForNavigation_decorators = [Frame_js_1.throwIfDetached], disposable_js_1.disposeSymbol)]() {
            if (this.#disposed) {
                return;
            }
            this.#disposed = true;
            this.#abortDeferred.reject(new Error('Frame detached'));
            this.#context.dispose();
            this.sandboxes[Sandbox_js_1.MAIN_SANDBOX][disposable_js_1.disposeSymbol]();
            this.sandboxes[Sandbox_js_1.PUPPETEER_SANDBOX][disposable_js_1.disposeSymbol]();
        }
        #exposedFunctions = new Map();
        async exposeFunction(name, apply) {
            if (this.#exposedFunctions.has(name)) {
                throw new Error(`Failed to add page binding with name ${name}: globalThis['${name}'] already exists!`);
            }
            const exposeable = new ExposedFunction_js_1.ExposeableFunction(this, name, apply);
            this.#exposedFunctions.set(name, exposeable);
            try {
                await exposeable.expose();
            }
            catch (error) {
                this.#exposedFunctions.delete(name);
                throw error;
            }
        }
        waitForSelector(selector, options) {
            if (selector.startsWith('aria')) {
                throw new Errors_js_1.UnsupportedOperation('ARIA selector is not supported for BiDi!');
            }
            return super.waitForSelector(selector, options);
        }
    };
})();
exports.BidiFrame = BidiFrame;
//# sourceMappingURL=Frame.js.map
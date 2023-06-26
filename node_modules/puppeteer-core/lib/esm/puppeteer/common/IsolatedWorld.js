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
var _IsolatedWorld_instances, _IsolatedWorld_frame, _IsolatedWorld_document, _IsolatedWorld_context, _IsolatedWorld_detached, _IsolatedWorld_contextBindings, _IsolatedWorld_bindings, _IsolatedWorld_taskManager, _IsolatedWorld_client_get, _IsolatedWorld_frameManager_get, _IsolatedWorld_timeoutSettings_get, _IsolatedWorld_mutex, _IsolatedWorld_onBindingCalled, _Mutex_locked, _Mutex_acquirers;
import { assert } from '../util/assert.js';
import { Deferred } from '../util/Deferred.js';
import { MAIN_WORLD, PUPPETEER_WORLD } from './IsolatedWorlds.js';
import { LifecycleWatcher } from './LifecycleWatcher.js';
import { addPageBinding, createJSHandle, debugError, getPageContent, setPageContent, withSourcePuppeteerURLIfNone, } from './util.js';
import { TaskManager, WaitTask } from './WaitTask.js';
/**
 * @internal
 */
export class IsolatedWorld {
    get taskManager() {
        return __classPrivateFieldGet(this, _IsolatedWorld_taskManager, "f");
    }
    get _bindings() {
        return __classPrivateFieldGet(this, _IsolatedWorld_bindings, "f");
    }
    constructor(frame) {
        _IsolatedWorld_instances.add(this);
        _IsolatedWorld_frame.set(this, void 0);
        _IsolatedWorld_document.set(this, void 0);
        _IsolatedWorld_context.set(this, Deferred.create());
        _IsolatedWorld_detached.set(this, false);
        // Set of bindings that have been registered in the current context.
        _IsolatedWorld_contextBindings.set(this, new Set());
        // Contains mapping from functions that should be bound to Puppeteer functions.
        _IsolatedWorld_bindings.set(this, new Map());
        _IsolatedWorld_taskManager.set(this, new TaskManager());
        // If multiple waitFor are set up asynchronously, we need to wait for the
        // first one to set up the binding in the page before running the others.
        _IsolatedWorld_mutex.set(this, new Mutex());
        _IsolatedWorld_onBindingCalled.set(this, async (event) => {
            let payload;
            try {
                payload = JSON.parse(event.payload);
            }
            catch {
                // The binding was either called by something in the page or it was
                // called before our wrapper was initialized.
                return;
            }
            const { type, name, seq, args, isTrivial } = payload;
            if (type !== 'internal') {
                return;
            }
            if (!__classPrivateFieldGet(this, _IsolatedWorld_contextBindings, "f").has(name)) {
                return;
            }
            try {
                const context = await __classPrivateFieldGet(this, _IsolatedWorld_context, "f").valueOrThrow();
                if (event.executionContextId !== context._contextId) {
                    return;
                }
                const binding = this._bindings.get(name);
                await binding?.run(context, seq, args, isTrivial);
            }
            catch (err) {
                debugError(err);
            }
        });
        // Keep own reference to client because it might differ from the FrameManager's
        // client for OOP iframes.
        __classPrivateFieldSet(this, _IsolatedWorld_frame, frame, "f");
        __classPrivateFieldGet(this, _IsolatedWorld_instances, "a", _IsolatedWorld_client_get).on('Runtime.bindingCalled', __classPrivateFieldGet(this, _IsolatedWorld_onBindingCalled, "f"));
    }
    frame() {
        return __classPrivateFieldGet(this, _IsolatedWorld_frame, "f");
    }
    clearContext() {
        __classPrivateFieldSet(this, _IsolatedWorld_document, undefined, "f");
        __classPrivateFieldSet(this, _IsolatedWorld_context, Deferred.create(), "f");
    }
    setContext(context) {
        __classPrivateFieldGet(this, _IsolatedWorld_contextBindings, "f").clear();
        __classPrivateFieldGet(this, _IsolatedWorld_context, "f").resolve(context);
        void __classPrivateFieldGet(this, _IsolatedWorld_taskManager, "f").rerunAll();
    }
    hasContext() {
        return __classPrivateFieldGet(this, _IsolatedWorld_context, "f").resolved();
    }
    _detach() {
        __classPrivateFieldSet(this, _IsolatedWorld_detached, true, "f");
        __classPrivateFieldGet(this, _IsolatedWorld_instances, "a", _IsolatedWorld_client_get).off('Runtime.bindingCalled', __classPrivateFieldGet(this, _IsolatedWorld_onBindingCalled, "f"));
        __classPrivateFieldGet(this, _IsolatedWorld_taskManager, "f").terminateAll(new Error('waitForFunction failed: frame got detached.'));
    }
    executionContext() {
        if (__classPrivateFieldGet(this, _IsolatedWorld_detached, "f")) {
            throw new Error(`Execution context is not available in detached frame "${__classPrivateFieldGet(this, _IsolatedWorld_frame, "f").url()}" (are you trying to evaluate?)`);
        }
        if (__classPrivateFieldGet(this, _IsolatedWorld_context, "f") === null) {
            throw new Error(`Execution content promise is missing`);
        }
        return __classPrivateFieldGet(this, _IsolatedWorld_context, "f").valueOrThrow();
    }
    async evaluateHandle(pageFunction, ...args) {
        pageFunction = withSourcePuppeteerURLIfNone(this.evaluateHandle.name, pageFunction);
        const context = await this.executionContext();
        return context.evaluateHandle(pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        pageFunction = withSourcePuppeteerURLIfNone(this.evaluate.name, pageFunction);
        const context = await this.executionContext();
        return context.evaluate(pageFunction, ...args);
    }
    async $(selector) {
        const document = await this.document();
        return document.$(selector);
    }
    async $$(selector) {
        const document = await this.document();
        return document.$$(selector);
    }
    async document() {
        if (__classPrivateFieldGet(this, _IsolatedWorld_document, "f")) {
            return __classPrivateFieldGet(this, _IsolatedWorld_document, "f");
        }
        const context = await this.executionContext();
        __classPrivateFieldSet(this, _IsolatedWorld_document, await context.evaluateHandle(() => {
            return document;
        }), "f");
        return __classPrivateFieldGet(this, _IsolatedWorld_document, "f");
    }
    async $x(expression) {
        const document = await this.document();
        return document.$x(expression);
    }
    async $eval(selector, pageFunction, ...args) {
        pageFunction = withSourcePuppeteerURLIfNone(this.$eval.name, pageFunction);
        const document = await this.document();
        return document.$eval(selector, pageFunction, ...args);
    }
    async $$eval(selector, pageFunction, ...args) {
        pageFunction = withSourcePuppeteerURLIfNone(this.$$eval.name, pageFunction);
        const document = await this.document();
        return document.$$eval(selector, pageFunction, ...args);
    }
    async content() {
        return await this.evaluate(getPageContent);
    }
    async setContent(html, options = {}) {
        const { waitUntil = ['load'], timeout = __classPrivateFieldGet(this, _IsolatedWorld_instances, "a", _IsolatedWorld_timeoutSettings_get).navigationTimeout(), } = options;
        await setPageContent(this, html);
        const watcher = new LifecycleWatcher(__classPrivateFieldGet(this, _IsolatedWorld_instances, "a", _IsolatedWorld_frameManager_get), __classPrivateFieldGet(this, _IsolatedWorld_frame, "f"), waitUntil, timeout);
        const error = await Deferred.race([
            watcher.timeoutOrTerminationPromise(),
            watcher.lifecyclePromise(),
        ]);
        watcher.dispose();
        if (error) {
            throw error;
        }
    }
    async click(selector, options) {
        const handle = await this.$(selector);
        assert(handle, `No element found for selector: ${selector}`);
        await handle.click(options);
        await handle.dispose();
    }
    async focus(selector) {
        const handle = await this.$(selector);
        assert(handle, `No element found for selector: ${selector}`);
        await handle.focus();
        await handle.dispose();
    }
    async hover(selector) {
        const handle = await this.$(selector);
        assert(handle, `No element found for selector: ${selector}`);
        await handle.hover();
        await handle.dispose();
    }
    async select(selector, ...values) {
        const handle = await this.$(selector);
        assert(handle, `No element found for selector: ${selector}`);
        const result = await handle.select(...values);
        await handle.dispose();
        return result;
    }
    async tap(selector) {
        const handle = await this.$(selector);
        assert(handle, `No element found for selector: ${selector}`);
        await handle.tap();
        await handle.dispose();
    }
    async type(selector, text, options) {
        const handle = await this.$(selector);
        assert(handle, `No element found for selector: ${selector}`);
        await handle.type(text, options);
        await handle.dispose();
    }
    async _addBindingToContext(context, name) {
        if (__classPrivateFieldGet(this, _IsolatedWorld_contextBindings, "f").has(name)) {
            return;
        }
        await __classPrivateFieldGet(this, _IsolatedWorld_mutex, "f").acquire();
        try {
            await context._client.send('Runtime.addBinding', context._contextName
                ? {
                    name,
                    executionContextName: context._contextName,
                }
                : {
                    name,
                    executionContextId: context._contextId,
                });
            await context.evaluate(addPageBinding, 'internal', name);
            __classPrivateFieldGet(this, _IsolatedWorld_contextBindings, "f").add(name);
        }
        catch (error) {
            // We could have tried to evaluate in a context which was already
            // destroyed. This happens, for example, if the page is navigated while
            // we are trying to add the binding
            if (error instanceof Error) {
                // Destroyed context.
                if (error.message.includes('Execution context was destroyed')) {
                    return;
                }
                // Missing context.
                if (error.message.includes('Cannot find context with specified id')) {
                    return;
                }
            }
            debugError(error);
        }
        finally {
            __classPrivateFieldGet(this, _IsolatedWorld_mutex, "f").release();
        }
    }
    waitForFunction(pageFunction, options = {}, ...args) {
        const { polling = 'raf', timeout = __classPrivateFieldGet(this, _IsolatedWorld_instances, "a", _IsolatedWorld_timeoutSettings_get).timeout(), root, signal, } = options;
        if (typeof polling === 'number' && polling < 0) {
            throw new Error('Cannot poll with non-positive interval');
        }
        const waitTask = new WaitTask(this, {
            polling,
            root,
            timeout,
            signal,
        }, pageFunction, ...args);
        return waitTask.result;
    }
    async title() {
        return this.evaluate(() => {
            return document.title;
        });
    }
    async adoptBackendNode(backendNodeId) {
        const executionContext = await this.executionContext();
        const { object } = await __classPrivateFieldGet(this, _IsolatedWorld_instances, "a", _IsolatedWorld_client_get).send('DOM.resolveNode', {
            backendNodeId: backendNodeId,
            executionContextId: executionContext._contextId,
        });
        return createJSHandle(executionContext, object);
    }
    async adoptHandle(handle) {
        const context = await this.executionContext();
        assert(handle.executionContext() !== context, 'Cannot adopt handle that already belongs to this execution context');
        const nodeInfo = await __classPrivateFieldGet(this, _IsolatedWorld_instances, "a", _IsolatedWorld_client_get).send('DOM.describeNode', {
            objectId: handle.id,
        });
        return (await this.adoptBackendNode(nodeInfo.node.backendNodeId));
    }
    async transferHandle(handle) {
        const context = await this.executionContext();
        if (handle.executionContext() === context) {
            return handle;
        }
        const info = await __classPrivateFieldGet(this, _IsolatedWorld_instances, "a", _IsolatedWorld_client_get).send('DOM.describeNode', {
            objectId: handle.remoteObject().objectId,
        });
        const newHandle = (await this.adoptBackendNode(info.node.backendNodeId));
        await handle.dispose();
        return newHandle;
    }
}
_IsolatedWorld_frame = new WeakMap(), _IsolatedWorld_document = new WeakMap(), _IsolatedWorld_context = new WeakMap(), _IsolatedWorld_detached = new WeakMap(), _IsolatedWorld_contextBindings = new WeakMap(), _IsolatedWorld_bindings = new WeakMap(), _IsolatedWorld_taskManager = new WeakMap(), _IsolatedWorld_mutex = new WeakMap(), _IsolatedWorld_onBindingCalled = new WeakMap(), _IsolatedWorld_instances = new WeakSet(), _IsolatedWorld_client_get = function _IsolatedWorld_client_get() {
    return __classPrivateFieldGet(this, _IsolatedWorld_frame, "f")._client();
}, _IsolatedWorld_frameManager_get = function _IsolatedWorld_frameManager_get() {
    return __classPrivateFieldGet(this, _IsolatedWorld_frame, "f")._frameManager;
}, _IsolatedWorld_timeoutSettings_get = function _IsolatedWorld_timeoutSettings_get() {
    return __classPrivateFieldGet(this, _IsolatedWorld_instances, "a", _IsolatedWorld_frameManager_get).timeoutSettings;
};
class Mutex {
    constructor() {
        _Mutex_locked.set(this, false);
        _Mutex_acquirers.set(this, []);
    }
    // This is FIFO.
    acquire() {
        if (!__classPrivateFieldGet(this, _Mutex_locked, "f")) {
            __classPrivateFieldSet(this, _Mutex_locked, true, "f");
            return Promise.resolve();
        }
        const deferred = Deferred.create();
        __classPrivateFieldGet(this, _Mutex_acquirers, "f").push(deferred.resolve.bind(deferred));
        return deferred.valueOrThrow();
    }
    release() {
        const resolve = __classPrivateFieldGet(this, _Mutex_acquirers, "f").shift();
        if (!resolve) {
            __classPrivateFieldSet(this, _Mutex_locked, false, "f");
            return;
        }
        resolve();
    }
}
_Mutex_locked = new WeakMap(), _Mutex_acquirers = new WeakMap();
//# sourceMappingURL=IsolatedWorld.js.map
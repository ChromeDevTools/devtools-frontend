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
    #frame;
    #document;
    #context = Deferred.create();
    #detached = false;
    // Set of bindings that have been registered in the current context.
    #contextBindings = new Set();
    // Contains mapping from functions that should be bound to Puppeteer functions.
    #bindings = new Map();
    #taskManager = new TaskManager();
    get taskManager() {
        return this.#taskManager;
    }
    get _bindings() {
        return this.#bindings;
    }
    constructor(frame) {
        // Keep own reference to client because it might differ from the FrameManager's
        // client for OOP iframes.
        this.#frame = frame;
        this.#client.on('Runtime.bindingCalled', this.#onBindingCalled);
    }
    get #client() {
        return this.#frame._client();
    }
    get #frameManager() {
        return this.#frame._frameManager;
    }
    get #timeoutSettings() {
        return this.#frameManager.timeoutSettings;
    }
    frame() {
        return this.#frame;
    }
    clearContext() {
        this.#document = undefined;
        this.#context = Deferred.create();
    }
    setContext(context) {
        this.#contextBindings.clear();
        this.#context.resolve(context);
        void this.#taskManager.rerunAll();
    }
    hasContext() {
        return this.#context.resolved();
    }
    _detach() {
        this.#detached = true;
        this.#client.off('Runtime.bindingCalled', this.#onBindingCalled);
        this.#taskManager.terminateAll(new Error('waitForFunction failed: frame got detached.'));
    }
    executionContext() {
        if (this.#detached) {
            throw new Error(`Execution context is not available in detached frame "${this.#frame.url()}" (are you trying to evaluate?)`);
        }
        if (this.#context === null) {
            throw new Error(`Execution content promise is missing`);
        }
        return this.#context.valueOrThrow();
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
        if (this.#document) {
            return this.#document;
        }
        const context = await this.executionContext();
        this.#document = await context.evaluateHandle(() => {
            return document;
        });
        return this.#document;
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
        const { waitUntil = ['load'], timeout = this.#timeoutSettings.navigationTimeout(), } = options;
        await setPageContent(this, html);
        const watcher = new LifecycleWatcher(this.#frameManager, this.#frame, waitUntil, timeout);
        const error = await Deferred.race([
            watcher.terminationPromise(),
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
    // If multiple waitFor are set up asynchronously, we need to wait for the
    // first one to set up the binding in the page before running the others.
    #mutex = new Mutex();
    async _addBindingToContext(context, name) {
        if (this.#contextBindings.has(name)) {
            return;
        }
        await this.#mutex.acquire();
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
            this.#contextBindings.add(name);
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
            this.#mutex.release();
        }
    }
    #onBindingCalled = async (event) => {
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
        if (!this.#contextBindings.has(name)) {
            return;
        }
        try {
            const context = await this.#context.valueOrThrow();
            if (event.executionContextId !== context._contextId) {
                return;
            }
            const binding = this._bindings.get(name);
            await binding?.run(context, seq, args, isTrivial);
        }
        catch (err) {
            debugError(err);
        }
    };
    waitForFunction(pageFunction, options = {}, ...args) {
        const { polling = 'raf', timeout = this.#timeoutSettings.timeout(), root, signal, } = options;
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
        const { object } = await this.#client.send('DOM.resolveNode', {
            backendNodeId: backendNodeId,
            executionContextId: executionContext._contextId,
        });
        return createJSHandle(executionContext, object);
    }
    async adoptHandle(handle) {
        const context = await this.executionContext();
        assert(handle.executionContext() !== context, 'Cannot adopt handle that already belongs to this execution context');
        const nodeInfo = await this.#client.send('DOM.describeNode', {
            objectId: handle.id,
        });
        return (await this.adoptBackendNode(nodeInfo.node.backendNodeId));
    }
    async transferHandle(handle) {
        const context = await this.executionContext();
        if (handle.executionContext() === context) {
            return handle;
        }
        const info = await this.#client.send('DOM.describeNode', {
            objectId: handle.remoteObject().objectId,
        });
        const newHandle = (await this.adoptBackendNode(info.node.backendNodeId));
        await handle.dispose();
        return newHandle;
    }
}
class Mutex {
    #locked = false;
    #acquirers = [];
    // This is FIFO.
    acquire() {
        if (!this.#locked) {
            this.#locked = true;
            return Promise.resolve();
        }
        const deferred = Deferred.create();
        this.#acquirers.push(deferred.resolve.bind(deferred));
        return deferred.valueOrThrow();
    }
    release() {
        const resolve = this.#acquirers.shift();
        if (!resolve) {
            this.#locked = false;
            return;
        }
        resolve();
    }
}
//# sourceMappingURL=IsolatedWorld.js.map
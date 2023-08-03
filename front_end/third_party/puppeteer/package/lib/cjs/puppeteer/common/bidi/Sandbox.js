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
exports.Sandbox = exports.PUPPETEER_SANDBOX = exports.MAIN_SANDBOX = void 0;
const assert_js_1 = require("../../util/assert.js");
const util_js_1 = require("../util.js");
const WaitTask_js_1 = require("../WaitTask.js");
/**
 * A unique key for {@link SandboxChart} to denote the default world.
 * Realms are automatically created in the default sandbox.
 *
 * @internal
 */
exports.MAIN_SANDBOX = Symbol('mainSandbox');
/**
 * A unique key for {@link SandboxChart} to denote the puppeteer sandbox.
 * This world contains all puppeteer-internal bindings/code.
 *
 * @internal
 */
exports.PUPPETEER_SANDBOX = Symbol('puppeteerSandbox');
/**
 * @internal
 */
class Sandbox {
    #document;
    #realm;
    #timeoutSettings;
    #taskManager = new WaitTask_js_1.TaskManager();
    constructor(context, timeoutSettings) {
        this.#realm = context;
        this.#timeoutSettings = timeoutSettings;
    }
    get taskManager() {
        return this.#taskManager;
    }
    async document() {
        if (this.#document) {
            return this.#document;
        }
        this.#document = await this.#realm.evaluateHandle(() => {
            return document;
        });
        return this.#document;
    }
    async $(selector) {
        const document = await this.document();
        return document.$(selector);
    }
    async $$(selector) {
        const document = await this.document();
        return document.$$(selector);
    }
    async $eval(selector, pageFunction, ...args) {
        pageFunction = (0, util_js_1.withSourcePuppeteerURLIfNone)(this.$eval.name, pageFunction);
        const document = await this.document();
        return document.$eval(selector, pageFunction, ...args);
    }
    async $$eval(selector, pageFunction, ...args) {
        pageFunction = (0, util_js_1.withSourcePuppeteerURLIfNone)(this.$$eval.name, pageFunction);
        const document = await this.document();
        return document.$$eval(selector, pageFunction, ...args);
    }
    async $x(expression) {
        const document = await this.document();
        return document.$x(expression);
    }
    async evaluateHandle(pageFunction, ...args) {
        pageFunction = (0, util_js_1.withSourcePuppeteerURLIfNone)(this.evaluateHandle.name, pageFunction);
        return this.#realm.evaluateHandle(pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        pageFunction = (0, util_js_1.withSourcePuppeteerURLIfNone)(this.evaluate.name, pageFunction);
        return this.#realm.evaluate(pageFunction, ...args);
    }
    async adoptHandle(handle) {
        return (await this.evaluateHandle(node => {
            return node;
        }, handle));
    }
    async transferHandle(handle) {
        if (handle.context() === this.#realm) {
            return handle;
        }
        const transferredHandle = await this.evaluateHandle(node => {
            return node;
        }, handle);
        await handle.dispose();
        return transferredHandle;
    }
    waitForFunction(pageFunction, options = {}, ...args) {
        const { polling = 'raf', timeout = this.#timeoutSettings.timeout(), root, signal, } = options;
        if (typeof polling === 'number' && polling < 0) {
            throw new Error('Cannot poll with non-positive interval');
        }
        const waitTask = new WaitTask_js_1.WaitTask(this, {
            polling,
            root,
            timeout,
            signal,
        }, pageFunction, ...args);
        return waitTask.result;
    }
    // ///////////////////
    // // Input methods //
    // ///////////////////
    async click(selector, options) {
        const handle = await this.$(selector);
        (0, assert_js_1.assert)(handle, `No element found for selector: ${selector}`);
        await handle.click(options);
        await handle.dispose();
    }
    async focus(selector) {
        const handle = await this.$(selector);
        (0, assert_js_1.assert)(handle, `No element found for selector: ${selector}`);
        await handle.focus();
        await handle.dispose();
    }
    async hover(selector) {
        const handle = await this.$(selector);
        (0, assert_js_1.assert)(handle, `No element found for selector: ${selector}`);
        await handle.hover();
        await handle.dispose();
    }
    async select(selector, ...values) {
        const handle = await this.$(selector);
        (0, assert_js_1.assert)(handle, `No element found for selector: ${selector}`);
        const result = await handle.select(...values);
        await handle.dispose();
        return result;
    }
    async tap(selector) {
        const handle = await this.$(selector);
        (0, assert_js_1.assert)(handle, `No element found for selector: ${selector}`);
        await handle.tap();
        await handle.dispose();
    }
    async type(selector, text, options) {
        const handle = await this.$(selector);
        (0, assert_js_1.assert)(handle, `No element found for selector: ${selector}`);
        await handle.type(text, options);
        await handle.dispose();
    }
}
exports.Sandbox = Sandbox;
//# sourceMappingURL=Sandbox.js.map
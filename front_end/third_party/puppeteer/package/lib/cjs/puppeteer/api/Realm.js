"use strict";
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Realm = void 0;
const WaitTask_js_1 = require("../common/WaitTask.js");
const disposable_js_1 = require("../util/disposable.js");
/**
 * @public
 */
class Realm {
    /** @internal */
    timeoutSettings;
    /** @internal */
    taskManager = new WaitTask_js_1.TaskManager();
    /** @internal */
    constructor(timeoutSettings) {
        this.timeoutSettings = timeoutSettings;
    }
    /**
     * Waits for a function to return a truthy value when evaluated in
     * the realm's context.
     *
     * Arguments can be passed from Node.js to `pageFunction`.
     *
     * @example
     *
     * ```ts
     * const selector = '.foo';
     * await realm.waitForFunction(
     *   selector => !!document.querySelector(selector),
     *   {},
     *   selector,
     * );
     * ```
     *
     * @param pageFunction - A function to evaluate in the realm.
     * @param options - Options for polling and timeouts.
     * @param args - Arguments to pass to the function.
     * @returns A promise that resolves when the function returns a truthy
     * value.
     * @public
     */
    async waitForFunction(pageFunction, options = {}, ...args) {
        const { polling = 'raf', timeout = this.timeoutSettings.timeout(), root, signal, } = options;
        if (typeof polling === 'number' && polling < 0) {
            throw new Error('Cannot poll with non-positive interval');
        }
        const waitTask = new WaitTask_js_1.WaitTask(this, {
            polling,
            root,
            timeout,
            signal,
        }, pageFunction, ...args);
        return await waitTask.result;
    }
    /** @internal */
    get disposed() {
        return this.#disposed;
    }
    #disposed = false;
    /** @internal */
    dispose() {
        this.#disposed = true;
        this.taskManager.terminateAll(new Error('waitForFunction failed: frame got detached.'));
    }
    /** @internal */
    [disposable_js_1.disposeSymbol]() {
        this.dispose();
    }
}
exports.Realm = Realm;
//# sourceMappingURL=Realm.js.map
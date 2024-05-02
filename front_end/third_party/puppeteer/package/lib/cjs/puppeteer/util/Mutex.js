"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mutex = void 0;
/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
const Deferred_js_1 = require("./Deferred.js");
const disposable_js_1 = require("./disposable.js");
/**
 * @internal
 */
class Mutex {
    static Guard = class Guard {
        #mutex;
        constructor(mutex) {
            this.#mutex = mutex;
        }
        [disposable_js_1.disposeSymbol]() {
            return this.#mutex.release();
        }
    };
    #locked = false;
    #acquirers = [];
    // This is FIFO.
    async acquire() {
        if (!this.#locked) {
            this.#locked = true;
            return new Mutex.Guard(this);
        }
        const deferred = Deferred_js_1.Deferred.create();
        this.#acquirers.push(deferred.resolve.bind(deferred));
        await deferred.valueOrThrow();
        return new Mutex.Guard(this);
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
exports.Mutex = Mutex;
//# sourceMappingURL=Mutex.js.map
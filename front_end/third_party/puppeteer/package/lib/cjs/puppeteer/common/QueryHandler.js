"use strict";
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
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
exports.QueryHandler = void 0;
const ElementHandleSymbol_js_1 = require("../api/ElementHandleSymbol.js");
const ErrorLike_js_1 = require("../util/ErrorLike.js");
const Function_js_1 = require("../util/Function.js");
const HandleIterator_js_1 = require("./HandleIterator.js");
const LazyArg_js_1 = require("./LazyArg.js");
/**
 * @internal
 */
class QueryHandler {
    // Either one of these may be implemented, but at least one must be.
    static querySelectorAll;
    static querySelector;
    static get _querySelector() {
        if (this.querySelector) {
            return this.querySelector;
        }
        if (!this.querySelectorAll) {
            throw new Error('Cannot create default `querySelector`.');
        }
        return (this.querySelector = (0, Function_js_1.interpolateFunction)(async (node, selector, PuppeteerUtil) => {
            const querySelectorAll = PLACEHOLDER('querySelectorAll');
            const results = querySelectorAll(node, selector, PuppeteerUtil);
            for await (const result of results) {
                return result;
            }
            return null;
        }, {
            querySelectorAll: (0, Function_js_1.stringifyFunction)(this.querySelectorAll),
        }));
    }
    static get _querySelectorAll() {
        if (this.querySelectorAll) {
            return this.querySelectorAll;
        }
        if (!this.querySelector) {
            throw new Error('Cannot create default `querySelectorAll`.');
        }
        return (this.querySelectorAll = (0, Function_js_1.interpolateFunction)(async function* (node, selector, PuppeteerUtil) {
            const querySelector = PLACEHOLDER('querySelector');
            const result = await querySelector(node, selector, PuppeteerUtil);
            if (result) {
                yield result;
            }
        }, {
            querySelector: (0, Function_js_1.stringifyFunction)(this.querySelector),
        }));
    }
    /**
     * Queries for multiple nodes given a selector and {@link ElementHandle}.
     *
     * Akin to {@link https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll | Document.querySelectorAll()}.
     */
    static async *queryAll(element, selector) {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            const handle = __addDisposableResource(env_1, await element.evaluateHandle(this._querySelectorAll, selector, LazyArg_js_1.LazyArg.create(context => {
                return context.puppeteerUtil;
            })), false);
            yield* (0, HandleIterator_js_1.transposeIterableHandle)(handle);
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            __disposeResources(env_1);
        }
    }
    /**
     * Queries for a single node given a selector and {@link ElementHandle}.
     *
     * Akin to {@link https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector}.
     */
    static async queryOne(element, selector) {
        const env_2 = { stack: [], error: void 0, hasError: false };
        try {
            const result = __addDisposableResource(env_2, await element.evaluateHandle(this._querySelector, selector, LazyArg_js_1.LazyArg.create(context => {
                return context.puppeteerUtil;
            })), false);
            if (!(ElementHandleSymbol_js_1._isElementHandle in result)) {
                return null;
            }
            return result.move();
        }
        catch (e_2) {
            env_2.error = e_2;
            env_2.hasError = true;
        }
        finally {
            __disposeResources(env_2);
        }
    }
    /**
     * Waits until a single node appears for a given selector and
     * {@link ElementHandle}.
     *
     * This will always query the handle in the Puppeteer world and migrate the
     * result to the main world.
     */
    static async waitFor(elementOrFrame, selector, options) {
        const env_3 = { stack: [], error: void 0, hasError: false };
        try {
            let frame;
            const element = __addDisposableResource(env_3, await (async () => {
                if (!(ElementHandleSymbol_js_1._isElementHandle in elementOrFrame)) {
                    frame = elementOrFrame;
                    return;
                }
                frame = elementOrFrame.frame;
                return await frame.isolatedRealm().adoptHandle(elementOrFrame);
            })(), false);
            const { visible = false, hidden = false, timeout, signal } = options;
            try {
                const env_4 = { stack: [], error: void 0, hasError: false };
                try {
                    signal?.throwIfAborted();
                    const handle = __addDisposableResource(env_4, await frame.isolatedRealm().waitForFunction(async (PuppeteerUtil, query, selector, root, visible) => {
                        const querySelector = PuppeteerUtil.createFunction(query);
                        const node = await querySelector(root ?? document, selector, PuppeteerUtil);
                        return PuppeteerUtil.checkVisibility(node, visible);
                    }, {
                        polling: visible || hidden ? 'raf' : 'mutation',
                        root: element,
                        timeout,
                        signal,
                    }, LazyArg_js_1.LazyArg.create(context => {
                        return context.puppeteerUtil;
                    }), (0, Function_js_1.stringifyFunction)(this._querySelector), selector, element, visible ? true : hidden ? false : undefined), false);
                    if (signal?.aborted) {
                        throw signal.reason;
                    }
                    if (!(ElementHandleSymbol_js_1._isElementHandle in handle)) {
                        return null;
                    }
                    return await frame.mainRealm().transferHandle(handle);
                }
                catch (e_3) {
                    env_4.error = e_3;
                    env_4.hasError = true;
                }
                finally {
                    __disposeResources(env_4);
                }
            }
            catch (error) {
                if (!(0, ErrorLike_js_1.isErrorLike)(error)) {
                    throw error;
                }
                if (error.name === 'AbortError') {
                    throw error;
                }
                error.message = `Waiting for selector \`${selector}\` failed: ${error.message}`;
                throw error;
            }
        }
        catch (e_4) {
            env_3.error = e_4;
            env_3.hasError = true;
        }
        finally {
            __disposeResources(env_3);
        }
    }
}
exports.QueryHandler = QueryHandler;
//# sourceMappingURL=QueryHandler.js.map
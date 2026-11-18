var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
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
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { JSHandle } from '../api/JSHandle.js';
import { DEBUG_PREFIXES } from '../common/Debug.js';
import { DisposableStack } from '../util/disposable.js';
import { isErrorLike } from '../util/ErrorLike.js';
import { CDP_BINDING_PREFIX } from './utils.js';
/**
 * @internal
 */
export class Binding {
    #name;
    #fn;
    #initSource;
    #logger;
    #ownsArguments;
    #ownsResult;
    constructor(name, fn, initSource, logger, options = {}) {
        this.#name = name;
        this.#fn = fn;
        this.#initSource = initSource;
        this.#logger = logger;
        this.#ownsArguments = options.ownsArguments ?? false;
        this.#ownsResult = options.ownsResult ?? false;
    }
    get name() {
        return this.#name;
    }
    get initSource() {
        return this.#initSource;
    }
    /**
     * @param context - Context to run the binding in; the context should have
     * the binding added to it beforehand.
     * @param id - ID of the call. This should come from the CDP
     * `onBindingCalled` response.
     * @param args - Plain arguments from CDP.
     */
    async run(context, id, args, isTrivial) {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            const stack = __addDisposableResource(env_1, new DisposableStack(), false);
            const cdpName = CDP_BINDING_PREFIX + this.#name;
            try {
                if (!isTrivial) {
                    const env_2 = { stack: [], error: void 0, hasError: false };
                    try {
                        // Getting non-trivial arguments.
                        const handles = __addDisposableResource(env_2, await context.evaluateHandle((name, seq) => {
                            // @ts-expect-error Code is evaluated in a different context.
                            return globalThis[name].args.get(seq);
                        }, cdpName, id), false);
                        const properties = await handles.getProperties();
                        for (const [index, handle] of properties) {
                            // This is not straight-forward since some arguments can stringify, but
                            // aren't plain objects so add subtypes when the use-case arises.
                            if (index in args && handle.remoteObject().subtype === 'node') {
                                args[+index] = handle;
                                // Exposed functions can retain node arguments beyond this call.
                                if (!this.#ownsArguments) {
                                    continue;
                                }
                            }
                            stack.use(handle);
                        }
                    }
                    catch (e_1) {
                        env_2.error = e_1;
                        env_2.hasError = true;
                    }
                    finally {
                        __disposeResources(env_2);
                    }
                }
                const result = await this.#fn(...args);
                if (this.#ownsResult && result instanceof JSHandle) {
                    stack.use(result);
                }
                await context.evaluate((name, seq, result) => {
                    // @ts-expect-error Code is evaluated in a different context.
                    const callbacks = globalThis[name].callbacks;
                    callbacks.get(seq).resolve(result);
                    callbacks.delete(seq);
                }, cdpName, id, result);
            }
            catch (error) {
                if (isErrorLike(error)) {
                    await context
                        .evaluate((name, seq, message, stack) => {
                        const error = new Error(message);
                        error.stack = stack;
                        // @ts-expect-error Code is evaluated in a different context.
                        const callbacks = globalThis[name].callbacks;
                        callbacks.get(seq).reject(error);
                        callbacks.delete(seq);
                    }, cdpName, id, error.message, error.stack)
                        .catch(error => {
                        this.#logger?.(DEBUG_PREFIXES.error)?.(error);
                    });
                }
                else {
                    await context
                        .evaluate((name, seq, error) => {
                        // @ts-expect-error Code is evaluated in a different context.
                        const callbacks = globalThis[name].callbacks;
                        callbacks.get(seq).reject(error);
                        callbacks.delete(seq);
                    }, cdpName, id, error)
                        .catch(error => {
                        this.#logger?.(DEBUG_PREFIXES.error)?.(error);
                    });
                }
            }
        }
        catch (e_2) {
            env_1.error = e_2;
            env_1.hasError = true;
        }
        finally {
            __disposeResources(env_1);
        }
    }
}
//# sourceMappingURL=Binding.js.map
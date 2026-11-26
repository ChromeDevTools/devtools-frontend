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
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { CDPSessionEvent } from '../api/CDPSession.js';
import { TargetCloseError } from '../common/Errors.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { getReadableAsTypedArray, getReadableFromProtocolStream, } from '../common/util.js';
import { assert } from '../util/assert.js';
import { Deferred } from '../util/Deferred.js';
import { DisposableStack } from '../util/disposable.js';
import { isErrorLike } from '../util/ErrorLike.js';
/**
 * The Tracing class exposes the tracing audit interface.
 * @remarks
 * You can use `tracing.start` and `tracing.stop` to create a trace file
 * which can be opened in Chrome DevTools or {@link https://chromedevtools.github.io/timeline-viewer/ | timeline viewer}.
 *
 * @example
 *
 * ```ts
 * await page.tracing.start({path: 'trace.json'});
 * await page.goto('https://www.google.com');
 * await page.tracing.stop();
 * ```
 *
 * @public
 */
export class Tracing {
    #client;
    #recording = false;
    #path;
    #logger;
    /**
     * @internal
     */
    constructor(client, logger) {
        this.#client = client;
        this.#logger = logger;
    }
    /**
     * @internal
     */
    updateClient(client) {
        this.#client = client;
    }
    /**
     * Starts a trace for the current page.
     * @remarks
     * Only one trace can be active at a time per browser.
     *
     * @param options - Optional `TracingOptions`.
     */
    async start(options = {}) {
        assert(!this.#recording, 'Cannot start recording trace while already recording trace.');
        const defaultCategories = [
            '-*',
            'devtools.timeline',
            'v8.execute',
            'disabled-by-default-devtools.timeline',
            'disabled-by-default-devtools.timeline.frame',
            'toplevel',
            'blink.console',
            'blink.user_timing',
            'latencyInfo',
            'disabled-by-default-devtools.timeline.stack',
            'disabled-by-default-v8.cpu_profiler',
        ];
        const { path, screenshots = false, categories = defaultCategories, bufferSize, } = options;
        const effectiveCategories = screenshots
            ? [...categories, 'disabled-by-default-devtools.screenshot']
            : categories;
        const excludedCategories = effectiveCategories
            .filter(cat => {
            return cat.startsWith('-');
        })
            .map(cat => {
            return cat.slice(1);
        });
        const includedCategories = effectiveCategories.filter(cat => {
            return !cat.startsWith('-');
        });
        this.#path = path;
        this.#recording = true;
        try {
            await this.#client.send('Tracing.start', {
                transferMode: 'ReturnAsStream',
                traceConfig: {
                    excludedCategories,
                    includedCategories,
                    traceBufferSizeInKb: bufferSize,
                },
            });
        }
        catch (error) {
            this.#recording = false;
            this.#path = undefined;
            throw error;
        }
    }
    /**
     * Stops a trace started with the `start` method.
     * @returns Promise which resolves to buffer with trace data.
     */
    async stop() {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            const contentDeferred = Deferred.create();
            const client = this.#client;
            const stack = __addDisposableResource(env_1, new DisposableStack(), false);
            const clientEmitter = stack.use(new EventEmitter(client));
            clientEmitter.once('Tracing.tracingComplete', async (event) => {
                try {
                    assert(event.stream, 'Missing "stream"');
                    const readable = await getReadableFromProtocolStream(client, event.stream);
                    const typedArray = await getReadableAsTypedArray(readable, this.#path, this.#logger);
                    contentDeferred.resolve(typedArray ?? undefined);
                }
                catch (error) {
                    if (isErrorLike(error)) {
                        contentDeferred.reject(error);
                    }
                    else {
                        contentDeferred.reject(new Error(`Unknown error: ${error}`));
                    }
                }
            });
            clientEmitter.once(CDPSessionEvent.Disconnected, () => {
                contentDeferred.reject(new TargetCloseError('Tracing failed: Target closed.'));
            });
            try {
                await client.send('Tracing.end');
            }
            finally {
                this.#recording = false;
            }
            return await contentDeferred.valueOrThrow();
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            __disposeResources(env_1);
        }
    }
}
//# sourceMappingURL=Tracing.js.map
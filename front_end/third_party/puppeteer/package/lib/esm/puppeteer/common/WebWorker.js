import { Deferred } from '../util/Deferred.js';
import { EventEmitter } from './EventEmitter.js';
import { ExecutionContext } from './ExecutionContext.js';
import { CDPJSHandle } from './JSHandle.js';
import { debugError, withSourcePuppeteerURLIfNone } from './util.js';
/**
 * This class represents a
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API | WebWorker}.
 *
 * @remarks
 * The events `workercreated` and `workerdestroyed` are emitted on the page
 * object to signal the worker lifecycle.
 *
 * @example
 *
 * ```ts
 * page.on('workercreated', worker =>
 *   console.log('Worker created: ' + worker.url())
 * );
 * page.on('workerdestroyed', worker =>
 *   console.log('Worker destroyed: ' + worker.url())
 * );
 *
 * console.log('Current workers:');
 * for (const worker of page.workers()) {
 *   console.log('  ' + worker.url());
 * }
 * ```
 *
 * @public
 */
export class WebWorker extends EventEmitter {
    #executionContext = Deferred.create();
    #client;
    #url;
    /**
     * @internal
     */
    constructor(client, url, consoleAPICalled, exceptionThrown) {
        super();
        this.#client = client;
        this.#url = url;
        this.#client.once('Runtime.executionContextCreated', async (event) => {
            const context = new ExecutionContext(client, event.context);
            this.#executionContext.resolve(context);
        });
        this.#client.on('Runtime.consoleAPICalled', async (event) => {
            try {
                const context = await this.#executionContext.valueOrThrow();
                return consoleAPICalled(event.type, event.args.map((object) => {
                    return new CDPJSHandle(context, object);
                }), event.stackTrace);
            }
            catch (err) {
                debugError(err);
            }
        });
        this.#client.on('Runtime.exceptionThrown', exception => {
            return exceptionThrown(exception.exceptionDetails);
        });
        // This might fail if the target is closed before we receive all execution contexts.
        this.#client.send('Runtime.enable').catch(debugError);
    }
    /**
     * @internal
     */
    async executionContext() {
        return this.#executionContext.valueOrThrow();
    }
    /**
     * The URL of this web worker.
     */
    url() {
        return this.#url;
    }
    /**
     * The CDP session client the WebWorker belongs to.
     */
    get client() {
        return this.#client;
    }
    /**
     * If the function passed to the `worker.evaluate` returns a Promise, then
     * `worker.evaluate` would wait for the promise to resolve and return its
     * value. If the function passed to the `worker.evaluate` returns a
     * non-serializable value, then `worker.evaluate` resolves to `undefined`.
     * DevTools Protocol also supports transferring some additional values that
     * are not serializable by `JSON`: `-0`, `NaN`, `Infinity`, `-Infinity`, and
     * bigint literals.
     * Shortcut for `await worker.executionContext()).evaluate(pageFunction, ...args)`.
     *
     * @param pageFunction - Function to be evaluated in the worker context.
     * @param args - Arguments to pass to `pageFunction`.
     * @returns Promise which resolves to the return value of `pageFunction`.
     */
    async evaluate(pageFunction, ...args) {
        pageFunction = withSourcePuppeteerURLIfNone(this.evaluate.name, pageFunction);
        const context = await this.#executionContext.valueOrThrow();
        return context.evaluate(pageFunction, ...args);
    }
    /**
     * The only difference between `worker.evaluate` and `worker.evaluateHandle`
     * is that `worker.evaluateHandle` returns in-page object (JSHandle). If the
     * function passed to the `worker.evaluateHandle` returns a `Promise`, then
     * `worker.evaluateHandle` would wait for the promise to resolve and return
     * its value. Shortcut for
     * `await worker.executionContext()).evaluateHandle(pageFunction, ...args)`
     *
     * @param pageFunction - Function to be evaluated in the page context.
     * @param args - Arguments to pass to `pageFunction`.
     * @returns Promise which resolves to the return value of `pageFunction`.
     */
    async evaluateHandle(pageFunction, ...args) {
        pageFunction = withSourcePuppeteerURLIfNone(this.evaluateHandle.name, pageFunction);
        const context = await this.#executionContext.valueOrThrow();
        return context.evaluateHandle(pageFunction, ...args);
    }
}
//# sourceMappingURL=WebWorker.js.map
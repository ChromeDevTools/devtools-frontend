/**
 * @license
 * Copyright 2018 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { UnsupportedOperation } from '../common/Errors.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { TimeoutSettings } from '../common/TimeoutSettings.js';
import { withSourcePuppeteerURLIfNone } from '../common/util.js';
/**
 * @public
 */
export var WebWorkerEvent;
(function (WebWorkerEvent) {
    /**
     * Emitted when the worker calls a console API.
     */
    WebWorkerEvent["Console"] = "console";
    /**
     * Emitted when the worker throws an exception.
     *
     * @deprecated Use {@link WebWorkerEvent.Exception} instead.
     */
    WebWorkerEvent["Error"] = "error";
    /**
     * Emitted when an uncaught exception happens within the worker. Contains a
     * {@link RemoteException}.
     *
     * @remarks
     * The {@link RemoteException.handle | handle} of the exception is disposed
     * right after the event has been dispatched. Call `move()` on it
     * synchronously inside the listener to keep it alive.
     */
    WebWorkerEvent["Exception"] = "exception";
    /**
     * Emitted when the worker issues a request. Contains a {@link HTTPRequest}.
     *
     * @remarks
     * Only supported with CDP. With WebDriver BiDi these events are never
     * emitted.
     *
     * For service workers and shared workers, network events are only
     * delivered once a {@link WebWorker} instance exists, i.e. after
     * {@link Target.worker} has been called. Requests issued before that,
     * such as requests made while a service worker starts up, are not
     * reported.
     *
     * Listeners are bound to this worker instance: if the worker is terminated
     * and restarted (e.g. an idle extension service worker), a new
     * {@link WebWorker} is created and listeners must be re-attached.
     *
     * Requests issued by service workers and shared workers cannot be
     * intercepted: `request.continue()`, `abort()` and `respond()` throw.
     *
     * @experimental
     */
    WebWorkerEvent["Request"] = "request";
    /**
     * Emitted when a request issued by the worker is served from cache.
     * Contains a {@link HTTPRequest}.
     *
     * @remarks
     * The same delivery rules as for {@link WebWorkerEvent.Request} apply.
     *
     * @experimental
     */
    WebWorkerEvent["RequestServedFromCache"] = "requestservedfromcache";
    /**
     * Emitted when a response is received for a request issued by the worker.
     * Contains a {@link HTTPResponse}.
     *
     * @remarks
     * The same delivery rules as for {@link WebWorkerEvent.Request} apply.
     *
     * @experimental
     */
    WebWorkerEvent["Response"] = "response";
    /**
     * Emitted when a request issued by the worker fails. Contains a
     * {@link HTTPRequest}.
     *
     * @remarks
     * The same delivery rules as for {@link WebWorkerEvent.Request} apply.
     *
     * @experimental
     */
    WebWorkerEvent["RequestFailed"] = "requestfailed";
    /**
     * Emitted when a request issued by the worker finishes successfully.
     * Contains a {@link HTTPRequest}.
     *
     * @remarks
     * The same delivery rules as for {@link WebWorkerEvent.Request} apply.
     *
     * @experimental
     */
    WebWorkerEvent["RequestFinished"] = "requestfinished";
})(WebWorkerEvent || (WebWorkerEvent = {}));
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
 *   console.log('Worker created: ' + worker.url()),
 * );
 * page.on('workerdestroyed', worker =>
 *   console.log('Worker destroyed: ' + worker.url()),
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
    /**
     * @internal
     */
    timeoutSettings = new TimeoutSettings();
    #url;
    /**
     * @internal
     */
    constructor(url) {
        super();
        this.#url = url;
    }
    /**
     * The URL of this web worker.
     */
    url() {
        return this.#url;
    }
    /**
     * Evaluates a given function in the {@link WebWorker | worker}.
     *
     * @remarks If the given function returns a promise,
     * {@link WebWorker.evaluate | evaluate} will wait for the promise to resolve.
     *
     * As a rule of thumb, if the return value of the given function is more
     * complicated than a JSON object (e.g. most classes), then
     * {@link WebWorker.evaluate | evaluate} will _likely_ return some truncated
     * value (or `{}`). This is because we are not returning the actual return
     * value, but a deserialized version as a result of transferring the return
     * value through a protocol to Puppeteer.
     *
     * In general, you should use
     * {@link WebWorker.evaluateHandle | evaluateHandle} if
     * {@link WebWorker.evaluate | evaluate} cannot serialize the return value
     * properly or you need a mutable {@link JSHandle | handle} to the return
     * object.
     *
     * @param func - Function to be evaluated.
     * @param args - Arguments to pass into `func`.
     * @returns The result of `func`.
     */
    async evaluate(func, ...args) {
        func = withSourcePuppeteerURLIfNone(this.evaluate.name, func);
        return await this.mainRealm().evaluate(func, ...args);
    }
    /**
     * Evaluates a given function in the {@link WebWorker | worker}.
     *
     * @remarks If the given function returns a promise,
     * {@link WebWorker.evaluate | evaluate} will wait for the promise to resolve.
     *
     * In general, you should use
     * {@link WebWorker.evaluateHandle | evaluateHandle} if
     * {@link WebWorker.evaluate | evaluate} cannot serialize the return value
     * properly or you need a mutable {@link JSHandle | handle} to the return
     * object.
     *
     * @param func - Function to be evaluated.
     * @param args - Arguments to pass into `func`.
     * @returns A {@link JSHandle | handle} to the return value of `func`.
     */
    async evaluateHandle(func, ...args) {
        func = withSourcePuppeteerURLIfNone(this.evaluateHandle.name, func);
        return await this.mainRealm().evaluateHandle(func, ...args);
    }
    /**
     * Waits for the provided function, `workerFunction`, to return a truthy value when
     * evaluated in the page's context.
     *
     * @param workerFunction - Function to be evaluated in browser context until it
     * returns a truthy value.
     * @param options - Options for configuring waiting behavior.
     */
    waitForFunction(workerFunction, options = {}, ...args) {
        return this.mainRealm().waitForFunction(workerFunction, {
            polling: 100,
            ...options,
        }, ...args);
    }
    async close() {
        throw new UnsupportedOperation('WebWorker.close() is not supported');
    }
}
//# sourceMappingURL=WebWorker.js.map
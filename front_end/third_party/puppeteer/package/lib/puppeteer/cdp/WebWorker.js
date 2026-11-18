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
import { CDPSessionEvent } from '../api/CDPSession.js';
import { TargetType } from '../api/Target.js';
import { WebWorker, WebWorkerEvent, } from '../api/WebWorker.js';
import { DEBUG_PREFIXES } from '../common/Debug.js';
import { TargetCloseError } from '../common/Errors.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { NetworkManagerEvent } from '../common/NetworkManagerEvents.js';
import { TimeoutSettings } from '../common/TimeoutSettings.js';
import { Deferred } from '../util/Deferred.js';
import { ExecutionContext } from './ExecutionContext.js';
import { IsolatedWorld } from './IsolatedWorld.js';
import { MAIN_WORLD } from './IsolatedWorlds.js';
import { releaseObject } from './JSHandle.js';
import { NetworkManager } from './NetworkManager.js';
import { createConsoleMessage, createRemoteException } from './utils.js';
/**
 * @internal
 */
export class CdpWebWorker extends WebWorker {
    #world;
    #client;
    #id;
    #targetType;
    #logger;
    #hasOwnerExceptionListeners;
    #emitter;
    #workerLoaded = new Deferred();
    get internalEmitter() {
        return this.#emitter;
    }
    constructor(client, target, exceptionThrown, logger, networkManager, hasOwnerExceptionListeners = () => {
        return false;
    }) {
        super(target.url());
        this.#id = target._targetId;
        this.#client = client;
        this.#logger = logger;
        this.#hasOwnerExceptionListeners = hasOwnerExceptionListeners;
        this.#targetType = target.type();
        this.#world = new IsolatedWorld(this, new TimeoutSettings(), MAIN_WORLD, logger);
        this.#emitter = new EventEmitter(undefined, logger);
        this.#client.once('Runtime.executionContextCreated', async (event) => {
            this.#world.setContext(new ExecutionContext(client, event.context, this.#world, logger));
        });
        this.#client.once('Inspector.workerScriptLoaded', () => {
            this.#workerLoaded.resolve();
        });
        this.#world.emitter.on('consoleapicalled', async (event) => {
            try {
                const values = event.args.map(arg => {
                    return this.#world.createCdpHandle(arg);
                });
                const noInternalListeners = this.#emitter.listenerCount(WebWorkerEvent.Console) === 0;
                const noWorkerListeners = this.listenerCount(WebWorkerEvent.Console) === 0;
                if (noInternalListeners && noWorkerListeners) {
                    // eslint-disable-next-line max-len -- The comment is long.
                    // eslint-disable-next-line @puppeteer/use-using -- These are not owned by this function.
                    for (const value of values) {
                        void value.dispose().catch((err) => {
                            return this.#logger?.(DEBUG_PREFIXES.error)?.(err);
                        });
                    }
                    return;
                }
                const consoleMessages = createConsoleMessage(event, values, this.#id, undefined, this);
                this.#emitter.emit(WebWorkerEvent.Console, consoleMessages);
                if (!noWorkerListeners) {
                    this.emit(WebWorkerEvent.Console, consoleMessages);
                }
            }
            catch (err) {
                this.#logger?.(DEBUG_PREFIXES.error)?.(err);
            }
        });
        this.#client.on('Runtime.exceptionThrown', event => {
            exceptionThrown(event);
            this.#onException(event);
        });
        this.#client.once(CDPSessionEvent.Disconnected, () => {
            // The worker might be destroyed before its script loads (e.g. a 404
            // script), in which case `Inspector.workerScriptLoaded` never fires.
            this.#workerLoaded.reject(new TargetCloseError('Worker was closed before its script finished loading'));
            this.#world.dispose();
        });
        const netManager = networkManager ?? this.#createOwnNetworkManager(target, logger);
        // This might fail if the target is closed before we receive all execution contexts.
        netManager.addClient(this.#client).catch((err) => {
            return this.#logger?.(DEBUG_PREFIXES.error)?.(err);
        });
        // Must run after addClient(): addClient() synchronously registers the
        // manager's Disconnected listener, which emits RequestFailed for pending
        // requests (NetworkManager#removeClient). #forwardNetworkEvents()
        // registers a later Disconnected listener that stops forwarding, so the
        // opposite order would drop those RequestFailed events.
        this.#forwardNetworkEvents(netManager);
        this.#client.send('Runtime.enable').catch((err) => {
            return this.#logger?.(DEBUG_PREFIXES.error)?.(err);
        });
    }
    /**
     * Network manager for workers that are not owned by a page (service and
     * shared workers). It only tracks this worker's session.
     */
    #createOwnNetworkManager(target, logger) {
        return new NetworkManager({
            frame: () => {
                return null;
            },
            worker: client => {
                return client === this.#client ? this : null;
            },
            browser: () => {
                return target.browser();
            },
        }, target.browser().isNetworkEnabled(), logger);
    }
    /**
     * Utility method to check if the request is owned by the current WebWorker
     */
    #isOwn(request) {
        return request.worker() === this;
    }
    /**
     * Re-emits network events that belong to this worker. The network manager
     * may be shared with a page (dedicated workers), so events are filtered by
     * `request.worker()`.
     */
    #forwardNetworkEvents(networkManager) {
        const emitter = new EventEmitter(networkManager);
        emitter.on(NetworkManagerEvent.Request, request => {
            if (this.#isOwn(request)) {
                this.emit(WebWorkerEvent.Request, request);
            }
        });
        emitter.on(NetworkManagerEvent.RequestServedFromCache, request => {
            if (this.#isOwn(request)) {
                this.emit(WebWorkerEvent.RequestServedFromCache, request);
            }
        });
        emitter.on(NetworkManagerEvent.Response, response => {
            if (this.#isOwn(response.request())) {
                this.emit(WebWorkerEvent.Response, response);
            }
        });
        emitter.on(NetworkManagerEvent.RequestFailed, request => {
            if (this.#isOwn(request)) {
                this.emit(WebWorkerEvent.RequestFailed, request);
            }
        });
        emitter.on(NetworkManagerEvent.RequestFinished, request => {
            if (this.#isOwn(request)) {
                this.emit(WebWorkerEvent.RequestFinished, request);
            }
        });
        this.#client.once(CDPSessionEvent.Disconnected, () => {
            emitter.removeAllListeners();
        });
    }
    #onException(event) {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            const details = event.exceptionDetails;
            if (this.listenerCount(WebWorkerEvent.Exception) === 0 &&
                !this.#hasOwnerExceptionListeners()) {
                // Nobody can use a handle, but the browser keeps the exception alive
                // until it is released.
                if (details.exception) {
                    void releaseObject(this.#client, details.exception, this.#logger);
                }
                return;
            }
            // Disposed when this scope ends, i.e. right after dispatch. This is a no-op
            // if a listener called `move()` on the handle.
            const handle = __addDisposableResource(env_1, details.exception?.objectId
                ? this.#world.createCdpHandle(details.exception)
                : undefined, false);
            const exception = createRemoteException(details, handle);
            // Emitted internally first so that the page can forward it before the
            // handle is disposed.
            this.#emitter.emit(WebWorkerEvent.Exception, exception);
            this.emit(WebWorkerEvent.Exception, exception);
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            __disposeResources(env_1);
        }
    }
    mainRealm() {
        return this.#world;
    }
    get client() {
        return this.#client;
    }
    async close() {
        switch (this.#targetType) {
            case TargetType.SERVICE_WORKER: {
                // For service workers we need to close the target and detach to allow
                // the worker to stop.
                await this.client.connection()?.send('Target.closeTarget', {
                    targetId: this.#id,
                });
                await this.client.connection()?.send('Target.detachFromTarget', {
                    sessionId: this.client.id(),
                });
                break;
            }
            case TargetType.SHARED_WORKER: {
                await this.client.connection()?.send('Target.closeTarget', {
                    targetId: this.#id,
                });
                break;
            }
            default:
                // Dedicated workers do not support `Target.closeTarget`. Evaluate on
                // the realm directly so that closing does not wait for the worker
                // script to load.
                await this.#world.evaluate(() => {
                    self.close();
                });
        }
    }
    async evaluate(func, ...args) {
        await this.#workerLoaded.valueOrThrow();
        return await super.evaluate(func, ...args);
    }
    async evaluateHandle(func, ...args) {
        await this.#workerLoaded.valueOrThrow();
        return await super.evaluateHandle(func, ...args);
    }
}
//# sourceMappingURL=WebWorker.js.map
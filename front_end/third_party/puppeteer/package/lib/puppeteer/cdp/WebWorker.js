import { CDPSessionEvent } from '../api/CDPSession.js';
import { TargetType } from '../api/Target.js';
import { WebWorker, WebWorkerEvent, } from '../api/WebWorker.js';
import { DEBUG_PREFIXES } from '../common/Debug.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { TimeoutSettings } from '../common/TimeoutSettings.js';
import { Deferred } from '../util/Deferred.js';
import { ExecutionContext } from './ExecutionContext.js';
import { IsolatedWorld } from './IsolatedWorld.js';
import { MAIN_WORLD } from './IsolatedWorlds.js';
import { createConsoleMessage } from './utils.js';
/**
 * @internal
 */
export class CdpWebWorker extends WebWorker {
    #world;
    #client;
    #id;
    #targetType;
    #logger;
    #emitter;
    #workerLoaded = new Deferred();
    get internalEmitter() {
        return this.#emitter;
    }
    constructor(client, url, targetId, targetType, exceptionThrown, networkManager, logger) {
        super(url);
        this.#id = targetId;
        this.#client = client;
        this.#logger = logger;
        this.#targetType = targetType;
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
                const consoleMessages = createConsoleMessage(event, values, this.#id);
                this.#emitter.emit(WebWorkerEvent.Console, consoleMessages);
                if (!noWorkerListeners) {
                    this.emit(WebWorkerEvent.Console, consoleMessages);
                }
            }
            catch (err) {
                this.#logger?.(DEBUG_PREFIXES.error)?.(err);
            }
        });
        this.#client.on('Runtime.exceptionThrown', exceptionThrown);
        this.#client.once(CDPSessionEvent.Disconnected, () => {
            this.#world.dispose();
        });
        // This might fail if the target is closed before we receive all execution contexts.
        networkManager?.addClient(this.#client).catch((err) => {
            return this.#logger?.(DEBUG_PREFIXES.error)?.(err);
        });
        this.#client.send('Runtime.enable').catch((err) => {
            return this.#logger?.(DEBUG_PREFIXES.error)?.(err);
        });
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
                await this.evaluate(() => {
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
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdpWebWorker = void 0;
const CDPSession_js_1 = require("../api/CDPSession.js");
const Target_js_1 = require("../api/Target.js");
const WebWorker_js_1 = require("../api/WebWorker.js");
const EventEmitter_js_1 = require("../common/EventEmitter.js");
const TimeoutSettings_js_1 = require("../common/TimeoutSettings.js");
const util_js_1 = require("../common/util.js");
const ExecutionContext_js_1 = require("./ExecutionContext.js");
const IsolatedWorld_js_1 = require("./IsolatedWorld.js");
const IsolatedWorlds_js_1 = require("./IsolatedWorlds.js");
const utils_js_1 = require("./utils.js");
/**
 * @internal
 */
class CdpWebWorker extends WebWorker_js_1.WebWorker {
    #world;
    #client;
    #id;
    #targetType;
    #emitter;
    get internalEmitter() {
        return this.#emitter;
    }
    constructor(client, url, targetId, targetType, exceptionThrown, networkManager) {
        super(url);
        this.#id = targetId;
        this.#client = client;
        this.#targetType = targetType;
        this.#world = new IsolatedWorld_js_1.IsolatedWorld(this, new TimeoutSettings_js_1.TimeoutSettings(), IsolatedWorlds_js_1.MAIN_WORLD);
        this.#emitter = new EventEmitter_js_1.EventEmitter();
        this.#client.once('Runtime.executionContextCreated', async (event) => {
            this.#world.setContext(new ExecutionContext_js_1.ExecutionContext(client, event.context, this.#world));
        });
        this.#world.emitter.on('consoleapicalled', async (event) => {
            try {
                const values = event.args.map(arg => {
                    return this.#world.createCdpHandle(arg);
                });
                const noInternalListeners = this.#emitter.listenerCount(WebWorker_js_1.WebWorkerEvent.Console) === 0;
                const noWorkerListeners = this.listenerCount(WebWorker_js_1.WebWorkerEvent.Console) === 0;
                if (noInternalListeners && noWorkerListeners) {
                    // eslint-disable-next-line max-len -- The comment is long.
                    // eslint-disable-next-line @puppeteer/use-using -- These are not owned by this function.
                    for (const value of values) {
                        void value.dispose().catch(util_js_1.debugError);
                    }
                    return;
                }
                const consoleMessages = (0, utils_js_1.createConsoleMessage)(event, values, this.#id);
                this.#emitter.emit(WebWorker_js_1.WebWorkerEvent.Console, consoleMessages);
                if (!noWorkerListeners) {
                    this.emit(WebWorker_js_1.WebWorkerEvent.Console, consoleMessages);
                }
            }
            catch (err) {
                (0, util_js_1.debugError)(err);
            }
        });
        this.#client.on('Runtime.exceptionThrown', exceptionThrown);
        this.#client.once(CDPSession_js_1.CDPSessionEvent.Disconnected, () => {
            this.#world.dispose();
        });
        // This might fail if the target is closed before we receive all execution contexts.
        networkManager?.addClient(this.#client).catch(util_js_1.debugError);
        this.#client.send('Runtime.enable').catch(util_js_1.debugError);
    }
    mainRealm() {
        return this.#world;
    }
    get client() {
        return this.#client;
    }
    async close() {
        switch (this.#targetType) {
            case Target_js_1.TargetType.SERVICE_WORKER: {
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
            case Target_js_1.TargetType.SHARED_WORKER: {
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
}
exports.CdpWebWorker = CdpWebWorker;
//# sourceMappingURL=WebWorker.js.map
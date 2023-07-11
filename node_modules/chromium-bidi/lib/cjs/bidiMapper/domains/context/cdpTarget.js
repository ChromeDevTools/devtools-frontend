"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdpTarget = void 0;
const logManager_js_1 = require("../log/logManager.js");
const deferred_js_1 = require("../../../utils/deferred.js");
const networkProcessor_js_1 = require("../network/networkProcessor.js");
class CdpTarget {
    #targetId;
    #parentTargetId;
    #cdpClient;
    #cdpSessionId;
    #eventManager;
    #preloadScriptStorage;
    #targetUnblocked;
    #networkDomainActivated;
    static create(targetId, parentTargetId, cdpClient, cdpSessionId, realmStorage, eventManager, preloadScriptStorage) {
        const cdpTarget = new CdpTarget(targetId, parentTargetId, cdpClient, cdpSessionId, eventManager, preloadScriptStorage);
        logManager_js_1.LogManager.create(cdpTarget, realmStorage, eventManager);
        cdpTarget.#setEventListeners();
        // No need to await.
        // Deferred will be resolved when the target is unblocked.
        void cdpTarget.#unblock();
        return cdpTarget;
    }
    constructor(targetId, parentTargetId, cdpClient, cdpSessionId, eventManager, preloadScriptStorage) {
        this.#targetId = targetId;
        this.#parentTargetId = parentTargetId;
        this.#cdpClient = cdpClient;
        this.#cdpSessionId = cdpSessionId;
        this.#eventManager = eventManager;
        this.#preloadScriptStorage = preloadScriptStorage;
        this.#networkDomainActivated = false;
        this.#targetUnblocked = new deferred_js_1.Deferred();
    }
    /** Returns a promise that resolves when the target is unblocked. */
    get targetUnblocked() {
        return this.#targetUnblocked;
    }
    get targetId() {
        return this.#targetId;
    }
    get cdpClient() {
        return this.#cdpClient;
    }
    /**
     * Needed for CDP escape path.
     */
    get cdpSessionId() {
        return this.#cdpSessionId;
    }
    /**
     * Enables all the required CDP domains and unblocks the target.
     */
    async #unblock() {
        try {
            // Enable Network domain, if it is enabled globally.
            // TODO: enable Network domain for OOPiF targets.
            if (this.#eventManager.isNetworkDomainEnabled) {
                await this.enableNetworkDomain();
            }
            await this.#cdpClient.sendCommand('Runtime.enable');
            await this.#cdpClient.sendCommand('Page.enable');
            await this.#cdpClient.sendCommand('Page.setLifecycleEventsEnabled', {
                enabled: true,
            });
            await this.#cdpClient.sendCommand('Target.setAutoAttach', {
                autoAttach: true,
                waitForDebuggerOnStart: true,
                flatten: true,
            });
            await this.#initAndEvaluatePreloadScripts();
            await this.#cdpClient.sendCommand('Runtime.runIfWaitingForDebugger');
        }
        catch (error) {
            // The target might have been closed before the initialization finished.
            if (!this.#cdpClient.isCloseError(error)) {
                throw error;
            }
        }
        this.#targetUnblocked.resolve();
    }
    /**
     * Enables the Network domain (creates NetworkProcessor on the target's cdp
     * client) if it is not enabled yet.
     */
    async enableNetworkDomain() {
        if (!this.#networkDomainActivated) {
            this.#networkDomainActivated = true;
            await networkProcessor_js_1.NetworkProcessor.create(this.cdpClient, this.#eventManager);
        }
    }
    #setEventListeners() {
        this.#cdpClient.on('*', (event, params) => {
            // We may encounter uses for EventEmitter other than CDP events,
            // which we want to skip.
            if (typeof event !== 'string') {
                return;
            }
            this.#eventManager.registerEvent({
                method: `cdp.${event}`,
                params: {
                    event,
                    params: params,
                    session: this.#cdpSessionId,
                },
            }, null);
        });
    }
    /**
     * All the ProxyChannels from all the preload scripts of the given
     * BrowsingContext.
     */
    getChannels(contextId) {
        return this.#preloadScriptStorage
            .findPreloadScripts({
            contextIds: [null, contextId],
        })
            .flatMap((script) => script.channels);
    }
    /** Loads all top-level and parent preload scripts. */
    async #initAndEvaluatePreloadScripts() {
        for (const script of this.#preloadScriptStorage.findPreloadScripts({
            contextIds: [null, this.#parentTargetId],
        })) {
            await script.initInTarget(this);
            // Upon attaching to a new target, schedule running preload scripts right
            // after `Runtime.runIfWaitingForDebugger`, but don't wait for the result.
            script.scheduleEvaluateInTarget(this);
        }
    }
}
exports.CdpTarget = CdpTarget;
//# sourceMappingURL=cdpTarget.js.map
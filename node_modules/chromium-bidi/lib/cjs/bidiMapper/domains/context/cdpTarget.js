"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdpTarget = void 0;
const deferred_js_1 = require("../../../utils/deferred.js");
const logManager_js_1 = require("../log/logManager.js");
const NetworkManager_js_1 = require("../network/NetworkManager.js");
class CdpTarget {
    #targetId;
    #cdpClient;
    #cdpSessionId;
    #eventManager;
    #preloadScriptStorage;
    #targetUnblocked = new deferred_js_1.Deferred();
    static create(targetId, cdpClient, cdpSessionId, realmStorage, eventManager, preloadScriptStorage) {
        const cdpTarget = new CdpTarget(targetId, cdpClient, cdpSessionId, eventManager, preloadScriptStorage);
        logManager_js_1.LogManager.create(cdpTarget, realmStorage, eventManager);
        NetworkManager_js_1.NetworkManager.create(cdpClient, eventManager);
        cdpTarget.#setEventListeners();
        // No need to await.
        // Deferred will be resolved when the target is unblocked.
        void cdpTarget.#unblock();
        return cdpTarget;
    }
    constructor(targetId, cdpClient, cdpSessionId, eventManager, preloadScriptStorage) {
        this.#targetId = targetId;
        this.#cdpClient = cdpClient;
        this.#cdpSessionId = cdpSessionId;
        this.#eventManager = eventManager;
        this.#preloadScriptStorage = preloadScriptStorage;
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
            // Collect all command promises and wait for them after
            // `Runtime.runIfWaitingForDebugger`.
            const promises = [];
            promises.push(this.#cdpClient.sendCommand('Runtime.enable'), this.#cdpClient.sendCommand('Page.enable'), this.#cdpClient.sendCommand('Page.setLifecycleEventsEnabled', {
                enabled: true,
            }), 
            // XXX: #1080: Do not always enable the network domain globally.
            // TODO: enable Network domain for OOPiF targets.
            this.#cdpClient.sendCommand('Network.enable'), this.#cdpClient.sendCommand('Target.setAutoAttach', {
                autoAttach: true,
                waitForDebuggerOnStart: true,
                flatten: true,
            }), this.#initAndEvaluatePreloadScripts());
            await this.#cdpClient.sendCommand('Runtime.runIfWaitingForDebugger');
            await Promise.all(promises);
        }
        catch (error) {
            // The target might have been closed before the initialization finished.
            if (!this.#cdpClient.isCloseError(error)) {
                throw error;
            }
        }
        this.#targetUnblocked.resolve({
            kind: 'success',
            value: undefined,
        });
    }
    #setEventListeners() {
        this.#cdpClient.on('*', (event, params) => {
            // We may encounter uses for EventEmitter other than CDP events,
            // which we want to skip.
            if (typeof event !== 'string') {
                return;
            }
            this.#eventManager.registerEvent({
                type: 'event',
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
    getChannels() {
        return this.#preloadScriptStorage
            .findPreloadScripts()
            .flatMap((script) => script.channels);
    }
    /** Loads all top-level preload scripts. */
    async #initAndEvaluatePreloadScripts() {
        for (const script of this.#preloadScriptStorage.findPreloadScripts()) {
            await script.initInTarget(this, true);
        }
    }
}
exports.CdpTarget = CdpTarget;
//# sourceMappingURL=cdpTarget.js.map
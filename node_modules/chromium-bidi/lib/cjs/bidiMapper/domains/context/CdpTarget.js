"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdpTarget = void 0;
const Deferred_js_1 = require("../../../utils/Deferred.js");
const LogManager_js_1 = require("../log/LogManager.js");
const NetworkManager_js_1 = require("../network/NetworkManager.js");
class CdpTarget {
    #id;
    #cdpClient;
    #browserCdpClient;
    #eventManager;
    #preloadScriptStorage;
    #networkStorage;
    #targetUnblocked = new Deferred_js_1.Deferred();
    #acceptInsecureCerts;
    static create(targetId, cdpClient, browserCdpClient, realmStorage, eventManager, preloadScriptStorage, networkStorage, acceptInsecureCerts, logger) {
        const cdpTarget = new CdpTarget(targetId, cdpClient, browserCdpClient, eventManager, preloadScriptStorage, networkStorage, acceptInsecureCerts);
        LogManager_js_1.LogManager.create(cdpTarget, realmStorage, eventManager, logger);
        NetworkManager_js_1.NetworkManager.create(cdpTarget, eventManager, networkStorage);
        cdpTarget.#setEventListeners();
        // No need to await.
        // Deferred will be resolved when the target is unblocked.
        void cdpTarget.#unblock();
        return cdpTarget;
    }
    constructor(targetId, cdpClient, browserCdpClient, eventManager, preloadScriptStorage, networkStorage, acceptInsecureCerts) {
        this.#id = targetId;
        this.#cdpClient = cdpClient;
        this.#eventManager = eventManager;
        this.#preloadScriptStorage = preloadScriptStorage;
        this.#networkStorage = networkStorage;
        this.#browserCdpClient = browserCdpClient;
        this.#acceptInsecureCerts = acceptInsecureCerts;
    }
    /** Returns a deferred that resolves when the target is unblocked. */
    get unblocked() {
        return this.#targetUnblocked;
    }
    get id() {
        return this.#id;
    }
    get cdpClient() {
        return this.#cdpClient;
    }
    get browserCdpClient() {
        return this.#browserCdpClient;
    }
    /** Needed for CDP escape path. */
    get cdpSessionId() {
        // SAFETY we got the client by it's id for creating
        return this.#cdpClient.sessionId;
    }
    /** Calls `Fetch.enable` with the added network intercepts. */
    async fetchEnable() {
        await this.#cdpClient.sendCommand('Fetch.enable', this.#networkStorage.getFetchEnableParams());
    }
    /** Calls `Fetch.disable`. */
    async fetchDisable() {
        await this.#cdpClient.sendCommand('Fetch.disable');
    }
    /**
     * Enables all the required CDP domains and unblocks the target.
     */
    async #unblock() {
        try {
            await Promise.all([
                this.#cdpClient.sendCommand('Runtime.enable'),
                this.#cdpClient.sendCommand('Page.enable'),
                this.#cdpClient.sendCommand('Page.setLifecycleEventsEnabled', {
                    enabled: true,
                }),
                // Set ignore certificate errors for each target.
                this.#cdpClient.sendCommand('Security.setIgnoreCertificateErrors', {
                    ignore: this.#acceptInsecureCerts,
                }),
                // XXX: #1080: Do not always enable the network domain globally.
                // TODO: enable Network domain for OOPiF targets.
                this.#cdpClient.sendCommand('Network.enable'),
                // XXX: #1080: Do not always enable the fetch domain globally.
                this.fetchEnable(),
                this.#cdpClient.sendCommand('Target.setAutoAttach', {
                    autoAttach: true,
                    waitForDebuggerOnStart: true,
                    flatten: true,
                }),
                this.#initAndEvaluatePreloadScripts(),
                this.#cdpClient.sendCommand('Runtime.runIfWaitingForDebugger'),
            ]);
        }
        catch (error) {
            // The target might have been closed before the initialization finished.
            if (!this.#cdpClient.isCloseError(error)) {
                this.#targetUnblocked.resolve({
                    kind: 'error',
                    error,
                });
                return;
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
                    params,
                    session: this.cdpSessionId,
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
            .find()
            .flatMap((script) => script.channels);
    }
    /** Loads all top-level preload scripts. */
    async #initAndEvaluatePreloadScripts() {
        for (const script of this.#preloadScriptStorage.find({
            global: true,
        })) {
            await script.initInTarget(this, true);
        }
    }
}
exports.CdpTarget = CdpTarget;
//# sourceMappingURL=CdpTarget.js.map
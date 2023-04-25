"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowsingContextProcessor = void 0;
const protocol_js_1 = require("../../../protocol/protocol.js");
const log_js_1 = require("../../../utils/log.js");
const browsingContextImpl_js_1 = require("./browsingContextImpl.js");
const cdpTarget_js_1 = require("./cdpTarget.js");
class BrowsingContextProcessor {
    #browsingContextStorage;
    #cdpConnection;
    #eventManager;
    #logger;
    #realmStorage;
    #selfTargetId;
    constructor(realmStorage, cdpConnection, selfTargetId, eventManager, browsingContextStorage, logger) {
        this.#browsingContextStorage = browsingContextStorage;
        this.#cdpConnection = cdpConnection;
        this.#eventManager = eventManager;
        this.#logger = logger;
        this.#realmStorage = realmStorage;
        this.#selfTargetId = selfTargetId;
        this.#setEventListeners(this.#cdpConnection.browserClient());
    }
    /**
     * This method is called for each CDP session, since this class is responsible
     * for creating and destroying all targets and browsing contexts.
     */
    #setEventListeners(cdpClient) {
        cdpClient.on('Target.attachedToTarget', (params) => {
            this.#handleAttachedToTargetEvent(params, cdpClient);
        });
        cdpClient.on('Target.detachedFromTarget', (params) => {
            this.#handleDetachedFromTargetEvent(params);
        });
        cdpClient.on('Page.frameAttached', (params) => {
            this.#handleFrameAttachedEvent(params);
        });
        cdpClient.on('Page.frameDetached', (params) => {
            this.#handleFrameDetachedEvent(params);
        });
    }
    // { "method": "Page.frameAttached",
    //   "params": {
    //     "frameId": "0A639AB1D9A392DF2CE02C53CC4ED3A6",
    //     "parentFrameId": "722BB0526C73B067A479BED6D0DB1156" } }
    #handleFrameAttachedEvent(params) {
        const parentBrowsingContext = this.#browsingContextStorage.findContext(params.parentFrameId);
        if (parentBrowsingContext !== undefined) {
            browsingContextImpl_js_1.BrowsingContextImpl.create(parentBrowsingContext.cdpTarget, this.#realmStorage, params.frameId, params.parentFrameId, this.#eventManager, this.#browsingContextStorage, this.#logger);
        }
    }
    // { "method": "Page.frameDetached",
    //   "params": {
    //     "frameId": "0A639AB1D9A392DF2CE02C53CC4ED3A6",
    //     "reason": "swap" } }
    #handleFrameDetachedEvent(params) {
        // In case of OOPiF no need in deleting BrowsingContext.
        if (params.reason === 'swap') {
            return;
        }
        this.#browsingContextStorage.findContext(params.frameId)?.delete();
    }
    // { "method": "Target.attachedToTarget",
    //   "params": {
    //     "sessionId": "EA999F39BDCABD7D45C9FEB787413BBA",
    //     "targetInfo": {
    //       "targetId": "722BB0526C73B067A479BED6D0DB1156",
    //       "type": "page",
    //       "title": "about:blank",
    //       "url": "about:blank",
    //       "attached": true,
    //       "canAccessOpener": false,
    //       "browserContextId": "1B5244080EC3FF28D03BBDA73138C0E2" },
    //     "waitingForDebugger": false } }
    #handleAttachedToTargetEvent(params, parentSessionCdpClient) {
        const { sessionId, targetInfo } = params;
        const targetCdpClient = this.#cdpConnection.getCdpClient(sessionId);
        if (!this.#isValidTarget(targetInfo)) {
            // DevTools or some other not supported by BiDi target. Just release
            // debugger  and ignore them.
            void targetCdpClient
                .sendCommand('Runtime.runIfWaitingForDebugger')
                .then(() => parentSessionCdpClient.sendCommand('Target.detachFromTarget', params));
            return;
        }
        this.#logger?.(log_js_1.LogType.browsingContexts, 'AttachedToTarget event received:', JSON.stringify(params, null, 2));
        this.#setEventListeners(targetCdpClient);
        const cdpTarget = cdpTarget_js_1.CdpTarget.create(targetInfo.targetId, targetCdpClient, sessionId, this.#realmStorage, this.#eventManager);
        if (this.#browsingContextStorage.hasContext(targetInfo.targetId)) {
            // OOPiF.
            this.#browsingContextStorage
                .getContext(targetInfo.targetId)
                .updateCdpTarget(cdpTarget);
        }
        else {
            browsingContextImpl_js_1.BrowsingContextImpl.create(cdpTarget, this.#realmStorage, targetInfo.targetId, null, this.#eventManager, this.#browsingContextStorage, this.#logger);
        }
    }
    // { "method": "Target.detachedFromTarget",
    //   "params": {
    //     "sessionId": "7EFBFB2A4942A8989B3EADC561BC46E9",
    //     "targetId": "19416886405CBA4E03DBB59FA67FF4E8" } }
    #handleDetachedFromTargetEvent(params) {
        // TODO: params.targetId is deprecated. Update this class to track using
        // params.sessionId instead.
        // https://github.com/GoogleChromeLabs/chromium-bidi/issues/60
        const contextId = params.targetId;
        this.#browsingContextStorage.findContext(contextId)?.delete();
    }
    async #getRealm(target) {
        if ('realm' in target) {
            return this.#realmStorage.getRealm({
                realmId: target.realm,
            });
        }
        const context = this.#browsingContextStorage.getContext(target.context);
        return context.getOrCreateSandbox(target.sandbox);
    }
    process_browsingContext_getTree(params) {
        const resultContexts = params.root === undefined
            ? this.#browsingContextStorage.getTopLevelContexts()
            : [this.#browsingContextStorage.getContext(params.root)];
        return {
            result: {
                contexts: resultContexts.map((c) => c.serializeToBidiValue(params.maxDepth ?? Number.MAX_VALUE)),
            },
        };
    }
    async process_browsingContext_create(params) {
        const browserCdpClient = this.#cdpConnection.browserClient();
        let referenceContext = undefined;
        if (params.referenceContext !== undefined) {
            referenceContext = this.#browsingContextStorage.getContext(params.referenceContext);
            if (!referenceContext.isTopLevelContext()) {
                throw new protocol_js_1.Message.InvalidArgumentException(`referenceContext should be a top-level context`);
            }
        }
        const result = await browserCdpClient.sendCommand('Target.createTarget', {
            url: 'about:blank',
            newWindow: params.type === 'window',
        });
        // Wait for the new tab to be loaded to avoid race conditions in the
        // `browsingContext` events, when the `browsingContext.domContentLoaded` and
        // `browsingContext.load` events from the initial `about:blank` navigation
        // are emitted after the next navigation is started.
        // Details: https://github.com/web-platform-tests/wpt/issues/35846
        const contextId = result.targetId;
        const context = this.#browsingContextStorage.getContext(contextId);
        await context.awaitLoaded();
        return {
            result: context.serializeToBidiValue(1),
        };
    }
    process_browsingContext_navigate(params) {
        const context = this.#browsingContextStorage.getContext(params.context);
        return context.navigate(params.url, params.wait === undefined ? 'none' : params.wait);
    }
    async process_browsingContext_captureScreenshot(params) {
        const context = this.#browsingContextStorage.getContext(params.context);
        return context.captureScreenshot();
    }
    async process_browsingContext_print(params) {
        const context = this.#browsingContextStorage.getContext(params.context);
        return context.print(params);
    }
    async process_script_addPreloadScript(params) {
        const contexts = [];
        const scripts = [];
        if (params.context) {
            // TODO(#293): Handle edge case with OOPiF. Whenever a frame is moved out
            // of process, we have to add those scripts as well.
            contexts.push(this.#browsingContextStorage.getContext(params.context));
        }
        else {
            // Add all contexts.
            // TODO(#293): Add preload scripts to all new browsing contexts as well.
            contexts.push(...this.#browsingContextStorage.getAllContexts());
        }
        scripts.push(...(await Promise.all(contexts.map((context) => context.addPreloadScript(params)))));
        // TODO(#293): What to return whenever there are multiple contexts?
        return scripts[0];
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    async process_script_removePreloadScript(_params) {
        throw new protocol_js_1.Message.UnknownErrorException('Not implemented.');
        return {};
    }
    async process_script_evaluate(params) {
        const realm = await this.#getRealm(params.target);
        return realm.scriptEvaluate(params.expression, params.awaitPromise, params.resultOwnership ?? 'none');
    }
    process_script_getRealms(params) {
        if (params.context !== undefined) {
            // Make sure the context is known.
            this.#browsingContextStorage.getContext(params.context);
        }
        const realms = this.#realmStorage
            .findRealms({
            browsingContextId: params.context,
            type: params.type,
        })
            .map((realm) => realm.toBiDi());
        return { result: { realms } };
    }
    async process_script_callFunction(params) {
        const realm = await this.#getRealm(params.target);
        return realm.callFunction(params.functionDeclaration, params.this || {
            type: 'undefined',
        }, // `this` is `undefined` by default.
        params.arguments || [], // `arguments` is `[]` by default.
        params.awaitPromise, params.resultOwnership ?? 'none');
    }
    async process_script_disown(params) {
        const realm = await this.#getRealm(params.target);
        await Promise.all(params.handles.map(async (h) => realm.disown(h)));
        return { result: {} };
    }
    async process_browsingContext_close(commandParams) {
        const browserCdpClient = this.#cdpConnection.browserClient();
        const context = this.#browsingContextStorage.getContext(commandParams.context);
        if (!context.isTopLevelContext()) {
            throw new protocol_js_1.Message.InvalidArgumentException('A top-level browsing context cannot be closed.');
        }
        const detachedFromTargetPromise = new Promise((resolve) => {
            const onContextDestroyed = (eventParams) => {
                if (eventParams.targetId === commandParams.context) {
                    browserCdpClient.off('Target.detachedFromTarget', onContextDestroyed);
                    resolve();
                }
            };
            browserCdpClient.on('Target.detachedFromTarget', onContextDestroyed);
        });
        await browserCdpClient.sendCommand('Target.closeTarget', {
            targetId: commandParams.context,
        });
        // Sometimes CDP command finishes before `detachedFromTarget` event,
        // sometimes after. Wait for the CDP command to be finished, and then wait
        // for `detachedFromTarget` if it hasn't emitted.
        await detachedFromTargetPromise;
        return { result: {} };
    }
    #isValidTarget(target) {
        if (target.targetId === this.#selfTargetId) {
            return false;
        }
        return ['page', 'iframe'].includes(target.type);
    }
    async process_cdp_sendCommand(params) {
        const client = params.cdpSession
            ? this.#cdpConnection.getCdpClient(params.cdpSession)
            : this.#cdpConnection.browserClient();
        const sendCdpCommandResult = await client.sendCommand(params.cdpMethod, params.cdpParams);
        return {
            result: sendCdpCommandResult,
            cdpSession: params.cdpSession,
        };
    }
    process_cdp_getSession(params) {
        const context = params.context;
        const sessionId = this.#browsingContextStorage.getContext(context).cdpTarget.cdpSessionId;
        if (sessionId === undefined) {
            return { result: { cdpSession: null } };
        }
        return { result: { cdpSession: sessionId } };
    }
}
exports.BrowsingContextProcessor = BrowsingContextProcessor;
//# sourceMappingURL=browsingContextProcessor.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowsingContextProcessor = void 0;
const protocol_js_1 = require("../../../protocol/protocol.js");
const log_js_1 = require("../../../utils/log.js");
const InputStateManager_js_1 = require("../input/InputStateManager.js");
const ActionDispatcher_js_1 = require("../input/ActionDispatcher.js");
const PreloadScriptStorage_js_1 = require("./PreloadScriptStorage.js");
const browsingContextImpl_js_1 = require("./browsingContextImpl.js");
const cdpTarget_js_1 = require("./cdpTarget.js");
const bidiPreloadScript_1 = require("./bidiPreloadScript");
class BrowsingContextProcessor {
    #browsingContextStorage;
    #cdpConnection;
    #eventManager;
    #logger;
    #realmStorage;
    #selfTargetId;
    #preloadScriptStorage = new PreloadScriptStorage_js_1.PreloadScriptStorage();
    #inputStateManager = new InputStateManager_js_1.InputStateManager();
    constructor(cdpConnection, selfTargetId, eventManager, browsingContextStorage, realmStorage, logger) {
        this.#cdpConnection = cdpConnection;
        this.#selfTargetId = selfTargetId;
        this.#eventManager = eventManager;
        this.#browsingContextStorage = browsingContextStorage;
        this.#realmStorage = realmStorage;
        this.#logger = logger;
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
        cdpClient.on('Target.targetInfoChanged', (params) => {
            this.#handleTargetInfoChangedEvent(params);
        });
        cdpClient.on('Page.frameAttached', (params) => {
            this.#handleFrameAttachedEvent(params);
        });
        cdpClient.on('Page.frameDetached', (params) => {
            this.#handleFrameDetachedEvent(params);
        });
    }
    #handleFrameAttachedEvent(params) {
        const parentBrowsingContext = this.#browsingContextStorage.findContext(params.parentFrameId);
        if (parentBrowsingContext !== undefined) {
            browsingContextImpl_js_1.BrowsingContextImpl.create(parentBrowsingContext.cdpTarget, this.#realmStorage, params.frameId, params.parentFrameId, this.#eventManager, this.#browsingContextStorage, this.#logger);
        }
    }
    #handleFrameDetachedEvent(params) {
        // In case of OOPiF no need in deleting BrowsingContext.
        if (params.reason === 'swap') {
            return;
        }
        this.#browsingContextStorage.findContext(params.frameId)?.delete();
    }
    #handleAttachedToTargetEvent(params, parentSessionCdpClient) {
        const { sessionId, targetInfo } = params;
        const targetCdpClient = this.#cdpConnection.getCdpClient(sessionId);
        if (!this.#isValidTarget(targetInfo)) {
            // DevTools or some other not supported by BiDi target. Just release
            // debugger  and ignore them.
            targetCdpClient
                .sendCommand('Runtime.runIfWaitingForDebugger')
                .then(() => parentSessionCdpClient.sendCommand('Target.detachFromTarget', params))
                .catch((error) => this.#logger?.(log_js_1.LogType.system, error));
            return;
        }
        this.#logger?.(log_js_1.LogType.browsingContexts, 'AttachedToTarget event received:', JSON.stringify(params, null, 2));
        this.#setEventListeners(targetCdpClient);
        const maybeContext = this.#browsingContextStorage.findContext(targetInfo.targetId);
        const cdpTarget = cdpTarget_js_1.CdpTarget.create(targetInfo.targetId, maybeContext?.parentId ?? null, targetCdpClient, sessionId, this.#realmStorage, this.#eventManager, this.#preloadScriptStorage);
        if (maybeContext) {
            // OOPiF.
            maybeContext.updateCdpTarget(cdpTarget);
        }
        else {
            // New context.
            browsingContextImpl_js_1.BrowsingContextImpl.create(cdpTarget, this.#realmStorage, targetInfo.targetId, null, this.#eventManager, this.#browsingContextStorage, this.#logger);
        }
    }
    #handleDetachedFromTargetEvent(params) {
        // XXX: params.targetId is deprecated. Update this class to track using
        // params.sessionId instead.
        // https://github.com/GoogleChromeLabs/chromium-bidi/issues/60
        const contextId = params.targetId;
        this.#browsingContextStorage.findContext(contextId)?.delete();
        this.#preloadScriptStorage
            .findPreloadScripts({ targetId: contextId })
            .map((preloadScript) => preloadScript.cdpTargetIsGone(contextId));
    }
    #handleTargetInfoChangedEvent(params) {
        const contextId = params.targetInfo.targetId;
        this.#browsingContextStorage
            .findContext(contextId)
            ?.onTargetInfoChanged(params);
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
        let referenceContext;
        if (params.referenceContext !== undefined) {
            referenceContext = this.#browsingContextStorage.getContext(params.referenceContext);
            if (!referenceContext.isTopLevelContext()) {
                throw new protocol_js_1.Message.InvalidArgumentException(`referenceContext should be a top-level context`);
            }
        }
        let result;
        switch (params.type) {
            case 'tab':
                result = await browserCdpClient.sendCommand('Target.createTarget', {
                    url: 'about:blank',
                    newWindow: false,
                });
                break;
            case 'window':
                result = await browserCdpClient.sendCommand('Target.createTarget', {
                    url: 'about:blank',
                    newWindow: true,
                });
                break;
        }
        // Wait for the new tab to be loaded to avoid race conditions in the
        // `browsingContext` events, when the `browsingContext.domContentLoaded` and
        // `browsingContext.load` events from the initial `about:blank` navigation
        // are emitted after the next navigation is started.
        // Details: https://github.com/web-platform-tests/wpt/issues/35846
        const contextId = result.targetId;
        const context = this.#browsingContextStorage.getContext(contextId);
        await context.awaitLoaded();
        return {
            result: {
                context: context.id,
            },
        };
    }
    process_browsingContext_navigate(params) {
        const context = this.#browsingContextStorage.getContext(params.context);
        return context.navigate(params.url, params.wait ?? 'none');
    }
    process_browsingContext_reload(params) {
        const context = this.#browsingContextStorage.getContext(params.context);
        return context.reload(params.ignoreCache ?? false, params.wait ?? 'none');
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
        const preloadScript = new bidiPreloadScript_1.BidiPreloadScript(params);
        this.#preloadScriptStorage.addPreloadScript(preloadScript);
        const cdpTargets = new Set(
        // TODO: The unique target can be in a non-top-level browsing context.
        // We need all the targets.
        // To get them, we can walk through all the contexts and collect their targets into the set.
        params.context === undefined || params.context === null
            ? this.#browsingContextStorage
                .getTopLevelContexts()
                .map((context) => context.cdpTarget)
            : [this.#browsingContextStorage.getContext(params.context).cdpTarget]);
        await preloadScript.initInTargets(cdpTargets);
        return {
            result: {
                script: preloadScript.id,
            },
        };
    }
    async process_script_removePreloadScript(params) {
        const bidiId = params.script;
        const scripts = this.#preloadScriptStorage.findPreloadScripts({
            id: bidiId,
        });
        if (scripts.length === 0) {
            throw new protocol_js_1.Message.NoSuchScriptException(`No preload script with BiDi ID '${bidiId}'`);
        }
        await Promise.all(scripts.map((script) => script.remove()));
        this.#preloadScriptStorage.removeBiDiPreloadScripts({
            id: bidiId,
        });
        return { result: {} };
    }
    async process_script_evaluate(params) {
        const realm = await this.#getRealm(params.target);
        return realm.scriptEvaluate(params.expression, params.awaitPromise, params.resultOwnership ?? 'none', params.serializationOptions ?? {});
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
        return realm.callFunction(params.functionDeclaration, params.this ?? {
            type: 'undefined',
        }, // `this` is `undefined` by default.
        params.arguments ?? [], // `arguments` is `[]` by default.
        params.awaitPromise, params.resultOwnership ?? 'none', params.serializationOptions ?? {});
    }
    async process_script_disown(params) {
        const realm = await this.#getRealm(params.target);
        await Promise.all(params.handles.map(async (h) => realm.disown(h)));
        return { result: {} };
    }
    async process_input_performActions(params) {
        const context = this.#browsingContextStorage.getContext(params.context);
        const inputState = this.#inputStateManager.get(context.top);
        const actionsByTick = this.#getActionsByTick(params, inputState);
        const dispatcher = new ActionDispatcher_js_1.ActionDispatcher(inputState, context, await ActionDispatcher_js_1.ActionDispatcher.isMacOS(context).catch(() => false));
        await dispatcher.dispatchActions(actionsByTick);
        return { result: {} };
    }
    #getActionsByTick(params, inputState) {
        const actionsByTick = [];
        for (const action of params.actions) {
            switch (action.type) {
                case protocol_js_1.Input.SourceActionsType.Pointer: {
                    action.parameters ??= { pointerType: protocol_js_1.Input.PointerType.Mouse };
                    action.parameters.pointerType ??= protocol_js_1.Input.PointerType.Mouse;
                    const source = inputState.getOrCreate(action.id, protocol_js_1.Input.SourceActionsType.Pointer, action.parameters.pointerType);
                    if (source.subtype !== action.parameters.pointerType) {
                        throw new protocol_js_1.Message.InvalidArgumentException(`Expected input source ${action.id} to be ${source.subtype}; got ${action.parameters.pointerType}.`);
                    }
                    break;
                }
                default:
                    inputState.getOrCreate(action.id, action.type);
            }
            const actions = action.actions.map((item) => ({
                id: action.id,
                action: item,
            }));
            for (let i = 0; i < actions.length; i++) {
                if (actionsByTick.length === i) {
                    actionsByTick.push([]);
                }
                actionsByTick[i].push(actions[i]);
            }
        }
        return actionsByTick;
    }
    async process_input_releaseActions(params) {
        const context = this.#browsingContextStorage.getContext(params.context);
        const topContext = context.top;
        const inputState = this.#inputStateManager.get(topContext);
        const dispatcher = new ActionDispatcher_js_1.ActionDispatcher(inputState, context, await ActionDispatcher_js_1.ActionDispatcher.isMacOS(context).catch(() => false));
        await dispatcher.dispatchTickActions(inputState.cancelList.reverse());
        this.#inputStateManager.delete(topContext);
        return { result: {} };
    }
    async process_browsingContext_setViewport(params) {
        const context = this.#browsingContextStorage.getContext(params.context);
        if (!context.isTopLevelContext()) {
            throw new protocol_js_1.Message.InvalidArgumentException('Emulating viewport is only supported on the top-level context');
        }
        await context.setViewport(params.viewport);
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
        const client = params.session
            ? this.#cdpConnection.getCdpClient(params.session)
            : this.#cdpConnection.browserClient();
        const sendCdpCommandResult = await client.sendCommand(params.method, params.params);
        return {
            result: sendCdpCommandResult,
            session: params.session,
        };
    }
    process_cdp_getSession(params) {
        const context = params.context;
        const sessionId = this.#browsingContextStorage.getContext(context).cdpTarget.cdpSessionId;
        if (sessionId === undefined) {
            return { result: { session: null } };
        }
        return { result: { session: sessionId } };
    }
}
exports.BrowsingContextProcessor = BrowsingContextProcessor;
//# sourceMappingURL=browsingContextProcessor.js.map
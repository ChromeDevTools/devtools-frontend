"use strict";
/**
 * Copyright 2022 Google LLC.
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowsingContextImpl = void 0;
const unitConversions_js_1 = require("../../../utils/unitConversions.js");
const protocol_js_1 = require("../../../protocol/protocol.js");
const log_js_1 = require("../../../utils/log.js");
const deferred_js_1 = require("../../../utils/deferred.js");
const realm_js_1 = require("../script/realm.js");
class BrowsingContextImpl {
    /** The ID of the current context. */
    #contextId;
    /**
     * The ID of the parent context.
     * If null, this is a top-level context.
     */
    #parentId;
    /**
     * Children contexts.
     * Map from children context ID to context implementation.
     */
    #children = new Map();
    #browsingContextStorage;
    #defers = {
        documentInitialized: new deferred_js_1.Deferred(),
        Page: {
            navigatedWithinDocument: new deferred_js_1.Deferred(),
            lifecycleEvent: {
                DOMContentLoaded: new deferred_js_1.Deferred(),
                load: new deferred_js_1.Deferred(),
            },
        },
    };
    #url = 'about:blank';
    #eventManager;
    #realmStorage;
    #loaderId = null;
    #cdpTarget;
    #maybeDefaultRealm;
    #logger;
    constructor(cdpTarget, realmStorage, contextId, parentId, eventManager, browsingContextStorage, logger) {
        this.#cdpTarget = cdpTarget;
        this.#realmStorage = realmStorage;
        this.#contextId = contextId;
        this.#parentId = parentId;
        this.#eventManager = eventManager;
        this.#browsingContextStorage = browsingContextStorage;
        this.#logger = logger;
        this.#initListeners();
    }
    static create(cdpTarget, realmStorage, contextId, parentId, eventManager, browsingContextStorage, logger) {
        const context = new BrowsingContextImpl(cdpTarget, realmStorage, contextId, parentId, eventManager, browsingContextStorage, logger);
        browsingContextStorage.addContext(context);
        eventManager.registerEvent({
            method: protocol_js_1.BrowsingContext.EventNames.ContextCreatedEvent,
            params: context.serializeToBidiValue(),
        }, context.contextId);
        return context;
    }
    /**
     * @see https://html.spec.whatwg.org/multipage/document-sequences.html#navigable
     */
    get navigableId() {
        return this.#loaderId;
    }
    delete() {
        this.#deleteChildren();
        this.#realmStorage.deleteRealms({
            browsingContextId: this.contextId,
        });
        // Remove context from the parent.
        if (this.parentId !== null) {
            const parent = this.#browsingContextStorage.getContext(this.parentId);
            parent.#children.delete(this.contextId);
        }
        this.#eventManager.registerEvent({
            method: protocol_js_1.BrowsingContext.EventNames.ContextDestroyedEvent,
            params: this.serializeToBidiValue(),
        }, this.contextId);
        this.#browsingContextStorage.deleteContext(this.contextId);
    }
    /** Returns the ID of this context. */
    get contextId() {
        return this.#contextId;
    }
    /** Returns the parent context ID. */
    get parentId() {
        return this.#parentId;
    }
    /** Returns all children contexts. */
    get children() {
        return Array.from(this.#children.values());
    }
    /**
     * Returns true if this is a top-level context.
     * This is the case whenever the parent context ID is null.
     */
    isTopLevelContext() {
        return this.#parentId === null;
    }
    addChild(child) {
        this.#children.set(child.contextId, child);
    }
    #deleteChildren() {
        this.children.map((child) => child.delete());
    }
    get #defaultRealm() {
        if (this.#maybeDefaultRealm === undefined) {
            throw new Error(`No default realm for browsing context ${this.#contextId}`);
        }
        return this.#maybeDefaultRealm;
    }
    get cdpTarget() {
        return this.#cdpTarget;
    }
    updateCdpTarget(cdpTarget) {
        this.#cdpTarget = cdpTarget;
        this.#initListeners();
    }
    get url() {
        return this.#url;
    }
    async awaitLoaded() {
        await this.#defers.Page.lifecycleEvent.load;
    }
    awaitUnblocked() {
        return this.#cdpTarget.targetUnblocked;
    }
    async getOrCreateSandbox(sandbox) {
        if (sandbox === undefined || sandbox === '') {
            return this.#defaultRealm;
        }
        let maybeSandboxes = this.#realmStorage.findRealms({
            browsingContextId: this.contextId,
            sandbox,
        });
        if (maybeSandboxes.length === 0) {
            await this.#cdpTarget.cdpClient.sendCommand('Page.createIsolatedWorld', {
                frameId: this.contextId,
                worldName: sandbox,
            });
            // `Runtime.executionContextCreated` should be emitted by the time the
            // previous command is done.
            maybeSandboxes = this.#realmStorage.findRealms({
                browsingContextId: this.contextId,
                sandbox,
            });
        }
        if (maybeSandboxes.length !== 1) {
            throw Error(`Sandbox ${sandbox} wasn't created.`);
        }
        return maybeSandboxes[0];
    }
    serializeToBidiValue(maxDepth = 0, addParentFiled = true) {
        return {
            context: this.#contextId,
            url: this.url,
            children: maxDepth > 0
                ? this.children.map((c) => c.serializeToBidiValue(maxDepth - 1, false))
                : null,
            ...(addParentFiled ? { parent: this.#parentId } : {}),
        };
    }
    #initListeners() {
        this.#cdpTarget.cdpClient.on('Target.targetInfoChanged', (params) => {
            if (this.contextId !== params.targetInfo.targetId) {
                return;
            }
            this.#url = params.targetInfo.url;
        });
        this.#cdpTarget.cdpClient.on('Page.frameNavigated', (params) => {
            if (this.contextId !== params.frame.id) {
                return;
            }
            this.#url = params.frame.url + (params.frame.urlFragment ?? '');
            // At the point the page is initiated, all the nested iframes from the
            // previous page are detached and realms are destroyed.
            // Remove context's children.
            this.#deleteChildren();
        });
        this.#cdpTarget.cdpClient.on('Page.navigatedWithinDocument', (params) => {
            if (this.contextId !== params.frameId) {
                return;
            }
            this.#url = params.url;
            this.#defers.Page.navigatedWithinDocument.resolve(params);
        });
        this.#cdpTarget.cdpClient.on('Page.lifecycleEvent', (params) => {
            if (this.contextId !== params.frameId) {
                return;
            }
            // `timestamp` from the event is MonotonicTime, not real time, so
            // the best Mapper can do is to set the timestamp to the epoch time
            // of the event arrived.
            // https://chromedevtools.github.io/devtools-protocol/tot/Network/#type-MonotonicTime
            const timestamp = new Date().getTime();
            if (params.name === 'init') {
                this.#documentChanged(params.loaderId);
                this.#defers.documentInitialized.resolve();
            }
            if (params.name === 'commit') {
                this.#loaderId = params.loaderId;
                return;
            }
            if (params.loaderId !== this.#loaderId) {
                return;
            }
            switch (params.name) {
                case 'DOMContentLoaded':
                    this.#defers.Page.lifecycleEvent.DOMContentLoaded.resolve(params);
                    this.#eventManager.registerEvent({
                        method: protocol_js_1.BrowsingContext.EventNames.DomContentLoadedEvent,
                        params: {
                            context: this.contextId,
                            navigation: this.#loaderId,
                            timestamp,
                            url: this.#url,
                        },
                    }, this.contextId);
                    break;
                case 'load':
                    this.#defers.Page.lifecycleEvent.load.resolve(params);
                    this.#eventManager.registerEvent({
                        method: protocol_js_1.BrowsingContext.EventNames.LoadEvent,
                        params: {
                            context: this.contextId,
                            navigation: this.#loaderId,
                            timestamp,
                            url: this.#url,
                        },
                    }, this.contextId);
                    break;
            }
        });
        this.#cdpTarget.cdpClient.on('Runtime.executionContextCreated', (params) => {
            if (params.context.auxData.frameId !== this.contextId) {
                return;
            }
            // Only this execution contexts are supported for now.
            if (!['default', 'isolated'].includes(params.context.auxData.type)) {
                return;
            }
            const realm = new realm_js_1.Realm(this.#realmStorage, this.#browsingContextStorage, params.context.uniqueId, this.contextId, params.context.id, this.#getOrigin(params), 
            // TODO: differentiate types.
            'window', 
            // Sandbox name for isolated world.
            params.context.auxData.type === 'isolated'
                ? params.context.name
                : undefined, this.#cdpTarget.cdpSessionId, this.#cdpTarget.cdpClient, this.#eventManager);
            if (params.context.auxData.isDefault) {
                this.#maybeDefaultRealm = realm;
            }
        });
        this.#cdpTarget.cdpClient.on('Runtime.executionContextDestroyed', (params) => {
            this.#realmStorage.deleteRealms({
                cdpSessionId: this.#cdpTarget.cdpSessionId,
                executionContextId: params.executionContextId,
            });
        });
        this.#cdpTarget.cdpClient.on('Runtime.executionContextsCleared', () => {
            this.#realmStorage.deleteRealms({
                cdpSessionId: this.#cdpTarget.cdpSessionId,
            });
        });
    }
    #getOrigin(params) {
        if (params.context.auxData.type === 'isolated') {
            // Sandbox should have the same origin as the context itself, but in CDP
            // it has an empty one.
            return this.#defaultRealm.origin;
        }
        // https://html.spec.whatwg.org/multipage/origin.html#ascii-serialisation-of-an-origin
        return ['://', ''].includes(params.context.origin)
            ? 'null'
            : params.context.origin;
    }
    #documentChanged(loaderId) {
        // Same document navigation.
        if (loaderId === undefined || this.#loaderId === loaderId) {
            if (this.#defers.Page.navigatedWithinDocument.isFinished) {
                this.#defers.Page.navigatedWithinDocument =
                    new deferred_js_1.Deferred();
            }
            return;
        }
        if (this.#defers.documentInitialized.isFinished) {
            this.#defers.documentInitialized = new deferred_js_1.Deferred();
        }
        else {
            this.#logger?.(log_js_1.LogType.browsingContexts, 'Document changed');
        }
        if (this.#defers.Page.lifecycleEvent.DOMContentLoaded.isFinished) {
            this.#defers.Page.lifecycleEvent.DOMContentLoaded =
                new deferred_js_1.Deferred();
        }
        else {
            this.#logger?.(log_js_1.LogType.browsingContexts, 'Document changed');
        }
        if (this.#defers.Page.lifecycleEvent.load.isFinished) {
            this.#defers.Page.lifecycleEvent.load =
                new deferred_js_1.Deferred();
        }
        else {
            this.#logger?.(log_js_1.LogType.browsingContexts, 'Document changed');
        }
        this.#loaderId = loaderId;
    }
    async navigate(url, wait) {
        await this.awaitUnblocked();
        // TODO: handle loading errors.
        const cdpNavigateResult = await this.#cdpTarget.cdpClient.sendCommand('Page.navigate', {
            url,
            frameId: this.contextId,
        });
        if (cdpNavigateResult.errorText) {
            throw new protocol_js_1.Message.UnknownErrorException(cdpNavigateResult.errorText);
        }
        this.#documentChanged(cdpNavigateResult.loaderId);
        // Wait for `wait` condition.
        switch (wait) {
            case 'none':
                break;
            case 'interactive':
                // No `loaderId` means same-document navigation.
                if (cdpNavigateResult.loaderId === undefined) {
                    await this.#defers.Page.navigatedWithinDocument;
                }
                else {
                    await this.#defers.Page.lifecycleEvent.DOMContentLoaded;
                }
                break;
            case 'complete':
                // No `loaderId` means same-document navigation.
                if (cdpNavigateResult.loaderId === undefined) {
                    await this.#defers.Page.navigatedWithinDocument;
                }
                else {
                    await this.#defers.Page.lifecycleEvent.load;
                }
                break;
        }
        return {
            result: {
                navigation: cdpNavigateResult.loaderId || null,
                url,
            },
        };
    }
    async captureScreenshot() {
        const [, result] = await Promise.all([
            // TODO: Either make this a proposal in the BiDi spec, or focus the
            // original tab right after the screenshot is taken.
            // The screenshot command gets blocked until we focus the active tab.
            this.#cdpTarget.cdpClient.sendCommand('Page.bringToFront'),
            this.#cdpTarget.cdpClient.sendCommand('Page.captureScreenshot', {}),
        ]);
        return {
            result: {
                data: result.data,
            },
        };
    }
    async print(params) {
        const printToPdfCdpParams = {
            printBackground: params.background,
            landscape: params.orientation === 'landscape',
            pageRanges: params.pageRanges?.join(',') ?? '',
            scale: params.scale,
            preferCSSPageSize: !params.shrinkToFit,
        };
        if (params.margin?.bottom) {
            printToPdfCdpParams.marginBottom = (0, unitConversions_js_1.inchesFromCm)(params.margin.bottom);
        }
        if (params.margin?.left) {
            printToPdfCdpParams.marginLeft = (0, unitConversions_js_1.inchesFromCm)(params.margin.left);
        }
        if (params.margin?.right) {
            printToPdfCdpParams.marginRight = (0, unitConversions_js_1.inchesFromCm)(params.margin.right);
        }
        if (params.margin?.top) {
            printToPdfCdpParams.marginTop = (0, unitConversions_js_1.inchesFromCm)(params.margin.top);
        }
        if (params.page?.height) {
            printToPdfCdpParams.paperHeight = (0, unitConversions_js_1.inchesFromCm)(params.page.height);
        }
        if (params.page?.width) {
            printToPdfCdpParams.paperWidth = (0, unitConversions_js_1.inchesFromCm)(params.page.width);
        }
        const result = await this.#cdpTarget.cdpClient.sendCommand('Page.printToPDF', printToPdfCdpParams);
        return {
            result: {
                data: result.data,
            },
        };
    }
    async addPreloadScript(params) {
        const result = await this.#cdpTarget.cdpClient.sendCommand('Page.addScriptToEvaluateOnNewDocument', {
            // The spec provides a function, and CDP expects an evaluation.
            source: `(${params.expression})();`,
            worldName: params.sandbox,
        });
        return {
            result: {
                script: result.identifier,
            },
        };
    }
}
exports.BrowsingContextImpl = BrowsingContextImpl;
//# sourceMappingURL=browsingContextImpl.js.map
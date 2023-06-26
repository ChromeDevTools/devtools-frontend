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
    /** The ID of this browsing context. */
    #id;
    /**
     * The ID of the parent browsing context.
     * If null, this is a top-level context.
     */
    #parentId;
    /** Direct children browsing contexts. */
    #children = new Set();
    #browsingContextStorage;
    #deferreds = {
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
    #loaderId;
    #cdpTarget;
    #maybeDefaultRealm;
    #logger;
    constructor(cdpTarget, realmStorage, id, parentId, eventManager, browsingContextStorage, logger) {
        this.#cdpTarget = cdpTarget;
        this.#realmStorage = realmStorage;
        this.#id = id;
        this.#parentId = parentId;
        this.#eventManager = eventManager;
        this.#browsingContextStorage = browsingContextStorage;
        this.#logger = logger;
    }
    static create(cdpTarget, realmStorage, id, parentId, eventManager, browsingContextStorage, logger) {
        const context = new BrowsingContextImpl(cdpTarget, realmStorage, id, parentId, eventManager, browsingContextStorage, logger);
        context.#initListeners();
        browsingContextStorage.addContext(context);
        if (!context.isTopLevelContext()) {
            context.parent.addChild(context.id);
        }
        eventManager.registerEvent({
            method: protocol_js_1.BrowsingContext.EventNames.ContextCreatedEvent,
            params: context.serializeToBidiValue(),
        }, context.id);
        return context;
    }
    /**
     * @see https://html.spec.whatwg.org/multipage/document-sequences.html#navigable
     */
    get navigableId() {
        return this.#loaderId;
    }
    delete() {
        this.#deleteAllChildren();
        this.#realmStorage.deleteRealms({
            browsingContextId: this.id,
        });
        // Remove context from the parent.
        if (!this.isTopLevelContext()) {
            this.parent.#children.delete(this.id);
        }
        this.#eventManager.registerEvent({
            method: protocol_js_1.BrowsingContext.EventNames.ContextDestroyedEvent,
            params: this.serializeToBidiValue(),
        }, this.id);
        this.#browsingContextStorage.deleteContextById(this.id);
    }
    /** Returns the ID of this context. */
    get id() {
        return this.#id;
    }
    /** Returns the parent context ID. */
    get parentId() {
        return this.#parentId;
    }
    /** Returns the parent context. */
    get parent() {
        if (this.parentId === null) {
            return null;
        }
        return this.#browsingContextStorage.getContext(this.parentId);
    }
    /** Returns all direct children contexts. */
    get directChildren() {
        return [...this.#children].map((id) => this.#browsingContextStorage.getContext(id));
    }
    /** Returns all children contexts, flattened. */
    get allChildren() {
        const children = this.directChildren;
        return children.concat(...children.map((child) => child.allChildren));
    }
    /**
     * Returns true if this is a top-level context.
     * This is the case whenever the parent context ID is null.
     */
    isTopLevelContext() {
        return this.#parentId === null;
    }
    get top() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let topContext = this;
        let parent = topContext.parent;
        while (parent) {
            topContext = parent;
            parent = topContext.parent;
        }
        return topContext;
    }
    addChild(childId) {
        this.#children.add(childId);
    }
    #deleteAllChildren() {
        this.directChildren.map((child) => child.delete());
    }
    get #defaultRealm() {
        if (this.#maybeDefaultRealm === undefined) {
            throw new Error(`No default realm for browsing context ${this.#id}`);
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
        await this.#deferreds.Page.lifecycleEvent.load;
    }
    awaitUnblocked() {
        return this.#cdpTarget.targetUnblocked;
    }
    async getOrCreateSandbox(sandbox) {
        if (sandbox === undefined || sandbox === '') {
            return this.#defaultRealm;
        }
        let maybeSandboxes = this.#realmStorage.findRealms({
            browsingContextId: this.id,
            sandbox,
        });
        if (maybeSandboxes.length === 0) {
            await this.#cdpTarget.cdpClient.sendCommand('Page.createIsolatedWorld', {
                frameId: this.id,
                worldName: sandbox,
            });
            // `Runtime.executionContextCreated` should be emitted by the time the
            // previous command is done.
            maybeSandboxes = this.#realmStorage.findRealms({
                browsingContextId: this.id,
                sandbox,
            });
        }
        if (maybeSandboxes.length !== 1) {
            throw Error(`Sandbox ${sandbox} wasn't created.`);
        }
        return maybeSandboxes[0];
    }
    serializeToBidiValue(maxDepth = 0, addParentField = true) {
        return {
            context: this.#id,
            url: this.url,
            children: maxDepth > 0
                ? this.directChildren.map((c) => c.serializeToBidiValue(maxDepth - 1, false))
                : null,
            ...(addParentField ? { parent: this.#parentId } : {}),
        };
    }
    #initListeners() {
        this.#cdpTarget.cdpClient.on('Target.targetInfoChanged', (params) => {
            if (this.id !== params.targetInfo.targetId) {
                return;
            }
            this.#url = params.targetInfo.url;
        });
        this.#cdpTarget.cdpClient.on('Page.frameNavigated', (params) => {
            if (this.id !== params.frame.id) {
                return;
            }
            this.#url = params.frame.url + (params.frame.urlFragment ?? '');
            // At the point the page is initialized, all the nested iframes from the
            // previous page are detached and realms are destroyed.
            // Remove children from context.
            this.#deleteAllChildren();
        });
        this.#cdpTarget.cdpClient.on('Page.navigatedWithinDocument', (params) => {
            if (this.id !== params.frameId) {
                return;
            }
            this.#url = params.url;
            this.#deferreds.Page.navigatedWithinDocument.resolve(params);
        });
        this.#cdpTarget.cdpClient.on('Page.lifecycleEvent', (params) => {
            if (this.id !== params.frameId) {
                return;
            }
            // `timestamp` from the event is MonotonicTime, not real time, so
            // the best Mapper can do is to set the timestamp to the epoch time
            // of the event arrived.
            // https://chromedevtools.github.io/devtools-protocol/tot/Network/#type-MonotonicTime
            const timestamp = new Date().getTime();
            switch (params.name) {
                case 'init':
                    this.#documentChanged(params.loaderId);
                    this.#deferreds.documentInitialized.resolve();
                    break;
                case 'commit':
                    this.#loaderId = params.loaderId;
                    break;
                case 'DOMContentLoaded':
                    this.#deferreds.Page.lifecycleEvent.DOMContentLoaded.resolve(params);
                    this.#eventManager.registerEvent({
                        method: protocol_js_1.BrowsingContext.EventNames.DomContentLoadedEvent,
                        params: {
                            context: this.id,
                            navigation: this.#loaderId ?? null,
                            timestamp,
                            url: this.#url,
                        },
                    }, this.id);
                    break;
                case 'load':
                    this.#deferreds.Page.lifecycleEvent.load.resolve(params);
                    this.#eventManager.registerEvent({
                        method: protocol_js_1.BrowsingContext.EventNames.LoadEvent,
                        params: {
                            context: this.id,
                            navigation: this.#loaderId ?? null,
                            timestamp,
                            url: this.#url,
                        },
                    }, this.id);
                    break;
            }
            if (params.loaderId !== this.#loaderId) {
                return;
            }
        });
        this.#cdpTarget.cdpClient.on('Runtime.executionContextCreated', (params) => {
            if (params.context.auxData.frameId !== this.id) {
                return;
            }
            // Only this execution contexts are supported for now.
            if (!['default', 'isolated'].includes(params.context.auxData.type)) {
                return;
            }
            const realm = new realm_js_1.Realm(this.#realmStorage, this.#browsingContextStorage, params.context.uniqueId, this.id, params.context.id, this.#getOrigin(params), 
            // XXX: differentiate types.
            'window', 
            // Sandbox name for isolated world.
            params.context.auxData.type === 'isolated'
                ? params.context.name
                : undefined, this.#cdpTarget.cdpSessionId, this.#cdpTarget.cdpClient, this.#eventManager, this.#logger);
            if (params.context.auxData.isDefault) {
                this.#maybeDefaultRealm = realm;
            }
            this.#eventManager.registerEvent({
                method: protocol_js_1.Script.EventNames.RealmCreated,
                params: realm.toBiDi(),
            }, this.id);
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
            if (this.#deferreds.Page.navigatedWithinDocument.isFinished) {
                this.#deferreds.Page.navigatedWithinDocument =
                    new deferred_js_1.Deferred();
            }
            else {
                this.#logger?.(log_js_1.LogType.browsingContexts, 'Document changed (navigatedWithinDocument)');
            }
            return;
        }
        this.#resetDeferredsIfFinished();
        this.#loaderId = loaderId;
    }
    #resetDeferredsIfFinished() {
        if (this.#deferreds.documentInitialized.isFinished) {
            this.#deferreds.documentInitialized = new deferred_js_1.Deferred();
        }
        else {
            this.#logger?.(log_js_1.LogType.browsingContexts, 'Document changed (document initialized)');
        }
        if (this.#deferreds.Page.lifecycleEvent.DOMContentLoaded.isFinished) {
            this.#deferreds.Page.lifecycleEvent.DOMContentLoaded =
                new deferred_js_1.Deferred();
        }
        else {
            this.#logger?.(log_js_1.LogType.browsingContexts, 'Document changed (DOMContentLoaded)');
        }
        if (this.#deferreds.Page.lifecycleEvent.load.isFinished) {
            this.#deferreds.Page.lifecycleEvent.load =
                new deferred_js_1.Deferred();
        }
        else {
            this.#logger?.(log_js_1.LogType.browsingContexts, 'Document changed (load)');
        }
    }
    async navigate(url, wait) {
        await this.awaitUnblocked();
        // TODO: handle loading errors.
        const cdpNavigateResult = await this.#cdpTarget.cdpClient.sendCommand('Page.navigate', {
            url,
            frameId: this.id,
        });
        if (cdpNavigateResult.errorText) {
            throw new protocol_js_1.Message.UnknownErrorException(cdpNavigateResult.errorText);
        }
        this.#documentChanged(cdpNavigateResult.loaderId);
        switch (wait) {
            case 'none':
                break;
            case 'interactive':
                // No `loaderId` means same-document navigation.
                if (cdpNavigateResult.loaderId === undefined) {
                    await this.#deferreds.Page.navigatedWithinDocument;
                }
                else {
                    await this.#deferreds.Page.lifecycleEvent.DOMContentLoaded;
                }
                break;
            case 'complete':
                // No `loaderId` means same-document navigation.
                if (cdpNavigateResult.loaderId === undefined) {
                    await this.#deferreds.Page.navigatedWithinDocument;
                }
                else {
                    await this.awaitLoaded();
                }
                break;
        }
        return {
            result: {
                navigation: cdpNavigateResult.loaderId ?? null,
                url,
            },
        };
    }
    async reload(ignoreCache, wait) {
        await this.awaitUnblocked();
        await this.#cdpTarget.cdpClient.sendCommand('Page.reload', {
            ignoreCache,
        });
        this.#resetDeferredsIfFinished();
        switch (wait) {
            case 'none':
                break;
            case 'interactive':
                await this.#deferreds.Page.lifecycleEvent.DOMContentLoaded;
                break;
            case 'complete':
                await this.awaitLoaded();
                break;
        }
        return { result: {} };
    }
    async captureScreenshot() {
        // XXX: Focus the original tab after the screenshot is taken.
        // This is needed because the screenshot gets blocked until the active tab gets focus.
        await this.#cdpTarget.cdpClient.sendCommand('Page.bringToFront');
        let clip;
        if (this.isTopLevelContext()) {
            const { cssContentSize, cssLayoutViewport } = await this.#cdpTarget.cdpClient.sendCommand('Page.getLayoutMetrics');
            clip = {
                x: cssContentSize.x,
                y: cssContentSize.y,
                width: cssLayoutViewport.clientWidth,
                height: cssLayoutViewport.clientHeight,
            };
        }
        else {
            const { result: { value: iframeDocRect }, } = await this.#cdpTarget.cdpClient.sendCommand('Runtime.callFunctionOn', {
                functionDeclaration: String(() => {
                    const docRect = globalThis.document.documentElement.getBoundingClientRect();
                    return JSON.stringify({
                        x: docRect.x,
                        y: docRect.y,
                        width: docRect.width,
                        height: docRect.height,
                    });
                }),
                executionContextId: this.#defaultRealm.executionContextId,
            });
            clip = JSON.parse(iframeDocRect);
        }
        const result = await this.#cdpTarget.cdpClient.sendCommand('Page.captureScreenshot', {
            clip: {
                ...clip,
                scale: 1.0,
            },
        });
        return {
            result: {
                data: result.data,
            },
        };
    }
    async print(params) {
        const cdpParams = {};
        if (params.background !== undefined) {
            cdpParams.printBackground = params.background;
        }
        if (params.margin?.bottom !== undefined) {
            cdpParams.marginBottom = (0, unitConversions_js_1.inchesFromCm)(params.margin.bottom);
        }
        if (params.margin?.left !== undefined) {
            cdpParams.marginLeft = (0, unitConversions_js_1.inchesFromCm)(params.margin.left);
        }
        if (params.margin?.right !== undefined) {
            cdpParams.marginRight = (0, unitConversions_js_1.inchesFromCm)(params.margin.right);
        }
        if (params.margin?.top !== undefined) {
            cdpParams.marginTop = (0, unitConversions_js_1.inchesFromCm)(params.margin.top);
        }
        if (params.orientation !== undefined) {
            cdpParams.landscape = params.orientation === 'landscape';
        }
        if (params.page?.height !== undefined) {
            cdpParams.paperHeight = (0, unitConversions_js_1.inchesFromCm)(params.page.height);
        }
        if (params.page?.width !== undefined) {
            cdpParams.paperWidth = (0, unitConversions_js_1.inchesFromCm)(params.page.width);
        }
        if (params.pageRanges !== undefined) {
            cdpParams.pageRanges = params.pageRanges.join(',');
        }
        if (params.scale !== undefined) {
            cdpParams.scale = params.scale;
        }
        if (params.shrinkToFit !== undefined) {
            cdpParams.preferCSSPageSize = !params.shrinkToFit;
        }
        const result = await this.#cdpTarget.cdpClient.sendCommand('Page.printToPDF', cdpParams);
        return {
            result: {
                data: result.data,
            },
        };
    }
}
exports.BrowsingContextImpl = BrowsingContextImpl;
//# sourceMappingURL=browsingContextImpl.js.map
"use strict";
/**
 * Copyright 2017 Google Inc. All rights reserved.
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
exports.FrameManager = exports.FrameManagerEmittedEvents = exports.UTILITY_WORLD_NAME = void 0;
const assert_js_1 = require("../util/assert.js");
const ErrorLike_js_1 = require("../util/ErrorLike.js");
const Connection_js_1 = require("./Connection.js");
const DeviceRequestPrompt_js_1 = require("./DeviceRequestPrompt.js");
const EventEmitter_js_1 = require("./EventEmitter.js");
const ExecutionContext_js_1 = require("./ExecutionContext.js");
const Frame_js_1 = require("./Frame.js");
const FrameTree_js_1 = require("./FrameTree.js");
const IsolatedWorlds_js_1 = require("./IsolatedWorlds.js");
const NetworkManager_js_1 = require("./NetworkManager.js");
const util_js_1 = require("./util.js");
/**
 * @internal
 */
exports.UTILITY_WORLD_NAME = '__puppeteer_utility_world__';
/**
 * We use symbols to prevent external parties listening to these events.
 * They are internal to Puppeteer.
 *
 * @internal
 */
exports.FrameManagerEmittedEvents = {
    FrameAttached: Symbol('FrameManager.FrameAttached'),
    FrameNavigated: Symbol('FrameManager.FrameNavigated'),
    FrameDetached: Symbol('FrameManager.FrameDetached'),
    FrameSwapped: Symbol('FrameManager.FrameSwapped'),
    LifecycleEvent: Symbol('FrameManager.LifecycleEvent'),
    FrameNavigatedWithinDocument: Symbol('FrameManager.FrameNavigatedWithinDocument'),
    ExecutionContextCreated: Symbol('FrameManager.ExecutionContextCreated'),
    ExecutionContextDestroyed: Symbol('FrameManager.ExecutionContextDestroyed'),
};
/**
 * A frame manager manages the frames for a given {@link Page | page}.
 *
 * @internal
 */
class FrameManager extends EventEmitter_js_1.EventEmitter {
    #page;
    #networkManager;
    #timeoutSettings;
    #contextIdToContext = new Map();
    #isolatedWorlds = new Set();
    #client;
    /**
     * @internal
     */
    _frameTree = new FrameTree_js_1.FrameTree();
    /**
     * Set of frame IDs stored to indicate if a frame has received a
     * frameNavigated event so that frame tree responses could be ignored as the
     * frameNavigated event usually contains the latest information.
     */
    #frameNavigatedReceived = new Set();
    #deviceRequestPromptManagerMap = new WeakMap();
    get timeoutSettings() {
        return this.#timeoutSettings;
    }
    get networkManager() {
        return this.#networkManager;
    }
    get client() {
        return this.#client;
    }
    constructor(client, page, ignoreHTTPSErrors, timeoutSettings) {
        super();
        this.#client = client;
        this.#page = page;
        this.#networkManager = new NetworkManager_js_1.NetworkManager(client, ignoreHTTPSErrors, this);
        this.#timeoutSettings = timeoutSettings;
        this.setupEventListeners(this.#client);
    }
    setupEventListeners(session) {
        session.on('Page.frameAttached', event => {
            this.#onFrameAttached(session, event.frameId, event.parentFrameId);
        });
        session.on('Page.frameNavigated', event => {
            this.#frameNavigatedReceived.add(event.frame.id);
            void this.#onFrameNavigated(event.frame);
        });
        session.on('Page.navigatedWithinDocument', event => {
            this.#onFrameNavigatedWithinDocument(event.frameId, event.url);
        });
        session.on('Page.frameDetached', (event) => {
            this.#onFrameDetached(event.frameId, event.reason);
        });
        session.on('Page.frameStartedLoading', event => {
            this.#onFrameStartedLoading(event.frameId);
        });
        session.on('Page.frameStoppedLoading', event => {
            this.#onFrameStoppedLoading(event.frameId);
        });
        session.on('Runtime.executionContextCreated', event => {
            this.#onExecutionContextCreated(event.context, session);
        });
        session.on('Runtime.executionContextDestroyed', event => {
            this.#onExecutionContextDestroyed(event.executionContextId, session);
        });
        session.on('Runtime.executionContextsCleared', () => {
            this.#onExecutionContextsCleared(session);
        });
        session.on('Page.lifecycleEvent', event => {
            this.#onLifecycleEvent(event);
        });
    }
    async initialize(client = this.#client) {
        try {
            const result = await Promise.all([
                client.send('Page.enable'),
                client.send('Page.getFrameTree'),
            ]);
            const { frameTree } = result[1];
            this.#handleFrameTree(client, frameTree);
            await Promise.all([
                client.send('Page.setLifecycleEventsEnabled', { enabled: true }),
                client.send('Runtime.enable').then(() => {
                    return this.#createIsolatedWorld(client, exports.UTILITY_WORLD_NAME);
                }),
                // TODO: Network manager is not aware of OOP iframes yet.
                client === this.#client
                    ? this.#networkManager.initialize()
                    : Promise.resolve(),
            ]);
        }
        catch (error) {
            // The target might have been closed before the initialization finished.
            if ((0, ErrorLike_js_1.isErrorLike)(error) && (0, Connection_js_1.isTargetClosedError)(error)) {
                return;
            }
            throw error;
        }
    }
    executionContextById(contextId, session = this.#client) {
        const context = this.getExecutionContextById(contextId, session);
        (0, assert_js_1.assert)(context, 'INTERNAL ERROR: missing context with id = ' + contextId);
        return context;
    }
    getExecutionContextById(contextId, session = this.#client) {
        return this.#contextIdToContext.get(`${session.id()}:${contextId}`);
    }
    page() {
        return this.#page;
    }
    mainFrame() {
        const mainFrame = this._frameTree.getMainFrame();
        (0, assert_js_1.assert)(mainFrame, 'Requesting main frame too early!');
        return mainFrame;
    }
    frames() {
        return Array.from(this._frameTree.frames());
    }
    frame(frameId) {
        return this._frameTree.getById(frameId) || null;
    }
    onAttachedToTarget(target) {
        if (target._getTargetInfo().type !== 'iframe') {
            return;
        }
        const frame = this.frame(target._getTargetInfo().targetId);
        if (frame) {
            frame.updateClient(target._session());
        }
        this.setupEventListeners(target._session());
        void this.initialize(target._session());
    }
    /**
     * @internal
     */
    _deviceRequestPromptManager(client) {
        let manager = this.#deviceRequestPromptManagerMap.get(client);
        if (manager === undefined) {
            manager = new DeviceRequestPrompt_js_1.DeviceRequestPromptManager(client, this.#timeoutSettings);
            this.#deviceRequestPromptManagerMap.set(client, manager);
        }
        return manager;
    }
    #onLifecycleEvent(event) {
        const frame = this.frame(event.frameId);
        if (!frame) {
            return;
        }
        frame._onLifecycleEvent(event.loaderId, event.name);
        this.emit(exports.FrameManagerEmittedEvents.LifecycleEvent, frame);
    }
    #onFrameStartedLoading(frameId) {
        const frame = this.frame(frameId);
        if (!frame) {
            return;
        }
        frame._onLoadingStarted();
    }
    #onFrameStoppedLoading(frameId) {
        const frame = this.frame(frameId);
        if (!frame) {
            return;
        }
        frame._onLoadingStopped();
        this.emit(exports.FrameManagerEmittedEvents.LifecycleEvent, frame);
    }
    #handleFrameTree(session, frameTree) {
        if (frameTree.frame.parentId) {
            this.#onFrameAttached(session, frameTree.frame.id, frameTree.frame.parentId);
        }
        if (!this.#frameNavigatedReceived.has(frameTree.frame.id)) {
            void this.#onFrameNavigated(frameTree.frame);
        }
        else {
            this.#frameNavigatedReceived.delete(frameTree.frame.id);
        }
        if (!frameTree.childFrames) {
            return;
        }
        for (const child of frameTree.childFrames) {
            this.#handleFrameTree(session, child);
        }
    }
    #onFrameAttached(session, frameId, parentFrameId) {
        let frame = this.frame(frameId);
        if (frame) {
            if (session && frame.isOOPFrame()) {
                // If an OOP iframes becomes a normal iframe again
                // it is first attached to the parent page before
                // the target is removed.
                frame.updateClient(session);
            }
            return;
        }
        frame = new Frame_js_1.Frame(this, frameId, parentFrameId, session);
        this._frameTree.addFrame(frame);
        this.emit(exports.FrameManagerEmittedEvents.FrameAttached, frame);
    }
    async #onFrameNavigated(framePayload) {
        const frameId = framePayload.id;
        const isMainFrame = !framePayload.parentId;
        let frame = this._frameTree.getById(frameId);
        // Detach all child frames first.
        if (frame) {
            for (const child of frame.childFrames()) {
                this.#removeFramesRecursively(child);
            }
        }
        // Update or create main frame.
        if (isMainFrame) {
            if (frame) {
                // Update frame id to retain frame identity on cross-process navigation.
                this._frameTree.removeFrame(frame);
                frame._id = frameId;
            }
            else {
                // Initial main frame navigation.
                frame = new Frame_js_1.Frame(this, frameId, undefined, this.#client);
            }
            this._frameTree.addFrame(frame);
        }
        frame = await this._frameTree.waitForFrame(frameId);
        frame._navigated(framePayload);
        this.emit(exports.FrameManagerEmittedEvents.FrameNavigated, frame);
    }
    async #createIsolatedWorld(session, name) {
        const key = `${session.id()}:${name}`;
        if (this.#isolatedWorlds.has(key)) {
            return;
        }
        await session.send('Page.addScriptToEvaluateOnNewDocument', {
            source: `//# sourceURL=${util_js_1.PuppeteerURL.INTERNAL_URL}`,
            worldName: name,
        });
        await Promise.all(this.frames()
            .filter(frame => {
            return frame._client() === session;
        })
            .map(frame => {
            // Frames might be removed before we send this, so we don't want to
            // throw an error.
            return session
                .send('Page.createIsolatedWorld', {
                frameId: frame._id,
                worldName: name,
                grantUniveralAccess: true,
            })
                .catch(util_js_1.debugError);
        }));
        this.#isolatedWorlds.add(key);
    }
    #onFrameNavigatedWithinDocument(frameId, url) {
        const frame = this.frame(frameId);
        if (!frame) {
            return;
        }
        frame._navigatedWithinDocument(url);
        this.emit(exports.FrameManagerEmittedEvents.FrameNavigatedWithinDocument, frame);
        this.emit(exports.FrameManagerEmittedEvents.FrameNavigated, frame);
    }
    #onFrameDetached(frameId, reason) {
        const frame = this.frame(frameId);
        if (reason === 'remove') {
            // Only remove the frame if the reason for the detached event is
            // an actual removement of the frame.
            // For frames that become OOP iframes, the reason would be 'swap'.
            if (frame) {
                this.#removeFramesRecursively(frame);
            }
        }
        else if (reason === 'swap') {
            this.emit(exports.FrameManagerEmittedEvents.FrameSwapped, frame);
        }
    }
    #onExecutionContextCreated(contextPayload, session) {
        const auxData = contextPayload.auxData;
        const frameId = auxData && auxData.frameId;
        const frame = typeof frameId === 'string' ? this.frame(frameId) : undefined;
        let world;
        if (frame) {
            // Only care about execution contexts created for the current session.
            if (frame._client() !== session) {
                return;
            }
            if (contextPayload.auxData && contextPayload.auxData['isDefault']) {
                world = frame.worlds[IsolatedWorlds_js_1.MAIN_WORLD];
            }
            else if (contextPayload.name === exports.UTILITY_WORLD_NAME &&
                !frame.worlds[IsolatedWorlds_js_1.PUPPETEER_WORLD].hasContext()) {
                // In case of multiple sessions to the same target, there's a race between
                // connections so we might end up creating multiple isolated worlds.
                // We can use either.
                world = frame.worlds[IsolatedWorlds_js_1.PUPPETEER_WORLD];
            }
        }
        const context = new ExecutionContext_js_1.ExecutionContext(frame?._client() || this.#client, contextPayload, world);
        if (world) {
            world.setContext(context);
        }
        const key = `${session.id()}:${contextPayload.id}`;
        this.#contextIdToContext.set(key, context);
    }
    #onExecutionContextDestroyed(executionContextId, session) {
        const key = `${session.id()}:${executionContextId}`;
        const context = this.#contextIdToContext.get(key);
        if (!context) {
            return;
        }
        this.#contextIdToContext.delete(key);
        if (context._world) {
            context._world.clearContext();
        }
    }
    #onExecutionContextsCleared(session) {
        for (const [key, context] of this.#contextIdToContext.entries()) {
            // Make sure to only clear execution contexts that belong
            // to the current session.
            if (context._client !== session) {
                continue;
            }
            if (context._world) {
                context._world.clearContext();
            }
            this.#contextIdToContext.delete(key);
        }
    }
    #removeFramesRecursively(frame) {
        for (const child of frame.childFrames()) {
            this.#removeFramesRecursively(child);
        }
        frame._detach();
        this._frameTree.removeFrame(frame);
        this.emit(exports.FrameManagerEmittedEvents.FrameDetached, frame);
    }
}
exports.FrameManager = FrameManager;
//# sourceMappingURL=FrameManager.js.map
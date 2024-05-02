/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { CDPSessionEvent } from '../api/CDPSession.js';
import { FrameEvent } from '../api/Frame.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { debugError, PuppeteerURL, UTILITY_WORLD_NAME } from '../common/util.js';
import { assert } from '../util/assert.js';
import { Deferred } from '../util/Deferred.js';
import { disposeSymbol } from '../util/disposable.js';
import { isErrorLike } from '../util/ErrorLike.js';
import { CdpCDPSession } from './CDPSession.js';
import { isTargetClosedError } from './Connection.js';
import { DeviceRequestPromptManager } from './DeviceRequestPrompt.js';
import { ExecutionContext } from './ExecutionContext.js';
import { CdpFrame } from './Frame.js';
import { FrameManagerEvent } from './FrameManagerEvents.js';
import { FrameTree } from './FrameTree.js';
import { MAIN_WORLD, PUPPETEER_WORLD } from './IsolatedWorlds.js';
import { NetworkManager } from './NetworkManager.js';
const TIME_FOR_WAITING_FOR_SWAP = 100; // ms.
/**
 * A frame manager manages the frames for a given {@link Page | page}.
 *
 * @internal
 */
export class FrameManager extends EventEmitter {
    #page;
    #networkManager;
    #timeoutSettings;
    #contextIdToContext = new Map();
    #isolatedWorlds = new Set();
    #client;
    _frameTree = new FrameTree();
    /**
     * Set of frame IDs stored to indicate if a frame has received a
     * frameNavigated event so that frame tree responses could be ignored as the
     * frameNavigated event usually contains the latest information.
     */
    #frameNavigatedReceived = new Set();
    #deviceRequestPromptManagerMap = new WeakMap();
    #frameTreeHandled;
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
        this.#networkManager = new NetworkManager(ignoreHTTPSErrors, this);
        this.#timeoutSettings = timeoutSettings;
        this.setupEventListeners(this.#client);
        client.once(CDPSessionEvent.Disconnected, () => {
            this.#onClientDisconnect().catch(debugError);
        });
    }
    /**
     * Called when the frame's client is disconnected. We don't know if the
     * disconnect means that the frame is removed or if it will be replaced by a
     * new frame. Therefore, we wait for a swap event.
     */
    async #onClientDisconnect() {
        const mainFrame = this._frameTree.getMainFrame();
        if (!mainFrame) {
            return;
        }
        for (const child of mainFrame.childFrames()) {
            this.#removeFramesRecursively(child);
        }
        const swapped = Deferred.create({
            timeout: TIME_FOR_WAITING_FOR_SWAP,
            message: 'Frame was not swapped',
        });
        mainFrame.once(FrameEvent.FrameSwappedByActivation, () => {
            swapped.resolve();
        });
        try {
            await swapped.valueOrThrow();
        }
        catch (err) {
            this.#removeFramesRecursively(mainFrame);
        }
    }
    /**
     * When the main frame is replaced by another main frame,
     * we maintain the main frame object identity while updating
     * its frame tree and ID.
     */
    async swapFrameTree(client) {
        this.#onExecutionContextsCleared(this.#client);
        this.#client = client;
        assert(this.#client instanceof CdpCDPSession, 'CDPSession is not an instance of CDPSessionImpl.');
        const frame = this._frameTree.getMainFrame();
        if (frame) {
            this.#frameNavigatedReceived.add(this.#client._target()._targetId);
            this._frameTree.removeFrame(frame);
            frame.updateId(this.#client._target()._targetId);
            frame.mainRealm().clearContext();
            frame.isolatedRealm().clearContext();
            this._frameTree.addFrame(frame);
            frame.updateClient(client, true);
        }
        this.setupEventListeners(client);
        client.once(CDPSessionEvent.Disconnected, () => {
            this.#onClientDisconnect().catch(debugError);
        });
        await this.initialize(client);
        await this.#networkManager.addClient(client);
        if (frame) {
            frame.emit(FrameEvent.FrameSwappedByActivation, undefined);
        }
    }
    async registerSpeculativeSession(client) {
        await this.#networkManager.addClient(client);
    }
    setupEventListeners(session) {
        session.on('Page.frameAttached', async (event) => {
            await this.#frameTreeHandled?.valueOrThrow();
            this.#onFrameAttached(session, event.frameId, event.parentFrameId);
        });
        session.on('Page.frameNavigated', async (event) => {
            this.#frameNavigatedReceived.add(event.frame.id);
            await this.#frameTreeHandled?.valueOrThrow();
            void this.#onFrameNavigated(event.frame, event.type);
        });
        session.on('Page.navigatedWithinDocument', async (event) => {
            await this.#frameTreeHandled?.valueOrThrow();
            this.#onFrameNavigatedWithinDocument(event.frameId, event.url);
        });
        session.on('Page.frameDetached', async (event) => {
            await this.#frameTreeHandled?.valueOrThrow();
            this.#onFrameDetached(event.frameId, event.reason);
        });
        session.on('Page.frameStartedLoading', async (event) => {
            await this.#frameTreeHandled?.valueOrThrow();
            this.#onFrameStartedLoading(event.frameId);
        });
        session.on('Page.frameStoppedLoading', async (event) => {
            await this.#frameTreeHandled?.valueOrThrow();
            this.#onFrameStoppedLoading(event.frameId);
        });
        session.on('Runtime.executionContextCreated', async (event) => {
            await this.#frameTreeHandled?.valueOrThrow();
            this.#onExecutionContextCreated(event.context, session);
        });
        session.on('Runtime.executionContextDestroyed', async (event) => {
            await this.#frameTreeHandled?.valueOrThrow();
            this.#onExecutionContextDestroyed(event.executionContextId, session);
        });
        session.on('Runtime.executionContextsCleared', async () => {
            await this.#frameTreeHandled?.valueOrThrow();
            this.#onExecutionContextsCleared(session);
        });
        session.on('Page.lifecycleEvent', async (event) => {
            await this.#frameTreeHandled?.valueOrThrow();
            this.#onLifecycleEvent(event);
        });
    }
    async initialize(client) {
        try {
            this.#frameTreeHandled?.resolve();
            this.#frameTreeHandled = Deferred.create();
            // We need to schedule all these commands while the target is paused,
            // therefore, it needs to happen synchroniously. At the same time we
            // should not start processing execution context and frame events before
            // we received the initial information about the frame tree.
            await Promise.all([
                this.#networkManager.addClient(client),
                client.send('Page.enable'),
                client.send('Page.getFrameTree').then(({ frameTree }) => {
                    this.#handleFrameTree(client, frameTree);
                    this.#frameTreeHandled?.resolve();
                }),
                client.send('Page.setLifecycleEventsEnabled', { enabled: true }),
                client.send('Runtime.enable').then(() => {
                    return this.#createIsolatedWorld(client, UTILITY_WORLD_NAME);
                }),
            ]);
        }
        catch (error) {
            this.#frameTreeHandled?.resolve();
            // The target might have been closed before the initialization finished.
            if (isErrorLike(error) && isTargetClosedError(error)) {
                return;
            }
            throw error;
        }
    }
    executionContextById(contextId, session = this.#client) {
        const context = this.getExecutionContextById(contextId, session);
        assert(context, 'INTERNAL ERROR: missing context with id = ' + contextId);
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
        assert(mainFrame, 'Requesting main frame too early!');
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
    _deviceRequestPromptManager(client) {
        let manager = this.#deviceRequestPromptManagerMap.get(client);
        if (manager === undefined) {
            manager = new DeviceRequestPromptManager(client, this.#timeoutSettings);
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
        this.emit(FrameManagerEvent.LifecycleEvent, frame);
        frame.emit(FrameEvent.LifecycleEvent, undefined);
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
        this.emit(FrameManagerEvent.LifecycleEvent, frame);
        frame.emit(FrameEvent.LifecycleEvent, undefined);
    }
    #handleFrameTree(session, frameTree) {
        if (frameTree.frame.parentId) {
            this.#onFrameAttached(session, frameTree.frame.id, frameTree.frame.parentId);
        }
        if (!this.#frameNavigatedReceived.has(frameTree.frame.id)) {
            void this.#onFrameNavigated(frameTree.frame, 'Navigation');
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
        frame = new CdpFrame(this, frameId, parentFrameId, session);
        this._frameTree.addFrame(frame);
        this.emit(FrameManagerEvent.FrameAttached, frame);
    }
    async #onFrameNavigated(framePayload, navigationType) {
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
                frame = new CdpFrame(this, frameId, undefined, this.#client);
            }
            this._frameTree.addFrame(frame);
        }
        frame = await this._frameTree.waitForFrame(frameId);
        frame._navigated(framePayload);
        this.emit(FrameManagerEvent.FrameNavigated, frame);
        frame.emit(FrameEvent.FrameNavigated, navigationType);
    }
    async #createIsolatedWorld(session, name) {
        const key = `${session.id()}:${name}`;
        if (this.#isolatedWorlds.has(key)) {
            return;
        }
        await session.send('Page.addScriptToEvaluateOnNewDocument', {
            source: `//# sourceURL=${PuppeteerURL.INTERNAL_URL}`,
            worldName: name,
        });
        await Promise.all(this.frames()
            .filter(frame => {
            return frame.client === session;
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
                .catch(debugError);
        }));
        this.#isolatedWorlds.add(key);
    }
    #onFrameNavigatedWithinDocument(frameId, url) {
        const frame = this.frame(frameId);
        if (!frame) {
            return;
        }
        frame._navigatedWithinDocument(url);
        this.emit(FrameManagerEvent.FrameNavigatedWithinDocument, frame);
        frame.emit(FrameEvent.FrameNavigatedWithinDocument, undefined);
        this.emit(FrameManagerEvent.FrameNavigated, frame);
        frame.emit(FrameEvent.FrameNavigated, 'Navigation');
    }
    #onFrameDetached(frameId, reason) {
        const frame = this.frame(frameId);
        if (!frame) {
            return;
        }
        switch (reason) {
            case 'remove':
                // Only remove the frame if the reason for the detached event is
                // an actual removement of the frame.
                // For frames that become OOP iframes, the reason would be 'swap'.
                this.#removeFramesRecursively(frame);
                break;
            case 'swap':
                this.emit(FrameManagerEvent.FrameSwapped, frame);
                frame.emit(FrameEvent.FrameSwapped, undefined);
                break;
        }
    }
    #onExecutionContextCreated(contextPayload, session) {
        const auxData = contextPayload.auxData;
        const frameId = auxData && auxData.frameId;
        const frame = typeof frameId === 'string' ? this.frame(frameId) : undefined;
        let world;
        if (frame) {
            // Only care about execution contexts created for the current session.
            if (frame.client !== session) {
                return;
            }
            if (contextPayload.auxData && contextPayload.auxData['isDefault']) {
                world = frame.worlds[MAIN_WORLD];
            }
            else if (contextPayload.name === UTILITY_WORLD_NAME &&
                !frame.worlds[PUPPETEER_WORLD].hasContext()) {
                // In case of multiple sessions to the same target, there's a race between
                // connections so we might end up creating multiple isolated worlds.
                // We can use either.
                world = frame.worlds[PUPPETEER_WORLD];
            }
        }
        // If there is no world, the context is not meant to be handled by us.
        if (!world) {
            return;
        }
        const context = new ExecutionContext(frame?.client || this.#client, contextPayload, world);
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
        frame[disposeSymbol]();
        this._frameTree.removeFrame(frame);
        this.emit(FrameManagerEvent.FrameDetached, frame);
        frame.emit(FrameEvent.FrameDetached, frame);
    }
}
//# sourceMappingURL=FrameManager.js.map
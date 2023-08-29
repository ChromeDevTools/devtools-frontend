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
exports.Frame = exports.FrameEmittedEvents = void 0;
const Frame_js_1 = require("../api/Frame.js");
const assert_js_1 = require("../util/assert.js");
const Deferred_js_1 = require("../util/Deferred.js");
const ErrorLike_js_1 = require("../util/ErrorLike.js");
const IsolatedWorld_js_1 = require("./IsolatedWorld.js");
const IsolatedWorlds_js_1 = require("./IsolatedWorlds.js");
const LifecycleWatcher_js_1 = require("./LifecycleWatcher.js");
const util_js_1 = require("./util.js");
/**
 * We use symbols to prevent external parties listening to these events.
 * They are internal to Puppeteer.
 *
 * @internal
 */
exports.FrameEmittedEvents = {
    FrameNavigated: Symbol('Frame.FrameNavigated'),
    FrameSwapped: Symbol('Frame.FrameSwapped'),
    LifecycleEvent: Symbol('Frame.LifecycleEvent'),
    FrameNavigatedWithinDocument: Symbol('Frame.FrameNavigatedWithinDocument'),
    FrameDetached: Symbol('Frame.FrameDetached'),
    FrameSwappedByActivation: Symbol('Frame.FrameSwappedByActivation'),
};
/**
 * @internal
 */
class Frame extends Frame_js_1.Frame {
    #url = '';
    #detached = false;
    #client;
    _frameManager;
    _id;
    _loaderId = '';
    _hasStartedLoading = false;
    _lifecycleEvents = new Set();
    _parentId;
    constructor(frameManager, frameId, parentFrameId, client) {
        super();
        this._frameManager = frameManager;
        this.#url = '';
        this._id = frameId;
        this._parentId = parentFrameId;
        this.#detached = false;
        this._loaderId = '';
        this.updateClient(client);
        this.on(exports.FrameEmittedEvents.FrameSwappedByActivation, () => {
            // Emulate loading process for swapped frames.
            this._onLoadingStarted();
            this._onLoadingStopped();
        });
    }
    /**
     * Updates the frame ID with the new ID. This happens when the main frame is
     * replaced by a different frame.
     */
    updateId(id) {
        this._id = id;
    }
    updateClient(client, keepWorlds = false) {
        this.#client = client;
        if (!keepWorlds) {
            this.worlds = {
                [IsolatedWorlds_js_1.MAIN_WORLD]: new IsolatedWorld_js_1.IsolatedWorld(this),
                [IsolatedWorlds_js_1.PUPPETEER_WORLD]: new IsolatedWorld_js_1.IsolatedWorld(this),
            };
        }
        else {
            this.worlds[IsolatedWorlds_js_1.MAIN_WORLD].frameUpdated();
            this.worlds[IsolatedWorlds_js_1.PUPPETEER_WORLD].frameUpdated();
        }
    }
    page() {
        return this._frameManager.page();
    }
    isOOPFrame() {
        return this.#client !== this._frameManager.client;
    }
    async goto(url, options = {}) {
        const { referer = this._frameManager.networkManager.extraHTTPHeaders()['referer'], referrerPolicy = this._frameManager.networkManager.extraHTTPHeaders()['referer-policy'], waitUntil = ['load'], timeout = this._frameManager.timeoutSettings.navigationTimeout(), } = options;
        let ensureNewDocumentNavigation = false;
        const watcher = new LifecycleWatcher_js_1.LifecycleWatcher(this._frameManager.networkManager, this, waitUntil, timeout);
        let error = await Deferred_js_1.Deferred.race([
            navigate(this.#client, url, referer, referrerPolicy, this._id),
            watcher.terminationPromise(),
        ]);
        if (!error) {
            error = await Deferred_js_1.Deferred.race([
                watcher.terminationPromise(),
                ensureNewDocumentNavigation
                    ? watcher.newDocumentNavigationPromise()
                    : watcher.sameDocumentNavigationPromise(),
            ]);
        }
        try {
            if (error) {
                throw error;
            }
            return await watcher.navigationResponse();
        }
        finally {
            watcher.dispose();
        }
        async function navigate(client, url, referrer, referrerPolicy, frameId) {
            try {
                const response = await client.send('Page.navigate', {
                    url,
                    referrer,
                    frameId,
                    referrerPolicy,
                });
                ensureNewDocumentNavigation = !!response.loaderId;
                if (response.errorText === 'net::ERR_HTTP_RESPONSE_CODE_FAILURE') {
                    return null;
                }
                return response.errorText
                    ? new Error(`${response.errorText} at ${url}`)
                    : null;
            }
            catch (error) {
                if ((0, ErrorLike_js_1.isErrorLike)(error)) {
                    return error;
                }
                throw error;
            }
        }
    }
    async waitForNavigation(options = {}) {
        const { waitUntil = ['load'], timeout = this._frameManager.timeoutSettings.navigationTimeout(), } = options;
        const watcher = new LifecycleWatcher_js_1.LifecycleWatcher(this._frameManager.networkManager, this, waitUntil, timeout);
        const error = await Deferred_js_1.Deferred.race([
            watcher.terminationPromise(),
            watcher.sameDocumentNavigationPromise(),
            watcher.newDocumentNavigationPromise(),
        ]);
        try {
            if (error) {
                throw error;
            }
            return await watcher.navigationResponse();
        }
        finally {
            watcher.dispose();
        }
    }
    _client() {
        return this.#client;
    }
    executionContext() {
        return this.worlds[IsolatedWorlds_js_1.MAIN_WORLD].executionContext();
    }
    /**
     * @internal
     */
    mainRealm() {
        return this.worlds[IsolatedWorlds_js_1.MAIN_WORLD];
    }
    /**
     * @internal
     */
    isolatedRealm() {
        return this.worlds[IsolatedWorlds_js_1.PUPPETEER_WORLD];
    }
    async evaluateHandle(pageFunction, ...args) {
        pageFunction = (0, util_js_1.withSourcePuppeteerURLIfNone)(this.evaluateHandle.name, pageFunction);
        return this.mainRealm().evaluateHandle(pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        pageFunction = (0, util_js_1.withSourcePuppeteerURLIfNone)(this.evaluate.name, pageFunction);
        return this.mainRealm().evaluate(pageFunction, ...args);
    }
    async $(selector) {
        return this.mainRealm().$(selector);
    }
    async $$(selector) {
        return this.mainRealm().$$(selector);
    }
    async $eval(selector, pageFunction, ...args) {
        pageFunction = (0, util_js_1.withSourcePuppeteerURLIfNone)(this.$eval.name, pageFunction);
        return this.mainRealm().$eval(selector, pageFunction, ...args);
    }
    async $$eval(selector, pageFunction, ...args) {
        pageFunction = (0, util_js_1.withSourcePuppeteerURLIfNone)(this.$$eval.name, pageFunction);
        return this.mainRealm().$$eval(selector, pageFunction, ...args);
    }
    async $x(expression) {
        return this.mainRealm().$x(expression);
    }
    async content() {
        return this.isolatedRealm().content();
    }
    async setContent(html, options = {}) {
        return this.isolatedRealm().setContent(html, options);
    }
    name() {
        return this._name || '';
    }
    url() {
        return this.#url;
    }
    parentFrame() {
        return this._frameManager._frameTree.parentFrame(this._id) || null;
    }
    childFrames() {
        return this._frameManager._frameTree.childFrames(this._id);
    }
    isDetached() {
        return this.#detached;
    }
    async title() {
        return this.isolatedRealm().title();
    }
    _deviceRequestPromptManager() {
        if (this.isOOPFrame()) {
            return this._frameManager._deviceRequestPromptManager(this.#client);
        }
        const parentFrame = this.parentFrame();
        (0, assert_js_1.assert)(parentFrame !== null);
        return parentFrame._deviceRequestPromptManager();
    }
    waitForDevicePrompt(options = {}) {
        return this._deviceRequestPromptManager().waitForDevicePrompt(options);
    }
    _navigated(framePayload) {
        this._name = framePayload.name;
        this.#url = `${framePayload.url}${framePayload.urlFragment || ''}`;
    }
    _navigatedWithinDocument(url) {
        this.#url = url;
    }
    _onLifecycleEvent(loaderId, name) {
        if (name === 'init') {
            this._loaderId = loaderId;
            this._lifecycleEvents.clear();
        }
        this._lifecycleEvents.add(name);
    }
    _onLoadingStopped() {
        this._lifecycleEvents.add('DOMContentLoaded');
        this._lifecycleEvents.add('load');
    }
    _onLoadingStarted() {
        this._hasStartedLoading = true;
    }
    _detach() {
        this.#detached = true;
        this.worlds[IsolatedWorlds_js_1.MAIN_WORLD]._detach();
        this.worlds[IsolatedWorlds_js_1.PUPPETEER_WORLD]._detach();
    }
}
exports.Frame = Frame;
//# sourceMappingURL=Frame.js.map
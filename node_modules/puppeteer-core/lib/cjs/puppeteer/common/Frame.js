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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Frame_url, _Frame_detached, _Frame_client;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Frame = void 0;
const Frame_js_1 = require("../api/Frame.js");
const assert_js_1 = require("../util/assert.js");
const Deferred_js_1 = require("../util/Deferred.js");
const ErrorLike_js_1 = require("../util/ErrorLike.js");
const IsolatedWorld_js_1 = require("./IsolatedWorld.js");
const IsolatedWorlds_js_1 = require("./IsolatedWorlds.js");
const LazyArg_js_1 = require("./LazyArg.js");
const LifecycleWatcher_js_1 = require("./LifecycleWatcher.js");
const util_js_1 = require("./util.js");
/**
 * @internal
 */
class Frame extends Frame_js_1.Frame {
    constructor(frameManager, frameId, parentFrameId, client) {
        super();
        _Frame_url.set(this, '');
        _Frame_detached.set(this, false);
        _Frame_client.set(this, void 0);
        this._loaderId = '';
        this._hasStartedLoading = false;
        this._lifecycleEvents = new Set();
        this._frameManager = frameManager;
        __classPrivateFieldSet(this, _Frame_url, '', "f");
        this._id = frameId;
        this._parentId = parentFrameId;
        __classPrivateFieldSet(this, _Frame_detached, false, "f");
        this._loaderId = '';
        this.updateClient(client);
    }
    updateClient(client) {
        __classPrivateFieldSet(this, _Frame_client, client, "f");
        this.worlds = {
            [IsolatedWorlds_js_1.MAIN_WORLD]: new IsolatedWorld_js_1.IsolatedWorld(this),
            [IsolatedWorlds_js_1.PUPPETEER_WORLD]: new IsolatedWorld_js_1.IsolatedWorld(this),
        };
    }
    page() {
        return this._frameManager.page();
    }
    isOOPFrame() {
        return __classPrivateFieldGet(this, _Frame_client, "f") !== this._frameManager.client;
    }
    async goto(url, options = {}) {
        const { referer = this._frameManager.networkManager.extraHTTPHeaders()['referer'], referrerPolicy = this._frameManager.networkManager.extraHTTPHeaders()['referer-policy'], waitUntil = ['load'], timeout = this._frameManager.timeoutSettings.navigationTimeout(), } = options;
        let ensureNewDocumentNavigation = false;
        const watcher = new LifecycleWatcher_js_1.LifecycleWatcher(this._frameManager, this, waitUntil, timeout);
        let error = await Deferred_js_1.Deferred.race([
            navigate(__classPrivateFieldGet(this, _Frame_client, "f"), url, referer, referrerPolicy, this._id),
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
        const watcher = new LifecycleWatcher_js_1.LifecycleWatcher(this._frameManager, this, waitUntil, timeout);
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
        return __classPrivateFieldGet(this, _Frame_client, "f");
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
        return __classPrivateFieldGet(this, _Frame_url, "f");
    }
    parentFrame() {
        return this._frameManager._frameTree.parentFrame(this._id) || null;
    }
    childFrames() {
        return this._frameManager._frameTree.childFrames(this._id);
    }
    isDetached() {
        return __classPrivateFieldGet(this, _Frame_detached, "f");
    }
    async addScriptTag(options) {
        let { content = '', type } = options;
        const { path } = options;
        if (+!!options.url + +!!path + +!!content !== 1) {
            throw new Error('Exactly one of `url`, `path`, or `content` must be specified.');
        }
        if (path) {
            const fs = await (0, util_js_1.importFSPromises)();
            content = await fs.readFile(path, 'utf8');
            content += `//# sourceURL=${path.replace(/\n/g, '')}`;
        }
        type = type ?? 'text/javascript';
        return this.mainRealm().transferHandle(await this.isolatedRealm().evaluateHandle(async ({ Deferred }, { url, id, type, content }) => {
            const deferred = Deferred.create();
            const script = document.createElement('script');
            script.type = type;
            script.text = content;
            if (url) {
                script.src = url;
                script.addEventListener('load', () => {
                    return deferred.resolve();
                }, { once: true });
                script.addEventListener('error', event => {
                    deferred.reject(new Error(event.message ?? 'Could not load script'));
                }, { once: true });
            }
            else {
                deferred.resolve();
            }
            if (id) {
                script.id = id;
            }
            document.head.appendChild(script);
            await deferred.valueOrThrow();
            return script;
        }, LazyArg_js_1.LazyArg.create(context => {
            return context.puppeteerUtil;
        }), { ...options, type, content }));
    }
    async addStyleTag(options) {
        let { content = '' } = options;
        const { path } = options;
        if (+!!options.url + +!!path + +!!content !== 1) {
            throw new Error('Exactly one of `url`, `path`, or `content` must be specified.');
        }
        if (path) {
            const fs = await (0, util_js_1.importFSPromises)();
            content = await fs.readFile(path, 'utf8');
            content += '/*# sourceURL=' + path.replace(/\n/g, '') + '*/';
            options.content = content;
        }
        return this.mainRealm().transferHandle(await this.isolatedRealm().evaluateHandle(async ({ Deferred }, { url, content }) => {
            const deferred = Deferred.create();
            let element;
            if (!url) {
                element = document.createElement('style');
                element.appendChild(document.createTextNode(content));
            }
            else {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = url;
                element = link;
            }
            element.addEventListener('load', () => {
                deferred.resolve();
            }, { once: true });
            element.addEventListener('error', event => {
                deferred.reject(new Error(event.message ?? 'Could not load style'));
            }, { once: true });
            document.head.appendChild(element);
            await deferred.valueOrThrow();
            return element;
        }, LazyArg_js_1.LazyArg.create(context => {
            return context.puppeteerUtil;
        }), options));
    }
    async title() {
        return this.isolatedRealm().title();
    }
    _deviceRequestPromptManager() {
        if (this.isOOPFrame()) {
            return this._frameManager._deviceRequestPromptManager(__classPrivateFieldGet(this, _Frame_client, "f"));
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
        __classPrivateFieldSet(this, _Frame_url, `${framePayload.url}${framePayload.urlFragment || ''}`, "f");
    }
    _navigatedWithinDocument(url) {
        __classPrivateFieldSet(this, _Frame_url, url, "f");
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
        __classPrivateFieldSet(this, _Frame_detached, true, "f");
        this.worlds[IsolatedWorlds_js_1.MAIN_WORLD]._detach();
        this.worlds[IsolatedWorlds_js_1.PUPPETEER_WORLD]._detach();
    }
}
exports.Frame = Frame;
_Frame_url = new WeakMap(), _Frame_detached = new WeakMap(), _Frame_client = new WeakMap();
//# sourceMappingURL=Frame.js.map
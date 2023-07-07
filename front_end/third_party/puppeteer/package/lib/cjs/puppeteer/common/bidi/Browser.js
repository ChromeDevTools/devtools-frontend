"use strict";
/**
 * Copyright 2022 Google Inc. All rights reserved.
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
var _Browser_browserName, _Browser_browserVersion, _Browser_process, _Browser_closeCallback, _Browser_connection, _Browser_defaultViewport, _Browser_defaultContext;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Browser = void 0;
const Browser_js_1 = require("../../api/Browser.js");
const BrowserContext_js_1 = require("./BrowserContext.js");
const utils_js_1 = require("./utils.js");
/**
 * @internal
 */
class Browser extends Browser_js_1.Browser {
    static async create(opts) {
        let browserName = '';
        let browserVersion = '';
        // TODO: await until the connection is established.
        try {
            const { result } = await opts.connection.send('session.new', {
                capabilities: {
                    alwaysMatch: {
                        acceptInsecureCerts: opts.ignoreHTTPSErrors,
                    },
                },
            });
            browserName = result.capabilities.browserName ?? '';
            browserVersion = result.capabilities.browserVersion ?? '';
        }
        catch (err) {
            // Chrome does not support session.new.
            (0, utils_js_1.debugError)(err);
        }
        await opts.connection.send('session.subscribe', {
            events: browserName.toLocaleLowerCase().includes('firefox')
                ? Browser.subscribeModules
                : [...Browser.subscribeModules, ...Browser.subscribeCdpEvents],
        });
        return new Browser({
            ...opts,
            browserName,
            browserVersion,
        });
    }
    constructor(opts) {
        super();
        _Browser_browserName.set(this, '');
        _Browser_browserVersion.set(this, '');
        _Browser_process.set(this, void 0);
        _Browser_closeCallback.set(this, void 0);
        _Browser_connection.set(this, void 0);
        _Browser_defaultViewport.set(this, void 0);
        _Browser_defaultContext.set(this, void 0);
        __classPrivateFieldSet(this, _Browser_process, opts.process, "f");
        __classPrivateFieldSet(this, _Browser_closeCallback, opts.closeCallback, "f");
        __classPrivateFieldSet(this, _Browser_connection, opts.connection, "f");
        __classPrivateFieldSet(this, _Browser_defaultViewport, opts.defaultViewport, "f");
        __classPrivateFieldSet(this, _Browser_browserName, opts.browserName, "f");
        __classPrivateFieldSet(this, _Browser_browserVersion, opts.browserVersion, "f");
        __classPrivateFieldGet(this, _Browser_process, "f")?.once('close', () => {
            __classPrivateFieldGet(this, _Browser_connection, "f").dispose();
            this.emit("disconnected" /* BrowserEmittedEvents.Disconnected */);
        });
        __classPrivateFieldSet(this, _Browser_defaultContext, new BrowserContext_js_1.BrowserContext(this, {
            defaultViewport: __classPrivateFieldGet(this, _Browser_defaultViewport, "f"),
            isDefault: true,
        }), "f");
    }
    get connection() {
        return __classPrivateFieldGet(this, _Browser_connection, "f");
    }
    wsEndpoint() {
        return __classPrivateFieldGet(this, _Browser_connection, "f").url;
    }
    async close() {
        if (__classPrivateFieldGet(this, _Browser_connection, "f").closed) {
            return;
        }
        // TODO: implement browser.close.
        // await this.#connection.send('browser.close', {});
        __classPrivateFieldGet(this, _Browser_connection, "f").dispose();
        await __classPrivateFieldGet(this, _Browser_closeCallback, "f")?.call(null);
    }
    isConnected() {
        return !__classPrivateFieldGet(this, _Browser_connection, "f").closed;
    }
    process() {
        return __classPrivateFieldGet(this, _Browser_process, "f") ?? null;
    }
    async createIncognitoBrowserContext(_options) {
        // TODO: implement incognito context https://github.com/w3c/webdriver-bidi/issues/289.
        return new BrowserContext_js_1.BrowserContext(this, {
            defaultViewport: __classPrivateFieldGet(this, _Browser_defaultViewport, "f"),
            isDefault: false,
        });
    }
    async version() {
        return `${__classPrivateFieldGet(this, _Browser_browserName, "f")}/${__classPrivateFieldGet(this, _Browser_browserVersion, "f")}`;
    }
    /**
     * Returns an array of all open browser contexts. In a newly created browser, this will
     * return a single instance of {@link BrowserContext}.
     */
    browserContexts() {
        // TODO: implement incognito context https://github.com/w3c/webdriver-bidi/issues/289.
        return [__classPrivateFieldGet(this, _Browser_defaultContext, "f")];
    }
    /**
     * Returns the default browser context. The default browser context cannot be closed.
     */
    defaultBrowserContext() {
        return __classPrivateFieldGet(this, _Browser_defaultContext, "f");
    }
    newPage() {
        return __classPrivateFieldGet(this, _Browser_defaultContext, "f").newPage();
    }
}
exports.Browser = Browser;
_Browser_browserName = new WeakMap(), _Browser_browserVersion = new WeakMap(), _Browser_process = new WeakMap(), _Browser_closeCallback = new WeakMap(), _Browser_connection = new WeakMap(), _Browser_defaultViewport = new WeakMap(), _Browser_defaultContext = new WeakMap();
Browser.subscribeModules = [
    'browsingContext',
    'network',
    'log',
];
Browser.subscribeCdpEvents = [
    // Coverage
    'cdp.Debugger.scriptParsed',
    'cdp.CSS.styleSheetAdded',
    'cdp.Runtime.executionContextsCleared',
    // Tracing
    'cdp.Tracing.tracingComplete',
];
//# sourceMappingURL=Browser.js.map
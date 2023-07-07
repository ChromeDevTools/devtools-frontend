"use strict";
/**
 * Copyright 2023 Google Inc. All rights reserved.
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
var _Frame_page, _Frame_context, _Frame_timeoutSettings, _Frame_abortDeferred;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Frame = void 0;
const Bidi = __importStar(require("chromium-bidi/lib/cjs/protocol/protocol.js"));
const Frame_js_1 = require("../../api/Frame.js");
const Deferred_js_1 = require("../../util/Deferred.js");
const FrameManager_js_1 = require("../FrameManager.js");
const util_js_1 = require("../util.js");
const BrowsingContext_js_1 = require("./BrowsingContext.js");
const Sandbox_js_1 = require("./Sandbox.js");
/**
 * Puppeteer's Frame class could be viewed as a BiDi BrowsingContext implementation
 * @internal
 */
class Frame extends Frame_js_1.Frame {
    constructor(page, context, timeoutSettings, parentId) {
        super();
        _Frame_page.set(this, void 0);
        _Frame_context.set(this, void 0);
        _Frame_timeoutSettings.set(this, void 0);
        _Frame_abortDeferred.set(this, Deferred_js_1.Deferred.create());
        __classPrivateFieldSet(this, _Frame_page, page, "f");
        __classPrivateFieldSet(this, _Frame_context, context, "f");
        __classPrivateFieldSet(this, _Frame_timeoutSettings, timeoutSettings, "f");
        this._id = __classPrivateFieldGet(this, _Frame_context, "f").id;
        this._parentId = parentId ?? undefined;
        const puppeteerRealm = context.createSandboxRealm(FrameManager_js_1.UTILITY_WORLD_NAME);
        this.sandboxes = {
            [Sandbox_js_1.MAIN_SANDBOX]: new Sandbox_js_1.Sandbox(context, timeoutSettings),
            [Sandbox_js_1.PUPPETEER_SANDBOX]: new Sandbox_js_1.Sandbox(puppeteerRealm, timeoutSettings),
        };
        puppeteerRealm.setFrame(this);
        context.setFrame(this);
    }
    mainRealm() {
        return this.sandboxes[Sandbox_js_1.MAIN_SANDBOX];
    }
    isolatedRealm() {
        return this.sandboxes[Sandbox_js_1.PUPPETEER_SANDBOX];
    }
    page() {
        return __classPrivateFieldGet(this, _Frame_page, "f");
    }
    name() {
        return this._name || '';
    }
    url() {
        return __classPrivateFieldGet(this, _Frame_context, "f").url;
    }
    parentFrame() {
        return __classPrivateFieldGet(this, _Frame_page, "f").frame(this._parentId ?? '');
    }
    childFrames() {
        return __classPrivateFieldGet(this, _Frame_page, "f").childFrames(__classPrivateFieldGet(this, _Frame_context, "f").id);
    }
    async evaluateHandle(pageFunction, ...args) {
        return __classPrivateFieldGet(this, _Frame_context, "f").evaluateHandle(pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        return __classPrivateFieldGet(this, _Frame_context, "f").evaluate(pageFunction, ...args);
    }
    async goto(url, options) {
        const navigationId = await __classPrivateFieldGet(this, _Frame_context, "f").goto(url, options);
        return __classPrivateFieldGet(this, _Frame_page, "f").getNavigationResponse(navigationId);
    }
    setContent(html, options) {
        return __classPrivateFieldGet(this, _Frame_context, "f").setContent(html, options);
    }
    content() {
        return __classPrivateFieldGet(this, _Frame_context, "f").content();
    }
    title() {
        return __classPrivateFieldGet(this, _Frame_context, "f").title();
    }
    context() {
        return __classPrivateFieldGet(this, _Frame_context, "f");
    }
    $(selector) {
        return this.mainRealm().$(selector);
    }
    $$(selector) {
        return this.mainRealm().$$(selector);
    }
    $eval(selector, pageFunction, ...args) {
        pageFunction = (0, util_js_1.withSourcePuppeteerURLIfNone)(this.$eval.name, pageFunction);
        return this.mainRealm().$eval(selector, pageFunction, ...args);
    }
    $$eval(selector, pageFunction, ...args) {
        pageFunction = (0, util_js_1.withSourcePuppeteerURLIfNone)(this.$$eval.name, pageFunction);
        return this.mainRealm().$$eval(selector, pageFunction, ...args);
    }
    $x(expression) {
        return this.mainRealm().$x(expression);
    }
    async waitForNavigation(options = {}) {
        const { waitUntil = 'load', timeout = __classPrivateFieldGet(this, _Frame_timeoutSettings, "f").navigationTimeout(), } = options;
        const waitUntilEvent = BrowsingContext_js_1.lifeCycleToSubscribedEvent.get((0, BrowsingContext_js_1.getWaitUntilSingle)(waitUntil));
        const [info] = await Promise.all([
            (0, util_js_1.waitForEvent)(__classPrivateFieldGet(this, _Frame_context, "f"), waitUntilEvent, () => {
                return true;
            }, timeout, __classPrivateFieldGet(this, _Frame_abortDeferred, "f").valueOrThrow()),
            (0, util_js_1.waitForEvent)(__classPrivateFieldGet(this, _Frame_context, "f"), Bidi.BrowsingContext.EventNames.FragmentNavigated, () => {
                return true;
            }, timeout, __classPrivateFieldGet(this, _Frame_abortDeferred, "f").valueOrThrow()),
        ]);
        return __classPrivateFieldGet(this, _Frame_page, "f").getNavigationResponse(info.navigation);
    }
    dispose() {
        __classPrivateFieldGet(this, _Frame_abortDeferred, "f").reject(new Error('Frame detached'));
        __classPrivateFieldGet(this, _Frame_context, "f").dispose();
    }
}
exports.Frame = Frame;
_Frame_page = new WeakMap(), _Frame_context = new WeakMap(), _Frame_timeoutSettings = new WeakMap(), _Frame_abortDeferred = new WeakMap();
//# sourceMappingURL=Frame.js.map
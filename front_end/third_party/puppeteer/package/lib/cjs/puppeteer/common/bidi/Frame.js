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
    #page;
    #context;
    #timeoutSettings;
    #abortDeferred = Deferred_js_1.Deferred.create();
    sandboxes;
    _id;
    constructor(page, context, timeoutSettings, parentId) {
        super();
        this.#page = page;
        this.#context = context;
        this.#timeoutSettings = timeoutSettings;
        this._id = this.#context.id;
        this._parentId = parentId ?? undefined;
        const puppeteerRealm = context.createSandboxRealm(FrameManager_js_1.UTILITY_WORLD_NAME);
        this.sandboxes = {
            [Sandbox_js_1.MAIN_SANDBOX]: new Sandbox_js_1.Sandbox(context, timeoutSettings),
            [Sandbox_js_1.PUPPETEER_SANDBOX]: new Sandbox_js_1.Sandbox(puppeteerRealm, timeoutSettings),
        };
        puppeteerRealm.setFrame(this);
        context.setFrame(this);
    }
    _client() {
        return this.context().cdpSession;
    }
    mainRealm() {
        return this.sandboxes[Sandbox_js_1.MAIN_SANDBOX];
    }
    isolatedRealm() {
        return this.sandboxes[Sandbox_js_1.PUPPETEER_SANDBOX];
    }
    page() {
        return this.#page;
    }
    name() {
        return this._name || '';
    }
    url() {
        return this.#context.url;
    }
    parentFrame() {
        return this.#page.frame(this._parentId ?? '');
    }
    childFrames() {
        return this.#page.childFrames(this.#context.id);
    }
    async evaluateHandle(pageFunction, ...args) {
        return this.#context.evaluateHandle(pageFunction, ...args);
    }
    async evaluate(pageFunction, ...args) {
        return this.#context.evaluate(pageFunction, ...args);
    }
    async goto(url, options) {
        const navigationId = await this.#context.goto(url, {
            ...options,
            timeout: options?.timeout ?? this.#timeoutSettings.navigationTimeout(),
        });
        return this.#page.getNavigationResponse(navigationId);
    }
    setContent(html, options) {
        return this.#context.setContent(html, {
            ...options,
            timeout: options?.timeout ?? this.#timeoutSettings.navigationTimeout(),
        });
    }
    content() {
        return this.#context.content();
    }
    title() {
        return this.#context.title();
    }
    context() {
        return this.#context;
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
        const { waitUntil = 'load', timeout = this.#timeoutSettings.navigationTimeout(), } = options;
        const waitUntilEvent = BrowsingContext_js_1.lifeCycleToSubscribedEvent.get((0, BrowsingContext_js_1.getWaitUntilSingle)(waitUntil));
        const [info] = await Deferred_js_1.Deferred.race([
            // TODO(lightning00blade): Should also keep tack of
            // navigationAborted and navigationFailed
            Promise.all([
                (0, util_js_1.waitForEvent)(this.#context, waitUntilEvent, () => {
                    return true;
                }, timeout, this.#abortDeferred.valueOrThrow()),
                (0, util_js_1.waitForEvent)(this.#context, Bidi.ChromiumBidi.BrowsingContext.EventNames.NavigationStarted, () => {
                    return true;
                }, timeout, this.#abortDeferred.valueOrThrow()),
            ]),
            (0, util_js_1.waitForEvent)(this.#context, Bidi.ChromiumBidi.BrowsingContext.EventNames.FragmentNavigated, () => {
                return true;
            }, timeout, this.#abortDeferred.valueOrThrow()).then(info => {
                return [info, undefined];
            }),
        ]);
        return this.#page.getNavigationResponse(info.navigation);
    }
    dispose() {
        this.#abortDeferred.reject(new Error('Frame detached'));
        this.#context.dispose();
    }
}
exports.Frame = Frame;
//# sourceMappingURL=Frame.js.map
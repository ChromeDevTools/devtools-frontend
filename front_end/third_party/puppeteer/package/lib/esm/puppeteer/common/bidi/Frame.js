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
import * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import { Frame as BaseFrame } from '../../api/Frame.js';
import { Deferred } from '../../util/Deferred.js';
import { UTILITY_WORLD_NAME } from '../FrameManager.js';
import { waitForEvent, withSourcePuppeteerURLIfNone } from '../util.js';
import { getWaitUntilSingle, lifeCycleToSubscribedEvent, } from './BrowsingContext.js';
import { MAIN_SANDBOX, PUPPETEER_SANDBOX, Sandbox, } from './Sandbox.js';
/**
 * Puppeteer's Frame class could be viewed as a BiDi BrowsingContext implementation
 * @internal
 */
export class Frame extends BaseFrame {
    #page;
    #context;
    #timeoutSettings;
    #abortDeferred = Deferred.create();
    sandboxes;
    _id;
    constructor(page, context, timeoutSettings, parentId) {
        super();
        this.#page = page;
        this.#context = context;
        this.#timeoutSettings = timeoutSettings;
        this._id = this.#context.id;
        this._parentId = parentId ?? undefined;
        const puppeteerRealm = context.createSandboxRealm(UTILITY_WORLD_NAME);
        this.sandboxes = {
            [MAIN_SANDBOX]: new Sandbox(context, timeoutSettings),
            [PUPPETEER_SANDBOX]: new Sandbox(puppeteerRealm, timeoutSettings),
        };
        puppeteerRealm.setFrame(this);
        context.setFrame(this);
    }
    mainRealm() {
        return this.sandboxes[MAIN_SANDBOX];
    }
    isolatedRealm() {
        return this.sandboxes[PUPPETEER_SANDBOX];
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
        pageFunction = withSourcePuppeteerURLIfNone(this.$eval.name, pageFunction);
        return this.mainRealm().$eval(selector, pageFunction, ...args);
    }
    $$eval(selector, pageFunction, ...args) {
        pageFunction = withSourcePuppeteerURLIfNone(this.$$eval.name, pageFunction);
        return this.mainRealm().$$eval(selector, pageFunction, ...args);
    }
    $x(expression) {
        return this.mainRealm().$x(expression);
    }
    async waitForNavigation(options = {}) {
        const { waitUntil = 'load', timeout = this.#timeoutSettings.navigationTimeout(), } = options;
        const waitUntilEvent = lifeCycleToSubscribedEvent.get(getWaitUntilSingle(waitUntil));
        const [info] = await Deferred.race([
            // TODO(lightning00blade): Should also keep tack of
            // navigationAborted and navigationFailed
            Promise.all([
                waitForEvent(this.#context, waitUntilEvent, () => {
                    return true;
                }, timeout, this.#abortDeferred.valueOrThrow()),
                waitForEvent(this.#context, Bidi.ChromiumBidi.BrowsingContext.EventNames.NavigationStarted, () => {
                    return true;
                }, timeout, this.#abortDeferred.valueOrThrow()),
            ]),
            waitForEvent(this.#context, Bidi.ChromiumBidi.BrowsingContext.EventNames.FragmentNavigated, () => {
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
//# sourceMappingURL=Frame.js.map
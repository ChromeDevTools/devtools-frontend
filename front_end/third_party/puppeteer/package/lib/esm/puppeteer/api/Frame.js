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
import { EventEmitter } from '../common/EventEmitter.js';
import { getQueryHandlerAndSelector } from '../common/GetQueryHandler.js';
import { transposeIterableHandle } from '../common/HandleIterator.js';
import { LazyArg } from '../common/LazyArg.js';
import { debugError, importFSPromises } from '../common/util.js';
import { FunctionLocator, NodeLocator } from './locators/locators.js';
/**
 * Represents a DOM frame.
 *
 * To understand frames, you can think of frames as `<iframe>` elements. Just
 * like iframes, frames can be nested, and when JavaScript is executed in a
 * frame, the JavaScript does not effect frames inside the ambient frame the
 * JavaScript executes in.
 *
 * @example
 * At any point in time, {@link Page | pages} expose their current frame
 * tree via the {@link Page.mainFrame} and {@link Frame.childFrames} methods.
 *
 * @example
 * An example of dumping frame tree:
 *
 * ```ts
 * import puppeteer from 'puppeteer';
 *
 * (async () => {
 *   const browser = await puppeteer.launch();
 *   const page = await browser.newPage();
 *   await page.goto('https://www.google.com/chrome/browser/canary.html');
 *   dumpFrameTree(page.mainFrame(), '');
 *   await browser.close();
 *
 *   function dumpFrameTree(frame, indent) {
 *     console.log(indent + frame.url());
 *     for (const child of frame.childFrames()) {
 *       dumpFrameTree(child, indent + '  ');
 *     }
 *   }
 * })();
 * ```
 *
 * @example
 * An example of getting text from an iframe element:
 *
 * ```ts
 * const frame = page.frames().find(frame => frame.name() === 'myframe');
 * const text = await frame.$eval('.selector', element => element.textContent);
 * console.log(text);
 * ```
 *
 * @remarks
 * Frame lifecycles are controlled by three events that are all dispatched on
 * the parent {@link Frame.page | page}:
 *
 * - {@link PageEmittedEvents.FrameAttached}
 * - {@link PageEmittedEvents.FrameNavigated}
 * - {@link PageEmittedEvents.FrameDetached}
 *
 * @public
 */
export class Frame extends EventEmitter {
    /**
     * @internal
     */
    _id;
    /**
     * @internal
     */
    _parentId;
    /**
     * @internal
     */
    worlds;
    /**
     * @internal
     */
    _name;
    /**
     * @internal
     */
    _hasStartedLoading = false;
    /**
     * @internal
     */
    constructor() {
        super();
    }
    /**
     * The page associated with the frame.
     */
    page() {
        throw new Error('Not implemented');
    }
    /**
     * Is `true` if the frame is an out-of-process (OOP) frame. Otherwise,
     * `false`.
     */
    isOOPFrame() {
        throw new Error('Not implemented');
    }
    async goto() {
        throw new Error('Not implemented');
    }
    async waitForNavigation() {
        throw new Error('Not implemented');
    }
    /**
     * @internal
     */
    _client() {
        throw new Error('Not implemented');
    }
    /**
     * @internal
     */
    executionContext() {
        throw new Error('Not implemented');
    }
    /**
     * @internal
     */
    mainRealm() {
        throw new Error('Not implemented');
    }
    /**
     * @internal
     */
    isolatedRealm() {
        throw new Error('Not implemented');
    }
    /**
     * @internal
     */
    async frameElement() {
        const parentFrame = this.parentFrame();
        if (!parentFrame) {
            return null;
        }
        const list = await parentFrame.isolatedRealm().evaluateHandle(() => {
            return document.querySelectorAll('iframe');
        });
        for await (const iframe of transposeIterableHandle(list)) {
            const frame = await iframe.contentFrame();
            if (frame._id === this._id) {
                return iframe;
            }
            void iframe.dispose().catch(debugError);
        }
        return null;
    }
    async evaluateHandle() {
        throw new Error('Not implemented');
    }
    async evaluate() {
        throw new Error('Not implemented');
    }
    locator(selectorOrFunc) {
        if (typeof selectorOrFunc === 'string') {
            return NodeLocator.create(this, selectorOrFunc);
        }
        else {
            return FunctionLocator.create(this, selectorOrFunc);
        }
    }
    async $() {
        throw new Error('Not implemented');
    }
    async $$() {
        throw new Error('Not implemented');
    }
    async $eval() {
        throw new Error('Not implemented');
    }
    async $$eval() {
        throw new Error('Not implemented');
    }
    async $x() {
        throw new Error('Not implemented');
    }
    /**
     * Waits for an element matching the given selector to appear in the frame.
     *
     * This method works across navigations.
     *
     * @example
     *
     * ```ts
     * import puppeteer from 'puppeteer';
     *
     * (async () => {
     *   const browser = await puppeteer.launch();
     *   const page = await browser.newPage();
     *   let currentURL;
     *   page
     *     .mainFrame()
     *     .waitForSelector('img')
     *     .then(() => console.log('First URL with image: ' + currentURL));
     *
     *   for (currentURL of [
     *     'https://example.com',
     *     'https://google.com',
     *     'https://bbc.com',
     *   ]) {
     *     await page.goto(currentURL);
     *   }
     *   await browser.close();
     * })();
     * ```
     *
     * @param selector - The selector to query and wait for.
     * @param options - Options for customizing waiting behavior.
     * @returns An element matching the given selector.
     * @throws Throws if an element matching the given selector doesn't appear.
     */
    async waitForSelector(selector, options = {}) {
        const { updatedSelector, QueryHandler } = getQueryHandlerAndSelector(selector);
        return (await QueryHandler.waitFor(this, updatedSelector, options));
    }
    /**
     * @deprecated Use {@link Frame.waitForSelector} with the `xpath` prefix.
     *
     * Example: `await frame.waitForSelector('xpath/' + xpathExpression)`
     *
     * The method evaluates the XPath expression relative to the Frame.
     * If `xpath` starts with `//` instead of `.//`, the dot will be appended
     * automatically.
     *
     * Wait for the `xpath` to appear in page. If at the moment of calling the
     * method the `xpath` already exists, the method will return immediately. If
     * the xpath doesn't appear after the `timeout` milliseconds of waiting, the
     * function will throw.
     *
     * For a code example, see the example for {@link Frame.waitForSelector}. That
     * function behaves identically other than taking a CSS selector rather than
     * an XPath.
     *
     * @param xpath - the XPath expression to wait for.
     * @param options - options to configure the visibility of the element and how
     * long to wait before timing out.
     */
    async waitForXPath(xpath, options = {}) {
        if (xpath.startsWith('//')) {
            xpath = `.${xpath}`;
        }
        return this.waitForSelector(`xpath/${xpath}`, options);
    }
    /**
     * @example
     * The `waitForFunction` can be used to observe viewport size change:
     *
     * ```ts
     * import puppeteer from 'puppeteer';
     *
     * (async () => {
     * .  const browser = await puppeteer.launch();
     * .  const page = await browser.newPage();
     * .  const watchDog = page.mainFrame().waitForFunction('window.innerWidth < 100');
     * .  page.setViewport({width: 50, height: 50});
     * .  await watchDog;
     * .  await browser.close();
     * })();
     * ```
     *
     * To pass arguments from Node.js to the predicate of `page.waitForFunction` function:
     *
     * ```ts
     * const selector = '.foo';
     * await frame.waitForFunction(
     *   selector => !!document.querySelector(selector),
     *   {}, // empty options object
     *   selector
     * );
     * ```
     *
     * @param pageFunction - the function to evaluate in the frame context.
     * @param options - options to configure the polling method and timeout.
     * @param args - arguments to pass to the `pageFunction`.
     * @returns the promise which resolve when the `pageFunction` returns a truthy value.
     */
    waitForFunction(pageFunction, options = {}, ...args) {
        return this.mainRealm().waitForFunction(pageFunction, options, ...args);
    }
    /**
     * The full HTML contents of the frame, including the DOCTYPE.
     */
    async content() {
        throw new Error('Not implemented');
    }
    async setContent() {
        throw new Error('Not implemented');
    }
    /**
     * The frame's `name` attribute as specified in the tag.
     *
     * @remarks
     * If the name is empty, it returns the `id` attribute instead.
     *
     * @remarks
     * This value is calculated once when the frame is created, and will not
     * update if the attribute is changed later.
     */
    name() {
        return this._name || '';
    }
    /**
     * The frame's URL.
     */
    url() {
        throw new Error('Not implemented');
    }
    /**
     * The parent frame, if any. Detached and main frames return `null`.
     */
    parentFrame() {
        throw new Error('Not implemented');
    }
    /**
     * An array of child frames.
     */
    childFrames() {
        throw new Error('Not implemented');
    }
    /**
     * Is`true` if the frame has been detached. Otherwise, `false`.
     */
    isDetached() {
        throw new Error('Not implemented');
    }
    /**
     * Adds a `<script>` tag into the page with the desired url or content.
     *
     * @param options - Options for the script.
     * @returns An {@link ElementHandle | element handle} to the injected
     * `<script>` element.
     */
    async addScriptTag(options) {
        let { content = '', type } = options;
        const { path } = options;
        if (+!!options.url + +!!path + +!!content !== 1) {
            throw new Error('Exactly one of `url`, `path`, or `content` must be specified.');
        }
        if (path) {
            const fs = await importFSPromises();
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
        }, LazyArg.create(context => {
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
            const fs = await importFSPromises();
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
        }, LazyArg.create(context => {
            return context.puppeteerUtil;
        }), options));
    }
    /**
     * Clicks the first element found that matches `selector`.
     *
     * @remarks
     * If `click()` triggers a navigation event and there's a separate
     * `page.waitForNavigation()` promise to be resolved, you may end up with a
     * race condition that yields unexpected results. The correct pattern for
     * click and wait for navigation is the following:
     *
     * ```ts
     * const [response] = await Promise.all([
     *   page.waitForNavigation(waitOptions),
     *   frame.click(selector, clickOptions),
     * ]);
     * ```
     *
     * @param selector - The selector to query for.
     */
    click(selector, options = {}) {
        return this.isolatedRealm().click(selector, options);
    }
    /**
     * Focuses the first element that matches the `selector`.
     *
     * @param selector - The selector to query for.
     * @throws Throws if there's no element matching `selector`.
     */
    async focus(selector) {
        return this.isolatedRealm().focus(selector);
    }
    /**
     * Hovers the pointer over the center of the first element that matches the
     * `selector`.
     *
     * @param selector - The selector to query for.
     * @throws Throws if there's no element matching `selector`.
     */
    hover(selector) {
        return this.isolatedRealm().hover(selector);
    }
    /**
     * Selects a set of value on the first `<select>` element that matches the
     * `selector`.
     *
     * @example
     *
     * ```ts
     * frame.select('select#colors', 'blue'); // single selection
     * frame.select('select#colors', 'red', 'green', 'blue'); // multiple selections
     * ```
     *
     * @param selector - The selector to query for.
     * @param values - The array of values to select. If the `<select>` has the
     * `multiple` attribute, all values are considered, otherwise only the first
     * one is taken into account.
     * @returns the list of values that were successfully selected.
     * @throws Throws if there's no `<select>` matching `selector`.
     */
    select(selector, ...values) {
        return this.isolatedRealm().select(selector, ...values);
    }
    /**
     * Taps the first element that matches the `selector`.
     *
     * @param selector - The selector to query for.
     * @throws Throws if there's no element matching `selector`.
     */
    tap(selector) {
        return this.isolatedRealm().tap(selector);
    }
    /**
     * Sends a `keydown`, `keypress`/`input`, and `keyup` event for each character
     * in the text.
     *
     * @remarks
     * To press a special key, like `Control` or `ArrowDown`, use
     * {@link Keyboard.press}.
     *
     * @example
     *
     * ```ts
     * await frame.type('#mytextarea', 'Hello'); // Types instantly
     * await frame.type('#mytextarea', 'World', {delay: 100}); // Types slower, like a user
     * ```
     *
     * @param selector - the selector for the element to type into. If there are
     * multiple the first will be used.
     * @param text - text to type into the element
     * @param options - takes one option, `delay`, which sets the time to wait
     * between key presses in milliseconds. Defaults to `0`.
     */
    type(selector, text, options) {
        return this.isolatedRealm().type(selector, text, options);
    }
    /**
     * @deprecated Replace with `new Promise(r => setTimeout(r, milliseconds));`.
     *
     * Causes your script to wait for the given number of milliseconds.
     *
     * @remarks
     * It's generally recommended to not wait for a number of seconds, but instead
     * use {@link Frame.waitForSelector}, {@link Frame.waitForXPath} or
     * {@link Frame.waitForFunction} to wait for exactly the conditions you want.
     *
     * @example
     *
     * Wait for 1 second:
     *
     * ```ts
     * await frame.waitForTimeout(1000);
     * ```
     *
     * @param milliseconds - the number of milliseconds to wait.
     */
    waitForTimeout(milliseconds) {
        return new Promise(resolve => {
            setTimeout(resolve, milliseconds);
        });
    }
    /**
     * The frame's title.
     */
    async title() {
        throw new Error('Not implemented');
    }
    waitForDevicePrompt() {
        throw new Error('Not implemented');
    }
}
//# sourceMappingURL=Frame.js.map
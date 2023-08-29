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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElementHandle = void 0;
const GetQueryHandler_js_1 = require("../common/GetQueryHandler.js");
const LazyArg_js_1 = require("../common/LazyArg.js");
const util_js_1 = require("../common/util.js");
const assert_js_1 = require("../util/assert.js");
const AsyncIterableUtil_js_1 = require("../util/AsyncIterableUtil.js");
const JSHandle_js_1 = require("./JSHandle.js");
/**
 * ElementHandle represents an in-page DOM element.
 *
 * @remarks
 * ElementHandles can be created with the {@link Page.$} method.
 *
 * ```ts
 * import puppeteer from 'puppeteer';
 *
 * (async () => {
 *   const browser = await puppeteer.launch();
 *   const page = await browser.newPage();
 *   await page.goto('https://example.com');
 *   const hrefElement = await page.$('a');
 *   await hrefElement.click();
 *   // ...
 * })();
 * ```
 *
 * ElementHandle prevents the DOM element from being garbage-collected unless the
 * handle is {@link JSHandle.dispose | disposed}. ElementHandles are auto-disposed
 * when their origin frame gets navigated.
 *
 * ElementHandle instances can be used as arguments in {@link Page.$eval} and
 * {@link Page.evaluate} methods.
 *
 * If you're using TypeScript, ElementHandle takes a generic argument that
 * denotes the type of element the handle is holding within. For example, if you
 * have a handle to a `<select>` element, you can type it as
 * `ElementHandle<HTMLSelectElement>` and you get some nicer type checks.
 *
 * @public
 */
class ElementHandle extends JSHandle_js_1.JSHandle {
    /**
     * @internal
     */
    handle;
    /**
     * @internal
     */
    constructor(handle) {
        super();
        this.handle = handle;
    }
    /**
     * @internal
     */
    get id() {
        return this.handle.id;
    }
    /**
     * @internal
     */
    get disposed() {
        return this.handle.disposed;
    }
    async getProperty(propertyName) {
        return this.handle.getProperty(propertyName);
    }
    /**
     * @internal
     */
    async getProperties() {
        return this.handle.getProperties();
    }
    /**
     * @internal
     */
    async evaluate(pageFunction, ...args) {
        return this.handle.evaluate(pageFunction, ...args);
    }
    /**
     * @internal
     */
    evaluateHandle(pageFunction, ...args) {
        return this.handle.evaluateHandle(pageFunction, ...args);
    }
    /**
     * @internal
     */
    async jsonValue() {
        return this.handle.jsonValue();
    }
    /**
     * @internal
     */
    toString() {
        return this.handle.toString();
    }
    /**
     * @internal
     */
    remoteObject() {
        return this.handle.remoteObject();
    }
    /**
     * @internal
     */
    async dispose() {
        return await this.handle.dispose();
    }
    asElement() {
        return this;
    }
    /**
     * Queries the current element for an element matching the given selector.
     *
     * @param selector - The selector to query for.
     * @returns A {@link ElementHandle | element handle} to the first element
     * matching the given selector. Otherwise, `null`.
     */
    async $(selector) {
        const { updatedSelector, QueryHandler } = (0, GetQueryHandler_js_1.getQueryHandlerAndSelector)(selector);
        return (await QueryHandler.queryOne(this, updatedSelector));
    }
    /**
     * Queries the current element for all elements matching the given selector.
     *
     * @param selector - The selector to query for.
     * @returns An array of {@link ElementHandle | element handles} that point to
     * elements matching the given selector.
     */
    async $$(selector) {
        const { updatedSelector, QueryHandler } = (0, GetQueryHandler_js_1.getQueryHandlerAndSelector)(selector);
        return AsyncIterableUtil_js_1.AsyncIterableUtil.collect(QueryHandler.queryAll(this, updatedSelector));
    }
    /**
     * Runs the given function on the first element matching the given selector in
     * the current element.
     *
     * If the given function returns a promise, then this method will wait till
     * the promise resolves.
     *
     * @example
     *
     * ```ts
     * const tweetHandle = await page.$('.tweet');
     * expect(await tweetHandle.$eval('.like', node => node.innerText)).toBe(
     *   '100'
     * );
     * expect(await tweetHandle.$eval('.retweets', node => node.innerText)).toBe(
     *   '10'
     * );
     * ```
     *
     * @param selector - The selector to query for.
     * @param pageFunction - The function to be evaluated in this element's page's
     * context. The first element matching the selector will be passed in as the
     * first argument.
     * @param args - Additional arguments to pass to `pageFunction`.
     * @returns A promise to the result of the function.
     */
    async $eval(selector, pageFunction, ...args) {
        pageFunction = (0, util_js_1.withSourcePuppeteerURLIfNone)(this.$eval.name, pageFunction);
        const elementHandle = await this.$(selector);
        if (!elementHandle) {
            throw new Error(`Error: failed to find element matching selector "${selector}"`);
        }
        const result = await elementHandle.evaluate(pageFunction, ...args);
        await elementHandle.dispose();
        return result;
    }
    /**
     * Runs the given function on an array of elements matching the given selector
     * in the current element.
     *
     * If the given function returns a promise, then this method will wait till
     * the promise resolves.
     *
     * @example
     * HTML:
     *
     * ```html
     * <div class="feed">
     *   <div class="tweet">Hello!</div>
     *   <div class="tweet">Hi!</div>
     * </div>
     * ```
     *
     * JavaScript:
     *
     * ```js
     * const feedHandle = await page.$('.feed');
     * expect(
     *   await feedHandle.$$eval('.tweet', nodes => nodes.map(n => n.innerText))
     * ).toEqual(['Hello!', 'Hi!']);
     * ```
     *
     * @param selector - The selector to query for.
     * @param pageFunction - The function to be evaluated in the element's page's
     * context. An array of elements matching the given selector will be passed to
     * the function as its first argument.
     * @param args - Additional arguments to pass to `pageFunction`.
     * @returns A promise to the result of the function.
     */
    async $$eval(selector, pageFunction, ...args) {
        pageFunction = (0, util_js_1.withSourcePuppeteerURLIfNone)(this.$$eval.name, pageFunction);
        const results = await this.$$(selector);
        const elements = await this.evaluateHandle((_, ...elements) => {
            return elements;
        }, ...results);
        const [result] = await Promise.all([
            elements.evaluate(pageFunction, ...args),
            ...results.map(results => {
                return results.dispose();
            }),
        ]);
        await elements.dispose();
        return result;
    }
    /**
     * @deprecated Use {@link ElementHandle.$$} with the `xpath` prefix.
     *
     * Example: `await elementHandle.$$('xpath/' + xpathExpression)`
     *
     * The method evaluates the XPath expression relative to the elementHandle.
     * If `xpath` starts with `//` instead of `.//`, the dot will be appended
     * automatically.
     *
     * If there are no such elements, the method will resolve to an empty array.
     * @param expression - Expression to {@link https://developer.mozilla.org/en-US/docs/Web/API/Document/evaluate | evaluate}
     */
    async $x(expression) {
        if (expression.startsWith('//')) {
            expression = `.${expression}`;
        }
        return this.$$(`xpath/${expression}`);
    }
    /**
     * Wait for an element matching the given selector to appear in the current
     * element.
     *
     * Unlike {@link Frame.waitForSelector}, this method does not work across
     * navigations or if the element is detached from DOM.
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
        const { updatedSelector, QueryHandler } = (0, GetQueryHandler_js_1.getQueryHandlerAndSelector)(selector);
        return (await QueryHandler.waitFor(this, updatedSelector, options));
    }
    async #checkVisibility(visibility) {
        const element = await this.frame.isolatedRealm().adoptHandle(this);
        try {
            return await this.frame.isolatedRealm().evaluate(async (PuppeteerUtil, element, visibility) => {
                return Boolean(PuppeteerUtil.checkVisibility(element, visibility));
            }, LazyArg_js_1.LazyArg.create(context => {
                return context.puppeteerUtil;
            }), element, visibility);
        }
        finally {
            await element.dispose();
        }
    }
    /**
     * Checks if an element is visible using the same mechanism as
     * {@link ElementHandle.waitForSelector}.
     */
    async isVisible() {
        return this.#checkVisibility(true);
    }
    /**
     * Checks if an element is hidden using the same mechanism as
     * {@link ElementHandle.waitForSelector}.
     */
    async isHidden() {
        return this.#checkVisibility(false);
    }
    /**
     * @deprecated Use {@link ElementHandle.waitForSelector} with the `xpath`
     * prefix.
     *
     * Example: `await elementHandle.waitForSelector('xpath/' + xpathExpression)`
     *
     * The method evaluates the XPath expression relative to the elementHandle.
     *
     * Wait for the `xpath` within the element. If at the moment of calling the
     * method the `xpath` already exists, the method will return immediately. If
     * the `xpath` doesn't appear after the `timeout` milliseconds of waiting, the
     * function will throw.
     *
     * If `xpath` starts with `//` instead of `.//`, the dot will be appended
     * automatically.
     *
     * @example
     * This method works across navigation.
     *
     * ```ts
     * import puppeteer from 'puppeteer';
     * (async () => {
     *   const browser = await puppeteer.launch();
     *   const page = await browser.newPage();
     *   let currentURL;
     *   page
     *     .waitForXPath('//img')
     *     .then(() => console.log('First URL with image: ' + currentURL));
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
     * @param xpath - A
     * {@link https://developer.mozilla.org/en-US/docs/Web/XPath | xpath} of an
     * element to wait for
     * @param options - Optional waiting parameters
     * @returns Promise which resolves when element specified by xpath string is
     * added to DOM. Resolves to `null` if waiting for `hidden: true` and xpath is
     * not found in DOM, otherwise resolves to `ElementHandle`.
     * @remarks
     * The optional Argument `options` have properties:
     *
     * - `visible`: A boolean to wait for element to be present in DOM and to be
     *   visible, i.e. to not have `display: none` or `visibility: hidden` CSS
     *   properties. Defaults to `false`.
     *
     * - `hidden`: A boolean wait for element to not be found in the DOM or to be
     *   hidden, i.e. have `display: none` or `visibility: hidden` CSS properties.
     *   Defaults to `false`.
     *
     * - `timeout`: A number which is maximum time to wait for in milliseconds.
     *   Defaults to `30000` (30 seconds). Pass `0` to disable timeout. The
     *   default value can be changed by using the {@link Page.setDefaultTimeout}
     *   method.
     */
    async waitForXPath(xpath, options = {}) {
        if (xpath.startsWith('//')) {
            xpath = `.${xpath}`;
        }
        return this.waitForSelector(`xpath/${xpath}`, options);
    }
    /**
     * Converts the current handle to the given element type.
     *
     * @example
     *
     * ```ts
     * const element: ElementHandle<Element> = await page.$(
     *   '.class-name-of-anchor'
     * );
     * // DO NOT DISPOSE `element`, this will be always be the same handle.
     * const anchor: ElementHandle<HTMLAnchorElement> =
     *   await element.toElement('a');
     * ```
     *
     * @param tagName - The tag name of the desired element type.
     * @throws An error if the handle does not match. **The handle will not be
     * automatically disposed.**
     */
    async toElement(tagName) {
        const isMatchingTagName = await this.evaluate((node, tagName) => {
            return node.nodeName === tagName.toUpperCase();
        }, tagName);
        if (!isMatchingTagName) {
            throw new Error(`Element is not a(n) \`${tagName}\` element`);
        }
        return this;
    }
    /**
     * Returns the middle point within an element unless a specific offset is provided.
     */
    async clickablePoint(offset) {
        const box = await this.#clickableBox();
        if (!box) {
            throw new Error('Node is either not clickable or not an Element');
        }
        if (offset !== undefined) {
            return {
                x: box.x + offset.x,
                y: box.y + offset.y,
            };
        }
        return {
            x: box.x + box.width / 2,
            y: box.y + box.height / 2,
        };
    }
    /**
     * This method scrolls element into view if needed, and then
     * uses {@link Page} to hover over the center of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    async hover() {
        await this.scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint();
        await this.frame.page().mouse.move(x, y);
    }
    /**
     * This method scrolls element into view if needed, and then
     * uses {@link Page | Page.mouse} to click in the center of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    async click(options = {}) {
        await this.scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint(options.offset);
        await this.frame.page().mouse.click(x, y, options);
    }
    async drag() {
        throw new Error('Not implemented');
    }
    async dragEnter() {
        throw new Error('Not implemented');
    }
    async dragOver() {
        throw new Error('Not implemented');
    }
    async drop() {
        throw new Error('Not implemented');
    }
    async dragAndDrop() {
        throw new Error('Not implemented');
    }
    /**
     * Triggers a `change` and `input` event once all the provided options have been
     * selected. If there's no `<select>` element matching `selector`, the method
     * throws an error.
     *
     * @example
     *
     * ```ts
     * handle.select('blue'); // single selection
     * handle.select('red', 'green', 'blue'); // multiple selections
     * ```
     *
     * @param values - Values of options to select. If the `<select>` has the
     * `multiple` attribute, all values are considered, otherwise only the first
     * one is taken into account.
     */
    async select(...values) {
        for (const value of values) {
            (0, assert_js_1.assert)((0, util_js_1.isString)(value), 'Values must be strings. Found value "' +
                value +
                '" of type "' +
                typeof value +
                '"');
        }
        return this.evaluate((element, vals) => {
            const values = new Set(vals);
            if (!(element instanceof HTMLSelectElement)) {
                throw new Error('Element is not a <select> element.');
            }
            const selectedValues = new Set();
            if (!element.multiple) {
                for (const option of element.options) {
                    option.selected = false;
                }
                for (const option of element.options) {
                    if (values.has(option.value)) {
                        option.selected = true;
                        selectedValues.add(option.value);
                        break;
                    }
                }
            }
            else {
                for (const option of element.options) {
                    option.selected = values.has(option.value);
                    if (option.selected) {
                        selectedValues.add(option.value);
                    }
                }
            }
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return [...selectedValues.values()];
        }, values);
    }
    async uploadFile() {
        throw new Error('Not implemented');
    }
    /**
     * This method scrolls element into view if needed, and then uses
     * {@link Touchscreen.tap} to tap in the center of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    async tap() {
        await this.scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint();
        await this.frame.page().touchscreen.touchStart(x, y);
        await this.frame.page().touchscreen.touchEnd();
    }
    async touchStart() {
        await this.scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint();
        await this.frame.page().touchscreen.touchStart(x, y);
    }
    async touchMove() {
        await this.scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint();
        await this.frame.page().touchscreen.touchMove(x, y);
    }
    async touchEnd() {
        await this.scrollIntoViewIfNeeded();
        await this.frame.page().touchscreen.touchEnd();
    }
    /**
     * Calls {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus | focus} on the element.
     */
    async focus() {
        await this.evaluate(element => {
            if (!(element instanceof HTMLElement)) {
                throw new Error('Cannot focus non-HTMLElement');
            }
            return element.focus();
        });
    }
    /**
     * Focuses the element, and then sends a `keydown`, `keypress`/`input`, and
     * `keyup` event for each character in the text.
     *
     * To press a special key, like `Control` or `ArrowDown`,
     * use {@link ElementHandle.press}.
     *
     * @example
     *
     * ```ts
     * await elementHandle.type('Hello'); // Types instantly
     * await elementHandle.type('World', {delay: 100}); // Types slower, like a user
     * ```
     *
     * @example
     * An example of typing into a text field and then submitting the form:
     *
     * ```ts
     * const elementHandle = await page.$('input');
     * await elementHandle.type('some text');
     * await elementHandle.press('Enter');
     * ```
     *
     * @param options - Delay in milliseconds. Defaults to 0.
     */
    async type(text, options) {
        await this.focus();
        await this.frame.page().keyboard.type(text, options);
    }
    /**
     * Focuses the element, and then uses {@link Keyboard.down} and {@link Keyboard.up}.
     *
     * @remarks
     * If `key` is a single character and no modifier keys besides `Shift`
     * are being held down, a `keypress`/`input` event will also be generated.
     * The `text` option can be specified to force an input event to be generated.
     *
     * **NOTE** Modifier keys DO affect `elementHandle.press`. Holding down `Shift`
     * will type the text in upper case.
     *
     * @param key - Name of key to press, such as `ArrowLeft`.
     * See {@link KeyInput} for a list of all key names.
     */
    async press(key, options) {
        await this.focus();
        await this.frame.page().keyboard.press(key, options);
    }
    async #clickableBox() {
        const adoptedThis = await this.frame.isolatedRealm().adoptHandle(this);
        const boxes = await adoptedThis.evaluate(element => {
            if (!(element instanceof Element)) {
                return null;
            }
            return [...element.getClientRects()].map(rect => {
                return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
            });
        });
        void adoptedThis.dispose().catch(util_js_1.debugError);
        if (!boxes?.length) {
            return null;
        }
        await this.#intersectBoundingBoxesWithFrame(boxes);
        let frame = this.frame;
        let element;
        while ((element = await frame?.frameElement())) {
            try {
                element = await element.frame.isolatedRealm().transferHandle(element);
                const parentBox = await element.evaluate(element => {
                    // Element is not visible.
                    if (element.getClientRects().length === 0) {
                        return null;
                    }
                    const rect = element.getBoundingClientRect();
                    const style = window.getComputedStyle(element);
                    return {
                        left: rect.left +
                            parseInt(style.paddingLeft, 10) +
                            parseInt(style.borderLeftWidth, 10),
                        top: rect.top +
                            parseInt(style.paddingTop, 10) +
                            parseInt(style.borderTopWidth, 10),
                    };
                });
                if (!parentBox) {
                    return null;
                }
                for (const box of boxes) {
                    box.x += parentBox.left;
                    box.y += parentBox.top;
                }
                await element.#intersectBoundingBoxesWithFrame(boxes);
                frame = frame?.parentFrame();
            }
            finally {
                void element.dispose().catch(util_js_1.debugError);
            }
        }
        const box = boxes.find(box => {
            return box.width >= 1 && box.height >= 1;
        });
        if (!box) {
            return null;
        }
        return {
            x: box.x,
            y: box.y,
            height: box.height,
            width: box.width,
        };
    }
    async #intersectBoundingBoxesWithFrame(boxes) {
        const { documentWidth, documentHeight } = await this.frame
            .isolatedRealm()
            .evaluate(() => {
            return {
                documentWidth: document.documentElement.clientWidth,
                documentHeight: document.documentElement.clientHeight,
            };
        });
        for (const box of boxes) {
            intersectBoundingBox(box, documentWidth, documentHeight);
        }
    }
    /**
     * This method returns the bounding box of the element (relative to the main frame),
     * or `null` if the element is not visible.
     */
    async boundingBox() {
        const adoptedThis = await this.frame.isolatedRealm().adoptHandle(this);
        const box = await adoptedThis.evaluate(element => {
            if (!(element instanceof Element)) {
                return null;
            }
            // Element is not visible.
            if (element.getClientRects().length === 0) {
                return null;
            }
            const rect = element.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        });
        void adoptedThis.dispose().catch(util_js_1.debugError);
        if (!box) {
            return null;
        }
        const offset = await this.#getTopLeftCornerOfFrame();
        if (!offset) {
            return null;
        }
        return {
            x: box.x + offset.x,
            y: box.y + offset.y,
            height: box.height,
            width: box.width,
        };
    }
    /**
     * This method returns boxes of the element, or `null` if the element is not visible.
     *
     * @remarks
     *
     * Boxes are represented as an array of points;
     * Each Point is an object `{x, y}`. Box points are sorted clock-wise.
     */
    async boxModel() {
        const adoptedThis = await this.frame.isolatedRealm().adoptHandle(this);
        const model = await adoptedThis.evaluate(element => {
            if (!(element instanceof Element)) {
                return null;
            }
            // Element is not visible.
            if (element.getClientRects().length === 0) {
                return null;
            }
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            const offsets = {
                padding: {
                    left: parseInt(style.paddingLeft, 10),
                    top: parseInt(style.paddingTop, 10),
                    right: parseInt(style.paddingRight, 10),
                    bottom: parseInt(style.paddingBottom, 10),
                },
                margin: {
                    left: -parseInt(style.marginLeft, 10),
                    top: -parseInt(style.marginTop, 10),
                    right: -parseInt(style.marginRight, 10),
                    bottom: -parseInt(style.marginBottom, 10),
                },
                border: {
                    left: parseInt(style.borderLeft, 10),
                    top: parseInt(style.borderTop, 10),
                    right: parseInt(style.borderRight, 10),
                    bottom: parseInt(style.borderBottom, 10),
                },
            };
            const border = [
                { x: rect.left, y: rect.top },
                { x: rect.left + rect.width, y: rect.top },
                { x: rect.left + rect.width, y: rect.top + rect.bottom },
                { x: rect.left, y: rect.top + rect.bottom },
            ];
            const padding = transformQuadWithOffsets(border, offsets.border);
            const content = transformQuadWithOffsets(padding, offsets.padding);
            const margin = transformQuadWithOffsets(border, offsets.margin);
            return {
                content,
                padding,
                border,
                margin,
                width: rect.width,
                height: rect.height,
            };
            function transformQuadWithOffsets(quad, offsets) {
                return [
                    {
                        x: quad[0].x + offsets.left,
                        y: quad[0].y + offsets.top,
                    },
                    {
                        x: quad[1].x - offsets.right,
                        y: quad[1].y + offsets.top,
                    },
                    {
                        x: quad[2].x - offsets.right,
                        y: quad[2].y - offsets.bottom,
                    },
                    {
                        x: quad[3].x + offsets.left,
                        y: quad[3].y - offsets.bottom,
                    },
                ];
            }
        });
        void adoptedThis.dispose().catch(util_js_1.debugError);
        if (!model) {
            return null;
        }
        const offset = await this.#getTopLeftCornerOfFrame();
        if (!offset) {
            return null;
        }
        for (const attribute of [
            'content',
            'padding',
            'border',
            'margin',
        ]) {
            for (const point of model[attribute]) {
                point.x += offset.x;
                point.y += offset.y;
            }
        }
        return model;
    }
    async #getTopLeftCornerOfFrame() {
        const point = { x: 0, y: 0 };
        let frame = this.frame;
        let element;
        while ((element = await frame?.frameElement())) {
            try {
                element = await element.frame.isolatedRealm().transferHandle(element);
                const parentBox = await element.evaluate(element => {
                    // Element is not visible.
                    if (element.getClientRects().length === 0) {
                        return null;
                    }
                    const rect = element.getBoundingClientRect();
                    const style = window.getComputedStyle(element);
                    return {
                        left: rect.left +
                            parseInt(style.paddingLeft, 10) +
                            parseInt(style.borderLeftWidth, 10),
                        top: rect.top +
                            parseInt(style.paddingTop, 10) +
                            parseInt(style.borderTopWidth, 10),
                    };
                });
                if (!parentBox) {
                    return null;
                }
                point.x += parentBox.left;
                point.y += parentBox.top;
                frame = frame?.parentFrame();
            }
            finally {
                void element.dispose().catch(util_js_1.debugError);
            }
        }
        return point;
    }
    async screenshot() {
        throw new Error('Not implemented');
    }
    /**
     * @internal
     */
    async assertConnectedElement() {
        const error = await this.evaluate(async (element) => {
            if (!element.isConnected) {
                return 'Node is detached from document';
            }
            if (element.nodeType !== Node.ELEMENT_NODE) {
                return 'Node is not of type HTMLElement';
            }
            return;
        });
        if (error) {
            throw new Error(error);
        }
    }
    /**
     * @internal
     */
    async scrollIntoViewIfNeeded() {
        if (await this.isIntersectingViewport({
            threshold: 1,
        })) {
            return;
        }
        await this.scrollIntoView();
    }
    /**
     * Resolves to true if the element is visible in the current viewport. If an
     * element is an SVG, we check if the svg owner element is in the viewport
     * instead. See https://crbug.com/963246.
     *
     * @param options - Threshold for the intersection between 0 (no intersection) and 1
     * (full intersection). Defaults to 1.
     */
    async isIntersectingViewport(options) {
        await this.assertConnectedElement();
        const { threshold = 0 } = options ?? {};
        const svgHandle = await this.#asSVGElementHandle(this);
        const intersectionTarget = svgHandle
            ? await this.#getOwnerSVGElement(svgHandle)
            : this;
        try {
            return await intersectionTarget.evaluate(async (element, threshold) => {
                const visibleRatio = await new Promise(resolve => {
                    const observer = new IntersectionObserver(entries => {
                        resolve(entries[0].intersectionRatio);
                        observer.disconnect();
                    });
                    observer.observe(element);
                });
                return threshold === 1 ? visibleRatio === 1 : visibleRatio > threshold;
            }, threshold);
        }
        finally {
            if (intersectionTarget !== this) {
                await intersectionTarget.dispose();
            }
        }
    }
    /**
     * Scrolls the element into view using either the automation protocol client
     * or by calling element.scrollIntoView.
     */
    async scrollIntoView() {
        await this.assertConnectedElement();
        await this.evaluate(async (element) => {
            element.scrollIntoView({
                block: 'center',
                inline: 'center',
                behavior: 'instant',
            });
        });
    }
    /**
     * Returns true if an element is an SVGElement (included svg, path, rect
     * etc.).
     */
    async #asSVGElementHandle(handle) {
        if (await handle.evaluate(element => {
            return element instanceof SVGElement;
        })) {
            return handle;
        }
        else {
            return null;
        }
    }
    async #getOwnerSVGElement(handle) {
        // SVGSVGElement.ownerSVGElement === null.
        return await handle.evaluateHandle(element => {
            if (element instanceof SVGSVGElement) {
                return element;
            }
            return element.ownerSVGElement;
        });
    }
}
exports.ElementHandle = ElementHandle;
function intersectBoundingBox(box, width, height) {
    box.width = Math.max(box.x >= 0
        ? Math.min(width - box.x, box.width)
        : Math.min(width, box.width + box.x), 0);
    box.height = Math.max(box.y >= 0
        ? Math.min(height - box.y, box.height)
        : Math.min(height, box.height + box.y), 0);
}
//# sourceMappingURL=ElementHandle.js.map
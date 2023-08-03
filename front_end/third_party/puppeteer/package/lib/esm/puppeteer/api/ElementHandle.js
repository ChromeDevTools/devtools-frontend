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
import { getQueryHandlerAndSelector } from '../common/GetQueryHandler.js';
import { LazyArg } from '../common/LazyArg.js';
import { isString, withSourcePuppeteerURLIfNone } from '../common/util.js';
import { assert } from '../util/assert.js';
import { AsyncIterableUtil } from '../util/AsyncIterableUtil.js';
import { JSHandle } from './JSHandle.js';
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
export class ElementHandle extends JSHandle {
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
    async dispose() {
        return await this.handle.dispose();
    }
    asElement() {
        return this;
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
    get client() {
        throw new Error('Not implemented');
    }
    get frame() {
        throw new Error('Not implemented');
    }
    /**
     * Queries the current element for an element matching the given selector.
     *
     * @param selector - The selector to query for.
     * @returns A {@link ElementHandle | element handle} to the first element
     * matching the given selector. Otherwise, `null`.
     */
    async $(selector) {
        const { updatedSelector, QueryHandler } = getQueryHandlerAndSelector(selector);
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
        const { updatedSelector, QueryHandler } = getQueryHandlerAndSelector(selector);
        return AsyncIterableUtil.collect(QueryHandler.queryAll(this, updatedSelector));
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
        pageFunction = withSourcePuppeteerURLIfNone(this.$eval.name, pageFunction);
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
        pageFunction = withSourcePuppeteerURLIfNone(this.$$eval.name, pageFunction);
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
        const { updatedSelector, QueryHandler } = getQueryHandlerAndSelector(selector);
        return (await QueryHandler.waitFor(this, updatedSelector, options));
    }
    async #checkVisibility(visibility) {
        const element = await this.frame.isolatedRealm().adoptHandle(this);
        try {
            return await this.frame.isolatedRealm().evaluate(async (PuppeteerUtil, element, visibility) => {
                return Boolean(PuppeteerUtil.checkVisibility(element, visibility));
            }, LazyArg.create(context => {
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
     * const anchor: ElementHandle<HTMLAnchorElement> = await element.toElement(
     *   'a'
     * );
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
     * Resolves to the content frame for element handles referencing
     * iframe nodes, or null otherwise
     */
    async contentFrame() {
        throw new Error('Not implemented');
    }
    async clickablePoint() {
        throw new Error('Not implemented');
    }
    /**
     * This method scrolls element into view if needed, and then
     * uses {@link Page} to hover over the center of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    async hover() {
        throw new Error('Not implemented');
    }
    async click() {
        throw new Error('Not implemented');
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
            assert(isString(value), 'Values must be strings. Found value "' +
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
        throw new Error('Not implemented');
    }
    async touchStart() {
        throw new Error('Not implemented');
    }
    async touchMove() {
        throw new Error('Not implemented');
    }
    async touchEnd() {
        throw new Error('Not implemented');
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
    async type() {
        throw new Error('Not implemented');
    }
    async press() {
        throw new Error('Not implemented');
    }
    /**
     * This method returns the bounding box of the element (relative to the main frame),
     * or `null` if the element is not visible.
     */
    async boundingBox() {
        throw new Error('Not implemented');
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
        throw new Error('Not implemented');
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
    /**
     * @internal
     */
    assertElementHasWorld() {
        assert(this.executionContext()._world);
    }
    autofill() {
        throw new Error('Not implemented');
    }
}
//# sourceMappingURL=ElementHandle.js.map
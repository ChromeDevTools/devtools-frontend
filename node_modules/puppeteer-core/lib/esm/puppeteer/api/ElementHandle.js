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
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ElementHandle_instances, _ElementHandle_asSVGElementHandle, _ElementHandle_getOwnerSVGElement;
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
    constructor(handle) {
        super();
        _ElementHandle_instances.add(this);
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
    async waitForSelector() {
        throw new Error('Not implemented');
    }
    /**
     * Checks if an element is visible using the same mechanism as
     * {@link ElementHandle.waitForSelector}.
     */
    async isVisible() {
        throw new Error('Not implemented.');
    }
    /**
     * Checks if an element is hidden using the same mechanism as
     * {@link ElementHandle.waitForSelector}.
     */
    async isHidden() {
        throw new Error('Not implemented.');
    }
    async waitForXPath() {
        throw new Error('Not implemented');
    }
    async toElement() {
        throw new Error('Not implemented');
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
    async select() {
        throw new Error('Not implemented');
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
        throw new Error('Not implemented');
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
     * Resolves to true if the element is visible in the current viewport. If an
     * element is an SVG, we check if the svg owner element is in the viewport
     * instead. See https://crbug.com/963246.
     *
     * @param options - Threshold for the intersection between 0 (no intersection) and 1
     * (full intersection). Defaults to 1.
     */
    async isIntersectingViewport(options) {
        await this.assertConnectedElement();
        const { threshold = 0 } = options !== null && options !== void 0 ? options : {};
        const svgHandle = await __classPrivateFieldGet(this, _ElementHandle_instances, "m", _ElementHandle_asSVGElementHandle).call(this, this);
        const intersectionTarget = svgHandle
            ? await __classPrivateFieldGet(this, _ElementHandle_instances, "m", _ElementHandle_getOwnerSVGElement).call(this, svgHandle)
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
        throw new Error('Not implemented');
    }
}
_ElementHandle_instances = new WeakSet(), _ElementHandle_asSVGElementHandle = 
/**
 * Returns true if an element is an SVGElement (included svg, path, rect
 * etc.).
 */
async function _ElementHandle_asSVGElementHandle(handle) {
    if (await handle.evaluate(element => {
        return element instanceof SVGElement;
    })) {
        return handle;
    }
    else {
        return null;
    }
}, _ElementHandle_getOwnerSVGElement = async function _ElementHandle_getOwnerSVGElement(handle) {
    // SVGSVGElement.ownerSVGElement === null.
    return await handle.evaluateHandle(element => {
        if (element instanceof SVGSVGElement) {
            return element;
        }
        return element.ownerSVGElement;
    });
};
//# sourceMappingURL=ElementHandle.js.map
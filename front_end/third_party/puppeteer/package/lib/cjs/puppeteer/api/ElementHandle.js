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
    constructor() {
        super();
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
    async waitForXPath() {
        throw new Error('Not implemented');
    }
    async toElement() {
        throw new Error('Not implemented');
    }
    asElement() {
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
     * uses {@link Page.mouse} to hover over the center of the element.
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
    async isIntersectingViewport() {
        throw new Error('Not implemented');
    }
}
exports.ElementHandle = ElementHandle;
//# sourceMappingURL=ElementHandle.js.map
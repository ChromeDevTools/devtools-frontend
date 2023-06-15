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
import { Locator } from './Locator.js';
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
export class Frame {
    /**
     * @internal
     */
    constructor() {
        /**
         * @internal
         */
        this._hasStartedLoading = false;
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
    async evaluateHandle() {
        throw new Error('Not implemented');
    }
    async evaluate() {
        throw new Error('Not implemented');
    }
    /**
     * Creates a locator for the provided `selector`. See {@link Locator} for
     * details and supported actions.
     *
     * @remarks
     * Locators API is experimental and we will not follow semver for breaking
     * change in the Locators API.
     */
    locator(selector) {
        return Locator.create(this, selector);
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
    waitForFunction() {
        throw new Error('Not implemented');
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
    async addScriptTag() {
        throw new Error('Not implemented');
    }
    async addStyleTag() {
        throw new Error('Not implemented');
    }
    async click() {
        throw new Error('Not implemented');
    }
    async focus() {
        throw new Error('Not implemented');
    }
    async hover() {
        throw new Error('Not implemented');
    }
    select() {
        throw new Error('Not implemented');
    }
    async tap() {
        throw new Error('Not implemented');
    }
    async type() {
        throw new Error('Not implemented');
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
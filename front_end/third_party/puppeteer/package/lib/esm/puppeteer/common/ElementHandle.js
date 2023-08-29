/**
 * Copyright 2019 Google Inc. All rights reserved.
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
import { ElementHandle } from '../api/ElementHandle.js';
import { assert } from '../util/assert.js';
import { CDPJSHandle } from './JSHandle.js';
import { debugError } from './util.js';
/**
 * The CDPElementHandle extends ElementHandle now to keep compatibility
 * with `instanceof` because of that we need to have methods for
 * CDPJSHandle to in this implementation as well.
 *
 * @internal
 */
export class CDPElementHandle extends ElementHandle {
    #frame;
    constructor(context, remoteObject, frame) {
        super(new CDPJSHandle(context, remoteObject));
        this.#frame = frame;
    }
    /**
     * @internal
     */
    executionContext() {
        return this.handle.executionContext();
    }
    /**
     * @internal
     */
    get client() {
        return this.handle.client;
    }
    remoteObject() {
        return this.handle.remoteObject();
    }
    get #frameManager() {
        return this.#frame._frameManager;
    }
    get #page() {
        return this.#frame.page();
    }
    get frame() {
        return this.#frame;
    }
    async $(selector) {
        return super.$(selector);
    }
    async $$(selector) {
        return super.$$(selector);
    }
    async waitForSelector(selector, options) {
        return (await super.waitForSelector(selector, options));
    }
    async contentFrame() {
        const nodeInfo = await this.client.send('DOM.describeNode', {
            objectId: this.id,
        });
        if (typeof nodeInfo.node.frameId !== 'string') {
            return null;
        }
        return this.#frameManager.frame(nodeInfo.node.frameId);
    }
    async scrollIntoView() {
        await this.assertConnectedElement();
        try {
            await this.client.send('DOM.scrollIntoViewIfNeeded', {
                objectId: this.id,
            });
        }
        catch (error) {
            debugError(error);
            // Fallback to Element.scrollIntoView if DOM.scrollIntoViewIfNeeded is not supported
            await super.scrollIntoView();
        }
    }
    /**
     * This method creates and captures a dragevent from the element.
     */
    async drag(target) {
        assert(this.#page.isDragInterceptionEnabled(), 'Drag Interception is not enabled!');
        await this.scrollIntoViewIfNeeded();
        const start = await this.clickablePoint();
        return await this.#page.mouse.drag(start, target);
    }
    async dragEnter(data = { items: [], dragOperationsMask: 1 }) {
        await this.scrollIntoViewIfNeeded();
        const target = await this.clickablePoint();
        await this.#page.mouse.dragEnter(target, data);
    }
    async dragOver(data = { items: [], dragOperationsMask: 1 }) {
        await this.scrollIntoViewIfNeeded();
        const target = await this.clickablePoint();
        await this.#page.mouse.dragOver(target, data);
    }
    async drop(data = { items: [], dragOperationsMask: 1 }) {
        await this.scrollIntoViewIfNeeded();
        const destination = await this.clickablePoint();
        await this.#page.mouse.drop(destination, data);
    }
    async dragAndDrop(target, options) {
        assert(this.#page.isDragInterceptionEnabled(), 'Drag Interception is not enabled!');
        await this.scrollIntoViewIfNeeded();
        const startPoint = await this.clickablePoint();
        const targetPoint = await target.clickablePoint();
        await this.#page.mouse.dragAndDrop(startPoint, targetPoint, options);
    }
    async uploadFile(...filePaths) {
        const isMultiple = await this.evaluate(element => {
            return element.multiple;
        });
        assert(filePaths.length <= 1 || isMultiple, 'Multiple file uploads only work with <input type=file multiple>');
        // Locate all files and confirm that they exist.
        let path;
        try {
            path = await import('path');
        }
        catch (error) {
            if (error instanceof TypeError) {
                throw new Error(`JSHandle#uploadFile can only be used in Node-like environments.`);
            }
            throw error;
        }
        const files = filePaths.map(filePath => {
            if (path.win32.isAbsolute(filePath) || path.posix.isAbsolute(filePath)) {
                return filePath;
            }
            else {
                return path.resolve(filePath);
            }
        });
        const { node } = await this.client.send('DOM.describeNode', {
            objectId: this.id,
        });
        const { backendNodeId } = node;
        /*  The zero-length array is a special case, it seems that
             DOM.setFileInputFiles does not actually update the files in that case,
             so the solution is to eval the element value to a new FileList directly.
         */
        if (files.length === 0) {
            await this.evaluate(element => {
                element.files = new DataTransfer().files;
                // Dispatch events for this case because it should behave akin to a user action.
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            });
        }
        else {
            await this.client.send('DOM.setFileInputFiles', {
                objectId: this.id,
                files,
                backendNodeId,
            });
        }
    }
    async screenshot(options = {}) {
        let needsViewportReset = false;
        let boundingBox = await this.boundingBox();
        assert(boundingBox, 'Node is either not visible or not an HTMLElement');
        const viewport = this.#page.viewport();
        if (viewport &&
            (boundingBox.width > viewport.width ||
                boundingBox.height > viewport.height)) {
            const newViewport = {
                width: Math.max(viewport.width, Math.ceil(boundingBox.width)),
                height: Math.max(viewport.height, Math.ceil(boundingBox.height)),
            };
            await this.#page.setViewport(Object.assign({}, viewport, newViewport));
            needsViewportReset = true;
        }
        await this.scrollIntoViewIfNeeded();
        boundingBox = await this.boundingBox();
        assert(boundingBox, 'Node is either not visible or not an HTMLElement');
        assert(boundingBox.width !== 0, 'Node has 0 width.');
        assert(boundingBox.height !== 0, 'Node has 0 height.');
        const layoutMetrics = await this.client.send('Page.getLayoutMetrics');
        // Fallback to `layoutViewport` in case of using Firefox.
        const { pageX, pageY } = layoutMetrics.cssVisualViewport || layoutMetrics.layoutViewport;
        const clip = Object.assign({}, boundingBox);
        clip.x += pageX;
        clip.y += pageY;
        const imageData = await this.#page.screenshot(Object.assign({}, {
            clip,
        }, options));
        if (needsViewportReset && viewport) {
            await this.#page.setViewport(viewport);
        }
        return imageData;
    }
    async autofill(data) {
        const nodeInfo = await this.client.send('DOM.describeNode', {
            objectId: this.handle.id,
        });
        const fieldId = nodeInfo.node.backendNodeId;
        const frameId = this.#frame._id;
        await this.client.send('Autofill.trigger', {
            fieldId,
            frameId,
            card: data.creditCard,
        });
    }
    assertElementHasWorld() {
        assert(this.executionContext()._world);
    }
}
//# sourceMappingURL=ElementHandle.js.map
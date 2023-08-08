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
import { ElementHandle, } from '../api/ElementHandle.js';
import { assert } from '../util/assert.js';
import { CDPJSHandle } from './JSHandle.js';
import { debugError } from './util.js';
const applyOffsetsToQuad = (quad, offsetX, offsetY) => {
    return quad.map(part => {
        return { x: part.x + offsetX, y: part.y + offsetY };
    });
};
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
    async #getOOPIFOffsets(frame) {
        let offsetX = 0;
        let offsetY = 0;
        let currentFrame = frame;
        while (currentFrame && currentFrame.parentFrame()) {
            const parent = currentFrame.parentFrame();
            if (!currentFrame.isOOPFrame() || !parent) {
                currentFrame = parent;
                continue;
            }
            const { backendNodeId } = await parent._client().send('DOM.getFrameOwner', {
                frameId: currentFrame._id,
            });
            const result = await parent._client().send('DOM.getBoxModel', {
                backendNodeId: backendNodeId,
            });
            if (!result) {
                break;
            }
            const contentBoxQuad = result.model.content;
            const topLeftCorner = this.#fromProtocolQuad(contentBoxQuad)[0];
            offsetX += topLeftCorner.x;
            offsetY += topLeftCorner.y;
            currentFrame = parent;
        }
        return { offsetX, offsetY };
    }
    async clickablePoint(offset) {
        const [result, layoutMetrics] = await Promise.all([
            this.client
                .send('DOM.getContentQuads', {
                objectId: this.id,
            })
                .catch(debugError),
            this.#page._client().send('Page.getLayoutMetrics'),
        ]);
        if (!result || !result.quads.length) {
            throw new Error('Node is either not clickable or not an HTMLElement');
        }
        // Filter out quads that have too small area to click into.
        // Fallback to `layoutViewport` in case of using Firefox.
        const { clientWidth, clientHeight } = layoutMetrics.cssLayoutViewport || layoutMetrics.layoutViewport;
        const { offsetX, offsetY } = await this.#getOOPIFOffsets(this.#frame);
        const quads = result.quads
            .map(quad => {
            return this.#fromProtocolQuad(quad);
        })
            .map(quad => {
            return applyOffsetsToQuad(quad, offsetX, offsetY);
        })
            .map(quad => {
            return this.#intersectQuadWithViewport(quad, clientWidth, clientHeight);
        })
            .filter(quad => {
            return computeQuadArea(quad) > 1;
        });
        if (!quads.length) {
            throw new Error('Node is either not clickable or not an HTMLElement');
        }
        const quad = quads[0];
        if (offset) {
            // Return the point of the first quad identified by offset.
            let minX = Number.MAX_SAFE_INTEGER;
            let minY = Number.MAX_SAFE_INTEGER;
            for (const point of quad) {
                if (point.x < minX) {
                    minX = point.x;
                }
                if (point.y < minY) {
                    minY = point.y;
                }
            }
            if (minX !== Number.MAX_SAFE_INTEGER &&
                minY !== Number.MAX_SAFE_INTEGER) {
                return {
                    x: minX + offset.x,
                    y: minY + offset.y,
                };
            }
        }
        // Return the middle point of the first quad.
        let x = 0;
        let y = 0;
        for (const point of quad) {
            x += point.x;
            y += point.y;
        }
        return {
            x: x / 4,
            y: y / 4,
        };
    }
    #getBoxModel() {
        const params = {
            objectId: this.id,
        };
        return this.client.send('DOM.getBoxModel', params).catch(error => {
            return debugError(error);
        });
    }
    #fromProtocolQuad(quad) {
        return [
            { x: quad[0], y: quad[1] },
            { x: quad[2], y: quad[3] },
            { x: quad[4], y: quad[5] },
            { x: quad[6], y: quad[7] },
        ];
    }
    #intersectQuadWithViewport(quad, width, height) {
        return quad.map(point => {
            return {
                x: Math.min(Math.max(point.x, 0), width),
                y: Math.min(Math.max(point.y, 0), height),
            };
        });
    }
    /**
     * This method scrolls element into view if needed, and then
     * uses {@link Page.mouse} to hover over the center of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    async hover() {
        await this.scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint();
        await this.#page.mouse.move(x, y);
    }
    /**
     * This method scrolls element into view if needed, and then
     * uses {@link Page.mouse} to click in the center of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    async click(options = {}) {
        await this.scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint(options.offset);
        await this.#page.mouse.click(x, y, options);
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
    async tap() {
        await this.scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint();
        await this.#page.touchscreen.touchStart(x, y);
        await this.#page.touchscreen.touchEnd();
    }
    async touchStart() {
        await this.scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint();
        await this.#page.touchscreen.touchStart(x, y);
    }
    async touchMove() {
        await this.scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint();
        await this.#page.touchscreen.touchMove(x, y);
    }
    async touchEnd() {
        await this.scrollIntoViewIfNeeded();
        await this.#page.touchscreen.touchEnd();
    }
    async type(text, options) {
        await this.focus();
        await this.#page.keyboard.type(text, options);
    }
    async press(key, options) {
        await this.focus();
        await this.#page.keyboard.press(key, options);
    }
    async boundingBox() {
        const result = await this.#getBoxModel();
        if (!result) {
            return null;
        }
        const { offsetX, offsetY } = await this.#getOOPIFOffsets(this.#frame);
        const quad = result.model.border;
        const x = Math.min(quad[0], quad[2], quad[4], quad[6]);
        const y = Math.min(quad[1], quad[3], quad[5], quad[7]);
        const width = Math.max(quad[0], quad[2], quad[4], quad[6]) - x;
        const height = Math.max(quad[1], quad[3], quad[5], quad[7]) - y;
        return { x: x + offsetX, y: y + offsetY, width, height };
    }
    async boxModel() {
        const result = await this.#getBoxModel();
        if (!result) {
            return null;
        }
        const { offsetX, offsetY } = await this.#getOOPIFOffsets(this.#frame);
        const { content, padding, border, margin, width, height } = result.model;
        return {
            content: applyOffsetsToQuad(this.#fromProtocolQuad(content), offsetX, offsetY),
            padding: applyOffsetsToQuad(this.#fromProtocolQuad(padding), offsetX, offsetY),
            border: applyOffsetsToQuad(this.#fromProtocolQuad(border), offsetX, offsetY),
            margin: applyOffsetsToQuad(this.#fromProtocolQuad(margin), offsetX, offsetY),
            width,
            height,
        };
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
}
function computeQuadArea(quad) {
    /* Compute sum of all directed areas of adjacent triangles
       https://en.wikipedia.org/wiki/Polygon#Simple_polygons
     */
    let area = 0;
    for (let i = 0; i < quad.length; ++i) {
        const p1 = quad[i];
        const p2 = quad[(i + 1) % quad.length];
        area += (p1.x * p2.y - p2.x * p1.y) / 2;
    }
    return Math.abs(area);
}
//# sourceMappingURL=ElementHandle.js.map
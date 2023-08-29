"use strict";
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
exports.CDPElementHandle = void 0;
const ElementHandle_js_1 = require("../api/ElementHandle.js");
const assert_js_1 = require("../util/assert.js");
const JSHandle_js_1 = require("./JSHandle.js");
const util_js_1 = require("./util.js");
/**
 * The CDPElementHandle extends ElementHandle now to keep compatibility
 * with `instanceof` because of that we need to have methods for
 * CDPJSHandle to in this implementation as well.
 *
 * @internal
 */
class CDPElementHandle extends ElementHandle_js_1.ElementHandle {
    #frame;
    constructor(context, remoteObject, frame) {
        super(new JSHandle_js_1.CDPJSHandle(context, remoteObject));
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
            (0, util_js_1.debugError)(error);
            // Fallback to Element.scrollIntoView if DOM.scrollIntoViewIfNeeded is not supported
            await super.scrollIntoView();
        }
    }
    /**
     * This method creates and captures a dragevent from the element.
     */
    async drag(target) {
        (0, assert_js_1.assert)(this.#page.isDragInterceptionEnabled(), 'Drag Interception is not enabled!');
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
        (0, assert_js_1.assert)(this.#page.isDragInterceptionEnabled(), 'Drag Interception is not enabled!');
        await this.scrollIntoViewIfNeeded();
        const startPoint = await this.clickablePoint();
        const targetPoint = await target.clickablePoint();
        await this.#page.mouse.dragAndDrop(startPoint, targetPoint, options);
    }
    async uploadFile(...filePaths) {
        const isMultiple = await this.evaluate(element => {
            return element.multiple;
        });
        (0, assert_js_1.assert)(filePaths.length <= 1 || isMultiple, 'Multiple file uploads only work with <input type=file multiple>');
        // Locate all files and confirm that they exist.
        let path;
        try {
            path = await Promise.resolve().then(() => __importStar(require('path')));
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
        (0, assert_js_1.assert)(boundingBox, 'Node is either not visible or not an HTMLElement');
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
        (0, assert_js_1.assert)(boundingBox, 'Node is either not visible or not an HTMLElement');
        (0, assert_js_1.assert)(boundingBox.width !== 0, 'Node has 0 width.');
        (0, assert_js_1.assert)(boundingBox.height !== 0, 'Node has 0 height.');
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
        (0, assert_js_1.assert)(this.executionContext()._world);
    }
}
exports.CDPElementHandle = CDPElementHandle;
//# sourceMappingURL=ElementHandle.js.map
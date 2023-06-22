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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _CDPElementHandle_instances, _CDPElementHandle_frame, _CDPElementHandle_frameManager_get, _CDPElementHandle_page_get, _CDPElementHandle_getOOPIFOffsets, _CDPElementHandle_getBoxModel, _CDPElementHandle_fromProtocolQuad, _CDPElementHandle_intersectQuadWithViewport;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CDPElementHandle = void 0;
const ElementHandle_js_1 = require("../api/ElementHandle.js");
const assert_js_1 = require("../util/assert.js");
const JSHandle_js_1 = require("./JSHandle.js");
const util_js_1 = require("./util.js");
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
class CDPElementHandle extends ElementHandle_js_1.ElementHandle {
    constructor(context, remoteObject, frame) {
        super(new JSHandle_js_1.CDPJSHandle(context, remoteObject));
        _CDPElementHandle_instances.add(this);
        _CDPElementHandle_frame.set(this, void 0);
        __classPrivateFieldSet(this, _CDPElementHandle_frame, frame, "f");
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
    get frame() {
        return __classPrivateFieldGet(this, _CDPElementHandle_frame, "f");
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
        return __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_frameManager_get).frame(nodeInfo.node.frameId);
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
    async clickablePoint(offset) {
        const [result, layoutMetrics] = await Promise.all([
            this.client
                .send('DOM.getContentQuads', {
                objectId: this.id,
            })
                .catch(util_js_1.debugError),
            __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get)._client().send('Page.getLayoutMetrics'),
        ]);
        if (!result || !result.quads.length) {
            throw new Error('Node is either not clickable or not an HTMLElement');
        }
        // Filter out quads that have too small area to click into.
        // Fallback to `layoutViewport` in case of using Firefox.
        const { clientWidth, clientHeight } = layoutMetrics.cssLayoutViewport || layoutMetrics.layoutViewport;
        const { offsetX, offsetY } = await __classPrivateFieldGet(this, _CDPElementHandle_instances, "m", _CDPElementHandle_getOOPIFOffsets).call(this, __classPrivateFieldGet(this, _CDPElementHandle_frame, "f"));
        const quads = result.quads
            .map(quad => {
            return __classPrivateFieldGet(this, _CDPElementHandle_instances, "m", _CDPElementHandle_fromProtocolQuad).call(this, quad);
        })
            .map(quad => {
            return applyOffsetsToQuad(quad, offsetX, offsetY);
        })
            .map(quad => {
            return __classPrivateFieldGet(this, _CDPElementHandle_instances, "m", _CDPElementHandle_intersectQuadWithViewport).call(this, quad, clientWidth, clientHeight);
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
    /**
     * This method scrolls element into view if needed, and then
     * uses {@link Page.mouse} to hover over the center of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    async hover() {
        await this.scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint();
        await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).mouse.move(x, y);
    }
    /**
     * This method scrolls element into view if needed, and then
     * uses {@link Page.mouse} to click in the center of the element.
     * If the element is detached from DOM, the method throws an error.
     */
    async click(options = {}) {
        await this.scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint(options.offset);
        await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).mouse.click(x, y, options);
    }
    /**
     * This method creates and captures a dragevent from the element.
     */
    async drag(target) {
        (0, assert_js_1.assert)(__classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).isDragInterceptionEnabled(), 'Drag Interception is not enabled!');
        await this.scrollIntoViewIfNeeded();
        const start = await this.clickablePoint();
        return await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).mouse.drag(start, target);
    }
    async dragEnter(data = { items: [], dragOperationsMask: 1 }) {
        await this.scrollIntoViewIfNeeded();
        const target = await this.clickablePoint();
        await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).mouse.dragEnter(target, data);
    }
    async dragOver(data = { items: [], dragOperationsMask: 1 }) {
        await this.scrollIntoViewIfNeeded();
        const target = await this.clickablePoint();
        await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).mouse.dragOver(target, data);
    }
    async drop(data = { items: [], dragOperationsMask: 1 }) {
        await this.scrollIntoViewIfNeeded();
        const destination = await this.clickablePoint();
        await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).mouse.drop(destination, data);
    }
    async dragAndDrop(target, options) {
        (0, assert_js_1.assert)(__classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).isDragInterceptionEnabled(), 'Drag Interception is not enabled!');
        await this.scrollIntoViewIfNeeded();
        const startPoint = await this.clickablePoint();
        const targetPoint = await target.clickablePoint();
        await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).mouse.dragAndDrop(startPoint, targetPoint, options);
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
    async tap() {
        await this.scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint();
        await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).touchscreen.touchStart(x, y);
        await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).touchscreen.touchEnd();
    }
    async touchStart() {
        await this.scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint();
        await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).touchscreen.touchStart(x, y);
    }
    async touchMove() {
        await this.scrollIntoViewIfNeeded();
        const { x, y } = await this.clickablePoint();
        await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).touchscreen.touchMove(x, y);
    }
    async touchEnd() {
        await this.scrollIntoViewIfNeeded();
        await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).touchscreen.touchEnd();
    }
    async type(text, options) {
        await this.focus();
        await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).keyboard.type(text, options);
    }
    async press(key, options) {
        await this.focus();
        await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).keyboard.press(key, options);
    }
    async boundingBox() {
        const result = await __classPrivateFieldGet(this, _CDPElementHandle_instances, "m", _CDPElementHandle_getBoxModel).call(this);
        if (!result) {
            return null;
        }
        const { offsetX, offsetY } = await __classPrivateFieldGet(this, _CDPElementHandle_instances, "m", _CDPElementHandle_getOOPIFOffsets).call(this, __classPrivateFieldGet(this, _CDPElementHandle_frame, "f"));
        const quad = result.model.border;
        const x = Math.min(quad[0], quad[2], quad[4], quad[6]);
        const y = Math.min(quad[1], quad[3], quad[5], quad[7]);
        const width = Math.max(quad[0], quad[2], quad[4], quad[6]) - x;
        const height = Math.max(quad[1], quad[3], quad[5], quad[7]) - y;
        return { x: x + offsetX, y: y + offsetY, width, height };
    }
    async boxModel() {
        const result = await __classPrivateFieldGet(this, _CDPElementHandle_instances, "m", _CDPElementHandle_getBoxModel).call(this);
        if (!result) {
            return null;
        }
        const { offsetX, offsetY } = await __classPrivateFieldGet(this, _CDPElementHandle_instances, "m", _CDPElementHandle_getOOPIFOffsets).call(this, __classPrivateFieldGet(this, _CDPElementHandle_frame, "f"));
        const { content, padding, border, margin, width, height } = result.model;
        return {
            content: applyOffsetsToQuad(__classPrivateFieldGet(this, _CDPElementHandle_instances, "m", _CDPElementHandle_fromProtocolQuad).call(this, content), offsetX, offsetY),
            padding: applyOffsetsToQuad(__classPrivateFieldGet(this, _CDPElementHandle_instances, "m", _CDPElementHandle_fromProtocolQuad).call(this, padding), offsetX, offsetY),
            border: applyOffsetsToQuad(__classPrivateFieldGet(this, _CDPElementHandle_instances, "m", _CDPElementHandle_fromProtocolQuad).call(this, border), offsetX, offsetY),
            margin: applyOffsetsToQuad(__classPrivateFieldGet(this, _CDPElementHandle_instances, "m", _CDPElementHandle_fromProtocolQuad).call(this, margin), offsetX, offsetY),
            width,
            height,
        };
    }
    async screenshot(options = {}) {
        let needsViewportReset = false;
        let boundingBox = await this.boundingBox();
        (0, assert_js_1.assert)(boundingBox, 'Node is either not visible or not an HTMLElement');
        const viewport = __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).viewport();
        if (viewport &&
            (boundingBox.width > viewport.width ||
                boundingBox.height > viewport.height)) {
            const newViewport = {
                width: Math.max(viewport.width, Math.ceil(boundingBox.width)),
                height: Math.max(viewport.height, Math.ceil(boundingBox.height)),
            };
            await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).setViewport(Object.assign({}, viewport, newViewport));
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
        const imageData = await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).screenshot(Object.assign({}, {
            clip,
        }, options));
        if (needsViewportReset && viewport) {
            await __classPrivateFieldGet(this, _CDPElementHandle_instances, "a", _CDPElementHandle_page_get).setViewport(viewport);
        }
        return imageData;
    }
}
exports.CDPElementHandle = CDPElementHandle;
_CDPElementHandle_frame = new WeakMap(), _CDPElementHandle_instances = new WeakSet(), _CDPElementHandle_frameManager_get = function _CDPElementHandle_frameManager_get() {
    return __classPrivateFieldGet(this, _CDPElementHandle_frame, "f")._frameManager;
}, _CDPElementHandle_page_get = function _CDPElementHandle_page_get() {
    return __classPrivateFieldGet(this, _CDPElementHandle_frame, "f").page();
}, _CDPElementHandle_getOOPIFOffsets = async function _CDPElementHandle_getOOPIFOffsets(frame) {
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
        const topLeftCorner = __classPrivateFieldGet(this, _CDPElementHandle_instances, "m", _CDPElementHandle_fromProtocolQuad).call(this, contentBoxQuad)[0];
        offsetX += topLeftCorner.x;
        offsetY += topLeftCorner.y;
        currentFrame = parent;
    }
    return { offsetX, offsetY };
}, _CDPElementHandle_getBoxModel = function _CDPElementHandle_getBoxModel() {
    const params = {
        objectId: this.id,
    };
    return this.client.send('DOM.getBoxModel', params).catch(error => {
        return (0, util_js_1.debugError)(error);
    });
}, _CDPElementHandle_fromProtocolQuad = function _CDPElementHandle_fromProtocolQuad(quad) {
    return [
        { x: quad[0], y: quad[1] },
        { x: quad[2], y: quad[3] },
        { x: quad[4], y: quad[5] },
        { x: quad[6], y: quad[7] },
    ];
}, _CDPElementHandle_intersectQuadWithViewport = function _CDPElementHandle_intersectQuadWithViewport(quad, width, height) {
    return quad.map(point => {
        return {
            x: Math.min(Math.max(point.x, 0), width),
            y: Math.min(Math.max(point.y, 0), height),
        };
    });
};
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
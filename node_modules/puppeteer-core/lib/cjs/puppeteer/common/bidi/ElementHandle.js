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
const ElementHandle_js_1 = require("../../api/ElementHandle.js");
const assert_js_1 = require("../../util/assert.js");
const JSHandle_js_1 = require("./JSHandle.js");
/**
 * @internal
 */
class ElementHandle extends ElementHandle_js_1.ElementHandle {
    #frame;
    constructor(realm, remoteValue, frame) {
        super(new JSHandle_js_1.JSHandle(realm, remoteValue));
        this.#frame = frame;
    }
    get frame() {
        return this.#frame;
    }
    context() {
        return this.handle.context();
    }
    get isPrimitiveValue() {
        return this.handle.isPrimitiveValue;
    }
    remoteValue() {
        return this.handle.remoteValue();
    }
    /**
     * @internal
     */
    assertElementHasWorld() {
        // TODO: Should assert element has a Sandbox
        return;
    }
    async autofill(data) {
        const client = this.#frame.context().cdpSession;
        const nodeInfo = await client.send('DOM.describeNode', {
            objectId: this.handle.id,
        });
        const fieldId = nodeInfo.node.backendNodeId;
        const frameId = this.#frame._id;
        await client.send('Autofill.trigger', {
            fieldId,
            frameId,
            card: data.creditCard,
        });
    }
    async boundingBox() {
        if (this.frame.parentFrame()) {
            throw new Error('Elements within nested iframes are currently not supported.');
        }
        const box = await this.frame.isolatedRealm().evaluate(element => {
            const rect = element.getBoundingClientRect();
            if (!rect.left && !rect.top && !rect.width && !rect.height) {
                // TODO(jrandolf): Detect if the element is truly not visible.
                return null;
            }
            return {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
            };
        }, this);
        return box;
    }
    // ///////////////////
    // // Input methods //
    // ///////////////////
    async click(options) {
        await this.scrollIntoViewIfNeeded();
        const { x = 0, y = 0 } = options?.offset ?? {};
        const remoteValue = this.remoteValue();
        (0, assert_js_1.assert)('sharedId' in remoteValue);
        return this.#frame.page().mouse.click(x, y, Object.assign({}, options, {
            origin: {
                type: 'element',
                element: remoteValue,
            },
        }));
    }
    async hover() {
        await this.scrollIntoViewIfNeeded();
        const remoteValue = this.remoteValue();
        (0, assert_js_1.assert)('sharedId' in remoteValue);
        return this.#frame.page().mouse.move(0, 0, {
            origin: {
                type: 'element',
                element: remoteValue,
            },
        });
    }
    async tap() {
        await this.scrollIntoViewIfNeeded();
        const remoteValue = this.remoteValue();
        (0, assert_js_1.assert)('sharedId' in remoteValue);
        return this.#frame.page().touchscreen.tap(0, 0, {
            origin: {
                type: 'element',
                element: remoteValue,
            },
        });
    }
    async touchStart() {
        await this.scrollIntoViewIfNeeded();
        const remoteValue = this.remoteValue();
        (0, assert_js_1.assert)('sharedId' in remoteValue);
        return this.#frame.page().touchscreen.touchStart(0, 0, {
            origin: {
                type: 'element',
                element: remoteValue,
            },
        });
    }
    async touchMove() {
        await this.scrollIntoViewIfNeeded();
        const remoteValue = this.remoteValue();
        (0, assert_js_1.assert)('sharedId' in remoteValue);
        return this.#frame.page().touchscreen.touchMove(0, 0, {
            origin: {
                type: 'element',
                element: remoteValue,
            },
        });
    }
    async touchEnd() {
        await this.scrollIntoViewIfNeeded();
        await this.#frame.page().touchscreen.touchEnd();
    }
    async type(text, options) {
        await this.focus();
        await this.#frame.page().keyboard.type(text, options);
    }
    async press(key, options) {
        await this.focus();
        await this.#frame.page().keyboard.press(key, options);
    }
}
exports.ElementHandle = ElementHandle;
//# sourceMappingURL=ElementHandle.js.map
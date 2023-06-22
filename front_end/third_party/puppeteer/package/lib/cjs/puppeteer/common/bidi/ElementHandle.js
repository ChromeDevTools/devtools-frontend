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
var _ElementHandle_frame;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElementHandle = void 0;
const ElementHandle_js_1 = require("../../api/ElementHandle.js");
const assert_js_1 = require("../../util/assert.js");
const JSHandle_js_1 = require("./JSHandle.js");
/**
 * @internal
 */
class ElementHandle extends ElementHandle_js_1.ElementHandle {
    constructor(realm, remoteValue, frame) {
        super(new JSHandle_js_1.JSHandle(realm, remoteValue));
        _ElementHandle_frame.set(this, void 0);
        __classPrivateFieldSet(this, _ElementHandle_frame, frame, "f");
    }
    get frame() {
        return __classPrivateFieldGet(this, _ElementHandle_frame, "f");
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
    // ///////////////////
    // // Input methods //
    // ///////////////////
    async click(options) {
        await this.scrollIntoViewIfNeeded();
        const { x = 0, y = 0 } = options?.offset ?? {};
        const remoteValue = this.remoteValue();
        (0, assert_js_1.assert)('sharedId' in remoteValue);
        return __classPrivateFieldGet(this, _ElementHandle_frame, "f").page().mouse.click(x, y, Object.assign({}, options, {
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
        return __classPrivateFieldGet(this, _ElementHandle_frame, "f").page().mouse.move(0, 0, {
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
        return __classPrivateFieldGet(this, _ElementHandle_frame, "f").page().touchscreen.tap(0, 0, {
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
        return __classPrivateFieldGet(this, _ElementHandle_frame, "f").page().touchscreen.touchStart(0, 0, {
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
        return __classPrivateFieldGet(this, _ElementHandle_frame, "f").page().touchscreen.touchMove(0, 0, {
            origin: {
                type: 'element',
                element: remoteValue,
            },
        });
    }
    async touchEnd() {
        await this.scrollIntoViewIfNeeded();
        await __classPrivateFieldGet(this, _ElementHandle_frame, "f").page().touchscreen.touchEnd();
    }
    async type(text, options) {
        await this.focus();
        await __classPrivateFieldGet(this, _ElementHandle_frame, "f").page().keyboard.type(text, options);
    }
    async press(key, options) {
        await this.focus();
        await __classPrivateFieldGet(this, _ElementHandle_frame, "f").page().keyboard.press(key, options);
    }
}
exports.ElementHandle = ElementHandle;
_ElementHandle_frame = new WeakMap();
//# sourceMappingURL=ElementHandle.js.map
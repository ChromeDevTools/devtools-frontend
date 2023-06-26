"use strict";
/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
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
var _CDPKeyboard_instances, _CDPKeyboard_client, _CDPKeyboard_pressedKeys, _CDPKeyboard_modifierBit, _CDPKeyboard_keyDescriptionForString, _CDPMouse_instances, _CDPMouse_client, _CDPMouse_keyboard, _CDPMouse__state, _CDPMouse_state_get, _CDPMouse_transactions, _CDPMouse_createTransaction, _CDPMouse_withTransaction, _CDPTouchscreen_client, _CDPTouchscreen_keyboard;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CDPTouchscreen = exports.CDPMouse = exports.CDPKeyboard = void 0;
const Input_js_1 = require("../api/Input.js");
const assert_js_1 = require("../util/assert.js");
const USKeyboardLayout_js_1 = require("./USKeyboardLayout.js");
/**
 * @internal
 */
class CDPKeyboard extends Input_js_1.Keyboard {
    /**
     * @internal
     */
    constructor(client) {
        super();
        _CDPKeyboard_instances.add(this);
        _CDPKeyboard_client.set(this, void 0);
        _CDPKeyboard_pressedKeys.set(this, new Set());
        /**
         * @internal
         */
        this._modifiers = 0;
        __classPrivateFieldSet(this, _CDPKeyboard_client, client, "f");
    }
    async down(key, options = {
        text: undefined,
        commands: [],
    }) {
        const description = __classPrivateFieldGet(this, _CDPKeyboard_instances, "m", _CDPKeyboard_keyDescriptionForString).call(this, key);
        const autoRepeat = __classPrivateFieldGet(this, _CDPKeyboard_pressedKeys, "f").has(description.code);
        __classPrivateFieldGet(this, _CDPKeyboard_pressedKeys, "f").add(description.code);
        this._modifiers |= __classPrivateFieldGet(this, _CDPKeyboard_instances, "m", _CDPKeyboard_modifierBit).call(this, description.key);
        const text = options.text === undefined ? description.text : options.text;
        await __classPrivateFieldGet(this, _CDPKeyboard_client, "f").send('Input.dispatchKeyEvent', {
            type: text ? 'keyDown' : 'rawKeyDown',
            modifiers: this._modifiers,
            windowsVirtualKeyCode: description.keyCode,
            code: description.code,
            key: description.key,
            text: text,
            unmodifiedText: text,
            autoRepeat,
            location: description.location,
            isKeypad: description.location === 3,
            commands: options.commands,
        });
    }
    async up(key) {
        const description = __classPrivateFieldGet(this, _CDPKeyboard_instances, "m", _CDPKeyboard_keyDescriptionForString).call(this, key);
        this._modifiers &= ~__classPrivateFieldGet(this, _CDPKeyboard_instances, "m", _CDPKeyboard_modifierBit).call(this, description.key);
        __classPrivateFieldGet(this, _CDPKeyboard_pressedKeys, "f").delete(description.code);
        await __classPrivateFieldGet(this, _CDPKeyboard_client, "f").send('Input.dispatchKeyEvent', {
            type: 'keyUp',
            modifiers: this._modifiers,
            key: description.key,
            windowsVirtualKeyCode: description.keyCode,
            code: description.code,
            location: description.location,
        });
    }
    async sendCharacter(char) {
        await __classPrivateFieldGet(this, _CDPKeyboard_client, "f").send('Input.insertText', { text: char });
    }
    charIsKey(char) {
        return !!USKeyboardLayout_js_1._keyDefinitions[char];
    }
    async type(text, options = {}) {
        const delay = options.delay || undefined;
        for (const char of text) {
            if (this.charIsKey(char)) {
                await this.press(char, { delay });
            }
            else {
                if (delay) {
                    await new Promise(f => {
                        return setTimeout(f, delay);
                    });
                }
                await this.sendCharacter(char);
            }
        }
    }
    async press(key, options = {}) {
        const { delay = null } = options;
        await this.down(key, options);
        if (delay) {
            await new Promise(f => {
                return setTimeout(f, options.delay);
            });
        }
        await this.up(key);
    }
}
exports.CDPKeyboard = CDPKeyboard;
_CDPKeyboard_client = new WeakMap(), _CDPKeyboard_pressedKeys = new WeakMap(), _CDPKeyboard_instances = new WeakSet(), _CDPKeyboard_modifierBit = function _CDPKeyboard_modifierBit(key) {
    if (key === 'Alt') {
        return 1;
    }
    if (key === 'Control') {
        return 2;
    }
    if (key === 'Meta') {
        return 4;
    }
    if (key === 'Shift') {
        return 8;
    }
    return 0;
}, _CDPKeyboard_keyDescriptionForString = function _CDPKeyboard_keyDescriptionForString(keyString) {
    const shift = this._modifiers & 8;
    const description = {
        key: '',
        keyCode: 0,
        code: '',
        text: '',
        location: 0,
    };
    const definition = USKeyboardLayout_js_1._keyDefinitions[keyString];
    (0, assert_js_1.assert)(definition, `Unknown key: "${keyString}"`);
    if (definition.key) {
        description.key = definition.key;
    }
    if (shift && definition.shiftKey) {
        description.key = definition.shiftKey;
    }
    if (definition.keyCode) {
        description.keyCode = definition.keyCode;
    }
    if (shift && definition.shiftKeyCode) {
        description.keyCode = definition.shiftKeyCode;
    }
    if (definition.code) {
        description.code = definition.code;
    }
    if (definition.location) {
        description.location = definition.location;
    }
    if (description.key.length === 1) {
        description.text = description.key;
    }
    if (definition.text) {
        description.text = definition.text;
    }
    if (shift && definition.shiftText) {
        description.text = definition.shiftText;
    }
    // if any modifiers besides shift are pressed, no text should be sent
    if (this._modifiers & ~8) {
        description.text = '';
    }
    return description;
};
const getFlag = (button) => {
    switch (button) {
        case Input_js_1.MouseButton.Left:
            return 1 /* MouseButtonFlag.Left */;
        case Input_js_1.MouseButton.Right:
            return 2 /* MouseButtonFlag.Right */;
        case Input_js_1.MouseButton.Middle:
            return 4 /* MouseButtonFlag.Middle */;
        case Input_js_1.MouseButton.Back:
            return 8 /* MouseButtonFlag.Back */;
        case Input_js_1.MouseButton.Forward:
            return 16 /* MouseButtonFlag.Forward */;
    }
};
/**
 * This should match
 * https://source.chromium.org/chromium/chromium/src/+/refs/heads/main:content/browser/renderer_host/input/web_input_event_builders_mac.mm;drc=a61b95c63b0b75c1cfe872d9c8cdf927c226046e;bpv=1;bpt=1;l=221.
 */
const getButtonFromPressedButtons = (buttons) => {
    if (buttons & 1 /* MouseButtonFlag.Left */) {
        return Input_js_1.MouseButton.Left;
    }
    else if (buttons & 2 /* MouseButtonFlag.Right */) {
        return Input_js_1.MouseButton.Right;
    }
    else if (buttons & 4 /* MouseButtonFlag.Middle */) {
        return Input_js_1.MouseButton.Middle;
    }
    else if (buttons & 8 /* MouseButtonFlag.Back */) {
        return Input_js_1.MouseButton.Back;
    }
    else if (buttons & 16 /* MouseButtonFlag.Forward */) {
        return Input_js_1.MouseButton.Forward;
    }
    return 'none';
};
/**
 * @internal
 */
class CDPMouse extends Input_js_1.Mouse {
    /**
     * @internal
     */
    constructor(client, keyboard) {
        super();
        _CDPMouse_instances.add(this);
        _CDPMouse_client.set(this, void 0);
        _CDPMouse_keyboard.set(this, void 0);
        _CDPMouse__state.set(this, {
            position: { x: 0, y: 0 },
            buttons: 0 /* MouseButtonFlag.None */,
        });
        // Transactions can run in parallel, so we store each of thme in this array.
        _CDPMouse_transactions.set(this, []);
        __classPrivateFieldSet(this, _CDPMouse_client, client, "f");
        __classPrivateFieldSet(this, _CDPMouse_keyboard, keyboard, "f");
    }
    async reset() {
        const actions = [];
        for (const [flag, button] of [
            [1 /* MouseButtonFlag.Left */, Input_js_1.MouseButton.Left],
            [4 /* MouseButtonFlag.Middle */, Input_js_1.MouseButton.Middle],
            [2 /* MouseButtonFlag.Right */, Input_js_1.MouseButton.Right],
            [16 /* MouseButtonFlag.Forward */, Input_js_1.MouseButton.Forward],
            [8 /* MouseButtonFlag.Back */, Input_js_1.MouseButton.Back],
        ]) {
            if (__classPrivateFieldGet(this, _CDPMouse_instances, "a", _CDPMouse_state_get).buttons & flag) {
                actions.push(this.up({ button: button }));
            }
        }
        if (__classPrivateFieldGet(this, _CDPMouse_instances, "a", _CDPMouse_state_get).position.x !== 0 || __classPrivateFieldGet(this, _CDPMouse_instances, "a", _CDPMouse_state_get).position.y !== 0) {
            actions.push(this.move(0, 0));
        }
        await Promise.all(actions);
    }
    async move(x, y, options = {}) {
        const { steps = 1 } = options;
        const from = __classPrivateFieldGet(this, _CDPMouse_instances, "a", _CDPMouse_state_get).position;
        const to = { x, y };
        for (let i = 1; i <= steps; i++) {
            await __classPrivateFieldGet(this, _CDPMouse_instances, "m", _CDPMouse_withTransaction).call(this, updateState => {
                updateState({
                    position: {
                        x: from.x + (to.x - from.x) * (i / steps),
                        y: from.y + (to.y - from.y) * (i / steps),
                    },
                });
                const { buttons, position } = __classPrivateFieldGet(this, _CDPMouse_instances, "a", _CDPMouse_state_get);
                return __classPrivateFieldGet(this, _CDPMouse_client, "f").send('Input.dispatchMouseEvent', {
                    type: 'mouseMoved',
                    modifiers: __classPrivateFieldGet(this, _CDPMouse_keyboard, "f")._modifiers,
                    buttons,
                    button: getButtonFromPressedButtons(buttons),
                    ...position,
                });
            });
        }
    }
    async down(options = {}) {
        const { button = Input_js_1.MouseButton.Left, clickCount = 1 } = options;
        const flag = getFlag(button);
        if (!flag) {
            throw new Error(`Unsupported mouse button: ${button}`);
        }
        if (__classPrivateFieldGet(this, _CDPMouse_instances, "a", _CDPMouse_state_get).buttons & flag) {
            throw new Error(`'${button}' is already pressed.`);
        }
        await __classPrivateFieldGet(this, _CDPMouse_instances, "m", _CDPMouse_withTransaction).call(this, updateState => {
            updateState({
                buttons: __classPrivateFieldGet(this, _CDPMouse_instances, "a", _CDPMouse_state_get).buttons | flag,
            });
            const { buttons, position } = __classPrivateFieldGet(this, _CDPMouse_instances, "a", _CDPMouse_state_get);
            return __classPrivateFieldGet(this, _CDPMouse_client, "f").send('Input.dispatchMouseEvent', {
                type: 'mousePressed',
                modifiers: __classPrivateFieldGet(this, _CDPMouse_keyboard, "f")._modifiers,
                clickCount,
                buttons,
                button,
                ...position,
            });
        });
    }
    async up(options = {}) {
        const { button = Input_js_1.MouseButton.Left, clickCount = 1 } = options;
        const flag = getFlag(button);
        if (!flag) {
            throw new Error(`Unsupported mouse button: ${button}`);
        }
        if (!(__classPrivateFieldGet(this, _CDPMouse_instances, "a", _CDPMouse_state_get).buttons & flag)) {
            throw new Error(`'${button}' is not pressed.`);
        }
        await __classPrivateFieldGet(this, _CDPMouse_instances, "m", _CDPMouse_withTransaction).call(this, updateState => {
            updateState({
                buttons: __classPrivateFieldGet(this, _CDPMouse_instances, "a", _CDPMouse_state_get).buttons & ~flag,
            });
            const { buttons, position } = __classPrivateFieldGet(this, _CDPMouse_instances, "a", _CDPMouse_state_get);
            return __classPrivateFieldGet(this, _CDPMouse_client, "f").send('Input.dispatchMouseEvent', {
                type: 'mouseReleased',
                modifiers: __classPrivateFieldGet(this, _CDPMouse_keyboard, "f")._modifiers,
                clickCount,
                buttons,
                button,
                ...position,
            });
        });
    }
    async click(x, y, options = {}) {
        const { delay, count = 1, clickCount = count } = options;
        if (count < 1) {
            throw new Error('Click must occur a positive number of times.');
        }
        const actions = [this.move(x, y)];
        if (clickCount === count) {
            for (let i = 1; i < count; ++i) {
                actions.push(this.down({ ...options, clickCount: i }), this.up({ ...options, clickCount: i }));
            }
        }
        actions.push(this.down({ ...options, clickCount }));
        if (typeof delay === 'number') {
            await Promise.all(actions);
            actions.length = 0;
            await new Promise(resolve => {
                setTimeout(resolve, delay);
            });
        }
        actions.push(this.up({ ...options, clickCount }));
        await Promise.all(actions);
    }
    async wheel(options = {}) {
        const { deltaX = 0, deltaY = 0 } = options;
        const { position, buttons } = __classPrivateFieldGet(this, _CDPMouse_instances, "a", _CDPMouse_state_get);
        await __classPrivateFieldGet(this, _CDPMouse_client, "f").send('Input.dispatchMouseEvent', {
            type: 'mouseWheel',
            pointerType: 'mouse',
            modifiers: __classPrivateFieldGet(this, _CDPMouse_keyboard, "f")._modifiers,
            deltaY,
            deltaX,
            buttons,
            ...position,
        });
    }
    async drag(start, target) {
        const promise = new Promise(resolve => {
            __classPrivateFieldGet(this, _CDPMouse_client, "f").once('Input.dragIntercepted', event => {
                return resolve(event.data);
            });
        });
        await this.move(start.x, start.y);
        await this.down();
        await this.move(target.x, target.y);
        return promise;
    }
    async dragEnter(target, data) {
        await __classPrivateFieldGet(this, _CDPMouse_client, "f").send('Input.dispatchDragEvent', {
            type: 'dragEnter',
            x: target.x,
            y: target.y,
            modifiers: __classPrivateFieldGet(this, _CDPMouse_keyboard, "f")._modifiers,
            data,
        });
    }
    async dragOver(target, data) {
        await __classPrivateFieldGet(this, _CDPMouse_client, "f").send('Input.dispatchDragEvent', {
            type: 'dragOver',
            x: target.x,
            y: target.y,
            modifiers: __classPrivateFieldGet(this, _CDPMouse_keyboard, "f")._modifiers,
            data,
        });
    }
    async drop(target, data) {
        await __classPrivateFieldGet(this, _CDPMouse_client, "f").send('Input.dispatchDragEvent', {
            type: 'drop',
            x: target.x,
            y: target.y,
            modifiers: __classPrivateFieldGet(this, _CDPMouse_keyboard, "f")._modifiers,
            data,
        });
    }
    async dragAndDrop(start, target, options = {}) {
        const { delay = null } = options;
        const data = await this.drag(start, target);
        await this.dragEnter(target, data);
        await this.dragOver(target, data);
        if (delay) {
            await new Promise(resolve => {
                return setTimeout(resolve, delay);
            });
        }
        await this.drop(target, data);
        await this.up();
    }
}
exports.CDPMouse = CDPMouse;
_CDPMouse_client = new WeakMap(), _CDPMouse_keyboard = new WeakMap(), _CDPMouse__state = new WeakMap(), _CDPMouse_transactions = new WeakMap(), _CDPMouse_instances = new WeakSet(), _CDPMouse_state_get = function _CDPMouse_state_get() {
    return Object.assign({ ...__classPrivateFieldGet(this, _CDPMouse__state, "f") }, ...__classPrivateFieldGet(this, _CDPMouse_transactions, "f"));
}, _CDPMouse_createTransaction = function _CDPMouse_createTransaction() {
    const transaction = {};
    __classPrivateFieldGet(this, _CDPMouse_transactions, "f").push(transaction);
    const popTransaction = () => {
        __classPrivateFieldGet(this, _CDPMouse_transactions, "f").splice(__classPrivateFieldGet(this, _CDPMouse_transactions, "f").indexOf(transaction), 1);
    };
    return {
        update: (updates) => {
            Object.assign(transaction, updates);
        },
        commit: () => {
            __classPrivateFieldSet(this, _CDPMouse__state, { ...__classPrivateFieldGet(this, _CDPMouse__state, "f"), ...transaction }, "f");
            popTransaction();
        },
        rollback: popTransaction,
    };
}, _CDPMouse_withTransaction = 
/**
 * This is a shortcut for a typical update, commit/rollback lifecycle based on
 * the error of the action.
 */
async function _CDPMouse_withTransaction(action) {
    const { update, commit, rollback } = __classPrivateFieldGet(this, _CDPMouse_instances, "m", _CDPMouse_createTransaction).call(this);
    try {
        await action(update);
        commit();
    }
    catch (error) {
        rollback();
        throw error;
    }
};
/**
 * @internal
 */
class CDPTouchscreen extends Input_js_1.Touchscreen {
    /**
     * @internal
     */
    constructor(client, keyboard) {
        super();
        _CDPTouchscreen_client.set(this, void 0);
        _CDPTouchscreen_keyboard.set(this, void 0);
        __classPrivateFieldSet(this, _CDPTouchscreen_client, client, "f");
        __classPrivateFieldSet(this, _CDPTouchscreen_keyboard, keyboard, "f");
    }
    async tap(x, y) {
        await this.touchStart(x, y);
        await this.touchEnd();
    }
    async touchStart(x, y) {
        const touchPoints = [{ x: Math.round(x), y: Math.round(y) }];
        await __classPrivateFieldGet(this, _CDPTouchscreen_client, "f").send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints,
            modifiers: __classPrivateFieldGet(this, _CDPTouchscreen_keyboard, "f")._modifiers,
        });
    }
    async touchMove(x, y) {
        const movePoints = [{ x: Math.round(x), y: Math.round(y) }];
        await __classPrivateFieldGet(this, _CDPTouchscreen_client, "f").send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: movePoints,
            modifiers: __classPrivateFieldGet(this, _CDPTouchscreen_keyboard, "f")._modifiers,
        });
    }
    async touchEnd() {
        await __classPrivateFieldGet(this, _CDPTouchscreen_client, "f").send('Input.dispatchTouchEvent', {
            type: 'touchEnd',
            touchPoints: [],
            modifiers: __classPrivateFieldGet(this, _CDPTouchscreen_keyboard, "f")._modifiers,
        });
    }
}
exports.CDPTouchscreen = CDPTouchscreen;
_CDPTouchscreen_client = new WeakMap(), _CDPTouchscreen_keyboard = new WeakMap();
//# sourceMappingURL=Input.js.map
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
var _Keyboard_instances, _Keyboard_client, _Keyboard_pressedKeys, _Keyboard_modifierBit, _Keyboard_keyDescriptionForString, _Mouse_instances, _Mouse_client, _Mouse_keyboard, _Mouse__state, _Mouse_state_get, _Mouse_transactions, _Mouse_createTransaction, _Mouse_withTransaction, _Touchscreen_client, _Touchscreen_keyboard;
import { assert } from '../util/assert.js';
import { _keyDefinitions } from './USKeyboardLayout.js';
/**
 * Keyboard provides an api for managing a virtual keyboard.
 * The high level api is {@link Keyboard."type"},
 * which takes raw characters and generates proper keydown, keypress/input,
 * and keyup events on your page.
 *
 * @remarks
 * For finer control, you can use {@link Keyboard.down},
 * {@link Keyboard.up}, and {@link Keyboard.sendCharacter}
 * to manually fire events as if they were generated from a real keyboard.
 *
 * On macOS, keyboard shortcuts like `⌘ A` -\> Select All do not work.
 * See {@link https://github.com/puppeteer/puppeteer/issues/1313 | #1313}.
 *
 * @example
 * An example of holding down `Shift` in order to select and delete some text:
 *
 * ```ts
 * await page.keyboard.type('Hello World!');
 * await page.keyboard.press('ArrowLeft');
 *
 * await page.keyboard.down('Shift');
 * for (let i = 0; i < ' World'.length; i++)
 *   await page.keyboard.press('ArrowLeft');
 * await page.keyboard.up('Shift');
 *
 * await page.keyboard.press('Backspace');
 * // Result text will end up saying 'Hello!'
 * ```
 *
 * @example
 * An example of pressing `A`
 *
 * ```ts
 * await page.keyboard.down('Shift');
 * await page.keyboard.press('KeyA');
 * await page.keyboard.up('Shift');
 * ```
 *
 * @public
 */
export class Keyboard {
    /**
     * @internal
     */
    constructor(client) {
        _Keyboard_instances.add(this);
        _Keyboard_client.set(this, void 0);
        _Keyboard_pressedKeys.set(this, new Set());
        /**
         * @internal
         */
        this._modifiers = 0;
        __classPrivateFieldSet(this, _Keyboard_client, client, "f");
    }
    /**
     * Dispatches a `keydown` event.
     *
     * @remarks
     * If `key` is a single character and no modifier keys besides `Shift`
     * are being held down, a `keypress`/`input` event will also generated.
     * The `text` option can be specified to force an input event to be generated.
     * If `key` is a modifier key, `Shift`, `Meta`, `Control`, or `Alt`,
     * subsequent key presses will be sent with that modifier active.
     * To release the modifier key, use {@link Keyboard.up}.
     *
     * After the key is pressed once, subsequent calls to
     * {@link Keyboard.down} will have
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat | repeat}
     * set to true. To release the key, use {@link Keyboard.up}.
     *
     * Modifier keys DO influence {@link Keyboard.down}.
     * Holding down `Shift` will type the text in upper case.
     *
     * @param key - Name of key to press, such as `ArrowLeft`.
     * See {@link KeyInput} for a list of all key names.
     *
     * @param options - An object of options. Accepts text which, if specified,
     * generates an input event with this text. Accepts commands which, if specified,
     * is the commands of keyboard shortcuts,
     * see {@link https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/editing/commands/editor_command_names.h | Chromium Source Code} for valid command names.
     */
    async down(key, options = {
        text: undefined,
        commands: [],
    }) {
        const description = __classPrivateFieldGet(this, _Keyboard_instances, "m", _Keyboard_keyDescriptionForString).call(this, key);
        const autoRepeat = __classPrivateFieldGet(this, _Keyboard_pressedKeys, "f").has(description.code);
        __classPrivateFieldGet(this, _Keyboard_pressedKeys, "f").add(description.code);
        this._modifiers |= __classPrivateFieldGet(this, _Keyboard_instances, "m", _Keyboard_modifierBit).call(this, description.key);
        const text = options.text === undefined ? description.text : options.text;
        await __classPrivateFieldGet(this, _Keyboard_client, "f").send('Input.dispatchKeyEvent', {
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
    /**
     * Dispatches a `keyup` event.
     *
     * @param key - Name of key to release, such as `ArrowLeft`.
     * See {@link KeyInput | KeyInput}
     * for a list of all key names.
     */
    async up(key) {
        const description = __classPrivateFieldGet(this, _Keyboard_instances, "m", _Keyboard_keyDescriptionForString).call(this, key);
        this._modifiers &= ~__classPrivateFieldGet(this, _Keyboard_instances, "m", _Keyboard_modifierBit).call(this, description.key);
        __classPrivateFieldGet(this, _Keyboard_pressedKeys, "f").delete(description.code);
        await __classPrivateFieldGet(this, _Keyboard_client, "f").send('Input.dispatchKeyEvent', {
            type: 'keyUp',
            modifiers: this._modifiers,
            key: description.key,
            windowsVirtualKeyCode: description.keyCode,
            code: description.code,
            location: description.location,
        });
    }
    /**
     * Dispatches a `keypress` and `input` event.
     * This does not send a `keydown` or `keyup` event.
     *
     * @remarks
     * Modifier keys DO NOT effect {@link Keyboard.sendCharacter | Keyboard.sendCharacter}.
     * Holding down `Shift` will not type the text in upper case.
     *
     * @example
     *
     * ```ts
     * page.keyboard.sendCharacter('嗨');
     * ```
     *
     * @param char - Character to send into the page.
     */
    async sendCharacter(char) {
        await __classPrivateFieldGet(this, _Keyboard_client, "f").send('Input.insertText', { text: char });
    }
    charIsKey(char) {
        return !!_keyDefinitions[char];
    }
    /**
     * Sends a `keydown`, `keypress`/`input`,
     * and `keyup` event for each character in the text.
     *
     * @remarks
     * To press a special key, like `Control` or `ArrowDown`,
     * use {@link Keyboard.press}.
     *
     * Modifier keys DO NOT effect `keyboard.type`.
     * Holding down `Shift` will not type the text in upper case.
     *
     * @example
     *
     * ```ts
     * await page.keyboard.type('Hello'); // Types instantly
     * await page.keyboard.type('World', {delay: 100}); // Types slower, like a user
     * ```
     *
     * @param text - A text to type into a focused element.
     * @param options - An object of options. Accepts delay which,
     * if specified, is the time to wait between `keydown` and `keyup` in milliseconds.
     * Defaults to 0.
     */
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
    /**
     * Shortcut for {@link Keyboard.down}
     * and {@link Keyboard.up}.
     *
     * @remarks
     * If `key` is a single character and no modifier keys besides `Shift`
     * are being held down, a `keypress`/`input` event will also generated.
     * The `text` option can be specified to force an input event to be generated.
     *
     * Modifier keys DO effect {@link Keyboard.press}.
     * Holding down `Shift` will type the text in upper case.
     *
     * @param key - Name of key to press, such as `ArrowLeft`.
     * See {@link KeyInput} for a list of all key names.
     *
     * @param options - An object of options. Accepts text which, if specified,
     * generates an input event with this text. Accepts delay which,
     * if specified, is the time to wait between `keydown` and `keyup` in milliseconds.
     * Defaults to 0. Accepts commands which, if specified,
     * is the commands of keyboard shortcuts,
     * see {@link https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/editing/commands/editor_command_names.h | Chromium Source Code} for valid command names.
     */
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
_Keyboard_client = new WeakMap(), _Keyboard_pressedKeys = new WeakMap(), _Keyboard_instances = new WeakSet(), _Keyboard_modifierBit = function _Keyboard_modifierBit(key) {
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
}, _Keyboard_keyDescriptionForString = function _Keyboard_keyDescriptionForString(keyString) {
    const shift = this._modifiers & 8;
    const description = {
        key: '',
        keyCode: 0,
        code: '',
        text: '',
        location: 0,
    };
    const definition = _keyDefinitions[keyString];
    assert(definition, `Unknown key: "${keyString}"`);
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
/**
 * Enum of valid mouse buttons.
 *
 * @public
 */
export const MouseButton = Object.freeze({
    Left: 'left',
    Right: 'right',
    Middle: 'middle',
    Back: 'back',
    Forward: 'forward',
});
const getFlag = (button) => {
    switch (button) {
        case MouseButton.Left:
            return 1 /* MouseButtonFlag.Left */;
        case MouseButton.Right:
            return 2 /* MouseButtonFlag.Right */;
        case MouseButton.Middle:
            return 4 /* MouseButtonFlag.Middle */;
        case MouseButton.Back:
            return 8 /* MouseButtonFlag.Back */;
        case MouseButton.Forward:
            return 16 /* MouseButtonFlag.Forward */;
    }
};
/**
 * This should match
 * https://source.chromium.org/chromium/chromium/src/+/refs/heads/main:content/browser/renderer_host/input/web_input_event_builders_mac.mm;drc=a61b95c63b0b75c1cfe872d9c8cdf927c226046e;bpv=1;bpt=1;l=221.
 */
const getButtonFromPressedButtons = (buttons) => {
    if (buttons & 1 /* MouseButtonFlag.Left */) {
        return MouseButton.Left;
    }
    else if (buttons & 2 /* MouseButtonFlag.Right */) {
        return MouseButton.Right;
    }
    else if (buttons & 4 /* MouseButtonFlag.Middle */) {
        return MouseButton.Middle;
    }
    else if (buttons & 8 /* MouseButtonFlag.Back */) {
        return MouseButton.Back;
    }
    else if (buttons & 16 /* MouseButtonFlag.Forward */) {
        return MouseButton.Forward;
    }
    return 'none';
};
/**
 * The Mouse class operates in main-frame CSS pixels
 * relative to the top-left corner of the viewport.
 * @remarks
 * Every `page` object has its own Mouse, accessible with [`page.mouse`](#pagemouse).
 *
 * @example
 *
 * ```ts
 * // Using ‘page.mouse’ to trace a 100x100 square.
 * await page.mouse.move(0, 0);
 * await page.mouse.down();
 * await page.mouse.move(0, 100);
 * await page.mouse.move(100, 100);
 * await page.mouse.move(100, 0);
 * await page.mouse.move(0, 0);
 * await page.mouse.up();
 * ```
 *
 * **Note**: The mouse events trigger synthetic `MouseEvent`s.
 * This means that it does not fully replicate the functionality of what a normal user
 * would be able to do with their mouse.
 *
 * For example, dragging and selecting text is not possible using `page.mouse`.
 * Instead, you can use the {@link https://developer.mozilla.org/en-US/docs/Web/API/DocumentOrShadowRoot/getSelection | `DocumentOrShadowRoot.getSelection()`} functionality implemented in the platform.
 *
 * @example
 * For example, if you want to select all content between nodes:
 *
 * ```ts
 * await page.evaluate(
 *   (from, to) => {
 *     const selection = from.getRootNode().getSelection();
 *     const range = document.createRange();
 *     range.setStartBefore(from);
 *     range.setEndAfter(to);
 *     selection.removeAllRanges();
 *     selection.addRange(range);
 *   },
 *   fromJSHandle,
 *   toJSHandle
 * );
 * ```
 *
 * If you then would want to copy-paste your selection, you can use the clipboard api:
 *
 * ```ts
 * // The clipboard api does not allow you to copy, unless the tab is focused.
 * await page.bringToFront();
 * await page.evaluate(() => {
 *   // Copy the selected content to the clipboard
 *   document.execCommand('copy');
 *   // Obtain the content of the clipboard as a string
 *   return navigator.clipboard.readText();
 * });
 * ```
 *
 * **Note**: If you want access to the clipboard API,
 * you have to give it permission to do so:
 *
 * ```ts
 * await browser
 *   .defaultBrowserContext()
 *   .overridePermissions('<your origin>', [
 *     'clipboard-read',
 *     'clipboard-write',
 *   ]);
 * ```
 *
 * @public
 */
export class Mouse {
    /**
     * @internal
     */
    constructor(client, keyboard) {
        _Mouse_instances.add(this);
        _Mouse_client.set(this, void 0);
        _Mouse_keyboard.set(this, void 0);
        _Mouse__state.set(this, {
            position: { x: 0, y: 0 },
            buttons: 0 /* MouseButtonFlag.None */,
        });
        // Transactions can run in parallel, so we store each of thme in this array.
        _Mouse_transactions.set(this, []);
        __classPrivateFieldSet(this, _Mouse_client, client, "f");
        __classPrivateFieldSet(this, _Mouse_keyboard, keyboard, "f");
    }
    /**
     * Moves the mouse to the given coordinate.
     *
     * @param x - Horizontal position of the mouse.
     * @param y - Vertical position of the mouse.
     * @param options - Options to configure behavior.
     */
    async move(x, y, options = {}) {
        const { steps = 1 } = options;
        const from = __classPrivateFieldGet(this, _Mouse_instances, "a", _Mouse_state_get).position;
        const to = { x, y };
        for (let i = 1; i <= steps; i++) {
            await __classPrivateFieldGet(this, _Mouse_instances, "m", _Mouse_withTransaction).call(this, updateState => {
                updateState({
                    position: {
                        x: from.x + (to.x - from.x) * (i / steps),
                        y: from.y + (to.y - from.y) * (i / steps),
                    },
                });
                const { buttons, position } = __classPrivateFieldGet(this, _Mouse_instances, "a", _Mouse_state_get);
                return __classPrivateFieldGet(this, _Mouse_client, "f").send('Input.dispatchMouseEvent', {
                    type: 'mouseMoved',
                    modifiers: __classPrivateFieldGet(this, _Mouse_keyboard, "f")._modifiers,
                    buttons,
                    button: getButtonFromPressedButtons(buttons),
                    ...position,
                });
            });
        }
    }
    /**
     * Presses the mouse.
     *
     * @param options - Options to configure behavior.
     */
    async down(options = {}) {
        const { button = MouseButton.Left, clickCount = 1 } = options;
        const flag = getFlag(button);
        if (!flag) {
            throw new Error(`Unsupported mouse button: ${button}`);
        }
        if (__classPrivateFieldGet(this, _Mouse_instances, "a", _Mouse_state_get).buttons & flag) {
            throw new Error(`'${button}' is already pressed.`);
        }
        await __classPrivateFieldGet(this, _Mouse_instances, "m", _Mouse_withTransaction).call(this, updateState => {
            updateState({
                buttons: __classPrivateFieldGet(this, _Mouse_instances, "a", _Mouse_state_get).buttons | flag,
            });
            const { buttons, position } = __classPrivateFieldGet(this, _Mouse_instances, "a", _Mouse_state_get);
            return __classPrivateFieldGet(this, _Mouse_client, "f").send('Input.dispatchMouseEvent', {
                type: 'mousePressed',
                modifiers: __classPrivateFieldGet(this, _Mouse_keyboard, "f")._modifiers,
                clickCount,
                buttons,
                button,
                ...position,
            });
        });
    }
    /**
     * Releases the mouse.
     *
     * @param options - Options to configure behavior.
     */
    async up(options = {}) {
        const { button = MouseButton.Left, clickCount = 1 } = options;
        const flag = getFlag(button);
        if (!flag) {
            throw new Error(`Unsupported mouse button: ${button}`);
        }
        if (!(__classPrivateFieldGet(this, _Mouse_instances, "a", _Mouse_state_get).buttons & flag)) {
            throw new Error(`'${button}' is not pressed.`);
        }
        await __classPrivateFieldGet(this, _Mouse_instances, "m", _Mouse_withTransaction).call(this, updateState => {
            updateState({
                buttons: __classPrivateFieldGet(this, _Mouse_instances, "a", _Mouse_state_get).buttons & ~flag,
            });
            const { buttons, position } = __classPrivateFieldGet(this, _Mouse_instances, "a", _Mouse_state_get);
            return __classPrivateFieldGet(this, _Mouse_client, "f").send('Input.dispatchMouseEvent', {
                type: 'mouseReleased',
                modifiers: __classPrivateFieldGet(this, _Mouse_keyboard, "f")._modifiers,
                clickCount,
                buttons,
                button,
                ...position,
            });
        });
    }
    /**
     * Shortcut for `mouse.move`, `mouse.down` and `mouse.up`.
     *
     * @param x - Horizontal position of the mouse.
     * @param y - Vertical position of the mouse.
     * @param options - Options to configure behavior.
     */
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
    /**
     * Dispatches a `mousewheel` event.
     * @param options - Optional: `MouseWheelOptions`.
     *
     * @example
     * An example of zooming into an element:
     *
     * ```ts
     * await page.goto(
     *   'https://mdn.mozillademos.org/en-US/docs/Web/API/Element/wheel_event$samples/Scaling_an_element_via_the_wheel?revision=1587366'
     * );
     *
     * const elem = await page.$('div');
     * const boundingBox = await elem.boundingBox();
     * await page.mouse.move(
     *   boundingBox.x + boundingBox.width / 2,
     *   boundingBox.y + boundingBox.height / 2
     * );
     *
     * await page.mouse.wheel({deltaY: -100});
     * ```
     */
    async wheel(options = {}) {
        const { deltaX = 0, deltaY = 0 } = options;
        const { position, buttons } = __classPrivateFieldGet(this, _Mouse_instances, "a", _Mouse_state_get);
        await __classPrivateFieldGet(this, _Mouse_client, "f").send('Input.dispatchMouseEvent', {
            type: 'mouseWheel',
            pointerType: 'mouse',
            modifiers: __classPrivateFieldGet(this, _Mouse_keyboard, "f")._modifiers,
            deltaY,
            deltaX,
            buttons,
            ...position,
        });
    }
    /**
     * Dispatches a `drag` event.
     * @param start - starting point for drag
     * @param target - point to drag to
     */
    async drag(start, target) {
        const promise = new Promise(resolve => {
            __classPrivateFieldGet(this, _Mouse_client, "f").once('Input.dragIntercepted', event => {
                return resolve(event.data);
            });
        });
        await this.move(start.x, start.y);
        await this.down();
        await this.move(target.x, target.y);
        return promise;
    }
    /**
     * Dispatches a `dragenter` event.
     * @param target - point for emitting `dragenter` event
     * @param data - drag data containing items and operations mask
     */
    async dragEnter(target, data) {
        await __classPrivateFieldGet(this, _Mouse_client, "f").send('Input.dispatchDragEvent', {
            type: 'dragEnter',
            x: target.x,
            y: target.y,
            modifiers: __classPrivateFieldGet(this, _Mouse_keyboard, "f")._modifiers,
            data,
        });
    }
    /**
     * Dispatches a `dragover` event.
     * @param target - point for emitting `dragover` event
     * @param data - drag data containing items and operations mask
     */
    async dragOver(target, data) {
        await __classPrivateFieldGet(this, _Mouse_client, "f").send('Input.dispatchDragEvent', {
            type: 'dragOver',
            x: target.x,
            y: target.y,
            modifiers: __classPrivateFieldGet(this, _Mouse_keyboard, "f")._modifiers,
            data,
        });
    }
    /**
     * Performs a dragenter, dragover, and drop in sequence.
     * @param target - point to drop on
     * @param data - drag data containing items and operations mask
     */
    async drop(target, data) {
        await __classPrivateFieldGet(this, _Mouse_client, "f").send('Input.dispatchDragEvent', {
            type: 'drop',
            x: target.x,
            y: target.y,
            modifiers: __classPrivateFieldGet(this, _Mouse_keyboard, "f")._modifiers,
            data,
        });
    }
    /**
     * Performs a drag, dragenter, dragover, and drop in sequence.
     * @param start - point to drag from
     * @param target - point to drop on
     * @param options - An object of options. Accepts delay which,
     * if specified, is the time to wait between `dragover` and `drop` in milliseconds.
     * Defaults to 0.
     */
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
_Mouse_client = new WeakMap(), _Mouse_keyboard = new WeakMap(), _Mouse__state = new WeakMap(), _Mouse_transactions = new WeakMap(), _Mouse_instances = new WeakSet(), _Mouse_state_get = function _Mouse_state_get() {
    return Object.assign({ ...__classPrivateFieldGet(this, _Mouse__state, "f") }, ...__classPrivateFieldGet(this, _Mouse_transactions, "f"));
}, _Mouse_createTransaction = function _Mouse_createTransaction() {
    const transaction = {};
    __classPrivateFieldGet(this, _Mouse_transactions, "f").push(transaction);
    const popTransaction = () => {
        __classPrivateFieldGet(this, _Mouse_transactions, "f").splice(__classPrivateFieldGet(this, _Mouse_transactions, "f").indexOf(transaction), 1);
    };
    return {
        update: (updates) => {
            Object.assign(transaction, updates);
        },
        commit: () => {
            __classPrivateFieldSet(this, _Mouse__state, { ...__classPrivateFieldGet(this, _Mouse__state, "f"), ...transaction }, "f");
            popTransaction();
        },
        rollback: popTransaction,
    };
}, _Mouse_withTransaction = 
/**
 * This is a shortcut for a typical update, commit/rollback lifecycle based on
 * the error of the action.
 */
async function _Mouse_withTransaction(action) {
    const { update, commit, rollback } = __classPrivateFieldGet(this, _Mouse_instances, "m", _Mouse_createTransaction).call(this);
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
 * The Touchscreen class exposes touchscreen events.
 * @public
 */
export class Touchscreen {
    /**
     * @internal
     */
    constructor(client, keyboard) {
        _Touchscreen_client.set(this, void 0);
        _Touchscreen_keyboard.set(this, void 0);
        __classPrivateFieldSet(this, _Touchscreen_client, client, "f");
        __classPrivateFieldSet(this, _Touchscreen_keyboard, keyboard, "f");
    }
    /**
     * Dispatches a `touchstart` and `touchend` event.
     * @param x - Horizontal position of the tap.
     * @param y - Vertical position of the tap.
     */
    async tap(x, y) {
        await this.touchStart(x, y);
        await this.touchEnd();
    }
    /**
     * Dispatches a `touchstart` event.
     * @param x - Horizontal position of the tap.
     * @param y - Vertical position of the tap.
     */
    async touchStart(x, y) {
        const touchPoints = [{ x: Math.round(x), y: Math.round(y) }];
        await __classPrivateFieldGet(this, _Touchscreen_client, "f").send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints,
            modifiers: __classPrivateFieldGet(this, _Touchscreen_keyboard, "f")._modifiers,
        });
    }
    /**
     * Dispatches a `touchMove` event.
     * @param x - Horizontal position of the move.
     * @param y - Vertical position of the move.
     */
    async touchMove(x, y) {
        const movePoints = [{ x: Math.round(x), y: Math.round(y) }];
        await __classPrivateFieldGet(this, _Touchscreen_client, "f").send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: movePoints,
            modifiers: __classPrivateFieldGet(this, _Touchscreen_keyboard, "f")._modifiers,
        });
    }
    /**
     * Dispatches a `touchend` event.
     */
    async touchEnd() {
        await __classPrivateFieldGet(this, _Touchscreen_client, "f").send('Input.dispatchTouchEvent', {
            type: 'touchEnd',
            touchPoints: [],
            modifiers: __classPrivateFieldGet(this, _Touchscreen_keyboard, "f")._modifiers,
        });
    }
}
_Touchscreen_client = new WeakMap(), _Touchscreen_keyboard = new WeakMap();
//# sourceMappingURL=Input.js.map
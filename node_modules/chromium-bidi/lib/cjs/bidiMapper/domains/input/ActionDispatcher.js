"use strict";
/**
 * Copyright 2023 Google LLC.
 * Copyright (c) Microsoft Corporation.
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
exports.ActionDispatcher = void 0;
const protocol_js_1 = require("../../../protocol/protocol.js");
const assert_js_1 = require("../../../utils/assert.js");
const USKeyboardLayout_js_1 = require("./USKeyboardLayout.js");
const keyUtils_js_1 = require("./keyUtils.js");
/** https://w3c.github.io/webdriver/#dfn-center-point */
const CALCULATE_IN_VIEW_CENTER_PT_DECL = ((i) => {
    const t = i.getClientRects()[0], e = Math.max(0, Math.min(t.x, t.x + t.width)), n = Math.min(window.innerWidth, Math.max(t.x, t.x + t.width)), h = Math.max(0, Math.min(t.y, t.y + t.height)), m = Math.min(window.innerHeight, Math.max(t.y, t.y + t.height));
    return [e + ((n - e) >> 1), h + ((m - h) >> 1)];
}).toString();
async function getElementCenter(context, element) {
    const { result } = await (await context.getOrCreateSandbox(undefined)).callFunction(CALCULATE_IN_VIEW_CENTER_PT_DECL, { type: 'undefined' }, [element], false, 'none', {});
    if (result.type === 'exception') {
        throw new protocol_js_1.Message.NoSuchElementException(`Origin element ${element.sharedId} was not found`);
    }
    (0, assert_js_1.assert)(result.result.type === 'array');
    (0, assert_js_1.assert)(result.result.value?.[0]?.type === 'number');
    (0, assert_js_1.assert)(result.result.value?.[1]?.type === 'number');
    const { result: { value: [{ value: x }, { value: y }], }, } = result;
    return { x: x, y: y };
}
class ActionDispatcher {
    #tickStart = 0;
    #tickDuration = 0;
    #inputState;
    #context;
    constructor(inputState, context) {
        this.#inputState = inputState;
        this.#context = context;
    }
    async dispatchActions(optionsByTick) {
        await this.#inputState.queue.run(async () => {
            for (const options of optionsByTick) {
                await this.dispatchTickActions(options);
            }
        });
    }
    async dispatchTickActions(options) {
        this.#tickStart = performance.now();
        this.#tickDuration = 0;
        for (const { action } of options) {
            if ('duration' in action && action.duration !== undefined) {
                this.#tickDuration = Math.max(this.#tickDuration, action.duration);
            }
        }
        const promises = [
            new Promise((resolve) => setTimeout(resolve, this.#tickDuration)),
        ];
        for (const option of options) {
            promises.push(this.#dispatchAction(option));
        }
        await Promise.all(promises);
    }
    async #dispatchAction({ id, action }) {
        const source = this.#inputState.get(id);
        const keyState = this.#inputState.getGlobalKeyState();
        switch (action.type) {
            case protocol_js_1.Input.ActionType.KeyDown: {
                // SAFETY: The source is validated before.
                await this.#dispatchKeyDownAction(source, action);
                this.#inputState.cancelList.push({
                    id,
                    action: {
                        ...action,
                        type: protocol_js_1.Input.ActionType.KeyUp,
                    },
                });
                break;
            }
            case protocol_js_1.Input.ActionType.KeyUp: {
                // SAFETY: The source is validated before.
                await this.#dispatchKeyUpAction(source, action);
                break;
            }
            case protocol_js_1.Input.ActionType.Pause: {
                // TODO: Implement waiting on the input source.
                break;
            }
            case protocol_js_1.Input.ActionType.PointerDown: {
                // SAFETY: The source is validated before.
                await this.#dispatchPointerDownAction(source, keyState, action);
                this.#inputState.cancelList.push({
                    id,
                    action: {
                        ...action,
                        type: protocol_js_1.Input.ActionType.PointerUp,
                    },
                });
                break;
            }
            case protocol_js_1.Input.ActionType.PointerMove: {
                // SAFETY: The source is validated before.
                await this.#dispatchPointerMoveAction(source, keyState, action);
                break;
            }
            case protocol_js_1.Input.ActionType.PointerUp: {
                // SAFETY: The source is validated before.
                await this.#dispatchPointerUpAction(source, keyState, action);
                break;
            }
            case protocol_js_1.Input.ActionType.Scroll: {
                // SAFETY: The source is validated before.
                await this.#dispatchScrollAction(source, keyState, action);
                break;
            }
        }
    }
    #dispatchPointerDownAction(source, keyState, action) {
        const { button } = action;
        if (source.pressed.has(button)) {
            return;
        }
        source.pressed.add(button);
        const { x, y, subtype: pointerType } = source;
        const { width, height, pressure, twist, tangentialPressure } = action;
        const { tiltX, tiltY } = 'tiltX' in action ? action : {};
        // TODO: Implement azimuth/altitude angle.
        // --- Platform-specific code begins here ---
        const { modifiers } = keyState;
        switch (pointerType) {
            case protocol_js_1.Input.PointerType.Mouse:
            case protocol_js_1.Input.PointerType.Pen:
                source.setClickCount({ x, y, timeStamp: performance.now() });
                // TODO: Implement width and height when available.
                return this.#context.cdpTarget.cdpClient.sendCommand('Input.dispatchMouseEvent', {
                    type: 'mousePressed',
                    x,
                    y,
                    modifiers,
                    button: (() => {
                        switch (button) {
                            case 0:
                                return 'left';
                            case 1:
                                return 'middle';
                            case 2:
                                return 'right';
                            case 3:
                                return 'back';
                            case 4:
                                return 'forward';
                            default:
                                return 'none';
                        }
                    })(),
                    buttons: source.buttons,
                    clickCount: source.clickCount,
                    pointerType,
                    tangentialPressure,
                    tiltX,
                    tiltY,
                    twist,
                    force: pressure,
                });
            case protocol_js_1.Input.PointerType.Touch:
                return this.#context.cdpTarget.cdpClient.sendCommand('Input.dispatchTouchEvent', {
                    type: 'touchStart',
                    touchPoints: [
                        {
                            x,
                            y,
                            radiusX: width,
                            radiusY: height,
                            tangentialPressure,
                            tiltX,
                            tiltY,
                            twist,
                            force: pressure,
                            id: source.pointerId,
                        },
                    ],
                    modifiers,
                });
        }
        // --- Platform-specific code ends here ---
    }
    #dispatchPointerUpAction(source, keyState, action) {
        const { button } = action;
        if (!source.pressed.has(button)) {
            return;
        }
        source.pressed.delete(button);
        const { x, y, subtype: pointerType } = source;
        // --- Platform-specific code begins here ---
        const { modifiers } = keyState;
        switch (pointerType) {
            case protocol_js_1.Input.PointerType.Mouse:
            case protocol_js_1.Input.PointerType.Pen:
                // TODO: Implement width and height when available.
                return this.#context.cdpTarget.cdpClient.sendCommand('Input.dispatchMouseEvent', {
                    type: 'mouseReleased',
                    x,
                    y,
                    modifiers,
                    button: (() => {
                        switch (button) {
                            case 0:
                                return 'left';
                            case 1:
                                return 'middle';
                            case 2:
                                return 'right';
                            case 3:
                                return 'back';
                            case 4:
                                return 'forward';
                            default:
                                return 'none';
                        }
                    })(),
                    buttons: source.buttons,
                    clickCount: source.clickCount,
                    pointerType,
                });
            case protocol_js_1.Input.PointerType.Touch:
                return this.#context.cdpTarget.cdpClient.sendCommand('Input.dispatchTouchEvent', {
                    type: 'touchEnd',
                    touchPoints: [
                        {
                            x,
                            y,
                            id: source.pointerId,
                        },
                    ],
                    modifiers,
                });
        }
        // --- Platform-specific code ends here ---
    }
    async #dispatchPointerMoveAction(source, keyState, action) {
        const { x: startX, y: startY, subtype: pointerType } = source;
        const { width, height, pressure, twist, tangentialPressure, x: offsetX, y: offsetY, origin = 'viewport', duration = this.#tickDuration, } = action;
        const { tiltX, tiltY } = 'tiltX' in action ? action : {};
        // TODO: Implement azimuth/altitude angle.
        const { targetX, targetY } = await this.#getCoordinateFromOrigin(origin, offsetX, offsetY, startX, startY);
        if (targetX < 0 || targetY < 0) {
            throw new protocol_js_1.Message.MoveTargetOutOfBoundsException(`Cannot move beyond viewport (x: ${targetX}, y: ${targetY})`);
        }
        let last;
        do {
            const ratio = duration > 0 ? (performance.now() - this.#tickStart) / duration : 1;
            last = ratio >= 1;
            let x;
            let y;
            if (last) {
                x = targetX;
                y = targetY;
            }
            else {
                x = Math.round(ratio * (targetX - startX) + startX);
                y = Math.round(ratio * (targetY - startY) + startY);
            }
            if (source.x !== x || source.y !== y) {
                // --- Platform-specific code begins here ---
                const { modifiers } = keyState;
                switch (pointerType) {
                    case protocol_js_1.Input.PointerType.Mouse:
                    case protocol_js_1.Input.PointerType.Pen:
                        // TODO: Implement width and height when available.
                        await this.#context.cdpTarget.cdpClient.sendCommand('Input.dispatchMouseEvent', {
                            type: 'mouseMoved',
                            x,
                            y,
                            modifiers,
                            clickCount: 0,
                            buttons: source.buttons,
                            pointerType,
                            tangentialPressure,
                            tiltX,
                            tiltY,
                            twist,
                            force: pressure,
                        });
                        break;
                    case protocol_js_1.Input.PointerType.Touch:
                        await this.#context.cdpTarget.cdpClient.sendCommand('Input.dispatchTouchEvent', {
                            type: 'touchMove',
                            touchPoints: [
                                {
                                    x,
                                    y,
                                    radiusX: width,
                                    radiusY: height,
                                    tangentialPressure,
                                    tiltX,
                                    tiltY,
                                    twist,
                                    force: pressure,
                                    id: source.pointerId,
                                },
                            ],
                            modifiers,
                        });
                        break;
                }
                // --- Platform-specific code ends here ---
                source.x = x;
                source.y = y;
            }
        } while (!last);
    }
    async #getCoordinateFromOrigin(origin, offsetX, offsetY, startX, startY) {
        let targetX;
        let targetY;
        switch (origin) {
            case 'viewport':
                targetX = offsetX;
                targetY = offsetY;
                break;
            case 'pointer':
                targetX = startX + offsetX;
                targetY = startY + offsetY;
                break;
            default: {
                const { x: posX, y: posY } = await getElementCenter(this.#context, origin.element);
                // SAFETY: These can never be special numbers.
                targetX = posX + offsetX;
                targetY = posY + offsetY;
                break;
            }
        }
        return { targetX, targetY };
    }
    async #dispatchScrollAction(_source, keyState, action) {
        const { deltaX: targetDeltaX, deltaY: targetDeltaY, x: offsetX, y: offsetY, origin = 'viewport', duration = this.#tickDuration, } = action;
        if (origin === 'pointer') {
            throw new protocol_js_1.Message.InvalidArgumentException('"pointer" origin is invalid for scrolling.');
        }
        const { targetX, targetY } = await this.#getCoordinateFromOrigin(origin, offsetX, offsetY, 0, 0);
        if (targetX < 0 || targetY < 0) {
            throw new protocol_js_1.Message.MoveTargetOutOfBoundsException(`Cannot move beyond viewport (x: ${targetX}, y: ${targetY})`);
        }
        let currentDeltaX = 0;
        let currentDeltaY = 0;
        let last;
        do {
            const ratio = duration > 0 ? (performance.now() - this.#tickStart) / duration : 1;
            last = ratio >= 1;
            let deltaX;
            let deltaY;
            if (last) {
                deltaX = targetDeltaX - currentDeltaX;
                deltaY = targetDeltaY - currentDeltaY;
            }
            else {
                deltaX = Math.round(ratio * targetDeltaX - currentDeltaX);
                deltaY = Math.round(ratio * targetDeltaY - currentDeltaY);
            }
            if (deltaX !== 0 || deltaY !== 0) {
                // --- Platform-specific code begins here ---
                const { modifiers } = keyState;
                await this.#context.cdpTarget.cdpClient.sendCommand('Input.dispatchMouseEvent', {
                    type: 'mouseWheel',
                    deltaX,
                    deltaY,
                    x: targetX,
                    y: targetY,
                    modifiers,
                });
                // --- Platform-specific code ends here ---
                currentDeltaX += deltaX;
                currentDeltaY += deltaY;
            }
        } while (!last);
    }
    #dispatchKeyDownAction(source, action) {
        const rawKey = action.value;
        const key = (0, keyUtils_js_1.getNormalizedKey)(rawKey);
        const repeat = source.pressed.has(key);
        const code = (0, keyUtils_js_1.getKeyCode)(rawKey);
        const location = (0, keyUtils_js_1.getKeyLocation)(rawKey);
        switch (key) {
            case 'Alt':
                source.alt = true;
                break;
            case 'Shift':
                source.shift = true;
                break;
            case 'Control':
                source.ctrl = true;
                break;
            case 'Meta':
                source.meta = true;
                break;
        }
        source.pressed.add(key);
        const { modifiers } = source;
        // --- Platform-specific code begins here ---
        // The spread is a little hack so JS gives us an array of unicode characters
        // to measure.
        const text = [...key].length === 1 ? key : undefined;
        return this.#context.cdpTarget.cdpClient.sendCommand('Input.dispatchKeyEvent', {
            type: text ? 'keyDown' : 'rawKeyDown',
            windowsVirtualKeyCode: USKeyboardLayout_js_1.KeyToKeyCode[key],
            key,
            code,
            text,
            unmodifiedText: text,
            autoRepeat: repeat,
            isSystemKey: source.alt || undefined,
            location: location < 2 ? location : undefined,
            isKeypad: location === 3,
            modifiers,
        });
        // --- Platform-specific code ends here ---
    }
    #dispatchKeyUpAction(source, action) {
        const rawKey = action.value;
        const key = (0, keyUtils_js_1.getNormalizedKey)(rawKey);
        if (!source.pressed.has(key)) {
            return;
        }
        const code = (0, keyUtils_js_1.getKeyCode)(rawKey);
        const location = (0, keyUtils_js_1.getKeyLocation)(rawKey);
        switch (key) {
            case 'Alt':
                source.alt = false;
                break;
            case 'Shift':
                source.shift = false;
                break;
            case 'Control':
                source.ctrl = false;
                break;
            case 'Meta':
                source.meta = false;
                break;
        }
        source.pressed.delete(key);
        const { modifiers } = source;
        // --- Platform-specific code begins here ---
        // The spread is a little hack so JS gives us an array of unicode characters
        // to measure.
        const text = [...key].length === 1 ? key : undefined;
        return this.#context.cdpTarget.cdpClient.sendCommand('Input.dispatchKeyEvent', {
            type: 'keyUp',
            windowsVirtualKeyCode: USKeyboardLayout_js_1.KeyToKeyCode[key],
            key,
            code,
            text,
            unmodifiedText: text,
            location: location < 2 ? location : undefined,
            isSystemKey: source.alt || undefined,
            isKeypad: location === 3,
            modifiers,
        });
        // --- Platform-specific code ends here ---
    }
}
exports.ActionDispatcher = ActionDispatcher;
//# sourceMappingURL=ActionDispatcher.js.map
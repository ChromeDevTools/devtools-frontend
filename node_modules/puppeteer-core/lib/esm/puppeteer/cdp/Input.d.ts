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
import type { Protocol } from 'devtools-protocol';
import type { CDPSession } from '../api/CDPSession.js';
import type { Point } from '../api/ElementHandle.js';
import { Keyboard, type KeyDownOptions, type KeyPressOptions, Mouse, type MouseClickOptions, type MouseMoveOptions, type MouseOptions, type MouseWheelOptions, Touchscreen, type KeyboardTypeOptions } from '../api/Input.js';
import { type KeyInput } from '../common/USKeyboardLayout.js';
/**
 * @internal
 */
export declare class CdpKeyboard extends Keyboard {
    #private;
    _modifiers: number;
    constructor(client: CDPSession);
    updateClient(client: CDPSession): void;
    down(key: KeyInput, options?: Readonly<KeyDownOptions>): Promise<void>;
    up(key: KeyInput): Promise<void>;
    sendCharacter(char: string): Promise<void>;
    private charIsKey;
    type(text: string, options?: Readonly<KeyboardTypeOptions>): Promise<void>;
    press(key: KeyInput, options?: Readonly<KeyPressOptions>): Promise<void>;
}
/**
 * @internal
 */
export declare class CdpMouse extends Mouse {
    #private;
    constructor(client: CDPSession, keyboard: CdpKeyboard);
    updateClient(client: CDPSession): void;
    reset(): Promise<void>;
    move(x: number, y: number, options?: Readonly<MouseMoveOptions>): Promise<void>;
    down(options?: Readonly<MouseOptions>): Promise<void>;
    up(options?: Readonly<MouseOptions>): Promise<void>;
    click(x: number, y: number, options?: Readonly<MouseClickOptions>): Promise<void>;
    wheel(options?: Readonly<MouseWheelOptions>): Promise<void>;
    drag(start: Point, target: Point): Promise<Protocol.Input.DragData>;
    dragEnter(target: Point, data: Protocol.Input.DragData): Promise<void>;
    dragOver(target: Point, data: Protocol.Input.DragData): Promise<void>;
    drop(target: Point, data: Protocol.Input.DragData): Promise<void>;
    dragAndDrop(start: Point, target: Point, options?: {
        delay?: number;
    }): Promise<void>;
}
/**
 * @internal
 */
export declare class CdpTouchscreen extends Touchscreen {
    #private;
    constructor(client: CDPSession, keyboard: CdpKeyboard);
    updateClient(client: CDPSession): void;
    tap(x: number, y: number): Promise<void>;
    touchStart(x: number, y: number): Promise<void>;
    touchMove(x: number, y: number): Promise<void>;
    touchEnd(): Promise<void>;
}
//# sourceMappingURL=Input.d.ts.map
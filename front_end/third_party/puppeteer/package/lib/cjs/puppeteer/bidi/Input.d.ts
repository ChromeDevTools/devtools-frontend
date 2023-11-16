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
import * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import { Keyboard, Mouse, Touchscreen, type KeyDownOptions, type KeyPressOptions, type KeyboardTypeOptions, type MouseClickOptions, type MouseMoveOptions, type MouseOptions, type MouseWheelOptions } from '../api/Input.js';
import type { KeyInput } from '../common/USKeyboardLayout.js';
import type { BrowsingContext } from './BrowsingContext.js';
import type { BidiPage } from './Page.js';
/**
 * @internal
 */
export declare class BidiKeyboard extends Keyboard {
    #private;
    constructor(page: BidiPage);
    down(key: KeyInput, _options?: Readonly<KeyDownOptions>): Promise<void>;
    up(key: KeyInput): Promise<void>;
    press(key: KeyInput, options?: Readonly<KeyPressOptions>): Promise<void>;
    type(text: string, options?: Readonly<KeyboardTypeOptions>): Promise<void>;
    sendCharacter(char: string): Promise<void>;
}
/**
 * @internal
 */
export interface BidiMouseClickOptions extends MouseClickOptions {
    origin?: Bidi.Input.Origin;
}
/**
 * @internal
 */
export interface BidiMouseMoveOptions extends MouseMoveOptions {
    origin?: Bidi.Input.Origin;
}
/**
 * @internal
 */
export interface BidiTouchMoveOptions {
    origin?: Bidi.Input.Origin;
}
/**
 * @internal
 */
export declare class BidiMouse extends Mouse {
    #private;
    constructor(context: BrowsingContext);
    reset(): Promise<void>;
    move(x: number, y: number, options?: Readonly<BidiMouseMoveOptions>): Promise<void>;
    down(options?: Readonly<MouseOptions>): Promise<void>;
    up(options?: Readonly<MouseOptions>): Promise<void>;
    click(x: number, y: number, options?: Readonly<BidiMouseClickOptions>): Promise<void>;
    wheel(options?: Readonly<MouseWheelOptions>): Promise<void>;
    drag(): never;
    dragOver(): never;
    dragEnter(): never;
    drop(): never;
    dragAndDrop(): never;
}
/**
 * @internal
 */
export declare class BidiTouchscreen extends Touchscreen {
    #private;
    constructor(context: BrowsingContext);
    touchStart(x: number, y: number, options?: BidiTouchMoveOptions): Promise<void>;
    touchMove(x: number, y: number, options?: BidiTouchMoveOptions): Promise<void>;
    touchEnd(): Promise<void>;
}
//# sourceMappingURL=Input.d.ts.map
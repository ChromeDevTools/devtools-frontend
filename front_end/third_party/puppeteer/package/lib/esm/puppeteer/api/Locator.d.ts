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
import { EventEmitter } from '../common/EventEmitter.js';
import { ElementHandle, ClickOptions } from './ElementHandle.js';
import type { Frame } from './Frame.js';
import type { Page } from './Page.js';
/**
 * @public
 */
export type VisibilityOption = 'hidden' | 'visible' | null;
/**
 * @public
 */
export interface LocatorOptions {
    /**
     * Whether to wait for the element to be `visible` or `hidden`. `null` to
     * disable visibility checks.
     */
    visibility: VisibilityOption;
    /**
     * Total timeout for the entire locator operation.
     *
     * Pass `0` to disable timeout.
     *
     * @defaultValue `Page.getDefaultTimeout()`
     */
    timeout: number;
    /**
     * Whether to scroll the element into viewport if not in the viewprot already.
     * @defaultValue `true`
     */
    ensureElementIsInTheViewport: boolean;
    /**
     * Whether to wait for input elements to become enabled before the action.
     * Applicable to `click` and `fill` actions.
     * @defaultValue `true`
     */
    waitForEnabled: boolean;
    /**
     * Whether to wait for the element's bounding box to be same between two
     * animation frames.
     * @defaultValue `true`
     */
    waitForStableBoundingBox: boolean;
}
/**
 * @public
 */
export type ActionCondition = (element: ElementHandle, signal: AbortSignal) => Promise<void>;
/**
 * @public
 */
export interface ActionOptions {
    signal?: AbortSignal;
    conditions: ActionCondition[];
}
/**
 * All the events that a locator instance may emit.
 *
 * @public
 */
export declare enum LocatorEmittedEvents {
    /**
     * Emitted every time before the locator performs an action on the located element(s).
     */
    Action = "action"
}
/**
 * @public
 */
export interface LocatorEventObject {
    [LocatorEmittedEvents.Action]: never;
}
/**
 * Locators describe a strategy of locating elements and performing an action on
 * them. If the action fails because the element is not ready for the action,
 * the whole operation is retried. Various preconditions for a successful action
 * are checked automatically.
 *
 * @public
 */
export declare abstract class Locator extends EventEmitter {
    /**
     * @internal
     */
    static create(pageOrFrame: Page | Frame, selector: string): Locator;
    /**
     * Creates a race between multiple locators but ensures that only a single one
     * acts.
     */
    static race(locators: Locator[]): Locator;
    on<K extends keyof LocatorEventObject>(eventName: K, handler: (event: LocatorEventObject[K]) => void): this;
    once<K extends keyof LocatorEventObject>(eventName: K, handler: (event: LocatorEventObject[K]) => void): this;
    off<K extends keyof LocatorEventObject>(eventName: K, handler: (event: LocatorEventObject[K]) => void): this;
    abstract setVisibility(visibility: VisibilityOption): this;
    abstract setTimeout(timeout: number): this;
    abstract setEnsureElementIsInTheViewport(value: boolean): this;
    abstract setWaitForEnabled(value: boolean): this;
    abstract setWaitForStableBoundingBox(value: boolean): this;
    abstract click(clickOptions?: ClickOptions & {
        signal?: AbortSignal;
    }): Promise<void>;
    /**
     * Fills out the input identified by the locator using the provided value. The
     * type of the input is determined at runtime and the appropriate fill-out
     * method is chosen based on the type. contenteditable, selector, inputs are
     * supported.
     */
    abstract fill(value: string, fillOptions?: {
        signal?: AbortSignal;
    }): Promise<void>;
    abstract hover(hoverOptions?: {
        signal?: AbortSignal;
    }): Promise<void>;
    abstract scroll(scrollOptions?: {
        scrollTop?: number;
        scrollLeft?: number;
        signal?: AbortSignal;
    }): Promise<void>;
}
/**
 * @internal
 */
export declare class LocatorImpl extends Locator {
    #private;
    constructor(pageOrFrame: Page | Frame, selector: string);
    setVisibility(visibility: VisibilityOption): this;
    setTimeout(timeout: number): this;
    setEnsureElementIsInTheViewport(value: boolean): this;
    setWaitForEnabled(value: boolean): this;
    setWaitForStableBoundingBox(value: boolean): this;
    click(clickOptions?: ClickOptions & {
        signal?: AbortSignal;
    }): Promise<void>;
    /**
     * Fills out the input identified by the locator using the provided value. The
     * type of the input is determined at runtime and the appropriate fill-out
     * method is chosen based on the type. contenteditable, selector, inputs are
     * supported.
     */
    fill(value: string, fillOptions?: {
        signal?: AbortSignal;
    }): Promise<void>;
    hover(hoverOptions?: {
        signal?: AbortSignal;
    }): Promise<void>;
    scroll(scrollOptions?: {
        scrollTop?: number;
        scrollLeft?: number;
        signal?: AbortSignal;
    }): Promise<void>;
}
//# sourceMappingURL=Locator.d.ts.map
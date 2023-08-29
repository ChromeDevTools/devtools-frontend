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
import { Observable, OperatorFunction } from '../../../third_party/rxjs/rxjs.js';
import { EventEmitter } from '../../common/EventEmitter.js';
import { HandleFor } from '../../common/types.js';
import { ClickOptions } from '../ElementHandle.js';
import { Action, AwaitedLocator, HandleMapper, Mapper, Predicate } from './locators.js';
/**
 * For observables coming from promises, a delay is needed, otherwise RxJS will
 * never yield in a permanent failure for a promise.
 *
 * We also don't want RxJS to do promise operations to often, so we bump the
 * delay up to 100ms.
 *
 * @internal
 */
export declare const RETRY_DELAY = 100;
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
export interface ActionOptions {
    signal?: AbortSignal;
}
/**
 * @public
 */
export type LocatorClickOptions = ClickOptions & ActionOptions;
/**
 * @public
 */
export interface LocatorScrollOptions extends ActionOptions {
    scrollTop?: number;
    scrollLeft?: number;
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
 * Locators describe a strategy of locating objects and performing an action on
 * them. If the action fails because the object is not ready for the action, the
 * whole operation is retried. Various preconditions for a successful action are
 * checked automatically.
 *
 * @public
 */
export declare abstract class Locator<T> extends EventEmitter {
    #private;
    /**
     * Creates a race between multiple locators but ensures that only a single one
     * acts.
     *
     * @public
     */
    static race<Locators extends readonly unknown[] | []>(locators: Locators): Locator<AwaitedLocator<Locators[number]>>;
    /**
     * Used for nominally typing {@link Locator}.
     */
    _?: T;
    /**
     * @internal
     */
    protected visibility: VisibilityOption;
    /**
     * @internal
     */
    protected _timeout: number;
    /**
     * @internal
     */
    protected operators: {
        conditions: (conditions: Array<Action<T, never>>, signal?: AbortSignal) => OperatorFunction<HandleFor<T>, HandleFor<T>>;
        retryAndRaceWithSignalAndTimer: <T_1>(signal?: AbortSignal) => OperatorFunction<T_1, T_1>;
    };
    get timeout(): number;
    on<K extends keyof LocatorEventObject>(eventName: K, handler: (event: LocatorEventObject[K]) => void): this;
    once<K extends keyof LocatorEventObject>(eventName: K, handler: (event: LocatorEventObject[K]) => void): this;
    off<K extends keyof LocatorEventObject>(eventName: K, handler: (event: LocatorEventObject[K]) => void): this;
    setTimeout(timeout: number): Locator<T>;
    setVisibility<NodeType extends Node>(this: Locator<NodeType>, visibility: VisibilityOption): Locator<NodeType>;
    setWaitForEnabled<NodeType extends Node>(this: Locator<NodeType>, value: boolean): Locator<NodeType>;
    setEnsureElementIsInTheViewport<ElementType extends Element>(this: Locator<ElementType>, value: boolean): Locator<ElementType>;
    setWaitForStableBoundingBox<ElementType extends Element>(this: Locator<ElementType>, value: boolean): Locator<ElementType>;
    /**
     * @internal
     */
    copyOptions<T>(locator: Locator<T>): this;
    /**
     * @internal
     */
    abstract _clone(): Locator<T>;
    /**
     * @internal
     */
    abstract _wait(options?: Readonly<ActionOptions>): Observable<HandleFor<T>>;
    /**
     * Clones the locator.
     */
    clone(): Locator<T>;
    /**
     * Waits for the locator to get a handle from the page.
     *
     * @public
     */
    waitHandle(options?: Readonly<ActionOptions>): Promise<HandleFor<T>>;
    /**
     * Waits for the locator to get the serialized value from the page.
     *
     * Note this requires the value to be JSON-serializable.
     *
     * @public
     */
    wait(options?: Readonly<ActionOptions>): Promise<T>;
    /**
     * Maps the locator using the provided mapper.
     *
     * @public
     */
    map<To>(mapper: Mapper<T, To>): Locator<To>;
    /**
     * Creates an expectation that is evaluated against located values.
     *
     * If the expectations do not match, then the locator will retry.
     *
     * @public
     */
    filter<S extends T>(predicate: Predicate<T, S>): Locator<S>;
    /**
     * Creates an expectation that is evaluated against located handles.
     *
     * If the expectations do not match, then the locator will retry.
     *
     * @internal
     */
    filterHandle<S extends T>(predicate: Predicate<HandleFor<T>, HandleFor<S>>): Locator<S>;
    /**
     * Maps the locator using the provided mapper.
     *
     * @internal
     */
    mapHandle<To>(mapper: HandleMapper<T, To>): Locator<To>;
    click<ElementType extends Element>(this: Locator<ElementType>, options?: Readonly<LocatorClickOptions>): Promise<void>;
    /**
     * Fills out the input identified by the locator using the provided value. The
     * type of the input is determined at runtime and the appropriate fill-out
     * method is chosen based on the type. contenteditable, selector, inputs are
     * supported.
     */
    fill<ElementType extends Element>(this: Locator<ElementType>, value: string, options?: Readonly<ActionOptions>): Promise<void>;
    hover<ElementType extends Element>(this: Locator<ElementType>, options?: Readonly<ActionOptions>): Promise<void>;
    scroll<ElementType extends Element>(this: Locator<ElementType>, options?: Readonly<LocatorScrollOptions>): Promise<void>;
}
//# sourceMappingURL=Locator.d.ts.map
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
import { Protocol } from 'devtools-protocol';
import type { ClickOptions, ElementHandle } from '../api/ElementHandle.js';
import { Realm } from '../api/Frame.js';
import { KeyboardTypeOptions } from '../api/Input.js';
import { JSHandle } from '../api/JSHandle.js';
import { Binding } from './Binding.js';
import { ExecutionContext } from './ExecutionContext.js';
import { Frame } from './Frame.js';
import { MAIN_WORLD, PUPPETEER_WORLD } from './IsolatedWorlds.js';
import { PuppeteerLifeCycleEvent } from './LifecycleWatcher.js';
import { EvaluateFunc, EvaluateFuncWith, HandleFor, InnerLazyParams, NodeFor } from './types.js';
import { TaskManager } from './WaitTask.js';
/**
 * @public
 */
export interface WaitForSelectorOptions {
    /**
     * Wait for the selected element to be present in DOM and to be visible, i.e.
     * to not have `display: none` or `visibility: hidden` CSS properties.
     *
     * @defaultValue `false`
     */
    visible?: boolean;
    /**
     * Wait for the selected element to not be found in the DOM or to be hidden,
     * i.e. have `display: none` or `visibility: hidden` CSS properties.
     *
     * @defaultValue `false`
     */
    hidden?: boolean;
    /**
     * Maximum time to wait in milliseconds. Pass `0` to disable timeout.
     *
     * The default value can be changed by using {@link Page.setDefaultTimeout}
     *
     * @defaultValue `30_000` (30 seconds)
     */
    timeout?: number;
    /**
     * A signal object that allows you to cancel a waitForSelector call.
     */
    signal?: AbortSignal;
}
/**
 * @internal
 */
export interface PageBinding {
    name: string;
    pptrFunction: Function;
}
/**
 * @internal
 */
export interface IsolatedWorldChart {
    [key: string]: IsolatedWorld;
    [MAIN_WORLD]: IsolatedWorld;
    [PUPPETEER_WORLD]: IsolatedWorld;
}
/**
 * @internal
 */
export declare class IsolatedWorld implements Realm {
    #private;
    get taskManager(): TaskManager;
    get _bindings(): Map<string, Binding>;
    constructor(frame: Frame);
    frame(): Frame;
    clearContext(): void;
    setContext(context: ExecutionContext): void;
    hasContext(): boolean;
    _detach(): void;
    executionContext(): Promise<ExecutionContext>;
    evaluateHandle<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    evaluate<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    $<Selector extends string>(selector: Selector): Promise<ElementHandle<NodeFor<Selector>> | null>;
    $$<Selector extends string>(selector: Selector): Promise<Array<ElementHandle<NodeFor<Selector>>>>;
    document(): Promise<ElementHandle<Document>>;
    $x(expression: string): Promise<Array<ElementHandle<Node>>>;
    $eval<Selector extends string, Params extends unknown[], Func extends EvaluateFuncWith<NodeFor<Selector>, Params> = EvaluateFuncWith<NodeFor<Selector>, Params>>(selector: Selector, pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    $$eval<Selector extends string, Params extends unknown[], Func extends EvaluateFuncWith<Array<NodeFor<Selector>>, Params> = EvaluateFuncWith<Array<NodeFor<Selector>>, Params>>(selector: Selector, pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    content(): Promise<string>;
    setContent(html: string, options?: {
        timeout?: number;
        waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
    }): Promise<void>;
    click(selector: string, options?: Readonly<ClickOptions>): Promise<void>;
    focus(selector: string): Promise<void>;
    hover(selector: string): Promise<void>;
    select(selector: string, ...values: string[]): Promise<string[]>;
    tap(selector: string): Promise<void>;
    type(selector: string, text: string, options?: Readonly<KeyboardTypeOptions>): Promise<void>;
    _addBindingToContext(context: ExecutionContext, name: string): Promise<void>;
    waitForFunction<Params extends unknown[], Func extends EvaluateFunc<InnerLazyParams<Params>> = EvaluateFunc<InnerLazyParams<Params>>>(pageFunction: Func | string, options?: {
        polling?: 'raf' | 'mutation' | number;
        timeout?: number;
        root?: ElementHandle<Node>;
        signal?: AbortSignal;
    }, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    title(): Promise<string>;
    adoptBackendNode(backendNodeId?: Protocol.DOM.BackendNodeId): Promise<JSHandle<Node>>;
    adoptHandle<T extends JSHandle<Node>>(handle: T): Promise<T>;
    transferHandle<T extends JSHandle<Node>>(handle: T): Promise<T>;
}
//# sourceMappingURL=IsolatedWorld.d.ts.map
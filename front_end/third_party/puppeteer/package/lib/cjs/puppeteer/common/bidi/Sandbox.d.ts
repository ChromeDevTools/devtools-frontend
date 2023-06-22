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
import { ClickOptions, ElementHandle } from '../../api/ElementHandle.js';
import { Realm as RealmBase } from '../../api/Frame.js';
import { KeyboardTypeOptions } from '../../api/Input.js';
import { JSHandle as BaseJSHandle } from '../../api/JSHandle.js';
import { TimeoutSettings } from '../TimeoutSettings.js';
import { EvaluateFunc, EvaluateFuncWith, HandleFor, InnerLazyParams, NodeFor } from '../types.js';
import { TaskManager } from '../WaitTask.js';
import { Realm } from './Realm.js';
/**
 * A unique key for {@link SandboxChart} to denote the default world.
 * Realms are automatically created in the default sandbox.
 *
 * @internal
 */
export declare const MAIN_SANDBOX: unique symbol;
/**
 * A unique key for {@link SandboxChart} to denote the puppeteer sandbox.
 * This world contains all puppeteer-internal bindings/code.
 *
 * @internal
 */
export declare const PUPPETEER_SANDBOX: unique symbol;
/**
 * @internal
 */
export interface SandboxChart {
    [key: string]: Sandbox;
    [MAIN_SANDBOX]: Sandbox;
    [PUPPETEER_SANDBOX]: Sandbox;
}
/**
 * @internal
 */
export declare class Sandbox implements RealmBase {
    #private;
    constructor(context: Realm, timeoutSettings: TimeoutSettings);
    get taskManager(): TaskManager;
    document(): Promise<ElementHandle<Document>>;
    $<Selector extends string>(selector: Selector): Promise<ElementHandle<NodeFor<Selector>> | null>;
    $$<Selector extends string>(selector: Selector): Promise<Array<ElementHandle<NodeFor<Selector>>>>;
    $eval<Selector extends string, Params extends unknown[], Func extends EvaluateFuncWith<NodeFor<Selector>, Params> = EvaluateFuncWith<NodeFor<Selector>, Params>>(selector: Selector, pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    $$eval<Selector extends string, Params extends unknown[], Func extends EvaluateFuncWith<Array<NodeFor<Selector>>, Params> = EvaluateFuncWith<Array<NodeFor<Selector>>, Params>>(selector: Selector, pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    $x(expression: string): Promise<Array<ElementHandle<Node>>>;
    evaluateHandle<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    evaluate<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    adoptHandle<T extends BaseJSHandle<Node>>(handle: T): Promise<T>;
    transferHandle<T extends BaseJSHandle<Node>>(handle: T): Promise<T>;
    waitForFunction<Params extends unknown[], Func extends EvaluateFunc<InnerLazyParams<Params>> = EvaluateFunc<InnerLazyParams<Params>>>(pageFunction: Func | string, options?: {
        polling?: 'raf' | 'mutation' | number;
        timeout?: number;
        root?: ElementHandle<Node>;
        signal?: AbortSignal;
    }, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    click(selector: string, options?: Readonly<ClickOptions>): Promise<void>;
    focus(selector: string): Promise<void>;
    hover(selector: string): Promise<void>;
    select(selector: string, ...values: string[]): Promise<string[]>;
    tap(selector: string): Promise<void>;
    type(selector: string, text: string, options?: Readonly<KeyboardTypeOptions>): Promise<void>;
}
//# sourceMappingURL=Sandbox.d.ts.map
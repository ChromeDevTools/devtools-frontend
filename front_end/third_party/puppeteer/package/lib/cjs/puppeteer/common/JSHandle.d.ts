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
import { JSHandle } from '../api/JSHandle.js';
import { CDPSession } from './Connection.js';
import type { CDPElementHandle } from './ElementHandle.js';
import { ExecutionContext } from './ExecutionContext.js';
import { EvaluateFuncWith, HandleFor, HandleOr } from './types.js';
declare const __JSHandleSymbol: unique symbol;
/**
 * @internal
 */
export declare class CDPJSHandle<T = unknown> extends JSHandle<T> {
    #private;
    /**
     * Used for nominally typing {@link JSHandle}.
     */
    [__JSHandleSymbol]?: T;
    get disposed(): boolean;
    constructor(context: ExecutionContext, remoteObject: Protocol.Runtime.RemoteObject);
    executionContext(): ExecutionContext;
    get client(): CDPSession;
    /**
     * @see {@link ExecutionContext.evaluate} for more details.
     */
    evaluate<Params extends unknown[], Func extends EvaluateFuncWith<T, Params> = EvaluateFuncWith<T, Params>>(pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    /**
     * @see {@link ExecutionContext.evaluateHandle} for more details.
     */
    evaluateHandle<Params extends unknown[], Func extends EvaluateFuncWith<T, Params> = EvaluateFuncWith<T, Params>>(pageFunction: Func | string, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    getProperty<K extends keyof T>(propertyName: HandleOr<K>): Promise<HandleFor<T[K]>>;
    getProperty(propertyName: string): Promise<JSHandle<unknown>>;
    getProperties(): Promise<Map<string, JSHandle>>;
    jsonValue(): Promise<T>;
    /**
     * Either `null` or the handle itself if the handle is an
     * instance of {@link ElementHandle}.
     */
    asElement(): CDPElementHandle<Node> | null;
    dispose(): Promise<void>;
    toString(): string;
    get id(): string | undefined;
    remoteObject(): Protocol.Runtime.RemoteObject;
}
export {};
//# sourceMappingURL=JSHandle.d.ts.map
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
import type { Protocol } from 'devtools-protocol';
import type { CDPSession } from '../api/CDPSession.js';
import type { JSHandle } from '../api/JSHandle.js';
import { Realm } from '../api/Realm.js';
import type { TimeoutSettings } from '../common/TimeoutSettings.js';
import type { EvaluateFunc, HandleFor } from '../common/types.js';
import { disposeSymbol } from '../util/disposable.js';
import type { Binding } from './Binding.js';
import { type ExecutionContext } from './ExecutionContext.js';
import { CdpFrame } from './Frame.js';
import type { MAIN_WORLD, PUPPETEER_WORLD } from './IsolatedWorlds.js';
import type { WebWorker } from './WebWorker.js';
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
export declare class IsolatedWorld extends Realm {
    #private;
    get _bindings(): Map<string, Binding>;
    constructor(frameOrWorker: CdpFrame | WebWorker, timeoutSettings: TimeoutSettings);
    get environment(): CdpFrame | WebWorker;
    frameUpdated(): void;
    get client(): CDPSession;
    clearContext(): void;
    setContext(context: ExecutionContext): void;
    hasContext(): boolean;
    evaluateHandle<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    evaluate<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    _addBindingToContext(context: ExecutionContext, name: string): Promise<void>;
    adoptBackendNode(backendNodeId?: Protocol.DOM.BackendNodeId): Promise<JSHandle<Node>>;
    adoptHandle<T extends JSHandle<Node>>(handle: T): Promise<T>;
    transferHandle<T extends JSHandle<Node>>(handle: T): Promise<T>;
    [disposeSymbol](): void;
}
//# sourceMappingURL=IsolatedWorld.d.ts.map
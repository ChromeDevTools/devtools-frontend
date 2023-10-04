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
import type { TimeoutSettings } from '../common/TimeoutSettings.js';
import type { EvaluateFunc, HandleFor, InnerLazyParams } from '../common/types.js';
import { TaskManager } from '../common/WaitTask.js';
import { disposeSymbol } from '../util/disposable.js';
import type { ElementHandle } from './ElementHandle.js';
import type { Environment } from './Environment.js';
import type { JSHandle } from './JSHandle.js';
/**
 * @internal
 */
export declare abstract class Realm implements Disposable {
    #private;
    protected readonly timeoutSettings: TimeoutSettings;
    readonly taskManager: TaskManager;
    constructor(timeoutSettings: TimeoutSettings);
    abstract get environment(): Environment;
    abstract adoptHandle<T extends JSHandle<Node>>(handle: T): Promise<T>;
    abstract transferHandle<T extends JSHandle<Node>>(handle: T): Promise<T>;
    abstract evaluateHandle<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    abstract evaluate<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    waitForFunction<Params extends unknown[], Func extends EvaluateFunc<InnerLazyParams<Params>> = EvaluateFunc<InnerLazyParams<Params>>>(pageFunction: Func | string, options?: {
        polling?: 'raf' | 'mutation' | number;
        timeout?: number;
        root?: ElementHandle<Node>;
        signal?: AbortSignal;
    }, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    abstract adoptBackendNode(backendNodeId?: number): Promise<JSHandle<Node>>;
    get disposed(): boolean;
    /** @internal */
    [disposeSymbol](): void;
}
//# sourceMappingURL=Realm.d.ts.map
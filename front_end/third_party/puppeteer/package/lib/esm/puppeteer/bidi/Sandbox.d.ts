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
import type { JSHandle } from '../api/JSHandle.js';
import { Realm } from '../api/Realm.js';
import type { TimeoutSettings } from '../common/TimeoutSettings.js';
import type { EvaluateFunc, HandleFor } from '../common/types.js';
import type { BrowsingContext } from './BrowsingContext.js';
import type { BidiFrame } from './Frame.js';
import type { BidiRealm as BidiRealm } from './Realm.js';
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
export declare class Sandbox extends Realm {
    #private;
    readonly name: string | undefined;
    readonly realm: BidiRealm;
    constructor(name: string | undefined, frame: BidiFrame, realm: BidiRealm | BrowsingContext, timeoutSettings: TimeoutSettings);
    get environment(): BidiFrame;
    evaluateHandle<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    evaluate<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    adoptHandle<T extends JSHandle<Node>>(handle: T): Promise<T>;
    transferHandle<T extends JSHandle<Node>>(handle: T): Promise<T>;
    adoptBackendNode(backendNodeId?: number): Promise<JSHandle<Node>>;
}
//# sourceMappingURL=Sandbox.d.ts.map
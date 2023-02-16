/**
 * Copyright 2022 Google Inc. All rights reserved.
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
import { Page as PageBase } from '../../api/Page.js';
import { Connection } from './Connection.js';
import type { EvaluateFunc, HandleFor } from '../types.js';
import { JSHandle } from './JSHandle.js';
import { Reference } from './types.js';
/**
 * @internal
 */
export declare class Page extends PageBase {
    #private;
    _contextId: string;
    constructor(connection: Connection, contextId: string);
    close(): Promise<void>;
    get connection(): Connection;
    evaluateHandle<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    evaluate<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
}
/**
 * @internal
 */
export declare function getBidiHandle(context: Page, result: Reference): JSHandle;
//# sourceMappingURL=Page.d.ts.map
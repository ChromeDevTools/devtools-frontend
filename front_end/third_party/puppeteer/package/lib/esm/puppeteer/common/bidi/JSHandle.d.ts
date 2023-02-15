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
import { ElementHandle } from '../../api/ElementHandle.js';
import { EvaluateFuncWith, HandleFor, HandleOr } from '../../common/types.js';
import { Page } from './Page.js';
import { JSHandle as BaseJSHandle } from '../../api/JSHandle.js';
import { Connection } from './Connection.js';
import * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
export declare class JSHandle<T = unknown> extends BaseJSHandle<T> {
    #private;
    constructor(context: Page, remoteValue: Bidi.CommonDataTypes.RemoteValue);
    context(): Page;
    get connecton(): Connection;
    get disposed(): boolean;
    evaluate<Params extends unknown[], Func extends EvaluateFuncWith<T, Params> = EvaluateFuncWith<T, Params>>(pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    evaluateHandle<Params extends unknown[], Func extends EvaluateFuncWith<T, Params> = EvaluateFuncWith<T, Params>>(pageFunction: Func | string, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    getProperty<K extends keyof T>(propertyName: HandleOr<K>): Promise<HandleFor<T[K]>>;
    getProperty(propertyName: string): Promise<HandleFor<unknown>>;
    getProperties(): Promise<Map<string, BaseJSHandle>>;
    jsonValue(): Promise<T>;
    asElement(): ElementHandle<Node> | null;
    dispose(): Promise<void>;
    toString(): string;
    get id(): string | undefined;
    bidiObject(): Bidi.CommonDataTypes.RemoteValue;
}
//# sourceMappingURL=JSHandle.d.ts.map
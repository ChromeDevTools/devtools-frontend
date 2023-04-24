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
import * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import { ElementHandle as BaseElementHandle } from '../../api/ElementHandle.js';
import { Connection } from './Connection.js';
import { Context } from './Context.js';
import { JSHandle } from './JSHandle.js';
/**
 * @internal
 */
export declare class ElementHandle<ElementType extends Node = Element> extends BaseElementHandle<ElementType> {
    handle: JSHandle<ElementType>;
    constructor(context: Context, remoteValue: Bidi.CommonDataTypes.RemoteValue);
    context(): Context;
    get connection(): Connection;
    get isPrimitiveValue(): boolean;
    remoteValue(): Bidi.CommonDataTypes.RemoteValue;
}
//# sourceMappingURL=ElementHandle.d.ts.map
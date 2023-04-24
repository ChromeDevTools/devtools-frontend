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
import { Context } from './Context.js';
/**
 * @internal
 */
export declare class BidiSerializer {
    static serializeNumber(arg: number): Bidi.CommonDataTypes.LocalOrRemoteValue;
    static serializeObject(arg: object | null): Bidi.CommonDataTypes.LocalOrRemoteValue;
    static serializeRemoveValue(arg: unknown): Bidi.CommonDataTypes.LocalOrRemoteValue;
    static serialize(arg: unknown, context: Context): Bidi.CommonDataTypes.LocalOrRemoteValue;
    static deserializeNumber(value: Bidi.CommonDataTypes.SpecialNumber | number): number;
    static deserializeLocalValue(result: Bidi.CommonDataTypes.RemoteValue): unknown;
    static deserializeTuple([serializedKey, serializedValue]: [
        Bidi.CommonDataTypes.RemoteValue | string,
        Bidi.CommonDataTypes.RemoteValue
    ]): {
        key: unknown;
        value: unknown;
    };
    static deserialize(result: Bidi.CommonDataTypes.RemoteValue): any;
}
//# sourceMappingURL=Serializer.d.ts.map
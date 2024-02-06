/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
/**
 * @internal
 */
export declare class BidiDeserializer {
    static deserializeNumber(value: Bidi.Script.SpecialNumber | number): number;
    static deserializeLocalValue(result: Bidi.Script.RemoteValue): unknown;
    static deserializeTuple([serializedKey, serializedValue]: [
        Bidi.Script.RemoteValue | string,
        Bidi.Script.RemoteValue
    ]): {
        key: unknown;
        value: unknown;
    };
    static deserialize(result: Bidi.Script.RemoteValue): any;
}
//# sourceMappingURL=Deserializer.d.ts.map
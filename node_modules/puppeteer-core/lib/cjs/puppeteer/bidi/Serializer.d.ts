/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import type { Sandbox } from './Sandbox.js';
/**
 * @internal
 */
export declare class BidiSerializer {
    static serializeNumber(arg: number): Bidi.Script.LocalValue;
    static serializeObject(arg: object | null): Bidi.Script.LocalValue;
    static serializeRemoteValue(arg: unknown): Bidi.Script.LocalValue;
    static serialize(sandbox: Sandbox, arg: unknown): Promise<Bidi.Script.LocalValue>;
}
//# sourceMappingURL=Serializer.d.ts.map
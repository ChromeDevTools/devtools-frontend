/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import type { ElementHandle } from '../api/ElementHandle.js';
import { JSHandle } from '../api/JSHandle.js';
import type { BidiRealm } from './Realm.js';
import type { Sandbox } from './Sandbox.js';
/**
 * @internal
 */
export declare class BidiJSHandle<T = unknown> extends JSHandle<T> {
    #private;
    constructor(sandbox: Sandbox, remoteValue: Bidi.Script.RemoteValue);
    context(): BidiRealm;
    get realm(): Sandbox;
    get disposed(): boolean;
    jsonValue(): Promise<T>;
    asElement(): ElementHandle<Node> | null;
    dispose(): Promise<void>;
    get isPrimitiveValue(): boolean;
    toString(): string;
    get id(): string | undefined;
    remoteValue(): Bidi.Script.RemoteValue;
    remoteObject(): never;
}
//# sourceMappingURL=JSHandle.d.ts.map
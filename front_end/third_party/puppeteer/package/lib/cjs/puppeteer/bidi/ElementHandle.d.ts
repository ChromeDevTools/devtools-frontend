/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import { type AutofillData, ElementHandle } from '../api/ElementHandle.js';
import type { BidiFrame } from './Frame.js';
import { BidiJSHandle } from './JSHandle.js';
import type { BidiRealm } from './Realm.js';
import type { Sandbox } from './Sandbox.js';
/**
 * @internal
 */
export declare class BidiElementHandle<ElementType extends Node = Element> extends ElementHandle<ElementType> {
    handle: BidiJSHandle<ElementType>;
    constructor(sandbox: Sandbox, remoteValue: Bidi.Script.RemoteValue);
    get realm(): Sandbox;
    get frame(): BidiFrame;
    context(): BidiRealm;
    get isPrimitiveValue(): boolean;
    remoteValue(): Bidi.Script.RemoteValue;
    autofill(data: AutofillData): Promise<void>;
    contentFrame(this: BidiElementHandle<HTMLIFrameElement>): Promise<BidiFrame>;
    uploadFile(this: ElementHandle<HTMLInputElement>): never;
}
//# sourceMappingURL=ElementHandle.d.ts.map
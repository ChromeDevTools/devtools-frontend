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
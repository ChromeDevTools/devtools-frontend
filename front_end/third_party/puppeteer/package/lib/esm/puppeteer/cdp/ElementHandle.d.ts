/**
 * Copyright 2019 Google Inc. All rights reserved.
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
import { type Protocol } from 'devtools-protocol';
import { type CDPSession } from '../api/CDPSession.js';
import { ElementHandle, type AutofillData } from '../api/ElementHandle.js';
import { type CdpFrame } from './Frame.js';
import { type IsolatedWorld } from './IsolatedWorld.js';
import { CdpJSHandle } from './JSHandle.js';
/**
 * The CdpElementHandle extends ElementHandle now to keep compatibility
 * with `instanceof` because of that we need to have methods for
 * CdpJSHandle to in this implementation as well.
 *
 * @internal
 */
export declare class CdpElementHandle<ElementType extends Node = Element> extends ElementHandle<ElementType> {
    #private;
    protected readonly handle: CdpJSHandle<ElementType>;
    constructor(world: IsolatedWorld, remoteObject: Protocol.Runtime.RemoteObject);
    get realm(): IsolatedWorld;
    get client(): CDPSession;
    remoteObject(): Protocol.Runtime.RemoteObject;
    get frame(): CdpFrame;
    contentFrame(this: ElementHandle<HTMLIFrameElement>): Promise<CdpFrame>;
    scrollIntoView(this: CdpElementHandle<Element>): Promise<void>;
    uploadFile(this: CdpElementHandle<HTMLInputElement>, ...filePaths: string[]): Promise<void>;
    autofill(data: AutofillData): Promise<void>;
}
//# sourceMappingURL=ElementHandle.d.ts.map
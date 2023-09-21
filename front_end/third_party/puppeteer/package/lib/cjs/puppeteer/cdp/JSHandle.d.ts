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
import { JSHandle } from '../api/JSHandle.js';
import type { CdpElementHandle } from './ElementHandle.js';
import { type IsolatedWorld } from './IsolatedWorld.js';
/**
 * @internal
 */
export declare class CdpJSHandle<T = unknown> extends JSHandle<T> {
    #private;
    constructor(world: IsolatedWorld, remoteObject: Protocol.Runtime.RemoteObject);
    get disposed(): boolean;
    get realm(): IsolatedWorld;
    get client(): CDPSession;
    jsonValue(): Promise<T>;
    /**
     * Either `null` or the handle itself if the handle is an
     * instance of {@link ElementHandle}.
     */
    asElement(): CdpElementHandle<Node> | null;
    dispose(): Promise<void>;
    toString(): string;
    get id(): string | undefined;
    remoteObject(): Protocol.Runtime.RemoteObject;
}
//# sourceMappingURL=JSHandle.d.ts.map
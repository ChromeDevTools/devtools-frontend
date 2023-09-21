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
import { type HTTPResponse } from '../api/HTTPResponse.js';
import { type TimeoutError } from '../common/Errors.js';
import { type CdpFrame } from './Frame.js';
import { type NetworkManager } from './NetworkManager.js';
/**
 * @public
 */
export type PuppeteerLifeCycleEvent = 
/**
 * Waits for the 'load' event.
 */
'load'
/**
 * Waits for the 'DOMContentLoaded' event.
 */
 | 'domcontentloaded'
/**
 * Waits till there are no more than 0 network connections for at least `500`
 * ms.
 */
 | 'networkidle0'
/**
 * Waits till there are no more than 2 network connections for at least `500`
 * ms.
 */
 | 'networkidle2';
/**
 * @public
 */
export type ProtocolLifeCycleEvent = 'load' | 'DOMContentLoaded' | 'networkIdle' | 'networkAlmostIdle';
/**
 * @internal
 */
export declare class LifecycleWatcher {
    #private;
    constructor(networkManager: NetworkManager, frame: CdpFrame, waitUntil: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[], timeout: number);
    navigationResponse(): Promise<HTTPResponse | null>;
    sameDocumentNavigationPromise(): Promise<Error | undefined>;
    newDocumentNavigationPromise(): Promise<Error | undefined>;
    lifecyclePromise(): Promise<void>;
    terminationPromise(): Promise<Error | TimeoutError | undefined>;
    dispose(): void;
}
//# sourceMappingURL=LifecycleWatcher.d.ts.map
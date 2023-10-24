/**
 * Copyright 2017 Google Inc. All rights reserved.
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
import type { Protocol } from 'devtools-protocol';
import type { CDPSession } from '../api/CDPSession.js';
import { Frame } from '../api/Frame.js';
import type { HTTPResponse } from '../api/HTTPResponse.js';
import type { WaitTimeoutOptions } from '../api/Page.js';
import { disposeSymbol } from '../util/disposable.js';
import type { DeviceRequestPrompt } from './DeviceRequestPrompt.js';
import type { FrameManager } from './FrameManager.js';
import { IsolatedWorld } from './IsolatedWorld.js';
import { type PuppeteerLifeCycleEvent } from './LifecycleWatcher.js';
import type { CdpPage } from './Page.js';
/**
 * @internal
 */
export declare class CdpFrame extends Frame {
    #private;
    _frameManager: FrameManager;
    _id: string;
    _loaderId: string;
    _lifecycleEvents: Set<string>;
    _parentId?: string;
    constructor(frameManager: FrameManager, frameId: string, parentFrameId: string | undefined, client: CDPSession);
    /**
     * This is used internally in DevTools.
     *
     * @internal
     */
    _client(): CDPSession;
    /**
     * Updates the frame ID with the new ID. This happens when the main frame is
     * replaced by a different frame.
     */
    updateId(id: string): void;
    updateClient(client: CDPSession, keepWorlds?: boolean): void;
    page(): CdpPage;
    isOOPFrame(): boolean;
    goto(url: string, options?: {
        referer?: string;
        referrerPolicy?: string;
        timeout?: number;
        waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
    }): Promise<HTTPResponse | null>;
    waitForNavigation(options?: {
        timeout?: number;
        waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
    }): Promise<HTTPResponse | null>;
    get client(): CDPSession;
    mainRealm(): IsolatedWorld;
    isolatedRealm(): IsolatedWorld;
    setContent(html: string, options?: {
        timeout?: number;
        waitUntil?: PuppeteerLifeCycleEvent | PuppeteerLifeCycleEvent[];
    }): Promise<void>;
    url(): string;
    parentFrame(): CdpFrame | null;
    childFrames(): CdpFrame[];
    waitForDevicePrompt(options?: WaitTimeoutOptions): Promise<DeviceRequestPrompt>;
    _navigated(framePayload: Protocol.Page.Frame): void;
    _navigatedWithinDocument(url: string): void;
    _onLifecycleEvent(loaderId: string, name: string): void;
    _onLoadingStopped(): void;
    _onLoadingStarted(): void;
    get detached(): boolean;
    [disposeSymbol](): void;
}
//# sourceMappingURL=Frame.d.ts.map
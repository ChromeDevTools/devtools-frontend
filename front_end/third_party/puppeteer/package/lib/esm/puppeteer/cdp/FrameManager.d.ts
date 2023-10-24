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
import { type CDPSession } from '../api/CDPSession.js';
import { EventEmitter } from '../common/EventEmitter.js';
import type { TimeoutSettings } from '../common/TimeoutSettings.js';
import { CdpCDPSession } from './CDPSession.js';
import { DeviceRequestPromptManager } from './DeviceRequestPrompt.js';
import { ExecutionContext } from './ExecutionContext.js';
import { CdpFrame } from './Frame.js';
import type { FrameManagerEvents } from './FrameManagerEvents.js';
import { FrameTree } from './FrameTree.js';
import { NetworkManager } from './NetworkManager.js';
import type { CdpPage } from './Page.js';
import type { CdpTarget } from './Target.js';
/**
 * A frame manager manages the frames for a given {@link Page | page}.
 *
 * @internal
 */
export declare class FrameManager extends EventEmitter<FrameManagerEvents> {
    #private;
    _frameTree: FrameTree<CdpFrame>;
    get timeoutSettings(): TimeoutSettings;
    get networkManager(): NetworkManager;
    get client(): CDPSession;
    constructor(client: CDPSession, page: CdpPage, ignoreHTTPSErrors: boolean, timeoutSettings: TimeoutSettings);
    /**
     * When the main frame is replaced by another main frame,
     * we maintain the main frame object identity while updating
     * its frame tree and ID.
     */
    swapFrameTree(client: CDPSession): Promise<void>;
    registerSpeculativeSession(client: CdpCDPSession): Promise<void>;
    private setupEventListeners;
    initialize(client: CDPSession): Promise<void>;
    executionContextById(contextId: number, session?: CDPSession): ExecutionContext;
    getExecutionContextById(contextId: number, session?: CDPSession): ExecutionContext | undefined;
    page(): CdpPage;
    mainFrame(): CdpFrame;
    frames(): CdpFrame[];
    frame(frameId: string): CdpFrame | null;
    onAttachedToTarget(target: CdpTarget): void;
    _deviceRequestPromptManager(client: CDPSession): DeviceRequestPromptManager;
}
//# sourceMappingURL=FrameManager.d.ts.map
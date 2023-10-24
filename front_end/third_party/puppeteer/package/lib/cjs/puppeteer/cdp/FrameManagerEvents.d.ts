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
import type { EventType } from '../common/EventEmitter.js';
import type { CdpFrame } from './Frame.js';
/**
 * We use symbols to prevent external parties listening to these events.
 * They are internal to Puppeteer.
 *
 * @internal
 */
export declare namespace FrameManagerEvent {
    const FrameAttached: unique symbol;
    const FrameNavigated: unique symbol;
    const FrameDetached: unique symbol;
    const FrameSwapped: unique symbol;
    const LifecycleEvent: unique symbol;
    const FrameNavigatedWithinDocument: unique symbol;
}
/**
 * @internal
 */
export interface FrameManagerEvents extends Record<EventType, unknown> {
    [FrameManagerEvent.FrameAttached]: CdpFrame;
    [FrameManagerEvent.FrameNavigated]: CdpFrame;
    [FrameManagerEvent.FrameDetached]: CdpFrame;
    [FrameManagerEvent.FrameSwapped]: CdpFrame;
    [FrameManagerEvent.LifecycleEvent]: CdpFrame;
    [FrameManagerEvent.FrameNavigatedWithinDocument]: CdpFrame;
}
//# sourceMappingURL=FrameManagerEvents.d.ts.map
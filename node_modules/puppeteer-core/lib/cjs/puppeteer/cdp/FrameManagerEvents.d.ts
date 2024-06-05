/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
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
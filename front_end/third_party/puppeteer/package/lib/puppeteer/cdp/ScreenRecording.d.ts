/**
 * @license
 * Copyright 2026 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { RecordOptions } from '../api/Page.js';
import { ScreenRecording } from '../api/ScreenRecording.js';
import { type Logger } from '../common/Debug.js';
import type { CdpPage } from './Page.js';
/**
 * @internal
 */
export declare class CdpScreenRecording extends ScreenRecording {
    #private;
    protected page: CdpPage;
    /**
     * @internal
     */
    constructor(page: CdpPage, options: RecordOptions | undefined, logger: Logger);
    /**
     * @internal
     */
    _start(): Promise<void>;
    /**
     * Stops the screen recording.
     *
     * @public
     */
    stop(): Promise<void>;
}
//# sourceMappingURL=ScreenRecording.d.ts.map
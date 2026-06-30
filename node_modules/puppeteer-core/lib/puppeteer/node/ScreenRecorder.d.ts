/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { PassThrough } from 'node:stream';
import type { BoundingBox } from '../api/ElementHandle.js';
import type { Page, VideoFormat } from '../api/Page.js';
import { asyncDisposeSymbol } from '../util/disposable.js';
/**
 * Computes how many encoder frames to emit for a captured frame that spans
 * `[previousTimestamp, timestamp]`, so that the cumulative number of emitted
 * frames tracks a constant-`fps` grid anchored at `startTimestamp`.
 *
 * Counting each interval independently with
 * `Math.round(fps * (timestamp - previousTimestamp))` is wrong when frames are
 * captured faster than `fps`: every sub-`1/fps` interval still rounds up to a
 * whole frame, so the emitted frame count grows with the capture rate instead
 * of staying at `fps * duration`, which stretches playback (and, for very high
 * capture rates, the per-interval value rounds down to 0 and frames are
 * dropped). Differencing the rounded cumulative position keeps the total at
 * `Math.round(fps * (lastTimestamp - startTimestamp))`, independent of the
 * capture rate.
 *
 * Timestamps are in seconds (CDP `Page.screencastFrame` metadata timestamps).
 *
 * @internal
 */
export declare function countFrames(startTimestamp: number, previousTimestamp: number, timestamp: number, fps: number): number;
/**
 * @internal
 */
export interface ScreenRecorderOptions {
    ffmpegPath?: string;
    speed?: number;
    crop?: BoundingBox;
    format?: VideoFormat;
    fps?: number;
    loop?: number;
    delay?: number;
    quality?: number;
    colors?: number;
    scale?: number;
    path?: `${string}.${VideoFormat}`;
    overwrite?: boolean;
}
/**
 * @public
 */
export declare class ScreenRecorder extends PassThrough {
    #private;
    /**
     * @internal
     */
    constructor(page: Page, width: number, height: number, { ffmpegPath, speed, scale, crop, format, fps, loop, delay, quality, colors, path, overwrite, }?: ScreenRecorderOptions);
    /**
     * Stops the recorder.
     *
     * @public
     */
    stop(): Promise<void>;
    /**
     * @internal
     */
    [asyncDisposeSymbol](): Promise<void>;
}
//# sourceMappingURL=ScreenRecorder.d.ts.map
/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { PassThrough } from 'node:stream';
import type { BoundingBox } from '../api/ElementHandle.js';
import type { Page, FileFormat } from '../api/Page.js';
import { asyncDisposeSymbol } from '../util/disposable.js';
/**
 * @internal
 */
export interface ScreenRecorderOptions {
    speed?: number;
    crop?: BoundingBox;
    format?: FileFormat;
    fps?: number;
    loop?: number;
    delay?: number;
    quality?: number;
    colors?: number;
    scale?: number;
    path?: string;
}
/**
 * @public
 */
export declare class ScreenRecorder extends PassThrough {
    #private;
    /**
     * @internal
     */
    constructor(page: Page, width: number, height: number, { speed, scale, crop, format, fps, loop, delay, quality, colors, path, }?: ScreenRecorderOptions);
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
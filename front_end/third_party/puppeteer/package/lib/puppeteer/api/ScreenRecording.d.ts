/**
 * @license
 * Copyright 2026 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Logger } from '../common/Debug.js';
import { asyncDisposeSymbol } from '../util/disposable.js';
import type { Page, RecordOptions } from './Page.js';
/**
 * @public
 */
export interface WritableDestination {
    write(chunk: Uint8Array): boolean;
    end(): unknown;
    writableFinished?: boolean;
    closed?: boolean;
    destroyed?: boolean;
    once?(event: string, cb: (arg?: unknown) => void): unknown;
}
/**
 * @public
 */
export declare abstract class ScreenRecording extends ReadableStream<Uint8Array> {
    /**
     * @internal
     */
    protected page: Page;
    /**
     * @internal
     */
    protected options: RecordOptions;
    /**
     * @internal
     */
    protected logger: Logger;
    /**
     * @internal
     */
    protected controller: ReadableStreamDefaultController<Uint8Array>;
    /**
     * @internal
     */
    protected destinations: Set<WritableDestination>;
    /**
     * @internal
     */
    protected stopped: boolean;
    /**
     * @internal
     */
    constructor(page: Page, options: RecordOptions | undefined, logger: Logger);
    /**
     * @internal
     */
    abstract _start(): Promise<void>;
    /**
     * Pipes the recorded stream to a destination stream.
     *
     * @public
     */
    pipe<T extends WritableStream<Uint8Array>>(destination: T): Promise<void>;
    pipe<T extends WritableDestination>(destination: T): T;
    /**
     * Stops the screen recording.
     *
     * @public
     */
    abstract stop(): Promise<void>;
    /**
     * @internal
     */
    protected closeDestinations(): Promise<void>;
    [asyncDisposeSymbol](): Promise<void>;
}
//# sourceMappingURL=ScreenRecording.d.ts.map
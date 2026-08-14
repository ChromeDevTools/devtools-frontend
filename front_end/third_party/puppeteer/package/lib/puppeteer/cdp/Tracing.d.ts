/**
 * @license
 * Copyright 2017 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { CDPSession } from '../api/CDPSession.js';
import type { Logger } from '../common/Debug.js';
/**
 * @public
 */
export interface TracingOptions {
    /**
     * The file path to write the trace to.
     * If no path is specified, the trace will not be written to disk, but can
     * still be retrieved as a `Uint8Array` from `tracing.stop()`.
     */
    path?: string;
    /**
     * Whether to capture screenshots in the trace.
     *
     * @defaultValue `false`
     */
    screenshots?: boolean;
    /**
     * The tracing categories to include/exclude.
     *
     * To exclude a category, prefix it with `-` (e.g., `-toplevel`).
     *
     * @defaultValue Default categories listed in the implementation.
     */
    categories?: string[];
    /**
     * Size of the trace buffer in kilobytes.
     * If not specified or zero is passed, the default value of 200 MB
     * (200,000 KB) is used by Chromium.
     */
    bufferSize?: number;
}
/**
 * The Tracing class exposes the tracing audit interface.
 * @remarks
 * You can use `tracing.start` and `tracing.stop` to create a trace file
 * which can be opened in Chrome DevTools or {@link https://chromedevtools.github.io/timeline-viewer/ | timeline viewer}.
 *
 * @example
 *
 * ```ts
 * await page.tracing.start({path: 'trace.json'});
 * await page.goto('https://www.google.com');
 * await page.tracing.stop();
 * ```
 *
 * @public
 */
export declare class Tracing {
    #private;
    /**
     * @internal
     */
    constructor(client: CDPSession, logger: Logger);
    /**
     * @internal
     */
    updateClient(client: CDPSession): void;
    /**
     * Starts a trace for the current page.
     * @remarks
     * Only one trace can be active at a time per browser.
     *
     * @param options - Optional `TracingOptions`.
     */
    start(options?: TracingOptions): Promise<void>;
    /**
     * Stops a trace started with the `start` method.
     * @returns Promise which resolves to buffer with trace data.
     */
    stop(): Promise<Uint8Array | undefined>;
}
//# sourceMappingURL=Tracing.d.ts.map
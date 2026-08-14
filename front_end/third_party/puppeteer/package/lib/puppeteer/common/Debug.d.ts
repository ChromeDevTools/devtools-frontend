/**
 * @license
 * Copyright 2020 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
declare global {
    const __PUPPETEER_DEBUG: string;
}
/**
 * @public
 * @experimental
 */
export declare const DEBUG_PREFIXES: {
    readonly cdpSend: "puppeteer:protocol:SEND ►";
    readonly cdpReceive: "puppeteer:protocol:RECV ◀";
    readonly bidiSend: "puppeteer:webDriverBiDi:SEND ►";
    readonly bidiReceive: "puppeteer:webDriverBiDi:RECV ◀";
    readonly error: "puppeteer:error";
    readonly ffmpeg: "puppeteer:ffmpeg";
};
/**
 * @public
 * @experimental
 */
export type DebugPrefix = (typeof DEBUG_PREFIXES)[keyof typeof DEBUG_PREFIXES];
/**
 * A function called by Puppeteer to output debug messages.
 *
 * @param args - Arbitrary values to log for a debug event.
 *
 * @public
 * @experimental
 */
export type LoggerFunction = (...args: unknown[]) => void;
/**
 * A logger factory function that receives a debug channel prefix and returns
 * a {@link LoggerFunction} to emit logs for that channel, or `undefined` if
 * logging is disabled for that channel.
 *
 * @example
 *
 * ```ts
 * const customLogger: Logger = (prefix: string) => {
 *   if (prefix.includes('protocol')) {
 *     return (...args: unknown[]) =>
 *       console.log(`[DEBUG: ${prefix}]`, ...args);
 *   }
 *   return undefined;
 * };
 * ```
 *
 * @param prefix - A debug channel prefix, one of {@link DebugPrefix}.
 * @returns A {@link LoggerFunction} to log messages for the channel,
 * or `undefined` if logging is disabled.
 *
 * @public
 * @experimental
 */
export type Logger = (prefix: string) => LoggerFunction | undefined;
/**
 * A debug function that can be used in any environment.
 *
 * @remarks
 * If used in Node, it falls back to Node's built-in
 * {@link https://nodejs.org/api/util.html#utildebuglogsection-callback | util.debuglog}. In the browser it
 * uses `console.log`.
 *
 * In Node, use the `NODE_DEBUG` environment variable to control logging:
 *
 * ```
 * NODE_DEBUG=* // logs all channels
 * NODE_DEBUG=foo // logs the `foo` channel
 * NODE_DEBUG=foo* // logs any channels starting with `foo`
 * ```
 *
 * In the browser, set `window.__PUPPETEER_DEBUG` to a string:
 *
 * ```
 * window.__PUPPETEER_DEBUG='*'; // logs all channels
 * window.__PUPPETEER_DEBUG='foo'; // logs the `foo` channel
 * window.__PUPPETEER_DEBUG='foo*'; // logs any channels starting with `foo`
 * ```
 *
 * @example
 *
 * ```
 * const log = debug(DEBUG_PREFIXES.error);
 *
 * log('new page created')
 * // logs "Page: new page created"
 * ```
 *
 * @param prefix - this will be prefixed to each log.
 * @returns a function that can be called to log to that debug channel.
 *
 * @internal
 */
export declare const debug: Logger;
/**
 * @internal
 */
export declare function setLogCapture(value: boolean): void;
/**
 * @internal
 */
export declare function getCapturedLogs(): string[];
//# sourceMappingURL=Debug.d.ts.map
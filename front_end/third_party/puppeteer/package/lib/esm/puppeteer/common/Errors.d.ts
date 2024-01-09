/**
 * @license
 * Copyright 2018 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @deprecated Do not use.
 *
 * @public
 */
export declare class CustomError extends Error {
    /**
     * @internal
     */
    constructor(message?: string);
    /**
     * @internal
     */
    get [Symbol.toStringTag](): string;
}
/**
 * TimeoutError is emitted whenever certain operations are terminated due to
 * timeout.
 *
 * @remarks
 * Example operations are {@link Page.waitForSelector | page.waitForSelector} or
 * {@link PuppeteerNode.launch | puppeteer.launch}.
 *
 * @public
 */
export declare class TimeoutError extends CustomError {
}
/**
 * ProtocolError is emitted whenever there is an error from the protocol.
 *
 * @public
 */
export declare class ProtocolError extends CustomError {
    #private;
    set code(code: number | undefined);
    /**
     * @readonly
     * @public
     */
    get code(): number | undefined;
    set originalMessage(originalMessage: string);
    /**
     * @readonly
     * @public
     */
    get originalMessage(): string;
}
/**
 * Puppeteer will throw this error if a method is not
 * supported by the currently used protocol
 *
 * @public
 */
export declare class UnsupportedOperation extends CustomError {
}
/**
 * @internal
 */
export declare class TargetCloseError extends ProtocolError {
}
/**
 * @deprecated Do not use.
 *
 * @public
 */
export interface PuppeteerErrors {
    TimeoutError: typeof TimeoutError;
    ProtocolError: typeof ProtocolError;
}
/**
 * @deprecated Import error classes directly.
 *
 * Puppeteer methods might throw errors if they are unable to fulfill a request.
 * For example, `page.waitForSelector(selector[, options])` might fail if the
 * selector doesn't match any nodes during the given timeframe.
 *
 * For certain types of errors Puppeteer uses specific error classes. These
 * classes are available via `puppeteer.errors`.
 *
 * @example
 * An example of handling a timeout error:
 *
 * ```ts
 * try {
 *   await page.waitForSelector('.foo');
 * } catch (e) {
 *   if (e instanceof TimeoutError) {
 *     // Do something if this is a timeout.
 *   }
 * }
 * ```
 *
 * @public
 */
export declare const errors: PuppeteerErrors;
//# sourceMappingURL=Errors.d.ts.map
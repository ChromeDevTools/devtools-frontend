/**
 * @license
 * Copyright 2026 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * A protocol-agnostic description of an uncaught exception thrown in a page
 * or worker. Dispatched via the `exception` event on {@link Page} and
 * {@link WebWorker}.
 *
 * @remarks
 * Unlike the deprecated `pageerror` event, `RemoteException` does not
 * reconstruct a Node.js `Error`. When the protocol supports it (CDP), it
 * exposes the live remote exception value through {@link RemoteException.handle}.
 *
 * @example
 *
 * ```ts
 * page.on('exception', exception => {
 *   console.log(exception.name(), exception.text());
 *   console.log(exception.location());
 * });
 * ```
 *
 * @public
 */
export class RemoteException {
    #text;
    #name;
    #stackTrace;
    #location;
    #handle;
    #rawExceptionDetails;
    /**
     * @internal
     */
    constructor(options) {
        this.#text = options.text;
        this.#name = options.name;
        this.#stackTrace = options.stackTrace;
        this.#location = options.stackTrace[0] ?? options.location ?? {};
        this.#handle = options.handle;
        this.#rawExceptionDetails = options.rawExceptionDetails;
    }
    /**
     * The text of the exception as rendered by the browser, for example
     * `Error: boom` or
     * `TypeError: Cannot read properties of undefined (reading 'foo')`.
     *
     * @remarks
     * For errors this is `${name}: ${message}` (or just the name if the
     * message is empty), without the stack. For other thrown values it is
     * their description, for example `Object` for a plain object or the
     * string itself for a thrown string.
     */
    text() {
        return this.#text;
    }
    /**
     * The name of the exception, for example `Error`, `TypeError`,
     * `SyntaxError` or `AbortError`.
     *
     * @remarks
     * This is the `name` of the thrown error as rendered by the browser, which
     * can differ from its constructor (for example `AbortError` for a
     * `DOMException`).
     *
     * Empty string if the thrown value is not an error, for example a
     * primitive, a plain object or a symbol.
     *
     * Always `null` with WebDriver BiDi, which does not report the name of the
     * exception.
     */
    name() {
        return this.#name;
    }
    /**
     * The call frames on the stack at the time the exception was thrown,
     * innermost first.
     *
     * @remarks
     * Empty for compilation and syntax errors.
     */
    stackTrace() {
        return this.#stackTrace;
    }
    /**
     * The primary location where the exception occurred.
     *
     * @remarks
     * For runtime errors this is `stackTrace()[0]`. For compilation and syntax
     * errors (where `stackTrace()` is empty), it falls back to the top-level
     * coordinates reported for the exception.
     */
    location() {
        return this.#location;
    }
    /**
     * The live remote exception value, if available.
     *
     * @remarks
     * Only available with CDP, when the browser reports a reference to the
     * thrown value (objects and symbols) and Puppeteer can bind it to the
     * worker, the main world of a frame or Puppeteer's own isolated world.
     *
     * It is `undefined`:
     *
     * - for thrown primitives other than symbols;
     *
     * - for exceptions thrown in other isolated worlds, for example ones
     *   created by extensions or via CDP;
     *
     * - for exceptions thrown by code that Puppeteer injected, for example from
     *   a callback scheduled inside {@link Page.evaluate}, because the browser
     *   does not report a remote exception object for them;
     *
     * - always with WebDriver BiDi.
     *
     * The handle is **disposed automatically right after the `exception` event
     * has been dispatched** so that the browser can release the exception. To
     * keep using it beyond the synchronous part of your listener, call
     * {@link JSHandle.move} synchronously inside the listener and dispose of
     * the handle yourself once you are done with it:
     *
     * ```ts
     * page.on('exception', async exception => {
     *   // Must be called before the first `await`.
     *   const handle = exception.handle()?.move();
     *   if (!handle) {
     *     return;
     *   }
     *   try {
     *     const code = await handle.evaluate(error => {
     *       return (error as {code?: string}).code;
     *     });
     *     console.log(code);
     *   } finally {
     *     await handle.dispose();
     *   }
     * });
     * ```
     *
     * Using the handle after an `await` without calling `move()` first will
     * throw because the handle has already been disposed.
     *
     * The handle is shared by all listeners of the event: calling `move()`
     * returns the same `JSHandle` instance in every listener, and disposing it
     * invalidates it for all of them. If more than one listener needs the handle
     * after the event, have only one of them call `move()` and dispose of it.
     */
    handle() {
        return this.#handle;
    }
    /**
     * The raw CDP exception details. `undefined` with WebDriver BiDi.
     *
     * @internal
     */
    _rawExceptionDetails() {
        return this.#rawExceptionDetails;
    }
}
//# sourceMappingURL=RemoteException.js.map
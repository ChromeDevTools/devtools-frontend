/**
 * @license
 * Copyright 2023 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type * as Bidi from 'webdriver-bidi-protocol';
import type { Frame } from '../api/Frame.js';
import type { WebWorker } from '../api/WebWorker.js';
import { ConsoleMessage } from '../common/ConsoleMessage.js';
import type { ConsoleMessageLocation, ConsoleMessageType } from '../common/ConsoleMessage.js';
import { RemoteException } from '../common/RemoteException.js';
import type { BidiElementHandle } from './bidi.js';
import { BidiJSHandle } from './JSHandle.js';
/**
 * @internal
 *
 * TODO: Remove this and map CDP the correct method.
 * Requires breaking change.
 */
export declare function convertConsoleMessageLevel(method: string): ConsoleMessageType;
/**
 * @internal
 */
export declare function getStackTraceLocations(stackTrace?: Bidi.Script.StackTrace): ConsoleMessageLocation[];
/**
 * @internal
 */
export declare function getConsoleMessage(entry: Bidi.Log.ConsoleLogEntry, args: Array<BidiJSHandle<unknown> | BidiElementHandle<Node>>, frame?: Frame, targetId?: string, worker?: WebWorker): ConsoleMessage;
/**
 * @internal
 */
export declare function isConsoleLogEntry(event: Bidi.Log.Entry): event is Bidi.Log.ConsoleLogEntry;
/**
 * @internal
 */
export declare function isJavaScriptLogEntry(event: Bidi.Log.Entry): event is Bidi.Log.JavascriptLogEntry;
/**
 * Creates the `Error` dispatched by the deprecated `pageerror` event from a
 * WebDriver BiDi JavaScript log entry.
 *
 * @internal
 */
export declare function createPageErrorFromLogEntry(entry: Bidi.Log.JavascriptLogEntry): Error;
/**
 * Creates a {@link RemoteException} from a WebDriver BiDi JavaScript log entry.
 *
 * @remarks
 * WebDriver BiDi does not expose the exception name nor a remote reference to
 * the thrown value, so `name()` is `null` and `handle()` is `undefined`.
 *
 * @internal
 */
export declare function createRemoteExceptionFromLogEntry(entry: Bidi.Log.JavascriptLogEntry): RemoteException;
/**
 * @internal
 */
export declare function createEvaluationError(details: Bidi.Script.ExceptionDetails): unknown;
/**
 * @internal
 */
export declare function rewriteNavigationError(message: string, ms: number): (error: unknown) => never;
/**
 * @internal
 */
export declare function rewriteEvaluationError(error: unknown): never;
//# sourceMappingURL=util.d.ts.map
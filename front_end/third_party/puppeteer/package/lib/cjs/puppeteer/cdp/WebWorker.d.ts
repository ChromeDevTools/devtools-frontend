/**
 * @license
 * Copyright 2018 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Protocol } from 'devtools-protocol';
import type { CDPSession } from '../api/CDPSession.js';
import type { Realm } from '../api/Realm.js';
import { WebWorker } from '../api/WebWorker.js';
import type { ConsoleMessageType } from '../common/ConsoleMessage.js';
import { CdpJSHandle } from './JSHandle.js';
/**
 * @internal
 */
export type ConsoleAPICalledCallback = (eventType: ConsoleMessageType, handles: CdpJSHandle[], trace?: Protocol.Runtime.StackTrace) => void;
/**
 * @internal
 */
export type ExceptionThrownCallback = (event: Protocol.Runtime.ExceptionThrownEvent) => void;
/**
 * @internal
 */
export declare class CdpWebWorker extends WebWorker {
    #private;
    constructor(client: CDPSession, url: string, consoleAPICalled: ConsoleAPICalledCallback, exceptionThrown: ExceptionThrownCallback);
    mainRealm(): Realm;
    get client(): CDPSession;
}
//# sourceMappingURL=WebWorker.d.ts.map
/**
 * @license
 * Copyright 2018 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Protocol } from 'devtools-protocol';
import { type CDPSession } from '../api/CDPSession.js';
import type { Realm } from '../api/Realm.js';
import { TargetType } from '../api/Target.js';
import { WebWorker, type WebWorkerEvents } from '../api/WebWorker.js';
import { EventEmitter } from '../common/EventEmitter.js';
import type { EvaluateFunc, HandleFor } from '../index-browser.js';
import type { NetworkManager } from './NetworkManager.js';
/**
 * @internal
 */
export type ExceptionThrownCallback = (event: Protocol.Runtime.ExceptionThrownEvent) => void;
/**
 * @internal
 */
export declare class CdpWebWorker extends WebWorker {
    #private;
    get internalEmitter(): EventEmitter<WebWorkerEvents>;
    constructor(client: CDPSession, url: string, targetId: string, targetType: TargetType, exceptionThrown: ExceptionThrownCallback, networkManager?: NetworkManager);
    mainRealm(): Realm;
    get client(): CDPSession;
    close(): Promise<void>;
    evaluate<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(func: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    evaluateHandle<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(func: Func | string, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
}
//# sourceMappingURL=WebWorker.d.ts.map
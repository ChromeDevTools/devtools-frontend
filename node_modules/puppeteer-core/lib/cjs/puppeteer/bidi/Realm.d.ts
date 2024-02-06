/**
 * @license
 * Copyright 2024 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as Bidi from 'chromium-bidi/lib/cjs/protocol/protocol.js';
import { EventEmitter, type EventType } from '../common/EventEmitter.js';
import type { EvaluateFunc, HandleFor } from '../common/types.js';
import type PuppeteerUtil from '../injected/injected.js';
import { disposeSymbol } from '../util/disposable.js';
import type { BidiConnection } from './Connection.js';
import { BidiElementHandle } from './ElementHandle.js';
import { BidiJSHandle } from './JSHandle.js';
import type { Sandbox } from './Sandbox.js';
/**
 * @internal
 */
export declare class BidiRealm extends EventEmitter<Record<EventType, any>> {
    #private;
    readonly connection: BidiConnection;
    constructor(connection: BidiConnection);
    get target(): Bidi.Script.Target;
    handleRealmDestroyed: (params: Bidi.Script.RealmDestroyed['params']) => Promise<void>;
    handleRealmCreated: (params: Bidi.Script.RealmCreated['params']) => void;
    setSandbox(sandbox: Sandbox): void;
    protected internalPuppeteerUtil?: Promise<BidiJSHandle<PuppeteerUtil>>;
    get puppeteerUtil(): Promise<BidiJSHandle<PuppeteerUtil>>;
    evaluateHandle<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<HandleFor<Awaited<ReturnType<Func>>>>;
    evaluate<Params extends unknown[], Func extends EvaluateFunc<Params> = EvaluateFunc<Params>>(pageFunction: Func | string, ...args: Params): Promise<Awaited<ReturnType<Func>>>;
    [disposeSymbol](): void;
}
/**
 * @internal
 */
export declare function createBidiHandle(sandbox: Sandbox, result: Bidi.Script.RemoteValue): BidiJSHandle<unknown> | BidiElementHandle<Node>;
//# sourceMappingURL=Realm.d.ts.map
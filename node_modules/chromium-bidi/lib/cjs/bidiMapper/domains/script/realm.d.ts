/**
 * Copyright 2022 Google LLC.
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Protocol } from 'devtools-protocol';
import { type BrowsingContext, Script } from '../../../protocol/protocol.js';
import type { BrowsingContextStorage } from '../context/browsingContextStorage.js';
import type { IEventManager } from '../events/EventManager.js';
import type { ICdpClient } from '../../../cdp/cdpClient.js';
import { type LoggerFn } from '../../../utils/log.js';
import type { RealmStorage } from './realmStorage.js';
export declare class Realm {
    #private;
    readonly sandbox?: string;
    constructor(realmStorage: RealmStorage, browsingContextStorage: BrowsingContextStorage, realmId: Script.Realm, browsingContextId: BrowsingContext.BrowsingContext, executionContextId: Protocol.Runtime.ExecutionContextId, origin: string, type: Script.RealmType, sandbox: string | undefined, cdpClient: ICdpClient, eventManager: IEventManager, logger?: LoggerFn);
    cdpToBidiValue(cdpValue: Protocol.Runtime.CallFunctionOnResponse | Protocol.Runtime.EvaluateResponse, resultOwnership: Script.ResultOwnership): Script.RemoteValue;
    get realmId(): Script.Realm;
    get navigableId(): string;
    get browsingContextId(): BrowsingContext.BrowsingContext;
    get executionContextId(): Protocol.Runtime.ExecutionContextId;
    get origin(): string;
    get type(): Script.RealmType;
    get cdpClient(): ICdpClient;
    get realmInfo(): Script.RealmInfo;
    evaluate(expression: string, awaitPromise: boolean, resultOwnership: Script.ResultOwnership, serializationOptions: Script.SerializationOptions, userActivation?: boolean): Promise<Script.EvaluateResult>;
    /**
     * Serializes a given CDP object into BiDi, keeping references in the
     * target's `globalThis`.
     */
    serializeCdpObject(cdpRemoteObject: Protocol.Runtime.RemoteObject, resultOwnership: Script.ResultOwnership): Promise<Script.RemoteValue>;
    /**
     * Gets the string representation of an object. This is equivalent to
     * calling `toString()` on the object value.
     */
    stringifyObject(cdpRemoteObject: Protocol.Runtime.RemoteObject): Promise<string>;
    callFunction(functionDeclaration: string, thisLocalValue: Script.LocalValue, argumentsLocalValues: Script.LocalValue[], awaitPromise: boolean, resultOwnership: Script.ResultOwnership, serializationOptions: Script.SerializationOptions, userActivation?: boolean): Promise<Script.EvaluateResult>;
    disown(handle: Script.Handle): Promise<void>;
    dispose(): void;
}

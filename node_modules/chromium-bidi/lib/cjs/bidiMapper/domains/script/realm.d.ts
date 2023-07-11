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
import type { Protocol } from 'devtools-protocol';
import { Script } from '../../../protocol/protocol.js';
import type { CommonDataTypes } from '../../../protocol/protocol.js';
import type { BrowsingContextStorage } from '../context/browsingContextStorage.js';
import type { IEventManager } from '../events/EventManager.js';
import type { ICdpClient } from '../../../cdp/cdpClient.js';
import { type LoggerFn } from '../../../utils/log.js';
import type { RealmStorage } from './realmStorage.js';
export type RealmType = Script.RealmType;
export declare class Realm {
    #private;
    readonly sandbox?: string;
    readonly cdpSessionId: string;
    constructor(realmStorage: RealmStorage, browsingContextStorage: BrowsingContextStorage, realmId: Script.Realm, browsingContextId: CommonDataTypes.BrowsingContext, executionContextId: Protocol.Runtime.ExecutionContextId, origin: string, type: RealmType, sandbox: string | undefined, cdpSessionId: string, cdpClient: ICdpClient, eventManager: IEventManager, logger?: LoggerFn);
    disown(handle: CommonDataTypes.Handle): Promise<void>;
    cdpToBidiValue(cdpValue: Protocol.Runtime.CallFunctionOnResponse | Protocol.Runtime.EvaluateResponse, resultOwnership: Script.ResultOwnership): CommonDataTypes.RemoteValue;
    deepSerializedToBiDi(webDriverValue: Protocol.Runtime.DeepSerializedValue): CommonDataTypes.RemoteValue;
    toBiDi(): Script.RealmInfo;
    get realmId(): Script.Realm;
    get navigableId(): string;
    get browsingContextId(): CommonDataTypes.BrowsingContext;
    get executionContextId(): Protocol.Runtime.ExecutionContextId;
    get origin(): string;
    get type(): RealmType;
    get cdpClient(): ICdpClient;
    callFunction(functionDeclaration: string, _this: Script.ArgumentValue, _arguments: Script.ArgumentValue[], awaitPromise: boolean, resultOwnership: Script.ResultOwnership, serializationOptions: Script.SerializationOptions): Promise<Script.CallFunctionResult>;
    scriptEvaluate(expression: string, awaitPromise: boolean, resultOwnership: Script.ResultOwnership, serializationOptions: Script.SerializationOptions): Promise<Script.EvaluateResult>;
    /**
     * Serializes a given CDP object into BiDi, keeping references in the
     * target's `globalThis`.
     * @param cdpObject CDP remote object to be serialized.
     * @param resultOwnership Indicates desired ResultOwnership.
     */
    serializeCdpObject(cdpObject: Protocol.Runtime.RemoteObject, resultOwnership: Script.ResultOwnership): Promise<CommonDataTypes.RemoteValue>;
    /**
     * Gets the string representation of an object. This is equivalent to
     * calling toString() on the object value.
     * @param cdpObject CDP remote object representing an object.
     * @return string The stringified object.
     */
    stringifyObject(cdpObject: Protocol.Runtime.RemoteObject): Promise<string>;
    delete(): void;
}

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
import { CommonDataTypes, Script } from '../../../protocol/protocol.js';
import { IEventManager } from '../events/EventManager.js';
import { Realm } from './realm.js';
export declare const SHARED_ID_DIVIDER = "_element_";
export declare class ScriptEvaluator {
    #private;
    constructor(eventManager: IEventManager);
    /**
     * Gets the string representation of an object. This is equivalent to
     * calling toString() on the object value.
     * @param cdpObject CDP remote object representing an object.
     * @param realm
     * @return string The stringified object.
     */
    static stringifyObject(cdpObject: Protocol.Runtime.RemoteObject, realm: Realm): Promise<string>;
    /**
     * Serializes a given CDP object into BiDi, keeping references in the
     * target's `globalThis`.
     * @param cdpRemoteObject CDP remote object to be serialized.
     * @param resultOwnership Indicates desired ResultOwnership.
     * @param realm
     */
    serializeCdpObject(cdpRemoteObject: Protocol.Runtime.RemoteObject, resultOwnership: Script.ResultOwnership, realm: Realm): Promise<CommonDataTypes.RemoteValue>;
    scriptEvaluate(realm: Realm, expression: string, awaitPromise: boolean, resultOwnership: Script.ResultOwnership): Promise<Script.ScriptResult>;
    callFunction(realm: Realm, functionDeclaration: string, _this: Script.ArgumentValue, _arguments: Script.ArgumentValue[], awaitPromise: boolean, resultOwnership: Script.ResultOwnership): Promise<Script.ScriptResult>;
}

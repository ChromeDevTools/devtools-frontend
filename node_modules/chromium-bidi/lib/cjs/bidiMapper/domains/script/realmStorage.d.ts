/**
 * Copyright 2023 Google LLC.
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
import { Realm, RealmType } from './realm.js';
declare type RealmFilter = {
    realmId?: Script.Realm;
    browsingContextId?: CommonDataTypes.BrowsingContext;
    navigableId?: string;
    executionContextId?: Protocol.Runtime.ExecutionContextId;
    origin?: string;
    type?: RealmType;
    sandbox?: string;
    cdpSessionId?: string;
};
export declare class RealmStorage {
    #private;
    get knownHandlesToRealm(): Map<string, string>;
    get realmMap(): Map<string, Realm>;
    findRealms(filter: RealmFilter): Realm[];
    findRealm(filter: RealmFilter): Realm | undefined;
    getRealm(filter: RealmFilter): Realm;
    deleteRealms(filter: RealmFilter): void;
}
export {};

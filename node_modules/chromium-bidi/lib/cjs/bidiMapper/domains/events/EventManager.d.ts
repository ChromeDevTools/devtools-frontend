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
import { type CommonDataTypes, type Message, type Session } from '../../../protocol/protocol.js';
import type { BidiServer } from '../../BidiServer.js';
export interface IEventManager {
    registerEvent(event: Message.EventMessage, contextId: CommonDataTypes.BrowsingContext | null): void;
    registerPromiseEvent(event: Promise<Message.EventMessage>, contextId: CommonDataTypes.BrowsingContext | null, eventName: Message.EventNames): void;
    subscribe(events: Session.SubscriptionRequestEvent[], contextIds: (CommonDataTypes.BrowsingContext | null)[], channel: string | null): Promise<void>;
    unsubscribe(events: Session.SubscriptionRequestEvent[], contextIds: (CommonDataTypes.BrowsingContext | null)[], channel: string | null): Promise<void> | void;
    get isNetworkDomainEnabled(): boolean;
}
export declare class EventManager implements IEventManager {
    #private;
    constructor(bidiServer: BidiServer);
    get isNetworkDomainEnabled(): boolean;
    registerEvent(event: Message.EventMessage, contextId: CommonDataTypes.BrowsingContext | null): void;
    registerPromiseEvent(event: Promise<Message.EventMessage>, contextId: CommonDataTypes.BrowsingContext | null, eventName: Message.EventNames): void;
    subscribe(eventNames: Session.SubscriptionRequestEvent[], contextIds: (CommonDataTypes.BrowsingContext | null)[], channel: string | null): Promise<void>;
    unsubscribe(eventNames: Session.SubscriptionRequestEvent[], contextIds: (CommonDataTypes.BrowsingContext | null)[], channel: string | null): void;
}

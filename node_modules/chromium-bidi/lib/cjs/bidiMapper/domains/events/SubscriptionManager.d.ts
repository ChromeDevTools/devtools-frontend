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
import { CommonDataTypes, Session } from '../../../protocol/protocol.js';
import { BrowsingContextStorage } from '../context/browsingContextStorage.js';
/**
 * Returns the cartesian product of the given arrays.
 *
 * Example:
 *   cartesian([1, 2], ['a', 'b']); => [[1, 'a'], [1, 'b'], [2, 'a'], [2, 'b']]
 */
export declare function cartesianProduct(...a: any[][]): any[];
/** Expands "AllEvents" events into atomic events. */
export declare function unrollEvents(events: Session.SubscribeParametersEvent[]): Session.SubscribeParametersEvent[];
export declare class SubscriptionManager {
    #private;
    constructor(browsingContextStorage: BrowsingContextStorage);
    getChannelsSubscribedToEvent(eventMethod: Session.SubscribeParametersEvent, contextId: CommonDataTypes.BrowsingContext | null): (string | null)[];
    subscribe(event: Session.SubscribeParametersEvent, contextId: CommonDataTypes.BrowsingContext | null, channel: string | null): void;
    /**
     * Unsubscribes atomically from all events in the given contexts and channel.
     */
    unsubscribeAll(events: Session.SubscribeParametersEvent[], contextIds: (CommonDataTypes.BrowsingContext | null)[], channel: string | null): void;
    /**
     * Unsubscribes from the event in the given context and channel.
     * Syntactic sugar for "unsubscribeAll".
     */
    unsubscribe(eventName: Session.SubscribeParametersEvent, contextId: CommonDataTypes.BrowsingContext | null, channel: string | null): void;
}

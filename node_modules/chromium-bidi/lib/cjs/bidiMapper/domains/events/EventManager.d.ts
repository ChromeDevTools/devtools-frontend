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
import { ChromiumBidi, type BrowsingContext } from '../../../protocol/protocol.js';
import type { Result } from '../../../utils/result.js';
import type { BidiServer } from '../../BidiServer.js';
export interface IEventManager {
    registerEvent(event: ChromiumBidi.Event, contextId: BrowsingContext.BrowsingContext | null): void;
    registerPromiseEvent(event: Promise<Result<ChromiumBidi.Event>>, contextId: BrowsingContext.BrowsingContext | null, eventName: ChromiumBidi.EventNames): void;
    subscribe(events: ChromiumBidi.EventNames[], contextIds: (BrowsingContext.BrowsingContext | null)[], channel: string | null): Promise<void> | void;
    unsubscribe(events: ChromiumBidi.EventNames[], contextIds: (BrowsingContext.BrowsingContext | null)[], channel: string | null): Promise<void> | void;
}
export declare class EventManager implements IEventManager {
    #private;
    constructor(bidiServer: BidiServer);
    registerEvent(event: ChromiumBidi.Event, contextId: BrowsingContext.BrowsingContext | null): void;
    registerPromiseEvent(event: Promise<Result<ChromiumBidi.Event>>, contextId: BrowsingContext.BrowsingContext | null, eventName: ChromiumBidi.EventNames): void;
    subscribe(eventNames: ChromiumBidi.EventNames[], contextIds: (BrowsingContext.BrowsingContext | null)[], channel: string | null): void;
    unsubscribe(eventNames: ChromiumBidi.EventNames[], contextIds: (BrowsingContext.BrowsingContext | null)[], channel: string | null): void;
}

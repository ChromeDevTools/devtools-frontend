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
import type * as WebDriverBidi from './webdriver-bidi.js';
import type * as Cdp from './cdp.js';
export type EventNames = BrowsingContext.EventNames | Cdp.EventNames | Log.EventNames | Network.EventNames | Script.EventNames;
export declare namespace Script {
    enum EventNames {
        AllScriptEvent = "script",
        MessageEvent = "script.message",
        RealmCreated = "script.realmCreated",
        RealmDestroyed = "script.realmDestroyed"
    }
}
export declare namespace Log {
    enum EventNames {
        AllLogEvent = "log",
        LogEntryAddedEvent = "log.entryAdded"
    }
}
export declare namespace BrowsingContext {
    enum EventNames {
        AllBrowsingContextEvent = "browsingContext",
        ContextCreatedEvent = "browsingContext.contextCreated",
        ContextDestroyedEvent = "browsingContext.contextDestroyed",
        DomContentLoadedEvent = "browsingContext.domContentLoaded",
        FragmentNavigated = "browsingContext.fragmentNavigated",
        LoadEvent = "browsingContext.load",
        NavigationStarted = "browsingContext.navigationStarted",
        UserPromptClosed = "browsingContext.userPromptClosed",
        UserPromptOpened = "browsingContext.userPromptOpened"
    }
}
export declare namespace Network {
    enum EventNames {
        AllNetworkEvent = "network",
        BeforeRequestSentEvent = "network.beforeRequestSent",
        FetchErrorEvent = "network.fetchError",
        ResponseCompletedEvent = "network.responseCompleted",
        ResponseStartedEvent = "network.responseStarted"
    }
}
export type Command = (WebDriverBidi.Command | Cdp.Command) & {
    channel?: WebDriverBidi.Script.Channel;
};
export type CommandResponse = WebDriverBidi.CommandResponse | Cdp.CommandResponse;
export type Event = WebDriverBidi.Event | Cdp.Event;
export type ResultData = WebDriverBidi.ResultData | Cdp.ResultData;
export type Message = (WebDriverBidi.Message | Cdp.Message | {
    launched: true;
}) & {
    channel?: WebDriverBidi.Script.Channel;
};

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
/**
 * @fileoverview Provides TypeScript types for WebDriver BiDi protocol.
 *
 * Note: This file should not have any dependencies because it will be run in the browser.
 * Exception: Type dependencies are fine because they are compiled away.
 */
import type { ProtocolMapping } from 'devtools-protocol/types/protocol-mapping.js';
export interface EventResponse<MethodType, ParamsType> {
    method: MethodType;
    params: ParamsType;
}
export declare type BiDiMethod = 'browsingContext.captureScreenshot' | 'browsingContext.close' | 'browsingContext.create' | 'browsingContext.getTree' | 'browsingContext.navigate' | 'browsingContext.print' | 'cdp.getSession' | 'cdp.sendCommand' | 'cdp.sendMessage' | 'script.addPreloadScript' | 'script.callFunction' | 'script.disown' | 'script.evaluate' | 'script.getRealms' | 'script.removePreloadScript' | 'session.status' | 'session.subscribe' | 'session.unsubscribe';
export declare type EmptyResult = Record<never, never>;
export declare type EmptyResultWithCommandId = {
    id: number;
} | EmptyResult;
export declare namespace Message {
    type OutgoingMessage = CommandResponse | EventMessage | {
        launched: true;
    };
    type RawCommandRequest = {
        id: number;
        method: BiDiMethod;
        params: object;
        channel?: string;
    };
    type CommandRequest = Pick<RawCommandRequest, 'id'> & (BrowsingContext.Command | Script.Command | Session.Command | CDP.Command);
    type CommandResponse = Pick<RawCommandRequest, 'id'> & CommandResponseResult;
    type CommandResponseResult = BrowsingContext.CommandResult | Script.CommandResult | Session.CommandResult | CDP.CommandResult | ErrorResult;
    type EventMessage = BrowsingContext.Event | CDP.Event | Log.Event | Network.Event | Script.Event;
    type EventNames = BrowsingContext.EventNames | CDP.EventNames | Log.EventNames | Network.EventNames | Script.EventNames;
    enum ErrorCode {
        InvalidArgument = "invalid argument",
        InvalidSessionId = "invalid session id",
        NoSuchAlert = "no such alert",
        NoSuchFrame = "no such frame",
        NoSuchHandle = "no such handle",
        NoSuchNode = "no such node",
        NoSuchScript = "no such script",
        SessionNotCreated = "session not created",
        UnknownCommand = "unknown command",
        UnknownError = "unknown error",
        UnsupportedOperation = "unsupported operation"
    }
    type ErrorResult = {
        readonly error: ErrorCode;
        readonly message: string;
        readonly stacktrace?: string;
    };
    class ErrorResponse implements Message.ErrorResult {
        error: Message.ErrorCode;
        message: string;
        stacktrace?: string | undefined;
        constructor(error: Message.ErrorCode, message: string, stacktrace?: string | undefined);
        toErrorResponse(commandId: number): Message.CommandResponse;
    }
    class InvalidArgumentException extends ErrorResponse {
        constructor(message: string, stacktrace?: string);
    }
    class NoSuchHandleException extends ErrorResponse {
        constructor(message: string, stacktrace?: string);
    }
    class InvalidSessionIdException extends ErrorResponse {
        constructor(message: string, stacktrace?: string);
    }
    class NoSuchAlertException extends ErrorResponse {
        constructor(message: string, stacktrace?: string);
    }
    class NoSuchFrameException extends ErrorResponse {
        constructor(message: string);
    }
    class NoSuchNodeException extends ErrorResponse {
        constructor(message: string, stacktrace?: string);
    }
    class NoSuchScriptException extends ErrorResponse {
        constructor(message: string, stacktrace?: string);
    }
    class SessionNotCreatedException extends ErrorResponse {
        constructor(message: string, stacktrace?: string);
    }
    class UnknownCommandException extends ErrorResponse {
        constructor(message: string, stacktrace?: string);
    }
    class UnknownErrorException extends ErrorResponse {
        constructor(message: string, stacktrace?: string);
    }
    class UnsupportedOperationException extends ErrorResponse {
        constructor(message: string, stacktrace?: string);
    }
}
export declare namespace CommonDataTypes {
    type RemoteReference = {
        handle: string;
    };
    type SharedReference = {
        sharedId: string;
    };
    type UndefinedValue = {
        type: 'undefined';
    };
    type NullValue = {
        type: 'null';
    };
    type StringValue = {
        type: 'string';
        value: string;
    };
    type SpecialNumber = 'NaN' | '-0' | 'Infinity' | '-Infinity';
    type NumberValue = {
        type: 'number';
        value: SpecialNumber | number;
    };
    type BooleanValue = {
        type: 'boolean';
        value: boolean;
    };
    type BigIntValue = {
        type: 'bigint';
        value: string;
    };
    type PrimitiveProtocolValue = UndefinedValue | NullValue | StringValue | NumberValue | BooleanValue | BigIntValue;
    type LocalValue = PrimitiveProtocolValue | ArrayLocalValue | DateLocalValue | MapLocalValue | ObjectLocalValue | RegExpLocalValue | SetLocalValue;
    type LocalOrRemoteValue = RemoteReference | LocalValue;
    type ListLocalValue = LocalOrRemoteValue[];
    type ArrayLocalValue = {
        type: 'array';
        value: ListLocalValue;
    };
    type DateLocalValue = {
        type: 'date';
        value: string;
    };
    type MappingLocalValue = [
        string | LocalOrRemoteValue,
        LocalOrRemoteValue
    ][];
    type MapLocalValue = {
        type: 'map';
        value: MappingLocalValue;
    };
    type ObjectLocalValue = {
        type: 'object';
        value: MappingLocalValue;
    };
    type RegExpLocalValue = {
        type: 'regexp';
        value: {
            pattern: string;
            flags?: string;
        };
    };
    type SetLocalValue = {
        type: 'set';
        value: ListLocalValue;
    };
    type RemoteValue = PrimitiveProtocolValue | SymbolRemoteValue | ArrayRemoteValue | ObjectRemoteValue | FunctionRemoteValue | RegExpRemoteValue | DateRemoteValue | MapRemoteValue | SetRemoteValue | WeakMapRemoteValue | WeakSetRemoteValue | IteratorRemoteValue | GeneratorRemoteValue | ProxyRemoteValue | ErrorRemoteValue | PromiseRemoteValue | TypedArrayRemoteValue | ArrayBufferRemoteValue | NodeRemoteValue | WindowProxyRemoteValue;
    type ListRemoteValue = RemoteValue[];
    type MappingRemoteValue = [RemoteValue | string, RemoteValue][];
    type SymbolRemoteValue = RemoteReference & {
        type: 'symbol';
    };
    type ArrayRemoteValue = RemoteReference & {
        type: 'array';
        value?: ListRemoteValue;
    };
    type ObjectRemoteValue = RemoteReference & {
        type: 'object';
        value?: MappingRemoteValue;
    };
    type FunctionRemoteValue = RemoteReference & {
        type: 'function';
    };
    type RegExpRemoteValue = RemoteReference & RegExpLocalValue;
    type DateRemoteValue = RemoteReference & DateLocalValue;
    type MapRemoteValue = RemoteReference & {
        type: 'map';
        value: MappingRemoteValue;
    };
    type SetRemoteValue = RemoteReference & {
        type: 'set';
        value: ListRemoteValue;
    };
    type WeakMapRemoteValue = RemoteReference & {
        type: 'weakmap';
    };
    type WeakSetRemoteValue = RemoteReference & {
        type: 'weakset';
    };
    type IteratorRemoteValue = RemoteReference & {
        type: 'iterator';
    };
    type GeneratorRemoteValue = RemoteReference & {
        type: 'generator';
    };
    type ProxyRemoteValue = RemoteReference & {
        type: 'proxy';
    };
    type ErrorRemoteValue = RemoteReference & {
        type: 'error';
    };
    type PromiseRemoteValue = RemoteReference & {
        type: 'promise';
    };
    type TypedArrayRemoteValue = RemoteReference & {
        type: 'typedarray';
    };
    type ArrayBufferRemoteValue = RemoteReference & {
        type: 'arraybuffer';
    };
    type NodeRemoteValue = RemoteReference & {
        type: 'node';
        value?: NodeProperties;
    };
    type NodeProperties = RemoteReference & {
        nodeType: number;
        nodeValue: string;
        localName?: string;
        namespaceURI?: string;
        childNodeCount: number;
        children?: [NodeRemoteValue];
        attributes?: Record<string, string>;
        shadowRoot?: NodeRemoteValue | null;
    };
    type WindowProxyRemoteValue = RemoteReference & {
        type: 'window';
    };
    type BrowsingContext = string;
}
/** @see https://w3c.github.io/webdriver-bidi/#module-script */
export declare namespace Script {
    type Command = EvaluateCommand | CallFunctionCommand | GetRealmsCommand | DisownCommand | AddPreloadScriptCommand | RemovePreloadScriptCommand;
    type CommandResult = EvaluateResult | CallFunctionResult | GetRealmsResult | DisownResult | AddPreloadScriptResult | RemovePreloadScriptResult;
    type Event = MessageEvent;
    type Realm = string;
    type ScriptResult = ScriptResultSuccess | ScriptResultException;
    type ScriptResultSuccess = {
        type: 'success';
        result: CommonDataTypes.RemoteValue;
        realm: Realm;
    };
    type ScriptResultException = {
        exceptionDetails: ExceptionDetails;
        type: 'exception';
        realm: Realm;
    };
    type ExceptionDetails = {
        columnNumber: number;
        exception: CommonDataTypes.RemoteValue;
        lineNumber: number;
        stackTrace: Script.StackTrace;
        text: string;
    };
    type RealmInfo = WindowRealmInfo | DedicatedWorkerRealmInfo | SharedWorkerRealmInfo | ServiceWorkerRealmInfo | WorkerRealmInfo | PaintWorkletRealmInfo | AudioWorkletRealmInfo | WorkletRealmInfo;
    type BaseRealmInfo = {
        realm: Realm;
        origin: string;
    };
    type WindowRealmInfo = BaseRealmInfo & {
        type: 'window';
        context: CommonDataTypes.BrowsingContext;
        sandbox?: string;
    };
    type DedicatedWorkerRealmInfo = BaseRealmInfo & {
        type: 'dedicated-worker';
    };
    type SharedWorkerRealmInfo = BaseRealmInfo & {
        type: 'shared-worker';
    };
    type ServiceWorkerRealmInfo = BaseRealmInfo & {
        type: 'service-worker';
    };
    type WorkerRealmInfo = BaseRealmInfo & {
        type: 'worker';
    };
    type PaintWorkletRealmInfo = BaseRealmInfo & {
        type: 'paint-worklet';
    };
    type AudioWorkletRealmInfo = BaseRealmInfo & {
        type: 'audio-worklet';
    };
    type WorkletRealmInfo = BaseRealmInfo & {
        type: 'worklet';
    };
    type RealmType = 'window' | 'dedicated-worker' | 'shared-worker' | 'service-worker' | 'worker' | 'paint-worklet' | 'audio-worklet' | 'worklet';
    type GetRealmsParameters = {
        context?: CommonDataTypes.BrowsingContext;
        type?: RealmType;
    };
    type GetRealmsCommand = {
        method: 'script.getRealms';
        params: GetRealmsParameters;
    };
    type GetRealmsResult = {
        result: {
            realms: RealmInfo[];
        };
    };
    type EvaluateCommand = {
        method: 'script.evaluate';
        params: EvaluateParameters;
    };
    type ContextTarget = {
        context: CommonDataTypes.BrowsingContext;
        sandbox?: string;
    };
    type RealmTarget = {
        realm: Realm;
    };
    type Target = RealmTarget | ContextTarget;
    type ResultOwnership = 'root' | 'none';
    type EvaluateParameters = {
        expression: string;
        awaitPromise: boolean;
        target: Target;
        resultOwnership?: ResultOwnership;
    };
    type EvaluateResult = {
        result: ScriptResult;
    };
    type DisownCommand = {
        method: 'script.disown';
        params: EvaluateParameters;
    };
    type DisownParameters = {
        target: Target;
        handles: string[];
    };
    type DisownResult = {
        result: Record<string, unknown>;
    };
    type CallFunctionCommand = {
        method: 'script.callFunction';
        params: CallFunctionParameters;
    };
    type ArgumentValue = CommonDataTypes.RemoteReference | CommonDataTypes.SharedReference | CommonDataTypes.LocalValue | Script.Channel;
    type CallFunctionParameters = {
        functionDeclaration: string;
        awaitPromise: boolean;
        target: Target;
        arguments?: ArgumentValue[];
        this?: ArgumentValue;
        resultOwnership?: ResultOwnership;
    };
    type CallFunctionResult = {
        result: ScriptResult;
    };
    type Source = {
        realm: Realm;
        context?: CommonDataTypes.BrowsingContext;
    };
    type StackTrace = {
        callFrames: StackFrame[];
    };
    type StackFrame = {
        columnNumber: number;
        functionName: string;
        lineNumber: number;
        url: string;
    };
    type PreloadScript = string;
    type AddPreloadScriptCommand = {
        method: 'script.addPreloadScript';
        params: AddPreloadScriptParameters;
    };
    type AddPreloadScriptParameters = {
        expression: string;
        sandbox?: string;
        context?: CommonDataTypes.BrowsingContext;
    };
    type AddPreloadScriptResult = {
        result: {
            script: PreloadScript;
        };
    };
    type RemovePreloadScriptCommand = {
        method: 'script.removePreloadScript';
        params: RemovePreloadScriptParameters;
    };
    type RemovePreloadScriptParameters = {
        script: PreloadScript;
    };
    type RemovePreloadScriptResult = EmptyResultWithCommandId;
    type ChannelId = string;
    type ChannelProperties = {
        channel: ChannelId;
        maxDepth?: number;
        ownership?: ResultOwnership;
    };
    type Channel = {
        type: 'channel';
        value: ChannelProperties;
    };
    type Message = {
        method: 'script.message';
        params: MessageParameters;
    };
    type MessageParameters = {
        channel: ChannelId;
        data: CommonDataTypes.RemoteValue;
        source: Source;
    };
    type MessageEvent = EventResponse<EventNames.MessageEvent, Script.MessageParameters>;
    enum EventNames {
        MessageEvent = "script.message"
    }
    const AllEvents = "script";
}
export declare namespace BrowsingContext {
    type Command = GetTreeCommand | NavigateCommand | CreateCommand | CloseCommand | CaptureScreenshotCommand | PrintCommand;
    type CommandResult = GetTreeResult | NavigateResult | CreateResult | CloseResult | CaptureScreenshotResult | PrintResult;
    type Event = LoadEvent | DomContentLoadedEvent | ContextCreatedEvent | ContextDestroyedEvent;
    type Navigation = string;
    type GetTreeCommand = {
        method: 'browsingContext.getTree';
        params: GetTreeParameters;
    };
    type GetTreeParameters = {
        maxDepth?: number;
        root?: CommonDataTypes.BrowsingContext;
    };
    type GetTreeResult = {
        result: {
            contexts: InfoList;
        };
    };
    type InfoList = Info[];
    type Info = {
        context: CommonDataTypes.BrowsingContext;
        parent?: CommonDataTypes.BrowsingContext | null;
        url: string;
        children: InfoList | null;
    };
    type NavigateCommand = {
        method: 'browsingContext.navigate';
        params: NavigateParameters;
    };
    type ReadinessState = 'none' | 'interactive' | 'complete';
    type NavigateParameters = {
        context: CommonDataTypes.BrowsingContext;
        url: string;
        wait?: ReadinessState;
    };
    type NavigateResult = {
        result: {
            navigation: Navigation | null;
            url: string;
        };
    };
    type CreateCommand = {
        method: 'browsingContext.create';
        params: CreateParameters;
    };
    type CreateParameters = {
        type: 'tab' | 'window';
        referenceContext?: CommonDataTypes.BrowsingContext;
    };
    type CreateResult = {
        result: Info;
    };
    type CloseCommand = {
        method: 'browsingContext.close';
        params: CloseParameters;
    };
    type CloseParameters = {
        context: CommonDataTypes.BrowsingContext;
    };
    type CloseResult = {
        result: Record<string, unknown>;
    };
    type CaptureScreenshotCommand = {
        method: 'browsingContext.captureScreenshot';
        params: CaptureScreenshotParameters;
    };
    type CaptureScreenshotParameters = {
        context: CommonDataTypes.BrowsingContext;
    };
    type CaptureScreenshotResult = {
        result: {
            data: string;
        };
    };
    type PrintCommand = {
        method: 'browsingContext.print';
        params: PrintParameters;
    };
    type PrintParameters = {
        context: CommonDataTypes.BrowsingContext;
        background?: boolean;
        margin?: PrintMarginParameters;
        orientation?: 'portrait' | 'landscape';
        page?: PrintPageParams;
        pageRanges?: (string | number)[];
        scale?: number;
        shrinkToFit?: boolean;
    };
    type PrintMarginParameters = {
        bottom?: number;
        left?: number;
        right?: number;
        top?: number;
    };
    type PrintPageParams = {
        height?: number;
        width?: number;
    };
    type PrintResult = {
        result: {
            data: string;
        };
    };
    type LoadEvent = EventResponse<EventNames.LoadEvent, NavigationInfo>;
    type DomContentLoadedEvent = EventResponse<EventNames.DomContentLoadedEvent, NavigationInfo>;
    type NavigationInfo = {
        context: CommonDataTypes.BrowsingContext;
        navigation: Navigation | null;
        timestamp: number;
        url: string;
    };
    type ContextCreatedEvent = EventResponse<EventNames.ContextCreatedEvent, BrowsingContext.Info>;
    type ContextDestroyedEvent = EventResponse<EventNames.ContextDestroyedEvent, BrowsingContext.Info>;
    enum EventNames {
        LoadEvent = "browsingContext.load",
        DomContentLoadedEvent = "browsingContext.domContentLoaded",
        ContextCreatedEvent = "browsingContext.contextCreated",
        ContextDestroyedEvent = "browsingContext.contextDestroyed"
    }
    const AllEvents = "browsingContext";
}
/** @see https://w3c.github.io/webdriver-bidi/#module-log */
export declare namespace Log {
    type LogEntry = GenericLogEntry | ConsoleLogEntry | JavascriptLogEntry;
    type Event = LogEntryAddedEvent;
    type LogLevel = 'debug' | 'info' | 'warn' | 'error';
    type BaseLogEntry = {
        level: LogLevel;
        source: Script.Source;
        text: string | null;
        timestamp: number;
        stackTrace?: Script.StackTrace;
    };
    type GenericLogEntry = BaseLogEntry & {
        type: string;
    };
    type ConsoleLogEntry = BaseLogEntry & {
        type: 'console';
        method: string;
        args: CommonDataTypes.RemoteValue[];
    };
    type JavascriptLogEntry = BaseLogEntry & {
        type: 'javascript';
    };
    type LogEntryAddedEvent = EventResponse<EventNames.LogEntryAddedEvent, LogEntry>;
    const AllEvents = "log";
    enum EventNames {
        LogEntryAddedEvent = "log.entryAdded"
    }
}
export declare namespace Network {
    export type Event = BeforeRequestSentEvent | ResponseCompletedEvent | FetchErrorEvent;
    export type BeforeRequestSentEvent = EventResponse<EventNames.BeforeRequestSentEvent, BeforeRequestSentParams>;
    export type ResponseCompletedEvent = EventResponse<EventNames.ResponseCompletedEvent, ResponseCompletedParams>;
    export type FetchErrorEvent = EventResponse<EventNames.FetchErrorEvent, FetchErrorParams>;
    type Header = {
        name: string;
        value?: string;
        binaryValue?: number[];
    };
    export type Cookie = {
        name: string;
        value?: string;
        binaryValue?: number[];
        domain: string;
        path: string;
        expires?: number;
        size: number;
        httpOnly: boolean;
        secure: boolean;
        sameSite: 'strict' | 'lax' | 'none';
    };
    type FetchTimingInfo = {
        timeOrigin: number;
        requestTime: number;
        redirectStart: number;
        redirectEnd: number;
        fetchStart: number;
        dnsStart: number;
        dnsEnd: number;
        connectStart: number;
        connectEnd: number;
        tlsStart: number;
        tlsEnd: number;
        requestStart: number;
        responseStart: number;
        responseEnd: number;
    };
    export type RequestData = {
        request: string;
        url: string;
        method: string;
        headers: Header[];
        cookies: Cookie[];
        headersSize: number;
        bodySize: number | null;
        timings: FetchTimingInfo;
    };
    export type BaseEventParams = {
        context: string | null;
        navigation: BrowsingContext.Navigation | null;
        redirectCount: number;
        request: RequestData;
        timestamp: number;
    };
    export type Initiator = {
        type: 'parser' | 'script' | 'preflight' | 'other';
        columnNumber?: number;
        lineNumber?: number;
        stackTrace?: Script.StackTrace;
        request?: Request;
    };
    export type ResponseContent = {
        size: number;
    };
    export type ResponseData = {
        url: string;
        protocol: string;
        status: number;
        statusText: string;
        fromCache: boolean;
        headers: Header[];
        mimeType: string;
        bytesReceived: number;
        headersSize: number | null;
        bodySize: number | null;
        content: ResponseContent;
    };
    export type BeforeRequestSentParams = BaseEventParams & {
        initiator: Initiator;
    };
    export type ResponseCompletedParams = BaseEventParams & {
        response: ResponseData;
    };
    export type FetchErrorParams = BaseEventParams & {
        errorText: string;
    };
    export const AllEvents = "network";
    export enum EventNames {
        BeforeRequestSentEvent = "network.beforeRequestSent",
        ResponseCompletedEvent = "network.responseCompleted",
        FetchErrorEvent = "network.fetchError"
    }
    export {};
}
export declare namespace CDP {
    type Command = SendCommandCommand | GetSessionCommand;
    type CommandResult = SendCommandResult | GetSessionResult;
    type Event = EventReceivedEvent;
    type SendCommandCommand = {
        method: 'cdp.sendCommand';
        params: SendCommandParams;
    };
    type SendCommandParams = {
        cdpMethod: keyof ProtocolMapping.Commands;
        cdpParams: object;
        cdpSession?: any;
    };
    type SendCommandResult = {
        result: unknown;
    };
    type GetSessionCommand = {
        method: 'cdp.getSession';
        params: GetSessionParams;
    };
    type GetSessionParams = {
        context: CommonDataTypes.BrowsingContext;
    };
    type GetSessionResult = {
        result: {
            session: string;
        };
    };
    type EventReceivedEvent = EventResponse<EventNames.EventReceivedEvent, EventReceivedParams>;
    type EventReceivedParams = {
        cdpMethod: string;
        cdpParams: object;
        cdpSession: string;
    };
    const AllEvents = "cdp";
    enum EventNames {
        EventReceivedEvent = "cdp.eventReceived"
    }
}
/** @see https://w3c.github.io/webdriver-bidi/#module-session */
export declare namespace Session {
    type Command = StatusCommand | SubscribeCommand | UnsubscribeCommand;
    type CommandResult = StatusResult | SubscribeResult | UnsubscribeResult;
    type StatusCommand = {
        method: 'session.status';
        params: Record<string, unknown>;
    };
    type StatusResult = {
        result: {
            ready: boolean;
            message: string;
        };
    };
    type SubscribeCommand = {
        method: 'session.subscribe';
        params: SubscribeParameters;
    };
    type SubscribeParametersEvent = Message.EventNames | typeof BrowsingContext.AllEvents | typeof CDP.AllEvents | typeof Log.AllEvents | typeof Network.AllEvents | typeof Script.AllEvents;
    type SubscribeParameters = {
        events: SubscribeParametersEvent[];
        contexts?: CommonDataTypes.BrowsingContext[];
    };
    type SubscribeResult = {
        result: Record<string, unknown>;
    };
    type UnsubscribeCommand = {
        method: 'session.unsubscribe';
        params: SubscribeParameters;
    };
    type UnsubscribeResult = {
        result: Record<string, unknown>;
    };
}

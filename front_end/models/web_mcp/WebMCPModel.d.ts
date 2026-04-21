import type { JSONSchema7 } from 'json-schema';
import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import * as StackTrace from '../stack_trace/stack_trace.js';
export declare const enum Events {
    TOOLS_ADDED = "ToolsAdded",
    TOOLS_REMOVED = "ToolsRemoved",
    TOOL_INVOKED = "ToolInvoked",
    TOOL_RESPONDED = "ToolResponded"
}
export interface ExceptionDetails {
    readonly error: SDK.RemoteObject.RemoteObject;
    readonly description: string;
    readonly frames: StackTrace.ErrorStackParser.ParsedErrorFrame[];
    readonly cause?: ExceptionDetails;
}
export declare class Result {
    #private;
    readonly status: Protocol.WebMCP.InvocationStatus;
    readonly output?: unknown;
    readonly errorText?: string;
    constructor(status: Protocol.WebMCP.InvocationStatus, output: unknown | undefined, errorText: string | undefined, exception: SDK.RemoteObject.RemoteObject | undefined);
    get exceptionDetails(): Promise<ExceptionDetails | undefined> | undefined;
}
export interface Call {
    invocationId: string;
    tool: Tool;
    input: string;
    result?: Result;
}
export declare class Tool {
    #private;
    constructor(tool: Protocol.WebMCP.Tool, target: SDK.Target.Target);
    get stackTrace(): Promise<StackTrace.StackTrace.StackTrace> | undefined;
    get name(): string;
    get description(): string;
    get inputSchema(): JSONSchema7;
    get frame(): SDK.ResourceTreeModel.ResourceTreeFrame | undefined;
    get isDeclarative(): boolean;
    get node(): SDK.DOMModel.DeferredDOMNode | undefined;
    invoke(input: unknown): Promise<Protocol.WebMCP.InvokeToolResponse | undefined>;
}
export interface EventTypes {
    [Events.TOOLS_ADDED]: readonly Tool[];
    [Events.TOOLS_REMOVED]: readonly Tool[];
    [Events.TOOL_INVOKED]: Call;
    [Events.TOOL_RESPONDED]: Call;
}
export declare class WebMCPModel extends SDK.SDKModel.SDKModel<EventTypes> implements ProtocolProxyApi.WebMCPDispatcher {
    #private;
    readonly agent: ProtocolProxyApi.WebMCPApi;
    constructor(target: SDK.Target.Target);
    get tools(): IteratorObject<Tool>;
    get toolCalls(): Call[];
    clearCalls(): void;
    enable(): Promise<void>;
    toolsRemoved(params: Protocol.WebMCP.ToolsRemovedEvent): void;
    toolsAdded(params: Protocol.WebMCP.ToolsAddedEvent): void;
    toolInvoked(params: Protocol.WebMCP.ToolInvokedEvent): void;
    toolResponded(params: Protocol.WebMCP.ToolRespondedEvent): void;
}

import type { JSONSchema7 } from 'json-schema';
import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../bindings/bindings.js';
import type * as StackTrace from '../stack_trace/stack_trace.js';
export declare const enum Events {
    TOOLS_ADDED = "ToolsAdded",
    TOOLS_REMOVED = "ToolsRemoved",
    TOOL_INVOKED = "ToolInvoked",
    TOOL_RESPONDED = "ToolResponded"
}
export declare class Result {
    #private;
    readonly status: Protocol.WebMCP.InvocationStatus;
    readonly output?: unknown;
    readonly errorText?: string;
    constructor(status: Protocol.WebMCP.InvocationStatus, output: unknown | undefined, errorText: string | undefined, exception: SDK.RemoteObject.RemoteObject | undefined);
    get symbolizedError(): Promise<Bindings.SymbolizedError.SymbolizedError | null> | undefined;
}
export interface Call {
    invocationId: string;
    tool: Tool;
    input: string;
    result?: Result;
    cancel: () => void;
}
export declare class Tool {
    #private;
    constructor(tool: Protocol.WebMCP.Tool, target: SDK.Target.Target);
    get stackTrace(): Promise<StackTrace.StackTrace.StackTrace> | undefined;
    get name(): string;
    get description(): string;
    get inputSchema(): JSONSchema7;
    get flags(): Array<keyof Protocol.WebMCP.Annotation>;
    get frame(): SDK.ResourceTreeModel.ResourceTreeFrame | undefined;
    get isDeclarative(): boolean;
    get node(): SDK.DOMModel.DeferredDOMNode | undefined;
    invoke(input: unknown): Promise<string | undefined>;
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
    toolCallForId(invocationId: string): Call | undefined;
    clearCalls(): void;
    enable(): Promise<void>;
    toolsRemoved(params: Protocol.WebMCP.ToolsRemovedEvent): void;
    toolsAdded(params: Protocol.WebMCP.ToolsAddedEvent): void;
    toolInvoked(params: Protocol.WebMCP.ToolInvokedEvent): void;
    toolResponded(params: Protocol.WebMCP.ToolRespondedEvent): void;
}

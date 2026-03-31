import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as StackTrace from '../stack_trace/stack_trace.js';
export declare const enum Events {
    TOOLS_ADDED = "ToolsAdded",
    TOOLS_REMOVED = "ToolsRemoved",
    TOOL_INVOKED = "ToolInvoked",
    TOOL_RESPONDED = "ToolResponded"
}
export interface Call {
    invocationId: string;
    tool: Tool;
    input: string;
    result?: {
        status: Protocol.WebMCP.InvocationStatus;
        output?: unknown;
        errorText?: string;
        exception?: Protocol.Runtime.RemoteObject;
    };
}
export declare class Tool {
    #private;
    constructor(tool: Protocol.WebMCP.Tool, target: SDK.Target.Target);
    get stackTrace(): Promise<StackTrace.StackTrace.StackTrace> | undefined;
    get name(): string;
    get description(): string;
    get frame(): SDK.ResourceTreeModel.ResourceTreeFrame | undefined;
    get isDeclarative(): boolean;
    get node(): SDK.DOMModel.DeferredDOMNode | undefined;
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

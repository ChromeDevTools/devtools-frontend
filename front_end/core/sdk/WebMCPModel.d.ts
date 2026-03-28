import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import { SDKModel } from './SDKModel.js';
import { type Target } from './Target.js';
export declare const enum Events {
    TOOLS_ADDED = "ToolsAdded",
    TOOLS_REMOVED = "ToolsRemoved",
    TOOL_INVOKED = "ToolInvoked",
    TOOL_RESPONDED = "ToolResponded"
}
export interface Call {
    invocationId: string;
    input: string;
    tool: Protocol.WebMCP.Tool;
    result?: {
        status: Protocol.WebMCP.InvocationStatus;
        output?: unknown;
        errorText?: string;
        exception?: Protocol.Runtime.RemoteObject;
    };
}
export interface EventTypes {
    [Events.TOOLS_ADDED]: ReadonlyArray<Readonly<Protocol.WebMCP.Tool>>;
    [Events.TOOLS_REMOVED]: ReadonlyArray<Readonly<Protocol.WebMCP.Tool>>;
    [Events.TOOL_INVOKED]: Call;
    [Events.TOOL_RESPONDED]: Call;
}
export declare class WebMCPModel extends SDKModel<EventTypes> {
    #private;
    readonly agent: ProtocolProxyApi.WebMCPApi;
    constructor(target: Target);
    get tools(): IteratorObject<Protocol.WebMCP.Tool>;
    get toolCalls(): Call[];
    clearCalls(): void;
    enable(): Promise<void>;
    onToolsRemoved(tools: Protocol.WebMCP.Tool[]): void;
    onToolsAdded(tools: Protocol.WebMCP.Tool[]): void;
    toolInvoked(params: Protocol.WebMCP.ToolInvokedEvent): void;
    toolResponded(params: Protocol.WebMCP.ToolRespondedEvent): void;
}

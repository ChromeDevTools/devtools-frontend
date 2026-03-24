import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import { SDKModel } from './SDKModel.js';
import { type Target } from './Target.js';
export declare const enum Events {
    TOOLS_ADDED = "ToolsAdded",
    TOOLS_REMOVED = "ToolsRemoved"
}
export interface EventTypes {
    [Events.TOOLS_ADDED]: ReadonlyArray<Readonly<Protocol.WebMCP.Tool>>;
    [Events.TOOLS_REMOVED]: ReadonlyArray<Readonly<Protocol.WebMCP.Tool>>;
}
export declare class WebMCPModel extends SDKModel<EventTypes> {
    #private;
    readonly agent: ProtocolProxyApi.WebMCPApi;
    constructor(target: Target);
    get tools(): IteratorObject<Protocol.WebMCP.Tool>;
    enable(): Promise<void>;
    onToolsRemoved(tools: Protocol.WebMCP.Tool[]): void;
    onToolsAdded(tools: Protocol.WebMCP.Tool[]): void;
}

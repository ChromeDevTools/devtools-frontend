import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { AiAgent, type ContextResponse, type ConversationContext, MultimodalInputType, type RequestOptions } from './AiAgent.js';
import { type ExecuteJsAgentOptions } from './ExecuteJavascript.js';
export declare const AI_ASSISTANCE_FILTER_REGEX: string;
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export declare class StylingAgent extends AiAgent<SDK.DOMModel.DOMNode> {
    #private;
    readonly preamble: string;
    readonly clientFeature: Host.AidaClient.ClientFeature;
    get userTier(): string | undefined;
    get executionMode(): Root.Runtime.HostConfigFreestylerExecutionMode;
    get options(): RequestOptions;
    get multimodalInputEnabled(): boolean;
    constructor(opts: ExecuteJsAgentOptions);
    preambleFeatures(): string[];
    handleContextDetails(selectedElement: ConversationContext<SDK.DOMModel.DOMNode> | null): AsyncGenerator<ContextResponse, void, void>;
    enhanceQuery(query: string, selectedElement: ConversationContext<SDK.DOMModel.DOMNode> | null, multimodalInputType?: MultimodalInputType): Promise<string>;
}

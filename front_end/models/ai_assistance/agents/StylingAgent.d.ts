import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { ChangeManager } from '../ChangeManager.js';
import { type AgentOptions as BaseAgentOptions, AiAgent, type ContextResponse, ConversationContext, type ConversationSuggestions, type FunctionCallHandlerResult, type FunctionHandlerOptions, MultimodalInputType, type RequestOptions } from './AiAgent.js';
declare function executeJsCode(functionDeclaration: string, { throwOnSideEffect, contextNode }: {
    throwOnSideEffect: boolean;
    contextNode: SDK.DOMModel.DOMNode | null;
}): Promise<string>;
type CreateExtensionScopeFunction = (changes: ChangeManager) => {
    install(): Promise<void>;
    uninstall(): Promise<void>;
};
interface AgentOptions extends BaseAgentOptions {
    changeManager?: ChangeManager;
    createExtensionScope?: CreateExtensionScopeFunction;
    execJs?: typeof executeJsCode;
}
export declare class NodeContext extends ConversationContext<SDK.DOMModel.DOMNode> {
    #private;
    constructor(node: SDK.DOMModel.DOMNode);
    getOrigin(): string;
    getItem(): SDK.DOMModel.DOMNode;
    getTitle(): string;
    getSuggestions(): Promise<ConversationSuggestions | undefined>;
}
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export declare class StylingAgent extends AiAgent<SDK.DOMModel.DOMNode> {
    #private;
    preamble: string;
    readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_STYLING_AGENT;
    get userTier(): string | undefined;
    get executionMode(): Root.Runtime.HostConfigFreestylerExecutionMode;
    get options(): RequestOptions;
    get multimodalInputEnabled(): boolean;
    preambleFeatures(): string[];
    constructor(opts: AgentOptions);
    onPrimaryPageChanged(): void;
    generateObservation(action: string, { throwOnSideEffect, }: {
        throwOnSideEffect: boolean;
    }): Promise<{
        observation: string;
        sideEffect: boolean;
        canceled: boolean;
    }>;
    static describeElement(element: SDK.DOMModel.DOMNode): Promise<string>;
    getStyles(elements: string[], properties: string[], _options?: {
        signal?: AbortSignal;
        approved?: boolean;
    }): Promise<FunctionCallHandlerResult<unknown>>;
    executeAction(action: string, options?: FunctionHandlerOptions): Promise<FunctionCallHandlerResult<unknown>>;
    handleContextDetails(selectedElement: ConversationContext<SDK.DOMModel.DOMNode> | null): AsyncGenerator<ContextResponse, void, void>;
    enhanceQuery(query: string, selectedElement: ConversationContext<SDK.DOMModel.DOMNode> | null, multimodalInputType?: MultimodalInputType): Promise<string>;
}
export {};

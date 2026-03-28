import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { ChangeManager } from '../ChangeManager.js';
import { type AgentOptions as BaseAgentOptions, AiAgent, type ContextResponse, ConversationContext, type ConversationSuggestions, type FunctionCallHandlerResult, type MultimodalInput, MultimodalInputType, type RequestOptions } from './AiAgent.js';
import { executeJsCode } from './ExecuteJavascript.js';
export declare const AI_ASSISTANCE_FILTER_REGEX = "\\.ai-style-change-.*&";
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
    static describeElement(element: SDK.DOMModel.DOMNode): Promise<string>;
    addElementAnnotation(elementId: string, annotationMessage: string): Promise<FunctionCallHandlerResult<unknown>>;
    activateDeviceEmulation(deviceName: string, visionDeficiency?: string): Promise<FunctionCallHandlerResult<unknown>>;
    popPendingMultimodalInput(): MultimodalInput | undefined;
    handleContextDetails(selectedElement: ConversationContext<SDK.DOMModel.DOMNode> | null): AsyncGenerator<ContextResponse, void, void>;
    protected preRun(): Promise<void>;
    enhanceQuery(query: string, selectedElement: ConversationContext<SDK.DOMModel.DOMNode> | null, multimodalInputType?: MultimodalInputType): Promise<string>;
}
export {};

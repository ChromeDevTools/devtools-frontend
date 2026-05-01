import * as Host from '../../../core/host/host.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { type AgentOptions, AiAgent, type ContextResponse, ConversationContext, type RequestOptions } from './AiAgent.js';
export declare class GreenDevContext extends ConversationContext<string> {
    #private;
    constructor(context: string);
    getOrigin(): string;
    getItem(): string;
    getTitle(): string;
}
/**
 * This agent is a general-purpose web page troubleshooting agent for GreenDev
 * prototypes.
 */
export declare class GreenDevAgent extends AiAgent<string> {
    #private;
    constructor(options: AgentOptions);
    preamble: string;
    get clientFeature(): Host.AidaClient.ClientFeature;
    get userTier(): string | undefined;
    get options(): RequestOptions;
    handleContextDetails(context: ConversationContext<string> | null): AsyncGenerator<ContextResponse, void, void>;
    enhanceQuery(query: string, context: ConversationContext<string> | null): Promise<string>;
    static isEnabled(): boolean;
    static formatConsoleMessage(message: SDK.ConsoleModel.ConsoleMessage, index: number): string;
    static getNetworkContextData(target: SDK.Target.Target): Promise<Array<{
        string: string;
        failed: boolean;
    }>>;
    getEventListeners(uid: number): Promise<string>;
    getNetworkRequests(params: {
        filter?: string;
        beforeIndex?: number;
        afterIndex?: number;
        limit?: number;
    }): Promise<string>;
    getConsoleMessages(params: {
        filter?: string;
        beforeIndex?: number;
        afterIndex?: number;
        limit?: number;
    }): Promise<string>;
    getSourceLine(fileName: string, lineNumber: number, buffer: number, calledFromAI?: boolean): Promise<string[]>;
    findInSource(fileName: string, query: string): Promise<Array<{
        line: number;
        source: string[];
    }>>;
    getReactComponentProps(uid: number, calledFromAI?: boolean): Promise<string>;
}

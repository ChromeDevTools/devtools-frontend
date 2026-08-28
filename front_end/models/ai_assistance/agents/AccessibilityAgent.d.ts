import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import { AiAgent, type ContextResponse, type ConversationContext, type RequestOptions } from './AiAgent.js';
import { type ExecuteJsAgentOptions } from './ExecuteJavascript.js';
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export declare class AccessibilityAgent extends AiAgent<LHModel.ReporterTypes.ReportJSON> {
    #private;
    readonly preamble: string;
    readonly clientFeature: Host.AidaClient.ClientFeature;
    constructor(opts: ExecuteJsAgentOptions);
    get userTier(): string | undefined;
    get executionMode(): Root.Runtime.HostConfigFreestylerExecutionMode;
    get options(): RequestOptions;
    protected preRun(): Promise<void>;
    handleContextDetails(lhr: ConversationContext<LHModel.ReporterTypes.ReportJSON> | null): AsyncGenerator<ContextResponse, void, void>;
    enhanceQuery(query: string, lhr: ConversationContext<LHModel.ReporterTypes.ReportJSON> | null): Promise<string>;
}

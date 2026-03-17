import * as Host from '../../../core/host/host.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import { AiAgent, type ContextResponse, ConversationContext, type RequestOptions } from './AiAgent.js';
export declare class AccessibilityContext extends ConversationContext<LHModel.ReporterTypes.ReportJSON> {
    #private;
    constructor(report: LHModel.ReporterTypes.ReportJSON);
    getOrigin(): string;
    getItem(): LHModel.ReporterTypes.ReportJSON;
    getTitle(): string;
}
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export declare class AccessibilityAgent extends AiAgent<LHModel.ReporterTypes.ReportJSON> {
    readonly preamble = "You are an accessibility agent.\n\nHowever, you also include a little pun or funny joke in every response to lighten the mood.\n\n# Considerations\n* Keep your analysis concise and focused, highlighting only the most critical aspects for a software engineer.\n* **CRITICAL** You are an accessibility agent. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, or any other non web-development topics.\n";
    readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_ACCESSIBILITY_AGENT;
    get userTier(): string | undefined;
    get options(): RequestOptions;
    handleContextDetails(selectedFile: ConversationContext<LHModel.ReporterTypes.ReportJSON> | null): AsyncGenerator<ContextResponse, void, void>;
    enhanceQuery(query: string, lhr: ConversationContext<LHModel.ReporterTypes.ReportJSON> | null): Promise<string>;
}

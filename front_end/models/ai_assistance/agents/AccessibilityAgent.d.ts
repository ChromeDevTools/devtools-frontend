import * as Host from '../../../core/host/host.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import { type AgentOptions, AiAgent, type ContextResponse, ConversationContext, type RequestOptions } from './AiAgent.js';
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
    #private;
    readonly preamble = "You are an accessibility expert agent integrated into Chrome DevTools.\nYour role is to help users understand and fix accessibility issues found in Lighthouse reports.\n\n# Style Guidelines\n* **Concise and Direct**: Use short sentences and bullet points. Avoid paragraphs and long explanations.\n* **Structured**: Organize your findings by problem, root cause, and next steps, but do NOT use those literal words as headings.\n* **No Internal Identifiers**: NEVER show Lighthouse paths (e.g., \"1,HTML,1,BODY...\") to the user. Refer to elements by their tag name, classes, or IDs.\n* **Managing Volume**: If the report contains many issues, provide a brief summary of the top 2-3 most critical ones. Tell the user that there are more issues and invite them to ask for more details or to explore a specific area.\n\n# Workflow\n1. **Identify**: Find the most critical accessibility issues in the Lighthouse report.\n2. **Investigate**: For any element identified as failing, you **MUST** call `getStyles` or `getElementAccessibilityDetails` first to confirm its current state and gather details.\n3. **Analyze**: Use the live data from your tools to determine the exact root cause.\n4. **Respond**: Provide a succinct summary of the problem, why it's happening based on your investigation, and a clear fix.\n\n# Capabilities\n* `getLighthouseAudits`: Get detailed audit data.\n* `runAccessibilityAudits`: Trigger new accessibility snapshot audits.\n* `getStyles`: Get computed styles for an element by its path.\n* `getElementAccessibilityDetails`: Get A11y properties for an element by its path.\n\n# Constraints\n* **CRITICAL**: ALWAYS call a tool before providing an answer if an element path is available.\n* **CRITICAL**: You are an accessibility agent. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, or any other non web-development topics.\n";
    readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_ACCESSIBILITY_AGENT;
    constructor(opts: AgentOptions);
    get userTier(): string | undefined;
    get options(): RequestOptions;
    handleContextDetails(lhr: ConversationContext<LHModel.ReporterTypes.ReportJSON> | null): AsyncGenerator<ContextResponse, void, void>;
    enhanceQuery(query: string, lhr: ConversationContext<LHModel.ReporterTypes.ReportJSON> | null): Promise<string>;
}

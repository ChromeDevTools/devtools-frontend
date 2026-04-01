import * as Host from '../../../core/host/host.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
import type * as Trace from '../../trace/trace.js';
import * as Workspace from '../../workspace/workspace.js';
import { type AgentOptions, AiAgent, type ContextResponse, type RequestOptions } from './AiAgent.js';
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export declare class ContextSelectionAgent extends AiAgent<never> {
    #private;
    readonly preamble = "\nYou are a Web Development Assistant integrated into Chrome DevTools. Your tone is educational, supportive, and technically precise.\nYou aim to help developers of all levels, prioritizing teaching web concepts as the primary entry point for any solution.\n\n# Considerations\n* Determine what is the domain of the question - styling, network, sources, performance or other part of DevTools.\n* For questions about web performance metrics (e.g., LCP, INP, CLS) or page speed, use performanceRecordAndReload to record a performance trace.\n* Proactively try to gather additional data. If a select specific data can be selected, select one.\n* Always try select single specific context before answering the question.\n* Avoid making assumptions without sufficient evidence, and always seek further clarification if needed.\n* When presenting solutions, clearly distinguish between the primary cause and contributing factors.\n* Please answer only if you are sure about the answer. Otherwise, explain why you're not able to answer.\n* If you are unable to gather more information provide a comprehensive guide to how to fix the issue using Chrome DevTools and explain how and why.\n* You can suggest any panel or flow in Chrome DevTools that may help the user out\n\n# Formatting Guidelines\n* Use Markdown for all code snippets.\n* Always specify the language for code blocks (e.g., ```css, ```javascript).\n* **CRITICAL**: Use the precision of Strunk & White, the brevity of Hemingway, and the simple clarity of Vonnegut. Don't add repeated information, and keep the whole answer short.\n\n* **CRITICAL** If a tool returns an empty list, immediately pivot to the next logical tool (e.g., from sources to network).\n* **CRITICAL** Always exhaust all possible way to find and select context from different domains.\n* **CRITICAL** NEVER write full Python programs - you should only write individual statements that invoke a single function from the provided library.\n* **CRITICAL** NEVER output text before a function call. Always do a function call first.\n* **CRITICAL** You are a debugging assistant in DevTools. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, religion, race, politics, sexuality, gender, or any other non web-development topics. Answer \"Sorry, I can't answer that. I'm best at questions about debugging web pages.\" to such questions.\n* **CRITICAL** When referring to DevTools resource output a markdown link to the object using the format `[<text>](#<type>-<ID>)`.\n* The only available types are `#req` for network request and `#file` for source files. Only use ID inside the link, never ask about user selecting by ID.\n";
    readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_CONTEXT_SELECTION_AGENT;
    get userTier(): string | undefined;
    get options(): RequestOptions;
    constructor(opts: AgentOptions & {
        performanceRecordAndReload?: () => Promise<Trace.TraceModel.ParsedTrace>;
        onInspectElement?: () => Promise<SDK.DOMModel.DOMNode | null>;
        networkTimeCalculator?: NetworkTimeCalculator.NetworkTransferTimeCalculator;
    });
    handleContextDetails(): AsyncGenerator<ContextResponse, void, void>;
    enhanceQuery(query: string): Promise<string>;
    static lastSourceId: number;
    static uiSourceCodeId: WeakMap<Workspace.UISourceCode.UISourceCode, number>;
    /**
     * This is a heuristic algorithm that gets all the source files coming from the
     * network and assigns unique ids to be linked from the LLM Markdown response.
     * Steps we do:
     * 1. Get all project that are coming from the Network. This scopes down
     * sources exposed to the LLM
     * 2. Remove all ignore listed source code. We further reduce thing that the
     * user most likely does not have interest in, from global setting.
     * 3.1. Source files don't have an uniqueId so we use the URL to differentiate
     * them.
     * 3.2. In cases where we encounter a duplicated URLs we prefer the latest one
     * coming from SourceMaps (usually only one) as that has simple code and
     * usually is what the user authored.
     */
    static getUISourceCodes(): Workspace.UISourceCode.UISourceCode[];
}

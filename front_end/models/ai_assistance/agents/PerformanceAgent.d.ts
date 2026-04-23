import * as Host from '../../../core/host/host.js';
import * as Trace from '../../trace/trace.js';
import { AICallTree } from '../performance/AICallTree.js';
import { AgentFocus } from '../performance/AIContext.js';
import { AiAgent, type ContextResponse, ConversationContext, type ConversationSuggestions, type FunctionCallHandlerResult, type ParsedResponse, type RequestOptions, type ResponseData } from './AiAgent.js';
/**
 * Labels used to identify specific periods or categories in the trace for getting main thread summary.
 * Supports hardcoded phases, dynamic navigation IDs (`NAVIGATION_X`), and insight models.
 */
export type MainThreadSectionLabel = 'nav-to-lcp' | 'lcp-ttfb' | 'lcp-render-delay' | 'trace-bounds' | 'NO_NAVIGATION' | `NAVIGATION_${string}` | keyof Trace.Insights.Types.InsightModels;
export declare class PerformanceTraceContext extends ConversationContext<AgentFocus> {
    #private;
    static fromParsedTrace(parsedTrace: Trace.TraceModel.ParsedTrace): PerformanceTraceContext;
    static fromInsight(parsedTrace: Trace.TraceModel.ParsedTrace, insight: Trace.Insights.Types.InsightModel): PerformanceTraceContext;
    static fromCallTree(callTree: AICallTree): PerformanceTraceContext;
    external: boolean;
    constructor(focus: AgentFocus);
    getOrigin(): string;
    getItem(): AgentFocus;
    getTitle(): string;
    /**
     * Presents the default suggestions that are shown when the user first clicks
     * "Ask AI".
     */
    getSuggestions(): Promise<ConversationSuggestions | undefined>;
}
/**
 * Converts the label name we use in the code to a human readable one that is
 * shown to the user.
 */
export declare function getLabelName(label: MainThreadSectionLabel, focus: AgentFocus): string;
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export declare class PerformanceAgent extends AiAgent<AgentFocus> {
    #private;
    get preamble(): string;
    get clientFeature(): Host.AidaClient.ClientFeature;
    get userTier(): string | undefined;
    get options(): RequestOptions;
    handleContextDetails(context: ConversationContext<AgentFocus> | null): AsyncGenerator<ContextResponse, void, void>;
    parseTextResponse(response: string): ParsedResponse;
    enhanceQuery(query: string, context: PerformanceTraceContext | null): Promise<string>;
    run(initialQuery: string, options: {
        selected: PerformanceTraceContext | null;
        signal?: AbortSignal;
    }): AsyncGenerator<ResponseData, void, void>;
    addElementAnnotation(elementId: string, annotationMessage: string): Promise<FunctionCallHandlerResult<unknown>>;
    addNetworkRequestAnnotation(eventKey: string, annotationMessage: string): Promise<FunctionCallHandlerResult<unknown>>;
}

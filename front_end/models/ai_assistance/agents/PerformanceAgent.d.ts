import * as Host from '../../../core/host/host.js';
import * as Trace from '../../trace/trace.js';
import { AICallTree } from '../performance/AICallTree.js';
import { AgentFocus } from '../performance/AIContext.js';
import { AiAgent, type ContextResponse, ConversationContext, type ConversationSuggestions, type FunctionCallHandlerResult, type ParsedResponse, type RequestOptions, type ResponseData } from './AiAgent.js';
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
}

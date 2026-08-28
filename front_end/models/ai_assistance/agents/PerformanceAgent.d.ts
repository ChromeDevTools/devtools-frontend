import * as Host from '../../../core/host/host.js';
import * as Tracing from '../../../services/tracing/tracing.js';
import * as Logs from '../../logs/logs.js';
import type { PerformanceTraceContext } from '../contexts/PerformanceTraceContext.js';
import type { AgentFocus } from '../performance/AIContext.js';
import { type AgentOptions, AiAgent, type ContextResponse, type ConversationContext, type ParsedResponse, type RequestOptions, type ResponseData } from './AiAgent.js';
export interface PerformanceAgentOptions extends AgentOptions {
    tracker?: Tracing.FreshRecording.Tracker;
    networkLog?: Logs.NetworkLog.NetworkLog;
}
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export declare class PerformanceAgent extends AiAgent<AgentFocus> {
    #private;
    readonly preamble: string;
    constructor(opts: PerformanceAgentOptions);
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
    /**
     * Clears performance-agent-specific caches and state.
     * This is called when the conversation needs to be reset (e.g. on navigation)
     * to prevent stale formatters, trace facts, or selection contexts from leaking
     * into subsequent runs.
     */
    clearCache(): void;
}

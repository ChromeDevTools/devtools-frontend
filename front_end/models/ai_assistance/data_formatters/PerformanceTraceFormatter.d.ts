import type * as SourceMapScopes from '../../source_map_scopes/source_map_scopes.js';
import * as Trace from '../../trace/trace.js';
import type { AICallTree } from '../performance/AICallTree.js';
import type { AgentFocus } from '../performance/AIContext.js';
export interface NetworkRequestFormatOptions {
    verbose?: boolean;
    customTitle?: string;
}
export declare class PerformanceTraceFormatter {
    #private;
    constructor(focus: AgentFocus);
    serializeEvent(event: Trace.Types.Events.Event): string;
    serializeBounds(bounds: Trace.Types.Timing.TraceWindowMicro): string;
    formatTraceSummary(): string;
    formatCriticalRequests(): string;
    formatMainThreadBottomUpSummary(): string;
    formatThirdPartySummary(): string;
    formatLongestTasks(): string;
    formatMainThreadTrackSummary(bounds: Trace.Types.Timing.TraceWindowMicro): string;
    formatNetworkTrackSummary(bounds: Trace.Types.Timing.TraceWindowMicro): string;
    formatCallTree(tree: AICallTree, headerLevel?: number): string;
    formatNetworkRequests(requests: readonly Trace.Types.Events.SyntheticNetworkRequest[], options?: NetworkRequestFormatOptions): string;
    static callFrameDataFormatDescription: string;
    /**
     * Network requests format description that is sent to the model as a fact.
     */
    static networkDataFormatDescription: string;
    formatFunctionCode(code: SourceMapScopes.FunctionCodeResolver.FunctionCode): string;
}

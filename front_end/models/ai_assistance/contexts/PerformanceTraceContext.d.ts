import * as SDK from '../../../core/sdk/sdk.js';
import * as Tracing from '../../../services/tracing/tracing.js';
import * as Trace from '../../trace/trace.js';
import { type ContextDetail, ConversationContext, type ConversationSuggestions } from '../agents/AiAgent.js';
import { PerformanceTraceFormatter } from '../data_formatters/PerformanceTraceFormatter.js';
import type { AICallTree } from '../performance/AICallTree.js';
import { AgentFocus } from '../performance/AIContext.js';
/**
 * The conversation context for AI queries regarding performance traces.
 * Encapsulates the user's active trace selection/focus and handles formatting
 * the context data for the LLM prompt and user-facing accordion disclosures.
 */
export declare class PerformanceTraceContext extends ConversationContext<AgentFocus> {
    #private;
    static fromParsedTrace(parsedTrace: Trace.TraceModel.ParsedTrace, targetManager?: SDK.TargetManager.TargetManager, freshRecordingTracker?: Tracing.FreshRecording.Tracker): PerformanceTraceContext;
    static fromInsight(parsedTrace: Trace.TraceModel.ParsedTrace, insight: Trace.Insights.Types.InsightModel, targetManager?: SDK.TargetManager.TargetManager, freshRecordingTracker?: Tracing.FreshRecording.Tracker): PerformanceTraceContext;
    static fromCallTree(callTree: AICallTree, targetManager?: SDK.TargetManager.TargetManager, freshRecordingTracker?: Tracing.FreshRecording.Tracker): PerformanceTraceContext;
    constructor(focus: AgentFocus, targetManager?: SDK.TargetManager.TargetManager, freshRecordingTracker?: Tracing.FreshRecording.Tracker);
    /**
     * Returns a PerformanceTraceFormatter configured to resolve function
     * code from source maps using the active page target.
     *
     * Note: Function code resolution from source maps is only supported for fresh
     * recordings (recorded in the current session on the active target page). For
     * imported traces, it returns null to prevent mismatched source resolution.
     */
    createFormatter(): PerformanceTraceFormatter;
    getURL(): string;
    /**
     * Returns the origin for a performance trace in the AI context.
     *
     * To prevent cross-origin prompt injection attacks, imported traces
     * are isolated from live pages. We assign them a virtual origin
     * (`imported-trace://${domain}`) so they do not share the origin of live pages
     * (e.g., `https://${domain}`). This forces a conversation reset when transitioning
     * between imported trace data and live pages.
     */
    getOrigin(): string;
    getItem(): AgentFocus;
    getTitle(): string;
    /**
     * Presents the default suggestions that are shown when the user first clicks
     * "Ask AI".
     */
    getSuggestions(): Promise<ConversationSuggestions | undefined>;
    /**
     * Returns a markdown-formatted payload containing the trace data facts
     * (summary, critical requests, activities, third-party code, and longest tasks)
     * to be included directly in the LLM's prompt.
     *
     * Invariant: The content returned here must align with the user-facing details
     * returned by `getUserFacingDetails()` to ensure complete data transparency.
     */
    getPromptDetails(): Promise<string | null>;
    /**
     * Returns structured trace context details to be displayed to the user in the UI
     * (under the "Analyzing data" disclosure accordion).
     *
     * Invariant: The details shown here must correspond exactly to the data sent to
     * the LLM prompt via `getPromptDetails()`.
     */
    getUserFacingDetails(): Promise<[ContextDetail, ...ContextDetail[]] | null>;
}

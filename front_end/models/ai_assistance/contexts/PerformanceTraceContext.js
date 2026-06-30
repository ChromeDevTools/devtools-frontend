// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Tracing from '../../../services/tracing/tracing.js';
import * as SourceMapScopes from '../../source_map_scopes/source_map_scopes.js';
import * as Trace from '../../trace/trace.js';
import { ConversationContext, } from '../agents/AiAgent.js';
import { extractContextOrigin } from '../AiOrigins.js';
import { PerformanceInsightFormatter, } from '../data_formatters/PerformanceInsightFormatter.js';
import { PerformanceTraceFormatter } from '../data_formatters/PerformanceTraceFormatter.js';
import { AgentFocus } from '../performance/AIContext.js';
/**
 * The conversation context for AI queries regarding performance traces.
 * Encapsulates the user's active trace selection/focus and handles formatting
 * the context data for the LLM prompt and user-facing accordion disclosures.
 */
export class PerformanceTraceContext extends ConversationContext {
    static fromParsedTrace(parsedTrace) {
        return new PerformanceTraceContext(AgentFocus.fromParsedTrace(parsedTrace));
    }
    static fromInsight(parsedTrace, insight) {
        return new PerformanceTraceContext(AgentFocus.fromInsight(parsedTrace, insight));
    }
    static fromCallTree(callTree) {
        return new PerformanceTraceContext(AgentFocus.fromCallTree(callTree));
    }
    #focus;
    constructor(focus) {
        super();
        this.#focus = focus;
    }
    /**
     * Returns a PerformanceTraceFormatter configured to resolve function
     * code from source maps using the active page target.
     *
     * Note: Function code resolution from source maps is only supported for fresh
     * recordings (recorded in the current session on the active target page). For
     * imported traces, it returns null to prevent mismatched source resolution.
     */
    createFormatter() {
        const focus = this.#focus;
        const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        const formatter = new PerformanceTraceFormatter(focus);
        const isFresh = Tracing.FreshRecording.Tracker.instance().recordingIsFresh(focus.parsedTrace);
        formatter.resolveFunctionCode = async (url, line, column) => {
            if (!target || !isFresh) {
                return null;
            }
            return await SourceMapScopes.FunctionCodeResolver.getFunctionCodeFromLocation(target, url, line, column, { contextLength: 200, contextLineLength: 5, appendProfileData: true });
        };
        return formatter;
    }
    getURL() {
        const url = this.#focus.parsedTrace.data.Meta.mainFrameURL;
        try {
            new URL(url);
            return url;
        }
        catch {
            const { min, max } = this.#focus.parsedTrace.data.Meta.traceBounds;
            return `trace-${min}-${max}`;
        }
    }
    /**
     * Returns the origin for a performance trace in the AI context.
     *
     * To prevent cross-origin prompt injection attacks, imported traces
     * are isolated from live pages. We assign them a virtual origin
     * (`imported-trace://${domain}`) so they do not share the origin of live pages
     * (e.g., `https://${domain}`). This forces a conversation reset when transitioning
     * between imported trace data and live pages.
     */
    getOrigin() {
        const parsedTrace = this.#focus.parsedTrace;
        const url = this.getURL();
        const origin = extractContextOrigin(url);
        const isFresh = Tracing.FreshRecording.Tracker.instance().recordingIsFresh(parsedTrace);
        if (!isFresh) {
            const parsed = Common.ParsedURL.ParsedURL.fromString(origin);
            return `imported-trace://${parsed ? parsed.domain() : origin}`;
        }
        return origin;
    }
    getItem() {
        return this.#focus;
    }
    getTitle() {
        const focus = this.#focus;
        let url = focus.primaryInsightSet?.url;
        if (!url) {
            url = new URL(focus.parsedTrace.data.Meta.mainFrameURL);
        }
        const parts = [`Trace: ${url.hostname}`];
        if (focus.insight) {
            parts.push(focus.insight.title);
        }
        if (focus.event) {
            parts.push(Trace.Name.forEntry(focus.event));
        }
        if (focus.callTree) {
            const node = focus.callTree.selectedNode ?? focus.callTree.rootNode;
            parts.push(Trace.Name.forEntry(node.event));
        }
        return parts.join(' – ');
    }
    /**
     * Presents the default suggestions that are shown when the user first clicks
     * "Ask AI".
     */
    async getSuggestions() {
        const focus = this.#focus;
        if (focus.callTree) {
            return [
                { title: 'What\'s the purpose of this work?', jslogContext: 'performance-default' },
                { title: 'Where is time being spent?', jslogContext: 'performance-default' },
                { title: 'How can I optimize this?', jslogContext: 'performance-default' },
            ];
        }
        if (focus.insight) {
            return new PerformanceInsightFormatter(focus, focus.insight).getSuggestions();
        }
        const suggestions = [{ title: 'What performance issues exist with my page?', jslogContext: 'performance-default' }];
        const insightSet = focus.primaryInsightSet;
        if (insightSet) {
            const lcp = Trace.Insights.Common.getLCP(insightSet);
            const cls = Trace.Insights.Common.getCLS(insightSet);
            const inp = Trace.Insights.Common.getINP(insightSet);
            const ModelHandlers = Trace.Handlers.ModelHandlers;
            const GOOD = "good" /* Trace.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.GOOD */;
            const poorMetrics = new Set();
            if (lcp && ModelHandlers.PageLoadMetrics.scoreClassificationForLargestContentfulPaint(lcp.value) !== GOOD) {
                suggestions.push({ title: 'How can I improve LCP?', jslogContext: 'performance-default' });
                poorMetrics.add(Trace.Insights.Types.InsightKeys.LCP_BREAKDOWN);
                poorMetrics.add(Trace.Insights.Types.InsightKeys.LCP_DISCOVERY);
            }
            if (inp && ModelHandlers.UserInteractions.scoreClassificationForInteractionToNextPaint(inp.value) !== GOOD) {
                suggestions.push({ title: 'How can I improve INP?', jslogContext: 'performance-default' });
                poorMetrics.add(Trace.Insights.Types.InsightKeys.INP_BREAKDOWN);
            }
            if (cls && ModelHandlers.LayoutShifts.scoreClassificationForLayoutShift(cls.value) !== GOOD) {
                suggestions.push({ title: 'How can I improve CLS?', jslogContext: 'performance-default' });
                poorMetrics.add(Trace.Insights.Types.InsightKeys.CLS_CULPRITS);
            }
            // Add up to 4 suggestions total (including those already added) from the top failing insights
            // that aren't already covered by CWV suggestions.
            const additionalSuggestionsRequired = Math.max(0, 4 - suggestions.length);
            if (additionalSuggestionsRequired > 0) {
                const failingInsightSuggestions = Object.values(insightSet.model)
                    .filter(model => {
                    return model.state !== 'pass' && Trace.Insights.Common.isInsightKey(model.insightKey) &&
                        !poorMetrics.has(model.insightKey);
                })
                    .map(model => new PerformanceInsightFormatter(focus, model).getSuggestions().at(-1))
                    .filter((suggestion) => !!suggestion)
                    .slice(0, additionalSuggestionsRequired);
                suggestions.push(...failingInsightSuggestions);
            }
        }
        return suggestions;
    }
    /**
     * Returns a markdown-formatted payload containing the trace data facts
     * (summary, critical requests, activities, third-party code, and longest tasks)
     * to be included directly in the LLM's prompt.
     *
     * Invariant: The content returned here must align with the user-facing details
     * returned by `getUserFacingDetails()` to ensure complete data transparency.
     */
    async getPromptDetails() {
        const formatter = this.createFormatter();
        const details = [];
        const traceSummary = formatter.formatTraceSummary();
        if (traceSummary) {
            details.push(`Trace summary:\n${traceSummary}`);
        }
        const criticalRequests = await formatter.formatCriticalRequests();
        if (criticalRequests) {
            details.push(criticalRequests);
        }
        const mainThreadBottomUp = await formatter.formatMainThreadBottomUpSummary();
        if (mainThreadBottomUp) {
            details.push(mainThreadBottomUp);
        }
        const thirdPartySummary = await formatter.formatThirdPartySummary();
        if (thirdPartySummary) {
            details.push(thirdPartySummary);
        }
        const longestTasks = await formatter.formatLongestTasks();
        if (longestTasks) {
            details.push(longestTasks);
        }
        return details.length > 0 ? details.join('\n\n') : null;
    }
    /**
     * Returns structured trace context details to be displayed to the user in the UI
     * (under the "Analyzing data" disclosure accordion).
     *
     * Invariant: The details shown here must correspond exactly to the data sent to
     * the LLM prompt via `getPromptDetails()`.
     */
    async getUserFacingDetails() {
        const formatter = this.createFormatter();
        const details = [];
        const traceSummary = formatter.formatTraceSummary();
        if (traceSummary) {
            details.push({
                title: 'Trace summary',
                text: traceSummary,
            });
        }
        const criticalRequests = await formatter.formatCriticalRequests();
        if (criticalRequests) {
            details.push({
                title: 'Critical requests',
                text: criticalRequests,
            });
        }
        const mainThreadBottomUp = await formatter.formatMainThreadBottomUpSummary();
        if (mainThreadBottomUp) {
            details.push({
                title: 'Main thread activities',
                text: mainThreadBottomUp,
            });
        }
        const thirdPartySummary = await formatter.formatThirdPartySummary();
        if (thirdPartySummary) {
            details.push({
                title: 'Third party summary',
                text: thirdPartySummary,
            });
        }
        const longestTasks = await formatter.formatLongestTasks();
        if (longestTasks) {
            details.push({
                title: 'Longest tasks',
                text: longestTasks,
            });
        }
        return details.length > 0 ? details : null;
    }
}
//# sourceMappingURL=PerformanceTraceContext.js.map
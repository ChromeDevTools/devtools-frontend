// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import type {UrlString} from '../../../core/platform/DevToolsPath.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Tracing from '../../../services/tracing/tracing.js';
import * as Bindings from '../../bindings/bindings.js';
import * as SourceMapScopes from '../../source_map_scopes/source_map_scopes.js';
import * as Trace from '../../trace/trace.js';
import {
  type AiWidget,
  type ContextDetail,
  ConversationContext,
  type ConversationSuggestions,
} from '../agents/AiAgent.js';
import {extractContextOrigin} from '../AiOrigins.js';
import {
  PerformanceInsightFormatter,
} from '../data_formatters/PerformanceInsightFormatter.js';
import {PerformanceTraceFormatter} from '../data_formatters/PerformanceTraceFormatter.js';
import type {AICallTree} from '../performance/AICallTree.js';
import {AgentFocus} from '../performance/AIContext.js';

/**
 * Labels used to identify specific periods or categories in the trace for getting main thread summary.
 * Supports hardcoded phases, dynamic navigation IDs (`NAVIGATION_X`), and insight models.
 */
export type MainThreadSectionLabel = 'nav-to-lcp'|'lcp-ttfb'|'lcp-render-delay'|'trace-bounds'|'NO_NAVIGATION'|
                                     `NAVIGATION_${string}`|keyof Trace.Insights.Types.InsightModels;

/**
 * The conversation context for AI queries regarding performance traces.
 * Encapsulates the user's active trace selection/focus and handles formatting
 * the context data for the LLM prompt and user-facing accordion disclosures.
 */
export class PerformanceTraceContext extends ConversationContext<AgentFocus> {
  static fromParsedTrace(
      parsedTrace: Trace.TraceModel.ParsedTrace,
      // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
      targetManager: SDK.TargetManager.TargetManager = SDK.TargetManager.TargetManager.instance(),
      freshRecordingTracker: Tracing.FreshRecording.Tracker = Tracing.FreshRecording.Tracker.instance(),
      debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding =
          // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()): PerformanceTraceContext {
    return new PerformanceTraceContext(
        AgentFocus.fromParsedTrace(parsedTrace),
        targetManager,
        freshRecordingTracker,
        debuggerWorkspaceBinding,
    );
  }

  static fromInsight(parsedTrace: Trace.TraceModel.ParsedTrace, insight: Trace.Insights.Types.InsightModel,
                     // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
                     targetManager: SDK.TargetManager.TargetManager = SDK.TargetManager.TargetManager.instance(),
                     freshRecordingTracker: Tracing.FreshRecording.Tracker = Tracing.FreshRecording.Tracker.instance(),
                     debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding =
                         // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
                     Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()): PerformanceTraceContext {
    return new PerformanceTraceContext(
        AgentFocus.fromInsight(parsedTrace, insight),
        targetManager,
        freshRecordingTracker,
        debuggerWorkspaceBinding,
    );
  }

  static fromCallTree(callTree: AICallTree,
                      // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
                      targetManager: SDK.TargetManager.TargetManager = SDK.TargetManager.TargetManager.instance(),
                      freshRecordingTracker: Tracing.FreshRecording.Tracker = Tracing.FreshRecording.Tracker.instance(),
                      debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding =
                          // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
                      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()): PerformanceTraceContext {
    return new PerformanceTraceContext(
        AgentFocus.fromCallTree(callTree),
        targetManager,
        freshRecordingTracker,
        debuggerWorkspaceBinding,
    );
  }

  readonly #focus: AgentFocus;
  readonly #targetManager: SDK.TargetManager.TargetManager;
  readonly #freshRecordingTracker: Tracing.FreshRecording.Tracker;
  readonly #debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding;

  constructor(focus: AgentFocus,
              // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
              targetManager: SDK.TargetManager.TargetManager = SDK.TargetManager.TargetManager.instance(),
              freshRecordingTracker: Tracing.FreshRecording.Tracker = Tracing.FreshRecording.Tracker.instance(),
              debuggerWorkspaceBinding: Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding =
                  // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
              Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance()) {
    super();
    this.#focus = focus;
    this.#targetManager = targetManager;
    this.#freshRecordingTracker = freshRecordingTracker;
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;
  }

  /**
   * Returns a PerformanceTraceFormatter configured to resolve function
   * code from source maps using the active page target.
   *
   * Note: Function code resolution from source maps is only supported for fresh
   * recordings (recorded in the current session on the active target page). For
   * imported traces, it returns null to prevent mismatched source resolution.
   */
  createFormatter(): PerformanceTraceFormatter {
    const focus = this.#focus;
    const target = this.#targetManager.primaryPageTarget();
    const formatter = new PerformanceTraceFormatter(focus);
    const isFresh = this.#freshRecordingTracker.recordingIsFresh(focus.parsedTrace);

    formatter.resolveFunctionCode = async (url: UrlString, line: number, column: number) => {
      if (!target || !isFresh) {
        return null;
      }
      return await SourceMapScopes.FunctionCodeResolver.getFunctionCodeFromLocation(
          target, url, line, column, this.#debuggerWorkspaceBinding,
          {contextLength: 200, contextLineLength: 5, appendProfileData: true});
    };
    return formatter;
  }

  override getURL(): string {
    const url = this.#focus.parsedTrace.data.Meta.mainFrameURL;
    try {
      new URL(url);
      return url;
    } catch {
      const {min, max} = this.#focus.parsedTrace.data.Meta.traceBounds;
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
  override getOrigin(): string {
    const parsedTrace = this.#focus.parsedTrace;
    const url = this.getURL();
    const origin = extractContextOrigin(url);
    const isFresh = this.#freshRecordingTracker.recordingIsFresh(parsedTrace);
    if (!isFresh) {
      const parsed = Common.ParsedURL.ParsedURL.fromString(origin as Platform.DevToolsPath.UrlString);
      return `imported-trace://${parsed ? parsed.domain() : origin}`;
    }
    return origin;
  }

  override getItem(): AgentFocus {
    return this.#focus;
  }

  override getTitle(): string {
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
  override async getSuggestions(): Promise<ConversationSuggestions|undefined> {
    const focus = this.#focus;

    if (focus.callTree) {
      return [
        {title: 'What\'s the purpose of this work?', jslogContext: 'performance-default'},
        {title: 'Where is time being spent?', jslogContext: 'performance-default'},
        {title: 'How can I optimize this?', jslogContext: 'performance-default'},
      ];
    }

    if (focus.insight) {
      return new PerformanceInsightFormatter(focus, focus.insight).getSuggestions();
    }

    const suggestions: ConversationSuggestions =
        [{title: 'What performance issues exist with my page?', jslogContext: 'performance-default'}];

    const insightSet = focus.primaryInsightSet;
    if (insightSet) {
      const lcp = Trace.Insights.Common.getLCP(insightSet);
      const cls = Trace.Insights.Common.getCLS(insightSet);
      const inp = Trace.Insights.Common.getINP(insightSet);

      const ModelHandlers = Trace.Handlers.ModelHandlers;
      const GOOD = Trace.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.GOOD;

      const poorMetrics = new Set<Trace.Insights.Types.InsightKeys>();

      if (lcp && ModelHandlers.PageLoadMetrics.scoreClassificationForLargestContentfulPaint(lcp.value) !== GOOD) {
        suggestions.push({title: 'How can I improve LCP?', jslogContext: 'performance-default'});
        poorMetrics.add(Trace.Insights.Types.InsightKeys.LCP_BREAKDOWN);
        poorMetrics.add(Trace.Insights.Types.InsightKeys.LCP_DISCOVERY);
      }
      if (inp && ModelHandlers.UserInteractions.scoreClassificationForInteractionToNextPaint(inp.value) !== GOOD) {
        suggestions.push({title: 'How can I improve INP?', jslogContext: 'performance-default'});
        poorMetrics.add(Trace.Insights.Types.InsightKeys.INP_BREAKDOWN);
      }
      if (cls && ModelHandlers.LayoutShifts.scoreClassificationForLayoutShift(cls.value) !== GOOD) {
        suggestions.push({title: 'How can I improve CLS?', jslogContext: 'performance-default'});
        poorMetrics.add(Trace.Insights.Types.InsightKeys.CLS_CULPRITS);
      }

      // Add up to 4 suggestions total (including those already added) from the top failing insights
      // that aren't already covered by CWV suggestions.
      const additionalSuggestionsRequired = Math.max(0, 4 - suggestions.length);
      if (additionalSuggestionsRequired > 0) {
        const failingInsightSuggestions =
            Object.values(insightSet.model)
                .filter(model => {
                  return model.state !== 'pass' && Trace.Insights.Common.isInsightKey(model.insightKey) &&
                      !poorMetrics.has(model.insightKey);
                })
                .map(model => new PerformanceInsightFormatter(focus, model).getSuggestions().at(-1))
                .filter((suggestion): suggestion is ConversationSuggestions[number] => !!suggestion)
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
  override async getPromptDetails(): Promise<string|null> {
    const formatter = this.createFormatter();

    const details: string[] = [];

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
  override async getUserFacingDetails(): Promise<[ContextDetail, ...ContextDetail[]]|null> {
    const formatter = this.createFormatter();

    const details: ContextDetail[] = [];

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

    return details.length > 0 ? (details as [ContextDetail, ...ContextDetail[]]) : null;
  }

  /**
   * Returns initial UI widgets to display with the conversation context header
   * depending on the active focus:
   * - Specific task (call tree) -> timeline summary & bottom up tree widgets
   * - Insight -> PERF_INSIGHT widget & Core Web Vitals widget
   * - Whole Trace -> Core Web Vitals widget
   */
  override async getWidgets(): Promise<AiWidget[]> {
    const widgets: AiWidget[] = [];
    const focus = this.#focus;

    // Case 1: Specific task (call tree) -> timeline summary & bottom up tree widgets
    if (focus.callTree) {
      const event = focus.callTree.selectedNode?.event ?? focus.callTree.rootNode.event;
      if (event) {
        const {startTime, endTime} = Trace.Helpers.Timing.eventTimingsMicroSeconds(event);
        const bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(startTime, endTime);
        widgets.push({
          name: 'TIMELINE_RANGE_SUMMARY',
          data: {
            bounds,
            parsedTrace: focus.parsedTrace,
            track: 'main',
          },
        });
        widgets.push({
          name: 'BOTTOM_UP_TREE',
          data: {
            bounds,
            parsedTrace: focus.parsedTrace,
          },
        });
      }
      return widgets;
    }

    // Case 2: Insight -> PERF_INSIGHT widget
    if (focus.insight) {
      const insightKey = focus.insight.insightKey;
      if (Trace.Insights.Common.isInsightKey(insightKey)) {
        widgets.push({
          name: 'PERF_INSIGHT',
          data: {
            insight: insightKey,
            insightData: focus.insight,
          },
        });
      }
    }

    // Case 3: Whole Trace or insight -> CWV widget
    const primaryInsightSet = focus.primaryInsightSet;
    if (primaryInsightSet) {
      widgets.push({
        name: 'CORE_VITALS',
        data: {
          parsedTrace: focus.parsedTrace,
          insightSetKey: primaryInsightSet.id,
        },
      });
    }

    return widgets;
  }

  getBoundsForLabel(label: MainThreadSectionLabel): Trace.Types.Timing.TraceWindowMicro|null {
    const focus = this.#focus;
    const {parsedTrace} = focus;
    const insightSet = focus.primaryInsightSet;

    if (label === 'nav-to-lcp') {
      if (insightSet) {
        const lcp = Trace.Insights.Common.getLCP(insightSet);
        if (lcp) {
          return Trace.Helpers.Timing.traceWindowFromMicroSeconds(insightSet.bounds.min,
                                                                  lcp.event.ts as Trace.Types.Timing.Micro);
        }
      }
      return null;
    }

    if (label === 'lcp-ttfb') {
      if (insightSet) {
        const subparts = insightSet.model.LCPBreakdown?.subparts;
        if (subparts?.ttfb) {
          return subparts.ttfb;
        }
      }
      return null;
    }

    if (label === 'lcp-render-delay') {
      if (insightSet) {
        const subparts = insightSet.model.LCPBreakdown?.subparts;
        if (subparts?.renderDelay) {
          return subparts.renderDelay;
        }
      }
      return null;
    }

    if (label === 'trace-bounds') {
      return parsedTrace.data.Meta.traceBounds;
    }

    const insightSetById = parsedTrace.insights?.get(label as Trace.Types.Events.NavigationId);
    if (insightSetById) {
      return insightSetById.bounds;
    }

    if (insightSet) {
      const model = getInsightModel(insightSet.model, label);
      if (model) {
        return Trace.Insights.Common.insightBounds(model, insightSet.bounds);
      }
    }

    for (const is of parsedTrace.insights?.values() ?? []) {
      const model = getInsightModel(is.model, label);
      if (model) {
        return Trace.Insights.Common.insightBounds(model, is.bounds);
      }
    }

    return null;
  }

  getLabelName(label: MainThreadSectionLabel): string {
    return getLabelName(label, this.#focus.parsedTrace);
  }

  createBounds(min?: number, max?: number): Trace.Types.Timing.TraceWindowMicro|null {
    const {min: bMin, max: bMax} = this.#focus.parsedTrace.data.Meta.traceBounds;
    const clampedMin = Math.round(Math.max(min ?? bMin, bMin));
    const clampedMax = Math.round(Math.min(max ?? bMax, bMax));

    if (clampedMin > clampedMax) {
      return null;
    }

    return Trace.Helpers.Timing.traceWindowFromMicroSeconds(clampedMin as Trace.Types.Timing.Micro,
                                                            clampedMax as Trace.Types.Timing.Micro);
  }
}

const STATIC_LABEL_NAMES: Record<string, string> = {
  'nav-to-lcp': 'navigation to LCP',
  'lcp-ttfb': 'LCP to TTFB',
  'lcp-render-delay': 'LCP render delay',
  'trace-bounds': 'the entire trace',
  NO_NAVIGATION: 'the period before the first navigation',
};

function getInsightModel(
    model: Trace.Insights.Types.InsightModels,
    key: string,
    ): Trace.Insights.Types.InsightModels[keyof Trace.Insights.Types.InsightModels]|undefined {
  if (Object.prototype.hasOwnProperty.call(model, key)) {
    return model[key as keyof Trace.Insights.Types.InsightModels];
  }
  return undefined;
}

function getLabelName(label: MainThreadSectionLabel, parsedTrace: Trace.TraceModel.ParsedTrace): string {
  if (Object.prototype.hasOwnProperty.call(STATIC_LABEL_NAMES, label)) {
    return STATIC_LABEL_NAMES[label];
  }

  const insightSetById = parsedTrace.insights?.get(label as Trace.Types.Events.NavigationId);
  if (insightSetById) {
    return `navigation to ${insightSetById.url.href}`;
  }

  for (const insightSet of parsedTrace.insights?.values() ?? []) {
    const model = getInsightModel(insightSet.model, label);
    if (model) {
      return `${model.title} insight`;
    }
  }

  return label;
}

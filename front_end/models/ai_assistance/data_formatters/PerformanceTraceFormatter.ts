// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as TimelineUtils from '../../../panels/timeline/utils/utils.js';
import * as Trace from '../../trace/trace.js';

import {PerformanceInsightFormatter, TraceEventFormatter} from './PerformanceInsightFormatter.js';

const ms = (ms: number): string => `${Platform.NumberUtilities.floor(ms, 1)} ms`;
const kb = (bytes: number): string => `${Math.round(bytes / 1000)} kB`;

export class PerformanceTraceFormatter {
  #parsedTrace: Trace.Handlers.Types.ParsedTrace;
  #insightSet: Trace.Insights.Types.InsightSet|null;
  #traceMetadata: Trace.Types.File.MetaData;
  #eventsSerializer: TimelineUtils.EventsSerializer.EventsSerializer;

  constructor(
      focus: TimelineUtils.AIContext.AgentFocus, eventsSerializer: TimelineUtils.EventsSerializer.EventsSerializer) {
    if (focus.data.type !== 'full') {
      throw new Error('unexpected agent focus');
    }

    this.#parsedTrace = focus.data.parsedTrace;
    this.#insightSet = focus.data.insightSet;
    this.#traceMetadata = focus.data.traceMetadata;
    this.#eventsSerializer = eventsSerializer;
  }

  serializeEvent(event: Trace.Types.Events.Event): string {
    const key = this.#eventsSerializer.keyForEvent(event);
    return `(eventKey: ${key}, ts: ${event.ts})`;
  }

  serializeBounds(bounds: Trace.Types.Timing.TraceWindowMicro): string {
    return `{min: ${bounds.min}, max: ${bounds.max}}`;
  }

  formatTraceSummary(): string {
    const parsedTrace = this.#parsedTrace;
    const insightSet = this.#insightSet;
    const traceMetadata = this.#traceMetadata;

    const parts = [];

    const lcp = insightSet ? Trace.Insights.Common.getLCP(insightSet) : null;
    const cls = insightSet ? Trace.Insights.Common.getCLS(insightSet) : null;
    const inp = insightSet ? Trace.Insights.Common.getINP(insightSet) : null;

    parts.push(`URL: ${parsedTrace.Meta.mainFrameURL}`);
    parts.push(`Bounds: ${this.serializeBounds(parsedTrace.Meta.traceBounds)}`);
    parts.push('CPU throttling: ' + (traceMetadata.cpuThrottling ? `${traceMetadata.cpuThrottling}x` : 'none'));
    parts.push(`Network throttling: ${traceMetadata.networkThrottling ?? 'none'}`);
    if (lcp || cls || inp) {
      parts.push('Metrics:');
      if (lcp) {
        parts.push(`  - LCP: ${Math.round(lcp.value / 1000)} ms, event: ${this.serializeEvent(lcp.event)}`);
      }
      if (inp) {
        parts.push(`  - INP: ${Math.round(inp.value / 1000)} ms, event: ${this.serializeEvent(inp.event)}`);
      }
      if (cls) {
        const eventText = cls.worstClusterEvent ? `, event: ${this.serializeEvent(cls.worstClusterEvent)}` : '';
        parts.push(`  - CLS: ${cls.value}${eventText}`);
      }
    } else {
      parts.push('Metrics: n/a');
    }

    if (insightSet) {
      parts.push('Available insights:');
      for (const [insightName, model] of Object.entries(insightSet.model)) {
        if (model.state === 'pass') {
          continue;
        }

        const formatter = new PerformanceInsightFormatter(parsedTrace, model);
        if (!formatter.insightIsSupported()) {
          continue;
        }

        const insightBounds = TimelineUtils.InsightAIContext.insightBounds(model, insightSet.bounds);
        const insightParts = [
          `insight name: ${insightName}`,
          `description: ${model.description}`,
          `relevant trace bounds: ${this.serializeBounds(insightBounds)}`,
        ];
        const metricSavingsText = formatter.estimatedSavings();
        if (metricSavingsText) {
          insightParts.push(`estimated metric savings: ${metricSavingsText}`);
        }
        if (model.wastedBytes) {
          insightParts.push(`estimated wasted bytes: ${kb(model.wastedBytes)}`);
        }
        for (const suggestion of formatter.getSuggestions()) {
          insightParts.push(`example question: ${suggestion.title}`);
        }
        const insightPartsText = insightParts.join('\n    ');
        parts.push(`  - ${insightPartsText}`);
      }
    } else {
      parts.push('Available insights: none');
    }

    return parts.join('\n');
  }

  formatCriticalRequests(): string {
    const parsedTrace = this.#parsedTrace;
    const insightSet = this.#insightSet;
    const criticalRequests: Trace.Types.Events.SyntheticNetworkRequest[] = [];

    const walkRequest = (node: Trace.Insights.Models.NetworkDependencyTree.CriticalRequestNode): void => {
      criticalRequests.push(node.request);
      node.children.forEach(walkRequest);
    };

    insightSet?.model.NetworkDependencyTree.rootNodes.forEach(walkRequest);
    if (!criticalRequests.length) {
      return '';
    }

    return 'Critical network requests:\n' +
        TraceEventFormatter.networkRequests(criticalRequests, parsedTrace, {verbose: false});
  }

  #serializeBottomUpRootNode(rootNode: Trace.Extras.TraceTree.BottomUpRootNode, limit: number): string {
    // Sorted by selfTime.
    // No nodes less than 1 ms.
    // Limit.
    const topNodes = [...rootNode.children().values()]
                         .filter(n => n.totalTime >= 1)
                         .sort((a, b) => b.selfTime - a.selfTime)
                         .slice(0, limit);

    function nodeToText(node: Trace.Extras.TraceTree.Node): string {
      const event = node.event;

      let frame = Trace.Helpers.Trace.getZeroIndexedStackTraceInEventPayload(event)?.[0];
      if (Trace.Types.Events.isProfileCall(event)) {
        frame = event.callFrame;
      }

      let source = TimelineUtils.EntryName.nameForEntry(event);
      if (frame?.url) {
        source += ` (url: ${frame.url}`;
        if (frame.lineNumber !== -1) {
          source += `, line: ${frame.lineNumber}`;
        }
        if (frame.columnNumber !== -1) {
          source += `, column: ${frame.columnNumber}`;
        }
        source += ')';
      }

      return `- self: ${ms(node.selfTime)}, total: ${ms(node.totalTime)}, source: ${source}`;
    }

    const listText = topNodes.map(nodeToText).join('\n');
    const format = `This is the bottom-up summary for the entire trace. Only the top ${
        limit} activities (sorted by self time) are shown. An activity is all the aggregated time spent on the same type of work. For example, it can be all the time spent in a specific JavaScript function, or all the time spent in a specific browser rendering stage (like layout, v8 compile, parsing html). "Self time" represents the aggregated time spent directly in an activity, across all occurrences. "Total time" represents the aggregated time spent in an activity or any of its children.`;
    return `${format}\n\n${listText}`;
  }

  formatMainThreadBottomUpSummary(): string {
    const parsedTrace = this.#parsedTrace;
    const insightSet = this.#insightSet;

    const bounds = parsedTrace.Meta.traceBounds;
    const rootNode = TimelineUtils.InsightAIContext.AIQueries.mainThreadActivityBottomUp(
        insightSet?.navigation?.args.data?.navigationId,
        bounds,
        parsedTrace,
    );
    if (!rootNode) {
      return '';
    }

    return this.#serializeBottomUpRootNode(rootNode, 10);
  }

  formatThirdPartySummary(): string {
    const insightSet = this.#insightSet;
    if (!insightSet) {
      return '';
    }

    const thirdParties = insightSet.model.ThirdParties;
    let summaries = thirdParties.entitySummaries ?? [];
    if (thirdParties.firstPartyEntity) {
      summaries = summaries.filter(s => s.entity !== thirdParties?.firstPartyEntity || null);
    }
    const topMainThreadTimeEntries = summaries.toSorted((a, b) => b.mainThreadTime - a.mainThreadTime).slice(0, 5);
    if (!topMainThreadTimeEntries.length) {
      return '';
    }

    const listText = topMainThreadTimeEntries
                         .map(s => {
                           const transferSize = `${kb(s.transferSize)}`;
                           return `- name: ${s.entity.name}, main thread time: ${
                               ms(s.mainThreadTime)}, network transfer size: ${transferSize}`;
                         })
                         .join('\n');
    return `Third party summary:\n${listText}`;
  }

  formatLongestTasks(): string {
    const parsedTrace = this.#parsedTrace;
    const insightSet = this.#insightSet;

    const bounds = parsedTrace.Meta.traceBounds;
    const longestTaskTrees = TimelineUtils.InsightAIContext.AIQueries.longestTasks(
        insightSet?.navigation?.args.data?.navigationId, bounds, parsedTrace, 3);
    if (!longestTaskTrees || longestTaskTrees.length === 0) {
      return 'Longest tasks: none';
    }

    const listText = longestTaskTrees
                         .map(tree => {
                           const time = ms(tree.rootNode.totalTime);
                           return `- total time: ${time}, event: ${this.serializeEvent(tree.rootNode.event)}`;
                         })
                         .join('\n');
    return `Longest ${longestTaskTrees.length} tasks:\n${listText}`;
  }

  formatMainThreadTrackSummary(min: Trace.Types.Timing.Micro, max: Trace.Types.Timing.Micro): string {
    const results = [];

    const topDownTree = TimelineUtils.InsightAIContext.AIQueries.mainThreadActivityTopDown(
        this.#insightSet?.navigation?.args.data?.navigationId,
        {min, max, range: (max - min) as Trace.Types.Timing.Micro},
        this.#parsedTrace,
    );
    if (topDownTree) {
      results.push('# Top-down main thread summary');
      results.push(topDownTree.serialize(2 /* headerLevel */));
    }

    const bottomUpRootNode = TimelineUtils.InsightAIContext.AIQueries.mainThreadActivityBottomUp(
        this.#insightSet?.navigation?.args.data?.navigationId,
        {min, max, range: (max - min) as Trace.Types.Timing.Micro},
        this.#parsedTrace,
    );
    if (bottomUpRootNode) {
      results.push('# Bottom-up main thread summary');
      results.push(this.#serializeBottomUpRootNode(bottomUpRootNode, 20));
    }

    const insightNameToRelatedEvents = new Map<string, Trace.Types.Events.Event[]>();
    if (this.#insightSet) {
      for (const model of Object.values(this.#insightSet.model)) {
        if (!model.relatedEvents) {
          continue;
        }

        const relatedEvents =
            Array.isArray(model.relatedEvents) ? model.relatedEvents : [...model.relatedEvents.keys()];
        if (!relatedEvents.length) {
          continue;
        }

        const events = [];
        if (topDownTree) {
          events.push(...relatedEvents.filter(e => topDownTree.rootNode.events.includes(e)));
        }
        if (bottomUpRootNode) {
          events.push(...relatedEvents.filter(e => bottomUpRootNode.events.includes(e)));
        }
        if (events.length) {
          insightNameToRelatedEvents.set(model.insightKey, events);
        }
      }
    }

    if (insightNameToRelatedEvents.size) {
      results.push('# Related insights');
      results.push(
          'Here are all the insights that contain some related event from the main thread in the given range.');
      for (const [insightKey, events] of insightNameToRelatedEvents) {
        // Limit to 5, because some insights (namely ThirdParties) can have a huge
        // number of related events. Mostly, insights probably don't have more than
        // 5.
        const eventsString = events.slice(0, 5)
                                 .map(e => TimelineUtils.EntryName.nameForEntry(e) + ' ' + this.serializeEvent(e))
                                 .join(', ');
        results.push(`- ${insightKey}: ${eventsString}`);
      }
    }

    // TODO(b/425270067): add third party summary

    if (!results.length) {
      return 'No main thread activity found';
    }

    return results.join('\n\n');
  }
}

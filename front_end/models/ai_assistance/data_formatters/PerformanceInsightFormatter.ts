// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as TimelineUtils from '../../../panels/timeline/utils/utils.js';
import * as Trace from '../../trace/trace.js';

import {
  NetworkRequestFormatter,
} from './NetworkRequestFormatter.js';

function formatMilli(x: number|undefined): string {
  if (x === undefined) {
    return '';
  }
  return i18n.TimeUtilities.preciseMillisToString(x, 2);
}

function formatMicro(x: number|undefined): string {
  if (x === undefined) {
    return '';
  }
  return formatMilli(Trace.Helpers.Timing.microToMilli(x as Trace.Types.Timing.Micro));
}

/**
 * For a given frame ID and navigation ID, returns the LCP Event and the LCP Request, if the resource was an image.
 */
function getLCPData(parsedTrace: Trace.Handlers.Types.ParsedTrace, frameId: string, navigationId: string): {
  lcpEvent: Trace.Types.Events.LargestContentfulPaintCandidate,
  metricScore: Trace.Handlers.ModelHandlers.PageLoadMetrics.LCPMetricScore,
  lcpRequest?: Trace.Types.Events.SyntheticNetworkRequest,
}|null {
  const navMetrics = parsedTrace.PageLoadMetrics.metricScoresByFrameId.get(frameId)?.get(navigationId);
  if (!navMetrics) {
    return null;
  }

  const metric = navMetrics.get(Trace.Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP);
  if (!metric || !Trace.Handlers.ModelHandlers.PageLoadMetrics.metricIsLCP(metric)) {
    return null;
  }
  const lcpEvent = metric?.event;
  if (!lcpEvent || !Trace.Types.Events.isLargestContentfulPaintCandidate(lcpEvent)) {
    return null;
  }

  return {
    lcpEvent,
    lcpRequest: parsedTrace.LargestImagePaint.lcpRequestByNavigationId.get(navigationId),
    metricScore: metric,
  };
}

export class PerformanceInsightFormatter {
  #insight: Trace.Insights.Types.InsightModel;
  #parsedTrace: Trace.Handlers.Types.ParsedTrace;
  constructor(activeInsight: TimelineUtils.InsightAIContext.ActiveInsight) {
    this.#insight = activeInsight.insight;
    this.#parsedTrace = activeInsight.parsedTrace;
  }

  /**
   * Information about LCP which we pass to the LLM for all insights that relate to LCP.
   */
  #lcpMetricSharedContext(): string {
    if (!this.#insight.navigationId) {
      // No navigation ID = no LCP.
      return '';
    }
    if (!this.#insight.frameId || !this.#insight.navigationId) {
      return '';
    }

    const data = getLCPData(this.#parsedTrace, this.#insight.frameId, this.#insight.navigationId);
    if (!data) {
      return '';
    }
    const {metricScore, lcpRequest} = data;

    const parts: string[] = [
      `The Largest Contentful Paint (LCP) time for this navigation was ${formatMicro(metricScore.timing)}.`,
    ];
    if (lcpRequest) {
      parts.push(`The LCP resource was fetched from \`${lcpRequest.args.data.url}\`.`);
    } else {
      parts.push('The LCP is text based and was not fetched from the network.');
    }

    return parts.join('\n');
  }

  insightIsSupported(): boolean {
    return this.#description().length > 0;
  }

  formatInsight(): string {
    const {title} = this.#insight;
    return `## Insight Title: ${title}

## Insight Summary:
${this.#description()}

## Detailed analysis:
${this.#details()}

## External resources:
${this.#links()}`;
  }

  #details(): string {
    if (Trace.Insights.Models.LCPBreakdown.isLCPBreakdown(this.#insight)) {
      const {subparts, lcpMs} = this.#insight;
      if (!lcpMs || !subparts) {
        return '';
      }

      // Text based LCP has TTFB & Render delay
      // Image based has TTFB, Load delay, Load time and Render delay
      // Note that we expect every trace + LCP to have TTFB + Render delay, but
      // very old traces are missing the data, so we have to code defensively
      // in case the subparts are not present.
      const phaseBulletPoints: Array<{name: string, value: string, percentage: string}> = [];

      Object.values(subparts).forEach((subpart: Trace.Insights.Models.LCPBreakdown.Subpart) => {
        const phaseMilli = Trace.Helpers.Timing.microToMilli(subpart.range);
        const percentage = (phaseMilli / lcpMs * 100).toFixed(1);
        phaseBulletPoints.push({name: subpart.label, value: formatMilli(phaseMilli), percentage});
      });

      return `${this.#lcpMetricSharedContext()}

We can break this time down into the ${phaseBulletPoints.length} phases that combine to make the LCP time:

${
          phaseBulletPoints.map(phase => `- ${phase.name}: ${phase.value} (${phase.percentage}% of total LCP time)`)
              .join('\n')}`;
    }

    if (Trace.Insights.Models.LCPDiscovery.isLCPDiscovery(this.#insight)) {
      const {checklist, lcpEvent, lcpRequest, earliestDiscoveryTimeTs} = this.#insight;
      if (!checklist || !lcpEvent || !lcpRequest || !earliestDiscoveryTimeTs) {
        return '';
      }

      const checklistBulletPoints: Array<{name: string, passed: boolean}> = [];
      checklistBulletPoints.push({
        name: checklist.priorityHinted.label,
        passed: checklist.priorityHinted.value,
      });
      checklistBulletPoints.push({
        name: checklist.eagerlyLoaded.label,
        passed: checklist.eagerlyLoaded.value,
      });
      checklistBulletPoints.push({
        name: checklist.requestDiscoverable.label,
        passed: checklist.requestDiscoverable.value,
      });

      return `${this.#lcpMetricSharedContext()}

The result of the checks for this insight are:
${checklistBulletPoints.map(point => `- ${point.name}: ${point.passed ? 'PASSED' : 'FAILED'}`).join('\n')}`;
    }

    if (Trace.Insights.Models.RenderBlocking.isRenderBlocking(this.#insight)) {
      const requestSummary = this.#insight.renderBlockingRequests.map(
          r => TraceEventFormatter.networkRequest(r, this.#parsedTrace, {verbose: false}));

      if (requestSummary.length === 0) {
        return 'There are no network requests that are render blocking.';
      }

      return `Here is a list of the network requests that were render blocking on this page and their duration:

${requestSummary.join('\n\n')}`;
    }

    if (Trace.Insights.Models.DocumentLatency.isDocumentLatency(this.#insight)) {
      if (!this.#insight.data) {
        return '';
      }
      const {checklist, documentRequest} = this.#insight.data;
      if (!documentRequest) {
        return '';
      }
      const checklistBulletPoints: Array<{name: string, passed: boolean}> = [];
      checklistBulletPoints.push({
        name: 'The request was not redirected',
        passed: checklist.noRedirects.value,
      });
      checklistBulletPoints.push({
        name: 'Server responded quickly',
        passed: checklist.serverResponseIsFast.value,
      });
      checklistBulletPoints.push({
        name: 'Compression was applied',
        passed: checklist.usesCompression.value,
      });

      return `${this.#lcpMetricSharedContext()}

${TraceEventFormatter.networkRequest(documentRequest, this.#parsedTrace, {
        verbose: true,
        customTitle: 'Document network request'
      })}

The result of the checks for this insight are:
${checklistBulletPoints.map(point => `- ${point.name}: ${point.passed ? 'PASSED' : 'FAILED'}`).join('\n')}`;
    }

    if (Trace.Insights.Models.INPBreakdown.isINPBreakdown(this.#insight)) {
      const event = this.#insight.longestInteractionEvent;
      if (!event) {
        return '';
      }

      const inpInfoForEvent =
          `The longest interaction on the page was a \`${event.type}\` which had a total duration of \`${
              formatMicro(event.dur)}\`. The timings of each of the three phases were:

1. Input delay: ${formatMicro(event.inputDelay)}
2. Processing duration: ${formatMicro(event.mainThreadHandling)}
3. Presentation delay: ${formatMicro(event.presentationDelay)}.`;

      return inpInfoForEvent;
    }

    if (Trace.Insights.Models.CLSCulprits.isCLSCulprits(this.#insight)) {
      const {worstCluster, shifts} = this.#insight;
      if (!worstCluster) {
        return '';
      }

      const baseTime = this.#parsedTrace.Meta.traceBounds.min;

      const clusterTimes = {
        start: worstCluster.ts - baseTime,
        end: worstCluster.ts + worstCluster.dur - baseTime,
      } as const;

      const shiftsFormatted = worstCluster.events.map((layoutShift, index) => {
        return TraceEventFormatter.layoutShift(layoutShift, index, this.#parsedTrace, shifts.get(layoutShift));
      });

      return `The worst layout shift cluster was the cluster that started at ${
          formatMicro(clusterTimes.start)} and ended at ${formatMicro(clusterTimes.end)}, with a duration of ${
          formatMicro(worstCluster.dur)}.
The score for this cluster is ${worstCluster.clusterCumulativeScore.toFixed(4)}.

Layout shifts in this cluster:
${shiftsFormatted.join('\n')}`;
    }

    return '';
  }

  #links(): string {
    switch (this.#insight.insightKey) {
      case 'CLSCulprits':
        return `- https://wdeb.dev/articles/cls
- https://web.dev/articles/optimize-cls`;
      case 'DocumentLatency':
        return '- https://web.dev/articles/optimize-ttfb';
      case 'DOMSize':
        return '';
      case 'DuplicatedJavaScript':
        return '';
      case 'FontDisplay':
        return '';
      case 'ForcedReflow':
        return '';
      case 'ImageDelivery':
        return '';
      case 'INPBreakdown':
        return `- https://web.dev/articles/inp
- https://web.dev/explore/how-to-optimize-inp
- https://web.dev/articles/optimize-long-tasks
- https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing`;
      case 'LCPDiscovery':
        return `- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp`;
      case 'LCPBreakdown':
        return `- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp`;
      case 'NetworkDependencyTree':
        return '';
      case 'RenderBlocking':
        return `- https://web.dev/articles/lcp
- https://web.dev/articles/optimize-lcp`;
      case 'SlowCSSSelector':
        return '';
      case 'ThirdParties':
        return '';
      case 'Viewport':
        return '';
      case 'Cache':
        return '';
      case 'ModernHTTP':
        return '';
      case 'LegacyJavaScript':
        return '';
    }
  }

  #description(): string {
    switch (this.#insight.insightKey) {
      case 'CLSCulprits':
        return `Cumulative Layout Shifts (CLS) is a measure of the largest burst of layout shifts for every unexpected layout shift that occurs during the lifecycle of a page. This is a Core Web Vital and the thresholds for categorizing a score are:
- Good: 0.1 or less
- Needs improvement: more than 0.1 and less than or equal to 0.25
- Bad: over 0.25`;
      case 'DocumentLatency':
        return `This insight checks that the first request is responded to promptly. We use the following criteria to check this:
1. Was the initial request redirected?
2. Did the server respond in 600ms or less? We want developers to aim for as close to 100ms as possible, but our threshold for this insight is 600ms.
3. Was there compression applied to the response to minimize the transfer size?`;
      case 'DOMSize':
        return '';
      case 'DuplicatedJavaScript':
        return '';
      case 'FontDisplay':
        return '';
      case 'ForcedReflow':
        return '';
      case 'ImageDelivery':
        return '';
      case 'INPBreakdown':
        return `Interaction to Next Paint (INP) is a metric that tracks the responsiveness of the page when the user interacts with it. INP is a Core Web Vital and the thresholds for how we categorize a score are:
- Good: 200 milliseconds or less.
- Needs improvement: more than 200 milliseconds and 500 milliseconds or less.
- Bad: over 500 milliseconds.

For a given slow interaction, we can break it down into 3 phases:
1. Input delay: starts when the user initiates an interaction with the page, and ends when the event callbacks for the interaction begin to run.
2. Processing duration: the time it takes for the event callbacks to run to completion.
3. Presentation delay: the time it takes for the browser to present the next frame which contains the visual result of the interaction.

The sum of these three phases is the total latency. It is important to optimize each of these phases to ensure interactions take as little time as possible. Focusing on the phase that has the largest score is a good way to start optimizing.`;
      case 'LCPDiscovery':
        return `This insight analyzes the time taken to discover the LCP resource and request it on the network. It only applies if LCP element was a resource like an image that has to be fetched over the network. There are 3 checks this insight makes:
1. Did the resource have \`fetchpriority=high\` applied?
2. Was the resource discoverable in the initial document, rather than injected from a script or stylesheet?
3. The resource was not lazy loaded as this can delay the browser loading the resource.

It is important that all of these checks pass to minimize the delay between the initial page load and the LCP resource being loaded.`;
      case 'LCPBreakdown':
        return 'This insight is used to analyze the time spent that contributed to the final LCP time and identify which of the 4 phases (or 2 if there was no LCP resource) are contributing most to the delay in rendering the LCP element.';
      case 'NetworkDependencyTree':
        return '';
      case 'RenderBlocking':
        return 'This insight identifies network requests that were render blocking. Render blocking requests are impactful because they are deemed critical to the page and therefore the browser stops rendering the page until it has dealt with these resources. For this insight make sure you fully inspect the details of each render blocking network request and prioritize your suggestions to the user based on the impact of each render blocking request.';
      case 'SlowCSSSelector':
        return '';
      case 'ThirdParties':
        return '';
      case 'Viewport':
        return '';
      case 'Cache':
        return '';
      case 'ModernHTTP':
        return '';
      case 'LegacyJavaScript':
        return '';
    }
  }
}

export interface NetworkRequestFormatOptions {
  verbose: boolean;
  customTitle?: string;
}

export class TraceEventFormatter {
  static layoutShift(
      shift: Trace.Types.Events.SyntheticLayoutShift, index: number, parsedTrace: Trace.Handlers.Types.ParsedTrace,
      rootCauses?: Trace.Insights.Models.CLSCulprits.LayoutShiftRootCausesData): string {
    const baseTime = parsedTrace.Meta.traceBounds.min;

    const potentialRootCauses: string[] = [];
    if (rootCauses) {
      rootCauses.iframes.forEach(
          iframe => potentialRootCauses.push(
              `An iframe (id: ${iframe.frame}, url: ${iframe.url ?? 'unknown'} was injected into the page)`));
      rootCauses.webFonts.forEach(req => {
        potentialRootCauses.push(`A font that was loaded over the network (${req.args.data.url}).`);
      });
      // TODO(b/413285103): use the nice strings for non-composited animations.
      // The code for this lives in TimelineUIUtils but that cannot be used
      // within models. We should move it and then expose the animations info
      // more nicely.
      rootCauses.nonCompositedAnimations.forEach(_ => {
        potentialRootCauses.push('A non composited animation.');
      });
      rootCauses.unsizedImages.forEach(img => {
        // TODO(b/413284569): if we store a nice human readable name for this
        // image in the trace metadata, we can do something much nicer here.
        const url = img.paintImageEvent.args.data.url;
        const nodeName = img.paintImageEvent.args.data.nodeName;
        const extraText = url ? `url: ${url}` : `id: ${img.backendNodeId}`;
        potentialRootCauses.push(`An unsized image (${nodeName}) (${extraText}).`);
      });
    }
    const rootCauseText = potentialRootCauses.length ?
        `- Potential root causes:\n  - ${potentialRootCauses.join('\n  - ')}` :
        '- No potential root causes identified';

    return `### Layout shift ${index + 1}:
- Start time: ${formatMicro(shift.ts - baseTime)}
- Score: ${shift.args.data?.weighted_score_delta.toFixed(4)}
${rootCauseText}`;
  }
  /**
   * This is the data passed to a network request when the Performance Insights
   * agent is asking for information. It is a slimmed down version of the
   * request's data to avoid using up too much of the context window.
   * IMPORTANT: these set of fields have been reviewed by Chrome Privacy &
   * Security; be careful about adding new data here. If you are in doubt please
   * talk to jacktfranklin@.
   */
  static networkRequest(
      request: Trace.Types.Events.SyntheticNetworkRequest, parsedTrace: Trace.Handlers.Types.ParsedTrace,
      options: NetworkRequestFormatOptions): string {
    const {url, statusCode, initialPriority, priority, fromServiceWorker, mimeType, responseHeaders, syntheticData} =
        request.args.data;

    const titlePrefix = `## ${options.customTitle ?? 'Network request'}`;

    // Note: unlike other agents, we do have the ability to include
    // cross-origins, hence why we do not sanitize the URLs here.
    const navigationForEvent = Trace.Helpers.Trace.getNavigationForTraceEvent(
        request,
        request.args.data.frame,
        parsedTrace.Meta.navigationsByFrameId,
    );
    const baseTime = navigationForEvent?.ts ?? parsedTrace.Meta.traceBounds.min;

    // Gets all the timings for this request, relative to the base time.
    // Note that this is the start time, not total time. E.g. "queuedAt: X"
    // means that the request was queued at Xms, not that it queued for Xms.
    const startTimesForLifecycle = {
      queuedAt: request.ts - baseTime,
      requestSentAt: syntheticData.sendStartTime - baseTime,
      downloadCompletedAt: syntheticData.finishTime - baseTime,
      processingCompletedAt: request.ts + request.dur - baseTime,
    } as const;

    const mainThreadProcessingDuration =
        startTimesForLifecycle.processingCompletedAt - startTimesForLifecycle.downloadCompletedAt;
    const downloadTime = syntheticData.finishTime - syntheticData.downloadStart;

    const renderBlocking = Trace.Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(request);
    const initiator = parsedTrace.NetworkRequests.eventToInitiator.get(request);

    const priorityLines = [];
    if (initialPriority === priority) {
      priorityLines.push(`Priority: ${priority}`);
    } else {
      priorityLines.push(`Initial priority: ${initialPriority}`);
      priorityLines.push(`Final priority: ${priority}`);
    }

    const redirects = request.args.data.redirects.map((redirect, index) => {
      const startTime = redirect.ts - baseTime;
      return `#### Redirect ${index + 1}: ${redirect.url}
- Start time: ${formatMicro(startTime)}
- Duration: ${formatMicro(redirect.dur)}`;
    });

    if (!options.verbose) {
      return `${titlePrefix}: ${url}
- Start time: ${formatMicro(startTimesForLifecycle.queuedAt)}
- Duration: ${formatMicro(request.dur)}
- MIME type: ${mimeType}${renderBlocking ? '\n- This request was render blocking' : ''}`;
    }

    return `${titlePrefix}: ${url}
Timings:
- Queued at: ${formatMicro(startTimesForLifecycle.queuedAt)}
- Request sent at: ${formatMicro(startTimesForLifecycle.requestSentAt)}
- Download complete at: ${formatMicro(startTimesForLifecycle.downloadCompletedAt)}
- Main thread processing completed at: ${formatMicro(startTimesForLifecycle.processingCompletedAt)}
Durations:
- Download time: ${formatMicro(downloadTime)}
- Main thread processing time: ${formatMicro(mainThreadProcessingDuration)}
- Total duration: ${formatMicro(request.dur)}${initiator ? `\nInitiator: ${initiator.args.data.url}` : ''}
Redirects:${redirects.length ? '\n' + redirects.join('\n') : ' no redirects'}
Status code: ${statusCode}
MIME Type: ${mimeType}
${priorityLines.join('\n')}
Render blocking: ${renderBlocking ? 'Yes' : 'No'}
From a service worker: ${fromServiceWorker ? 'Yes' : 'No'}
${NetworkRequestFormatter.formatHeaders('Response headers', responseHeaders ?? [], true)}`;
  }
}

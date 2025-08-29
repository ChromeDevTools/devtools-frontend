// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Trace from '../../trace/trace.js';
import type {ConversationSuggestion} from '../agents/AiAgent.js';

import {
  NetworkRequestFormatter,
} from './NetworkRequestFormatter.js';

function formatMilli(x: number|undefined): string {
  if (x === undefined) {
    return '';
  }
  return i18n.TimeUtilities.preciseMillisToString(x, 2, /* separator */ ' ');
}

function formatMicroToMilli(x: number|undefined): string {
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

  constructor(parsedTrace: Trace.Handlers.Types.ParsedTrace, insight: Trace.Insights.Types.InsightModel) {
    this.#insight = insight;
    this.#parsedTrace = parsedTrace;
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

    const {metricScore, lcpRequest, lcpEvent} = data;
    const theLcpElement =
        lcpEvent.args.data?.nodeName ? `The LCP element (${lcpEvent.args.data.nodeName})` : 'The LCP element';
    const parts: string[] = [
      `The Largest Contentful Paint (LCP) time for this navigation was ${formatMicroToMilli(metricScore.timing)}.`,
    ];

    if (lcpRequest) {
      parts.push(`${theLcpElement} is an image fetched from \`${lcpRequest.args.data.url}\`.`);
      const request = TraceEventFormatter.networkRequests(
          [lcpRequest], this.#parsedTrace, {verbose: true, customTitle: 'LCP resource network request'});
      parts.push(request);
    } else {
      parts.push(`${theLcpElement} is text and was not fetched from the network.`);
    }

    return parts.join('\n');
  }

  insightIsSupported(): boolean {
    return this.#description().length > 0;
  }

  getSuggestions(): [ConversationSuggestion, ...ConversationSuggestion[]] {
    switch (this.#insight.insightKey) {
      case 'CLSCulprits':
        return [
          {title: 'Help me optimize my CLS score'},
          {title: 'How can I prevent layout shifts on this page?'},
        ];
      case 'DocumentLatency':
        return [
          {title: 'How do I decrease the initial loading time of my page?'},
          {title: 'Did anything slow down the request for this document?'},
        ];
      case 'DOMSize':
        return [{title: 'How can I reduce the size of my DOM?'}];
      case 'DuplicatedJavaScript':
        return [
          {title: 'How do I deduplicate the identified scripts in my bundle?'},
          {title: 'Which duplicated JavaScript modules are the most problematic?'}
        ];
      case 'FontDisplay':
        return [
          {title: 'How can I update my CSS to avoid layout shifts caused by incorrect `font-display` properties?'}
        ];
      case 'ForcedReflow':
        return [
          {title: 'How can I avoid layout thrashing?'}, {title: 'What is forced reflow and why is it problematic?'}
        ];
      case 'ImageDelivery':
        return [
          {title: 'What should I do to improve and optimize the time taken to fetch and display images on the page?'},
          {title: 'Are all images on my site optimized?'},
        ];
      case 'INPBreakdown':
        return [
          {title: 'Suggest fixes for my longest interaction'}, {title: 'Why is a large INP score problematic?'},
          {title: 'What\'s the biggest contributor to my longest interaction?'}
        ];
      case 'LCPDiscovery':
        return [
          {title: 'Suggest fixes to reduce my LCP'}, {title: 'What can I do to reduce my LCP discovery time?'},
          {title: 'Why is LCP discovery time important?'}
        ];
      case 'LCPBreakdown':
        return [
          {title: 'Help me optimize my LCP score'}, {title: 'Which LCP phase was most problematic?'},
          {title: 'What can I do to reduce the LCP time for this page load?'}
        ];
      case 'NetworkDependencyTree':
        return [{title: 'How do I optimize my network dependency tree?'}];
      case 'RenderBlocking':
        return [
          {title: 'Show me the most impactful render blocking requests that I should focus on'},
          {title: 'How can I reduce the number of render blocking requests?'}
        ];
      case 'SlowCSSSelector':
        return [{title: 'How can I optimize my CSS to increase the performance of CSS selectors?'}];
      case 'ThirdParties':
        return [{title: 'Which third parties are having the largest impact on my page performance?'}];
      case 'Cache':
        return [{title: 'What caching strategies can I apply to improve my page performance?'}];
      case 'Viewport':
        return [{title: 'How do I make sure my page is optimized for mobile viewing?'}];
      case 'ModernHTTP':
        return [
          {title: 'Is my site using the best HTTP practices?'},
          {title: 'Which resources are not using a modern HTTP protocol?'},
        ];
      case 'LegacyJavaScript':
        return [
          {title: 'Is my site polyfilling modern JavaScript features?'},
          {title: 'How can I reduce the amount of legacy JavaScript on my page?'},
        ];
      default:
        Platform.assertNever(this.#insight.insightKey, 'Unknown insight key');
    }
  }

  /**
   * Formats and outputs the insight's data.
   * Pass `{headingLevel: X}` to determine what heading level to use for the
   * titles in the markdown output. The default is 2 (##).
   */
  formatInsight(opts: {headingLevel: number} = {headingLevel: 2}): string {
    const header = '#'.repeat(opts.headingLevel);

    const {title} = this.#insight;
    return `${header} Insight Title: ${title}

${header} Insight Summary:
${this.#description()}

${header} Detailed analysis:
${this.#details()}

${header} Estimated savings: ${this.estimatedSavings() || 'none'}

${header} External resources:
${this.#links()}`;
  }

  #details(): string {
    if (Trace.Insights.Models.ImageDelivery.isImageDelivery(this.#insight)) {
      const optimizableImages = this.#insight.optimizableImages;
      if (optimizableImages.length === 0) {
        return 'There are no unoptimized images on this page.';
      }

      const imageDetails =
          optimizableImages
              .map(image => {
                // List potential optimizations for the image
                const optimizations =
                    image.optimizations
                        .map(optimization => {
                          const message = Trace.Insights.Models.ImageDelivery.getOptimizationMessage(optimization);
                          const byteSavings = i18n.ByteUtilities.bytesToString(optimization.byteSavings);
                          return `${message} (Est ${byteSavings})`;
                        })
                        .join('\n');

                return `### ${image.request.args.data.url}
- Potential savings: ${i18n.ByteUtilities.bytesToString(image.byteSavings)}
- Optimizations:\n${optimizations}`;
              })
              .join('\n\n');

      return `Total potential savings: ${i18n.ByteUtilities.bytesToString(this.#insight.wastedBytes)}

The following images could be optimized:\n\n${imageDetails}`;
    }

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
      const requestSummary =
          TraceEventFormatter.networkRequests(this.#insight.renderBlockingRequests, this.#parsedTrace);

      if (requestSummary.length === 0) {
        return 'There are no network requests that are render blocking.';
      }

      return `Here is a list of the network requests that were render blocking on this page and their duration:

${requestSummary}`;
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

${TraceEventFormatter.networkRequests([documentRequest], this.#parsedTrace, {
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
              formatMicroToMilli(event.dur)}\`. The timings of each of the three phases were:

1. Input delay: ${formatMicroToMilli(event.inputDelay)}
2. Processing duration: ${formatMicroToMilli(event.mainThreadHandling)}
3. Presentation delay: ${formatMicroToMilli(event.presentationDelay)}.`;

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
          formatMicroToMilli(clusterTimes.start)} and ended at ${
          formatMicroToMilli(clusterTimes.end)}, with a duration of ${formatMicroToMilli(worstCluster.dur)}.
The score for this cluster is ${worstCluster.clusterCumulativeScore.toFixed(4)}.

Layout shifts in this cluster:
${shiftsFormatted.join('\n')}`;
    }

    if (Trace.Insights.Models.ModernHTTP.isModernHTTP(this.#insight)) {
      const requestSummary = (this.#insight.http1Requests.length === 1) ?
          TraceEventFormatter.networkRequests(this.#insight.http1Requests, this.#parsedTrace, {verbose: true}) :
          TraceEventFormatter.networkRequests(this.#insight.http1Requests, this.#parsedTrace);

      if (requestSummary.length === 0) {
        return 'There are no requests that were served over a legacy HTTP protocol.';
      }

      return `Here is a list of the network requests that were served over a legacy HTTP protocol:
${requestSummary}`;
    }

    if (Trace.Insights.Models.DuplicatedJavaScript.isDuplicatedJavaScript(this.#insight)) {
      const totalWastedBytes = this.#insight.wastedBytes;
      const duplicatedScriptsByModule = this.#insight.duplicationGroupedByNodeModules;

      if (duplicatedScriptsByModule.size === 0) {
        return 'There is no duplicated JavaScript in the page modules';
      }

      const filesFormatted =
          Array.from(duplicatedScriptsByModule)
              .map(
                  ([module, duplication]) =>
                      `- Source: ${module} - Duplicated bytes: ${duplication.estimatedDuplicateBytes} bytes`)
              .join('\n');

      return `Total wasted bytes: ${totalWastedBytes} bytes.

Duplication grouped by Node modules: ${filesFormatted}`;
    }

    if (Trace.Insights.Models.LegacyJavaScript.isLegacyJavaScript(this.#insight)) {
      const legacyJavaScriptResults = this.#insight.legacyJavaScriptResults;

      if (legacyJavaScriptResults.size === 0) {
        return 'There is no significant amount of legacy JavaScript on the page.';
      }

      const filesFormatted =
          Array.from(legacyJavaScriptResults)
              .map(([script, result]) => `\n- Script: ${script.url} - Wasted bytes: ${result.estimatedByteSavings} bytes
Matches:
${result.matches.map(match => `Line: ${match.line}, Column: ${match.column}, Name: ${match.name}`).join('\n')}`)
              .join('\n');

      return `Total legacy JavaScript: ${legacyJavaScriptResults.size} files.

Legacy JavaScript by file:
${filesFormatted}`;
    }

    return '';
  }

  estimatedSavings(): string {
    return Object.entries(this.#insight.metricSavings ?? {})
        .map(([k, v]) => {
          if (k === 'CLS') {
            return `${k} ${v.toFixed(2)}`;
          }
          return `${k} ${Math.round(v)} ms`;
        })
        .join(', ');
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
        return '- https://developer.chrome.com/docs/lighthouse/performance/uses-optimized-images/';
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
        return '- https://developer.chrome.com/docs/lighthouse/best-practices/uses-http2';
      case 'LegacyJavaScript':
        return `- https://web.dev/articles/baseline-and-polyfills
- https://philipwalton.com/articles/the-state-of-es5-on-the-web/`;
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
        return `This insight identifies large, duplicated JavaScript modules that are present in your application and create redundant code.
  This wastes network bandwidth and slows down your page, as the user's browser must download and process the same code multiple times.`;
      case 'FontDisplay':
        return '';
      case 'ForcedReflow':
        return '';
      case 'ImageDelivery':
        return 'This insight identifies unoptimized images that are downloaded at a much higher resolution than they are displayed. Properly sizing and compressing these assets will decrease their download time, directly improving the perceived page load time and LCP';
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
        return `This insight analyzes the time taken to discover the LCP resource and request it on the network. It only applies if the LCP element was a resource like an image that has to be fetched over the network. There are 3 checks this insight makes:
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
        return `Modern HTTP protocols, such as HTTP/2, are more efficient than older versions like HTTP/1.1 because they allow for multiple requests and responses to be sent over a single network connection, significantly improving page load performance by reducing latency and overhead. This insight identifies requests that can be upgraded to a modern HTTP protocol.

We apply a conservative approach when flagging HTTP/1.1 usage. This insight will only flag requests that meet all of the following criteria:
1.  Were served over HTTP/1.1 or an earlier protocol.
2.  Originate from an origin that serves at least 6 static asset requests, as the benefits of multiplexing are less significant with fewer requests.
3.  Are not served from 'localhost' or coming from a third-party source, where developers have no control over the server's protocol.

To pass this insight, ensure your server supports and prioritizes a modern HTTP protocol (like HTTP/2) for static assets, especially when serving a substantial number of them.`;
      case 'LegacyJavaScript':
        return `This insight identified legacy JavaScript in your application's modules that may be creating unnecessary code.

Polyfills and transforms enable older browsers to use new JavaScript features. However, many are not necessary for modern browsers. Consider modifying your JavaScript build process to not transpile Baseline features, unless you know you must support older browsers.`;
    }
  }
}

export interface NetworkRequestFormatOptions {
  verbose?: boolean;
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
- Start time: ${formatMicroToMilli(shift.ts - baseTime)}
- Score: ${shift.args.data?.weighted_score_delta.toFixed(4)}
${rootCauseText}`;
  }

  // Stringify network requests for the LLM model.
  static networkRequests(
      requests: readonly Trace.Types.Events.SyntheticNetworkRequest[], parsedTrace: Trace.Handlers.Types.ParsedTrace,
      options?: NetworkRequestFormatOptions): string {
    if (requests.length === 0) {
      return '';
    }

    let verbose;
    if (options?.verbose !== undefined) {
      verbose = options.verbose;
    } else {
      verbose = requests.length === 1;
    }

    // Use verbose format for a single network request. With the compressed format, a format description
    // needs to be provided, which is not worth sending if only one network request is being stringified.
    // For a single request, use `formatRequestVerbosely`, which formats with all fields specified and does not require a
    // format description.
    if (verbose) {
      return requests.map(request => this.#networkRequestVerbosely(request, parsedTrace, options?.customTitle))
          .join('\n');
    }

    return this.#networkRequestsArrayCompressed(requests, parsedTrace);
  }

  /**
   * This is the data passed to a network request when the Performance Insights
   * agent is asking for information. It is a slimmed down version of the
   * request's data to avoid using up too much of the context window.
   * IMPORTANT: these set of fields have been reviewed by Chrome Privacy &
   * Security; be careful about adding new data here. If you are in doubt please
   * talk to jacktfranklin@.
   */
  static #networkRequestVerbosely(
      request: Trace.Types.Events.SyntheticNetworkRequest, parsedTrace: Trace.Handlers.Types.ParsedTrace,
      customTitle?: string): string {
    const {
      url,
      statusCode,
      initialPriority,
      priority,
      fromServiceWorker,
      mimeType,
      responseHeaders,
      syntheticData,
      protocol
    } = request.args.data;

    const titlePrefix = `## ${customTitle ?? 'Network request'}`;

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
- Start time: ${formatMicroToMilli(startTime)}
- Duration: ${formatMicroToMilli(redirect.dur)}`;
    });

    const initiators = this.#getInitiatorChain(parsedTrace, request);
    const initiatorUrls = initiators.map(initiator => initiator.args.data.url);

    return `${titlePrefix}: ${url}
Timings:
- Queued at: ${formatMicroToMilli(startTimesForLifecycle.queuedAt)}
- Request sent at: ${formatMicroToMilli(startTimesForLifecycle.requestSentAt)}
- Download complete at: ${formatMicroToMilli(startTimesForLifecycle.downloadCompletedAt)}
- Main thread processing completed at: ${formatMicroToMilli(startTimesForLifecycle.processingCompletedAt)}
Durations:
- Download time: ${formatMicroToMilli(downloadTime)}
- Main thread processing time: ${formatMicroToMilli(mainThreadProcessingDuration)}
- Total duration: ${formatMicroToMilli(request.dur)}${initiator ? `\nInitiator: ${initiator.args.data.url}` : ''}
Redirects:${redirects.length ? '\n' + redirects.join('\n') : ' no redirects'}
Status code: ${statusCode}
MIME Type: ${mimeType}
Protocol: ${protocol}
${priorityLines.join('\n')}
Render blocking: ${renderBlocking ? 'Yes' : 'No'}
From a service worker: ${fromServiceWorker ? 'Yes' : 'No'}
Initiators (root request to the request that directly loaded this one): ${initiatorUrls.join(', ') || 'none'}
${NetworkRequestFormatter.formatHeaders('Response headers', responseHeaders ?? [], true)}`;
  }

  static #getOrAssignUrlIndex(urlIdToIndex: Map<string, number>, url: string): number {
    let index = urlIdToIndex.get(url);
    if (index !== undefined) {
      return index;
    }
    index = urlIdToIndex.size;
    urlIdToIndex.set(url, index);
    return index;
  }

  // A compact network requests format designed to save tokens when sending multiple network requests to the model.
  // It creates a map that maps request URLs to IDs and references the IDs in the compressed format.
  //
  // Important: Do not use this method for stringifying a single network request. With this format, a format description
  // needs to be provided, which is not worth sending if only one network request is being stringified.
  // For a single request, use `formatRequestVerbosely`, which formats with all fields specified and does not require a
  // format description.
  static #networkRequestsArrayCompressed(
      requests: readonly Trace.Types.Events.SyntheticNetworkRequest[],
      parsedTrace: Trace.Handlers.Types.ParsedTrace): string {
    const networkDataString = `
Network requests data:

`;
    const urlIdToIndex = new Map<string, number>();
    const allRequestsText = requests
                                .map(request => {
                                  const urlIndex =
                                      TraceEventFormatter.#getOrAssignUrlIndex(urlIdToIndex, request.args.data.url);
                                  return this.#networkRequestCompressedFormat(
                                      urlIndex, request, parsedTrace, urlIdToIndex);
                                })
                                .join('\n');

    const urlsMapString = 'allUrls = ' +
        `[${
                              Array.from(urlIdToIndex.entries())
                                  .map(([url, index]) => {
                                    return `${index}: ${url}`;
                                  })
                                  .join(', ')}]`;

    return networkDataString + '\n\n' + urlsMapString + '\n\n' + allRequestsText;
  }

  /**
   * Network requests format description that is sent to the model as a fact.
   */
  static networkDataFormatDescription = `Network requests are formatted like this:
\`urlIndex;queuedTime;requestSentTime;downloadCompleteTime;processingCompleteTime;totalDuration;downloadDuration;mainThreadProcessingDuration;statusCode;mimeType;priority;initialPriority;finalPriority;renderBlocking;protocol;fromServiceWorker;initiators;redirects:[[redirectUrlIndex|startTime|duration]];responseHeaders:[header1Value|header2Value|...]\`

- \`urlIndex\`: Numerical index for the request's URL, referencing the "All URLs" list.
Timings (all in milliseconds, relative to navigation start):
- \`queuedTime\`: When the request was queued.
- \`requestSentTime\`: When the request was sent.
- \`downloadCompleteTime\`: When the download completed.
- \`processingCompleteTime\`: When main thread processing finished.
Durations (all in milliseconds):
- \`totalDuration\`: Total time from the request being queued until its main thread processing completed.
- \`downloadDuration\`: Time spent actively downloading the resource.
- \`mainThreadProcessingDuration\`: Time spent on the main thread after the download completed.
- \`statusCode\`: The HTTP status code of the response (e.g., 200, 404).
- \`mimeType\`: The MIME type of the resource (e.g., "text/html", "application/javascript").
- \`priority\`: The final network request priority (e.g., "VeryHigh", "Low").
- \`initialPriority\`: The initial network request priority.
- \`finalPriority\`: The final network request priority (redundant if \`priority\` is always final, but kept for clarity if \`initialPriority\` and \`priority\` differ).
- \`renderBlocking\`: 't' if the request was render-blocking, 'f' otherwise.
- \`protocol\`: The network protocol used (e.g., "h2", "http/1.1").
- \`fromServiceWorker\`: 't' if the request was served from a service worker, 'f' otherwise.
- \`initiators\`: A list (separated by ,) of URL indices for the initiator chain of this request. Listed in order starting from the root request to the request that directly loaded this one. This represents the network dependencies necessary to load this request. If there is no initiator, this is empty.
- \`redirects\`: A comma-separated list of redirects, enclosed in square brackets. Each redirect is formatted as
\`[redirectUrlIndex|startTime|duration]\`, where: \`redirectUrlIndex\`: Numerical index for the redirect's URL. \`startTime\`: The start time of the redirect in milliseconds, relative to navigation start. \`duration\`: The duration of the redirect in milliseconds.
- \`responseHeaders\`: A list (separated by '|') of values for specific, pre-defined response headers, enclosed in square brackets.
The order of headers corresponds to an internal fixed list. If a header is not present, its value will be empty.
`;

  /**
   *
   * This is the network request data passed to the Performance agent.
   *
   * The `urlIdToIndex` Map is used to map URLs to numerical indices in order to not need to pass whole url every time it's mentioned.
   * The map content is passed in the response together will all the requests data.
   *
   * See `networkDataFormatDescription` above for specifics.
   */
  static #networkRequestCompressedFormat(
      urlIndex: number, request: Trace.Types.Events.SyntheticNetworkRequest,
      parsedTrace: Trace.Handlers.Types.ParsedTrace, urlIdToIndex: Map<string, number>): string {
    const {
      statusCode,
      initialPriority,
      priority,
      fromServiceWorker,
      mimeType,
      responseHeaders,
      syntheticData,
      protocol,
    } = request.args.data;

    const navigationForEvent = Trace.Helpers.Trace.getNavigationForTraceEvent(
        request,
        request.args.data.frame,
        parsedTrace.Meta.navigationsByFrameId,
    );
    const baseTime = navigationForEvent?.ts ?? parsedTrace.Meta.traceBounds.min;
    const queuedTime = formatMicroToMilli(request.ts - baseTime);
    const requestSentTime = formatMicroToMilli(syntheticData.sendStartTime - baseTime);
    const downloadCompleteTime = formatMicroToMilli(syntheticData.finishTime - baseTime);
    const processingCompleteTime = formatMicroToMilli(request.ts + request.dur - baseTime);
    const totalDuration = formatMicroToMilli(request.dur);
    const downloadDuration = formatMicroToMilli(syntheticData.finishTime - syntheticData.downloadStart);
    const mainThreadProcessingDuration = formatMicroToMilli(request.ts + request.dur - syntheticData.finishTime);
    const renderBlocking = Trace.Helpers.Network.isSyntheticNetworkRequestEventRenderBlocking(request) ? 't' : 'f';
    const finalPriority = priority;
    const headerValues = responseHeaders
                             ?.map(header => {
                               const value =
                                   NetworkRequestFormatter.allowHeader(header.name) ? header.value : '<redacted>';
                               return `${header.name}: ${value}`;
                             })
                             .join('|');
    const redirects = request.args.data.redirects
                          .map(redirect => {
                            const urlIndex = TraceEventFormatter.#getOrAssignUrlIndex(urlIdToIndex, redirect.url);
                            const redirectStartTime = formatMicroToMilli(redirect.ts - baseTime);
                            const redirectDuration = formatMicroToMilli(redirect.dur);
                            return `[${urlIndex}|${redirectStartTime}|${redirectDuration}]`;
                          })
                          .join(',');

    const initiators = this.#getInitiatorChain(parsedTrace, request);
    const initiatorUrlIndices =
        initiators.map(initiator => TraceEventFormatter.#getOrAssignUrlIndex(urlIdToIndex, initiator.args.data.url));

    const parts = [
      urlIndex,
      queuedTime,
      requestSentTime,
      downloadCompleteTime,
      processingCompleteTime,
      totalDuration,
      downloadDuration,
      mainThreadProcessingDuration,
      statusCode,
      mimeType,
      priority,
      initialPriority,
      finalPriority,
      renderBlocking,
      protocol,
      fromServiceWorker ? 't' : 'f',
      initiatorUrlIndices.join(','),
      `[${redirects}]`,
      `[${headerValues ?? ''}]`,
    ];
    return parts.join(';');
  }

  static #getInitiatorChain(
      parsedTrace: Trace.Handlers.Types.ParsedTrace,
      request: Trace.Types.Events.SyntheticNetworkRequest): Trace.Types.Events.SyntheticNetworkRequest[] {
    const initiators: Trace.Types.Events.SyntheticNetworkRequest[] = [];

    let cur: Trace.Types.Events.SyntheticNetworkRequest|undefined = request;
    while (cur) {
      const initiator = parsedTrace.NetworkRequests.eventToInitiator.get(cur);
      if (initiator) {
        // Should never happen, but if it did that would be an infinite loop.
        if (initiators.includes(initiator)) {
          return [];
        }

        initiators.unshift(initiator);
      }

      cur = initiator;
    }

    return initiators;
  }
}

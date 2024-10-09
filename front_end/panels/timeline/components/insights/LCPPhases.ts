// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsight, shouldRenderForCategory} from './Helpers.js';
import * as SidebarInsight from './SidebarInsight.js';
import {Table, type TableData} from './Table.js';
import {Category} from './types.js';

const UIStrings = {
  /**
   *@description Title of an insight that provides details about the LCP metric, broken down by phases / parts.
   */
  title: 'LCP by phase',
  /**
   * @description Description of a DevTools insight that presents a breakdown for the LCP metric by phases.
   * This is displayed after a user expands the section to see more. No character length limits.
   */
  description:
      'Each [phase has specific improvement strategies](https://web.dev/articles/optimize-lcp#lcp-breakdown). Ideally, most of the LCP time should be spent on loading the resources, not within delays.',
  /**
   *@description Time to first byte title for the Largest Contentful Paint's phases timespan breakdown.
   */
  timeToFirstByte: 'Time to first byte',
  /**
   *@description Resource load delay title for the Largest Contentful Paint phases timespan breakdown.
   */
  resourceLoadDelay: 'Resource load delay',
  /**
   *@description Resource load duration title for the Largest Contentful Paint phases timespan breakdown.
   */
  resourceLoadDuration: 'Resource load duration',
  /**
   *@description Element render delay title for the Largest Contentful Paint phases timespan breakdown.
   */
  elementRenderDelay: 'Element render delay',
  /**
   *@description Label used for the phase/component/stage/section of a larger duration.
   */
  phase: 'Phase',
  /**
   *@description Label used for the percentage a single phase/component/stage/section takes up of a larger duration.
   */
  percentLCP: '% of LCP',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/LCPPhases.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface PhaseData {
  phase: string;
  timing: number|Trace.Types.Timing.MilliSeconds;
  percent: string;
}

export class LCPPhases extends BaseInsight {
  static override readonly litTagName = LitHtml.literal`devtools-performance-lcp-by-phases`;
  override insightCategory: Category = Category.LCP;
  override internalName: string = 'lcp-by-phase';
  override userVisibleTitle: string = i18nString(UIStrings.title);
  override description: string = i18nString(UIStrings.description);
  #overlay: Overlays.Overlays.TimespanBreakdown|null = null;

  #getPhaseData(insights: Trace.Insights.Types.TraceInsightSets|null, navigationId: string|null): PhaseData[] {
    if (!insights || !navigationId) {
      return [];
    }
    const insightsByNavigation = insights.get(navigationId);
    if (!insightsByNavigation) {
      return [];
    }
    const lcpInsight = insightsByNavigation.data.LargestContentfulPaint;
    if (lcpInsight instanceof Error) {
      return [];
    }

    const timing = lcpInsight.lcpMs;
    const phases = lcpInsight.phases;

    if (!timing || !phases) {
      return [];
    }

    const {ttfb, loadDelay, loadTime, renderDelay} = phases;

    if (loadDelay && loadTime) {
      const phaseData = [
        {phase: i18nString(UIStrings.timeToFirstByte), timing: ttfb, percent: `${(100 * ttfb / timing).toFixed(0)}%`},
        {
          phase: i18nString(UIStrings.resourceLoadDelay),
          timing: loadDelay,
          percent: `${(100 * loadDelay / timing).toFixed(0)}%`,
        },
        {
          phase: i18nString(UIStrings.resourceLoadDuration),
          timing: loadTime,
          percent: `${(100 * loadTime / timing).toFixed(0)}%`,
        },
        {
          phase: i18nString(UIStrings.elementRenderDelay),
          timing: renderDelay,
          percent: `${(100 * renderDelay / timing).toFixed(0)}%`,
        },
      ];
      return phaseData;
    }

    // If the lcp is text, we only have ttfb and render delay.
    const phaseData = [
      {phase: i18nString(UIStrings.timeToFirstByte), timing: ttfb, percent: `${(100 * ttfb / timing).toFixed(0)}%`},
      {
        phase: i18nString(UIStrings.elementRenderDelay),
        timing: renderDelay,
        percent: `${(100 * renderDelay / timing).toFixed(0)}%`,
      },
    ];
    return phaseData;
  }

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    this.#overlay = null;

    if (!this.data.insights || !this.data.insightSetKey) {
      return [];
    }
    const {insightSetKey: navigationId, insights} = this.data;

    const insightsByNavigation = insights.get(navigationId);
    if (!insightsByNavigation) {
      return [];
    }

    const lcpInsight = insightsByNavigation.data.LargestContentfulPaint;
    if (lcpInsight instanceof Error) {
      return [];
    }

    const phases = lcpInsight.phases;
    const lcpTs = lcpInsight.lcpTs;
    if (!phases || !lcpTs) {
      return [];
    }
    const lcpMicroseconds = Trace.Types.Timing.MicroSeconds(Trace.Helpers.Timing.millisecondsToMicroseconds(lcpTs));

    const sections = [];
    // For text LCP, we should only have ttfb and renderDelay sections.
    if (!phases?.loadDelay && !phases?.loadTime) {
      const renderBegin: Trace.Types.Timing.MicroSeconds = Trace.Types.Timing.MicroSeconds(
          lcpMicroseconds - Trace.Helpers.Timing.millisecondsToMicroseconds(phases.renderDelay));
      const renderDelay = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          renderBegin,
          lcpMicroseconds,
      );

      const mainReqStart =
          Trace.Types.Timing.MicroSeconds(renderBegin - Trace.Helpers.Timing.millisecondsToMicroseconds(phases.ttfb));
      const ttfb = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          mainReqStart,
          renderBegin,
      );
      sections.push(
          {bounds: ttfb, label: i18nString(UIStrings.timeToFirstByte), showDuration: true},
          {bounds: renderDelay, label: i18nString(UIStrings.elementRenderDelay), showDuration: true});
    } else if (phases?.loadDelay && phases?.loadTime) {
      const renderBegin: Trace.Types.Timing.MicroSeconds = Trace.Types.Timing.MicroSeconds(
          lcpMicroseconds - Trace.Helpers.Timing.millisecondsToMicroseconds(phases.renderDelay));
      const renderDelay = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          renderBegin,
          lcpMicroseconds,
      );

      const loadBegin = Trace.Types.Timing.MicroSeconds(
          renderBegin - Trace.Helpers.Timing.millisecondsToMicroseconds(phases.loadTime));
      const loadTime = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          loadBegin,
          renderBegin,
      );

      const loadDelayStart = Trace.Types.Timing.MicroSeconds(
          loadBegin - Trace.Helpers.Timing.millisecondsToMicroseconds(phases.loadDelay));
      const loadDelay = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          loadDelayStart,
          loadBegin,
      );

      const mainReqStart = Trace.Types.Timing.MicroSeconds(
          loadDelayStart - Trace.Helpers.Timing.millisecondsToMicroseconds(phases.ttfb));
      const ttfb = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          mainReqStart,
          loadDelayStart,
      );

      sections.push(
          {bounds: ttfb, label: i18nString(UIStrings.timeToFirstByte), showDuration: true},
          {bounds: loadDelay, label: i18nString(UIStrings.resourceLoadDelay), showDuration: true},
          {bounds: loadTime, label: i18nString(UIStrings.resourceLoadDuration), showDuration: true},
          {bounds: renderDelay, label: i18nString(UIStrings.elementRenderDelay), showDuration: true},
      );
    }

    this.#overlay = {
      type: 'TIMESPAN_BREAKDOWN',
      sections,
    };
    return [this.#overlay];
  }

  #renderLCPPhases(phaseData: PhaseData[]): LitHtml.LitTemplate {
    const rows = phaseData.map(({phase, percent}) => {
      const section = this.#overlay?.sections.find(section => phase === section.label);
      return {
        values: [phase, percent],
        overlays: section && [{
                    type: 'TIMESPAN_BREAKDOWN',
                    sections: [section],
                  }],
      };
    });

    // clang-format off
    return LitHtml.html`
    <div class="insights">
      <${SidebarInsight.SidebarInsight.litTagName} .data=${{
            title: this.userVisibleTitle,
            description: this.description,
            internalName: this.internalName,
            expanded: this.isActive(),
        } as SidebarInsight.InsightDetails}
        @insighttoggleclick=${this.onSidebarClick}
      >
        <div slot="insight-content" class="insight-section">
          ${LitHtml.html`<${Table.litTagName}
            .data=${{
              insight: this,
              headers: [i18nString(UIStrings.phase), i18nString(UIStrings.percentLCP)],
              rows,
            } as TableData}>
          </${Table.litTagName}>`}
        </div>
      </${SidebarInsight}>
    </div>`;
    // clang-format on
  }

  #hasDataToRender(phaseData: PhaseData[]): boolean {
    return phaseData ? phaseData.length > 0 : false;
  }

  override getRelatedEvents(): Trace.Types.Events.Event[] {
    const insight =
        Trace.Insights.Common.getInsight('LargestContentfulPaint', this.data.insights, this.data.insightSetKey);
    if (!insight?.lcpEvent) {
      return [];
    }

    const relatedEvents: Trace.Types.Events.Event[] = [insight.lcpEvent];
    if (insight.lcpRequest) {
      relatedEvents.push(insight.lcpRequest);
    }

    return relatedEvents;
  }

  override render(): void {
    const phaseData = this.#getPhaseData(this.data.insights, this.data.insightSetKey);
    const matchesCategory = shouldRenderForCategory({
      activeCategory: this.data.activeCategory,
      insightCategory: this.insightCategory,
    });
    const shouldRender = matchesCategory && this.#hasDataToRender(phaseData);
    const output = shouldRender ? this.#renderLCPPhases(phaseData) : LitHtml.nothing;
    LitHtml.render(output, this.shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-lcp-by-phases': LCPPhases;
  }
}

customElements.define('devtools-performance-lcp-by-phases', LCPPhases);

// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Table.js';

import type {LCPPhasesInsightModel} from '../../../../models/trace/insights/LCPPhases.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import type {TableData} from './Table.js';

const {UIStrings, i18nString} = Trace.Insights.Models.LCPPhases;

const {html} = Lit;

interface PhaseData {
  phase: string;
  timing: number|Trace.Types.Timing.Milli;
  percent: string;
}

export class LCPPhases extends BaseInsightComponent<LCPPhasesInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-lcp-by-phases`;
  override internalName: string = 'lcp-by-phase';
  #overlay: Overlays.Overlays.TimespanBreakdown|null = null;

  #getPhaseData(): PhaseData[] {
    if (!this.model) {
      return [];
    }

    const timing = this.model.lcpMs;
    const phases = this.model.phases;

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

    if (!this.model) {
      return [];
    }

    const phases = this.model.phases;
    const lcpTs = this.model.lcpTs;
    if (!phases || !lcpTs) {
      return [];
    }
    const lcpMicroseconds = Trace.Types.Timing.Micro(Trace.Helpers.Timing.milliToMicro(lcpTs));

    const overlays: Overlays.Overlays.TimelineOverlay[] = [];
    if (this.model.lcpRequest) {
      overlays.push({type: 'ENTRY_OUTLINE', entry: this.model.lcpRequest, outlineReason: 'INFO'});
    }

    const sections = [];
    // For text LCP, we should only have ttfb and renderDelay sections.
    if (!phases?.loadDelay && !phases?.loadTime) {
      const renderBegin: Trace.Types.Timing.Micro =
          Trace.Types.Timing.Micro(lcpMicroseconds - Trace.Helpers.Timing.milliToMicro(phases.renderDelay));
      const renderDelay = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          renderBegin,
          lcpMicroseconds,
      );

      const mainReqStart = Trace.Types.Timing.Micro(renderBegin - Trace.Helpers.Timing.milliToMicro(phases.ttfb));
      const ttfb = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          mainReqStart,
          renderBegin,
      );
      sections.push(
          {bounds: ttfb, label: i18nString(UIStrings.timeToFirstByte), showDuration: true},
          {bounds: renderDelay, label: i18nString(UIStrings.elementRenderDelay), showDuration: true});
    } else if (phases?.loadDelay && phases?.loadTime) {
      const renderBegin: Trace.Types.Timing.Micro =
          Trace.Types.Timing.Micro(lcpMicroseconds - Trace.Helpers.Timing.milliToMicro(phases.renderDelay));
      const renderDelay = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          renderBegin,
          lcpMicroseconds,
      );

      const loadBegin = Trace.Types.Timing.Micro(renderBegin - Trace.Helpers.Timing.milliToMicro(phases.loadTime));
      const loadTime = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          loadBegin,
          renderBegin,
      );

      const loadDelayStart = Trace.Types.Timing.Micro(loadBegin - Trace.Helpers.Timing.milliToMicro(phases.loadDelay));
      const loadDelay = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
          loadDelayStart,
          loadBegin,
      );

      const mainReqStart = Trace.Types.Timing.Micro(loadDelayStart - Trace.Helpers.Timing.milliToMicro(phases.ttfb));
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
    overlays.push(this.#overlay);
    return overlays;
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    const phaseData = this.#getPhaseData();
    if (!phaseData.length) {
      return html`<div class="insight-section">${i18nString(UIStrings.noLcp)}</div>`;
    }

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
    return html`
      <div class="insight-section">
        ${html`<devtools-performance-table
          .data=${{
            insight: this,
            headers: [i18nString(UIStrings.phase), i18nString(UIStrings.percentLCP)],
            rows,
          } as TableData}>
        </devtools-performance-table>`}
      </div>`;
    // clang-format on
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-lcp-by-phases': LCPPhases;
  }
}

customElements.define('devtools-performance-lcp-by-phases', LCPPhases);

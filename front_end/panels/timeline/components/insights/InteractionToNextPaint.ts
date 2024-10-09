// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsight, shouldRenderForCategory} from './Helpers.js';
import * as SidebarInsight from './SidebarInsight.js';
import {Table, type TableData} from './Table.js';
import {Category} from './types.js';

const UIStrings = {
  /**
   * @description Text to tell the user about the longest user interaction.
   */
  description:
      'Start investigating with the longest phase. [Delays can be minimized](https://web.dev/articles/optimize-inp#optimize_interactions). To reduce processing duration, [optimize the main-thread costs](https://web.dev/articles/optimize-long-tasks), often JS.',
  /**
   * @description Title for the performance insight "INP by phase", which shows a breakdown of INP by phases / sections.
   */
  title: 'INP by phase',
  /**
   *@description Label used for the phase/component/stage/section of a larger duration.
   */
  phase: 'Phase',
  /**
   *@description Label used for a time duration.
   */
  duration: 'Duration',

  // TODO: these are repeated in InteractionBreakdown. Add a place for common strings?
  /**
   *@description Text shown next to the interaction event's input delay time in the detail view.
   */
  inputDelay: 'Input delay',
  /**
   *@description Text shown next to the interaction event's thread processing duration in the detail view.
   */
  processingDuration: 'Processing duration',
  /**
   *@description Text shown next to the interaction event's presentation delay time in the detail view.
   */
  presentationDelay: 'Presentation delay',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/InteractionToNextPaint.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class InteractionToNextPaint extends BaseInsight {
  static override readonly litTagName = LitHtml.literal`devtools-performance-inp`;
  override insightCategory: Category = Category.INP;
  override internalName: string = 'inp';
  override userVisibleTitle: string = i18nString(UIStrings.title);
  override description: string = i18nString(UIStrings.description);

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    const insight =
        Trace.Insights.Common.getInsight('InteractionToNextPaint', this.data.insights, this.data.insightSetKey);
    if (!insight) {
      return [];
    }

    const event = insight.longestInteractionEvent;
    if (!event) {
      return [];
    }

    return this.#createOverlaysForPhase(event);
  }

  // If `phase` is -1, then all phases are included. Otherwise it's just that phase index.
  #createOverlaysForPhase(event: Trace.Types.Events.SyntheticInteractionPair, phase = -1):
      Overlays.Overlays.TimelineOverlay[] {
    const p1 = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
        event.ts,
        (event.ts + event.inputDelay) as Trace.Types.Timing.MicroSeconds,
    );
    const p2 = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
        p1.max,
        (p1.max + event.mainThreadHandling) as Trace.Types.Timing.MicroSeconds,
    );
    const p3 = Trace.Helpers.Timing.traceWindowFromMicroSeconds(
        p2.max,
        (p2.max + event.presentationDelay) as Trace.Types.Timing.MicroSeconds,
    );
    let sections = [
      {bounds: p1, label: i18nString(UIStrings.inputDelay), showDuration: true},
      {bounds: p2, label: i18nString(UIStrings.processingDuration), showDuration: true},
      {bounds: p3, label: i18nString(UIStrings.presentationDelay), showDuration: true},
    ];
    if (phase !== -1) {
      sections = [sections[phase]];
    }

    return [
      {
        type: 'TIMESPAN_BREAKDOWN',
        sections,
        renderLocation: 'BELOW_EVENT',
        entry: event,
      },
    ];
  }

  #render(event: Trace.Types.Events.SyntheticInteractionPair): LitHtml.TemplateResult {
    const time = (us: Trace.Types.Timing.MicroSeconds): string =>
        i18n.TimeUtilities.millisToString(Platform.Timing.microSecondsToMilliSeconds(us));

    // clang-format off
    return LitHtml.html`
        <div class="insights">
            <${SidebarInsight.SidebarInsight.litTagName} .data=${{
            title: this.userVisibleTitle,
            description: this.description,
            internalName: this.internalName,
            expanded: this.isActive(),
            } as SidebarInsight.InsightDetails}
            @insighttoggleclick=${this.onSidebarClick}>
                <div slot="insight-content" class="insight-section">
                  ${LitHtml.html`<${Table.litTagName}
                    .data=${{
                      insight: this,
                      headers: [i18nString(UIStrings.phase), i18nString(UIStrings.duration)],
                      rows: [
                        {
                          values: [i18nString(UIStrings.inputDelay), time(event.inputDelay)],
                          overlays: this.#createOverlaysForPhase(event, 0),
                        },
                        {
                          values: [i18nString(UIStrings.processingDuration), time(event.mainThreadHandling)],
                          overlays: this.#createOverlaysForPhase(event, 1),
                        },
                        {
                          values: [i18nString(UIStrings.presentationDelay), time(event.presentationDelay)],
                          overlays: this.#createOverlaysForPhase(event, 2),
                        },
                      ],
                    } as TableData}>
                  </${Table.litTagName}>`}
                </div>
            </${SidebarInsight.SidebarInsight}>
        </div>`;
    // clang-format on
  }

  override getRelatedEvents(): Trace.Types.Events.Event[] {
    const insight =
        Trace.Insights.Common.getInsight('InteractionToNextPaint', this.data.insights, this.data.insightSetKey);
    return insight?.relatedEvents ?? [];
  }

  override render(): void {
    const insight =
        Trace.Insights.Common.getInsight('InteractionToNextPaint', this.data.insights, this.data.insightSetKey);
    const event = insight?.longestInteractionEvent;

    const matchesCategory = shouldRenderForCategory({
      activeCategory: this.data.activeCategory,
      insightCategory: this.insightCategory,
    });
    const output = event && matchesCategory ? this.#render(event) : LitHtml.nothing;
    LitHtml.render(output, this.shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-inp': InteractionToNextPaint;
  }
}

customElements.define('devtools-performance-inp', InteractionToNextPaint);

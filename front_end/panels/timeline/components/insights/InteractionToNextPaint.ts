// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Table.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import type {INPInsightModel} from '../../../../models/trace/insights/InteractionToNextPaint.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import {BaseInsightComponent, shouldRenderForCategory} from './Helpers.js';
import {Category} from './types.js';

const {html} = LitHtml;

const UIStrings = {
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

export class InteractionToNextPaint extends BaseInsightComponent<INPInsightModel> {
  static override readonly litTagName = LitHtml.literal`devtools-performance-inp`;
  override insightCategory: Category = Category.INP;
  override internalName: string = 'inp';

  override createOverlays(): Overlays.Overlays.TimelineOverlay[] {
    if (!this.model) {
      return [];
    }

    const event = this.model.longestInteractionEvent;
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

  #render(event: Trace.Types.Events.SyntheticInteractionPair): LitHtml.LitTemplate {
    if (!this.model) {
      return LitHtml.nothing;
    }

    const time = (us: Trace.Types.Timing.MicroSeconds): string =>
        i18n.TimeUtilities.millisToString(Platform.Timing.microSecondsToMilliSeconds(us));

    // clang-format off
    return html`
        <div class="insights">
            <devtools-performance-sidebar-insight .data=${{
            title: this.model.title,
            description: this.model.description,
            internalName: this.internalName,
            expanded: this.isActive(),
            }}
            @insighttoggleclick=${this.onSidebarClick}>
                <div slot="insight-content" class="insight-section">
                  ${html`<devtools-performance-table
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
                    }}>
                  </devtools-performance-table>`}
                </div>
            </devtools-performance-sidebar-insight>
        </div>`;
            // clang-format on
  }

  override render(): void {
    const event = this.model?.longestInteractionEvent;

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

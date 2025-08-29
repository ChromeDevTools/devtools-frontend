// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';

import relatedInsightsStyles from './relatedInsightChips.css.js';

const {html, render} = Lit;

const UIStrings = {
  /**
   * @description prefix shown next to related insight chips
   */
  insightKeyword: 'Insight',
  /**
   * @description Prefix shown next to related insight chips and containing the insight name.
   * @example {Improve image delivery} PH1
   */
  insightWithName: 'Insight: {PH1}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/RelatedInsightChips.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface RelatedInsight {
  insightLabel: string;
  messages: string[];
  activateInsight: () => void;
}
export type EventToRelatedInsightsMap = Map<Trace.Types.Events.Event, RelatedInsight[]>;

export interface ViewInput {
  activeEvent: Trace.Types.Events.Event|null;
  eventToInsightsMap: EventToRelatedInsightsMap;
  onInsightClick: (insight: RelatedInsight) => void;
}

export interface Data {
  eventToRelatedInsightsMap: EventToRelatedInsightsMap|null;
  activeEvent: Trace.Types.Events.Event|null;
}

export class RelatedInsightChips extends UI.Widget.Widget {
  #view: typeof DEFAULT_VIEW;

  #activeEvent: Trace.Types.Events.Event|null = null;
  #eventToInsightsMap: EventToRelatedInsightsMap = new Map();

  constructor(element?: HTMLElement, view = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  set activeEvent(event: Trace.Types.Events.Event|null) {
    if (event === this.#activeEvent) {
      return;
    }
    this.#activeEvent = event;
    this.requestUpdate();
  }

  set eventToInsightsMap(map: EventToRelatedInsightsMap|null) {
    // Purposefully don't check object equality here; the contents of the map
    // could have changed, so play it safe and always trigger a re-render.
    this.#eventToInsightsMap = map ?? new Map();
    this.requestUpdate();
  }

  override performUpdate(): Promise<void>|void {
    const input: ViewInput = {
      activeEvent: this.#activeEvent,
      eventToInsightsMap: this.#eventToInsightsMap,
      onInsightClick(insight) {
        insight.activateInsight();
      },
    };
    this.#view(input, {}, this.contentElement);
  }
}

export const DEFAULT_VIEW: (input: ViewInput, output: object, target: HTMLElement) => void =
    (input, _output, target) => {
      const {activeEvent, eventToInsightsMap} = input;
      const relatedInsights = activeEvent ? eventToInsightsMap.get(activeEvent) ?? [] : [];
      if (!activeEvent || eventToInsightsMap.size === 0 || relatedInsights.length === 0) {
        render(html``, target);
        return;
      }

      // TODO: Render insight messages in a separate UX
      // Right before insight chips is acceptable for now
      const insightMessages = relatedInsights.flatMap(insight => {
        // TODO: support markdown (`md`).
        // clang-format off
        return insight.messages.map(message => html`
          <li class="insight-message-box">
            <button type="button" @click=${(event: Event) => {
              event.preventDefault();
              input.onInsightClick(insight);
            }}>
              <div class="insight-label">${i18nString(UIStrings.insightWithName, {
                PH1: insight.insightLabel,
              })}</div>
              <div class="insight-message">${message}</div>
            </button>
          </li>
        `);
        // clang-format on
      });

      const insightChips = relatedInsights.flatMap(insight => {
        // clang-format off
        return [html`
          <li class="insight-chip">
            <button type="button" @click=${(event: Event) => {
              event.preventDefault();
              input.onInsightClick(insight);
            }}>
              <span class="keyword">${i18nString(UIStrings.insightKeyword)}</span>
              <span class="insight-label">${insight.insightLabel}</span>
            </button>
          </li>
        `];
        // clang-format on
      });

      // clang-format off
      render(html`<style>${relatedInsightsStyles}</style>
        <ul>${insightMessages}</ul>
        <ul>${insightChips}</ul>`,
      target);
      // clang-format on
    };

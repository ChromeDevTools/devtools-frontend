// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';

import interactionBreakdownStyles from './interactionBreakdown.css.js';

const {html} = Lit;

const UIStrings = {
  /**
   * @description Text shown next to the interaction event's input delay time in the detail view.
   */
  inputDelay: 'Input delay',
  /**
   * @description Text shown next to the interaction event's thread processing duration in the detail view.
   */
  processingDuration: 'Processing duration',
  /**
   * @description Text shown next to the interaction event's presentation delay time in the detail view.
   */
  presentationDelay: 'Presentation delay',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/InteractionBreakdown.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ViewInput {
  entry: Trace.Types.Events.SyntheticInteractionPair;
}

type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  const {entry} = input;

  const inputDelay = i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(entry.inputDelay);
  const mainThreadTime = i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(entry.mainThreadHandling);
  const presentationDelay = i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(entry.presentationDelay);

  // clang-format off
  Lit.render(
    html`<style>${interactionBreakdownStyles}</style>
      <ul class="breakdown">
        <li data-entry="input-delay">${i18nString(UIStrings.inputDelay)}<span class="value">${inputDelay}</span></li>
        <li data-entry="processing-duration">${i18nString(UIStrings.processingDuration)}<span class="value">${mainThreadTime}</span></li>
        <li data-entry="presentation-delay">${i18nString(UIStrings.presentationDelay)}<span class="value">${presentationDelay}</span></li>
      </ul>
  `, target);
  // clang-format on
};

export class InteractionBreakdown extends UI.Widget.Widget {
  static createWidgetElement(entry: Trace.Types.Events.SyntheticInteractionPair):
      UI.Widget.WidgetElement<InteractionBreakdown> {
    const widgetElement = document.createElement('devtools-widget') as UI.Widget.WidgetElement<InteractionBreakdown>;
    widgetElement.widgetConfig = UI.Widget.widgetConfig(InteractionBreakdown, {entry});
    return widgetElement;
  }

  #view: View;
  #entry: Trace.Types.Events.SyntheticInteractionPair|null = null;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
  }

  set entry(entry: Trace.Types.Events.SyntheticInteractionPair) {
    if (entry === this.#entry) {
      return;
    }

    this.#entry = entry;
    this.requestUpdate();
  }

  override performUpdate(): void {
    if (!this.#entry) {
      return;
    }

    const input: ViewInput = {
      entry: this.#entry,
    };
    this.#view(input, undefined, this.contentElement);
  }
}

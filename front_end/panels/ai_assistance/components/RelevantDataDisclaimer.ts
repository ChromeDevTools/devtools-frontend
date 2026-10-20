// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/tooltips/tooltips.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import relevantDataDisclaimerStyles from './relevantDataDisclaimer.css.js';

const {html} = Lit;

const UIStrings = {
  /**
   * @description The footer disclaimer that links to more information about the AI feature.
   */
  learnAbout: 'Learn about AI in DevTools',
} as const;

const UIStringsNotTranslate = {
  /**
   * @description Link text at the start of the "Relevant data is sent to Google" disclaimer. Opens the AI settings.
   */
  relevantData: 'Relevant data',
  /**
   * @description Rest of the disclaimer that follows the "Relevant data" link.
   */
  isSentToGoogle: 'is sent to Google',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/ai_assistance/components/RelevantDataDisclaimer.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;

function openAiSettings(): void {
  void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
}

/**
 * Renders "Relevant data is sent to Google". "Relevant data" is a link to the
 * AI settings with a rich tooltip that shows `disclaimerText` and a
 * "Learn about AI in DevTools" link.
 */
export function renderRelevantDataDisclaimer(tooltipId: string, disclaimerText: string): Lit.LitTemplate {
  // clang-format off
  return html`
    <style>${relevantDataDisclaimerStyles}</style>
    <button
      class="link"
      role="link"
      aria-details=${tooltipId}
      jslog=${VisualLogging.link('open-ai-settings').track({click: true})}
      @click=${(ev: Event) => {
        ev.preventDefault();
        openAiSettings();
      }}
    >${lockedString(UIStringsNotTranslate.relevantData)}</button>&nbsp;${lockedString(UIStringsNotTranslate.isSentToGoogle)}<devtools-tooltip
      id=${tooltipId}
      variant="rich"
    ><div class="info-tooltip-container">
      ${disclaimerText}
      <button
        class="link tooltip-link"
        role="link"
        jslog=${VisualLogging.link('open-ai-settings').track({click: true})}
        @click=${openAiSettings}
      >${i18nString(UIStrings.learnAbout)}</button>
    </div></devtools-tooltip>`;
  // clang-format on
}

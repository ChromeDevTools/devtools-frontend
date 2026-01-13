// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import styles from './aiCodeGenerationUpgradeDialog.css.js';
const { html } = Lit;
const UIStringsNotTranslate = {
    /**
     * @description Header text for the upgrade notice dialog.
     */
    codeCompletionJustGotBetter: 'Code completion just got better',
    /**
     * @description First item in the description
     */
    asYouType: 'As you type, DevTools generates code suggestions to help you code faster.',
    /**
     * @description Second item in the description
     */
    describeCodeInComment: 'In Console and Sources, you can now describe the code you need in a comment, then press Ctrl+I to generate it.',
    /**
     * @description Second item in the description
     */
    describeCodeInCommentForMacOs: 'In Console and Sources, you can now describe the code you need in a comment, then press Cmd+I to generate it.',
    /**
     * @description Text for the manage in settings button in the upgrade notice dialog.
     */
    manageInSettings: 'Manage in settings',
    /**
     * @description Text for the got it button in the upgrade notice dialog.
     */
    gotIt: 'Got it',
};
const lockedString = i18n.i18n.lockedString;
export class AiCodeGenerationUpgradeDialog {
    static show() {
        const dialog = new UI.Dialog.Dialog();
        dialog.setAriaLabel(lockedString(UIStringsNotTranslate.codeCompletionJustGotBetter));
        // clang-format off
        Lit.render(html `
      <div class="ai-code-generation-upgrade-dialog">
        <style>
          ${styles}
        </style>
        <header>
          <div class="header-icon-container">
            <devtools-icon name="pen-spark"></devtools-icon>
          </div>
          <h2 tabindex="-1">
            ${lockedString(UIStringsNotTranslate.codeCompletionJustGotBetter)}
          </h2>
        </header>
        <main class="reminder-container">
          <div class="reminder-item">
            <devtools-icon class="reminder-icon" name="code"></devtools-icon>
            <span>${lockedString(UIStringsNotTranslate.asYouType)}</span>
          </div>
          <div class="reminder-item">
            <devtools-icon class="reminder-icon" name="text-analysis"></devtools-icon>
            <span>
              ${Host.Platform.isMac() ?
            lockedString(UIStringsNotTranslate.describeCodeInCommentForMacOs) :
            lockedString(UIStringsNotTranslate.describeCodeInComment)}
            </span>
          </div>
        </main>
        <footer>
          <div class="right-buttons">
            <devtools-button
              @click=${() => {
            void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
        }}
              .jslogContext=${'ai-code-generation-upgrade-dialog.manage-in-settings'}
              .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
              aria-label=${lockedString(UIStringsNotTranslate.manageInSettings)}>
              ${lockedString(UIStringsNotTranslate.manageInSettings)}
            </devtools-button>
            <devtools-button
              @click=${() => {
            dialog.hide();
        }}
              .jslogContext=${'ai-code-generation-upgrade-dialog.continue'}
              .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}>
              ${lockedString(UIStringsNotTranslate.gotIt)}
            </devtools-button>
          </div>
        </footer>
      </div>`, dialog.contentElement);
        // clang-format on
        dialog.setOutsideClickCallback(ev => {
            ev.consume(true); // true = preventDefault()
            dialog.hide();
        });
        dialog.setSizeBehavior("MeasureContent" /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */);
        dialog.setDimmed(true);
        dialog.show();
    }
    constructor() {
    }
}
//# sourceMappingURL=AiCodeGenerationUpgradeDialog.js.map
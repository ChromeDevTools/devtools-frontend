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
     * @description First item in the description.
     */
    describeCodeInComment: 'Pressing Ctrl+I on a comment in the Console and Sources panels now generates entire code blocks based on the instructions in the comment.',
    /**
     * @description First item in the description.
     */
    describeCodeInCommentForMacOs: 'Pressing Cmd+I on a comment in the Console and Sources panels now generates entire code blocks based on the instructions in the comment.',
    /**
     * @description Second item in the description.
     */
    asYouType: 'You will still receive the real-time, as-you-type suggestions to help you code faster.',
    /**
     * @description Third item in the description.
     */
    disclaimerTextPrivacy: 'To generate code suggestions, your console input, the history of your current console session, the currently inspected CSS, and the contents of the currently open file are shared with Google. This data may be seen by human reviewers to improve this feature.',
    /**
     * @description Third item in the description.
     */
    disclaimerTextPrivacyNoLogging: 'To generate code suggestions, your console input, the history of your current console session, the currently inspected CSS, and the contents of the currently open file are shared with Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
    /**
     * @description Text for the manage in settings button in the upgrade notice dialog.
     */
    manageInSettings: 'Manage in settings',
    /**
     * @description Text for the generate code button in the upgrade notice dialog.
     */
    generateCode: 'Generate code',
};
const lockedString = i18n.i18n.lockedString;
export class AiCodeGenerationUpgradeDialog {
    static show({ noLogging }) {
        const dialog = new UI.Dialog.Dialog();
        dialog.setAriaLabel(lockedString(UIStringsNotTranslate.codeCompletionJustGotBetter));
        const result = Promise.withResolvers();
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
            <devtools-icon class="reminder-icon" name="text-analysis"></devtools-icon>
            <span>
              ${Host.Platform.isMac() ?
            lockedString(UIStringsNotTranslate.describeCodeInCommentForMacOs) :
            lockedString(UIStringsNotTranslate.describeCodeInComment)}
            </span>
          </div>
          <div class="reminder-item">
            <devtools-icon class="reminder-icon" name="code"></devtools-icon>
            <span>${lockedString(UIStringsNotTranslate.asYouType)}</span>
          </div>
          <div class="reminder-item">
            <devtools-icon class="reminder-icon" name="google"></devtools-icon>
            <span>${noLogging ? lockedString(UIStringsNotTranslate.disclaimerTextPrivacyNoLogging) :
            lockedString(UIStringsNotTranslate.disclaimerTextPrivacy)}
            </span>
          </div>
        </main>
        <footer>
          <div class="right-buttons">
            <devtools-button
              @click=${() => {
            result.resolve(true);
            void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
        }}
              jslogcontext="ai-code-generation-upgrade-dialog.manage-in-settings"
              .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
              aria-label=${lockedString(UIStringsNotTranslate.manageInSettings)}>
              ${lockedString(UIStringsNotTranslate.manageInSettings)}
            </devtools-button>
            <devtools-button
              @click=${() => {
            result.resolve(true);
            dialog.hide();
        }}
              jslogcontext="ai-code-generation-upgrade-dialog.continue"
              .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}>
              ${lockedString(UIStringsNotTranslate.generateCode)}
            </devtools-button>
          </div>
        </footer>
      </div>`, dialog.contentElement);
        // clang-format on
        dialog.setOutsideClickCallback(ev => {
            ev.consume(true);
        });
        dialog.setOnHideCallback(() => {
            result.resolve(false);
        });
        dialog.setSizeBehavior("MeasureContent" /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */);
        dialog.setDimmed(true);
        dialog.show();
        return result.promise;
    }
    constructor() {
    }
}
//# sourceMappingURL=AiCodeGenerationUpgradeDialog.js.map
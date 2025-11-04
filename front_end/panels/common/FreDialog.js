// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as i18n from '../../core/i18n/i18n.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import styles from './freDialog.css.js';
const { html, Directives: { ifDefined } } = Lit;
const UIStrings = {
    /**
     * @description Header text for the feature reminder dialog.
     */
    thingsToConsider: 'Things to consider',
    /**
     * @description Text for the learn more button in the feature reminder dialog.
     */
    learnMore: 'Learn more',
    /**
     * @description Text for the cancel button in the feature reminder dialog.
     */
    cancel: 'Cancel',
    /**
     * @description Text for the got it button in the feature reminder dialog.
     */
    gotIt: 'Got it',
};
const str_ = i18n.i18n.registerUIStrings('panels/common/FreDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class FreDialog {
    static show({ header, reminderItems, onLearnMoreClick, ariaLabel, learnMoreButtonText, learnMoreButtonAriaLabel }) {
        const dialog = new UI.Dialog.Dialog();
        if (ariaLabel) {
            dialog.setAriaLabel(ariaLabel);
        }
        const result = Promise.withResolvers();
        // clang-format off
        Lit.render(html `
      <div class="fre-disclaimer">
        <style>
          ${styles}
        </style>
        <header>
          <div class="header-icon-container">
            <devtools-icon name=${header.iconName}></devtools-icon>
          </div>
          <h2 tabindex="-1">
            ${header.text}
          </h2>
        </header>
        <main class="reminder-container">
          <h3>${i18nString(UIStrings.thingsToConsider)}</h3>
          ${reminderItems.map(reminderItem => html `
            <div class="reminder-item">
              <devtools-icon class="reminder-icon" name=${reminderItem.iconName}></devtools-icon>
              <span>${reminderItem.content}</span>
            </div>
          `)}
        </main>
        <footer>
          <devtools-button
            @click=${onLearnMoreClick}
            .jslogContext=${'fre-disclaimer.learn-more'}
            .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
            .title=${learnMoreButtonAriaLabel ?? i18nString(UIStrings.learnMore)}
            aria-label=${ifDefined(learnMoreButtonAriaLabel)}>
            ${learnMoreButtonText ?? i18nString(UIStrings.learnMore)}
          </devtools-button>
          <div class="right-buttons">
            <devtools-button
              @click=${() => {
            // The order of operations are important here as hiding the dialog by
            // itself causes the promise to be resolved with `false` in `onHideCallback`.
            result.resolve(false);
            dialog.hide();
        }}
              .jslogContext=${'fre-disclaimer.cancel'}
              .variant=${"tonal" /* Buttons.Button.Variant.TONAL */}>
              ${i18nString(UIStrings.cancel)}
            </devtools-button>
            <devtools-button
              @click=${() => {
            // The order of operations are important here as hiding the dialog by
            // itself causes the promise to be resolved with `false` in `onHideCallback`.
            result.resolve(true);
            dialog.hide();
        }}
              .jslogContext=${'fre-disclaimer.continue'}
              .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}>
              ${i18nString(UIStrings.gotIt)}
            </devtools-button>
          </div>
        </footer>
      </div>`, dialog.contentElement);
        // clang-format on
        dialog.setOutsideClickCallback(ev => {
            ev.consume(true); // true = preventDefault()
            dialog.hide();
            result.resolve(false);
        });
        // This ensures that if the dialog gets hidden for any unexpected reason,
        // or if the user goes to another panel and comes back, that we resolve
        // rather than leave the promise dangling.
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
//# sourceMappingURL=FreDialog.js.map
// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import styles from './freDialog.css.js';

const {html, Directives: {ifDefined}} = Lit;

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
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/common/FreDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class FreDialog {
  static show({header, reminderItems, onLearnMoreClick, ariaLabel, learnMoreButtonTitle, learnMoreButtonAriaLabel}: {
    header: {
      iconName: string,
      text: Platform.UIString.LocalizedString,
    },
    reminderItems: Array<{
      iconName: string,
      content: Platform.UIString.LocalizedString|Lit.LitTemplate,
    }>,
    onLearnMoreClick: () => void,
    ariaLabel?: string,
    learnMoreButtonTitle?: string,
    learnMoreButtonAriaLabel?: string,
  }): Promise<boolean> {
    const dialog = new UI.Dialog.Dialog();
    if (ariaLabel) {
      dialog.setAriaLabel(ariaLabel);
    }
    const result = Promise.withResolvers<boolean>();
    // clang-format off
    Lit.render(html`
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
          ${reminderItems.map(reminderItem => html`
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
            .variant=${Buttons.Button.Variant.OUTLINED}
            aria-label=${ifDefined(learnMoreButtonAriaLabel)}>
            ${learnMoreButtonTitle ?? i18nString(UIStrings.learnMore)}
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
              .variant=${Buttons.Button.Variant.TONAL}>
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
              .variant=${Buttons.Button.Variant.PRIMARY}>
              ${i18nString(UIStrings.gotIt)}
            </devtools-button>
          </div>
        </footer>
      </div>`, dialog.contentElement);
    // clang-format on

    dialog.setOutsideClickCallback(ev => {
      ev.consume(true);  // true = preventDefault()
      dialog.hide();
      result.resolve(false);
    });

    // This ensures that if the dialog gets hidden for any unexpected reason,
    // or if the user goes to another panel and comes back, that we resolve
    // rather than leave the promise dangling.
    dialog.setOnHideCallback(() => {
      result.resolve(false);
    });

    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MEASURE_CONTENT);
    dialog.setDimmed(true);
    dialog.show();

    return result.promise;
  }

  private constructor() {
  }
}

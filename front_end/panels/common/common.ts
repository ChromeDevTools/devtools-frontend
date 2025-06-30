// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */
/* eslint-disable rulesdir/no-imperative-dom-api */

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import commonStyles from './common.css.js';

const {html} = Lit;

const UIStrings = {
  /**
   *@description Header text for the feature reminder dialog.
   */
  thingsToConsider: 'Things to consider',
  /**
   *@description Text for the learn more button in the feature reminder dialog.
   */
  learnMore: 'Learn more',
  /**
   *@description Text for the cancel button in the feature reminder dialog.
   */
  cancel: 'Cancel',
  /**
   *@description Text for the cancel button in the "type to allow" dialog.
   */
  allow: 'Allow',
  /**
   *@description Text for the got it button in the feature reminder dialog.
   */
  gotIt: 'Got it',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/common/common.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class FreDialog {
  static show({header, reminderItems, onLearnMoreClick, ariaLabel, learnMoreButtonTitle}: {
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
          ${commonStyles}
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
            .variant=${Buttons.Button.Variant.OUTLINED}>
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

export class TypeToAllowDialog {
  static async show(options: {
    jslogContext: {
      dialog: string,
      input: string,
    },
    header: Platform.UIString.LocalizedString,
    message: Platform.UIString.LocalizedString,
    typePhrase: Platform.UIString.LocalizedString,
    inputPlaceholder: Platform.UIString.LocalizedString,
  }): Promise<boolean> {
    const dialog = new UI.Dialog.Dialog(options.jslogContext.dialog);
    dialog.setMaxContentSize(new UI.Geometry.Size(504, 340));
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.SET_EXACT_WIDTH_MAX_HEIGHT);
    dialog.setDimmed(true);
    const shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(dialog.contentElement, {cssFile: commonStyles});
    const content = shadowRoot.createChild('div', 'type-to-allow-dialog');

    const result = await new Promise<boolean>(resolve => {
      const header = content.createChild('div', 'header');
      header.createChild('div', 'title').textContent = options.header;

      const closeButton = header.createChild('dt-close-button', 'dialog-close-button');
      closeButton.setTabbable(true);
      self.onInvokeElement(closeButton, event => {
        dialog.hide();
        event.consume(true);
        resolve(false);
      });
      closeButton.setSize(Buttons.Button.Size.SMALL);

      content.createChild('div', 'message').textContent = options.message;

      const input = UI.UIUtils.createInput('text-input', 'text', options.jslogContext.input);
      input.placeholder = options.inputPlaceholder;
      content.appendChild(input);

      const buttonsBar = content.createChild('div', 'button');
      const cancelButton =
          UI.UIUtils.createTextButton(i18nString(UIStrings.cancel), () => resolve(false), {jslogContext: 'cancel'});

      const allowButton = UI.UIUtils.createTextButton(i18nString(UIStrings.allow), () => {
        resolve(input.value === options.typePhrase);
      }, {jslogContext: 'confirm', variant: Buttons.Button.Variant.PRIMARY});
      allowButton.disabled = true;

      buttonsBar.appendChild(allowButton);
      buttonsBar.appendChild(cancelButton);

      input.addEventListener('input', () => {
        allowButton.disabled = !Boolean(input.value);
      }, false);
      input.addEventListener('paste', e => e.preventDefault());
      input.addEventListener('drop', e => e.preventDefault());

      dialog.setOutsideClickCallback(event => {
        event.consume();
        resolve(false);
      });
      dialog.show();
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.SelfXssWarningDialogShown);
    });
    dialog.hide();
    return result;
  }
}

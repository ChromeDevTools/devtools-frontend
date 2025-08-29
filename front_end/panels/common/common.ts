// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no-imperative-dom-api */

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';

import commonStyles from './common.css.js';

const UIStrings = {
  /**
   * @description Text for the cancel button in the dialog.
   */
  cancel: 'Cancel',
  /**
   * @description Text for the allow button in the "type to allow" dialog.
   */
  allow: 'Allow',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/common/common.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

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

export {AiCodeCompletionTeaser} from './AiCodeCompletionTeaser.js';
export {FreDialog} from './FreDialog.js';
export {AiCodeCompletionDisclaimer} from './AiCodeCompletionDisclaimer.js';
export {AiCodeCompletionSummaryToolbar} from './AiCodeCompletionSummaryToolbar.js';

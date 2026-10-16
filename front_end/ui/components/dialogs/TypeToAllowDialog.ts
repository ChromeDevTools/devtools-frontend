// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Geometry from '../../geometry/geometry.js';
import * as Lit from '../../lit/lit.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';

import typeToAllowDialogStyles from './typeToAllowDialog.css.js';

const {html, Directives: {ref}} = Lit;

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

const str_ = i18n.i18n.registerUIStrings('ui/components/dialogs/TypeToAllowDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ViewInput {
  header: Platform.UIString.LocalizedString;
  message: Platform.UIString.LocalizedString;
  inputPlaceholder: Platform.UIString.LocalizedString;
  inputJslogContext: string;
  allowDisabled: boolean;
  onInput: (value: string) => void;
  onClose: (event: Event) => void;
  onAllow: () => void;
  onCancel: () => void;
}

type View = (input: ViewInput, output: undefined, target: HTMLElement|ShadowRoot) => void;

const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  Lit.render(html`
    <div class="type-to-allow-dialog">
      <div class="header">
        <div class="title">${input.header}</div>
        <dt-close-button
          class="dialog-close-button"
          ${ref(el => {
            if (el instanceof UI.UIUtils.DevToolsCloseButton) {
              el.setTabbable(true);
              el.setSize(Buttons.Button.Size.SMALL);
            }
          })}
          @click=${input.onClose}
        ></dt-close-button>
      </div>
      <div class="message">${input.message}</div>
      <input
        class="harmony-input text-input"
        type="text"
        placeholder=${input.inputPlaceholder}
        jslog=${VisualLogging.textField().track({keydown: 'ArrowUp|ArrowDown|PageUp|PageDown|Enter|Tab', change: true}).context(input.inputJslogContext)}
        @input=${(e: Event) => input.onInput((e.target as HTMLInputElement).value)}
        @paste=${(e: Event) => e.preventDefault()}
        @drop=${(e: Event) => e.preventDefault()}
      >
      <div class="button">
        <devtools-button
          class="text-button"
          .variant=${Buttons.Button.Variant.PRIMARY}
          .jslogContext=${'confirm'}
          .disabled=${input.allowDisabled}
          @click=${input.onAllow}
        >${i18nString(UIStrings.allow)}</devtools-button>
        <devtools-button
          class="text-button"
          .variant=${Buttons.Button.Variant.OUTLINED}
          .jslogContext=${'cancel'}
          @click=${input.onCancel}
        >${i18nString(UIStrings.cancel)}</devtools-button>
      </div>
    </div>
  `, target);
  // clang-format on
};

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
  },
                    view: View = DEFAULT_VIEW): Promise<boolean> {
    const dialog = new UI.Dialog.Dialog(options.jslogContext.dialog);
    dialog.setMaxContentSize(new Geometry.Size(504, 340));
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.SET_EXACT_WIDTH_MAX_HEIGHT);
    dialog.setDimmed(true);
    const shadowRoot =
        UI.UIUtils.createShadowRootWithCoreStyles(dialog.contentElement, {cssFile: typeToAllowDialogStyles});

    const result = await new Promise<boolean>(resolve => {
      let currentValue = '';
      const update = (): void => {
        view({
          header: options.header,
          message: options.message,
          inputPlaceholder: options.inputPlaceholder,
          inputJslogContext: options.jslogContext.input,
          allowDisabled: !Boolean(currentValue),
          onInput: (value: string) => {
            currentValue = value;
            update();
          },
          onClose: (event: Event) => {
            dialog.hide();
            event.consume(true);
            resolve(false);
          },
          onAllow: () => {
            resolve(currentValue === options.typePhrase || currentValue === `'${options.typePhrase}'`);
          },
          onCancel: () => {
            resolve(false);
          },
        },
             undefined, shadowRoot);
      };
      update();

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

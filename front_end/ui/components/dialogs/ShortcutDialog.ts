// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import './ButtonDialog.js';

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import type {ButtonDialogData} from './ButtonDialog.js';
import shortcutDialogStyles from './shortcutDialog.css.js';

const {html} = LitHtml;

const UIStrings = {

  /**
   * @description Title of question mark button for the shortcuts dialog.
   */
  showShortcutTitle: 'Show shortcuts',
  /**
   * @description Title of the keyboard shortcuts help menu.
   */
  dialogTitle: 'Keyboard shortcuts',
};

const str_ = i18n.i18n.registerUIStrings('ui/components/dialogs/ShortcutDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-shortcut-dialog': ShortcutDialog;
  }
}

export interface Shortcut {
  title: string|Platform.UIString.LocalizedString;
  bindings: string[][];
}
export interface ShortcutDialogData {
  shortcuts: Shortcut[];
  open?: boolean;
}

export class ShortcutDialog extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #renderBound = this.#render.bind(this);

  #shortcuts: Shortcut[] = [];
  #openOnRender = false;
  #prependedElement: HTMLElement|null = null;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [shortcutDialogStyles];
  }

  set data(data: ShortcutDialogData) {
    this.#shortcuts = data.shortcuts;
    if (data.open) {
      this.#openOnRender = data.open;
    }

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  prependElement(element: HTMLElement): void {
    this.#prependedElement = element;
  }

  #render(): void {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('Shortcut dialog render was not scheduled');
    }

    // clang-format off
    LitHtml.render(
      html`
      <devtools-button-dialog .data=${{
          openOnRender: this.#openOnRender,
          closeButton: true,
          dialogTitle: i18nString(UIStrings.dialogTitle),
          variant: Buttons.Button.Variant.TOOLBAR,
          iconName: 'help',
          iconTitle: i18nString(UIStrings.showShortcutTitle),
        } as ButtonDialogData}>
        <ul class="keybinds-list">
          ${(this.#prependedElement) ? html`${this.#prependedElement}` : LitHtml.nothing}
          ${this.#shortcuts.map(shortcut =>
            html`
              <li class="keybinds-list-item">
                <div class="keybinds-list-title">${shortcut.title}</div>
                <div class="shortcuts-for-actions">
                  ${shortcut.bindings.map(binding => {
                    return html`
                    <div class="keys-container">
                      ${binding.map(key => html`
                          <span class="keybinds-key">${key}</span>
                      `)}
                    </div>
                  `;
                    })}
                  </div>
              </li>`,
          )}
        </ul>
      </devtools-button-dialog>
      `,
      this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-shortcut-dialog', ShortcutDialog);

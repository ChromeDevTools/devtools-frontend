// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import {
  Dialog as DialogElement,
  DialogVerticalPosition,
  DialogHorizontalAlignment,
  type ClickOutsideDialogEvent,
} from './Dialog.js';
import shortcutDialogStyles from './shortcutDialog.css.js';

const UIStrings = {

  /**
   * @description Title of question mark button for the shortcuts dialog.
   */
  showShortcutTitle: 'Show shortcuts',
  /**
   * @description Title of the keyboard shortcuts help menu.
   */
  dialogTitle: 'Keyboard shortcuts',
  /**
   * @description Title of close button for the shortcuts dialog.
   */
  close: 'Close',
};

const str_ = i18n.i18n.registerUIStrings('ui/components/dialogs/ShortcutDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-shortcut-dialog': ShortcutDialog;
  }
}

export class ShowDialog extends Event {
  static readonly eventName = 'showdialog';

  constructor() {
    super(ShowDialog.eventName);
  }
}

export interface Shortcut {
  title: string|Platform.UIString.LocalizedString;
  bindings: string[];
}
export interface ShortcutDialogData {
  shortcuts: Shortcut[];
  open?: boolean;
}

export class ShortcutDialog extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-shortcut-dialog`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #renderBound = this.#render.bind(this);

  #dialog: DialogElement|null = null;
  #showButton: Buttons.Button.Button|null = null;
  #shortcuts: Shortcut[] = [];
  #openOnRender = false;

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

  #showDialog(): void {
    if (!this.#dialog) {
      throw new Error('Dialog not found');
    }
    void this.#dialog.setDialogVisible(true);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
    this.dispatchEvent(new ShowDialog());
  }

  #closeDialog(evt?: ClickOutsideDialogEvent): void {
    if (!this.#dialog) {
      throw new Error('Dialog not found');
    }
    void this.#dialog.setDialogVisible(false);
    if (evt) {
      evt.stopImmediatePropagation();
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }

  #render(): void {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('Shortcut dialog render was not scheduled');
    }

    // clang-format off
    LitHtml.render(
      LitHtml.html`
      <${Buttons.Button.Button.litTagName}
        @click=${this.#showDialog}
        on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
          this.#showButton = node as Buttons.Button.Button;
        })}
        .data=${{
          variant: Buttons.Button.Variant.TOOLBAR,
          iconName: 'help',
          title: i18nString(UIStrings.showShortcutTitle),
          iconWidth: '16px',
        } as Buttons.Button.ButtonData}
      ></${Buttons.Button.Button.litTagName}>
      <${DialogElement.litTagName}
        @clickoutsidedialog=${this.#closeDialog}
        .showConnector=${true}
        .origin=${(): Buttons.Button.Button => {
          if (!this.#showButton) {
            throw new Error('Button not found');
          }
          return this.#showButton;
        }}
        .position=${DialogVerticalPosition.BOTTOM}
        .horizontalAlignment=${DialogHorizontalAlignment.RIGHT}
        on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
          this.#dialog = node as DialogElement;
        })}
      >
        <div class="keybinds-category-header">
          <span class="keybinds-category-header-text">${i18nString(UIStrings.dialogTitle)}</span>
          <${Buttons.Button.Button.litTagName}
            @click=${this.#closeDialog}
            class='close-icon'
            .data=${{
              variant: Buttons.Button.Variant.TOOLBAR,
              iconName: 'cross',
              title: i18nString(UIStrings.close),
            } as Buttons.Button.ButtonData}
          ></${Buttons.Button.Button.litTagName}>
        </div>
        <ul class="keybinds-list">
          ${this.#shortcuts.map(shortcut =>
            LitHtml.html`
              <li class="keybinds-list-item">
                <div class="keybinds-action-name keybinds-list-text">${shortcut.title}</div>
                ${shortcut.bindings.map((binding, index) =>
                  LitHtml.html`
                    <div class="keybinds-shortcut keybinds-list-text">
                      <span class="keybinds-key">${binding}</span>
                    </div>
                    ${shortcut.bindings.at(index + 1) ?
                      LitHtml.html`<span class="keybinds-shortcut-separator"> - </span>`
                      : LitHtml.nothing
                    }
                `)}
              </li>`,
          )}
        </ul>
      </${DialogElement.litTagName}>
      `,
      this.#shadow, {host: this});
    // clang-format on

    if (this.#openOnRender) {
      this.#showDialog();
      this.#openOnRender = false;
    }
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-shortcut-dialog', ShortcutDialog);

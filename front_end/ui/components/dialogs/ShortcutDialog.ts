// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import './ButtonDialog.js';

/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import {html, nothing, render, type TemplateResult} from '../../../ui/lit/lit.js';

import type {ButtonDialogData} from './ButtonDialog.js';
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
} as const;

const str_ = i18n.i18n.registerUIStrings('ui/components/dialogs/ShortcutDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-shortcut-dialog': ShortcutDialog;
  }
}

export type ShortcutPart = {
  key: string,
}|{joinText: string};

export type ShortcutRow = ShortcutPart[]|{footnote: string};

export interface Shortcut {
  title: string|Platform.UIString.LocalizedString;
  rows: readonly ShortcutRow[];
}
export interface ShortcutDialogData {
  shortcuts: Shortcut[];
  open?: boolean;
  customTitle?: Platform.UIString.LocalizedString;
}

export class ShortcutDialog extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #shortcuts: Shortcut[] = [];
  #openOnRender = false;
  #customTitle?: Platform.UIString.LocalizedString;
  #prependedElement: HTMLElement|null = null;

  get data(): ShortcutDialogData {
    return {
      shortcuts: this.#shortcuts,
      open: this.#openOnRender,
      customTitle: this.#customTitle,
    };
  }

  set data(data: ShortcutDialogData) {
    this.#shortcuts = data.shortcuts;
    if (data.open) {
      this.#openOnRender = data.open;
    }
    if (data.customTitle) {
      this.#customTitle = data.customTitle;
    }

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  prependElement(element: HTMLElement): void {
    this.#prependedElement = element;
  }

  #renderRow(row: ShortcutRow): TemplateResult {
    if (!Array.isArray(row)) {
      // If it's not an array it's a footnote, which is the easier case, so
      // render that and return.
      return html`<span class="footnote">${row.footnote}</span>`;
    }

    return html`${row.map(part => {
      if ('key' in part) {
        return html`<span class="keybinds-key">${part.key}</span>`;
      }
      return html`<span class="keybinds-join-text">${part.joinText}</span>`;
    })}
    `;
  }

  #render(): void {
    if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
      throw new Error('Shortcut dialog render was not scheduled');
    }

    // clang-format off
    render(
      html`
      <style>${shortcutDialogStyles}</style>
      <devtools-button-dialog .data=${{
          openOnRender: this.#openOnRender,
          closeButton: true,
          dialogTitle: this.#customTitle ?? i18nString(UIStrings.dialogTitle),
          variant: Buttons.Button.Variant.TOOLBAR,
          iconName: 'help',
          iconTitle: i18nString(UIStrings.showShortcutTitle),
        } as ButtonDialogData}>
        <ul class="keybinds-list">
          ${(this.#prependedElement) ? html`${this.#prependedElement}` : nothing}
          ${this.#shortcuts.map(shortcut =>
            html`
              <li class="keybinds-list-item">
                <div class="keybinds-list-title">${shortcut.title}</div>
                <div class="shortcuts-for-actions">
                  ${shortcut.rows.map(row => {
                    return html`<div class="row-container">${this.#renderRow(row)}</div>
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

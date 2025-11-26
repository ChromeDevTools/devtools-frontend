// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/enforce-custom-element-definitions-location */
import './ButtonDialog.js';
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import { html, nothing, render } from '../../../ui/lit/lit.js';
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
};
const str_ = i18n.i18n.registerUIStrings('ui/components/dialogs/ShortcutDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ShortcutDialog extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #shortcuts = [];
    #openOnRender = false;
    #customTitle;
    #prependedElement = null;
    get data() {
        return {
            shortcuts: this.#shortcuts,
            open: this.#openOnRender,
            customTitle: this.#customTitle,
        };
    }
    set data(data) {
        this.#shortcuts = data.shortcuts;
        if (data.open) {
            this.#openOnRender = data.open;
        }
        if (data.customTitle) {
            this.#customTitle = data.customTitle;
        }
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    prependElement(element) {
        this.#prependedElement = element;
    }
    #renderRow(row) {
        if (!Array.isArray(row)) {
            // If it's not an array it's a footnote, which is the easier case, so
            // render that and return.
            return html `<span class="footnote">${row.footnote}</span>`;
        }
        return html `${row.map(part => {
            if ('key' in part) {
                return html `<span class="keybinds-key">${part.key}</span>`;
            }
            return html `<span class="keybinds-join-text">${part.joinText}</span>`;
        })}
    `;
    }
    #render() {
        if (!ComponentHelpers.ScheduledRender.isScheduledRender(this)) {
            throw new Error('Shortcut dialog render was not scheduled');
        }
        // clang-format off
        render(html `
      <style>${shortcutDialogStyles}</style>
      <devtools-button-dialog .data=${{
            openOnRender: this.#openOnRender,
            closeButton: true,
            dialogTitle: this.#customTitle ?? i18nString(UIStrings.dialogTitle),
            variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */,
            iconName: 'help',
            iconTitle: i18nString(UIStrings.showShortcutTitle),
        }}>
        <ul class="keybinds-list">
          ${(this.#prependedElement) ? html `${this.#prependedElement}` : nothing}
          ${this.#shortcuts.map(shortcut => html `
              <li class="keybinds-list-item">
                <div class="keybinds-list-title">${shortcut.title}</div>
                <div class="shortcuts-for-actions">
                  ${shortcut.rows.map(row => {
            return html `<div class="row-container">${this.#renderRow(row)}</div>
                  `;
        })}
                </div>
              </li>`)}
        </ul>
      </devtools-button-dialog>
      `, this.#shadow, { host: this });
        // clang-format on
    }
}
customElements.define('devtools-shortcut-dialog', ShortcutDialog);
//# sourceMappingURL=ShortcutDialog.js.map
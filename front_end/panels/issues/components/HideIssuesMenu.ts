
// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import hideIssuesMenuStyles from './hideIssuesMenu.css.js';

const UIStrings = {
  /**
   *@description Title for the tooltip of the (3 dots) Hide Issues menu icon.
   */
  tooltipTitle: 'Hide issues',
};

const str_ = i18n.i18n.registerUIStrings('panels/issues/components/HideIssuesMenu.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface HiddenIssuesMenuData {
  menuItemLabel: Common.UIString.LocalizedString;
  menuItemAction: () => void;
}

export class HideIssuesMenu extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-hide-issues-menu`;
  readonly #shadow: ShadowRoot = this.attachShadow({mode: 'open'});
  #menuItemLabel: Common.UIString.LocalizedString = Common.UIString.LocalizedEmptyString;
  #menuItemAction: () => void = () => {};

  set data(data: HiddenIssuesMenuData) {
    this.#menuItemLabel = data.menuItemLabel;
    this.#menuItemAction = data.menuItemAction;
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [hideIssuesMenuStyles];
  }

  onMenuOpen(event: Event): void {
    event.stopPropagation();
    const buttonElement = this.#shadow.querySelector('button');
    const contextMenu = new UI.ContextMenu.ContextMenu(event, {
      useSoftMenu: true,
      onSoftMenuClosed: () => {
        this.classList.toggle('has-context-menu-opened', false);
      },
      x: buttonElement?.getBoundingClientRect().left,
      y: buttonElement?.getBoundingClientRect().bottom,
    });
    contextMenu.headerSection().appendItem(
        this.#menuItemLabel, () => this.#menuItemAction(), {jslogContext: 'toggle-similar-issues'});
    void contextMenu.show();
    this.classList.toggle('has-context-menu-opened', true);
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <button class="hide-issues-menu-btn" @click=${this.onMenuOpen.bind(this)} title=${i18nString(UIStrings.tooltipTitle)}>
        <${IconButton.Icon.Icon.litTagName} name="dots-vertical" jslog=${VisualLogging.dropDown('hide-issues').track({click: true})}></${IconButton.Icon.Icon.litTagName}>
      </button>
    `, this.#shadow, {host: this});
  }
}

customElements.define('devtools-hide-issues-menu', HideIssuesMenu);

declare global {

  interface HTMLElementTagNameMap {
    'devtools-hide-issues-menu': HideIssuesMenu;
  }
}

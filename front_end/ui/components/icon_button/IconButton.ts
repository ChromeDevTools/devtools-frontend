// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Icon.js';

import * as Lit from '../../lit/lit.js';

import type {IconData} from './Icon.js';
import iconButtonStyles from './iconButton.css.js';

const {html} = Lit;

export interface IconWithTextData {
  iconName: string;
  iconColor?: string;
  iconWidth?: string;
  iconHeight?: string;
  text?: string;
}

export interface IconButtonData {
  clickHandler?: () => void;
  groups: IconWithTextData[];
  leadingText?: string;
  trailingText?: string;
  accessibleName?: string;
  compact?: boolean;
}

export class IconButton extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #clickHandler: undefined|(() => void) = undefined;
  #groups: IconWithTextData[] = [];
  #compact = false;
  #leadingText = '';
  #trailingText = '';
  #accessibleName: string|undefined;

  set data(data: IconButtonData) {
    this.#groups = data.groups.map(group => ({...group}));  // Ensure we make a deep copy.
    this.#clickHandler = data.clickHandler;
    this.#trailingText = data.trailingText ?? '';
    this.#leadingText = data.leadingText ?? '';
    this.#accessibleName = data.accessibleName;
    this.#compact = Boolean(data.compact);
    this.#render();
  }

  get data(): IconButtonData {
    return {
      groups: this.#groups.map(group => ({...group})),  // Ensure we make a deep copy.
      accessibleName: this.#accessibleName,
      clickHandler: this.#clickHandler,
      leadingText: this.#leadingText,
      trailingText: this.#trailingText,
      compact: this.#compact,
    };
  }

  #onClickHandler(event: Event): void {
    if (this.#clickHandler) {
      event.preventDefault();
      this.#clickHandler();
    }
  }

  #render(): void {
    const buttonClasses = Lit.Directives.classMap({
      'icon-button': true,
      'with-click-handler': Boolean(this.#clickHandler),
      compact: this.#compact,
    });
    const filteredGroups = this.#groups.filter(counter => counter.text !== undefined)
                               .filter((_, index) => this.#compact ? index === 0 : true);
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    Lit.render(html`
      <style>${iconButtonStyles.cssContent}</style>
      <button class=${buttonClasses} @click=${this.#onClickHandler} aria-label=${Lit.Directives.ifDefined(this.#accessibleName)}>
      ${(!this.#compact && this.#leadingText) ? html`<span class="icon-button-title">${this.#leadingText}</span>` : Lit.nothing}
      ${filteredGroups.map(counter =>
      html`
      <devtools-icon class="status-icon"
      .data=${{iconName: counter.iconName, color: counter.iconColor, width: counter.iconWidth || '1.5ex', height: counter.iconHeight || '1.5ex'} as IconData}>
      </devtools-icon>
      ${this.#compact ? html`<!-- Force line-height for this element --><span>&#8203;</span>` : Lit.nothing}
      <span class="icon-button-title">${counter.text}</span>`,
      )}
      </button>
      ${(!this.#compact && this.#trailingText) ? html`<span class="icon-button-title">${this.#trailingText}</span>` : Lit.nothing}
    `, this.#shadow, { host: this});
    // clang-format on
  }
}

customElements.define('icon-button', IconButton);

declare global {
  interface HTMLElementTagNameMap {
    'icon-button': IconButton;
  }
}

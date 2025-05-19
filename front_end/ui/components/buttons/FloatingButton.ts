// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../icon_button/icon_button.js';

import * as Lit from '../../lit/lit.js';

import floatingButtonStyles from './floatingButton.css.js';

const {html} = Lit;

/**
 * A simple floating button component, primarily used to display the 'Ask AI!'
 * teaser when hovering over specific UI elements.
 *
 * Usage is simple:
 *
 * ```js
 * // Instantiate programmatically via the `create()` helper:
 * const button = Buttons.FloatingButton.create('smart-assistant', 'Ask AI!');
 *
 * // Use within a template:
 * html`
 * <devtools-floating-button icon-name="smart-assistant"
 *                           title="Ask AI!">
 * </devtools-floating-button>
 * `;
 * ```
 *
 * @attr icon-name - The basename of the icon file (not including the `.svg`
 *                   suffix).
 * @prop {String} iconName - The `"icon-name"` attribute is reflected as property.
 */
export class FloatingButton extends HTMLElement {
  static readonly observedAttributes = ['icon-name'];

  readonly #shadow = this.attachShadow({mode: 'open'});

  constructor() {
    super();
    this.role = 'presentation';
    this.#render();
  }

  /**
   * Yields the value of the `"icon-name"` attribute of this `FloatingButton`
   * (`null` in case there's no `"icon-name"` on this element).
   */
  get iconName(): string|null {
    return this.getAttribute('icon-name');
  }

  /**
   * Changes the value of the `"icon-name"` attribute of this `FloatingButton`.
   * If you pass `null`, the `"icon-name"` attribute will be removed from this
   * element.
   *
   * @param the new icon name or `null` to unset.
   */
  set iconName(iconName: string|null) {
    if (iconName === null) {
      this.removeAttribute('icon-name');
    } else {
      this.setAttribute('icon-name', iconName);
    }
  }

  attributeChangedCallback(name: string, oldValue: string|null, newValue: string|null): void {
    if (oldValue === newValue) {
      return;
    }
    if (name === 'icon-name') {
      this.#render();
    }
  }

  #render(): void {
    // clang-format off
    Lit.render(
        html`<style>${floatingButtonStyles}</style><button><devtools-icon .name=${this.iconName}></devtools-icon></button>`,
        this.#shadow, {host: this});
    // clang-format on
  }
}

/**
 * Helper function to programmatically create a `FloatingButton` instance with a
 * given `iconName` and `title`.
 *
 * @param iconName the name of the icon to use.
 * @param title the tooltip for the `FloatingButton`
 * @returns the newly created `FloatingButton` instance.
 */
export const create = (iconName: string, title: string): FloatingButton => {
  const floatingButton = new FloatingButton();
  floatingButton.iconName = iconName;
  floatingButton.title = title;
  return floatingButton;
};

customElements.define('devtools-floating-button', FloatingButton);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-floating-button': FloatingButton;
  }
}

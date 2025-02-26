// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {html, nothing, render} from '../../lit/lit.js';

import cardStyles from './card.css.js';

/**
 * A simple card component to display a Material card with a heading and content.
 *
 * Usage is simple:
 *
 * ```
 * // Instantiate programmatically:
 * const card = document.createElement('devtools-card');
 * card.heading = 'My awesome card';
 * card.append(content1, content2);
 *
 * // Use within a template:
 * html`
 *   <devtools-card heading="My awesome card">
 *     <div>content1</div>
 *     <div>content2</div>
 *   </devtools-card>
 * `;
 * ```
 *
 * The heading can be further customized with a prefix and a suffix if needed.
 * These are arbitrary children that can be slotted into the `"heading-prefix"`
 * and `"heading-suffix"` slots if required. Example:
 *
 * ```
 * html`
 *   <devtools-card heading="Rich heading">
 *     <devtools-icon name="folder" slot="heading-prefix"></devtools-icon>
 *     <devtools-button slot="heading-suffix">Remove</devtools-button>
 *   </devtools-card>
 * `;
 * ```
 *
 * @attr heading - The heading text.
 * @prop {String} heading - The `"heading"` attribute is reflect as property.
 */
export class Card extends HTMLElement {
  static readonly observedAttributes = ['heading'];

  readonly #shadow = this.attachShadow({mode: 'open'});

  constructor() {
    super();
    this.#render();
  }

  /**
   * Yields the value of the `"heading"` attribute of this `Card`.
   *
   * @returns the value of the `"heading"` attribute or `null` if the attribute
   *          is absent.
   */
  get heading(): string|null {
    return this.getAttribute('heading');
  }

  /**
   * Changes the value of the `"heading"` attribute of this `Card`. If you pass
   * `null`, the `"heading"` attribute will be removed from this element.
   *
   * @param heading the new heading of `null` to unset.
   */
  set heading(heading: string|null) {
    if (heading) {
      this.setAttribute('heading', heading);
    } else {
      this.removeAttribute('heading');
    }
  }

  attributeChangedCallback(_name: string, oldValue: string|null, newValue: string|null): void {
    if (oldValue !== newValue) {
      this.#render();
    }
  }

  #render(): void {
    render(
        html`
        <style>${cardStyles.cssContent}</style>
        <div id="card">
          <div id="heading">
            <slot name="heading-prefix"></slot>
            <div role="heading" aria-level="2">${this.heading ?? nothing}</div>
            <slot name="heading-suffix"></slot>
          </div>
          <slot id="content"></slot>
        </div>`,
        this.#shadow, {host: this});
  }
}

customElements.define('devtools-card', Card);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-card': Card;
  }
}

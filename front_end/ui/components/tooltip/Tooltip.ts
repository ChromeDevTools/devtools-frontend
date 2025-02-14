// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../lit/lit.js';

import tooltipStyles from './tooltip.css.js';

const {html} = Lit;

export type TooltipVariant = 'simple'|'rich';

/**
 * @attr id - Id of the tooltip. Used for searching an anchor element with aria-describedby.
 * @attr hover-delay - Hover length in ms before the tooltip is shown and hidden.
 * @attr variant - Variant of the tooltip, `"simple"` for strings only, inverted background,
 *                 `"rich"` for interactive content, background according to theme's surface.
 * @prop {String} id - reflects the `"id"` attribute.
 * @prop {Number} hoverDelay - reflects the `"hover-delay"` attribute.
 * @prop {String} variant - reflects the `"variant"` attribute.
 */
export class Tooltip extends HTMLElement {
  static readonly observedAttributes = ['id', 'variant'];

  readonly #shadow = this.attachShadow({mode: 'open'});
  #anchor: HTMLElement|null = null;
  #timeout: number|null = null;

  get hoverDelay(): number {
    return this.hasAttribute('hover-delay') ? Number(this.getAttribute('hover-delay')) : 200;
  }
  set hoverDelay(delay: number) {
    this.setAttribute('hover-delay', delay.toString());
  }

  get variant(): TooltipVariant {
    return this.getAttribute('variant') === 'rich' ? 'rich' : 'simple';
  }
  set variant(variant: TooltipVariant) {
    this.setAttribute('variant', variant);
  }

  attributeChangedCallback(name: string): void {
    if (name === 'id') {
      this.#removeEventListeners();
      this.#attachToAnchor();
    }
  }

  connectedCallback(): void {
    this.#attachToAnchor();
    this.#registerEventListeners();
    this.#setAttributes();

    // clang-format off
    Lit.render(html`
      <style>${tooltipStyles.cssContent}</style>
      <!-- Wrapping it into a container, so that the tooltip doesn't disappear when the mouse moves from the anchor to the tooltip. -->
      <div class="container">
        <slot></slot>
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  disconnectedCallback(): void {
    this.#removeEventListeners();
  }

  showTooltip = (): void => {
    if (this.#timeout) {
      window.clearTimeout(this.#timeout);
    }
    this.#timeout = window.setTimeout(() => {
      this.showPopover();
    }, this.hoverDelay);
  };

  hideTooltip = (event: MouseEvent): void => {
    if (this.#timeout) {
      window.clearTimeout(this.#timeout);
    }
    // Don't hide a rich tooltip when hovering over the tooltip itself.
    if (this.variant === 'rich' && event.relatedTarget === this) {
      return;
    }
    this.#timeout = window.setTimeout(() => {
      this.hidePopover();
    }, this.hoverDelay);
  };

  #setAttributes(): void {
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'tooltip');
    }
    this.setAttribute('popover', 'manual');
  }

  #preventDefault(event: Event): void {
    event.preventDefault();
  }

  #stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  #registerEventListeners(): void {
    if (this.#anchor) {
      this.#anchor.addEventListener('mouseenter', this.showTooltip);
      this.#anchor.addEventListener('mouseleave', this.hideTooltip);
      // By default the anchor with a popovertarget would toggle the popover on click.
      this.#anchor.addEventListener('click', this.#preventDefault);
    }
    this.addEventListener('mouseleave', this.hideTooltip);
    // Prevent interaction with the parent element.
    this.addEventListener('click', this.#stopPropagation);
    this.addEventListener('mouseup', this.#stopPropagation);
  }

  #removeEventListeners(): void {
    if (this.#anchor) {
      this.#anchor.removeEventListener('mouseenter', this.showTooltip);
      this.#anchor.removeEventListener('mouseleave', this.hideTooltip);
      this.#anchor.removeEventListener('click', this.#preventDefault);
    }
    this.removeEventListener('mouseleave', this.hideTooltip);
    this.removeEventListener('click', this.#stopPropagation);
    this.removeEventListener('mouseup', this.#stopPropagation);
  }

  #attachToAnchor(): void {
    const id = this.getAttribute('id');
    if (!id) {
      throw new Error('<devtools-tooltip> must have an id.');
    }
    const anchor = (this.getRootNode() as Element).querySelector(`[aria-describedby="${id}"]`);
    if (!anchor) {
      throw new Error(`No anchor for tooltip with id ${id} found.`);
    }
    if (!(anchor instanceof HTMLElement)) {
      throw new Error('Anchor must be an HTMLElement.');
    }

    const anchorName = `--${id}-anchor`;
    anchor.style.anchorName = anchorName;
    anchor.setAttribute('popovertarget', id);
    this.style.positionAnchor = anchorName;
    this.#anchor = anchor;
  }
}

customElements.define('devtools-tooltip', Tooltip);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-tooltip': Tooltip;
  }
  // Remove this once the CSSStyleDeclaration interface is updated in the TypeScript standard library.
  interface CSSStyleDeclaration {
    anchorName: string;
    positionAnchor: string;
  }
}

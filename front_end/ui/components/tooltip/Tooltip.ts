// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../lit/lit.js';

import tooltipStyles from './tooltip.css.js';

const {html} = Lit;

export type TooltipVariant = 'simple'|'rich';

export interface TooltipProperties {
  id?: string;
  variant?: TooltipVariant;
  anchor?: HTMLElement;
}

/**
 * @attr id - Id of the tooltip. Used for searching an anchor element with aria-describedby.
 * @attr hover-delay - Hover length in ms before the tooltip is shown and hidden.
 * @attr variant - Variant of the tooltip, `"simple"` for strings only, inverted background,
 *                 `"rich"` for interactive content, background according to theme's surface.
 * @attr use-click - If present, the tooltip will be shown on click instead of on hover.
 * @prop {String} id - reflects the `"id"` attribute.
 * @prop {Number} hoverDelay - reflects the `"hover-delay"` attribute.
 * @prop {String} variant - reflects the `"variant"` attribute.
 * @prop {Boolean} useClick - reflects the `"click"` attribute.
 */
export class Tooltip extends HTMLElement {
  static readonly observedAttributes = ['id', 'variant'];

  readonly #shadow = this.attachShadow({mode: 'open'});
  #anchor: HTMLElement|null = null;
  #timeout: number|null = null;
  #closing = false;

  get open(): boolean {
    return this.matches(':popover-open');
  }

  get useClick(): boolean {
    return this.hasAttribute('use-click') ?? false;
  }
  set useClick(useClick: boolean) {
    if (useClick) {
      this.setAttribute('use-click', '');
    } else {
      this.removeAttribute('use-click');
    }
  }

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

  constructor({id, variant, anchor}: TooltipProperties = {}) {
    super();
    if (id) {
      this.id = id;
    }
    if (variant) {
      this.variant = variant;
    }
    this.#anchor = anchor ?? null;
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) {
      // There is no need to do anything before the connectedCallback is called.
      return;
    }
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

  toggle = (): void => {
    // We need this check because clicking on the anchor while the tooltip is open will trigger both
    // the click event on the anchor and the toggle event from the backdrop of the tooltip.
    if (!this.#closing) {
      this.togglePopover();
    }
  };

  #setAttributes(): void {
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'tooltip');
    }
    this.setAttribute('popover', this.useClick ? 'auto' : 'manual');
  }

  #stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  #setClosing = (event: Event): void => {
    if ((event as ToggleEvent).newState === 'closed') {
      this.#closing = true;
    }
  };

  #resetClosing = (event: Event): void => {
    if ((event as ToggleEvent).newState === 'closed') {
      this.#closing = false;
    }
  };

  #registerEventListeners(): void {
    if (this.#anchor) {
      if (this.useClick) {
        this.#anchor.addEventListener('click', this.toggle);
      } else {
        this.#anchor.addEventListener('mouseenter', this.showTooltip);
        this.#anchor.addEventListener('mouseleave', this.hideTooltip);
        this.addEventListener('mouseleave', this.hideTooltip);
      }
    }
    // Prevent interaction with the parent element.
    this.addEventListener('click', this.#stopPropagation);
    this.addEventListener('mouseup', this.#stopPropagation);
    this.addEventListener('beforetoggle', this.#setClosing);
    this.addEventListener('toggle', this.#resetClosing);
  }

  #removeEventListeners(): void {
    if (this.#anchor) {
      this.#anchor.removeEventListener('click', this.toggle);
      this.#anchor.removeEventListener('mouseenter', this.showTooltip);
      this.#anchor.removeEventListener('mouseleave', this.hideTooltip);
    }
    this.removeEventListener('mouseleave', this.hideTooltip);
    this.removeEventListener('click', this.#stopPropagation);
    this.removeEventListener('mouseup', this.#stopPropagation);
    this.removeEventListener('beforetoggle', this.#setClosing);
    this.removeEventListener('toggle', this.#resetClosing);
  }

  #attachToAnchor(): void {
    const id = this.getAttribute('id');
    if (!id) {
      throw new Error('<devtools-tooltip> must have an id.');
    }
    const describedbyAnchor = closestAnchor(this, `[aria-describedby="${id}"]`);
    const detailsAnchor = closestAnchor(this, `[aria-details="${id}"]`);
    const anchor = this.#anchor ?? describedbyAnchor ?? detailsAnchor;
    if (!anchor) {
      throw new Error(`No anchor for tooltip with id ${id} found.`);
    }
    if (!(anchor instanceof HTMLElement)) {
      throw new Error('Anchor must be an HTMLElement.');
    }
    if (this.variant === 'rich' && describedbyAnchor) {
      console.warn(`The anchor for tooltip ${
          id} was defined with "aria-describedby". For rich tooltips "aria-details" is more appropriate.`);
    }

    const anchorName = `--${id}-anchor`;
    anchor.style.anchorName = anchorName;
    this.style.positionAnchor = anchorName;
    this.#anchor = anchor;
  }
}

export function closestAnchor(tooltip: Element, selector: string): Element|null {
  const anchors: NodeListOf<Element>|undefined = (tooltip.getRootNode() as Element)?.querySelectorAll(selector);
  // Find the last anchor with a matching selector that is before the tooltip in the document order.
  const anchor = [...anchors ?? []]
                     .filter(anchor => tooltip.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_PRECEDING)
                     .at(-1);
  return anchor ?? null;
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

// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../lit/lit.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';

import tooltipStyles from './tooltip.css.js';

const {html} = Lit;

export type TooltipVariant = 'simple'|'rich';

export interface TooltipProperties {
  id: string;
  variant?: TooltipVariant;
  anchor?: HTMLElement;
  jslogContext?: string;
}

/**
 * @attr id - Id of the tooltip. Used for searching an anchor element with aria-describedby.
 * @attr hover-delay - Hover length in ms before the tooltip is shown and hidden.
 * @attr variant - Variant of the tooltip, `"simple"` for strings only, inverted background, `"rich"` for interactive
 *                 content, background according to theme's surface.
 * @attr use-click - If present, the tooltip will be shown on click instead of on hover.
 * @attr use-hotkey - If present, the tooltip will be shown on hover but not when receiving focus. Requires a hotkey to
 *                    open when fosed (Alt-down). When `"use-click"` is present as well, use-click takes precedence.
 * @prop {String} id - reflects the `"id"` attribute.
 * @prop {Number} hoverDelay - reflects the `"hover-delay"` attribute.
 * @prop {String} variant - reflects the `"variant"` attribute.
 * @prop {Boolean} useClick - reflects the `"click"` attribute.
 * @prop {Boolean} useHotkey - reflects the `"use-hotkey"` attribute.
 */
export class Tooltip extends HTMLElement {
  static readonly observedAttributes = ['id', 'variant', 'jslogcontext'];
  static lastOpenedTooltipId: string|null = null;

  readonly #shadow = this.attachShadow({mode: 'open'});
  #anchor: HTMLElement|null = null;
  #timeout: number|null = null;
  #closing = false;
  #anchorObserver: MutationObserver|null = null;

  get open(): boolean {
    return this.matches(':popover-open');
  }

  get useHotkey(): boolean {
    return this.hasAttribute('use-hotkey') ?? false;
  }
  set useHotkey(useHotkey: boolean) {
    if (useHotkey) {
      this.setAttribute('use-hotkey', '');
    } else {
      this.removeAttribute('use-hotkey');
    }
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

  get jslogContext(): string|null {
    return this.getAttribute('jslogcontext');
  }
  set jslogContext(jslogContext: string) {
    this.setAttribute('jslogcontext', jslogContext);
    this.#updateJslog();
  }

  get anchor(): HTMLElement|null {
    return this.#anchor;
  }

  constructor(properties?: TooltipProperties) {
    super();
    if (properties) {
      this.id = properties.id;
    }
    if (properties?.variant) {
      this.variant = properties.variant;
    }
    if (properties?.jslogContext) {
      this.jslogContext = properties.jslogContext;
    }
    if (properties?.anchor) {
      const ref = properties.anchor.getAttribute('aria-details') ?? properties.anchor.getAttribute('aria-describedby');
      if (ref !== properties.id) {
        throw new Error('aria-details or aria-describedby must be set on the anchor');
      }
      this.#anchor = properties.anchor;
    }
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (!this.isConnected) {
      // There is no need to do anything before the connectedCallback is called.
      return;
    }
    if (name === 'id') {
      this.#removeEventListeners();
      this.#attachToAnchor();
      if (Tooltip.lastOpenedTooltipId === oldValue) {
        Tooltip.lastOpenedTooltipId = newValue;
      }
    } else if (name === 'jslogcontext') {
      this.#updateJslog();
    }
  }

  connectedCallback(): void {
    this.#attachToAnchor();
    this.#registerEventListeners();
    this.#setAttributes();

    // clang-format off
    Lit.render(html`
      <style>${tooltipStyles.cssText}</style>
      <!-- Wrapping it into a container, so that the tooltip doesn't disappear when the mouse moves from the anchor to the tooltip. -->
      <div class="container">
        <slot></slot>
      </div>
    `, this.#shadow, {host: this});
    // clang-format on

    if (Tooltip.lastOpenedTooltipId === this.id) {
      this.showPopover();
    }
  }

  disconnectedCallback(): void {
    this.#removeEventListeners();
    this.#anchorObserver?.disconnect();
  }

  showTooltip = (event?: MouseEvent|FocusEvent): void => {
    // Don't show the tooltip if the mouse is down.
    if (event && 'buttons' in event && event.buttons) {
      return;
    }
    if (this.#timeout) {
      window.clearTimeout(this.#timeout);
    }
    this.#timeout = window.setTimeout(() => {
      this.showPopover();
      Tooltip.lastOpenedTooltipId = this.id;
    }, this.hoverDelay);
  };

  hideTooltip = (event?: MouseEvent|FocusEvent): void => {
    if (this.#timeout) {
      window.clearTimeout(this.#timeout);
    }
    // If the event is a blur event, then:
    // 1. event.currentTarget = the element that got blurred
    // 2. event.relatedTarget = the element that gained focus
    // https://developer.mozilla.org/en-US/docs/Web/API/FocusEvent/relatedTarget
    // If the blurred element (1) was our anchor, and the newly focused element
    // (2) is within the tooltip, we do not want to hide the tooltip.
    if (event && this.variant === 'rich' && event.target === this.#anchor && event.relatedTarget instanceof Node &&
        this.contains(event.relatedTarget)) {
      return;
    }

    // Don't hide a rich tooltip when hovering over the tooltip itself.
    if (event && this.variant === 'rich' &&
        (event.relatedTarget === this || (event.relatedTarget as Element)?.parentElement === this)) {
      return;
    }
    if (this.open && Tooltip.lastOpenedTooltipId === this.id) {
      Tooltip.lastOpenedTooltipId = null;
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

  #updateJslog(): void {
    if (this.jslogContext && this.#anchor) {
      VisualLogging.setMappedParent(this, this.#anchor);
      this.setAttribute('jslog', VisualLogging.popover(this.jslogContext).parent('mapped').toString());
    } else {
      this.removeAttribute('jslog');
    }
  }

  #setAttributes(): void {
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'tooltip');
    }
    this.setAttribute('popover', this.useClick ? 'auto' : 'manual');
    this.#updateJslog();
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

  #keyDown = (event: KeyboardEvent): void => {
    if ((event.altKey && event.key === 'ArrowDown') || (event.key === 'Escape' && this.open)) {
      this.toggle();
      event.consume(true);
    }
  };

  #registerEventListeners(): void {
    if (this.#anchor) {
      if (this.useClick) {
        this.#anchor.addEventListener('click', this.toggle);
      } else {
        this.#anchor.addEventListener('mouseenter', this.showTooltip);
        if (this.useHotkey) {
          this.#anchor.addEventListener('keydown', this.#keyDown);
        } else {
          this.#anchor.addEventListener('focus', this.showTooltip);
        }
        this.#anchor.addEventListener('blur', this.hideTooltip);
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
    if (this.#timeout) {
      window.clearTimeout(this.#timeout);
    }
    if (this.#anchor) {
      this.#anchor.removeEventListener('click', this.toggle);
      this.#anchor.removeEventListener('mouseenter', this.showTooltip);
      this.#anchor.removeEventListener('focus', this.showTooltip);
      this.#anchor.removeEventListener('blur', this.hideTooltip);
      this.#anchor.removeEventListener('keydown', this.#keyDown);
      this.#anchor.removeEventListener('mouseleave', this.hideTooltip);
    }
    this.removeEventListener('mouseleave', this.hideTooltip);
    this.removeEventListener('click', this.#stopPropagation);
    this.removeEventListener('mouseup', this.#stopPropagation);
    this.removeEventListener('beforetoggle', this.#setClosing);
    this.removeEventListener('toggle', this.#resetClosing);
  }

  #attachToAnchor(): void {
    if (!this.#anchor) {
      const id = this.getAttribute('id');
      if (!id) {
        throw new Error('<devtools-tooltip> must have an id.');
      }
      const root = this.getRootNode() as Document | ShadowRoot;
      if (root.querySelectorAll(`#${id}`)?.length > 1) {
        throw new Error('Duplicate <devtools-tooltip> ids found.');
      }
      const describedbyAnchor = root.querySelector(`[aria-describedby="${id}"]`);
      const detailsAnchor = root.querySelector(`[aria-details="${id}"]`);
      const anchor = describedbyAnchor ?? detailsAnchor;
      if (!anchor) {
        throw new Error(`No anchor for tooltip with id ${id} found.`);
      }
      if (!(anchor instanceof HTMLElement)) {
        throw new Error('Anchor must be an HTMLElement.');
      }
      this.#anchor = anchor;
      if (this.variant === 'rich' && describedbyAnchor) {
        console.warn(`The anchor for tooltip ${
            id} was defined with "aria-describedby". For rich tooltips "aria-details" is more appropriate.`);
      }
    }

    const anchorName = `--devtools-tooltip-${this.id}-anchor`;
    this.#anchor.style.anchorName = anchorName;
    this.style.positionAnchor = anchorName;
    this.#observeAnchorRemoval(this.#anchor);

    this.#updateJslog();
  }

  #observeAnchorRemoval(anchor: Element): void {
    if (anchor.parentElement === null) {
      return;
    }
    if (this.#anchorObserver) {
      this.#anchorObserver.disconnect();
    }

    this.#anchorObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && [...mutation.removedNodes].includes(anchor)) {
          if (this.#timeout) {
            window.clearTimeout(this.#timeout);
          }
          this.hidePopover();
        }
      }
    });
    this.#anchorObserver.observe(anchor.parentElement, {childList: true});
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

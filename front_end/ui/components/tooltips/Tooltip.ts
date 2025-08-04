// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as UI from '../../legacy/legacy.js';
import * as Lit from '../../lit/lit.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';

import tooltipStyles from './tooltip.css.js';

const {html} = Lit;

interface ProposedRect {
  left: number;
  top: number;
}

interface PositioningParams {
  anchorRect: DOMRect;
  currentPopoverRect: DOMRect;
}

const positioningUtils = {
  bottomSpanRight: ({anchorRect}: PositioningParams): ProposedRect => {
    return {
      left: anchorRect.left,
      top: anchorRect.bottom,
    };
  },
  bottomSpanLeft: ({anchorRect, currentPopoverRect}: PositioningParams): ProposedRect => {
    return {
      left: anchorRect.right - currentPopoverRect.width,
      top: anchorRect.bottom,
    };
  },
  bottomCentered: ({anchorRect, currentPopoverRect}: PositioningParams): ProposedRect => {
    return {
      left: anchorRect.left + anchorRect.width / 2 - currentPopoverRect.width / 2,
      top: anchorRect.bottom,
    };
  },
  topCentered: ({anchorRect, currentPopoverRect}: PositioningParams): ProposedRect => {
    return {
      left: anchorRect.left + anchorRect.width / 2 - currentPopoverRect.width / 2,
      top: anchorRect.top - currentPopoverRect.height,
    };
  },
  topSpanRight: ({anchorRect, currentPopoverRect}: PositioningParams): ProposedRect => {
    return {
      left: anchorRect.left,
      top: anchorRect.top - currentPopoverRect.height,
    };
  },
  topSpanLeft: ({anchorRect, currentPopoverRect}: PositioningParams): ProposedRect => {
    return {
      left: anchorRect.right - currentPopoverRect.width,
      top: anchorRect.top - currentPopoverRect.height,
    };
  },
  // Adjusts proposed rect so that the resulting popover is always inside the inspector view bounds.
  insetAdjustedRect:
      ({inspectorViewRect, anchorRect, currentPopoverRect, proposedRect}:
           {inspectorViewRect: DOMRect, anchorRect: DOMRect, currentPopoverRect: DOMRect, proposedRect: ProposedRect}):
          ProposedRect => {
            if (inspectorViewRect.left > proposedRect.left) {
              proposedRect.left = inspectorViewRect.left;
            }

            if (inspectorViewRect.right < proposedRect.left + currentPopoverRect.width) {
              proposedRect.left = inspectorViewRect.right - currentPopoverRect.width;
            }

            if (proposedRect.top + currentPopoverRect.height > inspectorViewRect.bottom) {
              proposedRect.top = anchorRect.top - currentPopoverRect.height;
            }
            return proposedRect;
          },
  isInBounds: ({inspectorViewRect, currentPopoverRect, proposedRect}:
                   {inspectorViewRect: DOMRect, currentPopoverRect: DOMRect, proposedRect: ProposedRect}): boolean => {
    return inspectorViewRect.left < proposedRect.left &&
        proposedRect.left + currentPopoverRect.width < inspectorViewRect.right &&
        inspectorViewRect.top < proposedRect.top &&
        proposedRect.top + currentPopoverRect.height < inspectorViewRect.bottom;
  },
  isSameRect: (rect1: DOMRect|null, rect2: DOMRect|null): boolean => {
    if (!rect1 || !rect2) {
      return false;
    }

    return rect1 && rect1.left === rect2.left && rect1.top === rect2.top && rect1.width === rect2.width &&
        rect1.height === rect2.height;
  }
};

const proposedRectForRichTooltip =
    ({inspectorViewRect, anchorRect, currentPopoverRect}:
         {inspectorViewRect: DOMRect, anchorRect: DOMRect, currentPopoverRect: DOMRect}): ProposedRect => {
      // Tries the default positioning of bottom right, bottom left, top right and top left.
      // If they don't work out, we default back to showing in bottom right and adjust its insets so that the popover is inside the inspector view bounds.
      let proposedRect = positioningUtils.bottomSpanRight({anchorRect, currentPopoverRect});
      if (positioningUtils.isInBounds({inspectorViewRect, currentPopoverRect, proposedRect})) {
        return proposedRect;
      }

      proposedRect = positioningUtils.bottomSpanLeft({anchorRect, currentPopoverRect});
      if (positioningUtils.isInBounds({inspectorViewRect, currentPopoverRect, proposedRect})) {
        return proposedRect;
      }

      proposedRect = positioningUtils.topSpanRight({anchorRect, currentPopoverRect});
      if (positioningUtils.isInBounds({inspectorViewRect, currentPopoverRect, proposedRect})) {
        return proposedRect;
      }

      proposedRect = positioningUtils.topSpanLeft({anchorRect, currentPopoverRect});
      if (positioningUtils.isInBounds({inspectorViewRect, currentPopoverRect, proposedRect})) {
        return proposedRect;
      }

      // If none of the options work above, we position to bottom right
      // and adjust the insets so that it does not go out of bounds.
      proposedRect = positioningUtils.bottomSpanRight({anchorRect, currentPopoverRect});
      return positioningUtils.insetAdjustedRect({anchorRect, currentPopoverRect, inspectorViewRect, proposedRect});
    };

const proposedRectForSimpleTooltip =
    ({inspectorViewRect, anchorRect, currentPopoverRect}:
         {inspectorViewRect: DOMRect, anchorRect: DOMRect, currentPopoverRect: DOMRect}): ProposedRect => {
      // Default options are bottom centered & top centered.
      let proposedRect = positioningUtils.bottomCentered({anchorRect, currentPopoverRect});
      if (positioningUtils.isInBounds({inspectorViewRect, currentPopoverRect, proposedRect})) {
        return proposedRect;
      }

      proposedRect = positioningUtils.topCentered({anchorRect, currentPopoverRect});
      if (positioningUtils.isInBounds({inspectorViewRect, currentPopoverRect, proposedRect})) {
        return proposedRect;
      }

      // The default options did not work out, so position it to bottom center
      // and adjust the insets to make sure that it does not go out of bounds.
      proposedRect = positioningUtils.bottomCentered({anchorRect, currentPopoverRect});
      return positioningUtils.insetAdjustedRect({anchorRect, currentPopoverRect, inspectorViewRect, proposedRect});
    };

export type TooltipVariant = 'simple'|'rich';
export type PaddingMode = 'small'|'large';

export interface TooltipProperties {
  id: string;
  variant?: TooltipVariant;
  padding?: PaddingMode;
  anchor?: HTMLElement;
  jslogContext?: string;
}

/**
 * @property useHotkey - reflects the `"use-hotkey"` attribute.
 * @property id - reflects the `"id"` attribute.
 * @property hoverDelay - reflects the `"hover-delay"` attribute.
 * @property variant - reflects the `"variant"` attribute.
 * @property padding - reflects the `"padding"` attribute.
 * @property useClick - reflects the `"click"` attribute.
 * @attribute id - Id of the tooltip. Used for searching an anchor element with aria-describedby.
 * @attribute hover-delay - Hover length in ms before the tooltip is shown and hidden.
 * @attribute variant - Variant of the tooltip, `"simple"` for strings only, inverted background,
 *                 `"rich"` for interactive content, background according to theme's surface.
 * @attribute padding - Which padding to use, defaults to `"small"`. Use `"large"` for richer content.
 * @attribute use-click - If present, the tooltip will be shown on click instead of on hover.
 * @attribute use-hotkey - If present, the tooltip will be shown on hover but not when receiving focus.
 *                    Requires a hotkey to open when fosed (Alt-down). When `"use-click"` is present
 *                    as well, use-click takes precedence.
 */
export class Tooltip extends HTMLElement {
  static readonly observedAttributes = ['id', 'variant', 'jslogcontext'];
  static lastOpenedTooltipId: string|null = null;

  readonly #shadow = this.attachShadow({mode: 'open'});
  #anchor: HTMLElement|null = null;
  #timeout: number|null = null;
  #closing = false;
  #anchorObserver: MutationObserver|null = null;
  #openedViaHotkey = false;
  #previousAnchorRect: DOMRect|null = null;
  #previousPopoverRect: DOMRect|null = null;

  get openedViaHotkey(): boolean {
    return this.#openedViaHotkey;
  }

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
    return this.hasAttribute('hover-delay') ? Number(this.getAttribute('hover-delay')) : 300;
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

  get padding(): PaddingMode {
    return this.getAttribute('padding') === 'large' ? 'large' : 'small';
  }
  set padding(padding: PaddingMode) {
    this.setAttribute('padding', padding);
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
    const {id, variant, padding, jslogContext, anchor} = properties ?? {};
    if (id) {
      this.id = id;
    }
    if (variant) {
      this.variant = variant;
    }
    if (padding) {
      this.padding = padding;
    }
    if (jslogContext) {
      this.jslogContext = jslogContext;
    }
    if (anchor) {
      const ref = anchor.getAttribute('aria-details') ?? anchor.getAttribute('aria-describedby');
      if (ref !== id) {
        throw new Error('aria-details or aria-describedby must be set on the anchor');
      }
      this.#anchor = anchor;
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
      <style>${tooltipStyles}</style>
      <!-- Wrapping it into a container, so that the tooltip doesn't disappear when the mouse moves from the anchor to the tooltip. -->
      <div class="container ${this.padding === 'large' ? 'large-padding' : ''}">
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

  #positionPopover = (): void => {
    if (!this.#anchor || !this.open) {
      this.#previousAnchorRect = null;
      this.#previousPopoverRect = null;
      this.style.visibility = 'hidden';
      return;
    }

    // If there is no change from the previous anchor rect, we don't need to recompute the position.
    const anchorRect = this.#anchor.getBoundingClientRect();
    const currentPopoverRect = this.getBoundingClientRect();
    if (positioningUtils.isSameRect(this.#previousAnchorRect, anchorRect) &&
        positioningUtils.isSameRect(this.#previousPopoverRect, currentPopoverRect)) {
      requestAnimationFrame(this.#positionPopover);
      return;
    }
    this.#previousAnchorRect = anchorRect;
    this.#previousPopoverRect = currentPopoverRect;

    const inspectorViewRect = UI.InspectorView.InspectorView.instance().element.getBoundingClientRect();
    const proposedPopoverRect = this.variant === 'rich' ?
        proposedRectForRichTooltip({inspectorViewRect, anchorRect, currentPopoverRect}) :
        proposedRectForSimpleTooltip({inspectorViewRect, anchorRect, currentPopoverRect});
    this.style.left = `${proposedPopoverRect.left}px`;
    this.style.top = `${proposedPopoverRect.top}px`;
    this.style.visibility = 'visible';
    requestAnimationFrame(this.#positionPopover);
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
      this.#openedViaHotkey = false;
    }
  };

  #keyDown = (event: KeyboardEvent): void => {
    if ((event.altKey && event.key === 'ArrowDown') || (event.key === 'Escape' && this.open)) {
      this.#openedViaHotkey = !this.open;
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
        this.addEventListener('focusout', this.hideTooltip);
      }
    }
    // Prevent interaction with the parent element.
    this.addEventListener('click', this.#stopPropagation);
    this.addEventListener('mouseup', this.#stopPropagation);
    this.addEventListener('beforetoggle', this.#setClosing);
    this.addEventListener('toggle', this.#resetClosing);
    this.addEventListener('toggle', this.#positionPopover);
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
    this.removeEventListener('toggle', this.#positionPopover);
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
}

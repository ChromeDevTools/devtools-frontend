// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as UI from '../../legacy/legacy.js';
import * as Lit from '../../lit/lit.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';
import tooltipStyles from './tooltip.css.js';
const { html } = Lit;
var PositionOption;
(function (PositionOption) {
    PositionOption["BOTTOM_SPAN_RIGHT"] = "bottom-span-right";
    PositionOption["BOTTOM_SPAN_LEFT"] = "bottom-span-left";
    PositionOption["TOP_SPAN_RIGHT"] = "top-span-right";
    PositionOption["TOP_SPAN_LEFT"] = "top-span-left";
})(PositionOption || (PositionOption = {}));
const positioningUtils = {
    bottomSpanRight: ({ anchorRect }) => {
        return {
            left: anchorRect.left,
            top: anchorRect.bottom,
        };
    },
    bottomSpanLeft: ({ anchorRect, currentPopoverRect }) => {
        return {
            left: anchorRect.right - currentPopoverRect.width,
            top: anchorRect.bottom,
        };
    },
    bottomCentered: ({ anchorRect, currentPopoverRect }) => {
        return {
            left: anchorRect.left + anchorRect.width / 2 - currentPopoverRect.width / 2,
            top: anchorRect.bottom,
        };
    },
    topCentered: ({ anchorRect, currentPopoverRect }) => {
        return {
            left: anchorRect.left + anchorRect.width / 2 - currentPopoverRect.width / 2,
            top: anchorRect.top - currentPopoverRect.height,
        };
    },
    topSpanRight: ({ anchorRect, currentPopoverRect }) => {
        return {
            left: anchorRect.left,
            top: anchorRect.top - currentPopoverRect.height,
        };
    },
    topSpanLeft: ({ anchorRect, currentPopoverRect }) => {
        return {
            left: anchorRect.right - currentPopoverRect.width,
            top: anchorRect.top - currentPopoverRect.height,
        };
    },
    // Adjusts proposed rect so that the resulting popover is always inside the inspector view bounds.
    insetAdjustedRect: ({ inspectorViewRect, anchorRect, currentPopoverRect, proposedRect }) => {
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
    isInBounds: ({ inspectorViewRect, currentPopoverRect, proposedRect }) => {
        return inspectorViewRect.left < proposedRect.left &&
            proposedRect.left + currentPopoverRect.width < inspectorViewRect.right &&
            inspectorViewRect.top < proposedRect.top &&
            proposedRect.top + currentPopoverRect.height < inspectorViewRect.bottom;
    },
    isSameRect: (rect1, rect2) => {
        if (!rect1 || !rect2) {
            return false;
        }
        return rect1 && rect1.left === rect2.left && rect1.top === rect2.top && rect1.width === rect2.width &&
            rect1.height === rect2.height;
    }
};
const proposedRectForRichTooltip = ({ inspectorViewRect, anchorRect, currentPopoverRect, preferredPositions }) => {
    // The default positioning order is `BOTTOM_SPAN_RIGHT`, `BOTTOM_SPAN_LEFT`, `TOP_SPAN_RIGHT`
    // and `TOP_SPAN_LEFT`. If `preferredPositions` are given, those are tried first, before
    // continuing with the remaining options in default order. Duplicate entries are removed.
    const uniqueOrder = [
        ...new Set([
            ...preferredPositions,
            ...Object.values(PositionOption),
        ]),
    ];
    // Tries the positioning options in the order given by `uniqueOrder`.
    // If none of them work out, we default to showing the tooltip in the bottom right and adjust
    // its insets so that the tooltip is inside the inspector view bounds.
    for (const positionOption of uniqueOrder) {
        let proposedRect;
        switch (positionOption) {
            case PositionOption.BOTTOM_SPAN_RIGHT:
                proposedRect = positioningUtils.bottomSpanRight({ anchorRect, currentPopoverRect });
                break;
            case PositionOption.BOTTOM_SPAN_LEFT:
                proposedRect = positioningUtils.bottomSpanLeft({ anchorRect, currentPopoverRect });
                break;
            case PositionOption.TOP_SPAN_RIGHT:
                proposedRect = positioningUtils.topSpanRight({ anchorRect, currentPopoverRect });
                break;
            case PositionOption.TOP_SPAN_LEFT:
                proposedRect = positioningUtils.topSpanLeft({ anchorRect, currentPopoverRect });
        }
        if (positioningUtils.isInBounds({ inspectorViewRect, currentPopoverRect, proposedRect })) {
            return proposedRect;
        }
    }
    // If none of the options work above, we position to bottom right
    // and adjust the insets so that it does not go out of bounds.
    const proposedRect = positioningUtils.bottomSpanRight({ anchorRect, currentPopoverRect });
    return positioningUtils.insetAdjustedRect({ anchorRect, currentPopoverRect, inspectorViewRect, proposedRect });
};
const proposedRectForSimpleTooltip = ({ inspectorViewRect, anchorRect, currentPopoverRect }) => {
    // Default options are bottom centered & top centered.
    let proposedRect = positioningUtils.bottomCentered({ anchorRect, currentPopoverRect });
    if (positioningUtils.isInBounds({ inspectorViewRect, currentPopoverRect, proposedRect })) {
        return proposedRect;
    }
    proposedRect = positioningUtils.topCentered({ anchorRect, currentPopoverRect });
    if (positioningUtils.isInBounds({ inspectorViewRect, currentPopoverRect, proposedRect })) {
        return proposedRect;
    }
    // The default options did not work out, so position it to bottom center
    // and adjust the insets to make sure that it does not go out of bounds.
    proposedRect = positioningUtils.bottomCentered({ anchorRect, currentPopoverRect });
    return positioningUtils.insetAdjustedRect({ anchorRect, currentPopoverRect, inspectorViewRect, proposedRect });
};
/**
 * @property useHotkey - reflects the `"use-hotkey"` attribute.
 * @property id - reflects the `"id"` attribute.
 * @property hoverDelay - reflects the `"hover-delay"` attribute.
 * @property variant - reflects the `"variant"` attribute.
 * @property padding - reflects the `"padding"` attribute.
 * @property trigger - reflects the `"trigger"` attribute.
 * @property verticalDistanceIncrease - reflects the `"vertical-distance-increase"` attribute.
 * @property preferSpanLeft - reflects the `"prefer-span-left"` attribute.
 * @attribute id - Id of the tooltip. Used for searching an anchor element with aria-describedby.
 * @attribute hover-delay - Hover length in ms before the tooltip is shown and hidden.
 * @attribute variant - Variant of the tooltip, `"simple"` for strings only, inverted background,
 *                 `"rich"` for interactive content, background according to theme's surface.
 * @attribute padding - Which padding to use, defaults to `"small"`. Use `"large"` for richer content.
 * @attribute trigger - Specifies which action triggers the tooltip. `"hover"` is the default. `"click"` means the
 *                 tooltip will be shown on click instead of hover. `"both"` means both hover and click trigger the
 *                 tooltip.
 * @attribute vertical-distance-increase - The tooltip is moved vertically this many pixels further away from its anchor.
 * @attribute prefer-span-left - If present, the tooltip's preferred position is `"span-left"` (The right
 *                 side of the tooltip and its anchor are aligned. The tooltip expands to the left from
 *                 there.). Applies to rich tooltips only.
 * @attribute use-hotkey - If present, the tooltip will be shown on hover but not when receiving focus.
 *                  Requires a hotkey to open when fosed (Alt-down). When `"trigger"` is present
 *                  as well, `"trigger"` takes precedence.
 */
export class Tooltip extends HTMLElement {
    static observedAttributes = ['id', 'variant', 'jslogcontext', 'trigger'];
    static lastOpenedTooltipId = null;
    #shadow = this.attachShadow({ mode: 'open' });
    #anchor = null;
    #timeout = null;
    #closing = false;
    #anchorObserver = null;
    #openedViaHotkey = false;
    #previousAnchorRect = null;
    #previousPopoverRect = null;
    get openedViaHotkey() {
        return this.#openedViaHotkey;
    }
    get open() {
        return this.matches(':popover-open');
    }
    get useHotkey() {
        return this.hasAttribute('use-hotkey') ?? false;
    }
    set useHotkey(useHotkey) {
        if (useHotkey) {
            this.setAttribute('use-hotkey', '');
        }
        else {
            this.removeAttribute('use-hotkey');
        }
    }
    get trigger() {
        switch (this.getAttribute('trigger')) {
            case 'click':
                return 'click';
            case 'both':
                return 'both';
            case 'hover':
            default:
                return 'hover';
        }
    }
    set trigger(trigger) {
        this.setAttribute('trigger', trigger);
    }
    get hoverDelay() {
        return this.hasAttribute('hover-delay') ? Number(this.getAttribute('hover-delay')) : 300;
    }
    set hoverDelay(delay) {
        this.setAttribute('hover-delay', delay.toString());
    }
    get variant() {
        return this.getAttribute('variant') === 'rich' ? 'rich' : 'simple';
    }
    set variant(variant) {
        this.setAttribute('variant', variant);
    }
    get padding() {
        return this.getAttribute('padding') === 'large' ? 'large' : 'small';
    }
    set padding(padding) {
        this.setAttribute('padding', padding);
    }
    get jslogContext() {
        return this.getAttribute('jslogcontext');
    }
    set jslogContext(jslogContext) {
        this.setAttribute('jslogcontext', jslogContext);
        this.#updateJslog();
    }
    get verticalDistanceIncrease() {
        return this.hasAttribute('vertical-distance-increase') ? Number(this.getAttribute('vertical-distance-increase')) :
            0;
    }
    set verticalDistanceIncrease(increase) {
        this.setAttribute('vertical-distance-increase', increase.toString());
    }
    get preferSpanLeft() {
        return this.hasAttribute('prefer-span-left');
    }
    set preferSpanLeft(value) {
        if (value) {
            this.setAttribute('prefer-span-left', '');
        }
        else {
            this.removeAttribute('prefer-span-left');
        }
    }
    get anchor() {
        return this.#anchor;
    }
    constructor(properties) {
        super();
        const { id, variant, padding, jslogContext, anchor, trigger } = properties ?? {};
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
        if (trigger) {
            this.trigger = trigger;
        }
    }
    attributeChangedCallback(name, oldValue, newValue) {
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
        }
        else if (name === 'jslogcontext') {
            this.#updateJslog();
        }
    }
    connectedCallback() {
        this.#attachToAnchor();
        this.#registerEventListeners();
        this.#setAttributes();
        // clang-format off
        Lit.render(html `
      <style>${tooltipStyles}</style>
      <!-- Wrapping it into a container, so that the tooltip doesn't disappear when the mouse moves from the anchor to the tooltip. -->
      <div class="container ${this.padding === 'large' ? 'large-padding' : ''}">
        <slot></slot>
      </div>
    `, this.#shadow, { host: this });
        // clang-format on
        if (Tooltip.lastOpenedTooltipId === this.id) {
            this.showPopover();
        }
    }
    disconnectedCallback() {
        this.#removeEventListeners();
        this.#anchorObserver?.disconnect();
    }
    showTooltip = (event) => {
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
    #containsNode(target) {
        return target instanceof Node && this.contains(target);
    }
    hideTooltip = (event) => {
        if (this.#timeout) {
            window.clearTimeout(this.#timeout);
        }
        // If the event is a blur event, then:
        // 1. event.currentTarget = the element that got blurred
        // 2. event.relatedTarget = the element that gained focus
        // https://developer.mozilla.org/en-US/docs/Web/API/FocusEvent/relatedTarget
        // If the blurred element (1) was our anchor or within the tooltip,
        // and the newly focused element (2) is within the tooltip,
        // we do not want to hide the tooltip.
        if (event && this.variant === 'rich' && (event.target === this.#anchor || this.#containsNode(event.target)) &&
            this.#containsNode(event.relatedTarget)) {
            return;
        }
        // Don't hide a rich tooltip when hovering over the tooltip itself.
        if (event && this.variant === 'rich' &&
            (event.relatedTarget === this || event.relatedTarget?.parentElement === this)) {
            return;
        }
        if (this.open && Tooltip.lastOpenedTooltipId === this.id) {
            Tooltip.lastOpenedTooltipId = null;
        }
        this.hidePopover();
    };
    toggle = () => {
        // We need this check because clicking on the anchor while the tooltip is open will trigger both
        // the click event on the anchor and the toggle event from the backdrop of the tooltip.
        if (!this.#closing) {
            this.togglePopover();
        }
    };
    #positionPopover = () => {
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
        const inspectorViewRect = UI.UIUtils.getDevToolsBoundingElement().getBoundingClientRect();
        const preferredPositions = this.preferSpanLeft ? [PositionOption.BOTTOM_SPAN_LEFT, PositionOption.TOP_SPAN_LEFT] : [];
        const proposedPopoverRect = this.variant === 'rich' ?
            proposedRectForRichTooltip({ inspectorViewRect, anchorRect, currentPopoverRect, preferredPositions }) :
            proposedRectForSimpleTooltip({ inspectorViewRect, anchorRect, currentPopoverRect });
        this.style.left = `${proposedPopoverRect.left}px`;
        // If the tooltip is above its anchor, we need to decrease the tooltip's
        // y-coordinate to increase the distance between tooltip and anchor.
        // If the tooltip is below its anchor, we add to the tooltip's y-coord.
        const actualVerticalOffset = anchorRect.top < proposedPopoverRect.top ? this.verticalDistanceIncrease : -this.verticalDistanceIncrease;
        this.style.top = `${proposedPopoverRect.top + actualVerticalOffset}px`;
        this.style.visibility = 'visible';
        requestAnimationFrame(this.#positionPopover);
    };
    #updateJslog() {
        if (this.jslogContext && this.#anchor) {
            VisualLogging.setMappedParent(this, this.#anchor);
            this.setAttribute('jslog', VisualLogging.popover(this.jslogContext).parent('mapped').toString());
        }
        else {
            this.removeAttribute('jslog');
        }
    }
    #setAttributes() {
        if (!this.hasAttribute('role')) {
            this.setAttribute('role', 'tooltip');
        }
        this.setAttribute('popover', this.trigger === 'hover' ? 'manual' : 'auto');
        this.#updateJslog();
    }
    #stopPropagation(event) {
        event.stopPropagation();
    }
    #setClosing = (event) => {
        if (event.newState === 'closed') {
            this.#closing = true;
            if (this.#timeout) {
                window.clearTimeout(this.#timeout);
            }
        }
    };
    #resetClosing = (event) => {
        if (event.newState === 'closed') {
            this.#closing = false;
            this.#openedViaHotkey = false;
        }
    };
    #globalKeyDown = (event) => {
        if (!this.open || event.key !== 'Escape') {
            return;
        }
        const childTooltip = this.querySelector('devtools-tooltip');
        if (childTooltip?.open) {
            return;
        }
        this.#openedViaHotkey = false;
        this.toggle();
        event.consume(true);
    };
    #keyDown = (event) => {
        // This supports the scenario where the user uses Alt+ArrowDown in hotkey
        // mode to toggle the visibility.
        // Note that the "Escape to close" scenario is handled in the global
        // keydown function so we capture Escape presses even if the tooltip does
        // not have focus.
        const shouldToggleVisibility = (this.useHotkey && event.altKey && event.key === 'ArrowDown');
        if (shouldToggleVisibility) {
            this.#openedViaHotkey = !this.open;
            this.toggle();
            event.consume(true);
        }
    };
    #registerEventListeners() {
        document.body.addEventListener('keydown', this.#globalKeyDown);
        if (this.#anchor) {
            // We bind the keydown listener regardless of if use-hotkey is enabled
            // as we always want to support ESC to close.
            this.#anchor.addEventListener('keydown', this.#keyDown);
            if (this.trigger === 'click' || this.trigger === 'both') {
                this.#anchor.addEventListener('click', this.toggle);
            }
            if (this.trigger === 'hover' || this.trigger === 'both') {
                this.#anchor.addEventListener('mouseenter', this.showTooltip);
                if (!this.useHotkey) {
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
    #removeEventListeners() {
        if (this.#timeout) {
            window.clearTimeout(this.#timeout);
        }
        // Should always exist when this component is used, but in test
        // environments on Chromium this isn't always the case, hence the body? check.
        document.body?.removeEventListener('keydown', this.#globalKeyDown);
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
    #attachToAnchor() {
        if (!this.#anchor) {
            const id = this.getAttribute('id');
            if (!id) {
                throw new Error('<devtools-tooltip> must have an id.');
            }
            const root = this.getRootNode();
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
                console.warn(`The anchor for tooltip ${id} was defined with "aria-describedby". For rich tooltips "aria-details" is more appropriate.`);
            }
        }
        this.#observeAnchorRemoval(this.#anchor);
        this.#updateJslog();
    }
    #observeAnchorRemoval(anchor) {
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
        this.#anchorObserver.observe(anchor.parentElement, { childList: true });
    }
}
customElements.define('devtools-tooltip', Tooltip);
//# sourceMappingURL=Tooltip.js.map
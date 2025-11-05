var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/tooltips/Tooltip.js
var Tooltip_exports = {};
__export(Tooltip_exports, {
  PositionOption: () => PositionOption,
  Tooltip: () => Tooltip,
  proposedRectForRichTooltip: () => proposedRectForRichTooltip,
  proposedRectForSimpleTooltip: () => proposedRectForSimpleTooltip
});
import * as UI from "./../../legacy/legacy.js";
import * as Lit from "./../../lit/lit.js";
import * as VisualLogging from "./../../visual_logging/visual_logging.js";

// gen/front_end/ui/components/tooltips/tooltip.css.js
var tooltip_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  --tooltip-viewport-distance: var(--sys-size-5);

  /* Reset the browser's default styles for [popover] elements. */
  margin: 0;
  background: none;
  border: none;
  padding: 0;
  overflow: visible;
  position: absolute;
  max-width: var(--devtools-window-width);
  max-height: var(--devtools-window-height);
  visibility: hidden;

  & .container {
    width: max-content;
    max-width: calc(var(--devtools-window-width) - 2 * (
      /* host margin */ var(--tooltip-viewport-distance) +
      /* container horizontal padding */ var(--sys-size-8) +
      /* container margin */ var(--sys-size-3)));
    margin: var(--sys-size-2);
    font: var(--sys-typescale-body4-regular);
    color: var(--sys-color-inverse-on-surface);
    background-color: var(--sys-color-inverse-surface);
    box-shadow: var(--sys-elevation-level2);
    border-radius: var(--sys-shape-corner-extra-small);
    padding: var(--sys-size-4) var(--sys-size-5);
  }
}

:host([variant='rich']) {
  justify-self: unset;
  margin: 0 var(--tooltip-viewport-distance) var(--tooltip-viewport-distance) 0;
  position: absolute;

  & .container {
    margin-inline: 0;
    margin-block: var(--sys-size-3);
    color: var(--sys-color-on-surface);
    background-color: var(--sys-color-base-container-elevated);
    border-radius: var(--sys-shape-corner-small);
    overflow: auto;

    &.large-padding {
      padding: var(--sys-size-6) var(--sys-size-8);
    }
  }
}

/*# sourceURL=${import.meta.resolve("./tooltip.css")} */`;

// gen/front_end/ui/components/tooltips/Tooltip.js
var { html } = Lit;
var PositionOption;
(function(PositionOption2) {
  PositionOption2["BOTTOM_SPAN_RIGHT"] = "bottom-span-right";
  PositionOption2["BOTTOM_SPAN_LEFT"] = "bottom-span-left";
  PositionOption2["TOP_SPAN_RIGHT"] = "top-span-right";
  PositionOption2["TOP_SPAN_LEFT"] = "top-span-left";
})(PositionOption || (PositionOption = {}));
var positioningUtils = {
  bottomSpanRight: ({ anchorRect }) => {
    return {
      left: anchorRect.left,
      top: anchorRect.bottom
    };
  },
  bottomSpanLeft: ({ anchorRect, currentPopoverRect }) => {
    return {
      left: anchorRect.right - currentPopoverRect.width,
      top: anchorRect.bottom
    };
  },
  bottomCentered: ({ anchorRect, currentPopoverRect }) => {
    return {
      left: anchorRect.left + anchorRect.width / 2 - currentPopoverRect.width / 2,
      top: anchorRect.bottom
    };
  },
  topCentered: ({ anchorRect, currentPopoverRect }) => {
    return {
      left: anchorRect.left + anchorRect.width / 2 - currentPopoverRect.width / 2,
      top: anchorRect.top - currentPopoverRect.height
    };
  },
  topSpanRight: ({ anchorRect, currentPopoverRect }) => {
    return {
      left: anchorRect.left,
      top: anchorRect.top - currentPopoverRect.height
    };
  },
  topSpanLeft: ({ anchorRect, currentPopoverRect }) => {
    return {
      left: anchorRect.right - currentPopoverRect.width,
      top: anchorRect.top - currentPopoverRect.height
    };
  },
  // Adjusts proposed rect so that the resulting popover is always inside the inspector view bounds.
  insetAdjustedRect: ({ inspectorViewRect, currentPopoverRect, proposedRect }) => {
    if (inspectorViewRect.left > proposedRect.left) {
      proposedRect.left = inspectorViewRect.left;
    }
    if (inspectorViewRect.right < proposedRect.left + currentPopoverRect.width) {
      proposedRect.left = inspectorViewRect.right - currentPopoverRect.width;
    }
    if (proposedRect.top < inspectorViewRect.top) {
      proposedRect.top = inspectorViewRect.top;
    }
    if (proposedRect.top + currentPopoverRect.height > inspectorViewRect.bottom) {
      proposedRect.top = inspectorViewRect.bottom - currentPopoverRect.height;
    }
    return proposedRect;
  },
  isInBounds: ({ inspectorViewRect, currentPopoverRect, proposedRect }) => {
    return inspectorViewRect.left <= proposedRect.left && proposedRect.left + currentPopoverRect.width <= inspectorViewRect.right && inspectorViewRect.top <= proposedRect.top && proposedRect.top + currentPopoverRect.height <= inspectorViewRect.bottom;
  },
  isSameRect: (rect1, rect2) => {
    if (!rect1 || !rect2) {
      return false;
    }
    return rect1 && rect1.left === rect2.left && rect1.top === rect2.top && rect1.width === rect2.width && rect1.height === rect2.height;
  }
};
var proposedRectForRichTooltip = ({ inspectorViewRect, anchorRect, currentPopoverRect, preferredPositions }) => {
  const uniqueOrder = [
    .../* @__PURE__ */ new Set([
      ...preferredPositions,
      ...Object.values(PositionOption)
    ])
  ];
  const getProposedRectForPositionOption = (positionOption) => {
    switch (positionOption) {
      case PositionOption.BOTTOM_SPAN_RIGHT:
        return positioningUtils.bottomSpanRight({ anchorRect, currentPopoverRect });
      case PositionOption.BOTTOM_SPAN_LEFT:
        return positioningUtils.bottomSpanLeft({ anchorRect, currentPopoverRect });
      case PositionOption.TOP_SPAN_RIGHT:
        return positioningUtils.topSpanRight({ anchorRect, currentPopoverRect });
      case PositionOption.TOP_SPAN_LEFT:
        return positioningUtils.topSpanLeft({ anchorRect, currentPopoverRect });
    }
  };
  for (const positionOption of uniqueOrder) {
    const proposedRect = getProposedRectForPositionOption(positionOption);
    if (positioningUtils.isInBounds({ inspectorViewRect, currentPopoverRect, proposedRect })) {
      return proposedRect;
    }
  }
  const bottomProposed = positioningUtils.bottomSpanRight({ anchorRect, currentPopoverRect });
  const bottomVerticalOutOfBounds = Math.max(0, bottomProposed.top + currentPopoverRect.height - inspectorViewRect.bottom);
  const topProposed = positioningUtils.topSpanRight({ anchorRect, currentPopoverRect });
  const topVerticalOutOfBounds = Math.max(0, inspectorViewRect.top - topProposed.top);
  const prefersBottom = bottomVerticalOutOfBounds <= topVerticalOutOfBounds;
  const fallbackOption = uniqueOrder.find((option) => {
    if (prefersBottom) {
      return option === PositionOption.BOTTOM_SPAN_LEFT || option === PositionOption.BOTTOM_SPAN_RIGHT;
    }
    return option === PositionOption.TOP_SPAN_LEFT || option === PositionOption.TOP_SPAN_RIGHT;
  }) ?? PositionOption.TOP_SPAN_RIGHT;
  const fallbackRect = getProposedRectForPositionOption(fallbackOption);
  return positioningUtils.insetAdjustedRect({ currentPopoverRect, inspectorViewRect, proposedRect: fallbackRect });
};
var proposedRectForSimpleTooltip = ({ inspectorViewRect, anchorRect, currentPopoverRect }) => {
  let proposedRect = positioningUtils.bottomCentered({ anchorRect, currentPopoverRect });
  if (positioningUtils.isInBounds({ inspectorViewRect, currentPopoverRect, proposedRect })) {
    return proposedRect;
  }
  const bottomVerticalOutOfBoundsAmount = Math.max(0, proposedRect.top + currentPopoverRect.height - inspectorViewRect.bottom);
  proposedRect = positioningUtils.topCentered({ anchorRect, currentPopoverRect });
  if (positioningUtils.isInBounds({ inspectorViewRect, currentPopoverRect, proposedRect })) {
    return proposedRect;
  }
  const topVerticalOutOfBoundsAmount = Math.max(0, inspectorViewRect.top - proposedRect.top);
  if (bottomVerticalOutOfBoundsAmount <= topVerticalOutOfBoundsAmount) {
    proposedRect = positioningUtils.bottomCentered({ anchorRect, currentPopoverRect });
  } else {
    proposedRect = positioningUtils.topCentered({ anchorRect, currentPopoverRect });
  }
  return positioningUtils.insetAdjustedRect({ currentPopoverRect, inspectorViewRect, proposedRect });
};
var Tooltip = class _Tooltip extends HTMLElement {
  static observedAttributes = ["id", "variant", "jslogcontext", "trigger"];
  static lastOpenedTooltipId = null;
  #shadow = this.attachShadow({ mode: "open" });
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
    return this.matches(":popover-open");
  }
  get useHotkey() {
    return this.hasAttribute("use-hotkey") ?? false;
  }
  set useHotkey(useHotkey) {
    if (useHotkey) {
      this.setAttribute("use-hotkey", "");
    } else {
      this.removeAttribute("use-hotkey");
    }
  }
  get trigger() {
    switch (this.getAttribute("trigger")) {
      case "click":
        return "click";
      case "both":
        return "both";
      case "hover":
      default:
        return "hover";
    }
  }
  set trigger(trigger) {
    this.setAttribute("trigger", trigger);
  }
  get hoverDelay() {
    return this.hasAttribute("hover-delay") ? Number(this.getAttribute("hover-delay")) : 300;
  }
  set hoverDelay(delay) {
    this.setAttribute("hover-delay", delay.toString());
  }
  get variant() {
    return this.getAttribute("variant") === "rich" ? "rich" : "simple";
  }
  set variant(variant) {
    this.setAttribute("variant", variant);
  }
  get padding() {
    return this.getAttribute("padding") === "large" ? "large" : "small";
  }
  set padding(padding) {
    this.setAttribute("padding", padding);
  }
  get jslogContext() {
    return this.getAttribute("jslogcontext");
  }
  set jslogContext(jslogContext) {
    this.setAttribute("jslogcontext", jslogContext);
    this.#updateJslog();
  }
  get verticalDistanceIncrease() {
    return this.hasAttribute("vertical-distance-increase") ? Number(this.getAttribute("vertical-distance-increase")) : 0;
  }
  set verticalDistanceIncrease(increase) {
    this.setAttribute("vertical-distance-increase", increase.toString());
  }
  get preferSpanLeft() {
    return this.hasAttribute("prefer-span-left");
  }
  set preferSpanLeft(value) {
    if (value) {
      this.setAttribute("prefer-span-left", "");
    } else {
      this.removeAttribute("prefer-span-left");
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
      const ref = anchor.getAttribute("aria-details") ?? anchor.getAttribute("aria-describedby");
      if (ref !== id) {
        throw new Error("aria-details or aria-describedby must be set on the anchor");
      }
      this.#anchor = anchor;
    }
    if (trigger) {
      this.trigger = trigger;
    }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected) {
      return;
    }
    if (name === "id") {
      this.#removeEventListeners();
      this.#attachToAnchor();
      if (_Tooltip.lastOpenedTooltipId === oldValue) {
        _Tooltip.lastOpenedTooltipId = newValue;
      }
    } else if (name === "jslogcontext") {
      this.#updateJslog();
    }
  }
  connectedCallback() {
    this.#attachToAnchor();
    this.#registerEventListeners();
    this.#setAttributes();
    Lit.render(html`
      <style>${tooltip_css_default}</style>
      <!-- Wrapping it into a container, so that the tooltip doesn't disappear when the mouse moves from the anchor to the tooltip. -->
      <div class="container ${this.padding === "large" ? "large-padding" : ""}">
        <slot></slot>
      </div>
    `, this.#shadow, { host: this });
    if (_Tooltip.lastOpenedTooltipId === this.id) {
      this.showPopover();
    }
  }
  disconnectedCallback() {
    this.#removeEventListeners();
    this.#anchorObserver?.disconnect();
  }
  showTooltip = (event) => {
    if (event && "buttons" in event && event.buttons) {
      return;
    }
    if (this.#timeout) {
      window.clearTimeout(this.#timeout);
    }
    this.#timeout = window.setTimeout(() => {
      this.showPopover();
      _Tooltip.lastOpenedTooltipId = this.id;
    }, this.hoverDelay);
  };
  #containsNode(target) {
    return target instanceof Node && this.contains(target);
  }
  hideTooltip = (event) => {
    if (this.#timeout) {
      window.clearTimeout(this.#timeout);
    }
    if (event && this.variant === "rich" && (event.target === this.#anchor || this.#containsNode(event.target)) && this.#containsNode(event.relatedTarget)) {
      return;
    }
    if (event && this.variant === "rich" && (event.relatedTarget === this || event.relatedTarget?.parentElement === this)) {
      return;
    }
    if (this.open && _Tooltip.lastOpenedTooltipId === this.id) {
      _Tooltip.lastOpenedTooltipId = null;
    }
    this.hidePopover();
  };
  toggle = () => {
    if (!this.#closing) {
      this.togglePopover();
    }
  };
  #positionPopover = () => {
    if (!this.#anchor || !this.open) {
      this.#previousAnchorRect = null;
      this.#previousPopoverRect = null;
      this.style.visibility = "hidden";
      return;
    }
    const anchorRect = this.#anchor.getBoundingClientRect();
    const currentPopoverRect = this.getBoundingClientRect();
    if (positioningUtils.isSameRect(this.#previousAnchorRect, anchorRect) && positioningUtils.isSameRect(this.#previousPopoverRect, currentPopoverRect)) {
      requestAnimationFrame(this.#positionPopover);
      return;
    }
    this.#previousAnchorRect = anchorRect;
    this.#previousPopoverRect = currentPopoverRect;
    const inspectorViewRect = UI.UIUtils.getDevToolsBoundingElement().getBoundingClientRect();
    const preferredPositions = this.preferSpanLeft ? [PositionOption.BOTTOM_SPAN_LEFT, PositionOption.TOP_SPAN_LEFT] : [];
    const proposedPopoverRect = this.variant === "rich" ? proposedRectForRichTooltip({ inspectorViewRect, anchorRect, currentPopoverRect, preferredPositions }) : proposedRectForSimpleTooltip({ inspectorViewRect, anchorRect, currentPopoverRect });
    this.style.left = `${proposedPopoverRect.left}px`;
    const actualVerticalOffset = anchorRect.top < proposedPopoverRect.top ? this.verticalDistanceIncrease : -this.verticalDistanceIncrease;
    this.style.top = `${proposedPopoverRect.top + actualVerticalOffset}px`;
    this.style.visibility = "visible";
    requestAnimationFrame(this.#positionPopover);
  };
  #updateJslog() {
    if (this.jslogContext && this.#anchor) {
      VisualLogging.setMappedParent(this, this.#anchor);
      this.setAttribute("jslog", VisualLogging.popover(this.jslogContext).parent("mapped").toString());
    } else {
      this.removeAttribute("jslog");
    }
  }
  #setAttributes() {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "tooltip");
    }
    this.setAttribute("popover", this.trigger === "hover" ? "manual" : "auto");
    this.#updateJslog();
  }
  #stopPropagation(event) {
    event.stopPropagation();
  }
  #setClosing = (event) => {
    if (event.newState === "closed") {
      this.#closing = true;
      if (this.#timeout) {
        window.clearTimeout(this.#timeout);
      }
    }
  };
  #resetClosing = (event) => {
    if (event.newState === "closed") {
      this.#closing = false;
      this.#openedViaHotkey = false;
    }
  };
  #globalKeyDown = (event) => {
    if (!this.open || event.key !== "Escape") {
      return;
    }
    const childTooltip = this.querySelector("devtools-tooltip");
    if (childTooltip?.open) {
      return;
    }
    this.#openedViaHotkey = false;
    this.toggle();
    event.consume(true);
  };
  #keyDown = (event) => {
    const shouldToggleVisibility = this.useHotkey && event.altKey && event.key === "ArrowDown";
    if (shouldToggleVisibility) {
      this.#openedViaHotkey = !this.open;
      this.toggle();
      event.consume(true);
    }
  };
  #registerEventListeners() {
    document.body.addEventListener("keydown", this.#globalKeyDown);
    if (this.#anchor) {
      this.#anchor.addEventListener("keydown", this.#keyDown);
      if (this.trigger === "click" || this.trigger === "both") {
        this.#anchor.addEventListener("click", this.toggle);
      }
      if (this.trigger === "hover" || this.trigger === "both") {
        this.#anchor.addEventListener("mouseenter", this.showTooltip);
        if (!this.useHotkey) {
          this.#anchor.addEventListener("focus", this.showTooltip);
        }
        this.#anchor.addEventListener("blur", this.hideTooltip);
        this.#anchor.addEventListener("mouseleave", this.hideTooltip);
        this.addEventListener("mouseleave", this.hideTooltip);
        this.addEventListener("focusout", this.hideTooltip);
      }
    }
    this.addEventListener("click", this.#stopPropagation);
    this.addEventListener("mouseup", this.#stopPropagation);
    this.addEventListener("beforetoggle", this.#setClosing);
    this.addEventListener("toggle", this.#resetClosing);
    this.addEventListener("toggle", this.#positionPopover);
  }
  #removeEventListeners() {
    if (this.#timeout) {
      window.clearTimeout(this.#timeout);
    }
    document.body?.removeEventListener("keydown", this.#globalKeyDown);
    if (this.#anchor) {
      this.#anchor.removeEventListener("click", this.toggle);
      this.#anchor.removeEventListener("mouseenter", this.showTooltip);
      this.#anchor.removeEventListener("focus", this.showTooltip);
      this.#anchor.removeEventListener("blur", this.hideTooltip);
      this.#anchor.removeEventListener("keydown", this.#keyDown);
      this.#anchor.removeEventListener("mouseleave", this.hideTooltip);
    }
    this.removeEventListener("mouseleave", this.hideTooltip);
    this.removeEventListener("click", this.#stopPropagation);
    this.removeEventListener("mouseup", this.#stopPropagation);
    this.removeEventListener("beforetoggle", this.#setClosing);
    this.removeEventListener("toggle", this.#resetClosing);
    this.removeEventListener("toggle", this.#positionPopover);
  }
  #attachToAnchor() {
    if (!this.#anchor) {
      const id = this.getAttribute("id");
      if (!id) {
        throw new Error("<devtools-tooltip> must have an id.");
      }
      const root = this.getRootNode();
      if (root.querySelectorAll(`#${id}`)?.length > 1) {
        throw new Error("Duplicate <devtools-tooltip> ids found.");
      }
      const describedbyAnchor = root.querySelector(`[aria-describedby="${id}"]`);
      const detailsAnchor = root.querySelector(`[aria-details="${id}"]`);
      const anchor = describedbyAnchor ?? detailsAnchor;
      if (!anchor) {
        throw new Error(`No anchor for tooltip with id ${id} found.`);
      }
      if (!(anchor instanceof HTMLElement)) {
        throw new Error("Anchor must be an HTMLElement.");
      }
      this.#anchor = anchor;
      if (this.variant === "rich" && describedbyAnchor) {
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
    this.#anchorObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList" && [...mutation.removedNodes].includes(anchor)) {
          if (this.#timeout) {
            window.clearTimeout(this.#timeout);
          }
          this.hidePopover();
        }
      }
    });
    this.#anchorObserver.observe(anchor.parentElement, { childList: true });
  }
};
customElements.define("devtools-tooltip", Tooltip);
export {
  Tooltip_exports as Tooltip
};
//# sourceMappingURL=tooltips.js.map

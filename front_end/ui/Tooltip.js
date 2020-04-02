// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../platform/platform.js';

import {GlassPane} from './GlassPane.js';
import {createShadowRootWithCoreStyles} from './utils/create-shadow-root-with-core-styles.js';
import {Events as ZoomManagerEvents, ZoomManager} from './ZoomManager.js';

/**
 * @unrestricted
 */
export class Tooltip {
  /**
   * @param {!Document} doc
   */
  constructor(doc) {
    this.element = doc.body.createChild('div');
    this._shadowRoot = createShadowRootWithCoreStyles(this.element, 'ui/tooltip.css');

    this._tooltipElement = this._shadowRoot.createChild('div', 'tooltip');
    doc.addEventListener('mousemove', this._mouseMove.bind(this), true);
    doc.addEventListener('mousedown', this._hide.bind(this, true), true);
    doc.addEventListener('mouseleave', this._hide.bind(this, false), true);
    doc.addEventListener('keydown', this._hide.bind(this, true), true);
    ZoomManager.instance().addEventListener(ZoomManagerEvents.ZoomChanged, this._reset, this);
    doc.defaultView.addEventListener('resize', this._reset.bind(this), false);
  }

  /**
   * @param {!Document} doc
   */
  static installHandler(doc) {
    new Tooltip(doc);
  }

  /**
   * @param {!Element} element
   * @param {?Element|string} tooltipContent
   * @param {string=} actionId
   * @param {?TooltipOptions=} options
   */
  static install(element, tooltipContent, actionId, options) {
    if (!tooltipContent) {
      delete element[_symbol];
      return;
    }
    element[_symbol] = {content: tooltipContent, actionId: actionId, options: options || {}};
  }

  /**
   * @param {!Element} element
   */
  static addNativeOverrideContainer(element) {
    _nativeOverrideContainer.push(element);
  }

  /**
   * @param {!Event} event
   */
  _mouseMove(event) {
    const mouseEvent = /** @type {!MouseEvent} */ (event);
    const path = mouseEvent.composedPath();
    if (!path || mouseEvent.buttons !== 0 || (mouseEvent.movementX === 0 && mouseEvent.movementY === 0)) {
      return;
    }

    if (this._anchorElement && path.indexOf(this._anchorElement) === -1) {
      this._hide(false);
    }

    for (const element of path) {
      if (element === this._anchorElement) {
        return;
      }
      // The offsetParent is null when the element or an ancestor has 'display: none'.
      if (!(element instanceof Element) || element.offsetParent === null) {
        continue;
      }
      if (element[_symbol]) {
        this._show(element, mouseEvent);
        return;
      }
    }
  }

  /**
   * @param {!Element} anchorElement
   * @param {!Event} event
   */
  _reposition(anchorElement, event) {
    // Reposition to ensure text doesn't overflow unnecessarily.
    this._tooltipElement.positionAt(0, 0);
    // Get container element.
    const container = GlassPane.container(/** @type {!Document} */ (anchorElement.ownerDocument));
    // Position tooltip based on the anchor element.
    const containerBox = container.boxInWindow(this.element.window());
    const anchorBox = this._anchorElement.boxInWindow(this.element.window());
    const anchorOffset = 2;
    const pageMargin = 2;
    const cursorOffset = 10;
    this._tooltipElement.classList.toggle('tooltip-breakword', !this._tooltipElement.textContent.match('\\s'));
    this._tooltipElement.style.maxWidth = (containerBox.width - pageMargin * 2) + 'px';
    this._tooltipElement.style.maxHeight = '';
    const tooltipWidth = this._tooltipElement.offsetWidth;
    const tooltipHeight = this._tooltipElement.offsetHeight;
    const anchorTooltipAtElement = this._anchorTooltipAtElement();
    let tooltipX = anchorTooltipAtElement ? anchorBox.x : event.x + cursorOffset;
    tooltipX = Platform.NumberUtilities.clamp(
        tooltipX, containerBox.x + pageMargin, containerBox.x + containerBox.width - tooltipWidth - pageMargin);
    let tooltipY;
    if (!anchorTooltipAtElement) {
      tooltipY = event.y + cursorOffset + tooltipHeight < containerBox.y + containerBox.height ?
          event.y + cursorOffset :
          event.y - tooltipHeight - 1;
    } else {
      const onBottom =
          anchorBox.y + anchorOffset + anchorBox.height + tooltipHeight < containerBox.y + containerBox.height;
      tooltipY = onBottom ? anchorBox.y + anchorBox.height + anchorOffset : anchorBox.y - tooltipHeight - anchorOffset;
    }
    this._tooltipElement.positionAt(tooltipX, tooltipY);
  }

  /**
   * @returns {boolean}
   */
  _anchorTooltipAtElement() {
    const tooltip = this._anchorElement[_symbol];

    if (tooltip.options.anchorTooltipAtElement !== undefined) {
      return tooltip.options.anchorTooltipAtElement;
    }

    // default legacy behavior; better to explicitly configure tooltip placement via options
    return this._anchorElement.nodeName === 'BUTTON' || this._anchorElement.nodeName === 'LABEL';
  }

  /**
   * @param {!Element} anchorElement
   * @param {!Event} event
   */
  _show(anchorElement, event) {
    const tooltip = anchorElement[_symbol];
    this._anchorElement = anchorElement;
    this._tooltipElement.removeChildren();

    // Check if native tooltips should be used.
    if (this._shouldUseNativeTooltips()) {
      Object.defineProperty(this._anchorElement, 'title', /** @type {!Object} */ (_nativeTitle));
      this._anchorElement.title = tooltip.content;
      return;
    }

    if (typeof tooltip.content === 'string') {
      this._tooltipElement.setTextContentTruncatedIfNeeded(tooltip.content);
    } else {
      this._tooltipElement.appendChild(tooltip.content);
    }

    if (tooltip.actionId) {
      const shortcuts = self.UI.shortcutRegistry.shortcutDescriptorsForAction(tooltip.actionId);
      for (const shortcut of shortcuts) {
        const shortcutElement = this._tooltipElement.createChild('div', 'tooltip-shortcut');
        shortcutElement.textContent = shortcut.name;
      }
    }

    // Show tooltip instantly if a tooltip was shown recently.
    const now = Date.now();
    const instant = (this._tooltipLastClosed && now - this._tooltipLastClosed < Timing.InstantThreshold);
    this._tooltipElement.classList.toggle('instant', instant);
    this._tooltipLastOpened = instant ? now : now + Timing.OpeningDelay;

    this._reposition(anchorElement, event);
    this._tooltipElement.classList.add('shown');
  }

  /**
   * @return {boolean}
   */
  _shouldUseNativeTooltips() {
    for (const element of _nativeOverrideContainer) {
      if (this._anchorElement.isSelfOrDescendant(element)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param {boolean} removeInstant
   */
  _hide(removeInstant) {
    delete this._anchorElement;
    this._tooltipElement.classList.remove('shown');
    if (Date.now() > this._tooltipLastOpened) {
      this._tooltipLastClosed = Date.now();
    }
    if (removeInstant) {
      delete this._tooltipLastClosed;
    }
  }

  _reset() {
    this._hide(true);
    this._tooltipElement.positionAt(0, 0);
    this._tooltipElement.style.maxWidth = '0';
    this._tooltipElement.style.maxHeight = '0';
  }
}

/**
 * @typedef {{
 * anchorTooltipAtElement: (boolean|undefined)
 * }}
 */
export let TooltipOptions;

const Timing = {
  // Max time between tooltips showing that no opening delay is required.
  'InstantThreshold': 300,
  // Wait time before opening a tooltip.
  'OpeningDelay': 600
};

const _symbol = Symbol('Tooltip');

// Exported for layout tests.
export const TooltipSymbol = _symbol;

/** @type {!Array.<!Element>} */
const _nativeOverrideContainer = [];

const _nativeTitle = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'title');

Object.defineProperty(HTMLElement.prototype, 'title', {
  /**
   * @return {!Element|string}
   * @this {!Element}
   */
  get: function() {
    const tooltip = this[_symbol];
    return tooltip ? tooltip.content : '';
  },

  /**
   * @param {!Element|string} x
   * @this {!Element}
   */
  set: function(x) {
    Tooltip.install(this, x);
  }
});

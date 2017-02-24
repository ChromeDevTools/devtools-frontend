/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
UI.Popover = class extends UI.Widget {
  /**
   * @param {!UI.PopoverHelper=} popoverHelper
   */
  constructor(popoverHelper) {
    super(true);
    this.markAsRoot();
    this.registerRequiredCSS('ui/popover.css');
    this._containerElement = createElementWithClass('div', 'fill popover-container');
    this._popupArrowElement = this.contentElement.createChild('div', 'arrow');
    this._contentDiv = this.contentElement.createChild('div', 'popover-content');
    this._popoverHelper = popoverHelper;
    this._hideBound = this.hide.bind(this);
  }

  /**
   * @param {!Element} element
   * @param {!Element|!AnchorBox} anchor
   * @param {?number=} preferredWidth
   * @param {?number=} preferredHeight
   */
  showForAnchor(element, anchor, preferredWidth, preferredHeight) {
    this._innerShow(null, element, anchor, preferredWidth, preferredHeight);
  }

  /**
   * @param {!UI.Widget} view
   * @param {!Element|!AnchorBox} anchor
   */
  showView(view, anchor) {
    this._innerShow(view, view.element, anchor);
  }

  /**
   * @param {?UI.Widget} view
   * @param {!Element} contentElement
   * @param {!Element|!AnchorBox} anchor
   * @param {?number=} preferredWidth
   * @param {?number=} preferredHeight
   */
  _innerShow(view, contentElement, anchor, preferredWidth, preferredHeight) {
    this._contentElement = contentElement;

    // This should not happen, but we hide previous popup to be on the safe side.
    if (UI.Popover._popover)
      UI.Popover._popover.hide();
    UI.Popover._popover = this;

    var document = anchor instanceof Element ? anchor.ownerDocument : contentElement.ownerDocument;
    var window = document.defaultView;

    // Temporarily attach in order to measure preferred dimensions.
    var preferredSize = view ? view.measurePreferredSize() : UI.measurePreferredSize(this._contentElement);
    this._preferredWidth = preferredWidth || preferredSize.width;
    this._preferredHeight = preferredHeight || preferredSize.height;

    window.addEventListener('resize', this._hideBound, false);
    document.body.appendChild(this._containerElement);
    super.show(this._containerElement);

    if (view)
      view.show(this._contentDiv);
    else
      this._contentDiv.appendChild(this._contentElement);

    this.positionElement(anchor, this._preferredWidth, this._preferredHeight);

    if (this._popoverHelper) {
      this._contentDiv.addEventListener(
          'mousemove', this._popoverHelper._killHidePopoverTimer.bind(this._popoverHelper), true);
      this.element.addEventListener('mouseout', this._popoverHelper._popoverMouseOut.bind(this._popoverHelper), true);
    }
  }

  hide() {
    this._containerElement.ownerDocument.defaultView.removeEventListener('resize', this._hideBound, false);
    this.detach();
    this._containerElement.remove();
    delete UI.Popover._popover;
  }

  /**
   * @param {boolean} canShrink
   */
  setCanShrink(canShrink) {
    this._hasFixedHeight = !canShrink;
  }

  /**
   * @param {boolean} noPadding
   */
  setNoPadding(noPadding) {
    this._hasNoPadding = noPadding;
    this._contentDiv.classList.toggle('no-padding', this._hasNoPadding);
  }

  /**
   * @param {!Element|!AnchorBox} anchorElement
   * @param {number=} preferredWidth
   * @param {number=} preferredHeight
   */
  positionElement(anchorElement, preferredWidth, preferredHeight) {
    const borderWidth = this._hasNoPadding ? 0 : 8;
    const scrollerWidth = this._hasFixedHeight ? 0 : 14;
    const arrowHeight = this._hasNoPadding ? 8 : 15;
    const arrowOffset = 10;
    const borderRadius = 4;
    const arrowRadius = 6;
    preferredWidth = preferredWidth || this._preferredWidth;
    preferredHeight = preferredHeight || this._preferredHeight;

    // Skinny tooltips are not pretty, their arrow location is not nice.
    preferredWidth = Math.max(preferredWidth, 50);
    // Position relative to main DevTools element.
    const container = UI.GlassPane.container(/** @type {!Document} */ (this._containerElement.ownerDocument));
    const totalWidth = container.offsetWidth;
    const totalHeight = container.offsetHeight;

    var anchorBox = anchorElement instanceof AnchorBox ? anchorElement : anchorElement.boxInWindow(window);
    anchorBox = anchorBox.relativeToElement(container);
    var newElementPosition = {x: 0, y: 0, width: preferredWidth + scrollerWidth, height: preferredHeight};

    var arrowAtBottom;
    var roomAbove = anchorBox.y;
    var roomBelow = totalHeight - anchorBox.y - anchorBox.height;
    this._popupArrowElement.hidden = false;

    if (roomAbove > roomBelow) {
      // Positioning above the anchor.
      if (anchorBox.y > newElementPosition.height + arrowHeight + borderRadius) {
        newElementPosition.y = anchorBox.y - newElementPosition.height - arrowHeight;
      } else {
        this._popupArrowElement.hidden = true;
        newElementPosition.y = borderRadius;
        newElementPosition.height = anchorBox.y - borderRadius * 2 - arrowHeight;
        if (this._hasFixedHeight && newElementPosition.height < preferredHeight) {
          newElementPosition.y = borderRadius;
          newElementPosition.height = preferredHeight;
        }
      }
      arrowAtBottom = true;
    } else {
      // Positioning below the anchor.
      newElementPosition.y = anchorBox.y + anchorBox.height + arrowHeight;
      if (newElementPosition.y + newElementPosition.height + borderRadius >= totalHeight) {
        this._popupArrowElement.hidden = true;
        newElementPosition.height = totalHeight - borderRadius - newElementPosition.y;
        if (this._hasFixedHeight && newElementPosition.height < preferredHeight) {
          newElementPosition.y = totalHeight - preferredHeight - borderRadius;
          newElementPosition.height = preferredHeight;
        }
      }
      // Align arrow.
      arrowAtBottom = false;
    }

    var arrowAtLeft;
    this._popupArrowElement.removeAttribute('style');
    if (anchorBox.x + newElementPosition.width < totalWidth) {
      newElementPosition.x = Math.max(borderRadius, anchorBox.x - borderRadius - arrowOffset);
      arrowAtLeft = true;
      this._popupArrowElement.style.left = arrowOffset + 'px';
    } else if (newElementPosition.width + borderRadius * 2 < totalWidth) {
      newElementPosition.x = totalWidth - newElementPosition.width - borderRadius - 2 * borderWidth;
      arrowAtLeft = false;
      // Position arrow accurately.
      var arrowRightPosition = Math.max(0, totalWidth - anchorBox.x - anchorBox.width - borderRadius - arrowOffset);
      arrowRightPosition += anchorBox.width / 2;
      arrowRightPosition = Math.min(arrowRightPosition, newElementPosition.width - borderRadius - arrowOffset);
      this._popupArrowElement.style.right = arrowRightPosition + 'px';
    } else {
      newElementPosition.x = borderRadius;
      newElementPosition.width = totalWidth - borderRadius * 2;
      newElementPosition.height += scrollerWidth;
      arrowAtLeft = true;
      if (arrowAtBottom)
        newElementPosition.y -= scrollerWidth;
      // Position arrow accurately.
      this._popupArrowElement.style.left =
          Math.max(0, anchorBox.x - newElementPosition.x - borderRadius - arrowRadius + anchorBox.width / 2) + 'px';
    }

    this._popupArrowElement.className =
        `arrow ${(arrowAtBottom ? 'bottom' : 'top')}-${(arrowAtLeft ? 'left' : 'right')}-arrow`;
    this.element.positionAt(newElementPosition.x, newElementPosition.y - borderWidth, container);
    this.element.style.width = newElementPosition.width + borderWidth * 2 + 'px';
    this.element.style.height = newElementPosition.height + borderWidth * 2 + 'px';
  }
};

/**
 * @unrestricted
 */
UI.PopoverHelper = class {
  /**
   * @param {!Element} panelElement
   * @param {boolean=} disableOnClick
   */
  constructor(panelElement, disableOnClick) {
    this._disableOnClick = !!disableOnClick;
    panelElement.addEventListener('mousedown', this._mouseDown.bind(this), false);
    panelElement.addEventListener('mousemove', this._mouseMove.bind(this), false);
    panelElement.addEventListener('mouseout', this._mouseOut.bind(this), false);
    this.setTimeout(1000, 500);
  }

  /**
   * @param {function(!Element, !Event):(!Element|!AnchorBox|undefined)} getAnchor
   * @param {function(!Element, !UI.Popover):undefined} showPopover
   * @param {function()=} onHide
   */
  initializeCallbacks(getAnchor, showPopover, onHide) {
    this._getAnchor = getAnchor;
    this._showPopover = showPopover;
    this._onHide = onHide;
  }

  /**
   * @param {number} timeout
   * @param {number=} hideTimeout
   */
  setTimeout(timeout, hideTimeout) {
    this._timeout = timeout;
    if (typeof hideTimeout === 'number')
      this._hideTimeout = hideTimeout;
    else
      this._hideTimeout = timeout / 2;
  }

  /**
   * @param {!MouseEvent} event
   * @return {boolean}
   */
  _eventInHoverElement(event) {
    if (!this._hoverElement)
      return false;
    var box = this._hoverElement instanceof AnchorBox ? this._hoverElement : this._hoverElement.boxInWindow();
    return (
        box.x <= event.clientX && event.clientX <= box.x + box.width && box.y <= event.clientY &&
        event.clientY <= box.y + box.height);
  }

  _mouseDown(event) {
    if (this._disableOnClick || !this._eventInHoverElement(event)) {
      this.hidePopover();
    } else {
      this._killHidePopoverTimer();
      this._handleMouseAction(event, true);
    }
  }

  _mouseMove(event) {
    // Pretend that nothing has happened.
    if (this._eventInHoverElement(event))
      return;

    this._startHidePopoverTimer();
    this._handleMouseAction(event, false);
  }

  _popoverMouseOut(event) {
    if (!this.isPopoverVisible())
      return;
    if (event.relatedTarget && !event.relatedTarget.isSelfOrDescendant(this._popover._contentDiv))
      this._startHidePopoverTimer();
  }

  _mouseOut(event) {
    if (!this.isPopoverVisible())
      return;
    if (!this._eventInHoverElement(event))
      this._startHidePopoverTimer();
  }

  _startHidePopoverTimer() {
    // User has 500ms (this._hideTimeout) to reach the popup.
    if (!this._popover || this._hidePopoverTimer)
      return;

    /**
     * @this {UI.PopoverHelper}
     */
    function doHide() {
      this._hidePopover();
      delete this._hidePopoverTimer;
    }
    this._hidePopoverTimer = setTimeout(doHide.bind(this), this._hideTimeout);
  }

  _handleMouseAction(event, isMouseDown) {
    this._resetHoverTimer();
    if (event.which && this._disableOnClick)
      return;
    this._hoverElement = this._getAnchor(event.target, event);
    if (!this._hoverElement)
      return;
    const toolTipDelay = isMouseDown ? 0 : (this._popup ? this._timeout * 0.6 : this._timeout);
    this._hoverTimer = setTimeout(this._mouseHover.bind(this, this._hoverElement), toolTipDelay);
  }

  _resetHoverTimer() {
    if (this._hoverTimer) {
      clearTimeout(this._hoverTimer);
      delete this._hoverTimer;
    }
  }

  /**
   * @return {boolean}
   */
  isPopoverVisible() {
    return !!this._popover;
  }

  hidePopover() {
    this._resetHoverTimer();
    this._hidePopover();
  }

  _hidePopover() {
    if (!this._popover)
      return;

    if (this._onHide)
      this._onHide();

    if (this._popover.isShowing())
      this._popover.hide();
    delete this._popover;
    this._hoverElement = null;
  }

  _mouseHover(element) {
    delete this._hoverTimer;
    this._hoverElement = element;
    this._hidePopover();
    this._popover = new UI.Popover(this);
    this._showPopover(element, this._popover);
  }

  _killHidePopoverTimer() {
    if (this._hidePopoverTimer) {
      clearTimeout(this._hidePopoverTimer);
      delete this._hidePopoverTimer;

      // We know that we reached the popup, but we might have moved over other elements.
      // Discard pending command.
      this._resetHoverTimer();
    }
  }
};

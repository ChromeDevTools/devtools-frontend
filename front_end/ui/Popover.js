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

UI.Popover = class extends UI.GlassPane {
  /**
   * @param {!UI.PopoverHelper=} popoverHelper
   */
  constructor(popoverHelper) {
    super();
    this.registerRequiredCSS('ui/popover.css');
    this.setBlockPointerEvents(false);
    this.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    this.setShowArrow(true);
    this._popoverHelper = popoverHelper;
  }

  /**
   * @param {!Element} element
   * @param {!Element|!AnchorBox} anchor
   */
  showForAnchor(element, anchor) {
    this._innerShow(null, element, anchor);
  }

  /**
   * @param {!UI.Widget} view
   * @param {!Element|!AnchorBox} anchor
   */
  showView(view, anchor) {
    this._innerShow(view, view.element, anchor);
  }

  /**
   * @param {?UI.Widget} widget
   * @param {!Element} contentElement
   * @param {!Element|!AnchorBox} anchor
   */
  _innerShow(widget, contentElement, anchor) {
    // This should not happen, but we hide previous popup to be on the safe side.
    if (UI.Popover._popover)
      UI.Popover._popover.hide();
    UI.Popover._popover = this;

    var document =
        /** @type {!Document} */ (anchor instanceof Element ? anchor.ownerDocument : contentElement.ownerDocument);
    var anchorBox = anchor instanceof AnchorBox ? anchor : anchor.boxInWindow();
    this.setContentAnchorBox(anchorBox);

    if (widget)
      widget.show(this.contentElement);
    else
      this.contentElement.appendChild(contentElement);

    super.show(document);

    if (this._popoverHelper) {
      this.contentElement.addEventListener(
          'mousemove', this._popoverHelper._killHidePopoverTimer.bind(this._popoverHelper), true);
      this.contentElement.addEventListener(
          'mouseout', this._popoverHelper._popoverMouseOut.bind(this._popoverHelper), true);
    }
  }

  /**
   * @override
   */
  hide() {
    super.hide();
    delete UI.Popover._popover;
  }

  /**
   * @param {boolean} noPadding
   */
  setNoPadding(noPadding) {
    // TODO(dgozman): remove this. Clients should add padding themselves.
    this.contentElement.classList.toggle('no-padding', noPadding);
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
    if (event.relatedTarget && !event.relatedTarget.isSelfOrDescendant(this._popover.contentElement))
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

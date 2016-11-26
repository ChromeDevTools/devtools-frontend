// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
UI.SwatchPopoverHelper = class extends Common.Object {
  constructor() {
    super();
    this._popover = new UI.Popover();
    this._popover.setCanShrink(false);
    this._popover.setNoPadding(true);
    this._popover.element.addEventListener('mousedown', (e) => e.consume(), false);

    this._hideProxy = this.hide.bind(this, true);
    this._boundOnKeyDown = this._onKeyDown.bind(this);
    this._boundFocusOut = this._onFocusOut.bind(this);
    this._isHidden = true;
  }

  /**
   * @param {!Event} event
   */
  _onFocusOut(event) {
    if (!event.relatedTarget || event.relatedTarget.isSelfOrDescendant(this._view.contentElement))
      return;
    this._hideProxy();
  }

  /**
   * @return {boolean}
   */
  isShowing() {
    return this._popover.isShowing();
  }

  /**
   * @param {!UI.Widget} view
   * @param {!Element} anchorElement
   * @param {function(boolean)=} hiddenCallback
   */
  show(view, anchorElement, hiddenCallback) {
    if (this._popover.isShowing()) {
      if (this._anchorElement === anchorElement)
        return;

      // Reopen the picker for another anchor element.
      this.hide(true);
    }

    delete this._isHidden;
    this._anchorElement = anchorElement;
    this._view = view;
    this._hiddenCallback = hiddenCallback;
    this.reposition();
    view.focus();

    var document = this._popover.element.ownerDocument;
    document.addEventListener('mousedown', this._hideProxy, false);
    document.defaultView.addEventListener('resize', this._hideProxy, false);
    this._view.contentElement.addEventListener('keydown', this._boundOnKeyDown, false);
  }

  reposition() {
    // Unbind "blur" listener to avoid reenterability: |popover.showView| will hide the popover and trigger it synchronously.
    this._view.contentElement.removeEventListener('focusout', this._boundFocusOut, false);
    this._popover.showView(this._view, this._anchorElement);
    this._view.contentElement.addEventListener('focusout', this._boundFocusOut, false);
    if (!this._focusRestorer)
      this._focusRestorer = new UI.WidgetFocusRestorer(this._view);
  }

  /**
   * @param {boolean=} commitEdit
   */
  hide(commitEdit) {
    if (this._isHidden)
      return;
    var document = this._popover.element.ownerDocument;
    this._isHidden = true;
    this._popover.hide();

    document.removeEventListener('mousedown', this._hideProxy, false);
    document.defaultView.removeEventListener('resize', this._hideProxy, false);

    if (this._hiddenCallback)
      this._hiddenCallback.call(null, !!commitEdit);

    this._focusRestorer.restore();
    delete this._anchorElement;
    if (this._view) {
      this._view.detach();
      this._view.contentElement.removeEventListener('keydown', this._boundOnKeyDown, false);
      this._view.contentElement.removeEventListener('focusout', this._boundFocusOut, false);
      delete this._view;
    }
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    if (event.key === 'Enter') {
      this.hide(true);
      event.consume(true);
      return;
    }
    if (event.key === 'Escape') {
      this.hide(false);
      event.consume(true);
    }
  }
};

// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

UI.GlassPane = class {
  constructor() {
    this._widget = new UI.Widget(true);
    this._widget.markAsRoot();
    this.element = this._widget.element;
    this.contentElement = this._widget.contentElement;

    this.registerRequiredCSS('ui/glassPane.css');
    this.element.classList.add('no-pointer-events');
    this._onMouseDownBound = this._onMouseDown.bind(this);
    /** @type {?function(!Event)} */
    this._onClickOutsideCallback = null;
    /** @type {?UI.Size} */
    this._maxSize = null;
    /** @type {?number} */
    this._positionX = null;
    /** @type {?number} */
    this._positionY = null;
    /** @type {?AnchorBox} */
    this._anchorBox = null;
    this._anchorBehavior = UI.GlassPane.AnchorBehavior.PreferTop;
    this._sizeBehavior = UI.GlassPane.SizeBehavior.SetHeight;
  }

  /**
   * @return {boolean}
   */
  isShowing() {
    return this._widget.isShowing();
  }

  /**
   * @param {string} cssFile
   */
  registerRequiredCSS(cssFile) {
    this._widget.registerRequiredCSS(cssFile);
  }

  /**
   * @param {boolean} dimmed
   */
  setDimmed(dimmed) {
    this.element.classList.toggle('dimmed-pane', dimmed);
  }

  /**
   * @param {boolean} blockPointerEvents
   */
  setBlockPointerEvents(blockPointerEvents) {
    this.element.classList.toggle('no-pointer-events', !blockPointerEvents);
  }

  /**
   * @param {?function(!Event)} callback
   */
  setSetOutsideClickCallback(callback) {
    this._onClickOutsideCallback = callback;
  }

  /**
   * @param {?UI.Size} size
   */
  setMaxContentSize(size) {
    this._maxSize = size;
    this._positionContent();
  }

  /**
   * @param {!UI.GlassPane.SizeBehavior} sizeBehavior
   */
  setSizeBehavior(sizeBehavior) {
    this._sizeBehavior = sizeBehavior;
    this._positionContent();
  }

  /**
   * @param {?number} x
   * @param {?number} y
   * Position is relative to root element.
   */
  setContentPosition(x, y) {
    this._positionX = x;
    this._positionY = y;
    this._positionContent();
  }

  /**
   * @param {?AnchorBox} anchorBox
   * Anchor box is relative to the document.
   */
  setContentAnchorBox(anchorBox) {
    this._anchorBox = anchorBox;
    this._positionContent();
  }

  /**
   * @param {!UI.GlassPane.AnchorBehavior} behavior
   */
  setAnchorBehavior(behavior) {
    this._anchorBehavior = behavior;
  }

  /**
   * @param {!Document} document
   */
  show(document) {
    if (this.isShowing())
      return;
    // Deliberately starts with 3000 to hide other z-indexed elements below.
    this.element.style.zIndex = 3000 + 1000 * UI.GlassPane._panes.size;
    document.body.addEventListener('mousedown', this._onMouseDownBound, true);
    this._widget.show(document.body);
    UI.GlassPane._panes.add(this);
    this._positionContent();
  }

  hide() {
    if (!this.isShowing())
      return;
    UI.GlassPane._panes.delete(this);
    this.element.ownerDocument.body.removeEventListener('mousedown', this._onMouseDownBound, true);
    this._widget.detach();
  }

  /**
   * @param {!Event} event
   */
  _onMouseDown(event) {
    if (!this._onClickOutsideCallback)
      return;
    if (this.contentElement.isSelfOrAncestor(/** @type {?Node} */ (event.deepElementFromPoint())))
      return;
    this._onClickOutsideCallback.call(null, event);
  }

  _positionContent() {
    if (!this.isShowing())
      return;

    var gutterSize = 5;
    var container = UI.GlassPane._containers.get(/** @type {!Document} */ (this.element.ownerDocument));
    if (this._sizeBehavior === UI.GlassPane.SizeBehavior.MeasureContent) {
      this.contentElement.positionAt(0, 0);
      this.contentElement.style.width = '';
      this.contentElement.style.height = '';
      this.contentElement.style.maxHeight = '';
    }

    var containerWidth = container.offsetWidth;
    var containerHeight = container.offsetHeight;

    var width = containerWidth - gutterSize * 2;
    var height = containerHeight - gutterSize * 2;
    var positionX = gutterSize;
    var positionY = gutterSize;

    if (this._maxSize) {
      width = Math.min(width, this._maxSize.width);
      height = Math.min(height, this._maxSize.height);
    }

    if (this._sizeBehavior === UI.GlassPane.SizeBehavior.MeasureContent) {
      width = Math.min(width, this.contentElement.offsetWidth);
      height = Math.min(height, this.contentElement.offsetHeight);
    }

    if (this._anchorBox) {
      var anchorBox = this._anchorBox.relativeToElement(container);
      var behavior = this._anchorBehavior;

      if (behavior === UI.GlassPane.AnchorBehavior.PreferTop || behavior === UI.GlassPane.AnchorBehavior.PreferBottom) {
        var top = anchorBox.y - gutterSize;
        var bottom = containerHeight - anchorBox.y - anchorBox.height - gutterSize;
        if (behavior === UI.GlassPane.AnchorBehavior.PreferTop && top < height && bottom > top)
          behavior = UI.GlassPane.AnchorBehavior.PreferBottom;
        if (behavior === UI.GlassPane.AnchorBehavior.PreferBottom && bottom < height && top > bottom)
          behavior = UI.GlassPane.AnchorBehavior.PreferTop;

        positionX = Math.max(gutterSize, Math.min(anchorBox.x, containerWidth - width - gutterSize));
        width = Math.min(width, containerWidth - positionX - gutterSize);
        if (behavior === UI.GlassPane.AnchorBehavior.PreferTop) {
          positionY = Math.max(gutterSize, anchorBox.y - height);
          height = Math.min(height, anchorBox.y - positionY);
        } else {
          positionY = anchorBox.y + anchorBox.height;
          height = Math.min(height, containerHeight - positionY - gutterSize);
        }
      } else {
        var left = anchorBox.x - gutterSize;
        var right = containerWidth - anchorBox.x - anchorBox.width - gutterSize;
        if (behavior === UI.GlassPane.AnchorBehavior.PreferLeft && left < width && right > left)
          behavior = UI.GlassPane.AnchorBehavior.PreferRight;
        if (behavior === UI.GlassPane.AnchorBehavior.PreferRight && right < width && left > right)
          behavior = UI.GlassPane.AnchorBehavior.PreferLeft;

        positionY = Math.max(gutterSize, Math.min(anchorBox.y, containerHeight - height - gutterSize));
        height = Math.min(height, containerHeight - positionY - gutterSize);
        if (behavior === UI.GlassPane.AnchorBehavior.PreferLeft) {
          positionX = Math.max(gutterSize, anchorBox.x - width);
          width = Math.min(width, anchorBox.x - positionX);
        } else {
          positionX = anchorBox.x + anchorBox.width;
          width = Math.min(width, containerWidth - positionX - gutterSize);
        }
      }
    } else {
      positionX = this._positionX !== null ? this._positionX : (containerWidth - width) / 2;
      positionY = this._positionY !== null ? this._positionY : (containerHeight - height) / 2;
      width = Math.min(width, containerWidth - positionX - gutterSize);
      height = Math.min(height, containerHeight - positionY - gutterSize);
    }

    this.contentElement.style.width = width + 'px';
    if (this._sizeBehavior === UI.GlassPane.SizeBehavior.SetMaxHeight)
      this.contentElement.style.maxHeight = height + 'px';
    else
      this.contentElement.style.height = height + 'px';
    this.contentElement.positionAt(positionX, positionY, container);
    this._widget.doResize();
  }

  /**
   * @protected
   * @return {!UI.Widget}
   */
  widget() {
    return this._widget;
  }

  /**
   * @param {!Element} element
   */
  static setContainer(element) {
    UI.GlassPane._containers.set(/** @type {!Document} */ (element.ownerDocument), element);
    UI.GlassPane.containerMoved(element);
  }

  /**
   * @param {!Document} document
   * @return {!Element}
   */
  static container(document) {
    return UI.GlassPane._containers.get(document);
  }

  /**
   * @param {!Element} element
   */
  static containerMoved(element) {
    for (var pane of UI.GlassPane._panes) {
      if (pane.isShowing() && pane.element.ownerDocument === element.ownerDocument)
        pane._positionContent();
    }
  }
};

/**
 * @enum {symbol}
 */
UI.GlassPane.AnchorBehavior = {
  PreferTop: Symbol('PreferTop'),
  PreferBottom: Symbol('PreferBottom'),
  PreferLeft: Symbol('PreferLeft'),
  PreferRight: Symbol('PreferRight'),
};

/**
 * @enum {symbol}
 */
UI.GlassPane.SizeBehavior = {
  SetHeight: Symbol('SetHeight'),
  SetMaxHeight: Symbol('SetMaxHeight'),
  MeasureContent: Symbol('MeasureContent')
};

/** @type {!Map<!Document, !Element>} */
UI.GlassPane._containers = new Map();
/** @type {!Set<!UI.GlassPane>} */
UI.GlassPane._panes = new Set();

// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

UI.GlassPane = class {
  /**
   * @param {!Document} document
   * @param {boolean} dimmed
   * @param {boolean} blockPointerEvents
   * @param {function(!Event)} onClickOutside
   */
  constructor(document, dimmed, blockPointerEvents, onClickOutside) {
    this._element = createElementWithClass('div', 'glass-pane');
    this._element.style.backgroundColor = dimmed ? 'rgba(255, 255, 255, 0.5)' : 'transparent';
    if (!blockPointerEvents)
      this._element.style.pointerEvents = 'none';
    this._onMouseDown = event => {
      if (!this.contentElement.isSelfOrAncestor(/** @type {?Node} */ (event.target)))
        onClickOutside.call(null, event);
    };

    this.contentElement = this._element.createChild('div', 'glass-pane-content');
    this._document = document;
    this._visible = false;
    /** @type {?UI.Size} */
    this._maxSize = null;
    /** @type {?number} */
    this._positionX = null;
    /** @type {?number} */
    this._positionY = null;
    /** @type {?AnchorBox} */
    this._anchorBox = null;
    this._anchorBehavior = UI.GlassPane.AnchorBehavior.PreferTop;
  }

  /**
   * @param {?UI.Size} size
   */
  setMaxContentSize(size) {
    this._maxSize = size;
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

  show() {
    if (this._visible)
      return;
    this._visible = true;
    // Deliberately starts with 3000 to hide other z-indexed elements below.
    this._element.style.zIndex = 3000 + 1000 * UI.GlassPane._panes.size;
    this._document.body.appendChild(this._element);
    this._document.body.addEventListener('mousedown', this._onMouseDown, true);
    UI.GlassPane._panes.add(this);
  }

  hide() {
    if (!this._visible)
      return;
    UI.GlassPane._panes.delete(this);
    this._document.body.removeEventListener('mousedown', this._onMouseDown, true);
    this._document.body.removeChild(this._element);
    this._visible = false;
  }

  /**
   * @return {boolean}
   */
  visible() {
    return this._visible;
  }

  _positionContent() {
    if (!this._visible)
      return;

    var gutterSize = 5;
    var container = UI.GlassPane._containers.get(this._document);
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

    if (this._anchorBox) {
      var anchorBox = this._anchorBox.relativeToElement(container);
      var behavior = this._anchorBehavior;

      if (behavior === UI.GlassPane.AnchorBehavior.PreferTop || behavior === UI.GlassPane.AnchorBehavior.PreferBottom) {
        var top = anchorBox.y - gutterSize;
        var bottom = containerHeight - anchorBox.y - anchorBox.height - gutterSize;
        if (behavior === UI.GlassPane.AnchorBehavior.PreferTop && top < height && bottom >= height)
          behavior = UI.GlassPane.AnchorBehavior.PreferBottom;
        if (behavior === UI.GlassPane.AnchorBehavior.PreferBottom && bottom < height && top >= height)
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
        if (behavior === UI.GlassPane.AnchorBehavior.PreferLeft && left < width && right >= width)
          behavior = UI.GlassPane.AnchorBehavior.PreferRight;
        if (behavior === UI.GlassPane.AnchorBehavior.PreferRight && right < width && left >= width)
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
    this.contentElement.style.height = height + 'px';
    this.contentElement.positionAt(positionX, positionY, container);
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
      if (pane._document === element.ownerDocument)
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

/** @type {!Map<!Document, !Element>} */
UI.GlassPane._containers = new Map();
/** @type {!Set<!UI.GlassPane>} */
UI.GlassPane._panes = new Set();

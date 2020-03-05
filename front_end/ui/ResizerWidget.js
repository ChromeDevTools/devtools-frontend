// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import {elementDragStart} from './UIUtils.js';

/**
 * @unrestricted
 */
export class ResizerWidget extends Common.ObjectWrapper.ObjectWrapper {
  constructor() {
    super();

    this._isEnabled = true;
    /** @type {!Set<!Element>} */
    this._elements = new Set();
    this._installDragOnMouseDownBound = this._installDragOnMouseDown.bind(this);
    this._cursor = 'nwse-resize';
  }

  /**
   * @return {boolean}
   */
  isEnabled() {
    return this._isEnabled;
  }

  /**
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._isEnabled = enabled;
    this.updateElementCursors();
  }

  /**
   * @return {!Array.<!Element>}
   */
  elements() {
    return [...this._elements];
  }

  /**
   * @param {!Element} element
   */
  addElement(element) {
    if (!this._elements.has(element)) {
      this._elements.add(element);
      element.addEventListener('mousedown', this._installDragOnMouseDownBound, false);
      this._updateElementCursor(element);
    }
  }

  /**
   * @param {!Element} element
   */
  removeElement(element) {
    if (this._elements.has(element)) {
      this._elements.delete(element);
      element.removeEventListener('mousedown', this._installDragOnMouseDownBound, false);
      element.style.removeProperty('cursor');
    }
  }

  updateElementCursors() {
    this._elements.forEach(this._updateElementCursor.bind(this));
  }

  /**
   * @param {!Element} element
   */
  _updateElementCursor(element) {
    if (this._isEnabled) {
      element.style.setProperty('cursor', this.cursor());
    } else {
      element.style.removeProperty('cursor');
    }
  }

  /**
   * @return {string}
   */
  cursor() {
    return this._cursor;
  }

  /**
   * @param {string} cursor
   */
  setCursor(cursor) {
    this._cursor = cursor;
    this.updateElementCursors();
  }

  /**
   * @param {!Event} event
   */
  _installDragOnMouseDown(event) {
    const element = /** @type {!Element} */ (event.target);
    // Only handle drags of the nodes specified.
    if (!this._elements.has(element)) {
      return false;
    }
    elementDragStart(
        element, this._dragStart.bind(this), this._drag.bind(this), this._dragEnd.bind(this), this.cursor(), event);
  }

  /**
   * @param {!MouseEvent} event
   * @return {boolean}
   */
  _dragStart(event) {
    if (!this._isEnabled) {
      return false;
    }
    this._startX = event.pageX;
    this._startY = event.pageY;
    this.sendDragStart(this._startX, this._startY);
    return true;
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  sendDragStart(x, y) {
    this.dispatchEventToListeners(Events.ResizeStart, {startX: x, currentX: x, startY: y, currentY: y});
  }

  /**
   * @param {!MouseEvent} event
   * @return {boolean}
   */
  _drag(event) {
    if (!this._isEnabled) {
      this._dragEnd(event);
      return true;  // Cancel drag.
    }

    this.sendDragMove(this._startX, event.pageX, this._startY, event.pageY, event.shiftKey);
    event.preventDefault();
    return false;  // Continue drag.
  }

  /**
   * @param {number} startX
   * @param {number} currentX
   * @param {number} startY
   * @param {number} currentY
   * @param {boolean} shiftKey
   */
  sendDragMove(startX, currentX, startY, currentY, shiftKey) {
    this.dispatchEventToListeners(
        Events.ResizeUpdate,
        {startX: startX, currentX: currentX, startY: startY, currentY: currentY, shiftKey: shiftKey});
  }

  /**
   * @param {!MouseEvent} event
   */
  _dragEnd(event) {
    this.dispatchEventToListeners(Events.ResizeEnd);
    delete this._startX;
    delete this._startY;
    /**************** POWWOW ADDED ****************/
    window.document.dispatchEvent(new CustomEvent('DEVTOOLS_SPLITBAR_DRAG_END'));
    /**************** POWWOW ADDED ****************/    
  }
}

/** @enum {symbol} */
export const Events = {
  ResizeStart: Symbol('ResizeStart'),
  ResizeUpdate: Symbol('ResizeUpdate'),
  ResizeEnd: Symbol('ResizeEnd')
};

/**
 * @unrestricted
 */
export class SimpleResizerWidget extends ResizerWidget {
  constructor() {
    super();
    this._isVertical = true;
  }

  /**
   * @return {boolean}
   */
  isVertical() {
    return this._isVertical;
  }

  /**
   * Vertical widget resizes height (along y-axis).
   * @param {boolean} vertical
   */
  setVertical(vertical) {
    this._isVertical = vertical;
    this.updateElementCursors();
  }

  /**
   * @override
   * @return {string}
   */
  cursor() {
    return this._isVertical ? 'ns-resize' : 'ew-resize';
  }

  /**
   * @override
   * @param {number} x
   * @param {number} y
   */
  sendDragStart(x, y) {
    const position = this._isVertical ? y : x;
    this.dispatchEventToListeners(Events.ResizeStart, {startPosition: position, currentPosition: position});
  }

  /**
   * @override
   * @param {number} startX
   * @param {number} currentX
   * @param {number} startY
   * @param {number} currentY
   * @param {boolean} shiftKey
   */
  sendDragMove(startX, currentX, startY, currentY, shiftKey) {
    if (this._isVertical) {
      this.dispatchEventToListeners(
          Events.ResizeUpdate, {startPosition: startY, currentPosition: currentY, shiftKey: shiftKey});
    } else {
      this.dispatchEventToListeners(
          Events.ResizeUpdate, {startPosition: startX, currentPosition: currentX, shiftKey: shiftKey});
    }
  }
}

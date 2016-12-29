// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @template T
 * @interface
 */
UI.ListDelegate = function() {};

UI.ListDelegate.prototype = {
  /**
   * @param {T} item
   * @return {!Element}
   */
  createElementForItem(item) {},

  /**
   * @param {T} item
   * @return {number}
   */
  heightForItem(item) {},

  /**
   * @param {T} item
   * @return {boolean}
   */
  isItemSelectable(item) {},

  /**
   * @param {?T} from
   * @param {?T} to
   * @param {?Element} fromElement
   * @param {?Element} toElement
   */
  selectedItemChanged(from, to, fromElement, toElement) {},
};

/** @enum {symbol} */
UI.ListHeightMode = {
  Fixed: Symbol('UI.ListHeightMode.Fixed'),
  Measured: Symbol('UI.ListHeightMode.Measured'),
  Variable: Symbol('UI.ListHeightMode.Variable')
};

/**
 * @template T
 */
UI.ListControl = class {
  /**
   * @param {!UI.ListDelegate<T>} delegate
   */
  constructor(delegate) {
    this.element = createElement('div');
    this.element.style.overflow = 'auto';
    this._topElement = this.element.createChild('div');
    this._bottomElement = this.element.createChild('div');
    this._firstIndex = 0;
    this._lastIndex = 0;
    this._renderedHeight = 0;
    this._topHeight = 0;
    this._bottomHeight = 0;
    this._clearViewport();

    /** @type {!Array<T>} */
    this._items = [];
    /** @type {!Map<T, !Element>} */
    this._itemToElement = new Map();
    this._selectedIndex = -1;

    this._boundKeyDown = event => {
      if (this.onKeyDown(event))
        event.consume(true);
    };
    this._boundClick = event => {
      if (this.onClick(event))
        event.consume(true);
    };

    this._delegate = delegate;
    this._heightMode = UI.ListHeightMode.Measured;
    this._fixedHeight = 0;
    this._variableOffsets = new Int32Array(0);

    this.element.addEventListener('scroll', this._onScroll.bind(this), false);
  }

  /**
   * @param {!UI.ListHeightMode} mode
   */
  setHeightMode(mode) {
    this._heightMode = mode;
    this._fixedHeight = 0;
    if (this._items.length) {
      this._itemToElement.clear();
      this._invalidate(0, this._items.length, this._items.length);
    }
  }

  /**
   * @param {boolean} handleInput
   */
  setHandleInput(handleInput) {
    if (handleInput) {
      this.element.addEventListener('keydown', this._boundKeyDown, false);
      this.element.addEventListener('click', this._boundClick, false);
    } else {
      this.element.removeEventListener('keydown', this._boundKeyDown, false);
      this.element.removeEventListener('click', this._boundClick, false);
    }
  }

  /**
   * @return {number}
   */
  length() {
    return this._items.length;
  }

  /**
   * @param {number} index
   * @return {T}
   */
  itemAtIndex(index) {
    return this._items[index];
  }

  /**
   * @param {T} item
   */
  pushItem(item) {
    this.replaceItemsInRange(this._items.length, this._items.length, [item]);
  }

  /**
   * @return {T}
   */
  popItem() {
    return this.removeItemAtIndex(this._items.length - 1);
  }

  /**
   * @param {number} index
   * @param {T} item
   */
  insertItemAtIndex(index, item) {
    this.replaceItemsInRange(index, index, [item]);
  }

  /**
   * @param {number} index
   * @return {T}
   */
  removeItemAtIndex(index) {
    var result = this._items[index];
    this.replaceItemsInRange(index, index + 1, []);
    return result;
  }

  /**
   * @param {number} from
   * @param {number} to
   * @param {!Array<T>} items
   */
  replaceItemsInRange(from, to, items) {
    var oldSelectedItem = this._selectedIndex !== -1 ? this._items[this._selectedIndex] : null;
    var oldSelectedElement = oldSelectedItem ? (this._itemToElement.get(oldSelectedItem) || null) : null;

    for (var i = from; i < to; i++)
      this._itemToElement.delete(this._items[i]);
    if (items.length < 10000) {
      this._items.splice.bind(this._items, from, to - from).apply(null, items);
    } else {
      // Splice may fail with too many arguments.
      var before = this._items.slice(0, from);
      var after = this._items.slice(to);
      this._items = [].concat(before, items, after);
    }
    this._invalidate(from, to, items.length);

    if (this._selectedIndex >= to) {
      this._selectedIndex += items.length - (to - from);
    } else if (this._selectedIndex >= from) {
      var index = this._findClosestSelectable(from + items.length, +1, 0, false);
      if (index === -1)
        index = this._findClosestSelectable(from - 1, -1, 0, false);
      this._select(index, oldSelectedItem, oldSelectedElement);
    }
  }

  /**
   * @param {!Array<T>} items
   */
  replaceAllItems(items) {
    this.replaceItemsInRange(0, this._items.length, items);
  }

  /**
   * @param {number} from
   * @param {number} to
   */
  invalidateRange(from, to) {
    this._invalidate(from, to, to - from);
  }

  viewportResized() {
    // TODO(dgozman): try to keep the visible scrollTop the same
    // when invalidating after firstIndex but before first visible element.
    var scrollTop = this.element.scrollTop;
    var viewportHeight = this.element.offsetHeight;
    this._clearViewport();
    this._updateViewport(Number.constrain(scrollTop, 0, this._totalHeight() - viewportHeight), viewportHeight);
  }

  /**
   * @param {number} index
   */
  scrollItemAtIndexIntoView(index) {
    var top = this._offsetAtIndex(index);
    var bottom = this._offsetAtIndex(index + 1);
    var scrollTop = this.element.scrollTop;
    var viewportHeight = this.element.offsetHeight;
    if (top < scrollTop)
      this._updateViewport(top, viewportHeight);
    else if (bottom > scrollTop + viewportHeight)
      this._updateViewport(bottom - viewportHeight, viewportHeight);
  }

  /**
   * @param {number} index
   * @param {boolean=} scrollIntoView
   */
  selectItemAtIndex(index, scrollIntoView) {
    if (index !== -1 && !this._delegate.isItemSelectable(this._items[index]))
      throw 'Attempt to select non-selectable item';
    this._select(index);
    if (index !== -1 && !!scrollIntoView)
      this.scrollItemAtIndexIntoView(index);
  }

  /**
   * @return {number}
   */
  selectedIndex() {
    return this._selectedIndex;
  }

  /**
   * @return {?T}
   */
  selectedItem() {
    return this._selectedIndex === -1 ? null : this._items[this._selectedIndex];
  }

  /**
   * @param {!Event} event
   * @return {boolean}
   */
  onKeyDown(event) {
    var index = -1;
    switch (event.key) {
      case 'ArrowUp':
        index = this._selectedIndex === -1 ? this._findClosestSelectable(this._items.length - 1, -1, 0, true) :
                                             this._findClosestSelectable(this._selectedIndex, -1, 1, true);
        break;
      case 'ArrowDown':
        index = this._selectedIndex === -1 ? this._findClosestSelectable(0, +1, 0, true) :
                                             this._findClosestSelectable(this._selectedIndex, +1, 1, true);
        break;
      case 'PageUp':
        index = this._selectedIndex === -1 ? this._items.length - 1 : this._selectedIndex;
        // Compensate for zoom rounding errors with -1.
        index = this._findClosestSelectable(index, -1, this.element.offsetHeight - 1, false);
        break;
      case 'PageDown':
        index = this._selectedIndex === -1 ? 0 : this._selectedIndex;
        // Compensate for zoom rounding errors with -1.
        index = this._findClosestSelectable(index, +1, this.element.offsetHeight - 1, false);
        break;
      default:
        return false;
    }
    if (index !== -1) {
      this.scrollItemAtIndexIntoView(index);
      this._select(index);
      return true;
    }
    return false;
  }

  /**
   * @param {!Event} event
   * @return {boolean}
   */
  onClick(event) {
    var node = event.target;
    while (node && node.parentNodeOrShadowHost() !== this.element)
      node = node.parentNodeOrShadowHost();
    if (!node || node.nodeType !== Node.ELEMENT_NODE)
      return false;
    var offset = /** @type {!Element} */ (node).getBoundingClientRect().top;
    offset -= this.element.getBoundingClientRect().top;
    var index = this._indexAtOffset(offset + this.element.scrollTop);
    if (index === -1 || !this._delegate.isItemSelectable(this._items[index]))
      return false;
    this._select(index);
    return true;
  }

  /**
   * @return {number}
   */
  _totalHeight() {
    return this._offsetAtIndex(this._items.length);
  }

  /**
   * @param {number} offset
   * @return {number}
   */
  _indexAtOffset(offset) {
    if (!this._items.length || offset < 0)
      return 0;
    if (this._heightMode === UI.ListHeightMode.Variable) {
      return Math.min(
          this._items.length - 1, this._variableOffsets.lowerBound(offset, undefined, 0, this._items.length));
    }
    if (!this._fixedHeight)
      this._measureHeight();
    return Math.min(this._items.length - 1, Math.floor(offset / this._fixedHeight));
  }

  /**
   * @param {number} index
   * @return {!Element}
   */
  _elementAtIndex(index) {
    var item = this._items[index];
    var element = this._itemToElement.get(item);
    if (!element) {
      element = this._delegate.createElementForItem(item);
      this._itemToElement.set(item, element);
    }
    return element;
  }

  /**
   * @param {number} index
   * @return {number}
   */
  _offsetAtIndex(index) {
    if (!this._items.length)
      return 0;
    if (this._heightMode === UI.ListHeightMode.Variable)
      return this._variableOffsets[index];
    if (!this._fixedHeight)
      this._measureHeight();
    return index * this._fixedHeight;
  }

  _measureHeight() {
    if (this._heightMode === UI.ListHeightMode.Measured)
      this._fixedHeight = UI.measurePreferredSize(this._elementAtIndex(0), this.element).height;
    else
      this._fixedHeight = this._delegate.heightForItem(this._items[0]);
  }

  /**
   * @param {number} index
   * @param {?T=} oldItem
   * @param {?Element=} oldElement
   */
  _select(index, oldItem, oldElement) {
    if (oldItem === undefined)
      oldItem = this._selectedIndex !== -1 ? this._items[this._selectedIndex] : null;
    if (oldElement === undefined)
      oldElement = this._itemToElement.get(oldItem) || null;
    this._selectedIndex = index;
    var newItem = this._selectedIndex !== -1 ? this._items[this._selectedIndex] : null;
    var newElement = this._itemToElement.get(newItem) || null;
    this._delegate.selectedItemChanged(oldItem, newItem, /** @type {?Element} */ (oldElement), newElement);
  }

  /**
   * @param {number} index
   * @param {number} direction
   * @param {number} minSkippedHeight
   * @param {boolean} canWrap
   * @return {number}
   */
  _findClosestSelectable(index, direction, minSkippedHeight, canWrap) {
    var length = this._items.length;
    if (!length)
      return -1;

    var lastSelectable = -1;
    var start = -1;
    var startOffset = this._offsetAtIndex(index);
    while (true) {
      if (index < 0 || index >= length) {
        if (!canWrap)
          return lastSelectable;
        index = (index + length) % length;
      }

      // Handle full wrap-around.
      if (index === start)
        return lastSelectable;
      if (start === -1) {
        start = index;
        startOffset = this._offsetAtIndex(index);
      }

      if (this._delegate.isItemSelectable(this._items[index])) {
        if (Math.abs(this._offsetAtIndex(index) - startOffset) >= minSkippedHeight)
          return index;
        lastSelectable = index;
      }

      index += direction;
    }
  }

  /**
   * @param {number} length
   * @param {number} copyTo
   */
  _reallocateVariableOffsets(length, copyTo) {
    if (this._variableOffsets.length < length) {
      var variableOffsets = new Int32Array(Math.max(length, this._variableOffsets.length * 2));
      variableOffsets.set(this._variableOffsets.slice(0, copyTo), 0);
      this._variableOffsets = variableOffsets;
    } else if (this._variableOffsets.length >= 2 * length) {
      var variableOffsets = new Int32Array(length);
      variableOffsets.set(this._variableOffsets.slice(0, copyTo), 0);
      this._variableOffsets = variableOffsets;
    }
  }

  /**
   * @param {number} from
   * @param {number} to
   * @param {number} inserted
   */
  _invalidate(from, to, inserted) {
    if (this._heightMode === UI.ListHeightMode.Variable) {
      this._reallocateVariableOffsets(this._items.length + 1, from + 1);
      for (var i = from + 1; i <= this._items.length; i++)
        this._variableOffsets[i] = this._variableOffsets[i - 1] + this._delegate.heightForItem(this._items[i - 1]);
    }

    var viewportHeight = this.element.offsetHeight;
    var totalHeight = this._totalHeight();
    var scrollTop = this.element.scrollTop;

    if (this._renderedHeight < viewportHeight || totalHeight < viewportHeight) {
      this._clearViewport();
      this._updateViewport(Number.constrain(scrollTop, 0, totalHeight - viewportHeight), viewportHeight);
      return;
    }

    var heightDelta = totalHeight - this._renderedHeight;
    if (to <= this._firstIndex) {
      var topHeight = this._topHeight + heightDelta;
      this._topElement.style.height = topHeight + 'px';
      this.element.scrollTop = scrollTop + heightDelta;
      this._topHeight = topHeight;
      this._renderedHeight = totalHeight;
      var indexDelta = inserted - (to - from);
      this._firstIndex += indexDelta;
      this._lastIndex += indexDelta;
      return;
    }

    if (from >= this._lastIndex) {
      var bottomHeight = this._bottomHeight + heightDelta;
      this._bottomElement.style.height = bottomHeight + 'px';
      this._bottomHeight = bottomHeight;
      this._renderedHeight = totalHeight;
      return;
    }

    // TODO(dgozman): try to keep the visible scrollTop the same
    // when invalidating after firstIndex but before first visible element.
    this._clearViewport();
    this._updateViewport(Number.constrain(scrollTop, 0, totalHeight - viewportHeight), viewportHeight);
  }

  _clearViewport() {
    this._firstIndex = 0;
    this._lastIndex = 0;
    this._renderedHeight = 0;
    this._topHeight = 0;
    this._bottomHeight = 0;
    this._topElement.style.height = '0';
    this._bottomElement.style.height = '0';
    this.element.removeChildren();
    this.element.appendChild(this._topElement);
    this.element.appendChild(this._bottomElement);
  }

  _onScroll() {
    this._updateViewport(this.element.scrollTop, this.element.offsetHeight);
  }

  /**
   * @param {number} scrollTop
   * @param {number} viewportHeight
   */
  _updateViewport(scrollTop, viewportHeight) {
    // Note: this method should not force layout. Be careful.

    var totalHeight = this._totalHeight();
    if (!totalHeight) {
      this._firstIndex = 0;
      this._lastIndex = 0;
      this._topHeight = 0;
      this._bottomHeight = 0;
      this._renderedHeight = 0;
      this._topElement.style.height = '0';
      this._bottomElement.style.height = '0';
      return;
    }

    var firstIndex = this._indexAtOffset(scrollTop - viewportHeight);
    var lastIndex = this._indexAtOffset(scrollTop + 2 * viewportHeight) + 1;

    while (this._firstIndex < Math.min(firstIndex, this._lastIndex)) {
      this._elementAtIndex(this._firstIndex).remove();
      this._firstIndex++;
    }
    while (this._lastIndex > Math.max(lastIndex, this._firstIndex)) {
      this._elementAtIndex(this._lastIndex - 1).remove();
      this._lastIndex--;
    }

    this._firstIndex = Math.min(this._firstIndex, lastIndex);
    this._lastIndex = Math.max(this._lastIndex, firstIndex);
    for (var index = this._firstIndex - 1; index >= firstIndex; index--) {
      var element = this._elementAtIndex(index);
      this.element.insertBefore(element, this._topElement.nextSibling);
    }
    for (var index = this._lastIndex; index < lastIndex; index++) {
      var element = this._elementAtIndex(index);
      this.element.insertBefore(element, this._bottomElement);
    }

    this._firstIndex = firstIndex;
    this._lastIndex = lastIndex;
    this._topHeight = this._offsetAtIndex(firstIndex);
    this._topElement.style.height = this._topHeight + 'px';
    this._bottomHeight = totalHeight - this._offsetAtIndex(lastIndex);
    this._bottomElement.style.height = this._bottomHeight + 'px';
    this._renderedHeight = totalHeight;
    this.element.scrollTop = scrollTop;
  }
};

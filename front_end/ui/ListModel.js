// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @template T
 */
UI.ListModel = class extends Common.Object {
  /**
   * @param {!Array<T>=} items
   */
  constructor(items) {
    super();
    this._items = items || [];
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
   * @param {T} item
   * @param {function(T, T):number} comparator
   */
  insertItemWithComparator(item, comparator) {
    var index = this._items.lowerBound(item, comparator);
    this.insertItemAtIndex(index, item);
  }

  /**
   * @param {T} item
   * @return {number}
   */
  indexOfItem(item) {
    return this._items.indexOf(item);
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
   * @param {T} item
   */
  removeItem(item) {
    var index = this._items.indexOf(item);
    if (index === -1) {
      console.error('Attempt to remove non-existing item');
      return;
    }
    this.removeItemAtIndex(index);
  }

  /**
   * @param {!Array<T>} items
   */
  replaceAllItems(items) {
    this.replaceItemsInRange(0, this._items.length, items);
  }

  /**
   * @param {number} index
   * @param {T} item
   */
  replaceItemAtIndex(index, item) {
    this.replaceItemsInRange(index, index + 1, [item]);
  }

  /**
   * @param {function(T):boolean} callback
   * @return {number}
   */
  findIndex(callback) {
    return this._items.findIndex(callback);
  }

  /**
   * @param {number} from
   * @param {number} to
   * @param {!Array<T>} items
   */
  replaceItemsInRange(from, to, items) {
    var removed;
    if (items.length < 10000) {
      removed = this._items.splice(from, to - from, ...items);
    } else {
      removed = this._items.slice(from, to);
      // Splice may fail with too many arguments.
      var before = this._items.slice(0, from);
      var after = this._items.slice(to);
      this._items = [].concat(before, items, after);
    }
    this.dispatchEventToListeners(
        UI.ListModel.Events.ItemsReplaced, {index: from, removed: removed, inserted: items.length});
  }
};

/** @enum {symbol} */
UI.ListModel.Events = {
  ItemsReplaced: Symbol('ItemsReplaced'),
};

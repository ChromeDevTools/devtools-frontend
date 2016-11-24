/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
Sources.UIList = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('sources/uiList.css');

    /** @type {!Array.<!Sources.UIList.Item>} */
    this._items = [];
  }

  /**
   * @param {!Sources.UIList.Item} item
   * @param {?Sources.UIList.Item=} beforeItem
   */
  addItem(item, beforeItem) {
    item[Sources.UIList._Key] = this;
    var beforeElement = beforeItem ? beforeItem.element : null;
    this.contentElement.insertBefore(item.element, beforeElement);

    var index = beforeItem ? this._items.indexOf(beforeItem) : this._items.length;
    console.assert(index >= 0, 'Anchor item not found in UIList');
    this._items.splice(index, 0, item);
  }

  /**
   * @param {!Sources.UIList.Item} item
   */
  removeItem(item) {
    var index = this._items.indexOf(item);
    console.assert(index >= 0);
    this._items.splice(index, 1);
    item.element.remove();
  }

  clear() {
    this.contentElement.removeChildren();
    this._items = [];
  }
};

Sources.UIList._Key = Symbol('ownerList');

/**
 * @unrestricted
 */
Sources.UIList.Item = class {
  /**
   * @param {string} title
   * @param {string} subtitle
   * @param {boolean=} isLabel
   */
  constructor(title, subtitle, isLabel) {
    this.element = createElementWithClass('div', 'list-item');
    if (isLabel)
      this.element.classList.add('label');

    this.titleElement = this.element.createChild('div', 'title');
    this.subtitleElement = this.element.createChild('div', 'subtitle');
    /** @type {?Element} */
    this._actionElement = null;
    this._hidden = false;
    this._isLabel = !!isLabel;
    /** @type {?HTMLElement} */
    this._icon = null;
    this.setTitle(title);
    this.setSubtitle(subtitle);
    this.setSelected(false);
  }

  /**
   * @return {?Sources.UIList.Item}
   */
  nextSibling() {
    var list = this[Sources.UIList._Key];
    var index = list._items.indexOf(this);
    console.assert(index >= 0);
    return list._items[index + 1] || null;
  }

  /**
   * @return {string}
   */
  title() {
    return this._title;
  }

  /**
   * @param {string} x
   */
  setTitle(x) {
    if (this._title === x)
      return;
    this._title = x;
    this.titleElement.textContent = x;
  }

  /**
   * @return {string}
   */
  subtitle() {
    return this._subtitle;
  }

  /**
   * @param {string} x
   */
  setSubtitle(x) {
    if (this._subtitle === x)
      return;
    this._subtitle = x;
    this.subtitleElement.textContent = x;
  }

  /**
   * @return {boolean}
   */
  isSelected() {
    return this._selected;
  }

  /**
   * @param {boolean} x
   */
  setSelected(x) {
    if (x)
      this.select();
    else
      this.deselect();
  }

  select() {
    if (this._selected)
      return;
    this._selected = true;
    this._icon = UI.Icon.create('smallicon-thick-right-arrow', 'selected-icon');
    this.element.appendChild(this._icon);
  }

  deselect() {
    if (!this._selected)
      return;
    this._selected = false;
    this._icon.remove();
    this._icon = null;
  }

  toggleSelected() {
    this.setSelected(!this.isSelected());
  }

  /**
   * @return {boolean}
   */
  isHidden() {
    return this._hidden;
  }

  /**
   * @param {boolean} x
   */
  setHidden(x) {
    if (this._hidden === x)
      return;
    this._hidden = x;
    this.element.classList.toggle('hidden', x);
  }

  /**
   * @return {boolean}
   */
  isLabel() {
    return this._isLabel;
  }

  /**
   * @param {boolean} x
   */
  setDimmed(x) {
    this.element.classList.toggle('dimmed-item', x);
  }

  discard() {
  }

  /**
   * @param {boolean} hoverable
   */
  setHoverable(hoverable) {
    this.element.classList.toggle('ignore-hover', !hoverable);
  }

  /**
   * @param {?string} title
   * @param {?function(!Event):!Promise} handler
   */
  setAction(title, handler) {
    if (this._actionElement)
      this._actionElement.remove();
    if (!title || !handler)
      return;
    this._actionElement = this.element.createChild('div', 'action');
    var link = this._actionElement.createChild('span', 'action-link');
    link.textContent = title;
    link.addEventListener('click', (event) => {
      link.disabled = true;
      handler(event).then(() => link.disabled = false);
      event.stopPropagation();
    });
  }
};

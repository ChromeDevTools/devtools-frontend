// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2007 Apple Inc.  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';

import * as ARIAUtils from './ARIAUtils.js';
import {Icon} from './Icon.js';                            // eslint-disable-line no-unused-vars
import {Config, InplaceEditor} from './InplaceEditor.js';  // eslint-disable-line no-unused-vars
import {Keys} from './KeyboardShortcut.js';
import {Tooltip} from './Tooltip.js';
import {deepElementFromPoint, enclosingNodeOrSelfWithNodeNameInArray, isEditing} from './UIUtils.js';
import {appendStyle} from './utils/append-style.js';
import {createShadowRootWithCoreStyles} from './utils/create-shadow-root-with-core-styles.js';

/** @type {!WeakMap<!Node, !TreeElement>} */
const nodeToParentTreeElementMap = new WeakMap();

export class TreeOutline extends Common.ObjectWrapper.ObjectWrapper {
  constructor() {
    super();
    this._rootElement = this._createRootElement();
    this._renderSelection = false;

    /** @type {?TreeElement} */
    this.selectedTreeElement = null;
    this.expandTreeElementsWhenArrowing = false;
    /** @type {?function(!TreeElement, !TreeElement):number} */
    this._comparator = null;

    this.contentElement = this._rootElement._childrenListNode;
    this.contentElement.addEventListener('keydown', this._treeKeyDown.bind(this), false);

    this._preventTabOrder = false;
    this._showSelectionOnKeyboardFocus = false;
    this._focusable = true;
    this.setFocusable(true);
    /** @type {!HTMLElement} */
    this.element = this.contentElement;
    ARIAUtils.markAsTree(this.element);
    this._useLightSelectionColor = false;
    /** @type {?TreeElement} */
    this._treeElementToScrollIntoView = null;
    this._centerUponScrollIntoView = false;
  }

  /**
   * @param {boolean} show
   * @param {boolean=} preventTabOrder
   */
  setShowSelectionOnKeyboardFocus(show, preventTabOrder) {
    this.contentElement.classList.toggle('hide-selection-when-blurred', show);
    this._preventTabOrder = Boolean(preventTabOrder);
    if (this._focusable) {
      this.contentElement.tabIndex = Boolean(preventTabOrder) ? -1 : 0;
    }
    this._showSelectionOnKeyboardFocus = show;
  }

  /**
   * @return {!TreeElement}
   */
  _createRootElement() {
    const rootElement = new TreeElement();
    rootElement.treeOutline = this;
    rootElement.root = true;
    rootElement.selectable = false;
    rootElement.expanded = true;
    rootElement._childrenListNode.classList.remove('children');
    return rootElement;
  }

  /**
   * @return {!TreeElement}
   */
  rootElement() {
    return this._rootElement;
  }

  /**
   * @return {?TreeElement}
   */
  firstChild() {
    return this._rootElement.firstChild();
  }

  /**
   * @return {?TreeElement}
   */
  _lastDescendent() {
    let last = this._rootElement.lastChild();
    while (last && last.expanded && last.childCount()) {
      last = last.lastChild();
    }
    return last;
  }

  /**
   * @param {!TreeElement} child
   * @param {(function(!TreeElement, !TreeElement):number)=} comparator
   */
  appendChild(child, comparator) {
    this._rootElement.appendChild(child, comparator);
  }

  /**
   * @param {!TreeElement} child
   * @param {number} index
   */
  insertChild(child, index) {
    this._rootElement.insertChild(child, index);
  }

  /**
   * @param {!TreeElement} child
   */
  removeChild(child) {
    this._rootElement.removeChild(child);
  }

  removeChildren() {
    this._rootElement.removeChildren();
  }

  /**
   * @param {number} x
   * @param {number} y
   * @return {?TreeElement}
   */
  treeElementFromPoint(x, y) {
    const node = deepElementFromPoint(this.contentElement.ownerDocument, x, y);
    if (!node) {
      return null;
    }

    const listNode = enclosingNodeOrSelfWithNodeNameInArray(node, ['ol', 'li']);
    if (listNode) {
      return nodeToParentTreeElementMap.get(listNode) || treeElementBylistItemNode.get(listNode) || null;
    }
    return null;
  }

  /**
   * @param {?MouseEvent} event
   * @return {?TreeElement}
   */
  treeElementFromEvent(event) {
    return event ? this.treeElementFromPoint(event.pageX, event.pageY) : null;
  }

  /**
   * @param {?function(!TreeElement, !TreeElement):number} comparator
   */
  setComparator(comparator) {
    this._comparator = comparator;
  }

  /**
   * @param {boolean} focusable
   */
  setFocusable(focusable) {
    this._focusable = focusable;
    this.updateFocusable();
  }

  updateFocusable() {
    if (this._focusable) {
      this.contentElement.tabIndex = (this._preventTabOrder || Boolean(this.selectedTreeElement)) ? -1 : 0;
      if (this.selectedTreeElement) {
        this.selectedTreeElement._setFocusable(true);
      }
    } else {
      this.contentElement.removeAttribute('tabIndex');
      if (this.selectedTreeElement) {
        this.selectedTreeElement._setFocusable(false);
      }
    }
  }

  focus() {
    if (this.selectedTreeElement) {
      this.selectedTreeElement.listItemElement.focus();
    } else {
      this.contentElement.focus();
    }
  }

  useLightSelectionColor() {
    this._useLightSelectionColor = true;
  }

  /**
   * @param {!TreeElement} element
   */
  _bindTreeElement(element) {
    if (element.treeOutline) {
      console.error('Binding element for the second time: ' + new Error().stack);
    }
    element.treeOutline = this;
    element.onbind();
  }

  /**
   * @param {!TreeElement} element
   */
  _unbindTreeElement(element) {
    if (!element.treeOutline) {
      console.error('Unbinding element that was not bound: ' + new Error().stack);
    }

    element.deselect();
    element.onunbind();
    element.treeOutline = null;
  }

  /**
   * @return {boolean}
   */
  selectPrevious() {
    let nextSelectedElement = this.selectedTreeElement && this.selectedTreeElement.traversePreviousTreeElement(true);
    while (nextSelectedElement && !nextSelectedElement.selectable) {
      nextSelectedElement = nextSelectedElement.traversePreviousTreeElement(!this.expandTreeElementsWhenArrowing);
    }
    if (!nextSelectedElement) {
      return false;
    }
    nextSelectedElement.select(false, true);
    return true;
  }

  /**
   * @return {boolean}
   */
  selectNext() {
    let nextSelectedElement = this.selectedTreeElement && this.selectedTreeElement.traverseNextTreeElement(true);
    while (nextSelectedElement && !nextSelectedElement.selectable) {
      nextSelectedElement = nextSelectedElement.traverseNextTreeElement(!this.expandTreeElementsWhenArrowing);
    }
    if (!nextSelectedElement) {
      return false;
    }
    nextSelectedElement.select(false, true);
    return true;
  }

  /**
   * @param {boolean=} omitFocus
   * @param {boolean=} selectedByUser
   */
  forceSelect(omitFocus = false, selectedByUser = true) {
    if (this.selectedTreeElement) {
      this.selectedTreeElement.deselect();
    }
    this._selectFirst(omitFocus, selectedByUser);
  }

  /**
   * @param {boolean=} omitFocus
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  _selectFirst(omitFocus = false, selectedByUser = true) {
    let first = this.firstChild();
    while (first && !first.selectable) {
      first = first.traverseNextTreeElement(true);
    }
    if (!first) {
      return false;
    }
    first.select(omitFocus, selectedByUser);
    return true;
  }

  /**
   * @return {boolean}
   */
  _selectLast() {
    let last = this._lastDescendent();
    while (last && !last.selectable) {
      last = last.traversePreviousTreeElement(true);
    }
    if (!last) {
      return false;
    }
    last.select(false, true);
    return true;
  }

  /**
   * @param {!KeyboardEvent} event
   */
  _treeKeyDown(event) {
    if (event.shiftKey || event.metaKey || event.ctrlKey || isEditing()) {
      return;
    }

    let handled = false;
    if (!this.selectedTreeElement) {
      if (event.key === 'ArrowUp' && !event.altKey) {
        handled = this._selectLast();
      } else if (event.key === 'ArrowDown' && !event.altKey) {
        handled = this._selectFirst();
      }
    } else if (event.key === 'ArrowUp' && !event.altKey) {
      handled = this.selectPrevious();
    } else if (event.key === 'ArrowDown' && !event.altKey) {
      handled = this.selectNext();
    } else if (event.key === 'ArrowLeft') {
      handled = this.selectedTreeElement.collapseOrAscend(event.altKey);
    } else if (event.key === 'ArrowRight') {
      if (!this.selectedTreeElement.revealed()) {
        this.selectedTreeElement.reveal();
        handled = true;
      } else {
        handled = this.selectedTreeElement.descendOrExpand(event.altKey);
      }
    } else if (event.keyCode === 8 /* Backspace */ || event.keyCode === 46 /* Delete */) {
      handled = this.selectedTreeElement.ondelete();
    } else if (event.key === 'Enter') {
      handled = this.selectedTreeElement.onenter();
    } else if (event.keyCode === Keys.Space.code) {
      handled = this.selectedTreeElement.onspace();
    } else if (event.key === 'Home') {
      handled = this._selectFirst();
    } else if (event.key === 'End') {
      handled = this._selectLast();
    }

    if (handled) {
      event.consume(true);
    }
  }

  /**
   * @param {!TreeElement} treeElement
   * @param {boolean} center
   */
  _deferredScrollIntoView(treeElement, center) {
    const deferredScrollIntoView = () => {
      if (!this._treeElementToScrollIntoView) {
        return;
      }
      // This function no longer uses scrollIntoViewIfNeeded because users were bothered
      // by the fact that it always scrolls in both direction even if only one is necessary
      // to bring the item into view.

      const itemRect = this._treeElementToScrollIntoView.listItemElement.getBoundingClientRect();
      const treeRect = this.contentElement.getBoundingClientRect();
      const viewRect = this.element.getBoundingClientRect();

      const currentScrollX = viewRect.left - treeRect.left;
      const currentScrollY = viewRect.top - treeRect.top;

      // Only scroll into view on each axis if the item is not visible at all
      // but if we do scroll and _centerUponScrollIntoView is true
      // then we center the top left corner of the item in view.
      let deltaLeft = itemRect.left - treeRect.left;
      if (deltaLeft > currentScrollX && deltaLeft < currentScrollX + viewRect.width) {
        deltaLeft = currentScrollX;
      } else if (this._centerUponScrollIntoView) {
        deltaLeft = deltaLeft - viewRect.width / 2;
      }
      let deltaTop = itemRect.top - treeRect.top;
      if (deltaTop > currentScrollY && deltaTop < currentScrollY + viewRect.height) {
        deltaTop = currentScrollY;
      } else if (this._centerUponScrollIntoView) {
        deltaTop = deltaTop - viewRect.height / 2;
      }
      this.element.scrollTo(deltaLeft, deltaTop);
      this._treeElementToScrollIntoView = null;
    };

    if (!this._treeElementToScrollIntoView) {
      this.element.window().requestAnimationFrame(deferredScrollIntoView);
    }
    this._treeElementToScrollIntoView = treeElement;
    this._centerUponScrollIntoView = center;
  }

  /**
   * @param {!TreeElement} treeElement
   */
  onStartedEditingTitle(treeElement) {
  }
}

/** @enum {symbol} */
export const Events = {
  ElementAttached: Symbol('ElementAttached'),
  ElementsDetached: Symbol('ElementsDetached'),
  ElementExpanded: Symbol('ElementExpanded'),
  ElementCollapsed: Symbol('ElementCollapsed'),
  ElementSelected: Symbol('ElementSelected')
};

export class TreeOutlineInShadow extends TreeOutline {
  constructor() {
    super();
    this.contentElement.classList.add('tree-outline');

    // Redefine element to the external one.
    this.element = /** @type {!HTMLElement} */ (document.createElement('div'));
    this._shadowRoot = createShadowRootWithCoreStyles(
        this.element, {cssFile: 'ui/treeoutline.css', enableLegacyPatching: true, delegatesFocus: undefined});
    this._disclosureElement = this._shadowRoot.createChild('div', 'tree-outline-disclosure');
    this._disclosureElement.appendChild(this.contentElement);
    this._renderSelection = true;
  }

  /**
   * @param {string} cssFile
   * @param {!{enableLegacyPatching:boolean}} options
   */
  registerRequiredCSS(cssFile, options) {
    appendStyle(this._shadowRoot, cssFile, options);
  }

  hideOverflow() {
    this._disclosureElement.classList.add('tree-outline-disclosure-hide-overflow');
  }

  makeDense() {
    this.contentElement.classList.add('tree-outline-dense');
  }

  /**
   * @param {!TreeElement} treeElement
   * @override
   */
  onStartedEditingTitle(treeElement) {
    const selection = this._shadowRoot.getSelection();
    if (selection) {
      selection.selectAllChildren(treeElement.titleElement);
    }
  }
}

/** @type {!WeakMap<!Node, !TreeElement>} */
export const treeElementBylistItemNode = new WeakMap();
export class TreeElement {
  /**
   * @param {(string|!Node)=} title
   * @param {boolean=} expandable
   */
  constructor(title, expandable) {
    /** @type {?TreeOutline} */
    this.treeOutline = null;
    /** @type {?TreeElement} */
    this.parent = null;
    /** @type {?TreeElement} */
    this.previousSibling = null;
    /** @type {?TreeElement} */
    this.nextSibling = null;
    this._boundOnFocus = this._onFocus.bind(this);
    this._boundOnBlur = this._onBlur.bind(this);

    this._listItemNode = /** @type {!HTMLLIElement} */ (document.createElement('li'));

    /** @type {!Node} */
    this.titleElement = this._listItemNode.createChild('span', 'tree-element-title');
    treeElementBylistItemNode.set(this._listItemNode, this);
    /** @type {string|!Node} */
    this._title = '';
    if (title) {
      this.title = title;
    }
    this._listItemNode.addEventListener(
        'mousedown', /** @type {!EventListener} */ (this._handleMouseDown.bind(this)), false);
    this._listItemNode.addEventListener(
        'click', /** @type {!EventListener} */ (this._treeElementToggled.bind(this)), false);
    this._listItemNode.addEventListener('dblclick', this._handleDoubleClick.bind(this), false);
    ARIAUtils.markAsTreeitem(this._listItemNode);

    /** @type {?Array<!TreeElement>} */
    this._children = null;
    this._childrenListNode = document.createElement('ol');
    nodeToParentTreeElementMap.set(this._childrenListNode, this);
    this._childrenListNode.classList.add('children');
    ARIAUtils.markAsGroup(this._childrenListNode);

    this._hidden = false;
    this._selectable = true;
    this.expanded = false;
    this.selected = false;
    /** @type {boolean} */
    this._expandable;
    this.setExpandable(expandable || false);
    this._collapsible = true;
    this.toggleOnClick = false;
    /** @type {?HTMLButtonElement} */
    this.button = null;
    this.root = false;
    /** @type {string} */
    this._tooltip = '';
    /** @type {?HTMLElement} */
    this._leadingIconsElement = null;
    /** @type {?HTMLElement} */
    this._trailingIconsElement = null;
    /** @type {?HTMLElement} */
    this._selectionElement = null;
  }

  /**
   * @param {!Node} node
   * @return {!TreeElement|undefined}
   */
  static getTreeElementBylistItemNode(node) {
    return treeElementBylistItemNode.get(node);
  }

  /**
   * @param {?TreeElement} ancestor
   * @return {boolean}
   */
  hasAncestor(ancestor) {
    if (!ancestor) {
      return false;
    }

    let currentNode = this.parent;
    while (currentNode) {
      if (ancestor === currentNode) {
        return true;
      }
      currentNode = currentNode.parent;
    }

    return false;
  }

  /**
   * @param {?TreeElement} ancestor
   * @return {boolean}
   */
  hasAncestorOrSelf(ancestor) {
    return this === ancestor || this.hasAncestor(ancestor);
  }

  /**
   * @return {boolean}
   */
  isHidden() {
    if (this.hidden) {
      return true;
    }

    let currentNode = this.parent;
    while (currentNode) {
      if (currentNode.hidden) {
        return true;
      }
      currentNode = currentNode.parent;
    }

    return false;
  }

  /**
   * @return {!Array.<!TreeElement>}
   */
  children() {
    return this._children || [];
  }

  /**
   * @return {number}
   */
  childCount() {
    return this._children ? this._children.length : 0;
  }

  /**
   * @return {?TreeElement}
   */
  firstChild() {
    return this._children ? this._children[0] : null;
  }

  /**
   * @return {?TreeElement}
   */
  lastChild() {
    return this._children ? this._children[this._children.length - 1] : null;
  }

  /**
   * @param {number} index
   * @return {?TreeElement}
   */
  childAt(index) {
    return this._children ? this._children[index] : null;
  }

  /**
   * @param {!TreeElement} child
   * @return {number}
   */
  indexOfChild(child) {
    return this._children ? this._children.indexOf(child) : -1;
  }

  /**
   * @param {!TreeElement} child
   * @param {(function(!TreeElement, !TreeElement):number)=} comparator
   */
  appendChild(child, comparator) {
    if (!this._children) {
      this._children = [];
    }

    let insertionIndex;
    if (comparator) {
      insertionIndex = Platform.ArrayUtilities.lowerBound(this._children, child, comparator);
    } else if (this.treeOutline && this.treeOutline._comparator) {
      insertionIndex = Platform.ArrayUtilities.lowerBound(this._children, child, this.treeOutline._comparator);
    } else {
      insertionIndex = this._children.length;
    }
    this.insertChild(child, insertionIndex);
  }

  /**
   * @param {!TreeElement} child
   * @param {number} index
   */
  insertChild(child, index) {
    if (!this._children) {
      this._children = [];
    }

    if (!child) {
      throw 'child can\'t be undefined or null';
    }

    console.assert(
        !child.parent, 'Attempting to insert a child that is already in the tree, reparenting is not supported.');

    const previousChild = (index > 0 ? this._children[index - 1] : null);
    if (previousChild) {
      previousChild.nextSibling = child;
      child.previousSibling = previousChild;
    } else {
      child.previousSibling = null;
    }

    const nextChild = this._children[index];
    if (nextChild) {
      nextChild.previousSibling = child;
      child.nextSibling = nextChild;
    } else {
      child.nextSibling = null;
    }

    this._children.splice(index, 0, child);

    this.setExpandable(true);
    child.parent = this;

    if (this.treeOutline) {
      this.treeOutline._bindTreeElement(child);
    }
    for (let current = child.firstChild(); this.treeOutline && current;
         current = current.traverseNextTreeElement(false, child, true)) {
      this.treeOutline._bindTreeElement(current);
    }
    child.onattach();
    child._ensureSelection();
    if (this.treeOutline) {
      this.treeOutline.dispatchEventToListeners(Events.ElementAttached, child);
    }
    const nextSibling = child.nextSibling ? child.nextSibling._listItemNode : null;
    this._childrenListNode.insertBefore(child._listItemNode, nextSibling);
    this._childrenListNode.insertBefore(child._childrenListNode, nextSibling);
    if (child.selected) {
      child.select();
    }
    if (child.expanded) {
      child.expand();
    }
  }

  /**
   * @param {number} childIndex
   */
  removeChildAtIndex(childIndex) {
    if (!this._children || childIndex < 0 || childIndex >= this._children.length) {
      throw 'childIndex out of range';
    }

    const child = this._children[childIndex];
    this._children.splice(childIndex, 1);

    const parent = child.parent;
    if (this.treeOutline && this.treeOutline.selectedTreeElement &&
        this.treeOutline.selectedTreeElement.hasAncestorOrSelf(child)) {
      if (child.nextSibling) {
        child.nextSibling.select(true);
      } else if (child.previousSibling) {
        child.previousSibling.select(true);
      } else if (parent) {
        parent.select(true);
      }
    }

    if (child.previousSibling) {
      child.previousSibling.nextSibling = child.nextSibling;
    }
    if (child.nextSibling) {
      child.nextSibling.previousSibling = child.previousSibling;
    }
    child.parent = null;

    if (this.treeOutline) {
      this.treeOutline._unbindTreeElement(child);
    }
    for (let current = child.firstChild(); this.treeOutline && current;
         current = current.traverseNextTreeElement(false, child, true)) {
      this.treeOutline._unbindTreeElement(current);
    }

    child._detach();
    if (this.treeOutline) {
      this.treeOutline.dispatchEventToListeners(Events.ElementsDetached);
    }
  }

  /**
   * @param {!TreeElement} child
   */
  removeChild(child) {
    if (!child) {
      throw 'child can\'t be undefined or null';
    }
    if (child.parent !== this) {
      return;
    }

    const childIndex = this._children ? this._children.indexOf(child) : -1;
    if (childIndex === -1) {
      throw 'child not found in this node\'s children';
    }

    this.removeChildAtIndex(childIndex);
  }

  removeChildren() {
    if (!this.root && this.treeOutline && this.treeOutline.selectedTreeElement &&
        this.treeOutline.selectedTreeElement.hasAncestorOrSelf(this)) {
      this.select(true);
    }

    if (this._children) {
      for (const child of this._children) {
        child.previousSibling = null;
        child.nextSibling = null;
        child.parent = null;

        if (this.treeOutline) {
          this.treeOutline._unbindTreeElement(child);
        }
        for (let current = child.firstChild(); this.treeOutline && current;
             current = current.traverseNextTreeElement(false, child, true)) {
          this.treeOutline._unbindTreeElement(current);
        }
        child._detach();
      }
    }
    this._children = [];
    if (this.treeOutline) {
      this.treeOutline.dispatchEventToListeners(Events.ElementsDetached);
    }
  }

  get selectable() {
    if (this.isHidden()) {
      return false;
    }
    return this._selectable;
  }

  set selectable(x) {
    this._selectable = x;
  }

  get listItemElement() {
    return this._listItemNode;
  }

  get childrenListElement() {
    return this._childrenListNode;
  }

  /**
   * @return {string|!Node}
   */
  get title() {
    return this._title;
  }

  /**
   * @param {string|!Node} x
   */
  set title(x) {
    if (this._title === x) {
      return;
    }
    this._title = x;

    if (typeof x === 'string') {
      this.titleElement.textContent = x;
      this.tooltip = x;
    } else {
      this.titleElement = x;
      this.tooltip = '';
    }

    this._listItemNode.removeChildren();
    if (this._leadingIconsElement) {
      this._listItemNode.appendChild(this._leadingIconsElement);
    }
    this._listItemNode.appendChild(this.titleElement);
    if (this._trailingIconsElement) {
      this._listItemNode.appendChild(this._trailingIconsElement);
    }
    this._ensureSelection();
  }

  /**
   * @return {string}
   */
  titleAsText() {
    if (!this._title) {
      return '';
    }
    if (typeof this._title === 'string') {
      return this._title;
    }
    return this._title.textContent || '';
  }

  /**
   * @param {!Config<*>} editingConfig
   */
  startEditingTitle(editingConfig) {
    InplaceEditor.startEditing(/** @type {!Element} */ (this.titleElement), editingConfig);
    if (this.treeOutline) {
      this.treeOutline.onStartedEditingTitle(this);
    }
  }

  /**
   * @param {!Array<!Icon>} icons
   */
  setLeadingIcons(icons) {
    if (!this._leadingIconsElement && !icons.length) {
      return;
    }
    if (!this._leadingIconsElement) {
      this._leadingIconsElement = /** @type {!HTMLElement} */ (document.createElement('div'));
      this._leadingIconsElement.classList.add('leading-icons');
      this._leadingIconsElement.classList.add('icons-container');
      this._listItemNode.insertBefore(this._leadingIconsElement, this.titleElement);
      this._ensureSelection();
    }
    this._leadingIconsElement.removeChildren();
    for (const icon of icons) {
      this._leadingIconsElement.appendChild(icon);
    }
  }

  /**
   * @param {!Array<!Icon>} icons
   */
  setTrailingIcons(icons) {
    if (!this._trailingIconsElement && !icons.length) {
      return;
    }
    if (!this._trailingIconsElement) {
      this._trailingIconsElement = /** @type {!HTMLElement} */ (document.createElement('div'));
      this._trailingIconsElement.classList.add('trailing-icons');
      this._trailingIconsElement.classList.add('icons-container');
      this._listItemNode.appendChild(this._trailingIconsElement);
      this._ensureSelection();
    }
    this._trailingIconsElement.removeChildren();
    for (const icon of icons) {
      this._trailingIconsElement.appendChild(icon);
    }
  }


  /**
   * @return {string}
   */
  get tooltip() {
    return this._tooltip;
  }

  /**
   * @param {string} x
   */
  set tooltip(x) {
    if (this._tooltip === x) {
      return;
    }
    this._tooltip = x;
    Tooltip.install(this._listItemNode, x);
  }

  /**
   * @return {boolean}
   */
  isExpandable() {
    return this._expandable;
  }

  /**
   * @param {boolean} expandable
   */
  setExpandable(expandable) {
    if (this._expandable === expandable) {
      return;
    }

    this._expandable = expandable;

    this._listItemNode.classList.toggle('parent', expandable);
    if (!expandable) {
      this.collapse();
      ARIAUtils.unsetExpandable(this._listItemNode);
    } else {
      ARIAUtils.setExpanded(this._listItemNode, false);
    }
  }

  /**
   * @param {boolean} collapsible
   */
  setCollapsible(collapsible) {
    if (this._collapsible === collapsible) {
      return;
    }

    this._collapsible = collapsible;

    this._listItemNode.classList.toggle('always-parent', !collapsible);
    if (!collapsible) {
      this.expand();
    }
  }

  get hidden() {
    return this._hidden;
  }

  set hidden(x) {
    if (this._hidden === x) {
      return;
    }

    this._hidden = x;

    this._listItemNode.classList.toggle('hidden', x);
    this._childrenListNode.classList.toggle('hidden', x);

    if (x && this.treeOutline && this.treeOutline.selectedTreeElement &&
        this.treeOutline.selectedTreeElement.hasAncestorOrSelf(this)) {
      const hadFocus = this.treeOutline.selectedTreeElement.listItemElement.hasFocus();
      this.treeOutline.forceSelect(!hadFocus, /* selectedByUser */ false);
    }
  }

  invalidateChildren() {
    if (this._children) {
      this.removeChildren();
      this._children = null;
    }
  }


  _ensureSelection() {
    if (!this.treeOutline || !this.treeOutline._renderSelection) {
      return;
    }
    if (!this._selectionElement) {
      this._selectionElement = /** @type {!HTMLElement} */ (document.createElement('div'));
      this._selectionElement.classList.add('selection');
      this._selectionElement.classList.add('fill');
    }
    this._listItemNode.insertBefore(this._selectionElement, this.listItemElement.firstChild);
  }

  /**
   * @param {!MouseEvent} event
   */
  _treeElementToggled(event) {
    const element = /** @type {?Node} */ (event.currentTarget);
    if (!element || treeElementBylistItemNode.get(element) !== this || element.hasSelection()) {
      return;
    }

    console.assert(Boolean(this.treeOutline));
    const showSelectionOnKeyboardFocus = this.treeOutline ? this.treeOutline._showSelectionOnKeyboardFocus : false;
    const toggleOnClick = this.toggleOnClick && (showSelectionOnKeyboardFocus || !this.selectable);
    const isInTriangle = this.isEventWithinDisclosureTriangle(event);
    if (!toggleOnClick && !isInTriangle) {
      return;
    }

    if (this.expanded) {
      if (event.altKey) {
        this.collapseRecursively();
      } else {
        this.collapse();
      }
    } else {
      if (event.altKey) {
        this.expandRecursively();
      } else {
        this.expand();
      }
    }
    event.consume();
  }

  /**
   * @param {!MouseEvent} event
   */
  _handleMouseDown(event) {
    const element = /** @type {?Node}*/ (event.currentTarget);
    if (!element) {
      return;
    }
    if (!this.selectable) {
      return;
    }
    if (treeElementBylistItemNode.get(element) !== this) {
      return;
    }

    if (this.isEventWithinDisclosureTriangle(event)) {
      return;
    }

    this.selectOnMouseDown(event);
  }

  /**
   * @param {!Event} event
   */
  _handleDoubleClick(event) {
    const element = /** @type {?Node} */ (event.currentTarget);
    if (!element || treeElementBylistItemNode.get(element) !== this) {
      return;
    }

    const handled = this.ondblclick(event);
    if (handled) {
      return;
    }
    if (this._expandable && !this.expanded) {
      this.expand();
    }
  }

  _detach() {
    this._listItemNode.remove();
    this._childrenListNode.remove();
  }

  collapse() {
    if (!this.expanded || !this._collapsible) {
      return;
    }
    this._listItemNode.classList.remove('expanded');
    this._childrenListNode.classList.remove('expanded');
    ARIAUtils.setExpanded(this._listItemNode, false);
    this.expanded = false;
    this.oncollapse();
    if (this.treeOutline) {
      this.treeOutline.dispatchEventToListeners(Events.ElementCollapsed, this);
    }

    const selectedTreeElement = this.treeOutline && this.treeOutline.selectedTreeElement;
    if (selectedTreeElement && selectedTreeElement.hasAncestor(this)) {
      this.select(/* omitFocus */ true, /* selectedByUser */ true);
    }
  }

  collapseRecursively() {
    /** @type {?TreeElement} */
    let item = this;
    while (item) {
      if (item.expanded) {
        item.collapse();
      }
      item = item.traverseNextTreeElement(false, this, true);
    }
  }

  collapseChildren() {
    if (!this._children) {
      return;
    }
    for (const child of this._children) {
      child.collapseRecursively();
    }
  }

  expand() {
    if (!this._expandable || (this.expanded && this._children)) {
      return;
    }

    // Set this before onpopulate. Since onpopulate can add elements, this makes
    // sure the expanded flag is true before calling those functions. This prevents the possibility
    // of an infinite loop if onpopulate were to call expand.

    this.expanded = true;

    this._populateIfNeeded();
    this._listItemNode.classList.add('expanded');
    this._childrenListNode.classList.add('expanded');
    ARIAUtils.setExpanded(this._listItemNode, true);

    if (this.treeOutline) {
      this.onexpand();
      this.treeOutline.dispatchEventToListeners(Events.ElementExpanded, this);
    }
  }

  /**
   * @param {number=} maxDepth
   * @returns {!Promise<void>}
   */
  async expandRecursively(maxDepth) {
    /** @type {?TreeElement} */
    let item = this;
    const info = {depthChange: 0};
    let depth = 0;

    // The Inspector uses TreeOutlines to represents object properties, so recursive expansion
    // in some case can be infinite, since JavaScript objects can hold circular references.
    // So default to a recursion cap of 3 levels, since that gives fairly good results.
    if (maxDepth === undefined || isNaN(maxDepth)) {
      maxDepth = 3;
    }

    while (item) {
      await item._populateIfNeeded();

      if (depth < maxDepth) {
        item.expand();
      }

      item = item.traverseNextTreeElement(false, this, (depth >= maxDepth), info);
      depth += info.depthChange;
    }
  }

  /**
   * @param {boolean} altKey
   * @return {boolean}
   */
  collapseOrAscend(altKey) {
    if (this.expanded && this._collapsible) {
      if (altKey) {
        this.collapseRecursively();
      } else {
        this.collapse();
      }
      return true;
    }

    if (!this.parent || this.parent.root) {
      return false;
    }

    if (!this.parent.selectable) {
      this.parent.collapse();
      return true;
    }

    /** @type {?TreeElement} */
    let nextSelectedElement = this.parent;
    while (nextSelectedElement && !nextSelectedElement.selectable) {
      nextSelectedElement = nextSelectedElement.parent;
    }

    if (!nextSelectedElement) {
      return false;
    }
    nextSelectedElement.select(false, true);
    return true;
  }

  /**
   * @param {boolean} altKey
   * @return {boolean}
   */
  descendOrExpand(altKey) {
    if (!this._expandable) {
      return false;
    }

    if (!this.expanded) {
      if (altKey) {
        this.expandRecursively();
      } else {
        this.expand();
      }
      return true;
    }

    let nextSelectedElement = this.firstChild();
    while (nextSelectedElement && !nextSelectedElement.selectable) {
      nextSelectedElement = nextSelectedElement.nextSibling;
    }

    if (!nextSelectedElement) {
      return false;
    }
    nextSelectedElement.select(false, true);
    return true;
  }

  /**
   * @param {boolean=} center
   */
  reveal(center) {
    let currentAncestor = this.parent;
    while (currentAncestor && !currentAncestor.root) {
      if (!currentAncestor.expanded) {
        currentAncestor.expand();
      }
      currentAncestor = currentAncestor.parent;
    }

    if (this.treeOutline) {
      this.treeOutline._deferredScrollIntoView(this, Boolean(center));
    }
  }

  /**
   * @return {boolean}
   */
  revealed() {
    let currentAncestor = this.parent;
    while (currentAncestor && !currentAncestor.root) {
      if (!currentAncestor.expanded) {
        return false;
      }
      currentAncestor = currentAncestor.parent;
    }

    return true;
  }

  /**
   * @param {!MouseEvent} event
   */
  selectOnMouseDown(event) {
    if (this.select(false, true)) {
      event.consume(true);
    }

    if (this._listItemNode.draggable && this._selectionElement && this.treeOutline) {
      const marginLeft =
          this.treeOutline.element.getBoundingClientRect().left - this._listItemNode.getBoundingClientRect().left;
      // By default the left margin extends far off screen. This is not a problem except when dragging an element.
      // Setting the margin once here should be fine, because we believe the left margin should never change.
      this._selectionElement.style.setProperty('margin-left', marginLeft + 'px');
    }
  }

  /**
   * @param {boolean=} omitFocus
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  select(omitFocus, selectedByUser) {
    if (!this.treeOutline || !this.selectable || this.selected) {
      if (!omitFocus) {
        this.listItemElement.focus();
      }
      return false;
    }
    // Wait to deselect this element so that focus only changes once
    const lastSelected = this.treeOutline.selectedTreeElement;
    this.treeOutline.selectedTreeElement = null;

    if (this.treeOutline._rootElement === this) {
      if (lastSelected) {
        lastSelected.deselect();
      }
      if (!omitFocus) {
        this.listItemElement.focus();
      }
      return false;
    }

    this.selected = true;

    this.treeOutline.selectedTreeElement = this;
    this.treeOutline.updateFocusable();
    if (!omitFocus || this.treeOutline.contentElement.hasFocus()) {
      this.listItemElement.focus();
    }

    this._listItemNode.classList.add('selected');
    ARIAUtils.setSelected(this._listItemNode, true);
    this.treeOutline.dispatchEventToListeners(Events.ElementSelected, this);
    if (lastSelected) {
      lastSelected.deselect();
    }
    return this.onselect(selectedByUser);
  }

  /**
   * @param {boolean} focusable
   */
  _setFocusable(focusable) {
    if (focusable) {
      this._listItemNode.setAttribute('tabIndex', (this.treeOutline && this.treeOutline._preventTabOrder) ? '-1' : '0');
      this._listItemNode.addEventListener('focus', this._boundOnFocus, false);
      this._listItemNode.addEventListener('blur', this._boundOnBlur, false);
    } else {
      this._listItemNode.removeAttribute('tabIndex');
      this._listItemNode.removeEventListener('focus', this._boundOnFocus, false);
      this._listItemNode.removeEventListener('blur', this._boundOnBlur, false);
    }
  }

  _onFocus() {
    if (!this.treeOutline || this.treeOutline._useLightSelectionColor) {
      return;
    }
    if (!this.treeOutline.contentElement.classList.contains('hide-selection-when-blurred')) {
      this._listItemNode.classList.add('force-white-icons');
    }
  }

  _onBlur() {
    if (!this.treeOutline || this.treeOutline._useLightSelectionColor) {
      return;
    }
    if (!this.treeOutline.contentElement.classList.contains('hide-selection-when-blurred')) {
      this._listItemNode.classList.remove('force-white-icons');
    }
  }

  /**
   * @param {boolean=} omitFocus
   */
  revealAndSelect(omitFocus) {
    this.reveal(true);
    this.select(omitFocus);
  }

  deselect() {
    const hadFocus = this._listItemNode.hasFocus();
    this.selected = false;
    this._listItemNode.classList.remove('selected');
    ARIAUtils.clearSelected(this._listItemNode);
    this._setFocusable(false);

    if (this.treeOutline && this.treeOutline.selectedTreeElement === this) {
      this.treeOutline.selectedTreeElement = null;
      this.treeOutline.updateFocusable();
      if (hadFocus) {
        this.treeOutline.focus();
      }
    }
  }

  /**
   * @returns {!Promise<void>}
   */
  async _populateIfNeeded() {
    if (this.treeOutline && this._expandable && !this._children) {
      this._children = [];
      await this.onpopulate();
    }
  }

  /**
   * @return {!Promise<void>}
   */
  async onpopulate() {
    // Overridden by subclasses.
  }

  /**
   * @return {boolean}
   */
  onenter() {
    return false;
  }

  /**
   * @return {boolean}
   */
  ondelete() {
    return false;
  }

  /**
   * @return {boolean}
   */
  onspace() {
    return false;
  }

  onbind() {
  }

  onunbind() {
  }

  onattach() {
  }

  onexpand() {
  }

  oncollapse() {
  }

  /**
   * @param {!Event} e
   * @return {boolean}
   */
  ondblclick(e) {
    return false;
  }

  /**
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    return false;
  }

  /**
   * @param {boolean} skipUnrevealed
   * @param {?TreeElement=} stayWithin
   * @param {boolean=} dontPopulate
   * @param {!{depthChange:number}=} info
   * @return {?TreeElement}
   */
  traverseNextTreeElement(skipUnrevealed, stayWithin, dontPopulate, info) {
    if (!dontPopulate) {
      this._populateIfNeeded();
    }

    if (info) {
      info.depthChange = 0;
    }

    let element = skipUnrevealed ? (this.revealed() ? this.firstChild() : null) : this.firstChild();
    if (element && (!skipUnrevealed || (skipUnrevealed && this.expanded))) {
      if (info) {
        info.depthChange = 1;
      }
      return element;
    }

    if (this === stayWithin) {
      return null;
    }

    element = skipUnrevealed ? (this.revealed() ? this.nextSibling : null) : this.nextSibling;
    if (element) {
      return element;
    }

    element = this;
    while (element && !element.root &&
           !(skipUnrevealed ? (element.revealed() ? element.nextSibling : null) : element.nextSibling) &&
           element.parent !== stayWithin) {
      if (info) {
        info.depthChange -= 1;
      }
      element = element.parent;
    }

    if (!element || element.root) {
      return null;
    }

    return (skipUnrevealed ? (element.revealed() ? element.nextSibling : null) : element.nextSibling);
  }

  /**
   * @param {boolean} skipUnrevealed
   * @param {boolean=} dontPopulate
   * @return {?TreeElement}
   */
  traversePreviousTreeElement(skipUnrevealed, dontPopulate) {
    let element = skipUnrevealed ? (this.revealed() ? this.previousSibling : null) : this.previousSibling;
    if (!dontPopulate && element) {
      element._populateIfNeeded();
    }

    while (element &&
           (skipUnrevealed ? (element.revealed() && element.expanded ? element.lastChild() : null) :
                             element.lastChild())) {
      if (!dontPopulate) {
        element._populateIfNeeded();
      }
      element =
          (skipUnrevealed ? (element.revealed() && element.expanded ? element.lastChild() : null) :
                            element.lastChild());
    }

    if (element) {
      return element;
    }

    if (!this.parent || this.parent.root) {
      return null;
    }

    return this.parent;
  }

  /**
   * @param {!MouseEvent} event
   * @return {boolean}
   */
  isEventWithinDisclosureTriangle(event) {
    const arrowToggleWidth = 10;
    // FIXME: We should not use getComputedStyle(). For that we need to get rid of using ::before for disclosure triangle. (http://webk.it/74446)
    const paddingLeftValue = window.getComputedStyle(this._listItemNode).paddingLeft;
    console.assert(paddingLeftValue.endsWith('px'));
    const computedLeftPadding = parseFloat(paddingLeftValue);
    const left = this._listItemNode.totalOffsetLeft() + computedLeftPadding;
    return event.pageX >= left && event.pageX <= left + arrowToggleWidth && this._expandable;
  }
}

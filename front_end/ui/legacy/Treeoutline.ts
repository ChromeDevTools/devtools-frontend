// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import type * as IconButton from '../components/icon_button/icon_button.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import * as ARIAUtils from './ARIAUtils.js';
import {type Config, InplaceEditor} from './InplaceEditor.js';
import {Keys} from './KeyboardShortcut.js';
import * as ThemeSupport from './theme_support/theme_support.js';
import {Tooltip} from './Tooltip.js';
import treeoutlineStyles from './treeoutline.css.legacy.js';
import {deepElementFromPoint, enclosingNodeOrSelfWithNodeNameInArray, isEditing} from './UIUtils.js';
import * as Utils from './utils/utils.js';

const nodeToParentTreeElementMap = new WeakMap<Node, TreeElement>();

export enum Events {
  ElementAttached = 'ElementAttached',
  ElementsDetached = 'ElementsDetached',
  ElementExpanded = 'ElementExpanded',
  ElementCollapsed = 'ElementCollapsed',
  ElementSelected = 'ElementSelected',
}

export type EventTypes = {
  [Events.ElementAttached]: TreeElement,
  [Events.ElementsDetached]: void,
  [Events.ElementExpanded]: TreeElement,
  [Events.ElementCollapsed]: TreeElement,
  [Events.ElementSelected]: TreeElement,
};

export class TreeOutline extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  readonly rootElementInternal: TreeElement;
  renderSelection: boolean;
  selectedTreeElement: TreeElement|null;
  expandTreeElementsWhenArrowing: boolean;
  comparator: ((arg0: TreeElement, arg1: TreeElement) => number)|null;
  contentElement: HTMLOListElement;
  preventTabOrder: boolean;
  showSelectionOnKeyboardFocus: boolean;
  private focusable: boolean;
  element: HTMLElement;
  private useLightSelectionColor: boolean;
  private treeElementToScrollIntoView: TreeElement|null;
  private centerUponScrollIntoView: boolean;

  constructor() {
    super();
    this.rootElementInternal = this.createRootElement();
    this.renderSelection = false;

    this.selectedTreeElement = null;
    this.expandTreeElementsWhenArrowing = false;
    this.comparator = null;

    this.contentElement = this.rootElementInternal.childrenListNode;
    this.contentElement.addEventListener('keydown', this.treeKeyDown.bind(this), false);

    this.preventTabOrder = false;
    this.showSelectionOnKeyboardFocus = false;
    this.focusable = true;
    this.setFocusable(true);
    this.element = this.contentElement;
    this.element.setAttribute('jslog', `${VisualLogging.tree()}`);
    ARIAUtils.markAsTree(this.element);
    this.useLightSelectionColor = false;
    this.treeElementToScrollIntoView = null;
    this.centerUponScrollIntoView = false;
  }

  setShowSelectionOnKeyboardFocus(show: boolean, preventTabOrder?: boolean): void {
    this.contentElement.classList.toggle('hide-selection-when-blurred', show);
    this.preventTabOrder = Boolean(preventTabOrder);
    if (this.focusable) {
      this.contentElement.tabIndex = Boolean(preventTabOrder) ? -1 : 0;
    }
    this.showSelectionOnKeyboardFocus = show;
  }

  private createRootElement(): TreeElement {
    const rootElement = new TreeElement();
    rootElement.treeOutline = this;
    rootElement.root = true;
    rootElement.selectable = false;
    rootElement.expanded = true;
    rootElement.childrenListNode.classList.remove('children');
    return rootElement;
  }

  rootElement(): TreeElement {
    return this.rootElementInternal;
  }

  firstChild(): TreeElement|null {
    return this.rootElementInternal.firstChild();
  }

  private lastDescendent(): TreeElement|null {
    let last = this.rootElementInternal.lastChild();
    while (last && last.expanded && last.childCount()) {
      last = last.lastChild();
    }
    return last;
  }

  appendChild(child: TreeElement, comparator?: ((arg0: TreeElement, arg1: TreeElement) => number)): void {
    this.rootElementInternal.appendChild(child, comparator);
  }

  insertChild(child: TreeElement, index: number): void {
    this.rootElementInternal.insertChild(child, index);
  }

  removeChild(child: TreeElement): void {
    this.rootElementInternal.removeChild(child);
  }

  removeChildren(): void {
    this.rootElementInternal.removeChildren();
  }

  treeElementFromPoint(x: number, y: number): TreeElement|null {
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

  treeElementFromEvent(event: MouseEvent|null): TreeElement|null {
    return event ? this.treeElementFromPoint(event.pageX, event.pageY) : null;
  }

  setComparator(comparator: ((arg0: TreeElement, arg1: TreeElement) => number)|null): void {
    this.comparator = comparator;
  }

  setFocusable(focusable: boolean): void {
    this.focusable = focusable;
    this.updateFocusable();
  }

  updateFocusable(): void {
    if (this.focusable) {
      this.contentElement.tabIndex = (this.preventTabOrder || Boolean(this.selectedTreeElement)) ? -1 : 0;
      if (this.selectedTreeElement) {
        this.selectedTreeElement.setFocusable(true);
      }
    } else {
      this.contentElement.removeAttribute('tabIndex');
      if (this.selectedTreeElement) {
        this.selectedTreeElement.setFocusable(false);
      }
    }
  }

  focus(): void {
    if (this.selectedTreeElement) {
      this.selectedTreeElement.listItemElement.focus();
    } else {
      this.contentElement.focus();
    }
  }

  setUseLightSelectionColor(flag: boolean): void {
    this.useLightSelectionColor = flag;
  }

  getUseLightSelectionColor(): boolean {
    return this.useLightSelectionColor;
  }

  bindTreeElement(element: TreeElement): void {
    if (element.treeOutline) {
      console.error('Binding element for the second time: ' + new Error().stack);
    }
    element.treeOutline = this;
    element.onbind();
  }

  unbindTreeElement(element: TreeElement): void {
    if (!element.treeOutline) {
      console.error('Unbinding element that was not bound: ' + new Error().stack);
    }

    element.deselect();
    element.onunbind();
    element.treeOutline = null;
  }

  selectPrevious(): boolean {
    let nextSelectedElement: (TreeElement|null) =
        this.selectedTreeElement && this.selectedTreeElement.traversePreviousTreeElement(true);
    while (nextSelectedElement && !nextSelectedElement.selectable) {
      nextSelectedElement = nextSelectedElement.traversePreviousTreeElement(!this.expandTreeElementsWhenArrowing);
    }
    if (!nextSelectedElement) {
      return false;
    }
    nextSelectedElement.select(false, true);
    return true;
  }

  selectNext(): boolean {
    let nextSelectedElement: (TreeElement|null) =
        this.selectedTreeElement && this.selectedTreeElement.traverseNextTreeElement(true);
    while (nextSelectedElement && !nextSelectedElement.selectable) {
      nextSelectedElement = nextSelectedElement.traverseNextTreeElement(!this.expandTreeElementsWhenArrowing);
    }
    if (!nextSelectedElement) {
      return false;
    }
    nextSelectedElement.select(false, true);
    return true;
  }

  forceSelect(omitFocus: boolean|undefined = false, selectedByUser: boolean|undefined = true): void {
    if (this.selectedTreeElement) {
      this.selectedTreeElement.deselect();
    }
    this.selectFirst(omitFocus, selectedByUser);
  }

  private selectFirst(omitFocus: boolean|undefined = false, selectedByUser: boolean|undefined = true): boolean {
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

  private selectLast(): boolean {
    let last = this.lastDescendent();
    while (last && !last.selectable) {
      last = last.traversePreviousTreeElement(true);
    }
    if (!last) {
      return false;
    }
    last.select(false, true);
    return true;
  }

  private treeKeyDown(event: KeyboardEvent): void {
    if (event.shiftKey || event.metaKey || event.ctrlKey || isEditing()) {
      return;
    }

    let handled = false;
    if (!this.selectedTreeElement) {
      if (event.key === 'ArrowUp' && !event.altKey) {
        handled = this.selectLast();
      } else if (event.key === 'ArrowDown' && !event.altKey) {
        handled = this.selectFirst();
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
      handled = this.selectFirst();
    } else if (event.key === 'End') {
      handled = this.selectLast();
    }

    if (handled) {
      event.consume(true);
    }
  }

  deferredScrollIntoView(treeElement: TreeElement, center: boolean): void {
    const deferredScrollIntoView = (): void => {
      if (!this.treeElementToScrollIntoView) {
        return;
      }

      // This function doesn't use scrollIntoViewIfNeeded because it always
      // scrolls in both directions even if only one is necessary to bring the
      // item into view.
      const itemRect = this.treeElementToScrollIntoView.listItemElement.getBoundingClientRect();
      const treeRect = this.contentElement.getBoundingClientRect();

      // Usually, this.element is the tree container that scrolls. But sometimes
      // (i.e. in the Elements panel), its parent is.
      let scrollParentElement: HTMLElement = this.element;
      while (getComputedStyle(scrollParentElement).overflow === 'visible' && scrollParentElement.parentElement) {
        scrollParentElement = scrollParentElement.parentElement;
      }

      const viewRect = scrollParentElement.getBoundingClientRect();

      const currentScrollX = viewRect.left - treeRect.left;
      const currentScrollY = viewRect.top - treeRect.top + this.contentElement.offsetTop;

      // Only scroll into view on each axis if the item is not visible at all
      // but if we do scroll and centerUponScrollIntoView is true
      // then we center the top left corner of the item in view.
      let deltaLeft: number = itemRect.left - treeRect.left;
      if (deltaLeft > currentScrollX && deltaLeft < currentScrollX + viewRect.width) {
        deltaLeft = currentScrollX;
      } else if (this.centerUponScrollIntoView) {
        deltaLeft = deltaLeft - viewRect.width / 2;
      }
      let deltaTop: number = itemRect.top - treeRect.top;
      if (deltaTop > currentScrollY && deltaTop < currentScrollY + viewRect.height) {
        deltaTop = currentScrollY;
      } else if (this.centerUponScrollIntoView) {
        deltaTop = deltaTop - viewRect.height / 2;
      }
      scrollParentElement.scrollTo(deltaLeft, deltaTop);
      this.treeElementToScrollIntoView = null;
    };

    if (!this.treeElementToScrollIntoView) {
      this.element.window().requestAnimationFrame(deferredScrollIntoView);
    }
    this.treeElementToScrollIntoView = treeElement;
    this.centerUponScrollIntoView = center;
  }

  onStartedEditingTitle(_treeElement: TreeElement): void {
  }
}

export class TreeOutlineInShadow extends TreeOutline {
  override element: HTMLElement;
  shadowRoot: ShadowRoot;
  private readonly disclosureElement: Element;
  override renderSelection: boolean;
  constructor() {
    super();
    this.contentElement.classList.add('tree-outline');
    this.element = document.createElement('div');
    this.shadowRoot =
        Utils.createShadowRootWithCoreStyles(this.element, {cssFile: treeoutlineStyles, delegatesFocus: undefined});
    this.disclosureElement = this.shadowRoot.createChild('div', 'tree-outline-disclosure');
    this.disclosureElement.appendChild(this.contentElement);
    this.renderSelection = true;
  }

  registerRequiredCSS(cssFile: {cssContent: string}): void {
    ThemeSupport.ThemeSupport.instance().appendStyle(this.shadowRoot, cssFile);
  }

  registerCSSFiles(cssFiles: CSSStyleSheet[]): void {
    this.shadowRoot.adoptedStyleSheets = this.shadowRoot.adoptedStyleSheets.concat(cssFiles);
  }

  hideOverflow(): void {
    this.disclosureElement.classList.add('tree-outline-disclosure-hide-overflow');
  }

  makeDense(): void {
    this.contentElement.classList.add('tree-outline-dense');
  }

  override onStartedEditingTitle(treeElement: TreeElement): void {
    const selection = this.shadowRoot.getSelection();
    if (selection) {
      selection.selectAllChildren(treeElement.titleElement);
    }
  }
}

export const treeElementBylistItemNode = new WeakMap<Node, TreeElement>();
export class TreeElement {
  treeOutline: TreeOutline|null;
  parent: TreeElement|null;
  previousSibling: TreeElement|null;
  nextSibling: TreeElement|null;
  private readonly boundOnFocus: () => void;
  private readonly boundOnBlur: () => void;
  readonly listItemNode: HTMLLIElement;
  titleElement: Node;
  titleInternal: string|Node;
  private childrenInternal: TreeElement[]|null;
  childrenListNode: HTMLOListElement;
  private expandLoggable = {};
  private hiddenInternal: boolean;
  private selectableInternal: boolean;
  expanded: boolean;
  selected: boolean;
  private expandable!: boolean;
  #expandRecursively: boolean = true;
  private collapsible: boolean;
  toggleOnClick: boolean;
  button: HTMLButtonElement|null;
  root: boolean;
  private tooltipInternal: string;
  private leadingIconsElement: HTMLElement|null;
  private trailingIconsElement: HTMLElement|null;
  protected selectionElementInternal: HTMLElement|null;
  private disableSelectFocus: boolean;
  constructor(title?: string|Node, expandable?: boolean, jslogContext?: string|number) {
    this.treeOutline = null;
    this.parent = null;
    this.previousSibling = null;
    this.nextSibling = null;
    this.boundOnFocus = this.onFocus.bind(this);
    this.boundOnBlur = this.onBlur.bind(this);
    this.listItemNode = document.createElement('li');

    this.titleElement = this.listItemNode.createChild('span', 'tree-element-title');
    treeElementBylistItemNode.set(this.listItemNode, this);
    this.titleInternal = '';
    if (title) {
      this.title = title;
    }
    this.listItemNode.addEventListener('mousedown', (this.handleMouseDown.bind(this) as EventListener), false);
    this.listItemNode.addEventListener('click', (this.treeElementToggled.bind(this) as EventListener), false);
    this.listItemNode.addEventListener('dblclick', this.handleDoubleClick.bind(this), false);
    this.listItemNode.setAttribute(
        'jslog', `${VisualLogging.treeItem().parent('parentTreeItem').context(jslogContext)}`);
    ARIAUtils.markAsTreeitem(this.listItemNode);

    this.childrenInternal = null;
    this.childrenListNode = document.createElement('ol');
    nodeToParentTreeElementMap.set(this.childrenListNode, this);
    this.childrenListNode.classList.add('children');
    ARIAUtils.markAsGroup(this.childrenListNode);

    this.hiddenInternal = false;
    this.selectableInternal = true;
    this.expanded = false;
    this.selected = false;
    this.setExpandable(expandable || false);
    this.collapsible = true;
    this.toggleOnClick = false;
    this.button = null;
    this.root = false;
    this.tooltipInternal = '';
    this.leadingIconsElement = null;
    this.trailingIconsElement = null;
    this.selectionElementInternal = null;
    this.disableSelectFocus = false;
  }

  static getTreeElementBylistItemNode(node: Node): TreeElement|undefined {
    return treeElementBylistItemNode.get(node);
  }

  hasAncestor(ancestor: TreeElement|null): boolean {
    if (!ancestor) {
      return false;
    }

    let currentNode: (TreeElement|null) = this.parent;
    while (currentNode) {
      if (ancestor === currentNode) {
        return true;
      }
      currentNode = currentNode.parent;
    }

    return false;
  }

  hasAncestorOrSelf(ancestor: TreeElement|null): boolean {
    return this === ancestor || this.hasAncestor(ancestor);
  }

  isHidden(): boolean {
    if (this.hidden) {
      return true;
    }

    let currentNode: (TreeElement|null) = this.parent;
    while (currentNode) {
      if (currentNode.hidden) {
        return true;
      }
      currentNode = currentNode.parent;
    }

    return false;
  }

  children(): TreeElement[] {
    return this.childrenInternal || [];
  }

  childCount(): number {
    return this.childrenInternal ? this.childrenInternal.length : 0;
  }

  firstChild(): TreeElement|null {
    return this.childrenInternal ? this.childrenInternal[0] : null;
  }

  lastChild(): TreeElement|null {
    return this.childrenInternal ? this.childrenInternal[this.childrenInternal.length - 1] : null;
  }

  childAt(index: number): TreeElement|null {
    return this.childrenInternal ? this.childrenInternal[index] : null;
  }

  indexOfChild(child: TreeElement): number {
    return this.childrenInternal ? this.childrenInternal.indexOf(child) : -1;
  }

  appendChild(child: TreeElement, comparator?: ((arg0: TreeElement, arg1: TreeElement) => number)): void {
    if (!this.childrenInternal) {
      this.childrenInternal = [];
    }

    let insertionIndex;
    if (comparator) {
      insertionIndex = Platform.ArrayUtilities.lowerBound(this.childrenInternal, child, comparator);
    } else if (this.treeOutline && this.treeOutline.comparator) {
      insertionIndex = Platform.ArrayUtilities.lowerBound(this.childrenInternal, child, this.treeOutline.comparator);
    } else {
      insertionIndex = this.childrenInternal.length;
    }
    this.insertChild(child, insertionIndex);
  }

  insertChild(child: TreeElement, index: number): void {
    if (!this.childrenInternal) {
      this.childrenInternal = [];
    }

    if (!child) {
      throw 'child can\'t be undefined or null';
    }

    console.assert(
        !child.parent, 'Attempting to insert a child that is already in the tree, reparenting is not supported.');

    const previousChild = (index > 0 ? this.childrenInternal[index - 1] : null);
    if (previousChild) {
      previousChild.nextSibling = child;
      child.previousSibling = previousChild;
    } else {
      child.previousSibling = null;
    }

    const nextChild = this.childrenInternal[index];
    if (nextChild) {
      nextChild.previousSibling = child;
      child.nextSibling = nextChild;
    } else {
      child.nextSibling = null;
    }

    this.childrenInternal.splice(index, 0, child);

    this.setExpandable(true);
    child.parent = this;

    if (this.treeOutline) {
      this.treeOutline.bindTreeElement(child);
    }
    for (let current = child.firstChild(); this.treeOutline && current;
         current = current.traverseNextTreeElement(false, child, true)) {
      this.treeOutline.bindTreeElement(current);
    }
    child.onattach();
    child.ensureSelection();
    if (this.treeOutline) {
      this.treeOutline.dispatchEventToListeners(Events.ElementAttached, child);
    }
    const nextSibling = child.nextSibling ? child.nextSibling.listItemNode : null;
    this.childrenListNode.insertBefore(child.listItemNode, nextSibling);
    this.childrenListNode.insertBefore(child.childrenListNode, nextSibling);
    if (child.selected) {
      child.select();
    }
    if (child.expanded) {
      child.expand();
    }
  }

  removeChildAtIndex(childIndex: number): void {
    if (!this.childrenInternal || childIndex < 0 || childIndex >= this.childrenInternal.length) {
      throw 'childIndex out of range';
    }

    const child = this.childrenInternal[childIndex];
    this.childrenInternal.splice(childIndex, 1);

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
      this.treeOutline.unbindTreeElement(child);
    }
    for (let current = child.firstChild(); this.treeOutline && current;
         current = current.traverseNextTreeElement(false, child, true)) {
      this.treeOutline.unbindTreeElement(current);
    }

    child.detach();
    if (this.treeOutline) {
      this.treeOutline.dispatchEventToListeners(Events.ElementsDetached);
    }
  }

  removeChild(child: TreeElement): void {
    if (!child) {
      throw 'child can\'t be undefined or null';
    }
    if (child.parent !== this) {
      return;
    }

    const childIndex = this.childrenInternal ? this.childrenInternal.indexOf(child) : -1;
    if (childIndex === -1) {
      throw 'child not found in this node\'s children';
    }

    this.removeChildAtIndex(childIndex);
  }

  removeChildren(): void {
    if (!this.root && this.treeOutline && this.treeOutline.selectedTreeElement &&
        this.treeOutline.selectedTreeElement.hasAncestorOrSelf(this)) {
      this.select(true);
    }

    if (this.childrenInternal) {
      for (const child of this.childrenInternal) {
        child.previousSibling = null;
        child.nextSibling = null;
        child.parent = null;

        if (this.treeOutline) {
          this.treeOutline.unbindTreeElement(child);
        }
        for (let current = child.firstChild(); this.treeOutline && current;
             current = current.traverseNextTreeElement(false, child, true)) {
          this.treeOutline.unbindTreeElement(current);
        }
        child.detach();
      }
    }
    this.childrenInternal = [];
    if (this.treeOutline) {
      this.treeOutline.dispatchEventToListeners(Events.ElementsDetached);
    }
  }

  get selectable(): boolean {
    if (this.isHidden()) {
      return false;
    }
    return this.selectableInternal;
  }

  set selectable(x: boolean) {
    this.selectableInternal = x;
  }

  get listItemElement(): HTMLLIElement {
    return this.listItemNode;
  }

  get childrenListElement(): HTMLOListElement {
    return this.childrenListNode;
  }

  get title(): string|Node {
    return this.titleInternal;
  }

  set title(x: string|Node) {
    if (this.titleInternal === x) {
      return;
    }
    this.titleInternal = x;

    if (typeof x === 'string') {
      this.titleElement.textContent = x;
      this.tooltip = x;
    } else {
      this.titleElement = x;
      this.tooltip = '';
    }

    this.listItemNode.removeChildren();
    if (this.leadingIconsElement) {
      this.listItemNode.appendChild(this.leadingIconsElement);
    }
    this.listItemNode.appendChild(this.titleElement);
    if (this.trailingIconsElement) {
      this.listItemNode.appendChild(this.trailingIconsElement);
    }
    this.ensureSelection();
  }

  titleAsText(): string {
    if (!this.titleInternal) {
      return '';
    }
    if (typeof this.titleInternal === 'string') {
      return this.titleInternal;
    }
    return this.titleInternal.textContent || '';
  }

  startEditingTitle<T>(editingConfig: Config<T>): void {
    InplaceEditor.startEditing((this.titleElement as Element), editingConfig);
    if (this.treeOutline) {
      this.treeOutline.onStartedEditingTitle(this);
    }
  }

  setLeadingIcons(icons: IconButton.Icon.Icon[]): void {
    if (!this.leadingIconsElement && !icons.length) {
      return;
    }
    if (!this.leadingIconsElement) {
      this.leadingIconsElement = document.createElement('div');
      this.leadingIconsElement.classList.add('leading-icons');
      this.leadingIconsElement.classList.add('icons-container');
      this.listItemNode.insertBefore(this.leadingIconsElement, this.titleElement);
      this.ensureSelection();
    }
    this.leadingIconsElement.removeChildren();
    for (const icon of icons) {
      this.leadingIconsElement.appendChild(icon);
    }
  }

  setTrailingIcons(icons: IconButton.Icon.Icon[]): void {
    if (!this.trailingIconsElement && !icons.length) {
      return;
    }
    if (!this.trailingIconsElement) {
      this.trailingIconsElement = document.createElement('div');
      this.trailingIconsElement.classList.add('trailing-icons');
      this.trailingIconsElement.classList.add('icons-container');
      this.listItemNode.appendChild(this.trailingIconsElement);
      this.ensureSelection();
    }
    this.trailingIconsElement.removeChildren();
    for (const icon of icons) {
      this.trailingIconsElement.appendChild(icon);
    }
  }

  get tooltip(): string {
    return this.tooltipInternal;
  }

  set tooltip(x: string) {
    if (this.tooltipInternal === x) {
      return;
    }
    this.tooltipInternal = x;
    Tooltip.install(this.listItemNode, x);
  }

  isExpandable(): boolean {
    return this.expandable;
  }

  setExpandable(expandable: boolean): void {
    if (this.expandable === expandable) {
      return;
    }

    this.expandable = expandable;

    this.listItemNode.classList.toggle('parent', expandable);
    if (!expandable) {
      this.collapse();
      ARIAUtils.unsetExpandable(this.listItemNode);
    } else {
      VisualLogging.registerLoggable(this.expandLoggable, `${VisualLogging.expand()}`, this.listItemNode);
      ARIAUtils.setExpanded(this.listItemNode, false);
    }
  }

  isExpandRecursively(): boolean {
    return this.#expandRecursively;
  }

  setExpandRecursively(expandRecursively: boolean): void {
    this.#expandRecursively = expandRecursively;
  }

  isCollapsible(): boolean {
    return this.collapsible;
  }

  setCollapsible(collapsible: boolean): void {
    if (this.collapsible === collapsible) {
      return;
    }

    this.collapsible = collapsible;

    this.listItemNode.classList.toggle('always-parent', !collapsible);
    if (!collapsible) {
      this.expand();
    }
  }

  get hidden(): boolean {
    return this.hiddenInternal;
  }

  set hidden(x: boolean) {
    if (this.hiddenInternal === x) {
      return;
    }

    this.hiddenInternal = x;

    this.listItemNode.classList.toggle('hidden', x);
    this.childrenListNode.classList.toggle('hidden', x);

    if (x && this.treeOutline && this.treeOutline.selectedTreeElement &&
        this.treeOutline.selectedTreeElement.hasAncestorOrSelf(this)) {
      const hadFocus = this.treeOutline.selectedTreeElement.listItemElement.hasFocus();
      this.treeOutline.forceSelect(!hadFocus, /* selectedByUser */ false);
    }
  }

  invalidateChildren(): void {
    if (this.childrenInternal) {
      this.removeChildren();
      this.childrenInternal = null;
    }
  }

  private ensureSelection(): void {
    if (!this.treeOutline || !this.treeOutline.renderSelection) {
      return;
    }
    if (!this.selectionElementInternal) {
      this.selectionElementInternal = document.createElement('div');
      this.selectionElementInternal.classList.add('selection');
      this.selectionElementInternal.classList.add('fill');
    }
    this.listItemNode.insertBefore(this.selectionElementInternal, this.listItemElement.firstChild);
  }

  private treeElementToggled(event: MouseEvent): void {
    const element = (event.currentTarget as Node | null);
    if (!element || treeElementBylistItemNode.get(element) !== this || element.hasSelection()) {
      return;
    }

    console.assert(Boolean(this.treeOutline));
    const showSelectionOnKeyboardFocus = this.treeOutline ? this.treeOutline.showSelectionOnKeyboardFocus : false;
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
        void this.expandRecursively();
      } else {
        this.expand();
      }
    }
    void VisualLogging.logClick(this.expandLoggable, event);
    event.consume();
  }

  private handleMouseDown(event: MouseEvent): void {
    const element = (event.currentTarget as Node | null);
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

  private handleDoubleClick(event: Event): void {
    const element = (event.currentTarget as Node | null);
    if (!element || treeElementBylistItemNode.get(element) !== this) {
      return;
    }

    const handled = this.ondblclick(event);
    if (handled) {
      return;
    }
    if (this.expandable && !this.expanded) {
      this.expand();
    }
  }

  private detach(): void {
    this.listItemNode.remove();
    this.childrenListNode.remove();
  }

  collapse(): void {
    if (!this.expanded || !this.collapsible) {
      return;
    }
    this.listItemNode.classList.remove('expanded');
    this.childrenListNode.classList.remove('expanded');
    ARIAUtils.setExpanded(this.listItemNode, false);
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

  collapseRecursively(): void {
    let item: (TreeElement|null)|this = this;
    while (item) {
      if (item.expanded) {
        item.collapse();
      }
      item = item.traverseNextTreeElement(false, this, true);
    }
  }

  collapseChildren(): void {
    if (!this.childrenInternal) {
      return;
    }
    for (const child of this.childrenInternal) {
      child.collapseRecursively();
    }
  }

  expand(): void {
    if (!this.expandable || (this.expanded && this.childrenInternal)) {
      return;
    }

    // Set this before onpopulate. Since onpopulate can add elements, this makes
    // sure the expanded flag is true before calling those functions. This prevents the possibility
    // of an infinite loop if onpopulate were to call expand.

    this.expanded = true;

    void this.populateIfNeeded();
    this.listItemNode.classList.add('expanded');
    this.childrenListNode.classList.add('expanded');
    ARIAUtils.setExpanded(this.listItemNode, true);

    if (this.treeOutline) {
      this.onexpand();
      this.treeOutline.dispatchEventToListeners(Events.ElementExpanded, this);
    }
  }

  async expandRecursively(maxDepth?: number): Promise<void> {
    let item: (TreeElement|null)|this = this;
    const info = {depthChange: 0};
    let depth = 0;

    // The Inspector uses TreeOutlines to represents object properties, so recursive expansion
    // in some case can be infinite, since JavaScript objects can hold circular references.
    // So default to a recursion cap of 3 levels, since that gives fairly good results.
    if (maxDepth === undefined || isNaN(maxDepth)) {
      maxDepth = 3;
    }

    do {
      if (item.isExpandRecursively()) {
        await item.populateIfNeeded();

        if (depth < maxDepth) {
          item.expand();
        }
      }
      item = item.traverseNextTreeElement(!item.isExpandRecursively(), this, true, info);
      depth += info.depthChange;
    } while (item !== null);
  }

  collapseOrAscend(altKey: boolean): boolean {
    if (this.expanded && this.collapsible) {
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

    let nextSelectedElement: (TreeElement|null)|TreeElement = this.parent;
    while (nextSelectedElement && !nextSelectedElement.selectable) {
      nextSelectedElement = nextSelectedElement.parent;
    }

    if (!nextSelectedElement) {
      return false;
    }
    nextSelectedElement.select(false, true);
    return true;
  }

  descendOrExpand(altKey: boolean): boolean {
    if (!this.expandable) {
      return false;
    }

    if (!this.expanded) {
      if (altKey) {
        void this.expandRecursively();
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

  reveal(center?: boolean): void {
    let currentAncestor: (TreeElement|null) = this.parent;
    while (currentAncestor && !currentAncestor.root) {
      if (!currentAncestor.expanded) {
        currentAncestor.expand();
      }
      currentAncestor = currentAncestor.parent;
    }

    if (this.treeOutline) {
      this.treeOutline.deferredScrollIntoView(this, Boolean(center));
    }
  }

  revealed(): boolean {
    let currentAncestor: (TreeElement|null) = this.parent;
    while (currentAncestor && !currentAncestor.root) {
      if (!currentAncestor.expanded) {
        return false;
      }
      currentAncestor = currentAncestor.parent;
    }

    return true;
  }

  selectOnMouseDown(event: MouseEvent): void {
    if (this.select(false, true)) {
      event.consume(true);
    }

    if (this.listItemNode.draggable && this.selectionElementInternal && this.treeOutline) {
      const marginLeft = this.treeOutline.element.getBoundingClientRect().left -
          this.listItemNode.getBoundingClientRect().left - this.treeOutline.element.scrollLeft;
      // By default the left margin extends far off screen. This is not a problem except when dragging an element.
      // Setting the margin once here should be fine, because we believe the left margin should never change.
      this.selectionElementInternal.style.setProperty('margin-left', marginLeft + 'px');
    }
  }

  select(omitFocus?: boolean, selectedByUser?: boolean): boolean {
    omitFocus = omitFocus || this.disableSelectFocus;
    if (!this.treeOutline || !this.selectable || this.selected) {
      if (!omitFocus) {
        this.listItemElement.focus();
      }
      return false;
    }
    // Wait to deselect this element so that focus only changes once
    const lastSelected = this.treeOutline.selectedTreeElement;
    this.treeOutline.selectedTreeElement = null;

    if (this.treeOutline.rootElementInternal === this) {
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

    this.listItemNode.classList.add('selected');
    ARIAUtils.setSelected(this.listItemNode, true);
    this.treeOutline.dispatchEventToListeners(Events.ElementSelected, this);
    if (lastSelected) {
      lastSelected.deselect();
    }
    return this.onselect(selectedByUser);
  }

  setFocusable(focusable: boolean): void {
    if (focusable) {
      this.listItemNode.setAttribute('tabIndex', (this.treeOutline && this.treeOutline.preventTabOrder) ? '-1' : '0');
      this.listItemNode.addEventListener('focus', this.boundOnFocus, false);
      this.listItemNode.addEventListener('blur', this.boundOnBlur, false);
    } else {
      this.listItemNode.removeAttribute('tabIndex');
      this.listItemNode.removeEventListener('focus', this.boundOnFocus, false);
      this.listItemNode.removeEventListener('blur', this.boundOnBlur, false);
    }
  }

  private onFocus(): void {
    if (!this.treeOutline || this.treeOutline.getUseLightSelectionColor()) {
      return;
    }
    if (!this.treeOutline.contentElement.classList.contains('hide-selection-when-blurred')) {
      this.listItemNode.classList.add('force-white-icons');
    }
  }

  private onBlur(): void {
    if (!this.treeOutline || this.treeOutline.getUseLightSelectionColor()) {
      return;
    }
    if (!this.treeOutline.contentElement.classList.contains('hide-selection-when-blurred')) {
      this.listItemNode.classList.remove('force-white-icons');
    }
  }

  revealAndSelect(omitFocus?: boolean): void {
    this.reveal(true);
    this.select(omitFocus);
  }

  deselect(): void {
    const hadFocus = this.listItemNode.hasFocus();
    this.selected = false;
    this.listItemNode.classList.remove('selected');
    ARIAUtils.clearSelected(this.listItemNode);
    this.setFocusable(false);

    if (this.treeOutline && this.treeOutline.selectedTreeElement === this) {
      this.treeOutline.selectedTreeElement = null;
      this.treeOutline.updateFocusable();
      if (hadFocus) {
        this.treeOutline.focus();
      }
    }
  }

  private async populateIfNeeded(): Promise<void> {
    if (this.treeOutline && this.expandable && !this.childrenInternal) {
      this.childrenInternal = [];
      await this.onpopulate();
    }
  }

  async onpopulate(): Promise<void> {
    // Overridden by subclasses.
  }

  onenter(): boolean {
    if (this.expandable && !this.expanded) {
      this.expand();
      return true;
    }
    if (this.collapsible && this.expanded) {
      this.collapse();
      return true;
    }
    return false;
  }

  ondelete(): boolean {
    return false;
  }

  onspace(): boolean {
    return false;
  }

  onbind(): void {
  }

  onunbind(): void {
  }

  onattach(): void {
  }

  onexpand(): void {
  }

  oncollapse(): void {
  }

  ondblclick(_e: Event): boolean {
    return false;
  }

  onselect(_selectedByUser?: boolean): boolean {
    return false;
  }

  traverseNextTreeElement(skipUnrevealed: boolean, stayWithin?: TreeElement|null, dontPopulate?: boolean, info?: {
    depthChange: number,
  }): TreeElement|null {
    if (!dontPopulate) {
      void this.populateIfNeeded();
    }

    if (info) {
      info.depthChange = 0;
    }

    let element: (TreeElement|null)|this =
        skipUnrevealed ? (this.revealed() ? this.firstChild() : null) : this.firstChild();
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

  traversePreviousTreeElement(skipUnrevealed: boolean, dontPopulate?: boolean): TreeElement|null {
    let element: (TreeElement|null) =
        skipUnrevealed ? (this.revealed() ? this.previousSibling : null) : this.previousSibling;
    if (!dontPopulate && element) {
      void element.populateIfNeeded();
    }

    while (element &&
           (skipUnrevealed ? (element.revealed() && element.expanded ? element.lastChild() : null) :
                             element.lastChild())) {
      if (!dontPopulate) {
        void element.populateIfNeeded();
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

  isEventWithinDisclosureTriangle(event: MouseEvent): boolean {
    const arrowToggleWidth = 10;
    // FIXME: We should not use getComputedStyle(). For that we need to get rid of using ::before for disclosure triangle. (http://webk.it/74446)
    const paddingLeftValue = window.getComputedStyle(this.listItemNode).paddingLeft;
    console.assert(paddingLeftValue.endsWith('px'));
    const computedLeftPadding = parseFloat(paddingLeftValue);
    const left = this.listItemNode.getBoundingClientRect().left + computedLeftPadding;
    return event.pageX >= left && event.pageX <= left + arrowToggleWidth && this.expandable;
  }

  setDisableSelectFocus(toggle: boolean): void {
    this.disableSelectFocus = toggle;
  }
}

function loggingParentProvider(e: Element): Element|undefined {
  const treeElement = TreeElement.getTreeElementBylistItemNode(e);
  const parentElement = treeElement?.parent?.listItemElement;
  return parentElement?.isConnected && parentElement || treeElement?.treeOutline?.contentElement;
}

VisualLogging.registerParentProvider('parentTreeItem', loggingParentProvider);

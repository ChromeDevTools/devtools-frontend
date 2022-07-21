// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';

import * as ARIAUtils from './ARIAUtils.js';

import {Events as ListModelEvents, type ItemsReplacedEvent, type ListModel} from './ListModel.js';
import {measurePreferredSize} from './UIUtils.js';

export interface ListDelegate<T> {
  createElementForItem(item: T): Element;

  /**
   * This method is not called in NonViewport mode.
   * Return zero to make list measure the item (only works in SameHeight mode).
   */
  heightForItem(item: T): number;
  isItemSelectable(item: T): boolean;
  selectedItemChanged(from: T|null, to: T|null, fromElement: HTMLElement|null, toElement: HTMLElement|null): void;
  updateSelectedItemARIA(fromElement: Element|null, toElement: Element|null): boolean;
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum ListMode {
  NonViewport = 'UI.ListMode.NonViewport',
  EqualHeightItems = 'UI.ListMode.EqualHeightItems',
  VariousHeightItems = 'UI.ListMode.VariousHeightItems',
}

export class ListControl<T> {
  element: HTMLDivElement;
  private topElement: HTMLElement;
  private bottomElement: HTMLElement;
  private firstIndex: number;
  private lastIndex: number;
  private renderedHeight: number;
  private topHeight: number;
  private bottomHeight: number;
  private model: ListModel<T>;
  private itemToElement: Map<T, Element>;
  private selectedIndexInternal: number;
  private selectedItemInternal: T|null;
  private delegate: ListDelegate<T>;
  private readonly mode: ListMode;
  private fixedHeight: number;
  private variableOffsets: Int32Array;

  constructor(model: ListModel<T>, delegate: ListDelegate<T>, mode?: ListMode) {
    this.element = document.createElement('div');
    this.element.style.overflowY = 'auto';
    this.topElement = this.element.createChild('div');
    this.bottomElement = this.element.createChild('div');
    this.firstIndex = 0;
    this.lastIndex = 0;
    this.renderedHeight = 0;
    this.topHeight = 0;
    this.bottomHeight = 0;

    this.model = model;
    this.model.addEventListener(ListModelEvents.ItemsReplaced, this.replacedItemsInRange, this);
    this.itemToElement = new Map();
    this.selectedIndexInternal = -1;
    this.selectedItemInternal = null;

    this.element.tabIndex = -1;
    this.element.addEventListener('click', this.onClick.bind(this), false);
    this.element.addEventListener('keydown', this.onKeyDown.bind(this), false);
    ARIAUtils.markAsListBox(this.element);

    this.delegate = delegate;
    this.mode = mode || ListMode.EqualHeightItems;
    this.fixedHeight = 0;
    this.variableOffsets = new Int32Array(0);
    this.clearContents();

    if (this.mode !== ListMode.NonViewport) {
      this.element.addEventListener('scroll', () => {
        this.updateViewport(this.element.scrollTop, this.element.offsetHeight);
      }, false);
    }
  }

  setModel(model: ListModel<T>): void {
    this.itemToElement.clear();
    const length = this.model.length;
    this.model.removeEventListener(ListModelEvents.ItemsReplaced, this.replacedItemsInRange, this);
    this.model = model;
    this.model.addEventListener(ListModelEvents.ItemsReplaced, this.replacedItemsInRange, this);
    this.invalidateRange(0, length);
  }

  private replacedItemsInRange(event: Common.EventTarget.EventTargetEvent<ItemsReplacedEvent<T>>): void {
    const data = event.data;
    const from = data.index;
    const to = from + data.removed.length;
    const keepSelectedIndex = data.keepSelectedIndex;

    const oldSelectedItem = this.selectedItemInternal;
    const oldSelectedElement = oldSelectedItem ? (this.itemToElement.get(oldSelectedItem) || null) : null;
    for (let i = 0; i < data.removed.length; i++) {
      this.itemToElement.delete(data.removed[i]);
    }
    this.invalidate(from, to, data.inserted);

    if (this.selectedIndexInternal >= to) {
      this.selectedIndexInternal += data.inserted - (to - from);
      this.selectedItemInternal = this.model.at(this.selectedIndexInternal);
    } else if (this.selectedIndexInternal >= from) {
      const selectableIndex = keepSelectedIndex ? from : from + data.inserted;
      let index = this.findFirstSelectable(selectableIndex, +1, false);
      if (index === -1) {
        const alternativeSelectableIndex = keepSelectedIndex ? from : from - 1;
        index = this.findFirstSelectable(alternativeSelectableIndex, -1, false);
      }
      this.select(index, oldSelectedItem, oldSelectedElement);
    }
  }

  refreshItem(item: T): void {
    const index = this.model.indexOf(item);
    if (index === -1) {
      console.error('Item to refresh is not present');
      return;
    }
    this.refreshItemByIndex(index);
  }

  refreshItemByIndex(index: number): void {
    const item = this.model.at(index);
    this.itemToElement.delete(item);
    this.invalidateRange(index, index + 1);
    if (this.selectedIndexInternal !== -1) {
      this.select(this.selectedIndexInternal, null, null);
    }
  }

  refreshAllItems(): void {
    this.itemToElement.clear();
    this.invalidateRange(0, this.model.length);
    if (this.selectedIndexInternal !== -1) {
      this.select(this.selectedIndexInternal, null, null);
    }
  }

  invalidateRange(from: number, to: number): void {
    this.invalidate(from, to, to - from);
  }

  viewportResized(): void {
    if (this.mode === ListMode.NonViewport) {
      return;
    }
    // TODO(dgozman): try to keep visible scrollTop the same.
    const scrollTop = this.element.scrollTop;
    const viewportHeight = this.element.offsetHeight;
    this.clearViewport();
    this.updateViewport(
        Platform.NumberUtilities.clamp(scrollTop, 0, this.totalHeight() - viewportHeight), viewportHeight);
  }

  invalidateItemHeight(): void {
    if (this.mode !== ListMode.EqualHeightItems) {
      console.error('Only supported in equal height items mode');
      return;
    }
    this.fixedHeight = 0;
    if (this.model.length) {
      this.itemToElement.clear();
      this.invalidate(0, this.model.length, this.model.length);
    }
  }

  itemForNode(node: Node|null): T|null {
    while (node && node.parentNodeOrShadowHost() !== this.element) {
      node = node.parentNodeOrShadowHost();
    }
    if (!node) {
      return null;
    }
    const element = (node as Element);
    const index = this.model.findIndex(item => this.itemToElement.get(item) === element);
    return index !== -1 ? this.model.at(index) : null;
  }

  scrollItemIntoView(item: T, center?: boolean): void {
    const index = this.model.indexOf(item);
    if (index === -1) {
      console.error('Attempt to scroll onto missing item');
      return;
    }
    this.scrollIntoView(index, center);
  }

  selectedItem(): T|null {
    return this.selectedItemInternal;
  }

  selectedIndex(): number {
    return this.selectedIndexInternal;
  }

  selectItem(item: T|null, center?: boolean, dontScroll?: boolean): void {
    let index = -1;
    if (item !== null) {
      index = this.model.indexOf(item);
      if (index === -1) {
        console.error('Attempt to select missing item');
        return;
      }
      if (!this.delegate.isItemSelectable(item)) {
        console.error('Attempt to select non-selectable item');
        return;
      }
    }
    // Scrolling the item before selection ensures it is in the DOM.
    if (index !== -1 && !dontScroll) {
      this.scrollIntoView(index, center);
    }
    if (this.selectedIndexInternal !== index) {
      this.select(index);
    }
  }

  selectPreviousItem(canWrap?: boolean, center?: boolean): boolean {
    if (this.selectedIndexInternal === -1 && !canWrap) {
      return false;
    }
    let index: number = this.selectedIndexInternal === -1 ? this.model.length - 1 : this.selectedIndexInternal - 1;
    index = this.findFirstSelectable(index, -1, Boolean(canWrap));
    if (index !== -1) {
      this.scrollIntoView(index, center);
      this.select(index);
      return true;
    }
    return false;
  }

  selectNextItem(canWrap?: boolean, center?: boolean): boolean {
    if (this.selectedIndexInternal === -1 && !canWrap) {
      return false;
    }
    let index: number = this.selectedIndexInternal === -1 ? 0 : this.selectedIndexInternal + 1;
    index = this.findFirstSelectable(index, +1, Boolean(canWrap));
    if (index !== -1) {
      this.scrollIntoView(index, center);
      this.select(index);
      return true;
    }
    return false;
  }

  selectItemPreviousPage(center?: boolean): boolean {
    if (this.mode === ListMode.NonViewport) {
      return false;
    }
    let index: number = this.selectedIndexInternal === -1 ? this.model.length - 1 : this.selectedIndexInternal;
    index = this.findPageSelectable(index, -1);
    if (index !== -1) {
      this.scrollIntoView(index, center);
      this.select(index);
      return true;
    }
    return false;
  }

  selectItemNextPage(center?: boolean): boolean {
    if (this.mode === ListMode.NonViewport) {
      return false;
    }
    let index: number = this.selectedIndexInternal === -1 ? 0 : this.selectedIndexInternal;
    index = this.findPageSelectable(index, +1);
    if (index !== -1) {
      this.scrollIntoView(index, center);
      this.select(index);
      return true;
    }
    return false;
  }

  private scrollIntoView(index: number, center?: boolean): void {
    if (this.mode === ListMode.NonViewport) {
      this.elementAtIndex(index).scrollIntoViewIfNeeded(Boolean(center));
      return;
    }

    const top = this.offsetAtIndex(index);
    const bottom = this.offsetAtIndex(index + 1);
    const viewportHeight = this.element.offsetHeight;
    if (center) {
      const scrollTo = (top + bottom) / 2 - viewportHeight / 2;
      this.updateViewport(
          Platform.NumberUtilities.clamp(scrollTo, 0, this.totalHeight() - viewportHeight), viewportHeight);
      return;
    }

    const scrollTop = this.element.scrollTop;
    if (top < scrollTop) {
      this.updateViewport(top, viewportHeight);
    } else if (bottom > scrollTop + viewportHeight) {
      this.updateViewport(bottom - viewportHeight, viewportHeight);
    }
  }

  private onClick(event: Event): void {
    const item = this.itemForNode((event.target as Node | null));
    if (item && this.delegate.isItemSelectable(item)) {
      this.selectItem(item);
    }
  }

  private onKeyDown(ev: Event): void {
    const event = (ev as KeyboardEvent);
    let selected = false;
    switch (event.key) {
      case 'ArrowUp':
        selected = this.selectPreviousItem(true, false);
        break;
      case 'ArrowDown':
        selected = this.selectNextItem(true, false);
        break;
      case 'PageUp':
        selected = this.selectItemPreviousPage(false);
        break;
      case 'PageDown':
        selected = this.selectItemNextPage(false);
        break;
    }
    if (selected) {
      event.consume(true);
    }
  }

  private totalHeight(): number {
    return this.offsetAtIndex(this.model.length);
  }

  private indexAtOffset(offset: number): number {
    if (this.mode === ListMode.NonViewport) {
      throw 'There should be no offset conversions in non-viewport mode';
    }
    if (!this.model.length || offset < 0) {
      return 0;
    }
    if (this.mode === ListMode.VariousHeightItems) {
      return Math.min(
          this.model.length - 1,
          Platform.ArrayUtilities.lowerBound(
              this.variableOffsets, offset, Platform.ArrayUtilities.DEFAULT_COMPARATOR, 0, this.model.length));
    }
    if (!this.fixedHeight) {
      this.measureHeight();
    }
    return Math.min(this.model.length - 1, Math.floor(offset / this.fixedHeight));
  }

  private elementAtIndex(index: number): Element {
    const item = this.model.at(index);
    let element = this.itemToElement.get(item);
    if (!element) {
      element = this.delegate.createElementForItem(item);
      this.itemToElement.set(item, element);
      this.updateElementARIA(element, index);
    }
    return element;
  }

  private refreshARIA(): void {
    for (let index = this.firstIndex; index <= this.lastIndex; index++) {
      const item = this.model.at(index);
      const element = this.itemToElement.get(item);
      if (element) {
        this.updateElementARIA(element, index);
      }
    }
  }

  private updateElementARIA(element: Element, index: number): void {
    if (!ARIAUtils.hasRole(element)) {
      ARIAUtils.markAsOption(element);
    }
    ARIAUtils.setSetSize(element, this.model.length);
    ARIAUtils.setPositionInSet(element, index + 1);
  }

  private offsetAtIndex(index: number): number {
    if (this.mode === ListMode.NonViewport) {
      throw new Error('There should be no offset conversions in non-viewport mode');
    }
    if (!this.model.length) {
      return 0;
    }
    if (this.mode === ListMode.VariousHeightItems) {
      return this.variableOffsets[index];
    }
    if (!this.fixedHeight) {
      this.measureHeight();
    }
    return index * this.fixedHeight;
  }

  private measureHeight(): void {
    this.fixedHeight = this.delegate.heightForItem(this.model.at(0));
    if (!this.fixedHeight) {
      this.fixedHeight = measurePreferredSize(this.elementAtIndex(0), this.element).height;
    }
  }

  private select(index: number, oldItem?: T|null, oldElement?: Element|null): void {
    if (oldItem === undefined) {
      oldItem = this.selectedItemInternal;
    }
    if (oldElement === undefined) {
      oldElement = this.itemToElement.get((oldItem as T)) || null;
    }
    this.selectedIndexInternal = index;
    this.selectedItemInternal = index === -1 ? null : this.model.at(index);
    const newItem = this.selectedItemInternal;
    const newElement = this.selectedIndexInternal !== -1 ? this.elementAtIndex(index) : null;
    this.delegate.selectedItemChanged(
        oldItem, newItem, (oldElement as HTMLElement | null), (newElement as HTMLElement | null));
    if (!this.delegate.updateSelectedItemARIA((oldElement as Element | null), newElement)) {
      if (oldElement) {
        ARIAUtils.setSelected(oldElement, false);
      }
      if (newElement) {
        ARIAUtils.setSelected(newElement, true);
        const text = newElement.textContent;
        if (text) {
          ARIAUtils.alert(text);
        }
      }
      ARIAUtils.setActiveDescendant(this.element, newElement);
    }
  }

  private findFirstSelectable(index: number, direction: number, canWrap: boolean): number {
    const length = this.model.length;
    if (!length) {
      return -1;
    }
    for (let step = 0; step <= length; step++) {
      if (index < 0 || index >= length) {
        if (!canWrap) {
          return -1;
        }
        index = (index + length) % length;
      }
      if (this.delegate.isItemSelectable(this.model.at(index))) {
        return index;
      }
      index += direction;
    }
    return -1;
  }

  private findPageSelectable(index: number, direction: number): number {
    let lastSelectable = -1;
    const startOffset = this.offsetAtIndex(index);
    // Compensate for zoom rounding errors with -1.
    const viewportHeight = this.element.offsetHeight - 1;
    while (index >= 0 && index < this.model.length) {
      if (this.delegate.isItemSelectable(this.model.at(index))) {
        if (Math.abs(this.offsetAtIndex(index) - startOffset) >= viewportHeight) {
          return index;
        }
        lastSelectable = index;
      }
      index += direction;
    }
    return lastSelectable;
  }

  private reallocateVariableOffsets(length: number, copyTo: number): void {
    if (this.variableOffsets.length < length) {
      const variableOffsets = new Int32Array(Math.max(length, this.variableOffsets.length * 2));
      variableOffsets.set(this.variableOffsets.slice(0, copyTo), 0);
      this.variableOffsets = variableOffsets;
    } else if (this.variableOffsets.length >= 2 * length) {
      const variableOffsets = new Int32Array(length);
      variableOffsets.set(this.variableOffsets.slice(0, copyTo), 0);
      this.variableOffsets = variableOffsets;
    }
  }

  private invalidate(from: number, to: number, inserted: number): void {
    if (this.mode === ListMode.NonViewport) {
      this.invalidateNonViewportMode(from, to - from, inserted);
      return;
    }

    if (this.mode === ListMode.VariousHeightItems) {
      this.reallocateVariableOffsets(this.model.length + 1, from + 1);
      for (let i = from + 1; i <= this.model.length; i++) {
        this.variableOffsets[i] = this.variableOffsets[i - 1] + this.delegate.heightForItem(this.model.at(i - 1));
      }
    }

    const viewportHeight = this.element.offsetHeight;
    const totalHeight = this.totalHeight();
    const scrollTop = this.element.scrollTop;

    if (this.renderedHeight < viewportHeight || totalHeight < viewportHeight) {
      this.clearViewport();
      this.updateViewport(Platform.NumberUtilities.clamp(scrollTop, 0, totalHeight - viewportHeight), viewportHeight);
      return;
    }

    const heightDelta = totalHeight - this.renderedHeight;
    if (to <= this.firstIndex) {
      const topHeight = this.topHeight + heightDelta;
      this.topElement.style.height = topHeight + 'px';
      this.element.scrollTop = scrollTop + heightDelta;
      this.topHeight = topHeight;
      this.renderedHeight = totalHeight;
      const indexDelta = inserted - (to - from);
      this.firstIndex += indexDelta;
      this.lastIndex += indexDelta;
      return;
    }

    if (from >= this.lastIndex) {
      const bottomHeight = this.bottomHeight + heightDelta;
      this.bottomElement.style.height = bottomHeight + 'px';
      this.bottomHeight = bottomHeight;
      this.renderedHeight = totalHeight;
      return;
    }

    // TODO(dgozman): try to keep visible scrollTop the same
    // when invalidating after firstIndex but before first visible element.
    this.clearViewport();
    this.updateViewport(Platform.NumberUtilities.clamp(scrollTop, 0, totalHeight - viewportHeight), viewportHeight);
    this.refreshARIA();
  }

  private invalidateNonViewportMode(start: number, remove: number, add: number): void {
    let startElement: HTMLElement = this.topElement;
    for (let index = 0; index < start; index++) {
      startElement = (startElement.nextElementSibling as HTMLElement);
    }
    while (remove--) {
      (startElement.nextElementSibling as HTMLElement).remove();
    }
    while (add--) {
      this.element.insertBefore(this.elementAtIndex(start + add), startElement.nextElementSibling);
    }
  }

  private clearViewport(): void {
    if (this.mode === ListMode.NonViewport) {
      console.error('There should be no viewport updates in non-viewport mode');
      return;
    }
    this.firstIndex = 0;
    this.lastIndex = 0;
    this.renderedHeight = 0;
    this.topHeight = 0;
    this.bottomHeight = 0;
    this.clearContents();
  }

  private clearContents(): void {
    // Note: this method should not force layout. Be careful.
    this.topElement.style.height = '0';
    this.bottomElement.style.height = '0';
    this.element.removeChildren();
    this.element.appendChild(this.topElement);
    this.element.appendChild(this.bottomElement);
  }

  private updateViewport(scrollTop: number, viewportHeight: number): void {
    // Note: this method should not force layout. Be careful.
    if (this.mode === ListMode.NonViewport) {
      console.error('There should be no viewport updates in non-viewport mode');
      return;
    }
    const totalHeight = this.totalHeight();
    if (!totalHeight) {
      this.firstIndex = 0;
      this.lastIndex = 0;
      this.topHeight = 0;
      this.bottomHeight = 0;
      this.renderedHeight = 0;
      this.topElement.style.height = '0';
      this.bottomElement.style.height = '0';
      return;
    }

    const firstIndex = this.indexAtOffset(scrollTop - viewportHeight);
    const lastIndex = this.indexAtOffset(scrollTop + 2 * viewportHeight) + 1;

    while (this.firstIndex < Math.min(firstIndex, this.lastIndex)) {
      this.elementAtIndex(this.firstIndex).remove();
      this.firstIndex++;
    }
    while (this.lastIndex > Math.max(lastIndex, this.firstIndex)) {
      this.elementAtIndex(this.lastIndex - 1).remove();
      this.lastIndex--;
    }

    this.firstIndex = Math.min(this.firstIndex, lastIndex);
    this.lastIndex = Math.max(this.lastIndex, firstIndex);
    for (let index = this.firstIndex - 1; index >= firstIndex; index--) {
      const element = this.elementAtIndex(index);
      this.element.insertBefore(element, this.topElement.nextSibling);
    }
    for (let index = this.lastIndex; index < lastIndex; index++) {
      const element = this.elementAtIndex(index);
      this.element.insertBefore(element, this.bottomElement);
    }

    this.firstIndex = firstIndex;
    this.lastIndex = lastIndex;
    this.topHeight = this.offsetAtIndex(firstIndex);
    this.topElement.style.height = this.topHeight + 'px';
    this.bottomHeight = totalHeight - this.offsetAtIndex(lastIndex);
    this.bottomElement.style.height = this.bottomHeight + 'px';
    this.renderedHeight = totalHeight;
    this.element.scrollTop = scrollTop;
  }
}

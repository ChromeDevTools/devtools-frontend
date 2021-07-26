// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';

import * as ARIAUtils from './ARIAUtils.js';
import {Size} from './Geometry.js';
import {AnchorBehavior, GlassPane, MarginBehavior, PointerEventsBehavior} from './GlassPane.js';
import {Icon} from './Icon.js';
import type {ListDelegate} from './ListControl.js';
import {ListControl, ListMode} from './ListControl.js';
import type {ListModel} from './ListModel.js';
import {Events as ListModelEvents} from './ListModel.js';
import {appendStyle} from './utils/append-style.js';
import {createShadowRootWithCoreStyles} from './utils/create-shadow-root-with-core-styles.js';

const UIStrings = {
  /**
  *@description Placeholder text in Soft Drop Down
  */
  noItemSelected: '(no item selected)',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/SoftDropDown.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SoftDropDown<T> implements ListDelegate<T> {
  _delegate: Delegate<T>;
  _selectedItem: T|null;
  _model: ListModel<T>;
  _placeholderText: Common.UIString.LocalizedString;
  element: HTMLButtonElement;
  _titleElement: HTMLElement;
  _glassPane: GlassPane;
  _list: ListControl<T>;
  _rowHeight: number;
  _width: number;
  _listWasShowing200msAgo: boolean;

  constructor(model: ListModel<T>, delegate: Delegate<T>) {
    this._delegate = delegate;
    this._selectedItem = null;
    this._model = model;

    this._placeholderText = i18nString(UIStrings.noItemSelected);

    this.element = document.createElement('button');
    this.element.classList.add('soft-dropdown');
    appendStyle(this.element, 'ui/legacy/softDropDownButton.css');
    this._titleElement = this.element.createChild('span', 'title');
    const dropdownArrowIcon = Icon.create('smallicon-triangle-down');
    this.element.appendChild(dropdownArrowIcon);
    ARIAUtils.setExpanded(this.element, false);

    this._glassPane = new GlassPane();
    this._glassPane.setMarginBehavior(MarginBehavior.NoMargin);
    this._glassPane.setAnchorBehavior(AnchorBehavior.PreferBottom);
    this._glassPane.setOutsideClickCallback(this._hide.bind(this));
    this._glassPane.setPointerEventsBehavior(PointerEventsBehavior.BlockedByGlassPane);
    this._list = new ListControl(model, this, ListMode.EqualHeightItems);
    this._list.element.classList.add('item-list');
    this._rowHeight = 36;
    this._width = 315;
    createShadowRootWithCoreStyles(this._glassPane.contentElement, {
      cssFile: 'ui/legacy/softDropDown.css',
      delegatesFocus: undefined,
    }).appendChild(this._list.element);
    ARIAUtils.markAsMenu(this._list.element);

    this._listWasShowing200msAgo = false;
    this.element.addEventListener('mousedown', event => {
      if (this._listWasShowing200msAgo) {
        this._hide(event);
      } else if (!this.element.disabled) {
        this._show(event);
      }
    }, false);
    this.element.addEventListener('keydown', this._onKeyDownButton.bind(this), false);
    this._list.element.addEventListener('keydown', this._onKeyDownList.bind(this), false);
    this._list.element.addEventListener('focusout', this._hide.bind(this), false);
    this._list.element.addEventListener('mousedown', event => event.consume(true), false);
    this._list.element.addEventListener('mouseup', event => {
      if (event.target === this._list.element) {
        return;
      }

      if (!this._listWasShowing200msAgo) {
        return;
      }
      this._selectHighlightedItem();
      this._hide(event);
    }, false);
    model.addEventListener(ListModelEvents.ItemsReplaced, this._itemsReplaced, this);
  }

  _show(event: Event): void {
    if (this._glassPane.isShowing()) {
      return;
    }
    this._glassPane.setContentAnchorBox(this.element.boxInWindow());
    this._glassPane.show((this.element.ownerDocument as Document));
    this._list.element.focus();
    ARIAUtils.setExpanded(this.element, true);
    this._updateGlasspaneSize();
    if (this._selectedItem) {
      this._list.selectItem(this._selectedItem);
    }
    event.consume(true);
    setTimeout(() => {
      this._listWasShowing200msAgo = true;
    }, 200);
  }

  _updateGlasspaneSize(): void {
    const maxHeight = this._rowHeight * (Math.min(this._model.length, 9));
    this._glassPane.setMaxContentSize(new Size(this._width, maxHeight));
    this._list.viewportResized();
  }

  _hide(event: Event): void {
    setTimeout(() => {
      this._listWasShowing200msAgo = false;
    }, 200);
    this._glassPane.hide();
    this._list.selectItem(null);
    ARIAUtils.setExpanded(this.element, false);
    this.element.focus();
    event.consume(true);
  }

  _onKeyDownButton(ev: Event): void {
    const event = (ev as KeyboardEvent);
    let handled = false;
    switch (event.key) {
      case 'ArrowUp':
        this._show(event);
        this._list.selectItemNextPage();
        handled = true;
        break;
      case 'ArrowDown':
        this._show(event);
        this._list.selectItemPreviousPage();
        handled = true;
        break;
      case 'Enter':
      case ' ':
        this._show(event);
        handled = true;
        break;
      default:
        break;
    }

    if (handled) {
      event.consume(true);
    }
  }

  _onKeyDownList(ev: Event): void {
    const event = (ev as KeyboardEvent);
    let handled = false;
    switch (event.key) {
      case 'ArrowLeft':
        handled = this._list.selectPreviousItem(false, false);
        break;
      case 'ArrowRight':
        handled = this._list.selectNextItem(false, false);
        break;
      case 'Home':
        for (let i = 0; i < this._model.length; i++) {
          if (this.isItemSelectable(this._model.at(i))) {
            this._list.selectItem(this._model.at(i));
            handled = true;
            break;
          }
        }
        break;
      case 'End':
        for (let i = this._model.length - 1; i >= 0; i--) {
          if (this.isItemSelectable(this._model.at(i))) {
            this._list.selectItem(this._model.at(i));
            handled = true;
            break;
          }
        }
        break;
      case 'Escape':
        this._hide(event);
        handled = true;
        break;
      case 'Tab':
      case 'Enter':
      case ' ':
        this._selectHighlightedItem();
        this._hide(event);
        handled = true;
        break;
      default:
        if (event.key.length === 1) {
          const selectedIndex = this._list.selectedIndex();
          const letter = event.key.toUpperCase();
          for (let i = 0; i < this._model.length; i++) {
            const item = this._model.at((selectedIndex + i + 1) % this._model.length);
            if (this._delegate.titleFor(item).toUpperCase().startsWith(letter)) {
              this._list.selectItem(item);
              break;
            }
          }
          handled = true;
        }
        break;
    }

    if (handled) {
      event.consume(true);
    }
  }

  setWidth(width: number): void {
    this._width = width;
    this._updateGlasspaneSize();
  }

  setRowHeight(rowHeight: number): void {
    this._rowHeight = rowHeight;
  }

  setPlaceholderText(text: Common.UIString.LocalizedString): void {
    this._placeholderText = text;
    if (!this._selectedItem) {
      this._titleElement.textContent = this._placeholderText;
    }
  }

  _itemsReplaced(event: Common.EventTarget.EventTargetEvent): void {
    const removed = (event.data.removed as T[]);
    if (this._selectedItem && removed.indexOf(this._selectedItem) !== -1) {
      this._selectedItem = null;
      this._selectHighlightedItem();
    }
    this._updateGlasspaneSize();
  }

  selectItem(item: T|null): void {
    this._selectedItem = item;
    if (this._selectedItem) {
      this._titleElement.textContent = this._delegate.titleFor(this._selectedItem);
    } else {
      this._titleElement.textContent = this._placeholderText;
    }
    this._delegate.itemSelected(this._selectedItem);
  }

  createElementForItem(item: T): Element {
    const element = document.createElement('div');
    element.classList.add('item');
    element.addEventListener('mousemove', e => {
      if ((e.movementX || e.movementY) && this._delegate.isItemSelectable(item)) {
        this._list.selectItem(item, false, /* Don't scroll */ true);
      }
    });
    element.classList.toggle('disabled', !this._delegate.isItemSelectable(item));
    element.classList.toggle('highlighted', this._list.selectedItem() === item);

    ARIAUtils.markAsMenuItem(element);
    element.appendChild(this._delegate.createElementForItem(item));

    return element;
  }

  heightForItem(_item: T): number {
    return this._rowHeight;
  }

  isItemSelectable(item: T): boolean {
    return this._delegate.isItemSelectable(item);
  }

  selectedItemChanged(from: T|null, to: T|null, fromElement: Element|null, toElement: Element|null): void {
    if (fromElement) {
      fromElement.classList.remove('highlighted');
    }
    if (toElement) {
      toElement.classList.add('highlighted');
    }

    ARIAUtils.setActiveDescendant(this._list.element, toElement);
    this._delegate.highlightedItemChanged(
        from, to, fromElement && fromElement.firstElementChild, toElement && toElement.firstElementChild);
  }

  updateSelectedItemARIA(_fromElement: Element|null, _toElement: Element|null): boolean {
    return false;
  }

  _selectHighlightedItem(): void {
    this.selectItem(this._list.selectedItem());
  }

  refreshItem(item: T): void {
    this._list.refreshItem(item);
  }
}

export interface Delegate<T> {
  titleFor(item: T): string;
  createElementForItem(item: T): Element;
  isItemSelectable(item: T): boolean;
  itemSelected(item: T|null): void;
  highlightedItemChanged(from: T|null, to: T|null, fromElement: Element|null, toElement: Element|null): void;
}

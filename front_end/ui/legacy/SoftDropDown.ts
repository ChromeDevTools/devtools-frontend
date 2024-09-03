// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as IconButton from '../components/icon_button/icon_button.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import * as ARIAUtils from './ARIAUtils.js';
import {Size} from './Geometry.js';
import {AnchorBehavior, GlassPane, MarginBehavior, PointerEventsBehavior} from './GlassPane.js';
import {ListControl, type ListDelegate, ListMode} from './ListControl.js';
import {Events as ListModelEvents, type ItemsReplacedEvent, type ListModel} from './ListModel.js';
import softDropDownStyles from './softDropDown.css.legacy.js';
import softDropDownButtonStyles from './softDropDownButton.css.legacy.js';
import * as ThemeSupport from './theme_support/theme_support.js';
import {createShadowRootWithCoreStyles} from './UIUtils.js';

const UIStrings = {
  /**
   *@description Placeholder text in Soft Drop Down
   */
  noItemSelected: '(no item selected)',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/SoftDropDown.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SoftDropDown<T> implements ListDelegate<T> {
  private delegate: Delegate<T>;
  private selectedItem: T|null;
  private readonly model: ListModel<T>;
  private placeholderText: Common.UIString.LocalizedString;
  element: HTMLButtonElement;
  private titleElement: HTMLElement;
  private readonly glassPane: GlassPane;
  private list: ListControl<T>;
  private rowHeight: number;
  private width: number;
  private listWasShowing200msAgo: boolean;

  constructor(model: ListModel<T>, delegate: Delegate<T>, jslogContext?: string) {
    this.delegate = delegate;
    this.selectedItem = null;
    this.model = model;

    this.placeholderText = i18nString(UIStrings.noItemSelected);

    this.element = document.createElement('button');
    if (jslogContext) {
      this.element.setAttribute(
          'jslog',
          `${VisualLogging.dropDown().track({click: true, keydown: 'ArrowUp|ArrowDown|Enter'}).context(jslogContext)}`,
      );
    }
    this.element.classList.add('soft-dropdown');
    ThemeSupport.ThemeSupport.instance().appendStyle(this.element, softDropDownButtonStyles);
    this.titleElement = this.element.createChild('span', 'title');
    const dropdownArrowIcon = IconButton.Icon.create('triangle-down');
    this.element.appendChild(dropdownArrowIcon);
    ARIAUtils.setExpanded(this.element, false);

    this.glassPane = new GlassPane();
    this.glassPane.setMarginBehavior(MarginBehavior.NO_MARGIN);
    this.glassPane.setAnchorBehavior(AnchorBehavior.PREFER_BOTTOM);
    this.glassPane.setOutsideClickCallback(this.hide.bind(this));
    this.glassPane.setPointerEventsBehavior(PointerEventsBehavior.BLOCKED_BY_GLASS_PANE);
    this.list = new ListControl(model, this, ListMode.EqualHeightItems);
    this.list.element.classList.add('item-list');
    this.rowHeight = 36;
    this.width = 315;
    createShadowRootWithCoreStyles(this.glassPane.contentElement, {
      cssFile: softDropDownStyles,
      delegatesFocus: undefined,
    }).appendChild(this.list.element);
    ARIAUtils.markAsMenu(this.list.element);
    VisualLogging.setMappedParent(this.list.element, this.element);
    this.list.element.setAttribute(
        'jslog',
        `${VisualLogging.menu().parent('mapped').track({resize: true, keydown: 'ArrowUp|ArrowDown|PageUp|PageDown'})}`);

    this.listWasShowing200msAgo = false;
    this.element.addEventListener('mousedown', event => {
      if (this.listWasShowing200msAgo) {
        this.hide(event);
      } else if (!this.element.disabled) {
        this.show(event);
      }
    }, false);
    this.element.addEventListener('keydown', this.onKeyDownButton.bind(this), false);
    this.list.element.addEventListener('keydown', this.onKeyDownList.bind(this), false);
    this.list.element.addEventListener('focusout', this.hide.bind(this), false);
    this.list.element.addEventListener('mousedown', event => event.consume(true), false);
    this.list.element.addEventListener('mouseup', event => {
      if (event.target === this.list.element) {
        return;
      }

      if (!this.listWasShowing200msAgo) {
        return;
      }
      this.selectHighlightedItem();
      if (event.target instanceof Element && event.target?.parentElement) {
        // hide() will consume the mouseup event and click won't be triggered
        void VisualLogging.logClick(event.target.parentElement, event);
      }
      this.hide(event);
    }, false);
    model.addEventListener(ListModelEvents.ITEMS_REPLACED, this.itemsReplaced, this);
  }

  private show(event: Event): void {
    if (this.glassPane.isShowing()) {
      return;
    }
    this.glassPane.setContentAnchorBox(this.element.boxInWindow());
    this.glassPane.show((this.element.ownerDocument as Document));
    this.list.element.focus();
    ARIAUtils.setExpanded(this.element, true);
    this.updateGlasspaneSize();
    if (this.selectedItem) {
      this.list.selectItem(this.selectedItem);
    }
    event.consume(true);
    window.setTimeout(() => {
      this.listWasShowing200msAgo = true;
    }, 200);
  }

  private updateGlasspaneSize(): void {
    const maxHeight = this.rowHeight * (Math.min(this.model.length, 9));
    this.glassPane.setMaxContentSize(new Size(this.width, maxHeight));
    this.list.viewportResized();
  }

  private hide(event: Event): void {
    window.setTimeout(() => {
      this.listWasShowing200msAgo = false;
    }, 200);
    this.glassPane.hide();
    this.list.selectItem(null);
    ARIAUtils.setExpanded(this.element, false);
    this.element.focus();
    event.consume(true);
  }

  private onKeyDownButton(ev: Event): void {
    const event = (ev as KeyboardEvent);
    let handled = false;
    switch (event.key) {
      case 'ArrowUp':
        this.show(event);
        this.list.selectItemNextPage();
        handled = true;
        break;
      case 'ArrowDown':
        this.show(event);
        this.list.selectItemPreviousPage();
        handled = true;
        break;
      case 'Enter':
      case ' ':
        this.show(event);
        handled = true;
        break;
      default:
        break;
    }

    if (handled) {
      event.consume(true);
    }
  }

  private onKeyDownList(ev: Event): void {
    const event = (ev as KeyboardEvent);
    let handled = false;
    switch (event.key) {
      case 'ArrowLeft':
        handled = this.list.selectPreviousItem(false, false);
        break;
      case 'ArrowRight':
        handled = this.list.selectNextItem(false, false);
        break;
      case 'Home':
        for (let i = 0; i < this.model.length; i++) {
          if (this.isItemSelectable(this.model.at(i))) {
            this.list.selectItem(this.model.at(i));
            handled = true;
            break;
          }
        }
        break;
      case 'End':
        for (let i = this.model.length - 1; i >= 0; i--) {
          if (this.isItemSelectable(this.model.at(i))) {
            this.list.selectItem(this.model.at(i));
            handled = true;
            break;
          }
        }
        break;
      case 'Escape':
        this.hide(event);
        handled = true;
        break;
      case 'Tab':
      case 'Enter':
      case ' ':
        this.selectHighlightedItem();
        this.hide(event);
        handled = true;
        break;
      default:
        if (event.key.length === 1) {
          const selectedIndex = this.list.selectedIndex();
          const letter = event.key.toUpperCase();
          for (let i = 0; i < this.model.length; i++) {
            const item = this.model.at((selectedIndex + i + 1) % this.model.length);
            if (this.delegate.titleFor(item).toUpperCase().startsWith(letter)) {
              this.list.selectItem(item);
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
    this.width = width;
    this.updateGlasspaneSize();
  }

  setRowHeight(rowHeight: number): void {
    this.rowHeight = rowHeight;
  }

  setPlaceholderText(text: Common.UIString.LocalizedString): void {
    this.placeholderText = text;
    if (!this.selectedItem) {
      this.titleElement.textContent = this.placeholderText;
    }
  }

  private itemsReplaced(event: Common.EventTarget.EventTargetEvent<ItemsReplacedEvent<T>>): void {
    const {removed} = event.data;
    if (this.selectedItem && removed.indexOf(this.selectedItem) !== -1) {
      this.selectedItem = null;
      this.selectHighlightedItem();
    }
    this.updateGlasspaneSize();
  }

  getSelectedItem(): T|null {
    return this.selectedItem;
  }

  selectItem(item: T|null): void {
    this.selectedItem = item;
    if (this.selectedItem) {
      this.titleElement.textContent = this.delegate.titleFor(this.selectedItem);
    } else {
      this.titleElement.textContent = this.placeholderText;
    }
    this.delegate.itemSelected(this.selectedItem);
  }

  createElementForItem(item: T): Element {
    const element = document.createElement('div');
    element.classList.add('item');
    element.addEventListener('mousemove', e => {
      if ((e.movementX || e.movementY) && this.delegate.isItemSelectable(item)) {
        this.list.selectItem(item, false, /* Don't scroll */ true);
      }
    });
    element.classList.toggle('disabled', !this.delegate.isItemSelectable(item));
    element.classList.toggle('highlighted', this.list.selectedItem() === item);

    ARIAUtils.markAsMenuItem(element);
    element.appendChild(this.delegate.createElementForItem(item));

    return element;
  }

  heightForItem(_item: T): number {
    return this.rowHeight;
  }

  isItemSelectable(item: T): boolean {
    return this.delegate.isItemSelectable(item);
  }

  selectedItemChanged(from: T|null, to: T|null, fromElement: Element|null, toElement: Element|null): void {
    if (fromElement) {
      fromElement.classList.remove('highlighted');
    }
    if (toElement) {
      toElement.classList.add('highlighted');
    }

    ARIAUtils.setActiveDescendant(this.list.element, toElement);
    this.delegate.highlightedItemChanged(
        from, to, fromElement && fromElement.firstElementChild, toElement && toElement.firstElementChild);
  }

  updateSelectedItemARIA(_fromElement: Element|null, _toElement: Element|null): boolean {
    return false;
  }

  private selectHighlightedItem(): void {
    this.selectItem(this.list.selectedItem());
  }

  refreshItem(item: T): void {
    this.list.refreshItem(item);
  }
}

export interface Delegate<T> {
  titleFor(item: T): string;
  createElementForItem(item: T): Element;
  isItemSelectable(item: T): boolean;
  itemSelected(item: T|null): void;
  highlightedItemChanged(from: T|null, to: T|null, fromElement: Element|null, toElement: Element|null): void;
}

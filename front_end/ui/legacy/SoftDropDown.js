// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../core/i18n/i18n.js';
import * as Geometry from '../../models/geometry/geometry.js';
import { createIcon } from '../kit/kit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';
import * as ARIAUtils from './ARIAUtils.js';
import { appendStyle } from './DOMUtilities.js';
import { GlassPane } from './GlassPane.js';
import { ListControl, ListMode } from './ListControl.js';
import softDropDownStyles from './softDropDown.css.js';
import softDropDownButtonStyles from './softDropDownButton.css.js';
import { createShadowRootWithCoreStyles } from './UIUtils.js';
const UIStrings = {
    /**
     * @description Placeholder text in Soft Drop Down
     */
    noItemSelected: '(no item selected)',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/SoftDropDown.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class SoftDropDown {
    delegate;
    selectedItem;
    model;
    placeholderText;
    element;
    titleElement;
    glassPane;
    list;
    rowHeight;
    width;
    constructor(model, delegate, jslogContext) {
        this.delegate = delegate;
        this.selectedItem = null;
        this.model = model;
        this.placeholderText = i18nString(UIStrings.noItemSelected);
        this.element = document.createElement('button');
        if (jslogContext) {
            this.element.setAttribute('jslog', `${VisualLogging.dropDown().track({ click: true, keydown: 'ArrowUp|ArrowDown|Enter' }).context(jslogContext)}`);
        }
        this.element.classList.add('soft-dropdown');
        appendStyle(this.element, softDropDownButtonStyles);
        this.titleElement = this.element.createChild('span', 'title');
        const dropdownArrowIcon = createIcon('triangle-down');
        this.element.appendChild(dropdownArrowIcon);
        ARIAUtils.setExpanded(this.element, false);
        this.glassPane = new GlassPane();
        this.glassPane.setMarginBehavior("NoMargin" /* MarginBehavior.NO_MARGIN */);
        this.glassPane.setAnchorBehavior("PreferBottom" /* AnchorBehavior.PREFER_BOTTOM */);
        this.glassPane.setOutsideClickCallback(this.hide.bind(this));
        this.glassPane.setPointerEventsBehavior("BlockedByGlassPane" /* PointerEventsBehavior.BLOCKED_BY_GLASS_PANE */);
        this.list = new ListControl(model, this, ListMode.EqualHeightItems);
        this.list.element.classList.add('item-list');
        this.rowHeight = 36;
        this.width = 315;
        createShadowRootWithCoreStyles(this.glassPane.contentElement, {
            cssFile: softDropDownStyles,
        }).appendChild(this.list.element);
        ARIAUtils.markAsMenu(this.list.element);
        VisualLogging.setMappedParent(this.list.element, this.element);
        this.list.element.setAttribute('jslog', `${VisualLogging.menu().parent('mapped').track({ resize: true, keydown: 'ArrowUp|ArrowDown|PageUp|PageDown' })}`);
        this.element.addEventListener('mousedown', event => {
            if (this.glassPane.isShowing()) {
                this.hide(event);
            }
            else if (!this.element.disabled) {
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
            this.selectHighlightedItem();
            if (event.target instanceof Element && event.target?.parentElement) {
                // hide() will consume the mouseup event and click won't be triggered
                void VisualLogging.logClick(event.target.parentElement, event);
            }
            this.hide(event);
        }, false);
        model.addEventListener("ItemsReplaced" /* ListModelEvents.ITEMS_REPLACED */, this.itemsReplaced, this);
    }
    show(event) {
        if (this.glassPane.isShowing()) {
            return;
        }
        this.glassPane.setContentAnchorBox(this.element.boxInWindow());
        this.glassPane.show((this.element.ownerDocument));
        this.list.element.focus();
        ARIAUtils.setExpanded(this.element, true);
        this.updateGlasspaneSize();
        if (this.selectedItem) {
            this.list.selectItem(this.selectedItem);
        }
        event.consume(true);
    }
    updateGlasspaneSize() {
        const maxHeight = this.rowHeight * (Math.min(this.model.length, 9));
        this.glassPane.setMaxContentSize(new Geometry.Size(this.width, maxHeight));
        this.list.viewportResized();
    }
    hide(event) {
        this.glassPane.hide();
        this.list.selectItem(null);
        ARIAUtils.setExpanded(this.element, false);
        this.element.focus();
        event.consume(true);
    }
    onKeyDownButton(event) {
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
    onKeyDownList(event) {
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
    setWidth(width) {
        this.width = width;
        this.updateGlasspaneSize();
    }
    setRowHeight(rowHeight) {
        this.rowHeight = rowHeight;
    }
    setPlaceholderText(text) {
        this.placeholderText = text;
        if (!this.selectedItem) {
            this.titleElement.textContent = this.placeholderText;
        }
    }
    itemsReplaced(event) {
        const { removed } = event.data;
        if (this.selectedItem && removed.indexOf(this.selectedItem) !== -1) {
            this.selectedItem = null;
            this.selectHighlightedItem();
        }
        this.updateGlasspaneSize();
    }
    getSelectedItem() {
        return this.selectedItem;
    }
    selectItem(item) {
        this.selectedItem = item;
        if (this.selectedItem) {
            this.titleElement.textContent = this.delegate.titleFor(this.selectedItem);
        }
        else {
            this.titleElement.textContent = this.placeholderText;
        }
        this.delegate.itemSelected(this.selectedItem);
    }
    createElementForItem(item) {
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
    heightForItem(_item) {
        return this.rowHeight;
    }
    isItemSelectable(item) {
        return this.delegate.isItemSelectable(item);
    }
    selectedItemChanged(from, to, fromElement, toElement) {
        if (fromElement) {
            fromElement.classList.remove('highlighted');
        }
        if (toElement) {
            toElement.classList.add('highlighted');
        }
        ARIAUtils.setActiveDescendant(this.list.element, toElement);
        this.delegate.highlightedItemChanged(from, to, fromElement?.firstElementChild ?? null, toElement?.firstElementChild ?? null);
    }
    updateSelectedItemARIA(_fromElement, _toElement) {
        return false;
    }
    selectHighlightedItem() {
        this.selectItem(this.list.selectedItem());
    }
    refreshItem(item) {
        this.list.refreshItem(item);
    }
}
//# sourceMappingURL=SoftDropDown.js.map
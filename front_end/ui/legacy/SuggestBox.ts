/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js'; // eslint-disable-line no-unused-vars

import * as ARIAUtils from './ARIAUtils.js';
import {Size} from './Geometry.js';
import {AnchorBehavior, GlassPane} from './GlassPane.js';
import {Icon} from './Icon.js';
import type {ListDelegate} from './ListControl.js';
import {ListControl, ListMode} from './ListControl.js';  // eslint-disable-line no-unused-vars
import {ListModel} from './ListModel.js';
import {measurePreferredSize} from './UIUtils.js';
import {createShadowRootWithCoreStyles} from './utils/create-shadow-root-with-core-styles.js';
import {measuredScrollbarWidth} from './utils/measured-scrollbar-width.js';

const UIStrings = {
  /**
  *@description Aria alert to read the suggestion for the suggestion box when typing in text editor
  *@example {name} PH1
  *@example {2} PH2
  *@example {5} PH3
  */
  sSuggestionSOfS: '{PH1}, suggestion {PH2} of {PH3}',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/SuggestBox.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * @interface
 */
export interface SuggestBoxDelegate {
  applySuggestion(suggestion: Suggestion|null, isIntermediateSuggestion?: boolean): void;

  /**
   * acceptSuggestion will be always called after call to applySuggestion with isIntermediateSuggestion being equal to false.
   */
  acceptSuggestion(): void;

  /**
   * Called to obtain the element whose aria-controls property should reference this SuggestBox.
   */
  ariaControlledBy(): Element;
}

export class SuggestBox implements ListDelegate<Suggestion> {
  _suggestBoxDelegate: SuggestBoxDelegate;
  _maxItemsHeight: number|undefined;
  _rowHeight: number;
  _userEnteredText: string;
  _defaultSelectionIsDimmed: boolean;
  _onlyCompletion: Suggestion|null;
  _items: ListModel<Suggestion>;
  _list: ListControl<Suggestion>;
  _element: HTMLDivElement;
  _glassPane: GlassPane;

  constructor(suggestBoxDelegate: SuggestBoxDelegate, maxItemsHeight?: number) {
    this._suggestBoxDelegate = suggestBoxDelegate;
    this._maxItemsHeight = maxItemsHeight;
    this._rowHeight = 17;
    this._userEnteredText = '';
    this._defaultSelectionIsDimmed = false;

    this._onlyCompletion = null;

    this._items = new ListModel();
    this._list = new ListControl(this._items, this, ListMode.EqualHeightItems);
    this._element = this._list.element;
    this._element.classList.add('suggest-box');
    this._element.addEventListener('mousedown', event => event.preventDefault(), true);
    this._element.addEventListener('click', this._onClick.bind(this), false);

    this._glassPane = new GlassPane();
    this._glassPane.setAnchorBehavior(AnchorBehavior.PreferBottom);
    this._glassPane.setOutsideClickCallback(this.hide.bind(this));
    const shadowRoot = createShadowRootWithCoreStyles(
        this._glassPane.contentElement,
        {cssFile: 'ui/legacy/suggestBox.css', enableLegacyPatching: false, delegatesFocus: undefined});
    shadowRoot.appendChild(this._element);
  }

  visible(): boolean {
    return this._glassPane.isShowing();
  }

  setPosition(anchorBox: AnchorBox): void {
    this._glassPane.setContentAnchorBox(anchorBox);
  }

  setAnchorBehavior(behavior: AnchorBehavior): void {
    this._glassPane.setAnchorBehavior(behavior);
  }

  _updateMaxSize(items: Suggestion[]): void {
    const maxWidth = this._maxWidth(items);
    const length = this._maxItemsHeight ? Math.min(this._maxItemsHeight, items.length) : items.length;
    const maxHeight = length * this._rowHeight;
    this._glassPane.setMaxContentSize(new Size(maxWidth, maxHeight));
  }

  _maxWidth(items: Suggestion[]): number {
    const kMaxWidth = 300;
    if (!items.length) {
      return kMaxWidth;
    }
    let maxItem;
    let maxLength: number = -Infinity;
    for (let i = 0; i < items.length; i++) {
      const length = (items[i].title || items[i].text).length + (items[i].subtitle || '').length;
      if (length > maxLength) {
        maxLength = length;
        maxItem = items[i];
      }
    }
    const element = this.createElementForItem((maxItem as Suggestion));
    const preferredWidth =
        measurePreferredSize(element, this._element).width + measuredScrollbarWidth(this._element.ownerDocument);
    return Math.min(kMaxWidth, preferredWidth);
  }

  _show(): void {
    if (this.visible()) {
      return;
    }
    // TODO(dgozman): take document as a parameter.
    this._glassPane.show(document);
    const suggestion = ({text: '1', subtitle: '12'} as Suggestion);
    this._rowHeight = measurePreferredSize(this.createElementForItem(suggestion), this._element).height;
    ARIAUtils.setControls(this._suggestBoxDelegate.ariaControlledBy(), this._element);
    ARIAUtils.setExpanded(this._suggestBoxDelegate.ariaControlledBy(), true);
  }

  hide(): void {
    if (!this.visible()) {
      return;
    }
    this._glassPane.hide();
    ARIAUtils.setControls(this._suggestBoxDelegate.ariaControlledBy(), null);
    ARIAUtils.setExpanded(this._suggestBoxDelegate.ariaControlledBy(), false);
  }

  _applySuggestion(isIntermediateSuggestion?: boolean): boolean {
    if (this._onlyCompletion) {
      ARIAUtils.alert(i18nString(
          UIStrings.sSuggestionSOfS,
          {PH1: this._onlyCompletion.text, PH2: this._list.selectedIndex() + 1, PH3: this._items.length}));
      this._suggestBoxDelegate.applySuggestion(this._onlyCompletion, isIntermediateSuggestion);
      return true;
    }
    const suggestion = this._list.selectedItem();
    if (suggestion && suggestion.text) {
      ARIAUtils.alert(i18nString(
          UIStrings.sSuggestionSOfS,
          {PH1: suggestion.title || suggestion.text, PH2: this._list.selectedIndex() + 1, PH3: this._items.length}));
    }
    this._suggestBoxDelegate.applySuggestion(suggestion, isIntermediateSuggestion);

    return this.visible() && Boolean(suggestion);
  }

  acceptSuggestion(): boolean {
    const result = this._applySuggestion();
    this.hide();
    if (!result) {
      return false;
    }

    this._suggestBoxDelegate.acceptSuggestion();

    return true;
  }

  createElementForItem(item: Suggestion): Element {
    const query = this._userEnteredText;
    const element = document.createElement('div');
    element.classList.add('suggest-box-content-item');
    element.classList.add('source-code');
    if (item.iconType) {
      const icon = Icon.create(item.iconType, 'suggestion-icon');
      element.appendChild(icon);
    }
    if (item.isSecondary) {
      element.classList.add('secondary');
    }
    element.tabIndex = -1;
    const maxTextLength = 50 + query.length;
    const displayText = Platform.StringUtilities.trimEndWithMaxLength((item.title || item.text).trim(), maxTextLength)
                            .replace(/\n/g, '\u21B5');

    const titleElement = element.createChild('span', 'suggestion-title');
    const index = displayText.toLowerCase().indexOf(query.toLowerCase());
    if (index > 0) {
      titleElement.createChild('span').textContent = displayText.substring(0, index);
    }
    if (index > -1) {
      titleElement.createChild('span', 'query').textContent = displayText.substring(index, index + query.length);
    }
    titleElement.createChild('span').textContent = displayText.substring(index > -1 ? index + query.length : 0);
    titleElement.createChild('span', 'spacer');
    if (item.subtitleRenderer) {
      const subtitleElement = (item.subtitleRenderer.call(null) as HTMLElement);
      subtitleElement.classList.add('suggestion-subtitle');
      element.appendChild(subtitleElement);
    } else if (item.subtitle) {
      const subtitleElement = element.createChild('span', 'suggestion-subtitle');
      subtitleElement.textContent =
          Platform.StringUtilities.trimEndWithMaxLength(item.subtitle, maxTextLength - displayText.length);
    }
    if (item.iconElement) {
      element.appendChild(item.iconElement);
    }
    return element;
  }

  heightForItem(_item: Suggestion): number {
    return this._rowHeight;
  }

  isItemSelectable(_item: Suggestion): boolean {
    return true;
  }

  selectedItemChanged(from: Suggestion|null, to: Suggestion|null, fromElement: Element|null, toElement: Element|null):
      void {
    if (fromElement) {
      fromElement.classList.remove('selected', 'force-white-icons');
    }
    if (toElement) {
      toElement.classList.add('selected');
      toElement.classList.add('force-white-icons');
    }
    this._applySuggestion(true);
  }

  updateSelectedItemARIA(_fromElement: Element|null, _toElement: Element|null): boolean {
    return false;
  }

  _onClick(event: Event): void {
    const item = this._list.itemForNode((event.target as Node | null));
    if (!item) {
      return;
    }

    this._list.selectItem(item);
    this.acceptSuggestion();
    event.consume(true);
  }

  _canShowBox(
      completions: Suggestion[], highestPriorityItem: Suggestion|null, canShowForSingleItem: boolean,
      userEnteredText: string): boolean {
    if (!completions || !completions.length) {
      return false;
    }

    if (completions.length > 1) {
      return true;
    }

    if (!highestPriorityItem || highestPriorityItem.isSecondary ||
        !highestPriorityItem.text.startsWith(userEnteredText)) {
      return true;
    }

    // Do not show a single suggestion if it is the same as user-entered query, even if allowed to show single-item suggest boxes.
    return canShowForSingleItem && highestPriorityItem.text !== userEnteredText;
  }

  updateSuggestions(
      anchorBox: AnchorBox, completions: Suggestion[], selectHighestPriority: boolean, canShowForSingleItem: boolean,
      userEnteredText: string): void {
    this._onlyCompletion = null;
    const highestPriorityItem =
        selectHighestPriority ? completions.reduce((a, b) => (a.priority || 0) >= (b.priority || 0) ? a : b) : null;
    if (this._canShowBox(completions, highestPriorityItem, canShowForSingleItem, userEnteredText)) {
      this._userEnteredText = userEnteredText;

      this._show();
      this._updateMaxSize(completions);
      this._glassPane.setContentAnchorBox(anchorBox);
      this._list.invalidateItemHeight();
      this._items.replaceAll(completions);

      if (highestPriorityItem && !highestPriorityItem.isSecondary) {
        this._list.selectItem(highestPriorityItem, true);
      } else {
        this._list.selectItem(null);
      }
    } else {
      if (completions.length === 1) {
        this._onlyCompletion = completions[0];
        this._applySuggestion(true);
      }
      this.hide();
    }
  }

  keyPressed(event: KeyboardEvent): boolean {
    switch (event.key) {
      case 'Enter':
        return this.enterKeyPressed();
      case 'ArrowUp':
        return this._list.selectPreviousItem(true, false);
      case 'ArrowDown':
        return this._list.selectNextItem(true, false);
      case 'PageUp':
        return this._list.selectItemPreviousPage(false);
      case 'PageDown':
        return this._list.selectItemNextPage(false);
    }
    return false;
  }

  enterKeyPressed(): boolean {
    const hasSelectedItem = Boolean(this._list.selectedItem()) || Boolean(this._onlyCompletion);
    this.acceptSuggestion();

    // Report the event as non-handled if there is no selected item,
    // to commit the input or handle it otherwise.
    return hasSelectedItem;
  }
}
export interface Suggestion {
  text: string;
  title?: string;
  subtitle?: string;
  iconType?: string;
  priority?: number;
  isSecondary?: boolean;
  subtitleRenderer?: (() => Element);
  selectionRange?: {
    startColumn: number,
    endColumn: number,
  };
  hideGhostText?: boolean;
  iconElement?: HTMLElement;
}

export type Suggestions = Suggestion[];
export interface AutocompleteConfig {
  substituteRangeCallback?: ((arg0: number, arg1: number) => TextUtils.TextRange.TextRange | null);
  tooltipCallback?: ((arg0: number, arg1: number) => Promise<Element|null>);
  suggestionsCallback?:
      ((arg0: TextUtils.TextRange.TextRange, arg1: TextUtils.TextRange.TextRange,
        arg2?: boolean|undefined) => Promise<Suggestion[]>| null);
  isWordChar?: ((arg0: string) => boolean);
  anchorBehavior?: AnchorBehavior;
}

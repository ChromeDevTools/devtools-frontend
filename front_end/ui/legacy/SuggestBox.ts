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

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Utils from './utils/utils.js';

import * as ARIAUtils from './ARIAUtils.js';
import {Size} from './Geometry.js';
import {AnchorBehavior, GlassPane} from './GlassPane.js';

import {ListControl, ListMode, type ListDelegate} from './ListControl.js';
import {ListModel} from './ListModel.js';
import {measurePreferredSize} from './UIUtils.js';
import suggestBoxStyles from './suggestBox.css.legacy.js';

const UIStrings = {
  /**
   *@description Aria alert to read the suggestion for the suggestion box when typing in text editor
   *@example {name} PH1
   *@example {2} PH2
   *@example {5} PH3
   */
  sSuggestionSOfS: '{PH1}, suggestion {PH2} of {PH3}',
  /**
   *@description Aria alert to confirm the suggestion when it is selected from the suggestion box
   *@example {name} PH1
   */
  sSuggestionSSelected: '{PH1}, suggestion selected',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/SuggestBox.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
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
  private readonly suggestBoxDelegate: SuggestBoxDelegate;
  private readonly maxItemsHeight: number|undefined;
  private rowHeight: number;
  private userEnteredText: string;
  private readonly defaultSelectionIsDimmed: boolean;
  private onlyCompletion: Suggestion|null;
  private readonly items: ListModel<Suggestion>;
  private readonly list: ListControl<Suggestion>;
  element: HTMLDivElement;
  private readonly glassPane: GlassPane;

  constructor(suggestBoxDelegate: SuggestBoxDelegate, maxItemsHeight?: number) {
    this.suggestBoxDelegate = suggestBoxDelegate;
    this.maxItemsHeight = maxItemsHeight;
    this.rowHeight = 17;
    this.userEnteredText = '';
    this.defaultSelectionIsDimmed = false;

    this.onlyCompletion = null;

    this.items = new ListModel();
    this.list = new ListControl(this.items, this, ListMode.EqualHeightItems);
    this.element = this.list.element;
    this.element.classList.add('suggest-box');
    this.element.addEventListener('mousedown', event => event.preventDefault(), true);
    this.element.addEventListener('click', this.onClick.bind(this), false);

    this.glassPane = new GlassPane();
    this.glassPane.setAnchorBehavior(AnchorBehavior.PreferBottom);
    this.glassPane.setOutsideClickCallback(this.hide.bind(this));
    const shadowRoot = Utils.createShadowRootWithCoreStyles(
        this.glassPane.contentElement, {cssFile: suggestBoxStyles, delegatesFocus: undefined});
    shadowRoot.appendChild(this.element);
  }

  visible(): boolean {
    return this.glassPane.isShowing();
  }

  setPosition(anchorBox: AnchorBox): void {
    this.glassPane.setContentAnchorBox(anchorBox);
  }

  setAnchorBehavior(behavior: AnchorBehavior): void {
    this.glassPane.setAnchorBehavior(behavior);
  }

  private updateMaxSize(items: Suggestion[]): void {
    const maxWidth = this.maxWidth(items);
    const length = this.maxItemsHeight ? Math.min(this.maxItemsHeight, items.length) : items.length;
    const maxHeight = length * this.rowHeight;
    this.glassPane.setMaxContentSize(new Size(maxWidth, maxHeight));
  }

  private maxWidth(items: Suggestion[]): number {
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
        measurePreferredSize(element, this.element).width + Utils.measuredScrollbarWidth(this.element.ownerDocument);
    return Math.min(kMaxWidth, preferredWidth);
  }

  private show(): void {
    if (this.visible()) {
      return;
    }
    // TODO(dgozman): take document as a parameter.
    this.glassPane.show(document);
    const suggestion = ({text: '1', subtitle: '12'} as Suggestion);
    this.rowHeight = measurePreferredSize(this.createElementForItem(suggestion), this.element).height;
    ARIAUtils.setControls(this.suggestBoxDelegate.ariaControlledBy(), this.element);
    ARIAUtils.setExpanded(this.suggestBoxDelegate.ariaControlledBy(), true);
  }

  hide(): void {
    if (!this.visible()) {
      return;
    }
    this.glassPane.hide();
    ARIAUtils.setControls(this.suggestBoxDelegate.ariaControlledBy(), null);
    ARIAUtils.setExpanded(this.suggestBoxDelegate.ariaControlledBy(), false);
  }

  private applySuggestion(isIntermediateSuggestion?: boolean): boolean {
    if (this.onlyCompletion) {
      isIntermediateSuggestion ?
          ARIAUtils.alert(i18nString(
              UIStrings.sSuggestionSOfS,
              {PH1: this.onlyCompletion.text, PH2: this.list.selectedIndex() + 1, PH3: this.items.length})) :
          ARIAUtils.alert(i18nString(UIStrings.sSuggestionSSelected, {PH1: this.onlyCompletion.text}));
      this.suggestBoxDelegate.applySuggestion(this.onlyCompletion, isIntermediateSuggestion);
      return true;
    }
    const suggestion = this.list.selectedItem();
    if (suggestion && suggestion.text) {
      isIntermediateSuggestion ?
          ARIAUtils.alert(i18nString(UIStrings.sSuggestionSOfS, {
            PH1: suggestion.title || suggestion.text,
            PH2: this.list.selectedIndex() + 1,
            PH3: this.items.length,
          })) :
          ARIAUtils.alert(i18nString(UIStrings.sSuggestionSSelected, {PH1: suggestion.title || suggestion.text}));
    }
    this.suggestBoxDelegate.applySuggestion(suggestion, isIntermediateSuggestion);

    return this.visible() && Boolean(suggestion);
  }

  acceptSuggestion(): boolean {
    const result = this.applySuggestion();
    this.hide();
    if (!result) {
      return false;
    }

    this.suggestBoxDelegate.acceptSuggestion();

    return true;
  }

  createElementForItem(item: Suggestion): Element {
    const query = this.userEnteredText;
    const element = document.createElement('div');
    element.classList.add('suggest-box-content-item');
    element.classList.add('source-code');
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
    return this.rowHeight;
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
    this.applySuggestion(true);
  }

  updateSelectedItemARIA(_fromElement: Element|null, _toElement: Element|null): boolean {
    return false;
  }

  private onClick(event: Event): void {
    const item = this.list.itemForNode((event.target as Node | null));
    if (!item) {
      return;
    }

    this.list.selectItem(item);
    this.acceptSuggestion();
    event.consume(true);
  }

  private canShowBox(
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
    this.onlyCompletion = null;
    const highestPriorityItem =
        selectHighestPriority ? completions.reduce((a, b) => (a.priority || 0) >= (b.priority || 0) ? a : b) : null;
    if (this.canShowBox(completions, highestPriorityItem, canShowForSingleItem, userEnteredText)) {
      this.userEnteredText = userEnteredText;

      this.show();
      this.updateMaxSize(completions);
      this.glassPane.setContentAnchorBox(anchorBox);
      this.list.invalidateItemHeight();
      this.items.replaceAll(completions);

      if (highestPriorityItem && !highestPriorityItem.isSecondary) {
        this.list.selectItem(highestPriorityItem, true);
      } else {
        this.list.selectItem(null);
      }
    } else {
      if (completions.length === 1) {
        this.onlyCompletion = completions[0];
        this.applySuggestion(true);
      }
      this.hide();
    }
  }

  keyPressed(event: KeyboardEvent): boolean {
    switch (event.key) {
      case 'Enter':
        return this.enterKeyPressed();
      case 'ArrowUp':
        return this.list.selectPreviousItem(true, false);
      case 'ArrowDown':
        return this.list.selectNextItem(true, false);
      case 'PageUp':
        return this.list.selectItemPreviousPage(false);
      case 'PageDown':
        return this.list.selectItemNextPage(false);
    }
    return false;
  }

  enterKeyPressed(): boolean {
    const hasSelectedItem = Boolean(this.list.selectedItem()) || Boolean(this.onlyCompletion);
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

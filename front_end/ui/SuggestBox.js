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
/**
 * @interface
 */
UI.SuggestBoxDelegate = function() {};

UI.SuggestBoxDelegate.prototype = {
  /**
   * @param {string} suggestion
   * @param {boolean=} isIntermediateSuggestion
   */
  applySuggestion(suggestion, isIntermediateSuggestion) {},

  /**
   * acceptSuggestion will be always called after call to applySuggestion with isIntermediateSuggestion being equal to false.
   */
  acceptSuggestion() {},
};

/**
 * @implements {UI.ListDelegate}
 */
UI.SuggestBox = class {
  /**
   * @param {!UI.SuggestBoxDelegate} suggestBoxDelegate
   * @param {number=} maxItemsHeight
   * @param {boolean=} captureEnter
   */
  constructor(suggestBoxDelegate, maxItemsHeight, captureEnter) {
    this._suggestBoxDelegate = suggestBoxDelegate;
    this._maxItemsHeight = maxItemsHeight;
    this._captureEnter = captureEnter;
    this._rowHeight = 17;
    this._userInteracted = false;
    this._userEnteredText = '';
    /** @type {?string} */
    this._onlyCompletion = null;

    /** @type {!UI.ListControl<!UI.SuggestBox.Suggestion>} */
    this._list = new UI.ListControl(this, UI.ListMode.EqualHeightItems);
    this._element = this._list.element;
    this._element.classList.add('suggest-box');
    this._element.addEventListener('mousedown', event => event.preventDefault(), true);

    this._glassPane = new UI.GlassPane();
    this._glassPane.setAnchorBehavior(UI.GlassPane.AnchorBehavior.PreferBottom);
    this._glassPane.setSetOutsideClickCallback(this.hide.bind(this));
    var shadowRoot = UI.createShadowRootWithCoreStyles(this._glassPane.contentElement, 'ui/suggestBox.css');
    shadowRoot.appendChild(this._element);
  }

  /**
   * @return {boolean}
   */
  visible() {
    return this._glassPane.isShowing();
  }

  /**
   * @param {!AnchorBox} anchorBox
   */
  setPosition(anchorBox) {
    this._glassPane.setContentAnchorBox(anchorBox);
  }

  /**
   * @param {!UI.SuggestBox.Suggestions} items
   */
  _updateMaxSize(items) {
    var maxWidth = this._maxWidth(items);
    var length = this._maxItemsHeight ? Math.min(this._maxItemsHeight, items.length) : items.length;
    var maxHeight = length * this._rowHeight;
    this._glassPane.setMaxContentSize(new UI.Size(maxWidth, maxHeight));
  }

  /**
   * @param {!UI.SuggestBox.Suggestions} items
   * @return {number}
   */
  _maxWidth(items) {
    var kMaxWidth = 300;
    if (!items.length)
      return kMaxWidth;
    var maxItem;
    var maxLength = -Infinity;
    for (var i = 0; i < items.length; i++) {
      var length = (items[i].title || items[i].text).length + (items[i].subtitle || '').length;
      if (length > maxLength) {
        maxLength = length;
        maxItem = items[i];
      }
    }
    var element = this.createElementForItem(/** @type {!UI.SuggestBox.Suggestion} */ (maxItem));
    return Math.min(kMaxWidth, UI.measurePreferredSize(element, this._element).width);
  }

  /**
   * @suppressGlobalPropertiesCheck
   */
  _show() {
    if (this.visible())
      return;
    // TODO(dgozman): take document as a parameter.
    this._glassPane.show(document);
    this._rowHeight =
        UI.measurePreferredSize(this.createElementForItem({text: '1', subtitle: '12'}), this._element).height;
  }

  hide() {
    if (!this.visible())
      return;
    this._userInteracted = false;
    this._glassPane.hide();
  }

  /**
   * @param {boolean=} isIntermediateSuggestion
   * @return {boolean}
   */
  _applySuggestion(isIntermediateSuggestion) {
    if (this._onlyCompletion) {
      this._suggestBoxDelegate.applySuggestion(this._onlyCompletion, isIntermediateSuggestion);
      return true;
    }

    if (!this.visible() || !this._list.selectedItem())
      return false;

    var suggestion = this._list.selectedItem().text;
    if (!suggestion)
      return false;

    this._suggestBoxDelegate.applySuggestion(suggestion, isIntermediateSuggestion);
    return true;
  }

  /**
   * @return {boolean}
   */
  acceptSuggestion() {
    var result = this._applySuggestion();
    this.hide();
    if (!result)
      return false;

    this._suggestBoxDelegate.acceptSuggestion();

    return true;
  }

  /**
   * @override
   * @param {!UI.SuggestBox.Suggestion} item
   * @return {!Element}
   */
  createElementForItem(item) {
    var query = this._userEnteredText;
    var element = createElementWithClass('div', 'suggest-box-content-item source-code');
    if (item.iconType) {
      var icon = UI.Icon.create(item.iconType, 'suggestion-icon');
      element.appendChild(icon);
    }
    if (item.isSecondary)
      element.classList.add('secondary');
    element.tabIndex = -1;
    var maxTextLength = 50 + query.length;
    var displayText = (item.title || item.text).trimEnd(maxTextLength);

    var titleElement = element.createChild('span', 'suggestion-title');
    var index = displayText.toLowerCase().indexOf(query.toLowerCase());
    if (index > 0)
      titleElement.createChild('span').textContent = displayText.substring(0, index);
    if (index > -1)
      titleElement.createChild('span', 'query').textContent = displayText.substring(index, index + query.length);
    titleElement.createChild('span').textContent = displayText.substring(index > -1 ? index + query.length : 0);
    titleElement.createChild('span', 'spacer');
    if (item.subtitle) {
      var subtitleElement = element.createChild('span', 'suggestion-subtitle');
      subtitleElement.textContent = item.subtitle.trimEnd(maxTextLength - displayText.length);
    }

    element.addEventListener('click', event => {
      this._list.selectItem(item);
      this._userInteracted = true;
      event.consume(true);
      this.acceptSuggestion();
    });
    return element;
  }

  /**
   * @override
   * @param {!UI.SuggestBox.Suggestion} item
   * @return {number}
   */
  heightForItem(item) {
    return this._rowHeight;
  }

  /**
   * @override
   * @param {!UI.SuggestBox.Suggestion} item
   * @return {boolean}
   */
  isItemSelectable(item) {
    return true;
  }

  /**
   * @override
   * @param {?UI.SuggestBox.Suggestion} from
   * @param {?UI.SuggestBox.Suggestion} to
   * @param {?Element} fromElement
   * @param {?Element} toElement
   */
  selectedItemChanged(from, to, fromElement, toElement) {
    if (fromElement)
      fromElement.classList.remove('selected', 'force-white-icons');
    if (toElement)
      toElement.classList.add('selected', 'force-white-icons');
    if (!to)
      return;
    this._applySuggestion(true);
  }

  /**
   * @param {!UI.SuggestBox.Suggestions} completions
   * @param {boolean} canShowForSingleItem
   * @param {string} userEnteredText
   * @return {boolean}
   */
  _canShowBox(completions, canShowForSingleItem, userEnteredText) {
    if (!completions || !completions.length)
      return false;

    if (completions.length > 1)
      return true;

    if (!completions[0].text.startsWith(userEnteredText))
      return true;

    // Do not show a single suggestion if it is the same as user-entered query, even if allowed to show single-item suggest boxes.
    return canShowForSingleItem && completions[0].text !== userEnteredText;
  }

  /**
   * @param {!AnchorBox} anchorBox
   * @param {!UI.SuggestBox.Suggestions} completions
   * @param {boolean} selectHighestPriority
   * @param {boolean} canShowForSingleItem
   * @param {string} userEnteredText
   */
  updateSuggestions(anchorBox, completions, selectHighestPriority, canShowForSingleItem, userEnteredText) {
    this._onlyCompletion = null;
    if (this._canShowBox(completions, canShowForSingleItem, userEnteredText)) {
      this._userEnteredText = userEnteredText;

      this._show();
      this._updateMaxSize(completions);
      this._glassPane.setContentAnchorBox(anchorBox);
      this._list.invalidateItemHeight();
      this._list.replaceAllItems(completions);

      if (selectHighestPriority) {
        var highestPriorityItem = completions[0];
        var highestPriority = completions[0].priority || 0;
        for (var i = 0; i < completions.length; i++) {
          var priority = completions[i].priority || 0;
          if (highestPriority < priority) {
            highestPriority = priority;
            highestPriorityItem = completions[i];
          }
        }
        this._list.selectItem(highestPriorityItem, true);
      }
    } else {
      if (completions.length === 1) {
        this._onlyCompletion = completions[0].text;
        this._applySuggestion(true);
      }
      this.hide();
    }
  }

  /**
   * @param {!KeyboardEvent} event
   * @return {boolean}
   */
  keyPressed(event) {
    var selected = false;
    switch (event.key) {
      case 'Enter':
        return this.enterKeyPressed();
      case 'ArrowUp':
        selected = this._list.selectPreviousItem(true, false);
        break;
      case 'ArrowDown':
        selected = this._list.selectNextItem(true, false);
        break;
      case 'PageUp':
        selected = this._list.selectItemPreviousPage(false);
        break;
      case 'PageDown':
        selected = this._list.selectItemNextPage(false);
        break;
      default:
        return false;
    }
    if (selected) {
      this._userInteracted = true;
      return true;
    }
    return false;
  }

  /**
   * @return {boolean}
   */
  enterKeyPressed() {
    if (!this._userInteracted && this._captureEnter)
      return false;

    var hasSelectedItem = !!this._list.selectedItem() || !!this._onlyCompletion;
    this.acceptSuggestion();

    // Report the event as non-handled if there is no selected item,
    // to commit the input or handle it otherwise.
    return hasSelectedItem;
  }
};

/**
 * @typedef {!{text: string, subtitle: (string|undefined), iconType: (string|undefined), priority: (number|undefined), isSecondary: (boolean|undefined), title: (string|undefined)}}
 */
UI.SuggestBox.Suggestion;

/**
 * @typedef {!Array<!UI.SuggestBox.Suggestion>}
 */
UI.SuggestBox.Suggestions;

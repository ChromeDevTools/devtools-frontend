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
 * @unrestricted
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
    this._maybeHideBound = this._maybeHide.bind(this);
    this._container = createElementWithClass('div', 'suggest-box-container');
    this._rowHeight = 17;
    /** @type {!UI.ListControl<!UI.SuggestBox.Suggestion>} */
    this._list = new UI.ListControl(this);
    this._element = this._list.element;
    this._element.classList.add('suggest-box');
    this._container.appendChild(this._element);
    this._element.addEventListener('mousedown', this._onBoxMouseDown.bind(this), true);
    this._detailsPopup = this._container.createChild('div', 'suggest-box details-popup monospace');
    this._detailsPopup.classList.add('hidden');
    this._asyncDetailsCallback = null;
    /** @type {!Map<!UI.SuggestBox.Suggestion, !Promise<{detail: string, description: string}>>} */
    this._asyncDetailsPromises = new Map();
    this._userInteracted = false;
    this._captureEnter = captureEnter;
    this._viewportWidth = '100vw';
    this._hasVerticalScroll = false;
    this._userEnteredText = '';
  }

  /**
   * @return {boolean}
   */
  visible() {
    return !!this._container.parentElement;
  }

  /**
   * @param {!AnchorBox} anchorBox
   */
  setPosition(anchorBox) {
    this._updateBoxPosition(anchorBox, this._list.length());
  }

  /**
   * @param {!AnchorBox} anchorBox
   * @param {number} length
   */
  _updateBoxPosition(anchorBox, length) {
    console.assert(this._overlay);
    if (this._lastAnchorBox && this._lastAnchorBox.equals(anchorBox) && this._lastItemCount === length)
      return;
    this._lastItemCount = length;
    this._lastAnchorBox = anchorBox;

    // Position relative to main DevTools element.
    var container = UI.Dialog.modalHostView().element;
    anchorBox = anchorBox.relativeToElement(container);
    var totalHeight = container.offsetHeight;
    var aboveHeight = anchorBox.y;
    var underHeight = totalHeight - anchorBox.y - anchorBox.height;

    this._overlay.setLeftOffset(anchorBox.x);

    var under = underHeight >= aboveHeight;
    if (under)
      this._overlay.setVerticalOffset(anchorBox.y + anchorBox.height, true);
    else
      this._overlay.setVerticalOffset(totalHeight - anchorBox.y, false);

    var spacer = 6;
    var maxHeight = Math.min(
        Math.max(underHeight, aboveHeight) - spacer,
        this._maxItemsHeight ? this._maxItemsHeight * this._rowHeight : Infinity);
    var height = this._rowHeight * length;
    this._hasVerticalScroll = height > maxHeight;
    this._element.style.height = Math.min(maxHeight, height) + 'px';
  }

  /**
   * @param {!UI.SuggestBox.Suggestions} items
   */
  _updateWidth(items) {
    if (this._hasVerticalScroll) {
      this._element.style.width = '100vw';
      return;
    }
    if (!items.length)
      return;
    // If there are no scrollbars, set the width to the width of the largest row.
    var maxItem = items[0];
    for (var i = 1; i < items.length; i++) {
      if (items[i].title.length > maxItem.title.length)
        maxItem = items[i];
    }
    this._element.style.width = UI.measurePreferredSize(this.createElementForItem(maxItem), this._element).width + 'px';
  }

  /**
   * @param {!Event} event
   */
  _onBoxMouseDown(event) {
    if (this._hideTimeoutId) {
      window.clearTimeout(this._hideTimeoutId);
      delete this._hideTimeoutId;
    }
    event.preventDefault();
  }

  _maybeHide() {
    if (!this._hideTimeoutId)
      this._hideTimeoutId = window.setTimeout(this.hide.bind(this), 0);
  }

  /**
   * // FIXME: make SuggestBox work for multiple documents.
   * @suppressGlobalPropertiesCheck
   */
  _show() {
    if (this.visible())
      return;
    this._bodyElement = document.body;
    this._bodyElement.addEventListener('mousedown', this._maybeHideBound, true);
    this._overlay = new UI.SuggestBox.Overlay();
    this._overlay.setContentElement(this._container);
    this._rowHeight =
        UI.measurePreferredSize(this.createElementForItem({title: '1', subtitle: '12'}), this._element).height;
  }

  hide() {
    if (!this.visible())
      return;

    this._userInteracted = false;
    this._bodyElement.removeEventListener('mousedown', this._maybeHideBound, true);
    delete this._bodyElement;
    this._container.remove();
    this._overlay.dispose();
    delete this._overlay;
    delete this._lastAnchorBox;
  }

  removeFromElement() {
    this.hide();
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

    var suggestion = this._list.selectedItem().title;
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
    var displayText = item.title.trimEnd(50 + query.length);

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
      subtitleElement.textContent = item.subtitle.trimEnd(15);
    }
    element.addEventListener('mousedown', this._onItemMouseDown.bind(this), false);
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
    this._detailsPopup.classList.add('hidden');
    this._asyncDetails(to).then(details => {
      if (this._list.selectedItem() === to)
        this._showDetailsPopup(details);
    });
    this._applySuggestion(true);
  }

  /**
   * @param {!Event} event
   */
  _onItemMouseDown(event) {
    if (!this._list.onClick(event))
      return;
    this._userInteracted = true;
    this.acceptSuggestion();
    event.consume(true);
  }

  /**
   * @param {!UI.SuggestBox.Suggestion} item
   * @return {!Promise<?{detail: string, description: string}>}
   */
  _asyncDetails(item) {
    if (!this._asyncDetailsCallback)
      return Promise.resolve(/** @type {?{description: string, detail: string}} */ (null));
    if (!this._asyncDetailsPromises.has(item))
      this._asyncDetailsPromises.set(item, this._asyncDetailsCallback(item));
    return /** @type {!Promise<?{detail: string, description: string}>} */ (this._asyncDetailsPromises.get(item));
  }

  /**
   * @param {?{detail: string, description: string}} details
   */
  _showDetailsPopup(details) {
    this._detailsPopup.removeChildren();
    if (!details)
      return;
    this._detailsPopup.createChild('section', 'detail').createTextChild(details.detail);
    this._detailsPopup.createChild('section', 'description').createTextChild(details.description);
    this._detailsPopup.classList.remove('hidden');
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

    if (!completions[0].title.startsWith(userEnteredText))
      return true;

    // Do not show a single suggestion if it is the same as user-entered query, even if allowed to show single-item suggest boxes.
    return canShowForSingleItem && completions[0].title !== userEnteredText;
  }

  /**
   * @param {!AnchorBox} anchorBox
   * @param {!UI.SuggestBox.Suggestions} completions
   * @param {boolean} selectHighestPriority
   * @param {boolean} canShowForSingleItem
   * @param {string} userEnteredText
   * @param {function(number): !Promise<{detail:string, description:string}>=} asyncDetails
   */
  updateSuggestions(
      anchorBox,
      completions,
      selectHighestPriority,
      canShowForSingleItem,
      userEnteredText,
      asyncDetails) {
    delete this._onlyCompletion;
    if (this._canShowBox(completions, canShowForSingleItem, userEnteredText)) {
      this._asyncDetailsPromises.clear();
      if (asyncDetails)
        this._asyncDetailsCallback = item => asyncDetails(completions.indexOf(item));
      else
        this._asyncDetailsCallback = null;
      this._userEnteredText = userEnteredText;

      this._show();
      this._updateBoxPosition(anchorBox, completions.length);
      this._updateWidth(completions);

      this._list.setHeightMode(UI.ListHeightMode.Fixed);
      this._list.replaceAllItems(completions);

      var highestPriorityItem = -1;
      if (selectHighestPriority) {
        var highestPriority = -Infinity;
        for (var i = 0; i < completions.length; i++) {
          var priority = completions[i].priority || 0;
          if (highestPriority < priority) {
            highestPriority = priority;
            highestPriorityItem = i;
          }
        }
      }
      this._list.selectItemAtIndex(highestPriorityItem, true);
    } else {
      if (completions.length === 1) {
        this._onlyCompletion = completions[0].title;
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
    if (this._list.onKeyDown(event)) {
      this._userInteracted = true;
      return true;
    }
    if (event.key === 'Enter')
      return this.enterKeyPressed();
    return false;
  }

  /**
   * @return {boolean}
   */
  enterKeyPressed() {
    if (!this._userInteracted && this._captureEnter)
      return false;

    var hasSelectedItem = !!this._list.selectedItem() || this._onlyCompletion;
    this.acceptSuggestion();

    // Report the event as non-handled if there is no selected item,
    // to commit the input or handle it otherwise.
    return hasSelectedItem;
  }
};

/**
 * @typedef {!{title: string, subtitle: (string|undefined), iconType: (string|undefined), priority: (number|undefined), isSecondary: (boolean|undefined)}}
 */
UI.SuggestBox.Suggestion;

/**
 * @typedef {!Array<!UI.SuggestBox.Suggestion>}
 */
UI.SuggestBox.Suggestions;

/**
 * @unrestricted
 */
UI.SuggestBox.Overlay = class {
  /**
   * // FIXME: make SuggestBox work for multiple documents.
   * @suppressGlobalPropertiesCheck
   */
  constructor() {
    this.element = createElementWithClass('div', 'suggest-box-overlay');
    var root = UI.createShadowRootWithCoreStyles(this.element, 'ui/suggestBox.css');
    this._leftSpacerElement = root.createChild('div', 'suggest-box-left-spacer');
    this._horizontalElement = root.createChild('div', 'suggest-box-horizontal');
    this._topSpacerElement = this._horizontalElement.createChild('div', 'suggest-box-top-spacer');
    this._bottomSpacerElement = this._horizontalElement.createChild('div', 'suggest-box-bottom-spacer');
    this._resize();
    document.body.appendChild(this.element);
  }

  /**
   * @param {number} offset
   */
  setLeftOffset(offset) {
    this._leftSpacerElement.style.flexBasis = offset + 'px';
  }

  /**
   * @param {number} offset
   * @param {boolean} isTopOffset
   */
  setVerticalOffset(offset, isTopOffset) {
    this.element.classList.toggle('under-anchor', isTopOffset);

    if (isTopOffset) {
      this._bottomSpacerElement.style.flexBasis = 'auto';
      this._topSpacerElement.style.flexBasis = offset + 'px';
    } else {
      this._bottomSpacerElement.style.flexBasis = offset + 'px';
      this._topSpacerElement.style.flexBasis = 'auto';
    }
  }

  /**
   * @param {!Element} element
   */
  setContentElement(element) {
    this._horizontalElement.insertBefore(element, this._bottomSpacerElement);
  }

  _resize() {
    var container = UI.Dialog.modalHostView().element;
    var containerBox = container.boxInWindow(container.ownerDocument.defaultView);

    this.element.style.left = containerBox.x + 'px';
    this.element.style.top = containerBox.y + 'px';
    this.element.style.height = containerBox.height + 'px';
    this.element.style.width = containerBox.width + 'px';
  }

  dispose() {
    this.element.remove();
  }
};

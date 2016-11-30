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
 * @implements {UI.StaticViewportControl.Provider}
 * @unrestricted
 */
UI.SuggestBox = class {
  /**
   * @param {!UI.SuggestBoxDelegate} suggestBoxDelegate
   * @param {number=} maxItemsHeight
   * @param {boolean=} captureEnter
   */
  constructor(suggestBoxDelegate, maxItemsHeight, captureEnter) {
    this._suggestBoxDelegate = suggestBoxDelegate;
    this._length = 0;
    this._selectedIndex = -1;
    this._selectedElement = null;
    this._maxItemsHeight = maxItemsHeight;
    this._maybeHideBound = this._maybeHide.bind(this);
    this._container = createElementWithClass('div', 'suggest-box-container');
    this._viewport = new UI.StaticViewportControl(this);
    this._element = this._viewport.element;
    this._element.classList.add('suggest-box');
    this._container.appendChild(this._element);
    this._element.addEventListener('mousedown', this._onBoxMouseDown.bind(this), true);
    this._detailsPopup = this._container.createChild('div', 'suggest-box details-popup monospace');
    this._detailsPopup.classList.add('hidden');
    this._asyncDetailsCallback = null;
    /** @type {!Map<number, !Promise<{detail: string, description: string}>>} */
    this._asyncDetailsPromises = new Map();
    this._userInteracted = false;
    this._captureEnter = captureEnter;
    /** @type {!Array<!Element>} */
    this._elementList = [];
    this._rowHeight = 17;
    this._viewportWidth = '100vw';
    this._hasVerticalScroll = false;
    this._userEnteredText = '';
    /** @type {!UI.SuggestBox.Suggestions} */
    this._items = [];
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
    this._updateBoxPosition(anchorBox);
  }

  /**
   * @param {!AnchorBox} anchorBox
   */
  _updateBoxPosition(anchorBox) {
    console.assert(this._overlay);
    if (this._lastAnchorBox && this._lastAnchorBox.equals(anchorBox) && this._lastItemCount === this.itemCount())
      return;
    this._lastItemCount = this.itemCount();
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
        Math.max(underHeight, aboveHeight) - spacer, this._maxItemsHeight ? this._maxItemsHeight * this._rowHeight : 0);
    var height = this._rowHeight * this._items.length;
    this._hasVerticalScroll = height > maxHeight;
    this._element.style.height = Math.min(maxHeight, height) + 'px';
  }

  _updateWidth() {
    if (this._hasVerticalScroll) {
      this._element.style.width = '100vw';
      return;
    }
    // If there are no scrollbars, set the width to the width of the largest row.
    var maxIndex = 0;
    for (var i = 0; i < this._items.length; i++) {
      if (this._items[i].title.length > this._items[maxIndex].title.length)
        maxIndex = i;
    }
    var element = /** @type {!Element} */ (this.itemElement(maxIndex));
    this._element.style.width = UI.measurePreferredSize(element, this._element).width + 'px';
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
    var measuringElement = this._createItemElement('1', '12');
    this._viewport.element.appendChild(measuringElement);
    this._rowHeight = measuringElement.getBoundingClientRect().height;
    measuringElement.remove();
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
    delete this._selectedElement;
    this._selectedIndex = -1;
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

    if (!this.visible() || !this._selectedElement)
      return false;

    var suggestion = this._selectedElement.__fullValue;
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
   * @param {number} shift
   * @param {boolean=} isCircular
   * @return {boolean} is changed
   */
  _selectClosest(shift, isCircular) {
    if (!this._length)
      return false;

    this._userInteracted = true;

    if (this._selectedIndex === -1 && shift < 0)
      shift += 1;

    var index = this._selectedIndex + shift;

    if (isCircular)
      index = (this._length + index) % this._length;
    else
      index = Number.constrain(index, 0, this._length - 1);

    this._selectItem(index);
    return true;
  }

  /**
   * @param {!Event} event
   */
  _onItemMouseDown(event) {
    this._selectedElement = event.currentTarget;
    this.acceptSuggestion();
    event.consume(true);
  }

  /**
   * @param {string} query
   * @param {string} text
   * @param {string=} iconType
   * @param {boolean=} isSecondary
   * @return {!Element}
   */
  _createItemElement(query, text, iconType, isSecondary) {
    var element = createElementWithClass('div', 'suggest-box-content-item source-code');
    if (iconType) {
      var icon = UI.Icon.create(iconType, 'suggestion-icon');
      element.appendChild(icon);
    }
    if (isSecondary)
      element.classList.add('secondary');
    element.tabIndex = -1;
    var displayText = text.trimEnd(50 + query.length);
    var index = displayText.toLowerCase().indexOf(query.toLowerCase());
    if (index > 0)
      element.createChild('span').textContent = displayText.substring(0, index);
    if (index > -1)
      element.createChild('span', 'query').textContent = displayText.substring(index, index + query.length);
    element.createChild('span').textContent = displayText.substring(index > -1 ? index + query.length : 0);
    element.__fullValue = text;
    element.createChild('span', 'spacer');
    element.addEventListener('mousedown', this._onItemMouseDown.bind(this), false);
    return element;
  }

  /**
   * @param {!UI.SuggestBox.Suggestions} items
   * @param {string} userEnteredText
   * @param {function(number): !Promise<{detail:string, description:string}>=} asyncDetails
   */
  _updateItems(items, userEnteredText, asyncDetails) {
    this._length = items.length;
    this._asyncDetailsPromises.clear();
    this._asyncDetailsCallback = asyncDetails;
    this._elementList = [];
    delete this._selectedElement;

    this._userEnteredText = userEnteredText;
    this._items = items;
  }

  /**
   * @param {number} index
   * @return {!Promise<?{detail: string, description: string}>}
   */
  _asyncDetails(index) {
    if (!this._asyncDetailsCallback)
      return Promise.resolve(/** @type {?{description: string, detail: string}} */ (null));
    if (!this._asyncDetailsPromises.has(index))
      this._asyncDetailsPromises.set(index, this._asyncDetailsCallback(index));
    return /** @type {!Promise<?{detail: string, description: string}>} */ (this._asyncDetailsPromises.get(index));
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
   * @param {number} index
   */
  _selectItem(index) {
    if (this._selectedElement) {
      this._selectedElement.classList.remove('selected');
      this._selectedElement.classList.remove('force-white-icons');
    }

    this._selectedIndex = index;
    if (index < 0)
      return;

    this._selectedElement = this.itemElement(index);
    this._selectedElement.classList.add('selected');
    this._selectedElement.classList.add('force-white-icons');
    this._detailsPopup.classList.add('hidden');
    var elem = this._selectedElement;
    this._asyncDetails(index).then(showDetails.bind(this), function() {});

    this._viewport.scrollItemIntoView(index);
    this._applySuggestion(true);

    /**
     * @param {?{detail: string, description: string}} details
     * @this {UI.SuggestBox}
     */
    function showDetails(details) {
      if (elem === this._selectedElement)
        this._showDetailsPopup(details);
    }
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

  _ensureRowCountPerViewport() {
    if (this._rowCountPerViewport)
      return;
    if (!this._items.length)
      return;

    this._rowCountPerViewport = Math.floor(this._element.getBoundingClientRect().height / this._rowHeight);
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
      this._updateItems(completions, userEnteredText, asyncDetails);
      this._show();
      this._updateBoxPosition(anchorBox);
      this._updateWidth();
      this._viewport.refresh();
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
      this._selectItem(highestPriorityItem);
      delete this._rowCountPerViewport;
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
    switch (event.key) {
      case 'ArrowUp':
        return this.upKeyPressed();
      case 'ArrowDown':
        return this.downKeyPressed();
      case 'PageUp':
        return this.pageUpKeyPressed();
      case 'PageDown':
        return this.pageDownKeyPressed();
      case 'Enter':
        return this.enterKeyPressed();
    }
    return false;
  }

  /**
   * @return {boolean}
   */
  upKeyPressed() {
    return this._selectClosest(-1, true);
  }

  /**
   * @return {boolean}
   */
  downKeyPressed() {
    return this._selectClosest(1, true);
  }

  /**
   * @return {boolean}
   */
  pageUpKeyPressed() {
    this._ensureRowCountPerViewport();
    return this._selectClosest(-this._rowCountPerViewport, false);
  }

  /**
   * @return {boolean}
   */
  pageDownKeyPressed() {
    this._ensureRowCountPerViewport();
    return this._selectClosest(this._rowCountPerViewport, false);
  }

  /**
   * @return {boolean}
   */
  enterKeyPressed() {
    if (!this._userInteracted && this._captureEnter)
      return false;

    var hasSelectedItem = !!this._selectedElement || this._onlyCompletion;
    this.acceptSuggestion();

    // Report the event as non-handled if there is no selected item,
    // to commit the input or handle it otherwise.
    return hasSelectedItem;
  }

  /**
   * @override
   * @param {number} index
   * @return {number}
   */
  fastItemHeight(index) {
    return this._rowHeight;
  }

  /**
   * @override
   * @return {number}
   */
  itemCount() {
    return this._items.length;
  }

  /**
   * @override
   * @param {number} index
   * @return {?Element}
   */
  itemElement(index) {
    if (!this._elementList[index]) {
      this._elementList[index] = this._createItemElement(
          this._userEnteredText, this._items[index].title, this._items[index].iconType, this._items[index].isSecondary);
    }
    return this._elementList[index];
  }
};

/**
 * @typedef {!Array.<{title: string, iconType: (string|undefined), priority: (number|undefined), isSecondary: (boolean|undefined)}>}
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

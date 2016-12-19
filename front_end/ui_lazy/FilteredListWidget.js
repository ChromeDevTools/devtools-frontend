/*
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
/**
 * @implements {UI.ViewportControl.Provider}
 * @unrestricted
 */
UI.FilteredListWidget = class extends UI.VBox {
  /**
   * @param {!UI.FilteredListWidget.Delegate} delegate
   */
  constructor(delegate) {
    super(true);

    this._renderAsTwoRows = delegate.renderAsTwoRows();

    this.contentElement.classList.add('filtered-list-widget');
    this.contentElement.addEventListener('keydown', this._onKeyDown.bind(this), true);
    if (delegate.renderMonospace())
      this.contentElement.classList.add('monospace');
    this.registerRequiredCSS('ui_lazy/filteredListWidget.css');

    this._promptElement = this.contentElement.createChild('div', 'filtered-list-widget-input');
    this._promptElement.setAttribute('spellcheck', 'false');
    this._promptElement.setAttribute('contenteditable', 'plaintext-only');
    this._prompt = new UI.TextPrompt();
    this._prompt.initialize(() => Promise.resolve([]));
    this._prompt.renderAsBlock();
    var promptProxy = this._prompt.attach(this._promptElement);
    promptProxy.addEventListener('input', this._onInput.bind(this), false);
    promptProxy.classList.add('filtered-list-widget-prompt-element');

    this._filteredItems = [];
    this._viewportControl = new UI.ViewportControl(this);
    this._itemElementsContainer = this._viewportControl.element;
    this._itemElementsContainer.classList.add('container');
    this._itemElementsContainer.addEventListener('click', this._onClick.bind(this), false);
    this.contentElement.appendChild(this._itemElementsContainer);

    this.setDefaultFocusedElement(this._promptElement);

    this._delegate = delegate;
    this._delegate.setRefreshCallback(this._itemsLoaded.bind(this));
    this._itemsLoaded();
    this._updateShowMatchingItems();
    this._viewportControl.refresh();

    /** @typedef {!Array.<!Element>} */
    this._elements = [];
  }

  /**
   * @param {string} query
   * @return {!RegExp}
   */
  static filterRegex(query) {
    const toEscape = String.regexSpecialCharacters();
    var regexString = '';
    for (var i = 0; i < query.length; ++i) {
      var c = query.charAt(i);
      if (toEscape.indexOf(c) !== -1)
        c = '\\' + c;
      if (i)
        regexString += '[^\\0' + c + ']*';
      regexString += c;
    }
    return new RegExp(regexString, 'i');
  }

  showAsDialog() {
    this._dialog = new UI.Dialog();
    this._dialog.setMaxSize(new Size(504, 340));
    this._dialog.setPosition(undefined, 22);
    this.show(this._dialog.element);
    this._dialog.show();
  }

  /**
   * @return {string}
   */
  _value() {
    return this._prompt.text().trim();
  }

  /**
   * @override
   */
  willHide() {
    this._delegate.dispose();
    if (this._filterTimer)
      clearTimeout(this._filterTimer);
  }

  /**
   * @param {!Event} event
   */
  _onEnter(event) {
    event.preventDefault();
    if (!this._delegate.itemCount())
      return;
    var selectedIndex = this._shouldShowMatchingItems() && this._selectedIndexInFiltered < this._filteredItems.length ?
        this._filteredItems[this._selectedIndexInFiltered] :
        null;

    // Detach dialog before allowing delegate to override focus.
    if (this._dialog)
      this._dialog.detach();
    this._delegate.selectItemWithQuery(selectedIndex, this._value());
  }

  _itemsLoaded() {
    if (this._loadTimeout)
      return;
    this._loadTimeout = setTimeout(this._updateAfterItemsLoaded.bind(this), 0);
  }

  _updateAfterItemsLoaded() {
    delete this._loadTimeout;
    this._filterItems();
  }

  /**
   * @param {number} index
   * @return {!Element}
   */
  _createItemElement(index) {
    var itemElement = createElement('div');
    itemElement.className = 'filtered-list-widget-item ' + (this._renderAsTwoRows ? 'two-rows' : 'one-row');
    itemElement._titleElement = itemElement.createChild('div', 'filtered-list-widget-title');
    itemElement._subtitleElement = itemElement.createChild('div', 'filtered-list-widget-subtitle');
    itemElement._subtitleElement.textContent = '\u200B';
    itemElement._index = index;
    this._delegate.renderItem(index, this._value(), itemElement._titleElement, itemElement._subtitleElement);
    return itemElement;
  }

  /**
   * @param {string} query
   */
  setQuery(query) {
    this._prompt.setText(query);
    this._prompt.autoCompleteSoon(true);
    this._scheduleFilter();
  }

  _tabKeyPressed() {
    var userEnteredText = this._prompt.text();
    var completion = this._delegate.autocomplete(userEnteredText);
    this._prompt.setText(completion);
    this._prompt.setDOMSelection(userEnteredText.length, completion.length);
    this._scheduleFilter();
  }

  _itemsFilteredForTest() {
    // Sniffed in tests.
  }

  _filterItems() {
    delete this._filterTimer;
    if (this._scoringTimer) {
      clearTimeout(this._scoringTimer);
      delete this._scoringTimer;
    }

    var query = this._delegate.rewriteQuery(this._value());
    this._query = query;
    var filterRegex = query ? UI.FilteredListWidget.filterRegex(query) : null;

    var oldSelectedAbsoluteIndex =
        this._selectedIndexInFiltered ? this._filteredItems[this._selectedIndexInFiltered] : null;
    var filteredItems = [];
    this._selectedIndexInFiltered = 0;

    var bestScores = [];
    var bestItems = [];
    var bestItemsToCollect = 100;
    var minBestScore = 0;
    var overflowItems = [];

    scoreItems.call(this, 0);

    /**
     * @param {number} a
     * @param {number} b
     * @return {number}
     */
    function compareIntegers(a, b) {
      return b - a;
    }

    /**
     * @param {number} fromIndex
     * @this {UI.FilteredListWidget}
     */
    function scoreItems(fromIndex) {
      var maxWorkItems = 1000;
      var workDone = 0;
      for (var i = fromIndex; i < this._delegate.itemCount() && workDone < maxWorkItems; ++i) {
        // Filter out non-matching items quickly.
        if (filterRegex && !filterRegex.test(this._delegate.itemKeyAt(i)))
          continue;

        // Score item.
        var score = this._delegate.itemScoreAt(i, query);
        if (query)
          workDone++;

        // Find its index in the scores array (earlier elements have bigger scores).
        if (score > minBestScore || bestScores.length < bestItemsToCollect) {
          var index = bestScores.upperBound(score, compareIntegers);
          bestScores.splice(index, 0, score);
          bestItems.splice(index, 0, i);
          if (bestScores.length > bestItemsToCollect) {
            // Best list is too large -> drop last elements.
            overflowItems.push(bestItems.peekLast());
            bestScores.length = bestItemsToCollect;
            bestItems.length = bestItemsToCollect;
          }
          minBestScore = bestScores.peekLast();
        } else {
          filteredItems.push(i);
        }
      }

      // Process everything in chunks.
      if (i < this._delegate.itemCount()) {
        this._scoringTimer = setTimeout(scoreItems.bind(this, i), 0);
        return;
      }
      delete this._scoringTimer;

      this._filteredItems = bestItems.concat(overflowItems).concat(filteredItems);
      for (var i = 0; i < this._filteredItems.length; ++i) {
        if (this._filteredItems[i] === oldSelectedAbsoluteIndex) {
          this._selectedIndexInFiltered = i;
          break;
        }
      }
      this._elements = [];
      this._viewportControl.refresh();
      if (!query)
        this._selectedIndexInFiltered = 0;
      this._updateSelection(this._selectedIndexInFiltered, false);
      this._itemsFilteredForTest();
    }
  }

  /**
   * @return {boolean}
   */
  _shouldShowMatchingItems() {
    return this._delegate.shouldShowMatchingItems(this._value());
  }

  _onInput() {
    this._updateShowMatchingItems();
    this._scheduleFilter();
  }

  _updateShowMatchingItems() {
    var shouldShowMatchingItems = this._shouldShowMatchingItems();
    this._itemElementsContainer.classList.toggle('hidden', !shouldShowMatchingItems);
  }

  /**
   * @return {number}
   */
  _rowsPerViewport() {
    return Math.floor(this._viewportControl.element.clientHeight / this._rowHeight);
  }

  _onKeyDown(event) {
    var newSelectedIndex = this._selectedIndexInFiltered;

    switch (event.keyCode) {
      case UI.KeyboardShortcut.Keys.Down.code:
        if (++newSelectedIndex >= this._filteredItems.length)
          newSelectedIndex = 0;
        this._updateSelection(newSelectedIndex, true);
        event.consume(true);
        break;
      case UI.KeyboardShortcut.Keys.Up.code:
        if (--newSelectedIndex < 0)
          newSelectedIndex = this._filteredItems.length - 1;
        this._updateSelection(newSelectedIndex, false);
        event.consume(true);
        break;
      case UI.KeyboardShortcut.Keys.PageDown.code:
        newSelectedIndex = Math.min(newSelectedIndex + this._rowsPerViewport(), this._filteredItems.length - 1);
        this._updateSelection(newSelectedIndex, true);
        event.consume(true);
        break;
      case UI.KeyboardShortcut.Keys.PageUp.code:
        newSelectedIndex = Math.max(newSelectedIndex - this._rowsPerViewport(), 0);
        this._updateSelection(newSelectedIndex, false);
        event.consume(true);
        break;
      case UI.KeyboardShortcut.Keys.Enter.code:
        this._onEnter(event);
        break;
      case UI.KeyboardShortcut.Keys.Tab.code:
        this._tabKeyPressed();
        break;
      default:
    }
  }

  _scheduleFilter() {
    if (this._filterTimer)
      return;
    this._filterTimer = setTimeout(this._filterItems.bind(this), 0);
  }

  /**
   * @param {number} index
   * @param {boolean} makeLast
   */
  _updateSelection(index, makeLast) {
    if (!this._filteredItems.length)
      return;
    if (this._selectedElement)
      this._selectedElement.classList.remove('selected');
    this._viewportControl.scrollItemIntoView(index, makeLast);
    this._selectedIndexInFiltered = index;
    this._selectedElement = this._elements[index];
    if (this._selectedElement)
      this._selectedElement.classList.add('selected');
  }

  _onClick(event) {
    var itemElement = event.target.enclosingNodeOrSelfWithClass('filtered-list-widget-item');
    if (!itemElement)
      return;

    // Detach dialog before allowing delegate to override focus.
    if (this._dialog)
      this._dialog.detach();
    this._delegate.selectItemWithQuery(itemElement._index, this._value());
  }

  /**
   * @override
   * @return {number}
   */
  itemCount() {
    return this._filteredItems.length;
  }

  /**
   * @override
   * @param {number} index
   * @return {number}
   */
  fastItemHeight(index) {
    if (!this._rowHeight) {
      var delegateIndex = this._filteredItems[index];
      var element = this._createItemElement(delegateIndex);
      this._rowHeight = UI.measurePreferredSize(element, this._itemElementsContainer).height;
    }
    return this._rowHeight;
  }

  /**
   * @override
   * @param {number} index
   * @return {!Element}
   */
  itemElement(index) {
    if (!this._elements[index])
      this._elements[index] = this._createItemElement(this._filteredItems[index]);
    return this._elements[index];
  }
};


/**
 * @unrestricted
 */
UI.FilteredListWidget.Delegate = class {
  /**
   * @param {!Array<string>} promptHistory
   */
  constructor(promptHistory) {
    this._promptHistory = promptHistory;
  }

  /**
   * @param {function():void} refreshCallback
   */
  setRefreshCallback(refreshCallback) {
    this._refreshCallback = refreshCallback;
  }

  /**
   * @param {string} query
   * @return {boolean}
   */
  shouldShowMatchingItems(query) {
    return true;
  }

  /**
   * @return {number}
   */
  itemCount() {
    return 0;
  }

  /**
   * @param {number} itemIndex
   * @return {string}
   */
  itemKeyAt(itemIndex) {
    return '';
  }

  /**
   * @param {number} itemIndex
   * @param {string} query
   * @return {number}
   */
  itemScoreAt(itemIndex, query) {
    return 1;
  }

  /**
   * @param {number} itemIndex
   * @param {string} query
   * @param {!Element} titleElement
   * @param {!Element} subtitleElement
   */
  renderItem(itemIndex, query, titleElement, subtitleElement) {
  }

  /**
   * @param {!Element} element
   * @param {string} query
   * @return {boolean}
   */
  highlightRanges(element, query) {
    if (!query)
      return false;

    /**
     * @param {string} text
     * @param {string} query
     * @return {?Array.<!Common.SourceRange>}
     */
    function rangesForMatch(text, query) {
      var opcodes = Diff.Diff.charDiff(query, text);
      var offset = 0;
      var ranges = [];
      for (var i = 0; i < opcodes.length; ++i) {
        var opcode = opcodes[i];
        if (opcode[0] === Diff.Diff.Operation.Equal)
          ranges.push(new Common.SourceRange(offset, opcode[1].length));
        else if (opcode[0] !== Diff.Diff.Operation.Insert)
          return null;
        offset += opcode[1].length;
      }
      return ranges;
    }

    var text = element.textContent;
    var ranges = rangesForMatch(text, query);
    if (!ranges || !this.caseSensitive())
      ranges = rangesForMatch(text.toUpperCase(), query.toUpperCase());
    if (ranges) {
      UI.highlightRangesWithStyleClass(element, ranges, 'highlight');
      return true;
    }
    return false;
  }

  /**
   * @return {boolean}
   */
  caseSensitive() {
    return true;
  }

  /**
   * @return {boolean}
   */
  renderMonospace() {
    return true;
  }

  /**
   * @return {boolean}
   */
  renderAsTwoRows() {
    return false;
  }

  /**
   * @param {number} itemIndex
   * @param {string} promptValue
   */
  selectItemWithQuery(itemIndex, promptValue) {
    this._promptHistory.push(promptValue);
    if (this._promptHistory.length > 100)
      this._promptHistory.shift();
    this.selectItem(itemIndex, promptValue);
  }

  /**
   * @param {number} itemIndex
   * @param {string} promptValue
   */
  selectItem(itemIndex, promptValue) {
  }

  refresh() {
    this._refreshCallback();
  }

  /**
   * @param {string} query
   * @return {string}
   */
  rewriteQuery(query) {
    return query;
  }

  /**
   * @param {string} query
   * @return {string}
   */
  autocomplete(query) {
    for (var i = this._promptHistory.length - 1; i >= 0; i--) {
      if (this._promptHistory[i] !== query && this._promptHistory[i].startsWith(query))
        return this._promptHistory[i];
    }
    return query;
  }

  dispose() {
  }
};

/*
 * Copyright (c) 2012 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
/**
 * @unrestricted
 * @implements {UI.ListDelegate}
 */
QuickOpen.FilteredListWidget = class extends UI.VBox {
  /**
   * @param {!QuickOpen.FilteredListWidget.Delegate} delegate
   * @param {!Array<string>=} promptHistory
   */
  constructor(delegate, promptHistory) {
    super(true);
    this._promptHistory = promptHistory || [];
    this._renderAsTwoRows = delegate.renderAsTwoRows();

    this.contentElement.classList.add('filtered-list-widget');
    this.contentElement.addEventListener('keydown', this._onKeyDown.bind(this), true);
    this.registerRequiredCSS('quick_open/filteredListWidget.css');

    this._promptElement = this.contentElement.createChild('div', 'filtered-list-widget-input');
    this._promptElement.setAttribute('spellcheck', 'false');
    this._promptElement.setAttribute('contenteditable', 'plaintext-only');
    this._prompt = new UI.TextPrompt();
    this._prompt.initialize(() => Promise.resolve([]));
    this._prompt.renderAsBlock();
    var promptProxy = this._prompt.attach(this._promptElement);
    promptProxy.addEventListener('input', this._onInput.bind(this), false);
    promptProxy.classList.add('filtered-list-widget-prompt-element');

    this._bottomElementsContainer = this.contentElement.createChild('div', 'vbox');
    this._progressElement = this._bottomElementsContainer.createChild('div', 'filtered-list-widget-progress');
    this._progressBarElement = this._progressElement.createChild('div', 'filtered-list-widget-progress-bar');

    /** @type {!UI.ListControl<number>} */
    this._list = new UI.ListControl(this, UI.ListMode.EqualHeightItems);
    this._itemElementsContainer = this._list.element;
    this._itemElementsContainer.classList.add('container');
    this._bottomElementsContainer.appendChild(this._itemElementsContainer);

    if (delegate.renderMonospace()) {
      this._list.element.classList.add('monospace');
      this._promptElement.classList.add('monospace');
    }

    this._notFoundElement = this._bottomElementsContainer.createChild('div', 'not-found-text');
    this._notFoundElement.classList.add('hidden');

    this.setDefaultFocusedElement(this._promptElement);

    this._delegate = delegate;
    this._delegate.setRefreshCallback(this._itemsLoaded.bind(this));
    this._itemsLoaded();
    this._updateShowMatchingItems();
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

  /**
   * @param {!Element} element
   * @param {string} query
   * @param {boolean=} caseInsensitive
   * @return {boolean}
   */
  static highlightRanges(element, query, caseInsensitive) {
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
    if (!ranges || caseInsensitive)
      ranges = rangesForMatch(text.toUpperCase(), query.toUpperCase());
    if (ranges) {
      UI.highlightRangesWithStyleClass(element, ranges, 'highlight');
      return true;
    }
    return false;
  }

  showAsDialog() {
    this._dialog = new UI.Dialog();
    this._dialog.setMaxContentSize(new UI.Size(504, 340));
    this._dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.SetMaxHeight);
    this._dialog.setContentPosition(null, 22);
    this.show(this._dialog.contentElement);
    this._dialog.show();
    this._updateShowMatchingItems();
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
  wasShown() {
    this._list.invalidateItemHeight();
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
    var selectedIndexInDelegate = this._shouldShowMatchingItems() ? this._list.selectedItem() : null;

    // Detach dialog before allowing delegate to override focus.
    if (this._dialog)
      this._dialog.hide();
    this._selectItemWithQuery(selectedIndexInDelegate, this._value());
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
   * @override
   * @param {number} item
   * @return {!Element}
   */
  createElementForItem(item) {
    var itemElement = createElement('div');
    itemElement.className = 'filtered-list-widget-item ' + (this._renderAsTwoRows ? 'two-rows' : 'one-row');
    var titleElement = itemElement.createChild('div', 'filtered-list-widget-title');
    var subtitleElement = itemElement.createChild('div', 'filtered-list-widget-subtitle');
    subtitleElement.textContent = '\u200B';
    this._delegate.renderItem(item, this._value(), titleElement, subtitleElement);
    itemElement.addEventListener('click', event => {
      event.consume(true);
      // Detach dialog before allowing delegate to override focus.
      if (this._dialog)
        this._dialog.hide();
      this._selectItemWithQuery(item, this._value());
    }, false);
    return itemElement;
  }

  /**
   * @override
   * @param {number} item
   * @return {number}
   */
  heightForItem(item) {
    // Let the list measure items for us.
    return 0;
  }

  /**
   * @override
   * @param {number} item
   * @return {boolean}
   */
  isItemSelectable(item) {
    return true;
  }

  /**
   * @override
   * @param {?number} from
   * @param {?number} to
   * @param {?Element} fromElement
   * @param {?Element} toElement
   */
  selectedItemChanged(from, to, fromElement, toElement) {
    if (fromElement)
      fromElement.classList.remove('selected');
    if (toElement)
      toElement.classList.add('selected');
  }

  /**
   * @param {string} query
   */
  setQuery(query) {
    this._prompt.setText(query);
    this._prompt.autoCompleteSoon(true);
    this._scheduleFilter();
    this._updateShowMatchingItems();
  }

  _tabKeyPressed() {
    var userEnteredText = this._prompt.text();
    var completion;
    for (var i = this._promptHistory.length - 1; i >= 0; i--) {
      if (this._promptHistory[i] !== userEnteredText && this._promptHistory[i].startsWith(userEnteredText)) {
        completion = this._promptHistory[i];
        break;
      }
    }
    if (!completion)
      return;
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

      if (this._refreshListWithCurrentResult)
        this._refreshListWithCurrentResult();
    }

    this._progressBarElement.style.transform = 'scaleX(0)';
    this._progressBarElement.classList.remove('filtered-widget-progress-fade');
    this._progressBarElement.classList.remove('hidden');

    var query = this._delegate.rewriteQuery(this._value());
    this._query = query;

    var filterRegex = query ? QuickOpen.FilteredListWidget.filterRegex(query) : null;

    var filteredItems = [];

    var bestScores = [];
    var bestItems = [];
    var bestItemsToCollect = 100;
    var minBestScore = 0;
    var overflowItems = [];
    var scoreStartTime = window.performance.now();

    var maxWorkItems = Number.constrain(10, 500, (this._delegate.itemCount() / 10) | 0);

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
     * @this {QuickOpen.FilteredListWidget}
     */
    function scoreItems(fromIndex) {
      delete this._scoringTimer;
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

      this._refreshListWithCurrentResult = this._refreshList.bind(this, bestItems, overflowItems, filteredItems);

      // Process everything in chunks.
      if (i < this._delegate.itemCount()) {
        this._scoringTimer = setTimeout(scoreItems.bind(this, i), 0);
        if (window.performance.now() - scoreStartTime > 50)
          this._progressBarElement.style.transform = 'scaleX(' + i / this._delegate.itemCount() + ')';
        return;
      }
      if (window.performance.now() - scoreStartTime > 100) {
        this._progressBarElement.style.transform = 'scaleX(1)';
        this._progressBarElement.classList.add('filtered-widget-progress-fade');
      } else {
        this._progressBarElement.classList.add('hidden');
      }
      this._refreshListWithCurrentResult();
    }
  }

  /**
   * @param {!Array<number>} bestItems
   * @param {!Array<number>} overflowItems
   * @param {!Array<number>} filteredItems
   */
  _refreshList(bestItems, overflowItems, filteredItems) {
    delete this._refreshListWithCurrentResult;
    filteredItems = [].concat(bestItems, overflowItems, filteredItems);
    this._updateNotFoundMessage(!!filteredItems.length);
    var oldHeight = this._list.element.offsetHeight;
    this._list.replaceAllItems(filteredItems);
    if (filteredItems.length)
      this._list.selectItem(filteredItems[0]);
    if (this._list.element.offsetHeight !== oldHeight)
      this._list.viewportResized();
    this._itemsFilteredForTest();
  }

  /**
   * @param {boolean} hasItems
   */
  _updateNotFoundMessage(hasItems) {
    this._list.element.classList.toggle('hidden', !hasItems);
    this._notFoundElement.classList.toggle('hidden', hasItems);
    if (!hasItems)
      this._notFoundElement.textContent = this._delegate.notFoundText();
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
    this._bottomElementsContainer.classList.toggle('hidden', !shouldShowMatchingItems);
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    var handled = false;
    switch (event.key) {
      case 'Enter':
        this._onEnter(event);
        return;
      case 'Tab':
        this._tabKeyPressed();
        return;
      case 'ArrowUp':
        handled = this._list.selectPreviousItem(true, false);
        break;
      case 'ArrowDown':
        handled = this._list.selectNextItem(true, false);
        break;
      case 'PageUp':
        handled = this._list.selectItemPreviousPage(false);
        break;
      case 'PageDown':
        handled = this._list.selectItemNextPage(false);
        break;
    }
    if (handled)
      event.consume(true);
  }

  _scheduleFilter() {
    if (this._filterTimer)
      return;
    this._filterTimer = setTimeout(this._filterItems.bind(this), 0);
  }

  /**
   * @param {?number} itemIndex
   * @param {string} promptValue
   */
  _selectItemWithQuery(itemIndex, promptValue) {
    this._promptHistory.push(promptValue);
    if (this._promptHistory.length > 100)
      this._promptHistory.shift();
    this._delegate.selectItem(itemIndex, promptValue);
  }
};


/**
 * @unrestricted
 */
QuickOpen.FilteredListWidget.Delegate = class {
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
   * @param {?number} itemIndex
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
   * @return {string}
   */
  notFoundText() {
    return Common.UIString('No results found');
  }

  dispose() {
  }
};

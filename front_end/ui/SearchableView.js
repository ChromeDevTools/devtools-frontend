/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2007 Matt Lilek (pewtermoose@gmail.com).
 * Copyright (C) 2009 Joseph Pecoraro
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
UI.SearchableView = class extends UI.VBox {
  /**
   * @param {!UI.Searchable} searchable
   * @param {string=} settingName
   */
  constructor(searchable, settingName) {
    super(true);
    this.registerRequiredCSS('ui/searchableView.css');
    this.element[UI.SearchableView._symbol] = this;

    this._searchProvider = searchable;
    this._setting = settingName ? Common.settings.createSetting(settingName, {}) : null;

    this.contentElement.createChild('content');
    this._footerElementContainer = this.contentElement.createChild('div', 'search-bar hidden');
    this._footerElementContainer.style.order = 100;

    var toolbar = new UI.Toolbar('search-toolbar', this._footerElementContainer);

    if (this._searchProvider.supportsCaseSensitiveSearch()) {
      this._caseSensitiveButton = new UI.ToolbarToggle(Common.UIString('Case sensitive'), '');
      this._caseSensitiveButton.setText('Aa');
      this._caseSensitiveButton.addEventListener(UI.ToolbarButton.Events.Click, this._toggleCaseSensitiveSearch, this);
      toolbar.appendToolbarItem(this._caseSensitiveButton);
    }

    if (this._searchProvider.supportsRegexSearch()) {
      this._regexButton = new UI.ToolbarToggle(Common.UIString('Regex'), '');
      this._regexButton.setText('.*');
      this._regexButton.addEventListener(UI.ToolbarButton.Events.Click, this._toggleRegexSearch, this);
      toolbar.appendToolbarItem(this._regexButton);
    }

    this._footerElement = this._footerElementContainer.createChild('table', 'toolbar-search');
    this._footerElement.cellSpacing = 0;

    this._firstRowElement = this._footerElement.createChild('tr');
    this._secondRowElement = this._footerElement.createChild('tr', 'hidden');

    // Column 1
    var searchControlElementColumn = this._firstRowElement.createChild('td');
    this._searchControlElement = searchControlElementColumn.createChild('span', 'toolbar-search-control');

    this._searchInputElement = UI.HistoryInput.create();
    this._searchInputElement.classList.add('search-replace');
    this._searchControlElement.appendChild(this._searchInputElement);

    this._searchInputElement.id = 'search-input-field';
    this._searchInputElement.placeholder = Common.UIString('Find');

    this._matchesElement = this._searchControlElement.createChild('label', 'search-results-matches');
    this._matchesElement.setAttribute('for', 'search-input-field');

    this._searchNavigationElement = this._searchControlElement.createChild('div', 'toolbar-search-navigation-controls');

    this._searchNavigationPrevElement =
        this._searchNavigationElement.createChild('div', 'toolbar-search-navigation toolbar-search-navigation-prev');
    this._searchNavigationPrevElement.addEventListener('click', this._onPrevButtonSearch.bind(this), false);
    this._searchNavigationPrevElement.title = Common.UIString('Search Previous');

    this._searchNavigationNextElement =
        this._searchNavigationElement.createChild('div', 'toolbar-search-navigation toolbar-search-navigation-next');
    this._searchNavigationNextElement.addEventListener('click', this._onNextButtonSearch.bind(this), false);
    this._searchNavigationNextElement.title = Common.UIString('Search Next');

    this._searchInputElement.addEventListener('keydown', this._onSearchKeyDown.bind(this), true);
    this._searchInputElement.addEventListener('input', this._onInput.bind(this), false);

    this._replaceInputElement =
        this._secondRowElement.createChild('td').createChild('input', 'search-replace toolbar-replace-control');
    this._replaceInputElement.addEventListener('keydown', this._onReplaceKeyDown.bind(this), true);
    this._replaceInputElement.placeholder = Common.UIString('Replace');

    // Column 2
    this._findButtonElement =
        this._firstRowElement.createChild('td').createChild('button', 'search-action-button hidden');
    this._findButtonElement.textContent = Common.UIString('Find');
    this._findButtonElement.tabIndex = -1;
    this._findButtonElement.addEventListener('click', this._onFindClick.bind(this), false);

    this._replaceButtonElement = this._secondRowElement.createChild('td').createChild('button', 'search-action-button');
    this._replaceButtonElement.textContent = Common.UIString('Replace');
    this._replaceButtonElement.disabled = true;
    this._replaceButtonElement.tabIndex = -1;
    this._replaceButtonElement.addEventListener('click', this._replace.bind(this), false);

    // Column 3
    this._prevButtonElement =
        this._firstRowElement.createChild('td').createChild('button', 'search-action-button hidden');
    this._prevButtonElement.textContent = Common.UIString('Previous');
    this._prevButtonElement.tabIndex = -1;
    this._prevButtonElement.addEventListener('click', this._onPreviousClick.bind(this), false);

    this._replaceAllButtonElement =
        this._secondRowElement.createChild('td').createChild('button', 'search-action-button');
    this._replaceAllButtonElement.textContent = Common.UIString('Replace All');
    this._replaceAllButtonElement.addEventListener('click', this._replaceAll.bind(this), false);

    // Column 4
    this._replaceElement = this._firstRowElement.createChild('td').createChild('span');

    this._replaceLabelElement = UI.createCheckboxLabel(Common.UIString('Replace'));
    this._replaceCheckboxElement = this._replaceLabelElement.checkboxElement;
    this._uniqueId = ++UI.SearchableView._lastUniqueId;
    var replaceCheckboxId = 'search-replace-trigger' + this._uniqueId;
    this._replaceCheckboxElement.id = replaceCheckboxId;
    this._replaceCheckboxElement.addEventListener('change', this._updateSecondRowVisibility.bind(this), false);

    this._replaceElement.appendChild(this._replaceLabelElement);

    // Column 5
    var cancelButtonElement = this._firstRowElement.createChild('td').createChild('button', 'search-action-button');
    cancelButtonElement.textContent = Common.UIString('Cancel');
    cancelButtonElement.tabIndex = -1;
    cancelButtonElement.addEventListener('click', this.closeSearch.bind(this), false);
    this._minimalSearchQuerySize = 3;

    this._loadSetting();
  }

  /**
   * @param {?Element} element
   * @return {?UI.SearchableView}
   */
  static fromElement(element) {
    var view = null;
    while (element && !view) {
      view = element[UI.SearchableView._symbol];
      element = element.parentElementOrShadowHost();
    }
    return view;
  }

  _toggleCaseSensitiveSearch() {
    this._caseSensitiveButton.setToggled(!this._caseSensitiveButton.toggled());
    this._saveSetting();
    this._performSearch(false, true);
  }

  _toggleRegexSearch() {
    this._regexButton.setToggled(!this._regexButton.toggled());
    this._saveSetting();
    this._performSearch(false, true);
  }

  _saveSetting() {
    if (!this._setting)
      return;
    var settingValue = this._setting.get() || {};
    settingValue.caseSensitive = this._caseSensitiveButton.toggled();
    settingValue.isRegex = this._regexButton.toggled();
    this._setting.set(settingValue);
  }

  _loadSetting() {
    var settingValue = this._setting ? (this._setting.get() || {}) : {};
    if (this._searchProvider.supportsCaseSensitiveSearch())
      this._caseSensitiveButton.setToggled(!!settingValue.caseSensitive);
    if (this._searchProvider.supportsRegexSearch())
      this._regexButton.setToggled(!!settingValue.isRegex);
  }

  /**
   * @param {number} minimalSearchQuerySize
   */
  setMinimalSearchQuerySize(minimalSearchQuerySize) {
    this._minimalSearchQuerySize = minimalSearchQuerySize;
  }

  /**
   * @param {string} placeholder
   */
  setPlaceholder(placeholder) {
    this._searchInputElement.placeholder = placeholder;
  }

  /**
   * @param {boolean} replaceable
   */
  setReplaceable(replaceable) {
    this._replaceable = replaceable;
  }

  /**
   * @param {number} matches
   */
  updateSearchMatchesCount(matches) {
    this._searchProvider.currentSearchMatches = matches;
    this._updateSearchMatchesCountAndCurrentMatchIndex(this._searchProvider.currentQuery ? matches : 0, -1);
  }

  /**
   * @param {number} currentMatchIndex
   */
  updateCurrentMatchIndex(currentMatchIndex) {
    this._updateSearchMatchesCountAndCurrentMatchIndex(this._searchProvider.currentSearchMatches, currentMatchIndex);
  }

  /**
   * @return {boolean}
   */
  isSearchVisible() {
    return this._searchIsVisible;
  }

  closeSearch() {
    this.cancelSearch();
    if (this._footerElementContainer.hasFocus())
      this.focus();
  }

  _toggleSearchBar(toggled) {
    this._footerElementContainer.classList.toggle('hidden', !toggled);
    this.doResize();
  }

  cancelSearch() {
    if (!this._searchIsVisible)
      return;
    this.resetSearch();
    delete this._searchIsVisible;
    this._toggleSearchBar(false);
  }

  resetSearch() {
    this._clearSearch();
    this._updateReplaceVisibility();
    this._matchesElement.textContent = '';
  }

  refreshSearch() {
    if (!this._searchIsVisible)
      return;
    this.resetSearch();
    this._performSearch(false, false);
  }

  /**
   * @return {boolean}
   */
  handleFindNextShortcut() {
    if (!this._searchIsVisible)
      return false;
    this._searchProvider.jumpToNextSearchResult();
    return true;
  }

  /**
   * @return {boolean}
   */
  handleFindPreviousShortcut() {
    if (!this._searchIsVisible)
      return false;
    this._searchProvider.jumpToPreviousSearchResult();
    return true;
  }

  /**
   * @return {boolean}
   */
  handleFindShortcut() {
    this.showSearchField();
    return true;
  }

  /**
   * @return {boolean}
   */
  handleCancelSearchShortcut() {
    if (!this._searchIsVisible)
      return false;
    this.closeSearch();
    return true;
  }

  /**
   * @param {boolean} enabled
   */
  _updateSearchNavigationButtonState(enabled) {
    this._replaceButtonElement.disabled = !enabled;
    if (enabled) {
      this._searchNavigationPrevElement.classList.add('enabled');
      this._searchNavigationNextElement.classList.add('enabled');
    } else {
      this._searchNavigationPrevElement.classList.remove('enabled');
      this._searchNavigationNextElement.classList.remove('enabled');
    }
  }

  /**
   * @param {number} matches
   * @param {number} currentMatchIndex
   */
  _updateSearchMatchesCountAndCurrentMatchIndex(matches, currentMatchIndex) {
    if (!this._currentQuery)
      this._matchesElement.textContent = '';
    else if (matches === 0 || currentMatchIndex >= 0)
      this._matchesElement.textContent = Common.UIString('%d of %d', currentMatchIndex + 1, matches);
    else if (matches === 1)
      this._matchesElement.textContent = Common.UIString('1 match');
    else
      this._matchesElement.textContent = Common.UIString('%d matches', matches);
    this._updateSearchNavigationButtonState(matches > 0);
  }

  showSearchField() {
    if (this._searchIsVisible)
      this.cancelSearch();

    var queryCandidate;
    if (!this._searchInputElement.hasFocus()) {
      var selection = UI.inspectorView.element.window().getSelection();
      if (selection.rangeCount)
        queryCandidate = selection.toString().replace(/\r?\n.*/, '');
    }

    this._toggleSearchBar(true);
    this._updateReplaceVisibility();
    if (queryCandidate)
      this._searchInputElement.value = queryCandidate;
    this._performSearch(false, false);
    this._searchInputElement.focus();
    this._searchInputElement.select();
    this._searchIsVisible = true;
  }

  _updateReplaceVisibility() {
    this._replaceElement.classList.toggle('hidden', !this._replaceable);
    if (!this._replaceable) {
      this._replaceCheckboxElement.checked = false;
      this._updateSecondRowVisibility();
    }
  }

  /**
   * @param {!Event} event
   */
  _onSearchKeyDown(event) {
    if (isEscKey(event)) {
      this.closeSearch();
      event.consume(true);
      return;
    }
    if (!isEnterKey(event))
      return;

    if (!this._currentQuery)
      this._performSearch(true, true, event.shiftKey);
    else
      this._jumpToNextSearchResult(event.shiftKey);
  }

  /**
   * @param {!Event} event
   */
  _onReplaceKeyDown(event) {
    if (isEnterKey(event))
      this._replace();
  }

  /**
   * @param {boolean=} isBackwardSearch
   */
  _jumpToNextSearchResult(isBackwardSearch) {
    if (!this._currentQuery || !this._searchNavigationPrevElement.classList.contains('enabled'))
      return;

    if (isBackwardSearch)
      this._searchProvider.jumpToPreviousSearchResult();
    else
      this._searchProvider.jumpToNextSearchResult();
  }

  _onNextButtonSearch(event) {
    if (!this._searchNavigationNextElement.classList.contains('enabled'))
      return;
    this._jumpToNextSearchResult();
    this._searchInputElement.focus();
  }

  _onPrevButtonSearch(event) {
    if (!this._searchNavigationPrevElement.classList.contains('enabled'))
      return;
    this._jumpToNextSearchResult(true);
    this._searchInputElement.focus();
  }

  _onFindClick(event) {
    if (!this._currentQuery)
      this._performSearch(true, true);
    else
      this._jumpToNextSearchResult();
    this._searchInputElement.focus();
  }

  _onPreviousClick(event) {
    if (!this._currentQuery)
      this._performSearch(true, true, true);
    else
      this._jumpToNextSearchResult(true);
    this._searchInputElement.focus();
  }

  _clearSearch() {
    delete this._currentQuery;
    if (!!this._searchProvider.currentQuery) {
      delete this._searchProvider.currentQuery;
      this._searchProvider.searchCanceled();
    }
    this._updateSearchMatchesCountAndCurrentMatchIndex(0, -1);
  }

  /**
   * @param {boolean} forceSearch
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  _performSearch(forceSearch, shouldJump, jumpBackwards) {
    var query = this._searchInputElement.value;
    if (!query || (!forceSearch && query.length < this._minimalSearchQuerySize && !this._currentQuery)) {
      this._clearSearch();
      return;
    }

    this._currentQuery = query;
    this._searchProvider.currentQuery = query;

    var searchConfig = this._currentSearchConfig();
    this._searchProvider.performSearch(searchConfig, shouldJump, jumpBackwards);
  }

  /**
   * @return {!UI.SearchableView.SearchConfig}
   */
  _currentSearchConfig() {
    var query = this._searchInputElement.value;
    var caseSensitive = this._caseSensitiveButton ? this._caseSensitiveButton.toggled() : false;
    var isRegex = this._regexButton ? this._regexButton.toggled() : false;
    return new UI.SearchableView.SearchConfig(query, caseSensitive, isRegex);
  }

  _updateSecondRowVisibility() {
    var secondRowVisible = this._replaceCheckboxElement.checked;
    this._footerElementContainer.classList.toggle('replaceable', secondRowVisible);
    this._footerElement.classList.toggle('toolbar-search-replace', secondRowVisible);
    this._secondRowElement.classList.toggle('hidden', !secondRowVisible);
    this._prevButtonElement.classList.toggle('hidden', !secondRowVisible);
    this._findButtonElement.classList.toggle('hidden', !secondRowVisible);
    this._replaceCheckboxElement.tabIndex = secondRowVisible ? -1 : 0;

    if (secondRowVisible)
      this._replaceInputElement.focus();
    else
      this._searchInputElement.focus();
    this.doResize();
  }

  _replace() {
    var searchConfig = this._currentSearchConfig();
    /** @type {!UI.Replaceable} */ (this._searchProvider)
        .replaceSelectionWith(searchConfig, this._replaceInputElement.value);
    delete this._currentQuery;
    this._performSearch(true, true);
  }

  _replaceAll() {
    var searchConfig = this._currentSearchConfig();
    /** @type {!UI.Replaceable} */ (this._searchProvider).replaceAllWith(searchConfig, this._replaceInputElement.value);
  }

  /**
   * @param {!Event} event
   */
  _onInput(event) {
    if (this._valueChangedTimeoutId)
      clearTimeout(this._valueChangedTimeoutId);
    var timeout = this._searchInputElement.value.length < 3 ? 200 : 0;
    this._valueChangedTimeoutId = setTimeout(this._onValueChanged.bind(this), timeout);
  }

  _onValueChanged() {
    if (!this._searchIsVisible)
      return;
    delete this._valueChangedTimeoutId;
    this._performSearch(false, true);
  }
};

UI.SearchableView._lastUniqueId = 0;

UI.SearchableView._symbol = Symbol('searchableView');


/**
 * @interface
 */
UI.Searchable = function() {};

UI.Searchable.prototype = {
  searchCanceled() {},

  /**
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  performSearch(searchConfig, shouldJump, jumpBackwards) {},

  jumpToNextSearchResult() {},

  jumpToPreviousSearchResult() {},

  /**
   * @return {boolean}
   */
  supportsCaseSensitiveSearch() {},

  /**
   * @return {boolean}
   */
  supportsRegexSearch() {}
};

/**
 * @interface
 */
UI.Replaceable = function() {};

UI.Replaceable.prototype = {
  /**
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {string} replacement
   */
  replaceSelectionWith(searchConfig, replacement) {},

  /**
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {string} replacement
   */
  replaceAllWith(searchConfig, replacement) {}
};

/**
 * @unrestricted
 */
UI.SearchableView.SearchConfig = class {
  /**
   * @param {string} query
   * @param {boolean} caseSensitive
   * @param {boolean} isRegex
   */
  constructor(query, caseSensitive, isRegex) {
    this.query = query;
    this.caseSensitive = caseSensitive;
    this.isRegex = isRegex;
  }

  /**
   * @param {boolean=} global
   * @return {!RegExp}
   */
  toSearchRegex(global) {
    var modifiers = this.caseSensitive ? '' : 'i';
    if (global)
      modifiers += 'g';
    var query = this.isRegex ? '/' + this.query + '/' : this.query;

    var regex;

    // First try creating regex if user knows the / / hint.
    try {
      if (/^\/.+\/$/.test(query)) {
        regex = new RegExp(query.substring(1, query.length - 1), modifiers);
        regex.__fromRegExpQuery = true;
      }
    } catch (e) {
      // Silent catch.
    }

    // Otherwise just do a plain text search.
    if (!regex)
      regex = createPlainTextSearchRegex(query, modifiers);

    return regex;
  }
};

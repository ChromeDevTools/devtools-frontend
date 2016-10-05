// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.AdvancedSearchView = function() {
  WebInspector.VBox.call(this, true);
  this.setMinimumSize(0, 40);
  this.registerRequiredCSS('sources/sourcesSearch.css');

  this._searchId = 0;

  this.contentElement.classList.add('search-view');

  this._searchPanelElement = this.contentElement.createChild('div', 'search-drawer-header');
  this._searchPanelElement.addEventListener('keydown', this._onKeyDown.bind(this), false);
  this._searchPanelElement.addEventListener('input', this._onInput.bind(this), false);

  this._searchResultsElement = this.contentElement.createChild('div');
  this._searchResultsElement.className = 'search-results';

  this._search = WebInspector.HistoryInput.create();
  this._searchPanelElement.appendChild(this._search);
  this._search.placeholder =
      WebInspector.UIString('Search all sources (use "file:" to filter by path)\u200e');
  this._search.setAttribute('type', 'text');
  this._search.classList.add('search-config-search');
  this._search.setAttribute('results', '0');
  this._search.setAttribute('size', 42);

  this._searchPanelElement.createChild('div', 'search-icon');
  this._searchInputClearElement =
      this._searchPanelElement.createChild('div', 'search-cancel-button');
  this._searchInputClearElement.hidden = true;
  this._searchInputClearElement.addEventListener(
      'click', this._onSearchInputClear.bind(this), false);

  this._ignoreCaseLabel = createCheckboxLabel(WebInspector.UIString('Ignore case'));
  this._ignoreCaseLabel.classList.add('search-config-label');
  this._searchPanelElement.appendChild(this._ignoreCaseLabel);
  this._ignoreCaseCheckbox = this._ignoreCaseLabel.checkboxElement;
  this._ignoreCaseCheckbox.classList.add('search-config-checkbox');

  this._regexLabel = createCheckboxLabel(WebInspector.UIString('Regular expression'));
  this._regexLabel.classList.add('search-config-label');
  this._searchPanelElement.appendChild(this._regexLabel);
  this._regexCheckbox = this._regexLabel.checkboxElement;
  this._regexCheckbox.classList.add('search-config-checkbox');

  this._searchToolbarElement = this.contentElement.createChild('div', 'search-toolbar-summary');
  this._searchMessageElement = this._searchToolbarElement.createChild('div', 'search-message');
  this._searchProgressPlaceholderElement =
      this._searchToolbarElement.createChild('div', 'flex-centered');
  this._searchResultsMessageElement =
      this._searchToolbarElement.createChild('div', 'search-message');

  this._advancedSearchConfig = WebInspector.settings.createLocalSetting(
      'advancedSearchConfig', new WebInspector.SearchConfig('', true, false).toPlainObject());
  this._load();
  /** @type {!WebInspector.SearchScope} */
  this._searchScope = new WebInspector.SourcesSearchScope();
};

WebInspector.AdvancedSearchView.prototype = {
  /**
     * @return {!WebInspector.SearchConfig}
     */
  _buildSearchConfig: function() {
    return new WebInspector.SearchConfig(
        this._search.value, this._ignoreCaseCheckbox.checked, this._regexCheckbox.checked);
  },

  /**
   * @param {string} queryCandidate
   */
  _toggle: function(queryCandidate) {
    if (queryCandidate)
      this._search.value = queryCandidate;

    if (this.isShowing())
      this.focus();
    else
      this._focusOnShow = true;

    this._startIndexing();
  },

  wasShown: function() {
    if (this._focusOnShow) {
      this.focus();
      delete this._focusOnShow;
    }
  },

  _onIndexingFinished: function() {
    var finished = !this._progressIndicator.isCanceled();
    this._progressIndicator.done();
    delete this._progressIndicator;
    delete this._isIndexing;
    this._indexingFinished(finished);
    if (!finished)
      delete this._pendingSearchConfig;
    if (!this._pendingSearchConfig)
      return;
    var searchConfig = this._pendingSearchConfig;
    delete this._pendingSearchConfig;
    this._innerStartSearch(searchConfig);
  },

  _startIndexing: function() {
    this._isIndexing = true;
    if (this._progressIndicator)
      this._progressIndicator.done();
    this._progressIndicator = new WebInspector.ProgressIndicator();
    this._searchMessageElement.textContent = WebInspector.UIString('Indexing\u2026');
    this._progressIndicator.show(this._searchProgressPlaceholderElement);
    this._searchScope.performIndexing(new WebInspector.ProgressProxy(
        this._progressIndicator, this._onIndexingFinished.bind(this)));
  },

  _onSearchInputClear: function() {
    this._search.value = '';
    this.focus();
    this._searchInputClearElement.hidden = true;
  },

  /**
   * @param {number} searchId
   * @param {!WebInspector.FileBasedSearchResult} searchResult
   */
  _onSearchResult: function(searchId, searchResult) {
    if (searchId !== this._searchId || !this._progressIndicator)
      return;
    if (this._progressIndicator && this._progressIndicator.isCanceled()) {
      this._onIndexingFinished();
      return;
    }
    this._addSearchResult(searchResult);
    if (!searchResult.searchMatches.length)
      return;
    if (!this._searchResultsPane)
      this._searchResultsPane = this._searchScope.createSearchResultsPane(this._searchConfig);
    this._resetResults();
    this._searchResultsElement.appendChild(this._searchResultsPane.element);
    this._searchResultsPane.addSearchResult(searchResult);
  },

  /**
   * @param {number} searchId
   * @param {boolean} finished
   */
  _onSearchFinished: function(searchId, finished) {
    if (searchId !== this._searchId || !this._progressIndicator)
      return;
    if (!this._searchResultsPane)
      this._nothingFound();
    this._searchFinished(finished);
    delete this._searchConfig;
  },

  /**
   * @param {!WebInspector.SearchConfig} searchConfig
   */
  _startSearch: function(searchConfig) {
    this._resetSearch();
    ++this._searchId;
    if (!this._isIndexing)
      this._startIndexing();
    this._pendingSearchConfig = searchConfig;
  },

  /**
   * @param {!WebInspector.SearchConfig} searchConfig
   */
  _innerStartSearch: function(searchConfig) {
    this._searchConfig = searchConfig;
    if (this._progressIndicator)
      this._progressIndicator.done();
    this._progressIndicator = new WebInspector.ProgressIndicator();
    this._searchStarted(this._progressIndicator);
    this._searchScope.performSearch(
        searchConfig, this._progressIndicator, this._onSearchResult.bind(this, this._searchId),
        this._onSearchFinished.bind(this, this._searchId));
  },

  _resetSearch: function() {
    this._stopSearch();

    if (this._searchResultsPane) {
      this._resetResults();
      delete this._searchResultsPane;
    }
  },

  _stopSearch: function() {
    if (this._progressIndicator && !this._isIndexing)
      this._progressIndicator.cancel();
    if (this._searchScope)
      this._searchScope.stopSearch();
    delete this._searchConfig;
  },

  /**
   * @param {!WebInspector.ProgressIndicator} progressIndicator
   */
  _searchStarted: function(progressIndicator) {
    this._resetResults();
    this._resetCounters();

    this._searchMessageElement.textContent = WebInspector.UIString('Searching\u2026');
    progressIndicator.show(this._searchProgressPlaceholderElement);
    this._updateSearchResultsMessage();

    if (!this._searchingView)
      this._searchingView = new WebInspector.EmptyWidget(WebInspector.UIString('Searching\u2026'));
    this._searchingView.show(this._searchResultsElement);
  },

  /**
   * @param {boolean} finished
   */
  _indexingFinished: function(finished) {
    this._searchMessageElement.textContent =
        finished ? '' : WebInspector.UIString('Indexing interrupted.');
  },

  _updateSearchResultsMessage: function() {
    if (this._searchMatchesCount && this._searchResultsCount)
      this._searchResultsMessageElement.textContent = WebInspector.UIString(
          'Found %d matches in %d files.', this._searchMatchesCount,
          this._nonEmptySearchResultsCount);
    else
      this._searchResultsMessageElement.textContent = '';
  },

  _resetResults: function() {
    if (this._searchingView)
      this._searchingView.detach();
    if (this._notFoundView)
      this._notFoundView.detach();
    this._searchResultsElement.removeChildren();
  },

  _resetCounters: function() {
    this._searchMatchesCount = 0;
    this._searchResultsCount = 0;
    this._nonEmptySearchResultsCount = 0;
  },

  _nothingFound: function() {
    this._resetResults();

    if (!this._notFoundView)
      this._notFoundView = new WebInspector.EmptyWidget(WebInspector.UIString('No matches found.'));
    this._notFoundView.show(this._searchResultsElement);
    this._searchResultsMessageElement.textContent = WebInspector.UIString('No matches found.');
  },

  /**
   * @param {!WebInspector.FileBasedSearchResult} searchResult
   */
  _addSearchResult: function(searchResult) {
    this._searchMatchesCount += searchResult.searchMatches.length;
    this._searchResultsCount++;
    if (searchResult.searchMatches.length)
      this._nonEmptySearchResultsCount++;
    this._updateSearchResultsMessage();
  },

  /**
   * @param {boolean} finished
   */
  _searchFinished: function(finished) {
    this._searchMessageElement.textContent = finished ?
        WebInspector.UIString('Search finished.') :
        WebInspector.UIString('Search interrupted.');
  },

  focus: function() {
    WebInspector.setCurrentFocusElement(this._search);
    this._search.select();
  },

  willHide: function() { this._stopSearch(); },

  /**
   * @param {!Event} event
   */
  _onKeyDown: function(event) {
    switch (event.keyCode) {
      case WebInspector.KeyboardShortcut.Keys.Enter.code:
        this._onAction();
        break;
    }
  },

  _onInput: function() {
    if (this._search.value && this._search.value.length)
      this._searchInputClearElement.hidden = false;
    else
      this._searchInputClearElement.hidden = true;
  },

  _save: function() { this._advancedSearchConfig.set(this._buildSearchConfig().toPlainObject()); },

  _load: function() {
    var searchConfig = WebInspector.SearchConfig.fromPlainObject(this._advancedSearchConfig.get());
    this._search.value = searchConfig.query();
    this._ignoreCaseCheckbox.checked = searchConfig.ignoreCase();
    this._regexCheckbox.checked = searchConfig.isRegex();
    if (this._search.value && this._search.value.length)
      this._searchInputClearElement.hidden = false;
  },

  _onAction: function() {
    var searchConfig = this._buildSearchConfig();
    if (!searchConfig.query() || !searchConfig.query().length)
      return;

    this._save();
    this._startSearch(searchConfig);
  },

  __proto__: WebInspector.VBox.prototype
};

/**
 * @param {string} query
 * @param {string=} filePath
 */
WebInspector.AdvancedSearchView.openSearch = function(query, filePath) {
  WebInspector.viewManager.showView('sources.search');
  var searchView = /** @type {!WebInspector.AdvancedSearchView} */ (
      self.runtime.sharedInstance(WebInspector.AdvancedSearchView));
  var fileMask = filePath ? ' file:' + filePath : '';
  searchView._toggle(query + fileMask);
};

/**
 * @constructor
 * @param {!WebInspector.ProjectSearchConfig} searchConfig
 */
WebInspector.SearchResultsPane = function(searchConfig) {
  this._searchConfig = searchConfig;
  this.element = createElement('div');
};

WebInspector.SearchResultsPane.prototype = {
  /**
     * @return {!WebInspector.ProjectSearchConfig}
     */
  get searchConfig() { return this._searchConfig; },

  /**
   * @param {!WebInspector.FileBasedSearchResult} searchResult
   */
  addSearchResult: function(searchResult) {}
};

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.AdvancedSearchView.ActionDelegate = function() {};

WebInspector.AdvancedSearchView.ActionDelegate.prototype = {
  /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
  handleAction: function(context, actionId) {
    this._showSearch();
    return true;
  },

  _showSearch: function() {
    var selection = WebInspector.inspectorView.element.getDeepSelection();
    var queryCandidate = '';
    if (selection.rangeCount)
      queryCandidate = selection.toString().replace(/\r?\n.*/, '');
    WebInspector.AdvancedSearchView.openSearch(queryCandidate);
  },
};

/**
 * @constructor
 * @param {!WebInspector.UISourceCode} uiSourceCode
 * @param {!Array.<!Object>} searchMatches
 */
WebInspector.FileBasedSearchResult = function(uiSourceCode, searchMatches) {
  this.uiSourceCode = uiSourceCode;
  this.searchMatches = searchMatches;
};

/**
 * @interface
 */
WebInspector.SearchScope = function() {};

WebInspector.SearchScope.prototype = {
  /**
   * @param {!WebInspector.SearchConfig} searchConfig
   * @param {!WebInspector.Progress} progress
   * @param {function(!WebInspector.FileBasedSearchResult)} searchResultCallback
   * @param {function(boolean)} searchFinishedCallback
   */
  performSearch: function(searchConfig, progress, searchResultCallback, searchFinishedCallback) {},

  /**
   * @param {!WebInspector.Progress} progress
   */
  performIndexing: function(progress) {},

  stopSearch: function() {},

  /**
     * @param {!WebInspector.ProjectSearchConfig} searchConfig
     * @return {!WebInspector.SearchResultsPane}
     */
  createSearchResultsPane: function(searchConfig) {}
};

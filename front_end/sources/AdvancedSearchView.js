// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
Sources.AdvancedSearchView = class extends UI.VBox {
  constructor() {
    super(true);
    this.setMinimumSize(0, 40);
    this.registerRequiredCSS('sources/sourcesSearch.css');

    this._focusOnShow = false;
    this._isIndexing = false;
    this._searchId = 1;
    this._searchMatchesCount = 0;
    this._searchResultsCount = 0;
    this._nonEmptySearchResultsCount = 0;
    /** @type {?UI.Widget} */
    this._searchingView = null;
    /** @type {?UI.Widget} */
    this._notFoundView = null;
    /** @type {?Workspace.SearchConfig} */
    this._searchConfig = null;
    /** @type {?Workspace.SearchConfig} */
    this._pendingSearchConfig = null;
    /** @type {?Sources.FileBasedSearchResultsPane} */
    this._searchResultsPane = null;
    /** @type {?UI.ProgressIndicator} */
    this._progressIndicator = null;

    this.contentElement.classList.add('search-view');

    this._searchPanelElement = this.contentElement.createChild('div', 'search-drawer-header');
    this._searchPanelElement.addEventListener('keydown', this._onKeyDown.bind(this), false);
    this._searchPanelElement.addEventListener('input', this._onInput.bind(this), false);

    this._searchResultsElement = this.contentElement.createChild('div');
    this._searchResultsElement.className = 'search-results';

    this._search = UI.HistoryInput.create();
    this._searchPanelElement.appendChild(this._search);
    this._search.placeholder = Common.UIString('Search all sources (use "file:" to filter by path)\u200e');
    this._search.setAttribute('type', 'text');
    this._search.classList.add('search-config-search');
    this._search.setAttribute('results', '0');
    this._search.setAttribute('size', 42);

    const searchIcon = UI.Icon.create('mediumicon-search', 'search-icon');
    this._searchPanelElement.appendChild(searchIcon);

    this._searchInputClearElement = UI.Icon.create('mediumicon-gray-cross-hover', 'search-cancel-button');
    this._searchInputClearElement.classList.add('hidden');
    this._searchInputClearElement.addEventListener('click', this._onSearchInputClear.bind(this), false);
    const cancelButtonContainer = this._searchPanelElement.createChild('div', 'search-cancel-button-container');
    cancelButtonContainer.appendChild(this._searchInputClearElement);

    const toolbar = new UI.Toolbar('search-toolbar', this._searchPanelElement);
    this._ignoreCaseCheckbox = new UI.ToolbarCheckbox(Common.UIString('Ignore case'));
    toolbar.appendToolbarItem(this._ignoreCaseCheckbox);
    this._regexCheckbox = new UI.ToolbarCheckbox(Common.UIString('Regular expression'));
    toolbar.appendToolbarItem(this._regexCheckbox);

    const searchStatusBarElement = this.contentElement.createChild('div', 'search-toolbar-summary');
    this._searchMessageElement = searchStatusBarElement.createChild('div', 'search-message');
    this._searchProgressPlaceholderElement = searchStatusBarElement.createChild('div', 'flex-centered');
    this._searchResultsMessageElement = searchStatusBarElement.createChild('div', 'search-message');

    this._advancedSearchConfig = Common.settings.createLocalSetting(
        'advancedSearchConfig', new Workspace.SearchConfig('', true, false).toPlainObject());
    this._load();
    /** @type {!Sources.SearchScope} */
    this._searchScope = new Sources.SourcesSearchScope();
  }

  /**
   * @param {string} query
   * @param {string=} filePath
   */
  static openSearch(query, filePath) {
    UI.viewManager.showView('sources.search');
    const searchView =
        /** @type {!Sources.AdvancedSearchView} */ (self.runtime.sharedInstance(Sources.AdvancedSearchView));
    const fileMask = filePath ? ' file:' + filePath : '';
    searchView._toggle(query + fileMask);
  }

  /**
   * @return {!Workspace.SearchConfig}
   */
  _buildSearchConfig() {
    return new Workspace.SearchConfig(
        this._search.value, this._ignoreCaseCheckbox.checked(), this._regexCheckbox.checked());
  }

  /**
   * @param {string} queryCandidate
   */
  _toggle(queryCandidate) {
    if (queryCandidate)
      this._search.value = queryCandidate;

    if (this.isShowing())
      this.focus();
    else
      this._focusOnShow = true;

    this._startIndexing();
  }

  /**
   * @override
   */
  wasShown() {
    if (this._focusOnShow) {
      this.focus();
      this._focusOnShow = false;
    }
  }

  _onIndexingFinished() {
    const finished = !this._progressIndicator.isCanceled();
    this._progressIndicator.done();
    this._progressIndicator = null;
    this._isIndexing = false;
    this._indexingFinished(finished);
    if (!finished)
      this._pendingSearchConfig = null;
    if (!this._pendingSearchConfig)
      return;
    const searchConfig = this._pendingSearchConfig;
    this._pendingSearchConfig = null;
    this._innerStartSearch(searchConfig);
  }

  _startIndexing() {
    this._isIndexing = true;
    if (this._progressIndicator)
      this._progressIndicator.done();
    this._progressIndicator = new UI.ProgressIndicator();
    this._searchMessageElement.textContent = Common.UIString('Indexing\u2026');
    this._progressIndicator.show(this._searchProgressPlaceholderElement);
    this._searchScope.performIndexing(
        new Common.ProgressProxy(this._progressIndicator, this._onIndexingFinished.bind(this)));
  }

  _onSearchInputClear() {
    this._search.value = '';
    this.focus();
    this._searchInputClearElement.classList.add('hidden');
  }

  /**
   * @param {number} searchId
   * @param {!Sources.FileBasedSearchResult} searchResult
   */
  _onSearchResult(searchId, searchResult) {
    if (searchId !== this._searchId || !this._progressIndicator)
      return;
    if (this._progressIndicator && this._progressIndicator.isCanceled()) {
      this._onIndexingFinished();
      return;
    }
    this._addSearchResult(searchResult);
    if (!searchResult.searchMatches.length)
      return;
    if (!this._searchResultsPane) {
      this._searchResultsPane =
          new Sources.FileBasedSearchResultsPane(/** @type {!Workspace.SearchConfig} */ (this._searchConfig));
    }
    this._resetResults();
    this._searchResultsElement.appendChild(this._searchResultsPane.element);
    this._searchResultsPane.addSearchResult(searchResult);
  }

  /**
   * @param {number} searchId
   * @param {boolean} finished
   */
  _onSearchFinished(searchId, finished) {
    if (searchId !== this._searchId || !this._progressIndicator)
      return;
    if (!this._searchResultsPane)
      this._nothingFound();
    this._searchFinished(finished);
    delete this._searchConfig;
  }

  /**
   * @param {!Workspace.SearchConfig} searchConfig
   */
  _startSearch(searchConfig) {
    this._resetSearch();
    ++this._searchId;
    if (!this._isIndexing)
      this._startIndexing();
    this._pendingSearchConfig = searchConfig;
  }

  /**
   * @param {!Workspace.SearchConfig} searchConfig
   */
  _innerStartSearch(searchConfig) {
    this._searchConfig = searchConfig;
    if (this._progressIndicator)
      this._progressIndicator.done();
    this._progressIndicator = new UI.ProgressIndicator();
    this._searchStarted(this._progressIndicator);
    this._searchScope.performSearch(
        searchConfig, this._progressIndicator, this._onSearchResult.bind(this, this._searchId),
        this._onSearchFinished.bind(this, this._searchId));
  }

  _resetSearch() {
    this._stopSearch();

    if (this._searchResultsPane) {
      this._resetResults();
      delete this._searchResultsPane;
    }
  }

  _stopSearch() {
    if (this._progressIndicator && !this._isIndexing)
      this._progressIndicator.cancel();
    if (this._searchScope)
      this._searchScope.stopSearch();
    delete this._searchConfig;
  }

  /**
   * @param {!UI.ProgressIndicator} progressIndicator
   */
  _searchStarted(progressIndicator) {
    this._resetResults();
    this._resetCounters();

    this._searchMessageElement.textContent = Common.UIString('Searching\u2026');
    progressIndicator.show(this._searchProgressPlaceholderElement);
    this._updateSearchResultsMessage();

    if (!this._searchingView)
      this._searchingView = new UI.EmptyWidget(Common.UIString('Searching\u2026'));
    this._searchingView.show(this._searchResultsElement);
  }

  /**
   * @param {boolean} finished
   */
  _indexingFinished(finished) {
    this._searchMessageElement.textContent = finished ? '' : Common.UIString('Indexing interrupted.');
  }

  _updateSearchResultsMessage() {
    if (this._searchMatchesCount && this._searchResultsCount) {
      if (this._searchMatchesCount === 1 && this._nonEmptySearchResultsCount === 1) {
        this._searchResultsMessageElement.textContent = Common.UIString('Found 1 matching line in 1 file.');
      } else if (this._searchMatchesCount > 1 && this._nonEmptySearchResultsCount === 1) {
        this._searchResultsMessageElement.textContent =
            Common.UIString('Found %d matching lines in 1 file.', this._searchMatchesCount);
      } else {
        this._searchResultsMessageElement.textContent = Common.UIString(
            'Found %d matching lines in %d files.', this._searchMatchesCount, this._nonEmptySearchResultsCount);
      }
    } else {
      this._searchResultsMessageElement.textContent = '';
    }
  }

  _resetResults() {
    if (this._searchingView)
      this._searchingView.detach();
    if (this._notFoundView)
      this._notFoundView.detach();
    this._searchResultsElement.removeChildren();
  }

  _resetCounters() {
    this._searchMatchesCount = 0;
    this._searchResultsCount = 0;
    this._nonEmptySearchResultsCount = 0;
  }

  _nothingFound() {
    this._resetResults();

    if (!this._notFoundView)
      this._notFoundView = new UI.EmptyWidget(Common.UIString('No matches found.'));
    this._notFoundView.show(this._searchResultsElement);
    this._searchResultsMessageElement.textContent = Common.UIString('No matches found.');
  }

  /**
   * @param {!Sources.FileBasedSearchResult} searchResult
   */
  _addSearchResult(searchResult) {
    this._searchMatchesCount += searchResult.searchMatches.length;
    this._searchResultsCount++;
    if (searchResult.searchMatches.length)
      this._nonEmptySearchResultsCount++;
    this._updateSearchResultsMessage();
  }

  /**
   * @param {boolean} finished
   */
  _searchFinished(finished) {
    this._searchMessageElement.textContent =
        finished ? Common.UIString('Search finished.') : Common.UIString('Search interrupted.');
  }

  /**
   * @override
   */
  focus() {
    this._search.focus();
    this._search.select();
  }

  /**
   * @override
   */
  willHide() {
    this._stopSearch();
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    switch (event.keyCode) {
      case UI.KeyboardShortcut.Keys.Enter.code:
        this._onAction();
        break;
    }
  }

  _onInput() {
    const hasText = this._search.value && this._search.value.length;
    this._searchInputClearElement.classList.toggle('hidden', !hasText);
  }

  _save() {
    this._advancedSearchConfig.set(this._buildSearchConfig().toPlainObject());
  }

  _load() {
    const searchConfig = Workspace.SearchConfig.fromPlainObject(this._advancedSearchConfig.get());
    this._search.value = searchConfig.query();
    this._ignoreCaseCheckbox.setChecked(searchConfig.ignoreCase());
    this._regexCheckbox.setChecked(searchConfig.isRegex());
    if (this._search.value && this._search.value.length)
      this._searchInputClearElement.classList.remove('hidden');
  }

  _onAction() {
    const searchConfig = this._buildSearchConfig();
    if (!searchConfig.query() || !searchConfig.query().length)
      return;

    this._save();
    this._startSearch(searchConfig);
  }
};


Sources.SearchResultsPane = class {
  /**
   * @param {!Workspace.ProjectSearchConfig} searchConfig
   */
  constructor(searchConfig) {
    this._searchConfig = searchConfig;
    this.element = createElement('div');
  }

  /**
   * @return {!Workspace.ProjectSearchConfig}
   */
  get searchConfig() {
    return this._searchConfig;
  }

  /**
   * @param {!Sources.FileBasedSearchResult} searchResult
   */
  addSearchResult(searchResult) {
  }
};

/**
 * @implements {UI.ActionDelegate}
 */
Sources.AdvancedSearchView.ActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    this._showSearch();
    return true;
  }

  _showSearch() {
    const selection = UI.inspectorView.element.window().getSelection();
    let queryCandidate = '';
    if (selection.rangeCount)
      queryCandidate = selection.toString().replace(/\r?\n.*/, '');
    Sources.AdvancedSearchView.openSearch(queryCandidate);
  }
};

/**
 * @unrestricted
 */
Sources.FileBasedSearchResult = class {
  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!Array.<!Object>} searchMatches
   */
  constructor(uiSourceCode, searchMatches) {
    this.uiSourceCode = uiSourceCode;
    this.searchMatches = searchMatches;
  }
};

/**
 * @interface
 */
Sources.SearchScope = function() {};

Sources.SearchScope.prototype = {
  /**
   * @param {!Workspace.SearchConfig} searchConfig
   * @param {!Common.Progress} progress
   * @param {function(!Sources.FileBasedSearchResult)} searchResultCallback
   * @param {function(boolean)} searchFinishedCallback
   */
  performSearch(searchConfig, progress, searchResultCallback, searchFinishedCallback) {},

  /**
   * @param {!Common.Progress} progress
   */
  performIndexing(progress) {},

  stopSearch() {}
};

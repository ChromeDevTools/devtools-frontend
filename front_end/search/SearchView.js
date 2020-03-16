// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as UI from '../ui/ui.js';

import {SearchConfig, SearchResult, SearchScope} from './SearchConfig.js';  // eslint-disable-line no-unused-vars
import {SearchResultsPane} from './SearchResultsPane.js';

export class SearchView extends UI.Widget.VBox {
  /**
   * @param {string} settingKey
   */
  constructor(settingKey) {
    super(true);
    this.setMinimumSize(0, 40);
    this.registerRequiredCSS('search/searchView.css');

    this._focusOnShow = false;
    this._isIndexing = false;
    this._searchId = 1;
    this._searchMatchesCount = 0;
    this._searchResultsCount = 0;
    this._nonEmptySearchResultsCount = 0;
    /** @type {?UI.Widget.Widget} */
    this._searchingView = null;
    /** @type {?UI.Widget.Widget} */
    this._notFoundView = null;
    /** @type {?SearchConfig} */
    this._searchConfig = null;
    /** @type {?SearchConfig} */
    this._pendingSearchConfig = null;
    /** @type {?SearchResultsPane} */
    this._searchResultsPane = null;
    /** @type {?UI.ProgressIndicator.ProgressIndicator} */
    this._progressIndicator = null;
    /** @type {?UI.Widget.Widget} */
    this._visiblePane = null;

    this.contentElement.classList.add('search-view');

    this._searchPanelElement = this.contentElement.createChild('div', 'search-drawer-header');
    this._searchPanelElement.addEventListener('keydown', this._onKeyDown.bind(this), false);

    this._searchResultsElement = this.contentElement.createChild('div');
    this._searchResultsElement.className = 'search-results';

    const searchContainer = createElement('div');
    searchContainer.style.flex = 'auto';
    searchContainer.style.justifyContent = 'start';
    searchContainer.style.maxWidth = '300px';
    this._search = UI.HistoryInput.HistoryInput.create();
    searchContainer.appendChild(this._search);
    this._search.placeholder = Common.UIString.UIString('Search');
    this._search.setAttribute('type', 'text');
    this._search.setAttribute('results', '0');
    this._search.setAttribute('size', 42);
    UI.ARIAUtils.setAccessibleName(this._search, ls`Search Query`);
    const searchItem = new UI.Toolbar.ToolbarItem(searchContainer);

    const toolbar = new UI.Toolbar.Toolbar('search-toolbar', this._searchPanelElement);
    this._matchCaseButton = SearchView._appendToolbarToggle(toolbar, 'Aa', Common.UIString.UIString('Match Case'));
    this._regexButton =
        SearchView._appendToolbarToggle(toolbar, '.*', Common.UIString.UIString('Use Regular Expression'));
    toolbar.appendToolbarItem(searchItem);
    const refreshButton = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Refresh'), 'largeicon-refresh');
    const clearButton = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Clear'), 'largeicon-clear');
    toolbar.appendToolbarItem(refreshButton);
    toolbar.appendToolbarItem(clearButton);
    refreshButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._onAction.bind(this));
    clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => {
      this._resetSearch();
      this._onSearchInputClear();
    });

    const searchStatusBarElement = this.contentElement.createChild('div', 'search-toolbar-summary');
    this._searchMessageElement = searchStatusBarElement.createChild('div', 'search-message');
    this._searchProgressPlaceholderElement = searchStatusBarElement.createChild('div', 'flex-centered');
    this._searchResultsMessageElement = searchStatusBarElement.createChild('div', 'search-message');

    this._advancedSearchConfig = Common.Settings.Settings.instance().createLocalSetting(
        settingKey + 'SearchConfig', new SearchConfig('', true, false).toPlainObject());

    this._load();
    /** @type {?SearchScope} */
    this._searchScope = null;
  }

  /**
   * @param {!UI.Toolbar.Toolbar} toolbar
   * @param {string} text
   * @param {string} tooltip
   * @return {!UI.Toolbar.ToolbarToggle}
   */
  static _appendToolbarToggle(toolbar, text, tooltip) {
    const toggle = new UI.Toolbar.ToolbarToggle(tooltip);
    toggle.setText(text);
    toggle.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => toggle.setToggled(!toggle.toggled()));
    toolbar.appendToolbarItem(toggle);
    return toggle;
  }

  /**
   * @return {!SearchConfig}
   */
  _buildSearchConfig() {
    return new SearchConfig(this._search.value, !this._matchCaseButton.toggled(), this._regexButton.toggled());
  }

  /**
   * @protected
   * @param {string} queryCandidate
   * @param {boolean=} searchImmediately
   */
  async toggle(queryCandidate, searchImmediately) {
    if (queryCandidate) {
      this._search.value = queryCandidate;
    }
    if (this.isShowing()) {
      this.focus();
    } else {
      this._focusOnShow = true;
    }

    this._initScope();
    if (searchImmediately) {
      this._onAction();
    } else {
      this._startIndexing();
    }
  }

  /**
   * @protected
   * @return {!SearchScope}
   */
  createScope() {
    throw new Error('Not implemented');
  }

  _initScope() {
    this._searchScope = this.createScope();
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
    if (!finished) {
      this._pendingSearchConfig = null;
    }
    if (!this._pendingSearchConfig) {
      return;
    }
    const searchConfig = this._pendingSearchConfig;
    this._pendingSearchConfig = null;
    this._innerStartSearch(searchConfig);
  }

  _startIndexing() {
    this._isIndexing = true;
    if (this._progressIndicator) {
      this._progressIndicator.done();
    }
    this._progressIndicator = new UI.ProgressIndicator.ProgressIndicator();
    this._searchMessageElement.textContent = Common.UIString.UIString('Indexing…');
    this._progressIndicator.show(this._searchProgressPlaceholderElement);
    this._searchScope.performIndexing(
        new Common.Progress.ProgressProxy(this._progressIndicator, this._onIndexingFinished.bind(this)));
  }

  _onSearchInputClear() {
    this._search.value = '';
    this.focus();
  }

  /**
   * @param {number} searchId
   * @param {!SearchResult} searchResult
   */
  _onSearchResult(searchId, searchResult) {
    if (searchId !== this._searchId || !this._progressIndicator) {
      return;
    }
    if (this._progressIndicator && this._progressIndicator.isCanceled()) {
      this._onIndexingFinished();
      return;
    }
    this._addSearchResult(searchResult);
    if (!searchResult.matchesCount()) {
      return;
    }
    if (!this._searchResultsPane) {
      this._searchResultsPane = new SearchResultsPane(/** @type {!SearchConfig} */ (this._searchConfig));
      this._showPane(this._searchResultsPane);
    }
    this._searchResultsPane.addSearchResult(searchResult);
  }

  /**
   * @param {number} searchId
   * @param {boolean} finished
   */
  _onSearchFinished(searchId, finished) {
    if (searchId !== this._searchId || !this._progressIndicator) {
      return;
    }
    if (!this._searchResultsPane) {
      this._nothingFound();
    }
    this._searchFinished(finished);
    this._searchConfig = null;
    UI.ARIAUtils.alert(
        this._searchMessageElement.textContent + ' ' + this._searchResultsMessageElement.textContent,
        this._searchMessageElement);
  }

  /**
   * @param {!SearchConfig} searchConfig
   */
  async _startSearch(searchConfig) {
    this._resetSearch();
    ++this._searchId;
    this._initScope();
    if (!this._isIndexing) {
      this._startIndexing();
    }
    this._pendingSearchConfig = searchConfig;
  }

  _innerStartSearch(searchConfig) {
    this._searchConfig = searchConfig;
    if (this._progressIndicator) {
      this._progressIndicator.done();
    }
    this._progressIndicator = new UI.ProgressIndicator.ProgressIndicator();
    this._searchStarted(this._progressIndicator);
    this._searchScope.performSearch(
        searchConfig, this._progressIndicator, this._onSearchResult.bind(this, this._searchId),
        this._onSearchFinished.bind(this, this._searchId));
  }

  _resetSearch() {
    this._stopSearch();
    this._showPane(null);
    this._searchResultsPane = null;
  }

  _stopSearch() {
    if (this._progressIndicator && !this._isIndexing) {
      this._progressIndicator.cancel();
    }
    if (this._searchScope) {
      this._searchScope.stopSearch();
    }
    this._searchConfig = null;
  }

  /**
   * @param {!UI.ProgressIndicator.ProgressIndicator} progressIndicator
   */
  _searchStarted(progressIndicator) {
    this._resetCounters();
    if (!this._searchingView) {
      this._searchingView = new UI.EmptyWidget.EmptyWidget(Common.UIString.UIString('Searching…'));
    }
    this._showPane(this._searchingView);
    this._searchMessageElement.textContent = Common.UIString.UIString('Searching…');
    progressIndicator.show(this._searchProgressPlaceholderElement);
    this._updateSearchResultsMessage();
  }

  /**
   * @param {boolean} finished
   */
  _indexingFinished(finished) {
    this._searchMessageElement.textContent = finished ? '' : Common.UIString.UIString('Indexing interrupted.');
  }

  _updateSearchResultsMessage() {
    if (this._searchMatchesCount && this._searchResultsCount) {
      if (this._searchMatchesCount === 1 && this._nonEmptySearchResultsCount === 1) {
        this._searchResultsMessageElement.textContent = Common.UIString.UIString('Found 1 matching line in 1 file.');
      } else if (this._searchMatchesCount > 1 && this._nonEmptySearchResultsCount === 1) {
        this._searchResultsMessageElement.textContent =
            Common.UIString.UIString('Found %d matching lines in 1 file.', this._searchMatchesCount);
      } else {
        this._searchResultsMessageElement.textContent = Common.UIString.UIString(
            'Found %d matching lines in %d files.', this._searchMatchesCount, this._nonEmptySearchResultsCount);
      }
    } else {
      this._searchResultsMessageElement.textContent = '';
    }
  }

  /**
   * @param {?UI.Widget.Widget} panel
   */
  _showPane(panel) {
    if (this._visiblePane) {
      this._visiblePane.detach();
    }
    if (panel) {
      panel.show(this._searchResultsElement);
    }
    this._visiblePane = panel;
  }

  _resetCounters() {
    this._searchMatchesCount = 0;
    this._searchResultsCount = 0;
    this._nonEmptySearchResultsCount = 0;
  }

  _nothingFound() {
    if (!this._notFoundView) {
      this._notFoundView = new UI.EmptyWidget.EmptyWidget(Common.UIString.UIString('No matches found.'));
    }
    this._showPane(this._notFoundView);
    this._searchResultsMessageElement.textContent = Common.UIString.UIString('No matches found.');
  }

  /**
   * @param {!SearchResult} searchResult
   */
  _addSearchResult(searchResult) {
    const matchesCount = searchResult.matchesCount();
    this._searchMatchesCount += matchesCount;
    this._searchResultsCount++;
    if (matchesCount) {
      this._nonEmptySearchResultsCount++;
    }
    this._updateSearchResultsMessage();
  }

  /**
   * @param {boolean} finished
   */
  _searchFinished(finished) {
    this._searchMessageElement.textContent =
        finished ? Common.UIString.UIString('Search finished.') : Common.UIString.UIString('Search interrupted.');
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

  _save() {
    this._advancedSearchConfig.set(this._buildSearchConfig().toPlainObject());
  }

  _load() {
    const searchConfig = SearchConfig.fromPlainObject(this._advancedSearchConfig.get());
    this._search.value = searchConfig.query();
    this._matchCaseButton.setToggled(!searchConfig.ignoreCase());
    this._regexButton.setToggled(searchConfig.isRegex());
  }

  _onAction() {
    // Resetting alert variable to prime for next search query result.
    UI.ARIAUtils.alert(' ', this._searchMessageElement);
    const searchConfig = this._buildSearchConfig();
    if (!searchConfig.query() || !searchConfig.query().length) {
      return;
    }
    this._save();
    this._startSearch(searchConfig);
  }
}

// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';

import type {SearchResult, SearchScope} from './SearchConfig.js';
import {SearchConfig} from './SearchConfig.js';  // eslint-disable-line no-unused-vars
import {SearchResultsPane} from './SearchResultsPane.js';

const UIStrings = {
  /**
  *@description Title of a search bar or tool
  */
  search: 'Search',
  /**
  *@description Accessibility label for search query text box
  */
  searchQuery: 'Search Query',
  /**
  *@description Text to search by matching case of the input
  */
  matchCase: 'Match Case',
  /**
  *@description Text for searching with regular expressinn
  */
  useRegularExpression: 'Use Regular Expression',
  /**
  *@description Text to refresh the page
  */
  refresh: 'Refresh',
  /**
  *@description Text to clear content
  */
  clear: 'Clear',
  /**
  *@description Search message element text content in Search View of the Search tab
  */
  indexing: 'Indexing…',
  /**
  *@description Text to indicate the searching is in progress
  */
  searching: 'Searching…',
  /**
  *@description Text in Search View of the Search tab
  */
  indexingInterrupted: 'Indexing interrupted.',
  /**
  *@description Search results message element text content in Search View of the Search tab
  */
  foundMatchingLineInFile: 'Found 1 matching line in 1 file.',
  /**
  *@description Search results message element text content in Search View of the Search tab
  *@example {2} PH1
  */
  foundDMatchingLinesInFile: 'Found {PH1} matching lines in 1 file.',
  /**
  *@description Search results message element text content in Search View of the Search tab
  *@example {2} PH1
  *@example {2} PH2
  */
  foundDMatchingLinesInDFiles: 'Found {PH1} matching lines in {PH2} files.',
  /**
  *@description Search results message element text content in Search View of the Search tab
  */
  noMatchesFound: 'No matches found.',
  /**
  *@description Text in Search View of the Search tab
  */
  searchFinished: 'Search finished.',
  /**
  *@description Text in Search View of the Search tab
  */
  searchInterrupted: 'Search interrupted.',
};
const str_ = i18n.i18n.registerUIStrings('panels/search/SearchView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SearchView extends UI.Widget.VBox {
  _focusOnShow: boolean;
  _isIndexing: boolean;
  _searchId: number;
  _searchMatchesCount: number;
  _searchResultsCount: number;
  _nonEmptySearchResultsCount: number;
  _searchingView: UI.Widget.Widget|null;
  _notFoundView: UI.Widget.Widget|null;
  _searchConfig: SearchConfig|null;
  _pendingSearchConfig: SearchConfig|null;
  _searchResultsPane: SearchResultsPane|null;
  _progressIndicator: UI.ProgressIndicator.ProgressIndicator|null;
  _visiblePane: UI.Widget.Widget|null;
  _searchPanelElement: HTMLElement;
  _searchResultsElement: HTMLElement;
  _search: UI.HistoryInput.HistoryInput;
  _matchCaseButton: UI.Toolbar.ToolbarToggle;
  _regexButton: UI.Toolbar.ToolbarToggle;
  _searchMessageElement: HTMLElement;
  _searchProgressPlaceholderElement: HTMLElement;
  _searchResultsMessageElement: HTMLElement;
  _advancedSearchConfig: Common.Settings.Setting<{
    query: string,
    ignoreCase: boolean,
    isRegex: boolean,
  }>;
  _searchScope: SearchScope|null;
  constructor(settingKey: string) {
    super(true);
    this.setMinimumSize(0, 40);
    this.registerRequiredCSS('panels/search/searchView.css', {enableLegacyPatching: false});

    this._focusOnShow = false;
    this._isIndexing = false;
    this._searchId = 1;
    this._searchMatchesCount = 0;
    this._searchResultsCount = 0;
    this._nonEmptySearchResultsCount = 0;
    this._searchingView = null;
    this._notFoundView = null;
    this._searchConfig = null;
    this._pendingSearchConfig = null;
    this._searchResultsPane = null;
    this._progressIndicator = null;
    this._visiblePane = null;

    this.contentElement.classList.add('search-view');

    this._searchPanelElement = this.contentElement.createChild('div', 'search-drawer-header');
    this._searchResultsElement = this.contentElement.createChild('div');
    this._searchResultsElement.className = 'search-results';

    const searchContainer = document.createElement('div');
    searchContainer.style.flex = 'auto';
    searchContainer.style.justifyContent = 'start';
    searchContainer.style.maxWidth = '300px';
    this._search = UI.HistoryInput.HistoryInput.create();
    this._search.addEventListener('keydown', event => {
      this._onKeyDown((event as KeyboardEvent));
    });
    searchContainer.appendChild(this._search);
    this._search.placeholder = i18nString(UIStrings.search);
    this._search.setAttribute('type', 'text');
    this._search.setAttribute('results', '0');
    this._search.setAttribute('size', '42');
    UI.ARIAUtils.setAccessibleName(this._search, i18nString(UIStrings.searchQuery));
    const searchItem = new UI.Toolbar.ToolbarItem(searchContainer);

    const toolbar = new UI.Toolbar.Toolbar('search-toolbar', this._searchPanelElement);
    this._matchCaseButton = SearchView._appendToolbarToggle(toolbar, 'Aa', i18nString(UIStrings.matchCase));
    this._regexButton = SearchView._appendToolbarToggle(toolbar, '.*', i18nString(UIStrings.useRegularExpression));
    toolbar.appendToolbarItem(searchItem);
    const refreshButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.refresh), 'largeicon-refresh');
    const clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clear), 'largeicon-clear');
    toolbar.appendToolbarItem(refreshButton);
    toolbar.appendToolbarItem(clearButton);
    refreshButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => this._onAction());
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
    this._searchScope = null;
  }

  static _appendToolbarToggle(toolbar: UI.Toolbar.Toolbar, text: string, tooltip: string): UI.Toolbar.ToolbarToggle {
    const toggle = new UI.Toolbar.ToolbarToggle(tooltip);
    toggle.setText(text);
    toggle.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => toggle.setToggled(!toggle.toggled()));
    toolbar.appendToolbarItem(toggle);
    return toggle;
  }

  _buildSearchConfig(): SearchConfig {
    return new SearchConfig(this._search.value, !this._matchCaseButton.toggled(), this._regexButton.toggled());
  }

  async toggle(queryCandidate: string, searchImmediately?: boolean): Promise<void> {
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

  createScope(): SearchScope {
    throw new Error('Not implemented');
  }

  _initScope(): void {
    this._searchScope = this.createScope();
  }

  wasShown(): void {
    if (this._focusOnShow) {
      this.focus();
      this._focusOnShow = false;
    }
  }

  _onIndexingFinished(): void {
    if (!this._progressIndicator) {
      return;
    }

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

  _startIndexing(): void {
    this._isIndexing = true;
    if (this._progressIndicator) {
      this._progressIndicator.done();
    }
    this._progressIndicator = new UI.ProgressIndicator.ProgressIndicator();
    this._searchMessageElement.textContent = i18nString(UIStrings.indexing);
    this._progressIndicator.show(this._searchProgressPlaceholderElement);
    if (this._searchScope) {
      this._searchScope.performIndexing(
          new Common.Progress.ProgressProxy(this._progressIndicator, this._onIndexingFinished.bind(this)));
    }
  }

  _onSearchInputClear(): void {
    this._search.value = '';
    this._save();
    this.focus();
  }

  _onSearchResult(searchId: number, searchResult: SearchResult): void {
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
      this._searchResultsPane = new SearchResultsPane((this._searchConfig as SearchConfig));
      this._showPane(this._searchResultsPane);
    }
    this._searchResultsPane.addSearchResult(searchResult);
  }

  _onSearchFinished(searchId: number, finished: boolean): void {
    if (searchId !== this._searchId || !this._progressIndicator) {
      return;
    }
    if (!this._searchResultsPane) {
      this._nothingFound();
    }
    this._searchFinished(finished);
    this._searchConfig = null;
    UI.ARIAUtils.alert(this._searchMessageElement.textContent + ' ' + this._searchResultsMessageElement.textContent);
  }

  async _startSearch(searchConfig: SearchConfig): Promise<void> {
    this._resetSearch();
    ++this._searchId;
    this._initScope();
    if (!this._isIndexing) {
      this._startIndexing();
    }
    this._pendingSearchConfig = searchConfig;
  }

  _innerStartSearch(searchConfig: SearchConfig): void {
    this._searchConfig = searchConfig;
    if (this._progressIndicator) {
      this._progressIndicator.done();
    }
    this._progressIndicator = new UI.ProgressIndicator.ProgressIndicator();
    this._searchStarted(this._progressIndicator);
    if (this._searchScope) {
      this._searchScope.performSearch(
          searchConfig, this._progressIndicator, this._onSearchResult.bind(this, this._searchId),
          this._onSearchFinished.bind(this, this._searchId));
    }
  }

  _resetSearch(): void {
    this._stopSearch();
    this._showPane(null);
    this._searchResultsPane = null;
    this._clearSearchMessage();
  }

  _clearSearchMessage(): void {
    this._searchMessageElement.textContent = '';
    this._searchResultsMessageElement.textContent = '';
  }

  _stopSearch(): void {
    if (this._progressIndicator && !this._isIndexing) {
      this._progressIndicator.cancel();
    }
    if (this._searchScope) {
      this._searchScope.stopSearch();
    }
    this._searchConfig = null;
  }

  _searchStarted(progressIndicator: UI.ProgressIndicator.ProgressIndicator): void {
    this._resetCounters();
    if (!this._searchingView) {
      this._searchingView = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.searching));
    }
    this._showPane(this._searchingView);
    this._searchMessageElement.textContent = i18nString(UIStrings.searching);
    progressIndicator.show(this._searchProgressPlaceholderElement);
    this._updateSearchResultsMessage();
  }

  _indexingFinished(finished: boolean): void {
    this._searchMessageElement.textContent = finished ? '' : i18nString(UIStrings.indexingInterrupted);
  }

  _updateSearchResultsMessage(): void {
    if (this._searchMatchesCount && this._searchResultsCount) {
      if (this._searchMatchesCount === 1 && this._nonEmptySearchResultsCount === 1) {
        this._searchResultsMessageElement.textContent = i18nString(UIStrings.foundMatchingLineInFile);
      } else if (this._searchMatchesCount > 1 && this._nonEmptySearchResultsCount === 1) {
        this._searchResultsMessageElement.textContent =
            i18nString(UIStrings.foundDMatchingLinesInFile, {PH1: this._searchMatchesCount});
      } else {
        this._searchResultsMessageElement.textContent = i18nString(
            UIStrings.foundDMatchingLinesInDFiles,
            {PH1: this._searchMatchesCount, PH2: this._nonEmptySearchResultsCount});
      }
    } else {
      this._searchResultsMessageElement.textContent = '';
    }
  }

  _showPane(panel: UI.Widget.Widget|null): void {
    if (this._visiblePane) {
      this._visiblePane.detach();
    }
    if (panel) {
      panel.show(this._searchResultsElement);
    }
    this._visiblePane = panel;
  }

  _resetCounters(): void {
    this._searchMatchesCount = 0;
    this._searchResultsCount = 0;
    this._nonEmptySearchResultsCount = 0;
  }

  _nothingFound(): void {
    if (!this._notFoundView) {
      this._notFoundView = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noMatchesFound));
    }
    this._showPane(this._notFoundView);
    this._searchResultsMessageElement.textContent = i18nString(UIStrings.noMatchesFound);
  }

  _addSearchResult(searchResult: SearchResult): void {
    const matchesCount = searchResult.matchesCount();
    this._searchMatchesCount += matchesCount;
    this._searchResultsCount++;
    if (matchesCount) {
      this._nonEmptySearchResultsCount++;
    }
    this._updateSearchResultsMessage();
  }

  _searchFinished(finished: boolean): void {
    this._searchMessageElement.textContent =
        finished ? i18nString(UIStrings.searchFinished) : i18nString(UIStrings.searchInterrupted);
  }

  focus(): void {
    this._search.focus();
    this._search.select();
  }

  willHide(): void {
    this._stopSearch();
  }

  _onKeyDown(event: KeyboardEvent): void {
    this._save();
    switch (event.keyCode) {
      case UI.KeyboardShortcut.Keys.Enter.code:
        this._onAction();
        break;
    }
  }

  _save(): void {
    this._advancedSearchConfig.set(this._buildSearchConfig().toPlainObject());
  }

  _load(): void {
    const searchConfig = SearchConfig.fromPlainObject(this._advancedSearchConfig.get());
    this._search.value = searchConfig.query();
    this._matchCaseButton.setToggled(!searchConfig.ignoreCase());
    this._regexButton.setToggled(searchConfig.isRegex());
  }

  _onAction(): void {
    // Resetting alert variable to prime for next search query result.
    UI.ARIAUtils.alert(' ');
    const searchConfig = this._buildSearchConfig();
    if (!searchConfig.query() || !searchConfig.query().length) {
      return;
    }
    this._startSearch(searchConfig);
  }
}

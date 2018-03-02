// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
Search.SearchResultsPane = class extends UI.VBox {
  /**
   * @param {!Search.SearchConfig} searchConfig
   */
  constructor(searchConfig) {
    super(true);
    this._searchConfig = searchConfig;

    /** @type {!Array<!Search.SearchResult>} */
    this._searchResults = [];
    this._treeOutline = new UI.TreeOutlineInShadow();
    this._treeOutline.registerRequiredCSS('search/searchResultsPane.css');
    this.contentElement.appendChild(this._treeOutline.element);

    this._matchesExpandedCount = 0;
  }

  /**
   * @param {!Search.SearchResult} searchResult
   */
  addSearchResult(searchResult) {
    this._searchResults.push(searchResult);
    this._addTreeElement(searchResult);
  }

  /**
   * @param {!Search.SearchResult} searchResult
   */
  _addTreeElement(searchResult) {
    const treeElement = new Search.SearchResultsPane.SearchResultsTreeElement(this._searchConfig, searchResult);
    this._treeOutline.appendChild(treeElement);
    // Expand until at least a certain number of matches is expanded.
    if (this._matchesExpandedCount < Search.SearchResultsPane._matchesExpandedByDefault)
      treeElement.expand();
    this._matchesExpandedCount += searchResult.matchesCount();
  }
};

Search.SearchResultsPane._matchesExpandedByDefault = 20;
Search.SearchResultsPane._matchesShownAtOnce = 20;

Search.SearchResultsPane.SearchResultsTreeElement = class extends UI.TreeElement {
  /**
   * @param {!Search.SearchConfig} searchConfig
   * @param {!Search.SearchResult} searchResult
   */
  constructor(searchConfig, searchResult) {
    super('', true);
    this._searchConfig = searchConfig;
    this._searchResult = searchResult;
    this._initialized = false;

    this.toggleOnClick = true;
    this.selectable = false;
  }

  /**
   * @override
   */
  onexpand() {
    if (this._initialized)
      return;

    this._updateMatchesUI();
    this._initialized = true;
  }

  _updateMatchesUI() {
    this.removeChildren();
    const toIndex = Math.min(this._searchResult.matchesCount(), Search.SearchResultsPane._matchesShownAtOnce);
    if (toIndex < this._searchResult.matchesCount()) {
      this._appendSearchMatches(0, toIndex - 1);
      this._appendShowMoreMatchesElement(toIndex - 1);
    } else {
      this._appendSearchMatches(0, toIndex);
    }
  }

  /**
   * @override
   */
  onattach() {
    this._updateSearchMatches();
  }

  _updateSearchMatches() {
    this.listItemElement.classList.add('search-result');

    const fileNameSpan = createElement('span');
    fileNameSpan.className = 'search-result-file-name';
    fileNameSpan.textContent = this._searchResult.label();
    this.listItemElement.appendChild(fileNameSpan);

    const matchesCountSpan = createElement('span');
    matchesCountSpan.className = 'search-result-matches-count';

    const searchMatchesCount = this._searchResult.matchesCount();
    if (searchMatchesCount === 1)
      matchesCountSpan.textContent = Common.UIString('(%d match)', searchMatchesCount);
    else
      matchesCountSpan.textContent = Common.UIString('(%d matches)', searchMatchesCount);

    this.listItemElement.appendChild(matchesCountSpan);
    if (this.expanded)
      this._updateMatchesUI();
  }

  /**
   * @param {number} fromIndex
   * @param {number} toIndex
   */
  _appendSearchMatches(fromIndex, toIndex) {
    const searchResult = this._searchResult;

    const queries = this._searchConfig.queries();
    const regexes = [];
    for (let i = 0; i < queries.length; ++i)
      regexes.push(createSearchRegex(queries[i], !this._searchConfig.ignoreCase(), this._searchConfig.isRegex()));

    for (let i = fromIndex; i < toIndex; ++i) {
      const lineContent = searchResult.matchLineContent(i);
      let matchRanges = [];
      for (let j = 0; j < regexes.length; ++j)
        matchRanges = matchRanges.concat(this._regexMatchRanges(lineContent, regexes[j]));

      const anchor = Components.Linkifier.linkifyRevealable(searchResult.matchRevealable(i), '');
      const lineNumberSpan = createElement('span');
      lineNumberSpan.classList.add('search-match-line-number');
      lineNumberSpan.textContent = this._labelString(searchResult, i);
      anchor.appendChild(lineNumberSpan);

      const contentSpan = this._createContentSpan(lineContent, matchRanges);
      anchor.appendChild(contentSpan);

      const searchMatchElement = new UI.TreeElement();
      searchMatchElement.selectable = false;
      this.appendChild(searchMatchElement);
      searchMatchElement.listItemElement.className = 'search-match source-code';
      searchMatchElement.listItemElement.appendChild(anchor);
    }
  }

  /**
   * @param {!Search.SearchResult} searchResult
   * @param {number} index
   * @return {string}
   */
  _labelString(searchResult, index) {
    const MIN_WIDTH = 4;
    let label = searchResult.matchLabel(index);
    if (label === null)
      return spacesPadding(MIN_WIDTH);
    label = label.toString();
    return label.length < MIN_WIDTH ? spacesPadding(MIN_WIDTH - label.length) + label : label;
  }

  /**
   * @param {number} startMatchIndex
   */
  _appendShowMoreMatchesElement(startMatchIndex) {
    const matchesLeftCount = this._searchResult.matchesCount() - startMatchIndex;
    const showMoreMatchesText = Common.UIString('Show all matches (%d more).', matchesLeftCount);
    const showMoreMatchesTreeElement = new UI.TreeElement(showMoreMatchesText);
    this.appendChild(showMoreMatchesTreeElement);
    showMoreMatchesTreeElement.listItemElement.classList.add('show-more-matches');
    showMoreMatchesTreeElement.onselect =
        this._showMoreMatchesElementSelected.bind(this, showMoreMatchesTreeElement, startMatchIndex);
  }

  /**
   * @param {string} lineContent
   * @param {!Array.<!TextUtils.SourceRange>} matchRanges
   */
  _createContentSpan(lineContent, matchRanges) {
    const contentSpan = createElement('span');
    contentSpan.className = 'search-match-content';
    contentSpan.textContent = lineContent;
    UI.highlightRangesWithStyleClass(contentSpan, matchRanges, 'highlighted-match');
    return contentSpan;
  }

  /**
   * @param {string} lineContent
   * @param {!RegExp} regex
   * @return {!Array.<!TextUtils.SourceRange>}
   */
  _regexMatchRanges(lineContent, regex) {
    regex.lastIndex = 0;
    let match;
    const matchRanges = [];
    while ((regex.lastIndex < lineContent.length) && (match = regex.exec(lineContent)))
      matchRanges.push(new TextUtils.SourceRange(match.index, match[0].length));

    return matchRanges;
  }

  /**
   * @param {!UI.TreeElement} showMoreMatchesTreeElement
   * @param {number} startMatchIndex
   * @return {boolean}
   */
  _showMoreMatchesElementSelected(showMoreMatchesTreeElement, startMatchIndex) {
    this.removeChild(showMoreMatchesTreeElement);
    this._appendSearchMatches(startMatchIndex, this._searchResult.matchesCount());
    return false;
  }
};

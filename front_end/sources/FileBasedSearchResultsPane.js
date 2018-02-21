// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
Sources.FileBasedSearchResultsPane = class extends Sources.SearchResultsPane {
  /**
   * @param {!Workspace.SearchConfig} searchConfig
   */
  constructor(searchConfig) {
    super(searchConfig);

    this._searchResults = [];
    this._treeOutline = new UI.TreeOutlineInShadow();
    this._treeOutline.registerRequiredCSS('sources/fileBasedSearchResultsPane.css');
    this.element.appendChild(this._treeOutline.element);

    this._matchesExpandedCount = 0;
  }

  /**
   * @override
   * @param {!Sources.FileBasedSearchResult} searchResult
   */
  addSearchResult(searchResult) {
    this._searchResults.push(searchResult);
    const uiSourceCode = searchResult.uiSourceCode;
    if (!uiSourceCode)
      return;
    this._addFileTreeElement(searchResult);
  }

  /**
   * @param {!Sources.FileBasedSearchResult} searchResult
   */
  _addFileTreeElement(searchResult) {
    const fileTreeElement = new Sources.FileBasedSearchResultsPane.FileTreeElement(this.searchConfig, searchResult);
    this._treeOutline.appendChild(fileTreeElement);
    // Expand until at least a certain number of matches is expanded.
    if (this._matchesExpandedCount < Sources.FileBasedSearchResultsPane.matchesExpandedByDefaultCount)
      fileTreeElement.expand();
    this._matchesExpandedCount += searchResult.searchMatches.length;
  }
};

Sources.FileBasedSearchResultsPane.matchesExpandedByDefaultCount = 20;
Sources.FileBasedSearchResultsPane.fileMatchesShownAtOnce = 20;

Sources.FileBasedSearchResultsPane.FileTreeElement = class extends UI.TreeElement {
  /**
   * @param {!Workspace.ProjectSearchConfig} searchConfig
   * @param {!Sources.FileBasedSearchResult} searchResult
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
    const toIndex =
        Math.min(this._searchResult.searchMatches.length, Sources.FileBasedSearchResultsPane.fileMatchesShownAtOnce);
    if (toIndex < this._searchResult.searchMatches.length) {
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
    fileNameSpan.textContent = this._searchResult.uiSourceCode.fullDisplayName();
    this.listItemElement.appendChild(fileNameSpan);

    const matchesCountSpan = createElement('span');
    matchesCountSpan.className = 'search-result-matches-count';

    const searchMatchesCount = this._searchResult.searchMatches.length;
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
    const uiSourceCode = searchResult.uiSourceCode;
    const searchMatches = searchResult.searchMatches;

    const queries = this._searchConfig.queries();
    const regexes = [];
    for (let i = 0; i < queries.length; ++i)
      regexes.push(createSearchRegex(queries[i], !this._searchConfig.ignoreCase(), this._searchConfig.isRegex()));

    for (let i = fromIndex; i < toIndex; ++i) {
      const lineNumber = searchMatches[i].lineNumber;
      const lineContent = searchMatches[i].lineContent;
      let matchRanges = [];
      for (let j = 0; j < regexes.length; ++j)
        matchRanges = matchRanges.concat(this._regexMatchRanges(lineContent, regexes[j]));

      const anchor = this._createAnchor(uiSourceCode, lineNumber, matchRanges[0].offset);

      const numberString = numberToStringWithSpacesPadding(lineNumber + 1, 4);
      const lineNumberSpan = createElement('span');
      lineNumberSpan.classList.add('search-match-line-number');
      lineNumberSpan.textContent = numberString;
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
   * @param {number} startMatchIndex
   */
  _appendShowMoreMatchesElement(startMatchIndex) {
    const matchesLeftCount = this._searchResult.searchMatches.length - startMatchIndex;
    const showMoreMatchesText = Common.UIString('Show all matches (%d more).', matchesLeftCount);
    const showMoreMatchesTreeElement = new UI.TreeElement(showMoreMatchesText);
    this.appendChild(showMoreMatchesTreeElement);
    showMoreMatchesTreeElement.listItemElement.classList.add('show-more-matches');
    showMoreMatchesTreeElement.onselect =
        this._showMoreMatchesElementSelected.bind(this, showMoreMatchesTreeElement, startMatchIndex);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Element}
   */
  _createAnchor(uiSourceCode, lineNumber, columnNumber) {
    return Components.Linkifier.linkifyRevealable(uiSourceCode.uiLocation(lineNumber, columnNumber), '');
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
    this._appendSearchMatches(startMatchIndex, this._searchResult.searchMatches.length);
    return false;
  }
};

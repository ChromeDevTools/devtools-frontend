// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as UI from '../ui/ui.js';

import {SearchConfig, SearchResult} from './SearchConfig.js';  // eslint-disable-line no-unused-vars

export class SearchResultsPane extends UI.Widget.VBox {
  /**
   * @param {!SearchConfig} searchConfig
   */
  constructor(searchConfig) {
    super(true);
    this._searchConfig = searchConfig;

    /** @type {!Array<!SearchResult>} */
    this._searchResults = [];
    this._treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    this._treeOutline.hideOverflow();
    this._treeOutline.registerRequiredCSS('search/searchResultsPane.css');
    this.contentElement.appendChild(this._treeOutline.element);

    this._matchesExpandedCount = 0;
  }

  /**
   * @param {!SearchResult} searchResult
   */
  addSearchResult(searchResult) {
    this._searchResults.push(searchResult);
    this._addTreeElement(searchResult);
  }

  /**
   * @param {!SearchResult} searchResult
   */
  _addTreeElement(searchResult) {
    const treeElement = new SearchResultsTreeElement(this._searchConfig, searchResult);
    this._treeOutline.appendChild(treeElement);
    if (!this._treeOutline.selectedTreeElement) {
      treeElement.select(/* omitFocus */ true, /* selectedByUser */ true);
    }
    // Expand until at least a certain number of matches is expanded.
    if (this._matchesExpandedCount < matchesExpandedByDefault) {
      treeElement.expand();
    }
    this._matchesExpandedCount += searchResult.matchesCount();
  }
}

export const matchesExpandedByDefault = 20;
export const matchesShownAtOnce = 20;

export class SearchResultsTreeElement extends UI.TreeOutline.TreeElement {
  /**
   * @param {!SearchConfig} searchConfig
   * @param {!SearchResult} searchResult
   */
  constructor(searchConfig, searchResult) {
    super('', true);
    this._searchConfig = searchConfig;
    this._searchResult = searchResult;
    this._initialized = false;
    this.toggleOnClick = true;
  }

  /**
   * @override
   */
  onexpand() {
    if (this._initialized) {
      return;
    }

    this._updateMatchesUI();
    this._initialized = true;
  }

  _updateMatchesUI() {
    this.removeChildren();
    const toIndex = Math.min(this._searchResult.matchesCount(), matchesShownAtOnce);
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

    const fileNameSpan = span(this._searchResult.label(), 'search-result-file-name');
    fileNameSpan.appendChild(span('\u2014', 'search-result-dash'));
    fileNameSpan.appendChild(span(this._searchResult.description(), 'search-result-qualifier'));

    this.tooltip = this._searchResult.description();
    this.listItemElement.appendChild(fileNameSpan);
    const matchesCountSpan = createElement('span');
    matchesCountSpan.className = 'search-result-matches-count';

    matchesCountSpan.textContent = `${this._searchResult.matchesCount()}`;
    UI.ARIAUtils.setAccessibleName(matchesCountSpan, ls`Matches Count ${this._searchResult.matchesCount()}`);

    this.listItemElement.appendChild(matchesCountSpan);
    if (this.expanded) {
      this._updateMatchesUI();
    }

    /**
     * @param {string} text
     * @param {string} className
     * @return {!Element}
     */
    function span(text, className) {
      const span = createElement('span');
      span.className = className;
      span.textContent = text;
      return span;
    }
  }

  /**
   * @param {number} fromIndex
   * @param {number} toIndex
   */
  _appendSearchMatches(fromIndex, toIndex) {
    const searchResult = this._searchResult;

    const queries = this._searchConfig.queries();
    const regexes = [];
    for (let i = 0; i < queries.length; ++i) {
      regexes.push(createSearchRegex(queries[i], !this._searchConfig.ignoreCase(), this._searchConfig.isRegex()));
    }

    for (let i = fromIndex; i < toIndex; ++i) {
      const lineContent = searchResult.matchLineContent(i).trim();
      let matchRanges = [];
      for (let j = 0; j < regexes.length; ++j) {
        matchRanges = matchRanges.concat(this._regexMatchRanges(lineContent, regexes[j]));
      }

      const anchor = Components.Linkifier.Linkifier.linkifyRevealable(searchResult.matchRevealable(i), '');
      anchor.classList.add('search-match-link');
      const labelSpan = createElement('span');
      labelSpan.classList.add('search-match-line-number');
      const resultLabel = searchResult.matchLabel(i);
      labelSpan.textContent = resultLabel;
      if (typeof resultLabel === 'number' && !isNaN(resultLabel)) {
        UI.ARIAUtils.setAccessibleName(labelSpan, ls`Line ${resultLabel}`);
      } else {
        UI.ARIAUtils.setAccessibleName(labelSpan, ls`${resultLabel}`);
      }
      anchor.appendChild(labelSpan);

      const contentSpan = this._createContentSpan(lineContent, matchRanges);
      anchor.appendChild(contentSpan);

      const searchMatchElement = new UI.TreeOutline.TreeElement();
      this.appendChild(searchMatchElement);
      searchMatchElement.listItemElement.className = 'search-match';
      searchMatchElement.listItemElement.appendChild(anchor);
      searchMatchElement.listItemElement.addEventListener('keydown', event => {
        if (isEnterKey(event)) {
          event.consume(true);
          Common.Revealer.reveal(searchResult.matchRevealable(i));
        }
      });
      searchMatchElement.tooltip = lineContent;
    }
  }

  /**
   * @param {number} startMatchIndex
   */
  _appendShowMoreMatchesElement(startMatchIndex) {
    const matchesLeftCount = this._searchResult.matchesCount() - startMatchIndex;
    const showMoreMatchesText = Common.UIString.UIString('Show %d more', matchesLeftCount);
    const showMoreMatchesTreeElement = new UI.TreeOutline.TreeElement(showMoreMatchesText);
    this.appendChild(showMoreMatchesTreeElement);
    showMoreMatchesTreeElement.listItemElement.classList.add('show-more-matches');
    showMoreMatchesTreeElement.onselect =
        this._showMoreMatchesElementSelected.bind(this, showMoreMatchesTreeElement, startMatchIndex);
  }

  /**
   * @param {string} lineContent
   * @param {!Array.<!TextUtils.TextRange.SourceRange>} matchRanges
   * @return {!Element}
   */
  _createContentSpan(lineContent, matchRanges) {
    let trimBy = 0;
    if (matchRanges.length > 0 && matchRanges[0].offset > 20) {
      trimBy = 15;
    }
    lineContent = lineContent.substring(trimBy, 1000 + trimBy);
    if (trimBy) {
      matchRanges =
          matchRanges.map(range => new TextUtils.TextRange.SourceRange(range.offset - trimBy + 1, range.length));
      lineContent = '…' + lineContent;
    }
    const contentSpan = createElement('span');
    contentSpan.className = 'search-match-content';
    contentSpan.textContent = lineContent;
    UI.ARIAUtils.setAccessibleName(contentSpan, `${lineContent} line`);
    UI.UIUtils.highlightRangesWithStyleClass(contentSpan, matchRanges, 'highlighted-match');
    return contentSpan;
  }

  /**
   * @param {string} lineContent
   * @param {!RegExp} regex
   * @return {!Array.<!TextUtils.TextRange.SourceRange>}
   */
  _regexMatchRanges(lineContent, regex) {
    regex.lastIndex = 0;
    let match;
    const matchRanges = [];
    while ((regex.lastIndex < lineContent.length) && (match = regex.exec(lineContent))) {
      matchRanges.push(new TextUtils.TextRange.SourceRange(match.index, match[0].length));
    }

    return matchRanges;
  }

  /**
   * @param {!UI.TreeOutline.TreeElement} showMoreMatchesTreeElement
   * @param {number} startMatchIndex
   * @return {boolean}
   */
  _showMoreMatchesElementSelected(showMoreMatchesTreeElement, startMatchIndex) {
    this.removeChild(showMoreMatchesTreeElement);
    this._appendSearchMatches(startMatchIndex, this._searchResult.matchesCount());
    return false;
  }
}

// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import searchResultsPaneStyles from './searchResultsPane.css.js';

import {type SearchResult} from './SearchScope.js';

const UIStrings = {
  /**
   *@description Accessibility label for number of matches in each file in search results pane
   *@example {2} PH1
   */
  matchesCountS: 'Matches Count {PH1}',
  /**
   *@description Search result label for results in the Search tool
   *@example {2} PH1
   */
  lineS: 'Line {PH1}',
  /**
   *@description Text in Search Results Pane of the Search tab
   *@example {2} PH1
   */
  showDMore: 'Show {PH1} more',
};
const str_ = i18n.i18n.registerUIStrings('panels/search/SearchResultsPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SearchResultsPane extends UI.Widget.VBox {
  private readonly searchConfig: Workspace.SearchConfig.SearchConfig;
  private readonly searchResults: SearchResult[];
  private readonly treeElements: SearchResultsTreeElement[];
  private treeOutline: UI.TreeOutline.TreeOutlineInShadow;
  private matchesExpandedCount: number;

  constructor(searchConfig: Workspace.SearchConfig.SearchConfig) {
    super(true);
    this.searchConfig = searchConfig;

    this.searchResults = [];
    this.treeElements = [];
    this.treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    this.treeOutline.hideOverflow();

    this.contentElement.appendChild(this.treeOutline.element);

    this.matchesExpandedCount = 0;
  }

  addSearchResult(searchResult: SearchResult): void {
    this.searchResults.push(searchResult);
    this.addTreeElement(searchResult);
  }

  showAllMatches(): void {
    this.treeElements.forEach(treeElement => {
      treeElement.expand();
      treeElement.showAllMatches();
    });
  }

  collapseAllResults(): void {
    this.treeElements.forEach(treeElement => {
      treeElement.collapse();
    });
  }

  private addTreeElement(searchResult: SearchResult): void {
    const treeElement = new SearchResultsTreeElement(this.searchConfig, searchResult);
    this.treeOutline.appendChild(treeElement);
    if (!this.treeOutline.selectedTreeElement) {
      treeElement.select(/* omitFocus */ true, /* selectedByUser */ true);
    }
    // Expand until at least a certain number of matches is expanded.
    if (this.matchesExpandedCount < matchesExpandedByDefault) {
      treeElement.expand();
    }
    this.matchesExpandedCount += searchResult.matchesCount();
    this.treeElements.push(treeElement);
  }
  override wasShown(): void {
    super.wasShown();
    this.treeOutline.registerCSSFiles([searchResultsPaneStyles]);
  }
}

export const matchesExpandedByDefault = 200;
export const matchesShownAtOnce = 20;

export class SearchResultsTreeElement extends UI.TreeOutline.TreeElement {
  private searchConfig: Workspace.SearchConfig.SearchConfig;
  private searchResult: SearchResult;
  private initialized: boolean;
  override toggleOnClick: boolean;

  constructor(searchConfig: Workspace.SearchConfig.SearchConfig, searchResult: SearchResult) {
    super('', true);
    this.searchConfig = searchConfig;
    this.searchResult = searchResult;
    this.initialized = false;
    this.toggleOnClick = true;
  }

  override onexpand(): void {
    if (this.initialized) {
      return;
    }

    this.updateMatchesUI();
    this.initialized = true;
  }

  showAllMatches(): void {
    this.removeChildren();
    this.appendSearchMatches(0, this.searchResult.matchesCount());
  }

  private updateMatchesUI(): void {
    this.removeChildren();
    const toIndex = Math.min(this.searchResult.matchesCount(), matchesShownAtOnce);
    if (toIndex < this.searchResult.matchesCount()) {
      this.appendSearchMatches(0, toIndex - 1);
      this.appendShowMoreMatchesElement(toIndex - 1);
    } else {
      this.appendSearchMatches(0, toIndex);
    }
  }

  override onattach(): void {
    this.updateSearchMatches();
  }

  private updateSearchMatches(): void {
    this.listItemElement.classList.add('search-result');

    const fileNameSpan = span(this.searchResult.label(), 'search-result-file-name');
    fileNameSpan.appendChild(span('\u2014', 'search-result-dash'));
    fileNameSpan.appendChild(span(this.searchResult.description(), 'search-result-qualifier'));

    this.tooltip = this.searchResult.description();
    this.listItemElement.appendChild(fileNameSpan);
    const matchesCountSpan = document.createElement('span');
    matchesCountSpan.className = 'search-result-matches-count';

    matchesCountSpan.textContent = `${this.searchResult.matchesCount()}`;
    UI.ARIAUtils.setLabel(
        matchesCountSpan, i18nString(UIStrings.matchesCountS, {PH1: this.searchResult.matchesCount()}));

    this.listItemElement.appendChild(matchesCountSpan);
    if (this.expanded) {
      this.updateMatchesUI();
    }

    function span(text: string, className: string): Element {
      const span = document.createElement('span');
      span.className = className;
      span.textContent = text;
      return span;
    }
  }

  private appendSearchMatches(fromIndex: number, toIndex: number): void {
    const searchResult = this.searchResult;

    const queries = this.searchConfig.queries();
    const regexes = [];
    for (let i = 0; i < queries.length; ++i) {
      regexes.push(Platform.StringUtilities.createSearchRegex(
          queries[i], !this.searchConfig.ignoreCase(), this.searchConfig.isRegex()));
    }

    for (let i = fromIndex; i < toIndex; ++i) {
      let lineContent = searchResult.matchLineContent(i);
      let matchRanges: TextUtils.TextRange.SourceRange[] = [];
      // Searching in scripts and network response bodies produces one result entry per match. We can skip re-doing the
      // search since we have the exact match range.
      // For matches found in headers or the request URL we re-do the search to find all match ranges.
      const column = searchResult.matchColumn(i);
      const matchLength = searchResult.matchLength(i);
      if (column !== undefined && matchLength !== undefined) {
        const {matchRange, lineSegment} =
            lineSegmentForMatch(lineContent, new TextUtils.TextRange.SourceRange(column, matchLength));
        lineContent = lineSegment;
        matchRanges = [matchRange];
      } else {
        lineContent = lineContent.trim();
        for (let j = 0; j < regexes.length; ++j) {
          matchRanges = matchRanges.concat(this.regexMatchRanges(lineContent, regexes[j]));
        }
        ({lineSegment: lineContent, matchRanges} = lineSegmentForMultipleMatches(lineContent, matchRanges));
      }

      const anchor = Components.Linkifier.Linkifier.linkifyRevealable(searchResult.matchRevealable(i), '');
      anchor.classList.add('search-match-link');
      anchor.tabIndex = 0;
      const labelSpan = document.createElement('span');
      labelSpan.classList.add('search-match-line-number');
      const resultLabel = searchResult.matchLabel(i);
      labelSpan.textContent = resultLabel;
      if (typeof resultLabel === 'number' && !isNaN(resultLabel)) {
        UI.ARIAUtils.setLabel(labelSpan, i18nString(UIStrings.lineS, {PH1: resultLabel}));
      } else {
        UI.ARIAUtils.setLabel(labelSpan, resultLabel);
      }
      anchor.appendChild(labelSpan);

      const contentSpan = this.createContentSpan(lineContent, matchRanges);
      anchor.appendChild(contentSpan);

      const searchMatchElement = new UI.TreeOutline.TreeElement();
      this.appendChild(searchMatchElement);
      searchMatchElement.listItemElement.className = 'search-match';
      searchMatchElement.listItemElement.appendChild(anchor);
      searchMatchElement.listItemElement.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.consume(true);
          void Common.Revealer.reveal(searchResult.matchRevealable(i));
        }
      });
      searchMatchElement.tooltip = lineContent;
    }
  }

  private appendShowMoreMatchesElement(startMatchIndex: number): void {
    const matchesLeftCount = this.searchResult.matchesCount() - startMatchIndex;
    const showMoreMatchesText = i18nString(UIStrings.showDMore, {PH1: matchesLeftCount});
    const showMoreMatchesTreeElement = new UI.TreeOutline.TreeElement(showMoreMatchesText);
    this.appendChild(showMoreMatchesTreeElement);
    showMoreMatchesTreeElement.listItemElement.classList.add('show-more-matches');
    showMoreMatchesTreeElement.onselect =
        this.showMoreMatchesElementSelected.bind(this, showMoreMatchesTreeElement, startMatchIndex);
  }

  private createContentSpan(lineContent: string, matchRanges: TextUtils.TextRange.SourceRange[]): Element {
    const contentSpan = document.createElement('span');
    contentSpan.className = 'search-match-content';
    contentSpan.textContent = lineContent;
    UI.ARIAUtils.setLabel(contentSpan, `${lineContent} line`);
    UI.UIUtils.highlightRangesWithStyleClass(contentSpan, matchRanges, 'highlighted-search-result');
    return contentSpan;
  }

  private regexMatchRanges(lineContent: string, regex: RegExp): TextUtils.TextRange.SourceRange[] {
    regex.lastIndex = 0;
    let match;
    const matchRanges = [];
    while ((regex.lastIndex < lineContent.length) && (match = regex.exec(lineContent))) {
      matchRanges.push(new TextUtils.TextRange.SourceRange(match.index, match[0].length));
    }

    return matchRanges;
  }

  private showMoreMatchesElementSelected(
      showMoreMatchesTreeElement: UI.TreeOutline.TreeElement, startMatchIndex: number): boolean {
    this.removeChild(showMoreMatchesTreeElement);
    this.appendSearchMatches(startMatchIndex, this.searchResult.matchesCount());
    return false;
  }
}

const DEFAULT_OPTS = {
  prefixLength: 25,
  maxLength: 1000,
};

/**
 * Takes a whole line and calculates the substring we want to actually display in the UI.
 * Also returns a translated {matchRange} (the parameter is relative to {lineContent} but the
 * caller needs it relative to {lineSegment}).
 *
 * {lineContent} is modified in the following way:
 *
 *   * Whitespace is trimmed from the beginning (unless the match includes it).
 *   * We only leave {options.prefixLength} characters before the match (and add an ellipsis in
 *     case we removed anything)
 *   * Truncate the remainder to {options.maxLength} characters.
 */
export function lineSegmentForMatch(
    lineContent: string, range: TextUtils.TextRange.SourceRange,
    optionsArg: Partial<typeof DEFAULT_OPTS> =
        DEFAULT_OPTS): {lineSegment: string, matchRange: TextUtils.TextRange.SourceRange} {
  const options = {...DEFAULT_OPTS, ...optionsArg};

  // Remove the whitespace at the beginning, but stop where the match starts.
  const attemptedTrimmedLine = lineContent.trimStart();
  const potentiallyRemovedWhitespaceLength = lineContent.length - attemptedTrimmedLine.length;
  const actuallyRemovedWhitespaceLength = Math.min(range.offset, potentiallyRemovedWhitespaceLength);

  // Apply {options.prefixLength} and {options.maxLength}.
  const lineSegmentBegin = Math.max(actuallyRemovedWhitespaceLength, range.offset - options.prefixLength);
  const lineSegmentEnd = Math.min(lineContent.length, lineSegmentBegin + options.maxLength);
  const lineSegmentPrefix = lineSegmentBegin > actuallyRemovedWhitespaceLength ? '…' : '';

  // Build the resulting line segment and match range.
  const lineSegment = lineSegmentPrefix + lineContent.substring(lineSegmentBegin, lineSegmentEnd);
  const rangeOffset = range.offset - lineSegmentBegin + lineSegmentPrefix.length;
  const rangeLength = Math.min(range.length, lineSegment.length - rangeOffset);
  const matchRange = new TextUtils.TextRange.SourceRange(rangeOffset, rangeLength);

  return {lineSegment, matchRange};
}

/**
 * Takes a line and multiple match ranges and trims/cuts the line accordingly.
 * The match ranges are then adjusted to reflect the transformation.
 *
 * Ideally prefer `lineSegmentForMatch`, it can center the line on the match
 * whereas this method risks cutting matches out of the string.
 */
function lineSegmentForMultipleMatches(lineContent: string, ranges: TextUtils.TextRange.SourceRange[]):
    {lineSegment: string, matchRanges: TextUtils.TextRange.SourceRange[]} {
  let trimBy = 0;
  let matchRanges = ranges;
  if (matchRanges.length > 0 && matchRanges[0].offset > 20) {
    trimBy = 15;
  }
  let lineSegment = lineContent.substring(trimBy, 1000 + trimBy);
  if (trimBy) {
    matchRanges =
        matchRanges.map(range => new TextUtils.TextRange.SourceRange(range.offset - trimBy + 1, range.length));
    lineSegment = '…' + lineSegment;
  }
  return {lineSegment, matchRanges};
}

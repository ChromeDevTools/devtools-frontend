// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';

import searchResultsPaneStyles from './searchResultsPane.css.js';
import type {SearchResult} from './SearchScope.js';

const UIStrings = {
  /**
   * @description Accessibility label for number of matches in each file in search results pane
   * @example {2} PH1
   */
  matchesCountS: 'Matches Count {PH1}',
  /**
   * @description Search result label for results in the Search tool
   * @example {2} PH1
   */
  lineS: 'Line {PH1}',
  /**
   * @description Text in Search Results Pane of the Search tab
   * @example {2} PH1
   */
  showDMore: 'Show {PH1} more',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/search/SearchResultsPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SearchResultsPane extends UI.Widget.VBox {
  private readonly searchConfig: Workspace.SearchConfig.SearchConfig;
  private readonly searchResults: SearchResult[];
  private readonly treeElements = new Map<UI.TreeOutline.TreeElement, SearchResult>();
  private readonly initializedTreeElements = new WeakSet<UI.TreeOutline.TreeElement>();
  private treeOutline: UI.TreeOutline.TreeOutlineInShadow;
  private matchesExpandedCount: number;

  constructor(searchConfig: Workspace.SearchConfig.SearchConfig) {
    super({useShadowDom: true});
    this.searchConfig = searchConfig;

    this.searchResults = [];
    this.treeOutline = new UI.TreeOutline.TreeOutlineInShadow();
    this.treeOutline.registerRequiredCSS(searchResultsPaneStyles);
    this.treeOutline.setHideOverflow(true);
    this.treeOutline.addEventListener(
        UI.TreeOutline.Events.ElementExpanded,
        (event: Common.EventTarget.EventTargetEvent<UI.TreeOutline.TreeElement>) => {
          this.updateMatchesUI(event.data);
        });

    this.contentElement.appendChild(this.treeOutline.element);

    this.matchesExpandedCount = 0;
  }

  addSearchResult(searchResult: SearchResult): void {
    this.searchResults.push(searchResult);
    this.addTreeElement(searchResult);
  }

  showAllMatches(): void {
    for (const [treeElement, searchResult] of this.treeElements.entries()) {
      treeElement.expand();
      treeElement.removeChildren();
      this.appendSearchMatches(treeElement, 0, searchResult.matchesCount());
    }
  }

  collapseAllResults(): void {
    for (const treeElement of this.treeElements.keys()) {
      treeElement.collapse();
    }
  }

  private addTreeElement(searchResult: SearchResult): void {
    const treeElement = new UI.TreeOutline.TreeElement('', true);
    treeElement.toggleOnClick = true;
    this.treeElements.set(treeElement, searchResult);
    this.treeOutline.appendChild(treeElement);
    if (!this.treeOutline.selectedTreeElement) {
      treeElement.select(/* omitFocus */ true, /* selectedByUser */ true);
    }
    // Expand until at least a certain number of matches is expanded.
    if (this.matchesExpandedCount < matchesExpandedByDefault) {
      treeElement.expand();
    }
    this.matchesExpandedCount += searchResult.matchesCount();
    treeElement.listItemElement.classList.add('search-result');
    // clang-format off
    render(html`
      <span class="search-result-file-name">${searchResult.label()}
        <span class="search-result-dash">${'\u2014'}</span>
        <span class="search-result-qualifier">${searchResult.description()}</span>
      </span>
      <span class="search-result-matches-count"
          aria-label=${i18nString(UIStrings.matchesCountS, {PH1: searchResult.matchesCount()})}>
          ${searchResult.matchesCount()}
      </span>`,
    treeElement.listItemElement);
    // clang-format on
    treeElement.tooltip = searchResult.description();
  }

  private updateMatchesUI(element: UI.TreeOutline.TreeElement): void {
    const searchResult = this.treeElements.get(element);
    if (!searchResult || this.initializedTreeElements.has(element)) {
      return;
    }
    element.removeChildren();
    const toIndex = Math.min(searchResult.matchesCount(), matchesShownAtOnce);
    if (toIndex < searchResult.matchesCount()) {
      this.appendSearchMatches(element, 0, toIndex - 1);
      this.appendShowMoreMatchesElement(element, toIndex - 1);
    } else {
      this.appendSearchMatches(element, 0, toIndex);
    }
    this.initializedTreeElements.add(element);
  }

  private appendSearchMatches(element: UI.TreeOutline.TreeElement, fromIndex: number, toIndex: number): void {
    const searchResult = this.treeElements.get(element);
    if (!searchResult) {
      return;
    }
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

      const resultLabel = searchResult.matchLabel(i);

      const searchMatchElement = new UI.TreeOutline.TreeElement();
      element.appendChild(searchMatchElement);
      // clang-format off
      render(html`
        <button class="devtools-link text-button link-style search-match-link"
                jslog="Link; context: search-match; track: click" role="link" tabindex="0"
                @click=${() => void Common.Revealer.reveal(searchResult.matchRevealable(i))}>
          <span class="search-match-line-number"
              aria-label=${typeof resultLabel === 'number' && !isNaN(resultLabel)
                             ?  i18nString(UIStrings.lineS, {PH1: resultLabel}) : resultLabel}>
            ${resultLabel}
          </span>
          <span class="search-match-content" aria-label="${lineContent} line">
            ${lineContent}
          </span>
        </button>`,
        searchMatchElement.listItemElement);
      // clang-format on
      const contentSpan = searchMatchElement.listItemElement.querySelector('.search-match-content') as HTMLElement;
      UI.UIUtils.highlightRangesWithStyleClass(contentSpan, matchRanges, 'highlighted-search-result');
      searchMatchElement.listItemElement.className = 'search-match';
      searchMatchElement.listItemElement.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.consume(true);
          void Common.Revealer.reveal(searchResult.matchRevealable(i));
        }
      });
      searchMatchElement.tooltip = lineContent;
    }
  }

  private appendShowMoreMatchesElement(element: UI.TreeOutline.TreeElement, startMatchIndex: number): void {
    const searchResult = this.treeElements.get(element);
    if (!searchResult) {
      return;
    }
    const matchesLeftCount = searchResult.matchesCount() - startMatchIndex;
    const showMoreMatchesText = i18nString(UIStrings.showDMore, {PH1: matchesLeftCount});
    const showMoreMatchesTreeElement = new UI.TreeOutline.TreeElement(showMoreMatchesText);
    element.appendChild(showMoreMatchesTreeElement);
    showMoreMatchesTreeElement.listItemElement.classList.add('show-more-matches');
    showMoreMatchesTreeElement.onselect =
        this.showMoreMatchesElementSelected.bind(this, element, showMoreMatchesTreeElement, startMatchIndex);
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
      parentElement: UI.TreeOutline.TreeElement, showMoreMatchesTreeElement: UI.TreeOutline.TreeElement,
      startMatchIndex: number): boolean {
    const searchResult = this.treeElements.get(parentElement);
    if (!searchResult) {
      return false;
    }
    parentElement.removeChild(showMoreMatchesTreeElement);
    this.appendSearchMatches(parentElement, startMatchIndex, searchResult.matchesCount());
    return false;
  }
}

export const matchesExpandedByDefault = 200;
export const matchesShownAtOnce = 20;

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

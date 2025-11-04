// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
import searchResultsPaneStyles from './searchResultsPane.css.js';
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
};
const str_ = i18n.i18n.registerUIStrings('panels/search/SearchResultsPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    const { results, matches, expandedResults, onSelectMatch, onExpandSearchResult, onShowMoreMatches } = input;
    const onExpand = (searchResult, { detail: { expanded } }) => {
        if (expanded) {
            expandedResults.add(searchResult);
            onExpandSearchResult(searchResult);
        }
        else {
            expandedResults.delete(searchResult);
        }
    };
    // clang-format off
    render(html `
    <devtools-tree hide-overflow .template=${html `
      <ul role="tree">
        ${results.map(searchResult => html `
          <li @expand=${(e) => onExpand(searchResult, e)}
              role="treeitem"
              class="search-result">
            <style>${searchResultsPaneStyles}</style>
            ${renderSearchResult(searchResult)}
            <ul role="group" ?hidden=${!expandedResults.has(searchResult)}>
              ${renderSearchMatches(searchResult, matches, onSelectMatch, onShowMoreMatches)}
            </ul>
          </li>`)}
      </ul>
    `}></devtools-tree>`, target);
    // clang-format on
};
const renderSearchResult = (searchResult) => {
    // clang-format off
    return html `
    <span class="search-result-file-name">${searchResult.label()}
      <span class="search-result-dash">${'\u2014'}</span>
      <span class="search-result-qualifier">${searchResult.description()}</span>
    </span>
    <span class="search-result-matches-count"
        aria-label=${i18nString(UIStrings.matchesCountS, { PH1: searchResult.matchesCount() })}>
        ${searchResult.matchesCount()}
    </span>`;
    // clang-format on
};
const renderSearchMatches = (searchResult, matches, onSelectMatch, onShowMoreMatches) => {
    const visibleMatches = matches.get(searchResult) ?? [];
    const matchesLeftCount = searchResult.matchesCount() - visibleMatches.length;
    // clang-format off
    return html `
      ${visibleMatches.map(({ lineContent, matchRanges, resultLabel }, i) => html `
        <li role="treeitem" class="search-match" @click=${() => onSelectMatch(searchResult, i)}
          @keydown=${(event) => {
        if (event.key === 'Enter') {
            onSelectMatch(searchResult, i);
        }
    }}
        >
          <button class="devtools-link text-button link-style search-match-link"
                  jslog="Link; context: search-match; track: click" role="link" tabindex="0"
                  @click=${() => void Common.Revealer.reveal(searchResult.matchRevealable(i))}>
            <span class="search-match-line-number"
                aria-label=${typeof resultLabel === 'number' && !isNaN(resultLabel)
        ? i18nString(UIStrings.lineS, { PH1: resultLabel }) : resultLabel}>
              ${resultLabel}
            </span>
            <span class="search-match-content" aria-label="${lineContent} line"
                  ${UI.TreeOutline.TreeSearch.highlight(matchRanges, undefined)}>
              ${lineContent}
            </span>
          </button>
        </li>`)}
      ${matchesLeftCount > 0 ? html `
        <li role="treeitem" class="show-more-matches" @click=${() => onShowMoreMatches(searchResult)}>
          ${i18nString(UIStrings.showDMore, { PH1: matchesLeftCount })}
        </li>` : ''}`;
    // clang-format on
};
export class SearchResultsPane extends UI.Widget.VBox {
    #searchConfig = null;
    #searchResults = [];
    #resultsUpdated = false;
    #expandedResults = new WeakSet();
    #searchMatches = new WeakMap();
    #view;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
    }
    get searchResults() {
        return this.#searchResults;
    }
    set searchResults(searchResults) {
        if (this.#searchResults === searchResults) {
            return;
        }
        if (this.#searchResults.length !== searchResults.length) {
            this.#resultsUpdated = true;
        }
        else if (this.#searchResults.length === searchResults.length) {
            for (let i = 0; i < this.#searchResults.length; ++i) {
                if (this.#searchResults[i] === searchResults[i]) {
                    continue;
                }
                this.#resultsUpdated = true;
                break;
            }
        }
        if (!this.#resultsUpdated) {
            return;
        }
        this.#searchResults = searchResults;
        this.requestUpdate();
    }
    get searchConfig() {
        return this.#searchConfig;
    }
    set searchConfig(searchConfig) {
        this.#searchConfig = searchConfig;
        this.requestUpdate();
    }
    showAllMatches() {
        for (const searchResult of this.#searchResults) {
            const startMatchIndex = this.#searchMatches.get(searchResult)?.length ?? 0;
            this.#appendSearchMatches(searchResult, startMatchIndex, searchResult.matchesCount());
            this.#expandedResults.add(searchResult);
        }
        this.requestUpdate();
    }
    collapseAllResults() {
        this.#expandedResults = new WeakSet();
        this.requestUpdate();
    }
    #onExpandSearchResult(searchResult) {
        const toIndex = Math.min(searchResult.matchesCount(), matchesShownAtOnce);
        this.#appendSearchMatches(searchResult, 0, toIndex);
        this.requestUpdate();
    }
    #appendSearchMatches(searchResult, fromIndex, toIndex) {
        if (!this.#searchConfig) {
            return;
        }
        const queries = this.#searchConfig.queries();
        const regexes = [];
        for (let i = 0; i < queries.length; ++i) {
            regexes.push(Platform.StringUtilities.createSearchRegex(queries[i], !this.#searchConfig.ignoreCase(), this.#searchConfig.isRegex()));
        }
        const searchMatches = this.#searchMatches.get(searchResult) ?? [];
        this.#searchMatches.set(searchResult, searchMatches);
        if (searchMatches.length >= toIndex) {
            return;
        }
        for (let i = fromIndex; i < toIndex; ++i) {
            let lineContent = searchResult.matchLineContent(i);
            let matchRanges = [];
            // Searching in scripts and network response bodies produces one result entry per match. We can skip re-doing the
            // search since we have the exact match range.
            // For matches found in headers or the request URL we re-do the search to find all match ranges.
            const column = searchResult.matchColumn(i);
            const matchLength = searchResult.matchLength(i);
            if (column !== undefined && matchLength !== undefined) {
                const { matchRange, lineSegment } = lineSegmentForMatch(lineContent, new TextUtils.TextRange.SourceRange(column, matchLength));
                lineContent = lineSegment;
                matchRanges = [matchRange];
            }
            else {
                lineContent = lineContent.trim();
                for (let j = 0; j < regexes.length; ++j) {
                    matchRanges = matchRanges.concat(this.#regexMatchRanges(lineContent, regexes[j]));
                }
                ({ lineSegment: lineContent, matchRanges } = lineSegmentForMultipleMatches(lineContent, matchRanges));
            }
            const resultLabel = searchResult.matchLabel(i);
            searchMatches.push({ lineContent, matchRanges, resultLabel });
        }
    }
    performUpdate() {
        if (this.#resultsUpdated) {
            let matchesExpandedCount = 0;
            for (const searchResult of this.#searchResults) {
                if (this.#expandedResults.has(searchResult)) {
                    matchesExpandedCount += this.#searchMatches.get(searchResult)?.length ?? 0;
                }
            }
            for (const searchResult of this.#searchResults) {
                if (matchesExpandedCount < matchesExpandedByDefault && !this.#expandedResults.has(searchResult)) {
                    this.#expandedResults.add(searchResult);
                    this.#onExpandSearchResult(searchResult);
                    matchesExpandedCount += this.#searchMatches.get(searchResult)?.length ?? 0;
                }
            }
            this.#resultsUpdated = false;
        }
        this.#view({
            results: this.#searchResults,
            matches: this.#searchMatches,
            expandedResults: this.#expandedResults,
            onSelectMatch: (searchResult, matchIndex) => {
                void Common.Revealer.reveal(searchResult.matchRevealable(matchIndex));
            },
            onExpandSearchResult: this.#onExpandSearchResult.bind(this),
            onShowMoreMatches: this.#onShowMoreMatches.bind(this),
        }, {}, this.contentElement);
    }
    #regexMatchRanges(lineContent, regex) {
        regex.lastIndex = 0;
        let match;
        const matchRanges = [];
        while ((regex.lastIndex < lineContent.length) && (match = regex.exec(lineContent))) {
            matchRanges.push(new TextUtils.TextRange.SourceRange(match.index, match[0].length));
        }
        return matchRanges;
    }
    #onShowMoreMatches(searchResult) {
        const startMatchIndex = this.#searchMatches.get(searchResult)?.length ?? 0;
        this.#appendSearchMatches(searchResult, startMatchIndex, searchResult.matchesCount());
        this.requestUpdate();
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
export function lineSegmentForMatch(lineContent, range, optionsArg = DEFAULT_OPTS) {
    const options = { ...DEFAULT_OPTS, ...optionsArg };
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
    return { lineSegment, matchRange };
}
/**
 * Takes a line and multiple match ranges and trims/cuts the line accordingly.
 * The match ranges are then adjusted to reflect the transformation.
 *
 * Ideally prefer `lineSegmentForMatch`, it can center the line on the match
 * whereas this method risks cutting matches out of the string.
 */
function lineSegmentForMultipleMatches(lineContent, ranges) {
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
    return { lineSegment, matchRanges };
}
//# sourceMappingURL=SearchResultsPane.js.map
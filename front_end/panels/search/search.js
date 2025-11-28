var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/search/SearchResultsPane.js
var SearchResultsPane_exports = {};
__export(SearchResultsPane_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  SearchResultsPane: () => SearchResultsPane,
  lineSegmentForMatch: () => lineSegmentForMatch,
  matchesExpandedByDefault: () => matchesExpandedByDefault,
  matchesShownAtOnce: () => matchesShownAtOnce
});
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as TextUtils from "./../../models/text_utils/text_utils.js";
import * as UI from "./../../ui/legacy/legacy.js";
import { html, render } from "./../../ui/lit/lit.js";

// gen/front_end/panels/search/searchResultsPane.css.js
var searchResultsPane_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  padding: 0;
  margin: 0;
  overflow-y: auto;
}

.tree-outline {
  padding: 0;
}

.tree-outline ol {
  padding: 0;
}

.tree-outline li {
  height: 16px;
}

li.search-result {
  cursor: pointer;
  font-size: 12px;
  margin-top: 8px;
  padding: 2px 0 2px 4px;
  overflow-wrap: normal;
  white-space: pre;
}

li.search-result .tree-element-title {
  display: flex;
  width: 100%;
}

li.search-result:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

li.search-result .search-result-file-name {
  color: var(--sys-color-on-surface);
  flex: 1 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

li.search-result .search-result-matches-count {
  color: var(--sys-color-token-subtle);
  margin: 0 8px;
}

li.search-result.expanded .search-result-matches-count {
  display: none;
}

li.show-more-matches {
  color: var(--sys-color-on-surface);
  cursor: pointer;
  margin: 8px 0 0 -4px;
}

li.show-more-matches:hover {
  text-decoration: underline;
}

li.search-match {
  margin: 2px 0;
  overflow-wrap: normal;
  white-space: pre;
}

li.search-match .tree-element-title {
  display: flex;
}

li.search-match.selected:focus-visible {
  background: var(--sys-color-tonal-container);
}

li.search-match::before {
  display: none;
}

li.search-match .search-match-line-number {
  color: var(--sys-color-token-subtle);
  text-align: right;
  vertical-align: top;
  word-break: normal;
  padding: 2px 4px 2px 6px;
  margin-right: 5px;
}

.tree-outline .devtools-link {
  text-decoration: none;
  display: block;
  flex: auto;
}

li.search-match .search-match-content {
  color: var(--sys-color-on-surface);
}

ol.children.expanded {
  padding-bottom: 4px;
}

li.search-match .link-style.search-match-link {
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: 9px;
  text-align: left;
}

.search-result-qualifier {
  color: var(--sys-color-token-subtle);
}

.search-result-dash {
  color: var(--sys-color-surface-variant);
  margin: 0 4px;
}

/*# sourceURL=${import.meta.resolve("./searchResultsPane.css")} */`;

// gen/front_end/panels/search/SearchResultsPane.js
var UIStrings = {
  /**
   * @description Accessibility label for number of matches in each file in search results pane
   * @example {2} PH1
   */
  matchesCountS: "Matches Count {PH1}",
  /**
   * @description Search result label for results in the Search tool
   * @example {2} PH1
   */
  lineS: "Line {PH1}",
  /**
   * @description Text in Search Results Pane of the Search tab
   * @example {2} PH1
   */
  showDMore: "Show {PH1} more"
};
var str_ = i18n.i18n.registerUIStrings("panels/search/SearchResultsPane.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var DEFAULT_VIEW = (input, _output, target) => {
  const { results, matches, expandedResults, onSelectMatch, onExpandSearchResult, onShowMoreMatches } = input;
  const onExpand = (searchResult, { detail: { expanded } }) => {
    if (expanded) {
      expandedResults.add(searchResult);
      onExpandSearchResult(searchResult);
    } else {
      expandedResults.delete(searchResult);
    }
  };
  render(html`
    <devtools-tree hide-overflow .template=${html`
      <ul role="tree">
        ${results.map((searchResult) => html`
          <li @expand=${(e) => onExpand(searchResult, e)}
              role="treeitem"
              class="search-result">
            <style>${searchResultsPane_css_default}</style>
            ${renderSearchResult(searchResult)}
            <ul role="group" ?hidden=${!expandedResults.has(searchResult)}>
              ${renderSearchMatches(searchResult, matches, onSelectMatch, onShowMoreMatches)}
            </ul>
          </li>`)}
      </ul>
    `}></devtools-tree>`, target);
};
var renderSearchResult = (searchResult) => {
  return html`
    <span class="search-result-file-name">${searchResult.label()}
      <span class="search-result-dash">${"\u2014"}</span>
      <span class="search-result-qualifier">${searchResult.description()}</span>
    </span>
    <span class="search-result-matches-count"
        aria-label=${i18nString(UIStrings.matchesCountS, { PH1: searchResult.matchesCount() })}>
        ${searchResult.matchesCount()}
    </span>`;
};
var renderSearchMatches = (searchResult, matches, onSelectMatch, onShowMoreMatches) => {
  const visibleMatches = matches.get(searchResult) ?? [];
  const matchesLeftCount = searchResult.matchesCount() - visibleMatches.length;
  return html`
      ${visibleMatches.map(({ lineContent, matchRanges, resultLabel }, i) => html`
        <li role="treeitem" class="search-match" @click=${() => onSelectMatch(searchResult, i)}
          @keydown=${(event) => {
    if (event.key === "Enter") {
      onSelectMatch(searchResult, i);
    }
  }}
        >
          <button class="devtools-link text-button link-style search-match-link"
                  jslog="Link; context: search-match; track: click" role="link" tabindex="0"
                  @click=${() => void Common.Revealer.reveal(searchResult.matchRevealable(i))}>
            <span class="search-match-line-number"
                aria-label=${typeof resultLabel === "number" && !isNaN(resultLabel) ? i18nString(UIStrings.lineS, { PH1: resultLabel }) : resultLabel}>
              ${resultLabel}
            </span>
            <span class="search-match-content" aria-label="${lineContent} line"
                  ${UI.TreeOutline.TreeSearch.highlight(matchRanges, void 0)}>
              ${lineContent}
            </span>
          </button>
        </li>`)}
      ${matchesLeftCount > 0 ? html`
        <li role="treeitem" class="show-more-matches" @click=${() => onShowMoreMatches(searchResult)}>
          ${i18nString(UIStrings.showDMore, { PH1: matchesLeftCount })}
        </li>` : ""}`;
};
var SearchResultsPane = class extends UI.Widget.VBox {
  #searchConfig = null;
  #searchResults = [];
  #resultsUpdated = false;
  #expandedResults = /* @__PURE__ */ new WeakSet();
  #searchMatches = /* @__PURE__ */ new WeakMap();
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
    } else if (this.#searchResults.length === searchResults.length) {
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
    this.#expandedResults = /* @__PURE__ */ new WeakSet();
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
      const column = searchResult.matchColumn(i);
      const matchLength = searchResult.matchLength(i);
      if (column !== void 0 && matchLength !== void 0) {
        const { matchRange, lineSegment } = lineSegmentForMatch(lineContent, new TextUtils.TextRange.SourceRange(column, matchLength));
        lineContent = lineSegment;
        matchRanges = [matchRange];
      } else {
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
      onShowMoreMatches: this.#onShowMoreMatches.bind(this)
    }, {}, this.contentElement);
  }
  #regexMatchRanges(lineContent, regex) {
    regex.lastIndex = 0;
    let match;
    const matchRanges = [];
    while (regex.lastIndex < lineContent.length && (match = regex.exec(lineContent))) {
      matchRanges.push(new TextUtils.TextRange.SourceRange(match.index, match[0].length));
    }
    return matchRanges;
  }
  #onShowMoreMatches(searchResult) {
    const startMatchIndex = this.#searchMatches.get(searchResult)?.length ?? 0;
    this.#appendSearchMatches(searchResult, startMatchIndex, searchResult.matchesCount());
    this.requestUpdate();
  }
};
var matchesExpandedByDefault = 200;
var matchesShownAtOnce = 20;
var DEFAULT_OPTS = {
  prefixLength: 25,
  maxLength: 1e3
};
function lineSegmentForMatch(lineContent, range, optionsArg = DEFAULT_OPTS) {
  const options = { ...DEFAULT_OPTS, ...optionsArg };
  const attemptedTrimmedLine = lineContent.trimStart();
  const potentiallyRemovedWhitespaceLength = lineContent.length - attemptedTrimmedLine.length;
  const actuallyRemovedWhitespaceLength = Math.min(range.offset, potentiallyRemovedWhitespaceLength);
  const lineSegmentBegin = Math.max(actuallyRemovedWhitespaceLength, range.offset - options.prefixLength);
  const lineSegmentEnd = Math.min(lineContent.length, lineSegmentBegin + options.maxLength);
  const lineSegmentPrefix = lineSegmentBegin > actuallyRemovedWhitespaceLength ? "\u2026" : "";
  const lineSegment = lineSegmentPrefix + lineContent.substring(lineSegmentBegin, lineSegmentEnd);
  const rangeOffset = range.offset - lineSegmentBegin + lineSegmentPrefix.length;
  const rangeLength = Math.min(range.length, lineSegment.length - rangeOffset);
  const matchRange = new TextUtils.TextRange.SourceRange(rangeOffset, rangeLength);
  return { lineSegment, matchRange };
}
function lineSegmentForMultipleMatches(lineContent, ranges) {
  let trimBy = 0;
  let matchRanges = ranges;
  if (matchRanges.length > 0 && matchRanges[0].offset > 20) {
    trimBy = 15;
  }
  let lineSegment = lineContent.substring(trimBy, 1e3 + trimBy);
  if (trimBy) {
    matchRanges = matchRanges.map((range) => new TextUtils.TextRange.SourceRange(range.offset - trimBy + 1, range.length));
    lineSegment = "\u2026" + lineSegment;
  }
  return { lineSegment, matchRanges };
}

// gen/front_end/panels/search/SearchScope.js
var SearchScope_exports = {};

// gen/front_end/panels/search/SearchView.js
var SearchView_exports = {};
__export(SearchView_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW2,
  SearchView: () => SearchView
});
import "./../../ui/legacy/legacy.js";
import "./../../ui/kit/kit.js";
import * as Common2 from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Workspace from "./../../models/workspace/workspace.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import { Directives, html as html2, render as render2 } from "./../../ui/lit/lit.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/search/searchView.css.js
var searchView_css_default = `/*
 * Copyright 2014 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.search-drawer-header {
  flex-shrink: 0;
  overflow: hidden;
  display: inline-flex;
  min-width: 150px;

  .search-container {
    border-bottom: 1px solid var(--sys-color-divider);
    display: flex;
    align-items: center;
    flex-grow: 1;
  }

  .toolbar-item-search {
    flex-grow: 1;
    box-shadow: inset 0 0 0 2px transparent;
    box-sizing: border-box;
    height: var(--sys-size-9);
    margin-left: var(--sys-size-3);
    padding: 0 var(--sys-size-2) 0 var(--sys-size-5);
    border-radius: 100px;
    position: relative;
    display: flex;
    align-items: center;
    background-color: var(--sys-color-cdt-base);

    &:has(input:focus) {
      box-shadow: inset 0 0 0 2px var(--sys-color-state-focus-ring);
    }

    &:has(input:hover)::before {
      content: "";
      box-sizing: inherit;
      height: 100%;
      width: 100%;
      position: absolute;
      border-radius: 100px;
      left: 0;
      background-color: var(--sys-color-state-hover-on-subtle);
    }

    & > devtools-icon {
      color: var(--sys-color-on-surface-subtle);
      width: var(--sys-size-8);
      height: var(--sys-size-8);
      margin-right: var(--sys-size-3);
    }

    & > devtools-button:last-child {
      margin-right: var(--sys-size-4);
    }
  }

  .search-toolbar-input {
    appearance: none;
    color: var(--sys-color-on-surface);
    background-color: transparent;
    border: 0;
    z-index: 1;
    flex: 1;

    &::placeholder {
      color: var(--sys-color-on-surface-subtle);
    }

    &:placeholder-shown + .clear-button {
      display: none;
    }

    &::-webkit-search-cancel-button {
      display: none;
    }
  }
}

.search-toolbar {
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: 1px solid var(--sys-color-divider);
}

.search-toolbar-summary {
  background-color: var(--sys-color-cdt-base-container);
  border-top: 1px solid var(--sys-color-divider);
  padding-left: 5px;
  flex: 0 0 19px;
  display: flex;
  padding-right: 5px;
}

.search-results:has(.empty-state) + .search-toolbar-summary {
  display: none;
}

.search-toolbar-summary .search-message {
  padding-top: 2px;
  padding-left: 1ex;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.search-results {
  overflow-y: auto;
  display: flex;
  flex: auto;
}

.search-results > div {
  flex: auto;
}

/*# sourceURL=${import.meta.resolve("./searchView.css")} */`;

// gen/front_end/panels/search/SearchView.js
var UIStrings2 = {
  /**
   * @description Placeholder text of a search bar
   */
  find: "Find",
  /**
   * @description Tooltip text on a toggle to enable search by matching case of the input
   */
  enableCaseSensitive: "Enable case sensitive search",
  /**
   * @description Tooltip text on a toggle to disable search by matching case of the input
   */
  disableCaseSensitive: "Disable case sensitive search",
  /**
   * @description Tooltip text on a toggle to enable searching with regular expression
   */
  enableRegularExpression: "Enable regular expressions",
  /**
   * @description Tooltip text on a toggle to disable searching with regular expression
   */
  disableRegularExpression: "Disable regular expressions",
  /**
   * @description Text to refresh the page
   */
  refresh: "Refresh",
  /**
   * @description Tooltip text to clear the search input field
   */
  clearInput: "Clear",
  /**
   * @description Text to clear content
   */
  clear: "Clear search",
  /**
   * @description Search message element text content in Search View of the Search tab
   */
  indexing: "Indexing\u2026",
  /**
   * @description Text to indicate the searching is in progress
   */
  searching: "Searching\u2026",
  /**
   * @description Text in Search View of the Search tab
   */
  indexingInterrupted: "Indexing interrupted.",
  /**
   * @description Search results message element text content in Search View of the Search tab
   */
  foundMatchingLineInFile: "Found 1 matching line in 1 file.",
  /**
   * @description Search results message element text content in Search View of the Search tab
   * @example {2} PH1
   */
  foundDMatchingLinesInFile: "Found {PH1} matching lines in 1 file.",
  /**
   * @description Search results message element text content in Search View of the Search tab
   * @example {2} PH1
   * @example {2} PH2
   */
  foundDMatchingLinesInDFiles: "Found {PH1} matching lines in {PH2} files.",
  /**
   * @description Search results message element text content in Search View of the Search tab
   */
  noMatchesFound: "No matches found",
  /**
   * @description Search results message element text content in Search View of the Search tab
   */
  nothingMatchedTheQuery: "Nothing matched your search query",
  /**
   * @description Text in Search View of the Search tab
   */
  searchFinished: "Search finished.",
  /**
   * @description Text in Search View of the Search tab
   */
  searchInterrupted: "Search interrupted.",
  /**
   * @description Text in Search View of the Search tab if user hasn't started the search
   * @example {Enter} PH1
   */
  typeAndPressSToSearch: "Type and press {PH1} to search",
  /**
   * @description Text in Search view of the Search tab if user hasn't started the search
   */
  noSearchResult: "No search results"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/search/SearchView.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var { ref, live } = Directives;
var { widgetConfig, widgetRef } = UI2.Widget;
var DEFAULT_VIEW2 = (input, output, target) => {
  const { query, matchCase, isRegex, searchConfig, searchMessage, searchResults, searchResultsMessage, progress, onQueryChange, onQueryKeyDown, onPanelKeyDown, onClearSearchInput, onToggleRegex, onToggleMatchCase, onRefresh, onClearSearch } = input;
  let header = "", text = "";
  if (!query) {
    header = i18nString2(UIStrings2.noSearchResult);
    text = i18nString2(UIStrings2.typeAndPressSToSearch, { PH1: UI2.KeyboardShortcut.KeyboardShortcut.shortcutToString(UI2.KeyboardShortcut.Keys.Enter) });
  } else if (progress) {
    header = i18nString2(UIStrings2.searching);
  } else if (!searchResults.length) {
    header = i18nString2(UIStrings2.noMatchesFound);
    text = i18nString2(UIStrings2.nothingMatchedTheQuery);
  }
  render2(html2`
      <style>${UI2.inspectorCommonStyles}</style>
      <style>${searchView_css_default}</style>
      <div class="search-drawer-header" @keydown=${onPanelKeyDown}>
        <div class="search-container">
          <div class="toolbar-item-search">
            <devtools-icon name="search"></devtools-icon>
            <input type="text"
                class="search-toolbar-input"
                placeholder=${i18nString2(UIStrings2.find)}
                jslog=${VisualLogging.textField().track({
    change: true,
    keydown: "ArrowUp|ArrowDown|Enter"
  })}
                aria-label=${i18nString2(UIStrings2.find)}
                size="100" results="0"
                .value=${live(query)}
                @keydown=${onQueryKeyDown}
                @input=${(e) => onQueryChange(e.target.value)}
                ${ref((e) => {
    output.focusSearchInput = () => {
      if (e instanceof HTMLInputElement) {
        e.focus();
        e.select();
      }
    };
  })}>
            <devtools-button class="clear-button" tabindex="-1"
                @click=${onClearSearchInput}
                .data=${{
    variant: "icon",
    iconName: "cross-circle-filled",
    jslogContext: "clear-input",
    size: "SMALL",
    title: i18nString2(UIStrings2.clearInput)
  }}
            ></devtools-button>
            <devtools-button @click=${onToggleRegex} .data=${{
    variant: "icon_toggle",
    iconName: "regular-expression",
    toggledIconName: "regular-expression",
    toggleType: "primary-toggle",
    size: "SMALL",
    toggled: isRegex,
    title: isRegex ? i18nString2(UIStrings2.disableRegularExpression) : i18nString2(UIStrings2.enableRegularExpression),
    jslogContext: "regular-expression"
  }}
              class="regex-button"
            ></devtools-button>
            <devtools-button @click=${onToggleMatchCase} .data=${{
    variant: "icon_toggle",
    iconName: "match-case",
    toggledIconName: "match-case",
    toggleType: "primary-toggle",
    size: "SMALL",
    toggled: matchCase,
    title: matchCase ? i18nString2(UIStrings2.disableCaseSensitive) : i18nString2(UIStrings2.enableCaseSensitive),
    jslogContext: "match-case"
  }}
              class="match-case-button"
            ></devtools-button>
          </div>
        </div>
        <devtools-toolbar class="search-toolbar" jslog=${VisualLogging.toolbar()}>
          <devtools-button title=${i18nString2(UIStrings2.refresh)} @click=${onRefresh}
              .data=${{
    variant: "toolbar",
    iconName: "refresh",
    jslogContext: "search.refresh"
  }}></devtools-button>
          <devtools-button title=${i18nString2(UIStrings2.clear)} @click=${onClearSearch}
              .data=${{
    variant: "toolbar",
    iconName: "clear",
    jslogContext: "search.clear"
  }}></devtools-button>
        </devtools-toolbar>
      </div>
      <div class="search-results" @keydown=${onPanelKeyDown}>
        ${searchResults.length ? html2`<devtools-widget .widgetConfig=${widgetConfig(SearchResultsPane, { searchResults, searchConfig })}
            ${widgetRef(SearchResultsPane, (w) => {
    output.showAllMatches = () => void w.showAllMatches();
    output.collapseAllResults = () => void w.collapseAllResults();
  })}>
            </devtools-widget>` : html2`<devtools-widget .widgetConfig=${widgetConfig(UI2.EmptyWidget.EmptyWidget, { header, text })}>
                  </devtools-widget>`}
      </div>
      <div class="search-toolbar-summary" @keydown=${onPanelKeyDown}>
        <div class="search-message">${searchMessage}</div>
        <div class="flex-centered">
          ${progress ? html2`
            <devtools-progress .title=${progress.title ?? ""}
                               .worked=${progress.worked} .totalWork=${progress.totalWork}>
            </devtools-progress>` : ""}
        </div>
        <div class="search-message">${searchResultsMessage}</div>
      </div>`, target);
};
var SearchView = class extends UI2.Widget.VBox {
  #view;
  #focusSearchInput = () => {
  };
  #showAllMatches = () => {
  };
  #collapseAllResults = () => {
  };
  #isIndexing;
  #searchId;
  #searchMatchesCount;
  #searchResultsCount;
  #nonEmptySearchResultsCount;
  #searchingView;
  #searchConfig;
  #pendingSearchConfig;
  #progress;
  #query;
  #matchCase = false;
  #isRegex = false;
  #searchMessage = "";
  #searchResultsMessage = "";
  #advancedSearchConfig;
  #searchScope;
  #searchResults = [];
  constructor(settingKey, view = DEFAULT_VIEW2) {
    super({
      jslog: `${VisualLogging.panel("search").track({ resize: true })}`,
      useShadowDom: true
    });
    this.#view = view;
    this.setMinimumSize(0, 40);
    this.#isIndexing = false;
    this.#searchId = 1;
    this.#query = "";
    this.#searchMatchesCount = 0;
    this.#searchResultsCount = 0;
    this.#nonEmptySearchResultsCount = 0;
    this.#searchingView = null;
    this.#searchConfig = null;
    this.#pendingSearchConfig = null;
    this.#progress = null;
    this.#advancedSearchConfig = Common2.Settings.Settings.instance().createLocalSetting(settingKey + "-search-config", new Workspace.SearchConfig.SearchConfig("", true, false).toPlainObject());
    this.performUpdate();
    this.#load();
    this.performUpdate();
    this.#searchScope = null;
  }
  performUpdate() {
    const input = {
      query: this.#query,
      matchCase: this.#matchCase,
      isRegex: this.#isRegex,
      searchConfig: this.#searchConfig,
      searchMessage: this.#searchMessage,
      searchResults: this.#searchResults.filter((searchResult) => searchResult.matchesCount()),
      searchResultsMessage: this.#searchResultsMessage,
      progress: this.#progress,
      onQueryChange: (query) => {
        this.#query = query;
      },
      onQueryKeyDown: this.#onQueryKeyDown.bind(this),
      onPanelKeyDown: this.#onPanelKeyDown.bind(this),
      onClearSearchInput: this.#onClearSearchInput.bind(this),
      onToggleRegex: this.#onToggleRegex.bind(this),
      onToggleMatchCase: this.#onToggleMatchCase.bind(this),
      onRefresh: this.#onRefresh.bind(this),
      onClearSearch: this.#onClearSearch.bind(this)
    };
    const that = this;
    const output = {
      set focusSearchInput(value) {
        that.#focusSearchInput = value;
      },
      set showAllMatches(value) {
        that.#showAllMatches = value;
      },
      set collapseAllResults(value) {
        that.#collapseAllResults = value;
      }
    };
    this.#view(input, output, this.contentElement);
  }
  #onToggleRegex() {
    this.#isRegex = !this.#isRegex;
    this.performUpdate();
  }
  #onToggleMatchCase() {
    this.#matchCase = !this.#matchCase;
    this.performUpdate();
  }
  #buildSearchConfig() {
    return new Workspace.SearchConfig.SearchConfig(this.#query, !this.#matchCase, this.#isRegex);
  }
  toggle(queryCandidate, searchImmediately) {
    this.#query = queryCandidate;
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.focus();
    });
    this.#initScope();
    if (searchImmediately) {
      this.#onRefresh();
    } else {
      this.#startIndexing();
    }
  }
  createScope() {
    throw new Error("Not implemented");
  }
  #initScope() {
    this.#searchScope = this.createScope();
  }
  #onIndexingFinished() {
    if (!this.#progress) {
      return;
    }
    const finished = !this.#progress.canceled;
    this.#progress = null;
    this.#isIndexing = false;
    this.#searchMessage = finished ? "" : i18nString2(UIStrings2.indexingInterrupted);
    if (!finished) {
      this.#pendingSearchConfig = null;
    }
    this.performUpdate();
    if (!this.#pendingSearchConfig) {
      return;
    }
    const searchConfig = this.#pendingSearchConfig;
    this.#pendingSearchConfig = null;
    this.#startSearch(searchConfig);
  }
  #startIndexing() {
    this.#isIndexing = true;
    if (this.#progress) {
      this.#progress.done = true;
    }
    this.#progress = new Common2.Progress.ProgressProxy(new Common2.Progress.Progress(), this.#onIndexingFinished.bind(this), this.requestUpdate.bind(this));
    this.#searchMessage = i18nString2(UIStrings2.indexing);
    this.performUpdate();
    if (this.#searchScope) {
      this.#searchScope.performIndexing(this.#progress);
    }
  }
  #onClearSearchInput() {
    this.#query = "";
    this.requestUpdate();
    this.#save();
    this.focus();
  }
  #onSearchResult(searchId, searchResult) {
    if (searchId !== this.#searchId || !this.#progress) {
      return;
    }
    if (this.#progress?.canceled) {
      this.#onIndexingFinished();
      return;
    }
    this.#searchResults.push(searchResult);
    this.#addSearchResult(searchResult);
    this.requestUpdate();
  }
  #onSearchFinished(searchId, finished) {
    if (searchId !== this.#searchId || !this.#progress) {
      return;
    }
    this.#progress = null;
    this.#searchFinished(finished);
    UI2.ARIAUtils.LiveAnnouncer.alert(this.#searchMessage + " " + this.#searchResultsMessage);
  }
  #startSearch(searchConfig) {
    this.#searchConfig = searchConfig;
    if (this.#progress) {
      this.#progress.done = true;
    }
    this.#progress = new Common2.Progress.ProgressProxy(new Common2.Progress.Progress(), void 0, this.requestUpdate.bind(this));
    this.#searchStarted();
    if (this.#searchScope) {
      void this.#searchScope.performSearch(searchConfig, this.#progress, this.#onSearchResult.bind(this, this.#searchId), this.#onSearchFinished.bind(this, this.#searchId));
    }
  }
  #resetSearch() {
    this.#stopSearch();
    this.#searchResults = [];
    this.#searchMessage = "";
    this.#searchResultsMessage = "";
    this.performUpdate();
  }
  #stopSearch() {
    if (this.#progress && !this.#isIndexing) {
      this.#progress.canceled = true;
    }
    if (this.#searchScope) {
      this.#searchScope.stopSearch();
    }
  }
  #searchStarted() {
    this.#searchMatchesCount = 0;
    this.#searchResultsCount = 0;
    this.#searchResults = [];
    this.#nonEmptySearchResultsCount = 0;
    if (!this.#searchingView) {
      this.#searchingView = new UI2.EmptyWidget.EmptyWidget(i18nString2(UIStrings2.searching), "");
    }
    this.#searchMessage = i18nString2(UIStrings2.searching);
    this.performUpdate();
    this.#updateSearchResultsMessage();
  }
  #updateSearchResultsMessage() {
    if (this.#searchMatchesCount && this.#searchResultsCount) {
      if (this.#searchMatchesCount === 1 && this.#nonEmptySearchResultsCount === 1) {
        this.#searchResultsMessage = i18nString2(UIStrings2.foundMatchingLineInFile);
      } else if (this.#searchMatchesCount > 1 && this.#nonEmptySearchResultsCount === 1) {
        this.#searchResultsMessage = i18nString2(UIStrings2.foundDMatchingLinesInFile, { PH1: this.#searchMatchesCount });
      } else {
        this.#searchResultsMessage = i18nString2(UIStrings2.foundDMatchingLinesInDFiles, { PH1: this.#searchMatchesCount, PH2: this.#nonEmptySearchResultsCount });
      }
    } else {
      this.#searchResultsMessage = "";
    }
    this.performUpdate();
  }
  #addSearchResult(searchResult) {
    const matchesCount = searchResult.matchesCount();
    this.#searchMatchesCount += matchesCount;
    this.#searchResultsCount++;
    if (matchesCount) {
      this.#nonEmptySearchResultsCount++;
    }
    this.#updateSearchResultsMessage();
  }
  #searchFinished(finished) {
    this.#searchMessage = finished ? i18nString2(UIStrings2.searchFinished) : i18nString2(UIStrings2.searchInterrupted);
    this.requestUpdate();
  }
  focus() {
    this.#focusSearchInput();
  }
  willHide() {
    super.willHide();
    this.#stopSearch();
  }
  #onQueryKeyDown(event) {
    this.#save();
    switch (event.keyCode) {
      case UI2.KeyboardShortcut.Keys.Enter.code:
        this.#onRefresh();
        break;
    }
  }
  /**
   * Handles keydown event on panel itself for handling expand/collapse all shortcut
   *
   * We use `event.code` instead of `event.key` here to check whether the shortcut is triggered.
   * The reason is, `event.key` is dependent on the modification keys, locale and keyboard layout.
   * Usually it is useful when we care about the character that needs to be printed.
   *
   * However, our aim in here is to assign a shortcut to the physical key combination on the keyboard
   * not on the character that the key combination prints.
   *
   * For example, `Cmd + [` shortcut in global shortcuts map to focusing on previous panel.
   * In Turkish - Q keyboard layout, the key combination that triggers the shortcut prints `ğ`
   * character. Whereas in Turkish - Q Legacy keyboard layout, the shortcut that triggers focusing
   * on previous panel prints `[` character. So, if we use `event.key` and check
   * whether it is `[`, we break the shortcut in Turkish - Q keyboard layout.
   *
   * @param event KeyboardEvent
   */
  #onPanelKeyDown(event) {
    const isMac = Host.Platform.isMac();
    const shouldShowAllForMac = isMac && event.metaKey && !event.ctrlKey && event.altKey && event.code === "BracketRight";
    const shouldShowAllForOtherPlatforms = !isMac && event.ctrlKey && !event.metaKey && event.shiftKey && event.code === "BracketRight";
    const shouldCollapseAllForMac = isMac && event.metaKey && !event.ctrlKey && event.altKey && event.code === "BracketLeft";
    const shouldCollapseAllForOtherPlatforms = !isMac && event.ctrlKey && !event.metaKey && event.shiftKey && event.code === "BracketLeft";
    if (shouldShowAllForMac || shouldShowAllForOtherPlatforms) {
      this.#showAllMatches();
      void VisualLogging.logKeyDown(event.currentTarget, event, "show-all-matches");
    } else if (shouldCollapseAllForMac || shouldCollapseAllForOtherPlatforms) {
      this.#collapseAllResults();
      void VisualLogging.logKeyDown(event.currentTarget, event, "collapse-all-results");
    }
  }
  #save() {
    this.#advancedSearchConfig.set(this.#buildSearchConfig().toPlainObject());
  }
  #load() {
    const searchConfig = Workspace.SearchConfig.SearchConfig.fromPlainObject(this.#advancedSearchConfig.get());
    this.#query = searchConfig.query();
    this.#matchCase = !searchConfig.ignoreCase();
    this.#isRegex = searchConfig.isRegex();
    this.requestUpdate();
  }
  #onRefresh() {
    const searchConfig = this.#buildSearchConfig();
    if (!searchConfig.query()?.length) {
      return;
    }
    this.#resetSearch();
    ++this.#searchId;
    this.#initScope();
    if (!this.#isIndexing) {
      this.#startIndexing();
    }
    this.#pendingSearchConfig = searchConfig;
  }
  #onClearSearch() {
    this.#resetSearch();
    this.#onClearSearchInput();
  }
};
export {
  SearchResultsPane_exports as SearchResultsPane,
  SearchScope_exports as SearchScope,
  SearchView_exports as SearchView
};
//# sourceMappingURL=search.js.map

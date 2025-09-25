// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/legacy.js';
import '../../ui/components/icon_button/icon_button.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {SearchResultsPane} from './SearchResultsPane.js';
import type {SearchResult, SearchScope} from './SearchScope.js';
import searchViewStyles from './searchView.css.js';

const UIStrings = {
  /**
   * @description Placeholder text of a search bar
   */
  find: 'Find',
  /**
   * @description Tooltip text on a toggle to enable search by matching case of the input
   */
  enableCaseSensitive: 'Enable case sensitive search',
  /**
   * @description Tooltip text on a toggle to disable search by matching case of the input
   */
  disableCaseSensitive: 'Disable case sensitive search',
  /**
   * @description Tooltip text on a toggle to enable searching with regular expression
   */
  enableRegularExpression: 'Enable regular expressions',
  /**
   * @description Tooltip text on a toggle to disable searching with regular expression
   */
  disableRegularExpression: 'Disable regular expressions',
  /**
   * @description Text to refresh the page
   */
  refresh: 'Refresh',
  /**
   * @description Tooltip text to clear the search input field
   */
  clearInput: 'Clear',
  /**
   * @description Text to clear content
   */
  clear: 'Clear search',
  /**
   * @description Search message element text content in Search View of the Search tab
   */
  indexing: 'Indexing…',
  /**
   * @description Text to indicate the searching is in progress
   */
  searching: 'Searching…',
  /**
   * @description Text in Search View of the Search tab
   */
  indexingInterrupted: 'Indexing interrupted.',
  /**
   * @description Search results message element text content in Search View of the Search tab
   */
  foundMatchingLineInFile: 'Found 1 matching line in 1 file.',
  /**
   * @description Search results message element text content in Search View of the Search tab
   * @example {2} PH1
   */
  foundDMatchingLinesInFile: 'Found {PH1} matching lines in 1 file.',
  /**
   * @description Search results message element text content in Search View of the Search tab
   * @example {2} PH1
   * @example {2} PH2
   */
  foundDMatchingLinesInDFiles: 'Found {PH1} matching lines in {PH2} files.',
  /**
   * @description Search results message element text content in Search View of the Search tab
   */
  noMatchesFound: 'No matches found',
  /**
   * @description Search results message element text content in Search View of the Search tab
   */
  nothingMatchedTheQuery: 'Nothing matched your search query',
  /**
   * @description Text in Search View of the Search tab
   */
  searchFinished: 'Search finished.',
  /**
   * @description Text in Search View of the Search tab
   */
  searchInterrupted: 'Search interrupted.',
  /**
   * @description Text in Search View of the Search tab if user hasn't started the search
   * @example {Enter} PH1
   */
  typeAndPressSToSearch: 'Type and press {PH1} to search',
  /**
   * @description Text in Search view of the Search tab if user hasn't started the search
   */
  noSearchResult: 'No search results',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/search/SearchView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {ref, live} = Directives;
const {widgetConfig, widgetRef} = UI.Widget;

export interface SearchViewInput {
  query: string;
  matchCase: boolean;
  isRegex: boolean;
  searchConfig: Workspace.SearchConfig.SearchConfig|null;
  searchMessage: string;
  searchResultsMessage: string;
  searchResults: SearchResult[];
  progress: Common.Progress.Progress|null;
  onQueryChange: (query: string) => void;
  onQueryKeyDown: (evt: KeyboardEvent) => void;
  onPanelKeyDown: (evt: KeyboardEvent) => void;
  onClearSearchInput: () => void;
  onToggleRegex: () => void;
  onToggleMatchCase: () => void;
  onRefresh: () => void;
  onClearSearch: () => void;
}

export interface SearchViewOutput {
  focusSearchInput: () => void;
  showAllMatches: () => void;
  collapseAllResults: () => void;
}

export type View = (input: SearchViewInput, output: SearchViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  const {
    query,
    matchCase,
    isRegex,
    searchConfig,
    searchMessage,
    searchResults,
    searchResultsMessage,
    progress,
    onQueryChange,
    onQueryKeyDown,
    onPanelKeyDown,
    onClearSearchInput,
    onToggleRegex,
    onToggleMatchCase,
    onRefresh,
    onClearSearch,
  } = input;
  let header = '', text = '';
  if (!query) {
    header = i18nString(UIStrings.noSearchResult);
    text = i18nString(
        UIStrings.typeAndPressSToSearch,
        {PH1: UI.KeyboardShortcut.KeyboardShortcut.shortcutToString(UI.KeyboardShortcut.Keys.Enter)});
  } else if (progress) {
    header = i18nString(UIStrings.searching);
  } else if (!searchResults.length) {
    header = i18nString(UIStrings.noMatchesFound);
    text = i18nString(UIStrings.nothingMatchedTheQuery);
  }
  // clang-format off
  render(html`
      <style>${UI.inspectorCommonStyles}</style>
      <style>${searchViewStyles}</style>
      <div class="search-drawer-header" @keydown=${onPanelKeyDown}>
        <div class="search-container">
          <div class="toolbar-item-search">
            <devtools-icon name="search"></devtools-icon>
            <input type="text"
                class="search-toolbar-input"
                placeholder=${i18nString(UIStrings.find)}
                jslog=${VisualLogging.textField().track({
                    change: true, keydown: 'ArrowUp|ArrowDown|Enter'})}
                aria-label=${i18nString(UIStrings.find)}
                size="100" results="0"
                .value=${live(query)}
                @keydown=${onQueryKeyDown}
                @input=${(e: Event) => onQueryChange((e.target as HTMLInputElement).value)}
                ${ref(e => {
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
                  variant: Buttons.Button.Variant.ICON,
                  iconName: 'cross-circle-filled',
                  jslogContext: 'clear-input',
                  size: Buttons.Button.Size.SMALL,
                  title: i18nString(UIStrings.clearInput),
                } as Buttons.Button.ButtonData}
            ></devtools-button>
            <devtools-button @click=${onToggleRegex} .data=${{
                variant: Buttons.Button.Variant.ICON_TOGGLE,
                iconName: 'regular-expression',
                toggledIconName: 'regular-expression',
                toggleType: Buttons.Button.ToggleType.PRIMARY,
                size: Buttons.Button.Size.SMALL,
                toggled: isRegex,
                title: isRegex ? i18nString(UIStrings.disableRegularExpression) : i18nString(UIStrings.enableRegularExpression),
                jslogContext: 'regular-expression',
              } as Buttons.Button.ButtonData}
              class="regex-button"
            ></devtools-button>
            <devtools-button @click=${onToggleMatchCase} .data=${{
                variant: Buttons.Button.Variant.ICON_TOGGLE,
                iconName: 'match-case',
                toggledIconName: 'match-case',
                toggleType: Buttons.Button.ToggleType.PRIMARY,
                size: Buttons.Button.Size.SMALL,
                toggled: matchCase,
                title: matchCase ? i18nString(UIStrings.disableCaseSensitive) : i18nString(UIStrings.enableCaseSensitive),
                jslogContext: 'match-case',
              } as Buttons.Button.ButtonData}
              class="match-case-button"
            ></devtools-button>
          </div>
        </div>
        <devtools-toolbar class="search-toolbar" jslog=${VisualLogging.toolbar()}>
          <devtools-button title=${i18nString(UIStrings.refresh)} @click=${onRefresh}
              .data=${{
                variant: Buttons.Button.Variant.TOOLBAR,
                iconName: 'refresh',
                jslogContext: 'search.refresh',
              } as Buttons.Button.ButtonData}></devtools-button>
          <devtools-button title=${i18nString(UIStrings.clear)} @click=${onClearSearch}
              .data=${{
                variant: Buttons.Button.Variant.TOOLBAR,
                iconName: 'clear',
                jslogContext: 'search.clear',
              } as Buttons.Button.ButtonData}></devtools-button>
        </devtools-toolbar>
      </div>
      <div class="search-results" @keydown=${onPanelKeyDown}>
        ${searchResults.length
           ? html`<devtools-widget .widgetConfig=${widgetConfig(SearchResultsPane, {searchResults, searchConfig})}
            ${widgetRef(SearchResultsPane, w => {
              output.showAllMatches = () => void w.showAllMatches();
              output.collapseAllResults = () => void w.collapseAllResults(); })}>
            </devtools-widget>`
           : html`<devtools-widget .widgetConfig=${widgetConfig(UI.EmptyWidget.EmptyWidget, {header, text})}>
                  </devtools-widget>`}
      </div>
      <div class="search-toolbar-summary" @keydown=${onPanelKeyDown}>
        <div class="search-message">${searchMessage}</div>
        <div class="flex-centered">
          ${progress ? html`
            <devtools-progress .title=${progress.title ?? ''}
                               .worked=${progress.worked} .totalWork=${progress.totalWork}>
            </devtools-progress>` : ''}
        </div>
        <div class="search-message">${searchResultsMessage}</div>
      </div>`, target);
  // clang-format on
};

export class SearchView extends UI.Widget.VBox {
  readonly #view: View;
  #focusSearchInput = (): void => {};
  #showAllMatches = (): void => {};
  #collapseAllResults = (): void => {};
  #isIndexing: boolean;
  #searchId: number;
  #searchMatchesCount: number;
  #searchResultsCount: number;
  #nonEmptySearchResultsCount: number;
  #searchingView: UI.Widget.Widget|null;
  #searchConfig: Workspace.SearchConfig.SearchConfig|null;
  #pendingSearchConfig: Workspace.SearchConfig.SearchConfig|null;
  #progress: Common.Progress.Progress|null;
  #query: string;
  #matchCase = false;
  #isRegex = false;
  #searchMessage = '';
  #searchResultsMessage = '';
  readonly #advancedSearchConfig: Common.Settings.Setting<{
    query: string,
    ignoreCase: boolean,
    isRegex: boolean,
  }>;
  #searchScope: SearchScope|null;

  #searchResults: SearchResult[] = [];

  constructor(settingKey: string, view = DEFAULT_VIEW) {
    super({
      jslog: `${VisualLogging.panel('search').track({resize: true})}`,
      useShadowDom: true,
    });
    this.#view = view;
    this.setMinimumSize(0, 40);

    this.#isIndexing = false;
    this.#searchId = 1;
    this.#query = '';
    this.#searchMatchesCount = 0;
    this.#searchResultsCount = 0;
    this.#nonEmptySearchResultsCount = 0;
    this.#searchingView = null;
    this.#searchConfig = null;
    this.#pendingSearchConfig = null;
    this.#progress = null;

    this.#advancedSearchConfig = Common.Settings.Settings.instance().createLocalSetting(
        settingKey + '-search-config', new Workspace.SearchConfig.SearchConfig('', true, false).toPlainObject());

    this.performUpdate();
    this.#load();
    this.performUpdate();
    this.#searchScope = null;
  }

  override performUpdate(): void {
    const input: SearchViewInput = {
      query: this.#query,
      matchCase: this.#matchCase,
      isRegex: this.#isRegex,
      searchConfig: this.#searchConfig,
      searchMessage: this.#searchMessage,
      searchResults: this.#searchResults.filter(searchResult => searchResult.matchesCount()),
      searchResultsMessage: this.#searchResultsMessage,
      progress: this.#progress,
      onQueryChange: (query: string) => {
        this.#query = query;
      },
      onQueryKeyDown: this.#onQueryKeyDown.bind(this),
      onPanelKeyDown: this.#onPanelKeyDown.bind(this),
      onClearSearchInput: this.#onClearSearchInput.bind(this),
      onToggleRegex: this.#onToggleRegex.bind(this),
      onToggleMatchCase: this.#onToggleMatchCase.bind(this),
      onRefresh: this.#onRefresh.bind(this),
      onClearSearch: this.#onClearSearch.bind(this),
    };
    const that = this;
    const output: SearchViewOutput = {
      set focusSearchInput(value: () => void) {
        that.#focusSearchInput = value;
      },
      set showAllMatches(value: () => void) {
        that.#showAllMatches = value;
      },
      set collapseAllResults(value: () => void) {
        that.#collapseAllResults = value;
      }
    };
    this.#view(input, output, this.contentElement);
  }

  #onToggleRegex(): void {
    this.#isRegex = !this.#isRegex;
    this.performUpdate();
  }

  #onToggleMatchCase(): void {
    this.#matchCase = !this.#matchCase;
    this.performUpdate();
  }

  #buildSearchConfig(): Workspace.SearchConfig.SearchConfig {
    return new Workspace.SearchConfig.SearchConfig(this.#query, !this.#matchCase, this.#isRegex);
  }

  toggle(queryCandidate: string, searchImmediately?: boolean): void {
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

  createScope(): SearchScope {
    throw new Error('Not implemented');
  }

  #initScope(): void {
    this.#searchScope = this.createScope();
  }

  #onIndexingFinished(): void {
    if (!this.#progress) {
      return;
    }

    const finished = !this.#progress.canceled;
    this.#progress = null;
    this.#isIndexing = false;
    this.#searchMessage = finished ? '' : i18nString(UIStrings.indexingInterrupted);
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

  #startIndexing(): void {
    this.#isIndexing = true;
    if (this.#progress) {
      this.#progress.done = true;
    }
    this.#progress = new Common.Progress.ProgressProxy(
        new Common.Progress.Progress(), this.#onIndexingFinished.bind(this), this.requestUpdate.bind(this));
    this.#searchMessage = i18nString(UIStrings.indexing);
    this.performUpdate();
    if (this.#searchScope) {
      this.#searchScope.performIndexing(this.#progress);
    }
  }

  #onClearSearchInput(): void {
    this.#query = '';
    this.requestUpdate();
    this.#save();
    this.focus();
  }

  #onSearchResult(searchId: number, searchResult: SearchResult): void {
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

  #onSearchFinished(searchId: number, finished: boolean): void {
    if (searchId !== this.#searchId || !this.#progress) {
      return;
    }
    this.#progress = null;
    this.#searchFinished(finished);
    UI.ARIAUtils.LiveAnnouncer.alert(this.#searchMessage + ' ' + this.#searchResultsMessage);
  }

  #startSearch(searchConfig: Workspace.SearchConfig.SearchConfig): void {
    this.#searchConfig = searchConfig;
    if (this.#progress) {
      this.#progress.done = true;
    }
    this.#progress =
        new Common.Progress.ProgressProxy(new Common.Progress.Progress(), undefined, this.requestUpdate.bind(this));
    this.#searchStarted();
    if (this.#searchScope) {
      void this.#searchScope.performSearch(
          searchConfig, this.#progress, this.#onSearchResult.bind(this, this.#searchId),
          this.#onSearchFinished.bind(this, this.#searchId));
    }
  }

  #resetSearch(): void {
    this.#stopSearch();
    this.#searchResults = [];
    this.#searchMessage = '';
    this.#searchResultsMessage = '';
    this.performUpdate();
  }

  #stopSearch(): void {
    if (this.#progress && !this.#isIndexing) {
      this.#progress.canceled = true;
    }
    if (this.#searchScope) {
      this.#searchScope.stopSearch();
    }
  }

  #searchStarted(): void {
    this.#searchMatchesCount = 0;
    this.#searchResultsCount = 0;
    this.#searchResults = [];
    this.#nonEmptySearchResultsCount = 0;
    if (!this.#searchingView) {
      this.#searchingView = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.searching), '');
    }
    this.#searchMessage = i18nString(UIStrings.searching);
    this.performUpdate();
    this.#updateSearchResultsMessage();
  }

  #updateSearchResultsMessage(): void {
    if (this.#searchMatchesCount && this.#searchResultsCount) {
      if (this.#searchMatchesCount === 1 && this.#nonEmptySearchResultsCount === 1) {
        this.#searchResultsMessage = i18nString(UIStrings.foundMatchingLineInFile);
      } else if (this.#searchMatchesCount > 1 && this.#nonEmptySearchResultsCount === 1) {
        this.#searchResultsMessage = i18nString(UIStrings.foundDMatchingLinesInFile, {PH1: this.#searchMatchesCount});
      } else {
        this.#searchResultsMessage = i18nString(
            UIStrings.foundDMatchingLinesInDFiles,
            {PH1: this.#searchMatchesCount, PH2: this.#nonEmptySearchResultsCount});
      }
    } else {
      this.#searchResultsMessage = '';
    }
    this.performUpdate();
  }

  #addSearchResult(searchResult: SearchResult): void {
    const matchesCount = searchResult.matchesCount();
    this.#searchMatchesCount += matchesCount;
    this.#searchResultsCount++;
    if (matchesCount) {
      this.#nonEmptySearchResultsCount++;
    }
    this.#updateSearchResultsMessage();
  }

  #searchFinished(finished: boolean): void {
    this.#searchMessage = finished ? i18nString(UIStrings.searchFinished) : i18nString(UIStrings.searchInterrupted);
    this.requestUpdate();
  }

  override focus(): void {
    this.#focusSearchInput();
  }

  override willHide(): void {
    this.#stopSearch();
  }

  #onQueryKeyDown(event: KeyboardEvent): void {
    this.#save();
    switch (event.keyCode) {
      case UI.KeyboardShortcut.Keys.Enter.code:
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
  #onPanelKeyDown(event: KeyboardEvent): void {
    const isMac = Host.Platform.isMac();
    // "Command + Alt + ]" for Mac
    const shouldShowAllForMac =
        isMac && event.metaKey && !event.ctrlKey && event.altKey && event.code === 'BracketRight';
    // "Ctrl + Shift + }" for other platforms
    const shouldShowAllForOtherPlatforms =
        !isMac && event.ctrlKey && !event.metaKey && event.shiftKey && event.code === 'BracketRight';
    // "Command + Alt + [" for Mac
    const shouldCollapseAllForMac =
        isMac && event.metaKey && !event.ctrlKey && event.altKey && event.code === 'BracketLeft';
    // "Ctrl + Alt + {" for other platforms
    const shouldCollapseAllForOtherPlatforms =
        !isMac && event.ctrlKey && !event.metaKey && event.shiftKey && event.code === 'BracketLeft';

    if (shouldShowAllForMac || shouldShowAllForOtherPlatforms) {
      this.#showAllMatches();
      void VisualLogging.logKeyDown(event.currentTarget, event, 'show-all-matches');
    } else if (shouldCollapseAllForMac || shouldCollapseAllForOtherPlatforms) {
      this.#collapseAllResults();
      void VisualLogging.logKeyDown(event.currentTarget, event, 'collapse-all-results');
    }
  }

  #save(): void {
    this.#advancedSearchConfig.set(this.#buildSearchConfig().toPlainObject());
  }

  #load(): void {
    const searchConfig = Workspace.SearchConfig.SearchConfig.fromPlainObject(this.#advancedSearchConfig.get());
    this.#query = searchConfig.query();

    this.#matchCase = !searchConfig.ignoreCase();
    this.#isRegex = searchConfig.isRegex();
    this.requestUpdate();
  }

  #onRefresh(): void {
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

  #onClearSearch(): void {
    this.#resetSearch();
    this.#onClearSearchInput();
  }
}

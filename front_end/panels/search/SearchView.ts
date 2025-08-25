// Copyright 2014 The Chromium Authors. All rights reserved.
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
const {ref} = Directives;

export class SearchView extends UI.Widget.VBox {
  private focusOnShow: boolean;
  private isIndexing: boolean;
  private searchId: number;
  private searchMatchesCount: number;
  private searchResultsCount: number;
  private nonEmptySearchResultsCount: number;
  private searchingView: UI.Widget.Widget|null;
  private notFoundView: UI.Widget.Widget|null;
  private searchConfig: Workspace.SearchConfig.SearchConfig|null;
  private pendingSearchConfig: Workspace.SearchConfig.SearchConfig|null;
  private searchResultsPane: SearchResultsPane|null;
  private progressIndicator: UI.ProgressIndicator.ProgressIndicator|null;
  private visiblePane: UI.Widget.Widget|null;
  private searchPanelElement!: HTMLElement;
  private searchResultsElement!: HTMLElement;
  protected search!: HTMLInputElement;
  protected matchCaseButton!: Buttons.Button.Button;
  protected regexButton!: Buttons.Button.Button;
  private searchMessageElement!: HTMLElement;
  private searchProgressPlaceholderElement!: HTMLElement;
  private searchResultsMessageElement!: HTMLElement;
  private readonly advancedSearchConfig: Common.Settings.Setting<{
    query: string,
    ignoreCase: boolean,
    isRegex: boolean,
  }>;
  private searchScope: SearchScope|null;

  // We throttle adding search results, otherwise we trigger DOM layout for each
  // result added.
  #throttler: Common.Throttler.Throttler;
  #pendingSearchResults: SearchResult[] = [];
  #emptyStartView: UI.EmptyWidget.EmptyWidget;

  constructor(settingKey: string, throttler: Common.Throttler.Throttler) {
    super({
      jslog: `${VisualLogging.panel('search').track({resize: true})}`,
      useShadowDom: true,
    });
    this.setMinimumSize(0, 40);

    this.focusOnShow = false;
    this.isIndexing = false;
    this.searchId = 1;
    this.searchMatchesCount = 0;
    this.searchResultsCount = 0;
    this.nonEmptySearchResultsCount = 0;
    this.searchingView = null;
    this.notFoundView = null;
    this.searchConfig = null;
    this.pendingSearchConfig = null;
    this.searchResultsPane = null;
    this.progressIndicator = null;
    this.visiblePane = null;
    this.#throttler = throttler;

    // clang-format off
    /* eslint-disable-next-line rulesdir/no-lit-render-outside-of-view */
    render(html`
      <style>${searchViewStyles}</style>
      <div class="search-drawer-header" @keydown=${this.onKeyDownOnPanel}
           ${ref(e => {this.searchPanelElement = e as HTMLElement;})}>
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
                @keydown=${this.onKeyDown}
                ${ref(e => {this.search = e as HTMLInputElement;})}>
            <devtools-button class="clear-button" tabindex="-1"
                @click=${this.onSearchInputClear}
                .data=${{
                  variant: Buttons.Button.Variant.ICON,
                  iconName: 'cross-circle-filled',
                  jslogContext: 'clear-input',
                  size: Buttons.Button.Size.SMALL,
                  title: i18nString(UIStrings.clearInput),
                } as Buttons.Button.ButtonData}
            ></devtools-button>
            <devtools-button @click=${this.regexButtonToggled} .data=${{
                variant: Buttons.Button.Variant.ICON_TOGGLE,
                iconName: 'regular-expression',
                toggledIconName: 'regular-expression',
                toggleType: Buttons.Button.ToggleType.PRIMARY,
                size: Buttons.Button.Size.SMALL,
                toggled: false,
                title: i18nString(UIStrings.enableRegularExpression),
                jslogContext: 'regular-expression',
              } as Buttons.Button.ButtonData}
              ${ref(e => {this.regexButton = e as Buttons.Button.Button;})}
            ></devtools-button>
            <devtools-button @click=${this.matchCaseButtonToggled} .data=${{
                variant: Buttons.Button.Variant.ICON_TOGGLE,
                iconName: 'match-case',
                toggledIconName: 'match-case',
                toggleType: Buttons.Button.ToggleType.PRIMARY,
                size: Buttons.Button.Size.SMALL,
                toggled: false,
                title: i18nString(UIStrings.enableCaseSensitive),
                jslogContext: 'match-case',
              } as Buttons.Button.ButtonData}
              ${ref(e => {this.matchCaseButton = e as Buttons.Button.Button;})}
            ></devtools-button>
          </div>
        </div>
        <devtools-toolbar class="search-toolbar" jslog=${VisualLogging.toolbar()}>
          <devtools-button title=${i18nString(UIStrings.refresh)} @click=${this.onAction}
              .data=${{
                variant: Buttons.Button.Variant.TOOLBAR,
                iconName: 'refresh',
                jslogContext: 'search.refresh',
              } as Buttons.Button.ButtonData}></devtools-button>
          <devtools-button title=${i18nString(UIStrings.clear)} @click=${this.onClearSearch}
              .data=${{
                variant: Buttons.Button.Variant.TOOLBAR,
                iconName: 'clear',
                jslogContext: 'search.clear',
              } as Buttons.Button.ButtonData}></devtools-button>
        </devtools-toolbar>
      </div>
      <div class="search-results" @keydown=${this.onKeyDownOnPanel}
           ${ref(e => {this.searchResultsElement = e as HTMLElement;})}>
      </div>
      <div class="search-toolbar-summary" @keydown=${this.onKeyDownOnPanel}>
        <div class="search-message" ${ref(e => {this.searchMessageElement = e as HTMLElement;})}></div>
        <div class="flex-centered" ${ref(e => {this.searchProgressPlaceholderElement = e as HTMLElement;})}>
        </div>
        <div class="search-message" ${ref(e => {this.searchResultsMessageElement = e as HTMLElement;})}>
        </div>
      </div>`, this.contentElement, {host: this});
    // clang-format on

    this.advancedSearchConfig = Common.Settings.Settings.instance().createLocalSetting(
        settingKey + '-search-config', new Workspace.SearchConfig.SearchConfig('', true, false).toPlainObject());

    this.load();
    this.searchScope = null;

    this.#emptyStartView = new UI.EmptyWidget.EmptyWidget(
        i18nString(UIStrings.noSearchResult), i18nString(UIStrings.typeAndPressSToSearch, {
          PH1: UI.KeyboardShortcut.KeyboardShortcut.shortcutToString(UI.KeyboardShortcut.Keys.Enter)
        }));
    this.showPane(this.#emptyStartView);
  }

  regexButtonToggled(): void {
    this.regexButton.title = this.regexButton.toggled ? i18nString(UIStrings.disableRegularExpression) :
                                                        i18nString(UIStrings.enableRegularExpression);
  }

  matchCaseButtonToggled(): void {
    this.matchCaseButton.title = this.matchCaseButton.toggled ? i18nString(UIStrings.disableCaseSensitive) :
                                                                i18nString(UIStrings.enableCaseSensitive);
  }

  private buildSearchConfig(): Workspace.SearchConfig.SearchConfig {
    return new Workspace.SearchConfig.SearchConfig(
        this.search.value, !this.matchCaseButton.toggled, this.regexButton.toggled);
  }

  toggle(queryCandidate: string, searchImmediately?: boolean): void {
    this.search.value = queryCandidate;
    if (this.isShowing()) {
      this.focus();
    } else {
      this.focusOnShow = true;
    }

    this.initScope();
    if (searchImmediately) {
      this.onAction();
    } else {
      this.startIndexing();
    }
  }

  createScope(): SearchScope {
    throw new Error('Not implemented');
  }

  private initScope(): void {
    this.searchScope = this.createScope();
  }

  override wasShown(): void {
    super.wasShown();
    if (this.focusOnShow) {
      this.focus();
      this.focusOnShow = false;
    }
  }

  private onIndexingFinished(): void {
    if (!this.progressIndicator) {
      return;
    }

    const finished = !this.progressIndicator.isCanceled();
    this.progressIndicator.done();
    this.progressIndicator = null;
    this.isIndexing = false;
    this.searchMessageElement.textContent = finished ? '' : i18nString(UIStrings.indexingInterrupted);
    if (!finished) {
      this.pendingSearchConfig = null;
    }
    if (!this.pendingSearchConfig) {
      return;
    }
    const searchConfig = this.pendingSearchConfig;
    this.pendingSearchConfig = null;
    this.innerStartSearch(searchConfig);
  }

  private startIndexing(): void {
    this.isIndexing = true;
    if (this.progressIndicator) {
      this.progressIndicator.done();
    }
    this.progressIndicator = document.createElement('devtools-progress');
    this.searchMessageElement.textContent = i18nString(UIStrings.indexing);
    this.searchProgressPlaceholderElement.appendChild(this.progressIndicator);
    if (this.searchScope) {
      this.searchScope.performIndexing(
          new Common.Progress.ProgressProxy(this.progressIndicator, this.onIndexingFinished.bind(this)));
    }
  }

  private onSearchInputClear(): void {
    this.search.value = '';
    this.save();
    this.focus();
    this.showPane(this.#emptyStartView);
  }

  private onSearchResult(searchId: number, searchResult: SearchResult): void {
    if (searchId !== this.searchId || !this.progressIndicator) {
      return;
    }
    if (this.progressIndicator?.isCanceled()) {
      this.onIndexingFinished();
      return;
    }
    if (!this.searchResultsPane) {
      this.searchResultsPane = new SearchResultsPane((this.searchConfig as Workspace.SearchConfig.SearchConfig));
      this.showPane(this.searchResultsPane);
    }
    this.#pendingSearchResults.push(searchResult);
    void this.#throttler.schedule(async () => this.#addPendingSearchResults());
  }

  #addPendingSearchResults(): void {
    for (const searchResult of this.#pendingSearchResults) {
      this.addSearchResult(searchResult);
      if (searchResult.matchesCount()) {
        this.searchResultsPane?.addSearchResult(searchResult);
      }
    }
    this.#pendingSearchResults = [];
  }

  private onSearchFinished(searchId: number, finished: boolean): void {
    if (searchId !== this.searchId || !this.progressIndicator) {
      return;
    }
    if (!this.searchResultsPane) {
      this.nothingFound();
    }
    this.searchFinished(finished);
    this.searchConfig = null;
    UI.ARIAUtils.LiveAnnouncer.alert(
        this.searchMessageElement.textContent + ' ' + this.searchResultsMessageElement.textContent);
  }

  private innerStartSearch(searchConfig: Workspace.SearchConfig.SearchConfig): void {
    this.searchConfig = searchConfig;
    if (this.progressIndicator) {
      this.progressIndicator.done();
    }
    this.progressIndicator = document.createElement('devtools-progress');
    this.searchStarted(this.progressIndicator);
    if (this.searchScope) {
      void this.searchScope.performSearch(
          searchConfig, this.progressIndicator, this.onSearchResult.bind(this, this.searchId),
          this.onSearchFinished.bind(this, this.searchId));
    }
  }

  private resetSearch(): void {
    this.stopSearch();
    this.showPane(null);
    this.searchResultsPane = null;
    this.searchMessageElement.textContent = '';
    this.searchResultsMessageElement.textContent = '';
  }

  private stopSearch(): void {
    if (this.progressIndicator && !this.isIndexing) {
      this.progressIndicator.cancel();
    }
    if (this.searchScope) {
      this.searchScope.stopSearch();
    }
    this.searchConfig = null;
  }

  private searchStarted(progressIndicator: UI.ProgressIndicator.ProgressIndicator): void {
    this.searchMatchesCount = 0;
    this.searchResultsCount = 0;
    this.nonEmptySearchResultsCount = 0;
    if (!this.searchingView) {
      this.searchingView = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.searching), '');
    }
    this.showPane(this.searchingView);
    this.searchMessageElement.textContent = i18nString(UIStrings.searching);
    this.searchProgressPlaceholderElement.appendChild(progressIndicator);
    this.updateSearchResultsMessage();
  }

  private updateSearchResultsMessage(): void {
    if (this.searchMatchesCount && this.searchResultsCount) {
      if (this.searchMatchesCount === 1 && this.nonEmptySearchResultsCount === 1) {
        this.searchResultsMessageElement.textContent = i18nString(UIStrings.foundMatchingLineInFile);
      } else if (this.searchMatchesCount > 1 && this.nonEmptySearchResultsCount === 1) {
        this.searchResultsMessageElement.textContent =
            i18nString(UIStrings.foundDMatchingLinesInFile, {PH1: this.searchMatchesCount});
      } else {
        this.searchResultsMessageElement.textContent = i18nString(
            UIStrings.foundDMatchingLinesInDFiles,
            {PH1: this.searchMatchesCount, PH2: this.nonEmptySearchResultsCount});
      }
    } else {
      this.searchResultsMessageElement.textContent = '';
    }
  }

  private showPane(panel: UI.Widget.Widget|null): void {
    if (this.visiblePane) {
      this.visiblePane.detach();
    }
    if (panel) {
      panel.show(this.searchResultsElement);
    }
    this.visiblePane = panel;
  }

  private nothingFound(): void {
    if (!this.notFoundView) {
      this.notFoundView = new UI.EmptyWidget.EmptyWidget(
          i18nString(UIStrings.noMatchesFound), i18nString(UIStrings.nothingMatchedTheQuery));
    }
    this.showPane(this.notFoundView);
  }

  private addSearchResult(searchResult: SearchResult): void {
    const matchesCount = searchResult.matchesCount();
    this.searchMatchesCount += matchesCount;
    this.searchResultsCount++;
    if (matchesCount) {
      this.nonEmptySearchResultsCount++;
    }
    this.updateSearchResultsMessage();
  }

  private searchFinished(finished: boolean): void {
    this.searchMessageElement.textContent =
        finished ? i18nString(UIStrings.searchFinished) : i18nString(UIStrings.searchInterrupted);
  }

  override focus(): void {
    this.search.focus();
    this.search.select();
  }

  override willHide(): void {
    this.stopSearch();
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.save();
    switch (event.keyCode) {
      case UI.KeyboardShortcut.Keys.Enter.code:
        this.onAction();
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
  private onKeyDownOnPanel(event: KeyboardEvent): void {
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
    // "Command + Alt + {" for other platforms
    const shouldCollapseAllForOtherPlatforms =
        !isMac && event.ctrlKey && !event.metaKey && event.shiftKey && event.code === 'BracketLeft';

    if (shouldShowAllForMac || shouldShowAllForOtherPlatforms) {
      this.searchResultsPane?.showAllMatches();
      void VisualLogging.logKeyDown(event.currentTarget, event, 'show-all-matches');
    } else if (shouldCollapseAllForMac || shouldCollapseAllForOtherPlatforms) {
      this.searchResultsPane?.collapseAllResults();
      void VisualLogging.logKeyDown(event.currentTarget, event, 'collapse-all-results');
    }
  }

  private save(): void {
    this.advancedSearchConfig.set(this.buildSearchConfig().toPlainObject());
  }

  private load(): void {
    const searchConfig = Workspace.SearchConfig.SearchConfig.fromPlainObject(this.advancedSearchConfig.get());
    this.search.value = searchConfig.query();

    this.matchCaseButton.toggled = !searchConfig.ignoreCase();
    this.matchCaseButtonToggled();

    this.regexButton.toggled = searchConfig.isRegex();
    this.regexButtonToggled();
  }

  private onAction(): void {
    const searchConfig = this.buildSearchConfig();
    if (!searchConfig.query()?.length) {
      return;
    }
    this.resetSearch();
    ++this.searchId;
    this.initScope();
    if (!this.isIndexing) {
      this.startIndexing();
    }
    this.pendingSearchConfig = searchConfig;
  }

  private onClearSearch(): void {
    this.resetSearch();
    this.onSearchInputClear();
  }

  get throttlerForTest(): Common.Throttler.Throttler {
    return this.#throttler;
  }
}

// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2007 Matt Lilek (pewtermoose@gmail.com).
 * Copyright (C) 2009 Joseph Pecoraro
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import './Toolbar.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Buttons from '../components/buttons/buttons.js';
import * as Lit from '../lit/lit.js';
import * as Settings from '../settings/settings.js';

import {InspectorView} from './InspectorView.js';
import {Keys} from './KeyboardShortcut.js';
import searchableViewStyles from './searchableView.css.js';
import {VBox} from './Widget.js';

const {html, nothing, render, Directives} = Lit;

const UIStrings = {
  /**
   * @description Button text and placeholder to replace the current search match in the search bar.
   */
  replace: 'Replace',
  /**
   * @description Tooltip text and accessible label to enable find and replace in the search bar.
   */
  enableFindAndReplace: 'Find and replace',
  /**
   * @description Tooltip text and accessible label to disable find and replace in the search bar.
   */
  disableFindAndReplace: 'Disable find and replace',
  /**
   * @description Placeholder text for the search input in the search bar.
   */
  findString: 'Find',
  /**
   * @description Tooltip text and accessible label for the show previous result button in the search bar.
   */
  searchPrevious: 'Show previous result',
  /**
   * @description Tooltip text and accessible label for the show next result button in the search bar.
   */
  searchNext: 'Show next result',
  /**
   * @description Tooltip text and accessible label for the match case toggle in the search bar.
   */
  matchCase: 'Match case',
  /**
   * @description Tooltip text and accessible label for the match whole word toggle in the search bar.
   */
  matchWholeWord: 'Match whole word',
  /**
   * @description Tooltip text and accessible label for the regular expression toggle in the search bar.
   */
  useRegularExpression: 'Use regular expression',
  /**
   * @description Tooltip text for the close button in the search bar.
   */
  closeSearchBar: 'Close search bar',
  /**
   * @description Button text to replace all search matches in the search bar.
   */
  replaceAll: 'Replace all',
  /**
   * @description Text showing the current search match index and the total match count in the search bar.
   * @example {2} PH1
   * @example {3} PH2
   */
  dOfD: '{PH1} of {PH2}',
  /**
   * @description Accessible label showing the current search match index and the total match count in the search bar.
   * @example {2} PH1
   * @example {3} PH2
   */
  accessibledOfD: 'Shows result {PH1} of {PH2}',
  /**
   * @description Text indicating a single match in the search bar.
   */
  matchString: '1 match',
  /**
   * @description Text indicating multiple matches in the search bar.
   * @example {2} PH1
   */
  dMatches: '{PH1} matches',
  /**
   * @description Tooltip text and accessible label for the clear input button in the search bar.
   */
  clearInput: 'Clear',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/SearchableView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

function renderClearButton(jslogContext: string, onClick: () => void): Lit.LitTemplate {
  // clang-format off
  return html`
    <devtools-button class="clear-button" tabindex="-1" aria-label=${i18nString(UIStrings.clearInput)}
        .data=${{
          variant: Buttons.Button.Variant.ICON,
          size: Buttons.Button.Size.SMALL,
          jslogContext,
          title: i18nString(UIStrings.clearInput),
          iconName: 'cross-circle-filled',
        } as Buttons.Button.ButtonData}
        @click=${onClick}></devtools-button>`;
  // clang-format on
}

function renderConfigToggle(iconName: string, label: Platform.UIString.LocalizedString, toggled: boolean,
                            onClick: () => void): Lit.LitTemplate {
  // clang-format off
  return html`
    <devtools-button aria-label=${label}
        .data=${{
          variant: Buttons.Button.Variant.ICON_TOGGLE,
          size: Buttons.Button.Size.SMALL,
          iconName,
          toggledIconName: iconName,
          toggled,
          toggleType: Buttons.Button.ToggleType.PRIMARY,
          title: label,
          jslogContext: iconName,
        } as Buttons.Button.ButtonData}
        @click=${onClick}></devtools-button>`;
  // clang-format on
}

export interface ViewInput {
  searchIsVisible: boolean;
  replaceable: boolean;
  secondRowVisible: boolean;
  placeholder: string;
  searchAriaLabel?: string;
  supportsCaseSensitive: boolean;
  caseSensitiveToggled: boolean;
  supportsWholeWord: boolean;
  wholeWordToggled: boolean;
  supportsRegex: boolean;
  regexToggled: boolean;
  matchesText: string;
  matchesAriaLabel: string;
  navEnabled: boolean;
  replaceEnabled: boolean;
  onToggleReplace: () => void;
  onSearchKeyDown: (event: KeyboardEvent) => void;
  onSearchInput: () => void;
  onClearSearchInput: () => void;
  onReplaceKeyDown: (event: KeyboardEvent) => void;
  onClearReplaceInput: () => void;
  onToggleCaseSensitive: () => void;
  onToggleWholeWord: () => void;
  onToggleRegex: () => void;
  onPrevClick: () => void;
  onNextClick: () => void;
  onCloseClick: () => void;
  onReplaceClick: () => void;
  onReplaceAllClick: () => void;
}

export interface ViewOutput {
  searchInputElement?: HTMLInputElement;
  replaceInputElement?: HTMLInputElement;
  footerElementContainer?: HTMLElement;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  const replaceLabel =
      input.secondRowVisible ? i18nString(UIStrings.disableFindAndReplace) : i18nString(UIStrings.enableFindAndReplace);
  // clang-format off
  render(html`
    <style>${searchableViewStyles}</style>
    <slot></slot>
    <div class="search-bar ${input.searchIsVisible ? '' : 'hidden'} ${input.secondRowVisible ? 'replaceable' : ''}"
        style="order: 100"
        ${Directives.ref(el => { output.footerElementContainer = el as HTMLElement | undefined; })}>
      <div class="toolbar-search" jslog=${VisualLogging.toolbar('search').track({resize: true})}>
        <devtools-toolbar class="replace-toggle-toolbar">
          <devtools-button class="toolbar-item" ?hidden=${!input.replaceable} aria-label=${replaceLabel}
              .data=${{
                variant: Buttons.Button.Variant.ICON_TOGGLE,
                size: Buttons.Button.Size.REGULAR,
                iconName: 'replace',
                toggledIconName: 'replace',
                toggleType: Buttons.Button.ToggleType.PRIMARY,
                toggled: input.secondRowVisible,
                title: replaceLabel,
                jslogContext: 'replace',
              } as Buttons.Button.ButtonData}
              @click=${input.onToggleReplace}></devtools-button>
        </devtools-toolbar>
        <div class="search-inputs">
          <div class="icon-and-input">
            <devtools-icon name="search"></devtools-icon>
            <input type="search" id="search-input-field" class="search-replace search" autocomplete="off"
                placeholder=${input.placeholder}
                aria-label=${input.searchAriaLabel ?? nothing}
                jslog=${VisualLogging.textField('search').track({change: true, keydown: 'ArrowUp|ArrowDown|Enter|Escape'})}
                @keydown=${input.onSearchKeyDown}
                @input=${input.onSearchInput}
                ${Directives.ref(el => { output.searchInputElement = el as HTMLInputElement | undefined; })}>
          </div>
          <div class="replace-element input-line">
            <input class="search-replace" placeholder=${i18nString(UIStrings.replace)}
                jslog=${VisualLogging.textField('replace').track({change: true, keydown: 'Enter'})}
                @keydown=${input.onReplaceKeyDown}
                ${Directives.ref(el => { output.replaceInputElement = el as HTMLInputElement | undefined; })}>
            ${renderClearButton('clear-replace-input', input.onClearReplaceInput)}
          </div>
          <div class="search-config-buttons">
            ${renderClearButton('clear-search-input', input.onClearSearchInput)}
            ${input.supportsCaseSensitive ? renderConfigToggle(
                'match-case', i18nString(UIStrings.matchCase), input.caseSensitiveToggled, input.onToggleCaseSensitive) : nothing}
            ${input.supportsWholeWord ? renderConfigToggle(
                'match-whole-word', i18nString(UIStrings.matchWholeWord), input.wholeWordToggled, input.onToggleWholeWord) : nothing}
            ${input.supportsRegex ? renderConfigToggle(
                'regular-expression', i18nString(UIStrings.useRegularExpression), input.regexToggled, input.onToggleRegex) : nothing}
          </div>
          <div class="input-line search-input-background"></div>
        </div>
        <div class="toolbar-search-buttons">
          <div class="first-row-buttons">
            <devtools-toolbar class="toolbar-search-options">
              <devtools-button class="toolbar-item" aria-label=${i18nString(UIStrings.searchPrevious)} ?disabled=${!input.navEnabled}
                  .data=${{
                    variant: Buttons.Button.Variant.TOOLBAR,
                    iconName: 'chevron-up',
                    title: i18nString(UIStrings.searchPrevious),
                    jslogContext: 'select-previous',
                    disabled: !input.navEnabled,
                  } as Buttons.Button.ButtonData}
                  @click=${input.onPrevClick}></devtools-button>
              <devtools-button class="toolbar-item" aria-label=${i18nString(UIStrings.searchNext)} ?disabled=${!input.navEnabled}
                  .data=${{
                    variant: Buttons.Button.Variant.TOOLBAR,
                    iconName: 'chevron-down',
                    title: i18nString(UIStrings.searchNext),
                    jslogContext: 'select-next',
                    disabled: !input.navEnabled,
                  } as Buttons.Button.ButtonData}
                  @click=${input.onNextClick}></devtools-button>
              <div class="toolbar-item toolbar-text search-results-matches"
                  style="font-variant-numeric: tabular-nums; color: var(--sys-color-on-surface-subtle); padding: 0 var(--sys-size-3)"
                  aria-live="polite" aria-atomic="false" aria-label=${input.matchesAriaLabel || nothing}>
                <span aria-hidden="true">${input.matchesText}</span>
              </div>
            </devtools-toolbar>
            <devtools-button class="close-search-button"
                .data=${{
                  variant: Buttons.Button.Variant.TOOLBAR,
                  size: Buttons.Button.Size.REGULAR,
                  iconName: 'cross',
                  title: i18nString(UIStrings.closeSearchBar),
                  jslogContext: 'close-search',
                } as Buttons.Button.ButtonData}
                @click=${input.onCloseClick}></devtools-button>
          </div>
          <div class="second-row-buttons replace-element">
            <devtools-button class="search-action-button" ?disabled=${!input.replaceEnabled}
                .data=${{
                  variant: Buttons.Button.Variant.OUTLINED,
                  title: i18nString(UIStrings.replace),
                  jslogContext: 'replace',
                  disabled: !input.replaceEnabled,
                } as Buttons.Button.ButtonData}
                @click=${input.onReplaceClick}>${i18nString(UIStrings.replace)}</devtools-button>
            <devtools-button class="search-action-button" ?disabled=${!input.replaceEnabled}
                .data=${{
                  variant: Buttons.Button.Variant.OUTLINED,
                  title: i18nString(UIStrings.replaceAll),
                  jslogContext: 'replace-all',
                  disabled: !input.replaceEnabled,
                } as Buttons.Button.ButtonData}
                @click=${input.onReplaceAllClick}>${i18nString(UIStrings.replaceAll)}</devtools-button>
          </div>
        </div>
      </div>
    </div>
  `, target);
  // clang-format on
};

export class SearchableView extends VBox implements SearchResultsListener {
  readonly #view: View;
  readonly #viewOutput: ViewOutput = {};
  #searchProvider!: Searchable;
  #searchTarget: SearchTarget|null = null;
  replaceProvider: Replaceable|null = null;
  #setting: Common.Settings.Setting<{caseSensitive?: boolean, wholeWord?: boolean, isRegex?: boolean}>|null = null;
  #replaceable = false;
  minimalSearchQuerySize = 3;
  private searchIsVisible?: boolean;
  #secondRowVisible = false;
  #placeholder: string = i18nString(UIStrings.findString);
  #searchAriaLabel?: string;
  #caseSensitiveToggled = false;
  #wholeWordToggled = false;
  #regexToggled = false;
  #matchesText = '';
  #matchesAriaLabel = '';
  #hasMatches = false;
  #history = [''];
  #historyPosition = 0;
  private currentQuery?: string;
  private valueChangedTimeoutId?: number;

  constructor(element?: HTMLElement, view?: View);
  constructor(searchable: Searchable, replaceable: Replaceable|null, settingName?: string, element?: HTMLElement,
              view?: View);
  constructor(searchableOrElement?: Searchable|HTMLElement, replaceableOrView?: Replaceable|null|View,
              settingName?: string, element?: HTMLElement, view: View = DEFAULT_VIEW) {
    const isElement = searchableOrElement instanceof HTMLElement || searchableOrElement === undefined;
    super(isElement ? searchableOrElement : element, {useShadowDom: true});
    this.#view = isElement && typeof replaceableOrView === 'function' ? replaceableOrView : view;
    searchableViewsByElement.set(this.element, this);

    if (!isElement) {
      this.settingName = settingName;
      this.replaceProvider = (replaceableOrView as Replaceable | null) ?? null;
      this.searchProvider = searchableOrElement;
    }
    this.performUpdate();
  }

  private get footerElementContainer(): HTMLElement {
    return this.#viewOutput.footerElementContainer as HTMLElement;
  }

  private get searchInputElement(): HTMLInputElement {
    return this.#viewOutput.searchInputElement as HTMLInputElement;
  }

  private get replaceInputElement(): HTMLInputElement {
    return this.#viewOutput.replaceInputElement as HTMLInputElement;
  }

  override performUpdate(): void {
    const navEnabled = this.#searchProvider?.supportsMatchCounts?.() === true ? this.#hasMatches : true;
    this.#view({
      searchIsVisible: Boolean(this.searchIsVisible),
      replaceable: this.#replaceable,
      secondRowVisible: this.#secondRowVisible,
      placeholder: this.#placeholder,
      searchAriaLabel: this.#searchAriaLabel,
      supportsCaseSensitive: Boolean(this.#searchProvider?.supportsCaseSensitiveSearch()),
      caseSensitiveToggled: this.#caseSensitiveToggled,
      supportsWholeWord: Boolean(this.#searchProvider?.supportsWholeWordSearch()),
      wholeWordToggled: this.#wholeWordToggled,
      supportsRegex: Boolean(this.#searchProvider?.supportsRegexSearch()),
      regexToggled: this.#regexToggled,
      matchesText: this.#matchesText,
      matchesAriaLabel: this.#matchesAriaLabel,
      navEnabled,
      replaceEnabled: this.#hasMatches,
      onToggleReplace: () => this.toggleReplace(),
      onSearchKeyDown: event => this.onSearchKeyDown(event),
      onSearchInput: () => this.onInput(),
      onClearSearchInput: () => {
        if (this.searchInputElement) {
          this.searchInputElement.value = '';
          this.searchInputElement.focus();
        }
        this.clearSearch();
      },
      onReplaceKeyDown: event => this.onReplaceKeyDown(event),
      onClearReplaceInput: () => {
        if (this.replaceInputElement) {
          this.replaceInputElement.value = '';
          this.replaceInputElement.focus();
        }
      },
      onToggleCaseSensitive: () => this.#onToggleConfig('case'),
      onToggleWholeWord: () => this.#onToggleConfig('word'),
      onToggleRegex: () => this.#onToggleConfig('regex'),
      onPrevClick: () => this.onPrevButtonSearch(),
      onNextClick: () => this.onNextButtonSearch(),
      onCloseClick: () => this.closeSearch(),
      onReplaceClick: () => this.replace(),
      onReplaceAllClick: () => this.replaceAll(),
    },
               this.#viewOutput, this.contentElement);
  }

  #onToggleConfig(type: 'case'|'word'|'regex'): void {
    if (type === 'case') {
      this.#caseSensitiveToggled = !this.#caseSensitiveToggled;
    } else if (type === 'word') {
      this.#wholeWordToggled = !this.#wholeWordToggled;
    } else {
      this.#regexToggled = !this.#regexToggled;
    }
    this.#saveSetting();
    this.performSearch(false, true);
    this.performUpdate();
  }

  get searchProvider(): Searchable {
    return this.#searchProvider;
  }

  set searchProvider(searchable: Searchable) {
    if (this.#searchProvider === searchable) {
      return;
    }
    this.#searchProvider = searchable;
    this.#loadSetting();
    this.performUpdate();
  }

  get searchTarget(): SearchTarget|null {
    return this.#searchTarget;
  }

  set searchTarget(target: SearchTarget|null) {
    if (this.#searchTarget === target) {
      return;
    }
    this.#searchTarget?.setSearchableView?.(null);
    this.#searchTarget = target;
    this.#searchTarget?.setSearchableView?.(this);
    this.refreshSearch();
  }

  set settingName(settingName: string|undefined) {
    if (this.#setting?.name === settingName) {
      return;
    }
    this.#setting = settingName ? Common.Settings.Settings.instance().createSetting(settingName, {}) : null;
    this.#loadSetting();
    this.performUpdate();
  }

  get replaceable(): boolean {
    return this.#replaceable;
  }

  set replaceable(replaceable: boolean) {
    if (this.#replaceable === replaceable) {
      return;
    }
    this.#replaceable = replaceable;
    if (this.searchIsVisible) {
      this.updateReplaceVisibility();
    }
    this.performUpdate();
  }

  static fromElement(element: Element|null): SearchableView|null {
    let view: (SearchableView|null)|null = null;
    while (element && !view) {
      view = searchableViewsByElement.get(element) || null;
      element = element.parentElementOrShadowHost();
    }
    return view;
  }

  private toggleReplace(): void {
    this.#secondRowVisible = !this.#secondRowVisible;
    this.performUpdate();
    this.updateSecondRowVisibility();
  }

  #saveSetting(): void {
    if (!this.#setting) {
      return;
    }
    const settingValue = this.#setting.get() || {};
    if (this.#searchProvider?.supportsCaseSensitiveSearch()) {
      settingValue.caseSensitive = this.#caseSensitiveToggled;
    }
    if (this.#searchProvider?.supportsWholeWordSearch()) {
      settingValue.wholeWord = this.#wholeWordToggled;
    }
    if (this.#searchProvider?.supportsRegexSearch()) {
      settingValue.isRegex = this.#regexToggled;
    }
    this.#setting.set(settingValue);
  }

  #loadSetting(): void {
    const settingValue = this.#setting ? (this.#setting.get() || {}) : {};
    this.#caseSensitiveToggled =
        Boolean(this.#searchProvider?.supportsCaseSensitiveSearch() && settingValue.caseSensitive);
    this.#wholeWordToggled = Boolean(this.#searchProvider?.supportsWholeWordSearch() && settingValue.wholeWord);
    this.#regexToggled = Boolean(this.#searchProvider?.supportsRegexSearch() && settingValue.isRegex);
  }

  setMinimalSearchQuerySize(minimalSearchQuerySize: number): void {
    this.minimalSearchQuerySize = minimalSearchQuerySize;
  }

  setPlaceholder(placeholder: string, ariaLabel?: string): void {
    this.#placeholder = placeholder;
    if (ariaLabel) {
      this.#searchAriaLabel = ariaLabel;
    }
    this.performUpdate();
  }

  get placeholder(): string {
    return this.#placeholder;
  }

  set placeholder(placeholder: string) {
    this.#placeholder = placeholder;
    this.performUpdate();
  }

  setReplaceable(replaceable: boolean): void {
    this.replaceable = replaceable;
  }

  updateSearchMatchesCount(matches: number): void {
    if (this.searchProvider.currentSearchMatches === matches) {
      return;
    }
    this.searchProvider.currentSearchMatches = matches;
    this.updateSearchMatchesCountAndCurrentMatchIndex(this.searchProvider.currentQuery ? matches : 0, -1);
  }

  updateCurrentMatchIndex(currentMatchIndex: number): void {
    if (!this.searchProvider.currentSearchMatches) {
      return;
    }

    this.updateSearchMatchesCountAndCurrentMatchIndex(this.searchProvider.currentSearchMatches, currentMatchIndex);
  }

  closeSearch(): void {
    this.cancelSearch();
    if (this.footerElementContainer?.hasFocus()) {
      this.focus();
    }

    this.searchProvider.onSearchClosed?.();
  }

  private toggleSearchBar(toggled: boolean): void {
    this.searchIsVisible = toggled;
    this.performUpdate();
    this.doResize();
  }

  cancelSearch(): void {
    if (!this.searchIsVisible) {
      return;
    }
    this.resetSearch();
    delete this.searchIsVisible;
    this.toggleSearchBar(false);
  }

  resetSearch(): void {
    this.clearSearch();
    this.updateReplaceVisibility();
    this.#matchesText = '';
    this.performUpdate();
  }

  refreshSearch(): void {
    if (!this.searchIsVisible) {
      return;
    }
    this.resetSearch();
    this.performSearch(false, false);
  }

  handleFindNextShortcut(): boolean {
    if (!this.searchIsVisible) {
      return false;
    }
    this.searchProvider.jumpToNextSearchResult();
    return true;
  }

  handleFindPreviousShortcut(): boolean {
    if (!this.searchIsVisible) {
      return false;
    }
    this.searchProvider.jumpToPreviousSearchResult();
    return true;
  }

  handleFindShortcut(): boolean {
    this.showSearchField();
    return true;
  }

  handleCancelSearchShortcut(): boolean {
    if (!this.searchIsVisible) {
      return false;
    }
    this.closeSearch();
    return true;
  }

  private updateSearchMatchesCountAndCurrentMatchIndex(matches: number, currentMatchIndex: number): void {
    if (!this.currentQuery) {
      this.#matchesText = '';
    } else if (matches === 0 || currentMatchIndex >= 0) {
      this.#matchesText = i18nString(UIStrings.dOfD, {PH1: currentMatchIndex + 1, PH2: matches});
      this.#matchesAriaLabel = i18nString(UIStrings.accessibledOfD, {PH1: currentMatchIndex + 1, PH2: matches});
    } else if (matches === 1) {
      this.#matchesText = i18nString(UIStrings.matchString);
      this.#matchesAriaLabel = i18nString(UIStrings.matchString);
    } else {
      this.#matchesText = i18nString(UIStrings.dMatches, {PH1: matches});
      this.#matchesAriaLabel = i18nString(UIStrings.dMatches, {PH1: matches});
    }
    this.#hasMatches = matches > 0;
    this.performUpdate();
  }

  showSearchField(): void {
    if (this.searchIsVisible) {
      this.cancelSearch();
    }

    let queryCandidate;
    if (!this.searchInputElement?.hasFocus()) {
      const selection = InspectorView.instance().element.window().getSelection();
      if (selection?.rangeCount) {
        queryCandidate = selection.toString().replace(/\r?\n.*/, '');
      }
    }

    this.toggleSearchBar(true);
    this.updateReplaceVisibility();
    if (queryCandidate && this.searchInputElement) {
      this.searchInputElement.value = queryCandidate;
    }
    this.performSearch(false, false);
    this.searchInputElement?.focus();
    this.searchInputElement?.select();
    this.searchIsVisible = true;
  }

  private updateReplaceVisibility(): void {
    if (!this.replaceable) {
      this.#secondRowVisible = false;
      this.performUpdate();
      this.updateSecondRowVisibility();
    }
  }

  private onSearchKeyDown(event: KeyboardEvent): void {
    if (event.keyCode === Keys.Up.code) {
      if (this.#historyPosition > 0) {
        this.#historyPosition--;
        this.searchInputElement.value = this.#history[this.#historyPosition];
        this.onInput();
      }
      event.consume(true);
      return;
    }
    if (event.keyCode === Keys.Down.code) {
      if (this.#historyPosition < this.#history.length - 1) {
        this.#historyPosition++;
        this.searchInputElement.value = this.#history[this.#historyPosition];
        this.onInput();
      }
      event.consume(true);
      return;
    }
    if (Platform.KeyboardUtilities.isEscKey(event)) {
      this.closeSearch();
      event.consume(true);
      return;
    }
    if (!(event.key === 'Enter')) {
      return;
    }

    if (!(this.#history.length > 1 && this.#history[this.#history.length - 2] === this.searchInputElement.value)) {
      this.#history[this.#history.length - 1] = this.searchInputElement.value;
      this.#historyPosition = this.#history.length - 1;
      this.#history.push('');
    }

    if (!this.currentQuery) {
      this.performSearch(true, true, event.shiftKey);
    } else {
      this.jumpToNextSearchResult(event.shiftKey);
    }
  }

  private onReplaceKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.replace();
    }
  }

  private jumpToNextSearchResult(isBackwardSearch?: boolean): void {
    if (!this.currentQuery) {
      return;
    }

    if (isBackwardSearch) {
      this.searchProvider.jumpToPreviousSearchResult();
    } else {
      this.searchProvider.jumpToNextSearchResult();
    }
  }

  private onNextButtonSearch(): void {
    this.jumpToNextSearchResult();
  }

  private onPrevButtonSearch(): void {
    this.jumpToNextSearchResult(true);
  }

  private clearSearch(): void {
    this.currentQuery = undefined;
    if (Boolean(this.searchProvider.currentQuery)) {
      this.searchProvider.currentQuery = undefined;
      this.searchProvider.onSearchCanceled();
    }
    this.updateSearchMatchesCountAndCurrentMatchIndex(0, -1);
  }

  private performSearch(forceSearch: boolean, shouldJump: boolean, jumpBackwards?: boolean): void {
    const query = this.searchInputElement?.value ?? '';
    if (!query || (!forceSearch && query.length < this.minimalSearchQuerySize && !this.currentQuery)) {
      this.clearSearch();
      return;
    }

    this.currentQuery = query;
    this.searchProvider.currentQuery = query;

    const searchConfig = this.currentSearchConfig();
    this.searchProvider.performSearch(searchConfig, shouldJump, jumpBackwards);
  }

  private currentSearchConfig(): SearchConfig {
    const query = this.searchInputElement?.value ?? '';
    return new SearchConfig(query, this.#caseSensitiveToggled, this.#wholeWordToggled, this.#regexToggled);
  }

  private updateSecondRowVisibility(): void {
    if (this.#secondRowVisible) {
      this.replaceInputElement?.focus();
    } else {
      this.searchInputElement?.focus();
    }
    this.doResize();
  }

  private replace(): void {
    if (!this.replaceProvider) {
      throw new Error('No \'replaceable\' provided to SearchableView!');
    }
    const searchConfig = this.currentSearchConfig();
    this.replaceProvider.replaceSelectionWith(searchConfig, this.replaceInputElement?.value ?? '');
    this.currentQuery = undefined;
    this.performSearch(true, true);
  }

  private replaceAll(): void {
    if (!this.replaceProvider) {
      throw new Error('No \'replaceable\' provided to SearchableView!');
    }
    const searchConfig = this.currentSearchConfig();
    this.replaceProvider.replaceAllWith(searchConfig, this.replaceInputElement?.value ?? '');
  }

  private onInput(): void {
    if (this.#history.length === this.#historyPosition + 1) {
      this.#history[this.#historyPosition] = this.searchInputElement.value;
    }
    if (!Common.Settings.Settings.instance().resolve(Settings.MainSettings.searchAsYouTypeSettingDescriptor).get()) {
      this.clearSearch();
      return;
    }

    clearTimeout(this.valueChangedTimeoutId);
    const timeout = (this.searchInputElement?.value.length ?? 0) < 3 ? 200 : 0;
    this.valueChangedTimeoutId = window.setTimeout(this.onValueChanged.bind(this), timeout);
  }

  private onValueChanged(): void {
    if (!this.searchIsVisible) {
      return;
    }
    this.valueChangedTimeoutId = undefined;
    this.performSearch(false, true);
  }
}

const searchableViewsByElement = new WeakMap<Element, SearchableView>();

export interface SearchResultsListener {
  updateSearchMatchesCount(matches: number): void;
  updateCurrentMatchIndex(currentMatchIndex: number): void;
}

export interface SearchTarget {
  setSearchableView?(view: SearchResultsListener|null): void;
}

export interface Searchable {
  supportsMatchCounts?(): boolean;
  currentQuery?: string;
  currentSearchMatches?: number;
  onSearchCanceled(): void;
  // Called when the search toolbar is closed
  onSearchClosed?: () => void;
  performSearch(searchConfig: SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void;
  jumpToNextSearchResult(): void;
  jumpToPreviousSearchResult(): void;
  supportsCaseSensitiveSearch(): boolean;
  supportsWholeWordSearch(): boolean;
  supportsRegexSearch(): boolean;
}

export interface Replaceable {
  replaceSelectionWith(searchConfig: SearchConfig, replacement: string): void;
  replaceAllWith(searchConfig: SearchConfig, replacement: string): void;
}

export interface SearchRegexResult {
  regex: RegExp;
  fromQuery: boolean;
}

export class SearchConfig {
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  isRegex: boolean;

  constructor(query: string, caseSensitive: boolean, wholeWord: boolean, isRegex: boolean) {
    this.query = query;
    this.caseSensitive = caseSensitive;
    this.wholeWord = wholeWord;
    this.isRegex = isRegex;
  }

  toSearchRegex(global?: boolean): SearchRegexResult {
    let modifiers = this.caseSensitive ? '' : 'i';
    if (global) {
      modifiers += 'g';
    }

    // Check if query is surrounded by forward slashes
    const isRegexFormatted = this.query.startsWith('/') && this.query.endsWith('/');
    const query = this.isRegex && !isRegexFormatted ? '/' + this.query + '/' : this.query;
    let regex: RegExp|undefined;
    let fromQuery = false;

    // First try creating regex if user knows the / / hint.
    try {
      if (/^\/.+\/$/.test(query) && this.isRegex) {
        regex = new RegExp(query.substring(1, query.length - 1), modifiers);
        fromQuery = true;
      }
    } catch {
      // Silent catch.
    }

    // Otherwise just do a plain text search.
    if (!regex) {
      regex = Platform.StringUtilities.createPlainTextSearchRegex(query, modifiers);
    }

    if (this.wholeWord) {
      let {source} = regex;
      if (!source.startsWith('^') && !source.startsWith('\\b')) {
        source = '\\b' + source;
      }
      if (!source.endsWith('$') && !source.endsWith('\\b')) {
        source = source + '\\b';
      }
      regex = new RegExp(source, regex.flags);
    }

    return {
      regex,
      fromQuery,
    };
  }
}

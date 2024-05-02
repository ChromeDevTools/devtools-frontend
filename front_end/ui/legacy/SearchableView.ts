// Copyright 2021 The Chromium Authors. All rights reserved.
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

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as ARIAUtils from './ARIAUtils.js';
import {HistoryInput} from './HistoryInput.js';
import {InspectorView} from './InspectorView.js';
import searchableViewStyles from './searchableView.css.legacy.js';
import {Toolbar, ToolbarButton, ToolbarToggle} from './Toolbar.js';
import {Tooltip} from './Tooltip.js';
import {createTextButton} from './UIUtils.js';
import {VBox} from './Widget.js';

const UIStrings = {
  /**
   *@description Text on a button to replace one instance with input text for the ctrl+F search bar
   */
  replace: 'Replace',
  /**
   *@description Text to find an item
   */
  findString: 'Find',
  /**
   *@description Text on a button to search previous instance for the ctrl+F search bar
   */
  searchPrevious: 'Search previous',
  /**
   *@description Text on a button to search next instance for the ctrl+F search bar
   */
  searchNext: 'Search next',
  /**
   *@description Text to search by matching case of the input
   */
  matchCase: 'Match Case',
  /**
   *@description Text for searching with regular expressinn
   */
  useRegularExpression: 'Use Regular Expression',
  /**
   *@description Text to cancel something
   */
  cancel: 'Cancel',
  /**
   *@description Text on a button to replace all instances with input text for the ctrl+F search bar
   */
  replaceAll: 'Replace all',
  /**
   *@description Text to indicate the current match index and the total number of matches for the ctrl+F search bar
   *@example {2} PH1
   *@example {3} PH2
   */
  dOfD: '{PH1} of {PH2}',
  /**
   *@description Text to indicate search result for the ctrl+F search bar
   */
  matchString: '1 match',
  /**
   *@description Text to indicate search result for the ctrl+F search bar
   *@example {2} PH1
   */
  dMatches: '{PH1} matches',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/SearchableView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class SearchableView extends VBox {
  private searchProvider: Searchable;
  private replaceProvider: Replaceable|null;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private setting: Common.Settings.Setting<any>|null;
  private replaceable: boolean;
  private readonly footerElementContainer: HTMLElement;
  private readonly footerElement: HTMLElement;
  private replaceToggleButton: ToolbarToggle;
  private searchInputElement: HistoryInput;
  private matchesElement: HTMLElement;
  private searchNavigationPrevElement: HTMLElement;
  private searchNavigationNextElement: HTMLElement;
  private readonly replaceInputElement: HTMLInputElement;
  private readonly buttonsContainer: HTMLElement;
  private caseSensitiveButton: ToolbarToggle|undefined;
  private regexButton: ToolbarToggle|undefined;
  private readonly secondRowButtons: HTMLElement;
  private replaceButtonElement: HTMLButtonElement;
  private replaceAllButtonElement: HTMLButtonElement;
  private minimalSearchQuerySize: number;
  private searchIsVisible?: boolean;
  private currentQuery?: string;
  private valueChangedTimeoutId?: number;

  constructor(searchable: Searchable, replaceable: Replaceable|null, settingName?: string) {
    super(true);
    this.registerRequiredCSS(searchableViewStyles);
    searchableViewsByElement.set(this.element, this);

    this.searchProvider = searchable;
    this.replaceProvider = replaceable;
    this.setting = settingName ? Common.Settings.Settings.instance().createSetting(settingName, {}) : null;
    this.replaceable = false;

    this.contentElement.createChild('slot');
    this.footerElementContainer = this.contentElement.createChild('div', 'search-bar hidden');
    this.footerElementContainer.style.order = '100';
    this.footerElement = this.footerElementContainer.createChild('div', 'toolbar-search');
    this.footerElement.setAttribute('jslog', `${VisualLogging.toolbar('search').track({resize: true})}`);

    const replaceToggleToolbar = new Toolbar('replace-toggle-toolbar', this.footerElement);
    this.replaceToggleButton = new ToolbarToggle(i18nString(UIStrings.replace), 'replace', undefined, 'repalce');
    this.replaceToggleButton.addEventListener(ToolbarButton.Events.Click, this.toggleReplace, this);
    replaceToggleToolbar.appendToolbarItem(this.replaceToggleButton);

    const searchInputElements = this.footerElement.createChild('div', 'toolbar-search-inputs');
    const searchControlElement = searchInputElements.createChild('div', 'toolbar-search-control');

    this.searchInputElement = HistoryInput.create();
    this.searchInputElement.type = 'search';
    this.searchInputElement.classList.add('search-replace', 'custom-search-input');
    this.searchInputElement.id = 'search-input-field';
    this.searchInputElement.placeholder = i18nString(UIStrings.findString);
    this.searchInputElement.setAttribute('jslog', `${VisualLogging.textField('search').track({change: true})}`);
    searchControlElement.appendChild(this.searchInputElement);

    this.matchesElement = searchControlElement.createChild('label', 'search-results-matches');
    this.matchesElement.setAttribute('for', 'search-input-field');

    const searchNavigationElement = searchControlElement.createChild('div', 'toolbar-search-navigation-controls');

    this.searchNavigationPrevElement =
        searchNavigationElement.createChild('div', 'toolbar-search-navigation toolbar-search-navigation-prev');
    this.searchNavigationPrevElement.addEventListener('click', this.onPrevButtonSearch.bind(this), false);
    Tooltip.install(this.searchNavigationPrevElement, i18nString(UIStrings.searchPrevious));
    ARIAUtils.setLabel(this.searchNavigationPrevElement, i18nString(UIStrings.searchPrevious));
    this.searchNavigationPrevElement.setAttribute(
        'jslog', `${VisualLogging.action('select-previous').track({click: true})}`);

    this.searchNavigationNextElement =
        searchNavigationElement.createChild('div', 'toolbar-search-navigation toolbar-search-navigation-next');
    this.searchNavigationNextElement.addEventListener('click', this.onNextButtonSearch.bind(this), false);
    Tooltip.install(this.searchNavigationNextElement, i18nString(UIStrings.searchNext));
    ARIAUtils.setLabel(this.searchNavigationNextElement, i18nString(UIStrings.searchNext));
    this.searchNavigationPrevElement.setAttribute(
        'jslog', `${VisualLogging.action('select-next').track({click: true})}`);

    this.searchInputElement.addEventListener('keydown', this.onSearchKeyDown.bind(this), true);
    this.searchInputElement.addEventListener('input', this.onInput.bind(this), false);
    this.replaceInputElement =
        (searchInputElements.createChild('input', 'search-replace toolbar-replace-control hidden') as HTMLInputElement);
    this.replaceInputElement.addEventListener('keydown', this.onReplaceKeyDown.bind(this), true);
    this.replaceInputElement.placeholder = i18nString(UIStrings.replace);
    this.replaceInputElement.setAttribute('jslog', `${VisualLogging.textField('replace').track({change: true})}`);

    this.buttonsContainer = this.footerElement.createChild('div', 'toolbar-search-buttons');
    const firstRowButtons = this.buttonsContainer.createChild('div', 'first-row-buttons');

    const toolbar = new Toolbar('toolbar-search-options', firstRowButtons);

    if (this.searchProvider.supportsCaseSensitiveSearch()) {
      this.caseSensitiveButton = new ToolbarToggle(i18nString(UIStrings.matchCase), undefined, undefined, 'match-case');
      this.caseSensitiveButton.setText('Aa');
      this.caseSensitiveButton.addEventListener(ToolbarButton.Events.Click, this.toggleCaseSensitiveSearch, this);
      toolbar.appendToolbarItem(this.caseSensitiveButton);
    }

    if (this.searchProvider.supportsRegexSearch()) {
      this.regexButton =
          new ToolbarToggle(i18nString(UIStrings.useRegularExpression), undefined, undefined, 'regex-search');
      this.regexButton.setText('.*');
      this.regexButton.addEventListener(ToolbarButton.Events.Click, this.toggleRegexSearch, this);
      toolbar.appendToolbarItem(this.regexButton);
    }

    const cancelButtonElement = createTextButton(i18nString(UIStrings.cancel), this.closeSearch.bind(this), {
      className: 'search-action-button',
      jslogContext: 'close-search',
    });
    firstRowButtons.appendChild(cancelButtonElement);

    this.secondRowButtons = this.buttonsContainer.createChild('div', 'second-row-buttons hidden');

    this.replaceButtonElement = createTextButton(i18nString(UIStrings.replace), this.replace.bind(this), {
      className: 'search-action-button',
      jslogContext: 'replace',
    });
    this.replaceButtonElement.disabled = true;
    this.secondRowButtons.appendChild(this.replaceButtonElement);

    this.replaceAllButtonElement = createTextButton(i18nString(UIStrings.replaceAll), this.replaceAll.bind(this), {
      className: 'search-action-button',
      jslogContext: 'replace-all',
    });
    this.secondRowButtons.appendChild(this.replaceAllButtonElement);
    this.replaceAllButtonElement.disabled = true;

    this.minimalSearchQuerySize = 3;
    this.loadSetting();
  }

  static fromElement(element: Element|null): SearchableView|null {
    let view: (SearchableView|null)|null = null;
    while (element && !view) {
      view = searchableViewsByElement.get(element) || null;
      element = element.parentElementOrShadowHost();
    }
    return view;
  }

  private toggleCaseSensitiveSearch(): void {
    if (this.caseSensitiveButton) {
      this.caseSensitiveButton.setToggled(!this.caseSensitiveButton.toggled());
    }
    this.saveSetting();
    this.performSearch(false, true);
  }

  private toggleRegexSearch(): void {
    if (this.regexButton) {
      this.regexButton.setToggled(!this.regexButton.toggled());
    }
    this.saveSetting();
    this.performSearch(false, true);
  }

  private toggleReplace(): void {
    this.replaceToggleButton.setToggled(!this.replaceToggleButton.toggled());
    this.updateSecondRowVisibility();
  }

  private saveSetting(): void {
    if (!this.setting) {
      return;
    }
    const settingValue = this.setting.get() || {};
    if (this.caseSensitiveButton) {
      settingValue.caseSensitive = this.caseSensitiveButton.toggled();
    }
    if (this.regexButton) {
      settingValue.isRegex = this.regexButton.toggled();
    }
    this.setting.set(settingValue);
  }

  private loadSetting(): void {
    const settingValue = this.setting ? (this.setting.get() || {}) : {};
    if (this.searchProvider.supportsCaseSensitiveSearch() && this.caseSensitiveButton) {
      this.caseSensitiveButton.setToggled(Boolean(settingValue.caseSensitive));
    }
    if (this.searchProvider.supportsRegexSearch() && this.regexButton) {
      this.regexButton.setToggled(Boolean(settingValue.isRegex));
    }
  }

  setMinimalSearchQuerySize(minimalSearchQuerySize: number): void {
    this.minimalSearchQuerySize = minimalSearchQuerySize;
  }

  setPlaceholder(placeholder: string, ariaLabel?: string): void {
    this.searchInputElement.placeholder = placeholder;
    if (ariaLabel) {
      ARIAUtils.setLabel(this.searchInputElement, ariaLabel);
    }
  }

  setReplaceable(replaceable: boolean): void {
    this.replaceable = replaceable;
  }

  updateSearchMatchesCount(matches: number): void {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const untypedSearchProvider = (this.searchProvider as any);
    if (untypedSearchProvider.currentSearchMatches === matches) {
      return;
    }
    untypedSearchProvider.currentSearchMatches = matches;
    this.updateSearchMatchesCountAndCurrentMatchIndex(untypedSearchProvider.currentQuery ? matches : 0, -1);
  }

  updateCurrentMatchIndex(currentMatchIndex: number): void {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const untypedSearchProvider = (this.searchProvider as any);
    this.updateSearchMatchesCountAndCurrentMatchIndex(untypedSearchProvider.currentSearchMatches, currentMatchIndex);
  }

  isSearchVisible(): boolean {
    return Boolean(this.searchIsVisible);
  }

  closeSearch(): void {
    this.cancelSearch();
    if (this.footerElementContainer.hasFocus()) {
      this.focus();
    }

    this.searchProvider.onSearchClosed?.();
  }

  private toggleSearchBar(toggled: boolean): void {
    this.footerElementContainer.classList.toggle('hidden', !toggled);
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
    this.matchesElement.textContent = '';
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

  private updateSearchNavigationButtonState(enabled: boolean): void {
    this.replaceButtonElement.disabled = !enabled;
    this.replaceAllButtonElement.disabled = !enabled;
    this.searchNavigationPrevElement.classList.toggle('enabled', enabled);
    this.searchNavigationNextElement.classList.toggle('enabled', enabled);
  }

  private updateSearchMatchesCountAndCurrentMatchIndex(matches: number, currentMatchIndex: number): void {
    if (!this.currentQuery) {
      this.matchesElement.textContent = '';
    } else if (matches === 0 || currentMatchIndex >= 0) {
      this.matchesElement.textContent = i18nString(UIStrings.dOfD, {PH1: currentMatchIndex + 1, PH2: matches});
    } else if (matches === 1) {
      this.matchesElement.textContent = i18nString(UIStrings.matchString);
    } else {
      this.matchesElement.textContent = i18nString(UIStrings.dMatches, {PH1: matches});
    }
    this.updateSearchNavigationButtonState(matches > 0);
  }

  showSearchField(): void {
    if (this.searchIsVisible) {
      this.cancelSearch();
    }

    let queryCandidate;
    if (!this.searchInputElement.hasFocus()) {
      const selection = InspectorView.instance().element.window().getSelection();
      if (selection && selection.rangeCount) {
        queryCandidate = selection.toString().replace(/\r?\n.*/, '');
      }
    }

    this.toggleSearchBar(true);
    this.updateReplaceVisibility();
    if (queryCandidate) {
      this.searchInputElement.value = queryCandidate;
    }
    this.performSearch(false, false);
    this.searchInputElement.focus();
    this.searchInputElement.select();
    this.searchIsVisible = true;
  }

  private updateReplaceVisibility(): void {
    this.replaceToggleButton.setVisible(this.replaceable);
    if (!this.replaceable) {
      this.replaceToggleButton.setToggled(false);
      this.updateSecondRowVisibility();
    }
  }

  private onSearchKeyDown(ev: Event): void {
    const event = (ev as KeyboardEvent);
    if (Platform.KeyboardUtilities.isEscKey(event)) {
      this.closeSearch();
      event.consume(true);
      return;
    }
    if (!(event.key === 'Enter')) {
      return;
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

  private onNextButtonSearch(_event: Event): void {
    if (!this.searchNavigationNextElement.classList.contains('enabled')) {
      return;
    }
    this.jumpToNextSearchResult();
    this.searchInputElement.focus();
  }

  private onPrevButtonSearch(_event: Event): void {
    if (!this.searchNavigationPrevElement.classList.contains('enabled')) {
      return;
    }
    this.jumpToNextSearchResult(true);
    this.searchInputElement.focus();
  }

  private clearSearch(): void {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const untypedSearchProvider = (this.searchProvider as any);
    delete this.currentQuery;
    if (Boolean(untypedSearchProvider.currentQuery)) {
      delete untypedSearchProvider.currentQuery;
      this.searchProvider.onSearchCanceled();
    }
    this.updateSearchMatchesCountAndCurrentMatchIndex(0, -1);
  }

  private performSearch(forceSearch: boolean, shouldJump: boolean, jumpBackwards?: boolean): void {
    const query = this.searchInputElement.value;
    if (!query || (!forceSearch && query.length < this.minimalSearchQuerySize && !this.currentQuery)) {
      this.clearSearch();
      return;
    }

    this.currentQuery = query;
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.searchProvider as any).currentQuery = query;

    const searchConfig = this.currentSearchConfig();
    this.searchProvider.performSearch(searchConfig, shouldJump, jumpBackwards);
  }

  private currentSearchConfig(): SearchConfig {
    const query = this.searchInputElement.value;
    const caseSensitive = this.caseSensitiveButton ? this.caseSensitiveButton.toggled() : false;
    const isRegex = this.regexButton ? this.regexButton.toggled() : false;
    return new SearchConfig(query, caseSensitive, isRegex);
  }

  private updateSecondRowVisibility(): void {
    const secondRowVisible = this.replaceToggleButton.toggled();
    this.footerElementContainer.classList.toggle('replaceable', secondRowVisible);
    this.secondRowButtons.classList.toggle('hidden', !secondRowVisible);
    this.replaceInputElement.classList.toggle('hidden', !secondRowVisible);

    if (secondRowVisible) {
      this.replaceInputElement.focus();
    } else {
      this.searchInputElement.focus();
    }
    this.doResize();
  }

  private replace(): void {
    if (!this.replaceProvider) {
      throw new Error('No \'replacable\' provided to SearchableView!');
    }
    const searchConfig = this.currentSearchConfig();
    this.replaceProvider.replaceSelectionWith(searchConfig, this.replaceInputElement.value);
    delete this.currentQuery;
    this.performSearch(true, true);
  }

  private replaceAll(): void {
    if (!this.replaceProvider) {
      throw new Error('No \'replacable\' provided to SearchableView!');
    }
    const searchConfig = this.currentSearchConfig();
    this.replaceProvider.replaceAllWith(searchConfig, this.replaceInputElement.value);
  }

  private onInput(_event: Event): void {
    if (!Common.Settings.Settings.instance().moduleSetting('search-as-you-type').get()) {
      this.clearSearch();
      return;
    }

    if (this.valueChangedTimeoutId) {
      clearTimeout(this.valueChangedTimeoutId);
    }
    const timeout = this.searchInputElement.value.length < 3 ? 200 : 0;
    this.valueChangedTimeoutId = window.setTimeout(this.onValueChanged.bind(this), timeout);
  }

  private onValueChanged(): void {
    if (!this.searchIsVisible) {
      return;
    }
    delete this.valueChangedTimeoutId;
    this.performSearch(false, true);
  }
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
export const _symbol = Symbol('searchableView');

const searchableViewsByElement = new WeakMap<Element, SearchableView>();

export interface Searchable {
  onSearchCanceled(): void;
  // Called when the search toolbar is closed
  onSearchClosed?: () => void;
  performSearch(searchConfig: SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void;
  jumpToNextSearchResult(): void;
  jumpToPreviousSearchResult(): void;
  supportsCaseSensitiveSearch(): boolean;
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
  isRegex: boolean;

  constructor(query: string, caseSensitive: boolean, isRegex: boolean) {
    this.query = query;
    this.caseSensitive = caseSensitive;
    this.isRegex = isRegex;
  }

  toSearchRegex(global?: boolean): SearchRegexResult {
    let modifiers = this.caseSensitive ? '' : 'i';
    if (global) {
      modifiers += 'g';
    }
    const query = this.isRegex ? '/' + this.query + '/' : this.query;

    let regex: RegExp|undefined;
    let fromQuery = false;

    // First try creating regex if user knows the / / hint.
    try {
      if (/^\/.+\/$/.test(query)) {
        regex = new RegExp(query.substring(1, query.length - 1), modifiers);
        fromQuery = true;
      }
    } catch (e) {
      // Silent catch.
    }

    // Otherwise just do a plain text search.
    if (!regex) {
      regex = Platform.StringUtilities.createPlainTextSearchRegex(query, modifiers);
    }

    return {
      regex,
      fromQuery,
    };
  }
}

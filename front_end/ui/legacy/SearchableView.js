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
import { InspectorView } from './InspectorView.js';
import { Keys } from './KeyboardShortcut.js';
import searchableViewStyles from './searchableView.css.js';
import { VBox } from './Widget.js';
const { html, nothing, render, Directives } = Lit;
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
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/SearchableView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function renderClearButton(jslogContext, onClick) {
    // clang-format off
    return html `
    <devtools-button class="clear-button" tabindex="-1" aria-label=${i18nString(UIStrings.clearInput)}
        .data=${{
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        jslogContext,
        title: i18nString(UIStrings.clearInput),
        iconName: 'cross-circle-filled',
    }}
        @click=${onClick}></devtools-button>`;
    // clang-format on
}
function renderConfigToggle(iconName, label, toggled, onClick) {
    // clang-format off
    return html `
    <devtools-button aria-label=${label}
        .data=${{
        variant: "icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        iconName,
        toggledIconName: iconName,
        toggled,
        toggleType: "primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */,
        title: label,
        jslogContext: iconName,
    }}
        @click=${onClick}></devtools-button>`;
    // clang-format on
}
export const DEFAULT_VIEW = (input, output, target) => {
    const replaceLabel = input.secondRowVisible ? i18nString(UIStrings.disableFindAndReplace) : i18nString(UIStrings.enableFindAndReplace);
    // clang-format off
    render(html `
    <style>${searchableViewStyles}</style>
    <slot></slot>
    <div class="search-bar ${input.searchIsVisible ? '' : 'hidden'} ${input.secondRowVisible ? 'replaceable' : ''}"
        style="order: 100"
        ${Directives.ref(el => { output.footerElementContainer = el; })}>
      <div class="toolbar-search" jslog=${VisualLogging.toolbar('search').track({ resize: true })}>
        <devtools-toolbar class="replace-toggle-toolbar">
          <devtools-button class="toolbar-item" ?hidden=${!input.replaceable} aria-label=${replaceLabel}
              .data=${{
        variant: "icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */,
        size: "REGULAR" /* Buttons.Button.Size.REGULAR */,
        iconName: 'replace',
        toggledIconName: 'replace',
        toggleType: "primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */,
        toggled: input.secondRowVisible,
        title: replaceLabel,
        jslogContext: 'replace',
    }}
              @click=${input.onToggleReplace}></devtools-button>
        </devtools-toolbar>
        <div class="search-inputs">
          <div class="icon-and-input">
            <devtools-icon name="search"></devtools-icon>
            <input type="search" id="search-input-field" class="search-replace search" autocomplete="off"
                placeholder=${input.placeholder}
                aria-label=${input.searchAriaLabel ?? nothing}
                jslog=${VisualLogging.textField('search').track({ change: true, keydown: 'ArrowUp|ArrowDown|Enter|Escape' })}
                @keydown=${input.onSearchKeyDown}
                @input=${input.onSearchInput}
                ${Directives.ref(el => { output.searchInputElement = el; })}>
          </div>
          <div class="replace-element input-line">
            <input class="search-replace" placeholder=${i18nString(UIStrings.replace)}
                jslog=${VisualLogging.textField('replace').track({ change: true, keydown: 'Enter' })}
                @keydown=${input.onReplaceKeyDown}
                ${Directives.ref(el => { output.replaceInputElement = el; })}>
            ${renderClearButton('clear-replace-input', input.onClearReplaceInput)}
          </div>
          <div class="search-config-buttons">
            ${renderClearButton('clear-search-input', input.onClearSearchInput)}
            ${input.supportsCaseSensitive ? renderConfigToggle('match-case', i18nString(UIStrings.matchCase), input.caseSensitiveToggled, input.onToggleCaseSensitive) : nothing}
            ${input.supportsWholeWord ? renderConfigToggle('match-whole-word', i18nString(UIStrings.matchWholeWord), input.wholeWordToggled, input.onToggleWholeWord) : nothing}
            ${input.supportsRegex ? renderConfigToggle('regular-expression', i18nString(UIStrings.useRegularExpression), input.regexToggled, input.onToggleRegex) : nothing}
          </div>
          <div class="input-line search-input-background"></div>
        </div>
        <div class="toolbar-search-buttons">
          <div class="first-row-buttons">
            <devtools-toolbar class="toolbar-search-options">
              <devtools-button class="toolbar-item" aria-label=${i18nString(UIStrings.searchPrevious)} ?disabled=${!input.navEnabled}
                  .data=${{
        variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */,
        iconName: 'chevron-up',
        title: i18nString(UIStrings.searchPrevious),
        jslogContext: 'select-previous',
        disabled: !input.navEnabled,
    }}
                  @click=${input.onPrevClick}></devtools-button>
              <devtools-button class="toolbar-item" aria-label=${i18nString(UIStrings.searchNext)} ?disabled=${!input.navEnabled}
                  .data=${{
        variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */,
        iconName: 'chevron-down',
        title: i18nString(UIStrings.searchNext),
        jslogContext: 'select-next',
        disabled: !input.navEnabled,
    }}
                  @click=${input.onNextClick}></devtools-button>
              <div class="toolbar-item toolbar-text search-results-matches"
                  style="font-variant-numeric: tabular-nums; color: var(--sys-color-on-surface-subtle); padding: 0 var(--sys-size-3)"
                  aria-live="polite" aria-atomic="false" aria-label=${input.matchesAriaLabel || nothing}>
                <span aria-hidden="true">${input.matchesText}</span>
              </div>
            </devtools-toolbar>
            <devtools-button class="close-search-button"
                .data=${{
        variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */,
        size: "REGULAR" /* Buttons.Button.Size.REGULAR */,
        iconName: 'cross',
        title: i18nString(UIStrings.closeSearchBar),
        jslogContext: 'close-search',
    }}
                @click=${input.onCloseClick}></devtools-button>
          </div>
          <div class="second-row-buttons replace-element">
            <devtools-button class="search-action-button" ?disabled=${!input.replaceEnabled}
                .data=${{
        variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
        title: i18nString(UIStrings.replace),
        jslogContext: 'replace',
        disabled: !input.replaceEnabled,
    }}
                @click=${input.onReplaceClick}>${i18nString(UIStrings.replace)}</devtools-button>
            <devtools-button class="search-action-button" ?disabled=${!input.replaceEnabled}
                .data=${{
        variant: "outlined" /* Buttons.Button.Variant.OUTLINED */,
        title: i18nString(UIStrings.replaceAll),
        jslogContext: 'replace-all',
        disabled: !input.replaceEnabled,
    }}
                @click=${input.onReplaceAllClick}>${i18nString(UIStrings.replaceAll)}</devtools-button>
          </div>
        </div>
      </div>
    </div>
  `, target);
    // clang-format on
};
export class SearchableView extends VBox {
    #view;
    #viewOutput = {};
    #searchProvider;
    #searchTarget = null;
    replaceProvider = null;
    #setting = null;
    #replaceable = false;
    minimalSearchQuerySize = 3;
    searchIsVisible;
    #secondRowVisible = false;
    #placeholder = i18nString(UIStrings.findString);
    #searchAriaLabel;
    #caseSensitiveToggled = false;
    #wholeWordToggled = false;
    #regexToggled = false;
    #matchesText = '';
    #matchesAriaLabel = '';
    #hasMatches = false;
    #history = [''];
    #historyPosition = 0;
    currentQuery;
    valueChangedTimeoutId;
    constructor(searchableOrElement, replaceableOrView, settingName, element, view = DEFAULT_VIEW) {
        const isElement = searchableOrElement instanceof HTMLElement || searchableOrElement === undefined;
        super(isElement ? searchableOrElement : element, { useShadowDom: true });
        this.#view = isElement && typeof replaceableOrView === 'function' ? replaceableOrView : view;
        searchableViewsByElement.set(this.element, this);
        if (!isElement) {
            this.settingName = settingName;
            this.replaceProvider = replaceableOrView ?? null;
            this.searchProvider = searchableOrElement;
        }
        this.performUpdate();
    }
    get footerElementContainer() {
        return this.#viewOutput.footerElementContainer;
    }
    get searchInputElement() {
        return this.#viewOutput.searchInputElement;
    }
    get replaceInputElement() {
        return this.#viewOutput.replaceInputElement;
    }
    performUpdate() {
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
        }, this.#viewOutput, this.contentElement);
    }
    #onToggleConfig(type) {
        if (type === 'case') {
            this.#caseSensitiveToggled = !this.#caseSensitiveToggled;
        }
        else if (type === 'word') {
            this.#wholeWordToggled = !this.#wholeWordToggled;
        }
        else {
            this.#regexToggled = !this.#regexToggled;
        }
        this.#saveSetting();
        this.performSearch(false, true);
        this.performUpdate();
    }
    get searchProvider() {
        return this.#searchProvider;
    }
    set searchProvider(searchable) {
        if (this.#searchProvider === searchable) {
            return;
        }
        this.#searchProvider = searchable;
        this.#loadSetting();
        this.performUpdate();
    }
    get searchTarget() {
        return this.#searchTarget;
    }
    set searchTarget(target) {
        if (this.#searchTarget === target) {
            return;
        }
        this.#searchTarget?.setSearchableView?.(null);
        this.#searchTarget = target;
        this.#searchTarget?.setSearchableView?.(this);
        this.refreshSearch();
    }
    set settingName(settingName) {
        if (this.#setting?.name === settingName) {
            return;
        }
        this.#setting = settingName ? Common.Settings.Settings.instance().createSetting(settingName, {}) : null;
        this.#loadSetting();
        this.performUpdate();
    }
    get replaceable() {
        return this.#replaceable;
    }
    set replaceable(replaceable) {
        if (this.#replaceable === replaceable) {
            return;
        }
        this.#replaceable = replaceable;
        if (this.searchIsVisible) {
            this.updateReplaceVisibility();
        }
        this.performUpdate();
    }
    static fromElement(element) {
        let view = null;
        while (element && !view) {
            view = searchableViewsByElement.get(element) || null;
            element = element.parentElementOrShadowHost();
        }
        return view;
    }
    toggleReplace() {
        this.#secondRowVisible = !this.#secondRowVisible;
        this.performUpdate();
        this.updateSecondRowVisibility();
    }
    #saveSetting() {
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
    #loadSetting() {
        const settingValue = this.#setting ? (this.#setting.get() || {}) : {};
        this.#caseSensitiveToggled =
            Boolean(this.#searchProvider?.supportsCaseSensitiveSearch() && settingValue.caseSensitive);
        this.#wholeWordToggled = Boolean(this.#searchProvider?.supportsWholeWordSearch() && settingValue.wholeWord);
        this.#regexToggled = Boolean(this.#searchProvider?.supportsRegexSearch() && settingValue.isRegex);
    }
    setMinimalSearchQuerySize(minimalSearchQuerySize) {
        this.minimalSearchQuerySize = minimalSearchQuerySize;
    }
    setPlaceholder(placeholder, ariaLabel) {
        this.#placeholder = placeholder;
        if (ariaLabel) {
            this.#searchAriaLabel = ariaLabel;
        }
        this.performUpdate();
    }
    get placeholder() {
        return this.#placeholder;
    }
    set placeholder(placeholder) {
        this.#placeholder = placeholder;
        this.performUpdate();
    }
    setReplaceable(replaceable) {
        this.replaceable = replaceable;
    }
    updateSearchMatchesCount(matches) {
        if (this.searchProvider.currentSearchMatches === matches) {
            return;
        }
        this.searchProvider.currentSearchMatches = matches;
        this.updateSearchMatchesCountAndCurrentMatchIndex(this.searchProvider.currentQuery ? matches : 0, -1);
    }
    updateCurrentMatchIndex(currentMatchIndex) {
        if (!this.searchProvider.currentSearchMatches) {
            return;
        }
        this.updateSearchMatchesCountAndCurrentMatchIndex(this.searchProvider.currentSearchMatches, currentMatchIndex);
    }
    closeSearch() {
        this.cancelSearch();
        if (this.footerElementContainer?.hasFocus()) {
            this.focus();
        }
        this.searchProvider.onSearchClosed?.();
    }
    toggleSearchBar(toggled) {
        this.searchIsVisible = toggled;
        this.performUpdate();
        this.doResize();
    }
    cancelSearch() {
        if (!this.searchIsVisible) {
            return;
        }
        this.resetSearch();
        delete this.searchIsVisible;
        this.toggleSearchBar(false);
    }
    resetSearch() {
        this.clearSearch();
        this.updateReplaceVisibility();
        this.#matchesText = '';
        this.performUpdate();
    }
    refreshSearch() {
        if (!this.searchIsVisible) {
            return;
        }
        this.resetSearch();
        this.performSearch(false, false);
    }
    handleFindNextShortcut() {
        if (!this.searchIsVisible) {
            return false;
        }
        this.searchProvider.jumpToNextSearchResult();
        return true;
    }
    handleFindPreviousShortcut() {
        if (!this.searchIsVisible) {
            return false;
        }
        this.searchProvider.jumpToPreviousSearchResult();
        return true;
    }
    handleFindShortcut() {
        this.showSearchField();
        return true;
    }
    handleCancelSearchShortcut() {
        if (!this.searchIsVisible) {
            return false;
        }
        this.closeSearch();
        return true;
    }
    updateSearchMatchesCountAndCurrentMatchIndex(matches, currentMatchIndex) {
        if (!this.currentQuery) {
            this.#matchesText = '';
        }
        else if (matches === 0 || currentMatchIndex >= 0) {
            this.#matchesText = i18nString(UIStrings.dOfD, { PH1: currentMatchIndex + 1, PH2: matches });
            this.#matchesAriaLabel = i18nString(UIStrings.accessibledOfD, { PH1: currentMatchIndex + 1, PH2: matches });
        }
        else if (matches === 1) {
            this.#matchesText = i18nString(UIStrings.matchString);
            this.#matchesAriaLabel = i18nString(UIStrings.matchString);
        }
        else {
            this.#matchesText = i18nString(UIStrings.dMatches, { PH1: matches });
            this.#matchesAriaLabel = i18nString(UIStrings.dMatches, { PH1: matches });
        }
        this.#hasMatches = matches > 0;
        this.performUpdate();
    }
    showSearchField() {
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
    updateReplaceVisibility() {
        if (!this.replaceable) {
            this.#secondRowVisible = false;
            this.performUpdate();
            this.updateSecondRowVisibility();
        }
    }
    onSearchKeyDown(event) {
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
        }
        else {
            this.jumpToNextSearchResult(event.shiftKey);
        }
    }
    onReplaceKeyDown(event) {
        if (event.key === 'Enter') {
            this.replace();
        }
    }
    jumpToNextSearchResult(isBackwardSearch) {
        if (!this.currentQuery) {
            return;
        }
        if (isBackwardSearch) {
            this.searchProvider.jumpToPreviousSearchResult();
        }
        else {
            this.searchProvider.jumpToNextSearchResult();
        }
    }
    onNextButtonSearch() {
        this.jumpToNextSearchResult();
    }
    onPrevButtonSearch() {
        this.jumpToNextSearchResult(true);
    }
    clearSearch() {
        this.currentQuery = undefined;
        if (Boolean(this.searchProvider.currentQuery)) {
            this.searchProvider.currentQuery = undefined;
            this.searchProvider.onSearchCanceled();
        }
        this.updateSearchMatchesCountAndCurrentMatchIndex(0, -1);
    }
    performSearch(forceSearch, shouldJump, jumpBackwards) {
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
    currentSearchConfig() {
        const query = this.searchInputElement?.value ?? '';
        return new SearchConfig(query, this.#caseSensitiveToggled, this.#wholeWordToggled, this.#regexToggled);
    }
    updateSecondRowVisibility() {
        if (this.#secondRowVisible) {
            this.replaceInputElement?.focus();
        }
        else {
            this.searchInputElement?.focus();
        }
        this.doResize();
    }
    replace() {
        if (!this.replaceProvider) {
            throw new Error('No \'replaceable\' provided to SearchableView!');
        }
        const searchConfig = this.currentSearchConfig();
        this.replaceProvider.replaceSelectionWith(searchConfig, this.replaceInputElement?.value ?? '');
        this.currentQuery = undefined;
        this.performSearch(true, true);
    }
    replaceAll() {
        if (!this.replaceProvider) {
            throw new Error('No \'replaceable\' provided to SearchableView!');
        }
        const searchConfig = this.currentSearchConfig();
        this.replaceProvider.replaceAllWith(searchConfig, this.replaceInputElement?.value ?? '');
    }
    onInput() {
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
    onValueChanged() {
        if (!this.searchIsVisible) {
            return;
        }
        this.valueChangedTimeoutId = undefined;
        this.performSearch(false, true);
    }
}
const searchableViewsByElement = new WeakMap();
export class SearchConfig {
    query;
    caseSensitive;
    wholeWord;
    isRegex;
    constructor(query, caseSensitive, wholeWord, isRegex) {
        this.query = query;
        this.caseSensitive = caseSensitive;
        this.wholeWord = wholeWord;
        this.isRegex = isRegex;
    }
    toSearchRegex(global) {
        let modifiers = this.caseSensitive ? '' : 'i';
        if (global) {
            modifiers += 'g';
        }
        // Check if query is surrounded by forward slashes
        const isRegexFormatted = this.query.startsWith('/') && this.query.endsWith('/');
        const query = this.isRegex && !isRegexFormatted ? '/' + this.query + '/' : this.query;
        let regex;
        let fromQuery = false;
        // First try creating regex if user knows the / / hint.
        try {
            if (/^\/.+\/$/.test(query) && this.isRegex) {
                regex = new RegExp(query.substring(1, query.length - 1), modifiers);
                fromQuery = true;
            }
        }
        catch {
            // Silent catch.
        }
        // Otherwise just do a plain text search.
        if (!regex) {
            regex = Platform.StringUtilities.createPlainTextSearchRegex(query, modifiers);
        }
        if (this.wholeWord) {
            let { source } = regex;
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
//# sourceMappingURL=SearchableView.js.map
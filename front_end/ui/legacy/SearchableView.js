// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
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
import './Toolbar.js'; // eslint-disable-line import/no-duplicates
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as Buttons from '../components/buttons/buttons.js';
import * as IconButton from '../components/icon_button/icon_button.js';
import * as ARIAUtils from './ARIAUtils.js';
import { InspectorView } from './InspectorView.js';
import searchableViewStyles from './searchableView.css.js';
import { ToolbarButton, ToolbarText, ToolbarToggle } from './Toolbar.js'; // eslint-disable-line import/no-duplicates
import { createHistoryInput, createTextButton } from './UIUtils.js';
import { VBox } from './Widget.js';
const UIStrings = {
    /**
     * @description Text on a button to replace one instance with input text for the ctrl+F search bar
     */
    replace: 'Replace',
    /**
     * @description Tooltip text on a toggle to enable replacing one instance with input text for the ctrl+F search bar
     */
    enableFindAndReplace: 'Find and replace',
    /**
     * @description Tooltip text on a toggle to disable replacing one instance with input text for the ctrl+F search bar
     */
    disableFindAndReplace: 'Disable find and replace',
    /**
     * @description Text to find an item
     */
    findString: 'Find',
    /**
     * @description Tooltip text on a button to search previous instance for the ctrl+F search bar
     */
    searchPrevious: 'Show previous result',
    /**
     * @description Tooltip text on a button to search next instance for the ctrl+F search bar
     */
    searchNext: 'Show next result',
    /**
     * @description Tooltip text on a toggle to enable/disable search by matching the exact case.
     */
    matchCase: 'Match case',
    /**
     * @description Tooltip text on a toggle to enable/disable search by matching the exact word.
     */
    matchWholeWord: 'Match whole word',
    /**
     * @description Tooltip text on a toggle to enable/disable searching with regular expression.
     */
    useRegularExpression: 'Use regular expression',
    /**
     * @description Tooltip text on a button to close the search bar
     */
    closeSearchBar: 'Close search bar',
    /**
     * @description Text on a button to replace all instances with input text for the ctrl+F search bar
     */
    replaceAll: 'Replace all',
    /**
     * @description Text to indicate the current match index and the total number of matches for the ctrl+F search bar
     * @example {2} PH1
     * @example {3} PH2
     */
    dOfD: '{PH1} of {PH2}',
    /**
     * @description Tooltip text to indicate the current match index and the total number of matches for the ctrl+F search bar
     * @example {2} PH1
     * @example {3} PH2
     */
    accessibledOfD: 'Shows result {PH1} of {PH2}',
    /**
     * @description Text to indicate search result for the ctrl+F search bar
     */
    matchString: '1 match',
    /**
     * @description Text to indicate search result for the ctrl+F search bar
     * @example {2} PH1
     */
    dMatches: '{PH1} matches',
    /**
     * @description Text on a button to search previous instance for the ctrl+F search bar
     */
    clearInput: 'Clear',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/SearchableView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function createClearButton(jslogContext) {
    const button = new Buttons.Button.Button();
    button.data = {
        variant: "icon" /* Buttons.Button.Variant.ICON */,
        size: "SMALL" /* Buttons.Button.Size.SMALL */,
        jslogContext,
        title: i18nString(UIStrings.clearInput),
        iconName: 'cross-circle-filled',
    };
    button.ariaLabel = i18nString(UIStrings.clearInput);
    button.classList.add('clear-button');
    button.tabIndex = -1;
    return button;
}
export class SearchableView extends VBox {
    searchProvider;
    replaceProvider;
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setting;
    replaceable;
    footerElementContainer;
    footerElement;
    replaceToggleButton;
    searchInputElement;
    matchesElement;
    searchNavigationPrevElement;
    searchNavigationNextElement;
    replaceInputElement;
    caseSensitiveButton;
    wholeWordButton;
    regexButton;
    replaceButtonElement;
    replaceAllButtonElement;
    minimalSearchQuerySize;
    searchIsVisible;
    currentQuery;
    valueChangedTimeoutId;
    constructor(searchable, replaceable, settingName, element) {
        super(element, { useShadowDom: true });
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
        this.footerElement.setAttribute('jslog', `${VisualLogging.toolbar('search').track({ resize: true })}`);
        const replaceToggleToolbar = this.footerElement.createChild('devtools-toolbar', 'replace-toggle-toolbar');
        this.replaceToggleButton =
            new ToolbarToggle(i18nString(UIStrings.enableFindAndReplace), 'replace', undefined, 'replace');
        ARIAUtils.setLabel(this.replaceToggleButton.element, i18nString(UIStrings.enableFindAndReplace));
        this.replaceToggleButton.addEventListener("Click" /* ToolbarButton.Events.CLICK */, this.toggleReplace, this);
        replaceToggleToolbar.appendToolbarItem(this.replaceToggleButton);
        // Elements within `searchInputElements` are added according to their expected tab order.
        const searchInputElements = this.footerElement.createChild('div', 'search-inputs');
        const iconAndInput = searchInputElements.createChild('div', 'icon-and-input');
        const searchIcon = IconButton.Icon.create('search');
        iconAndInput.appendChild(searchIcon);
        this.searchInputElement = createHistoryInput('search', 'search-replace search');
        this.searchInputElement.id = 'search-input-field';
        this.searchInputElement.autocomplete = 'off';
        this.searchInputElement.placeholder = i18nString(UIStrings.findString);
        this.searchInputElement.setAttribute('jslog', `${VisualLogging.textField('search').track({ change: true, keydown: 'ArrowUp|ArrowDown|Enter|Escape' })}`);
        this.searchInputElement.addEventListener('keydown', this.onSearchKeyDown.bind(this), true);
        this.searchInputElement.addEventListener('input', this.onInput.bind(this), false);
        iconAndInput.appendChild(this.searchInputElement);
        const replaceInputElements = searchInputElements.createChild('div', 'replace-element input-line');
        this.replaceInputElement = replaceInputElements.createChild('input', 'search-replace');
        this.replaceInputElement.addEventListener('keydown', this.onReplaceKeyDown.bind(this), true);
        this.replaceInputElement.placeholder = i18nString(UIStrings.replace);
        this.replaceInputElement.setAttribute('jslog', `${VisualLogging.textField('replace').track({ change: true, keydown: 'Enter' })}`);
        const replaceInputClearButton = createClearButton('clear-replace-input');
        replaceInputClearButton.addEventListener('click', () => {
            this.replaceInputElement.value = '';
            this.replaceInputElement.focus();
        });
        replaceInputElements.appendChild(replaceInputClearButton);
        const searchConfigButtons = searchInputElements.createChild('div', 'search-config-buttons');
        const clearButton = createClearButton('clear-search-input');
        clearButton.addEventListener('click', () => {
            this.searchInputElement.value = '';
            this.clearSearch();
            this.searchInputElement.focus();
        });
        searchConfigButtons.appendChild(clearButton);
        const saveSettingAndPerformSearch = () => {
            this.saveSetting();
            this.performSearch(false, true);
        };
        if (this.searchProvider.supportsCaseSensitiveSearch()) {
            const iconName = 'match-case';
            this.caseSensitiveButton = new Buttons.Button.Button();
            this.caseSensitiveButton.data = {
                variant: "icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */,
                size: "SMALL" /* Buttons.Button.Size.SMALL */,
                iconName,
                toggledIconName: iconName,
                toggled: false,
                toggleType: "primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */,
                title: i18nString(UIStrings.matchCase),
                jslogContext: iconName,
            };
            ARIAUtils.setLabel(this.caseSensitiveButton, i18nString(UIStrings.matchCase));
            this.caseSensitiveButton.addEventListener('click', saveSettingAndPerformSearch);
            searchConfigButtons.appendChild(this.caseSensitiveButton);
        }
        if (this.searchProvider.supportsWholeWordSearch()) {
            const iconName = 'match-whole-word';
            this.wholeWordButton = new Buttons.Button.Button();
            this.wholeWordButton.data = {
                variant: "icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */,
                size: "SMALL" /* Buttons.Button.Size.SMALL */,
                iconName,
                toggledIconName: iconName,
                toggled: false,
                toggleType: "primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */,
                title: i18nString(UIStrings.matchWholeWord),
                jslogContext: iconName,
            };
            ARIAUtils.setLabel(this.wholeWordButton, i18nString(UIStrings.matchWholeWord));
            this.wholeWordButton.addEventListener('click', saveSettingAndPerformSearch);
            searchConfigButtons.appendChild(this.wholeWordButton);
        }
        if (this.searchProvider.supportsRegexSearch()) {
            const iconName = 'regular-expression';
            this.regexButton = new Buttons.Button.Button();
            this.regexButton.data = {
                variant: "icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */,
                size: "SMALL" /* Buttons.Button.Size.SMALL */,
                iconName,
                toggledIconName: iconName,
                toggleType: "primary-toggle" /* Buttons.Button.ToggleType.PRIMARY */,
                toggled: false,
                jslogContext: iconName,
                title: i18nString(UIStrings.useRegularExpression),
            };
            ARIAUtils.setLabel(this.regexButton, i18nString(UIStrings.useRegularExpression));
            this.regexButton.addEventListener('click', saveSettingAndPerformSearch);
            searchConfigButtons.appendChild(this.regexButton);
        }
        // Introduce a separate element for the background of the `Find` input line (instead of
        // grouping together the `Find` input together with all search config option buttons
        // and styling the parent's background).
        // This allows for a tabbing order that can jump from the `Find` input, to
        // the `Replace` input, and back to all search config option buttons.
        searchInputElements.createChild('div', 'input-line search-input-background');
        const buttonsContainer = this.footerElement.createChild('div', 'toolbar-search-buttons');
        const firstRowButtons = buttonsContainer.createChild('div', 'first-row-buttons');
        const toolbar = firstRowButtons.createChild('devtools-toolbar', 'toolbar-search-options');
        this.searchNavigationPrevElement =
            new ToolbarButton(i18nString(UIStrings.searchPrevious), 'chevron-up', undefined, 'select-previous');
        this.searchNavigationPrevElement.addEventListener("Click" /* ToolbarButton.Events.CLICK */, () => this.onPrevButtonSearch());
        toolbar.appendToolbarItem(this.searchNavigationPrevElement);
        ARIAUtils.setLabel(this.searchNavigationPrevElement.element, i18nString(UIStrings.searchPrevious));
        this.searchNavigationNextElement =
            new ToolbarButton(i18nString(UIStrings.searchNext), 'chevron-down', undefined, 'select-next');
        this.searchNavigationNextElement.addEventListener("Click" /* ToolbarButton.Events.CLICK */, () => this.onNextButtonSearch());
        ARIAUtils.setLabel(this.searchNavigationNextElement.element, i18nString(UIStrings.searchNext));
        toolbar.appendToolbarItem(this.searchNavigationNextElement);
        const matchesText = new ToolbarText();
        this.matchesElement = matchesText.element;
        this.matchesElement.style.fontVariantNumeric = 'tabular-nums';
        this.matchesElement.style.color = 'var(--sys-color-on-surface-subtle)';
        this.matchesElement.style.padding = '0 var(--sys-size-3)';
        this.matchesElement.classList.add('search-results-matches');
        toolbar.appendToolbarItem(matchesText);
        const cancelButtonElement = new Buttons.Button.Button();
        cancelButtonElement.data = {
            variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */,
            size: "REGULAR" /* Buttons.Button.Size.REGULAR */,
            iconName: 'cross',
            title: i18nString(UIStrings.closeSearchBar),
            jslogContext: 'close-search',
        };
        cancelButtonElement.classList.add('close-search-button');
        cancelButtonElement.addEventListener('click', () => this.closeSearch());
        firstRowButtons.appendChild(cancelButtonElement);
        const secondRowButtons = buttonsContainer.createChild('div', 'second-row-buttons replace-element');
        this.replaceButtonElement = createTextButton(i18nString(UIStrings.replace), this.replace.bind(this), {
            className: 'search-action-button',
            jslogContext: 'replace',
        });
        this.replaceButtonElement.disabled = true;
        secondRowButtons.appendChild(this.replaceButtonElement);
        this.replaceAllButtonElement = createTextButton(i18nString(UIStrings.replaceAll), this.replaceAll.bind(this), {
            className: 'search-action-button',
            jslogContext: 'replace-all',
        });
        secondRowButtons.appendChild(this.replaceAllButtonElement);
        this.replaceAllButtonElement.disabled = true;
        this.minimalSearchQuerySize = 3;
        this.loadSetting();
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
        const replaceEnabled = this.replaceToggleButton.isToggled();
        const label = replaceEnabled ? i18nString(UIStrings.disableFindAndReplace) : i18nString(UIStrings.enableFindAndReplace);
        ARIAUtils.setLabel(this.replaceToggleButton.element, label);
        this.replaceToggleButton.element.title = label;
        this.updateSecondRowVisibility();
    }
    saveSetting() {
        if (!this.setting) {
            return;
        }
        const settingValue = this.setting.get() || {};
        if (this.caseSensitiveButton) {
            settingValue.caseSensitive = this.caseSensitiveButton.toggled;
        }
        if (this.wholeWordButton) {
            settingValue.wholeWord = this.wholeWordButton.toggled;
        }
        if (this.regexButton) {
            settingValue.isRegex = this.regexButton.toggled;
        }
        this.setting.set(settingValue);
    }
    loadSetting() {
        const settingValue = this.setting ? (this.setting.get() || {}) : {};
        if (this.caseSensitiveButton) {
            this.caseSensitiveButton.toggled = Boolean(settingValue.caseSensitive);
        }
        if (this.wholeWordButton) {
            this.wholeWordButton.toggled = Boolean(settingValue.wholeWord);
        }
        if (this.regexButton) {
            this.regexButton.toggled = Boolean(settingValue.isRegex);
        }
    }
    setMinimalSearchQuerySize(minimalSearchQuerySize) {
        this.minimalSearchQuerySize = minimalSearchQuerySize;
    }
    setPlaceholder(placeholder, ariaLabel) {
        this.searchInputElement.placeholder = placeholder;
        if (ariaLabel) {
            ARIAUtils.setLabel(this.searchInputElement, ariaLabel);
        }
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
        if (this.footerElementContainer.hasFocus()) {
            this.focus();
        }
        this.searchProvider.onSearchClosed?.();
    }
    toggleSearchBar(toggled) {
        this.footerElementContainer.classList.toggle('hidden', !toggled);
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
        this.matchesElement.textContent = '';
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
    updateSearchNavigationButtonState(enabled) {
        this.replaceButtonElement.disabled = !enabled;
        this.replaceAllButtonElement.disabled = !enabled;
        this.searchNavigationPrevElement.setEnabled(enabled);
        this.searchNavigationNextElement.setEnabled(enabled);
    }
    updateSearchMatchesCountAndCurrentMatchIndex(matches, currentMatchIndex) {
        if (!this.currentQuery) {
            this.matchesElement.textContent = '';
        }
        else if (matches === 0 || currentMatchIndex >= 0) {
            this.matchesElement.textContent = i18nString(UIStrings.dOfD, { PH1: currentMatchIndex + 1, PH2: matches });
            ARIAUtils.setLabel(this.matchesElement, i18nString(UIStrings.accessibledOfD, { PH1: currentMatchIndex + 1, PH2: matches }));
        }
        else if (matches === 1) {
            this.matchesElement.textContent = i18nString(UIStrings.matchString);
        }
        else {
            this.matchesElement.textContent = i18nString(UIStrings.dMatches, { PH1: matches });
        }
        this.updateSearchNavigationButtonState(matches > 0);
    }
    showSearchField() {
        if (this.searchIsVisible) {
            this.cancelSearch();
        }
        let queryCandidate;
        if (!this.searchInputElement.hasFocus()) {
            const selection = InspectorView.instance().element.window().getSelection();
            if (selection?.rangeCount) {
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
    updateReplaceVisibility() {
        this.replaceToggleButton.setVisible(this.replaceable);
        if (!this.replaceable) {
            this.replaceToggleButton.setToggled(false);
            this.updateSecondRowVisibility();
        }
    }
    onSearchKeyDown(event) {
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
        const query = this.searchInputElement.value;
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
        const query = this.searchInputElement.value;
        const caseSensitive = this.caseSensitiveButton ? this.caseSensitiveButton.toggled : false;
        const wholeWord = this.wholeWordButton ? this.wholeWordButton.toggled : false;
        const isRegex = this.regexButton ? this.regexButton.toggled : false;
        return new SearchConfig(query, caseSensitive, wholeWord, isRegex);
    }
    updateSecondRowVisibility() {
        const secondRowVisible = this.replaceToggleButton.isToggled();
        this.footerElementContainer.classList.toggle('replaceable', secondRowVisible);
        if (secondRowVisible) {
            this.replaceInputElement.focus();
        }
        else {
            this.searchInputElement.focus();
        }
        this.doResize();
    }
    replace() {
        if (!this.replaceProvider) {
            throw new Error('No \'replaceable\' provided to SearchableView!');
        }
        const searchConfig = this.currentSearchConfig();
        this.replaceProvider.replaceSelectionWith(searchConfig, this.replaceInputElement.value);
        this.currentQuery = undefined;
        this.performSearch(true, true);
    }
    replaceAll() {
        if (!this.replaceProvider) {
            throw new Error('No \'replaceable\' provided to SearchableView!');
        }
        const searchConfig = this.currentSearchConfig();
        this.replaceProvider.replaceAllWith(searchConfig, this.replaceInputElement.value);
    }
    onInput() {
        if (!Common.Settings.Settings.instance().moduleSetting('search-as-you-type').get()) {
            this.clearSearch();
            return;
        }
        clearTimeout(this.valueChangedTimeoutId);
        const timeout = this.searchInputElement.value.length < 3 ? 200 : 0;
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
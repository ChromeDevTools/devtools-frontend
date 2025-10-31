// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import './Toolbar.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ARIAUtils from './ARIAUtils.js';
import filterStyles from './filter.css.js';
import { KeyboardShortcut, Modifiers } from './KeyboardShortcut.js';
import { ToolbarFilter, ToolbarSettingToggle } from './Toolbar.js';
import { Tooltip } from './Tooltip.js';
import { bindCheckbox, CheckboxLabel, createTextChild } from './UIUtils.js';
import { HBox } from './Widget.js';
const UIStrings = {
    /**
     * @description Text to filter result items
     */
    filter: 'Filter',
    /**
     * @description Text that appears when hover over the filter bar in the Network tool
     */
    egSmalldUrlacomb: 'e.g. `/small[\d]+/ url:a.com/b`',
    /**
     * @description Text that appears when hover over the All button in the Network tool
     * @example {Ctrl + } PH1
     */
    sclickToSelectMultipleTypes: '{PH1}Click to select multiple types',
    /**
     * @description Text for everything
     */
    allStrings: 'All',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/FilterBar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class FilterBar extends Common.ObjectWrapper.eventMixin(HBox) {
    enabled;
    stateSetting;
    #filterButton;
    filters;
    alwaysShowFilters;
    showingWidget;
    constructor(name, visibleByDefault) {
        super();
        this.registerRequiredCSS(filterStyles);
        this.enabled = true;
        this.element.classList.add('filter-bar');
        this.element.setAttribute('jslog', `${VisualLogging.toolbar('filter-bar')}`);
        this.stateSetting =
            Common.Settings.Settings.instance().createSetting('filter-bar-' + name + '-toggled', Boolean(visibleByDefault));
        this.#filterButton =
            new ToolbarSettingToggle(this.stateSetting, 'filter', i18nString(UIStrings.filter), 'filter-filled', 'filter');
        this.#filterButton.element.style.setProperty('--dot-toggle-top', '13px');
        this.#filterButton.element.style.setProperty('--dot-toggle-left', '14px');
        this.filters = [];
        this.updateFilterBar();
        this.stateSetting.addChangeListener(this.updateFilterBar.bind(this));
    }
    filterButton() {
        return this.#filterButton;
    }
    addDivider() {
        const element = document.createElement('div');
        element.classList.add('filter-divider');
        this.element.appendChild(element);
    }
    addFilter(filter) {
        this.filters.push(filter);
        this.element.appendChild(filter.element());
        filter.addEventListener("FilterChanged" /* FilterUIEvents.FILTER_CHANGED */, this.filterChanged, this);
        this.updateFilterButton();
    }
    setEnabled(enabled) {
        this.enabled = enabled;
        this.#filterButton.setEnabled(enabled);
        this.updateFilterBar();
    }
    filterChanged() {
        this.updateFilterButton();
        this.dispatchEventToListeners("Changed" /* FilterBarEvents.CHANGED */);
    }
    wasShown() {
        super.wasShown();
        this.updateFilterBar();
    }
    updateFilterBar() {
        if (!this.parentWidget() || this.showingWidget) {
            return;
        }
        if (this.visible()) {
            this.showingWidget = true;
            this.showWidget();
            this.showingWidget = false;
        }
        else {
            this.hideWidget();
        }
    }
    focus() {
        for (let i = 0; i < this.filters.length; ++i) {
            if (this.filters[i] instanceof TextFilterUI) {
                const textFilterUI = this.filters[i];
                textFilterUI.focus();
                break;
            }
        }
    }
    hasActiveFilter() {
        for (const filter of this.filters) {
            if (filter.isActive()) {
                return true;
            }
        }
        return false;
    }
    updateFilterButton() {
        const isActive = this.hasActiveFilter();
        this.#filterButton.setChecked(isActive);
    }
    clear() {
        this.element.removeChildren();
        this.filters = [];
        this.updateFilterButton();
    }
    setting() {
        return this.stateSetting;
    }
    visible() {
        return this.alwaysShowFilters || (this.stateSetting.get() && this.enabled);
    }
}
export class TextFilterUI extends Common.ObjectWrapper.ObjectWrapper {
    filterElement;
    #filter;
    suggestionProvider;
    constructor() {
        super();
        this.filterElement = document.createElement('div');
        this.filterElement.classList.add('text-filter');
        const filterToolbar = this.filterElement.createChild('devtools-toolbar');
        // Set the style directly on the element to overwrite parent css styling.
        filterToolbar.style.borderBottom = 'none';
        this.#filter =
            new ToolbarFilter(undefined, 1, 1, i18nString(UIStrings.egSmalldUrlacomb), this.completions.bind(this));
        filterToolbar.appendToolbarItem(this.#filter);
        this.#filter.addEventListener("TextChanged" /* ToolbarInput.Event.TEXT_CHANGED */, () => this.valueChanged());
        this.suggestionProvider = null;
    }
    completions(expression, prefix, force) {
        if (this.suggestionProvider) {
            return this.suggestionProvider(expression, prefix, force);
        }
        return Promise.resolve([]);
    }
    isActive() {
        return Boolean(this.#filter.valueWithoutSuggestion());
    }
    element() {
        return this.filterElement;
    }
    value() {
        return this.#filter.valueWithoutSuggestion();
    }
    setValue(value) {
        this.#filter.setValue(value);
        this.valueChanged();
    }
    focus() {
        this.#filter.focus();
    }
    setSuggestionProvider(suggestionProvider) {
        this.#filter.clearAutocomplete();
        this.suggestionProvider = suggestionProvider;
    }
    valueChanged() {
        this.dispatchEventToListeners("FilterChanged" /* FilterUIEvents.FILTER_CHANGED */);
    }
    clear() {
        this.setValue('');
    }
}
export class NamedBitSetFilterUIElement extends HTMLElement {
    #options = { items: [] };
    #shadow = this.attachShadow({ mode: 'open' });
    #namedBitSetFilterUI;
    set options(options) {
        // return if they are the same
        if (this.#options.items.toString() === options.items.toString() && this.#options.setting === options.setting) {
            return;
        }
        this.#options = options;
        // When options are updated, clear the UI so that a new one is created with the new options
        this.#shadow.innerHTML = '';
        this.#namedBitSetFilterUI = undefined;
    }
    getOrCreateNamedBitSetFilterUI() {
        if (this.#namedBitSetFilterUI) {
            return this.#namedBitSetFilterUI;
        }
        const namedBitSetFilterUI = new NamedBitSetFilterUI(this.#options.items, this.#options.setting);
        namedBitSetFilterUI.element().classList.add('named-bitset-filter');
        const styleElement = this.#shadow.createChild('style');
        styleElement.textContent = filterStyles;
        const disclosureElement = this.#shadow.createChild('div', 'named-bit-set-filter-disclosure');
        disclosureElement.appendChild(namedBitSetFilterUI.element());
        // Translate existing filter ("ObjectWrapper") events to DOM CustomEvents so clients can
        // use lit templates to bind listeners.
        namedBitSetFilterUI.addEventListener("FilterChanged" /* FilterUIEvents.FILTER_CHANGED */, this.#filterChanged.bind(this));
        this.#namedBitSetFilterUI = namedBitSetFilterUI;
        return this.#namedBitSetFilterUI;
    }
    #filterChanged() {
        const domEvent = new CustomEvent('filterChanged');
        this.dispatchEvent(domEvent);
    }
}
customElements.define('devtools-named-bit-set-filter', NamedBitSetFilterUIElement);
export class NamedBitSetFilterUI extends Common.ObjectWrapper.ObjectWrapper {
    filtersElement;
    typeFilterElementTypeNames = new WeakMap();
    allowedTypes = new Set();
    typeFilterElements = [];
    setting;
    constructor(items, setting) {
        super();
        this.filtersElement = document.createElement('div');
        this.filtersElement.classList.add('filter-bitset-filter');
        this.filtersElement.setAttribute('jslog', `${VisualLogging.section('filter-bitset')}`);
        ARIAUtils.markAsListBox(this.filtersElement);
        ARIAUtils.markAsMultiSelectable(this.filtersElement);
        Tooltip.install(this.filtersElement, i18nString(UIStrings.sclickToSelectMultipleTypes, {
            PH1: KeyboardShortcut.shortcutToString('', Modifiers.CtrlOrMeta.value),
        }));
        this.addBit(NamedBitSetFilterUI.ALL_TYPES, i18nString(UIStrings.allStrings), NamedBitSetFilterUI.ALL_TYPES);
        this.typeFilterElements[0].tabIndex = 0;
        this.filtersElement.createChild('div', 'filter-bitset-filter-divider');
        for (let i = 0; i < items.length; ++i) {
            this.addBit(items[i].name, items[i].label(), items[i].jslogContext, items[i].title);
        }
        if (setting) {
            this.setting = setting;
            setting.addChangeListener(this.settingChanged.bind(this));
            this.settingChanged();
        }
        else {
            this.toggleTypeFilter(NamedBitSetFilterUI.ALL_TYPES, false /* allowMultiSelect */);
        }
    }
    reset() {
        this.toggleTypeFilter(NamedBitSetFilterUI.ALL_TYPES, false /* allowMultiSelect */);
    }
    isActive() {
        return !this.allowedTypes.has(NamedBitSetFilterUI.ALL_TYPES);
    }
    element() {
        return this.filtersElement;
    }
    accept(typeName) {
        return this.allowedTypes.has(NamedBitSetFilterUI.ALL_TYPES) || this.allowedTypes.has(typeName);
    }
    settingChanged() {
        const allowedTypesFromSetting = this.setting.get();
        this.allowedTypes = new Set();
        for (const element of this.typeFilterElements) {
            const typeName = this.typeFilterElementTypeNames.get(element);
            if (typeName && allowedTypesFromSetting[typeName]) {
                this.allowedTypes.add(typeName);
            }
        }
        this.update();
    }
    update() {
        if (this.allowedTypes.size === 0 || this.allowedTypes.has(NamedBitSetFilterUI.ALL_TYPES)) {
            this.allowedTypes = new Set();
            this.allowedTypes.add(NamedBitSetFilterUI.ALL_TYPES);
        }
        for (const element of this.typeFilterElements) {
            const typeName = this.typeFilterElementTypeNames.get(element);
            const active = this.allowedTypes.has(typeName || '');
            element.classList.toggle('selected', active);
            ARIAUtils.setSelected(element, active);
        }
        this.dispatchEventToListeners("FilterChanged" /* FilterUIEvents.FILTER_CHANGED */);
    }
    addBit(name, label, jslogContext, title) {
        const typeFilterElement = this.filtersElement.createChild('span', name);
        typeFilterElement.tabIndex = -1;
        this.typeFilterElementTypeNames.set(typeFilterElement, name);
        createTextChild(typeFilterElement, label);
        ARIAUtils.markAsOption(typeFilterElement);
        if (title) {
            typeFilterElement.title = title;
        }
        typeFilterElement.addEventListener('click', this.onTypeFilterClicked.bind(this), false);
        typeFilterElement.addEventListener('keydown', this.onTypeFilterKeydown.bind(this), false);
        typeFilterElement.setAttribute('jslog', `${VisualLogging.item(jslogContext).track({ click: true })}`);
        this.typeFilterElements.push(typeFilterElement);
    }
    onTypeFilterClicked(event) {
        const e = event;
        let toggle;
        if (Host.Platform.isMac()) {
            toggle = e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
        }
        else {
            toggle = e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
        }
        if (e.target) {
            const element = e.target;
            const typeName = this.typeFilterElementTypeNames.get(element);
            this.toggleTypeFilter(typeName, toggle);
        }
    }
    onTypeFilterKeydown(event) {
        const element = event.target;
        if (!element) {
            return;
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
            if (this.keyFocusNextBit(element, true /* selectPrevious */)) {
                event.consume(true);
            }
        }
        else if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) {
            if (this.keyFocusNextBit(element, false /* selectPrevious */)) {
                event.consume(true);
            }
        }
        else if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
            this.onTypeFilterClicked(event);
        }
    }
    keyFocusNextBit(target, selectPrevious) {
        let index = this.typeFilterElements.indexOf(target);
        if (index === -1) {
            index = this.typeFilterElements.findIndex(el => el.classList.contains('selected'));
            if (index === -1) {
                index = selectPrevious ? this.typeFilterElements.length : -1;
            }
        }
        const nextIndex = selectPrevious ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= this.typeFilterElements.length) {
            return false;
        }
        const nextElement = this.typeFilterElements[nextIndex];
        nextElement.tabIndex = 0;
        target.tabIndex = -1;
        nextElement.focus();
        return true;
    }
    toggleTypeFilter(typeName, allowMultiSelect) {
        if (allowMultiSelect && typeName !== NamedBitSetFilterUI.ALL_TYPES) {
            this.allowedTypes.delete(NamedBitSetFilterUI.ALL_TYPES);
        }
        else {
            this.allowedTypes = new Set();
        }
        if (this.allowedTypes.has(typeName)) {
            this.allowedTypes.delete(typeName);
        }
        else {
            this.allowedTypes.add(typeName);
        }
        if (this.allowedTypes.size === 0) {
            this.allowedTypes.add(NamedBitSetFilterUI.ALL_TYPES);
        }
        if (this.setting) {
            // Settings do not support `Sets` so convert it back to the Map-like object.
            const updatedSetting = {};
            for (const type of this.allowedTypes) {
                updatedSetting[type] = true;
            }
            this.setting.set(updatedSetting);
        }
        else {
            this.update();
        }
    }
    static ALL_TYPES = 'all';
}
export class CheckboxFilterUI extends Common.ObjectWrapper.ObjectWrapper {
    filterElement;
    activeWhenChecked;
    checkbox;
    constructor(title, activeWhenChecked, setting, jslogContext) {
        super();
        this.filterElement = document.createElement('div');
        this.filterElement.classList.add('filter-checkbox-filter');
        this.activeWhenChecked = Boolean(activeWhenChecked);
        this.checkbox = CheckboxLabel.create(title, undefined, undefined, jslogContext);
        this.filterElement.appendChild(this.checkbox);
        if (setting) {
            bindCheckbox(this.checkbox, setting);
        }
        else {
            this.checkbox.checked = true;
        }
        this.checkbox.addEventListener('change', this.fireUpdated.bind(this), false);
    }
    isActive() {
        return this.activeWhenChecked === this.checkbox.checked;
    }
    checked() {
        return this.checkbox.checked;
    }
    setChecked(checked) {
        this.checkbox.checked = checked;
    }
    element() {
        return this.filterElement;
    }
    labelElement() {
        return this.checkbox;
    }
    fireUpdated() {
        this.dispatchEventToListeners("FilterChanged" /* FilterUIEvents.FILTER_CHANGED */);
    }
}
//# sourceMappingURL=FilterBar.js.map
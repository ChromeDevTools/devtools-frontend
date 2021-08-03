/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';

import * as ARIAUtils from './ARIAUtils.js';
import {Icon} from './Icon.js';
import {KeyboardShortcut, Modifiers} from './KeyboardShortcut.js';
import {bindCheckbox} from './SettingsUI.js';
import type {Suggestions} from './SuggestBox.js';
import {Events, TextPrompt} from './TextPrompt.js';
import type {ToolbarButton} from './Toolbar.js';
import {ToolbarSettingToggle} from './Toolbar.js';
import {Tooltip} from './Tooltip.js';
import {CheckboxLabel, createTextChild} from './UIUtils.js';
import {HBox} from './Widget.js';

const UIStrings = {
  /**
  *@description Text to filter result items
  */
  filter: 'Filter',
  /**
  *@description Text that appears when hover over the filter bar in the Network tool
  */
  egSmalldUrlacomb: 'e.g. `/small[\d]+/ url:a.com/b`',
  /**
  *@description Text that appears when hover over the All button in the Network tool
  *@example {Ctrl + } PH1
  */
  sclickToSelectMultipleTypes: '{PH1}Click to select multiple types',
  /**
  *@description Text for everything
  */
  allStrings: 'All',
  /**
   * @description Hover text for button to clear the filter that is applied
   */
  clearFilter: 'Clear input',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/FilterBar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class FilterBar extends HBox {
  _enabled: boolean;
  _stateSetting: Common.Settings.Setting<boolean>;
  _filterButton: ToolbarSettingToggle;
  _filters: FilterUI[];
  _alwaysShowFilters?: boolean;
  _showingWidget?: boolean;

  constructor(name: string, visibleByDefault?: boolean) {
    super();
    this.registerRequiredCSS('ui/legacy/filter.css');
    this._enabled = true;
    this.element.classList.add('filter-bar');

    this._stateSetting =
        Common.Settings.Settings.instance().createSetting('filterBar-' + name + '-toggled', Boolean(visibleByDefault));
    this._filterButton = new ToolbarSettingToggle(this._stateSetting, 'largeicon-filter', i18nString(UIStrings.filter));

    this._filters = [];

    this._updateFilterBar();
    this._stateSetting.addChangeListener(this._updateFilterBar.bind(this));
  }

  filterButton(): ToolbarButton {
    return this._filterButton;
  }

  addFilter(filter: FilterUI): void {
    this._filters.push(filter);
    this.element.appendChild(filter.element());
    filter.addEventListener(FilterUIEvents.FilterChanged, this._filterChanged, this);
    this._updateFilterButton();
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    this._filterButton.setEnabled(enabled);
    this._updateFilterBar();
  }

  forceShowFilterBar(): void {
    this._alwaysShowFilters = true;
    this._updateFilterBar();
  }

  showOnce(): void {
    this._stateSetting.set(true);
  }

  _filterChanged(_event: Common.EventTarget.EventTargetEvent): void {
    this._updateFilterButton();
    this.dispatchEventToListeners(FilterBarEvents.Changed);
  }

  wasShown(): void {
    super.wasShown();
    this._updateFilterBar();
  }

  _updateFilterBar(): void {
    if (!this.parentWidget() || this._showingWidget) {
      return;
    }
    if (this.visible()) {
      this._showingWidget = true;
      this.showWidget();
      this._showingWidget = false;
    } else {
      this.hideWidget();
    }
  }

  focus(): void {
    for (let i = 0; i < this._filters.length; ++i) {
      if (this._filters[i] instanceof TextFilterUI) {
        const textFilterUI = (this._filters[i] as TextFilterUI);
        textFilterUI.focus();
        break;
      }
    }
  }

  _updateFilterButton(): void {
    let isActive = false;
    for (const filter of this._filters) {
      isActive = isActive || filter.isActive();
    }
    this._filterButton.setDefaultWithRedColor(isActive);
    this._filterButton.setToggleWithRedColor(isActive);
  }

  clear(): void {
    this.element.removeChildren();
    this._filters = [];
    this._updateFilterButton();
  }

  setting(): Common.Settings.Setting<boolean> {
    return this._stateSetting;
  }

  visible(): boolean {
    return this._alwaysShowFilters || (this._stateSetting.get() && this._enabled);
  }
}

export const enum FilterBarEvents {
  Changed = 'Changed',
}

export interface FilterUI extends Common.EventTarget.EventTarget {
  isActive(): boolean;
  element(): Element;
}

export const enum FilterUIEvents {
  FilterChanged = 'FilterChanged',
}

export class TextFilterUI extends Common.ObjectWrapper.ObjectWrapper implements FilterUI {
  _filterElement: HTMLDivElement;
  _filterInputElement: HTMLElement;
  _prompt: TextPrompt;
  _proxyElement: HTMLElement;
  _suggestionProvider: ((arg0: string, arg1: string, arg2?: boolean|undefined) => Promise<Suggestions>)|null;
  constructor() {
    super();
    this._filterElement = document.createElement('div');
    this._filterElement.className = 'filter-text-filter';

    const container = this._filterElement.createChild('div', 'filter-input-container');
    this._filterInputElement = container.createChild('span', 'filter-input-field');

    this._prompt = new TextPrompt();
    this._prompt.initialize(this._completions.bind(this), ' ', true);
    this._proxyElement = (this._prompt.attach(this._filterInputElement) as HTMLElement);
    Tooltip.install(this._proxyElement, i18nString(UIStrings.egSmalldUrlacomb));
    this._prompt.setPlaceholder(i18nString(UIStrings.filter));
    this._prompt.addEventListener(Events.TextChanged, this._valueChanged.bind(this));

    this._suggestionProvider = null;

    const clearButton = container.createChild('div', 'filter-input-clear-button');
    Tooltip.install(clearButton, i18nString(UIStrings.clearFilter));
    clearButton.appendChild(Icon.create('mediumicon-gray-cross-active', 'filter-cancel-button'));
    clearButton.addEventListener('click', () => {
      this.clear();
      this.focus();
    });
    this._updateEmptyStyles();
  }

  _completions(expression: string, prefix: string, force?: boolean): Promise<Suggestions> {
    if (this._suggestionProvider) {
      return this._suggestionProvider(expression, prefix, force);
    }
    return Promise.resolve([]);
  }
  isActive(): boolean {
    return Boolean(this._prompt.text());
  }

  element(): Element {
    return this._filterElement;
  }

  value(): string {
    return this._prompt.textWithCurrentSuggestion();
  }

  setValue(value: string): void {
    this._prompt.setText(value);
    this._valueChanged();
  }

  focus(): void {
    this._filterInputElement.focus();
  }

  setSuggestionProvider(
      suggestionProvider: (arg0: string, arg1: string, arg2?: boolean|undefined) => Promise<Suggestions>): void {
    this._prompt.clearAutocomplete();
    this._suggestionProvider = suggestionProvider;
  }

  _valueChanged(): void {
    this.dispatchEventToListeners(FilterUIEvents.FilterChanged, null);
    this._updateEmptyStyles();
  }

  _updateEmptyStyles(): void {
    this._filterElement.classList.toggle('filter-text-empty', !this._prompt.text());
  }

  clear(): void {
    this.setValue('');
  }
}

export class NamedBitSetFilterUI extends Common.ObjectWrapper.ObjectWrapper implements FilterUI {
  _filtersElement: HTMLDivElement;
  _typeFilterElementTypeNames: WeakMap<HTMLElement, string>;
  _allowedTypes: Set<string>;
  _typeFilterElements: HTMLElement[];
  _setting: Common.Settings.Setting<{[key: string]: boolean}>|undefined;

  constructor(items: Item[], setting?: Common.Settings.Setting<{[key: string]: boolean}>) {
    super();
    this._filtersElement = document.createElement('div');
    this._filtersElement.classList.add('filter-bitset-filter');
    ARIAUtils.markAsListBox(this._filtersElement);
    ARIAUtils.markAsMultiSelectable(this._filtersElement);
    Tooltip.install(this._filtersElement, i18nString(UIStrings.sclickToSelectMultipleTypes, {
                      PH1: KeyboardShortcut.shortcutToString('', Modifiers.CtrlOrMeta),
                    }));

    this._typeFilterElementTypeNames = new WeakMap();
    this._allowedTypes = new Set();
    this._typeFilterElements = [];
    this._addBit(NamedBitSetFilterUI.ALL_TYPES, i18nString(UIStrings.allStrings));
    this._typeFilterElements[0].tabIndex = 0;
    this._filtersElement.createChild('div', 'filter-bitset-filter-divider');

    for (let i = 0; i < items.length; ++i) {
      this._addBit(items[i].name, items[i].label(), items[i].title);
    }

    if (setting) {
      this._setting = setting;
      setting.addChangeListener(this._settingChanged.bind(this));
      this._settingChanged();
    } else {
      this._toggleTypeFilter(NamedBitSetFilterUI.ALL_TYPES, false /* allowMultiSelect */);
    }
  }

  reset(): void {
    this._toggleTypeFilter(NamedBitSetFilterUI.ALL_TYPES, false /* allowMultiSelect */);
  }

  isActive(): boolean {
    return !this._allowedTypes.has(NamedBitSetFilterUI.ALL_TYPES);
  }

  element(): Element {
    return this._filtersElement;
  }

  accept(typeName: string): boolean {
    return this._allowedTypes.has(NamedBitSetFilterUI.ALL_TYPES) || this._allowedTypes.has(typeName);
  }

  _settingChanged(): void {
    const allowedTypesFromSetting = (this._setting as Common.Settings.Setting<{[key: string]: boolean}>).get();
    this._allowedTypes = new Set();
    for (const element of this._typeFilterElements) {
      const typeName = this._typeFilterElementTypeNames.get(element);
      if (typeName && allowedTypesFromSetting[typeName]) {
        this._allowedTypes.add(typeName);
      }
    }
    this._update();
  }

  _update(): void {
    if (this._allowedTypes.size === 0 || this._allowedTypes.has(NamedBitSetFilterUI.ALL_TYPES)) {
      this._allowedTypes = new Set();
      this._allowedTypes.add(NamedBitSetFilterUI.ALL_TYPES);
    }
    for (const element of this._typeFilterElements) {
      const typeName = this._typeFilterElementTypeNames.get(element);
      const active = this._allowedTypes.has(typeName || '');
      element.classList.toggle('selected', active);
      ARIAUtils.setSelected(element, active);
    }
    this.dispatchEventToListeners(FilterUIEvents.FilterChanged, null);
  }

  _addBit(name: string, label: string, title?: string): void {
    const typeFilterElement = (this._filtersElement.createChild('span', name) as HTMLElement);
    typeFilterElement.tabIndex = -1;
    this._typeFilterElementTypeNames.set(typeFilterElement, name);
    createTextChild(typeFilterElement, label);
    ARIAUtils.markAsOption(typeFilterElement);
    if (title) {
      typeFilterElement.title = title;
    }
    typeFilterElement.addEventListener('click', this._onTypeFilterClicked.bind(this), false);
    typeFilterElement.addEventListener('keydown', this._onTypeFilterKeydown.bind(this), false);
    this._typeFilterElements.push(typeFilterElement);
  }

  _onTypeFilterClicked(event: Event): void {
    const e = (event as KeyboardEvent);
    let toggle;
    if (Host.Platform.isMac()) {
      toggle = e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
    } else {
      toggle = e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
    }
    if (e.target) {
      const element = (e.target as HTMLElement);
      const typeName = (this._typeFilterElementTypeNames.get(element) as string);
      this._toggleTypeFilter(typeName, toggle);
    }
  }

  _onTypeFilterKeydown(ev: Event): void {
    const event = (ev as KeyboardEvent);
    const element = (event.target as HTMLElement | null);
    if (!element) {
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      if (this._keyFocusNextBit(element, true /* selectPrevious */)) {
        event.consume(true);
      }
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      if (this._keyFocusNextBit(element, false /* selectPrevious */)) {
        event.consume(true);
      }
    } else if (isEnterOrSpaceKey(event)) {
      this._onTypeFilterClicked(event);
    }
  }

  _keyFocusNextBit(target: HTMLElement, selectPrevious: boolean): boolean {
    const index = this._typeFilterElements.indexOf(target);
    if (index === -1) {
      return false;
    }
    const nextIndex = selectPrevious ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= this._typeFilterElements.length) {
      return false;
    }

    const nextElement = this._typeFilterElements[nextIndex];
    nextElement.tabIndex = 0;
    target.tabIndex = -1;
    nextElement.focus();
    return true;
  }

  _toggleTypeFilter(typeName: string, allowMultiSelect: boolean): void {
    if (allowMultiSelect && typeName !== NamedBitSetFilterUI.ALL_TYPES) {
      this._allowedTypes.delete(NamedBitSetFilterUI.ALL_TYPES);
    } else {
      this._allowedTypes = new Set();
    }

    if (this._allowedTypes.has(typeName)) {
      this._allowedTypes.delete(typeName);
    } else {
      this._allowedTypes.add(typeName);
    }

    if (this._setting) {
      // Settings do not support `Sets` so convert it back to the Map-like object.
      const updatedSetting = ({} as {[key: string]: boolean});
      for (const type of this._allowedTypes) {
        updatedSetting[type] = true;
      }
      this._setting.set(updatedSetting);
    } else {
      this._update();
    }
  }

  static readonly ALL_TYPES = 'all';
}

export class CheckboxFilterUI extends Common.ObjectWrapper.ObjectWrapper implements FilterUI {
  _filterElement: HTMLDivElement;
  _activeWhenChecked: boolean;
  _label: CheckboxLabel;
  _checkboxElement: HTMLInputElement;
  constructor(
      className: string, title: string, activeWhenChecked?: boolean, setting?: Common.Settings.Setting<boolean>) {
    super();
    this._filterElement = document.createElement('div');
    this._filterElement.classList.add('filter-checkbox-filter');
    this._activeWhenChecked = Boolean(activeWhenChecked);
    this._label = CheckboxLabel.create(title);
    this._filterElement.appendChild(this._label);
    this._checkboxElement = this._label.checkboxElement;
    if (setting) {
      bindCheckbox(this._checkboxElement, setting);
    } else {
      this._checkboxElement.checked = true;
    }
    this._checkboxElement.addEventListener('change', this._fireUpdated.bind(this), false);
  }

  isActive(): boolean {
    return this._activeWhenChecked === this._checkboxElement.checked;
  }

  checked(): boolean {
    return this._checkboxElement.checked;
  }

  setChecked(checked: boolean): void {
    this._checkboxElement.checked = checked;
  }

  element(): HTMLDivElement {
    return this._filterElement;
  }

  labelElement(): Element {
    return this._label;
  }

  _fireUpdated(): void {
    this.dispatchEventToListeners(FilterUIEvents.FilterChanged, null);
  }

  setColor(backgroundColor: string, borderColor: string): void {
    this._label.backgroundColor = backgroundColor;
    this._label.borderColor = borderColor;
  }
}
export interface Item {
  name: string;
  label: () => string;
  title?: string;
}

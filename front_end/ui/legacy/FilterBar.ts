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

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as IconButton from '../components/icon_button/icon_button.js';

import * as ARIAUtils from './ARIAUtils.js';
import {KeyboardShortcut, Modifiers} from './KeyboardShortcut.js';
import {bindCheckbox} from './SettingsUI.js';

import {type Suggestions} from './SuggestBox.js';
import {Events, TextPrompt} from './TextPrompt.js';

import filterStyles from './filter.css.legacy.js';
import {ToolbarSettingToggle, type ToolbarButton} from './Toolbar.js';
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
export class FilterBar extends Common.ObjectWrapper.eventMixin<FilterBarEventTypes, typeof HBox>(HBox) {
  private enabled: boolean;
  private readonly stateSetting: Common.Settings.Setting<boolean>;
  private readonly filterButtonInternal: ToolbarSettingToggle;
  private filters: FilterUI[];
  private alwaysShowFilters?: boolean;
  private showingWidget?: boolean;

  constructor(name: string, visibleByDefault?: boolean) {
    super();
    this.registerRequiredCSS(filterStyles);
    this.enabled = true;
    this.element.classList.add('filter-bar');

    this.stateSetting =
        Common.Settings.Settings.instance().createSetting('filterBar-' + name + '-toggled', Boolean(visibleByDefault));
    this.filterButtonInternal =
        new ToolbarSettingToggle(this.stateSetting, 'filter', i18nString(UIStrings.filter), 'filter-filled');

    this.filters = [];

    this.updateFilterBar();
    this.stateSetting.addChangeListener(this.updateFilterBar.bind(this));
  }

  filterButton(): ToolbarButton {
    return this.filterButtonInternal;
  }

  addDivider(): void {
    const element = document.createElement('div');
    element.classList.add('filter-divider');
    this.element.appendChild(element);
  }

  addFilter(filter: FilterUI): void {
    this.filters.push(filter);
    this.element.appendChild(filter.element());
    filter.addEventListener(FilterUIEvents.FilterChanged, this.filterChanged, this);
    this.updateFilterButton();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.filterButtonInternal.setEnabled(enabled);
    this.updateFilterBar();
  }

  forceShowFilterBar(): void {
    this.alwaysShowFilters = true;
    this.updateFilterBar();
  }

  showOnce(): void {
    this.stateSetting.set(true);
  }

  private filterChanged(): void {
    this.updateFilterButton();
    this.dispatchEventToListeners(FilterBarEvents.Changed);
  }

  override wasShown(): void {
    super.wasShown();
    this.updateFilterBar();
  }

  private updateFilterBar(): void {
    if (!this.parentWidget() || this.showingWidget) {
      return;
    }
    if (this.visible()) {
      this.showingWidget = true;
      this.showWidget();
      this.showingWidget = false;
    } else {
      this.hideWidget();
    }
  }

  override focus(): void {
    for (let i = 0; i < this.filters.length; ++i) {
      if (this.filters[i] instanceof TextFilterUI) {
        const textFilterUI = (this.filters[i] as TextFilterUI);
        textFilterUI.focus();
        break;
      }
    }
  }

  private updateFilterButton(): void {
    let isActive = false;
    for (const filter of this.filters) {
      isActive = isActive || filter.isActive();
    }
    this.filterButtonInternal.setDefaultWithRedColor(isActive);
    this.filterButtonInternal.setToggleWithRedColor(isActive);
  }

  clear(): void {
    this.element.removeChildren();
    this.filters = [];
    this.updateFilterButton();
  }

  setting(): Common.Settings.Setting<boolean> {
    return this.stateSetting;
  }

  visible(): boolean {
    return this.alwaysShowFilters || (this.stateSetting.get() && this.enabled);
  }
}

export const enum FilterBarEvents {
  Changed = 'Changed',
}

export type FilterBarEventTypes = {
  [FilterBarEvents.Changed]: void,
};

export interface FilterUI extends Common.EventTarget.EventTarget<FilterUIEventTypes> {
  isActive(): boolean;
  element(): Element;
}

export const enum FilterUIEvents {
  FilterChanged = 'FilterChanged',
}

export type FilterUIEventTypes = {
  [FilterUIEvents.FilterChanged]: void,
};

export class TextFilterUI extends Common.ObjectWrapper.ObjectWrapper<FilterUIEventTypes> implements FilterUI {
  private readonly filterElement: HTMLDivElement;
  private readonly filterInputElement: HTMLElement;
  private prompt: TextPrompt;
  private readonly proxyElement: HTMLElement;
  private suggestionProvider: ((arg0: string, arg1: string, arg2?: boolean|undefined) => Promise<Suggestions>)|null;
  constructor() {
    super();
    this.filterElement = document.createElement('div');
    this.filterElement.className = 'filter-text-filter';

    const container = this.filterElement.createChild('div', 'filter-input-container');
    this.filterInputElement = container.createChild('span', 'filter-input-field');

    this.prompt = new TextPrompt();
    this.prompt.initialize(this.completions.bind(this), ' ', true);
    this.proxyElement = (this.prompt.attach(this.filterInputElement) as HTMLElement);
    Tooltip.install(this.proxyElement, i18nString(UIStrings.egSmalldUrlacomb));
    this.prompt.setPlaceholder(i18nString(UIStrings.filter));
    this.prompt.addEventListener(Events.TextChanged, this.valueChanged.bind(this));

    this.suggestionProvider = null;

    const clearButton = container.createChild('div', 'filter-input-clear-button');
    Tooltip.install(clearButton, i18nString(UIStrings.clearFilter));
    const clearIcon = new IconButton.Icon.Icon();
    clearIcon.data = {color: 'var(--icon-default)', width: '16px', height: '16px', iconName: 'cross-circle-filled'};
    clearIcon.classList.add('filter-cancel-button');
    clearButton.appendChild(clearIcon);
    clearButton.addEventListener('click', () => {
      this.clear();
      this.focus();
    });
    this.updateEmptyStyles();
  }

  private completions(expression: string, prefix: string, force?: boolean): Promise<Suggestions> {
    if (this.suggestionProvider) {
      return this.suggestionProvider(expression, prefix, force);
    }
    return Promise.resolve([]);
  }
  isActive(): boolean {
    return Boolean(this.prompt.text());
  }

  element(): Element {
    return this.filterElement;
  }

  value(): string {
    return this.prompt.text();
  }

  setValue(value: string): void {
    this.prompt.setText(value);
    this.valueChanged();
  }

  focus(): void {
    this.filterInputElement.focus();
  }

  setSuggestionProvider(
      suggestionProvider: (arg0: string, arg1: string, arg2?: boolean|undefined) => Promise<Suggestions>): void {
    this.prompt.clearAutocomplete();
    this.suggestionProvider = suggestionProvider;
  }

  private valueChanged(): void {
    this.dispatchEventToListeners(FilterUIEvents.FilterChanged);
    this.updateEmptyStyles();
  }

  private updateEmptyStyles(): void {
    this.filterElement.classList.toggle('filter-text-empty', !this.prompt.text());
  }

  clear(): void {
    this.setValue('');
  }
}

export class NamedBitSetFilterUI extends Common.ObjectWrapper.ObjectWrapper<FilterUIEventTypes> implements FilterUI {
  private readonly filtersElement: HTMLDivElement;
  private readonly typeFilterElementTypeNames: WeakMap<HTMLElement, string>;
  private allowedTypes: Set<string>;
  private readonly typeFilterElements: HTMLElement[];
  private readonly setting: Common.Settings.Setting<{[key: string]: boolean}>|undefined;

  constructor(items: Item[], setting?: Common.Settings.Setting<{[key: string]: boolean}>) {
    super();
    this.filtersElement = document.createElement('div');
    this.filtersElement.classList.add('filter-bitset-filter');
    ARIAUtils.markAsListBox(this.filtersElement);
    ARIAUtils.markAsMultiSelectable(this.filtersElement);
    Tooltip.install(this.filtersElement, i18nString(UIStrings.sclickToSelectMultipleTypes, {
                      PH1: KeyboardShortcut.shortcutToString('', Modifiers.CtrlOrMeta),
                    }));

    this.typeFilterElementTypeNames = new WeakMap();
    this.allowedTypes = new Set();
    this.typeFilterElements = [];
    this.addBit(NamedBitSetFilterUI.ALL_TYPES, i18nString(UIStrings.allStrings));
    this.typeFilterElements[0].tabIndex = 0;
    this.filtersElement.createChild('div', 'filter-bitset-filter-divider');

    for (let i = 0; i < items.length; ++i) {
      this.addBit(items[i].name, items[i].label(), items[i].title);
    }

    if (setting) {
      this.setting = setting;
      setting.addChangeListener(this.settingChanged.bind(this));
      this.settingChanged();
    } else {
      this.toggleTypeFilter(NamedBitSetFilterUI.ALL_TYPES, false /* allowMultiSelect */);
    }
  }

  reset(): void {
    this.toggleTypeFilter(NamedBitSetFilterUI.ALL_TYPES, false /* allowMultiSelect */);
  }

  isActive(): boolean {
    return !this.allowedTypes.has(NamedBitSetFilterUI.ALL_TYPES);
  }

  element(): Element {
    return this.filtersElement;
  }

  accept(typeName: string): boolean {
    return this.allowedTypes.has(NamedBitSetFilterUI.ALL_TYPES) || this.allowedTypes.has(typeName);
  }

  private settingChanged(): void {
    const allowedTypesFromSetting = (this.setting as Common.Settings.Setting<{[key: string]: boolean}>).get();
    this.allowedTypes = new Set();
    for (const element of this.typeFilterElements) {
      const typeName = this.typeFilterElementTypeNames.get(element);
      if (typeName && allowedTypesFromSetting[typeName]) {
        this.allowedTypes.add(typeName);
      }
    }
    this.update();
  }

  private update(): void {
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
    this.dispatchEventToListeners(FilterUIEvents.FilterChanged);
  }

  private addBit(name: string, label: string, title?: string): void {
    const typeFilterElement = (this.filtersElement.createChild('span', name) as HTMLElement);
    typeFilterElement.tabIndex = -1;
    this.typeFilterElementTypeNames.set(typeFilterElement, name);
    createTextChild(typeFilterElement, label);
    ARIAUtils.markAsOption(typeFilterElement);
    if (title) {
      typeFilterElement.title = title;
    }
    typeFilterElement.addEventListener('click', this.onTypeFilterClicked.bind(this), false);
    typeFilterElement.addEventListener('keydown', this.onTypeFilterKeydown.bind(this), false);
    this.typeFilterElements.push(typeFilterElement);
  }

  private onTypeFilterClicked(event: Event): void {
    const e = (event as KeyboardEvent);
    let toggle;
    if (Host.Platform.isMac()) {
      toggle = e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
    } else {
      toggle = e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
    }
    if (e.target) {
      const element = (e.target as HTMLElement);
      const typeName = (this.typeFilterElementTypeNames.get(element) as string);
      this.toggleTypeFilter(typeName, toggle);
    }
  }

  private onTypeFilterKeydown(ev: Event): void {
    const event = (ev as KeyboardEvent);
    const element = (event.target as HTMLElement | null);
    if (!element) {
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      if (this.keyFocusNextBit(element, true /* selectPrevious */)) {
        event.consume(true);
      }
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      if (this.keyFocusNextBit(element, false /* selectPrevious */)) {
        event.consume(true);
      }
    } else if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
      this.onTypeFilterClicked(event);
    }
  }

  private keyFocusNextBit(target: HTMLElement, selectPrevious: boolean): boolean {
    const index = this.typeFilterElements.indexOf(target);
    if (index === -1) {
      return false;
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

  private toggleTypeFilter(typeName: string, allowMultiSelect: boolean): void {
    if (allowMultiSelect && typeName !== NamedBitSetFilterUI.ALL_TYPES) {
      this.allowedTypes.delete(NamedBitSetFilterUI.ALL_TYPES);
    } else {
      this.allowedTypes = new Set();
    }

    if (this.allowedTypes.has(typeName)) {
      this.allowedTypes.delete(typeName);
    } else {
      this.allowedTypes.add(typeName);
      Host.userMetrics.legacyResourceTypeFilterItemSelected(typeName);
    }

    if (this.allowedTypes.size === 0) {
      this.allowedTypes.add(NamedBitSetFilterUI.ALL_TYPES);
    }
    Host.userMetrics.legacyResourceTypeFilterNumberOfSelectedChanged(this.allowedTypes.size);

    if (this.setting) {
      // Settings do not support `Sets` so convert it back to the Map-like object.
      const updatedSetting = ({} as {[key: string]: boolean});
      for (const type of this.allowedTypes) {
        updatedSetting[type] = true;
      }
      this.setting.set(updatedSetting);
    } else {
      this.update();
    }
  }

  static readonly ALL_TYPES = 'all';
}

export class CheckboxFilterUI extends Common.ObjectWrapper.ObjectWrapper<FilterUIEventTypes> implements FilterUI {
  private readonly filterElement: HTMLDivElement;
  private readonly activeWhenChecked: boolean;
  private label: CheckboxLabel;
  private checkboxElement: HTMLInputElement;
  constructor(
      className: string, title: string, activeWhenChecked?: boolean, setting?: Common.Settings.Setting<boolean>) {
    super();
    this.filterElement = document.createElement('div');
    this.filterElement.classList.add('filter-checkbox-filter');
    this.activeWhenChecked = Boolean(activeWhenChecked);
    this.label = CheckboxLabel.create(title);
    this.filterElement.appendChild(this.label);
    this.checkboxElement = this.label.checkboxElement;
    if (setting) {
      bindCheckbox(this.checkboxElement, setting);
    } else {
      this.checkboxElement.checked = true;
    }
    this.checkboxElement.addEventListener('change', this.fireUpdated.bind(this), false);
  }

  isActive(): boolean {
    return this.activeWhenChecked === this.checkboxElement.checked;
  }

  checked(): boolean {
    return this.checkboxElement.checked;
  }

  setChecked(checked: boolean): void {
    this.checkboxElement.checked = checked;
  }

  element(): HTMLDivElement {
    return this.filterElement;
  }

  labelElement(): Element {
    return this.label;
  }

  private fireUpdated(): void {
    this.dispatchEventToListeners(FilterUIEvents.FilterChanged);
  }
}

export interface Item {
  name: string;
  label: () => string;
  title?: string;
}

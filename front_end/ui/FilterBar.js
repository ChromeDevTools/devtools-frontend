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

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as ARIAUtils from './ARIAUtils.js';

import {Icon} from './Icon.js';
import {KeyboardShortcut, Modifiers} from './KeyboardShortcut.js';
import {bindCheckbox} from './SettingsUI.js';
import {Suggestions} from './SuggestBox.js';  // eslint-disable-line no-unused-vars
import {Events, TextPrompt} from './TextPrompt.js';
import {ToolbarButton, ToolbarSettingToggle} from './Toolbar.js';  // eslint-disable-line no-unused-vars
import {CheckboxLabel} from './UIUtils.js';
import {HBox} from './Widget.js';

/**
 * @unrestricted
 */
export class FilterBar extends HBox {
  /**
   * @param {string} name
   * @param {boolean=} visibleByDefault
   */
  constructor(name, visibleByDefault) {
    super();
    this.registerRequiredCSS('ui/filter.css');
    this._enabled = true;
    this.element.classList.add('filter-bar');

    // Note: go via self.Common for globally-namespaced singletons.
    this._stateSetting =
        Common.Settings.Settings.instance().createSetting('filterBar-' + name + '-toggled', !!visibleByDefault);
    this._filterButton =
        new ToolbarSettingToggle(this._stateSetting, 'largeicon-filter', Common.UIString.UIString('Filter'));

    this._filters = [];

    this._updateFilterBar();
    this._stateSetting.addChangeListener(this._updateFilterBar.bind(this));
  }

  /**
   * @return {!ToolbarButton}
   */
  filterButton() {
    return this._filterButton;
  }

  /**
   * @param {!FilterUI} filter
   */
  addFilter(filter) {
    this._filters.push(filter);
    this.element.appendChild(filter.element());
    filter.addEventListener(FilterUI.Events.FilterChanged, this._filterChanged, this);
    this._updateFilterButton();
  }

  setEnabled(enabled) {
    this._enabled = enabled;
    this._filterButton.setEnabled(enabled);
    this._updateFilterBar();
  }

  forceShowFilterBar() {
    this._alwaysShowFilters = true;
    this._updateFilterBar();
  }

  showOnce() {
    this._stateSetting.set(true);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _filterChanged(event) {
    this._updateFilterButton();
    this.dispatchEventToListeners(FilterBar.Events.Changed);
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    this._updateFilterBar();
  }

  _updateFilterBar() {
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

  /**
   * @override
   */
  focus() {
    for (let i = 0; i < this._filters.length; ++i) {
      if (this._filters[i] instanceof TextFilterUI) {
        const textFilterUI = /** @type {!TextFilterUI} */ (this._filters[i]);
        textFilterUI.focus();
        break;
      }
    }
  }

  _updateFilterButton() {
    let isActive = false;
    for (const filter of this._filters) {
      isActive = isActive || filter.isActive();
    }
    this._filterButton.setDefaultWithRedColor(isActive);
    this._filterButton.setToggleWithRedColor(isActive);
  }

  clear() {
    this.element.removeChildren();
    this._filters = [];
    this._updateFilterButton();
  }

  setting() {
    return this._stateSetting;
  }

  visible() {
    return this._alwaysShowFilters || (this._stateSetting.get() && this._enabled);
  }
}

FilterBar.Events = {
  Changed: Symbol('Changed'),
};

/**
 * @interface
 */
export class FilterUI extends Common.EventTarget.EventTarget {
  /**
   * @return {boolean}
   */
  isActive() {
  }

  /**
   * @return {!Element}
   */
  element() {}
}

/** @enum {symbol} */
FilterUI.Events = {
  FilterChanged: Symbol('FilterChanged')
};

/**
 * @implements {FilterUI}
 * @unrestricted
 */
export class TextFilterUI extends Common.ObjectWrapper.ObjectWrapper {
  constructor() {
    super();
    this._filterElement = createElement('div');
    this._filterElement.className = 'filter-text-filter';

    const container = this._filterElement.createChild('div', 'filter-input-container');
    this._filterInputElement = container.createChild('span', 'filter-input-field');

    this._prompt = new TextPrompt();
    this._prompt.initialize(this._completions.bind(this), ' ');
    this._proxyElement = this._prompt.attach(this._filterInputElement);
    this._proxyElement.title = Common.UIString.UIString('e.g. /small[\\d]+/ url:a.com/b');
    this._prompt.setPlaceholder(Common.UIString.UIString('Filter'));
    this._prompt.addEventListener(Events.TextChanged, this._valueChanged.bind(this));

    /** @type {?function(string, string, boolean=):!Promise<!Suggestions>} */
    this._suggestionProvider = null;

    const clearButton = container.createChild('div', 'filter-input-clear-button');
    clearButton.appendChild(Icon.create('mediumicon-gray-cross-hover', 'filter-cancel-button'));
    clearButton.addEventListener('click', () => {
      this.clear();
      this.focus();
    });
    this._updateEmptyStyles();
  }

  /**
   * @param {string} expression
   * @param {string} prefix
   * @param {boolean=} force
   * @return {!Promise<!Suggestions>}
   */
  _completions(expression, prefix, force) {
    if (this._suggestionProvider) {
      return this._suggestionProvider(expression, prefix, force);
    }
    return Promise.resolve([]);
  }
  /**
   * @override
   * @return {boolean}
   */
  isActive() {
    return !!this._prompt.text();
  }

  /**
   * @override
   * @return {!Element}
   */
  element() {
    return this._filterElement;
  }

  /**
   * @return {string}
   */
  value() {
    return this._prompt.textWithCurrentSuggestion();
  }

  /**
   * @param {string} value
   */
  setValue(value) {
    this._prompt.setText(value);
    this._valueChanged();
  }

  focus() {
    this._filterInputElement.focus();
  }

  /**
   * @param {(function(string, string, boolean=):!Promise<!Suggestions>)} suggestionProvider
   */
  setSuggestionProvider(suggestionProvider) {
    this._prompt.clearAutocomplete();
    this._suggestionProvider = suggestionProvider;
  }

  _valueChanged() {
    this.dispatchEventToListeners(FilterUI.Events.FilterChanged, null);
    this._updateEmptyStyles();
  }

  _updateEmptyStyles() {
    this._filterElement.classList.toggle('filter-text-empty', !this._prompt.text());
  }

  clear() {
    this.setValue('');
  }
}

/**
 * @implements {FilterUI}
 * @unrestricted
 */
export class NamedBitSetFilterUI extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {!Array.<!Item>} items
   * @param {!Common.Settings.Setting=} setting
   */
  constructor(items, setting) {
    super();
    this._filtersElement = createElementWithClass('div', 'filter-bitset-filter');
    ARIAUtils.markAsListBox(this._filtersElement);
    ARIAUtils.markAsMultiSelectable(this._filtersElement);
    this._filtersElement.title = Common.UIString.UIString(
        '%sClick to select multiple types', KeyboardShortcut.shortcutToString('', Modifiers.CtrlOrMeta));

    this._allowedTypes = {};
    /** @type {!Array.<!Element>} */
    this._typeFilterElements = [];
    this._addBit(NamedBitSetFilterUI.ALL_TYPES, Common.UIString.UIString('All'));
    this._typeFilterElements[0].tabIndex = 0;
    this._filtersElement.createChild('div', 'filter-bitset-filter-divider');

    for (let i = 0; i < items.length; ++i) {
      this._addBit(items[i].name, items[i].label, items[i].title);
    }

    if (setting) {
      this._setting = setting;
      setting.addChangeListener(this._settingChanged.bind(this));
      this._settingChanged();
    } else {
      this._toggleTypeFilter(NamedBitSetFilterUI.ALL_TYPES, false /* allowMultiSelect */);
    }
  }

  reset() {
    this._toggleTypeFilter(NamedBitSetFilterUI.ALL_TYPES, false /* allowMultiSelect */);
  }

  /**
   * @override
   * @return {boolean}
   */
  isActive() {
    return !this._allowedTypes[NamedBitSetFilterUI.ALL_TYPES];
  }

  /**
   * @override
   * @return {!Element}
   */
  element() {
    return this._filtersElement;
  }

  /**
   * @param {string} typeName
   * @return {boolean}
   */
  accept(typeName) {
    return !!this._allowedTypes[NamedBitSetFilterUI.ALL_TYPES] || !!this._allowedTypes[typeName];
  }

  _settingChanged() {
    const allowedTypes = this._setting.get();
    this._allowedTypes = {};
    for (const element of this._typeFilterElements) {
      if (allowedTypes[element.typeName]) {
        this._allowedTypes[element.typeName] = true;
      }
    }
    this._update();
  }

  _update() {
    if ((Object.keys(this._allowedTypes).length === 0) || this._allowedTypes[NamedBitSetFilterUI.ALL_TYPES]) {
      this._allowedTypes = {};
      this._allowedTypes[NamedBitSetFilterUI.ALL_TYPES] = true;
    }
    for (const element of this._typeFilterElements) {
      const typeName = element.typeName;
      const active = !!this._allowedTypes[typeName];
      element.classList.toggle('selected', active);
      ARIAUtils.setSelected(element, active);
    }
    this.dispatchEventToListeners(FilterUI.Events.FilterChanged, null);
  }

  /**
   * @param {string} name
   * @param {string} label
   * @param {string=} title
   */
  _addBit(name, label, title) {
    const typeFilterElement = this._filtersElement.createChild('span', name);
    typeFilterElement.tabIndex = -1;
    typeFilterElement.typeName = name;
    typeFilterElement.createTextChild(label);
    ARIAUtils.markAsOption(typeFilterElement);
    if (title) {
      typeFilterElement.title = title;
    }
    typeFilterElement.addEventListener('click', this._onTypeFilterClicked.bind(this), false);
    typeFilterElement.addEventListener('keydown', this._onTypeFilterKeydown.bind(this), false);
    this._typeFilterElements.push(typeFilterElement);
  }

  /**
   * @param {!Event} e
   */
  _onTypeFilterClicked(e) {
    let toggle;
    if (Host.Platform.isMac()) {
      toggle = e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
    } else {
      toggle = e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
    }
    this._toggleTypeFilter(e.target.typeName, toggle);
  }

  /**
   * @param {!Event} event
   */
  _onTypeFilterKeydown(event) {
    const element = /** @type {?Element} */ (event.target);
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

  /**
   * @param {!Element} target
   * @param {boolean} selectPrevious
   * @returns {!boolean}
   */
  _keyFocusNextBit(target, selectPrevious) {
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

  /**
   * @param {string} typeName
   * @param {boolean} allowMultiSelect
   */
  _toggleTypeFilter(typeName, allowMultiSelect) {
    if (allowMultiSelect && typeName !== NamedBitSetFilterUI.ALL_TYPES) {
      this._allowedTypes[NamedBitSetFilterUI.ALL_TYPES] = false;
    } else {
      this._allowedTypes = {};
    }

    this._allowedTypes[typeName] = !this._allowedTypes[typeName];

    if (this._setting) {
      this._setting.set(this._allowedTypes);
    } else {
      this._update();
    }
  }
}

NamedBitSetFilterUI.ALL_TYPES = 'all';

/**
 * @implements {FilterUI}
 * @unrestricted
 */
export class CheckboxFilterUI extends Common.ObjectWrapper.ObjectWrapper {
  /**
   * @param {string} className
   * @param {string} title
   * @param {boolean=} activeWhenChecked
   * @param {!Common.Settings.Setting=} setting
   */
  constructor(className, title, activeWhenChecked, setting) {
    super();
    this._filterElement = createElementWithClass('div', 'filter-checkbox-filter');
    this._activeWhenChecked = !!activeWhenChecked;
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

  /**
   * @override
   * @return {boolean}
   */
  isActive() {
    return this._activeWhenChecked === this._checkboxElement.checked;
  }

  /**
   * @return {boolean}
   */
  checked() {
    return this._checkboxElement.checked;
  }

  /**
   * @param {boolean} checked
   */
  setChecked(checked) {
    this._checkboxElement.checked = checked;
  }

  /**
   * @override
   * @return {!Element}
   */
  element() {
    return this._filterElement;
  }

  /**
   * @return {!Element}
   */
  labelElement() {
    return this._label;
  }

  _fireUpdated() {
    this.dispatchEventToListeners(FilterUI.Events.FilterChanged, null);
  }

  /**
   * @param {string} backgroundColor
   * @param {string} borderColor
   */
  setColor(backgroundColor, borderColor) {
    this._label.backgroundColor = backgroundColor;
    this._label.borderColor = borderColor;
  }
}

/** @typedef {{name: string, label: string, title: (string|undefined)}} */
export let Item;

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

/**
 * @unrestricted
 */
UI.FilterBar = class extends UI.HBox {
  /**
   * @param {string} name
   * @param {boolean=} visibleByDefault
   */
  constructor(name, visibleByDefault) {
    super();
    this.registerRequiredCSS('ui/filter.css');
    this._filtersShown = false;
    this._enabled = true;
    this.element.classList.add('filter-bar');

    this._filterButton = new UI.ToolbarToggle(Common.UIString('Filter'), 'largeicon-filter');
    this._filterButton.addEventListener(UI.ToolbarButton.Events.Click, this._handleFilterButtonClick, this);

    this._filters = [];

    this._stateSetting = Common.settings.createSetting('filterBar-' + name + '-toggled', !!visibleByDefault);
    this._setState(this._stateSetting.get());
  }

  /**
   * @return {!UI.ToolbarButton}
   */
  filterButton() {
    return this._filterButton;
  }

  /**
   * @param {!UI.FilterUI} filter
   */
  addFilter(filter) {
    this._filters.push(filter);
    this.element.appendChild(filter.element());
    filter.addEventListener(UI.FilterUI.Events.FilterChanged, this._filterChanged, this);
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

  /**
   * @override
   */
  wasShown() {
    this._updateFilterBar();
  }

  /**
   * @param {!Common.Event} event
   */
  _filterChanged(event) {
    this._updateFilterButton();
  }

  _updateFilterBar() {
    var visible = this._alwaysShowFilters || (this._filtersShown && this._enabled);
    this.element.classList.toggle('hidden', !visible);
    this.invalidateSize();
  }

  _focusTextField() {
    for (var i = 0; i < this._filters.length; ++i) {
      if (this._filters[i] instanceof UI.TextFilterUI) {
        var textFilterUI = /** @type {!UI.TextFilterUI} */ (this._filters[i]);
        textFilterUI.focus();
        break;
      }
    }
  }

  _updateFilterButton() {
    if (this._filtersShown) {
      this._filterButton.setToggled(true);
      this._filterButton.setToggleWithRedColor(false);
      return;
    }
    this._filterButton.setToggleWithRedColor(true);
    var isActive = false;
    for (var filter of this._filters)
      isActive = isActive || filter.isActive();
    this._filterButton.setToggled(isActive);
  }

  /**
   * @param {!Common.Event} event
   */
  _handleFilterButtonClick(event) {
    this._setState(!this._filtersShown);
  }

  /**
   * @param {boolean} filtersShown
   */
  _setState(filtersShown) {
    if (this._filtersShown === filtersShown)
      return;

    this._filtersShown = filtersShown;
    if (this._stateSetting)
      this._stateSetting.set(filtersShown);

    this._updateFilterButton();
    this._updateFilterBar();
    if (this._filtersShown)
      this._focusTextField();
    this.dispatchEventToListeners(UI.FilterBar.Events.Toggled);
  }

  clear() {
    this.element.removeChildren();
    this._filters = [];
    this._updateFilterButton();
  }
};

UI.FilterBar.FilterBarState = {
  Inactive: 'inactive',
  Active: 'active',
  Shown: 'on'
};

/** @enum {symbol} */
UI.FilterBar.Events = {
  Toggled: Symbol('Toggled')
};

/**
 * @interface
 * @extends {Common.EventTarget}
 */
UI.FilterUI = function() {};

/** @enum {symbol} */
UI.FilterUI.Events = {
  FilterChanged: Symbol('FilterChanged')
};

UI.FilterUI.prototype = {
  /**
   * @return {boolean}
   */
  isActive() {},

  /**
   * @return {!Element}
   */
  element() {}
};

/**
 * @implements {UI.FilterUI}
 * @unrestricted
 */
UI.TextFilterUI = class extends Common.Object {
  /**
   * @param {boolean=} supportRegex
   */
  constructor(supportRegex) {
    super();
    this._supportRegex = !!supportRegex;
    this._regex = null;

    this._filterElement = createElement('div');
    this._filterElement.className = 'filter-text-filter';

    this._filterInputElement = this._filterElement.createChild('span', 'filter-input-field');

    this._prompt = new UI.TextPrompt();
    this._prompt.initialize(this._completions.bind(this), ' ');
    this._proxyElement = this._prompt.attach(this._filterInputElement);
    this._prompt.setPlaceholder(Common.UIString('Filter'));

    this._proxyElement.addEventListener('input', this._valueChanged.bind(this), false);
    this._proxyElement.addEventListener('keydown', this._onInputKeyDown.bind(this), false);
    this._prompt.addEventListener(UI.TextPrompt.Events.ItemAccepted, this._valueChanged.bind(this));
    this._prompt.addEventListener(UI.TextPrompt.Events.ItemApplied, this._valueChanged.bind(this));

    /** @type {?function(string, string, boolean=):!Promise<!UI.SuggestBox.Suggestions>} */
    this._suggestionProvider = null;

    if (this._supportRegex) {
      this._filterElement.classList.add('supports-regex');
      var label = createCheckboxLabel(Common.UIString('Regex'));
      this._regexCheckBox = label.checkboxElement;
      this._regexCheckBox.id = 'text-filter-regex';
      this._regexCheckBox.addEventListener('change', this._valueChanged.bind(this), false);
      this._filterElement.appendChild(label);

      this._regexLabel = this._filterElement.textElement;
    }
  }

  /**
   * @param {string} expression
   * @param {string} prefix
   * @param {boolean=} force
   * @return {!Promise<!UI.SuggestBox.Suggestions>}
   */
  _completions(expression, prefix, force) {
    if (this._suggestionProvider && !this.isRegexChecked())
      return this._suggestionProvider(expression, prefix, force);
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
    return this._proxyElement;
  }

  /**
   * @return {boolean}
   */
  isRegexChecked() {
    return this._supportRegex ? this._regexCheckBox.checked : false;
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

  /**
   * @param {boolean} checked
   */
  setRegexChecked(checked) {
    if (this._supportRegex)
      this._regexCheckBox.checked = checked;
  }

  /**
   * @return {?RegExp}
   */
  regex() {
    return this._regex;
  }

  focus() {
    this._filterInputElement.focus();
  }

  /**
   * @param {(function(string, string, boolean=):!Promise<!UI.SuggestBox.Suggestions>)} suggestionProvider
   */
  setSuggestionProvider(suggestionProvider) {
    this._prompt.clearAutocomplete();
    this._suggestionProvider = suggestionProvider;
  }

  _valueChanged() {
    var filterQuery = this.value();

    this._regex = null;
    this._filterInputElement.classList.remove('filter-text-invalid');
    if (filterQuery) {
      if (this.isRegexChecked()) {
        try {
          this._regex = new RegExp(filterQuery, 'i');
        } catch (e) {
          this._filterInputElement.classList.add('filter-text-invalid');
        }
      } else {
        this._regex = createPlainTextSearchRegex(filterQuery, 'i');
      }
    }

    this._dispatchFilterChanged();
  }

  _dispatchFilterChanged() {
    this.dispatchEventToListeners(UI.FilterUI.Events.FilterChanged, null);
  }

  /**
   * @param {!Event} event
   */
  _onInputKeyDown(event) {
    if (isEnterKey(event))
      event.consume(true);
  }
};

/**
 * @implements {UI.FilterUI}
 * @unrestricted
 */
UI.NamedBitSetFilterUI = class extends Common.Object {
  /**
   * @param {!Array.<!UI.NamedBitSetFilterUI.Item>} items
   * @param {!Common.Setting=} setting
   */
  constructor(items, setting) {
    super();
    this._filtersElement = createElementWithClass('div', 'filter-bitset-filter');
    this._filtersElement.title = Common.UIString(
        '%sClick to select multiple types',
        UI.KeyboardShortcut.shortcutToString('', UI.KeyboardShortcut.Modifiers.CtrlOrMeta));

    this._allowedTypes = {};
    this._typeFilterElements = {};
    this._addBit(UI.NamedBitSetFilterUI.ALL_TYPES, Common.UIString('All'));
    this._filtersElement.createChild('div', 'filter-bitset-filter-divider');

    for (var i = 0; i < items.length; ++i)
      this._addBit(items[i].name, items[i].label, items[i].title);

    if (setting) {
      this._setting = setting;
      setting.addChangeListener(this._settingChanged.bind(this));
      this._settingChanged();
    } else {
      this._toggleTypeFilter(UI.NamedBitSetFilterUI.ALL_TYPES, false /* allowMultiSelect */);
    }
  }

  reset() {
    this._toggleTypeFilter(UI.NamedBitSetFilterUI.ALL_TYPES, false /* allowMultiSelect */);
  }

  /**
   * @override
   * @return {boolean}
   */
  isActive() {
    return !this._allowedTypes[UI.NamedBitSetFilterUI.ALL_TYPES];
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
    return !!this._allowedTypes[UI.NamedBitSetFilterUI.ALL_TYPES] || !!this._allowedTypes[typeName];
  }

  _settingChanged() {
    var allowedTypes = this._setting.get();
    this._allowedTypes = {};
    for (var typeName in this._typeFilterElements) {
      if (allowedTypes[typeName])
        this._allowedTypes[typeName] = true;
    }
    this._update();
  }

  _update() {
    if ((Object.keys(this._allowedTypes).length === 0) || this._allowedTypes[UI.NamedBitSetFilterUI.ALL_TYPES]) {
      this._allowedTypes = {};
      this._allowedTypes[UI.NamedBitSetFilterUI.ALL_TYPES] = true;
    }
    for (var typeName in this._typeFilterElements)
      this._typeFilterElements[typeName].classList.toggle('selected', this._allowedTypes[typeName]);
    this.dispatchEventToListeners(UI.FilterUI.Events.FilterChanged, null);
  }

  /**
   * @param {string} name
   * @param {string} label
   * @param {string=} title
   */
  _addBit(name, label, title) {
    var typeFilterElement = this._filtersElement.createChild('li', name);
    typeFilterElement.typeName = name;
    typeFilterElement.createTextChild(label);
    if (title)
      typeFilterElement.title = title;
    typeFilterElement.addEventListener('click', this._onTypeFilterClicked.bind(this), false);
    this._typeFilterElements[name] = typeFilterElement;
  }

  /**
   * @param {!Event} e
   */
  _onTypeFilterClicked(e) {
    var toggle;
    if (Host.isMac())
      toggle = e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
    else
      toggle = e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
    this._toggleTypeFilter(e.target.typeName, toggle);
  }

  /**
   * @param {string} typeName
   * @param {boolean} allowMultiSelect
   */
  _toggleTypeFilter(typeName, allowMultiSelect) {
    if (allowMultiSelect && typeName !== UI.NamedBitSetFilterUI.ALL_TYPES)
      this._allowedTypes[UI.NamedBitSetFilterUI.ALL_TYPES] = false;
    else
      this._allowedTypes = {};

    this._allowedTypes[typeName] = !this._allowedTypes[typeName];

    if (this._setting)
      this._setting.set(this._allowedTypes);
    else
      this._update();
  }
};

/** @typedef {{name: string, label: string, title: (string|undefined)}} */
UI.NamedBitSetFilterUI.Item;

UI.NamedBitSetFilterUI.ALL_TYPES = 'all';

/**
 * @implements {UI.FilterUI}
 * @unrestricted
 */
UI.ComboBoxFilterUI = class extends Common.Object {
  /**
   * @param {!Array.<!{value: *, label: string, title: string}>} options
   */
  constructor(options) {
    super();
    this._filterElement = createElement('div');
    this._filterElement.className = 'filter-combobox-filter';

    this._options = options;
    this._filterComboBox = new UI.ToolbarComboBox(this._filterChanged.bind(this));
    for (var i = 0; i < options.length; ++i) {
      var filterOption = options[i];
      var option = createElement('option');
      option.text = filterOption.label;
      option.title = filterOption.title;
      this._filterComboBox.addOption(option);
      this._filterComboBox.element.title = this._filterComboBox.selectedOption().title;
    }
    this._filterElement.appendChild(this._filterComboBox.element);
  }

  /**
   * @override
   * @return {boolean}
   */
  isActive() {
    return this._filterComboBox.selectedIndex() !== 0;
  }

  /**
   * @override
   * @return {!Element}
   */
  element() {
    return this._filterElement;
  }

  /**
   * @return {*}
   */
  value() {
    var option = this._options[this._filterComboBox.selectedIndex()];
    return option.value;
  }

  /**
   * @param {number} index
   */
  setSelectedIndex(index) {
    this._filterComboBox.setSelectedIndex(index);
  }

  /**
   * @return {number}
   */
  selectedIndex(index) {
    return this._filterComboBox.selectedIndex();
  }

  /**
   * @param {!Event} event
   */
  _filterChanged(event) {
    var option = this._options[this._filterComboBox.selectedIndex()];
    this._filterComboBox.element.title = option.title;
    this.dispatchEventToListeners(UI.FilterUI.Events.FilterChanged, null);
  }
};

/**
 * @implements {UI.FilterUI}
 * @unrestricted
 */
UI.CheckboxFilterUI = class extends Common.Object {
  /**
   * @param {string} className
   * @param {string} title
   * @param {boolean=} activeWhenChecked
   * @param {!Common.Setting=} setting
   */
  constructor(className, title, activeWhenChecked, setting) {
    super();
    this._filterElement = createElementWithClass('div', 'filter-checkbox-filter');
    this._activeWhenChecked = !!activeWhenChecked;
    this._label = createCheckboxLabel(title);
    this._filterElement.appendChild(this._label);
    this._checkboxElement = this._label.checkboxElement;
    if (setting)
      UI.SettingsUI.bindCheckbox(this._checkboxElement, setting);
    else
      this._checkboxElement.checked = true;
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
    this.dispatchEventToListeners(UI.FilterUI.Events.FilterChanged, null);
  }

  /**
   * @param {string} backgroundColor
   * @param {string} borderColor
   */
  setColor(backgroundColor, borderColor) {
    this._label.backgroundColor = backgroundColor;
    this._label.borderColor = borderColor;
  }
};

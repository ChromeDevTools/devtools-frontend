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
 * @constructor
 * @extends {WebInspector.HBox}
 * @param {string} name
 * @param {boolean=} visibleByDefault
 */
WebInspector.FilterBar = function(name, visibleByDefault)
{
    WebInspector.HBox.call(this);
    this.registerRequiredCSS("ui/filter.css");
    this._filtersShown = false;
    this._enabled = true;
    this.element.classList.add("filter-bar");

    this._filterButton = new WebInspector.ToolbarButton(WebInspector.UIString("Filter"), "filter-toolbar-item");
    this._filterButton.addEventListener("click", this._handleFilterButtonClick, this);

    this._filters = [];

    this._stateSetting = WebInspector.settings.createSetting("filterBar-" + name + "-toggled", !!visibleByDefault);
    this._setState(this._stateSetting.get());
}

WebInspector.FilterBar.FilterBarState = {
    Inactive : "inactive",
    Active : "active",
    Shown : "on"
};

/** @enum {symbol} */
WebInspector.FilterBar.Events = {
    Toggled: Symbol("Toggled")
};

WebInspector.FilterBar.prototype = {
    /**
     * @return {!WebInspector.ToolbarButton}
     */
    filterButton: function()
    {
        return this._filterButton;
    },

    /**
     * @param {!WebInspector.FilterUI} filter
     */
    addFilter: function(filter)
    {
        this._filters.push(filter);
        this.element.appendChild(filter.element());
        filter.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._filterChanged, this);
        this._updateFilterButton();
    },

    setEnabled: function(enabled)
    {
        this._enabled = enabled;
        this._filterButton.setEnabled(enabled);
        this._updateFilterBar();
    },

    forceShowFilterBar: function()
    {
        this._alwaysShowFilters = true;
        this._updateFilterBar();
    },

    /**
     * @override
     */
    wasShown: function()
    {
        this._updateFilterBar();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _filterChanged: function(event)
    {
        this._updateFilterButton();
    },

    /**
     * @return {string}
     */
    _filterBarState: function()
    {
        if (this._filtersShown)
            return WebInspector.FilterBar.FilterBarState.Shown;
        var isActive = false;
        for (var i = 0; i < this._filters.length; ++i) {
            if (this._filters[i].isActive())
                return WebInspector.FilterBar.FilterBarState.Active;
        }
        return WebInspector.FilterBar.FilterBarState.Inactive;
    },

    _updateFilterBar: function()
    {
        var visible = this._alwaysShowFilters || (this._filtersShown && this._enabled);
        this.element.classList.toggle("hidden", !visible);
        if (visible) {
            for (var i = 0; i < this._filters.length; ++i) {
                if (this._filters[i] instanceof WebInspector.TextFilterUI) {
                    var textFilterUI = /** @type {!WebInspector.TextFilterUI} */ (this._filters[i]);
                    textFilterUI.focus();
                }
            }
        }
        this.invalidateSize();
    },

    _updateFilterButton: function()
    {
        this._filterButton.setState(this._filterBarState());
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _handleFilterButtonClick: function(event)
    {
        this._setState(!this._filtersShown);
    },

    /**
     * @param {boolean} filtersShown
     */
    _setState: function(filtersShown)
    {
        if (this._filtersShown === filtersShown)
            return;

        this._filtersShown = filtersShown;
        if (this._stateSetting)
            this._stateSetting.set(filtersShown);

        this._updateFilterButton();
        this._updateFilterBar();
        this.dispatchEventToListeners(WebInspector.FilterBar.Events.Toggled);
    },

    clear: function()
    {
        this.element.removeChildren();
        this._filters = [];
        this._updateFilterButton();
    },

    __proto__: WebInspector.HBox.prototype
}

/**
 * @interface
 * @extends {WebInspector.EventTarget}
 */
WebInspector.FilterUI = function()
{
}

/** @enum {symbol} */
WebInspector.FilterUI.Events = {
    FilterChanged: Symbol("FilterChanged")
}

WebInspector.FilterUI.prototype = {
    /**
     * @return {boolean}
     */
    isActive: function() { },

    /**
     * @return {!Element}
     */
    element: function() { }
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @implements {WebInspector.FilterUI}
 * @implements {WebInspector.SuggestBoxDelegate}
 * @param {boolean=} supportRegex
 */
WebInspector.TextFilterUI = function(supportRegex)
{
    this._supportRegex = !!supportRegex;
    this._regex = null;

    this._filterElement = createElement("div");
    this._filterElement.className = "filter-text-filter";

    this._filterInputElement = /** @type {!HTMLInputElement} */ (this._filterElement.createChild("input", "filter-input-field"));
    this._filterInputElement.placeholder = WebInspector.UIString("Filter");
    this._filterInputElement.id = "filter-input-field";
    this._filterInputElement.addEventListener("mousedown", this._onFilterFieldManualFocus.bind(this), false); // when the search field is manually selected
    this._filterInputElement.addEventListener("input", this._onInput.bind(this), false);
    this._filterInputElement.addEventListener("change", this._onChange.bind(this), false);
    this._filterInputElement.addEventListener("keydown", this._onInputKeyDown.bind(this), true);
    this._filterInputElement.addEventListener("blur", this._onBlur.bind(this), true);

    /** @type {?WebInspector.TextFilterUI.SuggestionBuilder} */
    this._suggestionBuilder = null;

    this._suggestBox = new WebInspector.SuggestBox(this);

    if (this._supportRegex) {
        this._filterElement.classList.add("supports-regex");
        var label = createCheckboxLabel(WebInspector.UIString("Regex"));
        this._regexCheckBox = label.checkboxElement;
        this._regexCheckBox.id = "text-filter-regex";
        this._regexCheckBox.addEventListener("change", this._onInput.bind(this), false);
        this._filterElement.appendChild(label);

        this._regexLabel = this._filterElement.textElement;
    }
}

WebInspector.TextFilterUI.prototype = {
    /**
     * @override
     * @return {boolean}
     */
    isActive: function()
    {
        return !!this._filterInputElement.value;
    },

    /**
     * @override
     * @return {!Element}
     */
    element: function()
    {
        return this._filterElement;
    },

    /**
     * @return {boolean}
     */
    isRegexChecked: function()
    {
        return this._supportRegex ? this._regexCheckBox.checked : false;
    },

    /**
     * @return {string}
     */
    value: function()
    {
        return this._filterInputElement.value;
    },

    /**
     * @param {string} value
     */
    setValue: function(value)
    {
        this._filterInputElement.value = value;
        this._valueChanged(false);
    },

    /**
     * @param {boolean} checked
     */
    setRegexChecked: function(checked)
    {
        if (this._supportRegex)
            this._regexCheckBox.checked = checked;
    },

    /**
     * @return {?RegExp}
     */
    regex: function()
    {
        return this._regex;
    },

    /**
     * @param {!Event} event
     */
    _onFilterFieldManualFocus: function(event)
    {
        WebInspector.setCurrentFocusElement(/** @type {?Node} */ (event.target));
    },

    /**
     * @param {!Event} event
     */
    _onBlur: function(event)
    {
        this._cancelSuggestion();
    },

    _cancelSuggestion: function()
    {
        if (this._suggestionBuilder && this._suggestBox.visible) {
            this._suggestionBuilder.unapplySuggestion(this._filterInputElement);
            this._suggestBox.hide();
        }
    },

    _onInput: function()
    {
        this._valueChanged(true);
    },

    _onChange: function()
    {
        this._valueChanged(false);
    },

    focus: function()
    {
        this._filterInputElement.focus();
    },

    /**
     * @param {?WebInspector.TextFilterUI.SuggestionBuilder} suggestionBuilder
     */
    setSuggestionBuilder: function(suggestionBuilder)
    {
        this._cancelSuggestion();
        this._suggestionBuilder = suggestionBuilder;
    },

    _updateSuggestions: function()
    {
        if (!this._suggestionBuilder)
            return;
        if (this.isRegexChecked()) {
            if (this._suggestBox.visible())
                this._suggestBox.hide();
            return;
        }
        var suggestions = this._suggestionBuilder.buildSuggestions(this._filterInputElement);
        if (suggestions && suggestions.length) {
            if (this._suppressSuggestion)
                delete this._suppressSuggestion;
            else
                this._suggestionBuilder.applySuggestion(this._filterInputElement, suggestions[0], true);
            var anchorBox = this._filterInputElement.boxInWindow().relativeTo(new AnchorBox(-3, 0));
            this._suggestBox.updateSuggestions(anchorBox, suggestions.map(item => ({title: item})), 0, true, "");
        } else {
            this._suggestBox.hide();
        }
    },

    /**
     * @param {boolean} showSuggestions
     */
    _valueChanged: function(showSuggestions)
    {
        if (showSuggestions)
            this._updateSuggestions();
        else
            this._suggestBox.hide();

        var filterQuery = this.value();

        this._regex = null;
        this._filterInputElement.classList.remove("filter-text-invalid");
        if (filterQuery) {
            if (this.isRegexChecked()) {
                try {
                    this._regex = new RegExp(filterQuery, "i");
                } catch (e) {
                    this._filterInputElement.classList.add("filter-text-invalid");
                }
            } else {
                this._regex = createPlainTextSearchRegex(filterQuery, "i");
            }
        }

        this._dispatchFilterChanged();
    },

    _dispatchFilterChanged: function()
    {
        this.dispatchEventToListeners(WebInspector.FilterUI.Events.FilterChanged, null);
    },

    /**
     * @param {!Event} event
     * @return {boolean}
     */
    _onInputKeyDown: function(event)
    {
        var handled = false;
        if (event.key === "Backspace") {
            this._suppressSuggestion = true;
        } else if (this._suggestBox.visible()) {
            if (event.key === "Escape") {
                this._cancelSuggestion();
                handled = true;
            } else if (event.key === "Tab") {
                this._suggestBox.acceptSuggestion();
                this._valueChanged(true);
                handled = true;
            } else {
                handled = this._suggestBox.keyPressed(/** @type {!KeyboardEvent} */ (event));
            }
        }
        if (handled)
            event.consume(true);
        return handled;
    },

    /**
     * @override
     * @param {string} suggestion
     * @param {boolean=} isIntermediateSuggestion
     */
    applySuggestion: function(suggestion, isIntermediateSuggestion)
    {
        if (!this._suggestionBuilder)
            return;
        this._suggestionBuilder.applySuggestion(this._filterInputElement, suggestion, !!isIntermediateSuggestion);
        if (isIntermediateSuggestion)
            this._dispatchFilterChanged();
    },

    /** @override */
    acceptSuggestion: function()
    {
        this._filterInputElement.scrollLeft = this._filterInputElement.scrollWidth;
        this._valueChanged(true);
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @interface
 */
WebInspector.TextFilterUI.SuggestionBuilder = function()
{
}

WebInspector.TextFilterUI.SuggestionBuilder.prototype = {
    /**
     * @param {!HTMLInputElement} input
     * @return {?Array.<string>}
     */
    buildSuggestions: function(input) { },

    /**
     * @param {!HTMLInputElement} input
     * @param {string} suggestion
     * @param {boolean} isIntermediate
     */
    applySuggestion: function(input, suggestion, isIntermediate) { },

    /**
     * @param {!HTMLInputElement} input
     */
    unapplySuggestion: function(input) { }
}

/**
 * @constructor
 * @extends {WebInspector.Object}
 * @implements {WebInspector.FilterUI}
 * @param {!Array.<!WebInspector.NamedBitSetFilterUI.Item>} items
 * @param {!WebInspector.Setting=} setting
 */
WebInspector.NamedBitSetFilterUI = function(items, setting)
{
    this._filtersElement = createElementWithClass("div", "filter-bitset-filter");
    this._filtersElement.title = WebInspector.UIString("%sClick to select multiple types", WebInspector.KeyboardShortcut.shortcutToString("", WebInspector.KeyboardShortcut.Modifiers.CtrlOrMeta));

    this._allowedTypes = {};
    this._typeFilterElements = {};
    this._addBit(WebInspector.NamedBitSetFilterUI.ALL_TYPES, WebInspector.UIString("All"));
    this._filtersElement.createChild("div", "filter-bitset-filter-divider");

    for (var i = 0; i < items.length; ++i)
        this._addBit(items[i].name, items[i].label, items[i].title);

    if (setting) {
        this._setting = setting;
        setting.addChangeListener(this._settingChanged.bind(this));
        this._settingChanged();
    } else {
        this._toggleTypeFilter(WebInspector.NamedBitSetFilterUI.ALL_TYPES, false /* allowMultiSelect */);
    }
}

/** @typedef {{name: string, label: string, title: (string|undefined)}} */
WebInspector.NamedBitSetFilterUI.Item;

WebInspector.NamedBitSetFilterUI.ALL_TYPES = "all";

WebInspector.NamedBitSetFilterUI.prototype = {
    reset: function()
    {
        this._toggleTypeFilter(WebInspector.NamedBitSetFilterUI.ALL_TYPES, false /* allowMultiSelect */);
    },

    /**
     * @override
     * @return {boolean}
     */
    isActive: function()
    {
        return !this._allowedTypes[WebInspector.NamedBitSetFilterUI.ALL_TYPES];
    },

    /**
     * @override
     * @return {!Element}
     */
    element: function()
    {
        return this._filtersElement;
    },

    /**
     * @param {string} typeName
     * @return {boolean}
     */
    accept: function(typeName)
    {
        return !!this._allowedTypes[WebInspector.NamedBitSetFilterUI.ALL_TYPES] || !!this._allowedTypes[typeName];
    },

    _settingChanged: function()
    {
        var allowedTypes = this._setting.get();
        this._allowedTypes = {};
        for (var typeName in this._typeFilterElements) {
            if (allowedTypes[typeName])
                this._allowedTypes[typeName] = true;
        }
        this._update();
    },

    _update: function()
    {
        if ((Object.keys(this._allowedTypes).length === 0) || this._allowedTypes[WebInspector.NamedBitSetFilterUI.ALL_TYPES]) {
            this._allowedTypes = {};
            this._allowedTypes[WebInspector.NamedBitSetFilterUI.ALL_TYPES] = true;
        }
        for (var typeName in this._typeFilterElements)
            this._typeFilterElements[typeName].classList.toggle("selected", this._allowedTypes[typeName]);
        this.dispatchEventToListeners(WebInspector.FilterUI.Events.FilterChanged, null);
    },

    /**
     * @param {string} name
     * @param {string} label
     * @param {string=} title
     */
    _addBit: function(name, label, title)
    {
        var typeFilterElement = this._filtersElement.createChild("li", name);
        typeFilterElement.typeName = name;
        typeFilterElement.createTextChild(label);
        if (title)
            typeFilterElement.title = title;
        typeFilterElement.addEventListener("click", this._onTypeFilterClicked.bind(this), false);
        this._typeFilterElements[name] = typeFilterElement;
    },

    /**
     * @param {!Event} e
     */
    _onTypeFilterClicked: function(e)
    {
        var toggle;
        if (WebInspector.isMac())
            toggle = e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
        else
            toggle = e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
        this._toggleTypeFilter(e.target.typeName, toggle);
    },

    /**
     * @param {string} typeName
     * @param {boolean} allowMultiSelect
     */
    _toggleTypeFilter: function(typeName, allowMultiSelect)
    {
        if (allowMultiSelect && typeName !== WebInspector.NamedBitSetFilterUI.ALL_TYPES)
            this._allowedTypes[WebInspector.NamedBitSetFilterUI.ALL_TYPES] = false;
        else
            this._allowedTypes = {};

        this._allowedTypes[typeName] = !this._allowedTypes[typeName];

        if (this._setting)
            this._setting.set(this._allowedTypes);
        else
            this._update();
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @implements {WebInspector.FilterUI}
 * @extends {WebInspector.Object}
 * @param {!Array.<!{value: *, label: string, title: string}>} options
 */
WebInspector.ComboBoxFilterUI = function(options)
{
    this._filterElement = createElement("div");
    this._filterElement.className = "filter-combobox-filter";

    this._options = options;
    this._filterComboBox = new WebInspector.ToolbarComboBox(this._filterChanged.bind(this));
    for (var i = 0; i < options.length; ++i) {
        var filterOption = options[i];
        var option = createElement("option");
        option.text = filterOption.label;
        option.title = filterOption.title;
        this._filterComboBox.addOption(option);
        this._filterComboBox.element.title = this._filterComboBox.selectedOption().title;
    }
    this._filterElement.appendChild(this._filterComboBox.element);
}

WebInspector.ComboBoxFilterUI.prototype = {
    /**
     * @override
     * @return {boolean}
     */
    isActive: function()
    {
        return this._filterComboBox.selectedIndex() !== 0;
    },

    /**
     * @override
     * @return {!Element}
     */
    element: function()
    {
        return this._filterElement;
    },

    /**
     * @return {*}
     */
    value: function()
    {
        var option = this._options[this._filterComboBox.selectedIndex()];
        return option.value;
    },

    /**
     * @param {number} index
     */
    setSelectedIndex: function(index)
    {
        this._filterComboBox.setSelectedIndex(index);
    },

    /**
     * @return {number}
     */
    selectedIndex: function(index)
    {
        return this._filterComboBox.selectedIndex();
    },

    /**
     * @param {!Event} event
     */
    _filterChanged: function(event)
    {
        var option = this._options[this._filterComboBox.selectedIndex()];
        this._filterComboBox.element.title = option.title;
        this.dispatchEventToListeners(WebInspector.FilterUI.Events.FilterChanged, null);
    },

    __proto__: WebInspector.Object.prototype
}

/**
 * @constructor
 * @implements {WebInspector.FilterUI}
 * @extends {WebInspector.Object}
 * @param {string} className
 * @param {string} title
 * @param {boolean=} activeWhenChecked
 * @param {!WebInspector.Setting=} setting
 */
WebInspector.CheckboxFilterUI = function(className, title, activeWhenChecked, setting)
{
    this._filterElement = createElementWithClass("div", "filter-checkbox-filter");
    this._activeWhenChecked = !!activeWhenChecked;
    this._label = createCheckboxLabel(title);
    this._filterElement.appendChild(this._label);
    this._checkboxElement = this._label.checkboxElement;
    if (setting)
        WebInspector.SettingsUI.bindCheckbox(this._checkboxElement, setting);
    else
        this._checkboxElement.checked = true;
    this._checkboxElement.addEventListener("change", this._fireUpdated.bind(this), false);
}

WebInspector.CheckboxFilterUI.prototype = {
    /**
     * @override
     * @return {boolean}
     */
    isActive: function()
    {
        return this._activeWhenChecked === this._checkboxElement.checked;
    },

    /**
     * @return {boolean}
     */
    checked: function()
    {
        return this._checkboxElement.checked;
    },

    /**
     * @param {boolean} checked
     */
    setChecked: function(checked)
    {
        this._checkboxElement.checked = checked;
    },

    /**
     * @override
     * @return {!Element}
     */
    element: function()
    {
        return this._filterElement;
    },

    /**
     * @return {!Element}
     */
    labelElement: function()
    {
        return this._label;
    },

    _fireUpdated: function()
    {
        this.dispatchEventToListeners(WebInspector.FilterUI.Events.FilterChanged, null);
    },

    /**
     * @param {string} backgroundColor
     * @param {string} borderColor
     */
    setColor: function(backgroundColor, borderColor)
    {
        this._label.backgroundColor = backgroundColor;
        this._label.borderColor = borderColor;
    },

    __proto__: WebInspector.Object.prototype
}

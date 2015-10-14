/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {WebInspector.SettingsTab}
 */
WebInspector.FrameworkBlackboxSettingsTab = function()
{
    WebInspector.SettingsTab.call(this, WebInspector.UIString("Framework Blackbox Patterns"));
    this.containerElement.classList.add("blackbox-dialog", "dialog-contents", "settings-dialog", "settings-tab");

    var contents = this.containerElement.createChild("div", "contents");

    var contentScriptsSection = contents.createChild("div", "blackbox-content-scripts");
    contentScriptsSection.appendChild(WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Blackbox content scripts"), WebInspector.moduleSetting("skipContentScripts"), true));

    var blockHeader = contents.createChild("div", "columns-header");
    blockHeader.createChild("span").textContent = WebInspector.UIString("URI pattern");
    blockHeader.createChild("span").textContent = WebInspector.UIString("Behavior");

    var section = contents.createChild("div", "section");
    var container = section.createChild("div", "settings-list-container");

    this._blackboxLabel = WebInspector.UIString("Blackbox");
    this._disabledLabel = WebInspector.UIString("Disabled");

    var column1 = { id: "pattern", placeholder: "/framework\\.js$" };
    var column2 = { id: "value", options: [this._blackboxLabel, this._disabledLabel] };

    this._patternsList = new WebInspector.EditableSettingsList([column1, column2], this._patternValuesProvider.bind(this), this._patternValidate.bind(this), this._patternEdit.bind(this));
    this._patternsList.element.classList.add("blackbox-patterns-list");
    this._patternsList.addEventListener(WebInspector.SettingsList.Events.Removed, this._patternRemovedFromList.bind(this));
    container.appendChild(this._patternsList.element);

    /** @type {!Map.<string, string>} */
    this._entries = new Map();
    var patterns = WebInspector.moduleSetting("skipStackFramesPattern").getAsArray();
    for (var i = 0; i < patterns.length; ++i)
        this._addPattern(patterns[i].pattern, patterns[i].disabled);

    this.containerElement.tabIndex = 0;
}

WebInspector.FrameworkBlackboxSettingsTab.prototype = {
    /**
     * @param {string} itemId
     * @param {string} columnId
     * @return {string}
     */
    _patternValuesProvider: function(itemId, columnId)
    {
        if (!itemId)
            return "";
        switch (columnId) {
        case "pattern":
            return itemId;
        case "value":
            return /** @type {string} */ (this._entries.get(itemId));
        default:
            console.assert("Should not be reached.");
        }
        return "";
    },

    /**
     * @param {?string} itemId
     * @param {!Object} data
     * @return {!Array.<string>}
     */
    _patternValidate: function(itemId, data)
    {
        var regex;
        var oldPattern = itemId;
        var newPattern = data["pattern"];
        try {
            if (newPattern && (oldPattern === newPattern || !this._entries.has(newPattern)))
                regex = new RegExp(newPattern);
        } catch (e) {
        }
        return regex ? [] : ["pattern"];
    },

    /**
     * @param {?string} itemId
     * @param {!Object} data
     */
    _patternEdit: function(itemId, data)
    {
        var oldPattern = itemId;
        var newPattern = data["pattern"];
        if (!newPattern)
            return;
        var disabled = (data["value"] === this._disabledLabel);

        var patterns = WebInspector.moduleSetting("skipStackFramesPattern").getAsArray();
        for (var i = 0; i <= patterns.length; ++i) {
            if (i === patterns.length) {
                patterns.push({ pattern: newPattern, disabled: disabled });
                break;
            }
            if (patterns[i].pattern === oldPattern) {
                patterns[i] = { pattern: newPattern, disabled: disabled };
                break;
            }
        }
        WebInspector.moduleSetting("skipStackFramesPattern").setAsArray(patterns);

        if (oldPattern && oldPattern === newPattern) {
            this._entries.set(newPattern, disabled ? this._disabledLabel : this._blackboxLabel);
            this._patternsList.itemForId(oldPattern).classList.toggle("disabled", disabled);
            this._patternsList.refreshItem(newPattern);
            return;
        }

        if (oldPattern) {
            this._patternsList.removeItem(oldPattern);
            this._entries.remove(oldPattern);
        }
        this._addPattern(newPattern, disabled);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _patternRemovedFromList: function(event)
    {
        var pattern = /** @type{?string} */ (event.data);
        if (!pattern)
            return;
        this._entries.remove(pattern);

        var patterns = WebInspector.moduleSetting("skipStackFramesPattern").getAsArray();
        for (var i = 0; i < patterns.length; ++i) {
            if (patterns[i].pattern === pattern) {
                patterns.splice(i, 1);
                break;
            }
        }
        WebInspector.moduleSetting("skipStackFramesPattern").setAsArray(patterns);
    },

    /**
     * @param {string} pattern
     * @param {boolean=} disabled
     */
    _addPattern: function(pattern, disabled)
    {
        if (!pattern || this._entries.has(pattern))
            return;
        this._entries.set(pattern, disabled ? this._disabledLabel : this._blackboxLabel);
        var listItem = this._patternsList.addItem(pattern, null);
        listItem.classList.toggle("disabled", disabled);
    },

    __proto__: WebInspector.SettingsTab.prototype
}

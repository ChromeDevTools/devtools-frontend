// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {function(!Array<!WebInspector.NetworkConditionsGroup>):!Array<?WebInspector.NetworkManager.Conditions>} populateCallback
 * @param {function(number)} selectCallback
 */
WebInspector.NetworkConditionsSelector = function(populateCallback, selectCallback)
{
    this._populateCallback = populateCallback;
    this._selectCallback = selectCallback;
    this._customSetting = WebInspector.moduleSetting("customNetworkConditions");
    this._customSetting.addChangeListener(this._populateOptions, this);
    this._manager = WebInspector.multitargetNetworkManager;
    this._manager.addEventListener(WebInspector.MultitargetNetworkManager.Events.ConditionsChanged, this._conditionsChanged, this);
    this._populateOptions();
}

/** @typedef {!{title: string, items: !Array<!WebInspector.NetworkManager.Conditions>}} */
WebInspector.NetworkConditionsGroup;

/**
 * @param {number} throughput
 * @param {boolean=} plainText
 * @return {string}
 */
WebInspector.NetworkConditionsSelector._throughputText = function(throughput, plainText)
{
    if (throughput < 0)
        return "";
    var throughputInKbps = throughput / (1024 / 8);
    var delimiter = plainText ? "" : " ";
    if (throughputInKbps < 1024)
        return WebInspector.UIString("%d%skb/s", throughputInKbps, delimiter);
    if (throughputInKbps < 1024 * 10)
        return WebInspector.UIString("%.1f%sMb/s", throughputInKbps / 1024, delimiter);
    return WebInspector.UIString("%d%sMb/s", (throughputInKbps / 1024) | 0, delimiter);
}

/** @type {!Array.<!WebInspector.NetworkManager.Conditions>} */
WebInspector.NetworkConditionsSelector._presets = [
    WebInspector.NetworkManager.OfflineConditions,
    {title: "GPRS", download: 50 * 1024 / 8, upload: 20 * 1024 / 8, latency: 500},
    {title: "Regular 2G", download: 250 * 1024 / 8, upload: 50 * 1024 / 8, latency: 300},
    {title: "Good 2G", download: 450 * 1024 / 8, upload: 150 * 1024 / 8, latency: 150},
    {title: "Regular 3G", download: 750 * 1024 / 8, upload: 250 * 1024 / 8, latency: 100},
    {title: "Good 3G", download: 1.5 * 1024 * 1024 / 8, upload: 750 * 1024 / 8, latency: 40},
    {title: "Regular 4G", download: 4 * 1024 * 1024 / 8, upload: 3 * 1024 * 1024 / 8, latency: 20},
    {title: "DSL", download: 2 * 1024 * 1024 / 8, upload: 1 * 1024 * 1024 / 8, latency: 5},
    {title: "WiFi", download: 30 * 1024 * 1024 / 8, upload: 15 * 1024 * 1024 / 8, latency: 2}
];

/**
 * @param {!WebInspector.NetworkManager.Conditions} conditions
 * @param {boolean=} plainText
 * @return {!{text: string, title: string}}
 */
WebInspector.NetworkConditionsSelector._conditionsTitle = function(conditions, plainText)
{
    var downloadInKbps = conditions.download / (1024 / 8);
    var uploadInKbps = conditions.upload / (1024 / 8);
    var isThrottling = (downloadInKbps >= 0) || (uploadInKbps >= 0) || (conditions.latency > 0);
    var conditionTitle = WebInspector.UIString(conditions.title);
    if (!isThrottling)
        return {text: conditionTitle, title: conditionTitle};

    var downloadText = WebInspector.NetworkConditionsSelector._throughputText(conditions.download, plainText);
    var uploadText = WebInspector.NetworkConditionsSelector._throughputText(conditions.upload, plainText);
    var pattern = plainText ? "%s (%dms, %s, %s)" : "%s (%dms RTT, %s\u2b07, %s\u2b06)";
    var title = WebInspector.UIString(pattern, conditionTitle, conditions.latency, downloadText, uploadText);
    return {text: title, title: WebInspector.UIString("Maximum download throughput: %s.\r\nMaximum upload throughput: %s.\r\nMinimum round-trip time: %dms.", downloadText, uploadText, conditions.latency)};
}

WebInspector.NetworkConditionsSelector.prototype = {
    _populateOptions: function()
    {
        var customGroup = {title: WebInspector.UIString("Custom"), items: this._customSetting.get()};
        var presetsGroup = {title: WebInspector.UIString("Presets"), items: WebInspector.NetworkConditionsSelector._presets};
        var disabledGroup = {title: WebInspector.UIString("Disabled"), items: [WebInspector.NetworkManager.NoThrottlingConditions]};
        this._options = this._populateCallback([customGroup, presetsGroup, disabledGroup]);
        if (!this._conditionsChanged()) {
            for (var i = this._options.length - 1; i >= 0; i--) {
                if (this._options[i]) {
                    this.optionSelected(/** @type {!WebInspector.NetworkManager.Conditions} */ (this._options[i]));
                    break;
                }
            }
        }
    },

    revealAndUpdate: function()
    {
        WebInspector.Revealer.reveal(this._customSetting);
        this._conditionsChanged();
    },

    /**
     * @param {!WebInspector.NetworkManager.Conditions} conditions
     */
    optionSelected: function(conditions)
    {
        this._manager.setNetworkConditions(conditions);
    },

    /**
     * @return {boolean}
     */
    _conditionsChanged: function()
    {
        var value = this._manager.networkConditions();
        for (var index = 0; index < this._options.length; ++index) {
            var option = this._options[index];
            if (option && option.download === value.download && option.upload === value.upload && option.latency === value.latency && option.title === value.title) {
                this._selectCallback(index);
                return true;
            }
        }
        return false;
    }
}

/**
 * @param {!HTMLSelectElement} selectElement
 */
WebInspector.NetworkConditionsSelector.decorateSelect = function(selectElement)
{
    var options = [];
    var selector = new WebInspector.NetworkConditionsSelector(populate, select);
    selectElement.addEventListener("change", optionSelected, false);

    /**
     * @param {!Array.<!WebInspector.NetworkConditionsGroup>} groups
     * @return {!Array<?WebInspector.NetworkManager.Conditions>}
     */
    function populate(groups)
    {
        selectElement.removeChildren();
        options = [];
        for (var i = 0; i < groups.length; ++i) {
            var group = groups[i];
            var groupElement = selectElement.createChild("optgroup");
            groupElement.label = group.title;
            if (!i) {
                groupElement.appendChild(new Option(WebInspector.UIString("Add\u2026"), WebInspector.UIString("Add\u2026")));
                options.push(null);
            }
            for (var conditions of group.items) {
                var title = WebInspector.NetworkConditionsSelector._conditionsTitle(conditions, true);
                var option = new Option(title.text, title.text);
                option.title = title.title;
                groupElement.appendChild(option);
                options.push(conditions);
            }
        }
        return options;
    }

    function optionSelected()
    {
        if (selectElement.selectedIndex === 0)
            selector.revealAndUpdate();
        else
            selector.optionSelected(options[selectElement.selectedIndex]);
    }

    /**
     * @param {number} index
     */
    function select(index)
    {
        if (selectElement.selectedIndex !== index)
            selectElement.selectedIndex = index;
    }
}

/**
 * @return {!WebInspector.ToolbarMenuButton}
 */
WebInspector.NetworkConditionsSelector.createToolbarMenuButton = function()
{
    var button = new WebInspector.ToolbarMenuButton(appendItems);
    button.setGlyph("");
    button.turnIntoSelect();

    /** @type {!Array<?WebInspector.NetworkManager.Conditions>} */
    var options = [];
    var selectedIndex = -1;
    var selector = new WebInspector.NetworkConditionsSelector(populate, select);
    return button;

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     */
    function appendItems(contextMenu)
    {
        for (var index = 0; index < options.length; ++index) {
            var conditions = options[index];
            if (!conditions)
                contextMenu.appendSeparator();
            else
                contextMenu.appendCheckboxItem(WebInspector.NetworkConditionsSelector._conditionsTitle(conditions, true).text, selector.optionSelected.bind(selector, conditions), selectedIndex === index);
        }
        contextMenu.appendItem(WebInspector.UIString("Edit\u2026"), selector.revealAndUpdate.bind(selector));
    }

    /**
     * @param {!Array.<!WebInspector.NetworkConditionsGroup>} groups
     * @return {!Array<?WebInspector.NetworkManager.Conditions>}
     */
    function populate(groups)
    {
        options = [];
        for (var group of groups) {
            for (var conditions of group.items)
                options.push(conditions);
            options.push(null);
        }
        return options;
    }

    /**
     * @param {number} index
     */
    function select(index)
    {
        selectedIndex = index;
        button.setText(options[index].title);
    }
}

/**
 * @return {!WebInspector.ToolbarCheckbox}
 */
WebInspector.NetworkConditionsSelector.createOfflineToolbarCheckbox = function()
{
    var checkbox = new WebInspector.ToolbarCheckbox(WebInspector.UIString("Offline"), WebInspector.UIString("Force disconnected from network"), undefined, forceOffline);
    WebInspector.multitargetNetworkManager.addEventListener(WebInspector.MultitargetNetworkManager.Events.ConditionsChanged, networkConditionsChanged);
    checkbox.setChecked(WebInspector.multitargetNetworkManager.networkConditions() === WebInspector.NetworkManager.OfflineConditions);

    var lastNetworkConditions;

    function forceOffline()
    {
        if (checkbox.checked()) {
            lastNetworkConditions = WebInspector.multitargetNetworkManager.networkConditions();
            WebInspector.multitargetNetworkManager.setNetworkConditions(WebInspector.NetworkManager.OfflineConditions);
        } else {
            WebInspector.multitargetNetworkManager.setNetworkConditions(lastNetworkConditions);
        }
    }

    function networkConditionsChanged()
    {
        var conditions = WebInspector.multitargetNetworkManager.networkConditions();
        if (conditions !== WebInspector.NetworkManager.OfflineConditions)
            lastNetworkConditions = conditions;
        checkbox.setChecked(conditions === WebInspector.NetworkManager.OfflineConditions);
    }
    return checkbox;
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.ListWidget.Delegate}
 */
WebInspector.NetworkConditionsSettingsTab = function()
{
    WebInspector.VBox.call(this, true);
    this.registerRequiredCSS("components/networkConditionsSettingsTab.css");

    this.contentElement.createChild("div", "header").textContent = WebInspector.UIString("Network Throttling Profiles");

    var addButton = createTextButton(WebInspector.UIString("Add custom profile..."), this._addButtonClicked.bind(this), "add-conditions-button");
    this.contentElement.appendChild(addButton);

    this._list = new WebInspector.ListWidget(this);
    this._list.element.classList.add("conditions-list");
    this._list.registerRequiredCSS("components/networkConditionsSettingsTab.css");
    this._list.show(this.contentElement);

    this._customSetting = WebInspector.moduleSetting("customNetworkConditions");
    this._customSetting.addChangeListener(this._conditionsUpdated, this);

    this.setDefaultFocusedElement(addButton);
    this.contentElement.tabIndex = 0;
}

WebInspector.NetworkConditionsSettingsTab.prototype = {
    wasShown: function()
    {
        WebInspector.VBox.prototype.wasShown.call(this);
        this._conditionsUpdated();
    },

    _conditionsUpdated: function()
    {
        this._list.clear();

        var conditions = this._customSetting.get();
        for (var i = 0; i < conditions.length; ++i)
            this._list.appendItem(conditions[i], true);

        this._list.appendSeparator();

        conditions = WebInspector.NetworkConditionsSelector._presets;
        for (var i = 0; i < conditions.length; ++i)
            this._list.appendItem(conditions[i], false);
    },

    _addButtonClicked: function()
    {
        this._list.addNewItem(this._customSetting.get().length, {title: "", download: -1, upload: -1, latency: 0});
    },

    /**
     * @override
     * @param {*} item
     * @param {boolean} editable
     * @return {!Element}
     */
    renderItem: function(item, editable)
    {
        var conditions = /** @type {!WebInspector.NetworkManager.Conditions} */ (item);
        var element = createElementWithClass("div", "conditions-list-item");
        var title = element.createChild("div", "conditions-list-text conditions-list-title");
        var titleText = title.createChild("div", "conditions-list-title-text");
        titleText.textContent = conditions.title;
        titleText.title = conditions.title;
        element.createChild("div", "conditions-list-separator");
        element.createChild("div", "conditions-list-text").textContent = WebInspector.NetworkConditionsSelector._throughputText(conditions.download);
        element.createChild("div", "conditions-list-separator");
        element.createChild("div", "conditions-list-text").textContent = WebInspector.NetworkConditionsSelector._throughputText(conditions.upload);
        element.createChild("div", "conditions-list-separator");
        element.createChild("div", "conditions-list-text").textContent = WebInspector.UIString("%dms", conditions.latency);
        return element;
    },

    /**
     * @override
     * @param {*} item
     * @param {number} index
     */
    removeItemRequested: function(item, index)
    {
        var list = this._customSetting.get();
        list.splice(index, 1);
        this._customSetting.set(list);
    },

    /**
     * @override
     * @param {*} item
     * @param {!WebInspector.ListWidget.Editor} editor
     * @param {boolean} isNew
     */
    commitEdit: function(item, editor, isNew)
    {
        var conditions = /** @type {?WebInspector.NetworkManager.Conditions} */ (item);
        conditions.title = editor.control("title").value.trim();
        var download = editor.control("download").value.trim();
        conditions.download = download ? parseInt(download, 10) * (1024 / 8) : -1;
        var upload = editor.control("upload").value.trim();
        conditions.upload = upload ? parseInt(upload, 10) * (1024 / 8) : -1;
        var latency = editor.control("latency").value.trim();
        conditions.latency = latency ? parseInt(latency, 10) : 0;

        var list = this._customSetting.get();
        if (isNew)
            list.push(conditions);
        this._customSetting.set(list);
    },

    /**
     * @override
     * @param {*} item
     * @return {!WebInspector.ListWidget.Editor}
     */
    beginEdit: function(item)
    {
        var conditions = /** @type {?WebInspector.NetworkManager.Conditions} */ (item);
        var editor = this._createEditor();
        editor.control("title").value = conditions.title;
        editor.control("download").value = conditions.download <= 0 ? "" : String(conditions.download / (1024 / 8));
        editor.control("upload").value = conditions.upload <= 0 ? "" : String(conditions.upload / (1024 / 8));
        editor.control("latency").value = conditions.latency ? String(conditions.latency) : "";
        return editor;
    },

    /**
     * @return {!WebInspector.ListWidget.Editor}
     */
    _createEditor: function()
    {
        if (this._editor)
            return this._editor;

        var editor = new WebInspector.ListWidget.Editor();
        this._editor = editor;
        var content = editor.contentElement();

        var titles = content.createChild("div", "conditions-edit-row");
        titles.createChild("div", "conditions-list-text conditions-list-title").textContent = WebInspector.UIString("Profile Name");
        titles.createChild("div", "conditions-list-separator conditions-list-separator-invisible");
        titles.createChild("div", "conditions-list-text").textContent = WebInspector.UIString("Download");
        titles.createChild("div", "conditions-list-separator conditions-list-separator-invisible");
        titles.createChild("div", "conditions-list-text").textContent = WebInspector.UIString("Upload");
        titles.createChild("div", "conditions-list-separator conditions-list-separator-invisible");
        titles.createChild("div", "conditions-list-text").textContent = WebInspector.UIString("Latency");

        var fields = content.createChild("div", "conditions-edit-row");
        fields.createChild("div", "conditions-list-text conditions-list-title").appendChild(editor.createInput("title", "text", "", titleValidator));
        fields.createChild("div", "conditions-list-separator conditions-list-separator-invisible");

        var cell = fields.createChild("div", "conditions-list-text");
        cell.appendChild(editor.createInput("download", "text", WebInspector.UIString("kb/s"), throughputValidator));
        cell.createChild("div", "conditions-edit-optional").textContent = WebInspector.UIString("optional");
        fields.createChild("div", "conditions-list-separator conditions-list-separator-invisible");

        cell = fields.createChild("div", "conditions-list-text");
        cell.appendChild(editor.createInput("upload", "text", WebInspector.UIString("kb/s"), throughputValidator));
        cell.createChild("div", "conditions-edit-optional").textContent = WebInspector.UIString("optional");
        fields.createChild("div", "conditions-list-separator conditions-list-separator-invisible");

        cell = fields.createChild("div", "conditions-list-text");
        cell.appendChild(editor.createInput("latency", "text", WebInspector.UIString("ms"), latencyValidator));
        cell.createChild("div", "conditions-edit-optional").textContent = WebInspector.UIString("optional");

        return editor;

        /**
         * @param {*} item
         * @param {number} index
         * @param {!HTMLInputElement|!HTMLSelectElement} input
         * @return {boolean}
         */
        function titleValidator(item, index, input)
        {
            var value = input.value.trim();
            return value.length > 0 && value.length < 50;
        }

        /**
         * @param {*} item
         * @param {number} index
         * @param {!HTMLInputElement|!HTMLSelectElement} input
         * @return {boolean}
         */
        function throughputValidator(item, index, input)
        {
            var value = input.value.trim();
            return !value || (/^[\d]+(\.\d+)?|\.\d+$/.test(value) && value >= 0 && value <= 10000000);
        }

        /**
         * @param {*} item
         * @param {number} index
         * @param {!HTMLInputElement|!HTMLSelectElement} input
         * @return {boolean}
         */
        function latencyValidator(item, index, input)
        {
            var value = input.value.trim();
            return !value || (/^[\d]+$/.test(value) && value >= 0 && value <= 1000000);
        }
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.NetworkConditionsActionDelegate = function()
{
}

WebInspector.NetworkConditionsActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        if (actionId === "components.network-online") {
            WebInspector.multitargetNetworkManager.setNetworkConditions(WebInspector.NetworkManager.NoThrottlingConditions);
            return true;
        }
        if (actionId === "components.network-offline") {
            WebInspector.multitargetNetworkManager.setNetworkConditions(WebInspector.NetworkManager.OfflineConditions);
            return true;
        }
        return false;
    }
}

// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {function(!Array<!WebInspector.NetworkConditionsProfileGroup>):!Array<!{conditions: ?WebInspector.NetworkManager.Conditions}>} populateCallback
 * @param {function(number)} selectCallback
 */
WebInspector.NetworkConditionsSelector = function(populateCallback, selectCallback)
{
    this._populateCallback = populateCallback;
    this._selectCallback = selectCallback;
    this._customSetting = WebInspector.moduleSetting("networkConditionsCustomProfiles");
    this._customSetting.addChangeListener(this._populateOptions, this);
    this._manager = WebInspector.multitargetNetworkManager;
    this._manager.addEventListener(WebInspector.MultitargetNetworkManager.Events.ConditionsChanged, this._conditionsChanged, this);
    this._populateOptions();
}

/** @typedef {!{title: string, value: !WebInspector.NetworkManager.Conditions}} */
WebInspector.NetworkConditionsProfile;

/** @typedef {!{title: string, items: !Array<!WebInspector.NetworkConditionsProfile>}} */
WebInspector.NetworkConditionsProfileGroup;

/**
 * @param {number} throughput
 * @return {string}
 */
WebInspector.NetworkConditionsSelector._throughputText = function(throughput)
{
    if (throughput < 0)
        return "";
    var throughputInKbps = throughput / (1024 / 8);
    if (throughputInKbps < 1024)
        return WebInspector.UIString("%d kb/s", throughputInKbps);
    if (throughputInKbps < 1024 * 10)
        return WebInspector.UIString("%.1f Mb/s", throughputInKbps / 1024);
    return WebInspector.UIString("%d Mb/s", (throughputInKbps / 1024) | 0);
}

/** @type {!Array.<!WebInspector.NetworkConditionsProfile>} */
WebInspector.NetworkConditionsSelector._networkConditionsPresets = [
    {title: "Offline", value: {download: 0 * 1024 / 8, upload: 0 * 1024 / 8, latency: 0}},
    {title: "GPRS", value: {download: 50 * 1024 / 8, upload: 20 * 1024 / 8, latency: 500}},
    {title: "Regular 2G", value: {download: 250 * 1024 / 8, upload: 50 * 1024 / 8, latency: 300}},
    {title: "Good 2G", value: {download: 450 * 1024 / 8, upload: 150 * 1024 / 8, latency: 150}},
    {title: "Regular 3G", value: {download: 750 * 1024 / 8, upload: 250 * 1024 / 8, latency: 100}},
    {title: "Good 3G", value: {download: 1.5 * 1024 * 1024 / 8, upload: 750 * 1024 / 8, latency: 40}},
    {title: "Regular 4G", value: {download: 4 * 1024 * 1024 / 8, upload: 3 * 1024 * 1024 / 8, latency: 20}},
    {title: "DSL", value: {download: 2 * 1024 * 1024 / 8, upload: 1 * 1024 * 1024 / 8, latency: 5}},
    {title: "WiFi", value: {download: 30 * 1024 * 1024 / 8, upload: 15 * 1024 * 1024 / 8, latency: 2}}
];

/** @type {!WebInspector.NetworkConditionsProfile} */
WebInspector.NetworkConditionsSelector._disabledPreset = {title: "No throttling", value: {download: -1, upload: -1, latency: 0}};

/**
 * @param {!WebInspector.NetworkConditionsProfile} preset
 * @return {!{text: string, title: string}}
 */
WebInspector.NetworkConditionsSelector._profileTitle = function(preset)
{
    var downloadInKbps = preset.value.download / (1024 / 8);
    var uploadInKbps = preset.value.upload / (1024 / 8);
    var isThrottling = (downloadInKbps >= 0) || (uploadInKbps >= 0) || (preset.value.latency > 0);
    var presetTitle = WebInspector.UIString(preset.title);
    if (!isThrottling)
        return {text: presetTitle, title: presetTitle};

    var downloadText = WebInspector.NetworkConditionsSelector._throughputText(preset.value.download);
    var uploadText = WebInspector.NetworkConditionsSelector._throughputText(preset.value.upload);
    var title = WebInspector.UIString("%s (%s\u2b07 %s\u2b06 %dms RTT)", presetTitle, downloadText, uploadText, preset.value.latency);
    return {text: title, title: WebInspector.UIString("Maximum download throughput: %s.\r\nMaximum upload throughput: %s.\r\nMinimum round-trip time: %dms.", downloadText, uploadText, preset.value.latency)};
}

WebInspector.NetworkConditionsSelector.prototype = {
    _populateOptions: function()
    {
        var customGroup = {title: WebInspector.UIString("Custom"), items: this._customSetting.get()};
        var presetsGroup = {title: WebInspector.UIString("Presets"), items: WebInspector.NetworkConditionsSelector._networkConditionsPresets};
        var disabledGroup = {title: WebInspector.UIString("Disabled"), items: [WebInspector.NetworkConditionsSelector._disabledPreset]};
        this._options = this._populateCallback([customGroup, presetsGroup, disabledGroup]);
        this._conditionsChanged();
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

    _conditionsChanged: function()
    {
        var value = this._manager.networkConditions();
        for (var index = 0; index < this._options.length; ++index) {
            var option = this._options[index];
            if (!option.conditions)
                continue;
            if (option.conditions.download === value.download && option.conditions.upload === value.upload && option.conditions.latency === value.latency)
                this._selectCallback(index);
        }
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
     * @param {!Array.<!WebInspector.NetworkConditionsProfileGroup>} groups
     * @return {!Array<!{conditions: ?WebInspector.NetworkManager.Conditions}>}
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
                options.push({conditions: null});
            }
            for (var preset of group.items) {
                var title = WebInspector.NetworkConditionsSelector._profileTitle(preset);
                var option = new Option(title.text, title.text);
                option.title = title.title;
                groupElement.appendChild(option);
                options.push({conditions: preset.value});
            }
        }
        return options;
    }

    function optionSelected()
    {
        if (selectElement.selectedIndex === 0)
            selector.revealAndUpdate();
        else
            selector.optionSelected(options[selectElement.selectedIndex].conditions);
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

    /** @type {!Array<!{separator: boolean, text: string, title: string, conditions: !WebInspector.NetworkManager.Conditions}>} */
    var items = [];
    var selectedIndex = -1;
    var selector = new WebInspector.NetworkConditionsSelector(populate, select);
    return button;

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     */
    function appendItems(contextMenu)
    {
        for (var index = 0; index < items.length; ++index) {
            var item = items[index];
            if (item.separator)
                contextMenu.appendSeparator();
            else
                contextMenu.appendCheckboxItem(item.title, selector.optionSelected.bind(selector, item.conditions), selectedIndex === index);
        }
        contextMenu.appendItem(WebInspector.UIString("Edit\u2026"), selector.revealAndUpdate.bind(selector));
    }

    /**
     * @param {!Array.<!WebInspector.NetworkConditionsProfileGroup>} groups
     * @return {!Array<!{conditions: !WebInspector.NetworkManager.Conditions}>}
     */
    function populate(groups)
    {
        items = [];
        for (var group of groups) {
            for (var preset of group.items) {
                var title = WebInspector.NetworkConditionsSelector._profileTitle(preset);
                items.push({separator: false, text: preset.title, title: title.text, conditions: preset.value});
            }
            items.push({separator: true, text: "", title: "", conditions: null});
        }
        return /** @type {!Array<!{conditions: !WebInspector.NetworkManager.Conditions}>} */ (items);
    }

    /**
     * @param {number} index
     */
    function select(index)
    {
        selectedIndex = index;
        button.setText(items[index].text);
    }
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

    this._customSetting = WebInspector.moduleSetting("networkConditionsCustomProfiles");
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

        conditions = WebInspector.NetworkConditionsSelector._networkConditionsPresets;
        for (var i = 0; i < conditions.length; ++i)
            this._list.appendItem(conditions[i], false);
    },

    _addButtonClicked: function()
    {
        this._list.addNewItem(this._customSetting.get().length, {title: "", value: {download: -1, upload: -1, latency: 0}});
    },

    /**
     * @override
     * @param {*} item
     * @param {boolean} editable
     * @return {!Element}
     */
    renderItem: function(item, editable)
    {
        var conditions = /** @type {!WebInspector.NetworkConditionsProfile} */ (item);
        var element = createElementWithClass("div", "conditions-list-item");
        var title = element.createChild("div", "conditions-list-text conditions-list-title");
        var titleText = title.createChild("div", "conditions-list-title-text");
        titleText.textContent = conditions.title;
        titleText.title = conditions.title;
        element.createChild("div", "conditions-list-separator");
        element.createChild("div", "conditions-list-text").textContent = WebInspector.NetworkConditionsSelector._throughputText(conditions.value.download);
        element.createChild("div", "conditions-list-separator");
        element.createChild("div", "conditions-list-text").textContent = WebInspector.NetworkConditionsSelector._throughputText(conditions.value.upload);
        element.createChild("div", "conditions-list-separator");
        element.createChild("div", "conditions-list-text").textContent = WebInspector.UIString("%dms", conditions.value.latency);
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
        var conditions = /** @type {?WebInspector.NetworkConditionsProfile} */ (item);
        conditions.title = editor.control("title").value.trim();
        var download = editor.control("download").value.trim();
        conditions.value.download = download ? parseInt(download, 10) * (1024 / 8) : -1;
        var upload = editor.control("upload").value.trim();
        conditions.value.upload = upload ? parseInt(upload, 10) * (1024 / 8) : -1;
        var latency = editor.control("latency").value.trim();
        conditions.value.latency = latency ? parseInt(latency, 10) : 0;

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
        var conditions = /** @type {?WebInspector.NetworkConditionsProfile} */ (item);
        var editor = this._createEditor();
        editor.control("title").value = conditions.title;
        editor.control("download").value = conditions.value.download <= 0 ? "" : String(conditions.value.download / (1024 / 8));
        editor.control("upload").value = conditions.value.upload <= 0 ? "" : String(conditions.value.upload / (1024 / 8));
        editor.control("latency").value = conditions.value.latency ? String(conditions.value.latency) : "";
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

// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!HTMLSelectElement} selectElement
 */
WebInspector.NetworkConditionsSelector = function(selectElement)
{
    this._selectElement = selectElement;
    this._selectElement.addEventListener("change", this._optionSelected.bind(this), false);
    this._customSetting = WebInspector.moduleSetting("networkConditionsCustomProfiles");
    this._customSetting.addChangeListener(this._populateOptions, this);
    this._manager = WebInspector.multitargetNetworkManager;
    this._manager.addEventListener(WebInspector.MultitargetNetworkManager.Events.ConditionsChanged, this._conditionsChanged, this);
    this._populateOptions();
}

/** @typedef {!{title: string, value: !WebInspector.NetworkManager.Conditions}} */
WebInspector.NetworkConditionsProfile;

/**
 * @param {number} throughput
 * @return {string}
 */
WebInspector.NetworkConditionsSelector.throughputText = function(throughput)
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

WebInspector.NetworkConditionsSelector.prototype = {
    _populateOptions: function()
    {
        this._selectElement.removeChildren();

        var customGroup = this._addGroup(this._customSetting.get(), WebInspector.UIString("Custom"));
        customGroup.insertBefore(new Option(WebInspector.UIString("Add\u2026"), WebInspector.UIString("Add\u2026")), customGroup.firstChild);

        this._addGroup(WebInspector.NetworkConditionsSelector._networkConditionsPresets, WebInspector.UIString("Presets"));
        this._addGroup([WebInspector.NetworkConditionsSelector._disabledPreset], WebInspector.UIString("Disabled"));

        this._conditionsChanged();
    },

    /**
     * @param {!Array.<!WebInspector.NetworkConditionsProfile>} presets
     * @param {string} groupName
     * @return {!Element}
     */
    _addGroup: function(presets, groupName)
    {
        var groupElement = this._selectElement.createChild("optgroup");
        groupElement.label = groupName;
        for (var i = 0; i < presets.length; ++i) {
            var preset = presets[i];
            var downloadInKbps = preset.value.download / (1024 / 8);
            var uploadInKbps = preset.value.upload / (1024 / 8);
            var isThrottling = (downloadInKbps >= 0) || (uploadInKbps >= 0) || (preset.value.latency > 0);
            var option;
            var presetTitle = WebInspector.UIString(preset.title);
            if (!isThrottling) {
                option = new Option(presetTitle, presetTitle);
            } else {
                var downloadText = WebInspector.NetworkConditionsSelector.throughputText(preset.value.download);
                var uploadText = WebInspector.NetworkConditionsSelector.throughputText(preset.value.upload);
                var title = WebInspector.UIString("%s (%s\u2b07 %s\u2b06 %dms RTT)", presetTitle, downloadText, uploadText, preset.value.latency);
                option = new Option(title, presetTitle);
                option.title = WebInspector.UIString("Maximum download throughput: %s.\r\nMaximum upload throughput: %s.\r\nMinimum round-trip time: %dms.", downloadText, uploadText, preset.value.latency);
            }
            option.conditions = preset.value;
            groupElement.appendChild(option);
        }
        return groupElement;
    },

    _optionSelected: function()
    {
        if (this._selectElement.selectedIndex === 0) {
            WebInspector.Revealer.reveal(this._customSetting);
            this._conditionsChanged();
            return;
        }

        this._manager.removeEventListener(WebInspector.MultitargetNetworkManager.Events.ConditionsChanged, this._conditionsChanged, this);
        this._manager.setNetworkConditions(this._selectElement.options[this._selectElement.selectedIndex].conditions);
        this._manager.addEventListener(WebInspector.MultitargetNetworkManager.Events.ConditionsChanged, this._conditionsChanged, this);
    },

    _conditionsChanged: function()
    {
        var value = this._manager.networkConditions();
        var options = this._selectElement.options;
        for (var index = 1; index < options.length; ++index) {
            var option = options[index];
            if (option.conditions.download === value.download && option.conditions.upload === value.upload && option.conditions.latency === value.latency)
                this._selectElement.selectedIndex = index;
        }
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
    this.registerRequiredCSS("network/networkConditionsSettingsTab.css");

    this.contentElement.createChild("div", "header").textContent = WebInspector.UIString("Network Throttling Profiles");

    var addButton = createTextButton(WebInspector.UIString("Add custom profile..."), this._addButtonClicked.bind(this), "add-conditions-button");
    this.contentElement.appendChild(addButton);

    this._list = new WebInspector.ListWidget(this);
    this._list.element.classList.add("conditions-list");
    this._list.registerRequiredCSS("network/networkConditionsSettingsTab.css");
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
        element.createChild("div", "conditions-list-text").textContent = WebInspector.NetworkConditionsSelector.throughputText(conditions.value.download);
        element.createChild("div", "conditions-list-separator");
        element.createChild("div", "conditions-list-text").textContent = WebInspector.NetworkConditionsSelector.throughputText(conditions.value.upload);
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

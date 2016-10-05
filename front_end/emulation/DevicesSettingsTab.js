// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.ListWidget.Delegate}
 */
WebInspector.DevicesSettingsTab = function()
{
    WebInspector.VBox.call(this);
    this.element.classList.add("settings-tab-container");
    this.element.classList.add("devices-settings-tab");
    this.registerRequiredCSS("emulation/devicesSettingsTab.css");

    var header = this.element.createChild("header");
    header.createChild("h3").createTextChild(WebInspector.UIString("Emulated Devices"));
    this.containerElement = this.element.createChild("div", "help-container-wrapper").createChild("div", "settings-tab help-content help-container");

    var buttonsRow = this.containerElement.createChild("div", "devices-button-row");
    this._addCustomButton = createTextButton(WebInspector.UIString("Add custom device..."), this._addCustomDevice.bind(this));
    buttonsRow.appendChild(this._addCustomButton);

    this._list = new WebInspector.ListWidget(this);
    this._list.registerRequiredCSS("emulation/devicesSettingsTab.css");
    this._list.element.classList.add("devices-list");
    this._list.show(this.containerElement);

    this._muteUpdate = false;
    this._emulatedDevicesList = WebInspector.EmulatedDevicesList.instance();
    this._emulatedDevicesList.addEventListener(WebInspector.EmulatedDevicesList.Events.CustomDevicesUpdated, this._devicesUpdated, this);
    this._emulatedDevicesList.addEventListener(WebInspector.EmulatedDevicesList.Events.StandardDevicesUpdated, this._devicesUpdated, this);

    this.setDefaultFocusedElement(this._addCustomButton);
};

WebInspector.DevicesSettingsTab.prototype = {
    wasShown: function()
    {
        WebInspector.VBox.prototype.wasShown.call(this);
        this._devicesUpdated();
    },

    _devicesUpdated: function()
    {
        if (this._muteUpdate)
            return;

        this._list.clear();

        var devices = this._emulatedDevicesList.custom().slice();
        for (var i = 0; i < devices.length; ++i)
            this._list.appendItem(devices[i], true);

        this._list.appendSeparator();

        devices = this._emulatedDevicesList.standard().slice();
        devices.sort(WebInspector.EmulatedDevice.deviceComparator);
        for (var i = 0; i < devices.length; ++i)
            this._list.appendItem(devices[i], false);
    },

    /**
     * @param {boolean} custom
     */
    _muteAndSaveDeviceList: function(custom)
    {
        this._muteUpdate = true;
        if (custom)
            this._emulatedDevicesList.saveCustomDevices();
        else
            this._emulatedDevicesList.saveStandardDevices();
        this._muteUpdate = false;
    },

    _addCustomDevice: function()
    {
        var device = new WebInspector.EmulatedDevice();
        device.deviceScaleFactor = 0;
        device.horizontal.width = 700;
        device.horizontal.height = 400;
        device.vertical.width = 400;
        device.vertical.height = 700;
        this._list.addNewItem(this._emulatedDevicesList.custom().length, device);
    },

    /**
     * @param {number} value
     * @return {string}
     */
    _toNumericInputValue: function(value)
    {
        return value ? String(value) : "";
    },

    /**
     * @override
     * @param {*} item
     * @param {boolean} editable
     * @return {!Element}
     */
    renderItem: function(item, editable)
    {
        var device = /** @type {!WebInspector.EmulatedDevice} */ (item);
        var element = createElementWithClass("div", "devices-list-item");
        var checkbox = element.createChild("input", "devices-list-checkbox");
        checkbox.type = "checkbox";
        checkbox.checked = device.show();
        element.createChild("div", "devices-list-title").textContent = device.title;
        element.addEventListener("click", onItemClicked.bind(this), false);
        return element;

        /**
         * @param {!Event} event
         * @this {WebInspector.DevicesSettingsTab}
         */
        function onItemClicked(event)
        {
            var show = !checkbox.checked;
            device.setShow(show);
            this._muteAndSaveDeviceList(editable);
            checkbox.checked = show;
            event.consume();
        }
    },

    /**
     * @override
     * @param {*} item
     * @param {number} index
     */
    removeItemRequested: function(item, index)
    {
        this._emulatedDevicesList.removeCustomDevice(/** @type {!WebInspector.EmulatedDevice} */ (item));
    },

    /**
     * @override
     * @param {*} item
     * @param {!WebInspector.ListWidget.Editor} editor
     * @param {boolean} isNew
     */
    commitEdit: function(item, editor, isNew)
    {
        var device = /** @type {!WebInspector.EmulatedDevice} */ (item);
        device.title = editor.control("title").value.trim();
        device.vertical.width = editor.control("width").value ? parseInt(editor.control("width").value, 10) : 0;
        device.vertical.height = editor.control("height").value ? parseInt(editor.control("height").value, 10) : 0;
        device.horizontal.width = device.vertical.height;
        device.horizontal.height = device.vertical.width;
        device.deviceScaleFactor = editor.control("scale").value ? parseFloat(editor.control("scale").value) : 0;
        device.userAgent = editor.control("user-agent").value;
        device.modes = [];
        device.modes.push({title: "", orientation: WebInspector.EmulatedDevice.Vertical, insets: new Insets(0, 0, 0, 0), image: null});
        device.modes.push({title: "", orientation: WebInspector.EmulatedDevice.Horizontal, insets: new Insets(0, 0, 0, 0), image: null});
        device.capabilities = [];
        var uaType = editor.control("ua-type").value;
        if (uaType === WebInspector.DeviceModeModel.UA.Mobile || uaType === WebInspector.DeviceModeModel.UA.MobileNoTouch)
            device.capabilities.push(WebInspector.EmulatedDevice.Capability.Mobile);
        if (uaType === WebInspector.DeviceModeModel.UA.Mobile || uaType === WebInspector.DeviceModeModel.UA.DesktopTouch)
            device.capabilities.push(WebInspector.EmulatedDevice.Capability.Touch);
        if (isNew)
            this._emulatedDevicesList.addCustomDevice(device);
        else
            this._emulatedDevicesList.saveCustomDevices();
        this._addCustomButton.scrollIntoViewIfNeeded();
        this._addCustomButton.focus();
    },

    /**
     * @override
     * @param {*} item
     * @return {!WebInspector.ListWidget.Editor}
     */
    beginEdit: function(item)
    {
        var device = /** @type {!WebInspector.EmulatedDevice} */ (item);
        var editor = this._createEditor();
        editor.control("title").value = device.title;
        editor.control("width").value = this._toNumericInputValue(device.vertical.width);
        editor.control("height").value = this._toNumericInputValue(device.vertical.height);
        editor.control("scale").value = this._toNumericInputValue(device.deviceScaleFactor);
        editor.control("user-agent").value = device.userAgent;
        var uaType;
        if (device.mobile())
            uaType = device.touch() ? WebInspector.DeviceModeModel.UA.Mobile : WebInspector.DeviceModeModel.UA.MobileNoTouch;
        else
            uaType = device.touch() ? WebInspector.DeviceModeModel.UA.DesktopTouch : WebInspector.DeviceModeModel.UA.Desktop;
        editor.control("ua-type").value = uaType;
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

        var fields = content.createChild("div", "devices-edit-fields");
        fields.createChild("div", "hbox").appendChild(editor.createInput("title", "text", WebInspector.UIString("Device name"), titleValidator));
        var screen = fields.createChild("div", "hbox");
        screen.appendChild(editor.createInput("width", "text", WebInspector.UIString("Width"), sizeValidator));
        screen.appendChild(editor.createInput("height", "text", WebInspector.UIString("height"), sizeValidator));
        var dpr = editor.createInput("scale", "text", WebInspector.UIString("Device pixel ratio"), scaleValidator);
        dpr.classList.add("device-edit-fixed");
        screen.appendChild(dpr);
        var ua = fields.createChild("div", "hbox");
        ua.appendChild(editor.createInput("user-agent", "text", WebInspector.UIString("User agent string"), () => true));
        var uaType = editor.createSelect("ua-type", [WebInspector.DeviceModeModel.UA.Mobile, WebInspector.DeviceModeModel.UA.MobileNoTouch, WebInspector.DeviceModeModel.UA.Desktop, WebInspector.DeviceModeModel.UA.DesktopTouch], () => true);
        uaType.classList.add("device-edit-fixed");
        ua.appendChild(uaType);

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
        function sizeValidator(item, index, input)
        {
            return WebInspector.DeviceModeModel.deviceSizeValidator(input.value);
        }

        /**
         * @param {*} item
         * @param {number} index
         * @param {!HTMLInputElement|!HTMLSelectElement} input
         * @return {boolean}
         */
        function scaleValidator(item, index, input)
        {
            return WebInspector.DeviceModeModel.deviceScaleFactorValidator(input.value);
        }
    },

    __proto__: WebInspector.VBox.prototype
};

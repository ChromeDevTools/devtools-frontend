// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {!WebInspector.DeviceModeModel} model
 * @param {!WebInspector.Setting} showMediaInspectorSetting
 * @param {!WebInspector.Setting} showRulersSetting
 * @constructor
 */
WebInspector.DeviceModeToolbar = function(model, showMediaInspectorSetting, showRulersSetting)
{
    this._model = model;
    this._showMediaInspectorSetting = showMediaInspectorSetting;
    this._showRulersSetting = showRulersSetting;

    this._deviceOutlineSetting = this._model.deviceOutlineSetting();
    this._showDeviceScaleFactorSetting = WebInspector.settings.createSetting("emulation.showDeviceScaleFactor", false);
    this._showDeviceScaleFactorSetting.addChangeListener(this._updateDeviceScaleFactorVisibility, this);

    this._showUserAgentTypeSetting = WebInspector.settings.createSetting("emulation.showUserAgentType", false);
    this._showUserAgentTypeSetting.addChangeListener(this._updateUserAgentTypeVisibility, this);

    this._showNetworkConditionsSetting = WebInspector.settings.createSetting("emulation.showNetworkConditions", false);
    this._showNetworkConditionsSetting.addChangeListener(this._updateNetworkConditionsVisibility, this);

    /** @type {!Map<!WebInspector.EmulatedDevice, !WebInspector.EmulatedDevice.Mode>} */
    this._lastMode = new Map();

    this._element = createElementWithClass("div", "device-mode-toolbar");

    var leftContainer = this._element.createChild("div", "device-mode-toolbar-spacer");
    leftContainer.createChild("div", "device-mode-toolbar-spacer");
    var leftToolbar = new WebInspector.Toolbar("", leftContainer);
    leftToolbar.makeWrappable();
    this._fillLeftToolbar(leftToolbar);

    var mainToolbar = new WebInspector.Toolbar("", this._element);
    mainToolbar.makeWrappable();
    this._fillMainToolbar(mainToolbar);

    var rightContainer = this._element.createChild("div", "device-mode-toolbar-spacer");
    var rightToolbar = new WebInspector.Toolbar("device-mode-toolbar-fixed-size", rightContainer);
    rightToolbar.makeWrappable();
    this._fillRightToolbar(rightToolbar);
    var modeToolbar = new WebInspector.Toolbar("device-mode-toolbar-fixed-size", rightContainer);
    modeToolbar.makeWrappable();
    this._fillModeToolbar(modeToolbar);
    rightContainer.createChild("div", "device-mode-toolbar-spacer");
    var optionsToolbar = new WebInspector.Toolbar("", rightContainer);
    optionsToolbar.makeWrappable(true);
    this._fillOptionsToolbar(optionsToolbar);

    this._emulatedDevicesList = WebInspector.EmulatedDevicesList.instance();
    this._emulatedDevicesList.addEventListener(WebInspector.EmulatedDevicesList.Events.CustomDevicesUpdated, this._deviceListChanged, this);
    this._emulatedDevicesList.addEventListener(WebInspector.EmulatedDevicesList.Events.StandardDevicesUpdated, this._deviceListChanged, this);

    this._persistenceSetting = WebInspector.settings.createSetting("emulation.deviceModeValue", {device: "", orientation: "", mode: ""});
}

WebInspector.DeviceModeToolbar.prototype = {
    /**
     * @param {!WebInspector.Toolbar} toolbar
     */
    _fillLeftToolbar: function(toolbar)
    {
        toolbar.appendToolbarItem(this._wrapToolbarItem(createElementWithClass("div", "device-mode-empty-toolbar-element")));
        this._deviceSelectItem = new WebInspector.ToolbarMenuButton(this._appendDeviceMenuItems.bind(this));
        this._deviceSelectItem.setGlyph("");
        this._deviceSelectItem.turnIntoSelect(95);
        toolbar.appendToolbarItem(this._deviceSelectItem);
    },

    /**
     * @param {!WebInspector.Toolbar} toolbar
     */
    _fillMainToolbar: function(toolbar)
    {
        var widthInput = createElementWithClass("input", "device-mode-size-input");
        widthInput.maxLength = 4;
        widthInput.type = "text";
        widthInput.title = WebInspector.UIString("Width");
        this._updateWidthInput = WebInspector.bindInput(widthInput, applyWidth.bind(this), WebInspector.DeviceModeModel.deviceSizeValidator, true);
        this._widthInput = widthInput;
        this._widthItem = this._wrapToolbarItem(widthInput);
        toolbar.appendToolbarItem(this._widthItem);

        var xElement = createElementWithClass("div", "device-mode-x");
        xElement.textContent = "\u00D7";
        this._xItem = this._wrapToolbarItem(xElement);
        toolbar.appendToolbarItem(this._xItem);

        var heightInput = createElementWithClass("input", "device-mode-size-input");
        heightInput.maxLength = 4;
        heightInput.type = "text";
        heightInput.title = WebInspector.UIString("Height (leave empty for full)");
        this._updateHeightInput = WebInspector.bindInput(heightInput, applyHeight.bind(this), validateHeight, true);
        this._heightInput = heightInput;
        this._heightItem = this._wrapToolbarItem(heightInput);
        toolbar.appendToolbarItem(this._heightItem);

        /**
         * @param {string} value
         * @return {boolean}
         */
        function validateHeight(value)
        {
            return !value || WebInspector.DeviceModeModel.deviceSizeValidator(value);
        }

        /**
         * @param {string} value
         * @this {WebInspector.DeviceModeToolbar}
         */
        function applyWidth(value)
        {
            var width = value ? Number(value) : 0;
            this._model.setWidthAndScaleToFit(width);
        }

        /**
         * @param {string} value
         * @this {WebInspector.DeviceModeToolbar}
         */
        function applyHeight(value)
        {
            var height = value ? Number(value) : 0;
            this._model.setHeightAndScaleToFit(height);
        }
    },

    /**
     * @param {!WebInspector.Toolbar} toolbar
     */
    _fillRightToolbar: function(toolbar)
    {
        toolbar.appendToolbarItem(this._wrapToolbarItem(createElementWithClass("div", "device-mode-empty-toolbar-element")));
        this._scaleItem = new WebInspector.ToolbarMenuButton(this._appendScaleMenuItems.bind(this));
        this._scaleItem.setTitle(WebInspector.UIString("Zoom"));
        this._scaleItem.setGlyph("");
        this._scaleItem.turnIntoSelect();
        toolbar.appendToolbarItem(this._scaleItem);

        toolbar.appendToolbarItem(this._wrapToolbarItem(createElementWithClass("div", "device-mode-empty-toolbar-element")));
        this._deviceScaleItem = new WebInspector.ToolbarMenuButton(this._appendDeviceScaleMenuItems.bind(this));
        this._deviceScaleItem.setVisible(this._showDeviceScaleFactorSetting.get());
        this._deviceScaleItem.setTitle(WebInspector.UIString("Device pixel ratio"));
        this._deviceScaleItem.setGlyph("");
        this._deviceScaleItem.turnIntoSelect();
        this._deviceScaleItem.element.style.padding = "0 5px";
        toolbar.appendToolbarItem(this._deviceScaleItem);

        toolbar.appendToolbarItem(this._wrapToolbarItem(createElementWithClass("div", "device-mode-empty-toolbar-element")));
        this._uaItem = new WebInspector.ToolbarMenuButton(this._appendUserAgentMenuItems.bind(this));
        this._uaItem.setVisible(this._showUserAgentTypeSetting.get());
        this._uaItem.setTitle(WebInspector.UIString("Device type"));
        this._uaItem.setGlyph("");
        this._uaItem.turnIntoSelect();
        this._uaItem.element.style.padding = "0 5px";
        toolbar.appendToolbarItem(this._uaItem);
    },

    /**
     * @param {!WebInspector.Toolbar} toolbar
     */
    _fillModeToolbar: function(toolbar)
    {
        toolbar.appendToolbarItem(this._wrapToolbarItem(createElementWithClass("div", "device-mode-empty-toolbar-element")));
        this._modeButton = new WebInspector.ToolbarButton("", "rotate-screen-toolbar-item");
        this._modeButton.addEventListener("click", this._modeMenuClicked, this);
        toolbar.appendToolbarItem(this._modeButton);
    },

    /**
     * @param {!WebInspector.Toolbar} toolbar
     */
    _fillOptionsToolbar: function(toolbar)
    {
        this._networkConditionsItem = WebInspector.NetworkConditionsSelector.createToolbarMenuButton();
        this._networkConditionsItem.setVisible(this._showNetworkConditionsSetting.get());
        this._networkConditionsItem.setTitle(WebInspector.UIString("Network throttling"));
        this._networkConditionsItem.element.style.padding = "0 5px";
        this._networkConditionsItem.element.style.maxWidth = "140px";
        toolbar.appendToolbarItem(this._networkConditionsItem);

        var moreOptionsButton = new WebInspector.ToolbarMenuButton(this._appendOptionsMenuItems.bind(this));
        moreOptionsButton.setTitle(WebInspector.UIString("More options"));
        toolbar.appendToolbarItem(moreOptionsButton);

        toolbar.appendToolbarItem(this._wrapToolbarItem(createElementWithClass("div", "device-mode-empty-toolbar-element")));
    },


    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     */
    _appendScaleMenuItems: function(contextMenu)
    {
        var scaleSetting = this._model.scaleSetting();
        if (this._model.type() === WebInspector.DeviceModeModel.Type.Device) {
            contextMenu.appendItem(WebInspector.UIString("Fit to window (%.0f%%)", this._model.fitScale() * 100), scaleSetting.set.bind(scaleSetting, this._model.fitScale()), false);
            contextMenu.appendSeparator();
        }
        appendScaleItem(WebInspector.UIString("50%"), 0.5);
        appendScaleItem(WebInspector.UIString("75%"), 0.75);
        appendScaleItem(WebInspector.UIString("100%"), 1);
        appendScaleItem(WebInspector.UIString("125%"), 1.25);
        appendScaleItem(WebInspector.UIString("150%"), 1.5);

        /**
         * @param {string} title
         * @param {number} value
         */
        function appendScaleItem(title, value)
        {
            contextMenu.appendCheckboxItem(title, scaleSetting.set.bind(scaleSetting, value), scaleSetting.get() === value, false);
        }
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     */
    _appendDeviceScaleMenuItems: function(contextMenu)
    {
        var deviceScaleFactorSetting = this._model.deviceScaleFactorSetting();
        var defaultValue = this._model.uaSetting().get() === WebInspector.DeviceModeModel.UA.Mobile || this._model.uaSetting().get() === WebInspector.DeviceModeModel.UA.MobileNoTouch ? WebInspector.DeviceModeModel.defaultMobileScaleFactor : window.devicePixelRatio;
        appendDeviceScaleFactorItem(WebInspector.UIString("Default: %.1f", defaultValue), 0);
        contextMenu.appendSeparator();
        appendDeviceScaleFactorItem(WebInspector.UIString("1"), 1);
        appendDeviceScaleFactorItem(WebInspector.UIString("2"), 2);
        appendDeviceScaleFactorItem(WebInspector.UIString("3"), 3);

        /**
         * @param {string} title
         * @param {number} value
         */
        function appendDeviceScaleFactorItem(title, value)
        {
            contextMenu.appendCheckboxItem(title, deviceScaleFactorSetting.set.bind(deviceScaleFactorSetting, value), deviceScaleFactorSetting.get() === value);
        }
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     */
    _appendUserAgentMenuItems: function(contextMenu)
    {
        var uaSetting = this._model.uaSetting();
        appendUAItem(WebInspector.DeviceModeModel.UA.Mobile, WebInspector.DeviceModeModel.UA.Mobile);
        appendUAItem(WebInspector.DeviceModeModel.UA.MobileNoTouch, WebInspector.DeviceModeModel.UA.MobileNoTouch);
        appendUAItem(WebInspector.DeviceModeModel.UA.Desktop, WebInspector.DeviceModeModel.UA.Desktop);
        appendUAItem(WebInspector.DeviceModeModel.UA.DesktopTouch, WebInspector.DeviceModeModel.UA.DesktopTouch);

        /**
         * @param {string} title
         * @param {!WebInspector.DeviceModeModel.UA} value
         */
        function appendUAItem(title, value)
        {
            contextMenu.appendCheckboxItem(title, uaSetting.set.bind(uaSetting, value), uaSetting.get() === value);
        }
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     */
    _appendOptionsMenuItems: function(contextMenu)
    {
        var submenu = contextMenu.appendSubMenuItem(WebInspector.UIString("Show"));
        submenu.appendCheckboxItem(WebInspector.UIString("Device pixel ratio"), this._toggleDeviceScaleFactor.bind(this), this._showDeviceScaleFactorSetting.get(), this._model.type() === WebInspector.DeviceModeModel.Type.None);
        submenu.appendCheckboxItem(WebInspector.UIString("Device type"), this._toggleUserAgentType.bind(this), this._showUserAgentTypeSetting.get(), this._model.type() === WebInspector.DeviceModeModel.Type.None);
        submenu.appendCheckboxItem(WebInspector.UIString("Network throttling"), this._toggleNetworkConditions.bind(this), this._showNetworkConditionsSetting.get(), this._model.type() === WebInspector.DeviceModeModel.Type.None);
        submenu.appendCheckboxItem(WebInspector.UIString("Media queries"), this._toggleMediaInspector.bind(this), this._showMediaInspectorSetting.get(), this._model.type() === WebInspector.DeviceModeModel.Type.None);
        submenu.appendCheckboxItem(WebInspector.UIString("Rulers"), this._toggleRulers.bind(this), this._showRulersSetting.get(), this._model.type() === WebInspector.DeviceModeModel.Type.None);
        if (Runtime.experiments.isEnabled("deviceFrames")) {
            contextMenu.appendCheckboxItem(WebInspector.UIString("Show device frame"), this._toggleDeviceFrames.bind(this), this._deviceOutlineSetting.get() && this._model.outlineImage() !== "", (this._model.type() === WebInspector.DeviceModeModel.Type.None || this._model.outlineImage() === ""));
        }
        contextMenu.appendSeparator();
        contextMenu.appendItemsAtLocation("deviceModeMenu");
        contextMenu.appendSeparator();
        contextMenu.appendItem(WebInspector.UIString("Reset to defaults"), this._reset.bind(this));
    },

    _toggleDeviceScaleFactor: function()
    {
        this._showDeviceScaleFactorSetting.set(!this._showDeviceScaleFactorSetting.get());
    },

    _toggleDeviceFrames: function()
    {
        this._deviceOutlineSetting.set(!this._deviceOutlineSetting.get());
    },

    _toggleUserAgentType: function()
    {
        this._showUserAgentTypeSetting.set(!this._showUserAgentTypeSetting.get());
    },

    _toggleMediaInspector: function()
    {
        this._showMediaInspectorSetting.set(!this._showMediaInspectorSetting.get());
    },

    _toggleRulers: function()
    {
        this._showRulersSetting.set(!this._showRulersSetting.get());
    },

    _toggleNetworkConditions: function()
    {
        this._showNetworkConditionsSetting.set(!this._showNetworkConditionsSetting.get());
    },

    _reset: function()
    {
        this._showDeviceScaleFactorSetting.set(false);
        this._showUserAgentTypeSetting.set(false);
        this._showMediaInspectorSetting.set(false);
        this._showRulersSetting.set(false);
        this._showNetworkConditionsSetting.set(false);
        this._model.reset();
    },

    /**
     * @param {!Element} element
     * @return {!WebInspector.ToolbarItem}
     */
    _wrapToolbarItem: function(element)
    {
        var container = createElement("div");
        var shadowRoot = WebInspector.createShadowRootWithCoreStyles(container, "emulation/deviceModeToolbar.css");
        shadowRoot.appendChild(element);
        return new WebInspector.ToolbarItem(container);
    },

    /**
     * @param {!WebInspector.EmulatedDevice} device
     */
    _emulateDevice: function(device)
    {
        this._model.emulate(WebInspector.DeviceModeModel.Type.Device, device, this._lastMode.get(device) || device.modes[0]);
    },

    _switchToResponsive: function()
    {
        this._model.emulate(WebInspector.DeviceModeModel.Type.Responsive, null, null);
    },

    /**
     * @param {!Array<!WebInspector.EmulatedDevice>} devices
     * @return {!Array<!WebInspector.EmulatedDevice>}
     */
    _filterDevices: function(devices)
    {
        devices = devices.filter(function(d) { return d.show(); });
        devices.sort(WebInspector.EmulatedDevice.deviceComparator);
        return devices;
    },

    /**
     * @return {!Array<!WebInspector.EmulatedDevice>}
     */
    _standardDevices: function()
    {
        return this._filterDevices(this._emulatedDevicesList.standard());
    },

    /**
     * @return {!Array<!WebInspector.EmulatedDevice>}
     */
    _customDevices: function()
    {
        return this._filterDevices(this._emulatedDevicesList.custom());
    },

    /**
     * @return {!Array<!WebInspector.EmulatedDevice>}
     */
    _allDevices: function()
    {
        return this._standardDevices().concat(this._customDevices());
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     */
    _appendDeviceMenuItems: function(contextMenu)
    {
        contextMenu.appendCheckboxItem(WebInspector.UIString("Responsive"), this._switchToResponsive.bind(this), this._model.type() === WebInspector.DeviceModeModel.Type.Responsive, false);
        appendGroup.call(this, this._standardDevices());
        appendGroup.call(this, this._customDevices());
        contextMenu.appendSeparator();
        contextMenu.appendItem(WebInspector.UIString("Edit\u2026"), this._emulatedDevicesList.revealCustomSetting.bind(this._emulatedDevicesList), false);

        /**
         * @param {!Array<!WebInspector.EmulatedDevice>} devices
         * @this {WebInspector.DeviceModeToolbar}
         */
        function appendGroup(devices)
        {
            if (!devices.length)
                return;
            contextMenu.appendSeparator();
            for (var device of devices)
                contextMenu.appendCheckboxItem(device.title, this._emulateDevice.bind(this, device), this._model.device() === device, false);
        }
    },

    /**
     * @this {WebInspector.DeviceModeToolbar}
     */
    _deviceListChanged: function()
    {
        var device = this._model.device();
        if (!device)
            return;

        var devices = this._allDevices();
        if (devices.indexOf(device) === -1) {
            if (devices.length)
                this._emulateDevice(devices[0]);
            else
                this._model.emulate(WebInspector.DeviceModeModel.Type.Responsive, null, null);
        }
    },

    _updateDeviceScaleFactorVisibility: function()
    {
        this._deviceScaleItem.setVisible(this._showDeviceScaleFactorSetting.get());
    },

    _updateUserAgentTypeVisibility: function()
    {
        this._uaItem.setVisible(this._showUserAgentTypeSetting.get());
    },

    _updateNetworkConditionsVisibility: function()
    {
        this._networkConditionsItem.setVisible(this._showNetworkConditionsSetting.get());
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _modeMenuClicked: function(event)
    {
        var device = this._model.device();
        var model = this._model;

        if (device.modes.length === 2 && device.modes[0].orientation !== device.modes[1].orientation) {
            model.emulate(model.type(), model.device(), model.mode() === device.modes[0] ? device.modes[1] : device.modes[0]);
            return;
        }

        var contextMenu = new WebInspector.ContextMenu(/** @type {!Event} */ (event.data),
            false,
            event.target.element.totalOffsetLeft(),
            event.target.element.totalOffsetTop() + event.target.element.offsetHeight);
        addOrientation(WebInspector.EmulatedDevice.Vertical, WebInspector.UIString("Portrait"));
        addOrientation(WebInspector.EmulatedDevice.Horizontal, WebInspector.UIString("Landscape"));
        contextMenu.show();

        /**
         * @param {string} orientation
         * @param {string} title
         */
        function addOrientation(orientation, title)
        {
            var modes = device.modesForOrientation(orientation);
            if (!modes.length)
                return;
            if (modes.length === 1) {
                addMode(modes[0], title);
            } else {
                for (var index = 0; index < modes.length; index++)
                    addMode(modes[index], title + " \u2013 " + modes[index].title);
            }
        }

        /**
         * @param {!WebInspector.EmulatedDevice.Mode} mode
         * @param {string} title
         */
        function addMode(mode, title)
        {
            contextMenu.appendCheckboxItem(title, applyMode.bind(null, mode), model.mode() === mode, false);
        }

        /**
         * @param {!WebInspector.EmulatedDevice.Mode} mode
         */
        function applyMode(mode)
        {
            model.emulate(model.type(), model.device(), mode);
        }
    },

    /**
     * @return {!Element}
     */
    element: function()
    {
        return this._element;
    },

    update: function()
    {
        if (this._model.type() !== this._cachedModelType) {
            this._cachedModelType = this._model.type();
            this._widthInput.disabled = this._model.type() !== WebInspector.DeviceModeModel.Type.Responsive;
            this._heightInput.disabled = this._model.type() !== WebInspector.DeviceModeModel.Type.Responsive;
            this._deviceScaleItem.setEnabled(this._model.type() === WebInspector.DeviceModeModel.Type.Responsive);
            this._uaItem.setEnabled(this._model.type() === WebInspector.DeviceModeModel.Type.Responsive);
        }

        var size = this._model.appliedDeviceSize();
        this._updateHeightInput(this._model.type() === WebInspector.DeviceModeModel.Type.Responsive && this._model.isFullHeight() ? "" : String(size.height));
        this._updateWidthInput(String(size.width));
        this._heightInput.placeholder = size.height;

        if (this._model.scale() !== this._cachedScale) {
            this._scaleItem.setText(WebInspector.UIString("%.0f%%", this._model.scale() * 100));
            this._cachedScale = this._model.scale();
        }

        var deviceScale = this._model.appliedDeviceScaleFactor();
        if (deviceScale !== this._cachedDeviceScale) {
            this._deviceScaleItem.setText(WebInspector.UIString("DPR: %.1f", deviceScale));
            this._cachedDeviceScale = deviceScale;
        }

        var uaType = this._model.appliedUserAgentType();
        if (uaType !== this._cachedUaType) {
            this._uaItem.setText(uaType);
            this._cachedUaType = uaType;
        }

        var deviceItemTitle = WebInspector.UIString("None");
        if (this._model.type() === WebInspector.DeviceModeModel.Type.Responsive)
            deviceItemTitle = WebInspector.UIString("Responsive");
        if (this._model.type() === WebInspector.DeviceModeModel.Type.Device)
            deviceItemTitle = this._model.device().title;
        this._deviceSelectItem.setText(deviceItemTitle);

        if (this._model.device() !== this._cachedModelDevice) {
            var device = this._model.device();
            this._modeButton.setVisible(!!device);
            if (device) {
                var modeCount = device ? device.modes.length : 0;
                this._modeButton.setEnabled(modeCount >= 2);
                this._modeButton.setTitle(modeCount === 2 ? WebInspector.UIString("Rotate") : WebInspector.UIString("Screen options"));
            }
            this._cachedModelDevice = device;
        }

        if (this._model.type() === WebInspector.DeviceModeModel.Type.Device)
            this._lastMode.set(/** @type {!WebInspector.EmulatedDevice} */ (this._model.device()), /** @type {!WebInspector.EmulatedDevice.Mode} */ (this._model.mode()));

        if (this._model.mode() !== this._cachedModelMode && this._model.type() !== WebInspector.DeviceModeModel.Type.None) {
            this._cachedModelMode = this._model.mode();
            var value = this._persistenceSetting.get();
            if (this._model.device()) {
                value.device = this._model.device().title;
                value.orientation = this._model.mode() ? this._model.mode().orientation : "";
                value.mode = this._model.mode() ? this._model.mode().title : "";
            } else {
                value.device = "";
                value.orientation = "";
                value.mode = "";
            }
            this._persistenceSetting.set(value);
        }
    },

    restore: function()
    {
        for (var device of this._allDevices()) {
            if (device.title === this._persistenceSetting.get().device) {
                for (var mode of device.modes) {
                    if (mode.orientation === this._persistenceSetting.get().orientation && mode.title === this._persistenceSetting.get().mode) {
                        this._lastMode.set(device, mode);
                        this._emulateDevice(device);
                        return;
                    }
                }
            }
        }

        this._model.emulate(WebInspector.DeviceModeModel.Type.Responsive, null, null);
    }
}

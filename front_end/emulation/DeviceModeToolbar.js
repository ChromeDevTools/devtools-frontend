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

    WebInspector.emulatedDevicesList.addEventListener(WebInspector.EmulatedDevicesList.Events.CustomDevicesUpdated, this._deviceListChanged, this);
    WebInspector.emulatedDevicesList.addEventListener(WebInspector.EmulatedDevicesList.Events.StandardDevicesUpdated, this._deviceListChanged, this);

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
        this._uaItem = new WebInspector.ToolbarText();
        this._uaItem.setVisible(false);
        this._uaItem.setTitle(WebInspector.UIString("User agent type"));
        toolbar.appendToolbarItem(this._uaItem);

        this._deviceScaleItem = new WebInspector.ToolbarText();
        this._deviceScaleItem.setVisible(false);
        this._deviceScaleItem.setTitle(WebInspector.UIString("Device pixel ratio"));
        toolbar.appendToolbarItem(this._deviceScaleItem);

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
    _appendOptionsMenuItems: function(contextMenu)
    {
        var uaDisabled = this._model.type() !== WebInspector.DeviceModeModel.Type.Responsive;
        var uaSetting = this._model.uaSetting();
        var uaSubmenu = contextMenu.appendSubMenuItem(WebInspector.UIString("User agent type"), false);
        var uaValue = this._model.uaSetting().get();
        if (this._model.type() === WebInspector.DeviceModeModel.Type.None)
            uaValue = WebInspector.DeviceModeModel.UA.Desktop;
        if (this._model.type() === WebInspector.DeviceModeModel.Type.Device)
            uaValue = this._model.device().mobile() ? WebInspector.DeviceModeModel.UA.Mobile : this._model.device().touch() ? WebInspector.DeviceModeModel.UA.DesktopTouch : WebInspector.DeviceModeModel.UA.Desktop;
        appendUAItem(WebInspector.UIString("Mobile (default)"), WebInspector.DeviceModeModel.UA.Mobile);
        appendUAItem(WebInspector.UIString("Desktop"), WebInspector.DeviceModeModel.UA.Desktop);
        appendUAItem(WebInspector.UIString("Desktop with touch"), WebInspector.DeviceModeModel.UA.DesktopTouch);

        /**
         * @param {string} title
         * @param {!WebInspector.DeviceModeModel.UA} value
         */
        function appendUAItem(title, value)
        {
            uaSubmenu.appendCheckboxItem(title, uaSetting.set.bind(uaSetting, value), uaValue === value, uaDisabled);
        }

        var deviceScaleFactorDisabled = this._model.type() !== WebInspector.DeviceModeModel.Type.Responsive;
        var deviceScaleFactorSubmenu = contextMenu.appendSubMenuItem(WebInspector.UIString("Device pixel ratio"), false);
        var deviceScaleFactorSetting = this._model.deviceScaleFactorSetting();
        var deviceScaleFactorValue = deviceScaleFactorDisabled ? 0 : deviceScaleFactorSetting.get();
        appendDeviceScaleFactorItem(WebInspector.UIString("Default: %f", this._model.defaultDeviceScaleFactor()), 0);
        deviceScaleFactorSubmenu.appendSeparator();
        appendDeviceScaleFactorItem(WebInspector.UIString("1"), 1);
        appendDeviceScaleFactorItem(WebInspector.UIString("2"), 2);
        appendDeviceScaleFactorItem(WebInspector.UIString("3"), 3);

        /**
         * @param {string} title
         * @param {number} value
         */
        function appendDeviceScaleFactorItem(title, value)
        {
            deviceScaleFactorSubmenu.appendCheckboxItem(title, deviceScaleFactorSetting.set.bind(deviceScaleFactorSetting, value), deviceScaleFactorValue === value, deviceScaleFactorDisabled);
        }

        contextMenu.appendItem(WebInspector.UIString("Reset to defaults"), this._model.reset.bind(this._model), this._model.type() !== WebInspector.DeviceModeModel.Type.Responsive);
        contextMenu.appendSeparator();

        contextMenu.appendCheckboxItem(WebInspector.UIString("Show media queries"), this._toggleMediaInspector.bind(this), this._showMediaInspectorSetting.get(), this._model.type() === WebInspector.DeviceModeModel.Type.None);
        contextMenu.appendCheckboxItem(WebInspector.UIString("Show rulers"), this._toggleRulers.bind(this), this._showRulersSetting.get(), this._model.type() === WebInspector.DeviceModeModel.Type.None);
        contextMenu.appendItem(WebInspector.UIString("Configure network\u2026"), this._openNetworkConfig.bind(this), false);
        contextMenu.appendItemsAtLocation("deviceModeMenu");
    },

    _toggleMediaInspector: function()
    {
        this._showMediaInspectorSetting.set(!this._showMediaInspectorSetting.get());
    },

    _toggleRulers: function()
    {
        this._showRulersSetting.set(!this._showRulersSetting.get());
    },

    _openNetworkConfig: function()
    {
        InspectorFrontendHost.bringToFront();
        // TODO(dgozman): make it explicit.
        WebInspector.actionRegistry.action("network.show-config").execute();
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
        return this._filterDevices(WebInspector.emulatedDevicesList.standard());
    },

    /**
     * @return {!Array<!WebInspector.EmulatedDevice>}
     */
    _customDevices: function()
    {
        return this._filterDevices(WebInspector.emulatedDevicesList.custom());
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
        contextMenu.appendItem(WebInspector.UIString("Edit\u2026"), WebInspector.emulatedDevicesList.revealCustomSetting.bind(WebInspector.emulatedDevicesList), false);

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
        if (!this._model.device())
            return;

        var devices = this._allDevices();
        if (devices.indexOf(this._model.device()) === -1)
            this._emulateDevice(devices[0] || WebInspector.emulatedDevicesList.standard()[0]);
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
        }

        var size = this._model.appliedDeviceSize();
        this._updateHeightInput(this._model.type() === WebInspector.DeviceModeModel.Type.Responsive && this._model.isFullHeight() ? "" : String(size.height));
        this._updateWidthInput(String(size.width));
        this._heightInput.placeholder = size.height;

        if (this._model.scale() !== this._cachedScale) {
            this._scaleItem.setText(WebInspector.UIString("%.0f%%", this._model.scale() * 100));
            this._scaleItem.setState(this._model.scale() === 1 ? "off" : "on");
            this._cachedScale = this._model.scale();
        }

        var deviceScale = this._model.deviceScaleFactorSetting().get();
        this._deviceScaleItem.setVisible(this._model.type() === WebInspector.DeviceModeModel.Type.Responsive && !!deviceScale);
        if (deviceScale !== this._cachedDeviceScale) {
            this._deviceScaleItem.setText(WebInspector.UIString("DPR: %.1f", deviceScale));
            this._cachedDeviceScale = deviceScale;
        }

        var uaType = this._model.type() === WebInspector.DeviceModeModel.Type.Responsive ? this._model.uaSetting().get() : WebInspector.DeviceModeModel.UA.Mobile;
        this._uaItem.setVisible(this._model.type() === WebInspector.DeviceModeModel.Type.Responsive && uaType !== WebInspector.DeviceModeModel.UA.Mobile);
        if (uaType !== this._cachedUaType) {
            this._uaItem.setText(uaType === WebInspector.DeviceModeModel.UA.Desktop ? WebInspector.UIString("Desktop") : WebInspector.UIString("Touch"));
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

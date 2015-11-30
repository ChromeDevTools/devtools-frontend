// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.InspectedPagePlaceholder} inspectedPagePlaceholder
 */
WebInspector.DeviceModeView = function(inspectedPagePlaceholder)
{
    WebInspector.VBox.call(this, true);
    this.setMinimumSize(150, 150);
    this.element.classList.add("device-mode-view");
    this.registerRequiredCSS("emulation/deviceModeView.css");
    WebInspector.Tooltip.addNativeOverrideContainer(this.contentElement);

    this._model = new WebInspector.DeviceModeModel(this._updateUI.bind(this));
    this._mediaInspector = new WebInspector.MediaQueryInspector(this._model.widthSetting());
    // TODO(dgozman): remove CountUpdated event.
    this._showMediaInspectorSetting = WebInspector.settings.createSetting("showMediaQueryInspector", false);
    this._showMediaInspectorSetting.addChangeListener(this._updateUI, this);

    this._inspectedPagePlaceholder = inspectedPagePlaceholder;
    this._createUI();
    WebInspector.zoomManager.addEventListener(WebInspector.ZoomManager.Events.ZoomChanged, this._updateUI, this);
};

WebInspector.DeviceModeView.prototype = {
    _createUI: function()
    {
        this._toolbar = new WebInspector.DeviceModeView.Toolbar(this._model, this._showMediaInspectorSetting);
        this.contentElement.appendChild(this._toolbar.element());

        var contentClip = this.contentElement.createChild("div", "device-mode-content-clip vbox");
        this._mediaInspectorContainer = contentClip.createChild("div", "device-mode-media-container");
        this._contentArea = contentClip.createChild("div", "device-mode-content-area");

        this._screenArea = this._contentArea.createChild("div", "device-mode-screen-area");
        this._screenImage = this._screenArea.createChild("img", "device-mode-screen-image hidden");
        this._screenImage.addEventListener("load", this._onScreenImageLoaded.bind(this, true), false);
        this._screenImage.addEventListener("error", this._onScreenImageLoaded.bind(this, false), false);

        this._screenArea.appendChild(this._toolbar.screenOptionsElement());

        this._cornerResizerElement = this._screenArea.createChild("div", "device-mode-resizer device-mode-corner-resizer");
        this._cornerResizerElement.createChild("div", "");
        this._createResizer(this._cornerResizerElement, true, true);

        this._widthResizerElement = this._screenArea.createChild("div", "device-mode-resizer device-mode-width-resizer");
        this._widthResizerElement.createChild("div", "");
        this._createResizer(this._widthResizerElement, true, false);

        this._heightResizerElement = this._screenArea.createChild("div", "device-mode-resizer device-mode-height-resizer");
        this._heightResizerElement.createChild("div", "");
        this._createResizer(this._heightResizerElement, false, true);

        this._pageArea = this._screenArea.createChild("div", "device-mode-page-area");
        this._inspectedPagePlaceholder.clearMinimumSizeAndMargins();
        this._inspectedPagePlaceholder.show(this._pageArea);
    },

    /**
     * @param {!Element} element
     * @param {boolean} width
     * @param {boolean} height
     * @return {!WebInspector.ResizerWidget}
     */
    _createResizer: function(element, width, height)
    {
        var resizer = new WebInspector.ResizerWidget();
        resizer.addElement(element);
        resizer.setCursor(width && height ? "nwse-resize" : (width ? "ew-resize" : "ns-resize"));
        resizer.addEventListener(WebInspector.ResizerWidget.Events.ResizeStart, this._onResizeStart, this);
        resizer.addEventListener(WebInspector.ResizerWidget.Events.ResizeUpdate, this._onResizeUpdate.bind(this, width, height));
        resizer.addEventListener(WebInspector.ResizerWidget.Events.ResizeEnd, this._onResizeEnd, this);
        return resizer;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onResizeStart: function(event)
    {
        this._slowPositionStart = null;
        /** @type {!Size} */
        this._resizeStart = this._model.screenRect().size();
        this._model.suspendScaleChanges();
    },

    /**
     * @param {boolean} width
     * @param {boolean} height
     * @param {!WebInspector.Event} event
     */
    _onResizeUpdate: function(width, height, event)
    {
        if (event.data.shiftKey !== !!this._slowPositionStart)
            this._slowPositionStart = event.data.shiftKey ? {x: event.data.currentX, y: event.data.currentY} : null;

        var cssOffsetX = event.data.currentX - event.data.startX;
        var cssOffsetY = event.data.currentY - event.data.startY;
        if (this._slowPositionStart) {
            cssOffsetX = (event.data.currentX - this._slowPositionStart.x) / 10 + this._slowPositionStart.x - event.data.startX;
            cssOffsetY = (event.data.currentY - this._slowPositionStart.y) / 10 + this._slowPositionStart.y - event.data.startY;
        }

        if (width) {
            var dipOffsetX = cssOffsetX * WebInspector.zoomManager.zoomFactor();
            var newWidth = this._resizeStart.width + dipOffsetX * 2;
            newWidth = Math.round(newWidth / this._model.scale());
            newWidth = Math.max(Math.min(newWidth, WebInspector.DeviceModeModel.MaxDeviceSize), 1);
            this._model.widthSetting().set(newWidth);
        }

        if (height) {
            var dipOffsetY = cssOffsetY * WebInspector.zoomManager.zoomFactor();
            var newHeight = this._resizeStart.height + dipOffsetY;
            newHeight = Math.round(newHeight / this._model.scale());
            newHeight = Math.max(Math.min(newHeight, WebInspector.DeviceModeModel.MaxDeviceSize), 1);
            this._model.heightSetting().set(newHeight);
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onResizeEnd: function(event)
    {
        delete this._resizeStart;
        this._model.resumeScaleChanges();
    },

    updatePageResizer: function()
    {
        // TODO(dgozman): remove once we switch over.
    },

    _updateUI: function()
    {
        if (!this.isShowing())
            return;

        var zoomFactor = WebInspector.zoomManager.zoomFactor();
        var resizePagePlaceholder = false;
        var resizeSelf = false;

        var cssScreenRect = this._model.screenRect().scale(1 / zoomFactor);
        if (!cssScreenRect.isEqual(this._cachedCssScreenRect)) {
            this._screenArea.style.left = cssScreenRect.left + "px";
            this._screenArea.style.top = cssScreenRect.top + "px";
            this._screenArea.style.width = cssScreenRect.width + "px";
            this._screenArea.style.height = cssScreenRect.height + "px";
            resizePagePlaceholder = true;
            this._cachedCssScreenRect = cssScreenRect;
        }

        var cssVisiblePageRect = this._model.visiblePageRect().scale(1 / zoomFactor);
        if (!cssVisiblePageRect.isEqual(this._cachedCssVisiblePageRect)) {
            this._pageArea.style.left = cssVisiblePageRect.left + "px";
            this._pageArea.style.top = cssVisiblePageRect.top + "px";
            this._pageArea.style.width = cssVisiblePageRect.width + "px";
            this._pageArea.style.height = cssVisiblePageRect.height + "px";
            resizePagePlaceholder = true;
            this._cachedCssVisiblePageRect = cssVisiblePageRect;
        }

        var resizable = this._model.type() === WebInspector.DeviceModeModel.Type.Responsive;
        if (resizable !== this._cachedResizable) {
            this._widthResizerElement.classList.toggle("hidden", !resizable);
            this._heightResizerElement.classList.toggle("hidden", !resizable);
            this._cornerResizerElement.classList.toggle("hidden", !resizable);
            this._cachedResizable = resizable;
        }

        var mediaInspectorVisible = this._showMediaInspectorSetting.get() && this._model.type() !== WebInspector.DeviceModeModel.Type.None;
        if (mediaInspectorVisible !== this._cachedMediaInspectorVisible) {
            if (mediaInspectorVisible)
                this._mediaInspector.show(this._mediaInspectorContainer);
            else
                this._mediaInspector.detach();
            resizePagePlaceholder = true;
            resizeSelf = true;
            this._cachedMediaInspectorVisible = mediaInspectorVisible;
        }

        this._toolbar.update();
        this._loadScreenImage(this._model.screenImage());
        if (resizePagePlaceholder)
            this._inspectedPagePlaceholder.onResize();
        this._mediaInspector.setAxisTransform(-cssScreenRect.left / this._model.scale(), this._model.scale());
        if (resizeSelf)
            this.onResize();
    },

    /**
     * @param {string} srcset
     */
    _loadScreenImage: function(srcset)
    {
        if (this._screenImage.getAttribute("srcset") === srcset)
            return;
        this._screenImage.setAttribute("srcset", srcset);
        if (!srcset)
            this._screenImage.classList.toggle("hidden", true);
    },

    /**
     * @param {boolean} success
     */
    _onScreenImageLoaded: function(success)
    {
        this._screenImage.classList.toggle("hidden", !success);
    },

    /**
     * @override
     */
    onResize: function()
    {
        if (!this.isShowing())
            return;

        var zoomFactor = WebInspector.zoomManager.zoomFactor();
        var rect = this._contentArea.getBoundingClientRect();
        this._model.setAvailableSize(new Size(Math.max(rect.width * zoomFactor, 1), Math.max(rect.height * zoomFactor, 1)));
    },

    /**
     * @override
     */
    wasShown: function()
    {
        this._mediaInspector.setEnabled(true);
        this._toolbar.restore();
    },

    /**
     * @override
     */
    willHide: function()
    {
        this._mediaInspector.setEnabled(false);
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @param {!WebInspector.DeviceModeModel} model
 * @param {!WebInspector.Setting} showMediaInspectorSetting
 * @constructor
 */
WebInspector.DeviceModeView.Toolbar = function(model, showMediaInspectorSetting)
{
    WebInspector.DeviceModeView.Toolbar._instance = this;

    this._model = model;
    this._showMediaInspectorSetting = showMediaInspectorSetting;
    /** @type {!Map<!WebInspector.EmulatedDevice, !WebInspector.EmulatedDevice.Mode>} */
    this._lastMode = new Map();
    /** @type {?WebInspector.EmulatedDevice} */
    this._lastDevice = null;

    this._modeToolbar = new WebInspector.Toolbar("device-mode-screen-options");
    var modeButton = new WebInspector.ToolbarButton(WebInspector.UIString("Screen options"), "rotate-screen-toolbar-item");
    modeButton.addEventListener("click", this._modeMenuClicked, this);
    this._modeToolbar.appendToolbarItem(modeButton);

    this._element = createElementWithClass("div", "device-mode-toolbar");

    var buttonsToolbarContainer = this._element.createChild("div", "device-mode-buttons-toolbar");
    buttonsToolbarContainer.createChild("div", "flex-auto");
    var buttonsToolbar = new WebInspector.Toolbar("", buttonsToolbarContainer);
    this._noneItem = new WebInspector.ToolbarButton(WebInspector.UIString("Full"), "desktop-toolbar-item");
    buttonsToolbar.appendToolbarItem(this._noneItem);
    this._noneItem.addEventListener("click", this._noneButtonClick, this);
    this._responsiveItem = new WebInspector.ToolbarButton(WebInspector.UIString("Responsive"), "enter-fullscreen-toolbar-item");
    buttonsToolbar.appendToolbarItem(this._responsiveItem);
    this._responsiveItem.addEventListener("click", this._responsiveButtonClick, this);
    this._deviceItem = new WebInspector.ToolbarButton(WebInspector.UIString("Device"), "emulation-toolbar-item");
    buttonsToolbar.appendToolbarItem(this._deviceItem);
    this._deviceItem.addEventListener("click", this._deviceButtonClick, this);

    var optionsContainer = this._element.createChild("div", "device-mode-options-toolbar");
    var optionsToolbar = new WebInspector.Toolbar("", optionsContainer);
    optionsToolbar.appendSeparator();

    this._deviceSelect = this._createDeviceSelect();
    this._deviceSelectItem = this._wrapToolbarItem(this._deviceSelect);
    optionsToolbar.appendToolbarItem(this._deviceSelectItem);

    var widthInput = createElementWithClass("input", "device-mode-size-input");
    widthInput.maxLength = 5;
    widthInput.title = WebInspector.UIString("Width");
    WebInspector.SettingsUI.bindSettingInputField(widthInput, this._model.widthSetting(), true, WebInspector.DeviceModeModel.deviceSizeValidator, true);
    this._widthItem = this._wrapToolbarItem(widthInput);
    optionsToolbar.appendToolbarItem(this._widthItem);

    this._appliedWidthInput = createElementWithClass("input", "device-mode-size-input");
    this._appliedWidthInput.title = WebInspector.UIString("Width");
    this._appliedWidthInput.disabled = true;
    this._appliedWidthItem = this._wrapToolbarItem(this._appliedWidthInput);
    optionsToolbar.appendToolbarItem(this._appliedWidthItem);

    var xElement = createElementWithClass("div", "device-mode-x");
    xElement.textContent = "\u00D7";
    optionsToolbar.appendToolbarItem(this._wrapToolbarItem(xElement));

    var heightInput = createElementWithClass("input", "device-mode-size-input");
    heightInput.maxLength = 5;
    heightInput.title = WebInspector.UIString("Height");
    WebInspector.SettingsUI.bindSettingInputField(heightInput, this._model.heightSetting(), true, WebInspector.DeviceModeModel.deviceSizeValidator, true);
    this._heightItem = this._wrapToolbarItem(heightInput);
    optionsToolbar.appendToolbarItem(this._heightItem);

    this._appliedHeightInput = createElementWithClass("input", "device-mode-size-input");
    this._appliedHeightInput.title = WebInspector.UIString("Height");
    this._appliedHeightInput.disabled = true;
    this._appliedHeightItem = this._wrapToolbarItem(this._appliedHeightInput);
    optionsToolbar.appendToolbarItem(this._appliedHeightItem);

    this._deviceScaleFactorItem = new WebInspector.ToolbarText("", "resize-toolbar-item");
    this._deviceScaleFactorItem.element.title = WebInspector.UIString("Device pixel ratio");
    this._deviceScaleFactorItem.showGlyph();
    optionsToolbar.appendToolbarItem(this._deviceScaleFactorItem);

    optionsToolbar.appendSeparator();

    optionsToolbar.appendToolbarItem(new WebInspector.ToolbarMenuButton(WebInspector.UIString("More options"), "menu-toolbar-item", this._appendMenuItems.bind(this)));

    optionsContainer.createChild("div", "device-mode-toolbar-spacer");
    var rightToolbar = new WebInspector.Toolbar("", optionsContainer);
    this._scaleItem = new WebInspector.ToolbarText(WebInspector.UIString("Zoom"), "");
    this._scaleItem.makeDimmed();
    rightToolbar.appendToolbarItem(this._scaleItem);

    this._persistenceSetting = WebInspector.settings.createSetting("emulation.deviceModeViewPersistence", {type: WebInspector.DeviceModeModel.Type.None, device: "", orientation: "", mode: ""});
    this._restored = false;
}

/** @type {!WebInspector.DeviceModeView.Toolbar} */
WebInspector.DeviceModeView.Toolbar._instance;

WebInspector.DeviceModeView.Toolbar.prototype = {
    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     */
    _appendMenuItems: function(contextMenu)
    {
        var zoomDisabled = this._model.type() === WebInspector.DeviceModeModel.Type.None;
        var zoomSubmenu = contextMenu.appendSubMenuItem(WebInspector.UIString("Zoom"), false);
        var scaleSetting = this._model.scaleSetting();
        appendScaleItem(WebInspector.UIString("Fit"), 0);
        zoomSubmenu.appendSeparator();
        appendScaleItem(WebInspector.UIString("25%"), 0.25);
        appendScaleItem(WebInspector.UIString("50%"), 0.5);
        appendScaleItem(WebInspector.UIString("100%"), 1);
        appendScaleItem(WebInspector.UIString("150%"), 1.5);
        appendScaleItem(WebInspector.UIString("200%"), 2);

        /**
         * @param {string} title
         * @param {number} value
         */
        function appendScaleItem(title, value)
        {
            zoomSubmenu.appendCheckboxItem(title, scaleSetting.set.bind(scaleSetting, value), scaleSetting.get() === value, zoomDisabled);
        }

        var uaDisabled = this._model.type() !== WebInspector.DeviceModeModel.Type.Responsive;
        var uaSetting = this._model.uaSetting();
        var uaSubmenu = contextMenu.appendSubMenuItem(WebInspector.UIString("User agent type"), false);
        appendUAItem(WebInspector.UIString("Mobile"), WebInspector.DeviceModeModel.UA.Mobile);
        appendUAItem(WebInspector.UIString("Desktop"), WebInspector.DeviceModeModel.UA.Desktop);
        appendUAItem(WebInspector.UIString("Desktop with touch"), WebInspector.DeviceModeModel.UA.DesktopTouch);

        /**
         * @param {string} title
         * @param {!WebInspector.DeviceModeModel.UA} value
         */
        function appendUAItem(title, value)
        {
            uaSubmenu.appendCheckboxItem(title, uaSetting.set.bind(uaSetting, value), uaSetting.get() === value, uaDisabled);
        }

        var deviceScaleFactorDisabled = this._model.type() !== WebInspector.DeviceModeModel.Type.Responsive;
        var deviceScaleFactorSubmenu = contextMenu.appendSubMenuItem(WebInspector.UIString("Device pixel ratio"), false);
        var deviceScaleFactorSetting = this._model.deviceScaleFactorSetting();
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
            deviceScaleFactorSubmenu.appendCheckboxItem(title, deviceScaleFactorSetting.set.bind(deviceScaleFactorSetting, value), deviceScaleFactorSetting.get() === value, deviceScaleFactorDisabled);
        }

        contextMenu.appendItem(WebInspector.UIString("Reset to defaults"), this._model.reset.bind(this._model), this._model.type() !== WebInspector.DeviceModeModel.Type.Responsive);
        contextMenu.appendSeparator();

        contextMenu.appendCheckboxItem(WebInspector.UIString("Show media queries"), this._toggleMediaInspector.bind(this), this._showMediaInspectorSetting.get(), this._model.type() === WebInspector.DeviceModeModel.Type.None);
        contextMenu.appendItem(WebInspector.UIString("Configure network\u2026"), this._openNetworkConfig.bind(this), false);
    },

    _toggleMediaInspector: function()
    {
        this._showMediaInspectorSetting.set(!this._showMediaInspectorSetting.get());
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

    _noneButtonClick: function()
    {
        this._model.emulate(WebInspector.DeviceModeModel.Type.None, null, null);
    },

    _responsiveButtonClick: function()
    {
        this._model.emulate(WebInspector.DeviceModeModel.Type.Responsive, null, null);
    },

    _deviceButtonClick: function()
    {
        this._emulateDevice(this._lastDevice || this._deviceSelect.options[0].device || WebInspector.emulatedDevicesList.standard()[0]);
    },

    /**
     * @param {!WebInspector.EmulatedDevice} device
     */
    _emulateDevice: function(device)
    {
        this._model.emulate(WebInspector.DeviceModeModel.Type.Device, device, this._lastMode.get(device) || device.modes[0]);
    },

    /**
     * @return {!Element}
     */
    _createDeviceSelect: function()
    {
        var select = createElementWithClass("select", "device-mode-device-select");
        WebInspector.emulatedDevicesList.addEventListener(WebInspector.EmulatedDevicesList.Events.CustomDevicesUpdated, deviceListChanged, this);
        WebInspector.emulatedDevicesList.addEventListener(WebInspector.EmulatedDevicesList.Events.StandardDevicesUpdated, deviceListChanged, this);
        deviceListChanged.call(this);
        select.addEventListener("change", optionSelected.bind(this), false);
        return select;

        /**
         * @this {WebInspector.DeviceModeView.Toolbar}
         */
        function deviceListChanged()
        {
            select.removeChildren();

            var devicesGroup = select.createChild("optgroup");
            devicesGroup.label = WebInspector.UIString("Devices");
            addGroup.call(this, devicesGroup, WebInspector.emulatedDevicesList.standard());

            var customGroup = select.createChild("optgroup");
            customGroup.label = WebInspector.UIString("Custom");
            addGroup.call(this, customGroup, WebInspector.emulatedDevicesList.custom());
            var editCustomOption = new Option(WebInspector.UIString("Edit\u2026"), WebInspector.UIString("Edit\u2026"));
            editCustomOption.edit = true;
            customGroup.appendChild(editCustomOption);
        }

        /**
         * @param {!Element} parent
         * @param {!Array<!WebInspector.EmulatedDevice>} devices
         * @this {WebInspector.DeviceModeView.Toolbar}
         */
        function addGroup(parent, devices)
        {
            devices = devices.filter(function(d) { return d.show(); });
            devices.sort(WebInspector.EmulatedDevice.compareByTitle);
            for (var device of devices)
                addOption.call(this, parent, device);
        }

        /**
         * @param {!Element} parent
         * @param {!WebInspector.EmulatedDevice} device
         * @this {WebInspector.DeviceModeView.Toolbar}
         */
        function addOption(parent, device)
        {
            var option = new Option(device.title, device.title);
            option.device = device;
            parent.appendChild(option);

            if (device === this._model.device())
                select.selectedIndex = Array.prototype.slice.call(select.options).indexOf(option);
        }

        /**
         * @this {WebInspector.DeviceModeView.Toolbar}
         */
        function optionSelected()
        {
            var option = select.options[select.selectedIndex];
            if (option.edit) {
                WebInspector.emulatedDevicesList.revealCustomSetting();
                this._updateDeviceSelectedIndex();
            } else {
                this._emulateDevice(option.device);
            }
        }
    },

    _updateDeviceSelectedIndex: function()
    {
        for (var i = 0; i < this._deviceSelect.options.length; ++i) {
            if (this._deviceSelect.options[i].device === this._model.device())
                this._deviceSelect.selectedIndex = i;
        }
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

    /**
     * @return {!Element}
     */
    screenOptionsElement: function()
    {
        return this._modeToolbar.element;
    },

    update: function()
    {
        var updatePersistence = false;

        if (this._model.type() !== this._cachedModelType) {
            this._noneItem.setToggled(this._model.type() === WebInspector.DeviceModeModel.Type.None);
            this._responsiveItem.setToggled(this._model.type() === WebInspector.DeviceModeModel.Type.Responsive);
            this._deviceItem.setToggled(this._model.type() === WebInspector.DeviceModeModel.Type.Device);
            this._deviceSelectItem.setVisible(this._model.type() === WebInspector.DeviceModeModel.Type.Device);
            this._previousModelType = this._cachedModelType;
            this._cachedModelType = this._model.type();
            updatePersistence = true;
        }

        var resizable = this._model.type() === WebInspector.DeviceModeModel.Type.Responsive;
        if (resizable !== this._cachedResizable) {
            this._widthItem.setVisible(resizable);
            this._heightItem.setVisible(resizable);
            this._appliedWidthItem.setVisible(!resizable);
            this._appliedHeightItem.setVisible(!resizable);
            this._cachedResizable = resizable;
        }

        if (!resizable) {
            var width = this._model.appliedDeviceSize().width;
            if (width !== this._cachedWidth) {
                this._appliedWidthInput.value = width;
                this._cachedWidth = width;
            }
            var height = this._model.appliedDeviceSize().height;
            if (height !== this._cachedHeight) {
                this._appliedHeightInput.value = height;
                this._cachedHeight = height;
            }
        }

        var showDeviceScale = this._model.type() !== WebInspector.DeviceModeModel.Type.None &&
            (!!this._model.deviceScaleFactorSetting().get() || this._model.type() === WebInspector.DeviceModeModel.Type.Device);
        if (showDeviceScale !== this._cachedShowDeviceScale) {
            this._deviceScaleFactorItem.setVisible(showDeviceScale);
            this._cachedShowDeviceScale = showDeviceScale;
        }

        if (showDeviceScale) {
            var deviceScaleFactor = this._model.appliedDeviceScaleFactor();
            if (deviceScaleFactor !== this._cachedDeviceScaleFactor) {
                this._deviceScaleFactorItem.setText(String(deviceScaleFactor));
                this._cachedDeviceScaleFactor = deviceScaleFactor;
            }
        }

        var showScale = this._model.scale() !== 1;
        if (showScale !== this._cachedShowScale) {
            this._scaleItem.setVisible(showScale);
            this._cachedShowScale = showScale;
        }

        if (showScale) {
            var scale = this._model.scale();
            if (scale !== this._cachedScale) {
                this._scaleItem.setText(WebInspector.UIString("Zoom: %.2f", scale));
                this._cachedScale = scale;
            }
        }

        if (this._model.device() !== this._cachedModelDevice) {
            var device = this._model.device();

            var modeCount = device ? device.modes.length : 0;
            this._modeToolbar.element.classList.toggle("hidden", modeCount < 2);
            this._updateDeviceSelectedIndex();

            this._cachedModelDevice = device;
            updatePersistence = true;
        }

        if (this._model.type() === WebInspector.DeviceModeModel.Type.Device) {
            this._lastDevice = this._model.device();
            this._lastMode.set(/** @type {!WebInspector.EmulatedDevice} */ (this._model.device()), /** @type {!WebInspector.EmulatedDevice.Mode} */ (this._model.mode()));
        }

        if (this._model.mode() !== this._cachedModelMode) {
            this._cachedModelMode = this._model.mode();
            updatePersistence = true;
        }

        if (updatePersistence) {
            var value = this._persistenceSetting.get();
            value.type = this._cachedModelType;
            if (this._cachedModelDevice) {
                value.device = this._cachedModelDevice.title;
                value.orientation = this._cachedModelMode ? this._cachedModelMode.orientation : "";
                value.mode = this._cachedModelMode ? this._cachedModelMode.title : "";
            }
            this._persistenceSetting.set(value);
        }
    },

    restore: function()
    {
        if (this._restored)
            return;

        this._restored = true;

        for (var i = 0; i < this._deviceSelect.options.length; ++i) {
            if (this._deviceSelect.options[i].device && this._deviceSelect.options[i].device.title === this._persistenceSetting.get().device)
                this._lastDevice = this._deviceSelect.options[i].device;
        }
        if (this._lastDevice) {
            for (var i = 0; i < this._lastDevice.modes.length; ++i) {
                if (this._lastDevice.modes[i].orientation === this._persistenceSetting.get().orientation && this._lastDevice.modes[i].title === this._persistenceSetting.get().mode)
                    this._lastMode.set(this._lastDevice, this._lastDevice.modes[i]);
            }
        } else {
            this._model.emulate(WebInspector.DeviceModeModel.Type.None, null, null);
        }

        this._applyType(/** @type {!WebInspector.DeviceModeModel.Type} */ (this._persistenceSetting.get().type));
    },

    _toggleType: function()
    {
        this._applyType(this._model.type() === WebInspector.DeviceModeModel.Type.None ? (this._previousModelType || WebInspector.DeviceModeModel.Type.Responsive) : WebInspector.DeviceModeModel.Type.None);
    },

    /**
     * @param {!WebInspector.DeviceModeModel.Type} type
     */
    _applyType: function(type)
    {
        if (type === WebInspector.DeviceModeModel.Type.Responsive)
            this._responsiveButtonClick();
        else if (type === WebInspector.DeviceModeModel.Type.Device)
            this._deviceButtonClick();
        else
            this._noneButtonClick();
    }
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.DeviceModeView.ActionDelegate = function()
{
}

WebInspector.DeviceModeView.ActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        if (actionId === "emulation.toggle-device-mode" && WebInspector.DeviceModeView.Toolbar._instance) {
            WebInspector.DeviceModeView.Toolbar._instance._toggleType();
            return true;
        }
        return false;
    }
}

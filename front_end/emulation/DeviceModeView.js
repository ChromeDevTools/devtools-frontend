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
    // TODO(dgozman): better media inspector UI.
    this._mediaInspector.addEventListener(WebInspector.MediaQueryInspector.Events.HeightUpdated, this.onResize.bind(this));
    this._showMediaInspectorSetting = WebInspector.settings.createSetting("showMediaQueryInspector", false);
    this._showMediaInspectorSetting.addChangeListener(this._showMediaInspectorSettingChanged, this);

    this._inspectedPagePlaceholder = inspectedPagePlaceholder;
    this._createUI();
    this._updateMediaInspector();
    WebInspector.zoomManager.addEventListener(WebInspector.ZoomManager.Events.ZoomChanged, this._updateUI, this);
};

WebInspector.DeviceModeView.prototype = {
    _createUI: function()
    {
        this._toolbar = new WebInspector.DeviceModeView.Toolbar(this._model, this._showMediaInspectorSetting);
        this.contentElement.appendChild(this._toolbar.element());

        this._mediaInspectorContainer = this.contentElement.createChild("div", "device-mode-media-container");
        this._contentArea = this.contentElement.createChild("div", "device-mode-content-area");

        this._screenArea = this._contentArea.createChild("div", "device-mode-screen-area");
        this._screenImage = this._screenArea.createChild("img", "device-mode-screen-image hidden");
        this._screenImage.addEventListener("load", this._onScreenImageLoaded.bind(this, true), false);
        this._screenImage.addEventListener("error", this._onScreenImageLoaded.bind(this, false), false);

        this._screenArea.appendChild(this._toolbar.screenOptionsElement());

        this._resizerElement = this._screenArea.createChild("div", "device-mode-resizer");
        this._resizerElement.createChild("div", "");
        this._createResizer(this._resizerElement);

        this._pageArea = this._screenArea.createChild("div", "device-mode-page-area");
        this._inspectedPagePlaceholder.clearMinimumSizeAndMargins();
        this._inspectedPagePlaceholder.show(this._pageArea);
    },

    _showMediaInspectorSettingChanged: function()
    {
        this._updateMediaInspector();
        this.onResize();
    },

    _updateMediaInspector: function()
    {
        var show = this._showMediaInspectorSetting.get();
        if (this._mediaInspector.isShowing() && !show)
            this._mediaInspector.detach();
        if (!this._mediaInspector.isShowing() && show)
            this._mediaInspector.show(this._mediaInspectorContainer);
    },

    /**
     * @param {!Element} element
     * @return {!WebInspector.ResizerWidget}
     */
    _createResizer: function(element)
    {
        var resizer = new WebInspector.ResizerWidget();
        resizer.addElement(element);
        resizer.setCursor("ew-resize");
        resizer.addEventListener(WebInspector.ResizerWidget.Events.ResizeStart, this._onResizeStart, this);
        resizer.addEventListener(WebInspector.ResizerWidget.Events.ResizeUpdate, this._onResizeUpdate, this);
        resizer.addEventListener(WebInspector.ResizerWidget.Events.ResizeEnd, this._onResizeEnd, this);
        return resizer;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onResizeStart: function(event)
    {
        this._slowPositionStart = null;
        this._resizeStart = this._model.screenRect().width;
        this._model.suspendFitScaleChanges();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onResizeUpdate: function(event)
    {
        if (event.data.shiftKey !== !!this._slowPositionStart)
            this._slowPositionStart = event.data.shiftKey ? event.data.currentX : null;

        var cssOffset = event.data.currentX - event.data.startX;
        if (this._slowPositionStart)
            cssOffset = (event.data.currentX - this._slowPositionStart) / 10 + this._slowPositionStart - event.data.startX;
        var dipOffset = cssOffset * WebInspector.zoomManager.zoomFactor();

        var newWidth = this._resizeStart + dipOffset * 2;
        newWidth = Math.round(newWidth / this._model.fitScale());
        newWidth = Math.max(Math.min(newWidth, WebInspector.DeviceModeModel.MaxDeviceSize), 1);
        this._model.widthSetting().set(newWidth);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onResizeEnd: function(event)
    {
        delete this._resizeStart;
        this._model.resumeFitScaleChanges();
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

        var resizable = this._model.isResizable();
        if (resizable !== this._cachedResizable) {
            this._resizerElement.classList.toggle("hidden", !resizable);
            this._cachedResizable = resizable;
        }

        this._toolbar.update();
        this._loadScreenImage(this._model.screenImage());
        if (resizePagePlaceholder)
            this._inspectedPagePlaceholder.onResize();
        this._mediaInspector.setAxisTransform(-cssScreenRect.left / this._model.fitScale(), this._model.fitScale());
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
        var zoomFactor = WebInspector.zoomManager.zoomFactor();
        var rect = this._contentArea.getBoundingClientRect();
        this._model.availableSizeChanged(new Size(Math.max(rect.width * zoomFactor, 1), Math.max(rect.height * zoomFactor, 1)));
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
    this._model = model;
    this._showMediaInspectorSetting = showMediaInspectorSetting;
    /** @type {!Map<!WebInspector.EmulatedDevice, !WebInspector.EmulatedDevice.Mode>} */
    this._lastMode = new Map();
    /** @type {?WebInspector.EmulatedDevice} */
    this._lastDevice = null;

    this._modeToolbar = new WebInspector.Toolbar();
    this._modeToolbar.element.classList.add("device-mode-screen-options");
    var modeButton = new WebInspector.ToolbarButton(WebInspector.UIString("Screen options"), "rotate-screen-toolbar-item");
    modeButton.addEventListener("click", this._modeMenuClicked, this);
    this._modeToolbar.appendToolbarItem(modeButton);

    this._element = createElementWithClass("div", "device-mode-toolbar");

    var buttonsToolbarContainer = this._element.createChild("div", "device-mode-buttons-toolbar");
    buttonsToolbarContainer.createChild("div", "flex-auto");
    var buttonsToolbar = new WebInspector.Toolbar(buttonsToolbarContainer);
    this._desktopItem = new WebInspector.ToolbarButton(WebInspector.UIString("Desktop"), "desktop-toolbar-item");
    buttonsToolbar.appendToolbarItem(this._desktopItem);
    this._desktopItem.addEventListener("click", this._desktopButtonClick, this);
    this._mobileItem = new WebInspector.ToolbarButton(WebInspector.UIString("Mobile"), "emulation-toolbar-item");
    buttonsToolbar.appendToolbarItem(this._mobileItem);
    this._mobileItem.addEventListener("click", this._mobileButtonClick, this);

    this._optionsToolbar = new WebInspector.Toolbar(this._element);
    this._optionsToolbar.element.classList.add("device-mode-options-toolbar");
    this._optionsToolbar.appendSeparator();

    this._deviceSelect = this._createDeviceSelect();
    this._deviceSelectItem = this._wrapToolbarItem(this._deviceSelect);
    this._optionsToolbar.appendToolbarItem(this._deviceSelectItem);

    var widthInput = createElementWithClass("input", "device-mode-size-input");
    widthInput.maxLength = 5;
    widthInput.title = WebInspector.UIString("Width");
    WebInspector.SettingsUI.bindSettingInputField(widthInput, this._model.widthSetting(), true, WebInspector.DeviceModeModel.deviceSizeValidator, true);
    this._widthItem = this._wrapToolbarItem(widthInput);
    this._optionsToolbar.appendToolbarItem(this._widthItem);

    this._appliedWidthInput = createElementWithClass("input", "device-mode-size-input");
    this._appliedWidthInput.title = WebInspector.UIString("Width");
    this._appliedWidthInput.disabled = true;
    this._appliedWidthItem = this._wrapToolbarItem(this._appliedWidthInput);
    this._optionsToolbar.appendToolbarItem(this._appliedWidthItem);

    var xElement = createElementWithClass("div", "device-mode-x");
    xElement.textContent = "\u00D7";
    this._xItem = this._wrapToolbarItem(xElement);
    this._optionsToolbar.appendToolbarItem(this._xItem);

    this._appliedHeightInput = createElementWithClass("input", "device-mode-size-input");
    this._appliedHeightInput.title = WebInspector.UIString("Height");
    this._appliedHeightInput.disabled = true;
    this._appliedHeightItem = this._wrapToolbarItem(this._appliedHeightInput);
    this._optionsToolbar.appendToolbarItem(this._appliedHeightItem);

    this._deviceScaleFactorItem = new WebInspector.ToolbarText("", "fullscreen-toolbar-item");
    this._deviceScaleFactorItem.element.title = WebInspector.UIString("Device pixel ratio");
    this._deviceScaleFactorItem.showGlyph();
    this._optionsToolbar.appendToolbarItem(this._deviceScaleFactorItem);

    this._optionsToolbar.appendSeparator();

    this._optionsToolbar.appendToolbarItem(new WebInspector.ToolbarMenuButton(WebInspector.UIString("More options"), "menu-toolbar-item", this._appendMenuItems.bind(this)));

    this._persistenceSetting = WebInspector.settings.createSetting("emulation.deviceModeViewPersistence", {type: WebInspector.DeviceModeModel.Type.Desktop, device: "", orientation: "", mode: ""});
    this._restored = false;
}

WebInspector.DeviceModeView.Toolbar.prototype = {
    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     */
    _appendMenuItems: function(contextMenu)
    {
        var fitSetting = this._model.fitSetting();
        appendFitItem(WebInspector.UIString("Fit"), 0);
        appendFitItem(WebInspector.UIString("50%"), 0.5);
        appendFitItem(WebInspector.UIString("100%"), 1);
        appendFitItem(WebInspector.UIString("200%"), 2);

        /**
         * @param {string} title
         * @param {number} value
         */
        function appendFitItem(title, value)
        {
            contextMenu.appendCheckboxItem(title, fitSetting.set.bind(fitSetting, value), fitSetting.get() === value, false);
        }

        contextMenu.appendSeparator();

        contextMenu.appendCheckboxItem(WebInspector.UIString("Show media queries"), this._toggleMediaInspector.bind(this), this._showMediaInspectorSetting.get(), false);

        var submenu = contextMenu.appendSubMenuItem(WebInspector.UIString("Device pixel ratio"), false);
        if (this._model.type() === WebInspector.DeviceModeModel.Type.Device) {
            submenu.appendCheckboxItem(WebInspector.UIString("Default: %f", this._model.device().deviceScaleFactor), function(){}, true, false);
        } else {
            var deviceScaleFactorSetting = this._model.deviceScaleFactorSetting();

            /**
             * @param {string} title
             * @param {number} value
             */
            function appendScaleFactorItem(title, value)
            {
                submenu.appendCheckboxItem(title, deviceScaleFactorSetting.set.bind(deviceScaleFactorSetting, value), deviceScaleFactorSetting.get() === value, false);
            }

            appendScaleFactorItem(WebInspector.UIString("Default: %f", this._model.defaultDeviceScaleFactor()), 0);
            appendScaleFactorItem(WebInspector.UIString("1"), 1);
            appendScaleFactorItem(WebInspector.UIString("2"), 2);
            appendScaleFactorItem(WebInspector.UIString("3"), 3);
        }

        contextMenu.appendItem(WebInspector.UIString("Configure network\u2026"), this._openNetworkConfig.bind(this), false);

        if (this._model.type() !== WebInspector.DeviceModeModel.Type.Device)
            contextMenu.appendItem(WebInspector.UIString("Reset to default"), this._model.reset.bind(this._model), false);
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
        var shadowRoot = WebInspector.createShadowRootWithCoreStyles(container);
        shadowRoot.appendChild(WebInspector.Widget.createStyleElement("emulation/deviceModeToolbar.css"));
        shadowRoot.appendChild(element);
        return new WebInspector.ToolbarItem(container);
    },

    _desktopButtonClick: function()
    {
        this._model.emulate(WebInspector.DeviceModeModel.Type.Desktop, null, null);
    },

    _mobileButtonClick: function()
    {
        for (var i = 0; i < this._deviceSelect.options.length; ++i) {
            var option = this._deviceSelect.options[i];
            if (option.device === this._lastDevice) {
                this._emulateDeviceSelectOption(option);
                return;
            }
        }
        this._emulateDeviceSelectOption(this._deviceSelect.options[0]);
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

            var defaultGroup = select.createChild("optgroup");
            defaultGroup.label = WebInspector.UIString("Default");
            addOption.call(this, defaultGroup, WebInspector.DeviceModeModel.Type.Mobile, null, WebInspector.UIString("Responsive"));

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
                addOption.call(this, parent, WebInspector.DeviceModeModel.Type.Device, device, device.title);
        }

        /**
         * @param {!Element} parent
         * @param {!WebInspector.DeviceModeModel.Type} type
         * @param {?WebInspector.EmulatedDevice} device
         * @param {string} title
         * @this {WebInspector.DeviceModeView.Toolbar}
         */
        function addOption(parent, type, device, title)
        {
            var option = new Option(title, title);
            option.device = device;
            option.type = type;
            parent.appendChild(option);

            if (type === this._model.type() && device === this._model.device())
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
                this._emulateDeviceSelectOption(option);
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
     * @param {!Option} option
     */
    _emulateDeviceSelectOption: function(option)
    {
        this._model.emulate(option.type, option.device, option.device ? (this._lastMode.get(option.device) || option.device.modes[0]) : null);
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
            var isDesktop = this._model.type() === WebInspector.DeviceModeModel.Type.Desktop;
            this._desktopItem.setToggled(isDesktop);
            this._mobileItem.setToggled(!isDesktop);
            this._deviceSelectItem.setVisible(!isDesktop);
            this._cachedModelType = this._model.type();
            updatePersistence = true;
        }

        var resizable = this._model.isResizable();
        if (resizable !== this._cachedResizable) {
            this._widthItem.setVisible(resizable);
            this._cachedResizable = resizable;
        }

        var showWidth = this._model.type() === WebInspector.DeviceModeModel.Type.Device || (this._model.type() === WebInspector.DeviceModeModel.Type.Desktop && !resizable);
        if (showWidth !== this._cachedShowWidth) {
            this._appliedWidthItem.setVisible(showWidth);
            this._cachedShowWidth = showWidth;
        }

        if (showWidth) {
            var width = this._model.appliedDeviceSize().width;
            if (width !== this._cachedWidth) {
                this._appliedWidthInput.value = width;
                this._cachedWidth = width;
            }
        }

        var showHeight = true;
        if (showHeight !== this._cachedShowHeight) {
            this._appliedHeightItem.setVisible(showHeight);
            this._xItem.setVisible(showHeight);
            this._cachedShowHeight = showHeight;
        }

        if (showHeight) {
            var height = this._model.appliedDeviceSize().height;
            if (height !== this._cachedHeight) {
                this._appliedHeightInput.value = height;
                this._cachedHeight = height;
            }
        }

        var showDeviceScale = !!this._model.deviceScaleFactorSetting().get() || this._model.type() === WebInspector.DeviceModeModel.Type.Device;
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

        if (this._model.device() !== this._cachedModelDevice) {
            var device = this._model.device();

            var modeCount = device ? device.modes.length : 0;
            this._modeToolbar.element.classList.toggle("hidden", modeCount < 2);
            this._updateDeviceSelectedIndex();

            this._cachedModelDevice = device;
            updatePersistence = true;
        }

        if (this._model.device() && this._model.mode())
            this._lastMode.set(/** @type {!WebInspector.EmulatedDevice} */ (this._model.device()), /** @type {!WebInspector.EmulatedDevice.Mode} */ (this._model.mode()));

        if (this._model.type() !== WebInspector.DeviceModeModel.Type.Desktop)
            this._lastDevice = this._model.device();

        if (this._model.mode() !== this._cachedModelMode) {
            this._cachedModelMode = this._model.mode();
            updatePersistence = true;
        }

        if (updatePersistence) {
            this._persistenceSetting.set({
                type: this._cachedModelType,
                device: this._cachedModelDevice ? this._cachedModelDevice.title : "",
                orientation: this._cachedModelMode ? this._cachedModelMode.orientation : "",
                mode: this._cachedModelMode ? this._cachedModelMode.title : ""
            });
        }
    },

    restore: function()
    {
        if (this._restored)
            return;

        this._restored = true;
        var type = this._persistenceSetting.get().type;
        if (type === WebInspector.DeviceModeModel.Type.Mobile) {
            this._model.emulate(WebInspector.DeviceModeModel.Type.Mobile, null, null);
        } else if (type === WebInspector.DeviceModeModel.Type.Device) {
            var device = null;
            for (var i = 0; i < this._deviceSelect.options.length; ++i) {
                if (this._deviceSelect.options[i].device && this._deviceSelect.options[i].device.title === this._persistenceSetting.get().device)
                    device = this._deviceSelect.options[i].device;
            }
            if (device) {
                var mode = null;
                for (var i = 0; i < device.modes.length; ++i) {
                    if (device.modes[i].orientation === this._persistenceSetting.get().orientation && device.modes[i].title === this._persistenceSetting.get().mode)
                        mode = device.modes[i];
                }
                this._model.emulate(WebInspector.DeviceModeModel.Type.Device, device, mode || device.modes[0]);
            } else {
                this._model.emulate(WebInspector.DeviceModeModel.Type.Mobile, null, null);
            }
        } else {
            this._model.emulate(WebInspector.DeviceModeModel.Type.Desktop, null, null);
        }
    }
}

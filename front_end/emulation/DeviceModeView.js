// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.DeviceModeView = function()
{
    WebInspector.VBox.call(this, true);
    this.setMinimumSize(150, 150);
    this.element.classList.add("device-mode-view");
    this.registerRequiredCSS("emulation/deviceModeView.css");
    WebInspector.Tooltip.addNativeOverrideContainer(this.contentElement);

    this._model = new WebInspector.DeviceModeModel(this._updateUI.bind(this));
    this._mediaInspector = new WebInspector.MediaQueryInspector(() => this._model.appliedDeviceSize().width, this._model.setWidth.bind(this._model));
    // TODO(dgozman): remove CountUpdated event.
    this._showMediaInspectorSetting = WebInspector.settings.createSetting("showMediaQueryInspector", false);
    this._showMediaInspectorSetting.addChangeListener(this._updateUI, this);
    this._showRulersSetting = WebInspector.settings.createSetting("emulation.showRulers", false);
    this._showRulersSetting.addChangeListener(this._updateUI, this);

    this._topRuler = new WebInspector.DeviceModeView.Ruler(true, this._model.setWidth.bind(this._model));
    this._topRuler.element.classList.add("device-mode-ruler-top");
    this._leftRuler = new WebInspector.DeviceModeView.Ruler(false, this._model.setHeight.bind(this._model));
    this._leftRuler.element.classList.add("device-mode-ruler-left");
    this._createUI();
    WebInspector.zoomManager.addEventListener(WebInspector.ZoomManager.Events.ZoomChanged, this._zoomChanged, this);
};

WebInspector.DeviceModeView.prototype = {
    _createUI: function()
    {
        this._toolbar = new WebInspector.DeviceModeView.Toolbar(this._model, this._showMediaInspectorSetting, this._showRulersSetting);
        this.contentElement.appendChild(this._toolbar.element());

        this._contentClip = this.contentElement.createChild("div", "device-mode-content-clip vbox");
        this._responsivePresetsContainer = this._contentClip.createChild("div", "device-mode-presets-container");
        this._populatePresetsContainer();
        this._mediaInspectorContainer = this._contentClip.createChild("div", "device-mode-media-container");
        this._contentArea = this._contentClip.createChild("div", "device-mode-content-area");

        this._screenArea = this._contentArea.createChild("div", "device-mode-screen-area");
        this._screenImage = this._screenArea.createChild("img", "device-mode-screen-image hidden");
        this._screenImage.addEventListener("load", this._onScreenImageLoaded.bind(this, true), false);
        this._screenImage.addEventListener("error", this._onScreenImageLoaded.bind(this, false), false);

        this._cornerResizerElement = this._screenArea.createChild("div", "device-mode-resizer device-mode-corner-resizer");
        this._cornerResizerElement.createChild("div", "");
        this._createResizer(this._cornerResizerElement, true, true);

        this._widthResizerElement = this._screenArea.createChild("div", "device-mode-resizer device-mode-width-resizer");
        this._widthResizerElement.createChild("div", "");
        this._createResizer(this._widthResizerElement, true, false);

        this._heightResizerElement = this._screenArea.createChild("div", "device-mode-resizer device-mode-height-resizer");
        this._heightResizerElement.createChild("div", "");
        this._createResizer(this._heightResizerElement, false, true);
        this._heightResizerElement.addEventListener("dblclick", this._model.setHeight.bind(this._model, 0), false);
        this._heightResizerElement.title = WebInspector.UIString("Double-click for full height");

        this._pageArea = this._screenArea.createChild("div", "device-mode-page-area");
        this._pageArea.createChild("content");
    },

    _populatePresetsContainer: function()
    {
        var sizes = [320, 375, 425, 768, 1024, 1440, 2560];
        var titles = [WebInspector.UIString("Mobile S"),
                      WebInspector.UIString("Mobile M"),
                      WebInspector.UIString("Mobile L"),
                      WebInspector.UIString("Tablet"),
                      WebInspector.UIString("Laptop"),
                      WebInspector.UIString("Laptop L"),
                      WebInspector.UIString("4K")]
        this._presetBlocks = [];
        var inner = this._responsivePresetsContainer.createChild("div", "device-mode-presets-container-inner")
        for (var i = sizes.length - 1; i >= 0; --i) {
            var outer = inner.createChild("div", "fill device-mode-preset-bar-outer");
            var block = outer.createChild("div", "device-mode-preset-bar");
            block.createChild("span").textContent = titles[i] + " \u2013 " + sizes[i] + "px";
            block.addEventListener("click", applySize.bind(this, sizes[i]), false);
            block.__width = sizes[i];
            this._presetBlocks.push(block);
        }

        /**
         * @param {number} width
         * @param {!Event} e
         * @this {WebInspector.DeviceModeView}
         */
        function applySize(width, e)
        {
            this._model.emulate(WebInspector.DeviceModeModel.Type.Responsive, null, null);
            this._model.setSizeAndScaleToFit(width, 0);
            e.consume();
        }
    },

    toggleDeviceMode: function()
    {
        this._toolbar.toggleDeviceMode();
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
            this._model.setWidth(newWidth);
        }

        if (height) {
            var dipOffsetY = cssOffsetY * WebInspector.zoomManager.zoomFactor();
            var newHeight = this._resizeStart.height + dipOffsetY;
            newHeight = Math.round(newHeight / this._model.scale());
            this._model.setHeight(newHeight);
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onResizeEnd: function(event)
    {
        delete this._resizeStart;
        WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.ResizedViewInResponsiveMode);
    },

    _updateUI: function()
    {
        if (!this.isShowing())
            return;

        var zoomFactor = WebInspector.zoomManager.zoomFactor();
        var callDoResize = false;
        var showRulers = this._showRulersSetting.get() && this._model.type() !== WebInspector.DeviceModeModel.Type.None;
        var contentAreaResized = false;
        var updateRulers = false;

        var cssScreenRect = this._model.screenRect().scale(1 / zoomFactor);
        if (!cssScreenRect.isEqual(this._cachedCssScreenRect)) {
            this._screenArea.style.left = cssScreenRect.left + "px";
            this._screenArea.style.top = cssScreenRect.top + "px";
            this._screenArea.style.width = cssScreenRect.width + "px";
            this._screenArea.style.height = cssScreenRect.height + "px";
            this._leftRuler.element.style.left = cssScreenRect.left + "px";
            updateRulers = true;
            callDoResize = true;
            this._cachedCssScreenRect = cssScreenRect;
        }

        var cssVisiblePageRect = this._model.visiblePageRect().scale(1 / zoomFactor);
        if (!cssVisiblePageRect.isEqual(this._cachedCssVisiblePageRect)) {
            this._pageArea.style.left = cssVisiblePageRect.left + "px";
            this._pageArea.style.top = cssVisiblePageRect.top + "px";
            this._pageArea.style.width = cssVisiblePageRect.width + "px";
            this._pageArea.style.height = cssVisiblePageRect.height + "px";
            callDoResize = true;
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
            contentAreaResized = true;
            callDoResize = true;
            this._cachedMediaInspectorVisible = mediaInspectorVisible;
        }

        if (showRulers !== this._cachedShowRulers) {
            this._contentArea.classList.toggle("device-mode-rulers-visible", showRulers);
            if (showRulers) {
                this._topRuler.show(this._contentClip, this._contentArea);
                this._leftRuler.show(this._contentArea);
            } else {
                this._topRuler.detach();
                this._leftRuler.detach();
            }
            contentAreaResized = true;
            callDoResize = true;
            this._cachedShowRulers = showRulers;
        }

        if (this._model.scale() !== this._cachedScale) {
            updateRulers = true;
            for (var block of this._presetBlocks)
                block.style.width = block.__width * this._model.scale() + "px";
            this._cachedScale = this._model.scale();
        }

        this._toolbar.update();
        this._loadScreenImage(this._model.screenImage());
        this._mediaInspector.setAxisTransform(-cssScreenRect.left * zoomFactor / this._model.scale(), this._model.scale());
        if (callDoResize)
            this.doResize();
        if (updateRulers) {
            this._topRuler.render(this._cachedCssScreenRect ? this._cachedCssScreenRect.left : 0, this._model.scale());
            this._leftRuler.render(0, this._model.scale());
        }
        if (contentAreaResized)
            this._contentAreaResized();

        if (this._model.type() !== this._cachedModelType) {
            this._cachedModelType = this._model.type();
            this._contentArea.classList.toggle("device-mode-type-none", this._cachedModelType === WebInspector.DeviceModeModel.Type.None);
            this._contentArea.classList.toggle("device-mode-type-responsive", this._cachedModelType === WebInspector.DeviceModeModel.Type.Responsive);
            this._contentArea.classList.toggle("device-mode-type-device", this._cachedModelType === WebInspector.DeviceModeModel.Type.Device);
            this._responsivePresetsContainer.classList.toggle("hidden", this._cachedModelType === WebInspector.DeviceModeModel.Type.None);
        }
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

    _contentAreaResized: function()
    {
        var zoomFactor = WebInspector.zoomManager.zoomFactor();
        var rect = this._contentArea.getBoundingClientRect();
        this._handleWidth = this._handleWidth || this._widthResizerElement.offsetWidth;
        this._handleHeight = this._handleHeight || this._heightResizerElement.offsetHeight;
        var availableSize = new Size(Math.max(rect.width * zoomFactor, 1), Math.max(rect.height * zoomFactor, 1));
        var preferredSize = new Size(Math.max((rect.width - 2 * this._handleWidth) * zoomFactor, 1), Math.max((rect.height - this._handleHeight) * zoomFactor, 1));
        this._model.setAvailableSize(availableSize, preferredSize);
    },

    _zoomChanged: function()
    {
        delete this._handleWidth;
        delete this._handleHeight;
        if (this.isShowing())
            this._contentAreaResized();
    },

    /**
     * @override
     */
    onResize: function()
    {
        if (this.isShowing())
            this._contentAreaResized();
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
 * @param {!WebInspector.Setting} showRulersSetting
 * @constructor
 */
WebInspector.DeviceModeView.Toolbar = function(model, showMediaInspectorSetting, showRulersSetting)
{
    this._model = model;
    this._showMediaInspectorSetting = showMediaInspectorSetting;
    this._showRulersSetting = showRulersSetting;
    /** @type {!Map<!WebInspector.EmulatedDevice, !WebInspector.EmulatedDevice.Mode>} */
    this._lastMode = new Map();
    /** @type {?WebInspector.EmulatedDevice} */
    this._lastDevice = null;
    /** @type {!Array<!WebInspector.ToolbarButton>} */
    this._appliedSizeItems = [];
    /** @type {!Array<!WebInspector.ToolbarMenuButton>} */
    this._scaleItems = [];
    /** @type {?Element} */
    this._visibleToolbar = null;

    this._element = createElementWithClass("div", "device-mode-toolbar");

    var leftContainer = this._element.createChild("div", "device-mode-toolbar-left");
    var leftToolbar = new WebInspector.Toolbar("", leftContainer);
    this._noneItem = new WebInspector.ToolbarToggle(WebInspector.UIString("Full"), "enter-fullscreen-toolbar-item");
    leftToolbar.appendToolbarItem(this._noneItem);
    this._noneItem.addEventListener("click", this._noneButtonClick, this);
    this._responsiveItem = new WebInspector.ToolbarToggle(WebInspector.UIString("Responsive"), "responsive-toolbar-item");
    leftToolbar.appendToolbarItem(this._responsiveItem);
    this._responsiveItem.addEventListener("click", this._responsiveButtonClick, this);
    this._deviceItem = new WebInspector.ToolbarToggle(WebInspector.UIString("Device"), "phone-toolbar-item");
    leftToolbar.appendToolbarItem(this._deviceItem);
    this._deviceItem.addEventListener("click", this._deviceButtonClick, this);
    leftToolbar.appendSeparator();

    var middle = this._element.createChild("div", "device-mode-toolbar-middle-container");
    this._noneToolbar = this._wrapMiddleToolbar(middle, this._createNoneToolbar());
    this._responsiveToolbar = this._wrapMiddleToolbar(middle, this._createResponsiveToolbar());
    this._deviceToolbar = this._wrapMiddleToolbar(middle, this._createDeviceToolbar());

    var rightContainer = this._element.createChild("div", "device-mode-toolbar-right");
    rightContainer.createChild("div", "device-mode-toolbar-spacer");
    var rightToolbar = new WebInspector.Toolbar("", rightContainer);
    rightToolbar.makeWrappable(true);
    this._uaItem = new WebInspector.ToolbarText();
    this._uaItem.setVisible(false);
    this._uaItem.setTitle(WebInspector.UIString("User agent type"));
    rightToolbar.appendToolbarItem(this._uaItem);
    this._deviceScaleItem = new WebInspector.ToolbarText();
    this._deviceScaleItem.setVisible(false);
    this._deviceScaleItem.setTitle(WebInspector.UIString("Device pixel ratio"));
    rightToolbar.appendToolbarItem(this._deviceScaleItem);
    rightToolbar.appendSeparator();
    var moreOptionsButton = new WebInspector.ToolbarMenuButton(this._appendMenuItems.bind(this));
    moreOptionsButton.setTitle(WebInspector.UIString("More options"));
    rightToolbar.appendToolbarItem(moreOptionsButton);

    this._persistenceSetting = WebInspector.settings.createSetting("emulation.deviceModeViewPersistence", {type: WebInspector.DeviceModeModel.Type.None, device: "", orientation: "", mode: ""});
    this._restored = false;
}

WebInspector.DeviceModeView.Toolbar.prototype = {
    /**
     * @param {!Element} parent
     * @param {!WebInspector.Toolbar} toolbar
     * @return {!Element}
     */
    _wrapMiddleToolbar: function(parent, toolbar)
    {
        toolbar.makeWrappable();
        var container = parent.createChild("div", "device-mode-toolbar-middle fill");
        container.createChild("div", "device-mode-toolbar-spacer");
        container.appendChild(toolbar.element);
        container.createChild("div", "device-mode-toolbar-spacer");
        container.classList.add("hidden");
        return container;
    },

    /**
     * @return {!WebInspector.Toolbar}
     */
    _createNoneToolbar: function()
    {
        var toolbar = new WebInspector.Toolbar("");
        this._appendAppliedSizeItems(toolbar);
        return toolbar;
    },

    /**
     * @return {!WebInspector.Toolbar}
     */
    _createResponsiveToolbar: function()
    {
        var toolbar = new WebInspector.Toolbar("");

        var widthInput = createElementWithClass("input", "device-mode-size-input");
        widthInput.maxLength = 5;
        widthInput.title = WebInspector.UIString("Width");
        this._updateWidthInput = this._bindInput(widthInput, this._model.setWidth.bind(this._model), WebInspector.DeviceModeModel.deviceSizeValidator);
        toolbar.appendToolbarItem(this._wrapToolbarItem(widthInput));

        var xElement = createElementWithClass("div", "device-mode-x");
        xElement.textContent = "\u00D7";
        toolbar.appendToolbarItem(this._wrapToolbarItem(xElement));

        var heightInput = createElementWithClass("input", "device-mode-size-input");
        heightInput.maxLength = 5;
        heightInput.title = WebInspector.UIString("Height (leave empty for full)");
        this._updateHeightInput = this._bindInput(heightInput, this._model.setHeight.bind(this._model), validateHeight);
        toolbar.appendToolbarItem(this._wrapToolbarItem(heightInput));
        this._heightInput = heightInput;

        toolbar.appendSeparator();
        this._appendScaleItem(toolbar);
        return toolbar;

        /**
         * @param {string} value
         * @return {string}
         */
        function validateHeight(value)
        {
            return !value ? "" : WebInspector.DeviceModeModel.deviceSizeValidator(value);
        }
    },

    /**
     * @param {!Element} input
     * @param {function(number)} apply
     * @param {function(string):?string} validate
     * @return {function(number)}
     */
    _bindInput: function(input, apply, validate)
    {
        input.addEventListener("change", onChange, false);
        input.addEventListener("input", onInput, false);
        input.addEventListener("keydown", onKeyDown, false);

        function onInput()
        {
            input.classList.toggle("error-input", !!validate(input.value));
        }

        function onChange()
        {
            var valid = !validate(input.value);
            input.classList.toggle("error-input", !valid);
            if (valid)
                apply(input.value ? Number(input.value) : 0);
        }

        /**
         * @param {!Event} event
         */
        function onKeyDown(event)
        {
            if (isEnterKey(event)) {
                if (!validate(input.value))
                    apply(input.value ? Number(input.value) : 0);
                return;
            }

            var increment = event.keyIdentifier === "Up" ? 1 : event.keyIdentifier === "Down" ? -1 : 0;
            if (!increment)
                return;
            if (event.shiftKey)
                increment *= 10;

            var value = input.value;
            if (validate(value) || !value)
                return;

            value = (value ? Number(value) : 0) + increment;
            var stringValue = value ? String(value) : "";
            if (validate(stringValue) || !value)
                return;

            input.value = stringValue;
            apply(input.value ? Number(input.value) : 0);
            event.preventDefault();
        }

        /**
         * @param {number} value
         */
        function setValue(value)
        {
            var stringValue = value ? String(value) : "";
            if (stringValue === input.value)
                return;
            var valid = !validate(stringValue);
            input.classList.toggle("error-input", !valid);
            input.value = stringValue;
            input.setSelectionRange(stringValue.length, stringValue.length);
        }

        return setValue;
    },

    /**
     * @return {!WebInspector.Toolbar}
     */
    _createDeviceToolbar: function()
    {
        var toolbar = new WebInspector.Toolbar("");

        this._deviceSelect = this._createDeviceSelect();
        toolbar.appendToolbarItem(this._wrapToolbarItem(this._deviceSelect));

        this._modeButton = new WebInspector.ToolbarButton("", "rotate-screen-toolbar-item");
        this._modeButton.addEventListener("click", this._modeMenuClicked, this);
        toolbar.appendToolbarItem(this._modeButton);

        toolbar.appendSeparator();
        this._appendAppliedSizeItems(toolbar);
        toolbar.appendSeparator();
        this._appendScaleItem(toolbar);

        return toolbar;
    },

    /**
     * @param {!WebInspector.Toolbar} toolbar
     */
    _appendAppliedSizeItems: function(toolbar)
    {
        var item = new WebInspector.ToolbarText("");
        this._appliedSizeItems.push(item);
        toolbar.appendToolbarItem(item);
    },

    /**
     * @param {!WebInspector.Toolbar} toolbar
     */
    _appendScaleItem: function(toolbar)
    {
        var scaleItem = new WebInspector.ToolbarMenuButton(this._appendScaleMenuItems.bind(this));
        scaleItem.setTitle(WebInspector.UIString("Zoom"));
        scaleItem.setGlyph("");
        scaleItem.addDropDownArrow();
        toolbar.appendToolbarItem(scaleItem);
        this._scaleItems.push(scaleItem);
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
    _appendMenuItems: function(contextMenu)
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
        populateDeviceList.call(this);
        select.addEventListener("change", optionSelected.bind(this), false);
        return select;

        /**
         * @this {WebInspector.DeviceModeView.Toolbar}
         */
        function populateDeviceList()
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
         * @this {WebInspector.DeviceModeView.Toolbar}
         */
        function deviceListChanged()
        {
            populateDeviceList.call(this);
            if (!this._updateDeviceSelectedIndex() && this._model.type() === WebInspector.DeviceModeModel.Type.Device) {
                select.selectedIndex = 0;
                if (!select.options[0].edit)
                    this._emulateDevice(select.options[0].device);
            }
        }

        /**
         * @param {!Element} parent
         * @param {!Array<!WebInspector.EmulatedDevice>} devices
         * @this {WebInspector.DeviceModeView.Toolbar}
         */
        function addGroup(parent, devices)
        {
            devices = devices.filter(function(d) { return d.show(); });
            devices.sort(WebInspector.EmulatedDevice.deviceComparator);
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

    /**
     * @return {boolean}
     */
    _updateDeviceSelectedIndex: function()
    {
        for (var i = 0; i < this._deviceSelect.options.length; ++i) {
            if (this._deviceSelect.options[i].device === this._model.device()) {
                this._deviceSelect.selectedIndex = i;
                return true;
            }
        }
        return false;
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
        var updatePersistence = false;

        if (this._model.type() !== this._cachedModelType) {
            this._noneItem.setToggled(this._model.type() === WebInspector.DeviceModeModel.Type.None);
            this._responsiveItem.setToggled(this._model.type() === WebInspector.DeviceModeModel.Type.Responsive);
            this._deviceItem.setToggled(this._model.type() === WebInspector.DeviceModeModel.Type.Device);

            var toolbar = null;
            if (this._model.type() === WebInspector.DeviceModeModel.Type.None)
                toolbar = this._noneToolbar;
            else if (this._model.type() === WebInspector.DeviceModeModel.Type.Responsive)
                toolbar = this._responsiveToolbar;
            else if (this._model.type() === WebInspector.DeviceModeModel.Type.Device)
                toolbar = this._deviceToolbar;

            if (this._visibleToolbar !== toolbar) {
                if (this._visibleToolbar)
                    this._visibleToolbar.classList.add("hidden");
                if (toolbar) {
                    toolbar.classList.remove("hidden");
                    toolbar.animate([{opacity: "0"}, {opacity: "1"}], {duration: 100});
                }
                this._visibleToolbar = toolbar;
            }

            this._previousModelType = this._cachedModelType;
            this._cachedModelType = this._model.type();
            updatePersistence = true;
        }

        var size = this._model.appliedDeviceSize();
        this._updateHeightInput(this._model.isFullHeight() ? 0 : size.height);
        this._updateWidthInput(size.width);
        if (!size.isEqual(this._cachedSize)) {
            for (var item of this._appliedSizeItems)
                item.setText(WebInspector.UIString("%d \u00D7 %d", size.width, size.height));
            this._heightInput.placeholder = size.height;
            this._cachedSize = size;
        }

        if (this._model.scale() !== this._cachedScale) {
            for (var item of this._scaleItems) {
                item.setText(WebInspector.UIString("%.0f%%", this._model.scale() * 100));
                item.setState(this._model.scale() === 1 ? "off" : "on");
            }
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

        if (this._model.device() !== this._cachedModelDevice) {
            var device = this._model.device();

            if (device) {
                var modeCount = device ? device.modes.length : 0;
                this._modeButton.setEnabled(modeCount >= 2);
                this._modeButton.setTitle(modeCount === 2 ? WebInspector.UIString("Rotate") : WebInspector.UIString("Screen options"));
            }
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

    toggleDeviceMode: function()
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
 * @extends {WebInspector.VBox}
 * @param {boolean} horizontal
 * @param {function(number)} applyCallback
 */
WebInspector.DeviceModeView.Ruler = function(horizontal, applyCallback)
{
    WebInspector.VBox.call(this);
    this._contentElement = this.element.createChild("div", "device-mode-ruler flex-auto");
    this._horizontal = horizontal;
    this._scale = 1;
    this._offset = 0;
    this._count = 0;
    this._throttler = new WebInspector.Throttler(0);
    this._applyCallback = applyCallback;
}

WebInspector.DeviceModeView.Ruler.prototype = {
    /**
     * @param {number} offset
     * @param {number} scale
     */
    render: function(offset, scale)
    {
        this._scale = scale;
        this._offset = offset;
        if (this._horizontal)
            this.element.style.paddingLeft = this._offset + "px";
        else
            this.element.style.paddingTop = this._offset + "px";
        this._throttler.schedule(this._update.bind(this));
    },

    /**
     * @override
     */
    onResize: function()
    {
        this._throttler.schedule(this._update.bind(this));
    },

    /**
     * @return {!Promise.<?>}
     */
    _update: function()
    {
        var zoomFactor = WebInspector.zoomManager.zoomFactor();
        var size = this._horizontal ? this._contentElement.offsetWidth : this._contentElement.offsetHeight;

        if (this._scale !== this._renderedScale || zoomFactor !== this._renderedZoomFactor) {
            this._contentElement.removeChildren();
            this._count = 0;
            this._renderedScale = this._scale;
            this._renderedZoomFactor = zoomFactor;
        }

        var dipSize = size * zoomFactor / this._scale;
        var count = Math.ceil(dipSize / 5);
        var step = 1;
        if (this._scale < 0.8)
            step = 2;
        if (this._scale < 0.6)
            step = 5;
        if (this._scale < 0.5)
            step = 20;

        for (var i = count; i < this._count; i++) {
            if (!(i % step))
                this._contentElement.lastChild.remove();
        }

        for (var i = this._count; i < count; i++) {
            if (i % step)
                continue;
            var marker = this._contentElement.createChild("div", "device-mode-ruler-marker");
            if (i) {
                if (this._horizontal)
                    marker.style.left = (5 * i) * this._scale / zoomFactor + "px";
                else
                    marker.style.top = (5 * i) * this._scale / zoomFactor + "px";
                if (!(i % 20)) {
                    var text = marker.createChild("div", "device-mode-ruler-text");
                    text.textContent = i * 5;
                    text.addEventListener("click", this._onMarkerClick.bind(this, i * 5), false);
                }
            }
            if (!(i % 10))
                marker.classList.add("device-mode-ruler-marker-large");
            else if (!(i % 5))
                marker.classList.add("device-mode-ruler-marker-medium");
        }

        this._count = count;
        return Promise.resolve();
    },

    /**
     * @param {number} size
     */
    _onMarkerClick: function(size)
    {
        this._applyCallback.call(null, size);
    },

    __proto__: WebInspector.VBox.prototype
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
        if (actionId === "emulation.toggle-device-mode" && WebInspector.DeviceModeView._wrapperInstance) {
            WebInspector.DeviceModeView._wrapperInstance._toggleDeviceMode();
            return true;
        }
        if (actionId === "emulation.toggle-device-toolbar" && WebInspector.DeviceModeView._wrapperInstance) {
            WebInspector.DeviceModeView._wrapperInstance._toggleDeviceToolbar();
            return true;
        }
        return false;
    }
}


/**
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.InspectedPagePlaceholder} inspectedPagePlaceholder
 * @constructor
 */
WebInspector.DeviceModeView.Wrapper = function(inspectedPagePlaceholder)
{
    WebInspector.VBox.call(this);
    WebInspector.DeviceModeView._wrapperInstance = this;
    this._inspectedPagePlaceholder = inspectedPagePlaceholder;
    this._deviceModeView = new WebInspector.DeviceModeView();
    this._showDeviceToolbarSetting = WebInspector.settings.createSetting("emulation.showDeviceToolbar", true);
    this._showDeviceToolbarSetting.addChangeListener(this._update, this);
    this._update();
}

/** @type {!WebInspector.DeviceModeView.Wrapper} */
WebInspector.DeviceModeView._wrapperInstance;

WebInspector.DeviceModeView.Wrapper.prototype = {
    _toggleDeviceMode: function()
    {
        if (this._showDeviceToolbarSetting.get())
            this._deviceModeView.toggleDeviceMode();
    },

    _toggleDeviceToolbar: function()
    {
        this._showDeviceToolbarSetting.set(!this._showDeviceToolbarSetting.get());
    },

    _update: function()
    {
        if (this._showDeviceToolbarSetting.get()) {
            this._deviceModeView.show(this.element);
            this._inspectedPagePlaceholder.clearMinimumSizeAndMargins();
            this._inspectedPagePlaceholder.show(this._deviceModeView.element);
        } else {
            this._deviceModeView.detach();
            this._inspectedPagePlaceholder.restoreMinimumSizeAndMargins();
            this._inspectedPagePlaceholder.show(this.element);
            this._deviceModeView._model.emulate(WebInspector.DeviceModeModel.Type.None, null, null);
        }
    },

    __proto__: WebInspector.VBox.prototype
}

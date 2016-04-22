// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {function()} updateCallback
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.DeviceModeModel = function(updateCallback)
{
    this._updateCallback = updateCallback;
    this._screenRect = new WebInspector.Rect(0, 0, 1, 1);
    this._visiblePageRect = new WebInspector.Rect(0, 0, 1, 1);
    this._availableSize = new Size(1, 1);
    this._preferredSize = new Size(1, 1);
    this._initialized = false;
    this._deviceMetricsThrottler = new WebInspector.Throttler(0);
    this._appliedDeviceSize = new Size(1, 1);
    this._appliedDeviceScaleFactor = window.devicePixelRatio;
    this._appliedUserAgentType = WebInspector.DeviceModeModel.UA.Desktop;

    this._scaleSetting = WebInspector.settings.createSetting("emulation.deviceScale", 1);
    // We've used to allow zero before.
    if (!this._scaleSetting.get())
        this._scaleSetting.set(1);
    this._scaleSetting.addChangeListener(this._scaleSettingChanged, this);

    this._widthSetting = WebInspector.settings.createSetting("emulation.deviceWidth", 400);
    if (this._widthSetting.get() < WebInspector.DeviceModeModel.MinDeviceSize)
        this._widthSetting.set(WebInspector.DeviceModeModel.MinDeviceSize);
    if (this._widthSetting.get() > WebInspector.DeviceModeModel.MaxDeviceSize)
        this._widthSetting.set(WebInspector.DeviceModeModel.MaxDeviceSize);
    this._widthSetting.addChangeListener(this._widthSettingChanged, this);

    this._heightSetting = WebInspector.settings.createSetting("emulation.deviceHeight", 0);
    if (this._heightSetting.get() && this._heightSetting.get() < WebInspector.DeviceModeModel.MinDeviceSize)
        this._heightSetting.set(WebInspector.DeviceModeModel.MinDeviceSize);
    if (this._heightSetting.get() > WebInspector.DeviceModeModel.MaxDeviceSize)
        this._heightSetting.set(WebInspector.DeviceModeModel.MaxDeviceSize);
    this._heightSetting.addChangeListener(this._heightSettingChanged, this);

    this._uaSetting = WebInspector.settings.createSetting("emulation.deviceUA", WebInspector.DeviceModeModel.UA.Mobile);
    this._uaSetting.addChangeListener(this._uaSettingChanged, this);
    this._deviceScaleFactorSetting = WebInspector.settings.createSetting("emulation.deviceScaleFactor", 0);
    this._deviceScaleFactorSetting.addChangeListener(this._deviceScaleFactorSettingChanged, this);

    this._deviceOutlineSetting = WebInspector.settings.createSetting("emulation.deviceOutline", true);
    this._deviceOutlineSetting.addChangeListener(this._deviceOutlineSettingChanged, this);

    /** @type {!WebInspector.DeviceModeModel.Type} */
    this._type = WebInspector.DeviceModeModel.Type.None;
    /** @type {?WebInspector.EmulatedDevice} */
    this._device = null;
    /** @type {?WebInspector.EmulatedDevice.Mode} */
    this._mode = null;
    /** @type {number} */
    this._fitScale = 1;

    /** @type {?WebInspector.Target} */
    this._target = null;
    /** @type {?function()} */
    this._onTargetAvailable = null;
    WebInspector.targetManager.observeTargets(this, WebInspector.Target.Type.Page);
}

/** @enum {string} */
WebInspector.DeviceModeModel.Type = {
    None: "None",
    Responsive: "Responsive",
    Device: "Device"
}

/** @enum {string} */
WebInspector.DeviceModeModel.UA = {
    Mobile: WebInspector.UIString("Mobile"),
    MobileNoTouch: WebInspector.UIString("Mobile (no touch)"),
    Desktop: WebInspector.UIString("Desktop"),
    DesktopTouch: WebInspector.UIString("Desktop (touch)")
}

WebInspector.DeviceModeModel.MinDeviceSize = 50;
WebInspector.DeviceModeModel.MaxDeviceSize = 9999;

/**
 * @param {string} value
 * @return {boolean}
 */
WebInspector.DeviceModeModel.deviceSizeValidator = function(value)
{
    if (/^[\d]+$/.test(value) && value >= WebInspector.DeviceModeModel.MinDeviceSize && value <= WebInspector.DeviceModeModel.MaxDeviceSize)
        return true;
    return false;
}

/**
 * @param {string} value
 * @return {boolean}
 */
WebInspector.DeviceModeModel.deviceScaleFactorValidator = function(value)
{
    if (!value || (/^[\d]+(\.\d+)?|\.\d+$/.test(value) && value >= 0 && value <= 10))
        return true;
    return false;
}

WebInspector.DeviceModeModel._defaultMobileUserAgent = "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.76 Mobile Safari/537.36";
WebInspector.DeviceModeModel.defaultMobileScaleFactor = 2;

WebInspector.DeviceModeModel.prototype = {
    /**
     * @param {!Size} availableSize
     * @param {!Size} preferredSize
     */
    setAvailableSize: function(availableSize, preferredSize)
    {
        this._availableSize = availableSize;
        this._preferredSize = preferredSize;
        this._initialized = true;
        this._calculateAndEmulate(false);
    },

    /**
     * @param {!WebInspector.DeviceModeModel.Type} type
     * @param {?WebInspector.EmulatedDevice} device
     * @param {?WebInspector.EmulatedDevice.Mode} mode
     */
    emulate: function(type, device, mode)
    {
        var resetPageScaleFactor = this._type !== type || this._device !== device || this._mode !== mode;
        this._type = type;

        if (type === WebInspector.DeviceModeModel.Type.Device) {
            console.assert(device && mode, "Must pass device and mode for device emulation");
            this._device = device;
            this._mode = mode;
            if (this._initialized) {
                var orientation = device.orientationByName(mode.orientation);
                this._scaleSetting.set(this._calculateFitScale(orientation.width, orientation.height));
            }
        } else {
            this._device = null;
            this._mode = null;
        }

        if (type !== WebInspector.DeviceModeModel.Type.None)
            WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.DeviceModeEnabled);
        this._calculateAndEmulate(resetPageScaleFactor);
    },

    /**
     * @param {number} width
     */
    setWidth: function(width)
    {
        var max = Math.min(WebInspector.DeviceModeModel.MaxDeviceSize, this._preferredScaledWidth());
        width = Math.max(Math.min(width, max), 1);
        this._widthSetting.set(width);
    },

    /**
     * @param {number} width
     */
    setWidthAndScaleToFit: function(width)
    {
        width = Math.max(Math.min(width, WebInspector.DeviceModeModel.MaxDeviceSize), 1);
        this._scaleSetting.set(this._calculateFitScale(width, this._heightSetting.get()));
        this._widthSetting.set(width);
    },

    /**
     * @param {number} height
     */
    setHeight: function(height)
    {
        var max = Math.min(WebInspector.DeviceModeModel.MaxDeviceSize, this._preferredScaledHeight());
        height = Math.max(Math.min(height, max), 0);
        if (height === this._preferredScaledHeight())
            height = 0;
        this._heightSetting.set(height);
    },

    /**
     * @param {number} height
     */
    setHeightAndScaleToFit: function(height)
    {
        height = Math.max(Math.min(height, WebInspector.DeviceModeModel.MaxDeviceSize), 0);
        this._scaleSetting.set(this._calculateFitScale(this._widthSetting.get(), height));
        this._heightSetting.set(height);
    },

    /**
     * @param {number} scale
     */
    setScale: function(scale)
    {
        this._scaleSetting.set(scale);
    },

    /**
     * @return {?WebInspector.EmulatedDevice}
     */
    device: function()
    {
        return this._device;
    },

    /**
     * @return {?WebInspector.EmulatedDevice.Mode}
     */
    mode: function()
    {
        return this._mode;
    },

    /**
     * @return {!WebInspector.DeviceModeModel.Type}
     */
    type: function()
    {
        return this._type;
    },

    /**
     * @return {string}
     */
    screenImage: function()
    {
        return (this._device && this._mode) ? this._device.modeImage(this._mode) : "";
    },

    /**
     * @return {string}
     */
    outlineImage: function()
    {
        return (this._device && this._mode && Runtime.experiments.isEnabled("deviceFrames")) ?
            this._device.outlineImage(this._mode) : "";
    },

    /**
     * @return {!WebInspector.Rect}
     */
    outlineRect: function()
    {
        return this._outlineRect;
    },

    /**
     * @return {!WebInspector.Rect}
     */
    screenRect: function()
    {
        return this._screenRect;
    },

    /**
     * @return {!WebInspector.Rect}
     */
    visiblePageRect: function()
    {
        return this._visiblePageRect;
    },

    /**
     * @return {number}
     */
    scale: function()
    {
        return this._scale;
    },

    /**
     * @return {number}
     */
    fitScale: function()
    {
        return this._fitScale;
    },

    /**
     * @return {!Size}
     */
    appliedDeviceSize: function()
    {
        return this._appliedDeviceSize;
    },

    /**
     * @return {number}
     */
    appliedDeviceScaleFactor: function()
    {
        return this._appliedDeviceScaleFactor;
    },

    /**
     * @return {!WebInspector.DeviceModeModel.UA}
     */
    appliedUserAgentType: function()
    {
        return this._appliedUserAgentType;
    },

    /**
     * @return {boolean}
     */
    isFullHeight: function()
    {
        return !this._heightSetting.get();
    },

    /**
     * @return {!WebInspector.Setting}
     */
    scaleSetting: function()
    {
        return this._scaleSetting;
    },

    /**
     * @return {!WebInspector.Setting}
     */
    uaSetting: function()
    {
        return this._uaSetting;
    },

    /**
     * @return {!WebInspector.Setting}
     */
    deviceScaleFactorSetting: function()
    {
        return this._deviceScaleFactorSetting;
    },

    /**
     * @return {!WebInspector.Setting}
     */
    deviceOutlineSetting: function()
    {
        return this._deviceOutlineSetting;
    },

    reset: function()
    {
        this._deviceScaleFactorSetting.set(0);
        this._scaleSetting.set(1);
        this.setWidth(400);
        this.setHeight(0);
        this._uaSetting.set(WebInspector.DeviceModeModel.UA.Mobile);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        if (!this._target) {
            this._target = target;
            if (this._onTargetAvailable) {
                var callback = this._onTargetAvailable;
                this._onTargetAvailable = null;
                callback();
            }
        }
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        if (this._target === target)
            this._target = null;
    },

    _scaleSettingChanged: function()
    {
        this._calculateAndEmulate(false);
    },

    _widthSettingChanged: function()
    {
        this._calculateAndEmulate(false);
    },

    _heightSettingChanged: function()
    {
        this._calculateAndEmulate(false);
    },

    _uaSettingChanged: function()
    {
        this._calculateAndEmulate(true);
    },

    _deviceScaleFactorSettingChanged: function()
    {
        this._calculateAndEmulate(false);
    },

    _deviceOutlineSettingChanged: function()
    {
        this._calculateAndEmulate(false);
    },

    /**
     * @return {number}
     */
    _preferredScaledWidth: function()
    {
        return Math.floor(this._preferredSize.width / (this._scaleSetting.get() || 1));
    },

    /**
     * @return {number}
     */
    _preferredScaledHeight: function()
    {
        return Math.floor(this._preferredSize.height / (this._scaleSetting.get() || 1));
    },

    /**
     * @param {boolean} resetPageScaleFactor
     */
    _calculateAndEmulate: function(resetPageScaleFactor)
    {
        if (!this._target)
            this._onTargetAvailable = this._calculateAndEmulate.bind(this, resetPageScaleFactor);

        if (this._type === WebInspector.DeviceModeModel.Type.Device) {
            var orientation = this._device.orientationByName(this._mode.orientation);
            var outline = (this._deviceOutlineSetting.get() && Runtime.experiments.isEnabled("deviceFrames")) ? orientation.outlineInsets : new Insets(0,0,0,0);
            this._fitScale = this._calculateFitScale(orientation.width, orientation.height);
            if (this._device.mobile())
                this._appliedUserAgentType = this._device.touch() ? WebInspector.DeviceModeModel.UA.Mobile : WebInspector.DeviceModeModel.UA.MobileNoTouch;
            else
                this._appliedUserAgentType = this._device.touch() ? WebInspector.DeviceModeModel.UA.DesktopTouch : WebInspector.DeviceModeModel.UA.Desktop;
            this._applyDeviceMetrics(new Size(orientation.width, orientation.height), this._mode.insets, outline, this._scaleSetting.get(), this._device.deviceScaleFactor, this._device.mobile(), this._mode.orientation == WebInspector.EmulatedDevice.Horizontal ? "landscapePrimary" : "portraitPrimary", resetPageScaleFactor);
            this._applyUserAgent(this._device.userAgent);
            this._applyTouch(this._device.touch(), this._device.mobile());
        } else if (this._type === WebInspector.DeviceModeModel.Type.None) {
            this._fitScale = this._calculateFitScale(this._availableSize.width, this._availableSize.height);
            this._appliedUserAgentType = WebInspector.DeviceModeModel.UA.Desktop;
            this._applyDeviceMetrics(this._availableSize, new Insets(0, 0, 0, 0), new Insets(0, 0, 0, 0), 1, 0, false, "", resetPageScaleFactor);
            this._applyUserAgent("");
            this._applyTouch(false, false);
        } else if (this._type === WebInspector.DeviceModeModel.Type.Responsive) {
            var screenWidth = this._widthSetting.get();
            if (!screenWidth || screenWidth > this._preferredScaledWidth())
                screenWidth = this._preferredScaledWidth();
            var screenHeight = this._heightSetting.get();
            if (!screenHeight || screenHeight > this._preferredScaledHeight())
                screenHeight = this._preferredScaledHeight();
            var mobile = this._uaSetting.get() === WebInspector.DeviceModeModel.UA.Mobile || this._uaSetting.get() === WebInspector.DeviceModeModel.UA.MobileNoTouch;
            var defaultDeviceScaleFactor = mobile ? WebInspector.DeviceModeModel.defaultMobileScaleFactor : 0;
            this._fitScale = this._calculateFitScale(this._widthSetting.get(), this._heightSetting.get());
            this._appliedUserAgentType = this._uaSetting.get();
            this._applyDeviceMetrics(new Size(screenWidth, screenHeight), new Insets(0, 0, 0, 0), new Insets(0, 0, 0, 0), this._scaleSetting.get(), this._deviceScaleFactorSetting.get() || defaultDeviceScaleFactor, mobile, screenHeight >= screenWidth ? "portraitPrimary" : "landscapePrimary", resetPageScaleFactor);
            this._applyUserAgent(mobile ? WebInspector.DeviceModeModel._defaultMobileUserAgent : "");
            this._applyTouch(this._uaSetting.get() === WebInspector.DeviceModeModel.UA.DesktopTouch || this._uaSetting.get() === WebInspector.DeviceModeModel.UA.Mobile, this._uaSetting.get() === WebInspector.DeviceModeModel.UA.Mobile);
        }
        if (this._target)
            this._target.renderingAgent().setShowViewportSizeOnResize(this._type === WebInspector.DeviceModeModel.Type.None);
        this._updateCallback.call(null);
    },

    /**
     * @param {number} screenWidth
     * @param {number} screenHeight
     * @return {number}
     */
    _calculateFitScale: function(screenWidth, screenHeight)
    {
        var scale = Math.min(screenWidth ? this._preferredSize.width / screenWidth : 1, screenHeight ? this._preferredSize.height / screenHeight : 1);
        return Math.min(scale, 1);
    },

    /**
     * @param {number} width
     * @param {number} height
     */
    setSizeAndScaleToFit: function(width, height)
    {
        this._scaleSetting.set(this._calculateFitScale(width, height));
        this.setWidth(width);
    },

    /**
     * @param {string} userAgent
     */
    _applyUserAgent: function(userAgent)
    {
        WebInspector.multitargetNetworkManager.setUserAgentOverride(userAgent);
    },

    /**
     * @param {!Size} screenSize
     * @param {!Insets} insets
     * @param {!Insets|null} outline
     * @param {number} scale
     * @param {number} deviceScaleFactor
     * @param {boolean} mobile
     * @param {string} screenOrientation
     * @param {boolean} resetPageScaleFactor
     */
    _applyDeviceMetrics: function(screenSize, insets, outline, scale, deviceScaleFactor, mobile, screenOrientation, resetPageScaleFactor)
    {
        screenSize.width = Math.max(1, Math.floor(screenSize.width));
        screenSize.height = Math.max(1, Math.floor(screenSize.height));

        var pageWidth = screenSize.width - insets.left - insets.right;
        var pageHeight = screenSize.height - insets.top - insets.bottom;

        var positionX = insets.left;
        var positionY = insets.top;
        var screenOrientationAngle = screenOrientation === "landscapePrimary" ? 90 : 0;

        this._appliedDeviceSize = screenSize;
        this._appliedDeviceScaleFactor = deviceScaleFactor || window.devicePixelRatio;
        this._screenRect = new WebInspector.Rect(
            Math.max(0, (this._availableSize.width - screenSize.width * scale) / 2),
            outline.top * scale,
            screenSize.width * scale,
            screenSize.height * scale);
        this._outlineRect = new WebInspector.Rect(
            Math.max(0, this._screenRect.left - outline.left * scale),
            0,
            (outline.left + screenSize.width + outline.right) * scale,
            (outline.top + screenSize.height + outline.bottom) * scale);
        this._visiblePageRect = new WebInspector.Rect(
            positionX * scale,
            positionY * scale,
            Math.min(pageWidth * scale, this._availableSize.width - this._screenRect.left - positionX * scale),
            Math.min(pageHeight * scale, this._availableSize.height - this._screenRect.top - positionY * scale));
        this._scale = scale;

        if (scale === 1 && this._availableSize.width >= screenSize.width && this._availableSize.height >= screenSize.height) {
            // When we have enough space, no page size override is required. This will speed things up and remove lag.
            pageWidth = 0;
            pageHeight = 0;
        }
        if (this._visiblePageRect.width === pageWidth * scale && this._visiblePageRect.height === pageHeight * scale) {
            // When we only have to apply scale, do not resize the page. This will speed things up and remove lag.
            pageWidth = 0;
            pageHeight = 0;
        }

        this._deviceMetricsThrottler.schedule(setDeviceMetricsOverride.bind(this));

        /**
         * @this {WebInspector.DeviceModeModel}
         * @return {!Promise.<?>}
         */
        function setDeviceMetricsOverride()
        {
            if (!this._target)
                return Promise.resolve();

            var clear = !pageWidth && !pageHeight && !mobile && !deviceScaleFactor && scale === 1 && !screenOrientation;
            var allPromises = [];
            if (resetPageScaleFactor)
                allPromises.push(this._target.emulationAgent().resetPageScaleFactor());
            var setDevicePromise;
            if (clear) {
                setDevicePromise = this._target.emulationAgent().clearDeviceMetricsOverride(this._deviceMetricsOverrideAppliedForTest.bind(this));
            } else {
                var params = {width: pageWidth, height: pageHeight, deviceScaleFactor: deviceScaleFactor, mobile: mobile, fitWindow: false, scale: scale, screenWidth: screenSize.width, screenHeight: screenSize.height, positionX: positionX, positionY: positionY};
                if (screenOrientation)
                    params.screenOrientation = {type: screenOrientation, angle: screenOrientationAngle};
                setDevicePromise = this._target.emulationAgent().invoke_setDeviceMetricsOverride(params, this._deviceMetricsOverrideAppliedForTest.bind(this));
            }
            allPromises.push(setDevicePromise);
            return Promise.all(allPromises);
        }
    },

    _deviceMetricsOverrideAppliedForTest: function()
    {
        // Used for sniffing in tests.
    },

    /**
     * @param {boolean} touchEnabled
     * @param {boolean} mobile
     */
    _applyTouch: function(touchEnabled, mobile)
    {
        WebInspector.MultitargetTouchModel.instance().setTouchEnabled(touchEnabled, mobile);
    }
}

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
    this._deviceMetricsThrottler = new WebInspector.Throttler(0);
    this._appliedDeviceSize = new Size(1, 1);
    this._currentDeviceScaleFactor = window.devicePixelRatio;
    this._appliedDeviceScaleFactor = 0;

    // Zero means "fit".
    this._scaleSetting = WebInspector.settings.createSetting("emulation.deviceScale", 1);
    this._scaleSetting.addChangeListener(this._scaleSettingChanged, this);
    this._widthSetting = WebInspector.settings.createSetting("emulation.deviceWidth", 400);
    this._widthSetting.addChangeListener(this._widthSettingChanged, this);
    this._heightSetting = WebInspector.settings.createSetting("emulation.deviceHeight", 700);
    this._heightSetting.addChangeListener(this._heightSettingChanged, this);
    this._mobileSetting = WebInspector.settings.createSetting("emulation.deviceMobile", true);
    this._mobileSetting.addChangeListener(this._mobileSettingChanged, this);
    this._deviceScaleFactorSetting = WebInspector.settings.createSetting("emulation.deviceScaleFactor", 0);
    this._deviceScaleFactorSetting.addChangeListener(this._deviceScaleFactorSettingChanged, this);

    /** @type {!WebInspector.DeviceModeModel.Type} */
    this._type = WebInspector.DeviceModeModel.Type.None;
    /** @type {?WebInspector.EmulatedDevice} */
    this._device = null;
    /** @type {?WebInspector.EmulatedDevice.Mode} */
    this._mode = null;
    /** @type {boolean} */
    this._touchEnabled = false;
    /** @type {string} */
    this._touchConfiguration = "";
    /** @type {string} */
    this._screenOrientation = "";
    /** @type {number} */
    this._fixedScale = 0;

    /** @type {?WebInspector.Target} */
    this._target = null;
    WebInspector.targetManager.observeTargets(this, WebInspector.Target.Type.Page);
}

/** @enum {string} */
WebInspector.DeviceModeModel.Type = {
    None: "None",
    Responsive: "Responsive",
    Device: "Device"
}

WebInspector.DeviceModeModel.MaxDeviceSize = 10000;

/**
 * @param {string} value
 * @return {string}
 */
WebInspector.DeviceModeModel.deviceSizeValidator = function(value)
{
    if (/^[\d]+$/.test(value) && value > 0 && value <= WebInspector.DeviceModeModel.MaxDeviceSize)
        return "";
    return WebInspector.UIString("Value must be positive integer");
}

WebInspector.DeviceModeModel._touchEventsScriptIdSymbol = Symbol("DeviceModeModel.touchEventsScriptIdSymbol");
WebInspector.DeviceModeModel._defaultMobileUserAgent = "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.76 Mobile Safari/537.36";
WebInspector.DeviceModeModel._defaultMobileScaleFactor = 2;

WebInspector.DeviceModeModel.prototype = {
    /**
     * @param {!Size} size
     */
    setAvailableSize: function(size)
    {
        this._availableSize = size;
        this._calculateAndEmulate(false);
    },

    /**
     * @param {!WebInspector.DeviceModeModel.Type} type
     * @param {?WebInspector.EmulatedDevice} device
     * @param {?WebInspector.EmulatedDevice.Mode} mode
     */
    emulate: function(type, device, mode)
    {
        this._type = type;

        if (type === WebInspector.DeviceModeModel.Type.Device) {
            console.assert(device && mode, "Must pass device and mode for device emulation");
            this._device = device;
            this._mode = mode;
        } else {
            this._device = null;
            this._mode = null;
        }

        this._calculateAndEmulate(true);
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

    suspendScaleChanges: function()
    {
        ++this._fixedScale;
    },

    resumeScaleChanges: function()
    {
        if (!--this._fixedScale)
            this._calculateAndEmulate(false);
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
     * @return {!WebInspector.Setting}
     */
    scaleSetting: function()
    {
        return this._scaleSetting;
    },

    /**
     * @return {!WebInspector.Setting}
     */
    widthSetting: function()
    {
        return this._widthSetting;
    },

    /**
     * @return {!WebInspector.Setting}
     */
    heightSetting: function()
    {
        return this._heightSetting;
    },

    /**
     * @return {!WebInspector.Setting}
     */
    mobileSetting: function()
    {
        return this._mobileSetting;
    },

    /**
     * @return {!WebInspector.Setting}
     */
    deviceScaleFactorSetting: function()
    {
        return this._deviceScaleFactorSetting;
    },

    /**
     * @return {number}
     */
    defaultDeviceScaleFactor: function()
    {
        if (this._type === WebInspector.DeviceModeModel.Type.Responsive)
            return this._mobileSetting.get() ? WebInspector.DeviceModeModel._defaultMobileScaleFactor : this._currentDeviceScaleFactor;
        else if (this._type === WebInspector.DeviceModeModel.Type.Device)
            return this._device.deviceScaleFactor;
        else
            return this._currentDeviceScaleFactor;
    },

    reset: function()
    {
        this._deviceScaleFactorSetting.set(0);
        this._scaleSetting.set(0);
        this._widthSetting.set(400);
        this._heightSetting.set(700);
        this._mobileSetting.set(true);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        if (!this._target) {
            this._target = target;
            var domModel = WebInspector.DOMModel.fromTarget(this._target);
            domModel.addEventListener(WebInspector.DOMModel.Events.InspectModeWillBeToggled, this._inspectModeWillBeToggled, this);
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _inspectModeWillBeToggled: function(event)
    {
        var inspectModeEnabled = /** @type {boolean} */ (event.data);
        if (inspectModeEnabled) {
            this._applyTouch(false, false);
            return;
        }

        if (this._type === WebInspector.DeviceModeModel.Type.Device)
            this._applyTouch(this._device.touch(), this._device.mobile());
        else if (this._type === WebInspector.DeviceModeModel.Type.None)
            this._applyTouch(false, false);
        else if (this._type === WebInspector.DeviceModeModel.Type.Responsive)
            this._applyTouch(this._mobileSetting.get(), this._mobileSetting.get());
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
        this._calculateAndEmulate(true);
    },

    _widthSettingChanged: function()
    {
        this._calculateAndEmulate(false);
    },

    _heightSettingChanged: function()
    {
        this._calculateAndEmulate(false);
    },

    _mobileSettingChanged: function()
    {
        this._calculateAndEmulate(true);
    },

    _deviceScaleFactorSettingChanged: function()
    {
        this._calculateAndEmulate(false);
    },

    /**
     * @param {boolean} resetScrollAndPageScale
     */
    _calculateAndEmulate: function(resetScrollAndPageScale)
    {
        if (this._type === WebInspector.DeviceModeModel.Type.Device) {
            var orientation = this._device.orientationByName(this._mode.orientation);
            var screenWidth = orientation.width;
            var screenHeight = orientation.height;
            var scale = this._calculateScale(screenWidth, screenHeight);
            this._applyDeviceMetrics(new Size(screenWidth, screenHeight), this._mode.insets, scale, this._device.deviceScaleFactor, this._device.mobile(), resetScrollAndPageScale);
            this._applyUserAgent(this._device.userAgent);
            this._applyTouch(this._device.touch(), this._device.mobile());
            this._applyScreenOrientation(this._mode.orientation == WebInspector.EmulatedDevice.Horizontal ? "landscapePrimary" : "portraitPrimary");
        } else if (this._type === WebInspector.DeviceModeModel.Type.None) {
            this._applyDeviceMetrics(this._availableSize, new Insets(0, 0, 0, 0), 1, 0, false, resetScrollAndPageScale);
            this._applyUserAgent("");
            this._applyTouch(false, false);
            this._applyScreenOrientation("");
        } else if (this._type === WebInspector.DeviceModeModel.Type.Responsive) {
            var screenWidth = this._widthSetting.get();
            var screenHeight = this._heightSetting.get();
            var scale = this._calculateScale(screenWidth, screenHeight);
            var mobile = this._mobileSetting.get();
            this._applyDeviceMetrics(new Size(screenWidth, screenHeight), new Insets(0, 0, 0, 0), scale, this._deviceScaleFactorSetting.get() || WebInspector.DeviceModeModel._defaultMobileScaleFactor, mobile, resetScrollAndPageScale);
            this._applyUserAgent(mobile ? WebInspector.DeviceModeModel._defaultMobileUserAgent : "");
            this._applyTouch(mobile, mobile);
            this._applyScreenOrientation(screenHeight >= screenWidth ? "portraitPrimary" : "landscapePrimary");
        }
        this._updateCallback.call(null);
    },

    /**
     * @param {number} screenWidth
     * @param {number} screenHeight
     * @return {number}
     */
    _calculateScale: function(screenWidth, screenHeight)
    {
        var scale = this._scaleSetting.get();
        if (!scale) {
            if (this._fixedScale) {
                scale = this._scale;
            } else {
                scale = 1;
                while (this._availableSize.width < screenWidth * scale || this._availableSize.height < screenHeight * scale)
                    scale *= 0.8;
            }
        }
        return scale;
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
     * @param {number} scale
     * @param {number} deviceScaleFactor
     * @param {boolean} mobile
     * @param {boolean} resetScrollAndPageScale
     */
    _applyDeviceMetrics: function(screenSize, insets, scale, deviceScaleFactor, mobile, resetScrollAndPageScale)
    {
        var pageWidth = screenSize.width - insets.left - insets.right;
        var pageHeight = screenSize.height - insets.top - insets.bottom;
        var positionX = insets.left;
        var positionY = insets.top;

        this._appliedDeviceSize = screenSize;
        this._screenRect = new WebInspector.Rect(
            Math.max(0, (this._availableSize.width - screenSize.width * scale) / 2),
            this._type === WebInspector.DeviceModeModel.Type.Device ? Math.max(0, (this._availableSize.height - screenSize.height * scale) / 2) : 0,
            screenSize.width * scale,
            screenSize.height * scale);
        this._visiblePageRect = new WebInspector.Rect(
            positionX * scale,
            positionY * scale,
            Math.min(pageWidth * scale, this._availableSize.width - this._screenRect.left - positionX * scale),
            Math.min(pageHeight * scale, this._availableSize.height - this._screenRect.top - positionY * scale));
        this._scale = scale;
        this._appliedDeviceScaleFactor = deviceScaleFactor;

        if (scale === 1 && this._availableSize.width >= screenSize.width && this._availableSize.height >= screenSize.height) {
            // When we have enough space, no page size override is required. This will speed things up and remove lag.
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

            var clear = !pageWidth && !pageHeight && !mobile && !deviceScaleFactor && scale === 1;
            var setDevicePromise = clear ?
                this._target.emulationAgent().clearDeviceMetricsOverride(this._deviceMetricsOverrideAppliedForTest.bind(this)) :
                this._target.emulationAgent().setDeviceMetricsOverride(pageWidth, pageHeight, deviceScaleFactor, mobile, false, scale, 0, 0, screenSize.width, screenSize.height, positionX, positionY, this._deviceMetricsOverrideAppliedForTest.bind(this));
            var allPromises = [ setDevicePromise ];
            if (resetScrollAndPageScale)
                allPromises.push(this._target.emulationAgent().resetScrollAndPageScaleFactor());
            return Promise.all(allPromises);
        }
    },

    _deviceMetricsOverrideAppliedForTest: function()
    {
        // Used for sniffing in tests.
    },

    _applyTouch: function(touchEnabled, mobile)
    {
        var configuration = mobile ? "mobile" : "desktop";
        if (!this._target || (this._touchEnabled === touchEnabled && this._touchConfiguration === configuration))
            return;

        var target = this._target;

        /**
         * @suppressGlobalPropertiesCheck
         */
        const injectedFunction = function() {
            const touchEvents = ["ontouchstart", "ontouchend", "ontouchmove", "ontouchcancel"];
            var recepients = [window.__proto__, document.__proto__];
            for (var i = 0; i < touchEvents.length; ++i) {
                for (var j = 0; j < recepients.length; ++j) {
                    if (!(touchEvents[i] in recepients[j]))
                        Object.defineProperty(recepients[j], touchEvents[i], { value: null, writable: true, configurable: true, enumerable: true });
                }
            }
        };

        var symbol = WebInspector.DeviceModeModel._touchEventsScriptIdSymbol;

        if (typeof target[symbol] !== "undefined") {
            target.pageAgent().removeScriptToEvaluateOnLoad(target[symbol]);
            delete target[symbol];
        }

        if (touchEnabled)
            target.pageAgent().addScriptToEvaluateOnLoad("(" + injectedFunction.toString() + ")()", scriptAddedCallback);

        /**
         * @param {?Protocol.Error} error
         * @param {string} scriptId
         */
        function scriptAddedCallback(error, scriptId)
        {
            if (error)
                delete target[symbol];
            else
                target[symbol] = scriptId;
        }

        target.emulationAgent().setTouchEmulationEnabled(touchEnabled, configuration);
        this._touchEnabled = touchEnabled;
        this._touchConfiguration = configuration;
    },

    /**
     * @param {string} orientation
     */
    _applyScreenOrientation: function(orientation)
    {
        if (!this._target || orientation === this._screenOrientation)
            return;

        this._screenOrientation = orientation;
        if (!this._screenOrientation)
            this._target.screenOrientationAgent().clearScreenOrientationOverride();
        else
            this._target.screenOrientationAgent().setScreenOrientationOverride(this._screenOrientation === "landscapePrimary" ? 90 : 0, /** @type {!ScreenOrientationAgent.OrientationType} */ (this._screenOrientation));
    }
}

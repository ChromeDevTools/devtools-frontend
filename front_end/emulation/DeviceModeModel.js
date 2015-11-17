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
    this._fitScale = 1;
    this._availableSize = new Size(1, 1);
    this._deviceMetricsThrottler = new WebInspector.Throttler(0);
    this._appliedDeviceSize = new Size(1, 1);
    this._currentDeviceScaleFactor = window.devicePixelRatio;
    this._appliedDeviceScaleFactor = 0;

    // Zero means "fit", positive number is a scale itself.
    this._fitSetting = WebInspector.settings.createSetting("emulation.deviceFit", 0);
    this._fitSetting.addChangeListener(this._fitSettingChanged, this);
    this._widthSetting = WebInspector.settings.createSetting("emulation.deviceWidth", 400);
    this._widthSetting.addChangeListener(this._widthSettingChanged, this);
    this._deviceScaleFactorSetting = WebInspector.settings.createSetting("emulation.deviceScaleFactor", 0);
    this._deviceScaleFactorSetting.addChangeListener(this._deviceScaleFactorSettingChanged, this);

    /** @type {!WebInspector.DeviceModeModel.Type} */
    this._type = WebInspector.DeviceModeModel.Type.Desktop;
    this._fitSetting.set(0);
    this._deviceScaleFactorSetting.set(0);
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
    this._fixedFitScale = 0;

    /** @type {?WebInspector.Target} */
    this._target = null;
    WebInspector.targetManager.observeTargets(this, WebInspector.Target.Type.Page);
}

/** @enum {string} */
WebInspector.DeviceModeModel.Type = {
    Desktop: "Desktop",
    Mobile: "Mobile",
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

/**
 * @param {string} value
 * @return {string}
 */
WebInspector.DeviceModeModel.deviceScaleFactorValidator = function(value)
{
    if (!value || (/^[\d]+(\.\d+)?|\.\d+$/.test(value) && value >= 0 && value <= 10))
        return "";
    return WebInspector.UIString("Value must be non-negative float");
}

WebInspector.DeviceModeModel._touchEventsScriptIdSymbol = Symbol("DeviceModeModel.touchEventsScriptIdSymbol");
WebInspector.DeviceModeModel._defaultMobileUserAgent = "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.76 Mobile Safari/537.36";
WebInspector.DeviceModeModel._defaultMobileScaleFactor = 2;

WebInspector.DeviceModeModel.prototype = {
    /**
     * @param {!Size} size
     */
    availableSizeChanged: function(size)
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
            if (type === WebInspector.DeviceModeModel.Type.Desktop) {
                this._fitSetting.removeChangeListener(this._fitSettingChanged, this);
                this._fitSetting.set(0);
                this._fitSetting.addChangeListener(this._fitSettingChanged, this);
            }
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
     * @return {boolean}
     */
    isResizable: function()
    {
        return this._type === WebInspector.DeviceModeModel.Type.Mobile || (this._type === WebInspector.DeviceModeModel.Type.Desktop && this._fitSetting.get());
    },

    /**
     * @return {!WebInspector.Setting}
     */
    fitSetting: function()
    {
        return this._fitSetting;
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
    deviceScaleFactorSetting: function()
    {
        return this._deviceScaleFactorSetting;
    },

    /**
     * @return {number}
     */
    defaultDeviceScaleFactor: function()
    {
        if (this._type === WebInspector.DeviceModeModel.Type.Mobile)
            return WebInspector.DeviceModeModel._defaultMobileScaleFactor;
        else if (this._type === WebInspector.DeviceModeModel.Type.Device)
            return this._device.deviceScaleFactor;
        else
            return this._currentDeviceScaleFactor;
    },

    suspendFitScaleChanges: function()
    {
        ++this._fixedFitScale;
    },

    resumeFitScaleChanges: function()
    {
        if (!--this._fixedFitScale)
            this._calculateAndEmulate(false);
    },

    reset: function()
    {
        this._deviceScaleFactorSetting.set(0);
        this._fitSetting.set(0);
        this._widthSetting.set(400);
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
        else if (this._type === WebInspector.DeviceModeModel.Type.Desktop)
            this._applyTouch(false, false);
        else if (this._type === WebInspector.DeviceModeModel.Type.Mobile)
            this._applyTouch(true, true);
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

    _fitSettingChanged: function()
    {
        this._calculateAndEmulate(false);
    },

    _widthSettingChanged: function()
    {
        this._calculateAndEmulate(false);
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
        } else if (this._type === WebInspector.DeviceModeModel.Type.Desktop) {
            var screenWidth = this._fitSetting.get() ? this._widthSetting.get() : this._availableSize.width;
            var scale = this._calculateScale(screenWidth, 0);
            var screenHeight = Math.floor(this._availableSize.height / scale);
            this._applyDeviceMetrics(new Size(screenWidth, screenHeight), new Insets(0, 0, 0, 0), scale, this._deviceScaleFactorSetting.get(), false, resetScrollAndPageScale);
            this._applyUserAgent("");
            this._applyTouch(false, false);
            this._applyScreenOrientation("");
        } else if (this._type === WebInspector.DeviceModeModel.Type.Mobile) {
            var screenWidth = this._widthSetting.get();
            var scale = this._calculateScale(screenWidth, 0);
            var screenHeight = Math.floor(this._availableSize.height / scale);
            this._applyDeviceMetrics(new Size(screenWidth, screenHeight), new Insets(0, 0, 0, 0), scale, this._deviceScaleFactorSetting.get() || WebInspector.DeviceModeModel._defaultMobileScaleFactor, true, resetScrollAndPageScale);
            this._applyUserAgent(WebInspector.DeviceModeModel._defaultMobileUserAgent);
            this._applyTouch(true, true);
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
        var scale = this._fitSetting.get();
        if (!scale) {
            if (!screenHeight && this._fixedFitScale) {
                scale = this._fitScale;
            } else {
                scale = 1;
                while (this._availableSize.width < screenWidth * scale || (screenHeight && this._availableSize.height < screenHeight * scale))
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
            Math.max(0, (this._availableSize.height - screenSize.height * scale) / 2),
            screenSize.width * scale,
            screenSize.height * scale);
        this._visiblePageRect = new WebInspector.Rect(
            positionX * scale,
            positionY * scale,
            Math.min(pageWidth * scale, this._availableSize.width - this._screenRect.left - positionX * scale),
            Math.min(pageHeight * scale, this._availableSize.height - this._screenRect.top - positionY * scale));
        this._fitScale = scale;
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

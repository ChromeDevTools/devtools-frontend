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

    this._fitSetting = WebInspector.settings.createSetting("deviceFitWindow", true);
    this._fitSetting.addChangeListener(this._fitSettingChanged, this);
    this._genericWidthSetting = WebInspector.settings.createSetting("deviceGenericWidth", 0);
    this._genericWidthSetting.set(0);
    this._genericWidthSetting.addChangeListener(this._genericWidthSettingChanged, this);

    /** @type {!WebInspector.DeviceModeModel.Type} */
    this._type = WebInspector.DeviceModeModel.Type.Desktop;
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
    /** @type {string} */
    this._warning = "";
    /** @type {boolean} */
    this._emulatingMobile = false;

    /** @type {?WebInspector.Target} */
    this._target = null;
    WebInspector.targetManager.observeTargets(this, WebInspector.Target.Type.Page);
}

/** @enum {string} */
WebInspector.DeviceModeModel.Type = {
    Mobile: "Mobile",
    Tablet: "Tablet",
    Desktop: "Desktop",
    Device: "Device"
}

WebInspector.DeviceModeModel.MaxDeviceSize = 10000;

/**
 * @param {string} value
 * @return {string}
 */
WebInspector.DeviceModeModel.deviceSizeValidator = function(value)
{
    if (!value || (/^[\d]+$/.test(value) && value >= 0 && value <= WebInspector.OverridesSupport.MaxDeviceSize))
        return "";
    return WebInspector.UIString("Value must be non-negative integer");
}

WebInspector.DeviceModeModel._touchEventsScriptIdSymbol = Symbol("DeviceModeModel.touchEventsScriptIdSymbol");
// TODO(paulirish): decide on these.
WebInspector.DeviceModeModel._genericMobileUserAgent = "Mozilla/5.0 (Linux; Android 4.4.4; Nexus 5 Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.114 Mobile Safari/537.36";
WebInspector.DeviceModeModel._genericTabletUserAgent = "Mozilla/5.0 (Linux; Android 4.3; Nexus 7 Build/JSS15Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2307.2 Safari/537.36";

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
     */
    emulate: function(type, device)
    {
        this._type = type;

        if (type === WebInspector.DeviceModeModel.Type.Device) {
            console.assert(device, "Must pass a device for device emulation");
            this._device = device;
            this._mode = device.modes[0];
        } else {
            this._device = null;
            this._mode = null;
            this._genericWidthSetting.removeChangeListener(this._genericWidthSettingChanged, this);
            this._genericWidthSetting.set(type === WebInspector.DeviceModeModel.Type.Desktop ? 0 : (type === WebInspector.DeviceModeModel.Type.Mobile ? 480 : 768));
            this._genericWidthSetting.addChangeListener(this._genericWidthSettingChanged, this);
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
        return new Size(Math.round(this._screenRect.width / this._fitScale), Math.round(this._screenRect.height / this._fitScale));
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
    genericWidthSetting: function()
    {
        return this._genericWidthSetting;
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

    /**
     * @return {string}
     */
    warning: function()
    {
        return this._warning;
    },

    clearWarning: function()
    {
        this._warning = "";
        this._updateCallback.call(this);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        if (!this._target) {
            this._target = target;
            this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this.clearWarning, this);
        }
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        if (this._target === target) {
            this._target.resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this.clearWarning, this);
            this._target = null;
        }
    },

    _fitSettingChanged: function()
    {
        this._calculateAndEmulate(false);
    },

    _genericWidthSettingChanged: function()
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
            var scale = 1;
            // Deliberately ignore fixedFitScale.
            if (this._fitSetting.get()) {
                while (this._availableSize.width < screenWidth * scale || this._availableSize.height < screenHeight * scale)
                    scale *= 0.8;
            }
            this._applyDeviceMetrics(new Size(screenWidth, screenHeight), this._mode.insets, scale, this._device.deviceScaleFactor, this._device.mobile(), resetScrollAndPageScale);
            this._applyUserAgent(this._device.userAgent);
            this._applyTouch(this._device.touch(), this._device.mobile());
            this._applyScreenOrientation(this._mode.orientation == WebInspector.EmulatedDevice.Horizontal ? "landscapePrimary" : "portraitPrimary");
        } else {
            // Zero means fill available size.
            var screenWidth = this._genericWidthSetting.get() || this._availableSize.width;
            var deviceScaleFactor = this._type === WebInspector.DeviceModeModel.Type.Desktop ? 0 : 2;
            var mobile = this._type !== WebInspector.DeviceModeModel.Type.Desktop;

            var scale = 1;
            if (this._fitSetting.get()) {
                if (this._fixedFitScale) {
                    scale = this._fitScale;
                } else {
                    while (this._availableSize.width < screenWidth * scale)
                        scale *= 0.8;
                }
            }
            var screenHeight = Math.floor(this._availableSize.height / scale);
            this._applyDeviceMetrics(new Size(screenWidth, screenHeight), new Insets(0, 0, 0, 0), scale, deviceScaleFactor, mobile, resetScrollAndPageScale);
            this._applyUserAgent(
                this._type === WebInspector.DeviceModeModel.Type.Mobile ? WebInspector.DeviceModeModel._genericMobileUserAgent :
                (this._type === WebInspector.DeviceModeModel.Type.Tablet ? WebInspector.DeviceModeModel._genericTabletUserAgent : ""));
            this._applyTouch(this._type !== WebInspector.DeviceModeModel.Type.Desktop, mobile);
            if (this._type === WebInspector.DeviceModeModel.Type.Desktop)
                this._applyScreenOrientation("");
            else
                this._applyScreenOrientation(screenHeight >= screenWidth ? "portraitPrimary" : "landscapePrimary");
        }
        this._updateCallback.call(null);
    },

    /**
     * @param {string} userAgent
     */
    _applyUserAgent: function(userAgent)
    {
        var current = WebInspector.multitargetNetworkManager.userAgentOverride();
        if (current !== userAgent) {
            WebInspector.multitargetNetworkManager.setUserAgentOverride(userAgent);
            if (!this._warning)
                this._warning = WebInspector.UIString("You might need to reload the page for proper user agent spoofing and viewport rendering.");
        }

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
                this._target.emulationAgent().clearDeviceMetricsOverride(apiCallback.bind(this)) :
                this._target.emulationAgent().setDeviceMetricsOverride(pageWidth, pageHeight, deviceScaleFactor, mobile, false, scale, 0, 0, screenSize.width, screenSize.height, positionX, positionY, apiCallback.bind(this));
            var allPromises = [ setDevicePromise ];
            if (resetScrollAndPageScale)
                allPromises.push(this._target.emulationAgent().resetScrollAndPageScaleFactor());
            return Promise.all(allPromises);
        }

        /**
         * @param {?Protocol.Error} error
         * @this {WebInspector.DeviceModeModel}
         */
        function apiCallback(error)
        {
            if (error) {
                this._warning = WebInspector.UIString("Screen emulation is not available on this page.");
                this._updateCallback.call(null);
                this._deviceMetricsOverrideAppliedForTest();
                return;
            }

            if (mobile !== this._emulatingMobile && !this._warning) {
                this._warning = WebInspector.UIString("You might need to reload the page for proper user agent spoofing and viewport rendering.");
                this._updateCallback.call(null);
            }
            this._emulatingMobile = mobile;
            this._deviceMetricsOverrideAppliedForTest();
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

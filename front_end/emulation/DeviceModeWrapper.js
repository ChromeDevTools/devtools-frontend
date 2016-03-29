// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.InspectedPagePlaceholder} inspectedPagePlaceholder
 * @constructor
 */
WebInspector.DeviceModeWrapper = function(inspectedPagePlaceholder)
{
    WebInspector.VBox.call(this);
    WebInspector.DeviceModeView._wrapperInstance = this;
    this._inspectedPagePlaceholder = inspectedPagePlaceholder;
    /** @type {?WebInspector.DeviceModeView} */
    this._deviceModeView = null;
    this._toggleDeviceModeAction = WebInspector.actionRegistry.action("emulation.toggle-device-mode");
    this._showDeviceModeSetting = WebInspector.settings.createSetting("emulation.showDeviceMode", false);
    this._showDeviceModeSetting.addChangeListener(this._update.bind(this, false));
    this._update(true);
}

/** @type {!WebInspector.DeviceModeWrapper} */
WebInspector.DeviceModeView._wrapperInstance;

WebInspector.DeviceModeWrapper.prototype = {
    _toggleDeviceMode: function()
    {
        this._showDeviceModeSetting.set(!this._showDeviceModeSetting.get());
    },

    /**
     * @return {boolean}
     */
    _captureScreenshot: function()
    {
        if (!this._deviceModeView)
            return false;
        this._deviceModeView.captureScreenshot();
        return true;
    },

    /**
     * @param {boolean} force
     */
    _update: function(force)
    {
        this._toggleDeviceModeAction.setToggled(this._showDeviceModeSetting.get());
        if (!force) {
            var showing = this._deviceModeView && this._deviceModeView.isShowing();
            if (this._showDeviceModeSetting.get() === showing)
                return;
        }

        if (this._showDeviceModeSetting.get()) {
            if (!this._deviceModeView)
                this._deviceModeView = new WebInspector.DeviceModeView();
            this._deviceModeView.show(this.element);
            this._inspectedPagePlaceholder.clearMinimumSizeAndMargins();
            this._inspectedPagePlaceholder.show(this._deviceModeView.element);
        } else {
            if (this._deviceModeView)
                this._deviceModeView.detach();
            this._inspectedPagePlaceholder.restoreMinimumSizeAndMargins();
            this._inspectedPagePlaceholder.show(this.element);
        }
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @constructor
 * @implements {WebInspector.ActionDelegate}
 */
WebInspector.DeviceModeWrapper.ActionDelegate = function()
{
}

WebInspector.DeviceModeWrapper.ActionDelegate.prototype = {
    /**
     * @override
     * @param {!WebInspector.Context} context
     * @param {string} actionId
     * @return {boolean}
     */
    handleAction: function(context, actionId)
    {
        if (WebInspector.DeviceModeView._wrapperInstance) {
            if (actionId === "emulation.toggle-device-mode") {
                WebInspector.DeviceModeView._wrapperInstance._toggleDeviceMode();
                return true;
            }
            if (actionId === "emulation.capture-screenshot")
                return WebInspector.DeviceModeView._wrapperInstance._captureScreenshot();
        }
        return false;
    }
}

// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Emulation.DeviceModeWrapper = class extends UI.VBox {
  /**
   * @param {!Emulation.InspectedPagePlaceholder} inspectedPagePlaceholder
   */
  constructor(inspectedPagePlaceholder) {
    super();
    Emulation.DeviceModeView._wrapperInstance = this;
    this._inspectedPagePlaceholder = inspectedPagePlaceholder;
    /** @type {?Emulation.DeviceModeView} */
    this._deviceModeView = null;
    this._toggleDeviceModeAction = UI.actionRegistry.action('emulation.toggle-device-mode');
    this._showDeviceModeSetting = Common.settings.createSetting('emulation.showDeviceMode', false);
    this._showDeviceModeSetting.addChangeListener(this._update.bind(this, false));
    this._update(true);
  }

  _toggleDeviceMode() {
    this._showDeviceModeSetting.set(!this._showDeviceModeSetting.get());
  }

  /**
   * @return {boolean}
   */
  _captureScreenshot() {
    if (!this._deviceModeView)
      return false;
    this._deviceModeView.captureScreenshot();
    return true;
  }

  /**
   * @return {boolean}
   */
  _captureFullSizeScreenshot() {
    if (!this._deviceModeView)
      return false;
    this._deviceModeView.captureFullSizeScreenshot();
    return true;
  }

  /**
   * @param {boolean} force
   */
  _update(force) {
    this._toggleDeviceModeAction.setToggled(this._showDeviceModeSetting.get());
    if (!force) {
      var showing = this._deviceModeView && this._deviceModeView.isShowing();
      if (this._showDeviceModeSetting.get() === showing)
        return;
    }

    if (this._showDeviceModeSetting.get()) {
      if (!this._deviceModeView)
        this._deviceModeView = new Emulation.DeviceModeView();
      this._deviceModeView.show(this.element);
      this._inspectedPagePlaceholder.clearMinimumSize();
      this._inspectedPagePlaceholder.show(this._deviceModeView.element);
    } else {
      if (this._deviceModeView)
        this._deviceModeView.detach();
      this._inspectedPagePlaceholder.restoreMinimumSize();
      this._inspectedPagePlaceholder.show(this.element);
    }
  }
};

/** @type {!Emulation.DeviceModeWrapper} */
Emulation.DeviceModeView._wrapperInstance;

/**
 * @implements {UI.ActionDelegate}
 * @unrestricted
 */
Emulation.DeviceModeWrapper.ActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    if (Emulation.DeviceModeView._wrapperInstance) {
      switch (actionId) {
        case 'emulation.capture-screenshot':
          return Emulation.DeviceModeView._wrapperInstance._captureScreenshot();

        case 'emulation.capture-full-height-screenshot':
          return Emulation.DeviceModeView._wrapperInstance._captureFullSizeScreenshot();

        case 'emulation.toggle-device-mode':
          Emulation.DeviceModeView._wrapperInstance._toggleDeviceMode();
          return true;
      }
    }
    return false;
  }
};

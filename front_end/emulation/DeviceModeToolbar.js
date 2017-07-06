// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Emulation.DeviceModeToolbar = class {
  /**
   * @param {!Emulation.DeviceModeModel} model
   * @param {!Common.Setting} showMediaInspectorSetting
   * @param {!Common.Setting} showRulersSetting
   */
  constructor(model, showMediaInspectorSetting, showRulersSetting) {
    this._model = model;
    this._showMediaInspectorSetting = showMediaInspectorSetting;
    this._showRulersSetting = showRulersSetting;

    this._deviceOutlineSetting = this._model.deviceOutlineSetting();
    this._showDeviceScaleFactorSetting = Common.settings.createSetting('emulation.showDeviceScaleFactor', false);
    this._showDeviceScaleFactorSetting.addChangeListener(this._updateDeviceScaleFactorVisibility, this);

    this._showUserAgentTypeSetting = Common.settings.createSetting('emulation.showUserAgentType', false);
    this._showUserAgentTypeSetting.addChangeListener(this._updateUserAgentTypeVisibility, this);

    /** @type {!Map<!Emulation.EmulatedDevice, !Emulation.EmulatedDevice.Mode>} */
    this._lastMode = new Map();

    /** @type {!Map<!Emulation.EmulatedDevice, number>} */
    this._lastScale = new Map();

    this._element = createElementWithClass('div', 'device-mode-toolbar');

    var leftContainer = this._element.createChild('div', 'device-mode-toolbar-spacer');
    leftContainer.createChild('div', 'device-mode-toolbar-spacer');
    var leftToolbar = new UI.Toolbar('', leftContainer);
    leftToolbar.makeWrappable();
    this._fillLeftToolbar(leftToolbar);

    var mainToolbar = new UI.Toolbar('', this._element);
    mainToolbar.makeWrappable();
    this._fillMainToolbar(mainToolbar);

    var rightContainer = this._element.createChild('div', 'device-mode-toolbar-spacer');
    var rightToolbar = new UI.Toolbar('device-mode-toolbar-fixed-size', rightContainer);
    rightToolbar.makeWrappable();
    this._fillRightToolbar(rightToolbar);
    var modeToolbar = new UI.Toolbar('device-mode-toolbar-fixed-size', rightContainer);
    modeToolbar.makeWrappable();
    this._fillModeToolbar(modeToolbar);
    rightContainer.createChild('div', 'device-mode-toolbar-spacer');
    var optionsToolbar = new UI.Toolbar('', rightContainer);
    optionsToolbar.makeWrappable(true);
    this._fillOptionsToolbar(optionsToolbar);

    this._emulatedDevicesList = Emulation.EmulatedDevicesList.instance();
    this._emulatedDevicesList.addEventListener(
        Emulation.EmulatedDevicesList.Events.CustomDevicesUpdated, this._deviceListChanged, this);
    this._emulatedDevicesList.addEventListener(
        Emulation.EmulatedDevicesList.Events.StandardDevicesUpdated, this._deviceListChanged, this);

    this._persistenceSetting =
        Common.settings.createSetting('emulation.deviceModeValue', {device: '', orientation: '', mode: ''});

    this._model.toolbarControlsEnabledSetting().addChangeListener(updateToolbarsEnabled);
    updateToolbarsEnabled();

    function updateToolbarsEnabled() {
      var enabled = model.toolbarControlsEnabledSetting().get();
      leftToolbar.setEnabled(enabled);
      mainToolbar.setEnabled(enabled);
      rightToolbar.setEnabled(enabled);
      modeToolbar.setEnabled(enabled);
      optionsToolbar.setEnabled(enabled);
    }
  }

  /**
   * @param {!UI.Toolbar} toolbar
   */
  _fillLeftToolbar(toolbar) {
    toolbar.appendToolbarItem(
        this._wrapToolbarItem(createElementWithClass('div', 'device-mode-empty-toolbar-element')));
    this._deviceSelectItem = new UI.ToolbarMenuButton(this._appendDeviceMenuItems.bind(this));
    this._deviceSelectItem.setGlyph('');
    this._deviceSelectItem.turnIntoSelect(95);
    toolbar.appendToolbarItem(this._deviceSelectItem);
  }

  /**
   * @param {!UI.Toolbar} toolbar
   */
  _fillMainToolbar(toolbar) {
    var widthInput = UI.createInput('device-mode-size-input', 'text');
    widthInput.maxLength = 4;
    widthInput.title = Common.UIString('Width');
    this._updateWidthInput =
        UI.bindInput(widthInput, this._applyWidth.bind(this), Emulation.DeviceModeModel.deviceSizeValidator, true);
    this._widthInput = widthInput;
    this._widthItem = this._wrapToolbarItem(widthInput);
    toolbar.appendToolbarItem(this._widthItem);

    var xElement = createElementWithClass('div', 'device-mode-x');
    xElement.textContent = '\u00D7';
    this._xItem = this._wrapToolbarItem(xElement);
    toolbar.appendToolbarItem(this._xItem);

    var heightInput = UI.createInput('device-mode-size-input', 'text');
    heightInput.maxLength = 4;
    heightInput.title = Common.UIString('Height (leave empty for full)');
    this._updateHeightInput = UI.bindInput(heightInput, this._applyHeight.bind(this), validateHeight, true);
    this._heightInput = heightInput;
    this._heightItem = this._wrapToolbarItem(heightInput);
    toolbar.appendToolbarItem(this._heightItem);

    /**
     * @param {string} value
     * @return {boolean}
     */
    function validateHeight(value) {
      return !value || Emulation.DeviceModeModel.deviceSizeValidator(value);
    }
  }

  /**
   * @param {string} value
   */
  _applyWidth(value) {
    var width = value ? Number(value) : 0;
    this._model.setWidthAndScaleToFit(width);
  }

  /**
   * @param {string} value
   */
  _applyHeight(value) {
    var height = value ? Number(value) : 0;
    this._model.setHeightAndScaleToFit(height);
  }

  /**
   * @param {!UI.Toolbar} toolbar
   */
  _fillRightToolbar(toolbar) {
    toolbar.appendToolbarItem(
        this._wrapToolbarItem(createElementWithClass('div', 'device-mode-empty-toolbar-element')));
    this._scaleItem = new UI.ToolbarMenuButton(this._appendScaleMenuItems.bind(this));
    this._scaleItem.setTitle(Common.UIString('Zoom'));
    this._scaleItem.setGlyph('');
    this._scaleItem.turnIntoSelect();
    toolbar.appendToolbarItem(this._scaleItem);

    toolbar.appendToolbarItem(
        this._wrapToolbarItem(createElementWithClass('div', 'device-mode-empty-toolbar-element')));
    this._deviceScaleItem = new UI.ToolbarMenuButton(this._appendDeviceScaleMenuItems.bind(this));
    this._deviceScaleItem.setVisible(this._showDeviceScaleFactorSetting.get());
    this._deviceScaleItem.setTitle(Common.UIString('Device pixel ratio'));
    this._deviceScaleItem.setGlyph('');
    this._deviceScaleItem.turnIntoSelect();
    toolbar.appendToolbarItem(this._deviceScaleItem);

    toolbar.appendToolbarItem(
        this._wrapToolbarItem(createElementWithClass('div', 'device-mode-empty-toolbar-element')));
    this._uaItem = new UI.ToolbarMenuButton(this._appendUserAgentMenuItems.bind(this));
    this._uaItem.setVisible(this._showUserAgentTypeSetting.get());
    this._uaItem.setTitle(Common.UIString('Device type'));
    this._uaItem.setGlyph('');
    this._uaItem.turnIntoSelect();
    toolbar.appendToolbarItem(this._uaItem);

    this._throttlingConditionsItem = MobileThrottling.throttlingManager().createMobileThrottlingButton();
    toolbar.appendToolbarItem(this._throttlingConditionsItem);
  }

  /**
   * @param {!UI.Toolbar} toolbar
   */
  _fillModeToolbar(toolbar) {
    toolbar.appendToolbarItem(
        this._wrapToolbarItem(createElementWithClass('div', 'device-mode-empty-toolbar-element')));
    this._modeButton = new UI.ToolbarButton('', 'largeicon-rotate-screen');
    this._modeButton.addEventListener(UI.ToolbarButton.Events.Click, this._modeMenuClicked, this);
    toolbar.appendToolbarItem(this._modeButton);
  }

  /**
   * @param {!UI.Toolbar} toolbar
   */
  _fillOptionsToolbar(toolbar) {
    var moreOptionsButton = new UI.ToolbarMenuButton(this._appendOptionsMenuItems.bind(this));
    moreOptionsButton.setTitle(Common.UIString('More options'));
    toolbar.appendToolbarItem(moreOptionsButton);

    toolbar.appendToolbarItem(
        this._wrapToolbarItem(createElementWithClass('div', 'device-mode-empty-toolbar-element')));
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   */
  _appendScaleMenuItems(contextMenu) {
    if (this._model.type() === Emulation.DeviceModeModel.Type.Device) {
      contextMenu.appendItem(
          Common.UIString('Fit to window (%.0f%%)', this._model.fitScale() * 100),
          this._onScaleMenuChanged.bind(this, this._model.fitScale()), false);
      contextMenu.appendSeparator();
    }
    var boundAppendScaleItem = appendScaleItem.bind(this);
    boundAppendScaleItem(Common.UIString('50%'), 0.5);
    boundAppendScaleItem(Common.UIString('75%'), 0.75);
    boundAppendScaleItem(Common.UIString('100%'), 1);
    boundAppendScaleItem(Common.UIString('125%'), 1.25);
    boundAppendScaleItem(Common.UIString('150%'), 1.5);

    /**
     * @param {string} title
     * @param {number} value
     * @this {!Emulation.DeviceModeToolbar}
     */
    function appendScaleItem(title, value) {
      contextMenu.appendCheckboxItem(
          title, this._onScaleMenuChanged.bind(this, value), this._model.scaleSetting().get() === value, false);
    }
  }

  /**
   * @param {number} value
   */
  _onScaleMenuChanged(value) {
    var device = this._model.device();
    if (device)
      this._lastScale.set(device, value);
    this._model.scaleSetting().set(value);
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   */
  _appendDeviceScaleMenuItems(contextMenu) {
    var deviceScaleFactorSetting = this._model.deviceScaleFactorSetting();
    var defaultValue = this._model.uaSetting().get() === Emulation.DeviceModeModel.UA.Mobile ||
            this._model.uaSetting().get() === Emulation.DeviceModeModel.UA.MobileNoTouch ?
        Emulation.DeviceModeModel.defaultMobileScaleFactor :
        window.devicePixelRatio;
    appendDeviceScaleFactorItem(Common.UIString('Default: %.1f', defaultValue), 0);
    contextMenu.appendSeparator();
    appendDeviceScaleFactorItem(Common.UIString('1'), 1);
    appendDeviceScaleFactorItem(Common.UIString('2'), 2);
    appendDeviceScaleFactorItem(Common.UIString('3'), 3);

    /**
     * @param {string} title
     * @param {number} value
     */
    function appendDeviceScaleFactorItem(title, value) {
      contextMenu.appendCheckboxItem(
          title, deviceScaleFactorSetting.set.bind(deviceScaleFactorSetting, value),
          deviceScaleFactorSetting.get() === value);
    }
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   */
  _appendUserAgentMenuItems(contextMenu) {
    var uaSetting = this._model.uaSetting();
    appendUAItem(Emulation.DeviceModeModel.UA.Mobile, Emulation.DeviceModeModel.UA.Mobile);
    appendUAItem(Emulation.DeviceModeModel.UA.MobileNoTouch, Emulation.DeviceModeModel.UA.MobileNoTouch);
    appendUAItem(Emulation.DeviceModeModel.UA.Desktop, Emulation.DeviceModeModel.UA.Desktop);
    appendUAItem(Emulation.DeviceModeModel.UA.DesktopTouch, Emulation.DeviceModeModel.UA.DesktopTouch);

    /**
     * @param {string} title
     * @param {!Emulation.DeviceModeModel.UA} value
     */
    function appendUAItem(title, value) {
      contextMenu.appendCheckboxItem(title, uaSetting.set.bind(uaSetting, value), uaSetting.get() === value);
    }
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   */
  _appendOptionsMenuItems(contextMenu) {
    var model = this._model;
    appendToggleItem(
        this._deviceOutlineSetting, Common.UIString('Hide device frame'), Common.UIString('Show device frame'),
        model.type() !== Emulation.DeviceModeModel.Type.Device);
    appendToggleItem(
        this._showMediaInspectorSetting, Common.UIString('Hide media queries'), Common.UIString('Show media queries'));
    appendToggleItem(this._showRulersSetting, Common.UIString('Hide rulers'), Common.UIString('Show rulers'));
    contextMenu.appendSeparator();
    appendToggleItem(
        this._showDeviceScaleFactorSetting, Common.UIString('Remove device pixel ratio'),
        Common.UIString('Add device pixel ratio'));
    appendToggleItem(
        this._showUserAgentTypeSetting, Common.UIString('Remove device type'), Common.UIString('Add device type'));
    contextMenu.appendSeparator();
    contextMenu.appendItemsAtLocation('deviceModeMenu');
    contextMenu.appendSeparator();
    contextMenu.appendItem(Common.UIString('Reset to defaults'), this._reset.bind(this));

    /**
     * @param {!Common.Setting} setting
     * @param {string} title1
     * @param {string} title2
     * @param {boolean=} disabled
     */
    function appendToggleItem(setting, title1, title2, disabled) {
      if (typeof disabled === 'undefined')
        disabled = model.type() === Emulation.DeviceModeModel.Type.None;
      contextMenu.appendItem(setting.get() ? title1 : title2, setting.set.bind(setting, !setting.get()), disabled);
    }
  }

  _reset() {
    this._deviceOutlineSetting.set(false);
    this._showDeviceScaleFactorSetting.set(false);
    this._showUserAgentTypeSetting.set(false);
    this._showMediaInspectorSetting.set(false);
    this._showRulersSetting.set(false);
    this._model.reset();
  }

  /**
   * @param {!Element} element
   * @return {!UI.ToolbarItem}
   */
  _wrapToolbarItem(element) {
    var container = createElement('div');
    var shadowRoot = UI.createShadowRootWithCoreStyles(container, 'emulation/deviceModeToolbar.css');
    shadowRoot.appendChild(element);
    return new UI.ToolbarItem(container);
  }

  /**
   * @param {!Emulation.EmulatedDevice} device
   */
  _emulateDevice(device) {
    this._model.emulate(
        Emulation.DeviceModeModel.Type.Device, device, this._lastMode.get(device) || device.modes[0],
        this._lastScale.get(device));
  }

  _switchToResponsive() {
    this._model.emulate(Emulation.DeviceModeModel.Type.Responsive, null, null);
  }

  /**
   * @param {!Array<!Emulation.EmulatedDevice>} devices
   * @return {!Array<!Emulation.EmulatedDevice>}
   */
  _filterDevices(devices) {
    devices = devices.filter(function(d) {
      return d.show();
    });
    devices.sort(Emulation.EmulatedDevice.deviceComparator);
    return devices;
  }

  /**
   * @return {!Array<!Emulation.EmulatedDevice>}
   */
  _standardDevices() {
    return this._filterDevices(this._emulatedDevicesList.standard());
  }

  /**
   * @return {!Array<!Emulation.EmulatedDevice>}
   */
  _customDevices() {
    return this._filterDevices(this._emulatedDevicesList.custom());
  }

  /**
   * @return {!Array<!Emulation.EmulatedDevice>}
   */
  _allDevices() {
    return this._standardDevices().concat(this._customDevices());
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   */
  _appendDeviceMenuItems(contextMenu) {
    contextMenu.appendCheckboxItem(
        Common.UIString('Responsive'), this._switchToResponsive.bind(this),
        this._model.type() === Emulation.DeviceModeModel.Type.Responsive, false);
    appendGroup.call(this, this._standardDevices());
    appendGroup.call(this, this._customDevices());
    contextMenu.appendSeparator();
    contextMenu.appendItem(
        Common.UIString('Edit\u2026'), this._emulatedDevicesList.revealCustomSetting.bind(this._emulatedDevicesList),
        false);

    /**
     * @param {!Array<!Emulation.EmulatedDevice>} devices
     * @this {Emulation.DeviceModeToolbar}
     */
    function appendGroup(devices) {
      if (!devices.length)
        return;
      contextMenu.appendSeparator();
      for (var device of devices) {
        contextMenu.appendCheckboxItem(
            device.title, this._emulateDevice.bind(this, device), this._model.device() === device, false);
      }
    }
  }

  /**
   * @this {Emulation.DeviceModeToolbar}
   */
  _deviceListChanged() {
    var device = this._model.device();
    if (!device)
      return;

    var devices = this._allDevices();
    if (devices.indexOf(device) === -1) {
      if (devices.length)
        this._emulateDevice(devices[0]);
      else
        this._model.emulate(Emulation.DeviceModeModel.Type.Responsive, null, null);
    }
  }

  _updateDeviceScaleFactorVisibility() {
    this._deviceScaleItem.setVisible(this._showDeviceScaleFactorSetting.get());
  }

  _updateUserAgentTypeVisibility() {
    this._uaItem.setVisible(this._showUserAgentTypeSetting.get());
  }

  /**
   * @param {!Common.Event} event
   */
  _modeMenuClicked(event) {
    var device = this._model.device();
    var model = this._model;

    if (device.modes.length === 2 && device.modes[0].orientation !== device.modes[1].orientation) {
      model.emulate(model.type(), model.device(), model.mode() === device.modes[0] ? device.modes[1] : device.modes[0]);
      return;
    }

    var contextMenu = new UI.ContextMenu(
        /** @type {!Event} */ (event.data), false, this._modeButton.element.totalOffsetLeft(),
        this._modeButton.element.totalOffsetTop() + this._modeButton.element.offsetHeight);
    addOrientation(Emulation.EmulatedDevice.Vertical, Common.UIString('Portrait'));
    addOrientation(Emulation.EmulatedDevice.Horizontal, Common.UIString('Landscape'));
    contextMenu.show();

    /**
     * @param {string} orientation
     * @param {string} title
     */
    function addOrientation(orientation, title) {
      var modes = device.modesForOrientation(orientation);
      if (!modes.length)
        return;
      if (modes.length === 1) {
        addMode(modes[0], title);
      } else {
        for (var index = 0; index < modes.length; index++)
          addMode(modes[index], title + ' \u2013 ' + modes[index].title);
      }
    }

    /**
     * @param {!Emulation.EmulatedDevice.Mode} mode
     * @param {string} title
     */
    function addMode(mode, title) {
      contextMenu.appendCheckboxItem(title, applyMode.bind(null, mode), model.mode() === mode, false);
    }

    /**
     * @param {!Emulation.EmulatedDevice.Mode} mode
     */
    function applyMode(mode) {
      model.emulate(model.type(), model.device(), mode);
    }
  }

  /**
   * @return {!Element}
   */
  element() {
    return this._element;
  }

  update() {
    if (this._model.type() !== this._cachedModelType) {
      this._cachedModelType = this._model.type();
      this._widthInput.disabled = this._model.type() !== Emulation.DeviceModeModel.Type.Responsive;
      this._heightInput.disabled = this._model.type() !== Emulation.DeviceModeModel.Type.Responsive;
      this._deviceScaleItem.setEnabled(this._model.type() === Emulation.DeviceModeModel.Type.Responsive);
      this._uaItem.setEnabled(this._model.type() === Emulation.DeviceModeModel.Type.Responsive);
    }

    var size = this._model.appliedDeviceSize();
    this._updateHeightInput(
        this._model.type() === Emulation.DeviceModeModel.Type.Responsive && this._model.isFullHeight() ?
            '' :
            String(size.height));
    this._updateWidthInput(String(size.width));
    this._heightInput.placeholder = size.height;

    if (this._model.scale() !== this._cachedScale) {
      this._scaleItem.setText(Common.UIString('%.0f%%', this._model.scale() * 100));
      this._cachedScale = this._model.scale();
    }

    var deviceScale = this._model.appliedDeviceScaleFactor();
    if (deviceScale !== this._cachedDeviceScale) {
      this._deviceScaleItem.setText(Common.UIString('DPR: %.1f', deviceScale));
      this._cachedDeviceScale = deviceScale;
    }

    var uaType = this._model.appliedUserAgentType();
    if (uaType !== this._cachedUaType) {
      this._uaItem.setText(uaType);
      this._cachedUaType = uaType;
    }

    var deviceItemTitle = Common.UIString('None');
    if (this._model.type() === Emulation.DeviceModeModel.Type.Responsive)
      deviceItemTitle = Common.UIString('Responsive');
    if (this._model.type() === Emulation.DeviceModeModel.Type.Device)
      deviceItemTitle = this._model.device().title;
    this._deviceSelectItem.setText(deviceItemTitle);

    if (this._model.device() !== this._cachedModelDevice) {
      var device = this._model.device();
      this._modeButton.setVisible(!!device);
      if (device) {
        var modeCount = device ? device.modes.length : 0;
        this._modeButton.setEnabled(modeCount >= 2);
        this._modeButton.setTitle(modeCount === 2 ? Common.UIString('Rotate') : Common.UIString('Screen options'));
      }
      this._cachedModelDevice = device;
    }

    if (this._model.type() === Emulation.DeviceModeModel.Type.Device) {
      this._lastMode.set(
          /** @type {!Emulation.EmulatedDevice} */ (this._model.device()),
          /** @type {!Emulation.EmulatedDevice.Mode} */ (this._model.mode()));
    }

    if (this._model.mode() !== this._cachedModelMode && this._model.type() !== Emulation.DeviceModeModel.Type.None) {
      this._cachedModelMode = this._model.mode();
      var value = this._persistenceSetting.get();
      if (this._model.device()) {
        value.device = this._model.device().title;
        value.orientation = this._model.mode() ? this._model.mode().orientation : '';
        value.mode = this._model.mode() ? this._model.mode().title : '';
      } else {
        value.device = '';
        value.orientation = '';
        value.mode = '';
      }
      this._persistenceSetting.set(value);
    }
  }

  restore() {
    for (var device of this._allDevices()) {
      if (device.title === this._persistenceSetting.get().device) {
        for (var mode of device.modes) {
          if (mode.orientation === this._persistenceSetting.get().orientation &&
              mode.title === this._persistenceSetting.get().mode) {
            this._lastMode.set(device, mode);
            this._emulateDevice(device);
            return;
          }
        }
      }
    }

    this._model.emulate(Emulation.DeviceModeModel.Type.Responsive, null, null);
  }
};

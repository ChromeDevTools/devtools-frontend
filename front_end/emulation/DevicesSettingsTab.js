// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as UI from '../ui/ui.js';

import {DeviceModeModel, MaxDeviceNameLength, UA} from './DeviceModeModel.js';
import {Capability, EmulatedDevice, EmulatedDevicesList, Events, Horizontal, Vertical,} from './EmulatedDevices.js';

/**
 * @implements {UI.ListWidget.Delegate}
 * @unrestricted
 */
export class DevicesSettingsTab extends UI.Widget.VBox {
  constructor() {
    super();
    this.element.classList.add('settings-tab-container');
    this.element.classList.add('devices-settings-tab');
    this.registerRequiredCSS('emulation/devicesSettingsTab.css');

    const header = this.element.createChild('header');
    header.createChild('h1').createTextChild(ls`Emulated Devices`);
    this.containerElement = this.element.createChild('div', 'settings-container-wrapper')
                                .createChild('div', 'settings-tab settings-content settings-container');

    const buttonsRow = this.containerElement.createChild('div', 'devices-button-row');
    this._addCustomButton =
        UI.UIUtils.createTextButton(Common.UIString.UIString('Add custom device...'), this._addCustomDevice.bind(this));
    buttonsRow.appendChild(this._addCustomButton);

    this._list = new UI.ListWidget.ListWidget(this);
    this._list.registerRequiredCSS('emulation/devicesSettingsTab.css');
    this._list.element.classList.add('devices-list');
    this._list.show(this.containerElement);

    this._muteUpdate = false;
    this._emulatedDevicesList = EmulatedDevicesList.instance();
    this._emulatedDevicesList.addEventListener(Events.CustomDevicesUpdated, this._devicesUpdated, this);
    this._emulatedDevicesList.addEventListener(Events.StandardDevicesUpdated, this._devicesUpdated, this);

    this.setDefaultFocusedElement(this._addCustomButton);
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    this._devicesUpdated();
  }

  _devicesUpdated() {
    if (this._muteUpdate) {
      return;
    }

    this._list.clear();

    let devices = this._emulatedDevicesList.custom().slice();
    for (let i = 0; i < devices.length; ++i) {
      this._list.appendItem(devices[i], true);
    }

    this._list.appendSeparator();

    devices = this._emulatedDevicesList.standard().slice();
    devices.sort(EmulatedDevice.deviceComparator);
    for (let i = 0; i < devices.length; ++i) {
      this._list.appendItem(devices[i], false);
    }
  }

  /**
   * @param {boolean} custom
   */
  _muteAndSaveDeviceList(custom) {
    this._muteUpdate = true;
    if (custom) {
      this._emulatedDevicesList.saveCustomDevices();
    } else {
      this._emulatedDevicesList.saveStandardDevices();
    }
    this._muteUpdate = false;
  }

  _addCustomDevice() {
    const device = new EmulatedDevice();
    device.deviceScaleFactor = 0;
    device.horizontal.width = 700;
    device.horizontal.height = 400;
    device.vertical.width = 400;
    device.vertical.height = 700;
    this._list.addNewItem(this._emulatedDevicesList.custom().length, device);
  }

  /**
   * @param {number} value
   * @return {string}
   */
  _toNumericInputValue(value) {
    return value ? String(value) : '';
  }

  /**
   * @override
   * @param {*} item
   * @param {boolean} editable
   * @return {!Element}
   */
  renderItem(item, editable) {
    const device = /** @type {!EmulatedDevice} */ (item);
    const element = createElementWithClass('div', 'devices-list-item');
    const checkbox = element.createChild('input', 'devices-list-checkbox');
    checkbox.type = 'checkbox';
    checkbox.checked = device.show();
    checkbox.addEventListener('click', event => event.consume(), false);
    element.createChild('div', 'devices-list-title').textContent = device.title;
    element.addEventListener('click', onItemClicked.bind(this), false);
    return element;

    /**
     * @param {!Event} event
     * @this {DevicesSettingsTab}
     */
    function onItemClicked(event) {
      const show = !checkbox.checked;
      device.setShow(show);
      this._muteAndSaveDeviceList(editable);
      checkbox.checked = show;
      event.consume();
    }
  }

  /**
   * @override
   * @param {*} item
   * @param {number} index
   */
  removeItemRequested(item, index) {
    this._emulatedDevicesList.removeCustomDevice(/** @type {!EmulatedDevice} */ (item));
  }

  /**
   * @override
   * @param {*} item
   * @param {!UI.ListWidget.Editor} editor
   * @param {boolean} isNew
   */
  commitEdit(item, editor, isNew) {
    const device = /** @type {!EmulatedDevice} */ (item);
    device.title = editor.control('title').value.trim();
    device.vertical.width = editor.control('width').value ? parseInt(editor.control('width').value, 10) : 0;
    device.vertical.height = editor.control('height').value ? parseInt(editor.control('height').value, 10) : 0;
    device.horizontal.width = device.vertical.height;
    device.horizontal.height = device.vertical.width;
    device.deviceScaleFactor = editor.control('scale').value ? parseFloat(editor.control('scale').value) : 0;
    device.userAgent = editor.control('user-agent').value;
    device.modes = [];
    device.modes.push({title: '', orientation: Vertical, insets: new UI.Geometry.Insets(0, 0, 0, 0), image: null});
    device.modes.push({title: '', orientation: Horizontal, insets: new UI.Geometry.Insets(0, 0, 0, 0), image: null});
    device.capabilities = [];
    const uaType = editor.control('ua-type').value;
    if (uaType === UA.Mobile || uaType === UA.MobileNoTouch) {
      device.capabilities.push(Capability.Mobile);
    }
    if (uaType === UA.Mobile || uaType === UA.DesktopTouch) {
      device.capabilities.push(Capability.Touch);
    }
    if (isNew) {
      this._emulatedDevicesList.addCustomDevice(device);
    } else {
      this._emulatedDevicesList.saveCustomDevices();
    }
    this._addCustomButton.scrollIntoViewIfNeeded();
    this._addCustomButton.focus();
  }

  /**
   * @override
   * @param {*} item
   * @return {!UI.ListWidget.Editor}
   */
  beginEdit(item) {
    const device = /** @type {!EmulatedDevice} */ (item);
    const editor = this._createEditor();
    editor.control('title').value = device.title;
    editor.control('width').value = this._toNumericInputValue(device.vertical.width);
    editor.control('height').value = this._toNumericInputValue(device.vertical.height);
    editor.control('scale').value = this._toNumericInputValue(device.deviceScaleFactor);
    editor.control('user-agent').value = device.userAgent;
    let uaType;
    if (device.mobile()) {
      uaType = device.touch() ? UA.Mobile : UA.MobileNoTouch;
    } else {
      uaType = device.touch() ? UA.DesktopTouch : UA.Desktop;
    }
    editor.control('ua-type').value = uaType;
    return editor;
  }

  /**
   * @return {!UI.ListWidget.Editor}
   */
  _createEditor() {
    if (this._editor) {
      return this._editor;
    }

    const editor = new UI.ListWidget.Editor();
    this._editor = editor;
    const content = editor.contentElement();

    const fields = content.createChild('div', 'devices-edit-fields');
    fields.createChild('div', 'hbox').appendChild(editor.createInput('title', 'text', ls`Device Name`, titleValidator));
    const screen = fields.createChild('div', 'hbox');
    screen.appendChild(editor.createInput('width', 'text', ls`Width`, widthValidator));
    screen.appendChild(editor.createInput('height', 'text', ls`Height`, heightValidator));
    const dpr = editor.createInput('scale', 'text', ls`Device pixel ratio`, scaleValidator);
    dpr.classList.add('device-edit-fixed');
    screen.appendChild(dpr);
    const ua = fields.createChild('div', 'hbox');
    ua.appendChild(editor.createInput('user-agent', 'text', ls`User agent string`, () => {
      return {valid: true};
    }));
    const uaTypeOptions = [UA.Mobile, UA.MobileNoTouch, UA.Desktop, UA.DesktopTouch];
    const uaType = editor.createSelect('ua-type', uaTypeOptions, () => {
      return {valid: true};
    }, ls`User agent type`);
    uaType.classList.add('device-edit-fixed');
    ua.appendChild(uaType);

    return editor;

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function titleValidator(item, index, input) {
      let valid = false;
      let errorMessage;

      const value = input.value.trim();
      if (value.length >= MaxDeviceNameLength) {
        errorMessage = ls`Device name must be less than ${MaxDeviceNameLength} characters.`;
      } else if (value.length === 0) {
        errorMessage = ls`Device name cannot be empty.`;
      } else {
        valid = true;
      }

      return {valid, errorMessage};
    }

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function widthValidator(item, index, input) {
      return DeviceModeModel.widthValidator(input.value);
    }

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function heightValidator(item, index, input) {
      return DeviceModeModel.heightValidator(input.value);
    }

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function scaleValidator(item, index, input) {
      return DeviceModeModel.scaleValidator(input.value);
    }
  }
}

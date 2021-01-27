// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import {ls} from '../platform/platform.js';
import * as UI from '../ui/ui.js';

import {DeviceModeModel, MaxDeviceNameLength, UA} from './DeviceModeModel.js';
import {Capability, EmulatedDevice, EmulatedDevicesList, Events, Horizontal, Vertical,} from './EmulatedDevices.js';
import {parseBrandsList, serializeBrandsList, validateAsStructuredHeadersString} from './UserAgentMetadata.js';

/** @type {!DevicesSettingsTab} */
let devicesSettingsTabInstance;

/**
 * @implements {UI.ListWidget.Delegate<!EmulatedDevice>}
 */
export class DevicesSettingsTab extends UI.Widget.VBox {
  /** @private */
  constructor() {
    super();
    this.element.classList.add('settings-tab-container');
    this.element.classList.add('devices-settings-tab');
    this.registerRequiredCSS('emulation/devicesSettingsTab.css', {enableLegacyPatching: true});

    const header = this.element.createChild('header');
    UI.UIUtils.createTextChild(header.createChild('h1'), ls`Emulated Devices`);
    this.containerElement = this.element.createChild('div', 'settings-container-wrapper')
                                .createChild('div', 'settings-tab settings-content settings-container');

    const buttonsRow = this.containerElement.createChild('div', 'devices-button-row');
    this._addCustomButton =
        UI.UIUtils.createTextButton(Common.UIString.UIString('Add custom device...'), this._addCustomDevice.bind(this));
    this._addCustomButton.id = 'custom-device-add-button';
    buttonsRow.appendChild(this._addCustomButton);

    this._list = new UI.ListWidget.ListWidget(this, false /* delegatesFocus */);
    this._list.registerRequiredCSS('emulation/devicesSettingsTab.css', {enableLegacyPatching: true});
    this._list.element.classList.add('devices-list');
    this._list.show(this.containerElement);

    this._muteUpdate = false;
    this._emulatedDevicesList = EmulatedDevicesList.instance();
    this._emulatedDevicesList.addEventListener(Events.CustomDevicesUpdated, this._devicesUpdated, this);
    this._emulatedDevicesList.addEventListener(Events.StandardDevicesUpdated, this._devicesUpdated, this);

    this.setDefaultFocusedElement(this._addCustomButton);
  }

  static instance() {
    if (!devicesSettingsTabInstance) {
      devicesSettingsTabInstance = new DevicesSettingsTab();
    }
    return devicesSettingsTabInstance;
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
   * @param {!EmulatedDevice} device
   * @param {boolean} editable
   * @return {!Element}
   */
  renderItem(device, editable) {
    const label = document.createElement('label');
    label.classList.add('devices-list-item');
    const checkbox = /** @type {!HTMLInputElement}*/ (label.createChild('input', 'devices-list-checkbox'));
    checkbox.type = 'checkbox';
    checkbox.checked = device.show();
    checkbox.addEventListener('click', onItemClicked.bind(this), false);
    const span = document.createElement('span');
    span.classList.add('device-name');
    span.appendChild(document.createTextNode(device.title));
    label.appendChild(span);
    return label;

    /**
     * @param {!Event} event
     * @this {DevicesSettingsTab}
     */
    function onItemClicked(event) {
      const show = checkbox.checked;
      device.setShow(show);
      this._muteAndSaveDeviceList(editable);
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
   * @param {!EmulatedDevice} device
   * @param {!UI.ListWidget.Editor<!EmulatedDevice>} editor
   * @param {boolean} isNew
   */
  commitEdit(device, editor, isNew) {
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
    const brandsOrError = parseBrandsList(editor.control('brands').value.trim(), 'unused_err1', 'unused_err2');
    device.userAgentMetadata = {
      brands: (typeof brandsOrError === 'string' ? [] : brandsOrError),
      fullVersion: editor.control('full-version').value.trim(),
      platform: editor.control('platform').value.trim(),
      platformVersion: editor.control('platform-version').value.trim(),
      architecture: editor.control('arch').value.trim(),
      model: editor.control('model').value.trim(),
      mobile: (uaType === UA.Mobile || uaType === UA.MobileNoTouch)
    };
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
   * @param {!EmulatedDevice} device
   * @return {!UI.ListWidget.Editor<!EmulatedDevice>}
   */
  beginEdit(device) {
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
    if (device.userAgentMetadata) {
      editor.control('brands').value = serializeBrandsList(device.userAgentMetadata.brands || []);
      editor.control('full-version').value = device.userAgentMetadata.fullVersion || '';
      editor.control('platform').value = device.userAgentMetadata.platform;
      editor.control('platform-version').value = device.userAgentMetadata.platformVersion;
      editor.control('arch').value = device.userAgentMetadata.architecture;
      editor.control('model').value = device.userAgentMetadata.model;
    }
    return editor;
  }

  /**
   * @return {!UI.ListWidget.Editor<!EmulatedDevice>}
   */
  _createEditor() {
    if (this._editor) {
      return this._editor;
    }

    const editor = new UI.ListWidget.Editor();
    this._editor = editor;
    const content = editor.contentElement();

    const deviceFields = content.createChild('div', 'devices-edit-fields');
    UI.UIUtils.createTextChild(deviceFields.createChild('b'), ls`Device`);
    const deviceNameField = editor.createInput('title', 'text', ls`Device Name`, titleValidator);
    deviceFields.createChild('div', 'hbox').appendChild(deviceNameField);
    deviceNameField.id = 'custom-device-name-field';
    const screen = deviceFields.createChild('div', 'hbox');
    screen.appendChild(editor.createInput('width', 'text', ls`Width`, widthValidator));
    screen.appendChild(editor.createInput('height', 'text', ls`Height`, heightValidator));
    const dpr = editor.createInput('scale', 'text', ls`Device pixel ratio`, scaleValidator);
    dpr.classList.add('device-edit-fixed');
    screen.appendChild(dpr);

    const uaStringFields = content.createChild('div', 'devices-edit-fields');
    UI.UIUtils.createTextChild(uaStringFields.createChild('b'), ls`User agent string`);

    const ua = uaStringFields.createChild('div', 'hbox');
    ua.appendChild(editor.createInput('user-agent', 'text', ls`User agent string`, () => {
      return {valid: true, errorMessage: undefined};
    }));
    const uaTypeOptions = [UA.Mobile, UA.MobileNoTouch, UA.Desktop, UA.DesktopTouch];
    const uaType = editor.createSelect('ua-type', uaTypeOptions, () => {
      return {valid: true, errorMessage: undefined};
    }, ls`User agent type`);
    uaType.classList.add('device-edit-fixed');
    ua.appendChild(uaType);

    const uaChFields = content.createChild('div', 'devices-edit-client-hints-heading');
    UI.UIUtils.createTextChild(uaChFields.createChild('b'), ls`User agent client hints`);

    const helpIconWrapper = document.createElement('a');
    helpIconWrapper.href = 'https://web.dev/user-agent-client-hints/';
    helpIconWrapper.target = '_blank';
    const icon = UI.Icon.Icon.create('mediumicon-info', 'help-icon');
    helpIconWrapper.appendChild(icon);
    helpIconWrapper.title =
        ls`User agent client hints are an alternative to the user agent string that identify the browser and the device in a more structured way with better privacy accounting. Click the button to learn more.`;
    // Prevent the editor grabbing the enter key, letting the default behavior happen.
    helpIconWrapper.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.stopPropagation();
      }
    });
    uaChFields.appendChild(helpIconWrapper);

    const tree = new UI.TreeOutline.TreeOutlineInShadow();
    tree.registerRequiredCSS('emulation/devicesSettingsTab.css', {enableLegacyPatching: true});
    tree.setShowSelectionOnKeyboardFocus(true, false);
    const treeRoot = new UI.TreeOutline.TreeElement(uaChFields, true);
    tree.appendChild(treeRoot);
    // Select the folder to make left/right arrows work as expected; don't change focus, however, since it should start with the device name field.
    treeRoot.select(true, false);
    content.appendChild(tree.element);

    /**
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     */
    function addToTree(input) {
      const treeNode = new UI.TreeOutline.TreeElement(input, false);
      // The inputs themselves are selectable, no need for the tree nodes to be.
      treeNode.selectable = false;
      treeNode.listItemElement.classList.add('devices-edit-client-hints-field');
      treeRoot.appendChild(treeNode);
    }

    const brands =
        editor.createInput('brands', 'text', ls`UA brands list (e.g. "Chromium";v="87")`, brandListValidator);
    addToTree(brands);

    const fullVersion =
        editor.createInput('full-version', 'text', ls`Full browser version (e.g. 87.0.4280.88)`, chStringValidator);
    addToTree(fullVersion);

    const platform = editor.createInput('platform', 'text', ls`Platform (e.g. Android)`, chStringValidator);
    addToTree(platform);

    const platformVersion = editor.createInput('platform-version', 'text', ls`Platform version`, chStringValidator);
    addToTree(platformVersion);

    const arch = editor.createInput('arch', 'text', ls`Architecture (e.g. x86)`, chStringValidator);
    addToTree(arch);

    const model = editor.createInput('model', 'text', ls`Device model`, chStringValidator);
    addToTree(model);

    return editor;

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function chStringValidator(item, index, input) {
      return validateAsStructuredHeadersString(input.value, ls`Not representable as structured headers string.`);
    }

    /**
     * @param {*} item
     * @param {number} index
     * @param {!HTMLInputElement|!HTMLSelectElement} input
     * @return {!UI.ListWidget.ValidatorResult}
     */
    function brandListValidator(item, index, input) {
      const syntaxError = ls`Brands list is not a valid structured fields list.`;
      const structError = ls`Brands list must consist of strings, each with a v parameter with a string value.`;
      const errorOrResult = parseBrandsList(input.value, syntaxError, structError);
      if (typeof errorOrResult === 'string') {
        return {valid: false, errorMessage: errorOrResult};
      }
      return {valid: true, errorMessage: undefined};
    }

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

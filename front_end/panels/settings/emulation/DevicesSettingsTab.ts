// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as EmulationModel from '../../../models/emulation/emulation.js';
import type * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Cards from '../../../ui/components/cards/cards.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import * as EmulationComponents from './components/components.js';
import devicesSettingsTabStyles from './devicesSettingsTab.css.js';

const UIStrings = {
  /**
   * @description Title for a section of the UI that shows all of the custom devices the user can emulate, in the Device Toolbar.
   */
  customDevices: 'Custom devices',
  /**
   * @description Title for a section of the UI that shows all of the default devices the user can emulate, in the Device Toolbar.
   */
  defaultDevices: 'Default devices',
  /**
   *@description Button to add a custom device (e.g. phone, tablet) the Device Toolbar.
   */
  addCustomDevice: 'Add custom device...',
  /**
   *@description Label/title for UI to add a new custom device type. Device means mobile/tablet etc.
   */
  device: 'Device',
  /**
   *@description Placeholder for text input for the name of a custom device.
   */
  deviceName: 'Device Name',
  /**
   *@description Placeholder text for text input for the width of a custom device in pixels.
   */
  width: 'Width',
  /**
   *@description Placeholder text for text input for the height of a custom device in pixels.
   */
  height: 'Height',
  /**
   *@description Placeholder text for text input for the height/width ratio of a custom device in pixels.
   */
  devicePixelRatio: 'Device pixel ratio',
  /**
   *@description Label in the Devices settings pane for the user agent string input of a custom device
   */
  userAgentString: 'User agent string',
  /**
   *@description Tooltip text for a drop-down in the Devices settings pane, for the 'user agent type' input of a custom device.
   * 'Type' refers to different options e.g. mobile or desktop.
   */
  userAgentType: 'User agent type',
  /**
   *@description Error message in the Devices settings pane that declares the maximum length of the device name input
   *@example {50} PH1
   */
  deviceNameMustBeLessThanS: 'Device name must be less than {PH1} characters.',
  /**
   *@description Error message in the Devices settings pane that declares that the device name input must not be empty
   */
  deviceNameCannotBeEmpty: 'Device name cannot be empty.',
  /**
   *@description Success message for screen readers when device is added.
   *@example {TestDevice} PH1
   */
  deviceAddedOrUpdated: 'Device {PH1} successfully added/updated.',
};
const str_ = i18n.i18n.registerUIStrings('panels/settings/emulation/DevicesSettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class DevicesSettingsTab extends UI.Widget.VBox implements
    UI.ListWidget.Delegate<EmulationModel.EmulatedDevices.EmulatedDevice> {
  containerElement: HTMLElement;
  private readonly addCustomButton: Buttons.Button.Button;
  private readonly ariaSuccessMessageElement: HTMLElement;
  readonly #customDeviceList: UI.ListWidget.ListWidget<EmulationModel.EmulatedDevices.EmulatedDevice>;
  readonly #defaultDeviceList: UI.ListWidget.ListWidget<EmulationModel.EmulatedDevices.EmulatedDevice>;
  private muteUpdate: boolean;
  private emulatedDevicesList: EmulationModel.EmulatedDevices.EmulatedDevicesList;
  private editor?: UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>;

  constructor() {
    super();

    this.element.setAttribute('jslog', `${VisualLogging.pane('devices')}`);

    this.containerElement =
        this.contentElement.createChild('div', 'settings-card-container-wrapper').createChild('div');
    this.containerElement.classList.add('settings-card-container', 'ignore-list-settings');

    this.#defaultDeviceList = new UI.ListWidget.ListWidget(this, false /* delegatesFocus */);
    this.#defaultDeviceList.element.classList.add('devices-list', 'device-card-content');

    this.muteUpdate = false;
    this.emulatedDevicesList = EmulationModel.EmulatedDevices.EmulatedDevicesList.instance();
    this.emulatedDevicesList.addEventListener(
        EmulationModel.EmulatedDevices.Events.CUSTOM_DEVICES_UPDATED, this.devicesUpdated, this);
    this.emulatedDevicesList.addEventListener(
        EmulationModel.EmulatedDevices.Events.STANDARD_DEVICES_UPDATED, this.devicesUpdated, this);

    this.ariaSuccessMessageElement = this.contentElement.createChild('div', 'device-success-message');
    UI.ARIAUtils.markAsPoliteLiveRegion(this.ariaSuccessMessageElement, false);

    this.addCustomButton = UI.UIUtils.createTextButton(
        i18nString(UIStrings.addCustomDevice), this.addCustomDevice.bind(this), {jslogContext: 'add-custom-device'});
    this.addCustomButton.id = 'custom-device-add-button';

    const customSettings = document.createElement('div');
    customSettings.classList.add('device-card-content');
    customSettings.appendChild(this.ariaSuccessMessageElement);
    const deviceList = customSettings.createChild('div');
    customSettings.appendChild(this.addCustomButton);

    const customDevicesCard = new Cards.Card.Card();
    customDevicesCard.data = {
      heading: i18nString(UIStrings.customDevices),
      content: [customSettings],
    };
    this.containerElement.appendChild(customDevicesCard);

    this.#customDeviceList = new UI.ListWidget.ListWidget(this, false /* delegatesFocus */);
    this.#customDeviceList.element.classList.add('devices-list');
    this.#customDeviceList.show(deviceList);

    const defaultDevicesCard = new Cards.Card.Card();
    defaultDevicesCard.data = {
      heading: i18nString(UIStrings.defaultDevices),
      content: [this.#defaultDeviceList.element],
    };
    this.containerElement.appendChild(defaultDevicesCard);
  }

  override wasShown(): void {
    super.wasShown();
    this.devicesUpdated();
    this.registerCSSFiles([devicesSettingsTabStyles]);
    this.#defaultDeviceList.registerCSSFiles([devicesSettingsTabStyles]);
    this.#customDeviceList.registerCSSFiles([devicesSettingsTabStyles]);
  }

  private devicesUpdated(): void {
    if (this.muteUpdate) {
      return;
    }

    this.#defaultDeviceList.clear();
    this.#customDeviceList.clear();

    let devices = this.emulatedDevicesList.custom().slice();
    for (let i = 0; i < devices.length; ++i) {
      this.#customDeviceList.appendItem(devices[i], true);
    }

    devices = this.emulatedDevicesList.standard().slice();
    devices.sort(EmulationModel.EmulatedDevices.EmulatedDevice.deviceComparator);
    for (let i = 0; i < devices.length; ++i) {
      this.#defaultDeviceList.appendItem(devices[i], false);
    }
  }

  private muteAndSaveDeviceList(custom: boolean): void {
    this.muteUpdate = true;
    if (custom) {
      this.emulatedDevicesList.saveCustomDevices();
    } else {
      this.emulatedDevicesList.saveStandardDevices();
    }
    this.muteUpdate = false;
  }

  private addCustomDevice(): void {
    const device = new EmulationModel.EmulatedDevices.EmulatedDevice();
    device.deviceScaleFactor = 0;
    device.horizontal.width = 700;
    device.horizontal.height = 400;
    device.vertical.width = 400;
    device.vertical.height = 700;
    this.#customDeviceList.addNewItem(this.emulatedDevicesList.custom().length, device);
  }

  private toNumericInputValue(value: number): string {
    return value ? String(value) : '';
  }

  renderItem(device: EmulationModel.EmulatedDevices.EmulatedDevice, editable: boolean): Element {
    const label = document.createElement('label');
    label.classList.add('devices-list-item');
    const checkbox = (label.createChild('input', 'devices-list-checkbox') as HTMLInputElement);
    checkbox.type = 'checkbox';
    checkbox.checked = device.show();
    checkbox.addEventListener('click', onItemClicked.bind(this), false);
    checkbox.setAttribute('jslog', `${VisualLogging.toggle().track({click: true})}`);
    const span = document.createElement('span');
    span.classList.add('device-name');
    span.appendChild(document.createTextNode(device.title));
    label.appendChild(span);
    return label;

    function onItemClicked(this: DevicesSettingsTab, event: Event): void {
      const show = checkbox.checked;
      device.setShow(show);
      this.muteAndSaveDeviceList(editable);
      event.consume();
    }
  }

  removeItemRequested(item: EmulationModel.EmulatedDevices.EmulatedDevice): void {
    this.emulatedDevicesList.removeCustomDevice(item);
  }

  commitEdit(
      device: EmulationModel.EmulatedDevices.EmulatedDevice,
      editor: UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>, isNew: boolean): void {
    device.title = editor.control('title').value.trim();
    device.vertical.width = editor.control('width').value ? parseInt(editor.control('width').value, 10) : 0;
    device.vertical.height = editor.control('height').value ? parseInt(editor.control('height').value, 10) : 0;
    device.horizontal.width = device.vertical.height;
    device.horizontal.height = device.vertical.width;
    device.deviceScaleFactor = editor.control('scale').value ? parseFloat(editor.control('scale').value) : 0;
    device.userAgent = editor.control('user-agent').value;
    device.modes = [];
    device.modes.push({
      title: '',
      orientation: EmulationModel.EmulatedDevices.Vertical,
      insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),
      image: null,
    });
    device.modes.push({
      title: '',
      orientation: EmulationModel.EmulatedDevices.Horizontal,
      insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),
      image: null,
    });
    device.capabilities = [];
    const uaType = editor.control('ua-type').value;
    if (uaType === EmulationModel.DeviceModeModel.UA.MOBILE ||
        uaType === EmulationModel.DeviceModeModel.UA.MOBILE_NO_TOUCH) {
      device.capabilities.push(EmulationModel.EmulatedDevices.Capability.MOBILE);
    }
    if (uaType === EmulationModel.DeviceModeModel.UA.MOBILE ||
        uaType === EmulationModel.DeviceModeModel.UA.DESKTOP_TOUCH) {
      device.capabilities.push(EmulationModel.EmulatedDevices.Capability.TOUCH);
    }
    const userAgentControlValue =
        (editor.control('ua-metadata') as
         UI.ListWidget.CustomEditorControl<EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsFormData>)
            .value.metaData;
    if (userAgentControlValue) {
      device.userAgentMetadata = {
        ...userAgentControlValue,
        mobile:
            (uaType === EmulationModel.DeviceModeModel.UA.MOBILE ||
             uaType === EmulationModel.DeviceModeModel.UA.MOBILE_NO_TOUCH),
      };
    }
    if (isNew) {
      this.emulatedDevicesList.addCustomDevice(device);
    } else {
      this.emulatedDevicesList.saveCustomDevices();
    }
    this.addCustomButton.scrollIntoViewIfNeeded();
    this.addCustomButton.focus();
    this.ariaSuccessMessageElement.setAttribute(
        'aria-label', i18nString(UIStrings.deviceAddedOrUpdated, {PH1: device.title}));
  }

  beginEdit(device: EmulationModel.EmulatedDevices.EmulatedDevice):
      UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice> {
    const editor = this.createEditor();
    editor.control('title').value = device.title;
    editor.control('width').value = this.toNumericInputValue(device.vertical.width);
    editor.control('height').value = this.toNumericInputValue(device.vertical.height);
    editor.control('scale').value = this.toNumericInputValue(device.deviceScaleFactor);
    editor.control('user-agent').value = device.userAgent;
    let uaType;
    if (device.mobile()) {
      uaType =
          device.touch() ? EmulationModel.DeviceModeModel.UA.MOBILE : EmulationModel.DeviceModeModel.UA.MOBILE_NO_TOUCH;
    } else {
      uaType =
          device.touch() ? EmulationModel.DeviceModeModel.UA.DESKTOP_TOUCH : EmulationModel.DeviceModeModel.UA.DESKTOP;
    }
    editor.control('ua-type').value = uaType;
    (editor.control('ua-metadata') as
     UI.ListWidget.CustomEditorControl<EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsFormData>)
        .value = {metaData: device.userAgentMetadata || undefined};
    return editor;
  }

  private createEditor(): UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice> {
    if (this.editor) {
      return this.editor;
    }

    const editor = new UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>();
    this.editor = editor;
    const content = editor.contentElement();

    const deviceFields = content.createChild('div', 'devices-edit-fields');
    UI.UIUtils.createTextChild(deviceFields.createChild('b'), i18nString(UIStrings.device));
    const deviceNameField = editor.createInput('title', 'text', i18nString(UIStrings.deviceName), titleValidator);
    deviceFields.createChild('div', 'hbox').appendChild(deviceNameField);
    deviceNameField.id = 'custom-device-name-field';
    const screen = deviceFields.createChild('div', 'hbox');
    screen.appendChild(editor.createInput('width', 'text', i18nString(UIStrings.width), widthValidator));
    screen.appendChild(editor.createInput('height', 'text', i18nString(UIStrings.height), heightValidator));
    const dpr = editor.createInput('scale', 'text', i18nString(UIStrings.devicePixelRatio), scaleValidator);
    dpr.classList.add('device-edit-fixed');
    screen.appendChild(dpr);

    const uaStringFields = content.createChild('div', 'devices-edit-fields');
    UI.UIUtils.createTextChild(uaStringFields.createChild('b'), i18nString(UIStrings.userAgentString));

    const ua = uaStringFields.createChild('div', 'hbox');
    ua.appendChild(editor.createInput('user-agent', 'text', i18nString(UIStrings.userAgentString), () => {
      return {valid: true, errorMessage: undefined};
    }));
    const uaTypeOptions = [
      EmulationModel.DeviceModeModel.UA.MOBILE,
      EmulationModel.DeviceModeModel.UA.MOBILE_NO_TOUCH,
      EmulationModel.DeviceModeModel.UA.DESKTOP,
      EmulationModel.DeviceModeModel.UA.DESKTOP_TOUCH,
    ];
    const uaType = editor.createSelect('ua-type', uaTypeOptions, () => {
      return {valid: true, errorMessage: undefined};
    }, i18nString(UIStrings.userAgentType));
    uaType.classList.add('device-edit-fixed');
    ua.appendChild(uaType);

    const uaMetadata = editor.createCustomControl(
        'ua-metadata', EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsForm,
        userAgentMetadataValidator);
    uaMetadata.value = {};
    uaMetadata.addEventListener('clienthintschange', () => editor.requestValidation(), false);
    content.appendChild(uaMetadata);

    return editor;

    function userAgentMetadataValidator(): UI.ListWidget.ValidatorResult {
      return uaMetadata.validate();
    }

    function titleValidator(
        item: EmulationModel.EmulatedDevices.EmulatedDevice, index: number,
        input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      let valid = false;
      let errorMessage;

      const value = input.value.trim();
      if (value.length >= EmulationModel.DeviceModeModel.MaxDeviceNameLength) {
        errorMessage =
            i18nString(UIStrings.deviceNameMustBeLessThanS, {PH1: EmulationModel.DeviceModeModel.MaxDeviceNameLength});
      } else if (value.length === 0) {
        errorMessage = i18nString(UIStrings.deviceNameCannotBeEmpty);
      } else {
        valid = true;
      }

      return {valid, errorMessage};
    }

    function widthValidator(
        item: EmulationModel.EmulatedDevices.EmulatedDevice, index: number,
        input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      return EmulationModel.DeviceModeModel.DeviceModeModel.widthValidator(input.value);
    }

    function heightValidator(
        item: EmulationModel.EmulatedDevices.EmulatedDevice, index: number,
        input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      return EmulationModel.DeviceModeModel.DeviceModeModel.heightValidator(input.value);
    }

    function scaleValidator(
        item: EmulationModel.EmulatedDevices.EmulatedDevice, index: number,
        input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      return EmulationModel.DeviceModeModel.DeviceModeModel.scaleValidator(input.value);
    }
  }
}

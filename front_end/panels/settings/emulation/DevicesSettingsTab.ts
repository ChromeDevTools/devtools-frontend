// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import '../../../ui/kit/kit.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as EmulationModel from '../../../models/emulation/emulation.js';
import type * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import * as EmulationComponents from './components/components.js';
import devicesSettingsTabStyles from './devicesSettingsTab.css.js';

const UIStrings = {
  /**
   * @description Title for a section of the UI that shows all of the custom devices the user can emulate, in the device toolbar.
   */
  customDevices: 'Custom devices',
  /**
   * @description Title for a section of the UI that shows all of the default devices the user can emulate, in the device toolbar.
   */
  defaultDevices: 'Default devices',
  /**
   * @description Button to add a custom device (e.g., phone, tablet) to the device toolbar.
   */
  addCustomDevice: 'Add custom device',
  /**
   * @description Label/title for UI to add a new custom device type. Device means mobile/tablet, etc.
   */
  device: 'Device',
  /**
   * @description Placeholder for text input for the name of a custom device.
   */
  deviceName: 'Device name',
  /**
   * @description Placeholder text for text input for the width of a custom device in pixels.
   */
  width: 'Width',
  /**
   * @description Placeholder text for text input for the height of a custom device in pixels.
   */
  height: 'Height',
  /**
   * @description Placeholder text for text input for the height/width ratio of a custom device in pixels.
   */
  devicePixelRatio: 'Device pixel ratio',
  /**
   * @description Label in the Devices settings tab for the user agent string input of a custom device.
   */
  userAgentString: 'User agent string',
  /**
   * @description Tooltip text for a drop-down in the Devices settings tab for the user agent type input of a custom device.
   * 'Type' refers to different options, such as mobile or desktop.
   */
  userAgentType: 'User agent type',
  /**
   * @description Error message in the Devices settings tab that declares the maximum length of the device name input.
   * @example {50} PH1
   */
  deviceNameMustBeLessThanS: 'Device name must be less than {PH1} characters.',
  /**
   * @description Error message in the Devices settings tab that declares that the device name input must not be empty.
   */
  deviceNameCannotBeEmpty: 'Device name can’t be empty.',
  /**
   * @description Success message for screen readers when device is added.
   * @example {TestDevice} PH1
   */
  deviceAddedOrUpdated: 'Device {PH1} successfully added/updated.',
  /**
   * @description Error message in the Devices settings tab shown when the user agent string is empty.
   */
  userAgentStringCannotBeEmpty: 'User agent string can’t be empty.',
  /**
   * @description Label for portrait safe-area values on a custom device.
   */
  portraitSafeArea: 'Portrait safe area',
  /**
   * @description Label for landscape safe-area values on a custom device.
   */
  landscapeSafeArea: 'Landscape safe area',
  /**
   * @description Placeholder text for a custom device safe-area left inset field.
   */
  safeAreaLeft: 'Left inset',
  /**
   * @description Placeholder text for a custom device safe-area top inset field.
   */
  safeAreaTop: 'Top inset',
  /**
   * @description Placeholder text for a custom device safe-area right inset field.
   */
  safeAreaRight: 'Right inset',
  /**
   * @description Placeholder text for a custom device safe-area bottom inset field.
   */
  safeAreaBottom: 'Bottom inset',
  /**
   * @description Error message shown when a custom device safe-area value is invalid.
   * @example {Portrait safe area} PH1
   * @example {Top inset} PH2
   * @example {9999} PH3
   */
  safeAreaValueMustBeInRange: '{PH1}: {PH2} must be an integer from 0 to {PH3}.',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/settings/emulation/DevicesSettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

function parseOptionalNonNegativeInteger(value: string): number|null {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return 0;
  }
  if (!/^\d+$/.test(trimmedValue)) {
    return null;
  }
  const parsedValue = Number(trimmedValue);
  if (!Number.isSafeInteger(parsedValue) || parsedValue < 0 ||
      parsedValue > EmulationModel.DeviceModeModel.MaxDeviceSize) {
    return null;
  }
  return parsedValue;
}

export class DevicesSettingsTab extends UI.Widget.VBox implements
    UI.ListWidget.Delegate<EmulationModel.EmulatedDevices.EmulatedDevice> {
  containerElement: HTMLElement;
  private readonly addCustomButton: Buttons.Button.Button;
  private readonly ariaSuccessMessageElement: HTMLElement;
  readonly #customDeviceList: UI.ListWidget.ListWidget<EmulationModel.EmulatedDevices.EmulatedDevice>;
  readonly #defaultDeviceLists = new Map<EmulationModel.EmulatedDevices.Category, {
    container: HTMLElement,
    list: UI.ListWidget.ListWidget<EmulationModel.EmulatedDevices.EmulatedDevice>,
  }>();
  private muteUpdate: boolean;
  private emulatedDevicesList: EmulationModel.EmulatedDevices.EmulatedDevicesList;
  private editor?: UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>;

  constructor() {
    super({jslog: `${VisualLogging.pane('devices')}`});
    this.registerRequiredCSS(devicesSettingsTabStyles);

    this.containerElement =
        this.contentElement.createChild('div', 'settings-card-container-wrapper').createChild('div');
    this.containerElement.classList.add('settings-card-container', 'ignore-list-settings');

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

    const customDevicesCard = this.containerElement.createChild('devtools-card');
    customDevicesCard.heading = i18nString(UIStrings.customDevices);
    customDevicesCard.append(customSettings);

    this.#customDeviceList = new UI.ListWidget.ListWidget(this, false /* delegatesFocus */);
    this.#customDeviceList.registerRequiredCSS(devicesSettingsTabStyles);
    this.#customDeviceList.element.classList.add('devices-list');
    this.#customDeviceList.show(deviceList);

    const defaultDevicesCard = this.containerElement.createChild('devtools-card');
    defaultDevicesCard.heading = i18nString(UIStrings.defaultDevices);

    for (const category of EmulationModel.EmulatedDevices.CATEGORY_ORDER) {
      const groupContainer = document.createElement('div');
      groupContainer.classList.add('device-group-container');

      const groupTitle = groupContainer.createChild('div', 'device-group-title');
      groupTitle.textContent = EmulationModel.EmulatedDevices.getCategoryTitle(category);

      defaultDevicesCard.append(groupContainer);

      const listWidget = new UI.ListWidget.ListWidget(this, false /* delegatesFocus */);
      listWidget.registerRequiredCSS(devicesSettingsTabStyles);
      listWidget.element.classList.add('devices-list', 'device-card-content');
      listWidget.show(groupContainer);

      this.#defaultDeviceLists.set(category, {container: groupContainer, list: listWidget});
    }
  }

  override wasShown(): void {
    super.wasShown();
    this.devicesUpdated();
  }

  private devicesUpdated(): void {
    if (this.muteUpdate) {
      return;
    }

    for (const {list} of this.#defaultDeviceLists.values()) {
      list.clear();
    }
    this.#customDeviceList.clear();

    const customDevices = this.emulatedDevicesList.custom().slice();
    for (let i = 0; i < customDevices.length; ++i) {
      this.#customDeviceList.appendItem(customDevices[i], true);
    }

    const standardDevices = this.emulatedDevicesList.standard().slice();
    standardDevices.sort(EmulationModel.EmulatedDevices.EmulatedDevice.deviceComparator);

    const categoryItemCounts = new Map<EmulationModel.EmulatedDevices.Category, number>();
    for (const device of standardDevices) {
      const cat = EmulationModel.EmulatedDevices.deviceCategory(device);
      const group = this.#defaultDeviceLists.get(cat);
      if (group) {
        group.list.appendItem(device, false);
        categoryItemCounts.set(cat, (categoryItemCounts.get(cat) || 0) + 1);
      }
    }

    for (const [cat, group] of this.#defaultDeviceLists.entries()) {
      const count = categoryItemCounts.get(cat) || 0;
      group.container.style.display = count > 0 ? '' : 'none';
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
    device.userAgent = navigator.userAgent;
    this.#customDeviceList.addNewItem(this.emulatedDevicesList.custom().length, device);
  }

  private toNumericInputValue(value: number): string {
    return value ? String(value) : '';
  }

  private verticalMode(device: EmulationModel.EmulatedDevices.EmulatedDevice): EmulationModel.EmulatedDevices.Mode
      |null {
    return device.modes.find(mode => mode.orientation === EmulationModel.EmulatedDevices.Vertical) || null;
  }

  private horizontalMode(device: EmulationModel.EmulatedDevices.EmulatedDevice): EmulationModel.EmulatedDevices.Mode
      |null {
    return device.modes.find(mode => mode.orientation === EmulationModel.EmulatedDevices.Horizontal) || null;
  }

  private editorIntegerValue(editor: UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>,
                             controlName: string): number {
    return parseOptionalNonNegativeInteger(editor.control(controlName).value) ?? 0;
  }

  renderItem(device: EmulationModel.EmulatedDevices.EmulatedDevice, editable: boolean): Element {
    const label = document.createElement('label');
    label.classList.add('devices-list-item');
    const checkbox = label.createChild('input', 'devices-list-checkbox');
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
    const verticalMode: EmulationModel.EmulatedDevices.Mode = {
      title: '',
      orientation: EmulationModel.EmulatedDevices.Vertical,
      insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),
      image: null,
    };
    const safeAreaInsets = this.safeAreaInsetsFromEditor(editor);
    if (safeAreaInsets) {
      verticalMode.safeAreaInsets = safeAreaInsets;
    }
    device.modes.push(verticalMode);
    const horizontalMode: EmulationModel.EmulatedDevices.Mode = {
      title: '',
      orientation: EmulationModel.EmulatedDevices.Horizontal,
      insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),
      image: null,
    };
    const landscapeSafeAreaInsets = this.safeAreaInsetsFromEditor(editor, 'landscape-');
    if (landscapeSafeAreaInsets) {
      horizontalMode.safeAreaInsets = landscapeSafeAreaInsets;
    }
    device.modes.push(horizontalMode);
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
    const hasUserAgentOverride = device.userAgent.trim().length > 0;
    device.userAgentMetadata = null;
    if (hasUserAgentOverride && userAgentControlValue) {
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
    this.populateSafeAreaEditor(editor, device);
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

  private safeAreaInsetsFromEditor(editor: UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>,
                                   controlPrefix = ''): EmulationModel.DeviceModeModel.Insets|null {
    const left = this.editorIntegerValue(editor, `${controlPrefix}safe-area-left`);
    const top = this.editorIntegerValue(editor, `${controlPrefix}safe-area-top`);
    const right = this.editorIntegerValue(editor, `${controlPrefix}safe-area-right`);
    const bottom = this.editorIntegerValue(editor, `${controlPrefix}safe-area-bottom`);
    if (!left && !top && !right && !bottom) {
      return null;
    }
    return new EmulationModel.DeviceModeModel.Insets(left, top, right, bottom);
  }

  private populateSafeAreaEditor(editor: UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>,
                                 device: EmulationModel.EmulatedDevices.EmulatedDevice): void {
    const safeAreaInsets = this.verticalMode(device)?.safeAreaInsets;
    editor.control('safe-area-left').value = this.toNumericInputValue(safeAreaInsets?.left || 0);
    editor.control('safe-area-top').value = this.toNumericInputValue(safeAreaInsets?.top || 0);
    editor.control('safe-area-right').value = this.toNumericInputValue(safeAreaInsets?.right || 0);
    editor.control('safe-area-bottom').value = this.toNumericInputValue(safeAreaInsets?.bottom || 0);

    const landscapeSafeAreaInsets = this.horizontalMode(device)?.safeAreaInsets;
    editor.control('landscape-safe-area-left').value = this.toNumericInputValue(landscapeSafeAreaInsets?.left || 0);
    editor.control('landscape-safe-area-top').value = this.toNumericInputValue(landscapeSafeAreaInsets?.top || 0);
    editor.control('landscape-safe-area-right').value = this.toNumericInputValue(landscapeSafeAreaInsets?.right || 0);
    editor.control('landscape-safe-area-bottom').value = this.toNumericInputValue(landscapeSafeAreaInsets?.bottom || 0);
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

    this.appendSafeAreaFields(editor, deviceFields, i18nString(UIStrings.portraitSafeArea), '',
                              portraitSafeAreaValidator);
    this.appendSafeAreaFields(editor, deviceFields, i18nString(UIStrings.landscapeSafeArea), 'landscape-',
                              landscapeSafeAreaValidator);

    const uaStringFields = content.createChild('div', 'devices-edit-fields');
    UI.UIUtils.createTextChild(uaStringFields.createChild('b'), i18nString(UIStrings.userAgentString));

    const ua = uaStringFields.createChild('div', 'hbox');
    ua.appendChild(editor.createInput('user-agent', 'text', i18nString(UIStrings.userAgentString), userAgentValidator));
    const uaTypeOptions = [
      EmulationModel.DeviceModeModel.UA.MOBILE,
      EmulationModel.DeviceModeModel.UA.MOBILE_NO_TOUCH,
      EmulationModel.DeviceModeModel.UA.DESKTOP,
      EmulationModel.DeviceModeModel.UA.DESKTOP_TOUCH,
    ];
    const uaType = editor.createSelect('ua-type', uaTypeOptions, () => {
      return {valid: true};
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

    function userAgentValidator(
        _item: EmulationModel.EmulatedDevices.EmulatedDevice, _index: number,
        input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      if (input.value.trim().length > 0) {
        return {valid: true};
      }

      return {valid: false, errorMessage: i18nString(UIStrings.userAgentStringCannotBeEmpty)};
    }

    function titleValidator(
        _item: EmulationModel.EmulatedDevices.EmulatedDevice, _index: number,
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
        _item: EmulationModel.EmulatedDevices.EmulatedDevice, _index: number,
        input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      return EmulationModel.DeviceModeModel.DeviceModeModel.widthValidator(input.value);
    }

    function heightValidator(
        _item: EmulationModel.EmulatedDevices.EmulatedDevice, _index: number,
        input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      return EmulationModel.DeviceModeModel.DeviceModeModel.heightValidator(input.value);
    }

    function scaleValidator(
        _item: EmulationModel.EmulatedDevices.EmulatedDevice, _index: number,
        input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      return EmulationModel.DeviceModeModel.DeviceModeModel.scaleValidator(input.value);
    }

    function safeAreaValidator(orientationLabel: string,
                               input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      if (parseOptionalNonNegativeInteger(input.value) !== null) {
        return {valid: true};
      }

      return {
        valid: false,
        errorMessage: i18nString(UIStrings.safeAreaValueMustBeInRange, {
          PH1: orientationLabel,
          PH2: input.getAttribute('aria-label') || input.getAttribute('placeholder') || '',
          PH3: EmulationModel.DeviceModeModel.MaxDeviceSize,
        }),
      };
    }

    function portraitSafeAreaValidator(_item: EmulationModel.EmulatedDevices.EmulatedDevice, _index: number,
                                       input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      return safeAreaValidator(i18nString(UIStrings.portraitSafeArea), input);
    }

    function landscapeSafeAreaValidator(_item: EmulationModel.EmulatedDevices.EmulatedDevice, _index: number,
                                        input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      return safeAreaValidator(i18nString(UIStrings.landscapeSafeArea), input);
    }
  }

  private appendSafeAreaFields(editor: UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>,
                               deviceFields: HTMLElement, title: string, controlPrefix: string,
                               safeAreaValidator:
                                   (item: EmulationModel.EmulatedDevices.EmulatedDevice, index: number,
                                    input: UI.ListWidget.EditorControl) => UI.ListWidget.ValidatorResult): void {
    const safeAreaGroup = deviceFields.createChild('div', 'devices-edit-safe-area-group');
    UI.ARIAUtils.markAsGroup(safeAreaGroup);
    const heading = safeAreaGroup.createChild('b');
    heading.id = UI.ARIAUtils.nextId('safe-area-heading-');
    UI.UIUtils.createTextChild(heading, title);
    safeAreaGroup.setAttribute('aria-labelledby', heading.id);
    const safeAreaRow = safeAreaGroup.createChild('div', 'hbox');
    safeAreaRow.appendChild(editor.createInput(`${controlPrefix}safe-area-left`, 'text',
                                               i18nString(UIStrings.safeAreaLeft), safeAreaValidator));
    safeAreaRow.appendChild(editor.createInput(`${controlPrefix}safe-area-top`, 'text',
                                               i18nString(UIStrings.safeAreaTop), safeAreaValidator));
    safeAreaRow.appendChild(editor.createInput(`${controlPrefix}safe-area-right`, 'text',
                                               i18nString(UIStrings.safeAreaRight), safeAreaValidator));
    safeAreaRow.appendChild(editor.createInput(`${controlPrefix}safe-area-bottom`, 'text',
                                               i18nString(UIStrings.safeAreaBottom), safeAreaValidator));
  }
}

// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../../ui/components/cards/cards.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as EmulationModel from '../../../models/emulation/emulation.js';
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
     * @description Button to add a custom device (e.g. phone, tablet) the Device Toolbar.
     */
    addCustomDevice: 'Add custom device',
    /**
     * @description Label/title for UI to add a new custom device type. Device means mobile/tablet etc.
     */
    device: 'Device',
    /**
     * @description Placeholder for text input for the name of a custom device.
     */
    deviceName: 'Device Name',
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
     * @description Label in the Devices settings pane for the user agent string input of a custom device
     */
    userAgentString: 'User agent string',
    /**
     * @description Tooltip text for a drop-down in the Devices settings pane, for the 'user agent type' input of a custom device.
     * 'Type' refers to different options e.g. mobile or desktop.
     */
    userAgentType: 'User agent type',
    /**
     * @description Error message in the Devices settings pane that declares the maximum length of the device name input
     * @example {50} PH1
     */
    deviceNameMustBeLessThanS: 'Device name must be less than {PH1} characters.',
    /**
     * @description Error message in the Devices settings pane that declares that the device name input must not be empty
     */
    deviceNameCannotBeEmpty: 'Device name cannot be empty.',
    /**
     * @description Success message for screen readers when device is added.
     * @example {TestDevice} PH1
     */
    deviceAddedOrUpdated: 'Device {PH1} successfully added/updated.',
};
const str_ = i18n.i18n.registerUIStrings('panels/settings/emulation/DevicesSettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class DevicesSettingsTab extends UI.Widget.VBox {
    containerElement;
    addCustomButton;
    ariaSuccessMessageElement;
    #customDeviceList;
    #defaultDeviceList;
    muteUpdate;
    emulatedDevicesList;
    editor;
    constructor() {
        super({ jslog: `${VisualLogging.pane('devices')}` });
        this.registerRequiredCSS(devicesSettingsTabStyles);
        this.containerElement =
            this.contentElement.createChild('div', 'settings-card-container-wrapper').createChild('div');
        this.containerElement.classList.add('settings-card-container', 'ignore-list-settings');
        this.#defaultDeviceList = new UI.ListWidget.ListWidget(this, false /* delegatesFocus */);
        this.#defaultDeviceList.registerRequiredCSS(devicesSettingsTabStyles);
        this.#defaultDeviceList.element.classList.add('devices-list', 'device-card-content');
        this.muteUpdate = false;
        this.emulatedDevicesList = EmulationModel.EmulatedDevices.EmulatedDevicesList.instance();
        this.emulatedDevicesList.addEventListener("CustomDevicesUpdated" /* EmulationModel.EmulatedDevices.Events.CUSTOM_DEVICES_UPDATED */, this.devicesUpdated, this);
        this.emulatedDevicesList.addEventListener("StandardDevicesUpdated" /* EmulationModel.EmulatedDevices.Events.STANDARD_DEVICES_UPDATED */, this.devicesUpdated, this);
        this.ariaSuccessMessageElement = this.contentElement.createChild('div', 'device-success-message');
        UI.ARIAUtils.markAsPoliteLiveRegion(this.ariaSuccessMessageElement, false);
        this.addCustomButton = UI.UIUtils.createTextButton(i18nString(UIStrings.addCustomDevice), this.addCustomDevice.bind(this), { jslogContext: 'add-custom-device' });
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
        defaultDevicesCard.append(this.#defaultDeviceList.element);
    }
    wasShown() {
        super.wasShown();
        this.devicesUpdated();
    }
    devicesUpdated() {
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
    muteAndSaveDeviceList(custom) {
        this.muteUpdate = true;
        if (custom) {
            this.emulatedDevicesList.saveCustomDevices();
        }
        else {
            this.emulatedDevicesList.saveStandardDevices();
        }
        this.muteUpdate = false;
    }
    addCustomDevice() {
        const device = new EmulationModel.EmulatedDevices.EmulatedDevice();
        device.deviceScaleFactor = 0;
        device.horizontal.width = 700;
        device.horizontal.height = 400;
        device.vertical.width = 400;
        device.vertical.height = 700;
        this.#customDeviceList.addNewItem(this.emulatedDevicesList.custom().length, device);
    }
    toNumericInputValue(value) {
        return value ? String(value) : '';
    }
    renderItem(device, editable) {
        const label = document.createElement('label');
        label.classList.add('devices-list-item');
        const checkbox = label.createChild('input', 'devices-list-checkbox');
        checkbox.type = 'checkbox';
        checkbox.checked = device.show();
        checkbox.addEventListener('click', onItemClicked.bind(this), false);
        checkbox.setAttribute('jslog', `${VisualLogging.toggle().track({ click: true })}`);
        const span = document.createElement('span');
        span.classList.add('device-name');
        span.appendChild(document.createTextNode(device.title));
        label.appendChild(span);
        return label;
        function onItemClicked(event) {
            const show = checkbox.checked;
            device.setShow(show);
            this.muteAndSaveDeviceList(editable);
            event.consume();
        }
    }
    removeItemRequested(item) {
        this.emulatedDevicesList.removeCustomDevice(item);
    }
    commitEdit(device, editor, isNew) {
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
        if (uaType === "Mobile" /* EmulationModel.DeviceModeModel.UA.MOBILE */ ||
            uaType === "Mobile (no touch)" /* EmulationModel.DeviceModeModel.UA.MOBILE_NO_TOUCH */) {
            device.capabilities.push("mobile" /* EmulationModel.EmulatedDevices.Capability.MOBILE */);
        }
        if (uaType === "Mobile" /* EmulationModel.DeviceModeModel.UA.MOBILE */ ||
            uaType === "Desktop (touch)" /* EmulationModel.DeviceModeModel.UA.DESKTOP_TOUCH */) {
            device.capabilities.push("touch" /* EmulationModel.EmulatedDevices.Capability.TOUCH */);
        }
        const userAgentControlValue = editor.control('ua-metadata')
            .value.metaData;
        if (userAgentControlValue) {
            device.userAgentMetadata = {
                ...userAgentControlValue,
                mobile: (uaType === "Mobile" /* EmulationModel.DeviceModeModel.UA.MOBILE */ ||
                    uaType === "Mobile (no touch)" /* EmulationModel.DeviceModeModel.UA.MOBILE_NO_TOUCH */),
            };
        }
        if (isNew) {
            this.emulatedDevicesList.addCustomDevice(device);
        }
        else {
            this.emulatedDevicesList.saveCustomDevices();
        }
        this.addCustomButton.scrollIntoViewIfNeeded();
        this.addCustomButton.focus();
        this.ariaSuccessMessageElement.setAttribute('aria-label', i18nString(UIStrings.deviceAddedOrUpdated, { PH1: device.title }));
    }
    beginEdit(device) {
        const editor = this.createEditor();
        editor.control('title').value = device.title;
        editor.control('width').value = this.toNumericInputValue(device.vertical.width);
        editor.control('height').value = this.toNumericInputValue(device.vertical.height);
        editor.control('scale').value = this.toNumericInputValue(device.deviceScaleFactor);
        editor.control('user-agent').value = device.userAgent;
        let uaType;
        if (device.mobile()) {
            uaType =
                device.touch() ? "Mobile" /* EmulationModel.DeviceModeModel.UA.MOBILE */ : "Mobile (no touch)" /* EmulationModel.DeviceModeModel.UA.MOBILE_NO_TOUCH */;
        }
        else {
            uaType =
                device.touch() ? "Desktop (touch)" /* EmulationModel.DeviceModeModel.UA.DESKTOP_TOUCH */ : "Desktop" /* EmulationModel.DeviceModeModel.UA.DESKTOP */;
        }
        editor.control('ua-type').value = uaType;
        editor.control('ua-metadata')
            .value = { metaData: device.userAgentMetadata || undefined };
        return editor;
    }
    createEditor() {
        if (this.editor) {
            return this.editor;
        }
        const editor = new UI.ListWidget.Editor();
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
            return { valid: true, errorMessage: undefined };
        }));
        const uaTypeOptions = [
            "Mobile" /* EmulationModel.DeviceModeModel.UA.MOBILE */,
            "Mobile (no touch)" /* EmulationModel.DeviceModeModel.UA.MOBILE_NO_TOUCH */,
            "Desktop" /* EmulationModel.DeviceModeModel.UA.DESKTOP */,
            "Desktop (touch)" /* EmulationModel.DeviceModeModel.UA.DESKTOP_TOUCH */,
        ];
        const uaType = editor.createSelect('ua-type', uaTypeOptions, () => {
            return { valid: true, errorMessage: undefined };
        }, i18nString(UIStrings.userAgentType));
        uaType.classList.add('device-edit-fixed');
        ua.appendChild(uaType);
        const uaMetadata = editor.createCustomControl('ua-metadata', EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsForm, userAgentMetadataValidator);
        uaMetadata.value = {};
        uaMetadata.addEventListener('clienthintschange', () => editor.requestValidation(), false);
        content.appendChild(uaMetadata);
        return editor;
        function userAgentMetadataValidator() {
            return uaMetadata.validate();
        }
        function titleValidator(_item, _index, input) {
            let valid = false;
            let errorMessage;
            const value = input.value.trim();
            if (value.length >= EmulationModel.DeviceModeModel.MaxDeviceNameLength) {
                errorMessage =
                    i18nString(UIStrings.deviceNameMustBeLessThanS, { PH1: EmulationModel.DeviceModeModel.MaxDeviceNameLength });
            }
            else if (value.length === 0) {
                errorMessage = i18nString(UIStrings.deviceNameCannotBeEmpty);
            }
            else {
                valid = true;
            }
            return { valid, errorMessage };
        }
        function widthValidator(_item, _index, input) {
            return EmulationModel.DeviceModeModel.DeviceModeModel.widthValidator(input.value);
        }
        function heightValidator(_item, _index, input) {
            return EmulationModel.DeviceModeModel.DeviceModeModel.heightValidator(input.value);
        }
        function scaleValidator(_item, _index, input) {
            return EmulationModel.DeviceModeModel.DeviceModeModel.scaleValidator(input.value);
        }
    }
}
//# sourceMappingURL=DevicesSettingsTab.js.map
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/settings/emulation/DevicesSettingsTab.js
var DevicesSettingsTab_exports = {};
__export(DevicesSettingsTab_exports, {
  DevicesSettingsTab: () => DevicesSettingsTab
});
import "./../../../ui/kit/kit.js";
import * as i18n from "./../../../core/i18n/i18n.js";
import * as EmulationModel from "./../../../models/emulation/emulation.js";
import * as UI from "./../../../ui/legacy/legacy.js";
import * as VisualLogging from "./../../../ui/visual_logging/visual_logging.js";
import * as EmulationComponents from "./components/components.js";

// gen/front_end/panels/settings/emulation/devicesSettingsTab.css.js
var devicesSettingsTab_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.device-card-content {
  padding-left: 0;
  padding-right: 0;
}

.list {
  &:has(div) {
    border: none;
  }
}

#custom-device-add-button {
  padding: var(--sys-size-5) var(--sys-size-6);
}

.devices-settings-tab .devices-button-row {
  flex: none;
  display: flex;

  devtools-button {
    margin: 4px 0 0 5px;
  }
}

.devices-settings-tab .devices-list {
  width: min(350px, 100%);
  margin-top: 10px;
}

.devices-list-item {
  padding: var(--sys-size-3) var(--sys-size-6);
  height: var(--sys-size-13);
  display: flex;
  align-items: center;
  flex: auto 1 1;
  overflow: hidden;
  color: var(--sys-color-on-surface);
  user-select: none;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.devices-list-checkbox {
  height: 12px;
  width: 12px;
  margin: 2px 5px 2px 2px;
  flex: none;
  pointer-events: none;
}

.device-name {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.devices-edit-fields {
  flex: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding-left: 4px;
  margin-bottom: 5px;
}

.devices-edit-fields b {
  margin-top: 8px;
  margin-bottom: 0;
}

.devices-edit-client-hints-heading {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 5px;
}
/* Don't want the bottom margin in the specific case of the folding one;
 * it messes with alignment with the arrow (which is a ::before) and  it's
 * spaced reasonably without it anyway
 */
li .devices-edit-client-hints-heading {
  margin-bottom: 0;
}

.devices-edit-client-hints-heading b {
  margin-inline-end: 2px;
}

.devices-edit-client-hints-heading .help-icon {
  margin-left: 2px;
  margin-right: 2px;
  vertical-align: middle;
}

.devices-edit-client-hints-heading a:focus {
  box-shadow: var(--sys-color-state-focus-ring);
}

.devices-edit-fields input {
  flex: auto;
  margin: 8px 5px 0;
}

li.devices-edit-client-hints-field {
  /* Cancel out padding from treeview's .tree-outline ol */
  left: -12px;
}

.devices-edit-client-hints-field input {
  flex: auto;
  margin: 8px 5px 0;
}

.devices-edit-fields .device-edit-fixed {
  flex: 0 0 140px;
}

.devices-edit-fields select {
  margin: 8px 5px 0;
}

/*# sourceURL=${import.meta.resolve("./devicesSettingsTab.css")} */`;

// gen/front_end/panels/settings/emulation/DevicesSettingsTab.js
var UIStrings = {
  /**
   * @description Title for a section of the UI that shows all of the custom devices the user can emulate, in the Device Toolbar.
   */
  customDevices: "Custom devices",
  /**
   * @description Title for a section of the UI that shows all of the default devices the user can emulate, in the Device Toolbar.
   */
  defaultDevices: "Default devices",
  /**
   * @description Button to add a custom device (e.g. phone, tablet) the Device Toolbar.
   */
  addCustomDevice: "Add custom device",
  /**
   * @description Label/title for UI to add a new custom device type. Device means mobile/tablet etc.
   */
  device: "Device",
  /**
   * @description Placeholder for text input for the name of a custom device.
   */
  deviceName: "Device Name",
  /**
   * @description Placeholder text for text input for the width of a custom device in pixels.
   */
  width: "Width",
  /**
   * @description Placeholder text for text input for the height of a custom device in pixels.
   */
  height: "Height",
  /**
   * @description Placeholder text for text input for the height/width ratio of a custom device in pixels.
   */
  devicePixelRatio: "Device pixel ratio",
  /**
   * @description Label in the Devices settings pane for the user agent string input of a custom device
   */
  userAgentString: "User agent string",
  /**
   * @description Tooltip text for a drop-down in the Devices settings pane, for the 'user agent type' input of a custom device.
   * 'Type' refers to different options e.g. mobile or desktop.
   */
  userAgentType: "User agent type",
  /**
   * @description Error message in the Devices settings pane that declares the maximum length of the device name input
   * @example {50} PH1
   */
  deviceNameMustBeLessThanS: "Device name must be less than {PH1} characters.",
  /**
   * @description Error message in the Devices settings pane that declares that the device name input must not be empty
   */
  deviceNameCannotBeEmpty: "Device name cannot be empty.",
  /**
   * @description Success message for screen readers when device is added.
   * @example {TestDevice} PH1
   */
  deviceAddedOrUpdated: "Device {PH1} successfully added/updated."
};
var str_ = i18n.i18n.registerUIStrings("panels/settings/emulation/DevicesSettingsTab.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var DevicesSettingsTab = class extends UI.Widget.VBox {
  containerElement;
  addCustomButton;
  ariaSuccessMessageElement;
  #customDeviceList;
  #defaultDeviceList;
  muteUpdate;
  emulatedDevicesList;
  editor;
  constructor() {
    super({ jslog: `${VisualLogging.pane("devices")}` });
    this.registerRequiredCSS(devicesSettingsTab_css_default);
    this.containerElement = this.contentElement.createChild("div", "settings-card-container-wrapper").createChild("div");
    this.containerElement.classList.add("settings-card-container", "ignore-list-settings");
    this.#defaultDeviceList = new UI.ListWidget.ListWidget(
      this,
      false
      /* delegatesFocus */
    );
    this.#defaultDeviceList.registerRequiredCSS(devicesSettingsTab_css_default);
    this.#defaultDeviceList.element.classList.add("devices-list", "device-card-content");
    this.muteUpdate = false;
    this.emulatedDevicesList = EmulationModel.EmulatedDevices.EmulatedDevicesList.instance();
    this.emulatedDevicesList.addEventListener("CustomDevicesUpdated", this.devicesUpdated, this);
    this.emulatedDevicesList.addEventListener("StandardDevicesUpdated", this.devicesUpdated, this);
    this.ariaSuccessMessageElement = this.contentElement.createChild("div", "device-success-message");
    UI.ARIAUtils.markAsPoliteLiveRegion(this.ariaSuccessMessageElement, false);
    this.addCustomButton = UI.UIUtils.createTextButton(i18nString(UIStrings.addCustomDevice), this.addCustomDevice.bind(this), { jslogContext: "add-custom-device" });
    this.addCustomButton.id = "custom-device-add-button";
    const customSettings = document.createElement("div");
    customSettings.classList.add("device-card-content");
    customSettings.appendChild(this.ariaSuccessMessageElement);
    const deviceList = customSettings.createChild("div");
    customSettings.appendChild(this.addCustomButton);
    const customDevicesCard = this.containerElement.createChild("devtools-card");
    customDevicesCard.heading = i18nString(UIStrings.customDevices);
    customDevicesCard.append(customSettings);
    this.#customDeviceList = new UI.ListWidget.ListWidget(
      this,
      false
      /* delegatesFocus */
    );
    this.#customDeviceList.registerRequiredCSS(devicesSettingsTab_css_default);
    this.#customDeviceList.element.classList.add("devices-list");
    this.#customDeviceList.show(deviceList);
    const defaultDevicesCard = this.containerElement.createChild("devtools-card");
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
    } else {
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
    return value ? String(value) : "";
  }
  renderItem(device, editable) {
    const label = document.createElement("label");
    label.classList.add("devices-list-item");
    const checkbox = label.createChild("input", "devices-list-checkbox");
    checkbox.type = "checkbox";
    checkbox.checked = device.show();
    checkbox.addEventListener("click", onItemClicked.bind(this), false);
    checkbox.setAttribute("jslog", `${VisualLogging.toggle().track({ click: true })}`);
    const span = document.createElement("span");
    span.classList.add("device-name");
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
    device.title = editor.control("title").value.trim();
    device.vertical.width = editor.control("width").value ? parseInt(editor.control("width").value, 10) : 0;
    device.vertical.height = editor.control("height").value ? parseInt(editor.control("height").value, 10) : 0;
    device.horizontal.width = device.vertical.height;
    device.horizontal.height = device.vertical.width;
    device.deviceScaleFactor = editor.control("scale").value ? parseFloat(editor.control("scale").value) : 0;
    device.userAgent = editor.control("user-agent").value;
    device.modes = [];
    device.modes.push({
      title: "",
      orientation: EmulationModel.EmulatedDevices.Vertical,
      insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),
      image: null
    });
    device.modes.push({
      title: "",
      orientation: EmulationModel.EmulatedDevices.Horizontal,
      insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),
      image: null
    });
    device.capabilities = [];
    const uaType = editor.control("ua-type").value;
    if (uaType === "Mobile" || uaType === "Mobile (no touch)") {
      device.capabilities.push(
        "mobile"
        /* EmulationModel.EmulatedDevices.Capability.MOBILE */
      );
    }
    if (uaType === "Mobile" || uaType === "Desktop (touch)") {
      device.capabilities.push(
        "touch"
        /* EmulationModel.EmulatedDevices.Capability.TOUCH */
      );
    }
    const userAgentControlValue = editor.control("ua-metadata").value.metaData;
    if (userAgentControlValue) {
      device.userAgentMetadata = {
        ...userAgentControlValue,
        mobile: uaType === "Mobile" || uaType === "Mobile (no touch)"
      };
    }
    if (isNew) {
      this.emulatedDevicesList.addCustomDevice(device);
    } else {
      this.emulatedDevicesList.saveCustomDevices();
    }
    this.addCustomButton.scrollIntoViewIfNeeded();
    this.addCustomButton.focus();
    this.ariaSuccessMessageElement.setAttribute("aria-label", i18nString(UIStrings.deviceAddedOrUpdated, { PH1: device.title }));
  }
  beginEdit(device) {
    const editor = this.createEditor();
    editor.control("title").value = device.title;
    editor.control("width").value = this.toNumericInputValue(device.vertical.width);
    editor.control("height").value = this.toNumericInputValue(device.vertical.height);
    editor.control("scale").value = this.toNumericInputValue(device.deviceScaleFactor);
    editor.control("user-agent").value = device.userAgent;
    let uaType;
    if (device.mobile()) {
      uaType = device.touch() ? "Mobile" : "Mobile (no touch)";
    } else {
      uaType = device.touch() ? "Desktop (touch)" : "Desktop";
    }
    editor.control("ua-type").value = uaType;
    editor.control("ua-metadata").value = { metaData: device.userAgentMetadata || void 0 };
    return editor;
  }
  createEditor() {
    if (this.editor) {
      return this.editor;
    }
    const editor = new UI.ListWidget.Editor();
    this.editor = editor;
    const content = editor.contentElement();
    const deviceFields = content.createChild("div", "devices-edit-fields");
    UI.UIUtils.createTextChild(deviceFields.createChild("b"), i18nString(UIStrings.device));
    const deviceNameField = editor.createInput("title", "text", i18nString(UIStrings.deviceName), titleValidator);
    deviceFields.createChild("div", "hbox").appendChild(deviceNameField);
    deviceNameField.id = "custom-device-name-field";
    const screen = deviceFields.createChild("div", "hbox");
    screen.appendChild(editor.createInput("width", "text", i18nString(UIStrings.width), widthValidator));
    screen.appendChild(editor.createInput("height", "text", i18nString(UIStrings.height), heightValidator));
    const dpr = editor.createInput("scale", "text", i18nString(UIStrings.devicePixelRatio), scaleValidator);
    dpr.classList.add("device-edit-fixed");
    screen.appendChild(dpr);
    const uaStringFields = content.createChild("div", "devices-edit-fields");
    UI.UIUtils.createTextChild(uaStringFields.createChild("b"), i18nString(UIStrings.userAgentString));
    const ua = uaStringFields.createChild("div", "hbox");
    ua.appendChild(editor.createInput("user-agent", "text", i18nString(UIStrings.userAgentString), () => {
      return { valid: true, errorMessage: void 0 };
    }));
    const uaTypeOptions = [
      "Mobile",
      "Mobile (no touch)",
      "Desktop",
      "Desktop (touch)"
    ];
    const uaType = editor.createSelect("ua-type", uaTypeOptions, () => {
      return { valid: true, errorMessage: void 0 };
    }, i18nString(UIStrings.userAgentType));
    uaType.classList.add("device-edit-fixed");
    ua.appendChild(uaType);
    const uaMetadata = editor.createCustomControl("ua-metadata", EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsForm, userAgentMetadataValidator);
    uaMetadata.value = {};
    uaMetadata.addEventListener("clienthintschange", () => editor.requestValidation(), false);
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
        errorMessage = i18nString(UIStrings.deviceNameMustBeLessThanS, { PH1: EmulationModel.DeviceModeModel.MaxDeviceNameLength });
      } else if (value.length === 0) {
        errorMessage = i18nString(UIStrings.deviceNameCannotBeEmpty);
      } else {
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
};
export {
  DevicesSettingsTab_exports as DevicesSettingsTab
};
//# sourceMappingURL=emulation.js.map

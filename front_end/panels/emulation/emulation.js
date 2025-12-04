var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/emulation/AdvancedApp.js
var AdvancedApp_exports = {};
__export(AdvancedApp_exports, {
  AdvancedApp: () => AdvancedApp,
  AdvancedAppProvider: () => AdvancedAppProvider
});
import * as Host3 from "./../../core/host/host.js";
import * as UI6 from "./../../ui/legacy/legacy.js";
import * as ThemeSupport from "./../../ui/legacy/theme_support/theme_support.js";

// gen/front_end/panels/emulation/DeviceModeWrapper.js
var DeviceModeWrapper_exports = {};
__export(DeviceModeWrapper_exports, {
  ActionDelegate: () => ActionDelegate,
  DeviceModeWrapper: () => DeviceModeWrapper
});
import * as Root from "./../../core/root/root.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as EmulationModel3 from "./../../models/emulation/emulation.js";
import * as UI4 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/emulation/DeviceModeView.js
var DeviceModeView_exports = {};
__export(DeviceModeView_exports, {
  DeviceModeView: () => DeviceModeView,
  Ruler: () => Ruler
});
import * as Common3 from "./../../core/common/common.js";
import * as Host2 from "./../../core/host/host.js";
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as Platform3 from "./../../core/platform/platform.js";
import * as EmulationModel2 from "./../../models/emulation/emulation.js";
import * as Geometry from "./../../models/geometry/geometry.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
import * as VisualLogging3 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/emulation/DeviceModeToolbar.js
var DeviceModeToolbar_exports = {};
__export(DeviceModeToolbar_exports, {
  DeviceModeToolbar: () => DeviceModeToolbar
});
import "./../../ui/legacy/legacy.js";
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as EmulationModel from "./../../models/emulation/emulation.js";
import * as UI from "./../../ui/legacy/legacy.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";
import * as MobileThrottling from "./../mobile_throttling/mobile_throttling.js";
import * as EmulationComponents from "./components/components.js";
var UIStrings = {
  /**
   * @description Title of the device dimensions selection item in the Device Mode Toolbar.
   * webpage in pixels.
   */
  dimensions: "Dimensions",
  /**
   * @description Title of the width input textbox in the Device Mode Toolbar, for the width of the
   * webpage in pixels.
   */
  width: "Width",
  /**
   * @description Title of the height input textbox in the Device Mode Toolbar, for the height of the
   * webpage in pixels. 'leave empty for full' is an instruction to the user - the webpage will be
   * full-height if this textbox is left empty.
   */
  heightLeaveEmptyForFull: "Height (leave empty for full)",
  /**
   * @description Tooltip text for a drop-down menu where the user can select the zoom percentage of
   * the webpage preview.
   */
  zoom: "Zoom",
  /**
   * @description Tooltip tip for a drop-down menu where the user can select the device pixel ratio
   * (the ratio between the physical pixels on a screen and CSS logical pixels) of the webpage
   * preview.
   */
  devicePixelRatio: "Device pixel ratio",
  /**
   * @description Tooltip tip for a drop-down menu where the user can select the device type e.g.
   * Mobile, Desktop.
   */
  deviceType: "Device type",
  /**
   * @description Tooltip text for a 'three dots' style menu button which shows an expanded set of options.
   */
  moreOptions: "More options",
  /**
   * @description A context menu item in the Device Mode Toolbar. This is a command to resize the
   * webpage preview to fit the current window. The placeholder is the percentage of full-size that
   * will be displayed after fitting.
   * @example {30.0} PH1
   */
  fitToWindowF: "Fit to window ({PH1}%)",
  /**
   * @description A checkbox setting that appears in the context menu for the zoom level, in the
   * Device Mode Toolbar.
   */
  autoadjustZoom: "Auto-adjust zoom",
  /**
   * @description A menu item in the drop-down box that allows the user to select the device pixel
   * ratio. Labels the default value which varies between device types, represented by the
   * placeholder, which is a number. In the Device Mode Toolbar.
   * @example {4.3} PH1
   */
  defaultF: "Default: {PH1}",
  /**
   * @description Command to hide the frame (like a picture frame) around the mobile device screen.
   */
  hideDeviceFrame: "Hide device frame",
  /**
   * @description Command to show the frame (like a picture frame) around the mobile device screen.
   */
  showDeviceFrame: "Show device frame",
  /**
   * @description Command to hide a display in the Device Mode Toolbar that shows the different media
   * queries for the device, above the device screen.
   * https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries
   */
  hideMediaQueries: "Hide media queries",
  /**
   * @description Command to show a display in the Device Mode Toolbar that shows the different media
   * queries for the device, above the device screen.
   * https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries
   */
  showMediaQueries: "Show media queries",
  /**
   * @description Command in the Device Mode Toolbar to hide a virtual ruler (for measuring),
   * displayed above and next to the device screen.
   */
  hideRulers: "Hide rulers",
  /**
   * @description Command in the Device Mode Toolbar to show a virtual ruler (for measuring),
   * displayed above and next to the device screen.
   */
  showRulers: "Show rulers",
  /**
   * @description Command in the Device Mode Toolbar to remove the drop-down menu from the toolbar
   * that lets the user override the device pixel ratio of the emulated device.
   */
  removeDevicePixelRatio: "Remove device pixel ratio",
  /**
   * @description Command in the Device Mode Toolbar to add the drop-down menu to the toolbar
   * that lets the user override the device pixel ratio of the emulated device.
   */
  addDevicePixelRatio: "Add device pixel ratio",
  /**
   * @description Command in the Device Mode Toolbar to add the drop-down menu to the toolbar
   * that lets the user set the device type (e.g. Desktop or Mobile).
   */
  removeDeviceType: "Remove device type",
  /**
   * @description Command in the Device Mode Toolbar to add the drop-down menu to the toolbar
   * that lets the user add the device type (e.g. Desktop or Mobile).
   */
  addDeviceType: "Add device type",
  /**
   * @description A context menu item in the Device Mode Toolbar that resets all settings back to
   * their default values.
   */
  resetToDefaults: "Reset to defaults",
  /**
   * @description A menu command in the Device Mode Toolbar that closes DevTools.
   */
  closeDevtools: "Close DevTools",
  /**
   * @description Title of the device selected in the Device Mode Toolbar. The 'response' device is
   * not a specific phone/tablet model but a virtual device that can change its height and width
   * dynamically by clicking and dragging the sides. 'Response' refers to response design:
   * https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design
   */
  responsive: "Responsive",
  /**
   * @description A context menu item in the Device Mode Toolbar that takes the user to a new screen
   * where they can add/edit/remove custom devices.
   */
  edit: "Edit\u2026",
  /**
   * @description Text describing the current orientation of the phone/device (vs. landscape).
   */
  portrait: "Portrait",
  /**
   * @description Text describing the current orientation of the phone/device (vs. portrait).
   */
  landscape: "Landscape",
  /**
   * @description Title of button in the Device Mode Toolbar which rotates the device 90 degrees.
   */
  rotate: "Rotate",
  /**
   * @description Fallback/default text used for the name of a custom device when no name has been
   * provided by the user.
   */
  none: "None",
  /**
   * @description Tooltip of the rotate/screen orientation button.
   */
  screenOrientationOptions: "Screen orientation options",
  /**
   * @description Tooltip for a button which turns on/off dual-screen mode, which emulates devices
   * like tablets which have two screens.
   */
  toggleDualscreenMode: "Toggle dual-screen mode",
  /**
   * @description Tooltip tip for a drop-down menu where the user can select the device
   * posture e.g. Continuous, Folded.
   */
  devicePosture: "Device posture"
};
var str_ = i18n.i18n.registerUIStrings("panels/emulation/DeviceModeToolbar.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
function setTitleForButton(button, title) {
  button.setTitle(title);
  button.element.title = title;
}
var DeviceModeToolbar = class {
  model;
  showMediaInspectorSetting;
  showRulersSetting;
  deviceOutlineSetting;
  showDeviceScaleFactorSetting;
  showUserAgentTypeSetting;
  autoAdjustScaleSetting;
  lastMode;
  #element;
  emulatedDevicesList;
  persistenceSetting;
  spanButton;
  postureItem;
  modeButton;
  widthInput;
  heightInput;
  deviceScaleItem;
  deviceSelectItem;
  scaleItem;
  uaItem;
  cachedDeviceScale;
  cachedUaType;
  xItem;
  throttlingConditionsItem;
  cachedModelType;
  cachedScale;
  cachedModelDevice;
  cachedModelMode;
  constructor(model, showMediaInspectorSetting, showRulersSetting) {
    this.model = model;
    this.showMediaInspectorSetting = showMediaInspectorSetting;
    this.showRulersSetting = showRulersSetting;
    this.deviceOutlineSetting = this.model.deviceOutlineSetting();
    this.showDeviceScaleFactorSetting = Common.Settings.Settings.instance().createSetting("emulation.show-device-scale-factor", false);
    this.showDeviceScaleFactorSetting.addChangeListener(this.updateDeviceScaleFactorVisibility, this);
    this.showUserAgentTypeSetting = Common.Settings.Settings.instance().createSetting("emulation.show-user-agent-type", false);
    this.showUserAgentTypeSetting.addChangeListener(this.updateUserAgentTypeVisibility, this);
    this.autoAdjustScaleSetting = Common.Settings.Settings.instance().createSetting("emulation.auto-adjust-scale", true);
    this.lastMode = /* @__PURE__ */ new Map();
    this.#element = document.createElement("div");
    this.#element.classList.add("device-mode-toolbar");
    this.#element.setAttribute("jslog", `${VisualLogging.toolbar("device-mode").track({ resize: true })}`);
    const mainToolbar = this.#element.createChild("devtools-toolbar", "main-toolbar");
    this.appendDeviceSelectMenu(mainToolbar);
    this.widthInput = new EmulationComponents.DeviceSizeInputElement.SizeInputElement(i18nString(UIStrings.width), { jslogContext: "width" });
    this.widthInput.addEventListener("sizechanged", ({ size: width }) => {
      if (this.autoAdjustScaleSetting.get()) {
        this.model.setWidthAndScaleToFit(width);
      } else {
        this.model.setWidth(width);
      }
    });
    this.heightInput = new EmulationComponents.DeviceSizeInputElement.SizeInputElement(i18nString(UIStrings.heightLeaveEmptyForFull), { jslogContext: "height" });
    this.heightInput.addEventListener("sizechanged", ({ size: height }) => {
      if (this.autoAdjustScaleSetting.get()) {
        this.model.setHeightAndScaleToFit(height);
      } else {
        this.model.setHeight(height);
      }
    });
    this.appendDimensionInputs(mainToolbar);
    this.appendDisplaySettings(mainToolbar);
    this.appendDevicePositionItems(mainToolbar);
    const optionsToolbar = this.#element.createChild("devtools-toolbar", "device-mode-toolbar-options");
    optionsToolbar.wrappable = true;
    this.fillOptionsToolbar(optionsToolbar);
    this.emulatedDevicesList = EmulationModel.EmulatedDevices.EmulatedDevicesList.instance();
    this.emulatedDevicesList.addEventListener("CustomDevicesUpdated", this.deviceListChanged, this);
    this.emulatedDevicesList.addEventListener("StandardDevicesUpdated", this.deviceListChanged, this);
    this.persistenceSetting = Common.Settings.Settings.instance().createSetting("emulation.device-mode-value", { device: "", orientation: "", mode: "" });
    this.model.toolbarControlsEnabledSetting().addChangeListener(updateToolbarsEnabled);
    updateToolbarsEnabled();
    function updateToolbarsEnabled() {
      const enabled = model.toolbarControlsEnabledSetting().get();
      mainToolbar.setEnabled(enabled);
      optionsToolbar.setEnabled(enabled);
    }
  }
  createEmptyToolbarElement() {
    const element = document.createElement("div");
    element.classList.add("device-mode-empty-toolbar-element");
    return element;
  }
  appendDeviceSelectMenu(toolbar2) {
    toolbar2.appendToolbarItem(new UI.Toolbar.ToolbarItem(this.createEmptyToolbarElement()));
    this.deviceSelectItem = new UI.Toolbar.ToolbarMenuButton(this.appendDeviceMenuItems.bind(this), void 0, void 0, "device");
    this.deviceSelectItem.turnShrinkable();
    this.deviceSelectItem.setDarkText();
    toolbar2.appendToolbarItem(this.deviceSelectItem);
  }
  appendDimensionInputs(toolbar2) {
    toolbar2.appendToolbarItem(new UI.Toolbar.ToolbarItem(this.widthInput));
    const xElement = document.createElement("div");
    xElement.classList.add("device-mode-x");
    xElement.textContent = "\xD7";
    this.xItem = new UI.Toolbar.ToolbarItem(xElement);
    toolbar2.appendToolbarItem(this.xItem);
    toolbar2.appendToolbarItem(new UI.Toolbar.ToolbarItem(this.heightInput));
  }
  appendDisplaySettings(toolbar2) {
    toolbar2.appendToolbarItem(new UI.Toolbar.ToolbarItem(this.createEmptyToolbarElement()));
    this.scaleItem = new UI.Toolbar.ToolbarMenuButton(this.appendScaleMenuItems.bind(this), void 0, void 0, "scale");
    setTitleForButton(this.scaleItem, i18nString(UIStrings.zoom));
    this.scaleItem.turnShrinkable();
    this.scaleItem.setDarkText();
    toolbar2.appendToolbarItem(this.scaleItem);
    toolbar2.appendToolbarItem(new UI.Toolbar.ToolbarItem(this.createEmptyToolbarElement()));
    this.deviceScaleItem = new UI.Toolbar.ToolbarMenuButton(this.appendDeviceScaleMenuItems.bind(this), void 0, void 0, "device-pixel-ratio");
    this.deviceScaleItem.turnShrinkable();
    this.deviceScaleItem.setVisible(this.showDeviceScaleFactorSetting.get());
    setTitleForButton(this.deviceScaleItem, i18nString(UIStrings.devicePixelRatio));
    this.deviceScaleItem.setDarkText();
    toolbar2.appendToolbarItem(this.deviceScaleItem);
    toolbar2.appendToolbarItem(new UI.Toolbar.ToolbarItem(this.createEmptyToolbarElement()));
    this.uaItem = new UI.Toolbar.ToolbarMenuButton(this.appendUserAgentMenuItems.bind(this), void 0, void 0, "device-type");
    this.uaItem.turnShrinkable();
    this.uaItem.setVisible(this.showUserAgentTypeSetting.get());
    setTitleForButton(this.uaItem, i18nString(UIStrings.deviceType));
    this.uaItem.setDarkText();
    toolbar2.appendToolbarItem(this.uaItem);
    this.throttlingConditionsItem = MobileThrottling.ThrottlingManager.throttlingManager().createMobileThrottlingButton();
    this.throttlingConditionsItem.turnShrinkable();
    toolbar2.appendToolbarItem(this.throttlingConditionsItem);
    toolbar2.appendToolbarItem(MobileThrottling.ThrottlingManager.throttlingManager().createSaveDataOverrideSelector());
  }
  appendDevicePositionItems(toolbar2) {
    toolbar2.appendToolbarItem(new UI.Toolbar.ToolbarItem(this.createEmptyToolbarElement()));
    this.modeButton = new UI.Toolbar.ToolbarButton("", "screen-rotation", void 0, "screen-rotation");
    this.modeButton.addEventListener("Click", this.modeMenuClicked, this);
    toolbar2.appendToolbarItem(this.modeButton);
    this.spanButton = new UI.Toolbar.ToolbarButton("", "device-fold", void 0, "device-fold");
    this.spanButton.addEventListener("Click", this.spanClicked, this);
    toolbar2.appendToolbarItem(this.spanButton);
    toolbar2.appendToolbarItem(new UI.Toolbar.ToolbarItem(this.createEmptyToolbarElement()));
    this.postureItem = new UI.Toolbar.ToolbarMenuButton(this.appendDevicePostureItems.bind(this), void 0, void 0, "device-posture");
    this.postureItem.turnShrinkable();
    this.postureItem.setDarkText();
    setTitleForButton(this.postureItem, i18nString(UIStrings.devicePosture));
    toolbar2.appendToolbarItem(this.postureItem);
  }
  fillOptionsToolbar(toolbar2) {
    toolbar2.appendToolbarItem(new UI.Toolbar.ToolbarItem(this.createEmptyToolbarElement()));
    const moreOptionsButton = new UI.Toolbar.ToolbarMenuButton(this.appendOptionsMenuItems.bind(this), true, void 0, "more-options", "dots-vertical");
    moreOptionsButton.setTitle(i18nString(UIStrings.moreOptions));
    toolbar2.appendToolbarItem(moreOptionsButton);
  }
  appendDevicePostureItems(contextMenu) {
    for (const title of ["Continuous", "Folded"]) {
      contextMenu.defaultSection().appendCheckboxItem(title, this.spanClicked.bind(this), { checked: title === this.currentDevicePosture(), jslogContext: title.toLowerCase() });
    }
  }
  currentDevicePosture() {
    const mode = this.model.mode();
    if (mode && (mode.orientation === EmulationModel.EmulatedDevices.VerticalSpanned || mode.orientation === EmulationModel.EmulatedDevices.HorizontalSpanned)) {
      return "Folded";
    }
    return "Continuous";
  }
  appendScaleMenuItems(contextMenu) {
    if (this.model.type() === EmulationModel.DeviceModeModel.Type.Device) {
      contextMenu.footerSection().appendItem(i18nString(UIStrings.fitToWindowF, { PH1: this.getPrettyFitZoomPercentage() }), this.onScaleMenuChanged.bind(this, this.model.fitScale()), { jslogContext: "fit-to-window" });
    }
    contextMenu.footerSection().appendCheckboxItem(i18nString(UIStrings.autoadjustZoom), this.onAutoAdjustScaleChanged.bind(this), { checked: this.autoAdjustScaleSetting.get(), jslogContext: "auto-adjust-zoom" });
    const boundAppendScaleItem = appendScaleItem.bind(this);
    boundAppendScaleItem("50%", 0.5);
    boundAppendScaleItem("75%", 0.75);
    boundAppendScaleItem("100%", 1);
    boundAppendScaleItem("125%", 1.25);
    boundAppendScaleItem("150%", 1.5);
    boundAppendScaleItem("200%", 2);
    function appendScaleItem(title, value) {
      contextMenu.defaultSection().appendCheckboxItem(title, this.onScaleMenuChanged.bind(this, value), { checked: this.model.scaleSetting().get() === value, jslogContext: title });
    }
  }
  onScaleMenuChanged(value) {
    this.model.scaleSetting().set(value);
  }
  onAutoAdjustScaleChanged() {
    this.autoAdjustScaleSetting.set(!this.autoAdjustScaleSetting.get());
  }
  appendDeviceScaleMenuItems(contextMenu) {
    const deviceScaleFactorSetting = this.model.deviceScaleFactorSetting();
    const defaultValue = this.model.uaSetting().get() === "Mobile" || this.model.uaSetting().get() === "Mobile (no touch)" ? EmulationModel.DeviceModeModel.defaultMobileScaleFactor : window.devicePixelRatio;
    appendDeviceScaleFactorItem(contextMenu.headerSection(), i18nString(UIStrings.defaultF, { PH1: defaultValue }), 0, "dpr-default");
    appendDeviceScaleFactorItem(contextMenu.defaultSection(), "1", 1, "dpr-1");
    appendDeviceScaleFactorItem(contextMenu.defaultSection(), "2", 2, "dpr-2");
    appendDeviceScaleFactorItem(contextMenu.defaultSection(), "3", 3, "dpr-3");
    function appendDeviceScaleFactorItem(section, title, value, jslogContext) {
      section.appendCheckboxItem(title, deviceScaleFactorSetting.set.bind(deviceScaleFactorSetting, value), { checked: deviceScaleFactorSetting.get() === value, jslogContext });
    }
  }
  appendUserAgentMenuItems(contextMenu) {
    const uaSetting = this.model.uaSetting();
    appendUAItem(
      "Mobile",
      "Mobile"
      /* EmulationModel.DeviceModeModel.UA.MOBILE */
    );
    appendUAItem(
      "Mobile (no touch)",
      "Mobile (no touch)"
      /* EmulationModel.DeviceModeModel.UA.MOBILE_NO_TOUCH */
    );
    appendUAItem(
      "Desktop",
      "Desktop"
      /* EmulationModel.DeviceModeModel.UA.DESKTOP */
    );
    appendUAItem(
      "Desktop (touch)",
      "Desktop (touch)"
      /* EmulationModel.DeviceModeModel.UA.DESKTOP_TOUCH */
    );
    function appendUAItem(title, value) {
      contextMenu.defaultSection().appendCheckboxItem(title, uaSetting.set.bind(uaSetting, value), { checked: uaSetting.get() === value, jslogContext: Platform.StringUtilities.toKebabCase(value) });
    }
  }
  appendOptionsMenuItems(contextMenu) {
    const model = this.model;
    appendToggleItem(contextMenu.headerSection(), this.deviceOutlineSetting, i18nString(UIStrings.hideDeviceFrame), i18nString(UIStrings.showDeviceFrame), model.type() !== EmulationModel.DeviceModeModel.Type.Device, "device-frame");
    appendToggleItem(contextMenu.headerSection(), this.showMediaInspectorSetting, i18nString(UIStrings.hideMediaQueries), i18nString(UIStrings.showMediaQueries), void 0, "media-queries");
    appendToggleItem(contextMenu.headerSection(), this.showRulersSetting, i18nString(UIStrings.hideRulers), i18nString(UIStrings.showRulers), void 0, "rulers");
    appendToggleItem(contextMenu.defaultSection(), this.showDeviceScaleFactorSetting, i18nString(UIStrings.removeDevicePixelRatio), i18nString(UIStrings.addDevicePixelRatio), void 0, "device-pixel-ratio");
    appendToggleItem(contextMenu.defaultSection(), this.showUserAgentTypeSetting, i18nString(UIStrings.removeDeviceType), i18nString(UIStrings.addDeviceType), void 0, "device-type");
    contextMenu.appendItemsAtLocation("deviceModeMenu");
    contextMenu.footerSection().appendItem(i18nString(UIStrings.resetToDefaults), this.reset.bind(this), { jslogContext: "reset-to-defaults" });
    contextMenu.footerSection().appendItem(i18nString(UIStrings.closeDevtools), Host.InspectorFrontendHost.InspectorFrontendHostInstance.closeWindow.bind(Host.InspectorFrontendHost.InspectorFrontendHostInstance), { jslogContext: "close-dev-tools" });
    function appendToggleItem(section, setting, title1, title2, disabled, context) {
      if (typeof disabled === "undefined") {
        disabled = model.type() === EmulationModel.DeviceModeModel.Type.None;
      }
      const isEnabled = setting.get();
      const jslogContext = `${context}-${isEnabled ? "disable" : "enable"}`;
      section.appendItem(isEnabled ? title1 : title2, setting.set.bind(setting, !setting.get()), { disabled, jslogContext });
    }
  }
  reset() {
    this.deviceOutlineSetting.set(false);
    this.showDeviceScaleFactorSetting.set(false);
    this.showUserAgentTypeSetting.set(false);
    this.showMediaInspectorSetting.set(false);
    this.showRulersSetting.set(false);
    this.model.reset();
  }
  emulateDevice(device) {
    const scale = this.autoAdjustScaleSetting.get() ? void 0 : this.model.scaleSetting().get();
    this.model.emulate(EmulationModel.DeviceModeModel.Type.Device, device, this.lastMode.get(device) || device.modes[0], scale);
  }
  switchToResponsive() {
    this.model.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
  }
  filterDevices(devices) {
    devices = devices.filter(function(d) {
      return d.show();
    });
    devices.sort(EmulationModel.EmulatedDevices.EmulatedDevice.deviceComparator);
    return devices;
  }
  standardDevices() {
    return this.filterDevices(this.emulatedDevicesList.standard());
  }
  customDevices() {
    return this.filterDevices(this.emulatedDevicesList.custom());
  }
  allDevices() {
    return this.standardDevices().concat(this.customDevices());
  }
  appendDeviceMenuItems(contextMenu) {
    contextMenu.headerSection().appendCheckboxItem(i18nString(UIStrings.responsive), this.switchToResponsive.bind(this), { checked: this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive, jslogContext: "responsive" });
    appendGroup.call(this, this.standardDevices());
    appendGroup.call(this, this.customDevices());
    contextMenu.footerSection().appendItem(i18nString(UIStrings.edit), this.emulatedDevicesList.revealCustomSetting.bind(this.emulatedDevicesList), { jslogContext: "edit" });
    function appendGroup(devices) {
      if (!devices.length) {
        return;
      }
      const section = contextMenu.section();
      for (const device of devices) {
        section.appendCheckboxItem(device.title, this.emulateDevice.bind(this, device), {
          checked: this.model.device() === device,
          jslogContext: Platform.StringUtilities.toKebabCase(device.title)
        });
      }
    }
  }
  deviceListChanged() {
    const device = this.model.device();
    if (!device) {
      return;
    }
    const devices = this.allDevices();
    if (devices.indexOf(device) === -1) {
      if (devices.length) {
        this.emulateDevice(devices[0]);
      } else {
        this.model.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
      }
    } else {
      this.emulateDevice(device);
    }
  }
  updateDeviceScaleFactorVisibility() {
    if (this.deviceScaleItem) {
      this.deviceScaleItem.setVisible(this.showDeviceScaleFactorSetting.get());
    }
  }
  updateUserAgentTypeVisibility() {
    if (this.uaItem) {
      this.uaItem.setVisible(this.showUserAgentTypeSetting.get());
    }
  }
  spanClicked() {
    const device = this.model.device();
    if (!device || !device.isDualScreen && !device.isFoldableScreen) {
      return;
    }
    const scale = this.autoAdjustScaleSetting.get() ? void 0 : this.model.scaleSetting().get();
    const mode = this.model.mode();
    if (!mode) {
      return;
    }
    const newMode = device.getSpanPartner(mode);
    if (!newMode) {
      return;
    }
    this.model.emulate(this.model.type(), device, newMode, scale);
    return;
  }
  modeMenuClicked(event) {
    const device = this.model.device();
    const model = this.model;
    const autoAdjustScaleSetting = this.autoAdjustScaleSetting;
    if (model.type() === EmulationModel.DeviceModeModel.Type.Responsive) {
      const appliedSize = model.appliedDeviceSize();
      if (autoAdjustScaleSetting.get()) {
        model.setSizeAndScaleToFit(appliedSize.height, appliedSize.width);
      } else {
        model.setWidth(appliedSize.height);
        model.setHeight(appliedSize.width);
      }
      return;
    }
    if (!device) {
      return;
    }
    if ((device.isDualScreen || device.isFoldableScreen || device.modes.length === 2) && device.modes[0].orientation !== device.modes[1].orientation) {
      const scale = autoAdjustScaleSetting.get() ? void 0 : model.scaleSetting().get();
      const mode = model.mode();
      if (!mode) {
        return;
      }
      const rotationPartner = device.getRotationPartner(mode);
      if (!rotationPartner) {
        return;
      }
      model.emulate(model.type(), model.device(), rotationPartner, scale);
      return;
    }
    if (!this.modeButton) {
      return;
    }
    const contextMenu = new UI.ContextMenu.ContextMenu(event.data, {
      x: this.modeButton.element.getBoundingClientRect().left,
      y: this.modeButton.element.getBoundingClientRect().top + this.modeButton.element.offsetHeight
    });
    addOrientation(EmulationModel.EmulatedDevices.Vertical, i18nString(UIStrings.portrait));
    addOrientation(EmulationModel.EmulatedDevices.Horizontal, i18nString(UIStrings.landscape));
    void contextMenu.show();
    function addOrientation(orientation, title) {
      if (!device) {
        return;
      }
      const modes = device.modesForOrientation(orientation);
      if (!modes.length) {
        return;
      }
      if (modes.length === 1) {
        addMode(modes[0], title);
      } else {
        for (let index = 0; index < modes.length; index++) {
          addMode(modes[index], title + " \u2013 " + modes[index].title);
        }
      }
    }
    function addMode(mode, title) {
      contextMenu.defaultSection().appendCheckboxItem(title, applyMode.bind(null, mode), { checked: model.mode() === mode, jslogContext: "device-mode" });
    }
    function applyMode(mode) {
      const scale = autoAdjustScaleSetting.get() ? void 0 : model.scaleSetting().get();
      model.emulate(model.type(), model.device(), mode, scale);
    }
  }
  getPrettyFitZoomPercentage() {
    return `${(this.model.fitScale() * 100).toFixed(0)}`;
  }
  getPrettyZoomPercentage() {
    return `${(this.model.scale() * 100).toFixed(0)}`;
  }
  element() {
    return this.#element;
  }
  update() {
    if (this.model.type() !== this.cachedModelType) {
      this.cachedModelType = this.model.type();
      this.widthInput.disabled = this.model.type() !== EmulationModel.DeviceModeModel.Type.Responsive;
      this.heightInput.disabled = this.model.type() !== EmulationModel.DeviceModeModel.Type.Responsive;
      this.deviceScaleItem.setEnabled(this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive);
      this.uaItem.setEnabled(this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive);
      if (this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive) {
        this.modeButton.setEnabled(true);
        setTitleForButton(this.modeButton, i18nString(UIStrings.rotate));
      } else {
        this.modeButton.setEnabled(false);
      }
    }
    const size = this.model.appliedDeviceSize();
    this.widthInput.size = String(size.width);
    this.heightInput.size = this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive && this.model.isFullHeight() ? "" : String(size.height);
    this.heightInput.placeholder = String(size.height);
    if (this.model.scale() !== this.cachedScale) {
      this.scaleItem.setText(`${this.getPrettyZoomPercentage()}%`);
      this.cachedScale = this.model.scale();
    }
    const deviceScale = this.model.appliedDeviceScaleFactor();
    if (deviceScale !== this.cachedDeviceScale) {
      this.deviceScaleItem.setText(`DPR: ${deviceScale.toFixed(1)}`);
      this.cachedDeviceScale = deviceScale;
    }
    const uaType = this.model.appliedUserAgentType();
    if (uaType !== this.cachedUaType) {
      this.uaItem.setText(uaType);
      this.cachedUaType = uaType;
    }
    let deviceItemTitle = i18nString(UIStrings.none);
    if (this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive) {
      deviceItemTitle = i18nString(UIStrings.responsive);
    }
    const device = this.model.device();
    if (this.model.type() === EmulationModel.DeviceModeModel.Type.Device && device) {
      deviceItemTitle = device.title;
    }
    this.deviceSelectItem.setText(`${i18nString(UIStrings.dimensions)}: ${deviceItemTitle}`);
    if (this.model.device() !== this.cachedModelDevice) {
      const device2 = this.model.device();
      if (device2) {
        const modeCount = device2 ? device2.modes.length : 0;
        this.modeButton.setEnabled(modeCount >= 2);
        setTitleForButton(this.modeButton, modeCount === 2 ? i18nString(UIStrings.rotate) : i18nString(UIStrings.screenOrientationOptions));
      }
      this.cachedModelDevice = device2;
    }
    if (device?.isDualScreen) {
      this.spanButton.setVisible(true);
      this.postureItem.setVisible(false);
    } else if (device?.isFoldableScreen) {
      this.spanButton.setVisible(false);
      this.postureItem.setVisible(true);
      this.postureItem.setText(this.currentDevicePosture());
    } else {
      this.spanButton.setVisible(false);
      this.postureItem.setVisible(false);
    }
    setTitleForButton(this.spanButton, i18nString(UIStrings.toggleDualscreenMode));
    if (this.model.type() === EmulationModel.DeviceModeModel.Type.Device) {
      this.lastMode.set(this.model.device(), this.model.mode());
    }
    if (this.model.mode() !== this.cachedModelMode && this.model.type() !== EmulationModel.DeviceModeModel.Type.None) {
      this.cachedModelMode = this.model.mode();
      const value = this.persistenceSetting.get();
      const device2 = this.model.device();
      if (device2) {
        value.device = device2.title;
        const mode = this.model.mode();
        value.orientation = mode ? mode.orientation : "";
        value.mode = mode ? mode.title : "";
      } else {
        value.device = "";
        value.orientation = "";
        value.mode = "";
      }
      this.persistenceSetting.set(value);
    }
  }
  restore() {
    for (const device of this.allDevices()) {
      if (device.title === this.persistenceSetting.get().device) {
        for (const mode of device.modes) {
          if (mode.orientation === this.persistenceSetting.get().orientation && mode.title === this.persistenceSetting.get().mode) {
            this.lastMode.set(device, mode);
            this.emulateDevice(device);
            return;
          }
        }
      }
    }
    this.model.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
  }
};

// gen/front_end/panels/emulation/deviceModeView.css.js
var deviceModeView_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  overflow: hidden;
  align-items: stretch;
  flex: auto;
  background-color: var(--app-color-toolbar-background);
}

.device-mode-toolbar {
  flex: none;
  background-color: var(--app-color-toolbar-background);
  border-bottom: 1px solid var(--sys-color-divider);
  display: flex;
  flex-direction: row;
  align-items: stretch;
}

.device-mode-x {
  margin: 0 1px;
  font-size: 16px;
}

.device-mode-empty-toolbar-element {
  width: 0;
}

devtools-toolbar {
  overflow: hidden;
  flex: 0 100000 auto;
  padding: 0 5px;

  &[wrappable] {
    height: var(--toolbar-height);
  }
}

devtools-toolbar.main-toolbar {
  margin: 0 auto;
}

devtools-toolbar.device-mode-toolbar-options {
  flex: none;
}

.device-mode-content-clip {
  overflow: hidden;
  flex: auto;
}

.device-mode-media-container {
  flex: none;
  overflow: hidden;
  box-shadow: inset 0 -1px var(--sys-color-divider);
}

.device-mode-content-clip:not(.device-mode-outline-visible) .device-mode-media-container {
  margin-bottom: 20px;
}

.device-mode-presets-container {
  flex: 0 0 20px;
  display: flex;
}

.device-mode-presets-container-inner {
  flex: auto;
  justify-content: center;
  position: relative;
  background-color: var(--sys-color-surface1);
  border-bottom: 1px solid var(--sys-color-divider);
}

.device-mode-presets-container:hover {
  transition: opacity 0.1s;
  transition-delay: 50ms;
  opacity: 100%;
}

.device-mode-preset-bar-outer {
  pointer-events: none;
  display: flex;
  justify-content: center;
}

.device-mode-preset-bar {
  border-left: 2px solid var(--sys-color-divider);
  border-right: 2px solid var(--sys-color-divider);
  pointer-events: auto;
  text-align: center;
  flex: none;
  color: var(--sys-color-on-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  margin-bottom: 1px;
}

.device-mode-preset-bar:hover {
  transition: background-color 0.1s;
  transition-delay: 50ms;
  background-color: var(--sys-color-state-hover-on-subtle);
}

.device-mode-preset-bar > span {
  visibility: hidden;
}

.device-mode-preset-bar:hover > span {
  transition: visibility 0.1s;
  transition-delay: 50ms;
  visibility: visible;
}

.device-mode-content-area {
  flex: auto;
  position: relative;
  margin: 0;
}

.device-mode-screen-area {
  position: absolute;
  left: 0;
  right: 0;
  width: 0;
  height: 0;
  background-color: var(--sys-color-inverse-surface);
}

.device-mode-content-clip:not(.device-mode-outline-visible) .device-mode-screen-area {
  --override-screen-area-box-shadow: hsl(240deg 3% 84%) 0 0 0 0.5px, hsl(0deg 0% 80% / 40%) 0 0 20px;

  box-shadow: var(--override-screen-area-box-shadow);
}

.theme-with-dark-background .device-mode-content-clip:not(.device-mode-outline-visible) .device-mode-screen-area,
:host-context(.theme-with-dark-background) .device-mode-content-clip:not(.device-mode-outline-visible) .device-mode-screen-area {
  --override-screen-area-box-shadow: rgb(40 40 42) 0 0 0 0.5px, rgb(51 51 51 / 40%) 0 0 20px;
}

.device-mode-screen-image {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

.device-mode-resizer {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: background-color 0.1s ease, opacity 0.1s ease;
}

.device-mode-resizer:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
  opacity: 100%;
}

.device-mode-resizer > div {
  pointer-events: none;
}

.device-mode-right-resizer {
  top: 0;
  bottom: -1px;
  right: -20px;
  width: 20px;
}

.device-mode-left-resizer {
  top: 0;
  bottom: -1px;
  left: -20px;
  width: 20px;
  opacity: 0%;
}

.device-mode-bottom-resizer {
  left: 0;
  right: -1px;
  bottom: -20px;
  height: 20px;
}

.device-mode-bottom-right-resizer {
  inset: 0 -20px -20px 0;
  background-color: var(--sys-color-surface1);
}

.device-mode-bottom-left-resizer {
  inset: 0 0 -20px -20px;
  opacity: 0%;
}

.device-mode-right-resizer > div {
  /* stylelint-disable-next-line custom-property-pattern */
  content: var(--image-file-resizeHorizontal);
  width: 6px;
  height: 26px;
}

.device-mode-left-resizer > div {
  /* stylelint-disable-next-line custom-property-pattern */
  content: var(--image-file-resizeHorizontal);
  width: 6px;
  height: 26px;
}

.device-mode-bottom-resizer > div {
  /* stylelint-disable-next-line custom-property-pattern */
  content: var(--image-file-resizeVertical);
  margin-bottom: -2px;
  width: 26px;
  height: 6px;
}

.device-mode-bottom-right-resizer > div {
  position: absolute;
  bottom: 3px;
  right: 3px;
  width: 13px;
  height: 13px;
  /* stylelint-disable-next-line custom-property-pattern */
  content: var(--image-file-resizeDiagonal);
}

.device-mode-bottom-left-resizer > div {
  position: absolute;
  bottom: 3px;
  left: 3px;
  width: 13px;
  height: 13px;
  /* stylelint-disable-next-line custom-property-pattern */
  content: var(--image-file-resizeDiagonal);
  transform: rotate(90deg);
}

.device-mode-page-area {
  position: absolute;
  left: 0;
  right: 0;
  width: 0;
  height: 0;
  display: flex;
  background-color: var(--sys-color-cdt-base-container);
}

.device-mode-ruler {
  position: absolute;
  overflow: visible;
}

.device-mode-ruler-top {
  height: 20px;
  right: 0;
}

.device-mode-ruler-left {
  width: 20px;
  bottom: 0;
}

.device-mode-ruler-content {
  pointer-events: none;
  position: absolute;
  left: -20px;
  top: -20px;
}

.device-mode-ruler-top .device-mode-ruler-content {
  border-top: 1px solid transparent;
  right: 0;
  bottom: 20px;
  background-color: var(--sys-color-cdt-base-container);
}

.device-mode-ruler-left .device-mode-ruler-content {
  border-left: 1px solid transparent;
  border-top: 1px solid transparent;
  right: 20px;
  bottom: 0;
}

.device-mode-content-clip.device-mode-outline-visible .device-mode-ruler-top .device-mode-ruler-content {
  border-top: 1px solid var(--sys-color-token-subtle);
}

.device-mode-content-clip.device-mode-outline-visible .device-mode-ruler-left .device-mode-ruler-content {
  border-left: 1px solid var(--sys-color-token-subtle);
  border-top: 1px solid var(--sys-color-token-subtle);
}

.device-mode-ruler-inner {
  position: absolute;
}

.device-mode-ruler-top .device-mode-ruler-inner {
  inset: 0 0 0 20px;
  border-bottom: 1px solid var(--sys-color-token-subtle);
}

.device-mode-ruler-left .device-mode-ruler-inner {
  inset: 19px 0 0;
  border-right: 1px solid var(--sys-color-token-subtle);
  background-color: var(--sys-color-cdt-base-container);
}

.device-mode-ruler-marker {
  position: absolute;
}

.device-mode-ruler-top .device-mode-ruler-marker {
  width: 0;
  height: 5px;
  bottom: 0;
  border-right: 1px solid var(--sys-color-token-subtle);
  margin-right: -1px;
}

.device-mode-ruler-top .device-mode-ruler-marker.device-mode-ruler-marker-medium {
  height: 10px;
}

.device-mode-ruler-top .device-mode-ruler-marker.device-mode-ruler-marker-large {
  height: 15px;
}

.device-mode-ruler-left .device-mode-ruler-marker {
  height: 0;
  width: 5px;
  right: 0;
  border-bottom: 1px solid var(--sys-color-token-subtle);
  margin-bottom: -1px;
}

.device-mode-ruler-left .device-mode-ruler-marker.device-mode-ruler-marker-medium {
  width: 10px;
}

.device-mode-ruler-left .device-mode-ruler-marker.device-mode-ruler-marker-large {
  width: 15px;
}

.device-mode-ruler-text {
  color: var(--sys-color-token-subtle);
  position: relative;
  pointer-events: auto;
}

.device-mode-ruler-text:hover {
  color: var(--sys-color-on-surface);
}

.device-mode-ruler-top .device-mode-ruler-text {
  left: 2px;
  top: -2px;
}

.device-mode-ruler-left .device-mode-ruler-text {
  left: -4px;
  top: -15px;
  transform: rotate(270deg);
}

/*# sourceURL=${import.meta.resolve("./deviceModeView.css")} */`;

// gen/front_end/panels/emulation/MediaQueryInspector.js
var MediaQueryInspector_exports = {};
__export(MediaQueryInspector_exports, {
  DEFAULT_VIEW: () => DEFAULT_VIEW,
  MediaQueryInspector: () => MediaQueryInspector,
  MediaQueryUIModel: () => MediaQueryUIModel
});
import * as Common2 from "./../../core/common/common.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Platform2 from "./../../core/platform/platform.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Bindings from "./../../models/bindings/bindings.js";
import { Directives, html, nothing, render } from "./../../third_party/lit/lit.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/emulation/mediaQueryInspector.css.js
var mediaQueryInspector_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
/* Media query bars */

.media-inspector-view {
  height: 50px;
}

.media-inspector-marker-container {
  height: 14px;
  margin: 2px 0;
  position: relative;
}

.media-inspector-bar {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  pointer-events: none;
  position: absolute;
  inset: 0;
}

.media-inspector-marker {
  flex: none;
  pointer-events: auto;
  margin: 1px 0;
  white-space: nowrap;
  z-index: auto;
  position: relative;
}

.media-inspector-marker-spacer {
  flex: auto;
}

.media-inspector-marker:hover {
  margin: -1px 0;
  opacity: 100%;
}

.media-inspector-marker-min-width {
  flex: auto;
  background-color: var(--sys-color-yellow-container);
  border-right: 2px solid var(--sys-color-yellow-bright);
  border-left: 2px solid var(--sys-color-yellow-bright);

  &:hover {
    background-color: color-mix(in srgb, var(--sys-color-yellow-container), var(--sys-color-yellow-bright) 30%);
  }
}

.media-inspector-marker-min-width-right {
  border-left: 2px solid var(--sys-color-yellow-bright);
}

.media-inspector-marker-min-width-left {
  border-right: 2px solid var(--sys-color-yellow-bright);
}

.media-inspector-marker-min-max-width {
  background-color: var(--sys-color-tertiary-container);
  border-left: 2px solid var(--sys-color-tertiary);
  border-right: 2px solid var(--sys-color-tertiary);
}

.media-inspector-marker-min-max-width:hover {
  z-index: 1;
}

.media-inspector-marker-max-width {
  background-color: var(--sys-color-inverse-primary);
  border-right: 2px solid var(--sys-color-primary-bright);
  border-left: 2px solid var(--sys-color-primary-bright);
}

/* Clear background colors when query is not active and not hovering */

.media-inspector-marker-inactive .media-inspector-marker-min-width:not(:hover) {
  background-color: var(--sys-color-surface-yellow);
}

.media-inspector-marker-inactive .media-inspector-marker-min-max-width:not(:hover) {
  background-color: color-mix(in srgb, var(--sys-color-tertiary-container), var(--sys-color-cdt-base-container) 30%);
}

.media-inspector-marker-inactive .media-inspector-marker-max-width:not(:hover) {
  background-color: var(--sys-color-tonal-container);
}

/* Media query labels */

.media-inspector-marker-label-container {
  position: absolute;
  z-index: 1;
}

.media-inspector-marker:not(:hover) .media-inspector-marker-label-container {
  display: none;
}

.media-inspector-marker-label-container-left {
  left: -2px;
}

.media-inspector-marker-label-container-right {
  right: -2px;
}

.media-inspector-marker-label {
  color: var(--sys-color-on-surface);
  position: absolute;
  top: 1px;
  bottom: 0;
  font-size: 12px;
  pointer-events: none;
}

.media-inspector-label-right {
  right: 4px;
}

.media-inspector-label-left {
  left: 4px;
}

/*# sourceURL=${import.meta.resolve("./mediaQueryInspector.css")} */`;

// gen/front_end/panels/emulation/MediaQueryInspector.js
var UIStrings2 = {
  /**
   * @description A context menu item/command in the Media Query Inspector of the Device Toolbar.
   * Takes the user to the source code where this media query actually came from.
   */
  revealInSourceCode: "Reveal in source code"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/emulation/MediaQueryInspector.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var { classMap } = Directives;
var DEFAULT_VIEW = (input, _output, target) => {
  const createBarClassMap = (marker) => ({
    "media-inspector-bar": true,
    "media-inspector-marker-inactive": !marker.active
  });
  render(html`
    <style>${mediaQueryInspector_css_default}</style>
    <div class='media-inspector-view'>
    ${input.markers.entries().map(([section, markers]) => html`
      <div class='media-inspector-marker-container'>
        ${markers.map((marker) => html`
          <div
              class=${classMap(createBarClassMap(marker))}
              @click=${() => input.onMediaQueryClicked(marker.model)}
              @contextmenu=${(event) => input.onContextMenu(event, marker.locations)}
          >
            ${section === 0 ? renderMaxSection(input.zoomFactor, marker.model) : section === 1 ? renderMinMaxSection(input.zoomFactor, marker.model) : renderMinSection(input.zoomFactor, marker.model)}
          </div>
        `)}
      </div>
    `).toArray()}
    </div>`, target);
};
function renderMaxSection(zoomFactor, model) {
  return html`
    <div class='media-inspector-marker-spacer'></div>
    <div
        class='media-inspector-marker media-inspector-marker-max-width'
        style=${"width: " + model.maxWidthValue(zoomFactor) + "px"}
        title=${model.mediaText()}
    >
      ${renderLabel(model.maxWidthExpression(), false, false)}
      ${renderLabel(model.maxWidthExpression(), true, true)}
    </div>
    <div class='media-inspector-marker-spacer'></div>
  `;
}
function renderMinMaxSection(zoomFactor, model) {
  const width = (model.maxWidthValue(zoomFactor) - model.minWidthValue(zoomFactor)) * 0.5;
  return html`
    <div class='media-inspector-marker-spacer'></div>
    <div
        class='media-inspector-marker media-inspector-marker-min-max-width'
        style=${"width: " + width + "px"}
        title=${model.mediaText()}
    >
      ${renderLabel(model.maxWidthExpression(), true, false)}
      ${renderLabel(model.minWidthExpression(), false, true)}
    </div>
    <div class='media-inspector-marker-spacer' style=${"flex: 0 0 " + model.minWidthValue(zoomFactor) + "px"}></div>
    <div
        class='media-inspector-marker media-inspector-marker-min-max-width'
        style=${"width: " + width + "px"}
        title=${model.mediaText()}
    >
      ${renderLabel(model.minWidthExpression(), true, false)}
      ${renderLabel(model.maxWidthExpression(), false, true)}
    </div>
    <div class='media-inspector-marker-spacer'></div>
  `;
}
function renderMinSection(zoomFactor, model) {
  return html`
    <div
        class='media-inspector-marker media-inspector-marker-min-width media-inspector-marker-min-width-left'
        title=${model.mediaText()}
    >${renderLabel(model.minWidthExpression(), false, false)}</div>
    <div class='media-inspector-marker-spacer' style=${"flex: 0 0 " + model.minWidthValue(zoomFactor) + "px"}></div>
    <div
        class='media-inspector-marker media-inspector-marker-min-width media-inspector-marker-min-width-right'
        title=${model.mediaText()}
    >${renderLabel(model.minWidthExpression(), true, true)}</div>
  `;
}
function renderLabel(expression, atLeft, leftAlign) {
  if (!expression) {
    return nothing;
  }
  const containerClassMap = {
    "media-inspector-marker-label-container": true,
    "media-inspector-marker-label-container-left": atLeft,
    "media-inspector-marker-label-container-right": !atLeft
  };
  const labelClassMap = {
    "media-inspector-marker-label": true,
    "media-inspector-label-left": leftAlign,
    "media-inspector-label-right": !leftAlign
  };
  return html`
    <div class=${classMap(containerClassMap)}>
      <span class=${classMap(labelClassMap)}>${expression.value()}${expression.unit()}</span>
    </div>
  `;
}
var MediaQueryInspector = class extends UI2.Widget.Widget {
  view;
  mediaThrottler;
  getWidthCallback;
  setWidthCallback;
  scale;
  cssModel;
  cachedQueryModels;
  constructor(getWidthCallback, setWidthCallback, mediaThrottler, view = DEFAULT_VIEW) {
    super({
      jslog: `${VisualLogging2.mediaInspectorView().track({ click: true })}`,
      useShadowDom: true
    });
    this.view = view;
    this.mediaThrottler = mediaThrottler;
    this.getWidthCallback = getWidthCallback;
    this.setWidthCallback = setWidthCallback;
    this.scale = 1;
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.CSSModel.CSSModel, this);
    UI2.ZoomManager.ZoomManager.instance().addEventListener("ZoomChanged", this.requestUpdate.bind(this), this);
  }
  modelAdded(cssModel) {
    if (cssModel.target() !== SDK.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.cssModel = cssModel;
    this.cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, this.scheduleMediaQueriesUpdate, this);
    this.cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetRemoved, this.scheduleMediaQueriesUpdate, this);
    this.cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetChanged, this.scheduleMediaQueriesUpdate, this);
    this.cssModel.addEventListener(SDK.CSSModel.Events.MediaQueryResultChanged, this.scheduleMediaQueriesUpdate, this);
  }
  modelRemoved(cssModel) {
    if (cssModel !== this.cssModel) {
      return;
    }
    this.cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetAdded, this.scheduleMediaQueriesUpdate, this);
    this.cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetRemoved, this.scheduleMediaQueriesUpdate, this);
    this.cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetChanged, this.scheduleMediaQueriesUpdate, this);
    this.cssModel.removeEventListener(SDK.CSSModel.Events.MediaQueryResultChanged, this.scheduleMediaQueriesUpdate, this);
    delete this.cssModel;
  }
  setAxisTransform(scale) {
    if (Math.abs(this.scale - scale) < 1e-8) {
      return;
    }
    this.scale = scale;
    this.performUpdate();
  }
  onMediaQueryClicked(model) {
    const modelMaxWidth = model.maxWidthExpression();
    const modelMinWidth = model.minWidthExpression();
    if (model.section() === 0) {
      this.setWidthCallback(modelMaxWidth ? modelMaxWidth.computedLength() || 0 : 0);
      return;
    }
    if (model.section() === 2) {
      this.setWidthCallback(modelMinWidth ? modelMinWidth.computedLength() || 0 : 0);
      return;
    }
    const currentWidth = this.getWidthCallback();
    if (modelMinWidth && currentWidth !== modelMinWidth.computedLength()) {
      this.setWidthCallback(modelMinWidth.computedLength() || 0);
    } else {
      this.setWidthCallback(modelMaxWidth ? modelMaxWidth.computedLength() || 0 : 0);
    }
  }
  onContextMenu(event, locations) {
    if (!this.cssModel?.isEnabled()) {
      return;
    }
    const uiLocations = /* @__PURE__ */ new Map();
    for (let i = 0; i < locations.length; ++i) {
      const uiLocation = Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding.instance().rawLocationToUILocation(locations[i]);
      if (!uiLocation) {
        continue;
      }
      const descriptor = typeof uiLocation.columnNumber === "number" ? Platform2.StringUtilities.sprintf("%s:%d:%d", uiLocation.uiSourceCode.url(), uiLocation.lineNumber + 1, uiLocation.columnNumber + 1) : Platform2.StringUtilities.sprintf("%s:%d", uiLocation.uiSourceCode.url(), uiLocation.lineNumber + 1);
      uiLocations.set(descriptor, uiLocation);
    }
    const contextMenuItems = [...uiLocations.keys()].sort();
    const contextMenu = new UI2.ContextMenu.ContextMenu(event);
    const subMenuItem = contextMenu.defaultSection().appendSubMenuItem(i18nString2(UIStrings2.revealInSourceCode), void 0, "reveal-in-source-list");
    for (let i = 0; i < contextMenuItems.length; ++i) {
      const title = contextMenuItems[i];
      subMenuItem.defaultSection().appendItem(title, this.revealSourceLocation.bind(this, uiLocations.get(title)), { jslogContext: "reveal-in-source" });
    }
    void contextMenu.show();
  }
  revealSourceLocation(location) {
    void Common2.Revealer.reveal(location);
  }
  scheduleMediaQueriesUpdate() {
    if (!this.isShowing()) {
      return;
    }
    void this.mediaThrottler.schedule(this.refetchMediaQueries.bind(this));
  }
  refetchMediaQueries() {
    if (!this.isShowing() || !this.cssModel) {
      return Promise.resolve();
    }
    return this.cssModel.getMediaQueries().then(this.rebuildMediaQueries.bind(this));
  }
  squashAdjacentEqual(models) {
    const filtered = [];
    for (let i = 0; i < models.length; ++i) {
      const last = filtered[filtered.length - 1];
      if (!last?.equals(models[i])) {
        filtered.push(models[i]);
      }
    }
    return filtered;
  }
  rebuildMediaQueries(cssMedias) {
    let queryModels = [];
    for (let i = 0; i < cssMedias.length; ++i) {
      const cssMedia = cssMedias[i];
      if (!cssMedia.mediaList) {
        continue;
      }
      for (let j = 0; j < cssMedia.mediaList.length; ++j) {
        const mediaQuery = cssMedia.mediaList[j];
        const queryModel = MediaQueryUIModel.createFromMediaQuery(cssMedia, mediaQuery);
        if (queryModel) {
          queryModels.push(queryModel);
        }
      }
    }
    queryModels.sort(compareModels);
    queryModels = this.squashAdjacentEqual(queryModels);
    let allEqual = this.cachedQueryModels && this.cachedQueryModels.length === queryModels.length;
    for (let i = 0; allEqual && i < queryModels.length; ++i) {
      allEqual = allEqual && this.cachedQueryModels?.[i].equals(queryModels[i]);
    }
    if (allEqual) {
      return;
    }
    this.cachedQueryModels = queryModels;
    this.requestUpdate();
    function compareModels(model1, model2) {
      return model1.compareTo(model2);
    }
  }
  buildMediaQueryMarkers() {
    if (!this.cachedQueryModels) {
      return [];
    }
    const markers = [];
    let lastMarker = null;
    for (const model of this.cachedQueryModels) {
      if (lastMarker?.model.dimensionsEqual(model)) {
        lastMarker.active = lastMarker.active || model.active();
      } else {
        lastMarker = {
          active: model.active(),
          model,
          locations: []
        };
        markers.push(lastMarker);
      }
      const rawLocation = model.rawLocation();
      if (rawLocation) {
        lastMarker.locations.push(rawLocation);
      }
    }
    return markers;
  }
  zoomFactor() {
    return UI2.ZoomManager.ZoomManager.instance().zoomFactor() / this.scale;
  }
  wasShown() {
    super.wasShown();
    this.scheduleMediaQueriesUpdate();
    this.performUpdate();
  }
  performUpdate() {
    const markers = Map.groupBy(this.buildMediaQueryMarkers(), (marker) => marker.model.section());
    this.view({
      zoomFactor: this.zoomFactor(),
      markers,
      onMediaQueryClicked: this.onMediaQueryClicked.bind(this),
      onContextMenu: this.onContextMenu.bind(this)
    }, {}, this.contentElement);
  }
};
var MediaQueryUIModel = class _MediaQueryUIModel {
  cssMedia;
  #minWidthExpression;
  #maxWidthExpression;
  #active;
  #section;
  #rawLocation;
  constructor(cssMedia, minWidthExpression, maxWidthExpression, active) {
    this.cssMedia = cssMedia;
    this.#minWidthExpression = minWidthExpression;
    this.#maxWidthExpression = maxWidthExpression;
    this.#active = active;
    if (maxWidthExpression && !minWidthExpression) {
      this.#section = 0;
    } else if (minWidthExpression && maxWidthExpression) {
      this.#section = 1;
    } else {
      this.#section = 2;
    }
  }
  static createFromMediaQuery(cssMedia, mediaQuery) {
    let maxWidthExpression = null;
    let maxWidthPixels = Number.MAX_VALUE;
    let minWidthExpression = null;
    let minWidthPixels = Number.MIN_VALUE;
    const expressions = mediaQuery.expressions();
    if (!expressions) {
      return null;
    }
    for (let i = 0; i < expressions.length; ++i) {
      const expression = expressions[i];
      const feature = expression.feature();
      if (feature.indexOf("width") === -1) {
        continue;
      }
      const pixels = expression.computedLength();
      if (feature.startsWith("max-") && pixels && pixels < maxWidthPixels) {
        maxWidthExpression = expression;
        maxWidthPixels = pixels;
      } else if (feature.startsWith("min-") && pixels && pixels > minWidthPixels) {
        minWidthExpression = expression;
        minWidthPixels = pixels;
      }
    }
    if (minWidthPixels > maxWidthPixels || !maxWidthExpression && !minWidthExpression) {
      return null;
    }
    return new _MediaQueryUIModel(cssMedia, minWidthExpression, maxWidthExpression, mediaQuery.active());
  }
  equals(other) {
    return this.compareTo(other) === 0;
  }
  dimensionsEqual(other) {
    const thisMinWidthExpression = this.minWidthExpression();
    const otherMinWidthExpression = other.minWidthExpression();
    const thisMaxWidthExpression = this.maxWidthExpression();
    const otherMaxWidthExpression = other.maxWidthExpression();
    const sectionsEqual = this.section() === other.section();
    const minWidthEqual = !thisMinWidthExpression || thisMinWidthExpression.computedLength() === otherMinWidthExpression?.computedLength();
    const maxWidthEqual = !thisMaxWidthExpression || thisMaxWidthExpression.computedLength() === otherMaxWidthExpression?.computedLength();
    return sectionsEqual && minWidthEqual && maxWidthEqual;
  }
  compareTo(other) {
    if (this.section() !== other.section()) {
      return this.section() - other.section();
    }
    if (this.dimensionsEqual(other)) {
      const myLocation = this.rawLocation();
      const otherLocation = other.rawLocation();
      if (!myLocation && !otherLocation) {
        return Platform2.StringUtilities.compare(this.mediaText(), other.mediaText());
      }
      if (myLocation && !otherLocation) {
        return 1;
      }
      if (!myLocation && otherLocation) {
        return -1;
      }
      if (this.active() !== other.active()) {
        return this.active() ? -1 : 1;
      }
      if (!myLocation || !otherLocation) {
        return 0;
      }
      return Platform2.StringUtilities.compare(myLocation.url, otherLocation.url) || myLocation.lineNumber - otherLocation.lineNumber || myLocation.columnNumber - otherLocation.columnNumber;
    }
    const thisMaxWidthExpression = this.maxWidthExpression();
    const otherMaxWidthExpression = other.maxWidthExpression();
    const thisMaxLength = thisMaxWidthExpression ? thisMaxWidthExpression.computedLength() || 0 : 0;
    const otherMaxLength = otherMaxWidthExpression ? otherMaxWidthExpression.computedLength() || 0 : 0;
    const thisMinWidthExpression = this.minWidthExpression();
    const otherMinWidthExpression = other.minWidthExpression();
    const thisMinLength = thisMinWidthExpression ? thisMinWidthExpression.computedLength() || 0 : 0;
    const otherMinLength = otherMinWidthExpression ? otherMinWidthExpression.computedLength() || 0 : 0;
    if (this.section() === 0) {
      return otherMaxLength - thisMaxLength;
    }
    if (this.section() === 2) {
      return thisMinLength - otherMinLength;
    }
    return thisMinLength - otherMinLength || otherMaxLength - thisMaxLength;
  }
  section() {
    return this.#section;
  }
  mediaText() {
    return this.cssMedia.text || "";
  }
  rawLocation() {
    if (!this.#rawLocation) {
      this.#rawLocation = this.cssMedia.rawLocation();
    }
    return this.#rawLocation;
  }
  minWidthExpression() {
    return this.#minWidthExpression;
  }
  maxWidthExpression() {
    return this.#maxWidthExpression;
  }
  minWidthValue(zoomFactor) {
    const minWidthExpression = this.minWidthExpression();
    return minWidthExpression ? (minWidthExpression.computedLength() || 0) / zoomFactor : 0;
  }
  maxWidthValue(zoomFactor) {
    const maxWidthExpression = this.maxWidthExpression();
    return maxWidthExpression ? (maxWidthExpression.computedLength() || 0) / zoomFactor : 0;
  }
  active() {
    return this.#active;
  }
};

// gen/front_end/panels/emulation/DeviceModeView.js
var UIStrings3 = {
  /**
   * @description Bottom resizer element title in Device Mode View of the Device Toolbar
   */
  doubleclickForFullHeight: "Double-click for full height",
  /**
   * @description Name of a device that the user can select to emulate. Small mobile device.
   * Translation of this phrase should be limited to 10 characters.
   */
  mobileS: "Mobile S",
  /**
   * @description Name of a device that the user can select to emulate. Medium mobile device.
   * Translation of this phrase should be limited to 10 characters.
   */
  mobileM: "Mobile M",
  /**
   * @description Name of a device that the user can select to emulate. Large mobile device.
   * Translation of this phrase should be limited to 10 characters.
   */
  mobileL: "Mobile L",
  /**
   * @description Name of a device that the user can select to emulate. Tablet device.
   * Translation of this phrase should be limited to 10 characters.
   */
  tablet: "Tablet",
  /**
   * @description Name of a device that the user can select to emulate. Laptop device.
   * Translation of this phrase should be limited to 10 characters.
   */
  laptop: "Laptop",
  /**
   * @description Name of a device that the user can select to emulate. Large laptop device.
   * Translation of this phrase should be limited to 10 characters.
   */
  laptopL: "Laptop L"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/emulation/DeviceModeView.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var DeviceModeView = class extends UI3.Widget.VBox {
  wrapperInstance;
  blockElementToWidth;
  model;
  mediaInspector;
  showMediaInspectorSetting;
  showRulersSetting;
  topRuler;
  leftRuler;
  presetBlocks;
  responsivePresetsContainer;
  screenArea;
  pageArea;
  outlineImage;
  contentClip;
  contentArea;
  rightResizerElement;
  leftResizerElement;
  bottomResizerElement;
  bottomRightResizerElement;
  bottomLeftResizerElement;
  cachedResizable;
  mediaInspectorContainer;
  screenImage;
  toolbar;
  slowPositionStart;
  resizeStart;
  cachedCssScreenRect;
  cachedCssVisiblePageRect;
  cachedOutlineRect;
  cachedMediaInspectorVisible;
  cachedShowRulers;
  cachedScale;
  handleWidth;
  handleHeight;
  constructor() {
    super({ useShadowDom: true });
    this.blockElementToWidth = /* @__PURE__ */ new WeakMap();
    this.setMinimumSize(150, 150);
    this.element.classList.add("device-mode-view");
    this.registerRequiredCSS(deviceModeView_css_default);
    this.model = EmulationModel2.DeviceModeModel.DeviceModeModel.instance();
    this.model.addEventListener("Updated", this.updateUI, this);
    this.mediaInspector = new MediaQueryInspector(() => this.model.appliedDeviceSize().width, this.model.setWidth.bind(this.model), new Common3.Throttler.Throttler(0));
    this.showMediaInspectorSetting = Common3.Settings.Settings.instance().moduleSetting("show-media-query-inspector");
    this.showMediaInspectorSetting.addChangeListener(this.updateUI, this);
    this.showRulersSetting = Common3.Settings.Settings.instance().moduleSetting("emulation.show-rulers");
    this.showRulersSetting.addChangeListener(this.updateUI, this);
    this.topRuler = new Ruler(true, this.model.setWidthAndScaleToFit.bind(this.model));
    this.topRuler.element.classList.add("device-mode-ruler-top");
    this.leftRuler = new Ruler(false, this.model.setHeightAndScaleToFit.bind(this.model));
    this.leftRuler.element.classList.add("device-mode-ruler-left");
    this.createUI();
    UI3.ZoomManager.ZoomManager.instance().addEventListener("ZoomChanged", this.zoomChanged, this);
  }
  createUI() {
    this.toolbar = new DeviceModeToolbar(this.model, this.showMediaInspectorSetting, this.showRulersSetting);
    this.contentElement.appendChild(this.toolbar.element());
    this.contentClip = this.contentElement.createChild("div", "device-mode-content-clip vbox");
    this.responsivePresetsContainer = this.contentClip.createChild("div", "device-mode-presets-container");
    this.responsivePresetsContainer.setAttribute("jslog", `${VisualLogging3.responsivePresets()}`);
    this.populatePresetsContainer();
    this.mediaInspectorContainer = this.contentClip.createChild("div", "device-mode-media-container");
    this.contentArea = this.contentClip.createChild("div", "device-mode-content-area");
    this.outlineImage = this.contentArea.createChild("img", "device-mode-outline-image hidden fill");
    this.outlineImage.addEventListener("load", this.onImageLoaded.bind(this, this.outlineImage, true), false);
    this.outlineImage.addEventListener("error", this.onImageLoaded.bind(this, this.outlineImage, false), false);
    this.screenArea = this.contentArea.createChild("div", "device-mode-screen-area");
    this.screenImage = this.screenArea.createChild("img", "device-mode-screen-image hidden");
    this.screenImage.addEventListener("load", this.onImageLoaded.bind(this, this.screenImage, true), false);
    this.screenImage.addEventListener("error", this.onImageLoaded.bind(this, this.screenImage, false), false);
    this.bottomRightResizerElement = this.screenArea.createChild("div", "device-mode-resizer device-mode-bottom-right-resizer");
    this.bottomRightResizerElement.createChild("div", "");
    this.createResizer(this.bottomRightResizerElement, 2, 1);
    this.bottomLeftResizerElement = this.screenArea.createChild("div", "device-mode-resizer device-mode-bottom-left-resizer");
    this.bottomLeftResizerElement.createChild("div", "");
    this.createResizer(this.bottomLeftResizerElement, -2, 1);
    this.rightResizerElement = this.screenArea.createChild("div", "device-mode-resizer device-mode-right-resizer");
    this.rightResizerElement.createChild("div", "");
    this.createResizer(this.rightResizerElement, 2, 0);
    this.leftResizerElement = this.screenArea.createChild("div", "device-mode-resizer device-mode-left-resizer");
    this.leftResizerElement.createChild("div", "");
    this.createResizer(this.leftResizerElement, -2, 0);
    this.bottomResizerElement = this.screenArea.createChild("div", "device-mode-resizer device-mode-bottom-resizer");
    this.bottomResizerElement.createChild("div", "");
    this.createResizer(this.bottomResizerElement, 0, 1);
    this.bottomResizerElement.addEventListener("dblclick", this.model.setHeight.bind(this.model, 0), false);
    UI3.Tooltip.Tooltip.install(this.bottomResizerElement, i18nString3(UIStrings3.doubleclickForFullHeight));
    this.pageArea = this.screenArea.createChild("div", "device-mode-page-area");
    this.pageArea.createChild("slot");
  }
  populatePresetsContainer() {
    const sizes = [320, 375, 425, 768, 1024, 1440, 2560];
    const titles = [
      i18nString3(UIStrings3.mobileS),
      i18nString3(UIStrings3.mobileM),
      i18nString3(UIStrings3.mobileL),
      i18nString3(UIStrings3.tablet),
      i18nString3(UIStrings3.laptop),
      i18nString3(UIStrings3.laptopL),
      "4K"
    ];
    this.presetBlocks = [];
    const inner = this.responsivePresetsContainer.createChild("div", "device-mode-presets-container-inner");
    for (let i = sizes.length - 1; i >= 0; --i) {
      const outer = inner.createChild("div", "fill device-mode-preset-bar-outer");
      const block = outer.createChild("div", "device-mode-preset-bar");
      block.createChild("span").textContent = titles[i] + " \u2013 " + sizes[i] + "px";
      block.setAttribute("jslog", `${VisualLogging3.action().track({ click: true }).context(`device-mode-preset-${sizes[i]}px`)}`);
      block.addEventListener("click", applySize.bind(this, sizes[i]), false);
      this.blockElementToWidth.set(block, sizes[i]);
      this.presetBlocks.push(block);
    }
    function applySize(width, e) {
      this.model.emulate(EmulationModel2.DeviceModeModel.Type.Responsive, null, null);
      this.model.setWidthAndScaleToFit(width);
      e.consume();
    }
  }
  createResizer(element, widthFactor, heightFactor) {
    const resizer = new UI3.ResizerWidget.ResizerWidget();
    element.setAttribute("jslog", `${VisualLogging3.slider("device-mode-resizer").track({ drag: true })}`);
    resizer.addElement(element);
    let cursor = widthFactor ? "ew-resize" : "ns-resize";
    if (widthFactor * heightFactor > 0) {
      cursor = "nwse-resize";
    }
    if (widthFactor * heightFactor < 0) {
      cursor = "nesw-resize";
    }
    resizer.setCursor(cursor);
    resizer.addEventListener("ResizeStart", this.onResizeStart, this);
    resizer.addEventListener("ResizeUpdateXY", this.onResizeUpdate.bind(this, widthFactor, heightFactor));
    resizer.addEventListener("ResizeEnd", this.onResizeEnd, this);
    return resizer;
  }
  onResizeStart() {
    this.slowPositionStart = null;
    const rect = this.model.screenRect();
    this.resizeStart = new Geometry.Size(rect.width, rect.height);
  }
  onResizeUpdate(widthFactor, heightFactor, event) {
    if (event.data.shiftKey !== Boolean(this.slowPositionStart)) {
      this.slowPositionStart = event.data.shiftKey ? { x: event.data.currentX, y: event.data.currentY } : null;
    }
    let cssOffsetX = event.data.currentX - event.data.startX;
    let cssOffsetY = event.data.currentY - event.data.startY;
    if (this.slowPositionStart) {
      cssOffsetX = (event.data.currentX - this.slowPositionStart.x) / 10 + this.slowPositionStart.x - event.data.startX;
      cssOffsetY = (event.data.currentY - this.slowPositionStart.y) / 10 + this.slowPositionStart.y - event.data.startY;
    }
    if (widthFactor && this.resizeStart) {
      const dipOffsetX = cssOffsetX * UI3.ZoomManager.ZoomManager.instance().zoomFactor();
      let newWidth = this.resizeStart.width + dipOffsetX * widthFactor;
      newWidth = Math.round(newWidth / this.model.scale());
      if (newWidth >= EmulationModel2.DeviceModeModel.MinDeviceSize && newWidth <= EmulationModel2.DeviceModeModel.MaxDeviceSize) {
        this.model.setWidth(newWidth);
      }
    }
    if (heightFactor && this.resizeStart) {
      const dipOffsetY = cssOffsetY * UI3.ZoomManager.ZoomManager.instance().zoomFactor();
      let newHeight = this.resizeStart.height + dipOffsetY * heightFactor;
      newHeight = Math.round(newHeight / this.model.scale());
      if (newHeight >= EmulationModel2.DeviceModeModel.MinDeviceSize && newHeight <= EmulationModel2.DeviceModeModel.MaxDeviceSize) {
        this.model.setHeight(newHeight);
      }
    }
  }
  exitHingeMode() {
    if (this.model) {
      this.model.exitHingeMode();
    }
  }
  onResizeEnd() {
    delete this.resizeStart;
    Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.ResizedViewInResponsiveMode);
  }
  updateUI() {
    function applyRect(element, rect) {
      element.style.left = rect.left + "px";
      element.style.top = rect.top + "px";
      element.style.width = rect.width + "px";
      element.style.height = rect.height + "px";
    }
    if (!this.isShowing()) {
      return;
    }
    const zoomFactor = UI3.ZoomManager.ZoomManager.instance().zoomFactor();
    let callDoResize = false;
    const showRulers = this.showRulersSetting.get() && this.model.type() !== EmulationModel2.DeviceModeModel.Type.None;
    let contentAreaResized = false;
    let updateRulers = false;
    const cssScreenRect = this.model.screenRect().scale(1 / zoomFactor);
    if (!this.cachedCssScreenRect || !cssScreenRect.isEqual(this.cachedCssScreenRect)) {
      applyRect(this.screenArea, cssScreenRect);
      updateRulers = true;
      callDoResize = true;
      this.cachedCssScreenRect = cssScreenRect;
    }
    const cssVisiblePageRect = this.model.visiblePageRect().scale(1 / zoomFactor);
    if (!this.cachedCssVisiblePageRect || !cssVisiblePageRect.isEqual(this.cachedCssVisiblePageRect)) {
      applyRect(this.pageArea, cssVisiblePageRect);
      callDoResize = true;
      this.cachedCssVisiblePageRect = cssVisiblePageRect;
    }
    const outlineRectFromModel = this.model.outlineRect();
    if (outlineRectFromModel) {
      const outlineRect = outlineRectFromModel.scale(1 / zoomFactor);
      if (!this.cachedOutlineRect || !outlineRect.isEqual(this.cachedOutlineRect)) {
        applyRect(this.outlineImage, outlineRect);
        callDoResize = true;
        this.cachedOutlineRect = outlineRect;
      }
    }
    this.contentClip.classList.toggle("device-mode-outline-visible", Boolean(this.model.outlineImage()));
    const resizable = this.model.type() === EmulationModel2.DeviceModeModel.Type.Responsive;
    if (resizable !== this.cachedResizable) {
      this.rightResizerElement.classList.toggle("hidden", !resizable);
      this.leftResizerElement.classList.toggle("hidden", !resizable);
      this.bottomResizerElement.classList.toggle("hidden", !resizable);
      this.bottomRightResizerElement.classList.toggle("hidden", !resizable);
      this.bottomLeftResizerElement.classList.toggle("hidden", !resizable);
      this.cachedResizable = resizable;
    }
    const mediaInspectorVisible = this.showMediaInspectorSetting.get() && this.model.type() !== EmulationModel2.DeviceModeModel.Type.None;
    if (mediaInspectorVisible !== this.cachedMediaInspectorVisible) {
      if (mediaInspectorVisible) {
        this.mediaInspector.show(this.mediaInspectorContainer);
      } else {
        this.mediaInspector.detach();
      }
      contentAreaResized = true;
      callDoResize = true;
      this.cachedMediaInspectorVisible = mediaInspectorVisible;
    }
    if (showRulers !== this.cachedShowRulers) {
      this.contentClip.classList.toggle("device-mode-rulers-visible", showRulers);
      if (showRulers) {
        this.topRuler.show(this.contentArea);
        this.leftRuler.show(this.contentArea);
      } else {
        this.topRuler.detach();
        this.leftRuler.detach();
      }
      contentAreaResized = true;
      callDoResize = true;
      this.cachedShowRulers = showRulers;
    }
    if (this.model.scale() !== this.cachedScale) {
      updateRulers = true;
      callDoResize = true;
      for (const block of this.presetBlocks) {
        const blockWidth = this.blockElementToWidth.get(block);
        if (!blockWidth) {
          throw new Error("Could not get width for block.");
        }
        block.style.width = blockWidth * this.model.scale() + "px";
      }
      this.cachedScale = this.model.scale();
    }
    this.toolbar.update();
    this.loadImage(this.screenImage, this.model.screenImage());
    this.loadImage(this.outlineImage, this.model.outlineImage());
    this.mediaInspector.setAxisTransform(this.model.scale());
    if (callDoResize) {
      this.doResize();
    }
    if (updateRulers) {
      this.topRuler.render(this.model.scale());
      this.leftRuler.render(this.model.scale());
      this.topRuler.element.positionAt(this.cachedCssScreenRect ? this.cachedCssScreenRect.left : 0, this.cachedCssScreenRect ? this.cachedCssScreenRect.top : 0);
      this.leftRuler.element.positionAt(this.cachedCssScreenRect ? this.cachedCssScreenRect.left : 0, this.cachedCssScreenRect ? this.cachedCssScreenRect.top : 0);
    }
    if (contentAreaResized) {
      this.contentAreaResized();
    }
  }
  loadImage(element, srcset) {
    if (element.getAttribute("srcset") === srcset) {
      return;
    }
    element.setAttribute("srcset", srcset);
    if (!srcset) {
      element.classList.toggle("hidden", true);
    }
  }
  onImageLoaded(element, success) {
    element.classList.toggle("hidden", !success);
  }
  setNonEmulatedAvailableSize(element) {
    if (this.model.type() !== EmulationModel2.DeviceModeModel.Type.None) {
      return;
    }
    const zoomFactor = UI3.ZoomManager.ZoomManager.instance().zoomFactor();
    const rect = element.getBoundingClientRect();
    const availableSize = new Geometry.Size(Math.max(rect.width * zoomFactor, 1), Math.max(rect.height * zoomFactor, 1));
    this.model.setAvailableSize(availableSize, availableSize);
  }
  contentAreaResized() {
    const zoomFactor = UI3.ZoomManager.ZoomManager.instance().zoomFactor();
    const rect = this.contentArea.getBoundingClientRect();
    const availableSize = new Geometry.Size(Math.max(rect.width * zoomFactor, 1), Math.max(rect.height * zoomFactor, 1));
    const preferredSize = new Geometry.Size(Math.max((rect.width - 2 * (this.handleWidth || 0)) * zoomFactor, 1), Math.max((rect.height - (this.handleHeight || 0)) * zoomFactor, 1));
    this.model.setAvailableSize(availableSize, preferredSize);
  }
  measureHandles() {
    const hidden = this.rightResizerElement.classList.contains("hidden");
    this.rightResizerElement.classList.toggle("hidden", false);
    this.bottomResizerElement.classList.toggle("hidden", false);
    this.handleWidth = this.rightResizerElement.offsetWidth;
    this.handleHeight = this.bottomResizerElement.offsetHeight;
    this.rightResizerElement.classList.toggle("hidden", hidden);
    this.bottomResizerElement.classList.toggle("hidden", hidden);
  }
  zoomChanged() {
    delete this.handleWidth;
    delete this.handleHeight;
    if (this.isShowing()) {
      this.measureHandles();
      this.contentAreaResized();
    }
  }
  onResize() {
    if (this.isShowing()) {
      this.contentAreaResized();
    }
  }
  wasShown() {
    super.wasShown();
    this.measureHandles();
    this.toolbar.restore();
  }
  willHide() {
    super.willHide();
    this.model.emulate(EmulationModel2.DeviceModeModel.Type.None, null, null);
  }
  async captureScreenshot() {
    const screenshot = await this.model.captureScreenshot(false);
    if (screenshot === null) {
      return;
    }
    const pageImage = new Image();
    pageImage.src = "data:image/png;base64," + screenshot;
    pageImage.onload = async () => {
      const scale = pageImage.naturalWidth / this.model.screenRect().width;
      const outlineRectFromModel = this.model.outlineRect();
      if (!outlineRectFromModel) {
        throw new Error("Unable to take screenshot: no outlineRect available.");
      }
      const outlineRect = outlineRectFromModel.scale(scale);
      const screenRect = this.model.screenRect().scale(scale);
      const visiblePageRect = this.model.visiblePageRect().scale(scale);
      const contentLeft = screenRect.left + visiblePageRect.left - outlineRect.left;
      const contentTop = screenRect.top + visiblePageRect.top - outlineRect.top;
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(outlineRect.width);
      canvas.height = Math.min(1 << 14, Math.floor(outlineRect.height));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        throw new Error("Could not get 2d context from canvas.");
      }
      ctx.imageSmoothingEnabled = false;
      if (this.model.outlineImage()) {
        await this.paintImage(ctx, this.model.outlineImage(), outlineRect.relativeTo(outlineRect));
      }
      if (this.model.screenImage()) {
        await this.paintImage(ctx, this.model.screenImage(), screenRect.relativeTo(outlineRect));
      }
      ctx.drawImage(pageImage, Math.floor(contentLeft), Math.floor(contentTop));
      this.saveScreenshot(canvas);
    };
  }
  async captureFullSizeScreenshot() {
    const screenshot = await this.model.captureScreenshot(true);
    if (screenshot === null) {
      return;
    }
    return this.saveScreenshotBase64(screenshot);
  }
  async captureAreaScreenshot(clip) {
    const screenshot = await this.model.captureScreenshot(false, clip);
    if (screenshot === null) {
      return;
    }
    return this.saveScreenshotBase64(screenshot);
  }
  saveScreenshotBase64(screenshot) {
    const pageImage = new Image();
    pageImage.src = "data:image/png;base64," + screenshot;
    pageImage.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pageImage.naturalWidth;
      canvas.height = Math.min(1 << 14, Math.floor(pageImage.naturalHeight));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        throw new Error("Could not get 2d context for base64 screenshot.");
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(pageImage, 0, 0);
      this.saveScreenshot(canvas);
    };
  }
  paintImage(ctx, src, rect) {
    return new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = "Anonymous";
      image.srcset = src;
      image.onerror = () => resolve();
      image.onload = () => {
        ctx.drawImage(image, rect.left, rect.top, rect.width, rect.height);
        resolve();
      };
    });
  }
  saveScreenshot(canvas) {
    const url = this.model.inspectedURL();
    let fileName = "";
    if (url) {
      const withoutFragment = Platform3.StringUtilities.removeURLFragment(url);
      fileName = Platform3.StringUtilities.trimURL(withoutFragment);
    }
    const device = this.model.device();
    if (device && this.model.type() === EmulationModel2.DeviceModeModel.Type.Device) {
      fileName += `(${device.title})`;
    }
    const link = document.createElement("a");
    link.download = fileName + ".png";
    canvas.toBlob((blob) => {
      if (blob === null) {
        return;
      }
      link.href = URL.createObjectURL(blob);
      link.click();
    });
  }
};
var Ruler = class extends UI3.Widget.VBox {
  #contentElement;
  horizontal;
  scale;
  count;
  throttler;
  applyCallback;
  renderedScale;
  renderedZoomFactor;
  constructor(horizontal, applyCallback) {
    super({ jslog: `${VisualLogging3.deviceModeRuler().track({ click: true })}` });
    this.element.classList.add("device-mode-ruler");
    this.#contentElement = this.element.createChild("div", "device-mode-ruler-content").createChild("div", "device-mode-ruler-inner");
    this.horizontal = horizontal;
    this.scale = 1;
    this.count = 0;
    this.throttler = new Common3.Throttler.Throttler(0);
    this.applyCallback = applyCallback;
  }
  render(scale) {
    this.scale = scale;
    void this.throttler.schedule(this.update.bind(this));
  }
  onResize() {
    void this.throttler.schedule(this.update.bind(this));
  }
  update() {
    const zoomFactor = UI3.ZoomManager.ZoomManager.instance().zoomFactor();
    const size = this.horizontal ? this.#contentElement.offsetWidth : this.#contentElement.offsetHeight;
    if (this.scale !== this.renderedScale || zoomFactor !== this.renderedZoomFactor) {
      this.#contentElement.removeChildren();
      this.count = 0;
      this.renderedScale = this.scale;
      this.renderedZoomFactor = zoomFactor;
    }
    const dipSize = size * zoomFactor / this.scale;
    const count = Math.ceil(dipSize / 5);
    let step = 1;
    if (this.scale < 0.8) {
      step = 2;
    }
    if (this.scale < 0.6) {
      step = 4;
    }
    if (this.scale < 0.4) {
      step = 8;
    }
    if (this.scale < 0.2) {
      step = 16;
    }
    if (this.scale < 0.1) {
      step = 32;
    }
    for (let i = count; i < this.count; i++) {
      if (!(i % step)) {
        const lastChild = this.#contentElement.lastChild;
        if (lastChild) {
          lastChild.remove();
        }
      }
    }
    for (let i = this.count; i < count; i++) {
      if (i % step) {
        continue;
      }
      const marker = this.#contentElement.createChild("div", "device-mode-ruler-marker");
      if (i) {
        if (this.horizontal) {
          marker.style.left = 5 * i * this.scale / zoomFactor + "px";
        } else {
          marker.style.top = 5 * i * this.scale / zoomFactor + "px";
        }
        if (!(i % 20)) {
          const text = marker.createChild("div", "device-mode-ruler-text");
          text.textContent = String(i * 5);
          text.addEventListener("click", this.onMarkerClick.bind(this, i * 5), false);
        }
      }
      if (!(i % 10)) {
        marker.classList.add("device-mode-ruler-marker-large");
      } else if (!(i % 5)) {
        marker.classList.add("device-mode-ruler-marker-medium");
      }
    }
    this.count = count;
  }
  onMarkerClick(size) {
    this.applyCallback.call(null, size);
  }
};

// gen/front_end/panels/emulation/DeviceModeWrapper.js
var deviceModeWrapperInstance;
var DeviceModeWrapper = class _DeviceModeWrapper extends UI4.Widget.VBox {
  inspectedPagePlaceholder;
  deviceModeView;
  toggleDeviceModeAction;
  showDeviceModeSetting;
  constructor(inspectedPagePlaceholder) {
    super();
    this.inspectedPagePlaceholder = inspectedPagePlaceholder;
    this.deviceModeView = null;
    this.toggleDeviceModeAction = UI4.ActionRegistry.ActionRegistry.instance().getAction("emulation.toggle-device-mode");
    const model = EmulationModel3.DeviceModeModel.DeviceModeModel.instance();
    this.showDeviceModeSetting = model.enabledSetting();
    this.showDeviceModeSetting.setRequiresUserAction(Boolean(Root.Runtime.Runtime.queryParam("hasOtherClients")));
    this.showDeviceModeSetting.addChangeListener(this.update.bind(this, false));
    SDK2.TargetManager.TargetManager.instance().addModelListener(SDK2.OverlayModel.OverlayModel, "ScreenshotRequested", this.screenshotRequestedFromOverlay, this);
    this.update(true);
  }
  static instance(opts = { forceNew: null, inspectedPagePlaceholder: null }) {
    const { forceNew, inspectedPagePlaceholder } = opts;
    if (!deviceModeWrapperInstance || forceNew) {
      if (!inspectedPagePlaceholder) {
        throw new Error(`Unable to create DeviceModeWrapper: inspectedPagePlaceholder must be provided: ${new Error().stack}`);
      }
      deviceModeWrapperInstance = new _DeviceModeWrapper(inspectedPagePlaceholder);
    }
    return deviceModeWrapperInstance;
  }
  toggleDeviceMode() {
    this.showDeviceModeSetting.set(!this.showDeviceModeSetting.get());
  }
  isDeviceModeOn() {
    return this.showDeviceModeSetting.get();
  }
  captureScreenshot(fullSize, clip) {
    if (!this.deviceModeView) {
      this.deviceModeView = new DeviceModeView();
    }
    this.deviceModeView.setNonEmulatedAvailableSize(this.inspectedPagePlaceholder.element);
    if (fullSize) {
      void this.deviceModeView.captureFullSizeScreenshot();
    } else if (clip) {
      void this.deviceModeView.captureAreaScreenshot(clip);
    } else {
      void this.deviceModeView.captureScreenshot();
    }
    return true;
  }
  screenshotRequestedFromOverlay(event) {
    const clip = event.data;
    this.captureScreenshot(false, clip);
  }
  update(force) {
    this.toggleDeviceModeAction.setToggled(this.showDeviceModeSetting.get());
    const shouldShow = this.showDeviceModeSetting.get();
    if (!force && shouldShow === this.deviceModeView?.isShowing()) {
      return;
    }
    if (shouldShow) {
      if (!this.deviceModeView) {
        this.deviceModeView = new DeviceModeView();
      }
      this.deviceModeView.show(this.element);
      this.inspectedPagePlaceholder.clearMinimumSize();
      this.inspectedPagePlaceholder.show(this.deviceModeView.element);
    } else {
      if (this.deviceModeView) {
        this.deviceModeView.exitHingeMode();
        this.deviceModeView.detach();
      }
      this.inspectedPagePlaceholder.restoreMinimumSize();
      this.inspectedPagePlaceholder.show(this.element);
    }
  }
};
var ActionDelegate = class {
  handleAction(context, actionId) {
    switch (actionId) {
      case "emulation.capture-screenshot":
        return DeviceModeWrapper.instance().captureScreenshot();
      case "emulation.capture-node-screenshot": {
        const node = context.flavor(SDK2.DOMModel.DOMNode);
        if (!node) {
          return true;
        }
        async function captureClip() {
          if (!node) {
            return;
          }
          const object = await node.resolveToObject();
          if (!object) {
            return;
          }
          const result = await object.callFunction(function() {
            function getFrameOffset(frame) {
              if (!frame) {
                return { x: 0, y: 0 };
              }
              const borderTop = frame.clientTop;
              const borderLeft = frame.clientLeft;
              const styles = window.getComputedStyle(frame);
              const paddingTop = parseFloat(styles.paddingTop);
              const paddingLeft = parseFloat(styles.paddingLeft);
              const rect2 = frame.getBoundingClientRect();
              const parentFrameOffset = getFrameOffset(frame.ownerDocument.defaultView?.frameElement ?? null);
              const scrollX2 = frame.ownerDocument.defaultView?.scrollX ?? 0;
              const scrollY2 = frame.ownerDocument.defaultView?.scrollY ?? 0;
              return {
                x: parentFrameOffset.x + rect2.left + borderLeft + paddingLeft + scrollX2,
                y: parentFrameOffset.y + rect2.top + borderTop + paddingTop + scrollY2
              };
            }
            const rect = this.getBoundingClientRect();
            const frameOffset = getFrameOffset(this.ownerDocument.defaultView?.frameElement ?? null);
            const scrollX = this.ownerDocument.defaultView?.scrollX ?? 0;
            const scrollY = this.ownerDocument.defaultView?.scrollY ?? 0;
            return JSON.stringify({
              x: rect.left + frameOffset.x + scrollX,
              y: rect.top + frameOffset.y + scrollY,
              width: rect.width,
              height: rect.height,
              scale: 1
            });
          });
          if (!result.object) {
            throw new Error("Clipping error: could not get object data.");
          }
          const clip = JSON.parse(result.object.value);
          const response = await node.domModel().target().pageAgent().invoke_getLayoutMetrics();
          const error = response.getError();
          const zoom = !error && response.visualViewport.zoom || 1;
          clip.x *= zoom;
          clip.y *= zoom;
          clip.width *= zoom;
          clip.height *= zoom;
          DeviceModeWrapper.instance().captureScreenshot(false, clip);
        }
        void captureClip();
        return true;
      }
      case "emulation.capture-full-height-screenshot":
        return DeviceModeWrapper.instance().captureScreenshot(true);
      case "emulation.toggle-device-mode":
        DeviceModeWrapper.instance().toggleDeviceMode();
        return true;
    }
    return false;
  }
};

// gen/front_end/panels/emulation/InspectedPagePlaceholder.js
var InspectedPagePlaceholder_exports = {};
__export(InspectedPagePlaceholder_exports, {
  InspectedPagePlaceholder: () => InspectedPagePlaceholder
});
import * as Common4 from "./../../core/common/common.js";
import * as UI5 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/emulation/inspectedPagePlaceholder.css.js
var inspectedPagePlaceholder_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  background-color: var(--sys-color-cdt-base-container);
}

/*# sourceURL=${import.meta.resolve("./inspectedPagePlaceholder.css")} */`;

// gen/front_end/panels/emulation/InspectedPagePlaceholder.js
var inspectedPagePlaceholderInstance;
var InspectedPagePlaceholder = class _InspectedPagePlaceholder extends Common4.ObjectWrapper.eventMixin(UI5.Widget.Widget) {
  updateId;
  constructor() {
    super({ useShadowDom: true });
    this.registerRequiredCSS(inspectedPagePlaceholder_css_default);
    UI5.ZoomManager.ZoomManager.instance().addEventListener("ZoomChanged", this.onResize, this);
    this.restoreMinimumSize();
  }
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!inspectedPagePlaceholderInstance || forceNew) {
      inspectedPagePlaceholderInstance = new _InspectedPagePlaceholder();
    }
    return inspectedPagePlaceholderInstance;
  }
  onResize() {
    if (this.updateId) {
      this.element.window().cancelAnimationFrame(this.updateId);
    }
    this.updateId = this.element.window().requestAnimationFrame(this.update.bind(this, false));
  }
  restoreMinimumSize() {
    this.setMinimumSize(150, 150);
  }
  clearMinimumSize() {
    this.setMinimumSize(1, 1);
  }
  dipPageRect() {
    const zoomFactor = UI5.ZoomManager.ZoomManager.instance().zoomFactor();
    const rect = this.element.getBoundingClientRect();
    const bodyRect = this.element.ownerDocument.body.getBoundingClientRect();
    const left = Math.max(rect.left * zoomFactor, bodyRect.left * zoomFactor);
    const top = Math.max(rect.top * zoomFactor, bodyRect.top * zoomFactor);
    const bottom = Math.min(rect.bottom * zoomFactor, bodyRect.bottom * zoomFactor);
    const right = Math.min(rect.right * zoomFactor, bodyRect.right * zoomFactor);
    return { x: left, y: top, width: right - left, height: bottom - top };
  }
  update(force) {
    delete this.updateId;
    const rect = this.dipPageRect();
    const bounds = {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      height: Math.max(1, Math.round(rect.height)),
      width: Math.max(1, Math.round(rect.width))
    };
    if (force) {
      --bounds.height;
      this.dispatchEventToListeners("Update", bounds);
      ++bounds.height;
    }
    this.dispatchEventToListeners("Update", bounds);
  }
};

// gen/front_end/panels/emulation/AdvancedApp.js
var appInstance;
var AdvancedApp = class _AdvancedApp {
  rootSplitWidget;
  deviceModeView;
  inspectedPagePlaceholder;
  toolboxWindow;
  toolboxRootView;
  changingDockSide;
  constructor() {
    UI6.DockController.DockController.instance().addEventListener("BeforeDockSideChanged", this.openToolboxWindow, this);
  }
  /**
   * Note: it's used by toolbox.ts without real type checks.
   */
  static instance() {
    if (!appInstance) {
      appInstance = new _AdvancedApp();
    }
    return appInstance;
  }
  presentUI(document2) {
    const rootView = new UI6.RootView.RootView();
    this.rootSplitWidget = new UI6.SplitWidget.SplitWidget(false, true, "inspector-view.split-view-state", 555, 300, true);
    this.rootSplitWidget.show(rootView.element);
    this.rootSplitWidget.setSidebarWidget(UI6.InspectorView.InspectorView.instance());
    this.rootSplitWidget.setDefaultFocusedChild(UI6.InspectorView.InspectorView.instance());
    UI6.InspectorView.InspectorView.instance().setOwnerSplit(this.rootSplitWidget);
    this.inspectedPagePlaceholder = InspectedPagePlaceholder.instance();
    this.inspectedPagePlaceholder.addEventListener("Update", this.onSetInspectedPageBounds.bind(this), this);
    this.deviceModeView = DeviceModeWrapper.instance({ inspectedPagePlaceholder: this.inspectedPagePlaceholder, forceNew: false });
    UI6.DockController.DockController.instance().addEventListener("BeforeDockSideChanged", this.onBeforeDockSideChange, this);
    UI6.DockController.DockController.instance().addEventListener("DockSideChanged", this.onDockSideChange, this);
    UI6.DockController.DockController.instance().addEventListener("AfterDockSideChanged", this.onAfterDockSideChange, this);
    this.onDockSideChange();
    console.timeStamp("AdvancedApp.attachToBody");
    rootView.attachToDocument(document2);
    rootView.focus();
    this.inspectedPagePlaceholder.update();
  }
  openToolboxWindow(event) {
    if (event.data.to !== "undocked") {
      return;
    }
    if (this.toolboxWindow) {
      return;
    }
    const url = window.location.href.replace("devtools_app.html", "device_mode_emulation_frame.html");
    this.toolboxWindow = window.open(url, void 0);
  }
  deviceModeEmulationFrameLoaded(toolboxDocument) {
    ThemeSupport.ThemeSupport.instance().addDocumentToTheme(toolboxDocument);
    UI6.UIUtils.initializeUIUtils(toolboxDocument);
    UI6.UIUtils.addPlatformClass(toolboxDocument.documentElement);
    UI6.UIUtils.installComponentRootStyles(toolboxDocument.body);
    UI6.ContextMenu.ContextMenu.installHandler(toolboxDocument);
    this.toolboxRootView = new UI6.RootView.RootView();
    this.toolboxRootView.attachToDocument(toolboxDocument);
    this.updateDeviceModeView();
  }
  updateDeviceModeView() {
    if (this.isDocked()) {
      this.rootSplitWidget.setMainWidget(this.deviceModeView);
    } else if (this.toolboxRootView) {
      this.deviceModeView.show(this.toolboxRootView.element);
    }
  }
  onBeforeDockSideChange(event) {
    if (event.data.to === "undocked" && this.toolboxRootView) {
      this.rootSplitWidget.hideSidebar();
      this.inspectedPagePlaceholder.update();
    }
    this.changingDockSide = true;
  }
  onDockSideChange(event) {
    this.updateDeviceModeView();
    const toDockSide = event ? event.data.to : UI6.DockController.DockController.instance().dockSide();
    if (toDockSide === void 0) {
      throw new Error("Got onDockSideChange event with unexpected undefined for dockSide()");
    }
    if (toDockSide === "undocked") {
      this.updateForUndocked();
    } else if (this.toolboxRootView && event && event.data.from === "undocked") {
      this.rootSplitWidget.hideSidebar();
    } else {
      this.updateForDocked(toDockSide);
    }
  }
  onAfterDockSideChange(event) {
    if (!this.changingDockSide) {
      return;
    }
    if (event.data.from && event.data.from === "undocked") {
      this.updateForDocked(event.data.to);
    }
    this.changingDockSide = false;
    this.inspectedPagePlaceholder.update();
  }
  updateForDocked(dockSide) {
    const resizerElement = this.rootSplitWidget.resizerElement();
    resizerElement.style.transform = dockSide === "right" ? "translateX(2px)" : dockSide === "left" ? "translateX(-2px)" : "";
    this.rootSplitWidget.setVertical(
      dockSide === "right" || dockSide === "left"
      /* UI.DockController.DockState.LEFT */
    );
    this.rootSplitWidget.setSecondIsSidebar(
      dockSide === "right" || dockSide === "bottom"
      /* UI.DockController.DockState.BOTTOM */
    );
    this.rootSplitWidget.toggleResizer(this.rootSplitWidget.resizerElement(), true);
    this.rootSplitWidget.toggleResizer(
      UI6.InspectorView.InspectorView.instance().topResizerElement(),
      dockSide === "bottom"
      /* UI.DockController.DockState.BOTTOM */
    );
    this.rootSplitWidget.showBoth();
  }
  updateForUndocked() {
    this.rootSplitWidget.toggleResizer(this.rootSplitWidget.resizerElement(), false);
    this.rootSplitWidget.toggleResizer(UI6.InspectorView.InspectorView.instance().topResizerElement(), false);
    this.rootSplitWidget.hideMain();
  }
  isDocked() {
    return UI6.DockController.DockController.instance().dockSide() !== "undocked";
  }
  onSetInspectedPageBounds(event) {
    if (this.changingDockSide) {
      return;
    }
    const window2 = this.inspectedPagePlaceholder.element.window();
    if (!window2.innerWidth || !window2.innerHeight) {
      return;
    }
    if (!this.inspectedPagePlaceholder.isShowing()) {
      return;
    }
    const bounds = event.data;
    console.timeStamp("AdvancedApp.setInspectedPageBounds");
    Host3.InspectorFrontendHost.InspectorFrontendHostInstance.setInspectedPageBounds(bounds);
  }
};
globalThis.Emulation = globalThis.Emulation || {};
globalThis.Emulation.AdvancedApp = AdvancedApp;
var advancedAppProviderInstance;
var AdvancedAppProvider = class _AdvancedAppProvider {
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!advancedAppProviderInstance || forceNew) {
      advancedAppProviderInstance = new _AdvancedAppProvider();
    }
    return advancedAppProviderInstance;
  }
  createApp() {
    return AdvancedApp.instance();
  }
};
export {
  AdvancedApp_exports as AdvancedApp,
  DeviceModeToolbar_exports as DeviceModeToolbar,
  DeviceModeView_exports as DeviceModeView,
  DeviceModeWrapper_exports as DeviceModeWrapper,
  InspectedPagePlaceholder_exports as InspectedPagePlaceholder,
  MediaQueryInspector_exports as MediaQueryInspector
};
//# sourceMappingURL=emulation.js.map

// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';

import * as EmulationComponents from './components/components.js';
import deviceModeToolbarStyles from './deviceModeToolbar.css.legacy.js';

const UIStrings = {
  /**
   * @description Title of the device dimensions selection iteam in the Device Mode Toolbar.
   * webpage in pixels.
   */
  dimensions: 'Dimensions',
  /**
   * @description Title of the width input textbox in the Device Mode Toolbar, for the width of the
   * webpage in pixels.
   */
  width: 'Width',
  /**
   * @description Title of the height input textbox in the Device Mode Toolbar, for the height of the
   * webpage in pixels. 'leave empty for full' is an instruction to the user - the webpage will be
   * full-height if this textbox is left empty.
   */
  heightLeaveEmptyForFull: 'Height (leave empty for full)',
  /**
   * @description Tooltip text for a drop-down menu where the user can select the zoom percentage of
   * the webpage preview.
   */
  zoom: 'Zoom',
  /**
   * @description Tooltip tip for a drop-down menu where the user can select the device pixel ratio
   * (the ratio between the physical pixels on a screen and CSS logical pixels) of the webpage
   * preview.
   */
  devicePixelRatio: 'Device pixel ratio',
  /**
   * @description Tooltip tip for a drop-down menu where the user can select the device type e.g.
   * Mobile, Desktop.
   */
  deviceType: 'Device type',
  /**
   * @description Tooltip text for a button to disable Experimental Web Platform Features when they are enabled.
   */
  experimentalWebPlatformFeature: '"`Experimental Web Platform Feature`" flag is enabled. Click to disable it.',
  /**
   * @description Tooltip text for a button to enable Experimental Web Platform Features when they are disabled.
   */
  experimentalWebPlatformFeatureFlag: '"`Experimental Web Platform Feature`" flag is disabled. Click to enable it.',
  /**
   * @description Tooltip text for a 'three dots' style menu button which shows an expanded set of options.
   */
  moreOptions: 'More options',
  /**
   * @description A context menu item in the Device Mode Toolbar. This is a command to resize the
   * webpage preview to fit the current window. The placeholder is the percentage of full-size that
   * will be displayed after fitting.
   * @example {30.0} PH1
   */
  fitToWindowF: 'Fit to window ({PH1}%)',
  /**
   * @description A checkbox setting that appears in the context menu for the zoom level, in the
   * Device Mode Toolbar.
   */
  autoadjustZoom: 'Auto-adjust zoom',
  /**
   * @description A menu item in the drop-down box that allows the user to select the device pixel
   * ratio. Labels the default value which varies between device types, represented by the
   * placeholder, which is a number. In the Device Mode Toolbar.
   * @example {4.3} PH1
   */
  defaultF: 'Default: {PH1}',
  /**
   * @description Command to hide the frame (like a picture frame) around the mobile device screen.
   */
  hideDeviceFrame: 'Hide device frame',
  /**
   * @description Command to show the frame (like a picture frame) around the mobile device screen.
   */
  showDeviceFrame: 'Show device frame',
  /**
   * @description Command to hide a display in the Device Mode Toolbar that shows the different media
   * queries for the device, above the device screen.
   * https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries
   */
  hideMediaQueries: 'Hide media queries',
  /**
   * @description Command to show a display in the Device Mode Toolbar that shows the different media
   * queries for the device, above the device screen.
   * https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Using_media_queries
   */
  showMediaQueries: 'Show media queries',
  /**
   * @description Command in the Device Mode Toolbar to hide a virtual ruler (for measuring),
   * displayed above and next to the device screen.
   */
  hideRulers: 'Hide rulers',
  /**
   * @description Command in the Device Mode Toolbar to show a virtual ruler (for measuring),
   * displayed above and next to the device screen.
   */
  showRulers: 'Show rulers',
  /**
   * @description Command in the Device Mode Toolbar to remove the drop-down menu from the toolbar
   * that lets the user override the device pixel ratio of the emulated device.
   */
  removeDevicePixelRatio: 'Remove device pixel ratio',
  /**
   * @description Command in the Device Mode Toolbar to add the drop-down menu to the toolbar
   * that lets the user override the device pixel ratio of the emulated device.
   */
  addDevicePixelRatio: 'Add device pixel ratio',
  /**
   * @description Command in the Device Mode Toolbar to add the drop-down menu to the toolbar
   * that lets the user set the device type (e.g. Desktop or Mobile).
   */
  removeDeviceType: 'Remove device type',
  /**
   * @description Command in the Device Mode Toolbar to add the drop-down menu to the toolbar
   * that lets the user add the device type (e.g. Desktop or Mobile).
   */
  addDeviceType: 'Add device type',
  /**
   * @description A context menu item in the Device Mode Toolbar that resets all settings back to
   * their default values.
   */
  resetToDefaults: 'Reset to defaults',
  /**
   * @description A menu command in the Device Mode Toolbar that closes DevTools.
   */
  closeDevtools: 'Close DevTools',
  /**
   * @description Title of the device selected in the Device Mode Toolbar. The 'response' device is
   * not a specific phone/tablet model but a virtual device that can change its height and width
   * dynamically by clicking and dragging the sides. 'Response' refers to response design:
   * https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design
   */
  responsive: 'Responsive',
  /**
   * @description A context menu item in the Device Mode Toolbar that takes the user to a new screen
   * where they can add/edit/remove custom devices.
   */
  edit: 'Edit…',
  /**
   * @description Text describing the current orientation of the phone/device (vs. landscape).
   */
  portrait: 'Portrait',
  /**
   * @description Text describing the current orientation of the phone/device (vs. portrait).
   */
  landscape: 'Landscape',
  /**
   * @description Title of button in the Device Mode Toolbar which rotates the device 90 degrees.
   */
  rotate: 'Rotate',
  /**
   * @description Fallback/default text used for the name of a custom device when no name has been
   * provided by the user.
   */
  none: 'None',
  /**
   * @description Tooltip of the rotate/screen orientation button.
   */
  screenOrientationOptions: 'Screen orientation options',
  /**
   * @description Tooltip for a button which turns on/off dual-screen mode, which emulates devices
   * like tablets which have two screens.
   */
  toggleDualscreenMode: 'Toggle dual-screen mode',
  /**
   * @description Tooltip tip for a drop-down menu where the user can select the device
   * posture e.g. Continuous, Folded.
   */
  devicePosture: 'Device posture',
};
const str_ = i18n.i18n.registerUIStrings('panels/emulation/DeviceModeToolbar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * Even though the emulation panel uses all UI elements, the tooltips are not supported.
 * That's because the emulation elements are rendered around the page context, rather
 * than in the DevTools panel itself. Therefore, we need to fall back to using the
 * built-in tooltip by setting the title attribute on the button's element.
 */
function setTitleForButton(button: UI.Toolbar.ToolbarButton|UI.Toolbar.ToolbarMenuButton, title: string): void {
  button.setTitle(title);
  button.element.title = title;
}

export class DeviceModeToolbar {
  private model: EmulationModel.DeviceModeModel.DeviceModeModel;
  private readonly showMediaInspectorSetting: Common.Settings.Setting<boolean>;
  private readonly showRulersSetting: Common.Settings.Setting<boolean>;
  private readonly deviceOutlineSetting: Common.Settings.Setting<boolean>;
  private readonly showDeviceScaleFactorSetting: Common.Settings.Setting<boolean>;
  private readonly showUserAgentTypeSetting: Common.Settings.Setting<boolean>;
  private autoAdjustScaleSetting: Common.Settings.Setting<boolean>;
  private readonly lastMode: Map<EmulationModel.EmulatedDevices.EmulatedDevice, EmulationModel.EmulatedDevices.Mode>;
  private readonly elementInternal: HTMLDivElement;
  private readonly emulatedDevicesList: EmulationModel.EmulatedDevices.EmulatedDevicesList;
  private readonly persistenceSetting: Common.Settings.Setting<{device: string, orientation: string, mode: string}>;
  private spanButton!: UI.Toolbar.ToolbarButton;
  private postureItem!: UI.Toolbar.ToolbarMenuButton;
  private modeButton!: UI.Toolbar.ToolbarButton;
  private widthInput: EmulationComponents.DeviceSizeInputElement.SizeInputElement;
  private heightInput: EmulationComponents.DeviceSizeInputElement.SizeInputElement;
  private deviceScaleItem!: UI.Toolbar.ToolbarMenuButton;
  private deviceSelectItem!: UI.Toolbar.ToolbarMenuButton;
  private scaleItem!: UI.Toolbar.ToolbarMenuButton;
  private uaItem!: UI.Toolbar.ToolbarMenuButton;
  private experimentalButton!: UI.Toolbar.ToolbarToggle|null;
  private cachedDeviceScale!: number|null;
  private cachedUaType!: string|null;
  private xItem?: UI.Toolbar.ToolbarItem;
  private throttlingConditionsItem?: UI.Toolbar.ToolbarMenuButton;
  private cachedModelType?: EmulationModel.DeviceModeModel.Type;
  private cachedScale?: number;
  private cachedModelDevice?: EmulationModel.EmulatedDevices.EmulatedDevice|null;
  private cachedModelMode?: EmulationModel.EmulatedDevices.Mode|null;

  constructor(
      model: EmulationModel.DeviceModeModel.DeviceModeModel,
      showMediaInspectorSetting: Common.Settings.Setting<boolean>,
      showRulersSetting: Common.Settings.Setting<boolean>) {
    this.model = model;
    this.showMediaInspectorSetting = showMediaInspectorSetting;
    this.showRulersSetting = showRulersSetting;

    this.deviceOutlineSetting = this.model.deviceOutlineSetting();
    this.showDeviceScaleFactorSetting =
        Common.Settings.Settings.instance().createSetting('emulation.show-device-scale-factor', false);
    this.showDeviceScaleFactorSetting.addChangeListener(this.updateDeviceScaleFactorVisibility, this);

    this.showUserAgentTypeSetting =
        Common.Settings.Settings.instance().createSetting('emulation.show-user-agent-type', false);
    this.showUserAgentTypeSetting.addChangeListener(this.updateUserAgentTypeVisibility, this);

    this.autoAdjustScaleSetting =
        Common.Settings.Settings.instance().createSetting('emulation.auto-adjust-scale', true);

    this.lastMode = new Map();

    this.elementInternal = document.createElement('div');
    this.elementInternal.classList.add('device-mode-toolbar');
    this.elementInternal.setAttribute('jslog', `${VisualLogging.toolbar('device-mode').track({resize: true})}`);

    const leftContainer = this.elementInternal.createChild('div', 'device-mode-toolbar-spacer');
    leftContainer.createChild('div', 'device-mode-toolbar-spacer');
    const leftToolbar = new UI.Toolbar.Toolbar('', leftContainer);
    this.fillLeftToolbar(leftToolbar);

    const mainToolbar = new UI.Toolbar.Toolbar('', this.elementInternal);
    mainToolbar.makeWrappable();
    this.widthInput = new EmulationComponents.DeviceSizeInputElement.SizeInputElement(
        i18nString(UIStrings.width), {jslogContext: 'width'});
    this.widthInput.addEventListener('sizechanged', ({size: width}) => {
      if (this.autoAdjustScaleSetting.get()) {
        this.model.setWidthAndScaleToFit(width);
      } else {
        this.model.setWidth(width);
      }
    });
    this.heightInput = new EmulationComponents.DeviceSizeInputElement.SizeInputElement(
        i18nString(UIStrings.heightLeaveEmptyForFull), {jslogContext: 'height'});
    this.heightInput.addEventListener('sizechanged', ({size: height}) => {
      if (this.autoAdjustScaleSetting.get()) {
        this.model.setHeightAndScaleToFit(height);
      } else {
        this.model.setHeight(height);
      }
    });
    this.fillMainToolbar(mainToolbar);

    const rightContainer = this.elementInternal.createChild('div', 'device-mode-toolbar-spacer');
    const rightToolbar = new UI.Toolbar.Toolbar('device-mode-toolbar-fixed-size', rightContainer);
    rightToolbar.makeWrappable();
    this.fillRightToolbar(rightToolbar);
    const modeToolbar = new UI.Toolbar.Toolbar('device-mode-toolbar-fixed-size', rightContainer);
    modeToolbar.makeWrappable();
    this.fillModeToolbar(modeToolbar);
    rightContainer.createChild('div', 'device-mode-toolbar-spacer');
    const optionsToolbar = new UI.Toolbar.Toolbar('device-mode-toolbar-options', rightContainer);
    optionsToolbar.makeWrappable();
    this.fillOptionsToolbar(optionsToolbar);

    this.emulatedDevicesList = EmulationModel.EmulatedDevices.EmulatedDevicesList.instance();
    this.emulatedDevicesList.addEventListener(
        EmulationModel.EmulatedDevices.Events.CUSTOM_DEVICES_UPDATED, this.deviceListChanged, this);
    this.emulatedDevicesList.addEventListener(
        EmulationModel.EmulatedDevices.Events.STANDARD_DEVICES_UPDATED, this.deviceListChanged, this);

    this.persistenceSetting = Common.Settings.Settings.instance().createSetting(
        'emulation.device-mode-value', {device: '', orientation: '', mode: ''});

    this.model.toolbarControlsEnabledSetting().addChangeListener(updateToolbarsEnabled);
    updateToolbarsEnabled();

    function updateToolbarsEnabled(): void {
      const enabled = model.toolbarControlsEnabledSetting().get();
      leftToolbar.setEnabled(enabled);
      mainToolbar.setEnabled(enabled);
      rightToolbar.setEnabled(enabled);
      modeToolbar.setEnabled(enabled);
      optionsToolbar.setEnabled(enabled);
    }
  }

  private createEmptyToolbarElement(): Element {
    const element = document.createElement('div');
    element.classList.add('device-mode-empty-toolbar-element');
    return element;
  }

  private fillLeftToolbar(toolbar: UI.Toolbar.Toolbar): void {
    toolbar.appendToolbarItem(this.wrapToolbarItem(this.createEmptyToolbarElement()));
    this.deviceSelectItem =
        new UI.Toolbar.ToolbarMenuButton(this.appendDeviceMenuItems.bind(this), undefined, undefined, 'device');
    this.deviceSelectItem.turnShrinkable();
    this.deviceSelectItem.setDarkText();
    toolbar.appendToolbarItem(this.deviceSelectItem);
  }

  private fillMainToolbar(toolbar: UI.Toolbar.Toolbar): void {
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarItem(this.widthInput));

    const xElement = document.createElement('div');
    xElement.classList.add('device-mode-x');
    xElement.textContent = '×';
    this.xItem = this.wrapToolbarItem(xElement);
    toolbar.appendToolbarItem(this.xItem);

    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarItem(this.heightInput));
  }

  private fillRightToolbar(toolbar: UI.Toolbar.Toolbar): void {
    toolbar.appendToolbarItem(this.wrapToolbarItem(this.createEmptyToolbarElement()));
    this.scaleItem =
        new UI.Toolbar.ToolbarMenuButton(this.appendScaleMenuItems.bind(this), undefined, undefined, 'scale');
    setTitleForButton(this.scaleItem, i18nString(UIStrings.zoom));
    this.scaleItem.setDarkText();
    toolbar.appendToolbarItem(this.scaleItem);

    toolbar.appendToolbarItem(this.wrapToolbarItem(this.createEmptyToolbarElement()));

    this.deviceScaleItem = new UI.Toolbar.ToolbarMenuButton(
        this.appendDeviceScaleMenuItems.bind(this), undefined, undefined, 'device-pixel-ratio');
    this.deviceScaleItem.setVisible(this.showDeviceScaleFactorSetting.get());
    setTitleForButton(this.deviceScaleItem, i18nString(UIStrings.devicePixelRatio));
    this.deviceScaleItem.setDarkText();
    toolbar.appendToolbarItem(this.deviceScaleItem);

    toolbar.appendToolbarItem(this.wrapToolbarItem(this.createEmptyToolbarElement()));
    this.uaItem =
        new UI.Toolbar.ToolbarMenuButton(this.appendUserAgentMenuItems.bind(this), undefined, undefined, 'device-type');
    this.uaItem.setVisible(this.showUserAgentTypeSetting.get());
    setTitleForButton(this.uaItem, i18nString(UIStrings.deviceType));
    this.uaItem.setDarkText();
    toolbar.appendToolbarItem(this.uaItem);

    this.throttlingConditionsItem =
        MobileThrottling.ThrottlingManager.throttlingManager().createMobileThrottlingButton();
    toolbar.appendToolbarItem(this.throttlingConditionsItem);
  }

  private fillModeToolbar(toolbar: UI.Toolbar.Toolbar): void {
    toolbar.appendToolbarItem(this.wrapToolbarItem(this.createEmptyToolbarElement()));
    this.modeButton = new UI.Toolbar.ToolbarButton('', 'screen-rotation', undefined, 'screen-rotation');
    this.modeButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.modeMenuClicked, this);
    toolbar.appendToolbarItem(this.modeButton);

    // Show dual screen toolbar.
    this.spanButton = new UI.Toolbar.ToolbarButton('', 'device-fold', undefined, 'device-fold');
    this.spanButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.spanClicked, this);
    toolbar.appendToolbarItem(this.spanButton);

    // Show posture toolbar menu for foldable devices.
    toolbar.appendToolbarItem(this.wrapToolbarItem(this.createEmptyToolbarElement()));
    this.postureItem = new UI.Toolbar.ToolbarMenuButton(
        this.appendDevicePostureItems.bind(this), undefined, undefined, 'device-posture');
    this.postureItem.setDarkText();
    setTitleForButton(this.postureItem, i18nString(UIStrings.devicePosture));
    toolbar.appendToolbarItem(this.postureItem);

    this.createExperimentalButton(toolbar);
  }

  private createExperimentalButton(toolbar: UI.Toolbar.Toolbar): void {
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSeparator(true));

    const title = (this.model.webPlatformExperimentalFeaturesEnabled()) ?
        i18nString(UIStrings.experimentalWebPlatformFeature) :
        i18nString(UIStrings.experimentalWebPlatformFeatureFlag);
    this.experimentalButton = new UI.Toolbar.ToolbarToggle(title, 'experiment-check');
    this.experimentalButton.setToggled(this.model.webPlatformExperimentalFeaturesEnabled());
    this.experimentalButton.setEnabled(true);
    this.experimentalButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.experimentalClicked, this);

    toolbar.appendToolbarItem(this.experimentalButton);
  }

  private experimentalClicked(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(
        'chrome://flags/#enable-experimental-web-platform-features' as Platform.DevToolsPath.UrlString);
  }

  private fillOptionsToolbar(toolbar: UI.Toolbar.Toolbar): void {
    toolbar.appendToolbarItem(this.wrapToolbarItem(this.createEmptyToolbarElement()));
    const moreOptionsButton = new UI.Toolbar.ToolbarMenuButton(
        this.appendOptionsMenuItems.bind(this), true, undefined, 'more-options', 'dots-vertical');
    moreOptionsButton.setTitle(i18nString(UIStrings.moreOptions));
    toolbar.appendToolbarItem(moreOptionsButton);
  }

  private appendDevicePostureItems(contextMenu: UI.ContextMenu.ContextMenu): void {
    for (const title of ['Continuous', 'Folded']) {
      contextMenu.defaultSection().appendCheckboxItem(
          title, this.spanClicked.bind(this),
          {checked: title === this.currentDevicePosture(), jslogContext: title.toLowerCase()});
    }
  }

  private currentDevicePosture(): string {
    const mode = this.model.mode();
    if (mode &&
        (mode.orientation === EmulationModel.EmulatedDevices.VerticalSpanned ||
         mode.orientation === EmulationModel.EmulatedDevices.HorizontalSpanned)) {
      return 'Folded';
    }
    return 'Continuous';
  }

  private appendScaleMenuItems(contextMenu: UI.ContextMenu.ContextMenu): void {
    if (this.model.type() === EmulationModel.DeviceModeModel.Type.Device) {
      contextMenu.footerSection().appendItem(
          i18nString(UIStrings.fitToWindowF, {PH1: this.getPrettyFitZoomPercentage()}),
          this.onScaleMenuChanged.bind(this, this.model.fitScale()), {jslogContext: 'fit-to-window'});
    }
    contextMenu.footerSection().appendCheckboxItem(
        i18nString(UIStrings.autoadjustZoom), this.onAutoAdjustScaleChanged.bind(this),
        {checked: this.autoAdjustScaleSetting.get(), jslogContext: 'auto-adjust-zoom'});
    const boundAppendScaleItem = appendScaleItem.bind(this);
    boundAppendScaleItem('50%', 0.5);
    boundAppendScaleItem('75%', 0.75);
    boundAppendScaleItem('100%', 1);
    boundAppendScaleItem('125%', 1.25);
    boundAppendScaleItem('150%', 1.5);
    boundAppendScaleItem('200%', 2);

    function appendScaleItem(this: DeviceModeToolbar, title: string, value: number): void {
      contextMenu.defaultSection().appendCheckboxItem(
          title, this.onScaleMenuChanged.bind(this, value),
          {checked: this.model.scaleSetting().get() === value, jslogContext: title});
    }
  }

  private onScaleMenuChanged(value: number): void {
    this.model.scaleSetting().set(value);
  }

  private onAutoAdjustScaleChanged(): void {
    this.autoAdjustScaleSetting.set(!this.autoAdjustScaleSetting.get());
  }

  private appendDeviceScaleMenuItems(contextMenu: UI.ContextMenu.ContextMenu): void {
    const deviceScaleFactorSetting = this.model.deviceScaleFactorSetting();
    const defaultValue = this.model.uaSetting().get() === EmulationModel.DeviceModeModel.UA.MOBILE ||
            this.model.uaSetting().get() === EmulationModel.DeviceModeModel.UA.MOBILE_NO_TOUCH ?
        EmulationModel.DeviceModeModel.defaultMobileScaleFactor :
        window.devicePixelRatio;
    appendDeviceScaleFactorItem(
        contextMenu.headerSection(), i18nString(UIStrings.defaultF, {PH1: defaultValue}), 0, 'dpr-default');
    appendDeviceScaleFactorItem(contextMenu.defaultSection(), '1', 1, 'dpr-1');
    appendDeviceScaleFactorItem(contextMenu.defaultSection(), '2', 2, 'dpr-2');
    appendDeviceScaleFactorItem(contextMenu.defaultSection(), '3', 3, 'dpr-3');

    function appendDeviceScaleFactorItem(
        section: UI.ContextMenu.Section, title: string, value: number, jslogContext: string): void {
      section.appendCheckboxItem(
          title, deviceScaleFactorSetting.set.bind(deviceScaleFactorSetting, value),
          {checked: deviceScaleFactorSetting.get() === value, jslogContext});
    }
  }

  private appendUserAgentMenuItems(contextMenu: UI.ContextMenu.ContextMenu): void {
    const uaSetting = this.model.uaSetting();
    appendUAItem(EmulationModel.DeviceModeModel.UA.MOBILE, EmulationModel.DeviceModeModel.UA.MOBILE);
    appendUAItem(EmulationModel.DeviceModeModel.UA.MOBILE_NO_TOUCH, EmulationModel.DeviceModeModel.UA.MOBILE_NO_TOUCH);
    appendUAItem(EmulationModel.DeviceModeModel.UA.DESKTOP, EmulationModel.DeviceModeModel.UA.DESKTOP);
    appendUAItem(EmulationModel.DeviceModeModel.UA.DESKTOP_TOUCH, EmulationModel.DeviceModeModel.UA.DESKTOP_TOUCH);

    function appendUAItem(title: string, value: EmulationModel.DeviceModeModel.UA): void {
      contextMenu.defaultSection().appendCheckboxItem(
          title, uaSetting.set.bind(uaSetting, value),
          {checked: uaSetting.get() === value, jslogContext: Platform.StringUtilities.toKebabCase(value)});
    }
  }

  private appendOptionsMenuItems(contextMenu: UI.ContextMenu.ContextMenu): void {
    const model = this.model;
    appendToggleItem(
        contextMenu.headerSection(), this.deviceOutlineSetting, i18nString(UIStrings.hideDeviceFrame),
        i18nString(UIStrings.showDeviceFrame), model.type() !== EmulationModel.DeviceModeModel.Type.Device,
        'device-frame');
    appendToggleItem(
        contextMenu.headerSection(), this.showMediaInspectorSetting, i18nString(UIStrings.hideMediaQueries),
        i18nString(UIStrings.showMediaQueries), undefined, 'media-queries');
    appendToggleItem(
        contextMenu.headerSection(), this.showRulersSetting, i18nString(UIStrings.hideRulers),
        i18nString(UIStrings.showRulers), undefined, 'rulers');
    appendToggleItem(
        contextMenu.defaultSection(), this.showDeviceScaleFactorSetting, i18nString(UIStrings.removeDevicePixelRatio),
        i18nString(UIStrings.addDevicePixelRatio), undefined, 'device-pixel-ratio');
    appendToggleItem(
        contextMenu.defaultSection(), this.showUserAgentTypeSetting, i18nString(UIStrings.removeDeviceType),
        i18nString(UIStrings.addDeviceType), undefined, 'device-type');
    contextMenu.appendItemsAtLocation('deviceModeMenu');
    contextMenu.footerSection().appendItem(
        i18nString(UIStrings.resetToDefaults), this.reset.bind(this), {jslogContext: 'reset-to-defaults'});
    contextMenu.footerSection().appendItem(
        i18nString(UIStrings.closeDevtools),
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.closeWindow.bind(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance),
        {jslogContext: 'close-dev-tools'});

    function appendToggleItem(
        section: UI.ContextMenu.Section, setting: Common.Settings.Setting<unknown>, title1: string, title2: string,
        disabled?: boolean, context?: string): void {
      if (typeof disabled === 'undefined') {
        disabled = model.type() === EmulationModel.DeviceModeModel.Type.None;
      }

      const isEnabled = setting.get();
      const jslogContext = `${context}-${isEnabled ? 'disable' : 'enable'}`;
      section.appendItem(
          isEnabled ? title1 : title2, setting.set.bind(setting, !setting.get()), {disabled, jslogContext});
    }
  }

  private reset(): void {
    this.deviceOutlineSetting.set(false);
    this.showDeviceScaleFactorSetting.set(false);
    this.showUserAgentTypeSetting.set(false);
    this.showMediaInspectorSetting.set(false);
    this.showRulersSetting.set(false);
    this.model.reset();
  }

  private wrapToolbarItem(element: Element): UI.Toolbar.ToolbarItem {
    const container = document.createElement('div');
    const shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(
        container, {cssFile: deviceModeToolbarStyles, delegatesFocus: undefined});
    shadowRoot.appendChild(element);
    return new UI.Toolbar.ToolbarItem(container);
  }

  private emulateDevice(device: EmulationModel.EmulatedDevices.EmulatedDevice): void {
    const scale = this.autoAdjustScaleSetting.get() ? undefined : this.model.scaleSetting().get();
    this.model.emulate(
        EmulationModel.DeviceModeModel.Type.Device, device, this.lastMode.get(device) || device.modes[0], scale);
  }

  private switchToResponsive(): void {
    this.model.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
  }

  private filterDevices(devices: EmulationModel.EmulatedDevices.EmulatedDevice[]):
      EmulationModel.EmulatedDevices.EmulatedDevice[] {
    devices = devices.filter(function(d) {
      return d.show();
    });
    devices.sort(EmulationModel.EmulatedDevices.EmulatedDevice.deviceComparator);
    return devices;
  }

  private standardDevices(): EmulationModel.EmulatedDevices.EmulatedDevice[] {
    return this.filterDevices(this.emulatedDevicesList.standard());
  }

  private customDevices(): EmulationModel.EmulatedDevices.EmulatedDevice[] {
    return this.filterDevices(this.emulatedDevicesList.custom());
  }

  private allDevices(): EmulationModel.EmulatedDevices.EmulatedDevice[] {
    return this.standardDevices().concat(this.customDevices());
  }

  private appendDeviceMenuItems(contextMenu: UI.ContextMenu.ContextMenu): void {
    contextMenu.headerSection().appendCheckboxItem(
        i18nString(UIStrings.responsive), this.switchToResponsive.bind(this),
        {checked: this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive, jslogContext: 'responsive'});
    appendGroup.call(this, this.standardDevices());
    appendGroup.call(this, this.customDevices());
    contextMenu.footerSection().appendItem(
        i18nString(UIStrings.edit), this.emulatedDevicesList.revealCustomSetting.bind(this.emulatedDevicesList),
        {jslogContext: 'edit'});

    function appendGroup(this: DeviceModeToolbar, devices: EmulationModel.EmulatedDevices.EmulatedDevice[]): void {
      if (!devices.length) {
        return;
      }
      const section = contextMenu.section();
      for (const device of devices) {
        section.appendCheckboxItem(device.title, this.emulateDevice.bind(this, device), {
          checked: this.model.device() === device,
          jslogContext: Platform.StringUtilities.toKebabCase(device.title),
        });
      }
    }
  }

  private deviceListChanged(): void {
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

  private updateDeviceScaleFactorVisibility(): void {
    if (this.deviceScaleItem) {
      this.deviceScaleItem.setVisible(this.showDeviceScaleFactorSetting.get());
    }
  }

  private updateUserAgentTypeVisibility(): void {
    if (this.uaItem) {
      this.uaItem.setVisible(this.showUserAgentTypeSetting.get());
    }
  }

  private spanClicked(): void {
    const device = this.model.device();

    if (!device || (!device.isDualScreen && !device.isFoldableScreen)) {
      return;
    }

    const scale = this.autoAdjustScaleSetting.get() ? undefined : this.model.scaleSetting().get();
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

  private modeMenuClicked(event: {
    data: Event,
  }): void {
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

    if ((device.isDualScreen || device.isFoldableScreen || device.modes.length === 2) &&
        device.modes[0].orientation !== device.modes[1].orientation) {
      const scale = autoAdjustScaleSetting.get() ? undefined : model.scaleSetting().get();
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
      useSoftMenu: false,
      x: this.modeButton.element.getBoundingClientRect().left,
      y: this.modeButton.element.getBoundingClientRect().top + (this.modeButton.element as HTMLElement).offsetHeight,
    });
    addOrientation(EmulationModel.EmulatedDevices.Vertical, i18nString(UIStrings.portrait));
    addOrientation(EmulationModel.EmulatedDevices.Horizontal, i18nString(UIStrings.landscape));
    void contextMenu.show();

    function addOrientation(orientation: string, title: string): void {
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
          addMode(modes[index], title + ' \u2013 ' + modes[index].title);
        }
      }
    }

    function addMode(mode: EmulationModel.EmulatedDevices.Mode, title: string): void {
      contextMenu.defaultSection().appendCheckboxItem(
          title, applyMode.bind(null, mode), {checked: model.mode() === mode, jslogContext: 'device-mode'});
    }

    function applyMode(mode: EmulationModel.EmulatedDevices.Mode): void {
      const scale = autoAdjustScaleSetting.get() ? undefined : model.scaleSetting().get();
      model.emulate(model.type(), model.device(), mode, scale);
    }
  }

  private getPrettyFitZoomPercentage(): string {
    return `${(this.model.fitScale() * 100).toFixed(0)}`;
  }

  private getPrettyZoomPercentage(): string {
    return `${(this.model.scale() * 100).toFixed(0)}`;
  }

  element(): Element {
    return this.elementInternal;
  }

  update(): void {
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
    this.heightInput.size =
        this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive && this.model.isFullHeight() ?
        '' :
        String(size.height);
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

    let deviceItemTitle: string = i18nString(UIStrings.none);
    if (this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive) {
      deviceItemTitle = i18nString(UIStrings.responsive);
    }
    const device = this.model.device();
    if (this.model.type() === EmulationModel.DeviceModeModel.Type.Device && device) {
      deviceItemTitle = device.title;
    }
    this.deviceSelectItem.setText(`${i18nString(UIStrings.dimensions)}: ${deviceItemTitle}`);

    if (this.model.device() !== this.cachedModelDevice) {
      const device = this.model.device();
      if (device) {
        const modeCount = device ? device.modes.length : 0;
        this.modeButton.setEnabled(modeCount >= 2);
        setTitleForButton(
            this.modeButton,
            modeCount === 2 ? i18nString(UIStrings.rotate) : i18nString(UIStrings.screenOrientationOptions));
      }
      this.cachedModelDevice = device;
    }

    if (this.experimentalButton) {
      const device = this.model.device();
      if (device && (device.isDualScreen || device.isFoldableScreen)) {
        if (device.isDualScreen) {
          this.spanButton.setVisible(true);
          this.postureItem.setVisible(false);
        } else if (device.isFoldableScreen) {
          this.spanButton.setVisible(false);
          this.postureItem.setVisible(true);
          this.postureItem.setText(this.currentDevicePosture());
        }
        this.experimentalButton.setVisible(true);
      } else {
        this.spanButton.setVisible(false);
        this.postureItem.setVisible(false);
        this.experimentalButton.setVisible(false);
      }
      setTitleForButton(this.spanButton, i18nString(UIStrings.toggleDualscreenMode));
    }

    if (this.model.type() === EmulationModel.DeviceModeModel.Type.Device) {
      this.lastMode.set(
          (this.model.device() as EmulationModel.EmulatedDevices.EmulatedDevice),
          (this.model.mode() as EmulationModel.EmulatedDevices.Mode));
    }

    if (this.model.mode() !== this.cachedModelMode && this.model.type() !== EmulationModel.DeviceModeModel.Type.None) {
      this.cachedModelMode = this.model.mode();
      const value = this.persistenceSetting.get();
      const device = this.model.device();
      if (device) {
        value.device = device.title;
        const mode = this.model.mode();
        value.orientation = mode ? mode.orientation : '';
        value.mode = mode ? mode.title : '';
      } else {
        value.device = '';
        value.orientation = '';
        value.mode = '';
      }
      this.persistenceSetting.set(value);
    }
  }

  restore(): void {
    for (const device of this.allDevices()) {
      if (device.title === this.persistenceSetting.get().device) {
        for (const mode of device.modes) {
          if (mode.orientation === this.persistenceSetting.get().orientation &&
              mode.title === this.persistenceSetting.get().mode) {
            this.lastMode.set(device, mode);
            this.emulateDevice(device);
            return;
          }
        }
      }
    }

    this.model.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
  }
}

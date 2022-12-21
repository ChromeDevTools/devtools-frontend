// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';

import {
  Horizontal,
  HorizontalSpanned,
  Vertical,
  VerticalSpanned,
  type EmulatedDevice,
  type Mode,
} from './EmulatedDevices.js';

const UIStrings = {
  /**
   * @description Error message shown in the Devices settings pane when the user enters an invalid
   * width for a custom device.
   */
  widthMustBeANumber: 'Width must be a number.',
  /**
   * @description Error message shown in the Devices settings pane when the user has entered a width
   * for a custom device that is too large.
   * @example {9999} PH1
   */
  widthMustBeLessThanOrEqualToS: 'Width must be less than or equal to {PH1}.',
  /**
   * @description Error message shown in the Devices settings pane when the user has entered a width
   * for a custom device that is too small.
   * @example {50} PH1
   */
  widthMustBeGreaterThanOrEqualToS: 'Width must be greater than or equal to {PH1}.',
  /**
   * @description Error message shown in the Devices settings pane when the user enters an invalid
   * height for a custom device.
   */
  heightMustBeANumber: 'Height must be a number.',
  /**
   * @description Error message shown in the Devices settings pane when the user has entered a height
   * for a custom device that is too large.
   * @example {9999} PH1
   */
  heightMustBeLessThanOrEqualToS: 'Height must be less than or equal to {PH1}.',
  /**
   * @description Error message shown in the Devices settings pane when the user has entered a height
   * for a custom device that is too small.
   * @example {50} PH1
   */
  heightMustBeGreaterThanOrEqualTo: 'Height must be greater than or equal to {PH1}.',
  /**
   * @description Error message shown in the Devices settings pane when the user enters an invalid
   * device pixel ratio for a custom device.
   */
  devicePixelRatioMustBeANumberOr: 'Device pixel ratio must be a number or blank.',
  /**
   * @description Error message shown in the Devices settings pane when the user enters a device
   * pixel ratio for a custom device that is too large.
   * @example {10} PH1
   */
  devicePixelRatioMustBeLessThanOr: 'Device pixel ratio must be less than or equal to {PH1}.',
  /**
   * @description Error message shown in the Devices settings pane when the user enters a device
   * pixel ratio for a custom device that is too small.
   * @example {0} PH1
   */
  devicePixelRatioMustBeGreater: 'Device pixel ratio must be greater than or equal to {PH1}.',
};
const str_ = i18n.i18n.registerUIStrings('models/emulation/DeviceModeModel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let deviceModeModelInstance: DeviceModeModel|null;

export class DeviceModeModel extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    SDK.TargetManager.SDKModelObserver<SDK.EmulationModel.EmulationModel> {
  #screenRectInternal: Rect;
  #visiblePageRectInternal: Rect;
  #availableSize: UI.Geometry.Size;
  #preferredSize: UI.Geometry.Size;
  #initialized: boolean;
  #appliedDeviceSizeInternal: UI.Geometry.Size;
  #appliedDeviceScaleFactorInternal: number;
  #appliedUserAgentTypeInternal: UA;
  readonly #experimentDualScreenSupport: boolean;
  readonly #webPlatformExperimentalFeaturesEnabledInternal: boolean;
  readonly #scaleSettingInternal: Common.Settings.Setting<number>;
  #scaleInternal: number;
  #widthSetting: Common.Settings.Setting<number>;
  #heightSetting: Common.Settings.Setting<number>;
  #uaSettingInternal: Common.Settings.Setting<UA>;
  readonly #deviceScaleFactorSettingInternal: Common.Settings.Setting<number>;
  readonly #deviceOutlineSettingInternal: Common.Settings.Setting<boolean>;
  readonly #toolbarControlsEnabledSettingInternal: Common.Settings.Setting<boolean>;
  #typeInternal: Type;
  #deviceInternal: EmulatedDevice|null;
  #modeInternal: Mode|null;
  #fitScaleInternal: number;
  #touchEnabled: boolean;
  #touchMobile: boolean;
  #emulationModel: SDK.EmulationModel.EmulationModel|null;
  #onModelAvailable: (() => void)|null;
  #outlineRectInternal?: Rect;

  private constructor() {
    super();
    this.#screenRectInternal = new Rect(0, 0, 1, 1);
    this.#visiblePageRectInternal = new Rect(0, 0, 1, 1);
    this.#availableSize = new UI.Geometry.Size(1, 1);
    this.#preferredSize = new UI.Geometry.Size(1, 1);
    this.#initialized = false;
    this.#appliedDeviceSizeInternal = new UI.Geometry.Size(1, 1);
    this.#appliedDeviceScaleFactorInternal = window.devicePixelRatio;
    this.#appliedUserAgentTypeInternal = UA.Desktop;
    this.#experimentDualScreenSupport = Root.Runtime.experiments.isEnabled('dualScreenSupport');
    this.#webPlatformExperimentalFeaturesEnabledInternal =
        window.visualViewport ? 'segments' in window.visualViewport : false;

    this.#scaleSettingInternal = Common.Settings.Settings.instance().createSetting('emulation.deviceScale', 1);
    // We've used to allow zero before.
    if (!this.#scaleSettingInternal.get()) {
      this.#scaleSettingInternal.set(1);
    }
    this.#scaleSettingInternal.addChangeListener(this.scaleSettingChanged, this);
    this.#scaleInternal = 1;

    this.#widthSetting = Common.Settings.Settings.instance().createSetting('emulation.deviceWidth', 400);
    if (this.#widthSetting.get() < MinDeviceSize) {
      this.#widthSetting.set(MinDeviceSize);
    }
    if (this.#widthSetting.get() > MaxDeviceSize) {
      this.#widthSetting.set(MaxDeviceSize);
    }
    this.#widthSetting.addChangeListener(this.widthSettingChanged, this);

    this.#heightSetting = Common.Settings.Settings.instance().createSetting('emulation.deviceHeight', 0);
    if (this.#heightSetting.get() && this.#heightSetting.get() < MinDeviceSize) {
      this.#heightSetting.set(MinDeviceSize);
    }
    if (this.#heightSetting.get() > MaxDeviceSize) {
      this.#heightSetting.set(MaxDeviceSize);
    }
    this.#heightSetting.addChangeListener(this.heightSettingChanged, this);

    this.#uaSettingInternal = Common.Settings.Settings.instance().createSetting('emulation.deviceUA', UA.Mobile);
    this.#uaSettingInternal.addChangeListener(this.uaSettingChanged, this);
    this.#deviceScaleFactorSettingInternal =
        Common.Settings.Settings.instance().createSetting('emulation.deviceScaleFactor', 0);
    this.#deviceScaleFactorSettingInternal.addChangeListener(this.deviceScaleFactorSettingChanged, this);

    this.#deviceOutlineSettingInternal =
        Common.Settings.Settings.instance().moduleSetting('emulation.showDeviceOutline');
    this.#deviceOutlineSettingInternal.addChangeListener(this.deviceOutlineSettingChanged, this);

    this.#toolbarControlsEnabledSettingInternal = Common.Settings.Settings.instance().createSetting(
        'emulation.toolbarControlsEnabled', true, Common.Settings.SettingStorageType.Session);

    this.#typeInternal = Type.None;
    this.#deviceInternal = null;
    this.#modeInternal = null;
    this.#fitScaleInternal = 1;
    this.#touchEnabled = false;
    this.#touchMobile = false;

    this.#emulationModel = null;
    this.#onModelAvailable = null;
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.EmulationModel.EmulationModel, this);
  }

  static instance(opts?: {forceNew: boolean}): DeviceModeModel {
    if (!deviceModeModelInstance || opts?.forceNew) {
      deviceModeModelInstance = new DeviceModeModel();
    }

    return deviceModeModelInstance;
  }

  static widthValidator(value: string): {
    valid: boolean,
    errorMessage: (string|undefined),
  } {
    let valid = false;
    let errorMessage;

    if (!/^[\d]+$/.test(value)) {
      errorMessage = i18nString(UIStrings.widthMustBeANumber);
    } else if (Number(value) > MaxDeviceSize) {
      errorMessage = i18nString(UIStrings.widthMustBeLessThanOrEqualToS, {PH1: MaxDeviceSize});
    } else if (Number(value) < MinDeviceSize) {
      errorMessage = i18nString(UIStrings.widthMustBeGreaterThanOrEqualToS, {PH1: MinDeviceSize});
    } else {
      valid = true;
    }

    return {valid, errorMessage};
  }

  static heightValidator(value: string): {
    valid: boolean,
    errorMessage: (string|undefined),
  } {
    let valid = false;
    let errorMessage;

    if (!/^[\d]+$/.test(value)) {
      errorMessage = i18nString(UIStrings.heightMustBeANumber);
    } else if (Number(value) > MaxDeviceSize) {
      errorMessage = i18nString(UIStrings.heightMustBeLessThanOrEqualToS, {PH1: MaxDeviceSize});
    } else if (Number(value) < MinDeviceSize) {
      errorMessage = i18nString(UIStrings.heightMustBeGreaterThanOrEqualTo, {PH1: MinDeviceSize});
    } else {
      valid = true;
    }

    return {valid, errorMessage};
  }

  static scaleValidator(value: string): {
    valid: boolean,
    errorMessage: (string|undefined),
  } {
    let valid = false;
    let errorMessage;
    const parsedValue = Number(value.trim());

    if (!value) {
      valid = true;
    } else if (Number.isNaN(parsedValue)) {
      errorMessage = i18nString(UIStrings.devicePixelRatioMustBeANumberOr);
    } else if (Number(value) > MaxDeviceScaleFactor) {
      errorMessage = i18nString(UIStrings.devicePixelRatioMustBeLessThanOr, {PH1: MaxDeviceScaleFactor});
    } else if (Number(value) < MinDeviceScaleFactor) {
      errorMessage = i18nString(UIStrings.devicePixelRatioMustBeGreater, {PH1: MinDeviceScaleFactor});
    } else {
      valid = true;
    }

    return {valid, errorMessage};
  }

  get scaleSettingInternal(): Common.Settings.Setting<number> {
    return this.#scaleSettingInternal;
  }

  setAvailableSize(availableSize: UI.Geometry.Size, preferredSize: UI.Geometry.Size): void {
    this.#availableSize = availableSize;
    this.#preferredSize = preferredSize;
    this.#initialized = true;
    this.calculateAndEmulate(false);
  }

  emulate(type: Type, device: EmulatedDevice|null, mode: Mode|null, scale?: number): void {
    const resetPageScaleFactor =
        this.#typeInternal !== type || this.#deviceInternal !== device || this.#modeInternal !== mode;
    this.#typeInternal = type;

    if (type === Type.Device && device && mode) {
      console.assert(Boolean(device) && Boolean(mode), 'Must pass device and mode for device emulation');
      this.#modeInternal = mode;
      this.#deviceInternal = device;
      if (this.#initialized) {
        const orientation = device.orientationByName(mode.orientation);
        this.#scaleSettingInternal.set(
            scale ||
            this.calculateFitScale(orientation.width, orientation.height, this.currentOutline(), this.currentInsets()));
      }
    } else {
      this.#deviceInternal = null;
      this.#modeInternal = null;
    }

    if (type !== Type.None) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.DeviceModeEnabled);
    }
    this.calculateAndEmulate(resetPageScaleFactor);
  }

  setWidth(width: number): void {
    const max = Math.min(MaxDeviceSize, this.preferredScaledWidth());
    width = Math.max(Math.min(width, max), 1);
    this.#widthSetting.set(width);
  }

  setWidthAndScaleToFit(width: number): void {
    width = Math.max(Math.min(width, MaxDeviceSize), 1);
    this.#scaleSettingInternal.set(this.calculateFitScale(width, this.#heightSetting.get()));
    this.#widthSetting.set(width);
  }

  setHeight(height: number): void {
    const max = Math.min(MaxDeviceSize, this.preferredScaledHeight());
    height = Math.max(Math.min(height, max), 0);
    if (height === this.preferredScaledHeight()) {
      height = 0;
    }
    this.#heightSetting.set(height);
  }

  setHeightAndScaleToFit(height: number): void {
    height = Math.max(Math.min(height, MaxDeviceSize), 0);
    this.#scaleSettingInternal.set(this.calculateFitScale(this.#widthSetting.get(), height));
    this.#heightSetting.set(height);
  }

  setScale(scale: number): void {
    this.#scaleSettingInternal.set(scale);
  }

  device(): EmulatedDevice|null {
    return this.#deviceInternal;
  }

  mode(): Mode|null {
    return this.#modeInternal;
  }

  type(): Type {
    return this.#typeInternal;
  }

  screenImage(): string {
    return (this.#deviceInternal && this.#modeInternal) ? this.#deviceInternal.modeImage(this.#modeInternal) : '';
  }

  outlineImage(): string {
    return (this.#deviceInternal && this.#modeInternal && this.#deviceOutlineSettingInternal.get()) ?
        this.#deviceInternal.outlineImage(this.#modeInternal) :
        '';
  }

  outlineRect(): Rect|null {
    return this.#outlineRectInternal || null;
  }

  screenRect(): Rect {
    return this.#screenRectInternal;
  }

  visiblePageRect(): Rect {
    return this.#visiblePageRectInternal;
  }

  scale(): number {
    return this.#scaleInternal;
  }

  fitScale(): number {
    return this.#fitScaleInternal;
  }

  appliedDeviceSize(): UI.Geometry.Size {
    return this.#appliedDeviceSizeInternal;
  }

  appliedDeviceScaleFactor(): number {
    return this.#appliedDeviceScaleFactorInternal;
  }

  appliedUserAgentType(): UA {
    return this.#appliedUserAgentTypeInternal;
  }

  isFullHeight(): boolean {
    return !this.#heightSetting.get();
  }

  private isMobile(): boolean {
    switch (this.#typeInternal) {
      case Type.Device:
        return this.#deviceInternal ? this.#deviceInternal.mobile() : false;
      case Type.None:
        return false;
      case Type.Responsive:
        return this.#uaSettingInternal.get() === UA.Mobile || this.#uaSettingInternal.get() === UA.MobileNoTouch;
    }
    return false;
  }

  enabledSetting(): Common.Settings.Setting<boolean> {
    return Common.Settings.Settings.instance().createSetting('emulation.showDeviceMode', false);
  }

  scaleSetting(): Common.Settings.Setting<number> {
    return this.#scaleSettingInternal;
  }

  uaSetting(): Common.Settings.Setting<UA> {
    return this.#uaSettingInternal;
  }

  deviceScaleFactorSetting(): Common.Settings.Setting<number> {
    return this.#deviceScaleFactorSettingInternal;
  }

  deviceOutlineSetting(): Common.Settings.Setting<boolean> {
    return this.#deviceOutlineSettingInternal;
  }

  toolbarControlsEnabledSetting(): Common.Settings.Setting<boolean> {
    return this.#toolbarControlsEnabledSettingInternal;
  }

  reset(): void {
    this.#deviceScaleFactorSettingInternal.set(0);
    this.#scaleSettingInternal.set(1);
    this.setWidth(400);
    this.setHeight(0);
    this.#uaSettingInternal.set(UA.Mobile);
  }

  modelAdded(emulationModel: SDK.EmulationModel.EmulationModel): void {
    if (emulationModel.target() === SDK.TargetManager.TargetManager.instance().mainFrameTarget() &&
        emulationModel.supportsDeviceEmulation()) {
      this.#emulationModel = emulationModel;
      if (this.#onModelAvailable) {
        const callback = this.#onModelAvailable;
        this.#onModelAvailable = null;
        callback();
      }
      const resourceTreeModel = emulationModel.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
      if (resourceTreeModel) {
        resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameResized, this.onFrameChange, this);
        resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameNavigated, this.onFrameChange, this);
      }
    } else {
      void emulationModel.emulateTouch(this.#touchEnabled, this.#touchMobile);
    }
  }

  modelRemoved(emulationModel: SDK.EmulationModel.EmulationModel): void {
    if (this.#emulationModel === emulationModel) {
      this.#emulationModel = null;
    }
  }

  inspectedURL(): string|null {
    return this.#emulationModel ? this.#emulationModel.target().inspectedURL() : null;
  }

  private onFrameChange(): void {
    const overlayModel = this.#emulationModel ? this.#emulationModel.overlayModel() : null;
    if (!overlayModel) {
      return;
    }

    this.showHingeIfApplicable(overlayModel);
  }

  private scaleSettingChanged(): void {
    this.calculateAndEmulate(false);
  }

  private widthSettingChanged(): void {
    this.calculateAndEmulate(false);
  }

  private heightSettingChanged(): void {
    this.calculateAndEmulate(false);
  }

  private uaSettingChanged(): void {
    this.calculateAndEmulate(true);
  }

  private deviceScaleFactorSettingChanged(): void {
    this.calculateAndEmulate(false);
  }

  private deviceOutlineSettingChanged(): void {
    this.calculateAndEmulate(false);
  }

  private preferredScaledWidth(): number {
    return Math.floor(this.#preferredSize.width / (this.#scaleSettingInternal.get() || 1));
  }

  private preferredScaledHeight(): number {
    return Math.floor(this.#preferredSize.height / (this.#scaleSettingInternal.get() || 1));
  }

  private currentOutline(): Insets {
    let outline: Insets = new Insets(0, 0, 0, 0);
    if (this.#typeInternal !== Type.Device || !this.#deviceInternal || !this.#modeInternal) {
      return outline;
    }
    const orientation = this.#deviceInternal.orientationByName(this.#modeInternal.orientation);
    if (this.#deviceOutlineSettingInternal.get()) {
      outline = orientation.outlineInsets || outline;
    }
    return outline;
  }

  private currentInsets(): Insets {
    if (this.#typeInternal !== Type.Device || !this.#modeInternal) {
      return new Insets(0, 0, 0, 0);
    }
    return this.#modeInternal.insets;
  }

  private getScreenOrientationType(): Protocol.Emulation.ScreenOrientationType {
    if (!this.#modeInternal) {
      throw new Error('Mode required to get orientation type.');
    }
    switch (this.#modeInternal.orientation) {
      case VerticalSpanned:
      case Vertical:
        return Protocol.Emulation.ScreenOrientationType.PortraitPrimary;
      case HorizontalSpanned:
      case Horizontal:
      default:
        return Protocol.Emulation.ScreenOrientationType.LandscapePrimary;
    }
  }

  private calculateAndEmulate(resetPageScaleFactor: boolean): void {
    if (!this.#emulationModel) {
      this.#onModelAvailable = this.calculateAndEmulate.bind(this, resetPageScaleFactor);
    }
    const mobile = this.isMobile();
    const overlayModel = this.#emulationModel ? this.#emulationModel.overlayModel() : null;
    if (overlayModel) {
      this.showHingeIfApplicable(overlayModel);
    }
    if (this.#typeInternal === Type.Device && this.#deviceInternal && this.#modeInternal) {
      const orientation = this.#deviceInternal.orientationByName(this.#modeInternal.orientation);
      const outline = this.currentOutline();
      const insets = this.currentInsets();
      this.#fitScaleInternal = this.calculateFitScale(orientation.width, orientation.height, outline, insets);
      if (mobile) {
        this.#appliedUserAgentTypeInternal = this.#deviceInternal.touch() ? UA.Mobile : UA.MobileNoTouch;
      } else {
        this.#appliedUserAgentTypeInternal = this.#deviceInternal.touch() ? UA.DesktopTouch : UA.Desktop;
      }
      this.applyDeviceMetrics(
          new UI.Geometry.Size(orientation.width, orientation.height), insets, outline,
          this.#scaleSettingInternal.get(), this.#deviceInternal.deviceScaleFactor, mobile,
          this.getScreenOrientationType(), resetPageScaleFactor, this.#webPlatformExperimentalFeaturesEnabledInternal);
      this.applyUserAgent(this.#deviceInternal.userAgent, this.#deviceInternal.userAgentMetadata);
      this.applyTouch(this.#deviceInternal.touch(), mobile);
    } else if (this.#typeInternal === Type.None) {
      this.#fitScaleInternal = this.calculateFitScale(this.#availableSize.width, this.#availableSize.height);
      this.#appliedUserAgentTypeInternal = UA.Desktop;
      this.applyDeviceMetrics(
          this.#availableSize, new Insets(0, 0, 0, 0), new Insets(0, 0, 0, 0), 1, 0, mobile, null,
          resetPageScaleFactor);
      this.applyUserAgent('', null);
      this.applyTouch(false, false);
    } else if (this.#typeInternal === Type.Responsive) {
      let screenWidth = this.#widthSetting.get();
      if (!screenWidth || screenWidth > this.preferredScaledWidth()) {
        screenWidth = this.preferredScaledWidth();
      }
      let screenHeight = this.#heightSetting.get();
      if (!screenHeight || screenHeight > this.preferredScaledHeight()) {
        screenHeight = this.preferredScaledHeight();
      }
      const defaultDeviceScaleFactor = mobile ? defaultMobileScaleFactor : 0;
      this.#fitScaleInternal = this.calculateFitScale(this.#widthSetting.get(), this.#heightSetting.get());
      this.#appliedUserAgentTypeInternal = this.#uaSettingInternal.get();
      this.applyDeviceMetrics(
          new UI.Geometry.Size(screenWidth, screenHeight), new Insets(0, 0, 0, 0), new Insets(0, 0, 0, 0),
          this.#scaleSettingInternal.get(), this.#deviceScaleFactorSettingInternal.get() || defaultDeviceScaleFactor,
          mobile,
          screenHeight >= screenWidth ? Protocol.Emulation.ScreenOrientationType.PortraitPrimary :
                                        Protocol.Emulation.ScreenOrientationType.LandscapePrimary,
          resetPageScaleFactor);
      this.applyUserAgent(mobile ? defaultMobileUserAgent : '', mobile ? defaultMobileUserAgentMetadata : null);
      this.applyTouch(
          this.#uaSettingInternal.get() === UA.DesktopTouch || this.#uaSettingInternal.get() === UA.Mobile,
          this.#uaSettingInternal.get() === UA.Mobile);
    }

    if (overlayModel) {
      overlayModel.setShowViewportSizeOnResize(this.#typeInternal === Type.None);
    }
    this.dispatchEventToListeners(Events.Updated);
  }

  private calculateFitScale(screenWidth: number, screenHeight: number, outline?: Insets, insets?: Insets): number {
    const outlineWidth = outline ? outline.left + outline.right : 0;
    const outlineHeight = outline ? outline.top + outline.bottom : 0;
    const insetsWidth = insets ? insets.left + insets.right : 0;
    const insetsHeight = insets ? insets.top + insets.bottom : 0;
    let scale = Math.min(
        screenWidth ? this.#preferredSize.width / (screenWidth + outlineWidth) : 1,
        screenHeight ? this.#preferredSize.height / (screenHeight + outlineHeight) : 1);
    scale = Math.min(Math.floor(scale * 100), 100);

    let sharpScale = scale;
    while (sharpScale > scale * 0.7) {
      let sharp = true;
      if (screenWidth) {
        sharp = sharp && Number.isInteger((screenWidth - insetsWidth) * sharpScale / 100);
      }
      if (screenHeight) {
        sharp = sharp && Number.isInteger((screenHeight - insetsHeight) * sharpScale / 100);
      }
      if (sharp) {
        return sharpScale / 100;
      }
      sharpScale -= 1;
    }
    return scale / 100;
  }

  setSizeAndScaleToFit(width: number, height: number): void {
    this.#scaleSettingInternal.set(this.calculateFitScale(width, height));
    this.setWidth(width);
    this.setHeight(height);
  }

  private applyUserAgent(userAgent: string, userAgentMetadata: Protocol.Emulation.UserAgentMetadata|null): void {
    SDK.NetworkManager.MultitargetNetworkManager.instance().setUserAgentOverride(userAgent, userAgentMetadata);
  }

  private applyDeviceMetrics(
      screenSize: UI.Geometry.Size, insets: Insets, outline: Insets, scale: number, deviceScaleFactor: number,
      mobile: boolean, screenOrientation: Protocol.Emulation.ScreenOrientationType|null, resetPageScaleFactor: boolean,
      forceMetricsOverride: boolean|undefined = false): void {
    screenSize.width = Math.max(1, Math.floor(screenSize.width));
    screenSize.height = Math.max(1, Math.floor(screenSize.height));

    let pageWidth: 0|number = screenSize.width - insets.left - insets.right;
    let pageHeight: 0|number = screenSize.height - insets.top - insets.bottom;

    const positionX = insets.left;
    const positionY = insets.top;
    const screenOrientationAngle =
        screenOrientation === Protocol.Emulation.ScreenOrientationType.LandscapePrimary ? 90 : 0;

    this.#appliedDeviceSizeInternal = screenSize;
    this.#appliedDeviceScaleFactorInternal = deviceScaleFactor || window.devicePixelRatio;
    this.#screenRectInternal = new Rect(
        Math.max(0, (this.#availableSize.width - screenSize.width * scale) / 2), outline.top * scale,
        screenSize.width * scale, screenSize.height * scale);
    this.#outlineRectInternal = new Rect(
        this.#screenRectInternal.left - outline.left * scale, 0,
        (outline.left + screenSize.width + outline.right) * scale,
        (outline.top + screenSize.height + outline.bottom) * scale);
    this.#visiblePageRectInternal = new Rect(
        positionX * scale, positionY * scale,
        Math.min(pageWidth * scale, this.#availableSize.width - this.#screenRectInternal.left - positionX * scale),
        Math.min(pageHeight * scale, this.#availableSize.height - this.#screenRectInternal.top - positionY * scale));
    this.#scaleInternal = scale;
    if (!forceMetricsOverride) {
      // When sending displayFeature, we cannot use the optimization below due to backend restrictions.
      if (scale === 1 && this.#availableSize.width >= screenSize.width &&
          this.#availableSize.height >= screenSize.height) {
        // When we have enough space, no page size override is required. This will speed things up and remove lag.
        pageWidth = 0;
        pageHeight = 0;
      }
      if (this.#visiblePageRectInternal.width === pageWidth * scale &&
          this.#visiblePageRectInternal.height === pageHeight * scale && Number.isInteger(pageWidth * scale) &&
          Number.isInteger(pageHeight * scale)) {
        // When we only have to apply scale, do not resize the page. This will speed things up and remove lag.
        pageWidth = 0;
        pageHeight = 0;
      }
    }

    if (!this.#emulationModel) {
      return;
    }

    if (resetPageScaleFactor) {
      void this.#emulationModel.resetPageScaleFactor();
    }
    if (pageWidth || pageHeight || mobile || deviceScaleFactor || scale !== 1 || screenOrientation ||
        forceMetricsOverride) {
      const metrics: Protocol.Emulation.SetDeviceMetricsOverrideRequest = {
        width: pageWidth,
        height: pageHeight,
        deviceScaleFactor: deviceScaleFactor,
        mobile: mobile,
        scale: scale,
        screenWidth: screenSize.width,
        screenHeight: screenSize.height,
        positionX: positionX,
        positionY: positionY,
        dontSetVisibleSize: true,
        displayFeature: undefined,
        screenOrientation: undefined,
      };
      const displayFeature = this.getDisplayFeature();
      if (displayFeature) {
        metrics.displayFeature = displayFeature;
      }
      if (screenOrientation) {
        metrics.screenOrientation = {type: screenOrientation, angle: screenOrientationAngle};
      }
      void this.#emulationModel.emulateDevice(metrics);
    } else {
      void this.#emulationModel.emulateDevice(null);
    }
  }

  exitHingeMode(): void {
    const overlayModel = this.#emulationModel ? this.#emulationModel.overlayModel() : null;
    if (overlayModel) {
      overlayModel.showHingeForDualScreen(null);
    }
  }

  webPlatformExperimentalFeaturesEnabled(): boolean {
    return this.#webPlatformExperimentalFeaturesEnabledInternal;
  }

  shouldReportDisplayFeature(): boolean {
    return this.#webPlatformExperimentalFeaturesEnabledInternal && this.#experimentDualScreenSupport;
  }

  async captureScreenshot(fullSize: boolean, clip?: Protocol.Page.Viewport): Promise<string|null> {
    const screenCaptureModel =
        this.#emulationModel ? this.#emulationModel.target().model(SDK.ScreenCaptureModel.ScreenCaptureModel) : null;
    if (!screenCaptureModel) {
      return null;
    }

    let screenshotMode;
    if (clip) {
      screenshotMode = SDK.ScreenCaptureModel.ScreenshotMode.FROM_CLIP;
    } else if (fullSize) {
      screenshotMode = SDK.ScreenCaptureModel.ScreenshotMode.FULLPAGE;
    } else {
      screenshotMode = SDK.ScreenCaptureModel.ScreenshotMode.FROM_VIEWPORT;
    }

    const overlayModel = this.#emulationModel ? this.#emulationModel.overlayModel() : null;
    if (overlayModel) {
      overlayModel.setShowViewportSizeOnResize(false);
    }

    const screenshot = await screenCaptureModel.captureScreenshot(
        Protocol.Page.CaptureScreenshotRequestFormat.Png, 100, screenshotMode, clip);

    const deviceMetrics: Protocol.Page.SetDeviceMetricsOverrideRequest = {
      width: 0,
      height: 0,
      deviceScaleFactor: 0,
      mobile: false,
    };
    if (fullSize && this.#emulationModel) {
      if (this.#deviceInternal && this.#modeInternal) {
        const orientation = this.#deviceInternal.orientationByName(this.#modeInternal.orientation);
        deviceMetrics.width = orientation.width;
        deviceMetrics.height = orientation.height;
        const dispFeature = this.getDisplayFeature();
        if (dispFeature) {
          // @ts-ignore: displayFeature isn't in protocol.d.ts but is an
          // experimental flag:
          // https://chromedevtools.github.io/devtools-protocol/tot/Emulation/#method-setDeviceMetricsOverride
          deviceMetrics.displayFeature = dispFeature;
        }
      } else {
        deviceMetrics.width = 0;
        deviceMetrics.height = 0;
      }
      await this.#emulationModel.emulateDevice(deviceMetrics);
    }
    this.calculateAndEmulate(false);
    return screenshot;
  }

  private applyTouch(touchEnabled: boolean, mobile: boolean): void {
    this.#touchEnabled = touchEnabled;
    this.#touchMobile = mobile;
    for (const emulationModel of SDK.TargetManager.TargetManager.instance().models(SDK.EmulationModel.EmulationModel)) {
      void emulationModel.emulateTouch(touchEnabled, mobile);
    }
  }

  private showHingeIfApplicable(overlayModel: SDK.OverlayModel.OverlayModel): void {
    const orientation = (this.#deviceInternal && this.#modeInternal) ?
        this.#deviceInternal.orientationByName(this.#modeInternal.orientation) :
        null;
    if (this.#experimentDualScreenSupport && orientation && orientation.hinge) {
      overlayModel.showHingeForDualScreen(orientation.hinge);
      return;
    }

    overlayModel.showHingeForDualScreen(null);
  }

  private getDisplayFeatureOrientation(): Protocol.Emulation.DisplayFeatureOrientation {
    if (!this.#modeInternal) {
      throw new Error('Mode required to get display feature orientation.');
    }
    switch (this.#modeInternal.orientation) {
      case VerticalSpanned:
      case Vertical:
        return Protocol.Emulation.DisplayFeatureOrientation.Vertical;
      case HorizontalSpanned:
      case Horizontal:
      default:
        return Protocol.Emulation.DisplayFeatureOrientation.Horizontal;
    }
  }

  private getDisplayFeature(): Protocol.Emulation.DisplayFeature|null {
    if (!this.shouldReportDisplayFeature()) {
      return null;
    }

    if (!this.#deviceInternal || !this.#modeInternal ||
        (this.#modeInternal.orientation !== VerticalSpanned && this.#modeInternal.orientation !== HorizontalSpanned)) {
      return null;
    }

    const orientation = this.#deviceInternal.orientationByName(this.#modeInternal.orientation);
    if (!orientation || !orientation.hinge) {
      return null;
    }

    const hinge = orientation.hinge;
    return {
      orientation: this.getDisplayFeatureOrientation(),
      offset: (this.#modeInternal.orientation === VerticalSpanned) ? hinge.x : hinge.y,
      maskLength: (this.#modeInternal.orientation === VerticalSpanned) ? hinge.width : hinge.height,
    };
  }
}

export class Insets {
  constructor(public left: number, public top: number, public right: number, public bottom: number) {
  }

  isEqual(insets: Insets|null): boolean {
    return insets !== null && this.left === insets.left && this.top === insets.top && this.right === insets.right &&
        this.bottom === insets.bottom;
  }
}

export class Rect {
  constructor(public left: number, public top: number, public width: number, public height: number) {
  }

  isEqual(rect: Rect|null): boolean {
    return rect !== null && this.left === rect.left && this.top === rect.top && this.width === rect.width &&
        this.height === rect.height;
  }

  scale(scale: number): Rect {
    return new Rect(this.left * scale, this.top * scale, this.width * scale, this.height * scale);
  }

  relativeTo(origin: Rect): Rect {
    return new Rect(this.left - origin.left, this.top - origin.top, this.width, this.height);
  }

  rebaseTo(origin: Rect): Rect {
    return new Rect(this.left + origin.left, this.top + origin.top, this.width, this.height);
  }
}

export const enum Events {
  Updated = 'Updated',
}

export type EventTypes = {
  [Events.Updated]: void,
};

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Type {
  None = 'None',
  Responsive = 'Responsive',
  Device = 'Device',
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum UA {
  // TODO(crbug.com/1136655): This enum is used for both display and code functionality.
  // we should refactor this so localization of these strings only happens for user display.
  Mobile = 'Mobile',
  MobileNoTouch = 'Mobile (no touch)',
  Desktop = 'Desktop',
  DesktopTouch = 'Desktop (touch)',
}

export const MinDeviceSize = 50;
export const MaxDeviceSize = 9999;
export const MinDeviceScaleFactor = 0;
export const MaxDeviceScaleFactor = 10;
export const MaxDeviceNameLength = 50;

const mobileUserAgent =
    'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36';
const defaultMobileUserAgent =
    SDK.NetworkManager.MultitargetNetworkManager.patchUserAgentWithChromeVersion(mobileUserAgent);

const defaultMobileUserAgentMetadata = {
  platform: 'Android',
  platformVersion: '6.0',
  architecture: '',
  model: 'Nexus 5',
  mobile: true,
};
export const defaultMobileScaleFactor = 2;

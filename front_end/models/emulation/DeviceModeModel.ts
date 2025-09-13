// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Geometry from '../geometry/geometry.js';

import {
  type EmulatedDevice,
  Horizontal,
  HorizontalSpanned,
  type Mode,
  Vertical,
  VerticalSpanned,
} from './EmulatedDevices.js';

const UIStrings = {
  /**
   * @description Error message shown in the Devices settings pane when the user enters an empty
   * width for a custom device.
   */
  widthCannotBeEmpty: 'Width cannot be empty.',
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
   * @description Error message shown in the Devices settings pane when the user enters an empty
   * height for a custom device.
   */
  heightCannotBeEmpty: 'Height cannot be empty.',
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
} as const;
const str_ = i18n.i18n.registerUIStrings('models/emulation/DeviceModeModel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let deviceModeModelInstance: DeviceModeModel|null;

export class DeviceModeModel extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    SDK.TargetManager.SDKModelObserver<SDK.EmulationModel.EmulationModel> {
  #screenRect: Rect;
  #visiblePageRect: Rect;
  #availableSize: Geometry.Size;
  #preferredSize: Geometry.Size;
  #initialized: boolean;
  #appliedDeviceSize: Geometry.Size;
  #appliedDeviceScaleFactor: number;
  #appliedUserAgentType: UA;
  readonly #scaleSetting: Common.Settings.Setting<number>;
  #scale: number;
  #widthSetting: Common.Settings.Setting<number>;
  #heightSetting: Common.Settings.Setting<number>;
  #uaSetting: Common.Settings.Setting<UA>;
  readonly #deviceScaleFactorSetting: Common.Settings.Setting<number>;
  readonly #deviceOutlineSetting: Common.Settings.Setting<boolean>;
  readonly #toolbarControlsEnabledSetting: Common.Settings.Setting<boolean>;
  #type: Type;
  #device: EmulatedDevice|null;
  #mode: Mode|null;
  #fitScale: number;
  #touchEnabled: boolean;
  #touchMobile: boolean;
  #emulationModel: SDK.EmulationModel.EmulationModel|null;
  #onModelAvailable: (() => void)|null;
  #outlineRect?: Rect;

  private constructor() {
    super();
    this.#screenRect = new Rect(0, 0, 1, 1);
    this.#visiblePageRect = new Rect(0, 0, 1, 1);
    this.#availableSize = new Geometry.Size(1, 1);
    this.#preferredSize = new Geometry.Size(1, 1);
    this.#initialized = false;
    this.#appliedDeviceSize = new Geometry.Size(1, 1);
    this.#appliedDeviceScaleFactor = window.devicePixelRatio;
    this.#appliedUserAgentType = UA.DESKTOP;

    this.#scaleSetting = Common.Settings.Settings.instance().createSetting('emulation.device-scale', 1);
    // We've used to allow zero before.
    if (!this.#scaleSetting.get()) {
      this.#scaleSetting.set(1);
    }
    this.#scaleSetting.addChangeListener(this.scaleSettingChanged, this);
    this.#scale = 1;

    this.#widthSetting = Common.Settings.Settings.instance().createSetting('emulation.device-width', 400);
    if (this.#widthSetting.get() < MinDeviceSize) {
      this.#widthSetting.set(MinDeviceSize);
    }
    if (this.#widthSetting.get() > MaxDeviceSize) {
      this.#widthSetting.set(MaxDeviceSize);
    }
    this.#widthSetting.addChangeListener(this.widthSettingChanged, this);

    this.#heightSetting = Common.Settings.Settings.instance().createSetting('emulation.device-height', 0);
    if (this.#heightSetting.get() && this.#heightSetting.get() < MinDeviceSize) {
      this.#heightSetting.set(MinDeviceSize);
    }
    if (this.#heightSetting.get() > MaxDeviceSize) {
      this.#heightSetting.set(MaxDeviceSize);
    }
    this.#heightSetting.addChangeListener(this.heightSettingChanged, this);

    this.#uaSetting = Common.Settings.Settings.instance().createSetting('emulation.device-ua', UA.MOBILE);
    this.#uaSetting.addChangeListener(this.uaSettingChanged, this);
    this.#deviceScaleFactorSetting =
        Common.Settings.Settings.instance().createSetting('emulation.device-scale-factor', 0);
    this.#deviceScaleFactorSetting.addChangeListener(this.deviceScaleFactorSettingChanged, this);

    this.#deviceOutlineSetting = Common.Settings.Settings.instance().moduleSetting('emulation.show-device-outline');
    this.#deviceOutlineSetting.addChangeListener(this.deviceOutlineSettingChanged, this);

    this.#toolbarControlsEnabledSetting = Common.Settings.Settings.instance().createSetting(
        'emulation.toolbar-controls-enabled', true, Common.Settings.SettingStorageType.SESSION);

    this.#type = Type.None;
    this.#device = null;
    this.#mode = null;
    this.#fitScale = 1;
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

  /**
   * This wraps `instance()` in a try/catch because in some DevTools entry points
   * (such as worker_app.ts) the Emulation panel is not included and as such
   * the below code fails; it tries to instantiate the model which requires
   * reading the value of a setting which has not been registered.
   * See crbug.com/361515458 for an example bug that this resolves.
   */
  static tryInstance(opts?: {forceNew: boolean}): DeviceModeModel|null {
    try {
      return this.instance(opts);
    } catch {
      return null;
    }
  }

  static widthValidator(value: string): {
    valid: boolean,
    errorMessage: (string|undefined),
  } {
    let valid = false;
    let errorMessage;

    if (!value) {
      errorMessage = i18nString(UIStrings.widthCannotBeEmpty);
    } else if (!/^[\d]+$/.test(value)) {
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

    if (!value) {
      errorMessage = i18nString(UIStrings.heightCannotBeEmpty);
    } else if (!/^[\d]+$/.test(value)) {
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
    return this.#scaleSetting;
  }

  setAvailableSize(availableSize: Geometry.Size, preferredSize: Geometry.Size): void {
    this.#availableSize = availableSize;
    this.#preferredSize = preferredSize;
    this.#initialized = true;
    this.calculateAndEmulate(false);
  }

  emulate(type: Type, device: EmulatedDevice|null, mode: Mode|null, scale?: number): void {
    const resetPageScaleFactor = this.#type !== type || this.#device !== device || this.#mode !== mode;
    this.#type = type;

    if (type === Type.Device && device && mode) {
      console.assert(Boolean(device) && Boolean(mode), 'Must pass device and mode for device emulation');
      this.#mode = mode;
      this.#device = device;
      if (this.#initialized) {
        const orientation = device.orientationByName(mode.orientation);
        this.#scaleSetting.set(
            scale ||
            this.calculateFitScale(orientation.width, orientation.height, this.currentOutline(), this.currentInsets()));
      }
    } else {
      this.#device = null;
      this.#mode = null;
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
    this.#scaleSetting.set(this.calculateFitScale(width, this.#heightSetting.get()));
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
    this.#scaleSetting.set(this.calculateFitScale(this.#widthSetting.get(), height));
    this.#heightSetting.set(height);
  }

  setScale(scale: number): void {
    this.#scaleSetting.set(scale);
  }

  device(): EmulatedDevice|null {
    return this.#device;
  }

  mode(): Mode|null {
    return this.#mode;
  }

  type(): Type {
    return this.#type;
  }

  screenImage(): string {
    return (this.#device && this.#mode) ? this.#device.modeImage(this.#mode) : '';
  }

  outlineImage(): string {
    return (this.#device && this.#mode && this.#deviceOutlineSetting.get()) ? this.#device.outlineImage(this.#mode) :
                                                                              '';
  }

  outlineRect(): Rect|null {
    return this.#outlineRect || null;
  }

  screenRect(): Rect {
    return this.#screenRect;
  }

  visiblePageRect(): Rect {
    return this.#visiblePageRect;
  }

  scale(): number {
    return this.#scale;
  }

  fitScale(): number {
    return this.#fitScale;
  }

  appliedDeviceSize(): Geometry.Size {
    return this.#appliedDeviceSize;
  }

  appliedDeviceScaleFactor(): number {
    return this.#appliedDeviceScaleFactor;
  }

  appliedUserAgentType(): UA {
    return this.#appliedUserAgentType;
  }

  isFullHeight(): boolean {
    return !this.#heightSetting.get();
  }

  isMobile(): boolean {
    switch (this.#type) {
      case Type.Device:
        return this.#device ? this.#device.mobile() : false;
      case Type.None:
        return false;
      case Type.Responsive:
        return this.#uaSetting.get() === UA.MOBILE || this.#uaSetting.get() === UA.MOBILE_NO_TOUCH;
    }
    return false;
  }

  enabledSetting(): Common.Settings.Setting<boolean> {
    return Common.Settings.Settings.instance().createSetting('emulation.show-device-mode', false);
  }

  scaleSetting(): Common.Settings.Setting<number> {
    return this.#scaleSetting;
  }

  uaSetting(): Common.Settings.Setting<UA> {
    return this.#uaSetting;
  }

  deviceScaleFactorSetting(): Common.Settings.Setting<number> {
    return this.#deviceScaleFactorSetting;
  }

  deviceOutlineSetting(): Common.Settings.Setting<boolean> {
    return this.#deviceOutlineSetting;
  }

  toolbarControlsEnabledSetting(): Common.Settings.Setting<boolean> {
    return this.#toolbarControlsEnabledSetting;
  }

  reset(): void {
    this.#deviceScaleFactorSetting.set(0);
    this.#scaleSetting.set(1);
    this.setWidth(400);
    this.setHeight(0);
    this.#uaSetting.set(UA.MOBILE);
  }

  modelAdded(emulationModel: SDK.EmulationModel.EmulationModel): void {
    if (emulationModel.target() === SDK.TargetManager.TargetManager.instance().primaryPageTarget() &&
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
    return Math.floor(this.#preferredSize.width / (this.#scaleSetting.get() || 1));
  }

  private preferredScaledHeight(): number {
    return Math.floor(this.#preferredSize.height / (this.#scaleSetting.get() || 1));
  }

  private currentOutline(): Insets {
    let outline: Insets = new Insets(0, 0, 0, 0);
    if (this.#type !== Type.Device || !this.#device || !this.#mode) {
      return outline;
    }
    const orientation = this.#device.orientationByName(this.#mode.orientation);
    if (this.#deviceOutlineSetting.get()) {
      outline = orientation.outlineInsets || outline;
    }
    return outline;
  }

  private currentInsets(): Insets {
    if (this.#type !== Type.Device || !this.#mode) {
      return new Insets(0, 0, 0, 0);
    }
    return this.#mode.insets;
  }

  private getScreenOrientationType(): Protocol.Emulation.ScreenOrientationType {
    if (!this.#mode) {
      throw new Error('Mode required to get orientation type.');
    }
    switch (this.#mode.orientation) {
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
    if (this.#type === Type.Device && this.#device && this.#mode) {
      const orientation = this.#device.orientationByName(this.#mode.orientation);
      const outline = this.currentOutline();
      const insets = this.currentInsets();
      this.#fitScale = this.calculateFitScale(orientation.width, orientation.height, outline, insets);
      if (mobile) {
        this.#appliedUserAgentType = this.#device.touch() ? UA.MOBILE : UA.MOBILE_NO_TOUCH;
      } else {
        this.#appliedUserAgentType = this.#device.touch() ? UA.DESKTOP_TOUCH : UA.DESKTOP;
      }
      this.applyDeviceMetrics(
          new Geometry.Size(orientation.width, orientation.height), insets, outline, this.#scaleSetting.get(),
          this.#device.deviceScaleFactor, mobile, this.getScreenOrientationType(), resetPageScaleFactor);
      this.applyUserAgent(this.#device.userAgent, this.#device.userAgentMetadata);
      this.applyTouch(this.#device.touch(), mobile);
    } else if (this.#type === Type.None) {
      this.#fitScale = this.calculateFitScale(this.#availableSize.width, this.#availableSize.height);
      this.#appliedUserAgentType = UA.DESKTOP;
      this.applyDeviceMetrics(
          this.#availableSize, new Insets(0, 0, 0, 0), new Insets(0, 0, 0, 0), 1, 0, mobile, null,
          resetPageScaleFactor);
      this.applyUserAgent('', null);
      this.applyTouch(false, false);
    } else if (this.#type === Type.Responsive) {
      let screenWidth = this.#widthSetting.get();
      if (!screenWidth || screenWidth > this.preferredScaledWidth()) {
        screenWidth = this.preferredScaledWidth();
      }
      let screenHeight = this.#heightSetting.get();
      if (!screenHeight || screenHeight > this.preferredScaledHeight()) {
        screenHeight = this.preferredScaledHeight();
      }
      const defaultDeviceScaleFactor = mobile ? defaultMobileScaleFactor : 0;
      this.#fitScale = this.calculateFitScale(this.#widthSetting.get(), this.#heightSetting.get());
      this.#appliedUserAgentType = this.#uaSetting.get();
      this.applyDeviceMetrics(
          new Geometry.Size(screenWidth, screenHeight), new Insets(0, 0, 0, 0), new Insets(0, 0, 0, 0),
          this.#scaleSetting.get(), this.#deviceScaleFactorSetting.get() || defaultDeviceScaleFactor, mobile,
          screenHeight >= screenWidth ? Protocol.Emulation.ScreenOrientationType.PortraitPrimary :
                                        Protocol.Emulation.ScreenOrientationType.LandscapePrimary,
          resetPageScaleFactor);
      this.applyUserAgent(mobile ? defaultMobileUserAgent : '', mobile ? defaultMobileUserAgentMetadata : null);
      this.applyTouch(
          this.#uaSetting.get() === UA.DESKTOP_TOUCH || this.#uaSetting.get() === UA.MOBILE,
          this.#uaSetting.get() === UA.MOBILE);
    }

    if (overlayModel) {
      overlayModel.setShowViewportSizeOnResize(this.#type === Type.None);
    }
    this.dispatchEventToListeners(Events.UPDATED);
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
    this.#scaleSetting.set(this.calculateFitScale(width, height));
    this.setWidth(width);
    this.setHeight(height);
  }

  private applyUserAgent(userAgent: string, userAgentMetadata: Protocol.Emulation.UserAgentMetadata|null): void {
    SDK.NetworkManager.MultitargetNetworkManager.instance().setUserAgentOverride(userAgent, userAgentMetadata);
  }

  private applyDeviceMetrics(
      screenSize: Geometry.Size, insets: Insets, outline: Insets, scale: number, deviceScaleFactor: number,
      mobile: boolean, screenOrientation: Protocol.Emulation.ScreenOrientationType|null,
      resetPageScaleFactor: boolean): void {
    screenSize.width = Math.max(1, Math.floor(screenSize.width));
    screenSize.height = Math.max(1, Math.floor(screenSize.height));

    let pageWidth: 0|number = screenSize.width - insets.left - insets.right;
    let pageHeight: 0|number = screenSize.height - insets.top - insets.bottom;

    const positionX = insets.left;
    const positionY = insets.top;
    const screenOrientationAngle =
        screenOrientation === Protocol.Emulation.ScreenOrientationType.LandscapePrimary ? 90 : 0;

    this.#appliedDeviceSize = screenSize;
    this.#appliedDeviceScaleFactor = deviceScaleFactor || window.devicePixelRatio;
    this.#screenRect = new Rect(
        Math.max(0, (this.#availableSize.width - screenSize.width * scale) / 2), outline.top * scale,
        screenSize.width * scale, screenSize.height * scale);
    this.#outlineRect = new Rect(
        this.#screenRect.left - outline.left * scale, 0, (outline.left + screenSize.width + outline.right) * scale,
        (outline.top + screenSize.height + outline.bottom) * scale);
    this.#visiblePageRect = new Rect(
        positionX * scale, positionY * scale,
        Math.min(pageWidth * scale, this.#availableSize.width - this.#screenRect.left - positionX * scale),
        Math.min(pageHeight * scale, this.#availableSize.height - this.#screenRect.top - positionY * scale));
    this.#scale = scale;
    const displayFeature = this.getDisplayFeature();
    if (!displayFeature) {
      // When sending displayFeature, we cannot use the optimization below due to backend restrictions.
      if (scale === 1 && this.#availableSize.width >= screenSize.width &&
          this.#availableSize.height >= screenSize.height) {
        // When we have enough space, no page size override is required. This will speed things up and remove lag.
        pageWidth = 0;
        pageHeight = 0;
      }
      if (this.#visiblePageRect.width === pageWidth * scale && this.#visiblePageRect.height === pageHeight * scale &&
          Number.isInteger(pageWidth * scale) && Number.isInteger(pageHeight * scale)) {
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
    if (pageWidth || pageHeight || mobile || deviceScaleFactor || scale !== 1 || screenOrientation || displayFeature) {
      const metrics: Protocol.Emulation.SetDeviceMetricsOverrideRequest = {
        width: pageWidth,
        height: pageHeight,
        deviceScaleFactor,
        mobile,
        scale,
        screenWidth: screenSize.width,
        screenHeight: screenSize.height,
        positionX,
        positionY,
        dontSetVisibleSize: true,
        displayFeature: undefined,
        devicePosture: undefined,
        screenOrientation: undefined,
      };
      if (displayFeature) {
        metrics.displayFeature = displayFeature;
        metrics.devicePosture = {type: Protocol.Emulation.DevicePostureType.Folded};
      } else {
        metrics.devicePosture = {type: Protocol.Emulation.DevicePostureType.Continuous};
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
      if (this.#device && this.#mode) {
        const orientation = this.#device.orientationByName(this.#mode.orientation);
        deviceMetrics.width = orientation.width;
        deviceMetrics.height = orientation.height;
        const dispFeature = this.getDisplayFeature();
        if (dispFeature) {
          // @ts-expect-error: displayFeature isn't in protocol.ts but is an
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
    const orientation = (this.#device && this.#mode) ? this.#device.orientationByName(this.#mode.orientation) : null;
    if (orientation?.hinge) {
      overlayModel.showHingeForDualScreen(orientation.hinge);
      return;
    }

    overlayModel.showHingeForDualScreen(null);
  }

  private getDisplayFeatureOrientation(): Protocol.Emulation.DisplayFeatureOrientation {
    if (!this.#mode) {
      throw new Error('Mode required to get display feature orientation.');
    }
    switch (this.#mode.orientation) {
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
    if (!this.#device || !this.#mode ||
        (this.#mode.orientation !== VerticalSpanned && this.#mode.orientation !== HorizontalSpanned)) {
      return null;
    }

    const orientation = this.#device.orientationByName(this.#mode.orientation);
    if (!orientation?.hinge) {
      return null;
    }

    const hinge = orientation.hinge;
    return {
      orientation: this.getDisplayFeatureOrientation(),
      offset: (this.#mode.orientation === VerticalSpanned) ? hinge.x : hinge.y,
      maskLength: (this.#mode.orientation === VerticalSpanned) ? hinge.width : hinge.height,
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
  UPDATED = 'Updated',
}

export interface EventTypes {
  [Events.UPDATED]: void;
}

export enum Type {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  None = 'None',
  Responsive = 'Responsive',
  Device = 'Device',
  /* eslint-enable @typescript-eslint/naming-convention */
}

export const enum UA {
  // TODO(crbug.com/1136655): This enum is used for both display and code functionality.
  // we should refactor this so localization of these strings only happens for user display.
  MOBILE = 'Mobile',
  MOBILE_NO_TOUCH = 'Mobile (no touch)',
  DESKTOP = 'Desktop',
  DESKTOP_TOUCH = 'Desktop (touch)',
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

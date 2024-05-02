// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {DeviceModeToolbar} from './DeviceModeToolbar.js';
import deviceModeViewStyles from './deviceModeView.css.legacy.js';
import {MediaQueryInspector} from './MediaQueryInspector.js';

const UIStrings = {
  /**
   *@description Bottom resizer element title in Device Mode View of the Device Toolbar
   */
  doubleclickForFullHeight: 'Double-click for full height',
  /**
   * @description Name of a device that the user can select to emulate. Small mobile device.
   * Translation of this phrase should be limited to 10 characters.
   */
  mobileS: 'Mobile S',
  /**
   * @description Name of a device that the user can select to emulate. Medium mobile device.
   * Translation of this phrase should be limited to 10 characters.
   */
  mobileM: 'Mobile M',
  /**
   * @description Name of a device that the user can select to emulate. Large mobile device.
   * Translation of this phrase should be limited to 10 characters.
   */
  mobileL: 'Mobile L',
  /**
   * @description Name of a device that the user can select to emulate. Tablet device.
   * Translation of this phrase should be limited to 10 characters.
   */
  tablet: 'Tablet',
  /**
   * @description Name of a device that the user can select to emulate. Laptop device.
   * Translation of this phrase should be limited to 10 characters.
   */
  laptop: 'Laptop',
  /**
   * @description Name of a device that the user can select to emulate. Large laptop device.
   * Translation of this phrase should be limited to 10 characters.
   */
  laptopL: 'Laptop L',
};
const str_ = i18n.i18n.registerUIStrings('panels/emulation/DeviceModeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class DeviceModeView extends UI.Widget.VBox {
  wrapperInstance!: UI.Widget.VBox|null;
  blockElementToWidth: WeakMap<HTMLElement, number>;
  private model: EmulationModel.DeviceModeModel.DeviceModeModel;
  private readonly mediaInspector: MediaQueryInspector;
  private showMediaInspectorSetting: Common.Settings.Setting<boolean>;
  private showRulersSetting: Common.Settings.Setting<boolean>;
  private readonly topRuler: Ruler;
  private readonly leftRuler: Ruler;
  private presetBlocks!: HTMLElement[];
  private responsivePresetsContainer!: HTMLElement;
  private screenArea!: HTMLElement;
  private pageArea!: HTMLElement;
  private outlineImage!: HTMLElement;
  private contentClip!: HTMLElement;
  private contentArea!: HTMLElement;
  private rightResizerElement!: HTMLElement;
  private leftResizerElement!: HTMLElement;
  private bottomResizerElement!: HTMLElement;
  private bottomRightResizerElement!: HTMLElement;
  private bottomLeftResizerElement!: HTMLElement;
  private cachedResizable!: boolean|undefined;
  private mediaInspectorContainer!: HTMLElement;
  private screenImage!: HTMLElement;
  private toolbar!: DeviceModeToolbar;
  private slowPositionStart?: {
    x: number,
    y: number,
  }|null;
  private resizeStart?: UI.Geometry.Size;
  private cachedCssScreenRect?: EmulationModel.DeviceModeModel.Rect;
  private cachedCssVisiblePageRect?: EmulationModel.DeviceModeModel.Rect;
  private cachedOutlineRect?: EmulationModel.DeviceModeModel.Rect;
  private cachedMediaInspectorVisible?: boolean;
  private cachedShowRulers?: boolean;
  private cachedScale?: number;
  private handleWidth?: number;
  private handleHeight?: number;

  constructor() {
    super(true);

    this.blockElementToWidth = new WeakMap();

    this.setMinimumSize(150, 150);
    this.element.classList.add('device-mode-view');
    this.registerRequiredCSS(deviceModeViewStyles);

    this.model = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
    this.model.addEventListener(EmulationModel.DeviceModeModel.Events.Updated, this.updateUI, this);
    this.mediaInspector = new MediaQueryInspector(
        () => this.model.appliedDeviceSize().width, this.model.setWidth.bind(this.model),
        new Common.Throttler.Throttler(0));
    this.showMediaInspectorSetting = Common.Settings.Settings.instance().moduleSetting('show-media-query-inspector');
    this.showMediaInspectorSetting.addChangeListener(this.updateUI, this);
    this.showRulersSetting = Common.Settings.Settings.instance().moduleSetting('emulation.show-rulers');
    this.showRulersSetting.addChangeListener(this.updateUI, this);

    this.topRuler = new Ruler(true, this.model.setWidthAndScaleToFit.bind(this.model));
    this.topRuler.element.classList.add('device-mode-ruler-top');
    this.leftRuler = new Ruler(false, this.model.setHeightAndScaleToFit.bind(this.model));
    this.leftRuler.element.classList.add('device-mode-ruler-left');
    this.createUI();
    UI.ZoomManager.ZoomManager.instance().addEventListener(UI.ZoomManager.Events.ZoomChanged, this.zoomChanged, this);
  }

  private createUI(): void {
    this.toolbar = new DeviceModeToolbar(this.model, this.showMediaInspectorSetting, this.showRulersSetting);
    this.contentElement.appendChild(this.toolbar.element());
    this.contentClip = (this.contentElement.createChild('div', 'device-mode-content-clip vbox') as HTMLElement);
    this.responsivePresetsContainer =
        (this.contentClip.createChild('div', 'device-mode-presets-container') as HTMLElement);
    this.responsivePresetsContainer.setAttribute('jslog', `${VisualLogging.responsivePresets()}`);
    this.populatePresetsContainer();
    this.mediaInspectorContainer = (this.contentClip.createChild('div', 'device-mode-media-container') as HTMLElement);
    this.contentArea = (this.contentClip.createChild('div', 'device-mode-content-area') as HTMLElement);
    this.outlineImage = (this.contentArea.createChild('img', 'device-mode-outline-image hidden fill') as HTMLElement);
    this.outlineImage.addEventListener('load', this.onImageLoaded.bind(this, this.outlineImage, true), false);
    this.outlineImage.addEventListener('error', this.onImageLoaded.bind(this, this.outlineImage, false), false);
    this.screenArea = (this.contentArea.createChild('div', 'device-mode-screen-area') as HTMLElement);
    this.screenImage = (this.screenArea.createChild('img', 'device-mode-screen-image hidden') as HTMLElement);
    this.screenImage.addEventListener('load', this.onImageLoaded.bind(this, this.screenImage, true), false);
    this.screenImage.addEventListener('error', this.onImageLoaded.bind(this, this.screenImage, false), false);
    this.bottomRightResizerElement =
        (this.screenArea.createChild('div', 'device-mode-resizer device-mode-bottom-right-resizer') as HTMLElement);
    this.bottomRightResizerElement.createChild('div', '');
    this.createResizer(this.bottomRightResizerElement, 2, 1);
    this.bottomLeftResizerElement =
        (this.screenArea.createChild('div', 'device-mode-resizer device-mode-bottom-left-resizer') as HTMLElement);
    this.bottomLeftResizerElement.createChild('div', '');
    this.createResizer(this.bottomLeftResizerElement, -2, 1);
    this.rightResizerElement =
        (this.screenArea.createChild('div', 'device-mode-resizer device-mode-right-resizer') as HTMLElement);
    this.rightResizerElement.createChild('div', '');
    this.createResizer(this.rightResizerElement, 2, 0);
    this.leftResizerElement =
        (this.screenArea.createChild('div', 'device-mode-resizer device-mode-left-resizer') as HTMLElement);
    this.leftResizerElement.createChild('div', '');
    this.createResizer(this.leftResizerElement, -2, 0);
    this.bottomResizerElement =
        (this.screenArea.createChild('div', 'device-mode-resizer device-mode-bottom-resizer') as HTMLElement);
    this.bottomResizerElement.createChild('div', '');
    this.createResizer(this.bottomResizerElement, 0, 1);
    this.bottomResizerElement.addEventListener('dblclick', this.model.setHeight.bind(this.model, 0), false);
    UI.Tooltip.Tooltip.install(this.bottomResizerElement, i18nString(UIStrings.doubleclickForFullHeight));
    this.pageArea = (this.screenArea.createChild('div', 'device-mode-page-area') as HTMLElement);
    this.pageArea.createChild('slot');
  }

  private populatePresetsContainer(): void {
    const sizes = [320, 375, 425, 768, 1024, 1440, 2560];
    const titles = [
      i18nString(UIStrings.mobileS),
      i18nString(UIStrings.mobileM),
      i18nString(UIStrings.mobileL),
      i18nString(UIStrings.tablet),
      i18nString(UIStrings.laptop),
      i18nString(UIStrings.laptopL),
      '4K',
    ];
    this.presetBlocks = [];
    const inner = this.responsivePresetsContainer.createChild('div', 'device-mode-presets-container-inner');
    for (let i = sizes.length - 1; i >= 0; --i) {
      const outer = inner.createChild('div', 'fill device-mode-preset-bar-outer');
      const block = (outer.createChild('div', 'device-mode-preset-bar') as HTMLElement);
      block.createChild('span').textContent = titles[i] + ' \u2013 ' + sizes[i] + 'px';
      block.setAttribute(
          'jslog', `${VisualLogging.action().track({click: true}).context(`device-mode-preset-${sizes[i]}px`)}`);
      block.addEventListener('click', applySize.bind(this, sizes[i]), false);
      this.blockElementToWidth.set(block, sizes[i]);
      this.presetBlocks.push(block);
    }

    function applySize(this: DeviceModeView, width: number, e: Event): void {
      this.model.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
      this.model.setWidthAndScaleToFit(width);
      e.consume();
    }
  }

  private createResizer(element: Element, widthFactor: number, heightFactor: number): UI.ResizerWidget.ResizerWidget {
    const resizer = new UI.ResizerWidget.ResizerWidget();
    element.setAttribute('jslog', `${VisualLogging.slider('device-mode-resizer').track({drag: true})}`);
    resizer.addElement((element as HTMLElement));
    let cursor: 'nwse-resize'|'nesw-resize'|('ew-resize' | 'ns-resize') = widthFactor ? 'ew-resize' : 'ns-resize';
    if (widthFactor * heightFactor > 0) {
      cursor = 'nwse-resize';
    }
    if (widthFactor * heightFactor < 0) {
      cursor = 'nesw-resize';
    }
    resizer.setCursor(cursor);
    resizer.addEventListener(UI.ResizerWidget.Events.ResizeStart, this.onResizeStart, this);
    resizer.addEventListener(
        UI.ResizerWidget.Events.ResizeUpdateXY, this.onResizeUpdate.bind(this, widthFactor, heightFactor));
    resizer.addEventListener(UI.ResizerWidget.Events.ResizeEnd, this.onResizeEnd, this);
    return resizer;
  }

  private onResizeStart(): void {
    this.slowPositionStart = null;
    const rect = this.model.screenRect();
    this.resizeStart = new UI.Geometry.Size(rect.width, rect.height);
  }

  private onResizeUpdate(widthFactor: number, heightFactor: number, event: {
    data: UI.ResizerWidget.ResizeUpdateXYEvent,
  }): void {
    if (event.data.shiftKey !== Boolean(this.slowPositionStart)) {
      this.slowPositionStart = event.data.shiftKey ? {x: event.data.currentX, y: event.data.currentY} : null;
    }

    let cssOffsetX: number = event.data.currentX - event.data.startX;
    let cssOffsetY: number = event.data.currentY - event.data.startY;
    if (this.slowPositionStart) {
      cssOffsetX = (event.data.currentX - this.slowPositionStart.x) / 10 + this.slowPositionStart.x - event.data.startX;
      cssOffsetY = (event.data.currentY - this.slowPositionStart.y) / 10 + this.slowPositionStart.y - event.data.startY;
    }

    if (widthFactor && this.resizeStart) {
      const dipOffsetX = cssOffsetX * UI.ZoomManager.ZoomManager.instance().zoomFactor();
      let newWidth: number = this.resizeStart.width + dipOffsetX * widthFactor;
      newWidth = Math.round(newWidth / this.model.scale());
      if (newWidth >= EmulationModel.DeviceModeModel.MinDeviceSize &&
          newWidth <= EmulationModel.DeviceModeModel.MaxDeviceSize) {
        this.model.setWidth(newWidth);
      }
    }

    if (heightFactor && this.resizeStart) {
      const dipOffsetY = cssOffsetY * UI.ZoomManager.ZoomManager.instance().zoomFactor();
      let newHeight: number = this.resizeStart.height + dipOffsetY * heightFactor;
      newHeight = Math.round(newHeight / this.model.scale());
      if (newHeight >= EmulationModel.DeviceModeModel.MinDeviceSize &&
          newHeight <= EmulationModel.DeviceModeModel.MaxDeviceSize) {
        this.model.setHeight(newHeight);
      }
    }
  }

  exitHingeMode(): void {
    if (this.model) {
      this.model.exitHingeMode();
    }
  }

  private onResizeEnd(): void {
    delete this.resizeStart;
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ResizedViewInResponsiveMode);
  }

  private updateUI(): void {
    function applyRect(element: HTMLElement, rect: EmulationModel.DeviceModeModel.Rect): void {
      element.style.left = rect.left + 'px';
      element.style.top = rect.top + 'px';
      element.style.width = rect.width + 'px';
      element.style.height = rect.height + 'px';
    }

    if (!this.isShowing()) {
      return;
    }

    const zoomFactor = UI.ZoomManager.ZoomManager.instance().zoomFactor();
    let callDoResize = false;
    const showRulers = this.showRulersSetting.get() && this.model.type() !== EmulationModel.DeviceModeModel.Type.None;
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
    this.contentClip.classList.toggle('device-mode-outline-visible', Boolean(this.model.outlineImage()));

    const resizable = this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive;
    if (resizable !== this.cachedResizable) {
      this.rightResizerElement.classList.toggle('hidden', !resizable);
      this.leftResizerElement.classList.toggle('hidden', !resizable);
      this.bottomResizerElement.classList.toggle('hidden', !resizable);
      this.bottomRightResizerElement.classList.toggle('hidden', !resizable);
      this.bottomLeftResizerElement.classList.toggle('hidden', !resizable);
      this.cachedResizable = resizable;
    }

    const mediaInspectorVisible =
        this.showMediaInspectorSetting.get() && this.model.type() !== EmulationModel.DeviceModeModel.Type.None;
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
      this.contentClip.classList.toggle('device-mode-rulers-visible', showRulers);
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
          throw new Error('Could not get width for block.');
        }
        block.style.width = blockWidth * this.model.scale() + 'px';
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
      this.topRuler.element.positionAt(
          this.cachedCssScreenRect ? this.cachedCssScreenRect.left : 0,
          this.cachedCssScreenRect ? this.cachedCssScreenRect.top : 0);
      this.leftRuler.element.positionAt(
          this.cachedCssScreenRect ? this.cachedCssScreenRect.left : 0,
          this.cachedCssScreenRect ? this.cachedCssScreenRect.top : 0);
    }
    if (contentAreaResized) {
      this.contentAreaResized();
    }
  }

  private loadImage(element: Element, srcset: string): void {
    if (element.getAttribute('srcset') === srcset) {
      return;
    }
    element.setAttribute('srcset', srcset);
    if (!srcset) {
      element.classList.toggle('hidden', true);
    }
  }

  private onImageLoaded(element: Element, success: boolean): void {
    element.classList.toggle('hidden', !success);
  }

  setNonEmulatedAvailableSize(element: Element): void {
    if (this.model.type() !== EmulationModel.DeviceModeModel.Type.None) {
      return;
    }
    const zoomFactor = UI.ZoomManager.ZoomManager.instance().zoomFactor();
    const rect = element.getBoundingClientRect();
    const availableSize =
        new UI.Geometry.Size(Math.max(rect.width * zoomFactor, 1), Math.max(rect.height * zoomFactor, 1));
    this.model.setAvailableSize(availableSize, availableSize);
  }

  private contentAreaResized(): void {
    const zoomFactor = UI.ZoomManager.ZoomManager.instance().zoomFactor();
    const rect = this.contentArea.getBoundingClientRect();
    const availableSize =
        new UI.Geometry.Size(Math.max(rect.width * zoomFactor, 1), Math.max(rect.height * zoomFactor, 1));
    const preferredSize = new UI.Geometry.Size(
        Math.max((rect.width - 2 * (this.handleWidth || 0)) * zoomFactor, 1),
        Math.max((rect.height - (this.handleHeight || 0)) * zoomFactor, 1));
    this.model.setAvailableSize(availableSize, preferredSize);
  }

  private measureHandles(): void {
    const hidden = this.rightResizerElement.classList.contains('hidden');
    this.rightResizerElement.classList.toggle('hidden', false);
    this.bottomResizerElement.classList.toggle('hidden', false);
    this.handleWidth = this.rightResizerElement.offsetWidth;
    this.handleHeight = this.bottomResizerElement.offsetHeight;
    this.rightResizerElement.classList.toggle('hidden', hidden);
    this.bottomResizerElement.classList.toggle('hidden', hidden);
  }

  private zoomChanged(): void {
    delete this.handleWidth;
    delete this.handleHeight;
    if (this.isShowing()) {
      this.measureHandles();
      this.contentAreaResized();
    }
  }

  override onResize(): void {
    if (this.isShowing()) {
      this.contentAreaResized();
    }
  }

  override wasShown(): void {
    this.measureHandles();
    this.toolbar.restore();
  }

  override willHide(): void {
    this.model.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
  }

  async captureScreenshot(): Promise<void> {
    const screenshot = await this.model.captureScreenshot(false);
    if (screenshot === null) {
      return;
    }

    const pageImage = new Image();
    pageImage.src = 'data:image/png;base64,' + screenshot;
    pageImage.onload = async () => {
      const scale = pageImage.naturalWidth / this.model.screenRect().width;
      const outlineRectFromModel = this.model.outlineRect();
      if (!outlineRectFromModel) {
        throw new Error('Unable to take screenshot: no outlineRect available.');
      }
      const outlineRect = outlineRectFromModel.scale(scale);
      const screenRect = this.model.screenRect().scale(scale);
      const visiblePageRect = this.model.visiblePageRect().scale(scale);
      const contentLeft = screenRect.left + visiblePageRect.left - outlineRect.left;
      const contentTop = screenRect.top + visiblePageRect.top - outlineRect.top;

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(outlineRect.width);
      // Cap the height to not hit the GPU limit.
      // https://crbug.com/1260828
      canvas.height = Math.min((1 << 14), Math.floor(outlineRect.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get 2d context from canvas.');
      }
      ctx.imageSmoothingEnabled = false;

      if (this.model.outlineImage()) {
        await this.paintImage(ctx, this.model.outlineImage(), outlineRect.relativeTo(outlineRect));
      }
      if (this.model.screenImage()) {
        await this.paintImage(ctx, this.model.screenImage(), screenRect.relativeTo(outlineRect));
      }
      ctx.drawImage(pageImage, Math.floor(contentLeft), Math.floor(contentTop));
      this.saveScreenshot((canvas as HTMLCanvasElement));
    };
  }

  async captureFullSizeScreenshot(): Promise<void> {
    const screenshot = await this.model.captureScreenshot(true);
    if (screenshot === null) {
      return;
    }
    return this.saveScreenshotBase64(screenshot);
  }

  async captureAreaScreenshot(clip?: Protocol.Page.Viewport): Promise<void> {
    const screenshot = await this.model.captureScreenshot(false, clip);
    if (screenshot === null) {
      return;
    }
    return this.saveScreenshotBase64(screenshot);
  }

  private saveScreenshotBase64(screenshot: string): void {
    const pageImage = new Image();
    pageImage.src = 'data:image/png;base64,' + screenshot;
    pageImage.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pageImage.naturalWidth;
      // Cap the height to not hit the GPU limit.
      // https://crbug.com/1260828
      canvas.height = Math.min((1 << 14), Math.floor(pageImage.naturalHeight));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get 2d context for base64 screenshot.');
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(pageImage, 0, 0);
      this.saveScreenshot((canvas as HTMLCanvasElement));
    };
  }

  private paintImage(ctx: CanvasRenderingContext2D, src: string, rect: EmulationModel.DeviceModeModel.Rect):
      Promise<void> {
    return new Promise(resolve => {
      const image = new Image();
      image.crossOrigin = 'Anonymous';
      image.srcset = src;
      image.onerror = () => resolve();
      image.onload = () => {
        ctx.drawImage(image, rect.left, rect.top, rect.width, rect.height);
        resolve();
      };
    });
  }

  private saveScreenshot(canvas: HTMLCanvasElement): void {
    const url = this.model.inspectedURL();
    let fileName = '';
    if (url) {
      const withoutFragment = Platform.StringUtilities.removeURLFragment(url);
      fileName = Platform.StringUtilities.trimURL(withoutFragment);
    }

    const device = this.model.device();
    if (device && this.model.type() === EmulationModel.DeviceModeModel.Type.Device) {
      fileName += `(${device.title})`;
    }
    const link = document.createElement('a');
    link.download = fileName + '.png';
    canvas.toBlob(blob => {
      if (blob === null) {
        return;
      }
      link.href = URL.createObjectURL(blob);
      link.click();
    });
  }
}

export class Ruler extends UI.Widget.VBox {
  private contentElementInternal: HTMLElement;
  private readonly horizontal: boolean;
  private scale: number;
  private count: number;
  private readonly throttler: Common.Throttler.Throttler;
  private readonly applyCallback: (arg0: number) => void;
  private renderedScale!: number|undefined;
  private renderedZoomFactor!: number|undefined;
  constructor(horizontal: boolean, applyCallback: (arg0: number) => void) {
    super();
    this.element.classList.add('device-mode-ruler');
    this.element.setAttribute('jslog', `${VisualLogging.deviceModeRuler().track({click: true})}`);
    this.contentElementInternal =
        this.element.createChild('div', 'device-mode-ruler-content').createChild('div', 'device-mode-ruler-inner') as
        HTMLDivElement;
    this.horizontal = horizontal;
    this.scale = 1;
    this.count = 0;
    this.throttler = new Common.Throttler.Throttler(0);
    this.applyCallback = applyCallback;
  }

  render(scale: number): void {
    this.scale = scale;
    void this.throttler.schedule(this.update.bind(this));
  }

  override onResize(): void {
    void this.throttler.schedule(this.update.bind(this));
  }

  private update(): Promise<void> {
    const zoomFactor = UI.ZoomManager.ZoomManager.instance().zoomFactor();
    const size = this.horizontal ? this.contentElementInternal.offsetWidth : this.contentElementInternal.offsetHeight;

    if (this.scale !== this.renderedScale || zoomFactor !== this.renderedZoomFactor) {
      this.contentElementInternal.removeChildren();
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
        const lastChild = this.contentElementInternal.lastChild;
        if (lastChild) {
          lastChild.remove();
        }
      }
    }

    for (let i = this.count; i < count; i++) {
      if (i % step) {
        continue;
      }
      const marker = this.contentElementInternal.createChild('div', 'device-mode-ruler-marker');
      if (i) {
        if (this.horizontal) {
          marker.style.left = (5 * i) * this.scale / zoomFactor + 'px';
        } else {
          marker.style.top = (5 * i) * this.scale / zoomFactor + 'px';
        }
        if (!(i % 20)) {
          const text = marker.createChild('div', 'device-mode-ruler-text');
          text.textContent = String(i * 5);
          text.addEventListener('click', this.onMarkerClick.bind(this, i * 5), false);
        }
      }
      if (!(i % 10)) {
        marker.classList.add('device-mode-ruler-marker-large');
      } else if (!(i % 5)) {
        marker.classList.add('device-mode-ruler-marker-medium');
      }
    }

    this.count = count;
    return Promise.resolve();
  }

  private onMarkerClick(size: number): void {
    this.applyCallback.call(null, size);
  }
}

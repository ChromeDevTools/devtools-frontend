// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { DeviceModeToolbar } from './DeviceModeToolbar.js';
import deviceModeViewStyles from './deviceModeView.css.js';
import { MediaQueryInspector } from './MediaQueryInspector.js';
const { classMap, styleMap } = Directives;
const UIStrings = {
    /**
     * @description Bottom resizer element title in Device Mode View of the Device Toolbar
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
    wrapperInstance;
    model;
    mediaInspector;
    showMediaInspectorSetting;
    showRulersSetting;
    topRuler;
    leftRuler;
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
        this.setMinimumSize(150, 150);
        this.element.classList.add('device-mode-view');
        this.registerRequiredCSS(deviceModeViewStyles);
        this.model = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
        this.model.addEventListener("Updated" /* EmulationModel.DeviceModeModel.Events.UPDATED */, this.updateUI, this);
        this.mediaInspector = new MediaQueryInspector(() => this.model.appliedDeviceSize().width, this.model.setWidth.bind(this.model), new Common.Throttler.Throttler(0));
        this.showMediaInspectorSetting = Common.Settings.Settings.instance().moduleSetting('show-media-query-inspector');
        this.showMediaInspectorSetting.addChangeListener(this.updateUI, this);
        this.showRulersSetting = Common.Settings.Settings.instance().moduleSetting('emulation.show-rulers');
        this.showRulersSetting.addChangeListener(this.updateUI, this);
        this.topRuler = new Ruler();
        this.topRuler.horizontal = true;
        this.topRuler.addEventListener("MarkerSelected" /* RulerEvents.MARKER_SELECTED */, event => {
            this.model.setWidthAndScaleToFit(event.data);
        });
        this.topRuler.element.classList.add('device-mode-ruler-top');
        this.leftRuler = new Ruler();
        this.leftRuler.horizontal = false;
        this.leftRuler.addEventListener("MarkerSelected" /* RulerEvents.MARKER_SELECTED */, event => {
            this.model.setHeightAndScaleToFit(event.data);
        });
        this.leftRuler.element.classList.add('device-mode-ruler-left');
        this.createUI();
        UI.ZoomManager.ZoomManager.instance().addEventListener("ZoomChanged" /* UI.ZoomManager.Events.ZOOM_CHANGED */, this.zoomChanged, this);
    }
    createUI() {
        this.toolbar = new DeviceModeToolbar(this.model, this.showMediaInspectorSetting, this.showRulersSetting);
        this.toolbar.show(this.contentElement);
        this.contentClip = this.contentElement.createChild('div', 'device-mode-content-clip vbox');
        this.responsivePresetsContainer = this.contentClip.createChild('div', 'device-mode-presets-container');
        this.responsivePresetsContainer.setAttribute('jslog', `${VisualLogging.responsivePresets()}`);
        this.renderPresets();
        this.mediaInspectorContainer = this.contentClip.createChild('div', 'device-mode-media-container');
        this.contentArea = this.contentClip.createChild('div', 'device-mode-content-area');
        this.outlineImage = this.contentArea.createChild('img', 'device-mode-outline-image hidden fill');
        this.outlineImage.addEventListener('load', this.onImageLoaded.bind(this, this.outlineImage, true), false);
        this.outlineImage.addEventListener('error', this.onImageLoaded.bind(this, this.outlineImage, false), false);
        this.screenArea = this.contentArea.createChild('div', 'device-mode-screen-area');
        this.screenImage = this.screenArea.createChild('img', 'device-mode-screen-image hidden');
        this.screenImage.addEventListener('load', this.onImageLoaded.bind(this, this.screenImage, true), false);
        this.screenImage.addEventListener('error', this.onImageLoaded.bind(this, this.screenImage, false), false);
        this.bottomRightResizerElement =
            this.screenArea.createChild('div', 'device-mode-resizer device-mode-bottom-right-resizer');
        this.bottomRightResizerElement.createChild('div', '');
        this.createResizer(this.bottomRightResizerElement, 2, 1);
        this.bottomLeftResizerElement =
            this.screenArea.createChild('div', 'device-mode-resizer device-mode-bottom-left-resizer');
        this.bottomLeftResizerElement.createChild('div', '');
        this.createResizer(this.bottomLeftResizerElement, -2, 1);
        this.rightResizerElement = this.screenArea.createChild('div', 'device-mode-resizer device-mode-right-resizer');
        this.rightResizerElement.createChild('div', '');
        this.createResizer(this.rightResizerElement, 2, 0);
        this.leftResizerElement = this.screenArea.createChild('div', 'device-mode-resizer device-mode-left-resizer');
        this.leftResizerElement.createChild('div', '');
        this.createResizer(this.leftResizerElement, -2, 0);
        this.bottomResizerElement = this.screenArea.createChild('div', 'device-mode-resizer device-mode-bottom-resizer');
        this.bottomResizerElement.createChild('div', '');
        this.createResizer(this.bottomResizerElement, 0, 1);
        this.bottomResizerElement.addEventListener('dblclick', this.model.setHeight.bind(this.model, 0), false);
        UI.Tooltip.Tooltip.install(this.bottomResizerElement, i18nString(UIStrings.doubleclickForFullHeight));
        this.pageArea = this.screenArea.createChild('div', 'device-mode-page-area');
        this.pageArea.createChild('slot');
    }
    renderPresets() {
        const scale = this.model.scale();
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
        const applySize = (width, e) => {
            this.model.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
            this.model.setWidthAndScaleToFit(width);
            e.consume();
        };
        // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
        render(html `
      <div class="device-mode-presets-container-inner">
        ${sizes.map((size, idx) => html `
          <div class="fill device-mode-preset-bar-outer">
            <div class="device-mode-preset-bar"
                 style="width: ${size * scale}px;"
                 jslog=${VisualLogging.action().track({ click: true }).context(`device-mode-preset-${size}px`)}
                 @click=${(e) => applySize(size, e)}>
              <span>${titles[idx]} – ${size}px</span>
            </div>
          </div>
        `).reverse()}
      </div>
    `, this.responsivePresetsContainer);
    }
    createResizer(element, widthFactor, heightFactor) {
        const resizer = new UI.ResizerWidget.ResizerWidget();
        element.setAttribute('jslog', `${VisualLogging.slider('device-mode-resizer').track({ drag: true })}`);
        resizer.addElement(element);
        let cursor = widthFactor ? 'ew-resize' : 'ns-resize';
        if (widthFactor * heightFactor > 0) {
            cursor = 'nwse-resize';
        }
        if (widthFactor * heightFactor < 0) {
            cursor = 'nesw-resize';
        }
        resizer.setCursor(cursor);
        resizer.addEventListener("ResizeStart" /* UI.ResizerWidget.Events.RESIZE_START */, this.onResizeStart, this);
        resizer.addEventListener("ResizeUpdateXY" /* UI.ResizerWidget.Events.RESIZE_UPDATE_XY */, this.onResizeUpdate.bind(this, widthFactor, heightFactor));
        resizer.addEventListener("ResizeEnd" /* UI.ResizerWidget.Events.RESIZE_END */, this.onResizeEnd, this);
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
            const dipOffsetX = cssOffsetX * UI.ZoomManager.ZoomManager.instance().zoomFactor();
            let newWidth = this.resizeStart.width + dipOffsetX * widthFactor;
            newWidth = Math.round(newWidth / this.model.scale());
            if (newWidth >= EmulationModel.DeviceModeModel.MinDeviceSize &&
                newWidth <= EmulationModel.DeviceModeModel.MaxDeviceSize) {
                this.model.setWidth(newWidth);
            }
        }
        if (heightFactor && this.resizeStart) {
            const dipOffsetY = cssOffsetY * UI.ZoomManager.ZoomManager.instance().zoomFactor();
            let newHeight = this.resizeStart.height + dipOffsetY * heightFactor;
            newHeight = Math.round(newHeight / this.model.scale());
            if (newHeight >= EmulationModel.DeviceModeModel.MinDeviceSize &&
                newHeight <= EmulationModel.DeviceModeModel.MaxDeviceSize) {
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
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.ResizedViewInResponsiveMode);
    }
    updateUI() {
        function applyRect(element, rect) {
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
        const mediaInspectorVisible = this.showMediaInspectorSetting.get() && this.model.type() !== EmulationModel.DeviceModeModel.Type.None;
        if (mediaInspectorVisible !== this.cachedMediaInspectorVisible) {
            if (mediaInspectorVisible) {
                this.mediaInspector.show(this.mediaInspectorContainer);
            }
            else {
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
            }
            else {
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
            this.renderPresets();
            this.cachedScale = this.model.scale();
        }
        this.toolbar.requestUpdate();
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
        if (element.getAttribute('srcset') === srcset) {
            return;
        }
        element.setAttribute('srcset', srcset);
        if (!srcset) {
            element.classList.toggle('hidden', true);
        }
    }
    onImageLoaded(element, success) {
        element.classList.toggle('hidden', !success);
    }
    setNonEmulatedAvailableSize(element) {
        if (this.model.type() !== EmulationModel.DeviceModeModel.Type.None) {
            return;
        }
        const zoomFactor = UI.ZoomManager.ZoomManager.instance().zoomFactor();
        const rect = element.getBoundingClientRect();
        const availableSize = new Geometry.Size(Math.max(rect.width * zoomFactor, 1), Math.max(rect.height * zoomFactor, 1));
        this.model.setAvailableSize(availableSize, availableSize);
    }
    contentAreaResized() {
        const zoomFactor = UI.ZoomManager.ZoomManager.instance().zoomFactor();
        const rect = this.contentArea.getBoundingClientRect();
        const availableSize = new Geometry.Size(Math.max(rect.width * zoomFactor, 1), Math.max(rect.height * zoomFactor, 1));
        const preferredSize = new Geometry.Size(Math.max((rect.width - 2 * (this.handleWidth || 0)) * zoomFactor, 1), Math.max((rect.height - (this.handleHeight || 0)) * zoomFactor, 1));
        this.model.setAvailableSize(availableSize, preferredSize);
    }
    measureHandles() {
        const hidden = this.rightResizerElement.classList.contains('hidden');
        this.rightResizerElement.classList.toggle('hidden', false);
        this.bottomResizerElement.classList.toggle('hidden', false);
        this.handleWidth = this.rightResizerElement.offsetWidth;
        this.handleHeight = this.bottomResizerElement.offsetHeight;
        this.rightResizerElement.classList.toggle('hidden', hidden);
        this.bottomResizerElement.classList.toggle('hidden', hidden);
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
        this.model.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
    }
    async captureScreenshot() {
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
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
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
            this.saveScreenshot((canvas));
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
        pageImage.src = 'data:image/png;base64,' + screenshot;
        pageImage.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = pageImage.naturalWidth;
            // Cap the height to not hit the GPU limit.
            // https://crbug.com/1260828
            canvas.height = Math.min((1 << 14), Math.floor(pageImage.naturalHeight));
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
                throw new Error('Could not get 2d context for base64 screenshot.');
            }
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(pageImage, 0, 0);
            this.saveScreenshot((canvas));
        };
    }
    paintImage(ctx, src, rect) {
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
    saveScreenshot(canvas) {
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
export const DEFAULT_RULER_VIEW = (input, output, target) => {
    const zoomFactor = UI.ZoomManager.ZoomManager.instance().zoomFactor();
    const size = input.horizontal ? target.offsetWidth : target.offsetHeight;
    const dipSize = size * zoomFactor / input.scale;
    const count = Math.ceil(dipSize / 5);
    let step = 1;
    if (input.scale < 0.8) {
        step = 2;
    }
    if (input.scale < 0.6) {
        step = 4;
    }
    if (input.scale < 0.4) {
        step = 8;
    }
    if (input.scale < 0.2) {
        step = 16;
    }
    if (input.scale < 0.1) {
        step = 32;
    }
    const markers = [];
    for (let i = 0; i < count; i++) {
        if (i % step) {
            continue;
        }
        const isLarge = !(i % 10);
        const isMedium = !(i % 5);
        const offset = i ? `${(5 * i) * input.scale / zoomFactor}px` : undefined;
        // clang-format off
        markers.push(html `
      <div
        class=${classMap({
            'device-mode-ruler-marker': true,
            'device-mode-ruler-marker-large': isLarge,
            'device-mode-ruler-marker-medium': isMedium && !isLarge,
        })}
        style=${styleMap(input.horizontal ? { left: offset } : { top: offset })}>
          ${i && !(i % 20) ?
            html `<div class="device-mode-ruler-text" @click=${() => input.onMarkerClick(i * 5)}>${i * 5}</div>` :
            nothing}
      </div>
    `);
        // clang-format on
    }
    render(html `
    <div class="device-mode-ruler-content">
      <div class="device-mode-ruler-inner">
        ${markers}
      </div>
    </div>
  `, target, {
        container: {
            classes: ['device-mode-ruler'],
            attributes: { jslog: VisualLogging.deviceModeRuler().track({ click: true }) },
        },
    });
};
export class Ruler extends Common.ObjectWrapper.eventMixin(UI.Widget.Widget) {
    #view;
    #horizontal = true;
    #scale = 1;
    constructor(element, view = DEFAULT_RULER_VIEW) {
        super(element);
        this.#view = view;
    }
    get horizontal() {
        return this.#horizontal;
    }
    set horizontal(horizontal) {
        if (this.#horizontal === horizontal) {
            return;
        }
        this.#horizontal = horizontal;
        this.requestUpdate();
    }
    get scale() {
        return this.#scale;
    }
    set scale(scale) {
        if (this.#scale === scale) {
            return;
        }
        this.#scale = scale;
        this.requestUpdate();
    }
    render(scale) {
        this.scale = scale;
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    onResize() {
        super.onResize();
        this.requestUpdate();
    }
    #onMarkerClick = (size) => {
        this.dispatchEventToListeners("MarkerSelected" /* RulerEvents.MARKER_SELECTED */, size);
    };
    performUpdate() {
        if (!this.isShowing()) {
            return;
        }
        const viewInput = {
            horizontal: this.#horizontal,
            scale: this.#scale,
            onMarkerClick: this.#onMarkerClick,
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
}
//# sourceMappingURL=DeviceModeView.js.map
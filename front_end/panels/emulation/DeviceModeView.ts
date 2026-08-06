// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {DeviceModeToolbar} from './DeviceModeToolbar.js';
import deviceModeViewStyles from './deviceModeView.css.js';
import {InspectedPagePlaceholder} from './InspectedPagePlaceholder.js';
import {MediaQueryInspector} from './MediaQueryInspector.js';

const {classMap, ref, styleMap} = Directives;
const {widget} = UI.Widget;

const UIStrings = {
  /**
   * @description Title of the bottom resizer element in the device mode view of the device mode toolbar.
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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/emulation/DeviceModeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface DeviceModeViewInput {
  model: EmulationModel.DeviceModeModel.DeviceModeModel;
  showDeviceMode: boolean;
  showMediaInspectorSetting: Common.Settings.Setting<boolean>;
  showRulersSetting: Common.Settings.Setting<boolean>;
  resizable: boolean;
  showRulers: boolean;
  showMediaInspector: boolean;
  scale: number;
  cachedCssScreenRect?: EmulationModel.DeviceModeModel.Rect;
  cachedCssVisiblePageRect?: EmulationModel.DeviceModeModel.Rect;
  onApplyPresetSize: (size: number, e: Event) => void;
  bottomRightResizer: UI.ResizerWidget.ResizerWidget;
  bottomLeftResizer: UI.ResizerWidget.ResizerWidget;
  rightResizer: UI.ResizerWidget.ResizerWidget;
  leftResizer: UI.ResizerWidget.ResizerWidget;
  bottomResizer: UI.ResizerWidget.ResizerWidget;
  bottomRightResizerRef: (el?: Element) => void;
  bottomLeftResizerRef: (el?: Element) => void;
  rightResizerRef: (el?: Element) => void;
  leftResizerRef: (el?: Element) => void;
  bottomResizerRef: (el?: Element) => void;
  onDoubleclickBottomResizer: () => void;
}

export type DeviceModeViewView = (
    input: DeviceModeViewInput,
    output: undefined,
    target: HTMLElement,
    ) => void;

function resizerRef(
    resizer: UI.ResizerWidget.ResizerWidget,
    onConnect?: (el: HTMLElement) => void,
    ): (el?: Element) => void {
  let oldEl: HTMLElement|undefined;
  return (el?: Element) => {
    if (el instanceof HTMLElement) {
      if (oldEl === el) {
        return;
      }
      if (oldEl) {
        resizer.removeElement(oldEl);
      }
      oldEl = el;
      resizer.addElement(el);
      onConnect?.(el);
    } else if (oldEl) {
      resizer.removeElement(oldEl);
      oldEl = undefined;
    }
  };
}

export const DEFAULT_DEVICE_MODE_VIEW: DeviceModeViewView = (
    input: DeviceModeViewInput,
    _output: undefined,
    target: HTMLElement,
    ): void => {
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
  // clang-format off
  render(input.showDeviceMode
    ? html`${UI.Widget.widget(DeviceModeToolbar, {model: input.model})}
    <div class=${classMap({
      'device-mode-content-clip': true,
      vbox: true,
      'device-mode-rulers-visible': input.showRulers,
    })}>
      <div class="device-mode-presets-container" jslog=${VisualLogging.responsivePresets()}>
        <div class="device-mode-presets-container-inner">
          ${sizes.map((size, idx) => html`
            <div class="fill device-mode-preset-bar-outer">
              <div class="device-mode-preset-bar"
                   style="width: ${size * input.scale}px;"
                   jslog=${VisualLogging.action().track({click: true}).context(`device-mode-preset-${size}px`)}
                   @click=${(e: Event) => input.onApplyPresetSize(size, e)}>
                <span>${titles[idx]} – ${size}px</span>
              </div>
            </div>
          `).reverse()}
        </div>
      </div>
      <div class="device-mode-media-container">
        ${input.showMediaInspector ? widget(MediaQueryInspector, {
                                       scale: input.scale,
                                       getWidthCallback: () => input.model.appliedDeviceSize().width,
                                       setWidthCallback:  input.model.setWidth.bind(input.model),
                                     }) : nothing}
      </div>
      <div class="device-mode-content-area">
        <div class="device-mode-screen-area"
             style=${styleMap(input.cachedCssScreenRect ? {
               left: `${input.cachedCssScreenRect.left}px`,
               top: `${input.cachedCssScreenRect.top}px`,
               width: `${input.cachedCssScreenRect.width}px`,
               height: `${input.cachedCssScreenRect.height}px`,
             } : {})}>
          <div class="device-mode-resizer device-mode-bottom-right-resizer"
               ?hidden=${!input.resizable}
               jslog=${VisualLogging.slider('device-mode-resizer').track({drag: true})}
               ${ref(input.bottomRightResizerRef)}>
            <div></div>
          </div>
          <div class="device-mode-resizer device-mode-bottom-left-resizer"
               ?hidden=${!input.resizable}
               jslog=${VisualLogging.slider('device-mode-resizer').track({drag: true})}
               ${ref(input.bottomLeftResizerRef)}>
            <div></div>
          </div>
          <div class="device-mode-resizer device-mode-right-resizer"
               ?hidden=${!input.resizable}
               jslog=${VisualLogging.slider('device-mode-resizer').track({drag: true})}
               ${ref(input.rightResizerRef)}>
            <div></div>
          </div>
          <div class="device-mode-resizer device-mode-left-resizer"
               ?hidden=${!input.resizable}
               jslog=${VisualLogging.slider('device-mode-resizer').track({drag: true})}
               ${ref(input.leftResizerRef)}>
            <div></div>
          </div>
          <div class="device-mode-resizer device-mode-bottom-resizer"
               ?hidden=${!input.resizable}
               jslog=${VisualLogging.slider('device-mode-resizer').track({drag: true})}
               title=${i18nString(UIStrings.doubleclickForFullHeight)}
               ${ref(input.bottomResizerRef)}
               @dblclick=${input.onDoubleclickBottomResizer}>
            <div></div>
          </div>
          <div class="device-mode-page-area"
               style=${styleMap(input.cachedCssVisiblePageRect ? {
                 left: `${input.cachedCssVisiblePageRect.left}px`,
                 top: `${input.cachedCssVisiblePageRect.top}px`,
                 width: `${input.cachedCssVisiblePageRect.width}px`,
                 height: `${input.cachedCssVisiblePageRect.height}px`,
               } : {})}>
            ${widget(() => InspectedPagePlaceholder.instance(), {minimumSize: new Geometry.Size(1, 1)})}
          </div>
        </div>
        ${input.showRulers ? html`
          <devtools-widget class="device-mode-ruler-top device-mode-ruler"
              style=${styleMap({left: `${input.cachedCssScreenRect?.left ?? 0}px`, top: `${input.cachedCssScreenRect?.top ?? 0}px`})}
              ${UI.Widget.widget(Ruler, {
                scale: input.scale,
                horizontal: true,
              })}
              @device-mode-ruler-marker-selected=${(e: CustomEvent<number>): void => input.model.setWidthAndScaleToFit(e.detail)}>
          </devtools-widget>
          <devtools-widget class="device-mode-ruler-left device-mode-ruler"
              style=${styleMap({left: `${input.cachedCssScreenRect?.left ?? 0}px`, top: `${input.cachedCssScreenRect?.top ?? 0}px`})}
              ${UI.Widget.widget(Ruler, {
                scale: input.scale,
                horizontal: false,
              })}
              @device-mode-ruler-marker-selected=${(e: CustomEvent<number>): void => input.model.setHeightAndScaleToFit(e.detail)}>
          </devtools-widget>
        ` : nothing}
      </div>
    </div>
  `
  : widget(() => InspectedPagePlaceholder.instance(), {minimumSize: new Geometry.Size(150, 150)}),
  target, {
    container: {
      classes: ['device-mode-view'],
    },
  });
  // clang-format on
};

export class DeviceModeView extends UI.Widget.VBox {
  wrapperInstance!: UI.Widget.VBox|null;
  private model: EmulationModel.DeviceModeModel.DeviceModeModel;
  private showMediaInspectorSetting: Common.Settings.Setting<boolean>;
  private showRulersSetting: Common.Settings.Setting<boolean>;
  private readonly bottomRightResizer = this.createResizer(2, 1);
  private readonly bottomLeftResizer = this.createResizer(-2, 1);
  private readonly rightResizer = this.createResizer(2, 0);
  private readonly leftResizer = this.createResizer(-2, 0);
  private readonly bottomResizer = this.createResizer(0, 1);
  private readonly bottomRightResizerRef = resizerRef(this.bottomRightResizer);
  private readonly bottomLeftResizerRef = resizerRef(this.bottomLeftResizer);
  private readonly rightResizerRef = resizerRef(this.rightResizer);
  private readonly leftResizerRef = resizerRef(this.leftResizer);
  private readonly bottomResizerRef = resizerRef(this.bottomResizer);
  private slowPositionStart?: {
    x: number,
    y: number,
  }|null;
  private resizeStart?: Geometry.Size;
  private cachedCssScreenRect?: EmulationModel.DeviceModeModel.Rect;
  private cachedCssVisiblePageRect?: EmulationModel.DeviceModeModel.Rect;
  private cachedMediaInspectorVisible?: boolean;
  private cachedShowRulers?: boolean;
  private cachedScale?: number;
  readonly #toggleDeviceModeAction: UI.ActionRegistration.Action;
  readonly #showDeviceModeSetting: Common.Settings.Setting<boolean>;
  #view: DeviceModeViewView;

  constructor(element?: HTMLElement, view: DeviceModeViewView = DEFAULT_DEVICE_MODE_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;

    this.setMinimumSize(150, 150);
    this.registerRequiredCSS(deviceModeViewStyles);

    this.model = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
    this.model.addEventListener(EmulationModel.DeviceModeModel.Events.UPDATED, this.updateUI, this);
    this.showMediaInspectorSetting = Common.Settings.Settings.instance().moduleSetting('show-media-query-inspector');
    this.showMediaInspectorSetting.addChangeListener(this.updateUI, this);
    this.showRulersSetting = Common.Settings.Settings.instance().moduleSetting('emulation.show-rulers');
    this.showRulersSetting.addChangeListener(this.updateUI, this);

    this.#toggleDeviceModeAction =
        UI.ActionRegistry.ActionRegistry.instance().getAction('emulation.toggle-device-mode');
    const model = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
    this.#showDeviceModeSetting = model.enabledSetting();
    this.#showDeviceModeSetting.setRequiresUserAction(Boolean(Root.Runtime.Runtime.queryParam('hasOtherClients')));
    this.#showDeviceModeSetting.addChangeListener(this.requestUpdate.bind(this));
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.OverlayModel.OverlayModel,
                                                                SDK.OverlayModel.Events.SCREENSHOT_REQUESTED,
                                                                this.screenshotRequestedFromOverlay, this);

    this.performUpdate();
    UI.ZoomManager.ZoomManager.instance().addEventListener(UI.ZoomManager.Events.ZOOM_CHANGED, this.zoomChanged, this);
  }

  override performUpdate(): void {
    this.#toggleDeviceModeAction.setToggled(this.#showDeviceModeSetting.get());
    const input: DeviceModeViewInput = {
      model: this.model,
      showDeviceMode: this.#showDeviceModeSetting.get(),
      showMediaInspectorSetting: this.showMediaInspectorSetting,
      showRulersSetting: this.showRulersSetting,
      resizable: this.model.type() === EmulationModel.DeviceModeModel.Type.Responsive,
      showRulers: this.showRulersSetting.get() && this.model.type() !== EmulationModel.DeviceModeModel.Type.None,
      showMediaInspector:
          this.showMediaInspectorSetting.get() && this.model.type() !== EmulationModel.DeviceModeModel.Type.None,
      scale: this.model.scale(),
      cachedCssScreenRect: this.cachedCssScreenRect,
      cachedCssVisiblePageRect: this.cachedCssVisiblePageRect,
      onApplyPresetSize: (width: number, e: Event): void => {
        this.model.emulate(EmulationModel.DeviceModeModel.Type.Responsive, null, null);
        this.model.setWidthAndScaleToFit(width);
        e.consume();
      },
      bottomRightResizer: this.bottomRightResizer,
      bottomLeftResizer: this.bottomLeftResizer,
      rightResizer: this.rightResizer,
      leftResizer: this.leftResizer,
      bottomResizer: this.bottomResizer,
      bottomRightResizerRef: this.bottomRightResizerRef,
      bottomLeftResizerRef: this.bottomLeftResizerRef,
      rightResizerRef: this.rightResizerRef,
      leftResizerRef: this.leftResizerRef,
      bottomResizerRef: this.bottomResizerRef,
      onDoubleclickBottomResizer: (): void => this.model.setHeight(0),
    };
    this.#view(input, undefined, this.contentElement);
  }

  static #setNonEmulatedAvailableSize(): void {
    const model = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
    if (model.type() !== EmulationModel.DeviceModeModel.Type.None) {
      return;
    }

    const zoomFactor = UI.ZoomManager.ZoomManager.instance().zoomFactor();
    const rect = InspectedPagePlaceholder.instance().element.getBoundingClientRect();
    const availableSize =
        new Geometry.Size(Math.max(rect.width * zoomFactor, 1), Math.max(rect.height * zoomFactor, 1));
    model.setAvailableSize(availableSize, availableSize);
  }

  static captureScreenshot(fullSize?: boolean, clip?: Protocol.Page.Viewport): boolean {
    const model = EmulationModel.DeviceModeModel.DeviceModeModel.instance();

    this.#setNonEmulatedAvailableSize();
    if (fullSize) {
      void model.captureFullSizeScreenshot();
    } else if (clip) {
      void model.captureAreaScreenshot(clip);
    } else {
      void model.captureScreenshot();
    }
    return true;
  }

  private screenshotRequestedFromOverlay(event: Common.EventTarget.EventTargetEvent<Protocol.Page.Viewport>): void {
    const clip = event.data;
    DeviceModeView.captureScreenshot(false, clip);
  }

  private createResizer(widthFactor: number, heightFactor: number): UI.ResizerWidget.ResizerWidget {
    const resizer = new UI.ResizerWidget.ResizerWidget();
    let cursor: 'nwse-resize'|'nesw-resize'|('ew-resize' | 'ns-resize') = widthFactor ? 'ew-resize' : 'ns-resize';
    if (widthFactor * heightFactor > 0) {
      cursor = 'nwse-resize';
    }
    if (widthFactor * heightFactor < 0) {
      cursor = 'nesw-resize';
    }
    resizer.setCursor(cursor);
    resizer.addEventListener(
        UI.ResizerWidget.Events.RESIZE_START,
        this.onResizeStart,
        this,
    );
    resizer.addEventListener(
        UI.ResizerWidget.Events.RESIZE_UPDATE_XY,
        this.onResizeUpdate.bind(this, widthFactor, heightFactor),
    );
    resizer.addEventListener(
        UI.ResizerWidget.Events.RESIZE_END,
        this.onResizeEnd,
        this,
    );
    return resizer;
  }

  private onResizeStart(): void {
    this.slowPositionStart = null;
    const rect = this.model.screenRect();
    this.resizeStart = new Geometry.Size(rect.width, rect.height);
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
    if (!this.isShowing()) {
      return;
    }

    const zoomFactor = UI.ZoomManager.ZoomManager.instance().zoomFactor();
    let callDoResize = false;
    const showRulers = this.showRulersSetting.get() && this.model.type() !== EmulationModel.DeviceModeModel.Type.None;
    let contentAreaResized = false;

    const cssScreenRect = this.model.screenRect().scale(1 / zoomFactor);
    if (!this.cachedCssScreenRect || !cssScreenRect.isEqual(this.cachedCssScreenRect)) {
      callDoResize = true;
      this.cachedCssScreenRect = cssScreenRect;
    }

    const cssVisiblePageRect = this.model.visiblePageRect().scale(1 / zoomFactor);
    if (!this.cachedCssVisiblePageRect || !cssVisiblePageRect.isEqual(this.cachedCssVisiblePageRect)) {
      callDoResize = true;
      this.cachedCssVisiblePageRect = cssVisiblePageRect;
    }

    const mediaInspectorVisible =
        this.showMediaInspectorSetting.get() && this.model.type() !== EmulationModel.DeviceModeModel.Type.None;
    if (mediaInspectorVisible !== this.cachedMediaInspectorVisible) {
      contentAreaResized = true;
      callDoResize = true;
      this.cachedMediaInspectorVisible = mediaInspectorVisible;
    }

    if (showRulers !== this.cachedShowRulers) {
      contentAreaResized = true;
      callDoResize = true;
      this.cachedShowRulers = showRulers;
    }

    if (this.model.scale() !== this.cachedScale) {
      callDoResize = true;
      this.cachedScale = this.model.scale();
    }

    this.requestUpdate();
    void this.updateComplete.then(() => {
      if (callDoResize) {
        this.doResize();
      }
      if (contentAreaResized) {
        this.contentAreaResized();
      }
    });
  }

  private contentAreaResized(): void {
    const contentArea = this.contentElement.querySelector<HTMLElement>('.device-mode-content-area');
    if (!contentArea) {
      return;
    }
    const rect = contentArea.getBoundingClientRect();
    const zoomFactor = UI.ZoomManager.ZoomManager.instance().zoomFactor();
    const handleWidth = this.contentElement.querySelector<HTMLElement>('.device-mode-right-resizer')?.offsetWidth || 20;
    const handleHeight =
        this.contentElement.querySelector<HTMLElement>('.device-mode-bottom-resizer')?.offsetHeight || 20;
    const availableSize =
        new Geometry.Size(Math.max(rect.width * zoomFactor, 1), Math.max(rect.height * zoomFactor, 1));
    const preferredSize = new Geometry.Size(Math.max((rect.width - 2 * handleWidth) * zoomFactor, 1),
                                            Math.max((rect.height - handleHeight) * zoomFactor, 1));
    this.model.setAvailableSize(availableSize, preferredSize);
  }

  private zoomChanged(): void {
    if (this.isShowing()) {
      this.contentAreaResized();
    }
  }

  override onResize(): void {
    if (this.isShowing()) {
      this.contentAreaResized();
    }
  }

  override wasShown(): void {
    super.wasShown();
  }

  override willHide(): void {
    super.willHide();
    this.model.emulate(EmulationModel.DeviceModeModel.Type.None, null, null);
    this.model.exitHingeMode();
  }
}

export interface RulerViewInput {
  horizontal: boolean;
  scale: number;
  onMarkerClick: (size: number) => void;
}

export type RulerView = (input: RulerViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_RULER_VIEW: RulerView = (input: RulerViewInput, output: undefined, target: HTMLElement): void => {
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
    markers.push(html`
      <div
        class=${classMap({
          'device-mode-ruler-marker': true,
          'device-mode-ruler-marker-large': isLarge,
          'device-mode-ruler-marker-medium': isMedium && !isLarge,
        })}
        style=${styleMap(input.horizontal ? {left: offset} : {top: offset})}>
          ${i && !(i % 20) ?
            html`<div class="device-mode-ruler-text" @click=${() => input.onMarkerClick(i * 5)}>${i * 5}</div>` :
            nothing}
      </div>
    `);
    // clang-format on
  }

  render(html`
    <div class="device-mode-ruler-content">
      <div class="device-mode-ruler-inner">
        ${markers}
      </div>
    </div>
  `,
         target, {
           container: {
             classes: ['device-mode-ruler'],
             attributes: {jslog: VisualLogging.deviceModeRuler().track({click: true})},
           },
         });
};

export const enum RulerEvents {
  MARKER_SELECTED = 'MarkerSelected',
}

export interface RulerEventTypes {
  [RulerEvents.MARKER_SELECTED]: number;
}

export class Ruler extends Common.ObjectWrapper.eventMixin<RulerEventTypes, typeof UI.Widget.Widget>(UI.Widget.Widget) {
  #view: RulerView;
  #horizontal = true;
  #scale = 1;

  constructor(element?: HTMLElement, view: RulerView = DEFAULT_RULER_VIEW) {
    super(element);
    this.#view = view;
  }

  get horizontal(): boolean {
    return this.#horizontal;
  }

  set horizontal(horizontal: boolean) {
    if (this.#horizontal === horizontal) {
      return;
    }
    this.#horizontal = horizontal;
    this.requestUpdate();
  }

  get scale(): number {
    return this.#scale;
  }

  set scale(scale: number) {
    if (this.#scale === scale) {
      return;
    }
    this.#scale = scale;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override onResize(): void {
    super.onResize();
    this.requestUpdate();
  }

  #onMarkerClick = (size: number): void => {
    this.dispatchEventToListeners(RulerEvents.MARKER_SELECTED, size);
  };

  override performUpdate(): void {
    if (!this.isShowing()) {
      return;
    }
    const viewInput: RulerViewInput = {
      horizontal: this.#horizontal,
      scale: this.#scale,
      onMarkerClick: this.#onMarkerClick,
    };
    this.#view(viewInput, undefined, this.contentElement);
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    switch (actionId) {
      case 'emulation.capture-screenshot':
        return DeviceModeView.captureScreenshot();

      case 'emulation.capture-node-screenshot': {
        const node = context.flavor(SDK.DOMModel.DOMNode);
        if (!node) {
          return true;
        }
        async function captureClip(): Promise<void> {
          if (!node) {
            return;
          }

          // Resolve to a remote object to ensure the node is alive in the context.
          const object = await node.resolveToObject();
          if (!object) {
            return;
          }

          // Get the Box Model via CDP.
          // This returns the quads relative to the target's viewport.
          // We use the 'border' quad to include the border and padding in the screenshot,
          // matching the 'width' and 'height' properties which are also Border Box dimensions.
          const nodeBoxModel = await node.boxModel();
          if (!nodeBoxModel) {
            throw new Error(`Unable to get box model of the node: ${new Error().stack}`);
          }
          const nodeBorderQuad = nodeBoxModel.border;
          // Calculate the rendered bounding box from the border quad to account for CSS scaling and transforms (e.g. zoom or transform: scale).
          const {minX, maxX, minY, maxY} = getQuadBoundingBox(nodeBorderQuad);

          // Get Layout Metrics to account for the Visual Viewport scroll and zoom.
          const metrics = await node.domModel().target().pageAgent().invoke_getLayoutMetrics();
          if (metrics.getError()) {
            throw new Error(`Unable to get metrics: ${new Error().stack}`);
          }

          const scrollX = metrics.cssVisualViewport.pageX;
          const scrollY = metrics.cssVisualViewport.pageY;

          // Calculate the global offset for OOPiFs (Out-of-Process iframes).
          // This accounts for the position of the target's frame within the main page.
          const {x: oopifOffsetX, y: oopifOffsetY} = await getOopifOffset(node.domModel().target());

          // Assemble the final Clip.
          // The absolute coordinates are: Global (OOPiF) + Viewport Scroll + Local Node Position (Border Box).
          const clip = {
            x: oopifOffsetX + scrollX + minX,
            y: oopifOffsetY + scrollY + minY,
            width: maxX - minX,
            height: maxY - minY,
            scale: 1,
          };

          // Apply Zoom factor.
          const zoom = metrics.cssVisualViewport.zoom ?? 1;
          clip.x *= zoom;
          clip.y *= zoom;
          clip.width *= zoom;
          clip.height *= zoom;
          DeviceModeView.captureScreenshot(false, clip);
        }
        void captureClip();
        return true;
      }

      case 'emulation.capture-full-height-screenshot':
        return DeviceModeView.captureScreenshot(true);

      case 'emulation.toggle-device-mode': {
        const model = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
        model.toggleDeviceMode();
        return true;
      }
    }
    return false;
  }
}

/**
 * Calculate the offset of the "Local Root" frame relative to the "Global Root" (the main frame).
 * This involves traversing the CDP Targets for OOPiFs.
 */
async function getOopifOffset(target: SDK.Target.Target|null): Promise<{x: number, y: number}> {
  if (!target) {
    return {x: 0, y: 0};
  }

  // Get the parent target. If there's no parent (we are at root) or it's not a frame, we are done.
  const parentTarget = target.parentTarget();
  if (!parentTarget || parentTarget.type() !== SDK.Target.Type.FRAME) {
    return {x: 0, y: 0};
  }

  // Identify the current frame's ID to find its owner in the parent.
  const frameId = target.model(SDK.ResourceTreeModel.ResourceTreeModel)?.mainFrame?.id;
  if (!frameId) {
    return {x: 0, y: 0};
  }

  // Get the DOMModel of the parent to query the frame owner element.
  const parentDOMModel = parentTarget.model(SDK.DOMModel.DOMModel);
  if (!parentDOMModel) {
    return {x: 0, y: 0};
  }

  // Retrieve the frame owner node (e.g. the <iframe> element) in the parent's document.
  const frameOwnerDeferred = await parentDOMModel.getOwnerNodeForFrame(frameId);
  const frameOwner = await frameOwnerDeferred?.resolvePromise();
  if (!frameOwner) {
    return {x: 0, y: 0};
  }

  // Get the content box of the iframe element.
  // This is relative to the parent target's viewport.
  const boxModel = await frameOwner.boxModel();
  if (!boxModel) {
    return {x: 0, y: 0};
  }

  // content is a Quad [x1, y1, x2, y2, x3, y3, x4, y4]
  const contentQuad = boxModel.content;
  const iframeContentX = contentQuad[0];
  const iframeContentY = contentQuad[1];

  // Get the scroll position of the parent target to convert viewport-relative coordinates
  // to document-relative coordinates.
  const parentMetrics = await parentTarget.pageAgent().invoke_getLayoutMetrics();
  if (parentMetrics.getError()) {
    return {x: 0, y: 0};
  }

  const scrollX = parentMetrics.cssVisualViewport.pageX;
  const scrollY = parentMetrics.cssVisualViewport.pageY;

  // Recursively add the offset of the parent target itself (if it is also an OOPiF).
  const parentOffset = await getOopifOffset(parentTarget);

  return {
    x: iframeContentX + scrollX + parentOffset.x,
    y: iframeContentY + scrollY + parentOffset.y,
  };
}

/**
 * Calculate the axis-aligned bounding box for a Quad [x1, y1, x2, y2, x3, y3, x4, y4].
 * This accounts for CSS scaling and transforms (e.g. zoom, transform: scale).
 */
function getQuadBoundingBox(quad: Protocol.DOM.Quad): {minX: number, maxX: number, minY: number, maxY: number} {
  const minX = Math.min(quad[0], quad[2], quad[4], quad[6]);
  const maxX = Math.max(quad[0], quad[2], quad[4], quad[6]);
  const minY = Math.min(quad[1], quad[3], quad[5], quad[7]);
  const maxY = Math.max(quad[1], quad[3], quad[5], quad[7]);
  return {minX, maxX, minY, maxY};
}

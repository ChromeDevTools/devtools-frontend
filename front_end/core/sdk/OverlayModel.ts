// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';
import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';

import {type CSSModel} from './CSSModel.js';
import {DebuggerModel, Events as DebuggerModelEvents} from './DebuggerModel.js';
import {DeferredDOMNode, DOMModel, type DOMNode, Events as DOMModelEvents} from './DOMModel.js';
import {OverlayPersistentHighlighter} from './OverlayPersistentHighlighter.js';
import {type RemoteObject} from './RemoteObject.js';
import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';
import {TargetManager} from './TargetManager.js';

const UIStrings = {
  /**
   *@description Text in Overlay Model
   */
  pausedInDebugger: 'Paused in debugger',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/OverlayModel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface HighlightColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
  color: HighlightColor;
  outlineColor: HighlightColor;
}
export interface Hinge {
  width: number;
  height: number;
  x: number;
  y: number;
  contentColor: HighlightColor;
  outlineColor: HighlightColor;
}

export const enum EmulatedOSType {
  WINDOWS = 'Windows',
  MAC = 'Mac',
  LINUX = 'Linux',
}

interface PlatformOverlayDimensions {
  mac: {x: number, y: number, width: number, height: number};
  linux: {x: number, y: number, width: number, height: number};
  windows: {x: number, y: number, width: number, height: number};
}

const platformOverlayDimensions: Readonly<PlatformOverlayDimensions> = {
  mac: {x: 85, y: 0, width: 185, height: 40},
  linux: {x: 0, y: 0, width: 196, height: 34},
  windows: {x: 0, y: 0, width: 238, height: 33},
};

export class OverlayModel extends SDKModel<EventTypes> implements ProtocolProxyApi.OverlayDispatcher {
  readonly #domModel: DOMModel;
  overlayAgent: ProtocolProxyApi.OverlayApi;
  readonly #debuggerModel: DebuggerModel|null;
  #inspectModeEnabledInternal: boolean;
  #hideHighlightTimeout: number|null;
  #defaultHighlighter: Highlighter;
  #highlighter: Highlighter;
  #showPaintRectsSetting: Common.Settings.Setting<boolean>;
  #showLayoutShiftRegionsSetting: Common.Settings.Setting<boolean>;
  #showAdHighlightsSetting: Common.Settings.Setting<boolean>;
  #showDebugBordersSetting: Common.Settings.Setting<boolean>;
  #showFPSCounterSetting: Common.Settings.Setting<boolean>;
  #showScrollBottleneckRectsSetting: Common.Settings.Setting<boolean>;
  #registeredListeners: Common.EventTarget.EventDescriptor[];
  #showViewportSizeOnResize: boolean;
  #persistentHighlighter: OverlayPersistentHighlighter|null;
  readonly #sourceOrderHighlighter: SourceOrderHighlighter;
  #sourceOrderModeActiveInternal: boolean;
  #windowControls: WindowControls;

  constructor(target: Target) {
    super(target);
    this.#domModel = (target.model(DOMModel) as DOMModel);

    target.registerOverlayDispatcher(this);
    this.overlayAgent = target.overlayAgent();

    this.#debuggerModel = target.model(DebuggerModel);
    if (this.#debuggerModel) {
      Common.Settings.Settings.instance()
          .moduleSetting('disable-paused-state-overlay')
          .addChangeListener(this.updatePausedInDebuggerMessage, this);
      this.#debuggerModel.addEventListener(
          DebuggerModelEvents.DebuggerPaused, this.updatePausedInDebuggerMessage, this);
      this.#debuggerModel.addEventListener(
          DebuggerModelEvents.DebuggerResumed, this.updatePausedInDebuggerMessage, this);
      // TODO(dgozman): we should get DebuggerResumed on navigations instead of listening to GlobalObjectCleared.
      this.#debuggerModel.addEventListener(
          DebuggerModelEvents.GlobalObjectCleared, this.updatePausedInDebuggerMessage, this);
    }

    this.#inspectModeEnabledInternal = false;

    this.#hideHighlightTimeout = null;
    this.#defaultHighlighter = new DefaultHighlighter(this);
    this.#highlighter = this.#defaultHighlighter;

    this.#showPaintRectsSetting = Common.Settings.Settings.instance().moduleSetting<boolean>('show-paint-rects');
    this.#showLayoutShiftRegionsSetting =
        Common.Settings.Settings.instance().moduleSetting<boolean>('show-layout-shift-regions');
    this.#showAdHighlightsSetting = Common.Settings.Settings.instance().moduleSetting<boolean>('show-ad-highlights');
    this.#showDebugBordersSetting = Common.Settings.Settings.instance().moduleSetting<boolean>('show-debug-borders');
    this.#showFPSCounterSetting = Common.Settings.Settings.instance().moduleSetting<boolean>('show-fps-counter');
    this.#showScrollBottleneckRectsSetting =
        Common.Settings.Settings.instance().moduleSetting<boolean>('show-scroll-bottleneck-rects');

    this.#registeredListeners = [];
    this.#showViewportSizeOnResize = true;
    if (!target.suspended()) {
      void this.overlayAgent.invoke_enable();
      void this.wireAgentToSettings();
    }

    this.#persistentHighlighter = new OverlayPersistentHighlighter(this, {
      onGridOverlayStateChanged: ({nodeId, enabled}) =>
          this.dispatchEventToListeners(Events.PERSISTENT_GRID_OVERLAY_STATE_CHANGED, {nodeId, enabled}),
      onFlexOverlayStateChanged: ({nodeId, enabled}) =>
          this.dispatchEventToListeners(Events.PERSISTENT_FLEX_CONTAINER_OVERLAY_STATE_CHANGED, {nodeId, enabled}),
      onContainerQueryOverlayStateChanged: ({nodeId, enabled}) =>
          this.dispatchEventToListeners(Events.PERSISTENT_CONTAINER_QUERY_OVERLAY_STATE_CHANGED, {nodeId, enabled}),
      onScrollSnapOverlayStateChanged: ({nodeId, enabled}) =>
          this.dispatchEventToListeners(Events.PERSISTENT_SCROLL_SNAP_OVERLAY_STATE_CHANGED, {nodeId, enabled}),
    });
    this.#domModel.addEventListener(DOMModelEvents.NodeRemoved, () => {
      if (!this.#persistentHighlighter) {
        return;
      }

      this.#persistentHighlighter.refreshHighlights();
    });

    this.#domModel.addEventListener(DOMModelEvents.DocumentUpdated, () => {
      if (!this.#persistentHighlighter) {
        return;
      }

      // Hide all the overlays initially after document update
      this.#persistentHighlighter.hideAllInOverlayWithoutSave();

      if (!target.suspended()) {
        void this.#persistentHighlighter.restoreHighlightsForDocument();
      }
    });

    this.#sourceOrderHighlighter = new SourceOrderHighlighter(this);
    this.#sourceOrderModeActiveInternal = false;
    this.#windowControls = new WindowControls(this.#domModel.cssModel());
  }

  static highlightObjectAsDOMNode(object: RemoteObject): void {
    const domModel = object.runtimeModel().target().model(DOMModel);
    if (domModel) {
      domModel.overlayModel().highlightInOverlay({object, selectorList: undefined});
    }
  }

  static hideDOMNodeHighlight(): void {
    for (const overlayModel of TargetManager.instance().models(OverlayModel)) {
      overlayModel.delayedHideHighlight(0);
    }
  }

  static async muteHighlight(): Promise<void[]> {
    return Promise.all(TargetManager.instance().models(OverlayModel).map(model => model.suspendModel()));
  }

  static async unmuteHighlight(): Promise<void[]> {
    return Promise.all(TargetManager.instance().models(OverlayModel).map(model => model.resumeModel()));
  }

  static highlightRect(rect: HighlightRect): void {
    for (const overlayModel of TargetManager.instance().models(OverlayModel)) {
      void overlayModel.highlightRect(rect);
    }
  }

  static clearHighlight(): void {
    for (const overlayModel of TargetManager.instance().models(OverlayModel)) {
      void overlayModel.clearHighlight();
    }
  }

  getDOMModel(): DOMModel {
    return this.#domModel;
  }

  highlightRect({x, y, width, height, color, outlineColor}: HighlightRect):
      Promise<Protocol.ProtocolResponseWithError> {
    const highlightColor = color || {r: 255, g: 0, b: 255, a: 0.3};
    const highlightOutlineColor = outlineColor || {r: 255, g: 0, b: 255, a: 0.5};
    return this.overlayAgent.invoke_highlightRect(
        {x, y, width, height, color: highlightColor, outlineColor: highlightOutlineColor});
  }

  clearHighlight(): Promise<Protocol.ProtocolResponseWithError> {
    return this.overlayAgent.invoke_hideHighlight();
  }

  private async wireAgentToSettings(): Promise<void> {
    this.#registeredListeners = [
      this.#showPaintRectsSetting.addChangeListener(
          () => this.overlayAgent.invoke_setShowPaintRects({result: this.#showPaintRectsSetting.get()})),
      this.#showLayoutShiftRegionsSetting.addChangeListener(
          () =>
              this.overlayAgent.invoke_setShowLayoutShiftRegions({result: this.#showLayoutShiftRegionsSetting.get()})),
      this.#showAdHighlightsSetting.addChangeListener(
          () => this.overlayAgent.invoke_setShowAdHighlights({show: this.#showAdHighlightsSetting.get()})),
      this.#showDebugBordersSetting.addChangeListener(
          () => this.overlayAgent.invoke_setShowDebugBorders({show: this.#showDebugBordersSetting.get()})),
      this.#showFPSCounterSetting.addChangeListener(
          () => this.overlayAgent.invoke_setShowFPSCounter({show: this.#showFPSCounterSetting.get()})),
      this.#showScrollBottleneckRectsSetting.addChangeListener(
          () => this.overlayAgent.invoke_setShowScrollBottleneckRects(
              {show: this.#showScrollBottleneckRectsSetting.get()})),
    ];

    if (this.#showPaintRectsSetting.get()) {
      void this.overlayAgent.invoke_setShowPaintRects({result: true});
    }
    if (this.#showLayoutShiftRegionsSetting.get()) {
      void this.overlayAgent.invoke_setShowLayoutShiftRegions({result: true});
    }
    if (this.#showAdHighlightsSetting.get()) {
      void this.overlayAgent.invoke_setShowAdHighlights({show: true});
    }
    if (this.#showDebugBordersSetting.get()) {
      void this.overlayAgent.invoke_setShowDebugBorders({show: true});
    }
    if (this.#showFPSCounterSetting.get()) {
      void this.overlayAgent.invoke_setShowFPSCounter({show: true});
    }
    if (this.#showScrollBottleneckRectsSetting.get()) {
      void this.overlayAgent.invoke_setShowScrollBottleneckRects({show: true});
    }
    if (this.#debuggerModel && this.#debuggerModel.isPaused()) {
      this.updatePausedInDebuggerMessage();
    }
    await this.overlayAgent.invoke_setShowViewportSizeOnResize({show: this.#showViewportSizeOnResize});
    this.#persistentHighlighter?.resetOverlay();
  }

  override async suspendModel(): Promise<void> {
    Common.EventTarget.removeEventListeners(this.#registeredListeners);
    await this.overlayAgent.invoke_disable();
  }

  override async resumeModel(): Promise<void> {
    await Promise.all([this.overlayAgent.invoke_enable(), this.wireAgentToSettings()]);
  }

  setShowViewportSizeOnResize(show: boolean): void {
    if (this.#showViewportSizeOnResize === show) {
      return;
    }

    this.#showViewportSizeOnResize = show;
    if (this.target().suspended()) {
      return;
    }
    void this.overlayAgent.invoke_setShowViewportSizeOnResize({show});
  }

  private updatePausedInDebuggerMessage(): void {
    if (this.target().suspended()) {
      return;
    }
    const message = this.#debuggerModel && this.#debuggerModel.isPaused() &&
            !Common.Settings.Settings.instance().moduleSetting('disable-paused-state-overlay').get() ?
        i18nString(UIStrings.pausedInDebugger) :
        undefined;
    void this.overlayAgent.invoke_setPausedInDebuggerMessage({message});
  }

  setHighlighter(highlighter: Highlighter|null): void {
    this.#highlighter = highlighter || this.#defaultHighlighter;
  }

  async setInspectMode(mode: Protocol.Overlay.InspectMode, showDetailedTooltip: boolean|undefined = true):
      Promise<void> {
    await this.#domModel.requestDocument();
    this.#inspectModeEnabledInternal = mode !== Protocol.Overlay.InspectMode.None;
    this.dispatchEventToListeners(Events.INSPECT_MODE_WILL_BE_TOGGLED, this);
    void this.#highlighter.setInspectMode(mode, this.buildHighlightConfig('all', showDetailedTooltip));
  }

  inspectModeEnabled(): boolean {
    return this.#inspectModeEnabledInternal;
  }

  highlightInOverlay(data: HighlightData, mode?: string, showInfo?: boolean): void {
    if (this.#sourceOrderModeActiveInternal) {
      // Return early if the source order is currently being shown the in the
      // overlay, so that it is not cleared by the highlight
      return;
    }
    if (this.#hideHighlightTimeout) {
      clearTimeout(this.#hideHighlightTimeout);
      this.#hideHighlightTimeout = null;
    }
    const highlightConfig = this.buildHighlightConfig(mode);
    if (typeof showInfo !== 'undefined') {
      highlightConfig.showInfo = showInfo;
    }
    this.#highlighter.highlightInOverlay(data, highlightConfig);
  }

  highlightInOverlayForTwoSeconds(data: HighlightData): void {
    this.highlightInOverlay(data);
    this.delayedHideHighlight(2000);
  }

  highlightGridInPersistentOverlay(nodeId: Protocol.DOM.NodeId): void {
    if (!this.#persistentHighlighter) {
      return;
    }
    this.#persistentHighlighter.highlightGridInOverlay(nodeId);
  }

  isHighlightedGridInPersistentOverlay(nodeId: Protocol.DOM.NodeId): boolean {
    if (!this.#persistentHighlighter) {
      return false;
    }
    return this.#persistentHighlighter.isGridHighlighted(nodeId);
  }

  hideGridInPersistentOverlay(nodeId: Protocol.DOM.NodeId): void {
    if (!this.#persistentHighlighter) {
      return;
    }
    this.#persistentHighlighter.hideGridInOverlay(nodeId);
  }

  highlightScrollSnapInPersistentOverlay(nodeId: Protocol.DOM.NodeId): void {
    if (!this.#persistentHighlighter) {
      return;
    }
    this.#persistentHighlighter.highlightScrollSnapInOverlay(nodeId);
  }

  isHighlightedScrollSnapInPersistentOverlay(nodeId: Protocol.DOM.NodeId): boolean {
    if (!this.#persistentHighlighter) {
      return false;
    }
    return this.#persistentHighlighter.isScrollSnapHighlighted(nodeId);
  }

  hideScrollSnapInPersistentOverlay(nodeId: Protocol.DOM.NodeId): void {
    if (!this.#persistentHighlighter) {
      return;
    }
    this.#persistentHighlighter.hideScrollSnapInOverlay(nodeId);
  }

  highlightFlexContainerInPersistentOverlay(nodeId: Protocol.DOM.NodeId): void {
    if (!this.#persistentHighlighter) {
      return;
    }
    this.#persistentHighlighter.highlightFlexInOverlay(nodeId);
  }

  isHighlightedFlexContainerInPersistentOverlay(nodeId: Protocol.DOM.NodeId): boolean {
    if (!this.#persistentHighlighter) {
      return false;
    }
    return this.#persistentHighlighter.isFlexHighlighted(nodeId);
  }

  hideFlexContainerInPersistentOverlay(nodeId: Protocol.DOM.NodeId): void {
    if (!this.#persistentHighlighter) {
      return;
    }
    this.#persistentHighlighter.hideFlexInOverlay(nodeId);
  }

  highlightContainerQueryInPersistentOverlay(nodeId: Protocol.DOM.NodeId): void {
    if (!this.#persistentHighlighter) {
      return;
    }
    this.#persistentHighlighter.highlightContainerQueryInOverlay(nodeId);
  }

  isHighlightedContainerQueryInPersistentOverlay(nodeId: Protocol.DOM.NodeId): boolean {
    if (!this.#persistentHighlighter) {
      return false;
    }
    return this.#persistentHighlighter.isContainerQueryHighlighted(nodeId);
  }

  hideContainerQueryInPersistentOverlay(nodeId: Protocol.DOM.NodeId): void {
    if (!this.#persistentHighlighter) {
      return;
    }
    this.#persistentHighlighter.hideContainerQueryInOverlay(nodeId);
  }

  highlightSourceOrderInOverlay(node: DOMNode): void {
    const sourceOrderConfig = {
      parentOutlineColor: Common.Color.SourceOrderHighlight.ParentOutline.toProtocolRGBA(),
      childOutlineColor: Common.Color.SourceOrderHighlight.ChildOutline.toProtocolRGBA(),
    };
    this.#sourceOrderHighlighter.highlightSourceOrderInOverlay(node, sourceOrderConfig);
  }

  colorOfGridInPersistentOverlay(nodeId: Protocol.DOM.NodeId): string|null {
    if (!this.#persistentHighlighter) {
      return null;
    }
    return this.#persistentHighlighter.colorOfGrid(nodeId).asString(Common.Color.Format.HEX);
  }

  setColorOfGridInPersistentOverlay(nodeId: Protocol.DOM.NodeId, colorStr: string): void {
    if (!this.#persistentHighlighter) {
      return;
    }
    const color = Common.Color.parse(colorStr);
    if (!color) {
      return;
    }
    this.#persistentHighlighter.setColorOfGrid(nodeId, color);
    this.#persistentHighlighter.resetOverlay();
  }

  colorOfFlexInPersistentOverlay(nodeId: Protocol.DOM.NodeId): string|null {
    if (!this.#persistentHighlighter) {
      return null;
    }
    return this.#persistentHighlighter.colorOfFlex(nodeId).asString(Common.Color.Format.HEX);
  }

  setColorOfFlexInPersistentOverlay(nodeId: Protocol.DOM.NodeId, colorStr: string): void {
    if (!this.#persistentHighlighter) {
      return;
    }
    const color = Common.Color.parse(colorStr);
    if (!color) {
      return;
    }
    this.#persistentHighlighter.setColorOfFlex(nodeId, color);
    this.#persistentHighlighter.resetOverlay();
  }

  hideSourceOrderInOverlay(): void {
    this.#sourceOrderHighlighter.hideSourceOrderHighlight();
  }

  setSourceOrderActive(isActive: boolean): void {
    this.#sourceOrderModeActiveInternal = isActive;
  }

  sourceOrderModeActive(): boolean {
    return this.#sourceOrderModeActiveInternal;
  }

  highlightIsolatedElementInPersistentOverlay(nodeId: Protocol.DOM.NodeId): void {
    if (!this.#persistentHighlighter) {
      return;
    }
    this.#persistentHighlighter.highlightIsolatedElementInOverlay(nodeId);
  }

  hideIsolatedElementInPersistentOverlay(nodeId: Protocol.DOM.NodeId): void {
    if (!this.#persistentHighlighter) {
      return;
    }
    this.#persistentHighlighter.hideIsolatedElementInOverlay(nodeId);
  }

  isHighlightedIsolatedElementInPersistentOverlay(nodeId: Protocol.DOM.NodeId): boolean {
    if (!this.#persistentHighlighter) {
      return false;
    }
    return this.#persistentHighlighter.isIsolatedElementHighlighted(nodeId);
  }

  private delayedHideHighlight(delay: number): void {
    if (this.#hideHighlightTimeout === null) {
      this.#hideHighlightTimeout = window.setTimeout(() => this.highlightInOverlay({clear: true}), delay);
    }
  }

  highlightFrame(frameId: Protocol.Page.FrameId): void {
    if (this.#hideHighlightTimeout) {
      clearTimeout(this.#hideHighlightTimeout);
      this.#hideHighlightTimeout = null;
    }
    this.#highlighter.highlightFrame(frameId);
  }

  showHingeForDualScreen(hinge: Hinge|null): void {
    if (hinge) {
      const {x, y, width, height, contentColor, outlineColor} = hinge;
      void this.overlayAgent.invoke_setShowHinge({
        hingeConfig: {rect: {x, y, width, height}, contentColor, outlineColor},
      });
    } else {
      void this.overlayAgent.invoke_setShowHinge({});
    }
  }

  setWindowControlsPlatform(selectedPlatform: EmulatedOSType): void {
    this.#windowControls.selectedPlatform = selectedPlatform;
  }

  setWindowControlsThemeColor(themeColor: string): void {
    this.#windowControls.themeColor = themeColor;
  }

  getWindowControlsConfig(): Protocol.Overlay.WindowControlsOverlayConfig {
    return this.#windowControls.config;
  }

  async toggleWindowControlsToolbar(show: boolean): Promise<void> {
    const wcoConfigObj = show ? {windowControlsOverlayConfig: this.#windowControls.config} : {};

    const setWindowControlsOverlayOperation = this.overlayAgent.invoke_setShowWindowControlsOverlay(wcoConfigObj);
    const toggleStylesheetOperation = this.#windowControls.toggleEmulatedOverlay(show);

    await Promise.all([setWindowControlsOverlayOperation, toggleStylesheetOperation]);

    this.setShowViewportSizeOnResize(!show);
  }

  private buildHighlightConfig(mode: string|undefined = 'all', showDetailedToolip: boolean|undefined = false):
      Protocol.Overlay.HighlightConfig {
    const showRulers = Common.Settings.Settings.instance().moduleSetting('show-metrics-rulers').get();
    const highlightConfig: Protocol.Overlay.HighlightConfig = {
      showInfo: mode === 'all' || mode === 'container-outline',
      showRulers,
      showStyles: showDetailedToolip,
      showAccessibilityInfo: showDetailedToolip,
      showExtensionLines: showRulers,
      gridHighlightConfig: {},
      flexContainerHighlightConfig: {},
      flexItemHighlightConfig: {},
      contrastAlgorithm: Root.Runtime.experiments.isEnabled('apca') ? Protocol.Overlay.ContrastAlgorithm.Apca :
                                                                      Protocol.Overlay.ContrastAlgorithm.Aa,
    };

    if (mode === 'all' || mode === 'content') {
      highlightConfig.contentColor = Common.Color.PageHighlight.Content.toProtocolRGBA();
    }

    if (mode === 'all' || mode === 'padding') {
      highlightConfig.paddingColor = Common.Color.PageHighlight.Padding.toProtocolRGBA();
    }

    if (mode === 'all' || mode === 'border') {
      highlightConfig.borderColor = Common.Color.PageHighlight.Border.toProtocolRGBA();
    }

    if (mode === 'all' || mode === 'margin') {
      highlightConfig.marginColor = Common.Color.PageHighlight.Margin.toProtocolRGBA();
    }

    if (mode === 'all') {
      highlightConfig.eventTargetColor = Common.Color.PageHighlight.EventTarget.toProtocolRGBA();
      highlightConfig.shapeColor = Common.Color.PageHighlight.Shape.toProtocolRGBA();
      highlightConfig.shapeMarginColor = Common.Color.PageHighlight.ShapeMargin.toProtocolRGBA();

      highlightConfig.gridHighlightConfig = {
        rowGapColor: Common.Color.PageHighlight.GapBackground.toProtocolRGBA(),
        rowHatchColor: Common.Color.PageHighlight.GapHatch.toProtocolRGBA(),
        columnGapColor: Common.Color.PageHighlight.GapBackground.toProtocolRGBA(),
        columnHatchColor: Common.Color.PageHighlight.GapHatch.toProtocolRGBA(),
        rowLineColor: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
        columnLineColor: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
        rowLineDash: true,
        columnLineDash: true,
      };

      highlightConfig.flexContainerHighlightConfig = {
        containerBorder: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
          pattern: Protocol.Overlay.LineStylePattern.Dashed,
        },
        itemSeparator: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
          pattern: Protocol.Overlay.LineStylePattern.Dotted,
        },
        lineSeparator: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
          pattern: Protocol.Overlay.LineStylePattern.Dashed,
        },
        mainDistributedSpace: {
          hatchColor: Common.Color.PageHighlight.GapHatch.toProtocolRGBA(),
          fillColor: Common.Color.PageHighlight.GapBackground.toProtocolRGBA(),
        },
        crossDistributedSpace: {
          hatchColor: Common.Color.PageHighlight.GapHatch.toProtocolRGBA(),
          fillColor: Common.Color.PageHighlight.GapBackground.toProtocolRGBA(),
        },
        rowGapSpace: {
          hatchColor: Common.Color.PageHighlight.GapHatch.toProtocolRGBA(),
          fillColor: Common.Color.PageHighlight.GapBackground.toProtocolRGBA(),
        },
        columnGapSpace: {
          hatchColor: Common.Color.PageHighlight.GapHatch.toProtocolRGBA(),
          fillColor: Common.Color.PageHighlight.GapBackground.toProtocolRGBA(),
        },
      };

      highlightConfig.flexItemHighlightConfig = {
        baseSizeBox: {
          hatchColor: Common.Color.PageHighlight.GapHatch.toProtocolRGBA(),
        },
        baseSizeBorder: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
          pattern: Protocol.Overlay.LineStylePattern.Dotted,
        },
        flexibilityArrow: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
        },
      };
    }

    if (mode.endsWith('gap')) {
      highlightConfig.gridHighlightConfig = {
        gridBorderColor: Common.Color.PageHighlight.GridBorder.toProtocolRGBA(),
        gridBorderDash: true,
      };

      if (mode === 'gap' || mode === 'row-gap') {
        highlightConfig.gridHighlightConfig.rowGapColor = Common.Color.PageHighlight.GapBackground.toProtocolRGBA();
        highlightConfig.gridHighlightConfig.rowHatchColor = Common.Color.PageHighlight.GapHatch.toProtocolRGBA();
      }
      if (mode === 'gap' || mode === 'column-gap') {
        highlightConfig.gridHighlightConfig.columnGapColor = Common.Color.PageHighlight.GapBackground.toProtocolRGBA();
        highlightConfig.gridHighlightConfig.columnHatchColor = Common.Color.PageHighlight.GapHatch.toProtocolRGBA();
      }
    }

    if (mode.endsWith('gap')) {
      highlightConfig.flexContainerHighlightConfig = {
        containerBorder: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
          pattern: Protocol.Overlay.LineStylePattern.Dashed,
        },
      };

      if (mode === 'gap' || mode === 'row-gap') {
        highlightConfig.flexContainerHighlightConfig.rowGapSpace = {
          hatchColor: Common.Color.PageHighlight.GapHatch.toProtocolRGBA(),
          fillColor: Common.Color.PageHighlight.GapBackground.toProtocolRGBA(),
        };
      }
      if (mode === 'gap' || mode === 'column-gap') {
        highlightConfig.flexContainerHighlightConfig.columnGapSpace = {
          hatchColor: Common.Color.PageHighlight.GapHatch.toProtocolRGBA(),
          fillColor: Common.Color.PageHighlight.GapBackground.toProtocolRGBA(),
        };
      }
    }

    if (mode === 'grid-areas') {
      highlightConfig.gridHighlightConfig = {
        rowLineColor: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
        columnLineColor: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
        rowLineDash: true,
        columnLineDash: true,
        showAreaNames: true,
        areaBorderColor: Common.Color.PageHighlight.GridAreaBorder.toProtocolRGBA(),
      };
    }

    if (mode === 'grid-template-columns') {
      highlightConfig.contentColor = Common.Color.PageHighlight.Content.toProtocolRGBA();
      highlightConfig.gridHighlightConfig = {
        columnLineColor: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
        columnLineDash: true,
      };
    }

    if (mode === 'grid-template-rows') {
      highlightConfig.contentColor = Common.Color.PageHighlight.Content.toProtocolRGBA();
      highlightConfig.gridHighlightConfig = {
        rowLineColor: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
        rowLineDash: true,
      };
    }

    if (mode === 'justify-content') {
      highlightConfig.flexContainerHighlightConfig = {
        containerBorder: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
          pattern: Protocol.Overlay.LineStylePattern.Dashed,
        },
        mainDistributedSpace: {
          hatchColor: Common.Color.PageHighlight.GapHatch.toProtocolRGBA(),
          fillColor: Common.Color.PageHighlight.GapBackground.toProtocolRGBA(),
        },
      };
    }

    if (mode === 'align-content') {
      highlightConfig.flexContainerHighlightConfig = {
        containerBorder: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
          pattern: Protocol.Overlay.LineStylePattern.Dashed,
        },
        crossDistributedSpace: {
          hatchColor: Common.Color.PageHighlight.GapHatch.toProtocolRGBA(),
          fillColor: Common.Color.PageHighlight.GapBackground.toProtocolRGBA(),
        },
      };
    }

    if (mode === 'align-items') {
      highlightConfig.flexContainerHighlightConfig = {
        containerBorder: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
          pattern: Protocol.Overlay.LineStylePattern.Dashed,
        },
        lineSeparator: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
          pattern: Protocol.Overlay.LineStylePattern.Dashed,
        },
        crossAlignment: {color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA()},
      };
    }

    if (mode === 'flexibility') {
      highlightConfig.flexItemHighlightConfig = {
        baseSizeBox: {
          hatchColor: Common.Color.PageHighlight.GapHatch.toProtocolRGBA(),
        },
        baseSizeBorder: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
          pattern: Protocol.Overlay.LineStylePattern.Dotted,
        },
        flexibilityArrow: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
        },
      };
    }

    if (mode === 'container-outline') {
      highlightConfig.containerQueryContainerHighlightConfig = {
        containerBorder: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
          pattern: Protocol.Overlay.LineStylePattern.Dashed,
        },
      };
    }

    return highlightConfig;
  }

  nodeHighlightRequested({nodeId}: Protocol.Overlay.NodeHighlightRequestedEvent): void {
    const node = this.#domModel.nodeForId(nodeId);
    if (node) {
      this.dispatchEventToListeners(Events.HIGHLIGHT_NODE_REQUESTED, node);
    }
  }

  static setInspectNodeHandler(handler: (arg0: DOMNode) => void): void {
    OverlayModel.inspectNodeHandler = handler;
  }

  inspectNodeRequested({backendNodeId}: Protocol.Overlay.InspectNodeRequestedEvent): void {
    const deferredNode = new DeferredDOMNode(this.target(), backendNodeId);
    if (OverlayModel.inspectNodeHandler) {
      void deferredNode.resolvePromise().then(node => {
        if (node && OverlayModel.inspectNodeHandler) {
          OverlayModel.inspectNodeHandler(node);
        }
      });
    } else {
      void Common.Revealer.reveal(deferredNode);
    }
    this.dispatchEventToListeners(Events.EXITED_INSPECT_MODE);
  }

  screenshotRequested({viewport}: Protocol.Overlay.ScreenshotRequestedEvent): void {
    this.dispatchEventToListeners(Events.SCREENSHOT_REQUESTED, viewport);
    this.dispatchEventToListeners(Events.EXITED_INSPECT_MODE);
  }

  inspectModeCanceled(): void {
    this.dispatchEventToListeners(Events.EXITED_INSPECT_MODE);
  }

  static inspectNodeHandler: ((node: DOMNode) => void)|null = null;

  getOverlayAgent(): ProtocolProxyApi.OverlayApi {
    return this.overlayAgent;
  }

  async hasStyleSheetText(url: Platform.DevToolsPath.UrlString): Promise<boolean> {
    return this.#windowControls.initializeStyleSheetText(url);
  }
}

export class WindowControls {
  readonly #cssModel: CSSModel;
  #originalStylesheetText: string|undefined;
  #stylesheetId?: Protocol.CSS.StyleSheetId;
  #currentUrl: Platform.DevToolsPath.UrlString|undefined;

  #config: Protocol.Overlay.WindowControlsOverlayConfig = {
    showCSS: false,
    selectedPlatform: EmulatedOSType.WINDOWS,
    themeColor: '#ffffff',
  };

  constructor(cssModel: CSSModel) {
    this.#cssModel = cssModel;
  }

  get selectedPlatform(): string {
    return this.#config.selectedPlatform;
  }

  set selectedPlatform(osType: EmulatedOSType) {
    this.#config.selectedPlatform = osType;
  }

  get themeColor(): string {
    return this.#config.themeColor;
  }

  set themeColor(color: string) {
    this.#config.themeColor = color;
  }

  get config(): Protocol.Overlay.WindowControlsOverlayConfig {
    return this.#config;
  }

  async initializeStyleSheetText(url: Platform.DevToolsPath.UrlString): Promise<boolean> {
    if (this.#originalStylesheetText && url === this.#currentUrl) {
      return true;
    }

    const cssSourceUrl = this.#fetchCssSourceUrl(url);
    if (!cssSourceUrl) {
      return false;
    }

    this.#stylesheetId = this.#fetchCurrentStyleSheet(cssSourceUrl);
    if (!this.#stylesheetId) {
      return false;
    }

    const stylesheetText = await this.#cssModel.getStyleSheetText(this.#stylesheetId);

    if (!stylesheetText) {
      return false;
    }

    this.#originalStylesheetText = stylesheetText;
    this.#currentUrl = url;

    return true;
  }

  async toggleEmulatedOverlay(showOverlay: boolean): Promise<void> {
    if (!this.#stylesheetId || !this.#originalStylesheetText) {
      return;
    }
    if (showOverlay) {
      const styleSheetText = WindowControls.#getStyleSheetForPlatform(
          this.#config.selectedPlatform.toLowerCase(), this.#originalStylesheetText);
      if (styleSheetText) {
        await this.#cssModel.setStyleSheetText(this.#stylesheetId, styleSheetText, false);
      }
    } else {
      // Restore the original stylesheet
      await this.#cssModel.setStyleSheetText(this.#stylesheetId, this.#originalStylesheetText, false);
    }
  }

  static #getStyleSheetForPlatform(platform: string, originalStyleSheet: string|undefined): string|undefined {
    const overlayDimensions = platformOverlayDimensions[platform as keyof PlatformOverlayDimensions];
    return WindowControls.#transformStyleSheet(
        overlayDimensions.x, overlayDimensions.y, overlayDimensions.width, overlayDimensions.height,
        originalStyleSheet);
  }

  #fetchCssSourceUrl(url: Platform.DevToolsPath.UrlString): Platform.DevToolsPath.UrlString|undefined {
    const parentURL = Common.ParsedURL.ParsedURL.extractOrigin(url);
    const cssHeaders = this.#cssModel.styleSheetHeaders();
    const header = cssHeaders.find(header => header.sourceURL && header.sourceURL.includes(parentURL));
    return header?.sourceURL;
  }

  #fetchCurrentStyleSheet(cssSourceUrl: Platform.DevToolsPath.UrlString): Protocol.CSS.StyleSheetId|undefined {
    const stylesheetIds = this.#cssModel.getStyleSheetIdsForURL(cssSourceUrl);
    return stylesheetIds.length > 0 ? stylesheetIds[0] : undefined;
  }

  // The primary objective of this function is to adjust certain CSS environment variables within the existing stylesheet
  // and provide it as the style sheet for the emulated overlay.
  static #transformStyleSheet(
      x: number, y: number, width: number, height: number, originalStyleSheet: string|undefined): string|undefined {
    if (!originalStyleSheet) {
      return undefined;
    }
    const stylesheetText = originalStyleSheet;

    const updatedStylesheet =
        stylesheetText.replace(/: env\(titlebar-area-x(?:,[^)]*)?\);/g, `: env(titlebar-area-x, ${x}px);`)
            .replace(/: env\(titlebar-area-y(?:,[^)]*)?\);/g, `: env(titlebar-area-y, ${y}px);`)
            .replace(
                /: env\(titlebar-area-width(?:,[^)]*)?\);/g, `: env(titlebar-area-width, calc(100% - ${width}px));`)
            .replace(/: env\(titlebar-area-height(?:,[^)]*)?\);/g, `: env(titlebar-area-height, ${height}px);`);

    return updatedStylesheet;
  }

  transformStyleSheetforTesting(
      x: number, y: number, width: number, height: number, originalStyleSheet: string|undefined): string|undefined {
    return WindowControls.#transformStyleSheet(x, y, width, height, originalStyleSheet);
  }
}

export const enum Events {
  INSPECT_MODE_WILL_BE_TOGGLED = 'InspectModeWillBeToggled',
  EXITED_INSPECT_MODE = 'InspectModeExited',
  HIGHLIGHT_NODE_REQUESTED = 'HighlightNodeRequested',
  SCREENSHOT_REQUESTED = 'ScreenshotRequested',
  PERSISTENT_GRID_OVERLAY_STATE_CHANGED = 'PersistentGridOverlayStateChanged',
  PERSISTENT_FLEX_CONTAINER_OVERLAY_STATE_CHANGED = 'PersistentFlexContainerOverlayStateChanged',
  PERSISTENT_SCROLL_SNAP_OVERLAY_STATE_CHANGED = 'PersistentScrollSnapOverlayStateChanged',
  PERSISTENT_CONTAINER_QUERY_OVERLAY_STATE_CHANGED = 'PersistentContainerQueryOverlayStateChanged',
}

export interface ChangedNodeId {
  nodeId: number;
  enabled: boolean;
}

export type EventTypes = {
  [Events.INSPECT_MODE_WILL_BE_TOGGLED]: OverlayModel,
  [Events.EXITED_INSPECT_MODE]: void,
  [Events.HIGHLIGHT_NODE_REQUESTED]: DOMNode,
  [Events.SCREENSHOT_REQUESTED]: Protocol.Page.Viewport,
  [Events.PERSISTENT_GRID_OVERLAY_STATE_CHANGED]: ChangedNodeId,
  [Events.PERSISTENT_FLEX_CONTAINER_OVERLAY_STATE_CHANGED]: ChangedNodeId,
  [Events.PERSISTENT_SCROLL_SNAP_OVERLAY_STATE_CHANGED]: ChangedNodeId,
  [Events.PERSISTENT_CONTAINER_QUERY_OVERLAY_STATE_CHANGED]: ChangedNodeId,
};

export interface Highlighter {
  highlightInOverlay(data: HighlightData, config: Protocol.Overlay.HighlightConfig): void;

  setInspectMode(mode: Protocol.Overlay.InspectMode, config: Protocol.Overlay.HighlightConfig): Promise<void>;

  highlightFrame(frameId: Protocol.Page.FrameId): void;
}

class DefaultHighlighter implements Highlighter {
  readonly #model: OverlayModel;
  constructor(model: OverlayModel) {
    this.#model = model;
  }

  highlightInOverlay(data: HighlightData, highlightConfig: Protocol.Overlay.HighlightConfig): void {
    const {node, deferredNode, object, selectorList} =
        {node: undefined, deferredNode: undefined, object: undefined, selectorList: undefined, ...data};
    const nodeId = node ? node.id : undefined;
    const backendNodeId = deferredNode ? deferredNode.backendNodeId() : undefined;
    const objectId = object ? object.objectId : undefined;
    if (nodeId || backendNodeId || objectId) {
      void this.#model.target().overlayAgent().invoke_highlightNode(
          {highlightConfig, nodeId, backendNodeId, objectId, selector: selectorList});
    } else {
      void this.#model.target().overlayAgent().invoke_hideHighlight();
    }
  }

  async setInspectMode(mode: Protocol.Overlay.InspectMode, highlightConfig: Protocol.Overlay.HighlightConfig):
      Promise<void> {
    await this.#model.target().overlayAgent().invoke_setInspectMode({mode, highlightConfig});
  }

  highlightFrame(frameId: Protocol.Page.FrameId): void {
    void this.#model.target().overlayAgent().invoke_highlightFrame({
      frameId,
      contentColor: Common.Color.PageHighlight.Content.toProtocolRGBA(),
      contentOutlineColor: Common.Color.PageHighlight.ContentOutline.toProtocolRGBA(),
    });
  }
}

export class SourceOrderHighlighter {
  readonly #model: OverlayModel;
  constructor(model: OverlayModel) {
    this.#model = model;
  }

  highlightSourceOrderInOverlay(node: DOMNode, sourceOrderConfig: Protocol.Overlay.SourceOrderConfig): void {
    this.#model.setSourceOrderActive(true);
    this.#model.setShowViewportSizeOnResize(false);
    void this.#model.getOverlayAgent().invoke_highlightSourceOrder({sourceOrderConfig, nodeId: node.id});
  }

  hideSourceOrderHighlight(): void {
    this.#model.setSourceOrderActive(false);
    this.#model.setShowViewportSizeOnResize(true);
    void this.#model.clearHighlight();
  }
}

SDKModel.register(OverlayModel, {capabilities: Capability.DOM, autostart: true});

export interface HighlightNodeData {
  node: DOMNode;
  selectorList?: string;
}

export interface HighlightDeferredNode {
  deferredNode: DeferredDOMNode;
}

export interface HighlightObjectData {
  object: RemoteObject;
  selectorList?: string;
}

export type HighlightData = HighlightNodeData|HighlightDeferredNode|HighlightObjectData|{clear: boolean};

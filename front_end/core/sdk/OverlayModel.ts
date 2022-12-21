// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

import {DebuggerModel, Events as DebuggerModelEvents} from './DebuggerModel.js';

import {DeferredDOMNode, DOMModel, Events as DOMModelEvents, type DOMNode} from './DOMModel.js';
import {OverlayPersistentHighlighter} from './OverlayPersistentHighlighter.js';
import {type RemoteObject} from './RemoteObject.js';

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';
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
  #showWebVitalsSetting: Common.Settings.Setting<boolean>;
  #registeredListeners: Common.EventTarget.EventDescriptor[];
  #showViewportSizeOnResize: boolean;
  #persistentHighlighter: OverlayPersistentHighlighter|null;
  readonly #sourceOrderHighlighter: SourceOrderHighlighter;
  #sourceOrderModeActiveInternal: boolean;

  constructor(target: Target) {
    super(target);
    this.#domModel = (target.model(DOMModel) as DOMModel);

    target.registerOverlayDispatcher(this);
    this.overlayAgent = target.overlayAgent();

    this.#debuggerModel = target.model(DebuggerModel);
    if (this.#debuggerModel) {
      Common.Settings.Settings.instance()
          .moduleSetting('disablePausedStateOverlay')
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

    this.#showPaintRectsSetting = Common.Settings.Settings.instance().moduleSetting<boolean>('showPaintRects');
    this.#showLayoutShiftRegionsSetting =
        Common.Settings.Settings.instance().moduleSetting<boolean>('showLayoutShiftRegions');
    this.#showAdHighlightsSetting = Common.Settings.Settings.instance().moduleSetting<boolean>('showAdHighlights');
    this.#showDebugBordersSetting = Common.Settings.Settings.instance().moduleSetting<boolean>('showDebugBorders');
    this.#showFPSCounterSetting = Common.Settings.Settings.instance().moduleSetting<boolean>('showFPSCounter');
    this.#showScrollBottleneckRectsSetting =
        Common.Settings.Settings.instance().moduleSetting<boolean>('showScrollBottleneckRects');
    this.#showWebVitalsSetting = Common.Settings.Settings.instance().moduleSetting<boolean>('showWebVitals');

    this.#registeredListeners = [];
    this.#showViewportSizeOnResize = true;
    if (!target.suspended()) {
      void this.overlayAgent.invoke_enable();
      void this.wireAgentToSettings();
    }

    this.#persistentHighlighter = new OverlayPersistentHighlighter(this);
    this.#domModel.addEventListener(DOMModelEvents.NodeRemoved, () => {
      this.#persistentHighlighter && this.#persistentHighlighter.refreshHighlights();
    });
    this.#domModel.addEventListener(DOMModelEvents.DocumentUpdated, () => {
      this.#persistentHighlighter && this.#persistentHighlighter.hideAllInOverlay();
    });

    this.#sourceOrderHighlighter = new SourceOrderHighlighter(this);
    this.#sourceOrderModeActiveInternal = false;
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
      this.#showWebVitalsSetting.addChangeListener(
          () => this.overlayAgent.invoke_setShowWebVitals({show: this.#showWebVitalsSetting.get()})),
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
    if (this.#showWebVitalsSetting.get()) {
      void this.overlayAgent.invoke_setShowWebVitals({show: true});
    }
    if (this.#debuggerModel && this.#debuggerModel.isPaused()) {
      this.updatePausedInDebuggerMessage();
    }
    await this.overlayAgent.invoke_setShowViewportSizeOnResize({show: this.#showViewportSizeOnResize});
  }

  async suspendModel(): Promise<void> {
    Common.EventTarget.removeEventListeners(this.#registeredListeners);
    await this.overlayAgent.invoke_disable();
  }

  async resumeModel(): Promise<void> {
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
            !Common.Settings.Settings.instance().moduleSetting('disablePausedStateOverlay').get() ?
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
    this.dispatchEventToListeners(Events.InspectModeWillBeToggled, this);
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
    this.dispatchEventToListeners(Events.PersistentGridOverlayStateChanged, {nodeId, enabled: true});
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
    this.dispatchEventToListeners(Events.PersistentGridOverlayStateChanged, {nodeId, enabled: false});
  }

  highlightScrollSnapInPersistentOverlay(nodeId: Protocol.DOM.NodeId): void {
    if (!this.#persistentHighlighter) {
      return;
    }
    this.#persistentHighlighter.highlightScrollSnapInOverlay(nodeId);
    this.dispatchEventToListeners(Events.PersistentScrollSnapOverlayStateChanged, {nodeId, enabled: true});
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
    this.dispatchEventToListeners(Events.PersistentScrollSnapOverlayStateChanged, {nodeId, enabled: false});
  }

  highlightFlexContainerInPersistentOverlay(nodeId: Protocol.DOM.NodeId): void {
    if (!this.#persistentHighlighter) {
      return;
    }
    this.#persistentHighlighter.highlightFlexInOverlay(nodeId);
    this.dispatchEventToListeners(Events.PersistentFlexContainerOverlayStateChanged, {nodeId, enabled: true});
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
    this.dispatchEventToListeners(Events.PersistentFlexContainerOverlayStateChanged, {nodeId, enabled: false});
  }

  highlightContainerQueryInPersistentOverlay(nodeId: Protocol.DOM.NodeId): void {
    if (!this.#persistentHighlighter) {
      return;
    }
    this.#persistentHighlighter.highlightContainerQueryInOverlay(nodeId);
    this.dispatchEventToListeners(Events.PersistentContainerQueryOverlayStateChanged, {nodeId, enabled: true});
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
    this.dispatchEventToListeners(Events.PersistentContainerQueryOverlayStateChanged, {nodeId, enabled: false});
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
        hingeConfig:
            {rect: {x: x, y: y, width: width, height: height}, contentColor: contentColor, outlineColor: outlineColor},
      });
    } else {
      void this.overlayAgent.invoke_setShowHinge({});
    }
  }

  private buildHighlightConfig(mode: string|undefined = 'all', showDetailedToolip: boolean|undefined = false):
      Protocol.Overlay.HighlightConfig {
    const showRulers = Common.Settings.Settings.instance().moduleSetting('showMetricsRulers').get();
    const colorFormat = Common.Settings.Settings.instance().moduleSetting('colorFormat').get();

    const highlightConfig: Protocol.Overlay.HighlightConfig = {
      showInfo: mode === 'all' || mode === 'container-outline',
      showRulers: showRulers,
      showStyles: showDetailedToolip,
      showAccessibilityInfo: showDetailedToolip,
      showExtensionLines: showRulers,
      gridHighlightConfig: {},
      flexContainerHighlightConfig: {},
      flexItemHighlightConfig: {},
      contrastAlgorithm: Root.Runtime.experiments.isEnabled('APCA') ? Protocol.Overlay.ContrastAlgorithm.Apca :
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

    // the backend does not support the 'original' format because
    // it currently cannot retrieve the original format using computed styles
    const supportedColorFormats = new Set(['rgb', 'hsl', 'hex']);
    if (supportedColorFormats.has(colorFormat)) {
      highlightConfig.colorFormat = colorFormat;
    }

    return highlightConfig;
  }

  nodeHighlightRequested({nodeId}: Protocol.Overlay.NodeHighlightRequestedEvent): void {
    const node = this.#domModel.nodeForId(nodeId);
    if (node) {
      this.dispatchEventToListeners(Events.HighlightNodeRequested, node);
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
    this.dispatchEventToListeners(Events.ExitedInspectMode);
  }

  screenshotRequested({viewport}: Protocol.Overlay.ScreenshotRequestedEvent): void {
    this.dispatchEventToListeners(Events.ScreenshotRequested, viewport);
    this.dispatchEventToListeners(Events.ExitedInspectMode);
  }

  inspectModeCanceled(): void {
    this.dispatchEventToListeners(Events.ExitedInspectMode);
  }

  static inspectNodeHandler: ((node: DOMNode) => void)|null = null;

  getOverlayAgent(): ProtocolProxyApi.OverlayApi {
    return this.overlayAgent;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  InspectModeWillBeToggled = 'InspectModeWillBeToggled',
  ExitedInspectMode = 'InspectModeExited',
  HighlightNodeRequested = 'HighlightNodeRequested',
  ScreenshotRequested = 'ScreenshotRequested',
  PersistentGridOverlayStateChanged = 'PersistentGridOverlayStateChanged',
  PersistentFlexContainerOverlayStateChanged = 'PersistentFlexContainerOverlayStateChanged',
  PersistentScrollSnapOverlayStateChanged = 'PersistentScrollSnapOverlayStateChanged',
  PersistentContainerQueryOverlayStateChanged = 'PersistentContainerQueryOverlayStateChanged',
}

export interface ChangedNodeId {
  nodeId: number;
  enabled: boolean;
}

export type EventTypes = {
  [Events.InspectModeWillBeToggled]: OverlayModel,
  [Events.ExitedInspectMode]: void,
  [Events.HighlightNodeRequested]: DOMNode,
  [Events.ScreenshotRequested]: Protocol.Page.Viewport,
  [Events.PersistentGridOverlayStateChanged]: ChangedNodeId,
  [Events.PersistentFlexContainerOverlayStateChanged]: ChangedNodeId,
  [Events.PersistentScrollSnapOverlayStateChanged]: ChangedNodeId,
  [Events.PersistentContainerQueryOverlayStateChanged]: ChangedNodeId,
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

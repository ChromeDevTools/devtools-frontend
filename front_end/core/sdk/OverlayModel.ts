// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

import {DebuggerModel, Events as DebuggerModelEvents} from './DebuggerModel.js';
import type {DOMNode} from './DOMModel.js';
import {DeferredDOMNode, DOMModel, Events as DOMModelEvents} from './DOMModel.js';  // eslint-disable-line no-unused-vars
import {OverlayPersistentHighlighter} from './OverlayPersistentHighlighter.js';
import type {RemoteObject} from './RemoteObject.js'; // eslint-disable-line no-unused-vars
import type {Target} from './SDKModel.js';
import {Capability, SDKModel, TargetManager} from './SDKModel.js';  // eslint-disable-line no-unused-vars

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

export class OverlayModel extends SDKModel implements ProtocolProxyApi.OverlayDispatcher {
  _domModel: DOMModel;
  _overlayAgent: ProtocolProxyApi.OverlayApi;
  _debuggerModel: DebuggerModel|null;
  _inspectModeEnabled: boolean;
  _hideHighlightTimeout: number|null;
  _defaultHighlighter: Highlighter;
  _highlighter: Highlighter;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _showPaintRectsSetting: Common.Settings.Setting<any>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _showLayoutShiftRegionsSetting: Common.Settings.Setting<any>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _showAdHighlightsSetting: Common.Settings.Setting<any>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _showDebugBordersSetting: Common.Settings.Setting<any>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _showFPSCounterSetting: Common.Settings.Setting<any>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _showScrollBottleneckRectsSetting: Common.Settings.Setting<any>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _showHitTestBordersSetting: Common.Settings.Setting<any>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _showWebVitalsSetting: Common.Settings.Setting<any>;
  _registeredListeners: Common.EventTarget.EventDescriptor[];
  _showViewportSizeOnResize: boolean;
  _peristentHighlighter: OverlayPersistentHighlighter|null;
  _sourceOrderHighlighter: SourceOrderHighlighter;
  _sourceOrderModeActive: boolean;

  constructor(target: Target) {
    super(target);
    this._domModel = (target.model(DOMModel) as DOMModel);

    target.registerOverlayDispatcher(this);
    this._overlayAgent = target.overlayAgent();

    this._debuggerModel = target.model(DebuggerModel);
    if (this._debuggerModel) {
      Common.Settings.Settings.instance()
          .moduleSetting('disablePausedStateOverlay')
          .addChangeListener(this._updatePausedInDebuggerMessage, this);
      this._debuggerModel.addEventListener(
          DebuggerModelEvents.DebuggerPaused, this._updatePausedInDebuggerMessage, this);
      this._debuggerModel.addEventListener(
          DebuggerModelEvents.DebuggerResumed, this._updatePausedInDebuggerMessage, this);
      // TODO(dgozman): we should get DebuggerResumed on navigations instead of listening to GlobalObjectCleared.
      this._debuggerModel.addEventListener(
          DebuggerModelEvents.GlobalObjectCleared, this._updatePausedInDebuggerMessage, this);
    }

    this._inspectModeEnabled = false;

    this._hideHighlightTimeout = null;
    this._defaultHighlighter = new DefaultHighlighter(this);
    this._highlighter = this._defaultHighlighter;

    this._showPaintRectsSetting = Common.Settings.Settings.instance().moduleSetting('showPaintRects');
    this._showLayoutShiftRegionsSetting = Common.Settings.Settings.instance().moduleSetting('showLayoutShiftRegions');
    this._showAdHighlightsSetting = Common.Settings.Settings.instance().moduleSetting('showAdHighlights');
    this._showDebugBordersSetting = Common.Settings.Settings.instance().moduleSetting('showDebugBorders');
    this._showFPSCounterSetting = Common.Settings.Settings.instance().moduleSetting('showFPSCounter');
    this._showScrollBottleneckRectsSetting =
        Common.Settings.Settings.instance().moduleSetting('showScrollBottleneckRects');
    this._showHitTestBordersSetting = Common.Settings.Settings.instance().moduleSetting('showHitTestBorders');
    this._showWebVitalsSetting = Common.Settings.Settings.instance().moduleSetting('showWebVitals');

    this._registeredListeners = [];
    this._showViewportSizeOnResize = true;
    if (!target.suspended()) {
      this._overlayAgent.invoke_enable();
      this._wireAgentToSettings();
    }

    this._peristentHighlighter = new OverlayPersistentHighlighter(this);
    this._domModel.addEventListener(DOMModelEvents.NodeRemoved, () => {
      this._peristentHighlighter && this._peristentHighlighter.refreshHighlights();
    });
    this._domModel.addEventListener(DOMModelEvents.DocumentUpdated, () => {
      this._peristentHighlighter && this._peristentHighlighter.hideAllInOverlay();
    });

    this._sourceOrderHighlighter = new SourceOrderHighlighter(this);
    this._sourceOrderModeActive = false;
  }

  static highlightObjectAsDOMNode(object: RemoteObject): void {
    const domModel = object.runtimeModel().target().model(DOMModel);
    if (domModel) {
      domModel.overlayModel().highlightInOverlay({object, selectorList: undefined});
    }
  }

  static hideDOMNodeHighlight(): void {
    for (const overlayModel of TargetManager.instance().models(OverlayModel)) {
      overlayModel._delayedHideHighlight(0);
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
      overlayModel.highlightRect(rect);
    }
  }

  static clearHighlight(): void {
    for (const overlayModel of TargetManager.instance().models(OverlayModel)) {
      overlayModel.clearHighlight();
    }
  }

  getDOMModel(): DOMModel {
    return this._domModel;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  highlightRect({x, y, width, height, color, outlineColor}: HighlightRect): Promise<any> {
    const highlightColor = color || {r: 255, g: 0, b: 255, a: 0.3};
    const highlightOutlineColor = outlineColor || {r: 255, g: 0, b: 255, a: 0.5};
    return this._overlayAgent.invoke_highlightRect(
        {x, y, width, height, color: highlightColor, outlineColor: highlightOutlineColor});
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clearHighlight(): Promise<any> {
    return this._overlayAgent.invoke_hideHighlight();
  }

  async _wireAgentToSettings(): Promise<void> {
    this._registeredListeners = [
      this._showPaintRectsSetting.addChangeListener(
          () => this._overlayAgent.invoke_setShowPaintRects({result: this._showPaintRectsSetting.get()})),
      this._showLayoutShiftRegionsSetting.addChangeListener(
          () =>
              this._overlayAgent.invoke_setShowLayoutShiftRegions({result: this._showLayoutShiftRegionsSetting.get()})),
      this._showAdHighlightsSetting.addChangeListener(
          () => this._overlayAgent.invoke_setShowAdHighlights({show: this._showAdHighlightsSetting.get()})),
      this._showDebugBordersSetting.addChangeListener(
          () => this._overlayAgent.invoke_setShowDebugBorders({show: this._showDebugBordersSetting.get()})),
      this._showFPSCounterSetting.addChangeListener(
          () => this._overlayAgent.invoke_setShowFPSCounter({show: this._showFPSCounterSetting.get()})),
      this._showScrollBottleneckRectsSetting.addChangeListener(
          () => this._overlayAgent.invoke_setShowScrollBottleneckRects(
              {show: this._showScrollBottleneckRectsSetting.get()})),
      this._showHitTestBordersSetting.addChangeListener(
          () => this._overlayAgent.invoke_setShowHitTestBorders({show: this._showHitTestBordersSetting.get()})),
      this._showWebVitalsSetting.addChangeListener(
          () => this._overlayAgent.invoke_setShowWebVitals({show: this._showWebVitalsSetting.get()})),
    ];

    if (this._showPaintRectsSetting.get()) {
      this._overlayAgent.invoke_setShowPaintRects({result: true});
    }
    if (this._showLayoutShiftRegionsSetting.get()) {
      this._overlayAgent.invoke_setShowLayoutShiftRegions({result: true});
    }
    if (this._showAdHighlightsSetting.get()) {
      this._overlayAgent.invoke_setShowAdHighlights({show: true});
    }
    if (this._showDebugBordersSetting.get()) {
      this._overlayAgent.invoke_setShowDebugBorders({show: true});
    }
    if (this._showFPSCounterSetting.get()) {
      this._overlayAgent.invoke_setShowFPSCounter({show: true});
    }
    if (this._showScrollBottleneckRectsSetting.get()) {
      this._overlayAgent.invoke_setShowScrollBottleneckRects({show: true});
    }
    if (this._showHitTestBordersSetting.get()) {
      this._overlayAgent.invoke_setShowHitTestBorders({show: true});
    }
    if (this._showWebVitalsSetting.get()) {
      this._overlayAgent.invoke_setShowWebVitals({show: true});
    }
    if (this._debuggerModel && this._debuggerModel.isPaused()) {
      this._updatePausedInDebuggerMessage();
    }
    await this._overlayAgent.invoke_setShowViewportSizeOnResize({show: this._showViewportSizeOnResize});
  }

  async suspendModel(): Promise<void> {
    Common.EventTarget.EventTarget.removeEventListeners(this._registeredListeners);
    await this._overlayAgent.invoke_disable();
  }

  async resumeModel(): Promise<void> {
    await Promise.all([this._overlayAgent.invoke_enable(), this._wireAgentToSettings()]);
  }

  setShowViewportSizeOnResize(show: boolean): void {
    if (this._showViewportSizeOnResize === show) {
      return;
    }

    this._showViewportSizeOnResize = show;
    if (this.target().suspended()) {
      return;
    }
    this._overlayAgent.invoke_setShowViewportSizeOnResize({show});
  }

  _updatePausedInDebuggerMessage(): void {
    if (this.target().suspended()) {
      return;
    }
    const message = this._debuggerModel && this._debuggerModel.isPaused() &&
            !Common.Settings.Settings.instance().moduleSetting('disablePausedStateOverlay').get() ?
        i18nString(UIStrings.pausedInDebugger) :
        undefined;
    this._overlayAgent.invoke_setPausedInDebuggerMessage({message});
  }

  setHighlighter(highlighter: Highlighter|null): void {
    this._highlighter = highlighter || this._defaultHighlighter;
  }

  async setInspectMode(mode: Protocol.Overlay.InspectMode, showDetailedTooltip: boolean|undefined = true):
      Promise<void> {
    await this._domModel.requestDocument();
    this._inspectModeEnabled = mode !== Protocol.Overlay.InspectMode.None;
    this.dispatchEventToListeners(Events.InspectModeWillBeToggled, this);
    this._highlighter.setInspectMode(mode, this._buildHighlightConfig('all', showDetailedTooltip));
  }

  inspectModeEnabled(): boolean {
    return this._inspectModeEnabled;
  }

  highlightInOverlay(data: HighlightData, mode?: string, showInfo?: boolean): void {
    if (this._sourceOrderModeActive) {
      // Return early if the source order is currently being shown the in the
      // overlay, so that it is not cleared by the highlight
      return;
    }
    if (this._hideHighlightTimeout) {
      clearTimeout(this._hideHighlightTimeout);
      this._hideHighlightTimeout = null;
    }
    const highlightConfig = this._buildHighlightConfig(mode);
    if (typeof showInfo !== 'undefined') {
      highlightConfig.showInfo = showInfo;
    }
    this._highlighter.highlightInOverlay(data, highlightConfig);
  }

  highlightInOverlayForTwoSeconds(data: HighlightData): void {
    this.highlightInOverlay(data);
    this._delayedHideHighlight(2000);
  }

  highlightGridInPersistentOverlay(nodeId: number): void {
    if (!this._peristentHighlighter) {
      return;
    }
    this._peristentHighlighter.highlightGridInOverlay(nodeId);
    this.dispatchEventToListeners(Events.PersistentGridOverlayStateChanged, {nodeId, enabled: true});
  }

  isHighlightedGridInPersistentOverlay(nodeId: number): boolean {
    if (!this._peristentHighlighter) {
      return false;
    }
    return this._peristentHighlighter.isGridHighlighted(nodeId);
  }

  hideGridInPersistentOverlay(nodeId: number): void {
    if (!this._peristentHighlighter) {
      return;
    }
    this._peristentHighlighter.hideGridInOverlay(nodeId);
    this.dispatchEventToListeners(Events.PersistentGridOverlayStateChanged, {nodeId, enabled: false});
  }

  highlightScrollSnapInPersistentOverlay(nodeId: number): void {
    if (!this._peristentHighlighter) {
      return;
    }
    this._peristentHighlighter.highlightScrollSnapInOverlay(nodeId);
    this.dispatchEventToListeners(Events.PersistentScrollSnapOverlayStateChanged, {nodeId, enabled: true});
  }

  isHighlightedScrollSnapInPersistentOverlay(nodeId: number): boolean {
    if (!this._peristentHighlighter) {
      return false;
    }
    return this._peristentHighlighter.isScrollSnapHighlighted(nodeId);
  }

  hideScrollSnapInPersistentOverlay(nodeId: number): void {
    if (!this._peristentHighlighter) {
      return;
    }
    this._peristentHighlighter.hideScrollSnapInOverlay(nodeId);
    this.dispatchEventToListeners(Events.PersistentScrollSnapOverlayStateChanged, {nodeId, enabled: false});
  }

  highlightFlexContainerInPersistentOverlay(nodeId: number): void {
    if (!this._peristentHighlighter) {
      return;
    }
    this._peristentHighlighter.highlightFlexInOverlay(nodeId);
    this.dispatchEventToListeners(Events.PersistentFlexContainerOverlayStateChanged, {nodeId, enabled: true});
  }

  isHighlightedFlexContainerInPersistentOverlay(nodeId: number): boolean {
    if (!this._peristentHighlighter) {
      return false;
    }
    return this._peristentHighlighter.isFlexHighlighted(nodeId);
  }

  hideFlexContainerInPersistentOverlay(nodeId: number): void {
    if (!this._peristentHighlighter) {
      return;
    }
    this._peristentHighlighter.hideFlexInOverlay(nodeId);
    this.dispatchEventToListeners(Events.PersistentFlexContainerOverlayStateChanged, {nodeId, enabled: false});
  }

  highlightSourceOrderInOverlay(node: DOMNode): void {
    const sourceOrderConfig = {
      parentOutlineColor: Common.Color.SourceOrderHighlight.ParentOutline.toProtocolRGBA(),
      childOutlineColor: Common.Color.SourceOrderHighlight.ChildOutline.toProtocolRGBA(),
    };
    this._sourceOrderHighlighter.highlightSourceOrderInOverlay(node, sourceOrderConfig);
  }

  colorOfGridInPersistentOverlay(nodeId: number): string|null {
    if (!this._peristentHighlighter) {
      return null;
    }
    return this._peristentHighlighter.colorOfGrid(nodeId).asString(Common.Color.Format.HEX);
  }

  setColorOfGridInPersistentOverlay(nodeId: number, colorStr: string): void {
    if (!this._peristentHighlighter) {
      return;
    }
    const color = Common.Color.Color.parse(colorStr);
    if (!color) {
      return;
    }
    this._peristentHighlighter.setColorOfGrid(nodeId, color);
    this._peristentHighlighter.resetOverlay();
  }

  colorOfFlexInPersistentOverlay(nodeId: number): string|null {
    if (!this._peristentHighlighter) {
      return null;
    }
    return this._peristentHighlighter.colorOfFlex(nodeId).asString(Common.Color.Format.HEX);
  }

  setColorOfFlexInPersistentOverlay(nodeId: number, colorStr: string): void {
    if (!this._peristentHighlighter) {
      return;
    }
    const color = Common.Color.Color.parse(colorStr);
    if (!color) {
      return;
    }
    this._peristentHighlighter.setColorOfFlex(nodeId, color);
    this._peristentHighlighter.resetOverlay();
  }

  hideSourceOrderInOverlay(): void {
    this._sourceOrderHighlighter.hideSourceOrderHighlight();
  }

  setSourceOrderActive(isActive: boolean): void {
    this._sourceOrderModeActive = isActive;
  }

  sourceOrderModeActive(): boolean {
    return this._sourceOrderModeActive;
  }

  _delayedHideHighlight(delay: number): void {
    if (this._hideHighlightTimeout === null) {
      this._hideHighlightTimeout = window.setTimeout(() => this.highlightInOverlay({clear: true}), delay);
    }
  }

  highlightFrame(frameId: string): void {
    if (this._hideHighlightTimeout) {
      clearTimeout(this._hideHighlightTimeout);
      this._hideHighlightTimeout = null;
    }
    this._highlighter.highlightFrame(frameId);
  }

  showHingeForDualScreen(hinge: Hinge|null): void {
    if (hinge) {
      const {x, y, width, height, contentColor, outlineColor} = hinge;
      this._overlayAgent.invoke_setShowHinge({
        hingeConfig:
            {rect: {x: x, y: y, width: width, height: height}, contentColor: contentColor, outlineColor: outlineColor},
      });
    } else {
      this._overlayAgent.invoke_setShowHinge({});
    }
  }

  _buildHighlightConfig(mode: string|undefined = 'all', showDetailedToolip: boolean|undefined = false):
      Protocol.Overlay.HighlightConfig {
    const showRulers = Common.Settings.Settings.instance().moduleSetting('showMetricsRulers').get();
    const colorFormat = Common.Settings.Settings.instance().moduleSetting('colorFormat').get();

    const highlightConfig: Protocol.Overlay.HighlightConfig = {
      showInfo: mode === 'all',
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

    // the backend does not support the 'original' format because
    // it currently cannot retrieve the original format using computed styles
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supportedColorFormats = new Set<any>(['rgb', 'hsl', 'hex']);
    if (supportedColorFormats.has(colorFormat)) {
      highlightConfig.colorFormat = colorFormat;
    }

    return highlightConfig;
  }

  nodeHighlightRequested({nodeId}: Protocol.Overlay.NodeHighlightRequestedEvent): void {
    const node = this._domModel.nodeForId(nodeId);
    if (node) {
      this.dispatchEventToListeners(Events.HighlightNodeRequested, node);
    }
  }

  static setInspectNodeHandler(handler: (arg0: DOMNode) => void): void {
    OverlayModel._inspectNodeHandler = handler;
  }

  inspectNodeRequested({backendNodeId}: Protocol.Overlay.InspectNodeRequestedEvent): void {
    const deferredNode = new DeferredDOMNode(this.target(), backendNodeId);
    if (OverlayModel._inspectNodeHandler) {
      deferredNode.resolvePromise().then(node => {
        if (node && OverlayModel._inspectNodeHandler) {
          OverlayModel._inspectNodeHandler(node);
        }
      });
    } else {
      Common.Revealer.reveal(deferredNode);
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

  static _inspectNodeHandler: ((node: DOMNode) => void)|null = null;
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
}


export interface Highlighter {
  highlightInOverlay(data: HighlightData, config: Protocol.Overlay.HighlightConfig): void;

  setInspectMode(mode: Protocol.Overlay.InspectMode, config: Protocol.Overlay.HighlightConfig): Promise<void>;

  highlightFrame(frameId: string): void;
}

class DefaultHighlighter implements Highlighter {
  _model: OverlayModel;
  constructor(model: OverlayModel) {
    this._model = model;
  }

  highlightInOverlay(data: HighlightData, highlightConfig: Protocol.Overlay.HighlightConfig): void {
    const {node, deferredNode, object, selectorList} =
        {node: undefined, deferredNode: undefined, object: undefined, selectorList: undefined, ...data};
    const nodeId = node ? node.id : undefined;
    const backendNodeId = deferredNode ? deferredNode.backendNodeId() : undefined;
    const objectId = object ? object.objectId : undefined;
    if (nodeId || backendNodeId || objectId) {
      this._model.target().overlayAgent().invoke_highlightNode(
          {highlightConfig, nodeId, backendNodeId, objectId, selector: selectorList});
    } else {
      this._model.target().overlayAgent().invoke_hideHighlight();
    }
  }

  async setInspectMode(mode: Protocol.Overlay.InspectMode, highlightConfig: Protocol.Overlay.HighlightConfig):
      Promise<void> {
    await this._model.target().overlayAgent().invoke_setInspectMode({mode, highlightConfig});
  }

  highlightFrame(frameId: string): void {
    this._model.target().overlayAgent().invoke_highlightFrame({
      frameId,
      contentColor: Common.Color.PageHighlight.Content.toProtocolRGBA(),
      contentOutlineColor: Common.Color.PageHighlight.ContentOutline.toProtocolRGBA(),
    });
  }
}

export class SourceOrderHighlighter {
  _model: OverlayModel;
  constructor(model: OverlayModel) {
    this._model = model;
  }

  highlightSourceOrderInOverlay(node: DOMNode, sourceOrderConfig: Protocol.Overlay.SourceOrderConfig): void {
    this._model.setSourceOrderActive(true);
    this._model.setShowViewportSizeOnResize(false);
    this._model._overlayAgent.invoke_highlightSourceOrder({sourceOrderConfig, nodeId: node.id});
  }

  hideSourceOrderHighlight(): void {
    this._model.setSourceOrderActive(false);
    this._model.setShowViewportSizeOnResize(true);
    this._model.clearHighlight();
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

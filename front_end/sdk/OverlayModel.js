// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Common from '../common/common.js';

import {DebuggerModel, Events as DebuggerModelEvents} from './DebuggerModel.js';
import {DeferredDOMNode, DOMModel, DOMNode} from './DOMModel.js';  // eslint-disable-line no-unused-vars
import {RemoteObject} from './RemoteObject.js';                    // eslint-disable-line no-unused-vars
import {Capability, SDKModel, Target, TargetManager} from './SDKModel.js';  // eslint-disable-line no-unused-vars

/**
 * @typedef {{r: number, g: number, b: number, a: number}}
 */
export let HighlightColor;

/**
 * @typedef {{x: number, y: number, width: number, height: number, color: HighlightColor, outlineColor: HighlightColor}}
 */
export let HighlightRect;

/** @typedef {!{width: number, height: number, x: number, y: number, contentColor:HighlightColor, outlineColor: HighlightColor}} */
export let Hinge;

/**
 * @implements {Protocol.OverlayDispatcher}
 */
export class OverlayModel extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);
    this._domModel = /** @type {!DOMModel} */ (target.model(DOMModel));

    target.registerOverlayDispatcher(this);
    this._overlayAgent = target.overlayAgent();

    this._debuggerModel = target.model(DebuggerModel);
    if (this._debuggerModel) {
      Common.Settings.Settings.instance()
          .moduleSetting('disablePausedStateOverlay')
          .addChangeListener(this._updatePausedInDebuggerMessage, this);
      this._debuggerModel.addEventListener(DebuggerModelEvents.DebuggerPaused, event => {
        this._updatePausedInDebuggerMessage();
      }, this);
      this._debuggerModel.addEventListener(DebuggerModelEvents.DebuggerResumed, event => {
        this._updatePausedInDebuggerMessage();
      }, this);
      // TODO(dgozman): we should get DebuggerResumed on navigations instead of listening to GlobalObjectCleared.
      this._debuggerModel.addEventListener(DebuggerModelEvents.GlobalObjectCleared, event => {
        this._updatePausedInDebuggerMessage();
      }, this);
    }

    this._inspectModeEnabled = false;
    this._gridFeaturesExperimentEnabled = Root.Runtime.experiments.isEnabled('cssGridFeatures');

    /** @type {?Common.Settings.Setting<*>} */
    this._showGridBorderSetting = null;
    /** @type {?Common.Settings.Setting<*>} */
    this._showGridLinesSetting = null;
    /** @type {?Common.Settings.Setting<*>} */
    this._showGridLineNumbersSetting = null;
    /** @type {?Common.Settings.Setting<*>} */
    this._showGridGapsSetting = null;
    /** @type {?Common.Settings.Setting<*>} */
    this._showGridAreasSetting = null;
    /** @type {?Common.Settings.Setting<*>} */
    this._showGridTrackSizesSetting = null;
    if (this._gridFeaturesExperimentEnabled) {
      this._registerGridSettingsTelemetry();
    }
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

    this._registeredListeners = [];
    this._showViewportSizeOnResize = true;
    if (!target.suspended()) {
      this._overlayAgent.enable();
      this._wireAgentToSettings();
    }
  }

  /**
   * @param {!RemoteObject} object
   */
  static highlightObjectAsDOMNode(object) {
    const domModel = object.runtimeModel().target().model(DOMModel);
    if (domModel) {
      domModel.overlayModel().highlightInOverlay({object});
    }
  }

  static hideDOMNodeHighlight() {
    for (const overlayModel of TargetManager.instance().models(OverlayModel)) {
      overlayModel._delayedHideHighlight(0);
    }
  }

  static async muteHighlight() {
    return Promise.all(TargetManager.instance().models(OverlayModel).map(model => model.suspendModel()));
  }

  static async unmuteHighlight() {
    return Promise.all(TargetManager.instance().models(OverlayModel).map(model => model.resumeModel()));
  }

  /**
   * @param {!HighlightRect} rect
   */
  static highlightRect(rect) {
    for (const overlayModel of TargetManager.instance().models(OverlayModel)) {
      overlayModel.highlightRect(rect);
    }
  }

  static clearHighlight() {
    for (const overlayModel of TargetManager.instance().models(OverlayModel)) {
      overlayModel.clearHighlight();
    }
  }

  /**
   * @param {!HighlightRect} rect
   * @return {!Promise<*>}
   */
  highlightRect({x, y, width, height, color, outlineColor}) {
    const highlightColor = color || {r: 255, g: 0, b: 255, a: 0.3};
    const highlightOutlineColor = outlineColor || {r: 255, g: 0, b: 255, a: 0.5};
    return this._overlayAgent.invoke_highlightRect(
        {x, y, width, height, color: highlightColor, outlineColor: highlightOutlineColor});
  }

  /**
   * @return {!Promise<*>}
   */
  clearHighlight() {
    return this._overlayAgent.invoke_hideHighlight({});
  }

  /**
   * @return {!Promise<void>}
   */
  _wireAgentToSettings() {
    this._registeredListeners = [
      this._showPaintRectsSetting.addChangeListener(
          () => this._overlayAgent.setShowPaintRects(this._showPaintRectsSetting.get())),
      this._showLayoutShiftRegionsSetting.addChangeListener(
          () => this._overlayAgent.setShowLayoutShiftRegions(this._showLayoutShiftRegionsSetting.get())),
      this._showAdHighlightsSetting.addChangeListener(
          () => this._overlayAgent.setShowAdHighlights(this._showAdHighlightsSetting.get())),
      this._showDebugBordersSetting.addChangeListener(
          () => this._overlayAgent.setShowDebugBorders(this._showDebugBordersSetting.get())),
      this._showFPSCounterSetting.addChangeListener(
          () => this._overlayAgent.setShowFPSCounter(this._showFPSCounterSetting.get())),
      this._showScrollBottleneckRectsSetting.addChangeListener(
          () => this._overlayAgent.setShowScrollBottleneckRects(this._showScrollBottleneckRectsSetting.get())),
      this._showHitTestBordersSetting.addChangeListener(
          () => this._overlayAgent.setShowHitTestBorders(this._showHitTestBordersSetting.get()))
    ];

    if (this._showPaintRectsSetting.get()) {
      this._overlayAgent.setShowPaintRects(true);
    }
    if (this._showLayoutShiftRegionsSetting.get()) {
      this._overlayAgent.setShowLayoutShiftRegions(true);
    }
    if (this._showAdHighlightsSetting.get()) {
      this._overlayAgent.setShowAdHighlights(true);
    }
    if (this._showDebugBordersSetting.get()) {
      this._overlayAgent.setShowDebugBorders(true);
    }
    if (this._showFPSCounterSetting.get()) {
      this._overlayAgent.setShowFPSCounter(true);
    }
    if (this._showScrollBottleneckRectsSetting.get()) {
      this._overlayAgent.setShowScrollBottleneckRects(true);
    }
    if (this._showHitTestBordersSetting.get()) {
      this._overlayAgent.setShowHitTestBorders(true);
    }
    if (this._debuggerModel.isPaused()) {
      this._updatePausedInDebuggerMessage();
    }
    return this._overlayAgent.setShowViewportSizeOnResize(this._showViewportSizeOnResize);
  }

  _registerGridSettingsTelemetry() {
    this._showGridBorderSetting = Common.Settings.Settings.instance().moduleSetting('showGridBorder');
    this._showGridLinesSetting = Common.Settings.Settings.instance().moduleSetting('showGridLines');
    this._showGridLineNumbersSetting = Common.Settings.Settings.instance().moduleSetting('showGridLineNumbers');
    this._showGridGapsSetting = Common.Settings.Settings.instance().moduleSetting('showGridGaps');
    this._showGridAreasSetting = Common.Settings.Settings.instance().moduleSetting('showGridAreas');
    this._showGridTrackSizesSetting = Common.Settings.Settings.instance().moduleSetting('showGridTrackSizes');

    this._showGridBorderSetting.addChangeListener(() => this._recordGridSettingChange(this._showGridBorderSetting));
    this._showGridLinesSetting.addChangeListener(() => this._recordGridSettingChange(this._showGridLinesSetting));
    this._showGridLineNumbersSetting.addChangeListener(
        () => this._recordGridSettingChange(this._showGridLineNumbersSetting));
    this._showGridGapsSetting.addChangeListener(() => this._recordGridSettingChange(this._showGridGapsSetting));
    this._showGridAreasSetting.addChangeListener(() => this._recordGridSettingChange(this._showGridAreasSetting));
    this._showGridTrackSizesSetting.addChangeListener(
        () => this._recordGridSettingChange(this._showGridTrackSizesSetting));
  }

  /**
   * @param {?Common.Settings.Setting<*>} setting
   */
  _recordGridSettingChange(setting) {
    if (!setting) {
      return;
    }
    Host.userMetrics.gridSettingChanged(`${setting.name}.${setting.get()}`);
  }

  /**
   * @override
   * @return {!Promise<void>}
   */
  suspendModel() {
    Common.EventTarget.EventTarget.removeEventListeners(this._registeredListeners);
    return this._overlayAgent.disable();
  }

  /**
   * @override
   * @return {!Promise<void>}
   */
  resumeModel() {
    this._overlayAgent.enable();
    return this._wireAgentToSettings();
  }

  /**
   * @param {boolean} show
   */
  setShowViewportSizeOnResize(show) {
    this._showViewportSizeOnResize = show;
    if (this.target().suspended()) {
      return;
    }
    this._overlayAgent.setShowViewportSizeOnResize(show);
  }

  _updatePausedInDebuggerMessage() {
    if (this.target().suspended()) {
      return;
    }
    const message = this._debuggerModel.isPaused() &&
            !Common.Settings.Settings.instance().moduleSetting('disablePausedStateOverlay').get() ?
        Common.UIString.UIString('Paused in debugger') :
        undefined;
    this._overlayAgent.setPausedInDebuggerMessage(message);
  }

  /**
   * @param {?Highlighter} highlighter
   */
  setHighlighter(highlighter) {
    this._highlighter = highlighter || this._defaultHighlighter;
  }

  /**
   * @param {!Protocol.Overlay.InspectMode} mode
   * @param {boolean=} showDetailedTooltip
   * @return {!Promise<void>}
   */
  async setInspectMode(mode, showDetailedTooltip = true) {
    await this._domModel.requestDocument();
    this._inspectModeEnabled = mode !== Protocol.Overlay.InspectMode.None;
    this.dispatchEventToListeners(Events.InspectModeWillBeToggled, this);
    this._highlighter.setInspectMode(mode, this._buildHighlightConfig('all', showDetailedTooltip));
  }

  /**
   * @return {boolean}
   */
  inspectModeEnabled() {
    return this._inspectModeEnabled;
  }

  /**
   * @param {!HighlightData} data
   * @param {string=} mode
   * @param {boolean=} showInfo
   */
  highlightInOverlay(data, mode, showInfo) {
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

  /**
   * @param {!HighlightData} data
   */
  highlightInOverlayForTwoSeconds(data) {
    this.highlightInOverlay(data);
    this._delayedHideHighlight(2000);
  }

  /**
   * @param {number} delay
   */
  _delayedHideHighlight(delay) {
    if (this._hideHighlightTimeout === null) {
      this._hideHighlightTimeout = setTimeout(() => this.highlightInOverlay({}), delay);
    }
  }

  /**
   * @param {!Protocol.Page.FrameId} frameId
   */
  highlightFrame(frameId) {
    if (this._hideHighlightTimeout) {
      clearTimeout(this._hideHighlightTimeout);
      this._hideHighlightTimeout = null;
    }
    this._highlighter.highlightFrame(frameId);
  }

  /**
   * @param {boolean} show
   * @param {?Hinge} hinge
   */
  showHingeForDualScreen(show, hinge = null) {
    if (show) {
      const {x, y, width, height, contentColor, outlineColor} = hinge;
      this._overlayAgent.setShowHinge(
          {rect: {x: x, y: y, width: width, height: height}, contentColor: contentColor, outlineColor: outlineColor});
    } else {
      this._overlayAgent.setShowHinge();
    }
  }

  /**
   * @return {!Protocol.Overlay.GridHighlightConfig}
   */
  _buildGridHighlightConfig() {
    let showGridBorder = false;
    let gridBorderDashed = false;
    switch (this._showGridBorderSetting.get()) {
      case 'dashed':
        showGridBorder = true;
        gridBorderDashed = true;
        break;
      case 'solid':
        showGridBorder = true;
        break;
      default:
        break;
    }
    let showGridLines = false;
    let gridLinesDashed = false;
    let showGridExtensionLines;
    switch (this._showGridLinesSetting.get()) {
      case 'dashed':
        showGridLines = true;
        gridLinesDashed = true;
        break;
      case 'solid':
        showGridLines = true;
        break;
      case 'extended-dashed':
        showGridLines = true;
        gridLinesDashed = true;
        showGridExtensionLines = true;
        break;
      case 'extended-solid':
        showGridLines = true;
        showGridExtensionLines = true;
        break;
      default:
        break;
    }
    // Add background to help distinguish rows/columns when cell borders are not outlined
    const addBackgroundsToGaps = !showGridLines;
    let showPositiveLineNumbers = false;
    let showNegativeLineNumbers = false;
    switch (this._showGridLineNumbersSetting.get()) {
      case 'positive':
        showPositiveLineNumbers = true;
        break;
      case 'negative':
        showNegativeLineNumbers = true;
        break;
      case 'both':
        showPositiveLineNumbers = true;
        showNegativeLineNumbers = true;
        break;
      default:
        break;
    }
    let showGridRowGaps = false;
    let showGridColumnGaps = false;
    switch (this._showGridGapsSetting.get()) {
      case 'both':
        showGridRowGaps = true;
        showGridColumnGaps = true;
        break;
      case 'row-gaps':
        showGridRowGaps = true;
        break;
      case 'column-gaps':
        showGridColumnGaps = true;
        break;
      default:
        break;
    }

    return {
      rowGapColor: (showGridRowGaps && addBackgroundsToGaps) ?
          Common.Color.PageHighlight.GridRowGapBackground.toProtocolRGBA() :
          undefined,
      rowHatchColor: showGridRowGaps ? Common.Color.PageHighlight.GridRowGapHatch.toProtocolRGBA() : undefined,
      columnGapColor: (showGridColumnGaps && addBackgroundsToGaps) ?
          Common.Color.PageHighlight.GridColumnGapBackground.toProtocolRGBA() :
          undefined,
      columnHatchColor: showGridColumnGaps ? Common.Color.PageHighlight.GridColumnGapHatch.toProtocolRGBA() : undefined,
      gridBorderColor: showGridBorder ? Common.Color.PageHighlight.GridBorder.toProtocolRGBA() : undefined,
      gridBorderDash: gridBorderDashed,
      cellBorderColor: showGridLines ? Common.Color.PageHighlight.GridCellBorder.toProtocolRGBA() : undefined,
      cellBorderDash: gridLinesDashed,
      showGridExtensionLines,
      showPositiveLineNumbers,
      showNegativeLineNumbers,
      showAreaNames: /** @type {boolean} */ (this._showGridAreasSetting.get()),
      showTrackSizes: /** @type {boolean} */ (this._showGridTrackSizesSetting.get()),
      areaBorderColor: Common.Color.PageHighlight.GridAreaBorder.toProtocolRGBA(),
    };
  }

  /**
   * @param {string=} mode
   * @param {boolean=} showDetailedToolip
   * @return {!Protocol.Overlay.HighlightConfig}
   */
  _buildHighlightConfig(mode = 'all', showDetailedToolip = false) {
    const showRulers = Common.Settings.Settings.instance().moduleSetting('showMetricsRulers').get();
    const colorFormat = Common.Settings.Settings.instance().moduleSetting('colorFormat').get();
    const highlightConfig = {
      showInfo: mode === 'all',
      showRulers: showRulers,
      showStyles: showDetailedToolip,
      showAccessibilityInfo: showDetailedToolip,
      showExtensionLines: showRulers,
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
    }

    if (mode === 'all') {
      if (this._gridFeaturesExperimentEnabled) {
        highlightConfig.gridHighlightConfig = this._buildGridHighlightConfig();
      } else {
        // Support for the legacy grid cell highlight.
        highlightConfig.cssGridColor = Common.Color.PageHighlight.CssGrid.toProtocolRGBA();
      }
    }

    if (mode.endsWith('gap') && this._gridFeaturesExperimentEnabled) {
      highlightConfig.gridHighlightConfig = {
        gridBorderColor: Common.Color.PageHighlight.GridBorder.toProtocolRGBA(),
        gridBorderDash: true
      };

      if (mode === 'gap' || mode === 'row-gap') {
        highlightConfig.gridHighlightConfig.rowGapColor =
            Common.Color.PageHighlight.GridRowGapBackground.toProtocolRGBA();
        highlightConfig.gridHighlightConfig.rowHatchColor = Common.Color.PageHighlight.GridRowGapHatch.toProtocolRGBA();
      }
      if (mode === 'gap' || mode === 'column-gap') {
        highlightConfig.gridHighlightConfig.columnGapColor =
            Common.Color.PageHighlight.GridColumnGapBackground.toProtocolRGBA();
        highlightConfig.gridHighlightConfig.columnHatchColor =
            Common.Color.PageHighlight.GridColumnGapHatch.toProtocolRGBA();
      }
    }

    if (mode === 'grid-areas' && this._gridFeaturesExperimentEnabled) {
      highlightConfig.gridHighlightConfig = {
        cellBorderColor: Common.Color.PageHighlight.GridCellBorder.toProtocolRGBA(),
        cellBorderDash: true,
        showAreaNames: true,
        areaBorderColor: Common.Color.PageHighlight.GridAreaBorder.toProtocolRGBA()
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

  /**
   * @override
   * @param {!Protocol.DOM.NodeId} nodeId
   */
  nodeHighlightRequested(nodeId) {
    const node = this._domModel.nodeForId(nodeId);
    if (node) {
      this.dispatchEventToListeners(Events.HighlightNodeRequested, node);
    }
  }

  /**
   * @param {function(!DOMNode):void} handler
   */
  static setInspectNodeHandler(handler) {
    OverlayModel._inspectNodeHandler = handler;
  }

  /**
   * @override
   * @param {!Protocol.DOM.BackendNodeId} backendNodeId
   */
  inspectNodeRequested(backendNodeId) {
    const deferredNode = new DeferredDOMNode(this.target(), backendNodeId);
    if (OverlayModel._inspectNodeHandler) {
      deferredNode.resolvePromise().then(node => {
        if (node) {
          OverlayModel._inspectNodeHandler(node);
        }
      });
    } else {
      Common.Revealer.reveal(deferredNode);
    }
    this.dispatchEventToListeners(Events.ExitedInspectMode);
  }

  /**
   * @override
   * @param {!Protocol.Page.Viewport} viewport
   */
  screenshotRequested(viewport) {
    this.dispatchEventToListeners(Events.ScreenshotRequested, viewport);
    this.dispatchEventToListeners(Events.ExitedInspectMode);
  }

  /**
   * @override
   */
  inspectModeCanceled() {
    this.dispatchEventToListeners(Events.ExitedInspectMode);
  }
}

/** @enum {symbol} */
export const Events = {
  InspectModeWillBeToggled: Symbol('InspectModeWillBeToggled'),
  ExitedInspectMode: Symbol('InspectModeExited'),
  HighlightNodeRequested: Symbol('HighlightNodeRequested'),
  ScreenshotRequested: Symbol('ScreenshotRequested'),
};

/**
 * @interface
 */
export class Highlighter {
  /**
   * @param {!HighlightData} data
   * @param {!Protocol.Overlay.HighlightConfig} config
   */
  highlightInOverlay(data, config) {
  }

  /**
   * @param {!Protocol.Overlay.InspectMode} mode
   * @param {!Protocol.Overlay.HighlightConfig} config
   * @return {!Promise<void>}
   */
  setInspectMode(mode, config) {
  }

  /**
   * @param {!Protocol.Page.FrameId} frameId
   */
  highlightFrame(frameId) {}
}

/**
 * @implements {Highlighter}
 */
class DefaultHighlighter {
  /**
   * @param {!OverlayModel} model
   */
  constructor(model) {
    this._model = model;
  }

  /**
   * @override
   * @param {!HighlightData} data
   * @param {!Protocol.Overlay.HighlightConfig} config
   */
  highlightInOverlay(data, config) {
    const {node, deferredNode, object, selectorList} = data;
    const nodeId = node ? node.id : undefined;
    const backendNodeId = deferredNode ? deferredNode.backendNodeId() : undefined;
    const objectId = object ? object.objectId : undefined;
    if (nodeId || backendNodeId || objectId) {
      this._model._overlayAgent.highlightNode(config, nodeId, backendNodeId, objectId, selectorList);
    } else {
      this._model._overlayAgent.hideHighlight();
    }
  }

  /**
   * @override
   * @param {!Protocol.Overlay.InspectMode} mode
   * @param {!Protocol.Overlay.HighlightConfig} config
   * @return {!Promise<void>}
   */
  setInspectMode(mode, config) {
    return this._model._overlayAgent.setInspectMode(mode, config);
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameId} frameId
   */
  highlightFrame(frameId) {
    this._model._overlayAgent.highlightFrame(
        frameId, Common.Color.PageHighlight.Content.toProtocolRGBA(),
        Common.Color.PageHighlight.ContentOutline.toProtocolRGBA());
  }
}

SDKModel.register(OverlayModel, Capability.DOM, true);

/** @typedef {{node: (!DOMNode|undefined),
 deferredNode: (!DeferredDOMNode|undefined),
 selectorList: (string|undefined),
 object:(!RemoteObject|undefined)}} */
export let HighlightData;

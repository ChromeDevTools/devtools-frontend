// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as Root from '../root/root.js';

import {DebuggerModel, Events as DebuggerModelEvents} from './DebuggerModel.js';
import {DeferredDOMNode, DOMModel, DOMNode, Events as DOMModelEvents} from './DOMModel.js';  // eslint-disable-line no-unused-vars
import {RemoteObject} from './RemoteObject.js';                             // eslint-disable-line no-unused-vars
import {Capability, SDKModel, Target, TargetManager} from './SDKModel.js';  // eslint-disable-line no-unused-vars


/**
 * @typedef {{r: number, g: number, b: number, a: number}}
 */
// @ts-ignore typedef
export let HighlightColor;

/**
 * @typedef {{x: number, y: number, width: number, height: number, color: HighlightColor, outlineColor: HighlightColor}}
 */
// @ts-ignore typedef
export let HighlightRect;

/** @typedef {!{width: number, height: number, x: number, y: number, contentColor:HighlightColor, outlineColor: HighlightColor}} */
// @ts-ignore typedef
export let Hinge;

/**
 * @implements {ProtocolProxyApi.OverlayDispatcher}
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
      this._debuggerModel.addEventListener(
          DebuggerModelEvents.DebuggerPaused, this._updatePausedInDebuggerMessage, this);
      this._debuggerModel.addEventListener(
          DebuggerModelEvents.DebuggerResumed, this._updatePausedInDebuggerMessage, this);
      // TODO(dgozman): we should get DebuggerResumed on navigations instead of listening to GlobalObjectCleared.
      this._debuggerModel.addEventListener(
          DebuggerModelEvents.GlobalObjectCleared, this._updatePausedInDebuggerMessage, this);
    }

    this._inspectModeEnabled = false;
    this._gridFeaturesExperimentEnabled = Root.Runtime.experiments.isEnabled('cssGridFeatures');

    this._hideHighlightTimeout = null;
    /** @type {!Highlighter} */
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

    /**
     * @type {!Array<!Common.EventTarget.EventDescriptor>}
     */
    this._registeredListeners = [];
    /** @type {boolean} */
    this._showViewportSizeOnResize = true;
    if (!target.suspended()) {
      this._overlayAgent.invoke_enable();
      this._wireAgentToSettings();
    }

    /** @type {?DefaultPersistentGridHighlighter} */
    this._persistentGridHighlighter = null;
    if (this._gridFeaturesExperimentEnabled) {
      this._persistentGridHighlighter = new DefaultPersistentGridHighlighter(this);
      this._domModel.addEventListener(DOMModelEvents.NodeRemoved, () => {
        if (!this._persistentGridHighlighter) {
          return;
        }
        this._persistentGridHighlighter.refreshHighlights();
      });
      this._domModel.addEventListener(DOMModelEvents.DocumentUpdated, () => {
        if (!this._persistentGridHighlighter) {
          return;
        }
        this._persistentGridHighlighter.hideAllInOverlay();
      });
    }
    this._sourceOrderHighlighter = new SourceOrderHighlighter(this);
    this._sourceOrderModeActive = false;
  }

  /**
   * @return {!Protocol.UsesObjectNotation}
   */
  usesObjectNotation() {
    return true;
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
   * @return {!DOMModel}
   */
  getDOMModel() {
    return this._domModel;
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
    return this._overlayAgent.invoke_hideHighlight();
  }

  /**
   * @return {!Promise<void>}
   */
  async _wireAgentToSettings() {
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
          () => this._overlayAgent.invoke_setShowHitTestBorders({show: this._showHitTestBordersSetting.get()}))
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
    if (this._debuggerModel.isPaused()) {
      this._updatePausedInDebuggerMessage();
    }
    await this._overlayAgent.invoke_setShowViewportSizeOnResize({show: this._showViewportSizeOnResize});
  }

  /**
   * @override
   * @return {!Promise<void>}
   */
  async suspendModel() {
    Common.EventTarget.EventTarget.removeEventListeners(this._registeredListeners);
    await this._overlayAgent.invoke_disable();
  }

  /**
   * @override
   * @return {!Promise<void>}
   */
  async resumeModel() {
    await Promise.all([this._overlayAgent.invoke_enable(), this._wireAgentToSettings()]);
  }

  /**
   * @param {boolean} show
   */
  setShowViewportSizeOnResize(show) {
    if (this._showViewportSizeOnResize === show) {
      return;
    }

    this._showViewportSizeOnResize = show;
    if (this.target().suspended()) {
      return;
    }
    this._overlayAgent.invoke_setShowViewportSizeOnResize({show});
  }

  _updatePausedInDebuggerMessage() {
    if (this.target().suspended()) {
      return;
    }
    const message = this._debuggerModel.isPaused() &&
            !Common.Settings.Settings.instance().moduleSetting('disablePausedStateOverlay').get() ?
        Common.UIString.UIString('Paused in debugger') :
        undefined;
    this._overlayAgent.invoke_setPausedInDebuggerMessage({message});
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

  /**
   * @param {!HighlightData} data
   */
  highlightInOverlayForTwoSeconds(data) {
    this.highlightInOverlay(data);
    this._delayedHideHighlight(2000);
  }

  /**
   * @param {number} nodeId
   * @param {!Host.UserMetrics.GridOverlayOpener} gridOverlayOpener
   */
  highlightGridInPersistentOverlay(nodeId, gridOverlayOpener) {
    if (!this._persistentGridHighlighter) {
      return;
    }
    this._persistentGridHighlighter.highlightInOverlay(nodeId);
    Host.userMetrics.gridOverlayOpenedFrom(gridOverlayOpener);
    this.dispatchEventToListeners(Events.PersistentGridOverlayStateChanged, {nodeId, enabled: true});
  }

  /**
   * @param {number} nodeId
   */
  isHighlightedGridInPersistentOverlay(nodeId) {
    if (!this._persistentGridHighlighter) {
      return;
    }
    return this._persistentGridHighlighter.isHighlighted(nodeId);
  }

  /**
   * @param {number} nodeId
   */
  hideGridInPersistentOverlay(nodeId) {
    if (!this._persistentGridHighlighter) {
      return;
    }
    this._persistentGridHighlighter.hideInOverlay(nodeId);
    this.dispatchEventToListeners(Events.PersistentGridOverlayStateChanged, {nodeId, enabled: false});
  }

  /**
   * @param {!DOMNode} node
   */
  highlightSourceOrderInOverlay(node) {
    const sourceOrderConfig = {
      parentOutlineColor: Common.Color.SourceOrderHighlight.ParentOutline.toProtocolRGBA(),
      childOutlineColor: Common.Color.SourceOrderHighlight.ChildOutline.toProtocolRGBA(),
    };
    this._sourceOrderHighlighter.highlightSourceOrderInOverlay(node, sourceOrderConfig);
  }

  /**
   * @param {number} nodeId
   * @return {string|null}
   */
  colorOfGridInPersistentOverlay(nodeId) {
    if (!this._persistentGridHighlighter) {
      return null;
    }
    return this._persistentGridHighlighter.colorOfGrid(nodeId).asString(Common.Color.Format.HEX);
  }

  /**
   * @param {number} nodeId
   * @param {string} colorStr
   */
  setColorOfGridInPersistentOverlay(nodeId, colorStr) {
    if (!this._persistentGridHighlighter) {
      return;
    }
    const color = Common.Color.Color.parse(colorStr);
    if (!color) {
      return;
    }
    this._persistentGridHighlighter.setColorOfGrid(nodeId, color);
    this._persistentGridHighlighter._resetOverlay();
  }

  hideSourceOrderInOverlay() {
    this._sourceOrderHighlighter.hideSourceOrderHighlight();
  }

  /**
   * @param {boolean} isActive
   */
  setSourceOrderActive(isActive) {
    this._sourceOrderModeActive = isActive;
  }

  sourceOrderModeActive() {
    return this._sourceOrderModeActive;
  }

  /**
   * @param {number} delay
   */
  _delayedHideHighlight(delay) {
    if (this._hideHighlightTimeout === null) {
      this._hideHighlightTimeout = setTimeout(() => this.highlightInOverlay({clear: true}), delay);
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
   * @param {?Hinge} hinge
   */
  showHingeForDualScreen(hinge) {
    if (hinge) {
      const {x, y, width, height, contentColor, outlineColor} = hinge;
      this._overlayAgent.invoke_setShowHinge({
        hingeConfig:
            {rect: {x: x, y: y, width: width, height: height}, contentColor: contentColor, outlineColor: outlineColor}
      });
    } else {
      this._overlayAgent.invoke_setShowHinge({});
    }
  }

  /**
   * @param {string=} mode
   * @param {boolean=} showDetailedToolip
   * @return {!Protocol.Overlay.HighlightConfig}
   */
  _buildHighlightConfig(mode = 'all', showDetailedToolip = false) {
    const showRulers = Common.Settings.Settings.instance().moduleSetting('showMetricsRulers').get();
    const colorFormat = Common.Settings.Settings.instance().moduleSetting('colorFormat').get();

    /** @type {!Protocol.Overlay.HighlightConfig} */
    const highlightConfig = {
      showInfo: mode === 'all',
      showRulers: showRulers,
      showStyles: showDetailedToolip,
      showAccessibilityInfo: showDetailedToolip,
      showExtensionLines: showRulers,
      gridHighlightConfig: {},
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
        rowGapColor: Common.Color.PageHighlight.GridRowGapBackground.toProtocolRGBA(),
        rowHatchColor: Common.Color.PageHighlight.GridRowGapHatch.toProtocolRGBA(),
        columnGapColor: Common.Color.PageHighlight.GridColumnGapBackground.toProtocolRGBA(),
        columnHatchColor: Common.Color.PageHighlight.GridColumnGapHatch.toProtocolRGBA(),
        rowLineColor: Common.Color.PageHighlight.GridRowLine.toProtocolRGBA(),
        columnLineColor: Common.Color.PageHighlight.GridColumnLine.toProtocolRGBA(),
        rowLineDash: true,
        columnLineDash: true,
      };
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
        rowLineColor: Common.Color.PageHighlight.GridRowLine.toProtocolRGBA(),
        columnLineColor: Common.Color.PageHighlight.GridColumnLine.toProtocolRGBA(),
        rowLineDash: true,
        columnLineDash: true,
        showAreaNames: true,
        areaBorderColor: Common.Color.PageHighlight.GridAreaBorder.toProtocolRGBA()
      };
    }

    if (mode === 'grid-template-columns' && this._gridFeaturesExperimentEnabled) {
      highlightConfig.contentColor = Common.Color.PageHighlight.Content.toProtocolRGBA();
      highlightConfig.gridHighlightConfig = {
        columnLineColor: Common.Color.PageHighlight.GridColumnLine.toProtocolRGBA(),
        columnLineDash: true
      };
    }

    if (mode === 'grid-template-rows' && this._gridFeaturesExperimentEnabled) {
      highlightConfig.contentColor = Common.Color.PageHighlight.Content.toProtocolRGBA();
      highlightConfig.gridHighlightConfig = {
        rowLineColor: Common.Color.PageHighlight.GridRowLine.toProtocolRGBA(),
        rowLineDash: true
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
   * @param {!Protocol.Overlay.NodeHighlightRequestedEvent} event
   */
  nodeHighlightRequested({nodeId}) {
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
   * @param {!Protocol.Overlay.InspectNodeRequestedEvent} event
   */
  inspectNodeRequested({backendNodeId}) {
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

  /**
   * @override
   * @param {!Protocol.Overlay.ScreenshotRequestedEvent} event
   */
  screenshotRequested({viewport}) {
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

/** @type {?function(!DOMNode):void} */
OverlayModel._inspectNodeHandler = null;

/** @enum {symbol} */
export const Events = {
  InspectModeWillBeToggled: Symbol('InspectModeWillBeToggled'),
  ExitedInspectMode: Symbol('InspectModeExited'),
  HighlightNodeRequested: Symbol('HighlightNodeRequested'),
  ScreenshotRequested: Symbol('ScreenshotRequested'),
  PersistentGridOverlayCleared: Symbol('PersistentGridOverlayCleared'),
  PersistentGridOverlayStateChanged: Symbol('PersistentGridOverlayStateChanged'),
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
    throw Error('Unimplemented method');
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
   * @param {!Protocol.Overlay.HighlightConfig} highlightConfig
   */
  highlightInOverlay(data, highlightConfig) {
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

  /**
   * @override
   * @param {!Protocol.Overlay.InspectMode} mode
   * @param {!Protocol.Overlay.HighlightConfig} highlightConfig
   * @return {!Promise<void>}
   */
  async setInspectMode(mode, highlightConfig) {
    await this._model.target().overlayAgent().invoke_setInspectMode({mode, highlightConfig});
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameId} frameId
   */
  highlightFrame(frameId) {
    this._model.target().overlayAgent().invoke_highlightFrame({
      frameId,
      contentColor: Common.Color.PageHighlight.Content.toProtocolRGBA(),
      contentOutlineColor: Common.Color.PageHighlight.ContentOutline.toProtocolRGBA()
    });
  }
}

/**
 * @interface
 */
export class PersistentGridHighlighter {
  /**
   * @param {number} nodeId
   * @param {!Protocol.Overlay.GridHighlightConfig} config
   */
  highlightInOverlay(nodeId, config) {
  }

  /**
   * @param {number} nodeId
   */
  hideInOverlay(nodeId) {
  }

  hideAllInOverlay() {
  }

  refreshHighlights() {
  }

  /**
   * @param {number} nodeId
   * @return {boolean}
   */
  isHighlighted(nodeId) {
    return false;
  }
}

/**
 * @implements {PersistentGridHighlighter}
 */
class DefaultPersistentGridHighlighter {
  /**
   * @param {!OverlayModel} model
   */
  constructor(model) {
    this._model = model;

    /** @type {!Map<number, !Protocol.Overlay.GridHighlightConfig>} */
    this._gridHighlights = new Map();

    /** @type {!Map<number, !Common.Color.Color>} */
    this._gridColors = new Map();

    this._colorGenerator = new OverlayColorGenerator();

    /** @type {!Common.Settings.Setting<*>} */
    this._showGridLineLabelsSetting = Common.Settings.Settings.instance().moduleSetting('showGridLineLabels');
    this._showGridLineLabelsSetting.addChangeListener(this._onSettingChange, this);
    /** @type {!Common.Settings.Setting<*>} */
    this._extendGridLinesSetting = Common.Settings.Settings.instance().moduleSetting('extendGridLines');
    this._extendGridLinesSetting.addChangeListener(this._onSettingChange, this);
    /** @type {!Common.Settings.Setting<*>} */
    this._showGridAreasSetting = Common.Settings.Settings.instance().moduleSetting('showGridAreas');
    this._showGridAreasSetting.addChangeListener(this._onSettingChange, this);
    /** @type {!Common.Settings.Setting<*>} */
    this._showGridTrackSizesSetting = Common.Settings.Settings.instance().moduleSetting('showGridTrackSizes');
    this._showGridTrackSizesSetting.addChangeListener(this._onSettingChange, this);

    this._logCurrentGridSettings();

    // Debounce recording highlighted grids in order to avoid counting rapidly turning grids on and off.
    this._recordHighlightedGridCount = Common.Debouncer.debounce(this._doRecordHighlightedGridCount.bind(this), 1000);
    /** @type {!Array<number>} */
    this._previouslyRecordedGridCountNodeIds = [];
  }

  /**
   * @returns {boolean}
   */
  static getGridTelemetryLogged() {
    return DefaultPersistentGridHighlighter.gridTelemetryLogged;
  }

  /**
   * @param {boolean} isLogged
   */
  static setGridTelemetryLogged(isLogged) {
    DefaultPersistentGridHighlighter.gridTelemetryLogged = isLogged;
  }

  _onSettingChange() {
    this._resetOverlay();
  }

  _logCurrentGridSettings() {
    if (DefaultPersistentGridHighlighter.getGridTelemetryLogged()) {
      return;
    }
    this._recordGridSetting(this._showGridLineLabelsSetting);
    this._recordGridSetting(this._extendGridLinesSetting);
    this._recordGridSetting(this._showGridAreasSetting);
    this._recordGridSetting(this._showGridTrackSizesSetting);
    DefaultPersistentGridHighlighter.setGridTelemetryLogged(true);
  }

  /**
   * @param {?Common.Settings.Setting<*>} setting
   */
  _recordGridSetting(setting) {
    if (!setting) {
      return;
    }
    Host.userMetrics.cssGridSettings(`${setting.name}.${setting.get()}`);
  }

  _doRecordHighlightedGridCount() {
    const recordedNodeIds = [...this._gridHighlights.keys()];

    // If only settings changed, but not the list of highlighted grids, bail out.
    if (arraysEqual(recordedNodeIds, this._previouslyRecordedGridCountNodeIds)) {
      return;
    }

    Host.userMetrics.highlightedPersistentCssGridCount(recordedNodeIds.length);

    this._previouslyRecordedGridCountNodeIds = recordedNodeIds;
  }

  /**
   * @param {number} nodeId
   * @return {!Protocol.Overlay.GridHighlightConfig}
   */
  _buildGridHighlightConfig(nodeId) {
    const mainColor = this.colorOfGrid(nodeId);
    const background = mainColor.setAlpha(0.1);
    const gapBackground = mainColor.setAlpha(0.3);
    const gapHatch = mainColor.setAlpha(0.8);

    const showGridExtensionLines = /** @type {boolean} */ (this._extendGridLinesSetting.get());
    const showPositiveLineNumbers = this._showGridLineLabelsSetting.get() === 'lineNumbers';
    const showNegativeLineNumbers = showPositiveLineNumbers;
    const showLineNames = this._showGridLineLabelsSetting.get() === 'lineNames';
    return {
      rowGapColor: gapBackground.toProtocolRGBA(),
      rowHatchColor: gapHatch.toProtocolRGBA(),
      columnGapColor: gapBackground.toProtocolRGBA(),
      columnHatchColor: gapHatch.toProtocolRGBA(),
      gridBorderColor: mainColor.toProtocolRGBA(),
      gridBorderDash: false,
      rowLineColor: mainColor.toProtocolRGBA(),
      columnLineColor: mainColor.toProtocolRGBA(),
      rowLineDash: true,
      columnLineDash: true,
      showGridExtensionLines,
      showPositiveLineNumbers,
      showNegativeLineNumbers,
      showLineNames,
      showAreaNames: /** @type {boolean} */ (this._showGridAreasSetting.get()),
      showTrackSizes: /** @type {boolean} */ (this._showGridTrackSizesSetting.get()),
      areaBorderColor: mainColor.toProtocolRGBA(),
      gridBackgroundColor: background.toProtocolRGBA(),
    };
  }

  /**
   * @override
   * @param {number} nodeId
   */
  highlightInOverlay(nodeId) {
    this._gridHighlights.set(nodeId, this._buildGridHighlightConfig(nodeId));
    this._updateHighlightsInOverlay();
  }

  /**
   * @override
   * @param {number} nodeId
   * @return {boolean}
   */
  isHighlighted(nodeId) {
    return this._gridHighlights.has(nodeId);
  }

  /**
   * @param {number} nodeId
   * @return {!Common.Color.Color}
   */
  colorOfGrid(nodeId) {
    let color = this._gridColors.get(nodeId);
    if (!color) {
      color = this._colorGenerator.next();
      this._gridColors.set(nodeId, color);
    }

    return color;
  }

  /**
   * @param {number} nodeId
   * @param {!Common.Color.Color} color
   */
  setColorOfGrid(nodeId, color) {
    this._gridColors.set(nodeId, color);
  }

  /**
   * @override
   * @param {number} nodeId
   */
  hideInOverlay(nodeId) {
    if (this._gridHighlights.has(nodeId)) {
      this._gridHighlights.delete(nodeId);
      this._updateHighlightsInOverlay();
    }
  }

  /**
   * @override
   */
  hideAllInOverlay() {
    this._gridHighlights.clear();
    this._updateHighlightsInOverlay();
  }

  /**
   * @override
   */
  refreshHighlights() {
    let needsUpdate = false;
    for (const nodeId of this._gridHighlights.keys()) {
      if (this._model.getDOMModel().nodeForId(nodeId) === null) {
        this._gridHighlights.delete(nodeId);
        needsUpdate = true;
      }
    }
    if (needsUpdate) {
      this._updateHighlightsInOverlay();
    }
  }

  _resetOverlay() {
    for (const nodeId of this._gridHighlights.keys()) {
      this._gridHighlights.set(nodeId, this._buildGridHighlightConfig(nodeId));
    }
    this._updateHighlightsInOverlay();
  }

  _updateHighlightsInOverlay() {
    const hasGridNodesToHighlight = this._gridHighlights.size > 0;
    this._model.setShowViewportSizeOnResize(!hasGridNodesToHighlight);
    const overlayModel = this._model;
    const gridNodeHighlightConfigs = [];
    for (const [nodeId, gridHighlightConfig] of this._gridHighlights.entries()) {
      gridNodeHighlightConfigs.push({nodeId, gridHighlightConfig});
    }
    overlayModel.target().overlayAgent().invoke_setShowGridOverlays({gridNodeHighlightConfigs});
    this._recordHighlightedGridCount();
  }
}

DefaultPersistentGridHighlighter.gridTelemetryLogged = false;

/**
 * Used to cycle through a list of predetermined colors for the grid overlay.
 * This helps users differentiate between overlays when several are shown at the
 * same time.
 */
class OverlayColorGenerator {
  constructor() {
    this._colors = [
      // F59794
      new Common.Color.Color([0.9607843137254902, 0.592156862745098, 0.5803921568627451, 1], Common.Color.Format.RGBA),
      // F0BF4C
      new Common.Color.Color([0.9411764705882353, 0.7490196078431373, 0.2980392156862745, 1], Common.Color.Format.RGBA),
      // D4ED31
      new Common.Color.Color(
          [0.8313725490196079, 0.9294117647058824, 0.19215686274509805, 1], Common.Color.Format.RGBA),
      // 9EEB47
      new Common.Color.Color([0.6196078431372549, 0.9215686274509803, 0.2784313725490196, 1], Common.Color.Format.RGBA),
      // 5BD1D7
      new Common.Color.Color([0.3568627450980392, 0.8196078431372549, 0.8431372549019608, 1], Common.Color.Format.RGBA),
      // BCCEFB
      new Common.Color.Color([0.7372549019607844, 0.807843137254902, 0.984313725490196, 1], Common.Color.Format.RGBA),
      // C6BEEE
      new Common.Color.Color([0.7764705882352941, 0.7450980392156863, 0.9333333333333333, 1], Common.Color.Format.RGBA),
      // D094EA
      new Common.Color.Color([0.8156862745098039, 0.5803921568627451, 0.9176470588235294, 1], Common.Color.Format.RGBA),
      // EB94CF
      new Common.Color.Color([0.9215686274509803, 0.5803921568627451, 0.8117647058823529, 1], Common.Color.Format.RGBA),
    ];
    this._index = 0;
  }

  /**
   * Generate the next color in the spectrum
   * @return {!Common.Color.Color}
   */
  next() {
    const color = this._colors[this._index];
    this._index++;
    if (this._index >= this._colors.length) {
      this._index = 0;
    }

    return color;
  }
}

export class SourceOrderHighlighter {
  /**
   * @param {!OverlayModel} model
   */
  constructor(model) {
    this._model = model;
  }

  /**
   * @param {!DOMNode} node
   * @param {!Protocol.Overlay.SourceOrderConfig} sourceOrderConfig
   */
  highlightSourceOrderInOverlay(node, sourceOrderConfig) {
    this._model.setSourceOrderActive(true);
    this._model.setShowViewportSizeOnResize(false);
    this._model._overlayAgent.invoke_highlightSourceOrder({sourceOrderConfig, nodeId: node.id});
  }

  hideSourceOrderHighlight() {
    this._model.setSourceOrderActive(false);
    this._model.setShowViewportSizeOnResize(true);
    this._model.clearHighlight();
  }
}

SDKModel.register(OverlayModel, Capability.DOM, true);

/** @typedef {!{node: !DOMNode, selectorList: (string|undefined)} | !{deferredNode: DeferredDOMNode, selectorList: (string|undefined)} | !{object: !RemoteObject, selectorList: (string|undefined)} | !{clear: *}} */
// @ts-ignore typedef
export let HighlightData;

/**
 * Checks if 2 arrays are equal.
 * @param {!Array<*>} a1 The first array
 * @param {!Array<*>} a2 The second array
 * @return {boolean}
 */
const arraysEqual = (a1, a2) => {
  if (a1.length !== a2.length) {
    return false;
  }

  a1 = [...a1].sort();
  a2 = [...a2].sort();
  for (let i = 0; i < a1.length; i++) {
    if (a1[i] !== a2[i]) {
      return false;
    }
  }

  return true;
};

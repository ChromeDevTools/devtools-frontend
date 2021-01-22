// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Root from '../root/root.js';

import {DebuggerModel, Events as DebuggerModelEvents} from './DebuggerModel.js';
import {DeferredDOMNode, DOMModel, DOMNode, Events as DOMModelEvents} from './DOMModel.js';  // eslint-disable-line no-unused-vars
import {OverlayPersistentHighlighter} from './OverlayPersistentHighlighter.js';
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
    this._flexFeaturesExperimentEnabled = Root.Runtime.experiments.isEnabled('cssFlexboxFeatures');

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
    this._showWebVitalsSetting = Common.Settings.Settings.instance().moduleSetting('showWebVitals');

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

    /** @type {?OverlayPersistentHighlighter} */
    this._peristentHighlighter = new OverlayPersistentHighlighter(this, this._flexFeaturesExperimentEnabled);
    this._domModel.addEventListener(DOMModelEvents.NodeRemoved, () => {
      this._peristentHighlighter && this._peristentHighlighter.refreshHighlights();
    });
    this._domModel.addEventListener(DOMModelEvents.DocumentUpdated, () => {
      this._peristentHighlighter && this._peristentHighlighter.hideAllInOverlay();
    });

    this._sourceOrderHighlighter = new SourceOrderHighlighter(this);
    this._sourceOrderModeActive = false;
  }

  /**
   * @param {!RemoteObject} object
   */
  static highlightObjectAsDOMNode(object) {
    const domModel = object.runtimeModel().target().model(DOMModel);
    if (domModel) {
      domModel.overlayModel().highlightInOverlay({object, selectorList: undefined});
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
          () => this._overlayAgent.invoke_setShowHitTestBorders({show: this._showHitTestBordersSetting.get()})),
      this._showWebVitalsSetting.addChangeListener(
          () => this._overlayAgent.invoke_setShowWebVitals({show: this._showWebVitalsSetting.get()}))
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
    const message = this._debuggerModel && this._debuggerModel.isPaused() &&
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
   */
  highlightGridInPersistentOverlay(nodeId) {
    if (!this._peristentHighlighter) {
      return;
    }
    this._peristentHighlighter.highlightGridInOverlay(nodeId);
    this.dispatchEventToListeners(Events.PersistentGridOverlayStateChanged, {nodeId, enabled: true});
  }

  /**
   * @param {number} nodeId
   * @return {boolean}
   */
  isHighlightedGridInPersistentOverlay(nodeId) {
    if (!this._peristentHighlighter) {
      return false;
    }
    return this._peristentHighlighter.isGridHighlighted(nodeId);
  }

  /**
   * @param {number} nodeId
   */
  hideGridInPersistentOverlay(nodeId) {
    if (!this._peristentHighlighter) {
      return;
    }
    this._peristentHighlighter.hideGridInOverlay(nodeId);
    this.dispatchEventToListeners(Events.PersistentGridOverlayStateChanged, {nodeId, enabled: false});
  }

  /**
   * @param {number} nodeId
   */
  highlightFlexContainerInPersistentOverlay(nodeId) {
    if (!this._peristentHighlighter) {
      return;
    }
    this._peristentHighlighter.highlightFlexInOverlay(nodeId);
    this.dispatchEventToListeners(Events.PersistentFlexContainerOverlayStateChanged, {nodeId, enabled: true});
  }

  /**
   * @param {number} nodeId
   * @return {boolean}
   */
  isHighlightedFlexContainerInPersistentOverlay(nodeId) {
    if (!this._peristentHighlighter) {
      return false;
    }
    return this._peristentHighlighter.isFlexHighlighted(nodeId);
  }

  /**
   * @param {number} nodeId
   */
  hideFlexContainerInPersistentOverlay(nodeId) {
    if (!this._peristentHighlighter) {
      return;
    }
    this._peristentHighlighter.hideFlexInOverlay(nodeId);
    this.dispatchEventToListeners(Events.PersistentFlexContainerOverlayStateChanged, {nodeId, enabled: false});
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
    if (!this._peristentHighlighter) {
      return null;
    }
    return this._peristentHighlighter.colorOfGrid(nodeId).asString(Common.Color.Format.HEX);
  }

  /**
   * @param {number} nodeId
   * @param {string} colorStr
   */
  setColorOfGridInPersistentOverlay(nodeId, colorStr) {
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

  /**
   * @param {number} nodeId
   * @return {string|null}
   */
  colorOfFlexInPersistentOverlay(nodeId) {
    if (!this._peristentHighlighter) {
      return null;
    }
    return this._peristentHighlighter.colorOfFlex(nodeId).asString(Common.Color.Format.HEX);
  }

  /**
   * @param {number} nodeId
   * @param {string} colorStr
   */
  setColorOfFlexInPersistentOverlay(nodeId, colorStr) {
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
      flexContainerHighlightConfig: {},
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

      if (this._flexFeaturesExperimentEnabled) {
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
      }
    }

    if (mode.endsWith('gap')) {
      highlightConfig.gridHighlightConfig = {
        gridBorderColor: Common.Color.PageHighlight.GridBorder.toProtocolRGBA(),
        gridBorderDash: true
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

    if (mode.endsWith('gap') && this._flexFeaturesExperimentEnabled) {
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
        areaBorderColor: Common.Color.PageHighlight.GridAreaBorder.toProtocolRGBA()
      };
    }

    if (mode === 'grid-template-columns') {
      highlightConfig.contentColor = Common.Color.PageHighlight.Content.toProtocolRGBA();
      highlightConfig.gridHighlightConfig = {
        columnLineColor: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
        columnLineDash: true
      };
    }

    if (mode === 'grid-template-rows') {
      highlightConfig.contentColor = Common.Color.PageHighlight.Content.toProtocolRGBA();
      highlightConfig.gridHighlightConfig = {
        rowLineColor: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
        rowLineDash: true
      };
    }

    if (mode === 'justify-content' && this._flexFeaturesExperimentEnabled) {
      highlightConfig.flexContainerHighlightConfig = {
        containerBorder: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
          pattern: Protocol.Overlay.LineStylePattern.Dashed
        },
        mainDistributedSpace: {
          hatchColor: Common.Color.PageHighlight.GapHatch.toProtocolRGBA(),
          fillColor: Common.Color.PageHighlight.GapBackground.toProtocolRGBA(),
        }
      };
    }

    if (mode === 'align-content' && this._flexFeaturesExperimentEnabled) {
      highlightConfig.flexContainerHighlightConfig = {
        containerBorder: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
          pattern: Protocol.Overlay.LineStylePattern.Dashed
        },
        crossDistributedSpace: {
          hatchColor: Common.Color.PageHighlight.GapHatch.toProtocolRGBA(),
          fillColor: Common.Color.PageHighlight.GapBackground.toProtocolRGBA(),
        }
      };
    }

    if (mode === 'align-items' && this._flexFeaturesExperimentEnabled) {
      highlightConfig.flexContainerHighlightConfig = {
        containerBorder: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
          pattern: Protocol.Overlay.LineStylePattern.Dashed
        },
        lineSeparator: {
          color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA(),
          pattern: Protocol.Overlay.LineStylePattern.Dashed
        },
        crossAlignment: {color: Common.Color.PageHighlight.LayoutLine.toProtocolRGBA()}
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
  PersistentGridOverlayStateChanged: Symbol('PersistentGridOverlayStateChanged'),
  PersistentFlexContainerOverlayStateChanged: Symbol('PersistentFlexContainerOverlayStateChanged'),
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

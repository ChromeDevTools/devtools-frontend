// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import {DebuggerModel, Events as DebuggerModelEvents} from './DebuggerModel.js';
import {DeferredDOMNode, DOMModel, DOMNode} from './DOMModel.js';  // eslint-disable-line no-unused-vars
import {RemoteObject} from './RemoteObject.js';                    // eslint-disable-line no-unused-vars
import {Capability, SDKModel, Target, TargetManager} from './SDKModel.js';  // eslint-disable-line no-unused-vars

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
   * @return {!Promise}
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

  /**
   * @override
   * @return {!Promise}
   */
  suspendModel() {
    Common.EventTarget.EventTarget.removeEventListeners(this._registeredListeners);
    return this._overlayAgent.disable();
  }

  /**
   * @override
   * @return {!Promise}
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
   * @param {boolean=} showStyles
   * @return {!Promise}
   */
  async setInspectMode(mode, showStyles = true) {
    await this._domModel.requestDocument();
    this._inspectModeEnabled = mode !== Protocol.Overlay.InspectMode.None;
    this.dispatchEventToListeners(Events.InspectModeWillBeToggled, this);
    this._highlighter.setInspectMode(mode, this._buildHighlightConfig('all', showStyles));
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
   * @param {string=} mode
   * @param {boolean=} showStyles
   * @return {!Protocol.Overlay.HighlightConfig}
   */
  _buildHighlightConfig(mode = 'all', showStyles = false) {
    const showRulers = Common.Settings.Settings.instance().moduleSetting('showMetricsRulers').get();
    const highlightConfig =
        {showInfo: mode === 'all', showRulers: showRulers, showStyles, showExtensionLines: showRulers};
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
      highlightConfig.cssGridColor = Common.Color.PageHighlight.CssGrid.toProtocolRGBA();
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
   * @param {function(!DOMNode)} handler
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
   * @return {!Promise}
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
   * @return {!Promise}
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

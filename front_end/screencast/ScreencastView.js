/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {InputModel} from './InputModel.js';

export const UIStrings = {
  /**
  *@description Accessible alt text for the screencast canvas rendering of the debug target webpage
  */
  screencastViewOfDebugTarget: 'Screencast view of debug target',
  /**
  *@description Glass pane element text content in Screencast View of the Remote Devices tab when toggling screencast
  */
  theTabIsInactive: 'The tab is inactive',
  /**
  *@description Glass pane element text content in Screencast View of the Remote Devices tab when toggling screencast
  */
  profilingInProgress: 'Profiling in progress',
  /**
  *@description Accessible text for the screencast back button
  */
  back: 'back',
  /**
  *@description Accessible text for the screencast forward button
  */
  forward: 'forward',
  /**
  *@description Accessible text for the screencast reload button
  */
  reload: 'reload',
  /**
  *@description Accessible text for the address bar in screencast view
  */
  addressBar: 'Address bar',
};
const str_ = i18n.i18n.registerUIStrings('screencast/ScreencastView.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * @implements {SDK.OverlayModel.Highlighter}
 */
export class ScreencastView extends UI.Widget.VBox {
  /**
   * @param {!SDK.ScreenCaptureModel.ScreenCaptureModel} screenCaptureModel
   */
  constructor(screenCaptureModel) {
    super();
    this._screenCaptureModel = screenCaptureModel;
    this._domModel = screenCaptureModel.target().model(SDK.DOMModel.DOMModel);
    this._overlayModel = screenCaptureModel.target().model(SDK.OverlayModel.OverlayModel);
    this._resourceTreeModel = screenCaptureModel.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
    this._networkManager = screenCaptureModel.target().model(SDK.NetworkManager.NetworkManager);
    this._inputModel = screenCaptureModel.target().model(InputModel);

    this.setMinimumSize(150, 150);
    this.registerRequiredCSS('screencast/screencastView.css', {enableLegacyPatching: true});

    this._shortcuts = /** @type {!Object.<number, function(!Event=):boolean>} */ ({});
    this._scrollOffsetX = 0;
    this._scrollOffsetY = 0;
    this._screenZoom = 1;
    this._screenOffsetTop = 0;
    this._pageScaleFactor = 1;
    // These types are guaranteed to be initialized in initialize()
    // that is invoked right after constructing the object.
    /** @type {!HTMLImageElement} */
    this._imageElement;
    /** @type {!HTMLElement} */
    this._viewportElement;
    /** @type {!HTMLElement} */
    this._glassPaneElement;
    /** @type {!HTMLCanvasElement} */
    this._canvasElement;
    /** @type {!HTMLElement} */
    this._titleElement;
    /** @type {!CanvasRenderingContext2D} */
    this._context;
    this._imageZoom = 1;
    /** @type {!HTMLElement} */
    this._tagNameElement;
    /** @type {!HTMLElement} */
    this._attributeElement;
    /** @type {!HTMLElement} */
    this._nodeWidthElement;
    /** @type {!HTMLElement} */
    this._nodeHeightElement;
    /** @type {?Protocol.DOM.BoxModel} */
    this._model;
    /** @type {?Protocol.Overlay.HighlightConfig} */
    this._highlightConfig;
    /** @type {!HTMLInputElement} */
    this._navigationUrl;
    /** @type {!HTMLButtonElement} */
    this._navigationBack;
    /** @type {!HTMLButtonElement} */
    this._navigationForward;
  }

  initialize() {
    this.element.classList.add('screencast');

    this._createNavigationBar();

    this._viewportElement = /** @type {!HTMLElement} */ (this.element.createChild('div', 'screencast-viewport hidden'));
    this._canvasContainerElement =
        /** @type {!HTMLElement} */ (this._viewportElement.createChild('div', 'screencast-canvas-container'));
    this._glassPaneElement = /** @type {!HTMLElement} */ (
        this._canvasContainerElement.createChild('div', 'screencast-glasspane fill hidden'));

    this._canvasElement = /** @type {!HTMLCanvasElement} */ (this._canvasContainerElement.createChild('canvas'));
    UI.ARIAUtils.setAccessibleName(this._canvasElement, i18nString(UIStrings.screencastViewOfDebugTarget));
    this._canvasElement.tabIndex = 0;
    this._canvasElement.addEventListener('mousedown', this._handleMouseEvent.bind(this), false);
    this._canvasElement.addEventListener('mouseup', this._handleMouseEvent.bind(this), false);
    this._canvasElement.addEventListener('mousemove', this._handleMouseEvent.bind(this), false);
    this._canvasElement.addEventListener('mousewheel', this._handleMouseEvent.bind(this), false);
    this._canvasElement.addEventListener('click', this._handleMouseEvent.bind(this), false);
    this._canvasElement.addEventListener('contextmenu', this._handleContextMenuEvent.bind(this), false);
    this._canvasElement.addEventListener('keydown', this._handleKeyEvent.bind(this), false);
    this._canvasElement.addEventListener('keyup', this._handleKeyEvent.bind(this), false);
    this._canvasElement.addEventListener('keypress', this._handleKeyEvent.bind(this), false);
    this._canvasElement.addEventListener('blur', this._handleBlurEvent.bind(this), false);

    this._titleElement = /** @type {!HTMLElement} */ (this._canvasContainerElement.createChild(
        'div', 'screencast-element-title monospace hidden -theme-not-patched'));
    this._tagNameElement = /** @type {!HTMLElement} */ (this._titleElement.createChild('span', 'screencast-tag-name'));
    this._attributeElement =
        /** @type {!HTMLElement} */ (this._titleElement.createChild('span', 'screencast-attribute'));
    UI.UIUtils.createTextChild(this._titleElement, ' ');
    const dimension = /** @type {!HTMLElement} */ (this._titleElement.createChild('span', 'screencast-dimension'));
    this._nodeWidthElement = /** @type {!HTMLElement} */ (dimension.createChild('span'));
    UI.UIUtils.createTextChild(dimension, ' × ');
    this._nodeHeightElement = /** @type {!HTMLElement} */ (dimension.createChild('span'));
    this._titleElement.style.top = '0';
    this._titleElement.style.left = '0';

    this._imageElement = new Image();
    this._isCasting = false;
    this._context = /** @type {!CanvasRenderingContext2D} */ (this._canvasElement.getContext('2d'));
    this._checkerboardPattern = this._createCheckerboardPattern(this._context);


    this._shortcuts[UI.KeyboardShortcut.KeyboardShortcut.makeKey('l', UI.KeyboardShortcut.Modifiers.Ctrl)] =
        this._focusNavigationBar.bind(this);

    SDK.SDKModel.TargetManager.instance().addEventListener(
        SDK.SDKModel.Events.SuspendStateChanged, this._onSuspendStateChange, this);
    this._updateGlasspane();
  }

  /**
   * @override
   */
  wasShown() {
    this._startCasting();
  }

  /**
   * @override
   */
  willHide() {
    this._stopCasting();
  }

  _startCasting() {
    if (SDK.SDKModel.TargetManager.instance().allTargetsSuspended()) {
      return;
    }
    if (this._isCasting) {
      return;
    }
    this._isCasting = true;

    const maxImageDimension = 2048;
    const dimensions = this._viewportDimensions();
    if (dimensions.width < 0 || dimensions.height < 0) {
      this._isCasting = false;
      return;
    }
    dimensions.width *= window.devicePixelRatio;
    dimensions.height *= window.devicePixelRatio;
    // Note: startScreencast width and height are expected to be integers so must be floored.
    this._screenCaptureModel.startScreencast(
        Protocol.Page.StartScreencastRequestFormat.Jpeg, 80, Math.floor(Math.min(maxImageDimension, dimensions.width)),
        Math.floor(Math.min(maxImageDimension, dimensions.height)), undefined, this._screencastFrame.bind(this),
        this._screencastVisibilityChanged.bind(this));
    for (const emulationModel of SDK.SDKModel.TargetManager.instance().models(SDK.EmulationModel.EmulationModel)) {
      emulationModel.overrideEmulateTouch(true);
    }
    if (this._overlayModel) {
      this._overlayModel.setHighlighter(this);
    }
  }

  _stopCasting() {
    if (!this._isCasting) {
      return;
    }
    this._isCasting = false;
    this._screenCaptureModel.stopScreencast();
    for (const emulationModel of SDK.SDKModel.TargetManager.instance().models(SDK.EmulationModel.EmulationModel)) {
      emulationModel.overrideEmulateTouch(false);
    }
    if (this._overlayModel) {
      this._overlayModel.setHighlighter(null);
    }
  }

  /**
   * @param {string} base64Data
   * @param {!Protocol.Page.ScreencastFrameMetadata} metadata
   */
  _screencastFrame(base64Data, metadata) {
    this._imageElement.onload = () => {
      this._pageScaleFactor = metadata.pageScaleFactor;
      this._screenOffsetTop = metadata.offsetTop;
      this._scrollOffsetX = metadata.scrollOffsetX;
      this._scrollOffsetY = metadata.scrollOffsetY;

      const deviceSizeRatio = metadata.deviceHeight / metadata.deviceWidth;
      const dimensionsCSS = this._viewportDimensions();

      this._imageZoom = Math.min(
          dimensionsCSS.width / this._imageElement.naturalWidth,
          dimensionsCSS.height / (this._imageElement.naturalWidth * deviceSizeRatio));
      this._viewportElement.classList.remove('hidden');
      const bordersSize = _bordersSize;
      if (this._imageZoom < 1.01 / window.devicePixelRatio) {
        this._imageZoom = 1 / window.devicePixelRatio;
      }
      this._screenZoom = this._imageElement.naturalWidth * this._imageZoom / metadata.deviceWidth;
      this._viewportElement.style.width = metadata.deviceWidth * this._screenZoom + bordersSize + 'px';
      this._viewportElement.style.height = metadata.deviceHeight * this._screenZoom + bordersSize + 'px';

      const data = this._highlightNode ? {node: this._highlightNode, selectorList: undefined} : {clear: true};
      this.highlightInOverlay(data, this._highlightConfig);
    };
    this._imageElement.src = 'data:image/jpg;base64,' + base64Data;
  }

  _isGlassPaneActive() {
    return !this._glassPaneElement.classList.contains('hidden');
  }

  /**
   * @param {boolean} visible
   */
  _screencastVisibilityChanged(visible) {
    this._targetInactive = !visible;
    this._updateGlasspane();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onSuspendStateChange(event) {
    if (SDK.SDKModel.TargetManager.instance().allTargetsSuspended()) {
      this._stopCasting();
    } else {
      this._startCasting();
    }
    this._updateGlasspane();
  }

  _updateGlasspane() {
    if (this._targetInactive) {
      this._glassPaneElement.textContent = i18nString(UIStrings.theTabIsInactive);
      this._glassPaneElement.classList.remove('hidden');
    } else if (SDK.SDKModel.TargetManager.instance().allTargetsSuspended()) {
      this._glassPaneElement.textContent = i18nString(UIStrings.profilingInProgress);
      this._glassPaneElement.classList.remove('hidden');
    } else {
      this._glassPaneElement.classList.add('hidden');
    }
  }

  /**
   * @param {!Event} event
   */
  async _handleMouseEvent(event) {
    if (this._isGlassPaneActive()) {
      event.consume();
      return;
    }

    if (!this._pageScaleFactor || !this._domModel) {
      return;
    }

    if (!this._inspectModeConfig || event.type === 'mousewheel') {
      if (this._inputModel) {
        this._inputModel.emitTouchFromMouseEvent(event, this._screenOffsetTop, this._screenZoom);
      }
      event.preventDefault();
      if (event.type === 'mousedown') {
        this._canvasElement.focus();
      }
      return;
    }

    const position = this._convertIntoScreenSpace(/** @type {!MouseEvent} */ (event));

    const node = await this._domModel.nodeForLocation(
        Math.floor(position.x / this._pageScaleFactor + this._scrollOffsetX),
        Math.floor(position.y / this._pageScaleFactor + this._scrollOffsetY),
        Common.Settings.Settings.instance().moduleSetting('showUAShadowDOM').get());

    if (!node) {
      return;
    }

    if (event.type === 'mousemove') {
      this.highlightInOverlay({node, selectorList: undefined}, this._inspectModeConfig);
      this._domModel.overlayModel().nodeHighlightRequested({nodeId: /** @type {number} */ (node.id)});
    } else if (event.type === 'click') {
      this._domModel.overlayModel().inspectNodeRequested({backendNodeId: node.backendNodeId()});
    }
  }

  /**
   * @param {!Event} event
   */
  _handleKeyEvent(event) {
    if (this._isGlassPaneActive()) {
      event.consume();
      return;
    }

    const shortcutKey = UI.KeyboardShortcut.KeyboardShortcut.makeKeyFromEvent(/** @type {!KeyboardEvent} */ (event));
    const handler = this._shortcuts[shortcutKey];
    if (handler && handler(event)) {
      event.consume();
      return;
    }

    if (this._inputModel) {
      this._inputModel.emitKeyEvent(event);
    }
    event.consume();
    this._canvasElement.focus();
  }

  /**
   * @param {!Event} event
   */
  _handleContextMenuEvent(event) {
    event.consume(true);
  }

  /**
   * @param {!Event} event
   */
  _handleBlurEvent(event) {
    if (this._inputModel) {
      this._inputModel.cancelTouch();
    }
  }

  /**
   * @param {!MouseEvent} event
   * @return {!{x: number, y: number}}
   */
  _convertIntoScreenSpace(event) {
    const position = {};
    position.x = Math.round(event.offsetX / this._screenZoom);
    position.y = Math.round(event.offsetY / this._screenZoom - this._screenOffsetTop);
    return position;
  }

  /**
   * @override
   */
  onResize() {
    if (this._deferredCasting) {
      clearTimeout(this._deferredCasting);
      delete this._deferredCasting;
    }

    this._stopCasting();
    this._deferredCasting = setTimeout(this._startCasting.bind(this), 100);
  }

  /**
   * @override
   * @param {!SDK.OverlayModel.HighlightData} data
   * @param {?Protocol.Overlay.HighlightConfig} config
   */
  highlightInOverlay(data, config) {
    this._highlightInOverlay(data, config);
  }

  /**
   * @param {!SDK.OverlayModel.HighlightData} data
   * @param {?Protocol.Overlay.HighlightConfig} config
   */
  async _highlightInOverlay(data, config) {
    /** @type {?SDK.DOMModel.DOMNode} */
    let node = null;
    if ('node' in data) {
      node = data.node;
    }
    if (!node && 'deferredNode' in data) {
      node = await data.deferredNode.resolvePromise();
    }
    if (!node && 'object' in data) {
      const domModel =
          /** @type {?SDK.DOMModel.DOMModel} */ (data.object.runtimeModel().target().model(SDK.DOMModel.DOMModel));
      if (domModel) {
        node = await domModel.pushObjectAsNodeToFrontend(data.object);
      }
    }

    this._highlightNode = node;
    this._highlightConfig = config;
    if (!node) {
      this._model = null;
      this._config = null;
      this._node = null;
      this._titleElement.classList.add('hidden');
      this._repaint();
      return;
    }

    this._node = node;
    node.boxModel().then(model => {
      if (!model || !this._pageScaleFactor) {
        this._repaint();
        return;
      }
      this._model = this._scaleModel(model);
      this._config = config;
      this._repaint();
    });
  }

  /**
   * @param {!Protocol.DOM.BoxModel} model
   * @return {!Protocol.DOM.BoxModel}
   */
  _scaleModel(model) {
    /**
     * @param {!Protocol.DOM.Quad} quad
     * @this {ScreencastView}
     */
    function scaleQuad(quad) {
      for (let i = 0; i < quad.length; i += 2) {
        quad[i] = quad[i] * this._pageScaleFactor * this._screenZoom;
        quad[i + 1] = (quad[i + 1] * this._pageScaleFactor + this._screenOffsetTop) * this._screenZoom;
      }
    }

    scaleQuad.call(this, model.content);
    scaleQuad.call(this, model.padding);
    scaleQuad.call(this, model.border);
    scaleQuad.call(this, model.margin);
    return model;
  }

  _repaint() {
    const model = this._model;
    const config = this._config;

    const canvasWidth = this._canvasElement.getBoundingClientRect().width;
    const canvasHeight = this._canvasElement.getBoundingClientRect().height;
    this._canvasElement.width = window.devicePixelRatio * canvasWidth;
    this._canvasElement.height = window.devicePixelRatio * canvasHeight;

    this._context.save();
    this._context.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Paint top and bottom gutter.
    this._context.save();
    if (this._checkerboardPattern) {
      this._context.fillStyle = this._checkerboardPattern;
    }
    this._context.fillRect(0, 0, canvasWidth, this._screenOffsetTop * this._screenZoom);
    this._context.fillRect(
        0, this._screenOffsetTop * this._screenZoom + this._imageElement.naturalHeight * this._imageZoom, canvasWidth,
        canvasHeight);
    this._context.restore();

    if (model && config) {
      this._context.save();
      const quads = [];
      /**
       * @param {!Protocol.DOM.RGBA} color
       */
      const isTransparent = color => color.a && color.a === 0;
      if (model.content && config.contentColor && !isTransparent(config.contentColor)) {
        quads.push({quad: model.content, color: config.contentColor});
      }
      if (model.padding && config.paddingColor && !isTransparent(config.paddingColor)) {
        quads.push({quad: model.padding, color: config.paddingColor});
      }
      if (model.border && config.borderColor && !isTransparent(config.borderColor)) {
        quads.push({quad: model.border, color: config.borderColor});
      }
      if (model.margin && config.marginColor && !isTransparent(config.marginColor)) {
        quads.push({quad: model.margin, color: config.marginColor});
      }

      for (let i = quads.length - 1; i > 0; --i) {
        this._drawOutlinedQuadWithClip(quads[i].quad, quads[i - 1].quad, quads[i].color);
      }
      if (quads.length > 0) {
        this._drawOutlinedQuad(quads[0].quad, quads[0].color);
      }
      this._context.restore();

      this._drawElementTitle();

      this._context.globalCompositeOperation = 'destination-over';
    }

    this._context.drawImage(
        this._imageElement, 0, this._screenOffsetTop * this._screenZoom,
        this._imageElement.naturalWidth * this._imageZoom, this._imageElement.naturalHeight * this._imageZoom);
    this._context.restore();
  }

  /**
   * @param {!Protocol.DOM.RGBA} color
   * @return {string}
   */
  _cssColor(color) {
    if (!color) {
      return 'transparent';
    }
    return Common.Color.Color.fromRGBA([color.r, color.g, color.b, color.a !== undefined ? color.a : 1])
               .asString(Common.Color.Format.RGBA) ||
        '';
  }

  /**
   * @param {!Protocol.DOM.Quad} quad
   * @return {!CanvasRenderingContext2D}
   */
  _quadToPath(quad) {
    this._context.beginPath();
    this._context.moveTo(quad[0], quad[1]);
    this._context.lineTo(quad[2], quad[3]);
    this._context.lineTo(quad[4], quad[5]);
    this._context.lineTo(quad[6], quad[7]);
    this._context.closePath();
    return this._context;
  }

  /**
   * @param {!Protocol.DOM.Quad} quad
   * @param {!Protocol.DOM.RGBA} fillColor
   */
  _drawOutlinedQuad(quad, fillColor) {
    this._context.save();
    this._context.lineWidth = 2;
    this._quadToPath(quad).clip();
    this._context.fillStyle = this._cssColor(fillColor);
    this._context.fill();
    this._context.restore();
  }

  /**
   * @param {!Protocol.DOM.Quad} quad
   * @param {!Protocol.DOM.Quad} clipQuad
   * @param {!Protocol.DOM.RGBA} fillColor
   */
  _drawOutlinedQuadWithClip(quad, clipQuad, fillColor) {
    this._context.fillStyle = this._cssColor(fillColor);
    this._context.save();
    this._context.lineWidth = 0;
    this._quadToPath(quad).fill();
    this._context.globalCompositeOperation = 'destination-out';
    this._context.fillStyle = 'red';
    this._quadToPath(clipQuad).fill();
    this._context.restore();
  }

  _drawElementTitle() {
    if (!this._node) {
      return;
    }

    const canvasWidth = this._canvasElement.getBoundingClientRect().width;
    const canvasHeight = this._canvasElement.getBoundingClientRect().height;

    const lowerCaseName = this._node.localName() || this._node.nodeName().toLowerCase();
    this._tagNameElement.textContent = lowerCaseName;

    this._attributeElement.textContent = getAttributesForElementTitle(this._node);
    this._nodeWidthElement.textContent = String(this._model ? this._model.width : 0);
    this._nodeHeightElement.textContent = String(this._model ? this._model.height : 0);

    this._titleElement.classList.remove('hidden');
    const titleWidth = this._titleElement.offsetWidth + 6;
    const titleHeight = this._titleElement.offsetHeight + 4;

    const anchorTop = this._model ? this._model.margin[1] : 0;
    const anchorBottom = this._model ? this._model.margin[7] : 0;

    const arrowHeight = 7;
    let renderArrowUp = false;
    let renderArrowDown = false;

    let boxX = Math.max(2, this._model ? this._model.margin[0] : 0);
    if (boxX + titleWidth > canvasWidth) {
      boxX = canvasWidth - titleWidth - 2;
    }

    let boxY;
    if (anchorTop > canvasHeight) {
      boxY = canvasHeight - titleHeight - arrowHeight;
      renderArrowDown = true;
    } else if (anchorBottom < 0) {
      boxY = arrowHeight;
      renderArrowUp = true;
    } else if (anchorBottom + titleHeight + arrowHeight < canvasHeight) {
      boxY = anchorBottom + arrowHeight - 4;
      renderArrowUp = true;
    } else if (anchorTop - titleHeight - arrowHeight > 0) {
      boxY = anchorTop - titleHeight - arrowHeight + 3;
      renderArrowDown = true;
    } else {
      boxY = arrowHeight;
    }

    this._context.save();
    this._context.translate(0.5, 0.5);
    this._context.beginPath();
    this._context.moveTo(boxX, boxY);
    if (renderArrowUp) {
      this._context.lineTo(boxX + 2 * arrowHeight, boxY);
      this._context.lineTo(boxX + 3 * arrowHeight, boxY - arrowHeight);
      this._context.lineTo(boxX + 4 * arrowHeight, boxY);
    }
    this._context.lineTo(boxX + titleWidth, boxY);
    this._context.lineTo(boxX + titleWidth, boxY + titleHeight);
    if (renderArrowDown) {
      this._context.lineTo(boxX + 4 * arrowHeight, boxY + titleHeight);
      this._context.lineTo(boxX + 3 * arrowHeight, boxY + titleHeight + arrowHeight);
      this._context.lineTo(boxX + 2 * arrowHeight, boxY + titleHeight);
    }
    this._context.lineTo(boxX, boxY + titleHeight);
    this._context.closePath();
    this._context.fillStyle = 'rgb(255, 255, 194)';
    this._context.fill();
    this._context.strokeStyle = 'rgb(128, 128, 128)';
    this._context.stroke();

    this._context.restore();

    this._titleElement.style.top = (boxY + 3) + 'px';
    this._titleElement.style.left = (boxX + 3) + 'px';
  }

  /**
   * @return {!{width: number, height: number}}
   */
  _viewportDimensions() {
    const gutterSize = 30;
    const bordersSize = _bordersSize;
    const width = this.element.offsetWidth - bordersSize - gutterSize;
    const height = this.element.offsetHeight - bordersSize - gutterSize - _navBarHeight;
    return {width: width, height: height};
  }

  /**
   * @override
   * @param {!Protocol.Overlay.InspectMode} mode
   * @param {!Protocol.Overlay.HighlightConfig} config
   * @return {!Promise<void>}
   */
  setInspectMode(mode, config) {
    this._inspectModeConfig = mode !== Protocol.Overlay.InspectMode.None ? config : null;
    return Promise.resolve();
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameId} frameId
   */
  highlightFrame(frameId) {
  }

  /**
   * @param {!CanvasRenderingContext2D} context
   */
  _createCheckerboardPattern(context) {
    const pattern = /** @type {!HTMLCanvasElement} */ (document.createElement('canvas'));
    const size = 32;
    pattern.width = size * 2;
    pattern.height = size * 2;
    const pctx = /** @type {!CanvasRenderingContext2D} */ (pattern.getContext('2d'));

    pctx.fillStyle = 'rgb(195, 195, 195)';
    pctx.fillRect(0, 0, size * 2, size * 2);

    pctx.fillStyle = 'rgb(225, 225, 225)';
    pctx.fillRect(0, 0, size, size);
    pctx.fillRect(size, size, size, size);
    return context.createPattern(pattern, 'repeat');
  }

  _createNavigationBar() {
    this._navigationBar = /** @type {!HTMLElement} */ (this.element.createChild('div', 'screencast-navigation'));
    this._navigationBack = /** @type {!HTMLButtonElement} */ (this._navigationBar.createChild('button', 'back'));
    this._navigationBack.disabled = true;
    UI.ARIAUtils.setAccessibleName(this._navigationBack, i18nString(UIStrings.back));
    this._navigationForward = /** @type {!HTMLButtonElement} */ (this._navigationBar.createChild('button', 'forward'));
    this._navigationForward.disabled = true;
    UI.ARIAUtils.setAccessibleName(this._navigationForward, i18nString(UIStrings.forward));
    this._navigationReload = this._navigationBar.createChild('button', 'reload');
    UI.ARIAUtils.setAccessibleName(this._navigationReload, i18nString(UIStrings.reload));
    this._navigationUrl = /** @type {!HTMLInputElement} */ (UI.UIUtils.createInput());
    UI.ARIAUtils.setAccessibleName(this._navigationUrl, i18nString(UIStrings.addressBar));
    this._navigationBar.appendChild(this._navigationUrl);
    this._navigationUrl.type = 'text';
    this._navigationProgressBar = new ProgressTracker(
        this._resourceTreeModel, this._networkManager,
        /** @type {!HTMLElement} */ (this._navigationBar.createChild('div', 'progress')));

    if (this._resourceTreeModel) {
      this._navigationBack.addEventListener('click', this._navigateToHistoryEntry.bind(this, -1), false);
      this._navigationForward.addEventListener('click', this._navigateToHistoryEntry.bind(this, 1), false);
      this._navigationReload.addEventListener('click', this._navigateReload.bind(this), false);
      this._navigationUrl.addEventListener('keyup', this._navigationUrlKeyUp.bind(this), true);
      this._requestNavigationHistory();
      this._resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this._requestNavigationHistoryEvent, this);
      this._resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.CachedResourcesLoaded, this._requestNavigationHistoryEvent, this);
    }
  }

  /**
   * @param {number} offset
   */
  _navigateToHistoryEntry(offset) {
    if (!this._resourceTreeModel) {
      return;
    }
    const newIndex = (this._historyIndex || 0) + offset;
    if (!this._historyEntries || newIndex < 0 || newIndex >= this._historyEntries.length) {
      return;
    }
    this._resourceTreeModel.navigateToHistoryEntry(this._historyEntries[newIndex]);
    this._requestNavigationHistory();
  }

  _navigateReload() {
    if (!this._resourceTreeModel) {
      return;
    }
    this._resourceTreeModel.reloadPage();
  }

  /**
   * @param {!Event} event
   */
  _navigationUrlKeyUp(/** @type {!KeyboardEvent} */ event) {
    if (event.key !== 'Enter') {
      return;
    }
    let url = this._navigationUrl.value;
    if (!url) {
      return;
    }
    if (!url.match(_SchemeRegex)) {
      url = 'http://' + url;
    }

    // Perform decodeURI in case the user enters an encoded string
    // decodeURI has no effect on strings that are already decoded
    // encodeURI ensures an encoded URL is always passed to the backend
    // This allows the input field to support both encoded and decoded URLs
    if (this._resourceTreeModel) {
      this._resourceTreeModel.navigate(encodeURI(decodeURI(url)));
    }
    this._canvasElement.focus();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _requestNavigationHistoryEvent(event) {
    this._requestNavigationHistory();
  }

  async _requestNavigationHistory() {
    const history = this._resourceTreeModel ? await this._resourceTreeModel.navigationHistory() : null;
    if (!history) {
      return;
    }

    this._historyIndex = history.currentIndex;
    this._historyEntries = history.entries;

    this._navigationBack.disabled = this._historyIndex === 0;
    this._navigationForward.disabled = this._historyIndex === (this._historyEntries.length - 1);

    let url = this._historyEntries[this._historyIndex].url;
    const match = url.match(_HttpRegex);
    if (match) {
      url = match[1];
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.inspectedURLChanged(url);
    this._navigationUrl.value = decodeURI(url);
  }

  _focusNavigationBar() {
    this._navigationUrl.focus();
    this._navigationUrl.select();
    return true;
  }
}

export const _bordersSize = 44;
export const _navBarHeight = 29;
export const _HttpRegex = /^http:\/\/(.+)/;
export const _SchemeRegex = /^(https?|about|chrome):/;

export class ProgressTracker {
  /**
   * @param {?SDK.ResourceTreeModel.ResourceTreeModel} resourceTreeModel
   * @param {?SDK.NetworkManager.NetworkManager} networkManager
   * @param {!HTMLElement} element
   */
  constructor(resourceTreeModel, networkManager, element) {
    this._element = element;
    if (resourceTreeModel) {
      resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this._onMainFrameNavigated, this);
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, this._onLoad, this);
    }
    if (networkManager) {
      networkManager.addEventListener(SDK.NetworkManager.Events.RequestStarted, this._onRequestStarted, this);
      networkManager.addEventListener(SDK.NetworkManager.Events.RequestFinished, this._onRequestFinished, this);
    }
    /**
     * @type {?Map<string, !SDK.NetworkRequest.NetworkRequest>}
     */
    this._requestIds = null;
    this._startedRequests = 0;
    this._finishedRequests = 0;
    this._maxDisplayedProgress = 0;
  }

  _onMainFrameNavigated() {
    this._requestIds = new Map();
    this._startedRequests = 0;
    this._finishedRequests = 0;
    this._maxDisplayedProgress = 0;
    this._updateProgress(0.1);  // Display first 10% on navigation start.
  }

  _onLoad() {
    this._requestIds = null;
    this._updateProgress(1);  // Display 100% progress on load, hide it in 0.5s.
    setTimeout(() => {
      if (!this._navigationProgressVisible()) {
        this._displayProgress(0);
      }
    }, 500);
  }

  _navigationProgressVisible() {
    return this._requestIds !== null;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onRequestStarted(event) {
    if (!this._navigationProgressVisible()) {
      return;
    }
    const request = /** @type {!SDK.NetworkRequest.NetworkRequest} */ (event.data.request);
    // Ignore long-living WebSockets for the sake of progress indicator, as we won't be waiting them anyway.
    if (request.resourceType() === Common.ResourceType.resourceTypes.WebSocket) {
      return;
    }
    if (this._requestIds) {
      this._requestIds.set(request.requestId(), request);
    }
    ++this._startedRequests;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onRequestFinished(event) {
    if (!this._navigationProgressVisible()) {
      return;
    }
    const request = /** @type {!SDK.NetworkRequest.NetworkRequest} */ (event.data);
    if (this._requestIds && !this._requestIds.has(request.requestId())) {
      return;
    }
    ++this._finishedRequests;
    setTimeout(() => {
      this._updateProgress(
          this._finishedRequests / this._startedRequests * 0.9);  // Finished requests drive the progress up to 90%.
    }, 500);  // Delay to give the new requests time to start. This makes the progress smoother.
  }

  /**
   * @param {number} progress
   */
  _updateProgress(progress) {
    if (!this._navigationProgressVisible()) {
      return;
    }
    if (this._maxDisplayedProgress >= progress) {
      return;
    }
    this._maxDisplayedProgress = progress;
    this._displayProgress(progress);
  }

  /**
   * @param {number} progress
   */
  _displayProgress(progress) {
    this._element.style.width = (100 * progress) + '%';
  }
}

/**
 * @param {!SDK.DOMModel.DOMNode} node
 * @return {string}
 */
function getAttributesForElementTitle(node) {
  const id = node.getAttribute('id');
  const className = node.getAttribute('class');

  let selector = id ? '#' + id : '';
  if (className) {
    selector += '.' + className.trim().replace(/\s+/g, '.');
  }

  if (selector.length > 50) {
    selector = selector.substring(0, 50) + '…';
  }

  return selector;
}

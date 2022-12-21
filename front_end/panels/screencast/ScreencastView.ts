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

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';

import {InputModel} from './InputModel.js';
import screencastViewStyles from './screencastView.css.js';

const UIStrings = {
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
const str_ = i18n.i18n.registerUIStrings('panels/screencast/ScreencastView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface Point {
  x: number;
  y: number;
}

export class ScreencastView extends UI.Widget.VBox implements SDK.OverlayModel.Highlighter {
  private readonly screenCaptureModel: SDK.ScreenCaptureModel.ScreenCaptureModel;
  private domModel: SDK.DOMModel.DOMModel|null;
  private readonly overlayModel: SDK.OverlayModel.OverlayModel|null;
  private resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel|null;
  private networkManager: SDK.NetworkManager.NetworkManager|null;
  private readonly inputModel: InputModel|null;
  private shortcuts: {[x: number]: (arg0?: Event|undefined) => boolean};
  private scrollOffsetX: number;
  private scrollOffsetY: number;
  private screenZoom: number;
  private screenOffsetTop: number;
  private pageScaleFactor: number;
  private imageElement!: HTMLImageElement;
  private viewportElement!: HTMLElement;
  private glassPaneElement!: HTMLElement;
  private canvasElement!: HTMLCanvasElement;
  private titleElement!: HTMLElement;
  private context!: CanvasRenderingContext2D;
  private imageZoom: number;
  private tagNameElement!: HTMLElement;
  private attributeElement!: HTMLElement;
  private nodeWidthElement!: HTMLElement;
  private nodeHeightElement!: HTMLElement;
  private model!: Protocol.DOM.BoxModel|null;
  private highlightConfig!: Protocol.Overlay.HighlightConfig|null;
  private navigationUrl!: HTMLInputElement;
  private navigationBack!: HTMLButtonElement;
  private navigationForward!: HTMLButtonElement;
  private canvasContainerElement?: HTMLElement;
  private isCasting?: boolean;
  private checkerboardPattern?: CanvasPattern|null;
  private targetInactive?: boolean;
  private deferredCasting?: number;
  private highlightNode?: SDK.DOMModel.DOMNode|null;
  private config?: Protocol.Overlay.HighlightConfig|null;
  private node?: SDK.DOMModel.DOMNode|null;
  private inspectModeConfig?: Protocol.Overlay.HighlightConfig|null;
  private navigationBar?: HTMLElement;
  private navigationReload?: HTMLElement;
  private navigationProgressBar?: ProgressTracker;
  private historyIndex?: number;
  private historyEntries?: Protocol.Page.NavigationEntry[];
  constructor(screenCaptureModel: SDK.ScreenCaptureModel.ScreenCaptureModel) {
    super();
    this.screenCaptureModel = screenCaptureModel;
    this.domModel = screenCaptureModel.target().model(SDK.DOMModel.DOMModel);
    this.overlayModel = screenCaptureModel.target().model(SDK.OverlayModel.OverlayModel);
    this.resourceTreeModel = screenCaptureModel.target().model(SDK.ResourceTreeModel.ResourceTreeModel);
    this.networkManager = screenCaptureModel.target().model(SDK.NetworkManager.NetworkManager);
    this.inputModel = screenCaptureModel.target().model(InputModel);

    this.setMinimumSize(150, 150);

    this.shortcuts = {} as {
      [x: number]: (arg0?: Event|undefined) => boolean,
    };
    this.scrollOffsetX = 0;
    this.scrollOffsetY = 0;
    this.screenZoom = 1;
    this.screenOffsetTop = 0;
    this.pageScaleFactor = 1;
    this.imageZoom = 1;
  }

  initialize(): void {
    this.element.classList.add('screencast');

    this.createNavigationBar();
    this.viewportElement = this.element.createChild('div', 'screencast-viewport hidden') as HTMLElement;
    this.canvasContainerElement = this.viewportElement.createChild('div', 'screencast-canvas-container') as HTMLElement;
    this.glassPaneElement =
        this.canvasContainerElement.createChild('div', 'screencast-glasspane fill hidden') as HTMLElement;
    this.canvasElement = this.canvasContainerElement.createChild('canvas') as HTMLCanvasElement;
    UI.ARIAUtils.setAccessibleName(this.canvasElement, i18nString(UIStrings.screencastViewOfDebugTarget));
    this.canvasElement.tabIndex = 0;
    this.canvasElement.addEventListener('mousedown', this.handleMouseEvent.bind(this), false);
    this.canvasElement.addEventListener('mouseup', this.handleMouseEvent.bind(this), false);
    this.canvasElement.addEventListener('mousemove', this.handleMouseEvent.bind(this), false);
    this.canvasElement.addEventListener('mousewheel', this.handleMouseEvent.bind(this), false);
    this.canvasElement.addEventListener('click', this.handleMouseEvent.bind(this), false);
    this.canvasElement.addEventListener('contextmenu', this.handleContextMenuEvent.bind(this), false);
    this.canvasElement.addEventListener('keydown', this.handleKeyEvent.bind(this), false);
    this.canvasElement.addEventListener('keyup', this.handleKeyEvent.bind(this), false);
    this.canvasElement.addEventListener('keypress', this.handleKeyEvent.bind(this), false);
    this.canvasElement.addEventListener('blur', this.handleBlurEvent.bind(this), false);
    this.titleElement =
        this.canvasContainerElement.createChild('div', 'screencast-element-title monospace hidden') as HTMLElement;
    this.tagNameElement = this.titleElement.createChild('span', 'screencast-tag-name') as HTMLElement;
    this.attributeElement = this.titleElement.createChild('span', 'screencast-attribute') as HTMLElement;
    UI.UIUtils.createTextChild(this.titleElement, ' ');
    const dimension = this.titleElement.createChild('span', 'screencast-dimension') as HTMLElement;
    this.nodeWidthElement = dimension.createChild('span') as HTMLElement;
    UI.UIUtils.createTextChild(dimension, ' × ');
    this.nodeHeightElement = dimension.createChild('span') as HTMLElement;
    this.titleElement.style.top = '0';
    this.titleElement.style.left = '0';

    this.imageElement = new Image();
    this.isCasting = false;
    this.context = this.canvasElement.getContext('2d') as CanvasRenderingContext2D;
    this.checkerboardPattern = this.createCheckerboardPattern(this.context);

    this.shortcuts[UI.KeyboardShortcut.KeyboardShortcut.makeKey('l', UI.KeyboardShortcut.Modifiers.Ctrl)] =
        this.focusNavigationBar.bind(this);

    SDK.TargetManager.TargetManager.instance().addEventListener(
        SDK.TargetManager.Events.SuspendStateChanged, this.onSuspendStateChange, this);
    this.updateGlasspane();
  }

  wasShown(): void {
    this.startCasting();
    this.registerCSSFiles([screencastViewStyles]);
  }

  willHide(): void {
    this.stopCasting();
  }

  private startCasting(): void {
    if (SDK.TargetManager.TargetManager.instance().allTargetsSuspended()) {
      return;
    }
    if (this.isCasting) {
      return;
    }
    this.isCasting = true;

    const maxImageDimension = 2048;
    const dimensions = this.viewportDimensions();
    if (dimensions.width < 0 || dimensions.height < 0) {
      this.isCasting = false;
      return;
    }
    dimensions.width *= window.devicePixelRatio;
    dimensions.height *= window.devicePixelRatio;
    // Note: startScreencast width and height are expected to be integers so must be floored.
    this.screenCaptureModel.startScreencast(
        Protocol.Page.StartScreencastRequestFormat.Jpeg, 80, Math.floor(Math.min(maxImageDimension, dimensions.width)),
        Math.floor(Math.min(maxImageDimension, dimensions.height)), undefined, this.screencastFrame.bind(this),
        this.screencastVisibilityChanged.bind(this));
    for (const emulationModel of SDK.TargetManager.TargetManager.instance().models(SDK.EmulationModel.EmulationModel)) {
      void emulationModel.overrideEmulateTouch(true);
    }
    if (this.overlayModel) {
      this.overlayModel.setHighlighter(this);
    }
  }

  private stopCasting(): void {
    if (!this.isCasting) {
      return;
    }
    this.isCasting = false;
    this.screenCaptureModel.stopScreencast();
    for (const emulationModel of SDK.TargetManager.TargetManager.instance().models(SDK.EmulationModel.EmulationModel)) {
      void emulationModel.overrideEmulateTouch(false);
    }
    if (this.overlayModel) {
      this.overlayModel.setHighlighter(null);
    }
  }

  private screencastFrame(base64Data: string, metadata: Protocol.Page.ScreencastFrameMetadata): void {
    this.imageElement.onload = (): void => {
      this.pageScaleFactor = metadata.pageScaleFactor;
      this.screenOffsetTop = metadata.offsetTop;
      this.scrollOffsetX = metadata.scrollOffsetX;
      this.scrollOffsetY = metadata.scrollOffsetY;

      const deviceSizeRatio = metadata.deviceHeight / metadata.deviceWidth;
      const dimensionsCSS = this.viewportDimensions();

      this.imageZoom = Math.min(
          dimensionsCSS.width / this.imageElement.naturalWidth,
          dimensionsCSS.height / (this.imageElement.naturalWidth * deviceSizeRatio));
      this.viewportElement.classList.remove('hidden');
      const bordersSize = BORDERS_SIZE;
      if (this.imageZoom < 1.01 / window.devicePixelRatio) {
        this.imageZoom = 1 / window.devicePixelRatio;
      }
      this.screenZoom = this.imageElement.naturalWidth * this.imageZoom / metadata.deviceWidth;
      this.viewportElement.style.width = metadata.deviceWidth * this.screenZoom + bordersSize + 'px';
      this.viewportElement.style.height = metadata.deviceHeight * this.screenZoom + bordersSize + 'px';

      const data = this.highlightNode ? {node: this.highlightNode, selectorList: undefined} : {clear: true};
      void this.updateHighlightInOverlayAndRepaint(data, this.highlightConfig);
    };
    this.imageElement.src = 'data:image/jpg;base64,' + base64Data;
  }

  private isGlassPaneActive(): boolean {
    return !this.glassPaneElement.classList.contains('hidden');
  }

  private screencastVisibilityChanged(visible: boolean): void {
    this.targetInactive = !visible;
    this.updateGlasspane();
  }

  private onSuspendStateChange(): void {
    if (SDK.TargetManager.TargetManager.instance().allTargetsSuspended()) {
      this.stopCasting();
    } else {
      this.startCasting();
    }
    this.updateGlasspane();
  }

  private updateGlasspane(): void {
    if (this.targetInactive) {
      this.glassPaneElement.textContent = i18nString(UIStrings.theTabIsInactive);
      this.glassPaneElement.classList.remove('hidden');
    } else if (SDK.TargetManager.TargetManager.instance().allTargetsSuspended()) {
      this.glassPaneElement.textContent = i18nString(UIStrings.profilingInProgress);
      this.glassPaneElement.classList.remove('hidden');
    } else {
      this.glassPaneElement.classList.add('hidden');
    }
  }

  private async handleMouseEvent(event: Event): Promise<void> {
    if (this.isGlassPaneActive()) {
      event.consume();
      return;
    }

    if (!this.pageScaleFactor || !this.domModel) {
      return;
    }

    if (!this.inspectModeConfig || event.type === 'mousewheel') {
      if (this.inputModel) {
        this.inputModel.emitTouchFromMouseEvent(event, this.screenOffsetTop, this.screenZoom);
      }
      event.preventDefault();
      if (event.type === 'mousedown') {
        this.canvasElement.focus();
      }
      return;
    }

    const position = this.convertIntoScreenSpace(event as MouseEvent);

    const node = await this.domModel.nodeForLocation(
        Math.floor(position.x / this.pageScaleFactor + this.scrollOffsetX),
        Math.floor(position.y / this.pageScaleFactor + this.scrollOffsetY),
        Common.Settings.Settings.instance().moduleSetting('showUAShadowDOM').get());

    if (!node) {
      return;
    }

    if (event.type === 'mousemove') {
      void this.updateHighlightInOverlayAndRepaint({node, selectorList: undefined}, this.inspectModeConfig);
      this.domModel.overlayModel().nodeHighlightRequested({nodeId: node.id});
    } else if (event.type === 'click') {
      this.domModel.overlayModel().inspectNodeRequested({backendNodeId: node.backendNodeId()});
    }
  }

  private handleKeyEvent(event: Event): void {
    if (this.isGlassPaneActive()) {
      event.consume();
      return;
    }

    const shortcutKey = UI.KeyboardShortcut.KeyboardShortcut.makeKeyFromEvent(event as KeyboardEvent);
    const handler = this.shortcuts[shortcutKey];
    if (handler && handler(event)) {
      event.consume();
      return;
    }

    if (this.inputModel) {
      this.inputModel.emitKeyEvent(event);
    }
    event.consume();
    this.canvasElement.focus();
  }

  private handleContextMenuEvent(event: Event): void {
    event.consume(true);
  }

  private handleBlurEvent(_event: Event): void {
    if (this.inputModel) {
      this.inputModel.cancelTouch();
    }
  }

  private convertIntoScreenSpace(event: MouseEvent): Point {
    return {
      x: Math.round(event.offsetX / this.screenZoom),
      y: Math.round(event.offsetY / this.screenZoom - this.screenOffsetTop),
    };
  }

  onResize(): void {
    if (this.deferredCasting) {
      clearTimeout(this.deferredCasting);
      delete this.deferredCasting;
    }

    this.stopCasting();
    this.deferredCasting = window.setTimeout(this.startCasting.bind(this), 100);
  }

  highlightInOverlay(data: SDK.OverlayModel.HighlightData, config: Protocol.Overlay.HighlightConfig|null): void {
    void this.updateHighlightInOverlayAndRepaint(data, config);
  }

  private async updateHighlightInOverlayAndRepaint(
      data: SDK.OverlayModel.HighlightData, config: Protocol.Overlay.HighlightConfig|null): Promise<void> {
    let node: SDK.DOMModel.DOMNode|null = null;
    if ('node' in data) {
      node = data.node;
    }
    if (!node && 'deferredNode' in data) {
      node = await data.deferredNode.resolvePromise();
    }
    if (!node && 'object' in data) {
      const domModel = data.object.runtimeModel().target().model(SDK.DOMModel.DOMModel);
      if (domModel) {
        node = await domModel.pushObjectAsNodeToFrontend(data.object);
      }
    }

    this.highlightNode = node;
    this.highlightConfig = config;
    if (!node) {
      this.model = null;
      this.config = null;
      this.node = null;
      this.titleElement.classList.add('hidden');
      this.repaint();
      return;
    }

    this.node = node;
    void node.boxModel().then(model => {
      if (!model || !this.pageScaleFactor) {
        this.repaint();
        return;
      }
      this.model = this.scaleModel(model);
      this.config = config;
      this.repaint();
    });
  }

  private scaleModel(model: Protocol.DOM.BoxModel): Protocol.DOM.BoxModel {
    function scaleQuad(this: ScreencastView, quad: Protocol.DOM.Quad): void {
      for (let i = 0; i < quad.length; i += 2) {
        quad[i] = quad[i] * this.pageScaleFactor * this.screenZoom;
        quad[i + 1] = (quad[i + 1] * this.pageScaleFactor + this.screenOffsetTop) * this.screenZoom;
      }
    }

    scaleQuad.call(this, model.content);
    scaleQuad.call(this, model.padding);
    scaleQuad.call(this, model.border);
    scaleQuad.call(this, model.margin);
    return model;
  }

  private repaint(): void {
    const model = this.model;
    const config = this.config;

    const canvasWidth = this.canvasElement.getBoundingClientRect().width;
    const canvasHeight = this.canvasElement.getBoundingClientRect().height;
    this.canvasElement.width = window.devicePixelRatio * canvasWidth;
    this.canvasElement.height = window.devicePixelRatio * canvasHeight;

    this.context.save();
    this.context.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Paint top and bottom gutter.
    this.context.save();
    if (this.checkerboardPattern) {
      this.context.fillStyle = this.checkerboardPattern;
    }
    this.context.fillRect(0, 0, canvasWidth, this.screenOffsetTop * this.screenZoom);
    this.context.fillRect(
        0, this.screenOffsetTop * this.screenZoom + this.imageElement.naturalHeight * this.imageZoom, canvasWidth,
        canvasHeight);
    this.context.restore();

    if (model && config) {
      this.context.save();
      const quads = [];
      const isTransparent = (color: Protocol.DOM.RGBA): boolean => Boolean(color.a && color.a === 0);
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
        this.drawOutlinedQuadWithClip(quads[i].quad, quads[i - 1].quad, quads[i].color);
      }
      if (quads.length > 0) {
        this.drawOutlinedQuad(quads[0].quad, quads[0].color);
      }
      this.context.restore();

      this.drawElementTitle();

      this.context.globalCompositeOperation = 'destination-over';
    }

    this.context.drawImage(
        this.imageElement, 0, this.screenOffsetTop * this.screenZoom, this.imageElement.naturalWidth * this.imageZoom,
        this.imageElement.naturalHeight * this.imageZoom);
    this.context.restore();
  }

  private cssColor(color: Protocol.DOM.RGBA): string {
    if (!color) {
      return 'transparent';
    }
    return Common.Color.Legacy.fromRGBA([color.r, color.g, color.b, color.a !== undefined ? color.a : 1])
               .asString(Common.Color.Format.RGBA) ||
        '';
  }

  private quadToPath(quad: Protocol.DOM.Quad): CanvasRenderingContext2D {
    this.context.beginPath();
    this.context.moveTo(quad[0], quad[1]);
    this.context.lineTo(quad[2], quad[3]);
    this.context.lineTo(quad[4], quad[5]);
    this.context.lineTo(quad[6], quad[7]);
    this.context.closePath();
    return this.context;
  }

  private drawOutlinedQuad(quad: Protocol.DOM.Quad, fillColor: Protocol.DOM.RGBA): void {
    this.context.save();
    this.context.lineWidth = 2;
    this.quadToPath(quad).clip();
    this.context.fillStyle = this.cssColor(fillColor);
    this.context.fill();
    this.context.restore();
  }

  private drawOutlinedQuadWithClip(quad: Protocol.DOM.Quad, clipQuad: Protocol.DOM.Quad, fillColor: Protocol.DOM.RGBA):
      void {
    this.context.fillStyle = this.cssColor(fillColor);
    this.context.save();
    this.context.lineWidth = 0;
    this.quadToPath(quad).fill();
    this.context.globalCompositeOperation = 'destination-out';
    this.context.fillStyle = 'red';
    this.quadToPath(clipQuad).fill();
    this.context.restore();
  }

  private drawElementTitle(): void {
    if (!this.node) {
      return;
    }

    const canvasWidth = this.canvasElement.getBoundingClientRect().width;
    const canvasHeight = this.canvasElement.getBoundingClientRect().height;

    const lowerCaseName = this.node.localName() || this.node.nodeName().toLowerCase();
    this.tagNameElement.textContent = lowerCaseName;

    this.attributeElement.textContent = getAttributesForElementTitle(this.node);
    this.nodeWidthElement.textContent = String(this.model ? this.model.width : 0);
    this.nodeHeightElement.textContent = String(this.model ? this.model.height : 0);

    this.titleElement.classList.remove('hidden');
    const titleWidth = this.titleElement.offsetWidth + 6;
    const titleHeight = this.titleElement.offsetHeight + 4;

    const anchorTop = this.model ? this.model.margin[1] : 0;
    const anchorBottom = this.model ? this.model.margin[7] : 0;

    const arrowHeight = 7;
    let renderArrowUp = false;
    let renderArrowDown = false;

    let boxX = Math.max(2, this.model ? this.model.margin[0] : 0);
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

    this.context.save();
    this.context.translate(0.5, 0.5);
    this.context.beginPath();
    this.context.moveTo(boxX, boxY);
    if (renderArrowUp) {
      this.context.lineTo(boxX + 2 * arrowHeight, boxY);
      this.context.lineTo(boxX + 3 * arrowHeight, boxY - arrowHeight);
      this.context.lineTo(boxX + 4 * arrowHeight, boxY);
    }
    this.context.lineTo(boxX + titleWidth, boxY);
    this.context.lineTo(boxX + titleWidth, boxY + titleHeight);
    if (renderArrowDown) {
      this.context.lineTo(boxX + 4 * arrowHeight, boxY + titleHeight);
      this.context.lineTo(boxX + 3 * arrowHeight, boxY + titleHeight + arrowHeight);
      this.context.lineTo(boxX + 2 * arrowHeight, boxY + titleHeight);
    }
    this.context.lineTo(boxX, boxY + titleHeight);
    this.context.closePath();
    this.context.fillStyle = 'rgb(255, 255, 194)';
    this.context.fill();
    this.context.strokeStyle = 'rgb(128, 128, 128)';
    this.context.stroke();

    this.context.restore();

    this.titleElement.style.top = (boxY + 3) + 'px';
    this.titleElement.style.left = (boxX + 3) + 'px';
  }

  private viewportDimensions(): {width: number, height: number} {
    const gutterSize = 30;
    const bordersSize = BORDERS_SIZE;
    const width = this.element.offsetWidth - bordersSize - gutterSize;
    const height = this.element.offsetHeight - bordersSize - gutterSize - NAVBAR_HEIGHT;
    return {width: width, height: height};
  }

  setInspectMode(mode: Protocol.Overlay.InspectMode, config: Protocol.Overlay.HighlightConfig): Promise<void> {
    this.inspectModeConfig = mode !== Protocol.Overlay.InspectMode.None ? config : null;
    return Promise.resolve();
  }

  highlightFrame(_frameId: string): void {
  }

  private createCheckerboardPattern(context: CanvasRenderingContext2D): CanvasPattern|null {
    const pattern = document.createElement('canvas') as HTMLCanvasElement;
    const size = 32;
    pattern.width = size * 2;
    pattern.height = size * 2;
    const pctx = pattern.getContext('2d') as CanvasRenderingContext2D;

    pctx.fillStyle = 'rgb(195, 195, 195)';
    pctx.fillRect(0, 0, size * 2, size * 2);

    pctx.fillStyle = 'rgb(225, 225, 225)';
    pctx.fillRect(0, 0, size, size);
    pctx.fillRect(size, size, size, size);
    return context.createPattern(pattern, 'repeat');
  }

  private createNavigationBar(): void {
    this.navigationBar = this.element.createChild('div', 'screencast-navigation') as HTMLElement;
    this.navigationBack = this.navigationBar.createChild('button', 'back') as HTMLButtonElement;
    this.navigationBack.disabled = true;
    UI.ARIAUtils.setAccessibleName(this.navigationBack, i18nString(UIStrings.back));
    this.navigationForward = this.navigationBar.createChild('button', 'forward') as HTMLButtonElement;
    this.navigationForward.disabled = true;
    UI.ARIAUtils.setAccessibleName(this.navigationForward, i18nString(UIStrings.forward));
    this.navigationReload = this.navigationBar.createChild('button', 'reload');
    UI.ARIAUtils.setAccessibleName(this.navigationReload, i18nString(UIStrings.reload));
    this.navigationUrl = UI.UIUtils.createInput() as HTMLInputElement;
    UI.ARIAUtils.setAccessibleName(this.navigationUrl, i18nString(UIStrings.addressBar));
    this.navigationBar.appendChild(this.navigationUrl);
    this.navigationUrl.type = 'text';
    this.navigationProgressBar = new ProgressTracker(
        this.resourceTreeModel, this.networkManager, this.navigationBar.createChild('div', 'progress') as HTMLElement);

    if (this.resourceTreeModel) {
      this.navigationBack.addEventListener('click', this.navigateToHistoryEntry.bind(this, -1), false);
      this.navigationForward.addEventListener('click', this.navigateToHistoryEntry.bind(this, 1), false);
      this.navigationReload.addEventListener('click', this.navigateReload.bind(this), false);
      this.navigationUrl.addEventListener('keyup', this.navigationUrlKeyUp.bind(this), true);
      void this.requestNavigationHistory();
      this.resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this.requestNavigationHistoryEvent, this);
      this.resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.CachedResourcesLoaded, this.requestNavigationHistoryEvent, this);
    }
  }

  private navigateToHistoryEntry(offset: number): void {
    if (!this.resourceTreeModel) {
      return;
    }
    const newIndex = (this.historyIndex || 0) + offset;
    if (!this.historyEntries || newIndex < 0 || newIndex >= this.historyEntries.length) {
      return;
    }
    this.resourceTreeModel.navigateToHistoryEntry(this.historyEntries[newIndex]);
    void this.requestNavigationHistory();
  }

  private navigateReload(): void {
    if (!this.resourceTreeModel) {
      return;
    }
    this.resourceTreeModel.reloadPage();
  }

  private navigationUrlKeyUp(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }
    let url: string = this.navigationUrl.value;
    if (!url) {
      return;
    }
    if (!url.match(SCHEME_REGEX)) {
      url = 'http://' + url;
    }

    // Perform decodeURI in case the user enters an encoded string
    // decodeURI has no effect on strings that are already decoded
    // encodeURI ensures an encoded URL is always passed to the backend
    // This allows the input field to support both encoded and decoded URLs
    if (this.resourceTreeModel) {
      void this.resourceTreeModel.navigate(encodeURI(decodeURI(url)) as Platform.DevToolsPath.UrlString);
    }
    this.canvasElement.focus();
  }

  private requestNavigationHistoryEvent(): void {
    void this.requestNavigationHistory();
  }

  private async requestNavigationHistory(): Promise<void> {
    const history = this.resourceTreeModel ? await this.resourceTreeModel.navigationHistory() : null;
    if (!history) {
      return;
    }

    this.historyIndex = history.currentIndex;
    this.historyEntries = history.entries;

    this.navigationBack.disabled = this.historyIndex === 0;
    this.navigationForward.disabled = this.historyIndex === (this.historyEntries.length - 1);

    let url: string = this.historyEntries[this.historyIndex].url;
    const match = url.match(HTTP_REGEX);
    if (match) {
      url = match[1];
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.inspectedURLChanged(
        url as Platform.DevToolsPath.UrlString);
    this.navigationUrl.value = decodeURI(url);
  }

  private focusNavigationBar(): boolean {
    this.navigationUrl.focus();
    this.navigationUrl.select();
    return true;
  }
}

export const BORDERS_SIZE = 44;
export const NAVBAR_HEIGHT = 29;
export const HTTP_REGEX = /^http:\/\/(.+)/;
export const SCHEME_REGEX = /^(https?|about|chrome):/;

export class ProgressTracker {
  private element: HTMLElement;
  private requestIds: Map<string, SDK.NetworkRequest.NetworkRequest>|null;
  private startedRequests: number;
  private finishedRequests: number;
  private maxDisplayedProgress: number;

  constructor(
      resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel|null,
      networkManager: SDK.NetworkManager.NetworkManager|null, element: HTMLElement) {
    this.element = element;
    if (resourceTreeModel) {
      resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.MainFrameNavigated, this.onMainFrameNavigated, this);
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, this.onLoad, this);
    }
    if (networkManager) {
      networkManager.addEventListener(SDK.NetworkManager.Events.RequestStarted, this.onRequestStarted, this);
      networkManager.addEventListener(SDK.NetworkManager.Events.RequestFinished, this.onRequestFinished, this);
    }
    this.requestIds = null;
    this.startedRequests = 0;
    this.finishedRequests = 0;
    this.maxDisplayedProgress = 0;
  }

  private onMainFrameNavigated(): void {
    this.requestIds = new Map();
    this.startedRequests = 0;
    this.finishedRequests = 0;
    this.maxDisplayedProgress = 0;
    this.updateProgress(0.1);  // Display first 10% on navigation start.
  }

  private onLoad(): void {
    this.requestIds = null;
    this.updateProgress(1);  // Display 100% progress on load, hide it in 0.5s.
    window.setTimeout(() => {
      if (!this.navigationProgressVisible()) {
        this.displayProgress(0);
      }
    }, 500);
  }

  private navigationProgressVisible(): boolean {
    return this.requestIds !== null;
  }

  private onRequestStarted(event: Common.EventTarget.EventTargetEvent<SDK.NetworkManager.RequestStartedEvent>): void {
    if (!this.navigationProgressVisible()) {
      return;
    }
    const request = event.data.request;
    // Ignore long-living WebSockets for the sake of progress indicator, as we won't be waiting them anyway.
    if (request.resourceType() === Common.ResourceType.resourceTypes.WebSocket) {
      return;
    }
    if (this.requestIds) {
      this.requestIds.set(request.requestId(), request);
    }
    ++this.startedRequests;
  }

  private onRequestFinished(event: Common.EventTarget.EventTargetEvent<SDK.NetworkRequest.NetworkRequest>): void {
    if (!this.navigationProgressVisible()) {
      return;
    }
    const request = event.data;
    if (this.requestIds && !this.requestIds.has(request.requestId())) {
      return;
    }
    ++this.finishedRequests;
    window.setTimeout(() => {
      this.updateProgress(
          this.finishedRequests / this.startedRequests * 0.9);  // Finished requests drive the progress up to 90%.
    }, 500);  // Delay to give the new requests time to start. This makes the progress smoother.
  }

  private updateProgress(progress: number): void {
    if (!this.navigationProgressVisible()) {
      return;
    }
    if (this.maxDisplayedProgress >= progress) {
      return;
    }
    this.maxDisplayedProgress = progress;
    this.displayProgress(progress);
  }

  private displayProgress(progress: number): void {
    this.element.style.width = (100 * progress) + '%';
  }
}

function getAttributesForElementTitle(node: SDK.DOMModel.DOMNode): string {
  const id = node.getAttribute('id');
  const className = node.getAttribute('class');

  let selector: string = id ? '#' + id : '';
  if (className) {
    selector += '.' + className.trim().replace(/\s+/g, '.');
  }

  if (selector.length > 50) {
    selector = selector.substring(0, 50) + '…';
  }

  return selector;
}

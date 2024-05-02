/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
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
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import layers3DViewStyles from './layers3DView.css.js';
import {
  LayerSelection,
  type LayerView,
  type LayerViewHost,
  ScrollRectSelection,
  Selection,
  SnapshotSelection,
  Type,
} from './LayerViewHost.js';
import {Events as TransformControllerEvents, TransformController} from './TransformController.js';

const UIStrings = {
  /**
   *@description Text of a DOM element in DView of the Layers panel
   */
  layerInformationIsNotYet: 'Layer information is not yet available.',
  /**
   *@description Accessibility label for canvas view in Layers tool
   */
  dLayersView: '3D Layers View',
  /**
   *@description Text in DView of the Layers panel
   */
  cantDisplayLayers: 'Can\'t display layers,',
  /**
   *@description Text in DView of the Layers panel
   */
  webglSupportIsDisabledInYour: 'WebGL support is disabled in your browser.',
  /**
   *@description Text in DView of the Layers panel
   *@example {about:gpu} PH1
   */
  checkSForPossibleReasons: 'Check {PH1} for possible reasons.',
  /**
   *@description Text for a checkbox in the toolbar of the Layers panel to show the area of slow scroll rect
   */
  slowScrollRects: 'Slow scroll rects',
  /**
   * @description Text for a checkbox in the toolbar of the Layers panel. This is a noun, for a
   * setting meaning 'display paints in the layers viewer'. 'Paints' here means 'paint events' i.e.
   * when the browser draws pixels to the screen.
   */
  paints: 'Paints',
  /**
   *@description A context menu item in the DView of the Layers panel
   */
  resetView: 'Reset View',
  /**
   *@description A context menu item in the DView of the Layers panel
   */
  showPaintProfiler: 'Show Paint Profiler',
};
const str_ = i18n.i18n.registerUIStrings('panels/layer_viewer/Layers3DView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const vertexPositionAttributes = new Map<WebGLProgram, number>();

const vertexColorAttributes = new Map<WebGLProgram, number>();

const textureCoordAttributes = new Map<WebGLProgram, number>();

const uniformMatrixLocations = new Map<WebGLProgram, WebGLUniformLocation|null>();

const uniformSamplerLocations = new Map<WebGLProgram, WebGLUniformLocation|null>();

const imageForTexture = new Map<WebGLTexture, HTMLImageElement>();

export class Layers3DView extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(UI.Widget.VBox)
    implements LayerView {
  private readonly failBanner: UI.Widget.VBox;
  private readonly layerViewHost: LayerViewHost;
  private transformController: TransformController;
  private canvasElement: HTMLCanvasElement;
  private lastSelection: {[x: string]: Selection|null};
  private layerTree: SDK.LayerTreeBase.LayerTreeBase|null;
  private readonly textureManager: LayerTextureManager;
  private chromeTextures: (WebGLTexture|undefined)[];
  private rects: Rectangle[];
  private snapshotLayers: Map<SDK.LayerTreeBase.Layer, SnapshotSelection>;
  private shaderProgram!: WebGLProgram|null;
  private oldTextureScale!: number|undefined;
  private depthByLayerId!: Map<string, number>;
  private visibleLayers!: Set<SDK.LayerTreeBase.Layer>;
  private maxDepth!: number;
  private scale!: number;
  private layerTexture?: {layer: SDK.LayerTreeBase.Layer, texture: WebGLTexture}|null;
  private projectionMatrix?: DOMMatrix;
  private whiteTexture?: WebGLTexture|null;
  private gl?: WebGLRenderingContext|null;
  private dimensionsForAutoscale?: {width: number, height: number};
  private needsUpdate?: boolean;
  private updateScheduled?: boolean;
  private panelToolbar?: UI.Toolbar.Toolbar;
  private showSlowScrollRectsSetting?: Common.Settings.Setting<boolean>;
  private showPaintsSetting?: Common.Settings.Setting<boolean>;
  private mouseDownX?: number;
  private mouseDownY?: number;

  constructor(layerViewHost: LayerViewHost) {
    super(true);
    this.element.setAttribute('jslog', `${VisualLogging.pane('layers-3d-view')}`);

    this.contentElement.classList.add('layers-3d-view');
    this.failBanner = new UI.Widget.VBox();
    this.failBanner.element.classList.add('full-widget-dimmed-banner');
    UI.UIUtils.createTextChild(this.failBanner.element, i18nString(UIStrings.layerInformationIsNotYet));

    this.layerViewHost = layerViewHost;
    this.layerViewHost.registerView(this);
    this.transformController = new TransformController(this.contentElement as HTMLElement);
    this.transformController.addEventListener(TransformControllerEvents.TransformChanged, this.update, this);
    this.initToolbar();
    this.canvasElement = this.contentElement.createChild('canvas') as HTMLCanvasElement;
    this.canvasElement.tabIndex = 0;
    this.canvasElement.addEventListener('dblclick', this.onDoubleClick.bind(this), false);
    this.canvasElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
    this.canvasElement.addEventListener('mouseup', this.onMouseUp.bind(this), false);
    this.canvasElement.addEventListener('mouseleave', this.onMouseMove.bind(this), false);
    this.canvasElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    this.canvasElement.addEventListener('contextmenu', this.onContextMenu.bind(this), false);
    this.canvasElement.setAttribute('jslog', `${VisualLogging.canvas('layers').track({click: true, drag: true})}`);
    UI.ARIAUtils.setLabel(this.canvasElement, i18nString(UIStrings.dLayersView));

    this.lastSelection = {};
    this.layerTree = null;
    this.updateScheduled = false;

    this.textureManager = new LayerTextureManager(this.update.bind(this));

    this.chromeTextures = [];

    this.rects = [];

    this.snapshotLayers = new Map();
    this.layerViewHost.setLayerSnapshotMap(this.snapshotLayers);

    this.layerViewHost.showInternalLayersSetting().addChangeListener(this.update, this);
  }

  setLayerTree(layerTree: SDK.LayerTreeBase.LayerTreeBase|null): void {
    this.layerTree = layerTree;
    this.layerTexture = null;
    delete this.oldTextureScale;
    if (this.showPaints()) {
      this.textureManager.setLayerTree(layerTree);
    }
    this.update();
  }

  showImageForLayer(layer: SDK.LayerTreeBase.Layer, imageURL?: string): void {
    if (!imageURL) {
      this.layerTexture = null;
      this.update();
      return;
    }
    void UI.UIUtils.loadImage(imageURL).then(image => {
      const texture = image && LayerTextureManager.createTextureForImage(this.gl || null, image);
      this.layerTexture = texture ? {layer: layer, texture: texture} : null;
      this.update();
    });
  }

  override onResize(): void {
    this.resizeCanvas();
    this.update();
  }

  override willHide(): void {
    this.textureManager.suspend();
  }

  override wasShown(): void {
    this.textureManager.resume();
    this.registerCSSFiles([layers3DViewStyles]);
    if (!this.needsUpdate) {
      return;
    }
    this.resizeCanvas();
    this.update();
  }

  updateLayerSnapshot(layer: SDK.LayerTreeBase.Layer): void {
    this.textureManager.layerNeedsUpdate(layer);
  }

  private setOutline(type: OutlineType, selection: Selection|null): void {
    this.lastSelection[type] = selection;
    this.update();
  }

  hoverObject(selection: Selection|null): void {
    this.setOutline(OutlineType.Hovered, selection);
  }

  selectObject(selection: Selection|null): void {
    this.setOutline(OutlineType.Hovered, null);
    this.setOutline(OutlineType.Selected, selection);
  }

  snapshotForSelection(selection: Selection): Promise<SDK.PaintProfiler.SnapshotWithRect|null> {
    if (selection.type() === Type.Snapshot) {
      const snapshotWithRect = (selection as SnapshotSelection).snapshot();
      snapshotWithRect.snapshot.addReference();
      return Promise.resolve(snapshotWithRect);
    }
    if (selection.layer()) {
      const promise = selection.layer().snapshots()[0];
      if (promise !== undefined) {
        return promise;
      }
    }
    return Promise.resolve(null);
  }

  private initGL(canvas: HTMLCanvasElement): WebGLRenderingContext|null {
    const gl = canvas.getContext('webgl');
    if (!gl) {
      return null;
    }
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.enable(gl.DEPTH_TEST);
    return gl;
  }

  private createShader(type: number, script: string): void {
    if (!this.gl) {
      return;
    }

    const shader = this.gl.createShader(type);
    if (shader && this.shaderProgram) {
      this.gl.shaderSource(shader, script);
      this.gl.compileShader(shader);
      this.gl.attachShader(this.shaderProgram, shader);
    }
  }

  private initShaders(): void {
    if (!this.gl) {
      return;
    }

    this.shaderProgram = this.gl.createProgram();
    if (!this.shaderProgram) {
      return;
    }
    this.createShader(this.gl.FRAGMENT_SHADER, FragmentShader);
    this.createShader(this.gl.VERTEX_SHADER, VertexShader);
    this.gl.linkProgram(this.shaderProgram);
    this.gl.useProgram(this.shaderProgram);

    const aVertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition');
    this.gl.enableVertexAttribArray(aVertexPositionAttribute);
    vertexPositionAttributes.set(this.shaderProgram, aVertexPositionAttribute);

    const aVertexColorAttribute = this.gl.getAttribLocation(this.shaderProgram, 'aVertexColor');
    this.gl.enableVertexAttribArray(aVertexColorAttribute);
    vertexColorAttributes.set(this.shaderProgram, aVertexColorAttribute);

    const aTextureCoordAttribute = this.gl.getAttribLocation(this.shaderProgram, 'aTextureCoord');
    this.gl.enableVertexAttribArray(aTextureCoordAttribute);
    textureCoordAttributes.set(this.shaderProgram, aTextureCoordAttribute);

    const uMatrixLocation = this.gl.getUniformLocation(this.shaderProgram, 'uPMatrix');
    uniformMatrixLocations.set(this.shaderProgram, uMatrixLocation);

    const uSamplerLocation = this.gl.getUniformLocation(this.shaderProgram, 'uSampler');
    uniformSamplerLocations.set(this.shaderProgram, uSamplerLocation);
  }

  private resizeCanvas(): void {
    this.canvasElement.width = this.canvasElement.offsetWidth * window.devicePixelRatio;
    this.canvasElement.height = this.canvasElement.offsetHeight * window.devicePixelRatio;
  }

  private updateTransformAndConstraints(): void {
    const paddingFraction = 0.1;
    const dimensionsForAutoscale = this.dimensionsForAutoscale || {width: 0, height: 0};
    const viewport = this.layerTree ? this.layerTree.viewportSize() : null;
    const baseWidth = viewport ? viewport.width : dimensionsForAutoscale.width;
    const baseHeight = viewport ? viewport.height : dimensionsForAutoscale.height;
    const canvasWidth = this.canvasElement.width;
    const canvasHeight = this.canvasElement.height;
    const paddingX = canvasWidth * paddingFraction;
    const paddingY = canvasHeight * paddingFraction;
    const scaleX = (canvasWidth - 2 * paddingX) / baseWidth;
    const scaleY = (canvasHeight - 2 * paddingY) / baseHeight;
    const viewScale = Math.min(scaleX, scaleY);
    const minScaleConstraint =
        Math.min(baseWidth / dimensionsForAutoscale.width, baseHeight / dimensionsForAutoscale.width) / 2;
    this.transformController.setScaleConstraints(
        minScaleConstraint,
        10 / viewScale);  // 1/viewScale is 1:1 in terms of pixels, so allow zooming to 10x of native size
    const scale = this.transformController.scale();
    const rotateX = this.transformController.rotateX();
    const rotateY = this.transformController.rotateY();

    this.scale = scale * viewScale;
    const textureScale = Platform.NumberUtilities.clamp(this.scale, 0.1, 1);
    if (textureScale !== this.oldTextureScale) {
      this.oldTextureScale = textureScale;
      this.textureManager.setScale(textureScale);
      this.dispatchEventToListeners(Events.ScaleChanged, textureScale);
    }
    const scaleAndRotationMatrix = new WebKitCSSMatrix()
                                       .scale(scale, scale, scale)
                                       .translate(canvasWidth / 2, canvasHeight / 2, 0)
                                       .rotate(rotateX, rotateY, 0)
                                       .scale(viewScale, viewScale, viewScale)
                                       .translate(-baseWidth / 2, -baseHeight / 2, 0);

    let bounds;
    for (let i = 0; i < this.rects.length; ++i) {
      bounds = UI.Geometry.boundsForTransformedPoints(scaleAndRotationMatrix, this.rects[i].vertices, bounds);
    }

    if (bounds) {
      this.transformController.clampOffsets(
          (paddingX - bounds.maxX) / window.devicePixelRatio,
          (canvasWidth - paddingX - bounds.minX) / window.devicePixelRatio,
          (paddingY - bounds.maxY) / window.devicePixelRatio,
          (canvasHeight - paddingY - bounds.minY) / window.devicePixelRatio);
    }
    const offsetX = this.transformController.offsetX() * window.devicePixelRatio;
    const offsetY = this.transformController.offsetY() * window.devicePixelRatio;
    // Multiply to translation matrix on the right rather than translate (which would implicitly multiply on the left).
    this.projectionMatrix = new WebKitCSSMatrix().translate(offsetX, offsetY, 0).multiply(scaleAndRotationMatrix);

    const glProjectionMatrix = new WebKitCSSMatrix()
                                   .scale(1, -1, -1)
                                   .translate(-1, -1, 0)
                                   .scale(2 / this.canvasElement.width, 2 / this.canvasElement.height, 1 / 1000000)
                                   .multiply(this.projectionMatrix);

    if (this.shaderProgram) {
      const pMatrixUniform = uniformMatrixLocations.get(this.shaderProgram);
      if (this.gl && pMatrixUniform) {
        this.gl.uniformMatrix4fv(pMatrixUniform, false, this.arrayFromMatrix(glProjectionMatrix));
      }
    }
  }

  private arrayFromMatrix(m: DOMMatrix): Float32Array {
    return new Float32Array([
      m.m11,
      m.m12,
      m.m13,
      m.m14,
      m.m21,
      m.m22,
      m.m23,
      m.m24,
      m.m31,
      m.m32,
      m.m33,
      m.m34,
      m.m41,
      m.m42,
      m.m43,
      m.m44,
    ]);
  }

  private initWhiteTexture(): void {
    if (!this.gl) {
      return;
    }

    this.whiteTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.whiteTexture);
    const whitePixel = new Uint8Array([255, 255, 255, 255]);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, whitePixel);
  }

  private initChromeTextures(): void {
    function loadChromeTexture(this: Layers3DView, index: ChromeTexture, url: string): void {
      void UI.UIUtils.loadImage(url).then(image => {
        this.chromeTextures[index] =
            image && LayerTextureManager.createTextureForImage(this.gl || null, image) || undefined;
      });
    }
    loadChromeTexture.call(this, ChromeTexture.Left, 'Images/chromeLeft.avif');
    loadChromeTexture.call(this, ChromeTexture.Middle, 'Images/chromeMiddle.avif');
    loadChromeTexture.call(this, ChromeTexture.Right, 'Images/chromeRight.avif');
  }

  private initGLIfNecessary(): WebGLRenderingContext|null {
    if (this.gl) {
      return this.gl;
    }
    this.gl = this.initGL(this.canvasElement);
    if (!this.gl) {
      return null;
    }
    this.initShaders();
    this.initWhiteTexture();
    this.initChromeTextures();
    this.textureManager.setContext(this.gl);
    return this.gl;
  }

  private calculateDepthsAndVisibility(): void {
    this.depthByLayerId = new Map();
    let depth = 0;
    const showInternalLayers = this.layerViewHost.showInternalLayersSetting().get();
    if (!this.layerTree) {
      return;
    }

    const root = showInternalLayers ? this.layerTree.root() : (this.layerTree.contentRoot() || this.layerTree.root());
    if (!root) {
      return;
    }

    const queue = [root];
    this.depthByLayerId.set(root.id(), 0);
    this.visibleLayers = new Set();
    while (queue.length > 0) {
      const layer = queue.shift();
      if (!layer) {
        break;
      }

      if (showInternalLayers || layer.drawsContent()) {
        this.visibleLayers.add(layer);
      }
      const children = layer.children();
      for (let i = 0; i < children.length; ++i) {
        this.depthByLayerId.set(children[i].id(), ++depth);
        queue.push(children[i]);
      }
    }
    this.maxDepth = depth;
  }

  private depthForLayer(layer: SDK.LayerTreeBase.Layer): number {
    return (this.depthByLayerId.get(layer.id()) || 0) * LayerSpacing;
  }

  private calculateScrollRectDepth(layer: SDK.LayerTreeBase.Layer, index: number): number {
    return this.depthForLayer(layer) + index * ScrollRectSpacing + 1;
  }

  private updateDimensionsForAutoscale(layer: SDK.LayerTreeBase.Layer): void {
    // We don't want to be precise, but rather pick something least affected by
    // animationtransforms, so that we don't change scale too often. So let's
    // disregard transforms, scrolling and relative layer positioning and choose
    // the largest dimensions of all layers.
    if (!this.dimensionsForAutoscale) {
      this.dimensionsForAutoscale = {width: 0, height: 0};
    }

    this.dimensionsForAutoscale.width = Math.max(layer.width(), this.dimensionsForAutoscale.width);
    this.dimensionsForAutoscale.height = Math.max(layer.height(), this.dimensionsForAutoscale.height);
  }

  private calculateLayerRect(layer: SDK.LayerTreeBase.Layer): void {
    if (!this.visibleLayers.has(layer)) {
      return;
    }
    const selection = new LayerSelection(layer);
    const rect = new Rectangle(selection);
    rect.setVertices(layer.quad(), this.depthForLayer(layer));
    this.appendRect(rect);
    this.updateDimensionsForAutoscale(layer);
  }

  private appendRect(rect: Rectangle): void {
    const selection = rect.relatedObject;
    const isSelected = Selection.isEqual(this.lastSelection[OutlineType.Selected], selection);
    const isHovered = Selection.isEqual(this.lastSelection[OutlineType.Hovered], selection);
    if (isSelected) {
      rect.borderColor = SelectedBorderColor;
    } else if (isHovered) {
      rect.borderColor = HoveredBorderColor;
      const fillColor = rect.fillColor || [255, 255, 255, 1];
      const maskColor = HoveredImageMaskColor;
      rect.fillColor = [
        fillColor[0] * maskColor[0] / 255,
        fillColor[1] * maskColor[1] / 255,
        fillColor[2] * maskColor[2] / 255,
        fillColor[3] * maskColor[3],
      ];
    } else {
      rect.borderColor = BorderColor;
    }
    rect.lineWidth = isSelected ? SelectedBorderWidth : BorderWidth;
    this.rects.push(rect);
  }

  private calculateLayerScrollRects(layer: SDK.LayerTreeBase.Layer): void {
    const scrollRects = layer.scrollRects();
    for (let i = 0; i < scrollRects.length; ++i) {
      const selection = new ScrollRectSelection(layer, i);
      const rect = new Rectangle(selection);
      rect.calculateVerticesFromRect(layer, scrollRects[i].rect, this.calculateScrollRectDepth(layer, i));
      rect.fillColor = ScrollRectBackgroundColor;
      this.appendRect(rect);
    }
  }

  private calculateLayerTileRects(layer: SDK.LayerTreeBase.Layer): void {
    const tiles = this.textureManager.tilesForLayer(layer);
    for (let i = 0; i < tiles.length; ++i) {
      const tile = tiles[i];
      if (!tile.texture) {
        continue;
      }
      const selection = new SnapshotSelection(layer, {rect: tile.rect, snapshot: tile.snapshot});
      const rect = new Rectangle(selection);
      if (!this.snapshotLayers.has(layer)) {
        this.snapshotLayers.set(layer, selection);
      }

      rect.calculateVerticesFromRect(layer, tile.rect, this.depthForLayer(layer) + 1);
      rect.texture = tile.texture;
      this.appendRect(rect);
    }
  }

  private calculateRects(): void {
    this.rects = [];
    this.snapshotLayers.clear();
    this.dimensionsForAutoscale = {width: 0, height: 0};
    if (this.layerTree) {
      this.layerTree.forEachLayer(this.calculateLayerRect.bind(this));
    }

    if (this.showSlowScrollRectsSetting && this.showSlowScrollRectsSetting.get() && this.layerTree) {
      this.layerTree.forEachLayer(this.calculateLayerScrollRects.bind(this));
    }

    if (this.layerTexture && this.visibleLayers.has(this.layerTexture.layer)) {
      const layer = this.layerTexture.layer;
      const selection = new LayerSelection(layer);
      const rect = new Rectangle(selection);
      rect.setVertices(layer.quad(), this.depthForLayer(layer));
      rect.texture = this.layerTexture.texture;
      this.appendRect(rect);
    } else if (this.showPaints() && this.layerTree) {
      this.layerTree.forEachLayer(this.calculateLayerTileRects.bind(this));
    }
  }

  private makeColorsArray(color: number[]): number[] {
    let colors: number[] = [];
    const normalizedColor = [color[0] / 255, color[1] / 255, color[2] / 255, color[3]];
    for (let i = 0; i < 4; i++) {
      colors = colors.concat(normalizedColor);
    }
    return colors;
  }

  private setVertexAttribute(attribute: number, array: number[], length: number): void {
    const gl = this.gl;
    if (!gl) {
      return;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);
    gl.vertexAttribPointer(attribute, length, gl.FLOAT, false, 0, 0);
  }

  // This view currently draws every rect, every frame
  // It'd be far more effectient to retain the buffers created in setVertexAttribute,
  // and manipulate them as needed.
  // TODO(crbug.com/1473451): consider those optimizations or porting to 3D css transforms
  private drawRectangle(vertices: number[], mode: number, color?: number[], texture?: Object): void {
    const gl = this.gl;
    const white = [255, 255, 255, 1];
    color = color || white;
    if (!this.shaderProgram) {
      return;
    }

    const vertexPositionAttribute = vertexPositionAttributes.get(this.shaderProgram);
    const textureCoordAttribute = textureCoordAttributes.get(this.shaderProgram);
    const vertexColorAttribute = vertexColorAttributes.get(this.shaderProgram);
    if (typeof vertexPositionAttribute !== 'undefined') {
      this.setVertexAttribute(vertexPositionAttribute, vertices, 3);
    }
    if (typeof textureCoordAttribute !== 'undefined') {
      this.setVertexAttribute(textureCoordAttribute, [0, 1, 1, 1, 1, 0, 0, 0], 2);
    }
    if (typeof vertexColorAttribute !== 'undefined') {
      this.setVertexAttribute(vertexColorAttribute, this.makeColorsArray(color), color.length);
    }

    if (!gl) {
      return;
    }

    const samplerUniform = uniformSamplerLocations.get(this.shaderProgram);
    if (texture) {
      if (samplerUniform) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(samplerUniform, 0);
      }
    } else if (this.whiteTexture) {
      gl.bindTexture(gl.TEXTURE_2D, this.whiteTexture);
    }

    const numberOfVertices = vertices.length / 3;
    gl.drawArrays(mode, 0, numberOfVertices);
  }

  private drawTexture(vertices: number[], texture: WebGLTexture, color?: number[]): void {
    if (!this.gl) {
      return;
    }

    this.drawRectangle(vertices, this.gl.TRIANGLE_FAN, color, texture);
  }

  private drawViewportAndChrome(): void {
    if (!this.layerTree) {
      return;
    }

    const viewport = this.layerTree.viewportSize();
    if (!viewport) {
      return;
    }

    const drawChrome = !Common.Settings.Settings.instance().moduleSetting('frame-viewer-hide-chrome-window').get() &&
        this.chromeTextures.length >= 3 && this.chromeTextures.indexOf(undefined) < 0;
    const z = (this.maxDepth + 1) * LayerSpacing;
    const borderWidth = Math.ceil(ViewportBorderWidth * this.scale);
    let vertices: number[] = [viewport.width, 0, z, viewport.width, viewport.height, z, 0, viewport.height, z, 0, 0, z];
    if (!this.gl) {
      return;
    }

    this.gl.lineWidth(borderWidth);
    this.drawRectangle(vertices, drawChrome ? this.gl.LINE_STRIP : this.gl.LINE_LOOP, ViewportBorderColor);

    if (!drawChrome) {
      return;
    }

    const viewportSize = this.layerTree.viewportSize();
    if (!viewportSize) {
      return;
    }

    const borderAdjustment = ViewportBorderWidth / 2;
    const viewportWidth = viewportSize.width + 2 * borderAdjustment;
    if (this.chromeTextures[0] && this.chromeTextures[2]) {
      const chromeTextureImage =
          imageForTexture.get(this.chromeTextures[0] as WebGLTexture) || {naturalHeight: 0, naturalWidth: 0};
      const chromeHeight = chromeTextureImage.naturalHeight;

      const middleTextureImage =
          imageForTexture.get(this.chromeTextures[2] as WebGLTexture) || {naturalHeight: 0, naturalWidth: 0};
      const middleFragmentWidth = viewportWidth - chromeTextureImage.naturalWidth - middleTextureImage.naturalWidth;
      let x = -borderAdjustment;
      const y = -chromeHeight;
      for (let i = 0; i < this.chromeTextures.length; ++i) {
        const texture = this.chromeTextures[i];
        if (!texture) {
          continue;
        }

        const image = imageForTexture.get(texture);
        if (!image) {
          continue;
        }
        const width = i === ChromeTexture.Middle ? middleFragmentWidth : image.naturalWidth;
        if (width < 0 || x + width > viewportWidth) {
          break;
        }
        vertices = [x, y, z, x + width, y, z, x + width, y + chromeHeight, z, x, y + chromeHeight, z];
        this.drawTexture(vertices, this.chromeTextures[i] as WebGLTexture);
        x += width;
      }
    }
  }

  private drawViewRect(rect: Rectangle): void {
    if (!this.gl) {
      return;
    }

    const vertices = rect.vertices;
    if (rect.texture) {
      this.drawTexture(vertices, rect.texture, rect.fillColor || undefined);
    } else if (rect.fillColor) {
      this.drawRectangle(vertices, this.gl.TRIANGLE_FAN, rect.fillColor);
    }
    this.gl.lineWidth(rect.lineWidth);
    if (rect.borderColor) {
      this.drawRectangle(vertices, this.gl.LINE_LOOP, rect.borderColor);
    }
  }

  private update(): void {
    if (!this.isShowing()) {
      this.needsUpdate = true;
      return;
    }
    // Debounce into the next frame (double rAF).
    // Without this the GPU work can pile up without any backpressure.
    // A single rAF might be fine, but the GPU work here is so heavy, we prefer
    // the extra breathing room over lower latency
    if (!this.updateScheduled) {
      this.updateScheduled = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
                              this.updateScheduled = false;
                              this.innerUpdate();
                            }));
    }
  }

  private innerUpdate(): void {
    if (!this.layerTree || !this.layerTree.root()) {
      this.failBanner.show(this.contentElement);
      return;
    }
    const gl = this.initGLIfNecessary();
    if (!gl) {
      this.failBanner.element.removeChildren();
      this.failBanner.element.appendChild(this.webglDisabledBanner());
      this.failBanner.show(this.contentElement);
      return;
    }
    this.failBanner.detach();
    const viewportWidth = this.canvasElement.width;
    const viewportHeight = this.canvasElement.height;

    this.calculateDepthsAndVisibility();
    this.calculateRects();
    this.updateTransformAndConstraints();

    gl.viewport(0, 0, viewportWidth, viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.rects.forEach(this.drawViewRect.bind(this));
    this.drawViewportAndChrome();
  }

  private webglDisabledBanner(): Node {
    const fragment = this.contentElement.ownerDocument.createDocumentFragment();
    fragment.createChild('div').textContent = i18nString(UIStrings.cantDisplayLayers);
    fragment.createChild('div').textContent = i18nString(UIStrings.webglSupportIsDisabledInYour);
    fragment.appendChild(i18n.i18n.getFormatLocalizedString(
        str_, UIStrings.checkSForPossibleReasons,
        {PH1: UI.XLink.XLink.create('about:gpu', undefined, undefined, undefined, 'about-gpu')}));
    return fragment;
  }

  private selectionFromEventPoint(event: Event): Selection|null {
    const mouseEvent = event as MouseEvent;
    if (!this.layerTree) {
      return null;
    }
    let closestIntersectionPoint: number = Infinity;
    let closestObject: Selection|null = null;
    const projectionMatrix =
        new WebKitCSSMatrix().scale(1, -1, -1).translate(-1, -1, 0).multiply(this.projectionMatrix);
    const x0 = (mouseEvent.clientX - this.canvasElement.getBoundingClientRect().left) * window.devicePixelRatio;
    const y0 = -(mouseEvent.clientY - this.canvasElement.getBoundingClientRect().top) * window.devicePixelRatio;

    function checkIntersection(rect: Rectangle): void {
      if (!rect.relatedObject) {
        return;
      }
      const t = rect.intersectWithLine(projectionMatrix, x0, y0);
      if (t && t < closestIntersectionPoint) {
        closestIntersectionPoint = t;
        closestObject = rect.relatedObject;
      }
    }

    this.rects.forEach(checkIntersection);
    return closestObject;
  }

  private createVisibilitySetting(caption: string, name: string, value: boolean, toolbar: UI.Toolbar.Toolbar):
      Common.Settings.Setting<boolean> {
    const setting = Common.Settings.Settings.instance().createSetting(name, value);
    setting.setTitle(caption);
    setting.addChangeListener(this.update, this);
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingCheckbox(setting));
    return setting;
  }

  private initToolbar(): void {
    this.panelToolbar = this.transformController.toolbar();
    this.contentElement.appendChild(this.panelToolbar.element);
    this.showPaintsSetting = this.createVisibilitySetting(
        i18nString(UIStrings.paints), 'frame-viewer-show-paints', false, this.panelToolbar);
    this.showSlowScrollRectsSetting = this.createVisibilitySetting(
        i18nString(UIStrings.slowScrollRects), 'frame-viewer-show-slow-scroll-rects', true, this.panelToolbar);
    this.showPaintsSetting.addChangeListener(this.updatePaints, this);
    Common.Settings.Settings.instance()
        .moduleSetting('frame-viewer-hide-chrome-window')
        .addChangeListener(this.update, this);
  }

  private onContextMenu(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.defaultSection().appendItem(
        i18nString(UIStrings.resetView), () => this.transformController.resetAndNotify(), {
          jslogContext: 'layers.3d-center',
        });
    const selection = this.selectionFromEventPoint(event);
    if (selection && selection.type() === Type.Snapshot) {
      contextMenu.defaultSection().appendItem(
          i18nString(UIStrings.showPaintProfiler),
          () => this.dispatchEventToListeners(Events.PaintProfilerRequested, selection), {
            jslogContext: 'layers.paint-profiler',
          });
    }
    this.layerViewHost.showContextMenu(contextMenu, selection);
  }

  private onMouseMove(event: Event): void {
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.which) {
      return;
    }
    this.layerViewHost.hoverObject(this.selectionFromEventPoint(event));
  }

  private onMouseDown(event: Event): void {
    const mouseEvent = event as MouseEvent;
    this.mouseDownX = mouseEvent.clientX;
    this.mouseDownY = mouseEvent.clientY;
  }

  private onMouseUp(event: Event): void {
    const mouseEvent = event as MouseEvent;
    const maxDistanceInPixels = 6;
    if (this.mouseDownX && Math.abs(mouseEvent.clientX - this.mouseDownX) < maxDistanceInPixels &&
        Math.abs(mouseEvent.clientY - (this.mouseDownY || 0)) < maxDistanceInPixels) {
      this.canvasElement.focus();
      this.layerViewHost.selectObject(this.selectionFromEventPoint(event));
    }
    delete this.mouseDownX;
    delete this.mouseDownY;
  }

  private onDoubleClick(event: Event): void {
    const selection = this.selectionFromEventPoint(event);
    if (selection && (selection.type() === Type.Snapshot || selection.layer())) {
      this.dispatchEventToListeners(Events.PaintProfilerRequested, selection);
    }
    event.stopPropagation();
  }

  private updatePaints(): void {
    if (this.showPaints()) {
      this.textureManager.setLayerTree(this.layerTree);
      this.textureManager.forceUpdate();
    } else {
      this.textureManager.reset();
    }
    this.update();
  }

  private showPaints(): boolean {
    return this.showPaintsSetting ? this.showPaintsSetting.get() : false;
  }
}

export enum OutlineType {
  Hovered = 'hovered',
  Selected = 'selected',
}

export const enum Events {
  PaintProfilerRequested = 'PaintProfilerRequested',
  ScaleChanged = 'ScaleChanged',
}

export type EventTypes = {
  [Events.PaintProfilerRequested]: Selection,
  [Events.ScaleChanged]: number,
};

export const enum ChromeTexture {
  Left = 0,
  Middle = 1,
  Right = 2,
}

export const FragmentShader = '' +
    'precision mediump float;\n' +
    'varying vec4 vColor;\n' +
    'varying vec2 vTextureCoord;\n' +
    'uniform sampler2D uSampler;\n' +
    'void main(void)\n' +
    '{\n' +
    '    gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t)) * vColor;\n' +
    '}';

export const VertexShader = '' +
    'attribute vec3 aVertexPosition;\n' +
    'attribute vec2 aTextureCoord;\n' +
    'attribute vec4 aVertexColor;\n' +
    'uniform mat4 uPMatrix;\n' +
    'varying vec2 vTextureCoord;\n' +
    'varying vec4 vColor;\n' +
    'void main(void)\n' +
    '{\n' +
    'gl_Position = uPMatrix * vec4(aVertexPosition, 1.0);\n' +
    'vColor = aVertexColor;\n' +
    'vTextureCoord = aTextureCoord;\n' +
    '}';

export const HoveredBorderColor = [0, 0, 255, 1];
export const SelectedBorderColor = [0, 255, 0, 1];
export const BorderColor = [0, 0, 0, 1];
export const ViewportBorderColor = [160, 160, 160, 1];
export const ScrollRectBackgroundColor = [178, 100, 100, 0.6];
export const HoveredImageMaskColor = [200, 200, 255, 1];
export const BorderWidth = 1;
export const SelectedBorderWidth = 2;
export const ViewportBorderWidth = 3;

export const LayerSpacing = 20;
export const ScrollRectSpacing = 4;

export class LayerTextureManager {
  private readonly textureUpdatedCallback: () => void;
  private readonly throttler: Common.Throttler.Throttler;
  private scale: number;
  private active: boolean;
  private queue!: SDK.LayerTreeBase.Layer[];
  private tilesByLayer!: Map<SDK.LayerTreeBase.Layer, Tile[]>;
  private gl?: WebGLRenderingContext;
  constructor(textureUpdatedCallback: () => void) {
    this.textureUpdatedCallback = textureUpdatedCallback;
    this.throttler = new Common.Throttler.Throttler(0);
    this.scale = 0;
    this.active = false;
    this.reset();
  }

  static createTextureForImage(gl: WebGLRenderingContext|null, image: HTMLImageElement): WebGLTexture {
    if (!gl) {
      throw new Error('WebGLRenderingContext not provided');
    }
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error('Unable to create texture');
    }

    imageForTexture.set(texture, image);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  }

  reset(): void {
    if (this.tilesByLayer) {
      this.setLayerTree(null);
    }

    this.tilesByLayer = new Map();
    this.queue = [];
  }

  setContext(glContext: WebGLRenderingContext): void {
    this.gl = glContext;
    if (this.scale) {
      this.updateTextures();
    }
  }

  suspend(): void {
    this.active = false;
  }

  resume(): void {
    this.active = true;
    if (this.queue.length) {
      void this.update();
    }
  }

  setLayerTree(layerTree: SDK.LayerTreeBase.LayerTreeBase|null): void {
    const newLayers = new Set<SDK.LayerTreeBase.Layer>();
    const oldLayers = Array.from(this.tilesByLayer.keys());
    if (layerTree) {
      layerTree.forEachLayer(layer => {
        if (!layer.drawsContent()) {
          return;
        }
        newLayers.add(layer);
        if (!this.tilesByLayer.has(layer)) {
          this.tilesByLayer.set(layer, []);
          this.layerNeedsUpdate(layer);
        }
      });
    }
    if (!oldLayers.length) {
      this.forceUpdate();
    }
    for (const layer of oldLayers) {
      if (newLayers.has(layer)) {
        continue;
      }
      const tiles = this.tilesByLayer.get(layer);
      if (tiles) {
        tiles.forEach(tile => tile.dispose());
      }
      this.tilesByLayer.delete(layer);
    }
  }

  private setSnapshotsForLayer(layer: SDK.LayerTreeBase.Layer, snapshots: SDK.PaintProfiler.SnapshotWithRect[]):
      Promise<void> {
    const oldSnapshotsToTiles = new Map((this.tilesByLayer.get(layer) || []).map(tile => [tile.snapshot, tile]));
    const newTiles = [];
    const reusedTiles = [];
    for (const snapshot of snapshots) {
      const oldTile = oldSnapshotsToTiles.get(snapshot.snapshot);
      if (oldTile) {
        reusedTiles.push(oldTile);
        oldSnapshotsToTiles.delete(snapshot.snapshot);
      } else {
        newTiles.push(new Tile(snapshot));
      }
    }
    this.tilesByLayer.set(layer, reusedTiles.concat(newTiles));
    for (const tile of oldSnapshotsToTiles.values()) {
      tile.dispose();
    }
    const gl = this.gl;
    if (!gl || !this.scale) {
      return Promise.resolve();
    }
    return Promise.all(newTiles.map(tile => tile.update(gl, this.scale))).then(this.textureUpdatedCallback);
  }

  setScale(scale: number): void {
    if (this.scale && this.scale >= scale) {
      return;
    }
    this.scale = scale;
    this.updateTextures();
  }

  tilesForLayer(layer: SDK.LayerTreeBase.Layer): Tile[] {
    return this.tilesByLayer.get(layer) || [];
  }

  layerNeedsUpdate(layer: SDK.LayerTreeBase.Layer): void {
    if (this.queue.indexOf(layer) < 0) {
      this.queue.push(layer);
    }
    if (this.active) {
      void this.throttler.schedule(this.update.bind(this));
    }
  }

  forceUpdate(): void {
    this.queue.forEach(layer => this.updateLayer(layer));
    this.queue = [];
    void this.update();
  }

  private update(): Promise<void> {
    const layer = this.queue.shift();
    if (!layer) {
      return Promise.resolve();
    }
    if (this.queue.length) {
      void this.throttler.schedule(this.update.bind(this));
    }
    return this.updateLayer(layer);
  }

  private updateLayer(layer: SDK.LayerTreeBase.Layer): Promise<void> {
    return Promise.all(layer.snapshots())
        .then(
            snapshots => this.setSnapshotsForLayer(
                layer, snapshots.filter(snapshot => snapshot !== null) as SDK.PaintProfiler.SnapshotWithRect[]));
  }

  private updateTextures(): void {
    if (!this.gl) {
      return;
    }
    if (!this.scale) {
      return;
    }

    for (const tiles of this.tilesByLayer.values()) {
      for (const tile of tiles) {
        const promise = tile.updateScale(this.gl, this.scale);
        if (promise) {
          void promise.then(this.textureUpdatedCallback);
        }
      }
    }
  }
}

export class Rectangle {
  relatedObject: Selection|null;
  lineWidth: number;
  borderColor: number[]|null;
  fillColor: number[]|null;
  texture: WebGLTexture|null;
  vertices!: number[];
  constructor(relatedObject: Selection|null) {
    this.relatedObject = relatedObject;
    this.lineWidth = 1;
    this.borderColor = null;
    this.fillColor = null;
    this.texture = null;
  }

  setVertices(quad: number[], z: number): void {
    this.vertices = [quad[0], quad[1], z, quad[2], quad[3], z, quad[4], quad[5], z, quad[6], quad[7], z];
  }

  /**
   * Finds coordinates of point on layer quad, having offsets (ratioX * width) and (ratioY * height)
   * from the left corner of the initial layer rect, where width and heigth are layer bounds.
   */
  private calculatePointOnQuad(quad: number[], ratioX: number, ratioY: number): number[] {
    const x0 = quad[0];
    const y0 = quad[1];
    const x1 = quad[2];
    const y1 = quad[3];
    const x2 = quad[4];
    const y2 = quad[5];
    const x3 = quad[6];
    const y3 = quad[7];
    // Point on the first quad side clockwise
    const firstSidePointX = x0 + ratioX * (x1 - x0);
    const firstSidePointY = y0 + ratioX * (y1 - y0);
    // Point on the third quad side clockwise
    const thirdSidePointX = x3 + ratioX * (x2 - x3);
    const thirdSidePointY = y3 + ratioX * (y2 - y3);
    const x = firstSidePointX + ratioY * (thirdSidePointX - firstSidePointX);
    const y = firstSidePointY + ratioY * (thirdSidePointY - firstSidePointY);
    return [x, y];
  }

  calculateVerticesFromRect(layer: SDK.LayerTreeBase.Layer, rect: Protocol.DOM.Rect, z: number): void {
    const quad = layer.quad();
    const rx1 = rect.x / layer.width();
    const rx2 = (rect.x + rect.width) / layer.width();
    const ry1 = rect.y / layer.height();
    const ry2 = (rect.y + rect.height) / layer.height();
    const rectQuad = this.calculatePointOnQuad(quad, rx1, ry1)
                         .concat(this.calculatePointOnQuad(quad, rx2, ry1))
                         .concat(this.calculatePointOnQuad(quad, rx2, ry2))
                         .concat(this.calculatePointOnQuad(quad, rx1, ry2));
    this.setVertices(rectQuad, z);
  }

  /**
   * Intersects quad with given transform matrix and line l(t) = (x0, y0, t)
   */
  intersectWithLine(matrix: DOMMatrix, x0: number, y0: number): number|undefined {
    let i;
    // Vertices of the quad with transform matrix applied
    const points = [];
    for (i = 0; i < 4; ++i) {
      points[i] = UI.Geometry.multiplyVectorByMatrixAndNormalize(
          new UI.Geometry.Vector(this.vertices[i * 3], this.vertices[i * 3 + 1], this.vertices[i * 3 + 2]), matrix);
    }
    // Calculating quad plane normal
    const normal = UI.Geometry.crossProduct(
        UI.Geometry.subtract(points[1], points[0]), UI.Geometry.subtract(points[2], points[1]));
    // General form of the equation of the quad plane: A * x + B * y + C * z + D = 0
    const A = normal.x;
    const B = normal.y;
    const C = normal.z;
    const D = -(A * points[0].x + B * points[0].y + C * points[0].z);
    // Finding t from the equation
    const t = -(D + A * x0 + B * y0) / C;
    // Point of the intersection
    const pt = new UI.Geometry.Vector(x0, y0, t);
    // Vectors from the intersection point to vertices of the quad
    const tVects = points.map(UI.Geometry.subtract.bind(null, pt));
    // Intersection point lies inside of the polygon if scalar products of normal of the plane and
    // cross products of successive tVects are all nonstrictly above or all nonstrictly below zero
    for (i = 0; i < tVects.length; ++i) {
      const product =
          UI.Geometry.scalarProduct(normal, UI.Geometry.crossProduct(tVects[i], tVects[(i + 1) % tVects.length]));
      if (product < 0) {
        return undefined;
      }
    }
    return t;
  }
}

export class Tile {
  snapshot: SDK.PaintProfiler.PaintProfilerSnapshot;
  rect: Protocol.DOM.Rect;
  scale: number;
  texture: WebGLTexture|null;
  private gl!: WebGLRenderingContext;
  constructor(snapshotWithRect: SDK.PaintProfiler.SnapshotWithRect) {
    this.snapshot = snapshotWithRect.snapshot;
    this.rect = snapshotWithRect.rect;
    this.scale = 0;
    this.texture = null;
  }

  dispose(): void {
    this.snapshot.release();
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
  }

  updateScale(glContext: WebGLRenderingContext, scale: number): Promise<void>|null {
    if (this.texture && this.scale >= scale) {
      return null;
    }
    return this.update(glContext, scale);
  }

  async update(glContext: WebGLRenderingContext, scale: number): Promise<void> {
    this.gl = glContext;
    this.scale = scale;
    const imageURL = await this.snapshot.replay(scale);
    const image = imageURL ? await UI.UIUtils.loadImage(imageURL) : null;
    this.texture = image ? LayerTextureManager.createTextureForImage(glContext, image) : null;
  }
}

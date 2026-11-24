// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Trace from '../../models/trace/trace.js';
import * as Geometry from '../../ui/geometry/geometry.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';
import * as LayerViewer from '../layer_viewer/layer_viewer.js';

import timelinePaintProfilerStyles from './timelinePaintProfiler.css.js';
import {TracingFrameLayerTree} from './TracingLayerTree.js';

const {ifDefined, styleMap} = Directives;
const {widget} = UI.Widget;

export interface ViewInput {
  snapshot: SDK.PaintProfiler.PaintProfilerSnapshot|null;
  log: SDK.PaintProfiler.PaintProfilerLogItem[];
  clipRect: Protocol.DOM.Rect|null;
  selectionWindow: {left: number, right: number}|null;
  imageURL: string|undefined;
  onShowImage: (imageURL?: string) => void;
  onWindowChanged: (selectionWindow: {left: number, right: number}|null) => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  // clang-format off
  render(html`
    <style>${timelinePaintProfilerStyles}</style>
    <div class="timeline-paint-profiler-view vbox flex-auto">
      <devtools-widget class="timeline-paint-profiler-bar"
          ${widget(LayerViewer.PaintProfilerView.PaintProfilerView, {
            showImageCallback: input.onShowImage,
            snapshotAndLog: {snapshot: input.snapshot, log: input.log, clipRect: input.clipRect},
          })}
          @WindowChanged=${(e: CustomEvent<{left: number, right: number}|null>) => input.onWindowChanged(e.detail)}>
      </devtools-widget>
      <devtools-split-view direction="column" sidebar-position="first" name="timeline-paint-profiler-log-split">
        <devtools-widget slot="sidebar"
            ${widget(LayerViewer.PaintProfilerView.PaintProfilerCommandLogView, {
              commandLog: input.log,
              selectionWindow: input.selectionWindow,
            })}>
        </devtools-widget>
        <devtools-widget slot="main"
            ${widget(TimelinePaintImageView, {
              imageURL: input.imageURL,
              maskRectangle: input.clipRect,
            })}>
        </devtools-widget>
      </devtools-split-view>
    </div>`,
    target);
  // clang-format on
};

export class TimelinePaintProfilerView extends UI.Widget.VBox {
  readonly #view: View;
  #needsUpdateWhenVisible = false;
  #pendingSnapshot: SDK.PaintProfiler.PaintProfilerSnapshot|null = null;
  #event: Trace.Types.Events.Event|null = null;
  #paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel|null = null;
  #lastLoadedSnapshot: SDK.PaintProfiler.PaintProfilerSnapshot|null = null;
  #parsedTrace?: Trace.TraceModel.ParsedTrace;
  #snapshot: SDK.PaintProfiler.PaintProfilerSnapshot|null = null;
  #log: SDK.PaintProfiler.PaintProfilerLogItem[] = [];
  #clipRect: Protocol.DOM.Rect|null = null;
  #selectionWindow: {left: number, right: number}|null = null;
  #imageURL: string|undefined = undefined;

  constructor(element?: HTMLElement, parsedTrace?: Trace.TraceModel.ParsedTrace, view: View = DEFAULT_VIEW) {
    super(element);
    this.#parsedTrace = parsedTrace;
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
    if (this.#needsUpdateWhenVisible) {
      this.#needsUpdateWhenVisible = false;
      this.#updateSnapshot();
    }
  }

  setSnapshot(snapshot: SDK.PaintProfiler.PaintProfilerSnapshot): void {
    this.#releaseSnapshot();
    this.#pendingSnapshot = snapshot;
    this.#event = null;
    this.#updateWhenVisible();
  }

  #rasterEventHasTile(event: Trace.Types.Events.RasterTask): boolean {
    const data = event.args.tileData;
    if (!data) {
      return false;
    }

    const frame = this.#parsedTrace?.data.Frames.framesById[data.sourceFrameNumber];
    if (!frame?.layerTree) {
      return false;
    }
    return true;
  }

  setEvent(paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel, event: Trace.Types.Events.Event): boolean {
    this.#releaseSnapshot();
    this.#paintProfilerModel = paintProfilerModel;
    this.#pendingSnapshot = null;
    this.#event = event;

    this.#updateWhenVisible();
    if (Trace.Types.Events.isPaint(event)) {
      const snapshot = this.#parsedTrace?.data.LayerTree.paintsToSnapshots.get(event);
      return Boolean(snapshot);
    }
    if (Trace.Types.Events.isRasterTask(event)) {
      return this.#rasterEventHasTile(event);
    }
    return false;
  }

  #updateWhenVisible(): void {
    if (this.isShowing()) {
      this.#updateSnapshot();
    } else {
      this.#needsUpdateWhenVisible = true;
    }
  }

  async #rasterTilePromise(rasterEvent: Trace.Types.Events.RasterTask): Promise<{
    rect: Protocol.DOM.Rect,
    snapshot: SDK.PaintProfiler.PaintProfilerSnapshot,
  }|null> {
    const data = rasterEvent.args.tileData;
    if (!data) {
      return null;
    }

    if (!data.tileId.id_ref) {
      return null;
    }

    const target = SDK.TargetManager.TargetManager.instance().rootTarget();
    if (!target) {
      return null;
    }

    const frame = this.#parsedTrace?.data.Frames.framesById[data.sourceFrameNumber];
    if (!frame?.layerTree) {
      return null;
    }

    const layerTree = new TracingFrameLayerTree(
        target,
        frame.layerTree,
    );
    const tracingLayerTree = await layerTree.layerTreePromise();
    return tracingLayerTree ? await tracingLayerTree.pictureForRasterTile(data.tileId.id_ref) : null;
  }

  #updateSnapshot(): void {
    this.#snapshot = null;
    this.#log = [];
    this.#selectionWindow = null;
    this.requestUpdate();

    let snapshotPromise: Promise<{
      rect: Protocol.DOM.Rect | null,
      snapshot: SDK.PaintProfiler.PaintProfilerSnapshot,
    }|null>;
    if (this.#pendingSnapshot) {
      snapshotPromise = Promise.resolve({rect: null, snapshot: this.#pendingSnapshot});
    } else if (this.#event && this.#paintProfilerModel && Trace.Types.Events.isPaint(this.#event)) {
      // When we process events (TimelineModel#processEvent) and find a
      // snapshot event, we look for the last paint that occurred and link the
      // snapshot to that paint event. That is why here if the event is a Paint
      // event, we look to see if it has had a matching picture event set for
      // it.
      const snapshotEvent = this.#parsedTrace?.data.LayerTree.paintsToSnapshots.get(this.#event);
      if (snapshotEvent) {
        const encodedData = snapshotEvent.args.snapshot.skp64;
        snapshotPromise = this.#paintProfilerModel.loadSnapshot(encodedData).then(snapshot => {
          return snapshot && {rect: null, snapshot};
        });
      } else {
        snapshotPromise = Promise.resolve(null);
      }

    } else if (this.#event && Trace.Types.Events.isRasterTask(this.#event)) {
      snapshotPromise = this.#rasterTilePromise(this.#event);
    } else {
      console.assert(false, 'Unexpected event type or no snapshot');
      return;
    }
    void snapshotPromise.then(snapshotWithRect => {
      this.#releaseSnapshot();
      if (!snapshotWithRect) {
        this.#imageURL = undefined;
        this.requestUpdate();
        return;
      }
      const snapshot = snapshotWithRect.snapshot;
      this.#lastLoadedSnapshot = snapshot;
      this.#clipRect = snapshotWithRect.rect;
      this.requestUpdate();
      void snapshot.commandLog().then(log => onCommandLogDone.call(this, snapshot, snapshotWithRect.rect, log || []));
    });

    function onCommandLogDone(
        this: TimelinePaintProfilerView, snapshot: SDK.PaintProfiler.PaintProfilerSnapshot,
        clipRect: Protocol.DOM.Rect|null, log?: SDK.PaintProfiler.PaintProfilerLogItem[]): void {
      this.#snapshot = snapshot;
      this.#log = log || [];
      this.#clipRect = clipRect;
      this.#selectionWindow = null;
      this.requestUpdate();
    }
  }

  #releaseSnapshot(): void {
    if (!this.#lastLoadedSnapshot) {
      return;
    }
    this.#lastLoadedSnapshot.release();
    this.#lastLoadedSnapshot = null;
  }

  #onShowImage = (imageURL?: string): void => {
    this.#imageURL = imageURL;
    this.requestUpdate();
  };

  #onWindowChanged = (selectionWindow: {left: number, right: number}|null): void => {
    this.#selectionWindow = selectionWindow;
    this.requestUpdate();
  };

  override performUpdate(): void {
    const input: ViewInput = {
      snapshot: this.#snapshot,
      log: this.#log,
      clipRect: this.#clipRect,
      selectionWindow: this.#selectionWindow,
      imageURL: this.#imageURL,
      onShowImage: this.#onShowImage,
      onWindowChanged: this.#onWindowChanged,
    };
    this.#view(input, undefined, this.contentElement);
  }
}

export interface TimelinePaintImageViewInput {
  maskElementHidden: boolean;
  imageContainerHidden: boolean;
  imageURL: string;
  imageContainerWebKitTransform: string;
  maskElementStyle: {
    width?: string,
    height?: string,
    borderLeftWidth?: string,
    borderTopWidth?: string,
    borderRightWidth?: string,
    borderBottomWidth?: string,
  };
  onImageLoaded: (naturalWidth: number, naturalHeight: number) => void;
}

export type TimelinePaintImageViewFunction =
    (input: TimelinePaintImageViewInput, output: undefined, target: HTMLElement) => void;

export const IMAGE_VIEW_DEFAULT_VIEW: TimelinePaintImageViewFunction =
    (input: TimelinePaintImageViewInput, _output: undefined, target: HTMLElement): void => {
      const onLoad = (event: Event): void => {
        if (event.target instanceof HTMLImageElement) {
          input.onImageLoaded(event.target.naturalWidth, event.target.naturalHeight);
        }
      };
      // clang-format off
      render(html`
        <style>${timelinePaintProfilerStyles}</style>
        <div class="paint-profiler-image-view fill">
          <div class="paint-profiler-image-container"
              ?hidden=${input.imageContainerHidden}
              style=${styleMap({'-webkit-transform': input.imageContainerWebKitTransform})}>
            <img src=${ifDefined(input.imageURL || undefined)} @load=${onLoad}>
            <div style=${styleMap({
              display: input.maskElementHidden ? 'none' : 'block',
              ...input.maskElementStyle})}>
            </div>
          </div>
        </div>`,
        target);
      // clang-format on
    };

export class TimelinePaintImageView extends UI.Widget.Widget {
  private transformController: LayerViewer.TransformController.TransformController;
  #maskRectangle: Protocol.DOM.Rect|null = null;

  #inputData: Omit<TimelinePaintImageViewInput, 'onImageLoaded'> = {
    maskElementHidden: true,
    imageContainerHidden: true,
    imageURL: '',
    imageContainerWebKitTransform: '',
    maskElementStyle: {},
  };

  readonly #view: TimelinePaintImageViewFunction;
  #imageElementDimensions?: {
    naturalHeight: number,
    naturalWidth: number,
  };

  constructor(element?: HTMLElement, view: TimelinePaintImageViewFunction = IMAGE_VIEW_DEFAULT_VIEW) {
    super(element);
    this.#view = view;
    this.transformController = new LayerViewer.TransformController.TransformController((this.contentElement), true);
    this.transformController.addEventListener(
        LayerViewer.TransformController.Events.TRANSFORM_CHANGED, this.updateImagePosition, this);
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override onResize(): void {
    this.requestUpdate();
    this.updateImagePosition();
  }

  private updateImagePosition(): void {
    if (!this.#imageElementDimensions) {
      return;
    }

    const width = this.#imageElementDimensions.naturalWidth;
    const height = this.#imageElementDimensions.naturalHeight;
    const clientWidth = this.contentElement.clientWidth;
    const clientHeight = this.contentElement.clientHeight;

    const paddingFraction = 0.1;
    const paddingX = clientWidth * paddingFraction;
    const scale = clientHeight / height;

    const oldMaskStyle = JSON.stringify(this.#inputData.maskElementStyle);
    let newMaskStyle = {};
    if (this.#maskRectangle) {
      newMaskStyle = {
        width: width + 'px',
        height: height + 'px',
        borderLeftWidth: this.#maskRectangle.x + 'px',
        borderTopWidth: this.#maskRectangle.y + 'px',
        borderRightWidth: (width - this.#maskRectangle.x - this.#maskRectangle.width) + 'px',
        borderBottomWidth: (height - this.#maskRectangle.y - this.#maskRectangle.height) + 'px',
      };
    }
    this.#inputData.maskElementStyle = newMaskStyle;

    if (!this.transformController) {
      return;
    }
    this.transformController.setScaleConstraints(0.5, 10 / scale);
    let matrix = new WebKitCSSMatrix()
                     .scale(this.transformController.scale(), this.transformController.scale())
                     .translate(clientWidth / 2, clientHeight / 2)
                     .scale(scale, scale)
                     .translate(-width / 2, -height / 2);
    const bounds = Geometry.boundsForTransformedPoints(matrix, [0, 0, 0, width, height, 0]);
    this.transformController.clampOffsets(paddingX - bounds.maxX, clientWidth - paddingX - bounds.minX, 0, 0);
    matrix = new WebKitCSSMatrix()
                 .translate(this.transformController.offsetX(), this.transformController.offsetY())
                 .multiply(matrix);

    const oldTransform = this.#inputData.imageContainerWebKitTransform;
    const newTransform = matrix.toString();
    this.#inputData.imageContainerWebKitTransform = newTransform;

    if (oldTransform !== newTransform || oldMaskStyle !== JSON.stringify(newMaskStyle)) {
      this.requestUpdate();
    }
  }

  set imageURL(imageURL: string|undefined) {
    if (this.imageURL === imageURL) {
      return;
    }
    this.#imageElementDimensions = undefined;
    // Drop the previous image's geometry until the new image reports its size.
    this.#inputData.maskElementStyle = {};
    this.#inputData.imageContainerWebKitTransform = '';
    this.#inputData.imageContainerHidden = !imageURL;
    this.#inputData.imageURL = imageURL ?? '';
    this.requestUpdate();
  }

  get imageURL(): string|undefined {
    return this.#inputData.imageContainerHidden ? undefined : this.#inputData.imageURL;
  }

  set maskRectangle(maskRectangle: Protocol.DOM.Rect|null) {
    if (this.#maskRectangle === maskRectangle) {
      return;
    }
    this.#maskRectangle = maskRectangle;
    this.#inputData.maskElementHidden = !maskRectangle;
    this.updateImagePosition();
    this.requestUpdate();
  }

  get maskRectangle(): Protocol.DOM.Rect|null {
    return this.#maskRectangle;
  }

  #onImageLoaded = (naturalWidth: number, naturalHeight: number): void => {
    this.#imageElementDimensions = {naturalHeight, naturalWidth};
    this.updateImagePosition();
  };

  showImage(imageURL?: string): void {
    this.imageURL = imageURL;
  }

  setMask(maskRectangle: Protocol.DOM.Rect|null): void {
    this.maskRectangle = maskRectangle;
  }

  override performUpdate(): void {
    this.#view({...this.#inputData, onImageLoaded: this.#onImageLoaded}, undefined, this.contentElement);
  }
}

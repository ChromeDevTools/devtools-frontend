// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as Trace from '../../models/trace/trace.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LayerViewer from '../layer_viewer/layer_viewer.js';

import timelinePaintProfilerStyles from './timelinePaintProfiler.css.js';

export class TimelinePaintProfilerView extends UI.SplitWidget.SplitWidget {
  private readonly logAndImageSplitWidget: UI.SplitWidget.SplitWidget;
  private readonly imageView: TimelinePaintImageView;
  private readonly paintProfilerView: LayerViewer.PaintProfilerView.PaintProfilerView;
  private readonly logTreeView: LayerViewer.PaintProfilerView.PaintProfilerCommandLogView;
  private needsUpdateWhenVisible: boolean;
  private pendingSnapshot: SDK.PaintProfiler.PaintProfilerSnapshot|null;
  private event: Trace.Types.Events.Event|null;
  private paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel|null;
  private lastLoadedSnapshot: SDK.PaintProfiler.PaintProfilerSnapshot|null;
  #parsedTrace: Trace.Handlers.Types.ParsedTrace;

  constructor(parsedTrace: Trace.Handlers.Types.ParsedTrace) {
    super(false, false);
    this.element.classList.add('timeline-paint-profiler-view');
    this.setSidebarSize(60);
    this.setResizable(false);

    this.#parsedTrace = parsedTrace;

    this.logAndImageSplitWidget = new UI.SplitWidget.SplitWidget(true, false);
    this.logAndImageSplitWidget.element.classList.add('timeline-paint-profiler-log-split');
    this.setMainWidget(this.logAndImageSplitWidget);
    this.imageView = new TimelinePaintImageView();
    this.logAndImageSplitWidget.setMainWidget(this.imageView);

    this.paintProfilerView =
        new LayerViewer.PaintProfilerView.PaintProfilerView(this.imageView.showImage.bind(this.imageView));
    this.paintProfilerView.addEventListener(
        LayerViewer.PaintProfilerView.Events.WINDOW_CHANGED, this.onWindowChanged, this);
    this.setSidebarWidget(this.paintProfilerView);

    this.logTreeView = new LayerViewer.PaintProfilerView.PaintProfilerCommandLogView();
    this.logAndImageSplitWidget.setSidebarWidget(this.logTreeView);

    this.needsUpdateWhenVisible = false;
    this.pendingSnapshot = null;
    this.event = null;
    this.paintProfilerModel = null;
    this.lastLoadedSnapshot = null;
  }

  override wasShown(): void {
    super.wasShown();
    if (this.needsUpdateWhenVisible) {
      this.needsUpdateWhenVisible = false;
      this.update();
    }
  }

  setSnapshot(snapshot: SDK.PaintProfiler.PaintProfilerSnapshot): void {
    this.releaseSnapshot();
    this.pendingSnapshot = snapshot;
    this.event = null;
    this.updateWhenVisible();
  }

  #rasterEventHasTile(event: Trace.Types.Events.RasterTask): boolean {
    const data = event.args.tileData;
    if (!data) {
      return false;
    }

    const frame = this.#parsedTrace.Frames.framesById[data.sourceFrameNumber];
    if (!frame || !frame.layerTree) {
      return false;
    }
    return true;
  }

  setEvent(paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel, event: Trace.Types.Events.Event): boolean {
    this.releaseSnapshot();
    this.paintProfilerModel = paintProfilerModel;
    this.pendingSnapshot = null;
    this.event = event;

    this.updateWhenVisible();
    if (Trace.Types.Events.isPaint(event)) {
      const snapshot = this.#parsedTrace.LayerTree.paintsToSnapshots.get(event);
      return Boolean(snapshot);
    }
    if (Trace.Types.Events.isRasterTask(event)) {
      return this.#rasterEventHasTile(event);
    }
    return false;
  }

  private updateWhenVisible(): void {
    if (this.isShowing()) {
      this.update();
    } else {
      this.needsUpdateWhenVisible = true;
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

    const frame = this.#parsedTrace.Frames.framesById[data.sourceFrameNumber];
    if (!frame || !frame.layerTree) {
      return null;
    }

    const layerTree = new TimelineModel.TracingLayerTree.TracingFrameLayerTree(
        target,
        frame.layerTree,
    );
    const tracingLayerTree = await layerTree.layerTreePromise();
    return tracingLayerTree ? tracingLayerTree.pictureForRasterTile(data.tileId.id_ref) : null;
  }

  private update(): void {
    this.logTreeView.setCommandLog([]);
    void this.paintProfilerView.setSnapshotAndLog(null, [], null);

    let snapshotPromise: Promise<{
      rect: Protocol.DOM.Rect | null,
      snapshot: SDK.PaintProfiler.PaintProfilerSnapshot,
    }|null>;
    if (this.pendingSnapshot) {
      snapshotPromise = Promise.resolve({rect: null, snapshot: this.pendingSnapshot});
    } else if (this.event && this.paintProfilerModel && Trace.Types.Events.isPaint(this.event)) {
      // When we process events (TimelineModel#processEvent) and find a
      // snapshot event, we look for the last paint that occurred and link the
      // snapshot to that paint event. That is why here if the event is a Paint
      // event, we look to see if it has had a matching picture event set for
      // it.
      const snapshotEvent = this.#parsedTrace.LayerTree.paintsToSnapshots.get(this.event);
      if (snapshotEvent) {
        const encodedData = snapshotEvent.args.snapshot.skp64;
        snapshotPromise = this.paintProfilerModel.loadSnapshot(encodedData).then(snapshot => {
          return snapshot && {rect: null, snapshot};
        });
      } else {
        snapshotPromise = Promise.resolve(null);
      }

    } else if (this.event && Trace.Types.Events.isRasterTask(this.event)) {
      snapshotPromise = this.#rasterTilePromise(this.event);
    } else {
      console.assert(false, 'Unexpected event type or no snapshot');
      return;
    }
    void snapshotPromise.then(snapshotWithRect => {
      this.releaseSnapshot();
      if (!snapshotWithRect) {
        this.imageView.showImage();
        return;
      }
      const snapshot = snapshotWithRect.snapshot;
      this.lastLoadedSnapshot = snapshot;
      this.imageView.setMask(snapshotWithRect.rect);
      void snapshot.commandLog().then(log => onCommandLogDone.call(this, snapshot, snapshotWithRect.rect, log || []));
    });

    function onCommandLogDone(
        this: TimelinePaintProfilerView, snapshot: SDK.PaintProfiler.PaintProfilerSnapshot,
        clipRect: Protocol.DOM.Rect|null, log?: SDK.PaintProfiler.PaintProfilerLogItem[]): void {
      this.logTreeView.setCommandLog(log || []);
      void this.paintProfilerView.setSnapshotAndLog(snapshot, log || [], clipRect);
    }
  }

  private releaseSnapshot(): void {
    if (!this.lastLoadedSnapshot) {
      return;
    }
    this.lastLoadedSnapshot.release();
    this.lastLoadedSnapshot = null;
  }

  private onWindowChanged(): void {
    this.logTreeView.updateWindow(this.paintProfilerView.selectionWindow());
  }
}

export class TimelinePaintImageView extends UI.Widget.Widget {
  private imageContainer: HTMLElement;
  private imageElement: HTMLImageElement;
  private readonly maskElement: HTMLElement;
  private transformController: LayerViewer.TransformController.TransformController;
  private maskRectangle?: Protocol.DOM.Rect|null;
  constructor() {
    super(true);

    this.contentElement.classList.add('fill', 'paint-profiler-image-view');
    this.imageContainer = this.contentElement.createChild('div', 'paint-profiler-image-container');
    this.imageElement = (this.imageContainer.createChild('img') as HTMLImageElement);
    this.maskElement = this.imageContainer.createChild('div');
    this.imageElement.addEventListener('load', this.updateImagePosition.bind(this), false);
    this.transformController =
        new LayerViewer.TransformController.TransformController((this.contentElement as HTMLElement), true);
    this.transformController.addEventListener(
        LayerViewer.TransformController.Events.TRANSFORM_CHANGED, this.updateImagePosition, this);
  }

  override onResize(): void {
    if (this.imageElement.src) {
      this.updateImagePosition();
    }
  }

  private updateImagePosition(): void {
    const width = this.imageElement.naturalWidth;
    const height = this.imageElement.naturalHeight;
    const clientWidth = this.contentElement.clientWidth;
    const clientHeight = this.contentElement.clientHeight;

    const paddingFraction = 0.1;
    const paddingX = clientWidth * paddingFraction;
    const paddingY = clientHeight * paddingFraction;
    const scaleX = (clientWidth - paddingX) / width;
    const scaleY = (clientHeight - paddingY) / height;
    const scale = Math.min(scaleX, scaleY);

    if (this.maskRectangle) {
      const style = this.maskElement.style;
      style.width = width + 'px';
      style.height = height + 'px';
      style.borderLeftWidth = this.maskRectangle.x + 'px';
      style.borderTopWidth = this.maskRectangle.y + 'px';
      style.borderRightWidth = (width - this.maskRectangle.x - this.maskRectangle.width) + 'px';
      style.borderBottomWidth = (height - this.maskRectangle.y - this.maskRectangle.height) + 'px';
    }
    this.transformController.setScaleConstraints(0.5, 10 / scale);
    let matrix = new WebKitCSSMatrix()
                     .scale(this.transformController.scale(), this.transformController.scale())
                     .translate(clientWidth / 2, clientHeight / 2)
                     .scale(scale, scale)
                     .translate(-width / 2, -height / 2);
    const bounds = UI.Geometry.boundsForTransformedPoints(matrix, [0, 0, 0, width, height, 0]);
    this.transformController.clampOffsets(
        paddingX - bounds.maxX, clientWidth - paddingX - bounds.minX, paddingY - bounds.maxY,
        clientHeight - paddingY - bounds.minY);
    matrix = new WebKitCSSMatrix()
                 .translate(this.transformController.offsetX(), this.transformController.offsetY())
                 .multiply(matrix);
    this.imageContainer.style.webkitTransform = matrix.toString();
  }

  showImage(imageURL?: string): void {
    this.imageContainer.classList.toggle('hidden', !imageURL);
    if (imageURL) {
      this.imageElement.src = imageURL;
    }
  }

  setMask(maskRectangle: Protocol.DOM.Rect|null): void {
    this.maskRectangle = maskRectangle;
    this.maskElement.classList.toggle('hidden', !maskRectangle);
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([timelinePaintProfilerStyles]);
  }
}

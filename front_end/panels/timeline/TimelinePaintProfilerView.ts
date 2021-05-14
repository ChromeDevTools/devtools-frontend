// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as SDK from '../../core/sdk/sdk.js'; // eslint-disable-line no-unused-vars
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LayerViewer from '../layer_viewer/layer_viewer.js';
import type * as Protocol from '../../generated/protocol.js';

export class TimelinePaintProfilerView extends UI.SplitWidget.SplitWidget {
  _frameModel: TimelineModel.TimelineFrameModel.TimelineFrameModel;
  _logAndImageSplitWidget: UI.SplitWidget.SplitWidget;
  _imageView: TimelinePaintImageView;
  _paintProfilerView: LayerViewer.PaintProfilerView.PaintProfilerView;
  _logTreeView: LayerViewer.PaintProfilerView.PaintProfilerCommandLogView;
  _needsUpdateWhenVisible: boolean;
  _pendingSnapshot: SDK.PaintProfiler.PaintProfilerSnapshot|null;
  _event: SDK.TracingModel.Event|null;
  _paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel|null;
  _lastLoadedSnapshot: SDK.PaintProfiler.PaintProfilerSnapshot|null;
  constructor(frameModel: TimelineModel.TimelineFrameModel.TimelineFrameModel) {
    super(false, false);
    this.element.classList.add('timeline-paint-profiler-view');
    this.setSidebarSize(60);
    this.setResizable(false);

    this._frameModel = frameModel;
    this._logAndImageSplitWidget = new UI.SplitWidget.SplitWidget(true, false);
    this._logAndImageSplitWidget.element.classList.add('timeline-paint-profiler-log-split');
    this.setMainWidget(this._logAndImageSplitWidget);
    this._imageView = new TimelinePaintImageView();
    this._logAndImageSplitWidget.setMainWidget(this._imageView);

    this._paintProfilerView =
        new LayerViewer.PaintProfilerView.PaintProfilerView(this._imageView.showImage.bind(this._imageView));
    this._paintProfilerView.addEventListener(
        LayerViewer.PaintProfilerView.Events.WindowChanged, this._onWindowChanged, this);
    this.setSidebarWidget(this._paintProfilerView);

    this._logTreeView = new LayerViewer.PaintProfilerView.PaintProfilerCommandLogView();
    this._logAndImageSplitWidget.setSidebarWidget(this._logTreeView);

    this._needsUpdateWhenVisible = false;
    this._pendingSnapshot = null;
    this._event = null;
    this._paintProfilerModel = null;
    this._lastLoadedSnapshot = null;
  }

  wasShown(): void {
    if (this._needsUpdateWhenVisible) {
      this._needsUpdateWhenVisible = false;
      this._update();
    }
  }

  setSnapshot(snapshot: SDK.PaintProfiler.PaintProfilerSnapshot): void {
    this._releaseSnapshot();
    this._pendingSnapshot = snapshot;
    this._event = null;
    this._updateWhenVisible();
  }

  setEvent(paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel, event: SDK.TracingModel.Event): boolean {
    this._releaseSnapshot();
    this._paintProfilerModel = paintProfilerModel;
    this._pendingSnapshot = null;
    this._event = event;

    this._updateWhenVisible();
    if (this._event.name === TimelineModel.TimelineModel.RecordType.Paint) {
      return Boolean(TimelineModel.TimelineModel.TimelineData.forEvent(event).picture);
    }
    if (this._event.name === TimelineModel.TimelineModel.RecordType.RasterTask) {
      return this._frameModel.hasRasterTile(this._event);
    }
    return false;
  }

  _updateWhenVisible(): void {
    if (this.isShowing()) {
      this._update();
    } else {
      this._needsUpdateWhenVisible = true;
    }
  }

  _update(): void {
    this._logTreeView.setCommandLog([]);
    this._paintProfilerView.setSnapshotAndLog(null, [], null);

    let snapshotPromise: Promise<{
      rect: Protocol.DOM.Rect | null,
      snapshot: SDK.PaintProfiler.PaintProfilerSnapshot,
    }|null>;
    if (this._pendingSnapshot) {
      snapshotPromise = Promise.resolve({rect: null, snapshot: this._pendingSnapshot});
    } else if (this._event && this._event.name === TimelineModel.TimelineModel.RecordType.Paint) {
      const picture =
          (TimelineModel.TimelineModel.TimelineData.forEvent(this._event).picture as SDK.TracingModel.ObjectSnapshot);
      snapshotPromise =
          picture.objectPromise()
              .then(
                  data =>
                      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
                  // @ts-expect-error
                  (this._paintProfilerModel as SDK.PaintProfiler.PaintProfilerModel).loadSnapshot(data['skp64']))
              .then(snapshot => snapshot && {rect: null, snapshot: snapshot});
    } else if (this._event && this._event.name === TimelineModel.TimelineModel.RecordType.RasterTask) {
      snapshotPromise = this._frameModel.rasterTilePromise(this._event);
    } else {
      console.assert(false, 'Unexpected event type or no snapshot');
      return;
    }
    snapshotPromise.then(snapshotWithRect => {
      this._releaseSnapshot();
      if (!snapshotWithRect) {
        this._imageView.showImage();
        return;
      }
      const snapshot = snapshotWithRect.snapshot;
      this._lastLoadedSnapshot = snapshot;
      this._imageView.setMask(snapshotWithRect.rect);
      snapshot.commandLog().then(log => onCommandLogDone.call(this, snapshot, snapshotWithRect.rect, log || []));
    });

    function onCommandLogDone(
        this: TimelinePaintProfilerView, snapshot: SDK.PaintProfiler.PaintProfilerSnapshot,
        clipRect: Protocol.DOM.Rect|null, log?: SDK.PaintProfiler.PaintProfilerLogItem[]): void {
      this._logTreeView.setCommandLog(log || []);
      this._paintProfilerView.setSnapshotAndLog(snapshot, log || [], clipRect);
    }
  }

  _releaseSnapshot(): void {
    if (!this._lastLoadedSnapshot) {
      return;
    }
    this._lastLoadedSnapshot.release();
    this._lastLoadedSnapshot = null;
  }

  _onWindowChanged(): void {
    this._logTreeView.updateWindow(this._paintProfilerView.selectionWindow());
  }
}

export class TimelinePaintImageView extends UI.Widget.Widget {
  _imageContainer: HTMLElement;
  _imageElement: HTMLImageElement;
  _maskElement: HTMLElement;
  _transformController: LayerViewer.TransformController.TransformController;
  _maskRectangle?: Protocol.DOM.Rect|null;
  constructor() {
    super(true);
    this.registerRequiredCSS('panels/timeline/timelinePaintProfiler.css', {enableLegacyPatching: true});
    this.contentElement.classList.add('fill', 'paint-profiler-image-view');
    this._imageContainer = this.contentElement.createChild('div', 'paint-profiler-image-container');
    this._imageElement = (this._imageContainer.createChild('img') as HTMLImageElement);
    this._maskElement = this._imageContainer.createChild('div');
    this._imageElement.addEventListener('load', this._updateImagePosition.bind(this), false);
    this._transformController =
        new LayerViewer.TransformController.TransformController((this.contentElement as HTMLElement), true);
    this._transformController.addEventListener(
        LayerViewer.TransformController.Events.TransformChanged, this._updateImagePosition, this);
  }

  onResize(): void {
    if (this._imageElement.src) {
      this._updateImagePosition();
    }
  }

  _updateImagePosition(): void {
    const width = this._imageElement.naturalWidth;
    const height = this._imageElement.naturalHeight;
    const clientWidth = this.contentElement.clientWidth;
    const clientHeight = this.contentElement.clientHeight;

    const paddingFraction = 0.1;
    const paddingX = clientWidth * paddingFraction;
    const paddingY = clientHeight * paddingFraction;
    const scaleX = (clientWidth - paddingX) / width;
    const scaleY = (clientHeight - paddingY) / height;
    const scale = Math.min(scaleX, scaleY);

    if (this._maskRectangle) {
      const style = this._maskElement.style;
      style.width = width + 'px';
      style.height = height + 'px';
      style.borderLeftWidth = this._maskRectangle.x + 'px';
      style.borderTopWidth = this._maskRectangle.y + 'px';
      style.borderRightWidth = (width - this._maskRectangle.x - this._maskRectangle.width) + 'px';
      style.borderBottomWidth = (height - this._maskRectangle.y - this._maskRectangle.height) + 'px';
    }
    this._transformController.setScaleConstraints(0.5, 10 / scale);
    let matrix = new WebKitCSSMatrix()
                     .scale(this._transformController.scale(), this._transformController.scale())
                     .translate(clientWidth / 2, clientHeight / 2)
                     .scale(scale, scale)
                     .translate(-width / 2, -height / 2);
    const bounds = UI.Geometry.boundsForTransformedPoints(matrix, [0, 0, 0, width, height, 0]);
    this._transformController.clampOffsets(
        paddingX - bounds.maxX, clientWidth - paddingX - bounds.minX, paddingY - bounds.maxY,
        clientHeight - paddingY - bounds.minY);
    matrix = new WebKitCSSMatrix()
                 .translate(this._transformController.offsetX(), this._transformController.offsetY())
                 .multiply(matrix);
    this._imageContainer.style.webkitTransform = matrix.toString();
  }

  showImage(imageURL?: string): void {
    this._imageContainer.classList.toggle('hidden', !imageURL);
    if (imageURL) {
      this._imageElement.src = imageURL;
    }
  }

  setMask(maskRectangle: Protocol.DOM.Rect|null): void {
    this._maskRectangle = maskRectangle;
    this._maskElement.classList.toggle('hidden', !maskRectangle);
  }
}

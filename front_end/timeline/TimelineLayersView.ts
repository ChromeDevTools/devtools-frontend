// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../core/common/common.js';                           // eslint-disable-line no-unused-vars
import * as SDK from '../core/sdk/sdk.js';                                    // eslint-disable-line no-unused-vars
import * as TimelineModel from '../models/timeline_model/timeline_model.js';  // eslint-disable-line no-unused-vars
import * as LayerViewer from '../panels/layer_viewer/layer_viewer.js';
import * as UI from '../ui/legacy/legacy.js';

export class TimelineLayersView extends UI.SplitWidget.SplitWidget {
  _model: TimelineModel.TimelineModel.TimelineModelImpl;
  _showPaintProfilerCallback: (arg0: SDK.PaintProfiler.PaintProfilerSnapshot) => void;
  _rightSplitWidget: UI.SplitWidget.SplitWidget;
  _layerViewHost: LayerViewer.LayerViewHost.LayerViewHost;
  _layers3DView: LayerViewer.Layers3DView.Layers3DView;
  _frameLayerTree?: TimelineModel.TimelineFrameModel.TracingFrameLayerTree;
  _updateWhenVisible?: boolean;
  constructor(
      model: TimelineModel.TimelineModel.TimelineModelImpl,
      showPaintProfilerCallback: (arg0: SDK.PaintProfiler.PaintProfilerSnapshot) => void) {
    super(true, false, 'timelineLayersView');
    this._model = model;
    this._showPaintProfilerCallback = showPaintProfilerCallback;

    this.element.classList.add('timeline-layers-view');
    this._rightSplitWidget = new UI.SplitWidget.SplitWidget(true, true, 'timelineLayersViewDetails');
    this._rightSplitWidget.element.classList.add('timeline-layers-view-properties');
    this.setMainWidget(this._rightSplitWidget);

    const vbox = new UI.Widget.VBox();
    this.setSidebarWidget(vbox);

    this._layerViewHost = new LayerViewer.LayerViewHost.LayerViewHost();

    const layerTreeOutline = new LayerViewer.LayerTreeOutline.LayerTreeOutline(this._layerViewHost);
    vbox.element.appendChild(layerTreeOutline.element);

    this._layers3DView = new LayerViewer.Layers3DView.Layers3DView(this._layerViewHost);
    this._layers3DView.addEventListener(
        LayerViewer.Layers3DView.Events.PaintProfilerRequested, this._onPaintProfilerRequested, this);
    this._rightSplitWidget.setMainWidget(this._layers3DView);

    const layerDetailsView = new LayerViewer.LayerDetailsView.LayerDetailsView(this._layerViewHost);
    this._rightSplitWidget.setSidebarWidget(layerDetailsView);
    layerDetailsView.addEventListener(
        LayerViewer.LayerDetailsView.Events.PaintProfilerRequested, this._onPaintProfilerRequested, this);
  }

  showLayerTree(frameLayerTree: TimelineModel.TimelineFrameModel.TracingFrameLayerTree): void {
    this._frameLayerTree = frameLayerTree;
    if (this.isShowing()) {
      this._update();
    } else {
      this._updateWhenVisible = true;
    }
  }

  wasShown(): void {
    if (this._updateWhenVisible) {
      this._updateWhenVisible = false;
      this._update();
    }
  }

  _onPaintProfilerRequested(event: Common.EventTarget.EventTargetEvent): void {
    const selection = (event.data as LayerViewer.LayerViewHost.Selection);
    this._layers3DView.snapshotForSelection(selection).then(snapshotWithRect => {
      if (snapshotWithRect) {
        this._showPaintProfilerCallback(snapshotWithRect.snapshot);
      }
    });
  }

  _update(): void {
    if (this._frameLayerTree) {
      this._frameLayerTree.layerTreePromise().then(layerTree => this._layerViewHost.setLayerTree(layerTree));
    }
  }
}

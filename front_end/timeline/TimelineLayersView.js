// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as LayerViewer from '../layer_viewer/layer_viewer.js';
import * as SDK from '../sdk/sdk.js';                                  // eslint-disable-line no-unused-vars
import * as TimelineModel from '../timeline_model/timeline_model.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

/**
 * @unrestricted
 */
export class TimelineLayersView extends UI.SplitWidget.SplitWidget {
  /**
   * @param {!TimelineModel.TimelineModel.TimelineModelImpl} model
   * @param {function(!SDK.PaintProfiler.PaintProfilerSnapshot)} showPaintProfilerCallback
   */
  constructor(model, showPaintProfilerCallback) {
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

  /**
   * @param {!TimelineModel.TimelineFrameModel.TracingFrameLayerTree} frameLayerTree
   */
  showLayerTree(frameLayerTree) {
    this._frameLayerTree = frameLayerTree;
    if (this.isShowing()) {
      this._update();
    } else {
      this._updateWhenVisible = true;
    }
  }

  /**
   * @override
   */
  wasShown() {
    if (this._updateWhenVisible) {
      this._updateWhenVisible = false;
      this._update();
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _onPaintProfilerRequested(event) {
    const selection = /** @type {!LayerViewer.LayerViewHost.Selection} */ (event.data);
    this._layers3DView.snapshotForSelection(selection).then(snapshotWithRect => {
      if (snapshotWithRect) {
        this._showPaintProfilerCallback(snapshotWithRect.snapshot);
      }
    });
  }

  _update() {
    this._frameLayerTree.layerTreePromise().then(layerTree => this._layerViewHost.setLayerTree(layerTree));
  }
}

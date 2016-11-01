/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
/**
 * @unrestricted
 */
WebInspector.TimelineLayersView = class extends WebInspector.SplitWidget {
  /**
   * @param {!WebInspector.TimelineModel} model
   * @param {function(!WebInspector.PaintProfilerSnapshot)} showPaintProfilerCallback
   */
  constructor(model, showPaintProfilerCallback) {
    super(true, false, 'timelineLayersView');
    this._model = model;
    this._showPaintProfilerCallback = showPaintProfilerCallback;

    this.element.classList.add('timeline-layers-view');
    this._rightSplitWidget = new WebInspector.SplitWidget(true, true, 'timelineLayersViewDetails');
    this._rightSplitWidget.element.classList.add('timeline-layers-view-properties');
    this.setMainWidget(this._rightSplitWidget);

    var vbox = new WebInspector.VBox();
    this.setSidebarWidget(vbox);

    this._layerViewHost = new WebInspector.LayerViewHost();

    var layerTreeOutline = new WebInspector.LayerTreeOutline(this._layerViewHost);
    vbox.element.appendChild(layerTreeOutline.element);

    this._layers3DView = new WebInspector.Layers3DView(this._layerViewHost);
    this._layers3DView.addEventListener(
        WebInspector.Layers3DView.Events.PaintProfilerRequested, this._onPaintProfilerRequested, this);
    this._rightSplitWidget.setMainWidget(this._layers3DView);

    var layerDetailsView = new WebInspector.LayerDetailsView(this._layerViewHost);
    this._rightSplitWidget.setSidebarWidget(layerDetailsView);
    layerDetailsView.addEventListener(
        WebInspector.LayerDetailsView.Events.PaintProfilerRequested, this._onPaintProfilerRequested, this);
  }

  /**
   * @param {!WebInspector.TracingFrameLayerTree} frameLayerTree
   */
  showLayerTree(frameLayerTree) {
    this._frameLayerTree = frameLayerTree;
    if (this.isShowing())
      this._update();
    else
      this._updateWhenVisible = true;
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
   * @param {!WebInspector.Event} event
   */
  _onPaintProfilerRequested(event) {
    var selection = /** @type {!WebInspector.LayerView.Selection} */ (event.data);
    this._layers3DView.snapshotForSelection(selection).then(snapshotWithRect => {
      if (snapshotWithRect)
        this._showPaintProfilerCallback(snapshotWithRect.snapshot);
    });
  }

  _update() {
    this._frameLayerTree.layerTreePromise().then(layerTree => this._layerViewHost.setLayerTree(layerTree));
  }
};

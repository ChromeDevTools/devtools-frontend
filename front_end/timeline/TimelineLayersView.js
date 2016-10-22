/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @extends {WebInspector.SplitWidget}
 * @param {!WebInspector.TimelineModel} model
 * @param {function(!WebInspector.TracingModel.Event)} showEventDetailsCallback
 */
WebInspector.TimelineLayersView = function(model, showEventDetailsCallback)
{
    WebInspector.SplitWidget.call(this, true, false, "timelineLayersView");
    this._model = model;
    this._showEventDetailsCallback = showEventDetailsCallback;

    this.element.classList.add("timeline-layers-view");
    this._rightSplitWidget = new WebInspector.SplitWidget(true, true, "timelineLayersViewDetails");
    this._rightSplitWidget.element.classList.add("timeline-layers-view-properties");
    this.setMainWidget(this._rightSplitWidget);

    this._paintTiles = [];

    var vbox = new WebInspector.VBox();
    this.setSidebarWidget(vbox);

    this._layerViewHost = new WebInspector.LayerViewHost();

    var layerTreeOutline = new WebInspector.LayerTreeOutline(this._layerViewHost);
    vbox.element.appendChild(layerTreeOutline.element);

    this._layers3DView = new WebInspector.Layers3DView(this._layerViewHost);
    this._layers3DView.addEventListener(WebInspector.Layers3DView.Events.PaintProfilerRequested, this._jumpToPaintEvent, this);
    this._rightSplitWidget.setMainWidget(this._layers3DView);

    var layerDetailsView = new WebInspector.LayerDetailsView(this._layerViewHost);
    this._rightSplitWidget.setSidebarWidget(layerDetailsView);
    layerDetailsView.addEventListener(WebInspector.LayerDetailsView.Events.PaintProfilerRequested, this._jumpToPaintEvent, this);
}

WebInspector.TimelineLayersView.prototype = {
    /**
     * @param {!WebInspector.TracingFrameLayerTree} frameLayerTree
     */
    showLayerTree: function(frameLayerTree)
    {
        this._disposeTiles();
        this._frameLayerTree = frameLayerTree;
        if (this.isShowing())
            this._update();
        else
            this._updateWhenVisible = true;
    },

    wasShown: function()
    {
        if (this._updateWhenVisible) {
            this._updateWhenVisible = false;
            this._update();
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _jumpToPaintEvent: function(event)
    {
        var traceEvent = /** @type {!WebInspector.TracingModel.Event} */ (event.data);
        this._showEventDetailsCallback(traceEvent);
    },

    _update: function()
    {
        var layerTree;
        var originalTiles = this._paintTiles;
        var snapshotPromises = this._frameLayerTree.paints().map(paint => paint.snapshotPromise().then(snapshotWithRect => {
            if (!snapshotWithRect)
                return;
            // We're too late and there's a new generation of tiles being loaded.
            if (originalTiles !== this._paintTiles) {
                snapshotWithRect.snapshot.dispose();
                return;
            }
            this._paintTiles.push({layerId: paint.layerId(), rect: snapshotWithRect.rect, snapshot: snapshotWithRect.snapshot, traceEvent: paint.event()});
        }));
        snapshotPromises.push(this._frameLayerTree.layerTreePromise().then(resolvedTree => layerTree = resolvedTree));
        Promise.all(snapshotPromises).then(() => {
            if (!layerTree)
                return;
            this._layerViewHost.setLayerTree(layerTree);
            this._layers3DView.setTiles(this._paintTiles);
        });
    },

    _disposeTiles: function()
    {
        for (var i = 0; i < this._paintTiles.length; ++i)
            this._paintTiles[i].snapshot.dispose();
        this._paintTiles = [];
    },

    __proto__: WebInspector.SplitWidget.prototype
}

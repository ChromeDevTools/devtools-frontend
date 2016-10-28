// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {function(!WebInspector.Layer, string=)} showImageForLayerCallback
 * @extends {WebInspector.SplitWidget}
 */
WebInspector.LayerPaintProfilerView = function(showImageForLayerCallback)
{
    WebInspector.SplitWidget.call(this, true, false);

    this._showImageForLayerCallback = showImageForLayerCallback;
    this._logTreeView = new WebInspector.PaintProfilerCommandLogView();
    this.setSidebarWidget(this._logTreeView);
    this._paintProfilerView = new WebInspector.PaintProfilerView(this._showImage.bind(this));
    this.setMainWidget(this._paintProfilerView);

    this._paintProfilerView.addEventListener(WebInspector.PaintProfilerView.Events.WindowChanged, this._onWindowChanged, this);
};

WebInspector.LayerPaintProfilerView.prototype = {
    /**
     * @param {!WebInspector.AgentLayer} layer
     */
    profileLayer: function(layer)
    {
        var snapshotPromise = layer.snapshots()[0];
        if (!snapshotPromise) {
            setSnapshotAndLog.call(this, null, null);
            return;
        }
        snapshotPromise.then(snapshotWithRect => {
            if (!snapshotWithRect) {
                setSnapshotAndLog.call(this, null, null);
                return;
            }
            this._layer = layer;
            snapshotWithRect.snapshot.commandLog().then(log => setSnapshotAndLog.call(this, snapshotWithRect.snapshot, log));
        });

        /**
         * @param {?WebInspector.PaintProfilerSnapshot} snapshot
         * @param {?Array<!WebInspector.PaintProfilerLogItem>} log
         * @this {WebInspector.LayerPaintProfilerView}
         */
        function setSnapshotAndLog(snapshot, log)
        {
            this._logTreeView.setCommandLog(snapshot && snapshot.target(), log || []);
            this._paintProfilerView.setSnapshotAndLog(snapshot, log || [], null);
        }
    },

    /**
     * @param {number} scale
     */
    setScale: function(scale)
    {
        this._paintProfilerView.setScale(scale);
    },

    _onWindowChanged: function()
    {
        this._logTreeView.updateWindow(this._paintProfilerView.selectionWindow());
    },

    /**
     * @param {string=} imageURL
     */
    _showImage: function(imageURL)
    {
        this._showImageForLayerCallback(this._layer, imageURL);
    },

    __proto__: WebInspector.SplitWidget.prototype
};


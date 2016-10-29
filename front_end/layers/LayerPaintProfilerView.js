// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.SplitWidget}
 * @param {function(string=)} showImageCallback
 */
WebInspector.LayerPaintProfilerView = function(showImageCallback)
{
    WebInspector.SplitWidget.call(this, true, false);

    this._logTreeView = new WebInspector.PaintProfilerCommandLogView();
    this.setSidebarWidget(this._logTreeView);
    this._paintProfilerView = new WebInspector.PaintProfilerView(showImageCallback);
    this.setMainWidget(this._paintProfilerView);

    this._paintProfilerView.addEventListener(WebInspector.PaintProfilerView.Events.WindowChanged, this._onWindowChanged, this);
};

WebInspector.LayerPaintProfilerView.prototype = {
    reset: function()
    {
        this._paintProfilerView.setSnapshotAndLog(null, [], null);
    },

    /**
     * @param {!WebInspector.PaintProfilerSnapshot} snapshot
     */
    profile: function(snapshot)
    {
        this._showImageCallback = null;
        snapshot.commandLog().then(log => setSnapshotAndLog.call(this, snapshot, log));

        /**
         * @param {?WebInspector.PaintProfilerSnapshot} snapshot
         * @param {?Array<!WebInspector.PaintProfilerLogItem>} log
         * @this {WebInspector.LayerPaintProfilerView}
         */
        function setSnapshotAndLog(snapshot, log)
        {
            this._logTreeView.setCommandLog(snapshot && snapshot.target(), log || []);
            this._paintProfilerView.setSnapshotAndLog(snapshot, log || [], null);
            if (snapshot)
                snapshot.release();
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

    __proto__: WebInspector.SplitWidget.prototype
};


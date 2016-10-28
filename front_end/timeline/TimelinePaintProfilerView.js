// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.TimelineFrameModel} frameModel
 * @extends {WebInspector.SplitWidget}
 */
WebInspector.TimelinePaintProfilerView = function(frameModel)
{
    WebInspector.SplitWidget.call(this, false, false);
    this.element.classList.add("timeline-paint-profiler-view");
    this.setSidebarSize(60);
    this.setResizable(false);

    this._frameModel = frameModel;
    this._logAndImageSplitWidget = new WebInspector.SplitWidget(true, false);
    this._logAndImageSplitWidget.element.classList.add("timeline-paint-profiler-log-split");
    this.setMainWidget(this._logAndImageSplitWidget);
    this._imageView = new WebInspector.TimelinePaintImageView();
    this._logAndImageSplitWidget.setMainWidget(this._imageView);

    this._paintProfilerView = new WebInspector.PaintProfilerView(this._imageView.showImage.bind(this._imageView));
    this._paintProfilerView.addEventListener(WebInspector.PaintProfilerView.Events.WindowChanged, this._onWindowChanged, this);
    this.setSidebarWidget(this._paintProfilerView);

    this._logTreeView = new WebInspector.PaintProfilerCommandLogView();
    this._logAndImageSplitWidget.setSidebarWidget(this._logTreeView);
};

WebInspector.TimelinePaintProfilerView.prototype = {
    wasShown: function()
    {
        if (this._updateWhenVisible) {
            this._updateWhenVisible = false;
            this._update();
        }
    },

    /**
     * @param {!WebInspector.Target} target
     * @param {!WebInspector.TracingModel.Event} event
     * @return {boolean}
     */
    setEvent: function(target, event)
    {
        this._disposeSnapshot();
        this._target = target;
        this._event = event;

        if (this.isShowing())
            this._update();
        else
            this._updateWhenVisible = true;

        if (this._event.name === WebInspector.TimelineModel.RecordType.Paint)
            return !!event.picture;
        if (this._event.name === WebInspector.TimelineModel.RecordType.RasterTask)
            return this._frameModel.hasRasterTile(this._event);
        return false;
    },

    _update: function()
    {
        this._logTreeView.setCommandLog(null, []);
        this._paintProfilerView.setSnapshotAndLog(null, [], null);

        var snapshotPromise;
        if (this._event.name === WebInspector.TimelineModel.RecordType.Paint) {
            snapshotPromise = this._event.picture.objectPromise()
                .then(data => WebInspector.PaintProfilerSnapshot.load(this._target, data["skp64"]))
                .then(snapshot => snapshot && {rect: null, snapshot: snapshot});
        } else if (this._event.name === WebInspector.TimelineModel.RecordType.RasterTask) {
            snapshotPromise = this._frameModel.rasterTilePromise(this._event);
        } else {
            console.assert(false, "Unexpected event type: " + this._event.name);
            return;
        }
        snapshotPromise.then(snapshotWithRect => {
            this._disposeSnapshot();
            if (!snapshotWithRect) {
                this._imageView.showImage();
                return;
            }
            var snapshot = snapshotWithRect.snapshot;
            this._lastLoadedSnapshot = snapshot;
            this._imageView.setMask(snapshotWithRect.rect);
            snapshot.commandLog().then(log => onCommandLogDone.call(this, snapshot, snapshotWithRect.rect, log));
        });

        /**
         * @param {!WebInspector.PaintProfilerSnapshot} snapshot
         * @param {?DOMAgent.Rect} clipRect
         * @param {!Array.<!WebInspector.PaintProfilerLogItem>=} log
         * @this {WebInspector.TimelinePaintProfilerView}
         */
        function onCommandLogDone(snapshot, clipRect, log)
        {
            this._logTreeView.setCommandLog(snapshot.target(), log || []);
            this._paintProfilerView.setSnapshotAndLog(snapshot, log || [], clipRect);
        }
    },

    _disposeSnapshot: function()
    {
        if (!this._lastLoadedSnapshot)
            return;
        this._lastLoadedSnapshot.dispose();
        this._lastLoadedSnapshot = null;
    },

    _onWindowChanged: function()
    {
        this._logTreeView.updateWindow(this._paintProfilerView.selectionWindow());
    },

    __proto__: WebInspector.SplitWidget.prototype
};

/**
 * @constructor
 * @extends {WebInspector.Widget}
 */
WebInspector.TimelinePaintImageView = function()
{
    WebInspector.Widget.call(this, true);
    this.registerRequiredCSS("timeline/timelinePaintProfiler.css");
    this.contentElement.classList.add("fill", "paint-profiler-image-view");
    this._imageContainer = this.contentElement.createChild("div", "paint-profiler-image-container");
    this._imageElement = this._imageContainer.createChild("img");
    this._maskElement = this._imageContainer.createChild("div");
    this._imageElement.addEventListener("load", this._updateImagePosition.bind(this), false);

    this._transformController = new WebInspector.TransformController(this.contentElement, true);
    this._transformController.addEventListener(WebInspector.TransformController.Events.TransformChanged, this._updateImagePosition, this);
};

WebInspector.TimelinePaintImageView.prototype = {
    onResize: function()
    {
        if (this._imageElement.src)
            this._updateImagePosition();
    },

    _updateImagePosition: function()
    {
        var width = this._imageElement.naturalWidth;
        var height = this._imageElement.naturalHeight;
        var clientWidth = this.contentElement.clientWidth;
        var clientHeight = this.contentElement.clientHeight;

        var paddingFraction = 0.1;
        var paddingX = clientWidth * paddingFraction;
        var paddingY = clientHeight * paddingFraction;
        var scaleX = (clientWidth - paddingX) / width;
        var scaleY = (clientHeight - paddingY) / height;
        var scale = Math.min(scaleX, scaleY);

        if (this._maskRectangle) {
            var style = this._maskElement.style;
            style.width = width + "px";
            style.height = height + "px";
            style.borderLeftWidth = this._maskRectangle.x + "px";
            style.borderTopWidth = this._maskRectangle.y + "px";
            style.borderRightWidth = (width - this._maskRectangle.x - this._maskRectangle.width) + "px";
            style.borderBottomWidth = (height - this._maskRectangle.y - this._maskRectangle.height) + "px";
        }
        this._transformController.setScaleConstraints(0.5, 10 / scale);
        var matrix = new WebKitCSSMatrix()
            .scale(this._transformController.scale(), this._transformController.scale())
            .translate(clientWidth / 2, clientHeight / 2)
            .scale(scale, scale)
            .translate(-width / 2, -height / 2);
        var bounds = WebInspector.Geometry.boundsForTransformedPoints(matrix, [0, 0, 0, width, height, 0]);
        this._transformController.clampOffsets(paddingX - bounds.maxX, clientWidth - paddingX - bounds.minX,
            paddingY - bounds.maxY, clientHeight - paddingY - bounds.minY);
        matrix = new WebKitCSSMatrix().translate(this._transformController.offsetX(), this._transformController.offsetY()).multiply(matrix);
        this._imageContainer.style.webkitTransform = matrix.toString();
    },

    /**
     * @param {string=} imageURL
     */
    showImage: function(imageURL)
    {
        this._imageContainer.classList.toggle("hidden", !imageURL);
        if (imageURL)
            this._imageElement.src = imageURL;
    },

    /**
     * @param {?DOMAgent.Rect} maskRectangle
     */
    setMask: function(maskRectangle)
    {
        this._maskRectangle = maskRectangle;
        this._maskElement.classList.toggle("hidden", !maskRectangle);
    },

    __proto__: WebInspector.Widget.prototype
};

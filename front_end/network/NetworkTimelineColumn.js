// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.NetworkLogView} networkLogView
 * @param {!WebInspector.SortableDataGrid} dataGrid
 */
WebInspector.NetworkTimelineColumn = function(networkLogView, dataGrid)
{
    WebInspector.VBox.call(this, true);
    this._canvas = this.contentElement.createChild("canvas");
    this._canvas.tabIndex = 1;
    this.setDefaultFocusedElement(this._canvas);

    /** @const */
    this._leftPadding = 5;
    /** @const */
    this._rightPadding = 5;

    this._dataGrid = dataGrid;
    this._networkLogView = networkLogView;
    /** @type {!Array<!WebInspector.NetworkRequest>} */
    this._requestData = [];
}

WebInspector.NetworkTimelineColumn.prototype = {
    scheduleUpdate: function()
    {
        if (this._updateRequestID)
            return;
        this._updateRequestID = this.element.window().requestAnimationFrame(this._update.bind(this));
    },

    _update: function()
    {
        this.element.window().cancelAnimationFrame(this._updateRequestID);
        this._updateRequestID = null;

        this._startTime = this._networkLogView.calculator().minimumBoundary();
        this._endTime = this._networkLogView.calculator().maximumBoundary();
        this._resetCanvas();
        this._draw();
    },

    _resetCanvas: function()
    {
        var ratio = window.devicePixelRatio;
        this._canvas.width = this._offsetWidth * ratio;
        this._canvas.height = this._offsetHeight * ratio;
        this._canvas.style.width = this._offsetWidth + "px";
        this._canvas.style.height = this._offsetHeight + "px";
    },

    /**
     * @override
     */
    onResize: function()
    {
        WebInspector.VBox.prototype.onResize.call(this);
        this._offsetWidth = this.contentElement.offsetWidth;
        this._offsetHeight = this.contentElement.offsetHeight;
        this.scheduleUpdate();
    },

    /**
     * @param {!WebInspector.RequestTimeRangeNames} type
     * @return {string}
     */
    _colorForType: function(type)
    {
        var types = WebInspector.RequestTimeRangeNames;
        switch (type) {
        case types.Receiving:
        case types.ReceivingPush:
            return "#03A9F4";
        case types.Waiting:
            return "#00C853";
        case types.Connecting:
            return "#FF9800";
        case types.SSL:
            return "#9C27B0";
        case types.DNS:
            return "#009688";
        case types.Proxy:
            return "#A1887F";
        case types.Blocking:
            return "#AAAAAA";
        case types.Push:
            return "#8CDBff";
        case types.Queueing:
            return "white";
        case types.ServiceWorker:
        case types.ServiceWorkerPreparation:
        default:
            return "orange";
        }
    },

    /**
     * @return {number}
     */
    _scrollTop: function()
    {
        return this._dataGrid.scrollContainer.scrollTop;
    },

    /**
     * @param {number} time
     * @return {number}
     */
    _timeToPosition: function(time)
    {
        var availableWidth = this._offsetWidth - this._leftPadding - this._rightPadding;
        var timeToPixel = availableWidth / (this._endTime - this._startTime);
        return Math.floor(this._leftPadding + (time - this._startTime) * timeToPixel);
    },

    _draw: function()
    {
        var requests = this._requestData;
        var context = this._canvas.getContext("2d");
        context.save();
        context.scale(window.devicePixelRatio, window.devicePixelRatio);
        context.translate(0, this._networkLogView.headerHeight());
        context.rect(0, 0, this._offsetWidth, this._offsetHeight);
        context.clip();
        var rowHeight = this._networkLogView.rowHeight();
        var scrollTop = this._scrollTop();
        var firstRequestIndex = Math.floor(scrollTop / rowHeight);
        var lastRequestIndex = Math.min(requests.length, firstRequestIndex + Math.ceil(this._offsetHeight / rowHeight));
        for (var i = firstRequestIndex; i < lastRequestIndex; i++) {
            var rowOffset = rowHeight * i;
            var request = requests[i];
            var ranges = WebInspector.RequestTimingView.calculateRequestTimeRanges(request, 0);
            for (var range of ranges) {
                if (range.name === WebInspector.RequestTimeRangeNames.Total ||
                    range.name === WebInspector.RequestTimeRangeNames.Sending ||
                    range.end - range.start === 0)
                    continue;
                this._drawBar(context, range, rowOffset - scrollTop);
            }
        }
        context.restore();
    },

    /**
     * @return {number}
     */
    _timelineDuration: function()
    {
        return this._networkLogView.calculator().maximumBoundary() - this._networkLogView.calculator().minimumBoundary();
    },

    /**
     * @param {!WebInspector.RequestTimeRangeNames} type
     * @return {number}
     */
    _getBarHeight: function(type)
    {
        var types = WebInspector.RequestTimeRangeNames;
        switch (type) {
        case types.Connecting:
        case types.SSL:
        case types.DNS:
        case types.Proxy:
        case types.Blocking:
        case types.Push:
        case types.Queueing:
            return 7;
        default:
            return 13;
        }
    },

    /**
     * @param {!CanvasRenderingContext2D} context
     * @param {!WebInspector.RequestTimeRange} range
     * @param {number} y
     */
    _drawBar: function(context, range, y)
    {
        context.save();
        context.beginPath();
        var lineWidth = 0;
        var color = this._colorForType(range.name);
        var borderColor = color;
        if (range.name === WebInspector.RequestTimeRangeNames.Queueing) {
            borderColor = "lightgrey";
            lineWidth = 2;
        }
        if (range.name === WebInspector.RequestTimeRangeNames.Receiving)
            lineWidth = 2;
        context.fillStyle = color;
        var height = this._getBarHeight(range.name);
        y += Math.floor(this._networkLogView.rowHeight() / 2 - height / 2) + lineWidth / 2;
        var start = this._timeToPosition(range.start);
        var end = this._timeToPosition(range.end);
        context.rect(start, y, end - start, height - lineWidth);
        if (lineWidth) {
            context.lineWidth = lineWidth;
            context.strokeStyle = borderColor;
            context.stroke();
        }
        context.fill();
        context.restore();
    },

    __proto__: WebInspector.VBox.prototype
}

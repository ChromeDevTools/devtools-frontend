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
    this.registerRequiredCSS("network/networkTimelineColumn.css");

    this._canvas = this.contentElement.createChild("canvas");
    this._canvas.tabIndex = 1;
    this.setDefaultFocusedElement(this._canvas);

    /** @const */
    this._leftPadding = 5;
    /** @const */
    this._rightPadding = 5;

    this._dataGrid = dataGrid;
    this._networkLogView = networkLogView;

    this._vScrollElement = this.contentElement.createChild("div", "network-timeline-v-scroll");
    this._vScrollContent = this._vScrollElement.createChild("div");
    this._vScrollElement.addEventListener("scroll", this._onScroll.bind(this), { passive: true });
    this._vScrollElement.addEventListener("mousewheel", this._onMouseWheel.bind(this), { passive: true });
    this._canvas.addEventListener("mousewheel", this._onMouseWheel.bind(this), { passive: true });

    this._dataGridScrollContainer = this._dataGrid.scrollContainer;
    this._dataGridScrollContainer.addEventListener("mousewheel", event => {
        event.consume(true);
        this._onMouseWheel(event);
    }, true);

    // TODO(allada) When timeline canvas moves out of experiment move this to stylesheet.
    this._dataGridScrollContainer.style.overflow = "hidden";
    this._dataGrid.setScrollContainer(this._vScrollElement);

    this._dataGrid.addEventListener(WebInspector.ViewportDataGrid.Events.ViewportCalculated, this._update.bind(this));
    this._dataGrid.addEventListener(WebInspector.DataGrid.Events.PaddingChanged, this._updateHeight.bind(this));

    /** @type {!Array<!WebInspector.NetworkRequest>} */
    this._requestData = [];
}

WebInspector.NetworkTimelineColumn.prototype = {
    wasShown: function()
    {
        this.scheduleUpdate();
    },

    scheduleRefreshData: function()
    {
        this._needsRefreshData = true;
    },

    _refreshDataIfNeeded: function()
    {
        if (!this._needsRefreshData)
            return;
        this._needsRefreshData = false;
        var currentNode = this._dataGrid.rootNode();
        this._requestData = [];
        while (currentNode = currentNode.traverseNextNode(true))
            this._requestData.push(currentNode.request());
    },

    /**
     * @param {!Event} event
     */
    _onMouseWheel: function(event)
    {
        this._vScrollElement.scrollTop -= event.wheelDeltaY;
        this._dataGridScrollContainer.scrollTop = this._vScrollElement.scrollTop;
    },

    /**
     * @param {!Event} event
     */
    _onScroll: function(event)
    {
        this._dataGridScrollContainer.scrollTop = this._vScrollElement.scrollTop;
    },

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

        this._refreshDataIfNeeded();

        this._startTime = this._networkLogView.calculator().minimumBoundary();
        this._endTime = this._networkLogView.calculator().maximumBoundary();
        this._resetCanvas();
        this._draw();
    },

    _updateHeight: function()
    {
        var totalHeight = this._dataGridScrollContainer.scrollHeight;
        this._vScrollContent.style.height = totalHeight + "px";
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
        var scrollTop = this._vScrollElement.scrollTop;
        var firstRequestIndex = Math.floor(scrollTop / rowHeight);
        var lastRequestIndex = Math.min(requests.length, firstRequestIndex + Math.ceil(this._offsetHeight / rowHeight));
        for (var i = firstRequestIndex; i < lastRequestIndex; i++) {
            var rowOffset = rowHeight * i;
            this._decorateRow(context, i, rowOffset - scrollTop, rowHeight);
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

    /**
     * @param {!CanvasRenderingContext2D} context
     * @param {number} rowNumber
     * @param {number} y
     * @param {number} rowHeight
     */
    _decorateRow: function(context, rowNumber, y, rowHeight)
    {
        context.save();
        if (rowNumber % 2 === 1)
            return;

        context.beginPath();
        context.fillStyle = WebInspector.themeSupport.patchColor("#f5f5f5", WebInspector.ThemeSupport.ColorUsage.Background);
        context.rect(0, y, this._offsetWidth, rowHeight);
        context.fill();
        context.restore();
    },

    __proto__: WebInspector.VBox.prototype
}

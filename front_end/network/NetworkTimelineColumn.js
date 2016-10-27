// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {number} rowHeight
 * @param {!WebInspector.NetworkTimeCalculator} calculator
 * @param {!Element} scrollContainer
 */
WebInspector.NetworkTimelineColumn = function(rowHeight, calculator, scrollContainer)
{
    // TODO(allada) Make this a shadowDOM when the NetworkTimelineColumn gets moved into NetworkLogViewColumns.
    WebInspector.VBox.call(this, false);
    this.registerRequiredCSS("network/networkTimelineColumn.css");

    this._canvas = this.contentElement.createChild("canvas");
    this._canvas.tabIndex = 1;
    this.setDefaultFocusedElement(this._canvas);

    /** @const */
    this._leftPadding = 5;
    /** @const */
    this._rightPadding = 5;
    /** @const */
    this._fontSize = 10;

    this._rowHeight = rowHeight;
    this._headerHeight = 0;
    this._calculator = calculator;

    this._popoverHelper = new WebInspector.PopoverHelper(this.element);
    this._popoverHelper.initializeCallbacks(this._getPopoverAnchor.bind(this), this._showPopover.bind(this));
    this._popoverHelper.setTimeout(300, 300);

    this._vScrollElement = this.contentElement.createChild("div", "network-timeline-v-scroll");
    this._vScrollElement.addEventListener("scroll", this._onScroll.bind(this), { passive: true });
    this._vScrollElement.addEventListener("mousewheel", this._onMouseWheel.bind(this), { passive: true });
    this._vScrollContent = this._vScrollElement.createChild("div", "network-timeline-v-scroll-content");

    this.element.addEventListener("mousewheel", this._onMouseWheel.bind(this), { passive: true });
    this.element.addEventListener("mousemove", this._onMouseMove.bind(this), true);
    this.element.addEventListener("mouseleave", this.dispatchEventToListeners.bind(this, WebInspector.NetworkTimelineColumn.Events.RequestHovered, null), true);

    this._boundScrollContainer = scrollContainer;
    this._boundScrollContainer.addEventListener("mousewheel", event => {
        event.consume(true);
        this._onMouseWheel(event);
    }, true);

    // TODO(allada) When timeline canvas moves out of experiment move this to stylesheet.
    this._boundScrollContainer.style.overflow = "hidden";

    /** @type {!Array<!WebInspector.NetworkRequest>} */
    this._requestData = [];

    /** @type {?WebInspector.NetworkRequest} */
    this._hoveredRequest = null;

    /** @type {?WebInspector.NetworkRequest} */
    this._navigationRequest = null;

    var colorUsage = WebInspector.ThemeSupport.ColorUsage;
    this._rowNavigationRequestColor = WebInspector.themeSupport.patchColor("#def", colorUsage.Background);
    this._rowStripeColor = WebInspector.themeSupport.patchColor("#f5f5f5", colorUsage.Background);
    this._rowHoverColor = WebInspector.themeSupport.patchColor("#ebf2fc", /** @type {!WebInspector.ThemeSupport.ColorUsage} */ (colorUsage.Background | colorUsage.Selection));

    /** @type {!Map<!WebInspector.ResourceType, string>} */
    this._borderColorsForResourceTypeCache = new Map();
    /** @type {!Map<string, !CanvasGradient>} */
    this._colorsForResourceTypeCache = new Map();
};

WebInspector.NetworkTimelineColumn.Events = {
    RequestHovered: Symbol("RequestHovered")
};

WebInspector.NetworkTimelineColumn._colorsForResourceType = {
    document: "hsl(215, 100%, 80%)",
    font: "hsl(8, 100%, 80%)",
    media: "hsl(272, 64%, 80%)",
    image: "hsl(272, 64%, 80%)",
    script: "hsl(31, 100%, 80%)",
    stylesheet: "hsl(90, 50%, 80%)",
    texttrack: "hsl(8, 100%, 80%)",
    websocket: "hsl(0, 0%, 95%)",
    xhr: "hsl(53, 100%, 80%)",
    other: "hsl(0, 0%, 95%)"
};

WebInspector.NetworkTimelineColumn.prototype = {
    /**
     * @override
     */
    willHide: function()
    {
        this._popoverHelper.hidePopover();
    },

    /**
     * @param {!Element} element
     * @param {!Event} event
     * @return {!AnchorBox|undefined}
     */
    _getPopoverAnchor: function(element, event)
    {
        if (!this._hoveredRequest)
            return;

        var range = WebInspector.RequestTimingView.calculateRequestTimeRanges(this._hoveredRequest, 0).find(data => data.name === "total");
        var start = this._timeToPosition(range.start);
        var end = this._timeToPosition(range.end);

        if (event.offsetX < start || event.offsetX > end)
            return;

        var rowIndex = this._requestData.findIndex(request => this._hoveredRequest === request);
        var barHeight = this._getBarHeight(range.name);
        var y = this._headerHeight + (this._rowHeight * rowIndex - this._vScrollElement.scrollTop) + ((this._rowHeight - barHeight) / 2);

        if (event.offsetY < y || event.offsetY > y + barHeight)
            return;

        var anchorBox = this.element.boxInWindow();
        anchorBox.x += start;
        anchorBox.y += y;
        anchorBox.width = end - start;
        anchorBox.height = barHeight;
        return anchorBox;
    },

    /**
     * @param {!Element|!AnchorBox} anchor
     * @param {!WebInspector.Popover} popover
     */
    _showPopover: function(anchor, popover)
    {
        if (!this._hoveredRequest)
            return;
        var content = WebInspector.RequestTimingView.createTimingTable(this._hoveredRequest, this._calculator.minimumBoundary());
        popover.showForAnchor(content, anchor);
    },

    wasShown: function()
    {
        this.scheduleDraw();
    },

    /**
     * @return {!Element}
     */
    getScrollContainer: function()
    {
        return this._vScrollElement;
    },

    /**
     * @param {?WebInspector.NetworkRequest} request
     */
    setHoveredRequest: function(request)
    {
        this._hoveredRequest = request;
        this.update();
    },

    /**
     * @param {number} height
     */
    setRowHeight: function(height)
    {
        this._rowHeight = height;
    },

    /**
     * @param {number} height
     */
    setHeaderHeight: function(height)
    {
        this._headerHeight = height;
        this._vScrollElement.style.marginTop = height + "px";
    },

    /**
     * @param {!WebInspector.NetworkTimeCalculator} calculator
     */
    setCalculator: function(calculator)
    {
        this._calculator = calculator;
    },

    /**
     * @param {!Event} event
     */
    _onMouseMove: function(event)
    {
        var request = this._getRequestFromPoint(event.offsetX, event.offsetY + event.target.offsetTop);
        this.dispatchEventToListeners(WebInspector.NetworkTimelineColumn.Events.RequestHovered, request);
    },

    /**
     * @param {!Event} event
     */
    _onMouseWheel: function(event)
    {
        this._vScrollElement.scrollTop -= event.wheelDeltaY;
        this._boundScrollContainer.scrollTop = this._vScrollElement.scrollTop;
        this._popoverHelper.hidePopover();

        var request = this._getRequestFromPoint(event.offsetX, event.offsetY);
        this.dispatchEventToListeners(WebInspector.NetworkTimelineColumn.Events.RequestHovered, request);
    },

    /**
     * @param {!Event} event
     */
    _onScroll: function(event)
    {
        this._boundScrollContainer.scrollTop = this._vScrollElement.scrollTop;
        this._popoverHelper.hidePopover();
    },

    /**
     * @param {number} x
     * @param {number} y
     * @return {?WebInspector.NetworkRequest}
     */
    _getRequestFromPoint: function(x, y)
    {
        var scrollTop = this._vScrollElement.scrollTop;
        return this._requestData[Math.floor((scrollTop + y - this._headerHeight) / this._rowHeight)] || null;
    },

    scheduleDraw: function()
    {
        if (this._updateRequestID)
            return;
        this._updateRequestID = this.element.window().requestAnimationFrame(() => this.update());
    },

    /**
     * @param {!{requests: !Array<!WebInspector.NetworkRequest>, navigationRequest: ?WebInspector.NetworkRequest}=} requestData
     */
    update: function(requestData)
    {
        if (requestData) {
            this._requestData = requestData.requests;
            this._navigationRequest = requestData.navigationRequest;
            this._calculateCanvasSize();
        }
        this.element.window().cancelAnimationFrame(this._updateRequestID);
        this._updateRequestID = null;

        this._startTime = this._calculator.minimumBoundary();
        this._endTime = this._calculator.maximumBoundary();
        this._resetCanvas();
        this._draw();
    },

    /**
     * @param {number} height
     */
    setScrollHeight: function(height)
    {
        this._vScrollContent.style.height = height + "px";
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
        this._calculateCanvasSize();
        this.scheduleDraw();
    },

    _calculateCanvasSize: function()
    {
        var scrollbarWidth = this._vScrollElement.offsetWidth;
        // Offset by 1 px because css needs 1px to compute height and add scrollbar.
        if (scrollbarWidth)
            scrollbarWidth -= 1;
        this._offsetWidth = this.contentElement.offsetWidth - scrollbarWidth;
        this._offsetHeight = this.contentElement.offsetHeight;
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
        var useTimingBars = !WebInspector.moduleSetting("networkColorCodeResourceTypes").get() && !this._calculator.startAtZero;
        var requests = this._requestData;
        var context = this._canvas.getContext("2d");
        context.save();
        context.scale(window.devicePixelRatio, window.devicePixelRatio);
        context.translate(0, this._headerHeight);
        context.rect(0, 0, this._offsetWidth, this._offsetHeight);
        context.clip();
        var scrollTop = this._vScrollElement.scrollTop;
        var firstRequestIndex = Math.floor(scrollTop / this._rowHeight);
        var lastRequestIndex = Math.min(requests.length, firstRequestIndex + Math.ceil(this._offsetHeight / this._rowHeight));
        for (var i = firstRequestIndex; i < lastRequestIndex; i++) {
            var rowOffset = this._rowHeight * i;
            var request = requests[i];
            this._decorateRow(context, request, i, rowOffset - scrollTop);
            if (useTimingBars)
                this._drawTimingBars(context, request, rowOffset - scrollTop);
            else
                this._drawSimplifiedBars(context, request, rowOffset - scrollTop);
        }
        context.restore();
        this._drawDividers(context);
    },

    _drawDividers: function(context)
    {
        context.save();
        /** @const */
        var minGridSlicePx = 64; // minimal distance between grid lines.

        var drawableWidth = this._offsetWidth - this._leftPadding - this._rightPadding;
        var timelineDuration = this._timelineDuration();
        var dividersCount = drawableWidth / minGridSlicePx;
        var gridSliceTime = timelineDuration / dividersCount;
        var pixelsPerTime = drawableWidth / timelineDuration;

        // Align gridSliceTime to a nearest round value.
        // We allow spans that fit into the formula: span = (1|2|5)x10^n,
        // e.g.: ...  .1  .2  .5  1  2  5  10  20  50  ...
        // After a span has been chosen make grid lines at multiples of the span.

        var logGridSliceTime = Math.ceil(Math.log(gridSliceTime) / Math.LN10);
        gridSliceTime = Math.pow(10, logGridSliceTime);
        if (gridSliceTime * pixelsPerTime >= 5 * minGridSlicePx)
            gridSliceTime = gridSliceTime / 5;
        if (gridSliceTime * pixelsPerTime >= 2 * minGridSlicePx)
            gridSliceTime = gridSliceTime / 2;

        context.lineWidth = 1;
        context.strokeStyle = "rgba(0, 0, 0, .1)";
        context.font = this._fontSize + "px sans-serif";
        context.fillStyle = "#444";
        gridSliceTime = gridSliceTime;
        for (var position = gridSliceTime * pixelsPerTime; position < drawableWidth; position += gridSliceTime * pixelsPerTime) {
            // Added .5 because canvas drawing points are between pixels.
            var drawPosition = Math.floor(position) + this._leftPadding + .5;
            context.beginPath();
            context.moveTo(drawPosition, 0);
            context.lineTo(drawPosition, this._offsetHeight);
            context.stroke();
            if (position <= gridSliceTime * pixelsPerTime)
                continue;
            var textData = Number.secondsToString(position / pixelsPerTime);
            context.fillText(textData, drawPosition - context.measureText(textData).width - 2, Math.floor(this._headerHeight - this._fontSize / 2));
        }
        context.restore();
    },

    /**
     * @return {number}
     */
    _timelineDuration: function()
    {
        return this._calculator.maximumBoundary() - this._calculator.minimumBoundary();
    },

    /**
     * @param {!WebInspector.RequestTimeRangeNames=} type
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
     * @param {!WebInspector.NetworkRequest} request
     * @return {string}
     */
    _borderColorForResourceType: function(request)
    {
        var resourceType = request.resourceType();
        if (this._borderColorsForResourceTypeCache.has(resourceType))
            return this._borderColorsForResourceTypeCache.get(resourceType);
        var colorsForResourceType = WebInspector.NetworkTimelineColumn._colorsForResourceType;
        var color = colorsForResourceType[resourceType] || colorsForResourceType.Other;
        var parsedColor = WebInspector.Color.parse(color);
        var hsla = parsedColor.hsla();
        hsla[1] /= 2;
        hsla[2] -= Math.min(hsla[2], 0.2);
        var resultColor = /** @type {string} */ (parsedColor.asString(null));
        this._borderColorsForResourceTypeCache.set(resourceType, resultColor);
        return resultColor;
    },

    /**
     * @param {!CanvasRenderingContext2D} context
     * @param {!WebInspector.NetworkRequest} request
     * @return {string|!CanvasGradient}
     */
    _colorForResourceType: function(context, request)
    {
        var colorsForResourceType = WebInspector.NetworkTimelineColumn._colorsForResourceType;
        var resourceType = request.resourceType();
        var color = colorsForResourceType[resourceType] || colorsForResourceType.Other;
        if (request.cached())
            return color;

        if (this._colorsForResourceTypeCache.has(color))
            return this._colorsForResourceTypeCache.get(color);
        var parsedColor = WebInspector.Color.parse(color);
        var hsla = parsedColor.hsla();
        hsla[1] -= Math.min(hsla[1], 0.28);
        hsla[2] -= Math.min(hsla[2], 0.15);
        var gradient = context.createLinearGradient(0, 0, 0, this._getBarHeight());
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, /** @type {string} */ (parsedColor.asString(null)));
        this._colorsForResourceTypeCache.set(color, gradient);
        return gradient;
    },

    /**
     * @param {!CanvasRenderingContext2D} context
     * @param {!WebInspector.NetworkRequest} request
     * @param {number} y
     */
    _drawSimplifiedBars: function(context, request, y)
    {
        /** @const */
        var borderWidth = 1;

        context.save();
        var percentages = this._calculator.computeBarGraphPercentages(request);
        var drawWidth = this._offsetWidth - this._leftPadding - this._rightPadding;
        var borderOffset = borderWidth % 2 === 0 ? 0 : .5;
        var start = this._leftPadding + Math.floor((percentages.start / 100) * drawWidth) + borderOffset;
        var mid = this._leftPadding + Math.floor((percentages.middle / 100) * drawWidth) + borderOffset;
        var end = this._leftPadding + Math.floor((percentages.end / 100) * drawWidth) + borderOffset;
        var height = this._getBarHeight();
        y += Math.floor(this._rowHeight / 2 - height / 2 + borderWidth) - borderWidth / 2;

        context.translate(0, y);
        context.fillStyle = this._colorForResourceType(context, request);
        context.strokeStyle = this._borderColorForResourceType(request);
        context.lineWidth = borderWidth;

        context.beginPath();
        context.globalAlpha = .5;
        context.rect(start, 0, mid - start, height - borderWidth);
        context.fill();
        context.stroke();

        var barWidth = Math.max(2, end - mid);
        context.beginPath();
        context.globalAlpha = 1;
        context.rect(mid, 0, barWidth, height - borderWidth);
        context.fill();
        context.stroke();

        if (request === this._hoveredRequest) {
            var labels = this._calculator.computeBarGraphLabels(request);
            this._drawSimplifiedBarDetails(context, labels.left, labels.right, start, mid, mid + barWidth + borderOffset);
        }

        context.restore();
    },

    /**
     * @param {!CanvasRenderingContext2D} context
     * @param {string} leftText
     * @param {string} rightText
     * @param {number} startX
     * @param {number} midX
     * @param {number} endX
     */
    _drawSimplifiedBarDetails: function(context, leftText, rightText, startX, midX, endX)
    {
        /** @const */
        var barDotLineLength = 10;

        context.save();
        var height = this._getBarHeight();
        var leftLabelWidth = context.measureText(leftText).width;
        var rightLabelWidth = context.measureText(rightText).width;
        context.fillStyle = "#444";
        context.strokeStyle = "#444";
        if (leftLabelWidth < midX - startX) {
            var midBarX = startX + (midX - startX) / 2 - leftLabelWidth / 2;
            context.fillText(leftText, midBarX, this._fontSize);
        } else if (barDotLineLength + leftLabelWidth + this._leftPadding < startX) {
            context.beginPath();
            context.arc(startX, Math.floor(height / 2), 2, 0, 2 * Math.PI);
            context.fill();
            context.fillText(leftText, startX - leftLabelWidth - barDotLineLength - 1, this._fontSize);
            context.beginPath();
            context.lineWidth = 1;
            context.moveTo(startX - barDotLineLength, Math.floor(height / 2));
            context.lineTo(startX, Math.floor(height / 2));
            context.stroke();
        }

        if (rightLabelWidth < endX - midX) {
            var midBarX = midX + (endX - midX) / 2 - rightLabelWidth / 2;
            context.fillText(rightText, midBarX, this._fontSize);
        } else if (endX + barDotLineLength + rightLabelWidth < this._offsetWidth - this._leftPadding - this._rightPadding) {
            context.beginPath();
            context.arc(endX, Math.floor(height / 2), 2, 0, 2 * Math.PI);
            context.fill();
            context.fillText(rightText, endX + barDotLineLength + 1, this._fontSize);
            context.beginPath();
            context.lineWidth = 1;
            context.moveTo(endX, Math.floor(height / 2));
            context.lineTo(endX + barDotLineLength, Math.floor(height / 2));
            context.stroke();
        }
        context.restore();
    },

    /**
     * @param {!CanvasRenderingContext2D} context
     * @param {!WebInspector.NetworkRequest} request
     * @param {number} y
     */
    _drawTimingBars: function(context, request, y)
    {
        context.save();
        var ranges = WebInspector.RequestTimingView.calculateRequestTimeRanges(request, 0);
        for (var range of ranges) {
            if (range.name === WebInspector.RequestTimeRangeNames.Total ||
                range.name === WebInspector.RequestTimeRangeNames.Sending ||
                range.end - range.start === 0)
                continue;
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
            var middleBarY = y + Math.floor(this._rowHeight / 2 - height / 2) + lineWidth / 2;
            var start = this._timeToPosition(range.start);
            var end = this._timeToPosition(range.end);
            context.rect(start, middleBarY, end - start, height - lineWidth);
            if (lineWidth) {
                context.lineWidth = lineWidth;
                context.strokeStyle = borderColor;
                context.stroke();
            }
            context.fill();
        }
        context.restore();
    },

    /**
     * @param {!CanvasRenderingContext2D} context
     * @param {!WebInspector.NetworkRequest} request
     * @param {number} rowNumber
     * @param {number} y
     */
    _decorateRow: function(context, request, rowNumber, y)
    {
        if (rowNumber % 2 === 1 && this._hoveredRequest !== request && this._navigationRequest !== request)
            return;
        context.save();
        context.beginPath();
        var color = this._rowStripeColor;
        if (this._hoveredRequest === request)
            color = this._rowHoverColor;
        else if (this._navigationRequest === request)
            color = this._rowNavigationRequestColor;

        context.fillStyle = color;
        context.rect(0, y, this._offsetWidth, this._rowHeight);
        context.fill();
        context.restore();
    },

    __proto__: WebInspector.VBox.prototype
};

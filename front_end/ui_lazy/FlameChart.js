/**
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @interface
 */
WebInspector.FlameChartDelegate = function() { };

WebInspector.FlameChartDelegate.prototype = {
    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    requestWindowTimes: function(startTime, endTime) { },

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    updateRangeSelection: function(startTime, endTime) { },
};

/**
 * @constructor
 * @extends {WebInspector.HBox}
 * @param {!WebInspector.FlameChartDataProvider} dataProvider
 * @param {!WebInspector.FlameChartDelegate} flameChartDelegate
 * @param {!WebInspector.Setting=} groupExpansionSetting
 */
WebInspector.FlameChart = function(dataProvider, flameChartDelegate, groupExpansionSetting)
{
    WebInspector.HBox.call(this, true);
    this.registerRequiredCSS("ui_lazy/flameChart.css");
    this.contentElement.classList.add("flame-chart-main-pane");
    this._flameChartDelegate = flameChartDelegate;
    this._groupExpansionSetting = groupExpansionSetting;
    this._groupExpansionState = groupExpansionSetting && groupExpansionSetting.get() || {};

    this._dataProvider = dataProvider;
    this._calculator = new WebInspector.FlameChart.Calculator(dataProvider);

    this._canvas = this.contentElement.createChild("canvas");
    this._canvas.tabIndex = 1;
    this.setDefaultFocusedElement(this._canvas);
    this._canvas.addEventListener("mousemove", this._onMouseMove.bind(this), false);
    this._canvas.addEventListener("mouseout", this._onMouseOut.bind(this), false);
    this._canvas.addEventListener("mousewheel", this._onMouseWheel.bind(this), false);
    this._canvas.addEventListener("click", this._onClick.bind(this), false);
    this._canvas.addEventListener("keydown", this._onKeyDown.bind(this), false);
    WebInspector.installInertialDragHandle(this._canvas, this._startCanvasDragging.bind(this), this._canvasDragging.bind(this), this._endCanvasDragging.bind(this), "-webkit-grabbing", null);
    WebInspector.installDragHandle(this._canvas, this._startRangeSelection.bind(this), this._rangeSelectionDragging.bind(this), this._endRangeSelection.bind(this), "text", null);

    this._vScrollElement = this.contentElement.createChild("div", "flame-chart-v-scroll");
    this._vScrollContent = this._vScrollElement.createChild("div");
    this._vScrollElement.addEventListener("scroll", this._onScroll.bind(this), false);
    this._scrollTop = 0;

    this._entryInfo = this.contentElement.createChild("div", "flame-chart-entry-info");
    this._markerHighlighElement = this.contentElement.createChild("div", "flame-chart-marker-highlight-element");
    this._highlightElement = this.contentElement.createChild("div", "flame-chart-highlight-element");
    this._selectedElement = this.contentElement.createChild("div", "flame-chart-selected-element");
    this._selectionOverlay = this.contentElement.createChild("div", "flame-chart-selection-overlay hidden");
    this._selectedTimeSpanLabel = this._selectionOverlay.createChild("div", "time-span");

    this._windowLeft = 0.0;
    this._windowRight = 1.0;
    this._timeWindowLeft = 0;
    this._timeWindowRight = Infinity;
    this._rangeSelectionStart = 0;
    this._rangeSelectionEnd = 0;
    this._barHeight = dataProvider.barHeight();
    this._paddingLeft = this._dataProvider.paddingLeft();
    var markerPadding = 2;
    this._markerRadius = this._barHeight / 2 - markerPadding;

    /** @const */
    this._headerLeftPadding = 6;
    /** @const */
    this._arrowSide = 8;
    /** @const */
    this._expansionArrowIndent = this._headerLeftPadding + this._arrowSide / 2;
    /** @const */
    this._headerLabelXPadding = 3;
    /** @const */
    this._headerLabelYPadding = 2;

    this._highlightedMarkerIndex = -1;
    this._highlightedEntryIndex = -1;
    this._selectedEntryIndex = -1;
    this._rawTimelineDataLength = 0;
    /** @type {!Map<string,!Map<string,number>>} */
    this._textWidth = new Map();

    this._lastMouseOffsetX = 0;
};

WebInspector.FlameChart.DividersBarHeight = 18;

WebInspector.FlameChart.MinimalTimeWindowMs = 0.5;

/**
 * @interface
 */
WebInspector.FlameChartDataProvider = function()
{
};

/**
 * @typedef {!{name: string, startLevel: number, expanded: (boolean|undefined), style: !WebInspector.FlameChart.GroupStyle}}
 */
WebInspector.FlameChart.Group;

/**
 * @typedef {!{
 *     height: number,
 *     padding: number,
 *     collapsible: boolean,
 *     font: string,
 *     color: string,
 *     backgroundColor: string,
 *     nestingLevel: number,
 *     shareHeaderLine: (boolean|undefined),
 *     useFirstLineForOverview: (boolean|undefined)
 * }}
 */
WebInspector.FlameChart.GroupStyle;

/**
 * @constructor
 * @param {!Array<number>|!Uint16Array} entryLevels
 * @param {!Array<number>|!Float32Array} entryTotalTimes
 * @param {!Array<number>|!Float64Array} entryStartTimes
 * @param {?Array<!WebInspector.FlameChart.Group>} groups
 */
WebInspector.FlameChart.TimelineData = function(entryLevels, entryTotalTimes, entryStartTimes, groups)
{
    this.entryLevels = entryLevels;
    this.entryTotalTimes = entryTotalTimes;
    this.entryStartTimes = entryStartTimes;
    this.groups = groups;
    /** @type {!Array.<!WebInspector.FlameChartMarker>} */
    this.markers = [];
    this.flowStartTimes = [];
    this.flowStartLevels = [];
    this.flowEndTimes = [];
    this.flowEndLevels = [];
};

WebInspector.FlameChartDataProvider.prototype = {
    /**
     * @return {number}
     */
    barHeight: function() { },

    /**
     * @param {number} startTime
     * @param {number} endTime
     * @return {?Array.<number>}
     */
    dividerOffsets: function(startTime, endTime) { },

    /**
     * @return {number}
     */
    minimumBoundary: function() { },

    /**
     * @return {number}
     */
    totalTime: function() { },

    /**
     * @param {number} value
     * @param {number=} precision
     * @return {string}
     */
    formatValue: function(value, precision) { },

    /**
     * @return {number}
     */
    maxStackDepth: function() { },

    /**
     * @return {?WebInspector.FlameChart.TimelineData}
     */
    timelineData: function() { },

    /**
     * @param {number} entryIndex
     * @return {?Element}
     */
    prepareHighlightedEntryInfo: function(entryIndex) { },

    /**
     * @param {number} entryIndex
     * @return {boolean}
     */
    canJumpToEntry: function(entryIndex) { },

    /**
     * @param {number} entryIndex
     * @return {?string}
     */
    entryTitle: function(entryIndex) { },

    /**
     * @param {number} entryIndex
     * @return {?string}
     */
    entryFont: function(entryIndex) { },

    /**
     * @param {number} entryIndex
     * @return {string}
     */
    entryColor: function(entryIndex) { },

    /**
     * @param {number} entryIndex
     * @param {!CanvasRenderingContext2D} context
     * @param {?string} text
     * @param {number} barX
     * @param {number} barY
     * @param {number} barWidth
     * @param {number} barHeight
     * @param {number} unclippedBarX
     * @param {number} timeToPixels
     * @return {boolean}
     */
    decorateEntry: function(entryIndex, context, text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixels) { },

    /**
     * @param {number} entryIndex
     * @return {boolean}
     */
    forceDecoration: function(entryIndex) { },

    /**
     * @param {number} entryIndex
     * @return {string}
     */
    textColor: function(entryIndex) { },

    /**
     * @return {number}
     */
    textBaseline: function() { },

    /**
     * @return {number}
     */
    textPadding: function() { },

    /**
     * @return {?{startTime: number, endTime: number}}
     */
    highlightTimeRange: function(entryIndex) { },

    /**
     * @return {number}
     */
    paddingLeft: function() { },
};

/**
 * @interface
 */
WebInspector.FlameChartMarker = function()
{
};

WebInspector.FlameChartMarker.prototype = {
    /**
     * @return {number}
     */
    startTime: function() { },

    /**
     * @return {string}
     */
    color: function() { },

    /**
     * @return {string}
     */
    title: function() { },

    /**
     * @param {!CanvasRenderingContext2D} context
     * @param {number} x
     * @param {number} height
     * @param {number} pixelsPerMillisecond
     */
    draw: function(context, x, height, pixelsPerMillisecond) { },
};

/** @enum {symbol} */
WebInspector.FlameChart.Events = {
    EntrySelected: Symbol("EntrySelected")
};


/**
 * @constructor
 * @param {!{min: number, max: number}|number=} hueSpace
 * @param {!{min: number, max: number, count: (number|undefined)}|number=} satSpace
 * @param {!{min: number, max: number, count: (number|undefined)}|number=} lightnessSpace
 * @param {!{min: number, max: number, count: (number|undefined)}|number=} alphaSpace
 */
WebInspector.FlameChart.ColorGenerator = function(hueSpace, satSpace, lightnessSpace, alphaSpace)
{
    this._hueSpace = hueSpace || { min: 0, max: 360 };
    this._satSpace = satSpace || 67;
    this._lightnessSpace = lightnessSpace || 80;
    this._alphaSpace = alphaSpace || 1;
    /** @type {!Map<string, string>} */
    this._colors = new Map();
};

WebInspector.FlameChart.ColorGenerator.prototype = {
    /**
     * @param {string} id
     * @param {string} color
     */
    setColorForID: function(id, color)
    {
        this._colors.set(id, color);
    },

    /**
     * @param {string} id
     * @return {string}
     */
    colorForID: function(id)
    {
        var color = this._colors.get(id);
        if (!color) {
            color = this._generateColorForID(id);
            this._colors.set(id, color);
        }
        return color;
    },

    /**
     * @param {string} id
     * @return {string}
     */
    _generateColorForID: function(id)
    {
        var hash = String.hashCode(id);
        var h = this._indexToValueInSpace(hash, this._hueSpace);
        var s = this._indexToValueInSpace(hash >> 8, this._satSpace);
        var l = this._indexToValueInSpace(hash >> 16, this._lightnessSpace);
        var a = this._indexToValueInSpace(hash >> 24, this._alphaSpace);
        return "hsla(" + h + ", " + s + "%, " + l + "%, " + a + ")";
    },

    /**
     * @param {number} index
     * @param {!{min: number, max: number, count: (number|undefined)}|number} space
     * @return {number}
     */
    _indexToValueInSpace: function(index, space)
    {
        if (typeof space === "number")
            return space;
        var count = space.count || space.max - space.min;
        index %= count;
        return space.min + Math.floor(index / (count - 1) * (space.max - space.min));
    }
};


/**
 * @constructor
 * @implements {WebInspector.TimelineGrid.Calculator}
 * @param {!WebInspector.FlameChartDataProvider} dataProvider
 */
WebInspector.FlameChart.Calculator = function(dataProvider)
{
    this._dataProvider = dataProvider;
    this._paddingLeft = 0;
};

WebInspector.FlameChart.Calculator.prototype = {
    /**
     * @override
     * @return {number}
     */
    paddingLeft: function()
    {
        return this._paddingLeft;
    },

    /**
     * @param {!WebInspector.FlameChart} mainPane
     */
    _updateBoundaries: function(mainPane)
    {
        this._totalTime = mainPane._dataProvider.totalTime();
        this._zeroTime = mainPane._dataProvider.minimumBoundary();
        this._minimumBoundaries = this._zeroTime + mainPane._windowLeft * this._totalTime;
        this._maximumBoundaries = this._zeroTime + mainPane._windowRight * this._totalTime;
        this._paddingLeft = mainPane._paddingLeft;
        this._width = mainPane._offsetWidth - this._paddingLeft;
        this._timeToPixel = this._width / this.boundarySpan();
    },

    /**
     * @override
     * @param {number} time
     * @return {number}
     */
    computePosition: function(time)
    {
        return Math.round((time - this._minimumBoundaries) * this._timeToPixel + this._paddingLeft);
    },

    /**
     * @override
     * @param {number} value
     * @param {number=} precision
     * @return {string}
     */
    formatValue: function(value, precision)
    {
        return this._dataProvider.formatValue(value - this._zeroTime, precision);
    },

    /**
     * @override
     * @return {number}
     */
    maximumBoundary: function()
    {
        return this._maximumBoundaries;
    },

    /**
     * @override
     * @return {number}
     */
    minimumBoundary: function()
    {
        return this._minimumBoundaries;
    },

    /**
     * @override
     * @return {number}
     */
    zeroTime: function()
    {
        return this._zeroTime;
    },

    /**
     * @override
     * @return {number}
     */
    boundarySpan: function()
    {
        return this._maximumBoundaries - this._minimumBoundaries;
    }
};

WebInspector.FlameChart.prototype = {
    /**
     * @override
     */
    willHide: function()
    {
        this.hideHighlight();
    },

    /**
     * @override
     * @return {!Array.<!Element>}
     */
    elementsToRestoreScrollPositionsFor: function()
    {
        return [this._vScrollElement];
    },

    /**
     * @param {number} entryIndex
     */
    highlightEntry: function(entryIndex)
    {
        if (this._highlightedEntryIndex === entryIndex)
            return;
        this._highlightedEntryIndex = entryIndex;
        this._updateElementPosition(this._highlightElement, this._highlightedEntryIndex);
    },

    hideHighlight: function()
    {
        this._entryInfo.removeChildren();
        this._canvas.style.cursor = "default";
        this._highlightedEntryIndex = -1;
        this._updateElementPosition(this._highlightElement, this._highlightedEntryIndex);
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
     * @return {?WebInspector.FlameChart.TimelineData}
     */
    _timelineData: function()
    {
        var timelineData = this._dataProvider.timelineData();
        if (timelineData !== this._rawTimelineData || timelineData.entryStartTimes.length !== this._rawTimelineDataLength)
            this._processTimelineData(timelineData);
        return this._rawTimelineData;
    },

    _cancelAnimation: function()
    {
        if (this._cancelWindowTimesAnimation) {
            this._timeWindowLeft = this._pendingAnimationTimeLeft;
            this._timeWindowRight = this._pendingAnimationTimeRight;
            this._cancelWindowTimesAnimation();
            delete this._cancelWindowTimesAnimation;
        }
    },

    /**
     * @param {number} entryIndex
     */
    _revealEntry: function(entryIndex)
    {
        var timelineData = this._timelineData();
        if (!timelineData)
            return;
        // Think in terms of not where we are, but where we'll be after animation (if present)
        var timeLeft = this._cancelWindowTimesAnimation ? this._pendingAnimationTimeLeft : this._timeWindowLeft;
        var timeRight = this._cancelWindowTimesAnimation ? this._pendingAnimationTimeRight : this._timeWindowRight;
        var entryStartTime = timelineData.entryStartTimes[entryIndex];
        var entryTotalTime = timelineData.entryTotalTimes[entryIndex];
        var entryEndTime = entryStartTime + entryTotalTime;
        var minEntryTimeWindow = Math.min(entryTotalTime, timeRight - timeLeft);

        var y = this._levelToHeight(timelineData.entryLevels[entryIndex]);
        if (this._vScrollElement.scrollTop > y)
            this._vScrollElement.scrollTop = y;
        else if (this._vScrollElement.scrollTop < y - this._offsetHeight + this._barHeight)
            this._vScrollElement.scrollTop = y - this._offsetHeight + this._barHeight;

        if (timeLeft > entryEndTime) {
            var delta = timeLeft - entryEndTime + minEntryTimeWindow;
            this._flameChartDelegate.requestWindowTimes(timeLeft - delta, timeRight - delta);
        } else if (timeRight < entryStartTime) {
            var delta = entryStartTime - timeRight + minEntryTimeWindow;
            this._flameChartDelegate.requestWindowTimes(timeLeft + delta, timeRight + delta);
        }
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    setWindowTimes: function(startTime, endTime)
    {
        if (this._muteAnimation || this._timeWindowLeft === 0 || this._timeWindowRight === Infinity || (startTime === 0 && endTime === Infinity) || (startTime === Infinity && endTime === Infinity)) {
            // Initial setup.
            this._timeWindowLeft = startTime;
            this._timeWindowRight = endTime;
            this.scheduleUpdate();
            return;
        }

        this._cancelAnimation();
        this._updateHighlight();
        this._cancelWindowTimesAnimation = WebInspector.animateFunction(this.element.window(), this._animateWindowTimes.bind(this),
            [{from: this._timeWindowLeft, to: startTime}, {from: this._timeWindowRight, to: endTime}], 5,
            this._animationCompleted.bind(this));
        this._pendingAnimationTimeLeft = startTime;
        this._pendingAnimationTimeRight = endTime;
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    _animateWindowTimes: function(startTime, endTime)
    {
        this._timeWindowLeft = startTime;
        this._timeWindowRight = endTime;
        this._updateHighlight();
        this.update();
    },

    _animationCompleted: function()
    {
        delete this._cancelWindowTimesAnimation;
        this._updateHighlight();
    },

    /**
     * @param {!MouseEvent} event
     */
    _initMaxDragOffset: function(event)
    {
        this._maxDragOffsetSquared = 0;
        this._dragStartX = event.pageX;
        this._dragStartY = event.pageY;
    },

    /**
     * @param {number} x
     * @param {number} y
     */
    _updateMaxDragOffset: function(x, y)
    {
        var dx = x - this._dragStartX;
        var dy = y - this._dragStartY;
        var dragOffsetSquared = dx * dx + dy * dy;
        this._maxDragOffsetSquared = Math.max(this._maxDragOffsetSquared, dragOffsetSquared);
    },

    /**
     * @return {number}
     */
    _maxDragOffset: function()
    {
        return Math.sqrt(this._maxDragOffsetSquared);
    },

    /**
     * @param {number} x
     * @param {number} y
     * @param {!MouseEvent} event
     * @return {boolean}
     */
    _startCanvasDragging: function(x, y, event)
    {
        if (event.shiftKey)
            return false;
        if (!this._timelineData() || this._timeWindowRight === Infinity)
            return false;
        this._isDragging = true;
        this._initMaxDragOffset(event);
        this._dragStartPointX = x;
        this._dragStartPointY = y;
        this._dragStartScrollTop = this._vScrollElement.scrollTop;
        this._canvas.style.cursor = "";
        this.hideHighlight();
        return true;
    },

    /**
     * @param {number} x
     * @param {number} y
     */
    _canvasDragging: function(x, y)
    {
        var pixelShift = this._dragStartPointX - x;
        this._dragStartPointX = x;
        this._muteAnimation = true;
        this._handlePanGesture(pixelShift * this._pixelToTime);
        this._muteAnimation = false;

        var pixelScroll = this._dragStartPointY - y;
        this._vScrollElement.scrollTop = this._dragStartScrollTop + pixelScroll;
        this._updateMaxDragOffset(x, y);
    },

    _endCanvasDragging: function()
    {
        this._isDragging = false;
        this._updateHighlight();
    },

    /**
     * @param {!MouseEvent} event
     * @return {boolean}
     */
    _startRangeSelection: function(event)
    {
        if (!event.shiftKey)
            return false;
        this._isDragging = true;
        this._initMaxDragOffset(event);
        this._selectionOffsetShiftX = event.offsetX - event.pageX;
        this._selectionOffsetShiftY = event.offsetY - event.pageY;
        this._selectionStartX = event.offsetX;
        var style = this._selectionOverlay.style;
        style.left = this._selectionStartX + "px";
        style.width = "1px";
        this._selectedTimeSpanLabel.textContent = "";
        this._selectionOverlay.classList.remove("hidden");
        this.hideHighlight();
        return true;
    },

    _endRangeSelection: function()
    {
        this._isDragging = false;
        this._updateHighlight();
    },

    _hideRangeSelection: function()
    {
        this._selectionOverlay.classList.add("hidden");
    },

    /**
     * @param {!MouseEvent} event
     */
    _rangeSelectionDragging: function(event)
    {
        this._updateMaxDragOffset(event.pageX, event.pageY);
        var x = Number.constrain(event.pageX + this._selectionOffsetShiftX, 0, this._offsetWidth);
        var start = this._cursorTime(this._selectionStartX);
        var end = this._cursorTime(x);
        this._rangeSelectionStart = Math.min(start, end);
        this._rangeSelectionEnd = Math.max(start, end);
        this._updateRangeSelectionOverlay();
        this._flameChartDelegate.updateRangeSelection(this._rangeSelectionStart, this._rangeSelectionEnd);
    },

    _updateRangeSelectionOverlay: function()
    {
        var /** @const */ margin = 100;
        var left = Number.constrain(this._timeToPosition(this._rangeSelectionStart), -margin, this._offsetWidth + margin);
        var right = Number.constrain(this._timeToPosition(this._rangeSelectionEnd), -margin, this._offsetWidth + margin);
        var style = this._selectionOverlay.style;
        style.left = left + "px";
        style.width = (right - left) + "px";
        var timeSpan = this._rangeSelectionEnd - this._rangeSelectionStart;
        this._selectedTimeSpanLabel.textContent = Number.preciseMillisToString(timeSpan, 2);
    },

    /**
     * @param {!Event} event
     */
    _onMouseMove: function(event)
    {
        this._lastMouseOffsetX = event.offsetX;
        this._lastMouseOffsetY = event.offsetY;
        if (!this._enabled())
            return;
        if (this._isDragging)
            return;
        if (this._coordinatesToGroupIndex(event.offsetX, event.offsetY) >= 0) {
            this.hideHighlight();
            this._canvas.style.cursor = "pointer";
            return;
        }
        this._updateHighlight();
    },

    _updateHighlight: function()
    {
        var inDividersBar = this._lastMouseOffsetY < WebInspector.FlameChart.DividersBarHeight;
        this._highlightedMarkerIndex = inDividersBar ? this._markerIndexAtPosition(this._lastMouseOffsetX) : -1;
        this._updateMarkerHighlight();

        var entryIndex = this._coordinatesToEntryIndex(this._lastMouseOffsetX, this._lastMouseOffsetY);
        if (entryIndex === -1) {
            this.hideHighlight();
            return;
        }
        this._updatePopover(entryIndex);
        this._canvas.style.cursor = this._dataProvider.canJumpToEntry(entryIndex) ? "pointer" : "default";
        this.highlightEntry(entryIndex);
    },

    _onMouseOut: function()
    {
        this._lastMouseOffsetX = -1;
        this._lastMouseOffsetY = -1;
        this.hideHighlight();
    },

    /**
     * @param {number} entryIndex
     */
    _updatePopover: function(entryIndex)
    {
        if (entryIndex === this._highlightedEntryIndex) {
            this._updatePopoverOffset();
            return;
        }
        this._entryInfo.removeChildren();
        var popoverElement = this._dataProvider.prepareHighlightedEntryInfo(entryIndex);
        if (popoverElement) {
            this._entryInfo.appendChild(popoverElement);
            this._updatePopoverOffset();
        }
    },

    _updatePopoverOffset: function()
    {
        var mouseX = this._lastMouseOffsetX;
        var mouseY = this._lastMouseOffsetY;
        var parentWidth = this._entryInfo.parentElement.clientWidth;
        var parentHeight = this._entryInfo.parentElement.clientHeight;
        var infoWidth = this._entryInfo.clientWidth;
        var infoHeight = this._entryInfo.clientHeight;
        var /** @const */ offsetX = 10;
        var /** @const */ offsetY = 6;
        var x;
        var y;
        for (var quadrant = 0; quadrant < 4; ++quadrant) {
            var dx = quadrant & 2 ? -offsetX - infoWidth  : offsetX;
            var dy = quadrant & 1 ? -offsetY - infoHeight : offsetY;
            x = Number.constrain(mouseX + dx, 0, parentWidth - infoWidth);
            y = Number.constrain(mouseY + dy, 0, parentHeight - infoHeight);
            if (x >= mouseX || mouseX >= x + infoWidth || y >= mouseY || mouseY >= y + infoHeight)
                break;
        }
        this._entryInfo.style.left = x + "px";
        this._entryInfo.style.top = y + "px";
    },

    _onClick: function(event)
    {
        this.focus();
        // onClick comes after dragStart and dragEnd events.
        // So if there was drag (mouse move) in the middle of that events
        // we skip the click. Otherwise we jump to the sources.
        const clickThreshold = 5;
        if (this._maxDragOffset() > clickThreshold)
            return;
        var groupIndex = this._coordinatesToGroupIndex(event.offsetX, event.offsetY);
        if (groupIndex >= 0) {
            this._toggleGroupVisibility(groupIndex);
            return;
        }
        this._hideRangeSelection();
        this.dispatchEventToListeners(WebInspector.FlameChart.Events.EntrySelected, this._highlightedEntryIndex);
    },

    /**
     * @param {number} groupIndex
     */
    _toggleGroupVisibility: function(groupIndex)
    {
        if (!this._isGroupCollapsible(groupIndex))
            return;
        var groups = this._rawTimelineData.groups;
        var group = groups[groupIndex];
        group.expanded = !group.expanded;
        this._groupExpansionState[group.name] = group.expanded;
        if (this._groupExpansionSetting)
            this._groupExpansionSetting.set(this._groupExpansionState);
        this._updateLevelPositions();

        this._updateHighlight();
        if (!group.expanded) {
            var timelineData = this._timelineData();
            var level = timelineData.entryLevels[this._selectedEntryIndex];
            if (this._selectedEntryIndex >= 0 && level >= group.startLevel && (groupIndex === groups.length || groups[groupIndex + 1].startLevel > level))
                this._selectedEntryIndex = -1;
        }

        this._updateHeight();
        this._resetCanvas();
        this._draw(this._offsetWidth, this._offsetHeight);
    },

    /**
     * @param {!Event} e
     */
    _onMouseWheel: function(e)
    {
        if (!this._enabled())
            return;
        // Pan vertically when shift down only.
        var panVertically = e.shiftKey && (e.wheelDeltaY || Math.abs(e.wheelDeltaX) === 120);
        var panHorizontally = Math.abs(e.wheelDeltaX) > Math.abs(e.wheelDeltaY) && !e.shiftKey;
        if (panVertically) {
            this._vScrollElement.scrollTop -= (e.wheelDeltaY || e.wheelDeltaX) / 120 * this._offsetHeight / 8;
        } else if (panHorizontally) {
            var shift = -e.wheelDeltaX * this._pixelToTime;
            this._muteAnimation = true;
            this._handlePanGesture(shift);
            this._muteAnimation = false;
        } else {  // Zoom.
            const mouseWheelZoomSpeed = 1 / 120;
            this._handleZoomGesture(Math.pow(1.2, -(e.wheelDeltaY || e.wheelDeltaX) * mouseWheelZoomSpeed) - 1);
        }

        // Block swipe gesture.
        e.consume(true);
    },

    /**
     * @param {!Event} e
     */
    _onKeyDown: function(e)
    {
        this._handleZoomPanKeys(e);
        this._handleSelectionNavigation(e);
    },

    /**
     * @param {!Event} e
     */
    _handleSelectionNavigation: function(e)
    {
        if (!WebInspector.KeyboardShortcut.hasNoModifiers(e))
            return;
        if (this._selectedEntryIndex === -1)
            return;
        var timelineData = this._timelineData();
        if (!timelineData)
            return;

        /**
         * @param {number} time
         * @param {number} entryIndex
         * @return {number}
         */
        function timeComparator(time, entryIndex)
        {
            return time - timelineData.entryStartTimes[entryIndex];
        }

        /**
         * @param {number} entry1
         * @param {number} entry2
         * @return {boolean}
         */
        function entriesIntersect(entry1, entry2)
        {
            var start1 = timelineData.entryStartTimes[entry1];
            var start2 = timelineData.entryStartTimes[entry2];
            var end1 = start1 + timelineData.entryTotalTimes[entry1];
            var end2 = start2 + timelineData.entryTotalTimes[entry2];
            return start1 < end2 && start2 < end1;
        }

        var keys = WebInspector.KeyboardShortcut.Keys;
        if (e.keyCode === keys.Left.code || e.keyCode === keys.Right.code) {
            var level = timelineData.entryLevels[this._selectedEntryIndex];
            var levelIndexes = this._timelineLevels[level];
            var indexOnLevel = levelIndexes.lowerBound(this._selectedEntryIndex);
            indexOnLevel += e.keyCode === keys.Left.code ? -1 : 1;
            e.consume(true);
            if (indexOnLevel >= 0 && indexOnLevel < levelIndexes.length)
                this.dispatchEventToListeners(WebInspector.FlameChart.Events.EntrySelected, levelIndexes[indexOnLevel]);
            return;
        }
        if (e.keyCode === keys.Up.code || e.keyCode === keys.Down.code) {
            e.consume(true);
            var level = timelineData.entryLevels[this._selectedEntryIndex];
            level += e.keyCode === keys.Up.code ? -1 : 1;
            if (level < 0 || level >= this._timelineLevels.length)
                return;
            var entryTime = timelineData.entryStartTimes[this._selectedEntryIndex] + timelineData.entryTotalTimes[this._selectedEntryIndex] / 2;
            var levelIndexes = this._timelineLevels[level];
            var indexOnLevel = levelIndexes.upperBound(entryTime, timeComparator) - 1;
            if (!entriesIntersect(this._selectedEntryIndex, levelIndexes[indexOnLevel])) {
                ++indexOnLevel;
                if (indexOnLevel >= levelIndexes.length || !entriesIntersect(this._selectedEntryIndex, levelIndexes[indexOnLevel]))
                    return;
            }
            this.dispatchEventToListeners(WebInspector.FlameChart.Events.EntrySelected, levelIndexes[indexOnLevel]);
        }
    },

    /**
     * @param {!Event} e
     */
    _handleZoomPanKeys: function(e)
    {
        if (!WebInspector.KeyboardShortcut.hasNoModifiers(e))
            return;
        var zoomMultiplier = e.shiftKey ? 0.8 : 0.3;
        var panMultiplier = e.shiftKey ? 320 : 80;
        if (e.keyCode === "A".charCodeAt(0)) {
            this._handlePanGesture(-panMultiplier * this._pixelToTime);
            e.consume(true);
        } else if (e.keyCode === "D".charCodeAt(0)) {
            this._handlePanGesture(panMultiplier * this._pixelToTime);
            e.consume(true);
        } else if (e.keyCode === "W".charCodeAt(0)) {
            this._handleZoomGesture(-zoomMultiplier);
            e.consume(true);
        } else if (e.keyCode === "S".charCodeAt(0)) {
            this._handleZoomGesture(zoomMultiplier);
            e.consume(true);
        }
    },

    /**
     * @param {number} zoom
     */
    _handleZoomGesture: function(zoom)
    {
        this._cancelAnimation();
        var bounds = this._windowForGesture();
        var cursorTime = this._cursorTime(this._lastMouseOffsetX);
        bounds.left += (bounds.left - cursorTime) * zoom;
        bounds.right += (bounds.right - cursorTime) * zoom;
        this._requestWindowTimes(bounds);
    },

    /**
     * @param {number} shift
     */
    _handlePanGesture: function(shift)
    {
        this._cancelAnimation();
        var bounds = this._windowForGesture();
        shift = Number.constrain(shift, this._minimumBoundary - bounds.left, this._totalTime + this._minimumBoundary - bounds.right);
        bounds.left += shift;
        bounds.right += shift;
        this._requestWindowTimes(bounds);
    },

    /**
     * @return {{left: number, right: number}}
     */
    _windowForGesture: function()
    {
        var windowLeft = this._timeWindowLeft ? this._timeWindowLeft : this._dataProvider.minimumBoundary();
        var windowRight = this._timeWindowRight !== Infinity ? this._timeWindowRight : this._dataProvider.minimumBoundary() + this._dataProvider.totalTime();
        return {left: windowLeft, right: windowRight};
    },

    /**
     * @param {{left: number, right: number}} bounds
     */
    _requestWindowTimes: function(bounds)
    {
        bounds.left = Number.constrain(bounds.left, this._minimumBoundary, this._totalTime + this._minimumBoundary);
        bounds.right = Number.constrain(bounds.right, this._minimumBoundary, this._totalTime + this._minimumBoundary);
        if (bounds.right - bounds.left < WebInspector.FlameChart.MinimalTimeWindowMs)
            return;
        this._flameChartDelegate.requestWindowTimes(bounds.left, bounds.right);
    },

    /**
     * @param {number} x
     * @return {number}
     */
    _cursorTime: function(x)
    {
        return (x + this._pixelWindowLeft - this._paddingLeft) * this._pixelToTime + this._minimumBoundary;
    },

    /**
     * @param {number} x
     * @param {number} y
     * @return {number}
     */
    _coordinatesToEntryIndex: function(x, y)
    {
        if (x < 0 || y < 0)
            return -1;
        y += this._scrollTop;
        var timelineData = this._timelineData();
        if (!timelineData)
            return -1;
        var cursorTime = this._cursorTime(x);
        var cursorLevel = this._visibleLevelOffsets.upperBound(y) - 1;
        if (cursorLevel < 0 || !this._visibleLevels[cursorLevel])
            return -1;
        var offsetFromLevel = y - this._visibleLevelOffsets[cursorLevel];
        if (offsetFromLevel > this._barHeight)
            return -1;
        var entryStartTimes = timelineData.entryStartTimes;
        var entryTotalTimes = timelineData.entryTotalTimes;
        var entryIndexes = this._timelineLevels[cursorLevel];
        if (!entryIndexes || !entryIndexes.length)
            return -1;

        /**
         * @param {number} time
         * @param {number} entryIndex
         * @return {number}
         */
        function comparator(time, entryIndex)
        {
            return time - entryStartTimes[entryIndex];
        }
        var indexOnLevel = Math.max(entryIndexes.upperBound(cursorTime, comparator) - 1, 0);

        /**
         * @this {WebInspector.FlameChart}
         * @param {number} entryIndex
         * @return {boolean}
         */
        function checkEntryHit(entryIndex)
        {
            if (entryIndex === undefined)
                return false;
            var startTime = entryStartTimes[entryIndex];
            var duration = entryTotalTimes[entryIndex];
            if (isNaN(duration)) {
                var dx = (startTime - cursorTime) / this._pixelToTime;
                var dy = this._barHeight / 2 - offsetFromLevel;
                return dx * dx + dy * dy < this._markerRadius * this._markerRadius;
            }
            var endTime = startTime + duration;
            var barThreshold = 3 * this._pixelToTime;
            return startTime - barThreshold < cursorTime && cursorTime < endTime + barThreshold;
        }

        var entryIndex = entryIndexes[indexOnLevel];
        if (checkEntryHit.call(this, entryIndex))
            return entryIndex;
        entryIndex = entryIndexes[indexOnLevel + 1];
        if (checkEntryHit.call(this, entryIndex))
            return entryIndex;
        return -1;
    },

    /**
     * @param {number} x
     * @param {number} y
     * @return {number}
     */
    _coordinatesToGroupIndex: function(x, y)
    {
        if (x < 0 || y < 0)
            return -1;
        y += this._scrollTop;
        var groups = this._rawTimelineData.groups || [];
        var group = this._groupOffsets.upperBound(y) - 1;

        if (group < 0 || group >= groups.length || y - this._groupOffsets[group] >= groups[group].style.height)
            return -1;
        var context = this._canvas.getContext("2d");
        context.save();
        context.font = groups[group].style.font;
        var right = this._headerLeftPadding + this._labelWidthForGroup(context, groups[group]);
        context.restore();
        if (x > right)
            return -1;

        return group;
    },

    /**
     * @param {number} x
     * @return {number}
     */
    _markerIndexAtPosition: function(x)
    {
        var markers = this._timelineData().markers;
        if (!markers)
            return -1;
        var accurracyOffsetPx = 1;
        var time = this._cursorTime(x);
        var leftTime = this._cursorTime(x - accurracyOffsetPx);
        var rightTime = this._cursorTime(x + accurracyOffsetPx);

        var left = this._markerIndexBeforeTime(leftTime);
        var markerIndex = -1;
        var distance = Infinity;
        for (var i = left; i < markers.length && markers[i].startTime() < rightTime; i++) {
            var nextDistance = Math.abs(markers[i].startTime() - time);
            if (nextDistance < distance) {
                markerIndex = i;
                distance = nextDistance;
            }
        }
        return markerIndex;
    },

    /**
     * @param {number} time
     * @return {number}
     */
    _markerIndexBeforeTime: function(time)
    {
        /**
         * @param {number} markerTimestamp
         * @param {!WebInspector.FlameChartMarker} marker
         * @return {number}
         */
        function comparator(markerTimestamp, marker)
        {
            return markerTimestamp - marker.startTime();
        }
        return this._timelineData().markers.lowerBound(time, comparator);
    },

    /**
     * @param {number} height
     * @param {number} width
     */
    _draw: function(width, height)
    {
        var timelineData = this._timelineData();
        if (!timelineData)
            return;

        var context = this._canvas.getContext("2d");
        context.save();
        var ratio = window.devicePixelRatio;
        context.scale(ratio, ratio);
        context.translate(0, -this._scrollTop);
        context.font = "11px " + WebInspector.fontFamily();

        var timeWindowRight = this._timeWindowRight;
        var timeWindowLeft = this._timeWindowLeft - this._paddingLeft / this._timeToPixel;
        var entryTotalTimes = timelineData.entryTotalTimes;
        var entryStartTimes = timelineData.entryStartTimes;
        var entryLevels = timelineData.entryLevels;

        var titleIndices = new Uint32Array(entryTotalTimes.length);
        var nextTitleIndex = 0;
        var markerIndices = new Uint32Array(entryTotalTimes.length);
        var nextMarkerIndex = 0;
        var textPadding = this._dataProvider.textPadding();
        var minTextWidth = 2 * textPadding + this._measureWidth(context, "\u2026");
        var barHeight = this._barHeight;
        var top = this._scrollTop;
        var minVisibleBarLevel = Math.max(this._visibleLevelOffsets.upperBound(top) - 1, 0);

        function comparator(time, entryIndex)
        {
            return time - entryStartTimes[entryIndex];
        }

        var colorBuckets = {};
        for (var level = minVisibleBarLevel; level < this._dataProvider.maxStackDepth(); ++level) {
            if (this._levelToHeight(level) > top + height)
                break;
            if (!this._visibleLevels[level])
                continue;

            // Entries are ordered by start time within a level, so find the last visible entry.
            var levelIndexes = this._timelineLevels[level];
            var rightIndexOnLevel = levelIndexes.lowerBound(timeWindowRight, comparator) - 1;
            var lastDrawOffset = Infinity;
            for (var entryIndexOnLevel = rightIndexOnLevel; entryIndexOnLevel >= 0; --entryIndexOnLevel) {
                var entryIndex = levelIndexes[entryIndexOnLevel];
                var entryStartTime = entryStartTimes[entryIndex];
                var entryOffsetRight = entryStartTime + (isNaN(entryTotalTimes[entryIndex]) ? 0 : entryTotalTimes[entryIndex]);
                if (entryOffsetRight <= timeWindowLeft)
                    break;

                var barX = this._timeToPositionClipped(entryStartTime);
                // Check if the entry entirely fits into an already drawn pixel, we can just skip drawing it.
                if (barX >= lastDrawOffset)
                    continue;
                lastDrawOffset = barX;

                var color = this._dataProvider.entryColor(entryIndex);
                var bucket = colorBuckets[color];
                if (!bucket) {
                    bucket = [];
                    colorBuckets[color] = bucket;
                }
                bucket.push(entryIndex);
            }
        }

        var colors = Object.keys(colorBuckets);
        // We don't use for-in here because it couldn't be optimized.
        for (var c = 0; c < colors.length; ++c) {
            var color = colors[c];
            context.fillStyle = color;
            context.strokeStyle = color;
            var indexes = colorBuckets[color];

            // First fill the boxes.
            context.beginPath();
            for (var i = 0; i < indexes.length; ++i) {
                var entryIndex = indexes[i];
                var entryStartTime = entryStartTimes[entryIndex];
                var barX = this._timeToPositionClipped(entryStartTime);
                var barRight = this._timeToPositionClipped(entryStartTime + entryTotalTimes[entryIndex]);
                var barWidth = Math.max(barRight - barX, 1);
                var barLevel = entryLevels[entryIndex];
                var barY = this._levelToHeight(barLevel);
                if (isNaN(entryTotalTimes[entryIndex])) {
                    context.moveTo(barX + this._markerRadius, barY + barHeight / 2);
                    context.arc(barX, barY + barHeight / 2, this._markerRadius, 0, Math.PI * 2);
                    markerIndices[nextMarkerIndex++] = entryIndex;
                } else {
                    context.rect(barX, barY, barWidth - 0.4, barHeight - 1);
                    if (barWidth > minTextWidth || this._dataProvider.forceDecoration(entryIndex))
                        titleIndices[nextTitleIndex++] = entryIndex;
                }
            }
            context.fill();
        }

        context.strokeStyle = "rgba(0, 0, 0, 0.2)";
        context.beginPath();
        for (var m = 0; m < nextMarkerIndex; ++m) {
            var entryIndex = markerIndices[m];
            var entryStartTime = entryStartTimes[entryIndex];
            var barX = this._timeToPositionClipped(entryStartTime);
            var barLevel = entryLevels[entryIndex];
            var barY = this._levelToHeight(barLevel);
            context.moveTo(barX + this._markerRadius, barY + barHeight / 2);
            context.arc(barX, barY + barHeight / 2, this._markerRadius, 0, Math.PI * 2);
        }
        context.stroke();

        context.textBaseline = "alphabetic";
        var textBaseHeight = this._barHeight - this._dataProvider.textBaseline();

        for (var i = 0; i < nextTitleIndex; ++i) {
            var entryIndex = titleIndices[i];
            var entryStartTime = entryStartTimes[entryIndex];
            var barX = this._timeToPositionClipped(entryStartTime);
            var barRight = Math.min(this._timeToPositionClipped(entryStartTime + entryTotalTimes[entryIndex]), width) + 1;
            var barWidth = barRight - barX;
            var barLevel = entryLevels[entryIndex];
            var barY = this._levelToHeight(barLevel);
            var text = this._dataProvider.entryTitle(entryIndex);
            if (text && text.length) {
                context.font = this._dataProvider.entryFont(entryIndex);
                text = this._prepareText(context, text, barWidth - 2 * textPadding);
            }
            var unclippedBarX = this._timeToPosition(entryStartTime);
            if (this._dataProvider.decorateEntry(entryIndex, context, text, barX, barY, barWidth, barHeight, unclippedBarX, this._timeToPixel))
                continue;
            if (!text || !text.length)
                continue;
            context.fillStyle = this._dataProvider.textColor(entryIndex);
            context.fillText(text, barX + textPadding, barY + textBaseHeight);
        }

        this._drawFlowEvents(context, width, height);

        context.restore();

        var offsets = this._dataProvider.dividerOffsets(this._calculator.minimumBoundary(), this._calculator.maximumBoundary());
        WebInspector.TimelineGrid.drawCanvasGrid(this._canvas, this._calculator, offsets);
        this._drawMarkers();
        this._drawGroupHeaders(width, height);

        this._updateElementPosition(this._highlightElement, this._highlightedEntryIndex);
        this._updateElementPosition(this._selectedElement, this._selectedEntryIndex);
        this._updateMarkerHighlight();
        this._updateRangeSelectionOverlay();
    },

    /**
     * @param {number} width
     * @param {number} height
     */
    _drawGroupHeaders: function(width, height)
    {
        var context = this._canvas.getContext("2d");
        var top = this._scrollTop;
        var ratio = window.devicePixelRatio;
        var barHeight = this._barHeight;
        var textBaseHeight = barHeight - this._dataProvider.textBaseline();
        var groups = this._rawTimelineData.groups || [];
        if (!groups.length)
            return;

        var groupOffsets = this._groupOffsets;
        var lastGroupOffset = Array.prototype.peekLast.call(groupOffsets);
        var colorUsage = WebInspector.ThemeSupport.ColorUsage;

        context.save();
        context.scale(ratio, ratio);
        context.translate(0, -top);

        context.fillStyle = WebInspector.themeSupport.patchColor("#eee", colorUsage.Background);
        forEachGroup.call(this, (offset, index, group) => {
            var paddingHeight = group.style.padding;
            if (paddingHeight < 5)
                return;
            context.fillRect(0, offset - paddingHeight + 2, width, paddingHeight - 4);
        });
        if (groups.length && lastGroupOffset < top + height)
            context.fillRect(0, lastGroupOffset + 2, width, top + height - lastGroupOffset);

        context.strokeStyle = WebInspector.themeSupport.patchColor("#bbb", colorUsage.Background);
        context.beginPath();
        forEachGroup.call(this, (offset, index, group, isFirst) => {
            if (isFirst || group.style.padding < 4)
                return;
            hLine(offset - 2.5);
        });
        hLine(lastGroupOffset + 0.5);
        context.stroke();

        forEachGroup.call(this, (offset, index, group) => {
            if (group.style.useFirstLineForOverview)
                return;
            if (!this._isGroupCollapsible(index) || group.expanded) {
                if (!group.style.shareHeaderLine) {
                    context.fillStyle = group.style.backgroundColor;
                    context.fillRect(0, offset, width, group.style.height);
                }
                return;
            }
            var nextGroup = index + 1;
            while (nextGroup < groups.length && groups[nextGroup].style.nestingLevel > group.style.nestingLevel)
                nextGroup++;
            var endLevel = nextGroup < groups.length ? groups[nextGroup].startLevel : this._dataProvider.maxStackDepth();
            this._drawCollapsedOverviewForGroup(offset + 1, group.startLevel, endLevel);
        });

        context.save();
        forEachGroup.call(this, (offset, index, group) => {
            context.font = group.style.font;
            if (this._isGroupCollapsible(index) && !group.expanded || group.style.shareHeaderLine) {
                var width = this._labelWidthForGroup(context, group);
                context.fillStyle = WebInspector.Color.parse(group.style.backgroundColor).setAlpha(0.7).asString(null);
                context.fillRect(this._headerLeftPadding - this._headerLabelXPadding, offset + this._headerLabelYPadding, width, barHeight - 2 * this._headerLabelYPadding);
            }
            context.fillStyle = group.style.color;
            context.fillText(group.name, Math.floor(this._expansionArrowIndent * (group.style.nestingLevel + 1) + this._arrowSide), offset + textBaseHeight);
        });
        context.restore();

        context.fillStyle = WebInspector.themeSupport.patchColor("#6e6e6e", colorUsage.Foreground);
        context.beginPath();
        forEachGroup.call(this, (offset, index, group) => {
            if (this._isGroupCollapsible(index))
                drawExpansionArrow.call(this, this._expansionArrowIndent * (group.style.nestingLevel + 1), offset + textBaseHeight - this._arrowSide / 2, !!group.expanded);
        });
        context.fill();

        context.strokeStyle = WebInspector.themeSupport.patchColor("#ddd", colorUsage.Background);
        context.beginPath();
        context.stroke();

        context.restore();

        /**
         * @param {number} y
         */
        function hLine(y)
        {
            context.moveTo(0, y);
            context.lineTo(width, y);
        }

        /**
         * @param {number} x
         * @param {number} y
         * @param {boolean} expanded
         * @this {WebInspector.FlameChart}
         */
        function drawExpansionArrow(x, y, expanded)
        {
            var arrowHeight = this._arrowSide * Math.sqrt(3) / 2;
            var arrowCenterOffset = Math.round(arrowHeight / 2);
            context.save();
            context.translate(x, y);
            context.rotate(expanded ? Math.PI / 2 : 0);
            context.moveTo(-arrowCenterOffset, -this._arrowSide / 2);
            context.lineTo(-arrowCenterOffset, this._arrowSide / 2);
            context.lineTo(arrowHeight - arrowCenterOffset, 0);
            context.restore();
        }

        /**
         * @param {function(number, number, !WebInspector.FlameChart.Group, boolean)} callback
         * @this {WebInspector.FlameChart}
         */
        function forEachGroup(callback)
        {
            /** @type !Array<{nestingLevel: number, visible: boolean}> */
            var groupStack = [{nestingLevel: -1, visible: true}];
            for (var i = 0; i < groups.length; ++i) {
                var groupTop = groupOffsets[i];
                var group = groups[i];
                if (groupTop - group.style.padding > top + height)
                    break;
                var firstGroup = true;
                while (groupStack.peekLast().nestingLevel >= group.style.nestingLevel) {
                    groupStack.pop();
                    firstGroup = false;
                }
                var parentGroupVisible = groupStack.peekLast().visible;
                var thisGroupVisible = parentGroupVisible && (!this._isGroupCollapsible(i) || group.expanded);
                groupStack.push({nestingLevel: group.style.nestingLevel, visible: thisGroupVisible});
                if (!parentGroupVisible || groupTop + group.style.height < top)
                    continue;
                callback(groupTop, i, group, firstGroup);
            }
        }
    },

    /**
     * @param {!CanvasRenderingContext2D} context
     * @param {!WebInspector.FlameChart.Group} group
     * @return {number}
     */
    _labelWidthForGroup: function(context, group)
    {
        return this._measureWidth(context, group.name) + this._expansionArrowIndent * (group.style.nestingLevel + 1) + 2 * this._headerLabelXPadding;
    },

    /**
     * @param {number} y
     * @param {number} startLevel
     * @param {number} endLevel
     */
    _drawCollapsedOverviewForGroup: function(y, startLevel, endLevel)
    {
        var range = new WebInspector.SegmentedRange(mergeCallback);
        var timeWindowRight = this._timeWindowRight;
        var timeWindowLeft = this._timeWindowLeft - this._paddingLeft / this._timeToPixel;
        var context = this._canvas.getContext("2d");
        var barHeight = this._barHeight - 2;
        var entryStartTimes = this._rawTimelineData.entryStartTimes;
        var entryTotalTimes = this._rawTimelineData.entryTotalTimes;

        for (var level = startLevel; level < endLevel; ++level) {
            var levelIndexes = this._timelineLevels[level];
            var rightIndexOnLevel = levelIndexes.lowerBound(timeWindowRight, (time, entryIndex) => time - entryStartTimes[entryIndex]) - 1;
            var lastDrawOffset = Infinity;

            for (var entryIndexOnLevel = rightIndexOnLevel; entryIndexOnLevel >= 0; --entryIndexOnLevel) {
                var entryIndex = levelIndexes[entryIndexOnLevel];
                var entryStartTime = entryStartTimes[entryIndex];
                var startPosition = this._timeToPositionClipped(entryStartTime);
                var entryEndTime = entryStartTime + entryTotalTimes[entryIndex];
                if (isNaN(entryEndTime) || startPosition >= lastDrawOffset)
                    continue;
                if (entryEndTime <= timeWindowLeft)
                    break;
                lastDrawOffset = startPosition;
                var color = this._dataProvider.entryColor(entryIndex);
                range.append(new WebInspector.Segment(startPosition, this._timeToPositionClipped(entryEndTime), color));
            }
        }

        var segments = range.segments().slice().sort((a, b) => a.data.localeCompare(b.data));
        var lastColor;
        context.beginPath();
        for (var i = 0; i < segments.length; ++i) {
            var segment = segments[i];
            if (lastColor !== segments[i].data) {
                context.fill();
                context.beginPath();
                lastColor = segments[i].data;
                context.fillStyle = lastColor;
            }
            context.rect(segment.begin, y, segment.end - segment.begin, barHeight);
        }
        context.fill();

        /**
         * @param {!WebInspector.Segment} a
         * @param {!WebInspector.Segment} b
         * @return {?WebInspector.Segment}
         */
        function mergeCallback(a, b)
        {
            return a.data === b.data && a.end + 0.4 > b.end ? a : null;
        }
    },

    /**
     * @param {!CanvasRenderingContext2D} context
     * @param {number} height
     * @param {number} width
     */
    _drawFlowEvents: function(context, width, height)
    {
        var timelineData = this._timelineData();
        var timeWindowRight = this._timeWindowRight;
        var timeWindowLeft = this._timeWindowLeft;
        var flowStartTimes = timelineData.flowStartTimes;
        var flowEndTimes = timelineData.flowEndTimes;
        var flowStartLevels = timelineData.flowStartLevels;
        var flowEndLevels = timelineData.flowEndLevels;
        var flowCount = flowStartTimes.length;
        var endIndex = flowStartTimes.lowerBound(timeWindowRight);

        var color = [];
        var fadeColorsCount = 8;
        for (var i = 0; i <= fadeColorsCount; ++i)
            color[i] = "rgba(128, 0, 0, " + i / fadeColorsCount + ")";
        var fadeColorsRange = color.length;
        var minimumFlowDistancePx = 15;
        var flowArcHeight = 4 * this._barHeight;
        var colorIndex = 0;
        context.lineWidth = 0.5;
        for (var i = 0; i < endIndex; ++i) {
            if (flowEndTimes[i] < timeWindowLeft)
                continue;
            var startX = this._timeToPosition(flowStartTimes[i]);
            var endX = this._timeToPosition(flowEndTimes[i]);
            if (endX - startX < minimumFlowDistancePx)
                continue;
            if (startX < -minimumFlowDistancePx && endX > width + minimumFlowDistancePx)
                continue;
            // Assign a trasparent color if the flow is small enough or if the previous color was a transparent color.
            if (endX - startX < minimumFlowDistancePx + fadeColorsRange || colorIndex !== color.length - 1) {
                colorIndex = Math.min(fadeColorsRange - 1, Math.floor(endX - startX - minimumFlowDistancePx));
                context.strokeStyle = color[colorIndex];
            }
            var startY = this._levelToHeight(flowStartLevels[i]) + this._barHeight;
            var endY = this._levelToHeight(flowEndLevels[i]);
            context.beginPath();
            context.moveTo(startX, startY);
            var arcHeight = Math.max(Math.sqrt(Math.abs(startY - endY)), flowArcHeight) + 5;
            context.bezierCurveTo(startX, startY + arcHeight,
                                  endX, endY + arcHeight,
                                  endX, endY + this._barHeight);
            context.stroke();
        }
    },

    _drawMarkers: function()
    {
        var markers = this._timelineData().markers;
        var left = this._markerIndexBeforeTime(this._calculator.minimumBoundary());
        var rightBoundary = this._calculator.maximumBoundary();

        var context = this._canvas.getContext("2d");
        context.save();
        var ratio = window.devicePixelRatio;
        context.scale(ratio, ratio);
        var height = WebInspector.FlameChart.DividersBarHeight - 1;
        for (var i = left; i < markers.length; i++) {
            var timestamp = markers[i].startTime();
            if (timestamp > rightBoundary)
                break;
            markers[i].draw(context, this._calculator.computePosition(timestamp), height, this._timeToPixel);
        }
        context.restore();
    },

    _updateMarkerHighlight: function()
    {
        var element = this._markerHighlighElement;
        if (element.parentElement)
            element.remove();
        var markerIndex = this._highlightedMarkerIndex;
        if (markerIndex === -1)
            return;
        var marker = this._timelineData().markers[markerIndex];
        var barX = this._timeToPositionClipped(marker.startTime());
        element.title = marker.title();
        var style = element.style;
        style.left = barX + "px";
        style.backgroundColor = marker.color();
        this.contentElement.appendChild(element);
    },

    /**
     * @param {?WebInspector.FlameChart.TimelineData} timelineData
     */
    _processTimelineData: function(timelineData)
    {
        if (!timelineData) {
            this._timelineLevels = null;
            this._visibleLevelOffsets = null;
            this._visibleLevels = null;
            this._groupOffsets = null;
            this._rawTimelineData = null;
            this._rawTimelineDataLength = 0;
            return;
        }

        this._rawTimelineData = timelineData;
        this._rawTimelineDataLength = timelineData.entryStartTimes.length;

        var entryCounters = new Uint32Array(this._dataProvider.maxStackDepth() + 1);
        for (var i = 0; i < timelineData.entryLevels.length; ++i)
            ++entryCounters[timelineData.entryLevels[i]];
        var levelIndexes = new Array(entryCounters.length);
        for (var i = 0; i < levelIndexes.length; ++i) {
            levelIndexes[i] = new Uint32Array(entryCounters[i]);
            entryCounters[i] = 0;
        }
        for (var i = 0; i < timelineData.entryLevels.length; ++i) {
            var level = timelineData.entryLevels[i];
            levelIndexes[level][entryCounters[level]++] = i;
        }
        this._timelineLevels = levelIndexes;
        var groups = this._rawTimelineData.groups || [];
        for (var i = 0; i < groups.length; ++i) {
            var expanded = this._groupExpansionState[groups[i].name];
            if (expanded !== undefined)
                groups[i].expanded = expanded;
        }
        this._updateLevelPositions();
    },

    _updateLevelPositions: function()
    {
        var levelCount = this._dataProvider.maxStackDepth();
        var groups = this._rawTimelineData.groups || [];
        this._visibleLevelOffsets = new Uint32Array(levelCount + 1);
        this._visibleLevels = new Uint16Array(levelCount);
        this._groupOffsets = new Uint32Array(groups.length + 1);

        var groupIndex = -1;
        var currentOffset = WebInspector.FlameChart.DividersBarHeight;
        var visible = true;
        /** @type !Array<{nestingLevel: number, visible: boolean}> */
        var groupStack = [{nestingLevel: -1, visible: true}];
        for (var level = 0; level < levelCount; ++level) {
            while (groupIndex < groups.length - 1 && level === groups[groupIndex + 1].startLevel) {
                ++groupIndex;
                var style = groups[groupIndex].style;
                var nextLevel = true;
                while (groupStack.peekLast().nestingLevel >= style.nestingLevel) {
                    groupStack.pop();
                    nextLevel = false;
                }
                var thisGroupIsVisible = groupIndex >= 0 && this._isGroupCollapsible(groupIndex) ? groups[groupIndex].expanded : true;
                var parentGroupIsVisible = groupStack.peekLast().visible;
                visible = thisGroupIsVisible && parentGroupIsVisible;
                groupStack.push({nestingLevel: style.nestingLevel, visible: visible});
                if (parentGroupIsVisible)
                    currentOffset += nextLevel ? 0 : style.padding;
                this._groupOffsets[groupIndex] = currentOffset;
                if (parentGroupIsVisible && !style.shareHeaderLine)
                    currentOffset += style.height;
            }
            var isFirstOnLevel = groupIndex >= 0 && level === groups[groupIndex].startLevel;
            var thisLevelIsVisible = visible || isFirstOnLevel && groups[groupIndex].style.useFirstLineForOverview;
            this._visibleLevels[level] = thisLevelIsVisible;
            this._visibleLevelOffsets[level] = currentOffset;
            if (thisLevelIsVisible || (parentGroupIsVisible && style.shareHeaderLine && isFirstOnLevel))
                currentOffset += this._barHeight;
        }
        if (groupIndex >= 0)
            this._groupOffsets[groupIndex + 1] = currentOffset;
        this._visibleLevelOffsets[level] = currentOffset;
    },

    /**
     * @param {number} index
     */
    _isGroupCollapsible: function(index)
    {
        var groups = this._rawTimelineData.groups || [];
        var style = groups[index].style;
        if (!style.shareHeaderLine || !style.collapsible)
            return !!style.collapsible;
        var isLastGroup = index + 1 >= groups.length;
        if (!isLastGroup && groups[index + 1].style.nestingLevel > style.nestingLevel)
            return true;
        var nextGroupLevel = isLastGroup ? this._dataProvider.maxStackDepth() : groups[index + 1].startLevel;
        // For groups that only have one line and share header line, pretend these are not collapsible.
        return nextGroupLevel !== groups[index].startLevel + 1;
    },

    /**
     * @param {number} entryIndex
     */
    setSelectedEntry: function(entryIndex)
    {
        if (entryIndex === -1 && !this._isDragging)
            this._hideRangeSelection();
        if (this._selectedEntryIndex === entryIndex)
            return;
        this._selectedEntryIndex = entryIndex;
        this._revealEntry(entryIndex);
        this._updateElementPosition(this._selectedElement, this._selectedEntryIndex);
    },

    /**
     * @param {!Element} element
     * @param {number} entryIndex
     */
    _updateElementPosition: function(element, entryIndex)
    {
        /** @const */ var elementMinWidth = 2;
        if (element.parentElement)
            element.remove();
        if (entryIndex === -1)
            return;
        var timeRange = this._dataProvider.highlightTimeRange(entryIndex);
        if (!timeRange)
            return;
        var timelineData = this._timelineData();
        var barX = this._timeToPositionClipped(timeRange.startTime);
        var barRight = this._timeToPositionClipped(timeRange.endTime);
        if (barRight === 0 || barX === this._offsetWidth)
            return;
        var barWidth = barRight - barX;
        var barCenter = barX + barWidth / 2;
        barWidth = Math.max(barWidth, elementMinWidth);
        barX = barCenter - barWidth / 2;
        var barY = this._levelToHeight(timelineData.entryLevels[entryIndex]) - this._scrollTop;
        var style = element.style;
        style.left = barX + "px";
        style.top = barY + "px";
        style.width = barWidth + "px";
        style.height = this._barHeight - 1 + "px";
        this.contentElement.appendChild(element);
    },

    /**
     * @param {number} time
     * @return {number}
     */
    _timeToPositionClipped: function(time)
    {
        return Number.constrain(this._timeToPosition(time), 0, this._offsetWidth);
    },

    /**
     * @param {number} time
     * @return {number}
     */
    _timeToPosition: function(time)
    {
        return Math.floor((time - this._minimumBoundary) * this._timeToPixel) - this._pixelWindowLeft + this._paddingLeft;
    },

    /**
     * @param {number} level
     * @return {number}
     */
    _levelToHeight: function(level)
    {
        return this._visibleLevelOffsets[level];
    },

    /**
     * @param {!CanvasRenderingContext2D} context
     * @param {string} text
     * @param {number} maxWidth
     * @return {string}
     */
    _prepareText: function(context, text, maxWidth)
    {
        var /** @const */ maxLength = 200;
        if (maxWidth <= 10)
            return "";
        if (text.length > maxLength)
            text = text.trimMiddle(maxLength);
        var textWidth = this._measureWidth(context, text);
        if (textWidth <= maxWidth)
            return text;

        var l = 0;
        var r = text.length;
        var lv = 0;
        var rv = textWidth;
        while (l < r && lv !== rv && lv !== maxWidth) {
            var m = Math.ceil(l + (r - l) * (maxWidth - lv) / (rv - lv));
            var mv = this._measureWidth(context, text.trimMiddle(m));
            if (mv <= maxWidth) {
                l = m;
                lv = mv;
            } else {
                r = m - 1;
                rv = mv;
            }
        }
        text = text.trimMiddle(l);
        return text !== "\u2026" ? text : "";
    },

    /**
     * @param {!CanvasRenderingContext2D} context
     * @param {string} text
     * @return {number}
     */
    _measureWidth: function(context, text)
    {
        var /** @const */ maxCacheableLength = 200;
        if (text.length > maxCacheableLength)
            return context.measureText(text).width;

        var font = context.font;
        var textWidths = this._textWidth.get(font);
        if (!textWidths) {
            textWidths = new Map();
            this._textWidth.set(font, textWidths);
        }
        var width = textWidths.get(text);
        if (!width) {
            width = context.measureText(text).width;
            textWidths.set(text, width);
        }
        return width;
    },

    _updateBoundaries: function()
    {
        this._totalTime = this._dataProvider.totalTime();
        this._minimumBoundary = this._dataProvider.minimumBoundary();

        var windowWidth = 1;
        if (this._timeWindowRight !== Infinity) {
            this._windowLeft = (this._timeWindowLeft - this._minimumBoundary) / this._totalTime;
            this._windowRight = (this._timeWindowRight - this._minimumBoundary) / this._totalTime;
            windowWidth = this._windowRight - this._windowLeft;
        } else if (this._timeWindowLeft === Infinity) {
            this._windowLeft = Infinity;
            this._windowRight = Infinity;
        } else {
            this._windowLeft = 0;
            this._windowRight = 1;
        }

        var totalPixels = Math.floor((this._offsetWidth - this._paddingLeft) / windowWidth);
        this._pixelWindowLeft = Math.floor(totalPixels * this._windowLeft);

        this._timeToPixel = totalPixels / this._totalTime;
        this._pixelToTime = this._totalTime / totalPixels;

        this._updateScrollBar();
    },

    _updateHeight: function()
    {
        this._totalHeight = this._levelToHeight(this._dataProvider.maxStackDepth());
        this._vScrollContent.style.height = this._totalHeight + "px";
        if (this._scrollTop + this._offsetHeight > this._totalHeight) {
            this._scrollTop = Math.max(0, this._totalHeight - this._offsetHeight);
            this._vScrollElement.scrollTop = this._scrollTop;
        }
    },

    onResize: function()
    {
        this._updateScrollBar();
        this._updateContentElementSize();
        this.scheduleUpdate();
    },

    _updateScrollBar: function()
    {
        var showScroll = this._totalHeight > this._offsetHeight;
        if (this._vScrollElement.classList.contains("hidden") === showScroll) {
            this._vScrollElement.classList.toggle("hidden", !showScroll);
            this._updateContentElementSize();
        }
    },

    _updateContentElementSize: function()
    {
        var offsetWidth = this._vScrollElement.offsetLeft;
        if (!offsetWidth)
            offsetWidth = this.contentElement.offsetWidth;
        this._offsetWidth = offsetWidth;
        this._offsetHeight = this.contentElement.offsetHeight;
    },

    _onScroll: function()
    {
        this._scrollTop = this._vScrollElement.scrollTop;
        this.scheduleUpdate();
    },

    scheduleUpdate: function()
    {
        if (this._updateTimerId || this._cancelWindowTimesAnimation)
            return;
        this._updateTimerId = this.element.window().requestAnimationFrame(this.update.bind(this));
    },

    update: function()
    {
        this._updateTimerId = 0;
        if (!this._timelineData())
            return;
        this._resetCanvas();
        this._updateHeight();
        this._updateBoundaries();
        this._calculator._updateBoundaries(this);
        this._draw(this._offsetWidth, this._offsetHeight);
        if (!this._isDragging)
            this._updateHighlight();
    },

    reset: function()
    {
        this._vScrollElement.scrollTop = 0;
        this._scrollTop = 0;
        this._highlightedMarkerIndex = -1;
        this._highlightedEntryIndex = -1;
        this._selectedEntryIndex = -1;
        this._rangeSelectionStart = 0;
        this._rangeSelectionEnd = 0;
        /** @type {!Map<string,!Map<string,number>>} */
        this._textWidth = new Map();
        this.update();
    },

    _enabled: function()
    {
        return this._rawTimelineDataLength !== 0;
    },

    __proto__: WebInspector.HBox.prototype
};

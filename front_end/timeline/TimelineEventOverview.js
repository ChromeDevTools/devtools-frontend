/*
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
 * @constructor
 * @extends {WebInspector.TimelineOverviewBase}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.TimelineEventOverview = function(model)
{
    WebInspector.TimelineOverviewBase.call(this, model);
    this.element.id = "timeline-overview-events";

    this._fillStyles = {};
    var categories = WebInspector.TimelineUIUtils.categories();
    for (var category in categories) {
        this._fillStyles[category] = WebInspector.TimelineUIUtils.createFillStyleForCategory(this._context, 0, WebInspector.TimelineEventOverview._stripGradientHeight, categories[category]);
        categories[category].addEventListener(WebInspector.TimelineCategory.Events.VisibilityChanged, this._onCategoryVisibilityChanged, this);
    }

    this._disabledCategoryFillStyle = WebInspector.TimelineUIUtils.createFillStyle(this._context, 0, WebInspector.TimelineEventOverview._stripGradientHeight,
        "hsl(0, 0%, 85%)", "hsl(0, 0%, 67%)", "hsl(0, 0%, 56%)");

    this._disabledCategoryBorderStyle = "rgb(143, 143, 143)";
}

/** @const */
WebInspector.TimelineEventOverview._numberOfStrips = 3;

/** @const */
WebInspector.TimelineEventOverview._stripGradientHeight = 120;

/**
 * @constructor
 * @template T
 */
WebInspector.Dithering = function()
{
    /** @type {!Map.<?T,number>} */
    this._groupError = new Map();
    this._position = 0;
    this._lastReportedPosition = 0;
}

WebInspector.Dithering.prototype = {
    /**
     * @param {!T} group
     * @param {number} start
     * @param {number} end
     * @return {?{start: number, end: number}}
     * @template T
     */
    appendInterval: function(group, start, end)
    {
        this._innerAppend(null, start); // Append an empty space before.
        return this._innerAppend(group, end); // Append the interval itself.
    },

    /**
     * @param {?T} group
     * @param {number} position
     * @return {?{start: number, end: number}}
     * @template T
     */
    _innerAppend: function(group, position)
    {
        if (position < this._position)
            return null;
        var result = null;
        var length = position - this._position;
        length += this._groupError.get(group) || 0;
        if (length >= 1) {
            if (!group)
                length -= this._distributeExtraAmount(length - 1);
            var newReportedPosition = this._lastReportedPosition + Math.floor(length);
            result = { start: this._lastReportedPosition, end: newReportedPosition };
            this._lastReportedPosition = newReportedPosition;
            length %= 1;
        }
        this._groupError.set(group, length);
        this._position = position;
        return result;
    },

    /**
     * @param {number} amount
     * @return {number}
     */
    _distributeExtraAmount: function(amount)
    {
        var canConsume = 0;
        for (var g of this._groupError.keys()) {
            if (g)
                canConsume += 1 - this._groupError.get(g);
        }
        var toDistribute = Math.min(amount, canConsume);
        if (toDistribute <= 0)
            return 0;
        var ratio = toDistribute / canConsume;
        for (var g of this._groupError.keys()) {
            if (!g)
                continue;
            var value = this._groupError.get(g);
            value += (1 - value) * ratio;
            this._groupError.set(g, value);
        }
        return toDistribute;
    }
}

WebInspector.TimelineEventOverview.prototype = {
    /**
     * @override
     */
    dispose: function()
    {
        var categories = WebInspector.TimelineUIUtils.categories();
        for (var category in categories)
            categories[category].removeEventListener(WebInspector.TimelineCategory.Events.VisibilityChanged, this._onCategoryVisibilityChanged, this);
    },

    /**
     * @override
     */
    update: function()
    {
        this.resetCanvas();

        var stripHeight = Math.round(this._canvas.height  / WebInspector.TimelineEventOverview._numberOfStrips);
        var timeOffset = this._model.minimumRecordTime();
        var timeSpan = this._model.maximumRecordTime() - timeOffset;
        var scale = this._canvas.width / timeSpan;

        var categories = WebInspector.TimelineUIUtils.categories();
        var ditherers = new Map();
        for (var category in categories)
            ditherers.set(categories[category].overviewStripGroupIndex, new WebInspector.Dithering());

        this._context.fillStyle = "rgba(0, 0, 0, 0.05)";
        for (var i = 1; i < WebInspector.TimelineEventOverview._numberOfStrips; i += 2)
            this._context.fillRect(0, i * stripHeight, this._canvas.width, stripHeight);

        /**
         * @param {!WebInspector.TimelineModel.Record} record
         * @this {WebInspector.TimelineEventOverview}
         */
        function appendRecord(record)
        {
            if (record.type() === WebInspector.TimelineModel.RecordType.BeginFrame)
                return;
            var recordStart = (record.startTime() - timeOffset) * scale;
            var recordEnd = (record.endTime() - timeOffset) * scale;
            var category = WebInspector.TimelineUIUtils.categoryForRecord(record);
            if (category.overviewStripGroupIndex < 0)
                return;
            var bar = ditherers.get(category.overviewStripGroupIndex).appendInterval(category, recordStart, recordEnd);
            if (bar)
                this._renderBar(bar.start, bar.end, stripHeight, category);
        }
        this._model.forAllRecords(appendRecord.bind(this));
    },

    _onCategoryVisibilityChanged: function()
    {
        this.update();
    },

    /**
     * @param {number} begin
     * @param {number} end
     * @param {number} height
     * @param {!WebInspector.TimelineCategory} category
     */
    _renderBar: function(begin, end, height, category)
    {
        const stripPadding = 4 * window.devicePixelRatio;
        const innerStripHeight = height - 2 * stripPadding;

        var x = begin;
        var y = category.overviewStripGroupIndex * height + stripPadding + 0.5;
        var width = Math.max(end - begin, 1);

        this._context.save();
        this._context.translate(x, y);
        this._context.beginPath();
        this._context.scale(1, innerStripHeight / WebInspector.TimelineEventOverview._stripGradientHeight);
        this._context.fillStyle = category.hidden ? this._disabledCategoryFillStyle : this._fillStyles[category.name];
        this._context.fillRect(0, 0, width, WebInspector.TimelineEventOverview._stripGradientHeight);
        this._context.strokeStyle = category.hidden ? this._disabledCategoryBorderStyle : category.borderColor;
        this._context.moveTo(0, 0);
        this._context.lineTo(width, 0);
        this._context.moveTo(0, WebInspector.TimelineEventOverview._stripGradientHeight);
        this._context.lineTo(width, WebInspector.TimelineEventOverview._stripGradientHeight);
        this._context.stroke();
        this._context.restore();
    },

    __proto__: WebInspector.TimelineOverviewBase.prototype
}

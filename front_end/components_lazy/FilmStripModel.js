/*
 * Copyright 2015 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @param {!WebInspector.TracingModel} tracingModel
 * @param {number=} zeroTime
 */
WebInspector.FilmStripModel = function(tracingModel, zeroTime)
{
    this.reset(tracingModel, zeroTime);
}

WebInspector.FilmStripModel._category = "disabled-by-default-devtools.screenshot";

WebInspector.FilmStripModel.TraceEvents = {
    CaptureFrame: "CaptureFrame",
    Screenshot: "Screenshot"
}

WebInspector.FilmStripModel.prototype = {
    /**
     * @param {!WebInspector.TracingModel} tracingModel
     * @param {number=} zeroTime
     */
    reset: function(tracingModel, zeroTime)
    {
        this._zeroTime = zeroTime || tracingModel.minimumRecordTime();
        this._spanTime = tracingModel.maximumRecordTime() - this._zeroTime;

        /** @type {!Array<!WebInspector.FilmStripModel.Frame>} */
        this._frames = [];
        var browserMain = WebInspector.TracingModel.browserMainThread(tracingModel);
        if (!browserMain)
            return;

        var events = browserMain.events();
        for (var i = 0; i < events.length; ++i) {
            var event = events[i];
            if (event.startTime < this._zeroTime)
                continue;
            if (!event.hasCategory(WebInspector.FilmStripModel._category))
                continue;
            if (event.name === WebInspector.FilmStripModel.TraceEvents.CaptureFrame) {
                var data = event.args["data"];
                if (data)
                    this._frames.push(WebInspector.FilmStripModel.Frame._fromEvent(this, event, this._frames.length));
            } else if (event.name === WebInspector.FilmStripModel.TraceEvents.Screenshot) {
                this._frames.push(WebInspector.FilmStripModel.Frame._fromSnapshot(this, /** @type {!WebInspector.TracingModel.ObjectSnapshot} */ (event), this._frames.length));
            }
        }
    },

    /**
     * @return {!Array<!WebInspector.FilmStripModel.Frame>}
     */
    frames: function()
    {
        return this._frames;
    },

    /**
     * @return {number}
     */
    zeroTime: function()
    {
        return this._zeroTime;
    },

    /**
     * @return {number}
     */
    spanTime: function()
    {
        return this._spanTime;
    },

    /**
     * @param {number} timestamp
     * @return {?WebInspector.FilmStripModel.Frame}
     */
    frameByTimestamp: function(timestamp)
    {
        var index = this._frames.upperBound(timestamp, (timestamp, frame) => timestamp - frame.timestamp) - 1;
        return index >= 0 ? this._frames[index] : null;
    }
}

/**
 * @constructor
 * @param {!WebInspector.FilmStripModel} model
 * @param {number} timestamp
 * @param {number} index
 */
WebInspector.FilmStripModel.Frame = function(model, timestamp, index)
{
    this._model = model;
    this.timestamp = timestamp;
    this.index = index;
    /** @type {?string} */
    this._imageData = null;
    /** @type {?WebInspector.TracingModel.ObjectSnapshot} */
    this._snapshot = null;
}

/**
 * @param {!WebInspector.FilmStripModel} model
 * @param {!WebInspector.TracingModel.Event} event
 * @param {number} index
 * @return {!WebInspector.FilmStripModel.Frame}
 */
WebInspector.FilmStripModel.Frame._fromEvent = function(model, event, index)
{
    var frame = new WebInspector.FilmStripModel.Frame(model, event.startTime, index);
    frame._imageData = event.args["data"];
    return frame;
}

/**
 * @param {!WebInspector.FilmStripModel} model
 * @param {!WebInspector.TracingModel.ObjectSnapshot} snapshot
 * @param {number} index
 * @return {!WebInspector.FilmStripModel.Frame}
 */
WebInspector.FilmStripModel.Frame._fromSnapshot = function(model, snapshot, index)
{
    var frame = new WebInspector.FilmStripModel.Frame(model, snapshot.startTime, index);
    frame._snapshot = snapshot;
    return frame;
}

WebInspector.FilmStripModel.Frame.prototype = {
    /**
     * @return {!WebInspector.FilmStripModel}
     */
    model: function()
    {
        return this._model;
    },

    /**
     * @return {!Promise<?string>}
     */
    imageDataPromise: function()
    {
        if (this._imageData || !this._snapshot)
            return Promise.resolve(this._imageData);

        return /** @type {!Promise<?string>} */ (this._snapshot.objectPromise());
    }
}

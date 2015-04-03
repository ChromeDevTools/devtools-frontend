// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.HBox}
 * @implements {WebInspector.TargetManager.Observer}
 * @implements {WebInspector.TracingManagerClient}
 * @param {!WebInspector.NetworkTimeCalculator} calculator
 */
WebInspector.NetworkFilmStripView = function(calculator)
{
    WebInspector.HBox.call(this, true);
    this.registerRequiredCSS("network/networkFilmStripView.css");
    this.element.classList.add("network-film-strip-view");
    this.contentElement.classList.add("shadow-network-film-strip-view");

    /** @type {!WebInspector.NetworkTimeCalculator} */
    this._calculator = calculator;
    /** @type {?number} */
    this._timeOffset = null;
    /** @type {!Array.<!WebInspector.NetworkFilmStripFrame>} */
    this._frames = [];
    /** @type {?WebInspector.NetworkFilmStripFrame} */
    this._selectedFrame = null;
    /** @type {?WebInspector.Target} */
    this._target = null;
    /** @type {boolean} */
    this._recording = false;
    /** @type {?number} */
    this._loadTime = null;
    /** @type {?number} */
    this._dclTime = null;
    /** @type {boolean} */
    this._scrolling = false;

    /** @type {?WebInspector.TracingModel} */
    this._tracingModel = null;

    this._label = this.contentElement.createChild("div", "label");
    this._label.createChild("div", "spinner");
    this._label.createTextChild(WebInspector.UIString("Recording..."));

    WebInspector.targetManager.observeTargets(this);
    WebInspector.targetManager.addModelListener(WebInspector.ResourceTreeModel, WebInspector.ResourceTreeModel.EventTypes.Load, this._loadEventFired, this);
    WebInspector.targetManager.addModelListener(WebInspector.ResourceTreeModel, WebInspector.ResourceTreeModel.EventTypes.DOMContentLoaded, this._dclEventFired, this);
}

WebInspector.NetworkFilmStripView._maximumFrameCount = 60;

WebInspector.NetworkFilmStripView.Events = {
    FrameSelected: "FrameSelected",
    RecordingFinished: "RecordingFinished"
}

WebInspector.NetworkFilmStripView.prototype = {
    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        if (this._target)
            return;
        this._target = target;
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        if (this._target === target && this._recording) {
            this._label.textContent = WebInspector.UIString("Detached.");
            this._recording = false;
            this.dispatchEventToListeners(WebInspector.NetworkFilmStripView.Events.RecordingFinished);
            this._unsubscribe();
        }
    },

    /**
     * @override
     */
    tracingStarted: function() { },

    /**
     * @override
     * @param {!Array.<!WebInspector.TracingManager.EventPayload>} events
     */
    traceEventsCollected: function(events)
    {
        if (this._tracingModel)
            this._tracingModel.addEvents(events);
    },

    /**
     * @override
     */
    tracingComplete: function()
    {
        if (!this._tracingModel)
            return;
        this._tracingModel.tracingComplete();

        var frames = [];
        var browserProcess = this._tracingModel.processByName("Browser");
        if (browserProcess) {
            var mainThread = browserProcess.threadByName("CrBrowserMain");
            if (mainThread) {
                var events = mainThread.events();
                for (var i = 0; i < events.length; ++i) {
                    if (events[i].category === "disabled-by-default-devtools.screenshot" && events[i].name === "CaptureFrame") {
                        var data = events[i].args.data;
                        var timestamp = events[i].startTime / 1000.0;
                        this._appendEventDividers(timestamp, frames);
                        if (data)
                            frames.push(new WebInspector.NetworkFilmStripFrame(this, data, timestamp));
                    }
                }
            }
        }
        this._appendEventDividers(Number.MAX_VALUE, frames);
        this._unsubscribe();

        if (!frames.length) {
            this._label.textContent = WebInspector.UIString("No frames recorded.");
            return;
        }
        this._label.remove();

        for (var i = 0; i < frames.length; ++i)
            frames[i].show(this.contentElement);
        this._frames = frames;
        this._updateTimeOffset(true);
    },

    /**
     * @override
     */
    tracingBufferUsage: function() { },

    /**
     * @override
     * @param {number} progress
     */
    eventsRetrievalProgress: function(progress) { },

    /**
     * @return {boolean}
     */
    recording: function()
    {
        return this._recording;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _loadEventFired: function(event)
    {
        this._loadTime = /** @type {number} */ (event.data);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _dclEventFired: function(event)
    {
        this._dclTime = /** @type {number} */ (event.data);
    },

    /**
     * @param {number} time
     */
    selectFrame: function(time)
    {
        var frames = this._frames;
        var frameCount = frames.length;
        if (!frameCount)
            return;
        var selectedFrame = frames[frameCount - 1];
        for (var i = frameCount - 2; i >= 0; --i) {
            var frame = frames[i];
            if (time < frame.timestamp())
                selectedFrame = frame;
        }
        this._selectFrame(selectedFrame, true);
    },

    _unsubscribe: function()
    {
        if (this._tracingModel) {
            this._tracingModel.reset();
            this._tracingModel = null;
        }
        WebInspector.targetManager.unobserveTargets(this);
        this._target = null;
    },

    /**
     * @override
     */
    wasShown: function()
    {
        this._calculator.addEventListener(WebInspector.NetworkTimeCalculator.Events.BoundariesChanged, this._onTimeOffsetChanged, this);
        this._updateTimeOffset();
    },

    /**
     * @override
     */
    willHide: function()
    {
        this._calculator.removeEventListener(WebInspector.NetworkTimeCalculator.Events.BoundariesChanged, this._onTimeOffsetChanged, this);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onTimeOffsetChanged: function(event)
    {
        this._updateTimeOffset();
    },

    /**
     * @param {boolean=} force
     */
    _updateTimeOffset: function(force)
    {
        var offset = this._calculator.zeroTime();
        if (offset === this._timeOffset && !force)
            return;
        this._timeOffset = offset;
        for (var i = 0; i < this._frames.length; ++i)
            this._frames[i]._setTimeOffset(offset);
    },

    /**
     * @param {number} time
     * @param {!Array.<!WebInspector.NetworkFilmStripFrame>} frames
     */
    _appendEventDividers: function(time, frames)
    {
        if (this._dclTime && time > this._dclTime) {
            frames.push(new WebInspector.NetworkFilmStripFrame(this, null, this._dclTime, "dcl-event", WebInspector.UIString("DOM Content Loaded")));
            this._dclTime = null;
        }
        if (this._loadTime && time > this._loadTime) {
            frames.push(new WebInspector.NetworkFilmStripFrame(this, null, this._loadTime, "load-event", WebInspector.UIString("Document Load")));
            this._loadTime = null;
        }
    },

    startRecording: function()
    {
        this._recording = true;
        this._tracingModel = new WebInspector.TracingModel(new WebInspector.TempFileBackingStorage("tracing"));
        this._target.tracingManager.start(this, "-*,disabled-by-default-devtools.screenshot", "");
    },

    stopRecording: function()
    {
        if (this._target && this._recording) {
            this._recording = false;
            this._target.tracingManager.stop();
            this.dispatchEventToListeners(WebInspector.NetworkFilmStripView.Events.RecordingFinished);
        }
    },

    /**
     * @param {!WebInspector.NetworkFilmStripFrame} frame
     * @param {boolean} reveal
     */
    _selectFrame: function(frame, reveal)
    {
        if (this._selectedFrame === frame)
            return;
        if (this._selectedFrame)
            this._selectedFrame.unselect();
        frame.select(reveal);
        this._selectedFrame = frame;
        this.dispatchEventToListeners(WebInspector.NetworkFilmStripView.Events.FrameSelected, frame.timestamp());
    },

    /**
     * @param {number} to
     */
    _smoothScroll: function(to)
    {
        var height = this.contentElement.offsetHeight;
        var max = this.contentElement.scrollHeight - height;
        if (max < 0)
            max = 0;
        if (to > max)
            to = max;
        this._scrollStartTime = Date.now();
        var maxMove = 2.5 * height;
        var from = Number.constrain(this.contentElement.scrollTop, to - maxMove, to + maxMove);
        this._scrollStartPosition = from;
        this._scrollEndPosition = to;
        if (!this._scrolling) {
            this._scrolling = true;
            this.contentElement.window().requestAnimationFrame(this._scroll.bind(this));
        }
    },

    _scroll: function()
    {
        if (!this._scrolling)
            return;
        var duration = 500;
        var t = (Date.now() - this._scrollStartTime) / duration;
        if (t > 1)
            t = 1;
        var x = t * t * t * (6 * t * t - 15 * t + 10);
        var position = this._scrollStartPosition + x * (this._scrollEndPosition - this._scrollStartPosition);
        this.contentElement.scrollTop = position;
        if (t < 1)
            this.contentElement.window().requestAnimationFrame(this._scroll.bind(this));
        else
            this._scrolling = false;
    },

    __proto__: WebInspector.HBox.prototype
}

/**
 * @constructor
 * @param {!WebInspector.NetworkFilmStripView} parent
 * @param {?string} imageData
 * @param {number} timestamp
 * @param {?string=} eventType
 * @param {?string=} eventText
 */
WebInspector.NetworkFilmStripFrame = function(parent, imageData, timestamp, eventType, eventText)
{
    this._parent = parent;
    this._timestamp = timestamp;
    this._element = createElementWithClass("div", "frame");
    if (imageData) {
        this._element.createChild("div", "thumbnail").createChild("img").src = "data:image/jpg;base64," + imageData;
    } else {
        if (eventType)
            this._element.classList.add("event", eventType);
        if (eventText)
            this._element.createChild("div", "event-text").createTextChild(eventText);
    }
    this._timeLabel = this._element.createChild("div", "time");

    this._element.addEventListener("mouseover", this._onMouseOver.bind(this), false);
}

WebInspector.NetworkFilmStripFrame.prototype = {
    /**
     * @param {!Element} parent
     */
    show: function(parent)
    {
        parent.appendChild(this._element);
    },

    /**
     * @param {!Event} event
     */
    _onMouseOver: function(event)
    {
        this._parent._selectFrame(this, false);
    },

    /**
     * @param {boolean} reveal
     */
    select: function(reveal)
    {
        this._element.classList.add("selected");
        if (reveal)
            this._parent._smoothScroll(this._element.offsetTop);
    },

    unselect: function()
    {
        this._element.classList.remove("selected");
    },

    /**
     * @return {number}
     */
    timestamp: function()
    {
        return this._timestamp;
    },

    /**
     * @param {number} offset
     */
    _setTimeOffset: function(offset)
    {
        this._timeLabel.textContent = Number.secondsToString(this._timestamp - offset);
    }
}

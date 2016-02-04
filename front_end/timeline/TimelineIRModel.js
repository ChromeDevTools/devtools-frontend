// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.TimelineIRModel = function()
{
    this.reset();
}

/**
 * @enum {string}
 */
WebInspector.TimelineIRModel.Phases = {
    Idle: "Idle",
    Response: "Response",
    Scroll: "Scroll",
    Fling: "Fling",
    Drag: "Drag",
    Animation: "Animation"
};

/**
 * @enum {string}
 */
WebInspector.TimelineIRModel.InputEvents = {
    Char: "Char",
    Click: "GestureClick",
    ContextMenu: "ContextMenu",
    FlingCancel: "GestureFlingCancel",
    FlingStart: "GestureFlingStart",
    ImplSideFling: WebInspector.TimelineModel.RecordType.ImplSideFling,
    KeyDown: "KeyDown",
    KeyDownRow: "RawKeyDown",
    KeyUp: "KeyUp",
    LatencyScrollUpdate: "ScrollUpdate",
    MouseDown: "MouseDown",
    MouseMove: "MouseMove",
    MouseUp: "MouseUp",
    MouseWheel: "MouseWheel",
    PinchBegin: "GesturePinchBegin",
    PinchEnd: "GesturePinchEnd",
    PinchUpdate: "GesturePinchUpdate",
    ScrollBegin: "GestureScrollBegin",
    ScrollEnd: "GestureScrollEnd",
    ScrollUpdate: "GestureScrollUpdate",
    ScrollUpdateRenderer: "ScrollUpdate",
    ShowPress: "GestureShowPress",
    Tap: "GestureTap",
    TapCancel: "GestureTapCancel",
    TapDown: "GestureTapDown",
    TouchCancel: "TouchCancel",
    TouchEnd: "TouchEnd",
    TouchMove: "TouchMove",
    TouchStart: "TouchStart"
};

WebInspector.TimelineIRModel._mergeThresholdsMs = {
    animation: 1,
    mouse: 40,
};

WebInspector.TimelineIRModel.prototype = {
    /**
     * @param {!WebInspector.TimelineModel} timelineModel
     */
    populate: function(timelineModel)
    {
        var eventTypes = WebInspector.TimelineIRModel.InputEvents;
        var phases = WebInspector.TimelineIRModel.Phases;

        this.reset();

        var groups = WebInspector.TimelineUIUtils.asyncEventGroups();
        var asyncEventsByGroup = timelineModel.mainThreadAsyncEvents();
        var inputLatencies = asyncEventsByGroup.get(groups.input);
        if (!inputLatencies)
            return;
        this._processInputLatencies(inputLatencies);
        var animations = asyncEventsByGroup.get(groups.animation);
        if (animations)
            this._processAnimations(animations);
        var range = new WebInspector.SegmentedRange();
        range.append(new WebInspector.Segment(timelineModel.minimumRecordTime(), timelineModel.maximumRecordTime(), WebInspector.TimelineIRModel.Phases.Idle));
        range.appendRange(this._drags); // Drags take lower precedence than animation, as we can't detect them reliably.
        range.appendRange(this._cssAnimations);
        range.appendRange(this._scrolls);
        range.appendRange(this._responses);
        this._segments = range.segments();
    },

    /**
     * @param {!Array<!WebInspector.TracingModel.AsyncEvent>} events
     */
    _processInputLatencies: function(events)
    {
        var eventTypes = WebInspector.TimelineIRModel.InputEvents;
        var phases = WebInspector.TimelineIRModel.Phases;
        var thresholdsMs = WebInspector.TimelineIRModel._mergeThresholdsMs;

        var flingStart;
        var touchStart;
        var firstTouchMove;
        var mouseWheel;
        var mouseDown;
        var mouseMove;

        for (var i = 0; i < events.length; ++i) {
            var event = events[i];
            if (i > 0 && events[i].startTime < events[i - 1].startTime)
                console.assert(false, "Unordered input events");
            var type = this._inputEventType(event.name);
            switch (type) {
            case eventTypes.ScrollUpdate:
                touchStart = null; // Since we're scrolling now, disregard other touch gestures.
                this._scrolls.append(this._segmentForEvent(event, phases.Scroll));
                break;

            case eventTypes.FlingStart:
                if (flingStart) {
                    WebInspector.console.error(WebInspector.UIString("Two flings at the same time? %s vs %s", flingStart.startTime, event.startTime));
                    break;
                }
                flingStart = event;
                break;

            case eventTypes.FlingCancel:
                // FIXME: also process renderer fling events.
                if (!flingStart)
                    break;
                this._scrolls.append(new WebInspector.Segment(flingStart.startTime, event.endTime, phases.Fling));
                flingStart = null;
                break;

            case eventTypes.ImplSideFling:
                this._scrolls.append(this._segmentForEvent(event, phases.Fling));
                break;

            case eventTypes.ShowPress:
            case eventTypes.Tap:
            case eventTypes.KeyDown:
            case eventTypes.KeyDownRow:
            case eventTypes.KeyUp:
            case eventTypes.Char:
            case eventTypes.Click:
            case eventTypes.ContextMenu:
                this._responses.append(this._segmentForEvent(event, phases.Response));
                break;

            case eventTypes.TouchStart:
                if (touchStart) {
                    WebInspector.console.error(WebInspector.UIString("Two touches at the same time? %s vs %s", touchStart.startTime, event.startTime));
                    break;
                }
                touchStart = event;
                firstTouchMove = null;
                break;

            case eventTypes.TouchCancel:
                touchStart = null;
                break;

            case eventTypes.TouchMove:
                if (firstTouchMove || !touchStart)
                    break;
                firstTouchMove = event;
                this._responses.append(new WebInspector.Segment(touchStart.startTime, firstTouchMove.endTime, phases.Response));
                break;

            case eventTypes.TouchEnd:
                if (!touchStart)
                    break;
                this._drags.append(new WebInspector.Segment(firstTouchMove ? firstTouchMove.endTime : touchStart.startTime, event.endTime, phases.Drag));
                touchStart = null;
                break;

            case eventTypes.MouseDown:
                mouseDown = event;
                mouseMove = null;
                break;

            case eventTypes.MouseMove:
                if (mouseDown && !mouseMove && mouseDown.startTime + thresholdsMs.mouse > event.startTime) {
                    this._responses.append(this._segmentForEvent(mouseDown, phases.Response));
                    this._responses.append(this._segmentForEvent(event, phases.Response));
                } else if (mouseDown) {
                    if (mouseMove && canMerge(thresholdsMs.mouse, mouseMove, event))
                        this._drags.append(new WebInspector.Segment(mouseMove.endTime, event.startTime, phases.Drag));
                    this._drags.append(this._segmentForEvent(event, phases.Drag));
                }
                mouseMove = event;
                break;

            case eventTypes.MouseUp:
                this._responses.append(this._segmentForEvent(event, phases.Response));
                mouseDown = null;
                break;

            case eventTypes.MouseWheel:
                // Do not consider first MouseWheel as trace viewer's implementation does -- in case of MouseWheel it's not really special.
                if (mouseWheel && canMerge(thresholdsMs.mouse, mouseWheel, event))
                    this._scrolls.append(new WebInspector.Segment(mouseWheel.endTime, event.startTime, phases.Scroll));
                this._scrolls.append(this._segmentForEvent(event, phases.Scroll));
                mouseWheel = event;
                break;
            }
        }

        /**
         * @param {number} threshold
         * @param {!WebInspector.TracingModel.AsyncEvent} first
         * @param {!WebInspector.TracingModel.AsyncEvent} second
         * @return {boolean}
         */
        function canMerge(threshold, first, second)
        {
            return first.endTime < second.startTime && second.startTime < first.endTime + threshold;
        }
    },

    /**
     * @param {!Array<!WebInspector.TracingModel.AsyncEvent>} events
     */
    _processAnimations: function(events)
    {
        for (var i = 0; i < events.length; ++i)
            this._cssAnimations.append(this._segmentForEvent(events[i], WebInspector.TimelineIRModel.Phases.Animation));
    },

    /**
     * @param {!WebInspector.TracingModel.AsyncEvent} event
     * @param {!WebInspector.TimelineIRModel.Phases} phase
     * @return {!WebInspector.Segment}
     */
    _segmentForEvent: function(event, phase)
    {
        return new WebInspector.Segment(event.startTime, event.endTime, phase);
    },

    /**
     * @return {!Array<!WebInspector.Segment>}
     */
    interactionRecords: function()
    {
        return this._segments;
    },

    reset: function()
    {
        var thresholdsMs = WebInspector.TimelineIRModel._mergeThresholdsMs;

        this._segments = [];
        this._drags = new WebInspector.SegmentedRange(merge.bind(null, 0));
        this._cssAnimations = new WebInspector.SegmentedRange(merge.bind(null, WebInspector.TimelineIRModel._mergeThresholdsMs.animation));
        this._responses = new WebInspector.SegmentedRange(merge.bind(null, 0));
        this._scrolls = new WebInspector.SegmentedRange(merge.bind(null, 0));

        /**
         * @param {number} threshold
         * @param {!WebInspector.Segment} first
         * @param {!WebInspector.Segment} second
         */
        function merge(threshold, first, second)
        {
            return first.end + threshold >= second.begin && first.data === second.data ? first : null;
        }
    },

    /**
     * @param {string} eventName
     * @return {?WebInspector.TimelineIRModel.InputEvents}
     */
    _inputEventType: function(eventName)
    {
        var prefix = "InputLatency::";
        if (!eventName.startsWith(prefix)) {
            if (eventName === WebInspector.TimelineIRModel.InputEvents.ImplSideFling)
                return /** @type {!WebInspector.TimelineIRModel.InputEvents} */ (eventName);
            console.error("Unrecognized input latency event: " + eventName);
            return null;
        }
        return /** @type {!WebInspector.TimelineIRModel.InputEvents} */ (eventName.substr(prefix.length));
    }
};

/**
 * @constructor
 * @param {(function(!WebInspector.Segment, !WebInspector.Segment): ?WebInspector.Segment)=} mergeCallback
 */
WebInspector.SegmentedRange = function(mergeCallback)
{
    /** @type {!Array<!WebInspector.Segment>} */
    this._segments = [];
    this._mergeCallback = mergeCallback;
}

/**
 * @constructor
 * @param {number} begin
 * @param {number} end
 * @param {*} data
 */
WebInspector.Segment = function(begin, end, data)
{
    if (begin > end)
        console.assert(false, "Invalid segment");
    this.begin = begin;
    this.end = end;
    this.data = data;
}

WebInspector.Segment.prototype = {
    /**
     * @param {!WebInspector.Segment} that
     * @return {boolean}
     */
    intersects: function(that)
    {
        return this.begin < that.end && that.begin < this.end;
    }
};

WebInspector.SegmentedRange.prototype = {
    /**
     * @param {!WebInspector.Segment} newSegment
     */
    append: function(newSegment)
    {
        // 1. Find the proper insertion point for new segment
        var startIndex = this._segments.lowerBound(newSegment, (a, b) => a.begin - b.begin);
        var endIndex = startIndex;
        var merged = null;
        if (startIndex > 0) {
            // 2. Try mering the preceding segment
            var precedingSegment = this._segments[startIndex - 1];
            merged = this._tryMerge(precedingSegment, newSegment);
            if (merged) {
                --startIndex;
                newSegment = merged;
            } else if (this._segments[startIndex - 1].end >= newSegment.begin) {
                // 2a. If merge failed and segments overlap, adjust preceding segment.
                // If an old segment entirely contains new one, split it in two.
                if (newSegment.end < precedingSegment.end)
                    this._segments.splice(startIndex, 0, new WebInspector.Segment(newSegment.end, precedingSegment.end, precedingSegment.data));
                precedingSegment.end = newSegment.begin;
            }
        }
        // 3. Consume all segments that are entirely covered by the new one.
        while (endIndex < this._segments.length && this._segments[endIndex].end <= newSegment.end)
            ++endIndex;
        // 4. Merge or adjust the succeeding segment if it overlaps.
        if (endIndex < this._segments.length) {
            merged = this._tryMerge(newSegment, this._segments[endIndex]);
            if (merged) {
                endIndex++;
                newSegment = merged;
            } else if (newSegment.intersects(this._segments[endIndex]))
                this._segments[endIndex].begin = newSegment.end;
        }
        this._segments.splice(startIndex, endIndex - startIndex, newSegment);
    },

    /**
     * @param {!WebInspector.SegmentedRange} that
     */
    appendRange: function(that)
    {
        that.segments().forEach(segment => this.append(segment));
    },

    /**
     * @return {!Array<!WebInspector.Segment>}
     */
    segments: function()
    {
        return this._segments;
    },

    /**
     * @param {!WebInspector.Segment} first
     * @param {!WebInspector.Segment} second
     * @return {?WebInspector.Segment}
     */
    _tryMerge: function(first, second)
    {
        var merged = this._mergeCallback && this._mergeCallback(first, second);
        if (!merged)
            return null;
        merged.begin = first.begin;
        merged.end = Math.max(first.end, second.end);
        return merged;
    }
}

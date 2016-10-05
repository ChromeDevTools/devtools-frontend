// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
};

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

/**
 * @constructor
 * @param {(function(!WebInspector.Segment, !WebInspector.Segment): ?WebInspector.Segment)=} mergeCallback
 */
WebInspector.SegmentedRange = function(mergeCallback)
{
    /** @type {!Array<!WebInspector.Segment>} */
    this._segments = [];
    this._mergeCallback = mergeCallback;
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
};

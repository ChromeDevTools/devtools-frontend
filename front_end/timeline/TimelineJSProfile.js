// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


WebInspector.TimelineJSProfileProcessor = { };

WebInspector.TimelineJSProfileProcessor.JSFrameCoalesceThresholdMs = 1.5;

/**
 * @param {!ProfilerAgent.CPUProfile} jsProfile
 * @param {!WebInspector.TracingModel.Thread} thread
 * @return {!Array<!WebInspector.TracingModel.Event>}
 */
WebInspector.TimelineJSProfileProcessor.generateTracingEventsFromCpuProfile = function(jsProfile, thread)
{
    if (!jsProfile.samples)
        return [];
    var jsProfileModel = new WebInspector.CPUProfileDataModel(jsProfile);
    var idleNode = jsProfileModel.idleNode;
    var programNode = jsProfileModel.programNode;
    var gcNode = jsProfileModel.gcNode;
    var samples = jsProfileModel.samples;
    var timestamps = jsProfileModel.timestamps;
    var jsEvents = [];
    for (var i = 0; i < samples.length; ++i) {
        var node = jsProfileModel.nodeByIndex(i);
        if (node === programNode || node === gcNode || node === idleNode)
            continue;
        var stackTrace = node._stackTraceArray;
        if (!stackTrace) {
            stackTrace = /** @type {!ConsoleAgent.StackTrace} */ (new Array(node.depth + 1));
            node._stackTraceArray = stackTrace;
            for (var j = 0; node.parent; node = node.parent)
                stackTrace[j++] = /** @type {!ConsoleAgent.CallFrame} */ (node);
        }
        var jsEvent = new WebInspector.TracingModel.Event(WebInspector.TracingModel.DevToolsTimelineEventCategory, WebInspector.TimelineModel.RecordType.JSSample,
            WebInspector.TracingModel.Phase.Instant, timestamps[i], thread);
        jsEvent.args["data"] = { stackTrace: stackTrace };
        jsEvents.push(jsEvent);
    }
    return jsEvents;
}

/**
 * @param {!Array<!WebInspector.TracingModel.Event>} events
 * @return {!Array<!WebInspector.TracingModel.Event>}
 */
WebInspector.TimelineJSProfileProcessor.generateJSFrameEvents = function(events)
{
    /**
     * @param {!ConsoleAgent.CallFrame} frame1
     * @param {!ConsoleAgent.CallFrame} frame2
     * @return {boolean}
     */
    function equalFrames(frame1, frame2)
    {
        return frame1.scriptId === frame2.scriptId && frame1.functionName === frame2.functionName;
    }

    /**
     * @param {!WebInspector.TracingModel.Event} e
     * @return {number}
     */
    function eventEndTime(e)
    {
        return e.endTime || e.startTime;
    }

    /**
     * @param {!WebInspector.TracingModel.Event} e
     * @return {boolean}
     */
    function isJSInvocationEvent(e)
    {
        switch (e.name) {
        case WebInspector.TimelineModel.RecordType.FunctionCall:
        case WebInspector.TimelineModel.RecordType.EvaluateScript:
            return true;
        }
        return false;
    }

    var jsFrameEvents = [];
    var jsFramesStack = [];
    var coalesceThresholdMs = WebInspector.TimelineJSProfileProcessor.JSFrameCoalesceThresholdMs;

    /**
     * @param {!WebInspector.TracingModel.Event} e
     */
    function onStartEvent(e)
    {
        extractStackTrace(e);
    }

    /**
     * @param {!WebInspector.TracingModel.Event} e
     * @param {?WebInspector.TracingModel.Event} top
     */
    function onInstantEvent(e, top)
    {
        if (e.name === WebInspector.TimelineModel.RecordType.JSSample && top && !isJSInvocationEvent(top))
            return;
        extractStackTrace(e);
    }

    /**
     * @param {!WebInspector.TracingModel.Event} e
     */
    function onEndEvent(e)
    {
        if (!isJSInvocationEvent(e))
            return;
        var eventData = e.args["data"] || e.args["beginData"];
        var stackTrace = eventData && eventData["stackTrace"];
        var stackLength = stackTrace ? stackTrace.length : 0;
        // FIXME: there shouldn't be such a case.
        // The current stack should never go beyond the parent event's stack.
        if (stackLength < jsFramesStack.length)
            jsFramesStack.length = stackLength;
    }

    /**
     * @param {!WebInspector.TracingModel.Event} e
     */
    function extractStackTrace(e)
    {
        while (jsFramesStack.length && eventEndTime(jsFramesStack.peekLast()) + coalesceThresholdMs <= e.startTime)
            jsFramesStack.pop();
        var eventData = e.args["data"] || e.args["beginData"];
        var stackTrace = eventData && eventData["stackTrace"];
        // GC events do not hold call stack, so make a copy of the current stack.
        if (e.name === WebInspector.TimelineModel.RecordType.GCEvent)
            stackTrace = jsFramesStack.map(function(frameEvent) { return frameEvent.args["data"]; }).reverse();
        if (!stackTrace)
            return;
        var endTime = eventEndTime(e);
        var numFrames = stackTrace.length;
        var minFrames = Math.min(numFrames, jsFramesStack.length);
        var j;
        for (j = 0; j < minFrames; ++j) {
            var newFrame = stackTrace[numFrames - 1 - j];
            var oldFrame = jsFramesStack[j].args["data"];
            if (!equalFrames(newFrame, oldFrame))
                break;
            jsFramesStack[j].setEndTime(Math.max(jsFramesStack[j].endTime, endTime));
        }
        jsFramesStack.length = j;
        for (; j < numFrames; ++j) {
            var frame = stackTrace[numFrames - 1 - j];
            var jsFrameEvent = new WebInspector.TracingModel.Event(WebInspector.TracingModel.DevToolsTimelineEventCategory, WebInspector.TimelineModel.RecordType.JSFrame,
                WebInspector.TracingModel.Phase.Complete, e.startTime, e.thread);
            jsFrameEvent.addArgs({ data: frame });
            jsFrameEvent.setEndTime(endTime);
            jsFramesStack.push(jsFrameEvent);
            jsFrameEvents.push(jsFrameEvent);
        }
    }

    WebInspector.TimelineModel.forEachEvent(events, onStartEvent, onEndEvent, onInstantEvent);
    return jsFrameEvents;
}

/**
 * @constructor
 */
WebInspector.TimelineJSProfileProcessor.CodeMap = function()
{
    /** @type {!Array<!WebInspector.TimelineJSProfileProcessor.CodeMap.Entry>} */
    this._entries = [];
}

/**
 * @constructor
 * @param {number} address
 * @param {number} size
 * @param {!ConsoleAgent.CallFrame} callFrame
 */
WebInspector.TimelineJSProfileProcessor.CodeMap.Entry = function(address, size, callFrame)
{
    this.address = address;
    this.size = size;
    this.callFrame = callFrame;
}

/**
 * @param {number} address
 * @param {!WebInspector.TimelineJSProfileProcessor.CodeMap.Entry} entry
 * @return {number}
 */
WebInspector.TimelineJSProfileProcessor.CodeMap.comparator = function(address, entry)
{
    return address - entry.address;
}

WebInspector.TimelineJSProfileProcessor.CodeMap.prototype = {
    /**
     * @param {string} addressHex
     * @param {number} size
     * @param {!ConsoleAgent.CallFrame} callFrame
     */
    addEntry: function(addressHex, size, callFrame)
    {
        var address = this._addressStringToNumber(addressHex);
        this._addEntry(new WebInspector.TimelineJSProfileProcessor.CodeMap.Entry(address, size, callFrame));
    },

    /**
     * @param {string} oldAddressHex
     * @param {string} newAddressHex
     * @param {number} size
     */
    moveEntry: function(oldAddressHex, newAddressHex, size)
    {
        var oldAddress = this._addressStringToNumber(oldAddressHex);
        var newAddress = this._addressStringToNumber(newAddressHex);
        var index = this._entries.lowerBound(oldAddress, WebInspector.TimelineJSProfileProcessor.CodeMap.comparator);
        var entry = this._entries[index];
        if (!entry || entry.address !== oldAddress)
            return;
        this._entries.splice(index, 1);
        entry.address = newAddress;
        entry.size = size;
        this._addEntry(entry);
    },

    /**
     * @param {string} addressHex
     * @return {?ConsoleAgent.CallFrame}
     */
    lookupEntry: function(addressHex)
    {
        var address = this._addressStringToNumber(addressHex);
        var index = this._entries.upperBound(address, WebInspector.TimelineJSProfileProcessor.CodeMap.comparator) - 1;
        var entry = this._entries[index];
        return entry && address < entry.address + entry.size ? entry.callFrame : null;
    },

    /**
     * @param {string} addressHex
     * @return {number}
     */
    _addressStringToNumber: function(addressHex)
    {
        // TODO(alph): The addressHex may represent addresses from 0 to 2^64-1,
        // whereas address is a double type that has exact representation for
        // integers up to 2^53. So it might lose up to 11 bits at the end.
        // Do something about it, e.g. introduce banks, or just find and subtract a base.
        return parseInt(addressHex, 16);
    },

    /**
     * @param {!WebInspector.TimelineJSProfileProcessor.CodeMap.Entry} newEntry
     */
    _addEntry: function(newEntry)
    {
        var endAddress = newEntry.address + newEntry.size;
        var lastIndex = this._entries.lowerBound(endAddress, WebInspector.TimelineJSProfileProcessor.CodeMap.comparator);
        var index;
        for (index = lastIndex - 1; index >= 0; --index) {
            var entry = this._entries[index];
            var entryEndAddress = entry.address + entry.size;
            if (entryEndAddress <= newEntry.address)
                break;
        }
        ++index;
        this._entries.splice(index, lastIndex - index, newEntry);
    }
}

/**
 * @param {!Array<!WebInspector.TracingModel.Event>} events
 * @return {!Array<!WebInspector.TracingModel.Event>}
 */
WebInspector.TimelineJSProfileProcessor.processRawV8Samples = function(events)
{
    var unknownFrame = {
        functionName: "(unknown)",
        url: "",
        scriptId: "0",
        lineNumber: 0,
        columnNumber: 0
    };
    /**
     * @param {string} address
     * @return {!ConsoleAgent.CallFrame}
     */
    function convertRawFrame(address)
    {
        return codeMap.lookupEntry(address) || unknownFrame;
    }

    var reName = /^(\S*:)?~?(\S*)(?: (\S*))?$/;
    /**
     * @param {string} name
     * @param {number} scriptId
     * @return {!ConsoleAgent.CallFrame}
     */
    function buildCallFrame(name, scriptId)
    {
        var parsed = reName.exec(name);
        if (!parsed)
            return unknownFrame;
        var functionName = parsed[2] || "";
        var urlData = WebInspector.ParsedURL.splitLineAndColumn(parsed[3] || "");
        var url = urlData && urlData.url || "";
        var line = urlData && urlData.lineNumber || 0;
        var column = urlData && urlData.columnNumber || 0;
        var frame = {
            "functionName": functionName,
            "url": url,
            "scriptId": String(scriptId),
            "lineNumber": line,
            "columnNumber": column
        };
        return frame;
    }

    var recordTypes = WebInspector.TimelineModel.RecordType;
    var samples = [];
    var codeMap = new WebInspector.TimelineJSProfileProcessor.CodeMap();
    for (var i = 0; i < events.length; ++i) {
        var e = events[i];
        var data = e.args["data"];
        switch (e.name) {
        case recordTypes.JitCodeAdded:
            codeMap.addEntry(data["code_start"], data["code_len"], buildCallFrame(data["name"], data["script_id"]));
            break;
        case recordTypes.JitCodeMoved:
            codeMap.moveEntry(data["code_start"], data["new_code_start"], data["code_len"]);
            break;
        case recordTypes.V8Sample:
            var rawStack = data["stack"];
            // Sometimes backend fails to collect a stack and returns an empty stack.
            // Skip these bogus samples.
            if (data["vm_state"] === "js" && !rawStack.length)
                break;
            var stack = rawStack.map(convertRawFrame);
            var sampleEvent = new WebInspector.TracingModel.Event(
                WebInspector.TracingModel.DevToolsTimelineEventCategory,
                WebInspector.TimelineModel.RecordType.JSSample,
                WebInspector.TracingModel.Phase.Instant, e.startTime, e.thread);
            sampleEvent.args = {"data": {"stackTrace": stack }};
            samples.push(sampleEvent);
            break;
        }
    }

    return samples;
}

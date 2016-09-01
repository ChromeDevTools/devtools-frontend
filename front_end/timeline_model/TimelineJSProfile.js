// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


WebInspector.TimelineJSProfileProcessor = { };

/**
 * @param {!WebInspector.CPUProfileDataModel} jsProfileModel
 * @param {!WebInspector.TracingModel.Thread} thread
 * @return {!Array<!WebInspector.TracingModel.Event>}
 */
WebInspector.TimelineJSProfileProcessor.generateTracingEventsFromCpuProfile = function(jsProfileModel, thread)
{
    var idleNode = jsProfileModel.idleNode;
    var programNode = jsProfileModel.programNode;
    var gcNode = jsProfileModel.gcNode;
    var samples = jsProfileModel.samples;
    var timestamps = jsProfileModel.timestamps;
    var jsEvents = [];
    /** @type {!Map<!Object, !Array<!RuntimeAgent.CallFrame>>} */
    var nodeToStackMap = new Map();
    nodeToStackMap.set(programNode, []);
    for (var i = 0; i < samples.length; ++i) {
        var node = jsProfileModel.nodeByIndex(i);
        if (!node) {
            console.error(`Node with unknown id ${samples[i]} at index ${i}`);
            continue;
        }
        if (node === gcNode || node === idleNode)
            continue;
        var callFrames = nodeToStackMap.get(node);
        if (!callFrames) {
            callFrames = /** @type {!Array<!RuntimeAgent.CallFrame>} */ (new Array(node.depth + 1));
            nodeToStackMap.set(node, callFrames);
            for (var j = 0; node.parent; node = node.parent)
                callFrames[j++] = /** @type {!RuntimeAgent.CallFrame} */ (node);
        }
        var jsSampleEvent = new WebInspector.TracingModel.Event(WebInspector.TracingModel.DevToolsTimelineEventCategory,
            WebInspector.TimelineModel.RecordType.JSSample,
            WebInspector.TracingModel.Phase.Instant, timestamps[i], thread);
        jsSampleEvent.args["data"] = { stackTrace: callFrames };
        jsEvents.push(jsSampleEvent);
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
     * @param {!RuntimeAgent.CallFrame} frame1
     * @param {!RuntimeAgent.CallFrame} frame2
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
        case WebInspector.TimelineModel.RecordType.RunMicrotasks:
        case WebInspector.TimelineModel.RecordType.FunctionCall:
        case WebInspector.TimelineModel.RecordType.EvaluateScript:
            return true;
        }
        return false;
    }

    var jsFrameEvents = [];
    var jsFramesStack = [];
    var lockedJsStackDepth = [];
    var ordinal = 0;
    var filterNativeFunctions = !WebInspector.moduleSetting("showNativeFunctionsInJSProfile").get();

    /**
     * @param {!WebInspector.TracingModel.Event} e
     */
    function onStartEvent(e)
    {
        e.ordinal = ++ordinal;
        extractStackTrace(e);
        // For the duration of the event we cannot go beyond the stack associated with it.
        lockedJsStackDepth.push(jsFramesStack.length);
    }

    /**
     * @param {!WebInspector.TracingModel.Event} e
     * @param {?WebInspector.TracingModel.Event} parent
     */
    function onInstantEvent(e, parent)
    {
        e.ordinal = ++ordinal;
        if (parent && isJSInvocationEvent(parent))
            extractStackTrace(e);
    }

    /**
     * @param {!WebInspector.TracingModel.Event} e
     */
    function onEndEvent(e)
    {
        truncateJSStack(lockedJsStackDepth.pop(), e.endTime);
    }

    /**
     * @param {number} depth
     * @param {number} time
     */
    function truncateJSStack(depth, time)
    {
        if (lockedJsStackDepth.length) {
            var lockedDepth = lockedJsStackDepth.peekLast();
            if (depth < lockedDepth) {
                console.error("Child stack is shallower (" + depth + ") than the parent stack (" + lockedDepth + ") at " + time);
                depth = lockedDepth;
            }
        }
        if (jsFramesStack.length < depth) {
            console.error("Trying to truncate higher than the current stack size at " + time);
            depth = jsFramesStack.length;
        }
        for (var k = 0; k < jsFramesStack.length; ++k)
            jsFramesStack[k].setEndTime(time);
        jsFramesStack.length = depth;
    }

    /**
     * @param {!Array<!RuntimeAgent.CallFrame>} stack
     */
    function filterStackFrames(stack)
    {
        for (var i = 0, j = 0; i < stack.length; ++i) {
            var url = stack[i].url;
            if (url && url.startsWith("native "))
                continue;
            stack[j++] = stack[i];
        }
        stack.length = j;
    }

    /**
     * @param {!WebInspector.TracingModel.Event} e
     */
    function extractStackTrace(e)
    {
        var recordTypes = WebInspector.TimelineModel.RecordType;
        var callFrames;
        if (e.name === recordTypes.JSSample) {
            var eventData = e.args["data"] || e.args["beginData"];
            callFrames = /** @type {!Array<!RuntimeAgent.CallFrame>} */ (eventData && eventData["stackTrace"]);
        } else {
            callFrames = /** @type {!Array<!RuntimeAgent.CallFrame>} */ (jsFramesStack.map(frameEvent => frameEvent.args["data"]).reverse());
        }
        if (filterNativeFunctions)
            filterStackFrames(callFrames);
        var endTime = eventEndTime(e);
        var numFrames = callFrames.length;
        var minFrames = Math.min(numFrames, jsFramesStack.length);
        var i;
        for (i = lockedJsStackDepth.peekLast() || 0; i < minFrames; ++i) {
            var newFrame = callFrames[numFrames - 1 - i];
            var oldFrame = jsFramesStack[i].args["data"];
            if (!equalFrames(newFrame, oldFrame))
                break;
            jsFramesStack[i].setEndTime(Math.max(jsFramesStack[i].endTime, endTime));
        }
        truncateJSStack(i, e.startTime);
        for (; i < numFrames; ++i) {
            var frame = callFrames[numFrames - 1 - i];
            var jsFrameEvent = new WebInspector.TracingModel.Event(WebInspector.TracingModel.DevToolsTimelineEventCategory, recordTypes.JSFrame,
                WebInspector.TracingModel.Phase.Complete, e.startTime, e.thread);
            jsFrameEvent.ordinal = e.ordinal;
            jsFrameEvent.addArgs({ data: frame });
            jsFrameEvent.setEndTime(endTime);
            jsFramesStack.push(jsFrameEvent);
            jsFrameEvents.push(jsFrameEvent);
        }
    }

    /**
     * @param {!Array<!WebInspector.TracingModel.Event>} events
     * @return {?WebInspector.TracingModel.Event}
     */
    function findFirstTopLevelEvent(events)
    {
        for (var i = 0; i < events.length; ++i) {
            if (WebInspector.TracingModel.isTopLevelEvent(events[i]))
                return events[i];
        }
        return null;
    }

    var firstTopLevelEvent = findFirstTopLevelEvent(events);
    if (firstTopLevelEvent)
        WebInspector.TimelineModel.forEachEvent(events, onStartEvent, onEndEvent, onInstantEvent, firstTopLevelEvent.startTime);
    return jsFrameEvents;
}

/**
 * @constructor
 */
WebInspector.TimelineJSProfileProcessor.CodeMap = function()
{
    /** @type {!Map<string, !WebInspector.TimelineJSProfileProcessor.CodeMap.Bank>} */
    this._banks = new Map();
}

/**
 * @constructor
 * @param {number} address
 * @param {number} size
 * @param {!RuntimeAgent.CallFrame} callFrame
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
     * @param {!RuntimeAgent.CallFrame} callFrame
     */
    addEntry: function(addressHex, size, callFrame)
    {
        var entry = new WebInspector.TimelineJSProfileProcessor.CodeMap.Entry(this._getAddress(addressHex), size, callFrame);
        this._addEntry(addressHex, entry);
    },

    /**
     * @param {string} oldAddressHex
     * @param {string} newAddressHex
     * @param {number} size
     */
    moveEntry: function(oldAddressHex, newAddressHex, size)
    {
        var entry = this._getBank(oldAddressHex).removeEntry(this._getAddress(oldAddressHex));
        if (!entry) {
            console.error("Entry at address " + oldAddressHex + " not found");
            return;
        }
        entry.address = this._getAddress(newAddressHex);
        entry.size = size;
        this._addEntry(newAddressHex, entry);
    },

    /**
     * @param {string} addressHex
     * @return {?RuntimeAgent.CallFrame}
     */
    lookupEntry: function(addressHex)
    {
        return this._getBank(addressHex).lookupEntry(this._getAddress(addressHex));
    },

    /**
     * @param {string} addressHex
     * @param {!WebInspector.TimelineJSProfileProcessor.CodeMap.Entry} entry
     */
    _addEntry: function(addressHex, entry)
    {
        // FIXME: deal with entries that span across [multiple] banks.
        this._getBank(addressHex).addEntry(entry);
    },

    /**
     * @param {string} addressHex
     * @return {!WebInspector.TimelineJSProfileProcessor.CodeMap.Bank}
     */
    _getBank: function(addressHex)
    {
        addressHex = addressHex.slice(2);  // cut 0x prefix.
        // 13 hex digits == 52 bits, double mantissa fits 53 bits.
        var /** @const */ bankSizeHexDigits = 13;
        var /** @const */ maxHexDigits = 16;
        var bankName = addressHex.slice(-maxHexDigits, -bankSizeHexDigits);
        var bank = this._banks.get(bankName);
        if (!bank) {
            bank = new WebInspector.TimelineJSProfileProcessor.CodeMap.Bank();
            this._banks.set(bankName, bank);
        }
        return bank;
    },

    /**
     * @param {string} addressHex
     * @return {number}
     */
    _getAddress: function(addressHex)
    {
        // 13 hex digits == 52 bits, double mantissa fits 53 bits.
        var /** @const */ bankSizeHexDigits = 13;
        addressHex = addressHex.slice(2);  // cut 0x prefix.
        return parseInt(addressHex.slice(-bankSizeHexDigits), 16);
    }
}

/**
 * @constructor
 */
WebInspector.TimelineJSProfileProcessor.CodeMap.Bank = function()
{
    /** @type {!Array<!WebInspector.TimelineJSProfileProcessor.CodeMap.Entry>} */
    this._entries = [];
}

WebInspector.TimelineJSProfileProcessor.CodeMap.Bank.prototype = {
    /**
     * @param {number} address
     * @return {?WebInspector.TimelineJSProfileProcessor.CodeMap.Entry}
     */
    removeEntry: function(address)
    {
        var index = this._entries.lowerBound(address, WebInspector.TimelineJSProfileProcessor.CodeMap.comparator);
        var entry = this._entries[index];
        if (!entry || entry.address !== address)
            return null;
        this._entries.splice(index, 1);
        return entry;
    },

    /**
     * @param {number} address
     * @return {?RuntimeAgent.CallFrame}
     */
    lookupEntry: function(address)
    {
        var index = this._entries.upperBound(address, WebInspector.TimelineJSProfileProcessor.CodeMap.comparator) - 1;
        var entry = this._entries[index];
        return entry && address < entry.address + entry.size ? entry.callFrame : null;
    },

    /**
     * @param {!WebInspector.TimelineJSProfileProcessor.CodeMap.Entry} newEntry
     */
    addEntry: function(newEntry)
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
 * @param {string} name
 * @param {number} scriptId
 * @return {!RuntimeAgent.CallFrame}
 */
WebInspector.TimelineJSProfileProcessor._buildCallFrame = function(name, scriptId)
{
    /**
     * @param {string} functionName
     * @param {string=} url
     * @param {string=} scriptId
     * @param {number=} line
     * @param {number=} column
     * @param {boolean=} isNative
     * @return {!RuntimeAgent.CallFrame}
     */
    function createFrame(functionName, url, scriptId, line, column, isNative)
    {
        return /** @type {!RuntimeAgent.CallFrame} */ ({
            "functionName": functionName,
            "url": url || "",
            "scriptId": scriptId || "0",
            "lineNumber": line || 0,
            "columnNumber": column || 0,
            "isNative": isNative || false
        });
    }

    // Code states:
    // (empty) -> compiled
    //    ~    -> optimizable
    //    *    -> optimized
    var rePrefix = /^(\w*:)?[*~]?(.*)$/m;
    var tokens = rePrefix.exec(name);
    var prefix = tokens[1];
    var body = tokens[2];
    var rawName;
    var rawUrl;
    if (prefix === "Script:") {
        rawName = "";
        rawUrl = body;
    } else {
        var spacePos = body.lastIndexOf(" ");
        rawName = spacePos !== -1 ? body.substr(0, spacePos) : body;
        rawUrl = spacePos !== -1 ? body.substr(spacePos + 1) : "";
    }
    var nativeSuffix = " native";
    var isNative = rawName.endsWith(nativeSuffix);
    var functionName = isNative ? rawName.slice(0, -nativeSuffix.length) : rawName;
    var urlData = WebInspector.ParsedURL.splitLineAndColumn(rawUrl);
    var url = urlData.url || "";
    var line = urlData.lineNumber || 0;
    var column = urlData.columnNumber || 0;
    return createFrame(functionName, url, String(scriptId), line, column, isNative);
}

/**
 * @param {!Array<!WebInspector.TracingModel.Event>} events
 * @return {!Array<!WebInspector.TracingModel.Event>}
 */
WebInspector.TimelineJSProfileProcessor.processRawV8Samples = function(events)
{
    var missingAddesses = new Set();

    /**
     * @param {string} address
     * @return {?RuntimeAgent.CallFrame}
     */
    function convertRawFrame(address)
    {
        var entry = codeMap.lookupEntry(address);
        if (entry)
            return entry.isNative ? null : entry;
        if (!missingAddesses.has(address)) {
            missingAddesses.add(address);
            console.error("Address " + address + " has missing code entry");
        }
        return null;
    }

    var recordTypes = WebInspector.TimelineModel.RecordType;
    var samples = [];
    var codeMap = new WebInspector.TimelineJSProfileProcessor.CodeMap();
    for (var i = 0; i < events.length; ++i) {
        var e = events[i];
        var data = e.args["data"];
        switch (e.name) {
        case recordTypes.JitCodeAdded:
            var frame = WebInspector.TimelineJSProfileProcessor._buildCallFrame(data["name"], data["script_id"]);
            codeMap.addEntry(data["code_start"], data["code_len"], frame);
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
            stack.remove(null);
            var sampleEvent = new WebInspector.TracingModel.Event(
                WebInspector.TracingModel.DevToolsTimelineEventCategory,
                WebInspector.TimelineModel.RecordType.JSSample,
                WebInspector.TracingModel.Phase.Instant, e.startTime, e.thread);
            sampleEvent.ordinal = e.ordinal;
            sampleEvent.args = {"data": {"stackTrace": stack }};
            samples.push(sampleEvent);
            break;
        }
    }

    return samples;
}

/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @constructor
 * @param {!WebInspector.BackingStorage} backingStorage
 */
WebInspector.TracingModel = function(backingStorage)
{
    this._backingStorage = backingStorage;
    this.reset();
}

/**
 * @enum {string}
 */
WebInspector.TracingModel.Phase = {
    Begin: "B",
    End: "E",
    Complete: "X",
    Instant: "I",
    AsyncBegin: "S",
    AsyncStepInto: "T",
    AsyncStepPast: "p",
    AsyncEnd: "F",
    NestableAsyncBegin: "b",
    NestableAsyncEnd: "e",
    NestableAsyncInstant: "n",
    FlowBegin: "s",
    FlowStep: "t",
    FlowEnd: "f",
    Metadata: "M",
    Counter: "C",
    Sample: "P",
    CreateObject: "N",
    SnapshotObject: "O",
    DeleteObject: "D"
};

WebInspector.TracingModel.MetadataEvent = {
    ProcessSortIndex: "process_sort_index",
    ProcessName: "process_name",
    ThreadSortIndex: "thread_sort_index",
    ThreadName: "thread_name"
}

WebInspector.TracingModel.DevToolsMetadataEventCategory = "disabled-by-default-devtools.timeline";

WebInspector.TracingModel.ConsoleEventCategory = "blink.console";
WebInspector.TracingModel.TopLevelEventCategory = "disabled-by-default-devtools.timeline.top-level-task";

WebInspector.TracingModel.FrameLifecycleEventCategory = "cc,devtools";

WebInspector.TracingModel.DevToolsMetadataEvent = {
    TracingStartedInPage: "TracingStartedInPage",
    TracingSessionIdForWorker: "TracingSessionIdForWorker",
};

WebInspector.TracingModel._nestableAsyncEventsString =
    WebInspector.TracingModel.Phase.NestableAsyncBegin +
    WebInspector.TracingModel.Phase.NestableAsyncEnd +
    WebInspector.TracingModel.Phase.NestableAsyncInstant;

WebInspector.TracingModel._legacyAsyncEventsString =
    WebInspector.TracingModel.Phase.AsyncBegin +
    WebInspector.TracingModel.Phase.AsyncEnd +
    WebInspector.TracingModel.Phase.AsyncStepInto +
    WebInspector.TracingModel.Phase.AsyncStepPast;

WebInspector.TracingModel._asyncEventsString = WebInspector.TracingModel._nestableAsyncEventsString + WebInspector.TracingModel._legacyAsyncEventsString;

/**
 * @param {string} phase
 * @return {boolean}
 */
WebInspector.TracingModel.isNestableAsyncPhase = function(phase)
{
    return WebInspector.TracingModel._nestableAsyncEventsString.indexOf(phase) >= 0;
}

/**
 * @param {string} phase
 * @return {boolean}
 */
WebInspector.TracingModel.isAsyncBeginPhase = function(phase)
{
    return phase === WebInspector.TracingModel.Phase.AsyncBegin || phase === WebInspector.TracingModel.Phase.NestableAsyncBegin;
}

/**
 * @param {string} phase
 * @return {boolean}
 */
WebInspector.TracingModel.isAsyncPhase = function(phase)
{
    return WebInspector.TracingModel._asyncEventsString.indexOf(phase) >= 0;
}

/**
 * @interface
 */
WebInspector.BackingStorage = function()
{
}

WebInspector.BackingStorage.prototype = {
    /**
     * @param {string} string
     */
    appendString: function(string) { },

    /**
     * @param {string} string
     * @return {function():!Promise.<?string>}
     */
    appendAccessibleString: function(string) { },

    finishWriting: function() { },

    reset: function() { },
}


WebInspector.TracingModel.prototype = {
    /**
     * @return {!Array.<!WebInspector.TracingModel.Event>}
     */
    devtoolsPageMetadataEvents: function()
    {
        return this._devtoolsPageMetadataEvents;
    },

    /**
     * @return {!Array.<!WebInspector.TracingModel.Event>}
     */
    devtoolsWorkerMetadataEvents: function()
    {
        return this._devtoolsWorkerMetadataEvents;
    },

    /**
     * @return {?string}
     */
    sessionId: function()
    {
        return this._sessionId;
    },

    /**
     * @param {!Array.<!WebInspector.TracingManager.EventPayload>} events
     */
    setEventsForTest: function(events)
    {
        this.reset();
        this.addEvents(events);
        this.tracingComplete();
    },

    /**
     * @param {!Array.<!WebInspector.TracingManager.EventPayload>} events
     */
    addEvents: function(events)
    {
        for (var i = 0; i < events.length; ++i)
            this._addEvent(events[i]);
    },

    tracingComplete: function()
    {
        this._processMetadataEvents();
        this._processPendingAsyncEvents();
        this._backingStorage.finishWriting();
    },

    reset: function()
    {
        /** @type {!Object.<(number|string), !WebInspector.TracingModel.Process>} */
        this._processById = {};
        this._processByName = new Map();
        this._minimumRecordTime = 0;
        this._maximumRecordTime = 0;
        this._sessionId = null;
        this._devtoolsPageMetadataEvents = [];
        this._devtoolsWorkerMetadataEvents = [];
        this._backingStorage.reset();
        this._appendDelimiter = false;
        /** @type {!Array<!WebInspector.TracingModel.Event>} */
        this._asyncEvents = [];
        /** @type {!Map<string, !WebInspector.TracingModel.AsyncEvent>} */
        this._openAsyncEvents = new Map();
        /** @type {!Map<string, !Array<!WebInspector.TracingModel.AsyncEvent>>} */
        this._openNestableAsyncEvents = new Map();
    },

    /**
      * @param {!WebInspector.TracingManager.EventPayload} payload
      */
    _addEvent: function(payload)
    {
        var process = this._processById[payload.pid];
        if (!process) {
            process = new WebInspector.TracingModel.Process(payload.pid);
            this._processById[payload.pid] = process;
        }

        var eventsDelimiter = ",\n";
        if (this._appendDelimiter)
            this._backingStorage.appendString(eventsDelimiter);
        this._appendDelimiter = true;
        var stringPayload = JSON.stringify(payload);
        var isAccessible = payload.ph === WebInspector.TracingModel.Phase.SnapshotObject;
        var backingStorage = null;
        var keepStringsLessThan = 10000;
        if (isAccessible && stringPayload.length > keepStringsLessThan)
            backingStorage = this._backingStorage.appendAccessibleString(stringPayload);
        else
            this._backingStorage.appendString(stringPayload);

        if (payload.ph !== WebInspector.TracingModel.Phase.Metadata) {
            var timestamp = payload.ts / 1000;
            // We do allow records for unrelated threads to arrive out-of-order,
            // so there's a chance we're getting records from the past.
            if (timestamp && (!this._minimumRecordTime || timestamp < this._minimumRecordTime))
                this._minimumRecordTime = timestamp;
            var endTimeStamp = (payload.ts + (payload.dur || 0)) / 1000;
            this._maximumRecordTime = Math.max(this._maximumRecordTime, endTimeStamp);
            var event = process._addEvent(payload);
            if (!event)
                return;
            // Build async event when we've got events from all threads & processes, so we can sort them and process in the
            // chronological order. However, also add individual async events to the thread flow (above), so we can easily
            // display them on the same chart as other events, should we choose so.
            if (WebInspector.TracingModel.isAsyncPhase(payload.ph))
                this._asyncEvents.push(event);
            event._setBackingStorage(backingStorage);
            if (event.name === WebInspector.TracingModel.DevToolsMetadataEvent.TracingStartedInPage &&
                event.category === WebInspector.TracingModel.DevToolsMetadataEventCategory) {
                this._devtoolsPageMetadataEvents.push(event);
            }
            if (event.name === WebInspector.TracingModel.DevToolsMetadataEvent.TracingSessionIdForWorker &&
                event.category === WebInspector.TracingModel.DevToolsMetadataEventCategory) {
                this._devtoolsWorkerMetadataEvents.push(event);
            }
            return;
        }
        switch (payload.name) {
        case WebInspector.TracingModel.MetadataEvent.ProcessSortIndex:
            process._setSortIndex(payload.args["sort_index"]);
            break;
        case WebInspector.TracingModel.MetadataEvent.ProcessName:
            var processName = payload.args["name"];
            process._setName(processName);
            this._processByName.set(processName, process);
            break;
        case WebInspector.TracingModel.MetadataEvent.ThreadSortIndex:
            process.threadById(payload.tid)._setSortIndex(payload.args["sort_index"]);
            break;
        case WebInspector.TracingModel.MetadataEvent.ThreadName:
            process.threadById(payload.tid)._setName(payload.args["name"]);
            break;
        }
    },

    _processMetadataEvents: function()
    {
        this._devtoolsPageMetadataEvents.sort(WebInspector.TracingModel.Event.compareStartTime);
        if (!this._devtoolsPageMetadataEvents.length) {
            WebInspector.console.error(WebInspector.TracingModel.DevToolsMetadataEvent.TracingStartedInPage + " event not found.");
            return;
        }
        var sessionId = this._devtoolsPageMetadataEvents[0].args["sessionId"] || this._devtoolsPageMetadataEvents[0].args["data"]["sessionId"];
        this._sessionId = sessionId;

        var mismatchingIds = {};
        function checkSessionId(event)
        {
            var args = event.args;
            // FIXME: put sessionId into args["data"] for TracingStartedInPage event.
            if (args["data"])
                args = args["data"];
            var id = args["sessionId"];
            if (id === sessionId)
                return true;
            mismatchingIds[id] = true;
            return false;
        }
        this._devtoolsPageMetadataEvents = this._devtoolsPageMetadataEvents.filter(checkSessionId);
        this._devtoolsWorkerMetadataEvents = this._devtoolsWorkerMetadataEvents.filter(checkSessionId);

        var idList = Object.keys(mismatchingIds);
        if (idList.length)
            WebInspector.console.error("Timeline recording was started in more than one page simultaneously. Session id mismatch: " + this._sessionId + " and " + idList + ".");
    },

    /**
     * @return {number}
     */
    minimumRecordTime: function()
    {
        return this._minimumRecordTime;
    },

    /**
     * @return {number}
     */
    maximumRecordTime: function()
    {
        return this._maximumRecordTime;
    },

    /**
     * @return {!Array.<!WebInspector.TracingModel.Process>}
     */
    sortedProcesses: function()
    {
        return WebInspector.TracingModel.NamedObject._sort(Object.values(this._processById));
    },

    /**
     * @param {string} name
     * @return {?WebInspector.TracingModel.Process}
     */
    processByName: function(name)
    {
        return this._processByName.get(name);
    },

    _processPendingAsyncEvents: function()
    {
        this._asyncEvents.sort(WebInspector.TracingModel.Event.compareStartTime);
        for (var i = 0; i < this._asyncEvents.length; ++i) {
            var event = this._asyncEvents[i];
            if (WebInspector.TracingModel.isNestableAsyncPhase(event.phase))
                this._addNestableAsyncEvent(event);
            else
                this._addAsyncEvent(event);
        }
        this._asyncEvents = [];
        this._closeOpenAsyncEvents();
    },

    _closeOpenAsyncEvents: function()
    {
        for (var event of this._openAsyncEvents.values()) {
            event.setEndTime(this._maximumRecordTime);
            // FIXME: remove this once we figure a better way to convert async console
            // events to sync [waterfall] timeline records.
            event.steps[0].setEndTime(this._maximumRecordTime);
        }
        this._openAsyncEvents.clear();

        for (var eventStack of this._openNestableAsyncEvents.values()) {
            while (eventStack.length)
                eventStack.pop().setEndTime(this._maximumRecordTime);
        }
        this._openNestableAsyncEvents.clear();
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     */
    _addNestableAsyncEvent: function(event)
    {
        var phase = WebInspector.TracingModel.Phase;
        var key = event.category + "." + event.id;
        var openEventsStack = this._openNestableAsyncEvents.get(key);

        switch (event.phase) {
        case phase.NestableAsyncBegin:
            if (!openEventsStack) {
                openEventsStack = [];
                this._openNestableAsyncEvents.set(key, openEventsStack);
            }
            var asyncEvent = new WebInspector.TracingModel.AsyncEvent(event);
            openEventsStack.push(asyncEvent);
            event.thread._addAsyncEvent(asyncEvent);
            break;

        case phase.NestableAsyncInstant:
            if (openEventsStack && openEventsStack.length)
                openEventsStack.peekLast()._addStep(event);
            break;

        case phase.NestableAsyncEnd:
            if (!openEventsStack || !openEventsStack.length)
                break;
            var top = openEventsStack.pop();
            if (top.name !== event.name) {
                console.error("Begin/end event mismatch for nestable async event, " + top.name + " vs. " + event.name);
                break;
            }
            top._addStep(event);
        }
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     */
    _addAsyncEvent: function(event)
    {
        var phase = WebInspector.TracingModel.Phase;
        var key = event.category + "." + event.name + "." + event.id;
        var asyncEvent = this._openAsyncEvents.get(key);

        if (event.phase === phase.AsyncBegin) {
            if (asyncEvent) {
                console.error("Event " + event.name + " has already been started");
                return;
            }
            asyncEvent = new WebInspector.TracingModel.AsyncEvent(event);
            this._openAsyncEvents.set(key, asyncEvent);
            event.thread._addAsyncEvent(asyncEvent);
            return;
        }
        if (!asyncEvent) {
            // Quietly ignore stray async events, we're probably too late for the start.
            return;
        }
        if (event.phase === phase.AsyncEnd) {
            asyncEvent._addStep(event);
            this._openAsyncEvents.delete(key);
            return;
        }
        if (event.phase === phase.AsyncStepInto || event.phase === phase.AsyncStepPast) {
            var lastStep = asyncEvent.steps.peekLast();
            if (lastStep.phase !== phase.AsyncBegin && lastStep.phase !== event.phase) {
                console.assert(false, "Async event step phase mismatch: " + lastStep.phase + " at " + lastStep.startTime + " vs. " + event.phase + " at " + event.startTime);
                return;
            }
            asyncEvent._addStep(event);
            return;
        }
        console.assert(false, "Invalid async event phase");
    },
}

/**
 * @constructor
 * @param {!WebInspector.TracingModel} tracingModel
 */
WebInspector.TracingModel.Loader = function(tracingModel)
{
    this._tracingModel = tracingModel;
    this._firstChunkReceived = false;
}

WebInspector.TracingModel.Loader.prototype = {
    /**
     * @param {!Array.<!WebInspector.TracingManager.EventPayload>} events
     */
    loadNextChunk: function(events)
    {
        if (!this._firstChunkReceived) {
            this._tracingModel.reset();
            this._firstChunkReceived = true;
        }
        this._tracingModel.addEvents(events);
    },

    finish: function()
    {
        this._tracingModel.tracingComplete();
    }
}


/**
 * @constructor
 * @param {string} category
 * @param {string} name
 * @param {!WebInspector.TracingModel.Phase} phase
 * @param {number} startTime
 * @param {!WebInspector.TracingModel.Thread} thread
 */
WebInspector.TracingModel.Event = function(category, name, phase, startTime, thread)
{
    /** @type {string} */
    this.category = category;
    /** @type {string} */
    this.name = name;
    /** @type {!WebInspector.TracingModel.Phase} */
    this.phase = phase;
    /** @type {number} */
    this.startTime = startTime;
    /** @type {!WebInspector.TracingModel.Thread} */
    this.thread = thread;
    /** @type {!Object} */
    this.args = {};

    /** @type {?string} */
    this.warning = null;
    /** @type {?WebInspector.TracingModel.Event} */
    this.initiator = null;
    /** @type {?Array.<!ConsoleAgent.CallFrame>} */
    this.stackTrace = null;
    /** @type {?Element} */
    this.previewElement = null;
    /** @type {?string} */
    this.url = null;
    /** @type {number} */
    this.backendNodeId = 0;

    /** @type {number} */
    this.selfTime = 0;
}

/**
 * @param {!WebInspector.TracingManager.EventPayload} payload
 * @param {!WebInspector.TracingModel.Thread} thread
 * @return {!WebInspector.TracingModel.Event}
 */
WebInspector.TracingModel.Event.fromPayload = function(payload, thread)
{
    var event = new WebInspector.TracingModel.Event(payload.cat, payload.name, /** @type {!WebInspector.TracingModel.Phase} */ (payload.ph), payload.ts / 1000, thread);
    if (payload.args)
        event.addArgs(payload.args);
    else
        console.error("Missing mandatory event argument 'args' at " + payload.ts / 1000);
    if (typeof payload.dur === "number")
        event.setEndTime((payload.ts + payload.dur) / 1000);
    if (payload.id)
        event.id = payload.id;
    return event;
}

WebInspector.TracingModel.Event.prototype = {
    /**
     * @param {number} endTime
     */
    setEndTime: function(endTime)
    {
        if (endTime < this.startTime) {
            console.assert(false, "Event out of order: " + this.name);
            return;
        }
        this.endTime = endTime;
        this.duration = endTime - this.startTime;
    },

    /**
     * @param {!Object} args
     */
    addArgs: function(args)
    {
        // Shallow copy args to avoid modifying original payload which may be saved to file.
        for (var name in args) {
            if (name in this.args)
                console.error("Same argument name (" + name +  ") is used for begin and end phases of " + this.name);
            this.args[name] = args[name];
        }
    },

    /**
     * @param {!WebInspector.TracingManager.EventPayload} payload
     */
    _complete: function(payload)
    {
        if (payload.args)
            this.addArgs(payload.args);
        else
            console.error("Missing mandatory event argument 'args' at " + payload.ts / 1000);
        this.setEndTime(payload.ts / 1000);
    },

    /**
     * @param {?function():!Promise.<?string>} backingStorage
     */
    _setBackingStorage: function(backingStorage)
    {
    }
}

/**
 * @param {!WebInspector.TracingModel.Event} a
 * @param {!WebInspector.TracingModel.Event} b
 * @return {number}
 */
WebInspector.TracingModel.Event.compareStartTime = function (a, b)
{
    return a.startTime - b.startTime;
}

/**
 * @param {!WebInspector.TracingModel.Event} a
 * @param {!WebInspector.TracingModel.Event} b
 * @return {number}
 */
WebInspector.TracingModel.Event.orderedCompareStartTime = function (a, b)
{
    // Array.mergeOrdered coalesces objects if comparator returns 0.
    // To change this behavior this comparator return -1 in the case events
    // startTime's are equal, so both events got placed into the result array.
    return a.startTime - b.startTime || -1;
}

/**
 * @constructor
 * @extends {WebInspector.TracingModel.Event}
 * @param {string} category
 * @param {string} name
 * @param {number} startTime
 * @param {!WebInspector.TracingModel.Thread} thread
 */
WebInspector.TracingModel.ObjectSnapshot = function(category, name, startTime, thread)
{
    WebInspector.TracingModel.Event.call(this, category, name, WebInspector.TracingModel.Phase.SnapshotObject, startTime, thread);
}

/**
 * @param {!WebInspector.TracingManager.EventPayload} payload
 * @param {!WebInspector.TracingModel.Thread} thread
 * @return {!WebInspector.TracingModel.ObjectSnapshot}
 */
WebInspector.TracingModel.ObjectSnapshot.fromPayload = function(payload, thread)
{
    var snapshot = new WebInspector.TracingModel.ObjectSnapshot(payload.cat, payload.name, payload.ts / 1000, thread);
    if (payload.id)
        snapshot.id = payload.id;
    if (!payload.args || !payload.args["snapshot"]) {
        console.error("Missing mandatory 'snapshot' argument at " + payload.ts / 1000);
        return snapshot;
    }
    if (payload.args)
        snapshot.addArgs(payload.args);
    return snapshot;
}

WebInspector.TracingModel.ObjectSnapshot.prototype = {
    /**
     * @param {function(?Object)} callback
     */
    requestObject: function(callback)
    {
        var snapshot = this.args["snapshot"];
        if (snapshot) {
            callback(snapshot);
            return;
        }
        this._backingStorage().then(onRead, callback.bind(null, null));
        /**
         * @param {?string} result
         */
        function onRead(result)
        {
            if (!result) {
                callback(null);
                return;
            }
            try {
                var payload = JSON.parse(result);
                callback(payload["args"]["snapshot"]);
            } catch (e) {
                WebInspector.console.error("Malformed event data in backing storage");
                callback(null);
            }
        }
    },

    /**
     * @override
     * @param {?function():!Promise.<?string>} backingStorage
     */
    _setBackingStorage: function(backingStorage)
    {
        if (!backingStorage)
            return;
        this._backingStorage = backingStorage;
        this.args = {};
    },

    __proto__: WebInspector.TracingModel.Event.prototype
}

/**
 * @constructor
 * @param {!WebInspector.TracingModel.Event} startEvent
 * @extends {WebInspector.TracingModel.Event}
 */
WebInspector.TracingModel.AsyncEvent = function(startEvent)
{
    WebInspector.TracingModel.Event.call(this, startEvent.category, startEvent.name, startEvent.phase, startEvent.startTime, startEvent.thread)
    this.addArgs(startEvent.args);
    this.steps = [startEvent];
}

WebInspector.TracingModel.AsyncEvent.prototype = {
    /**
     * @param {!WebInspector.TracingModel.Event} event
     */
    _addStep: function(event)
    {
        this.steps.push(event)
        if (event.phase === WebInspector.TracingModel.Phase.AsyncEnd || event.phase === WebInspector.TracingModel.Phase.NestableAsyncEnd) {
            this.setEndTime(event.startTime);
            // FIXME: ideally, we shouldn't do this, but this makes the logic of converting
            // async console events to sync ones much simpler.
            this.steps[0].setEndTime(event.startTime);
        }
    },

    __proto__: WebInspector.TracingModel.Event.prototype
}

/**
 * @constructor
 */
WebInspector.TracingModel.NamedObject = function()
{
}

WebInspector.TracingModel.NamedObject.prototype =
{
    /**
     * @param {string} name
     */
    _setName: function(name)
    {
        this._name = name;
    },

    /**
     * @return {string}
     */
    name: function()
    {
        return this._name;
    },

    /**
     * @param {number} sortIndex
     */
    _setSortIndex: function(sortIndex)
    {
        this._sortIndex = sortIndex;
    },
}

/**
 * @param {!Array.<!WebInspector.TracingModel.NamedObject>} array
 */
WebInspector.TracingModel.NamedObject._sort = function(array)
{
    /**
     * @param {!WebInspector.TracingModel.NamedObject} a
     * @param {!WebInspector.TracingModel.NamedObject} b
     */
    function comparator(a, b)
    {
        return a._sortIndex !== b._sortIndex ? a._sortIndex - b._sortIndex : a.name().localeCompare(b.name());
    }
    return array.sort(comparator);
}

/**
 * @constructor
 * @extends {WebInspector.TracingModel.NamedObject}
 * @param {number} id
 */
WebInspector.TracingModel.Process = function(id)
{
    WebInspector.TracingModel.NamedObject.call(this);
    this._setName("Process " + id);
    this._id = id;
    /** @type {!Object.<number, !WebInspector.TracingModel.Thread>} */
    this._threads = {};
    this._threadByName = new Map();
    this._objects = {};
}

WebInspector.TracingModel.Process.prototype = {
    /**
     * @return {number}
     */
    id: function()
    {
        return this._id;
    },

    /**
     * @param {number} id
     * @return {!WebInspector.TracingModel.Thread}
     */
    threadById: function(id)
    {
        var thread = this._threads[id];
        if (!thread) {
            thread = new WebInspector.TracingModel.Thread(this, id);
            this._threads[id] = thread;
        }
        return thread;
    },

    /**
     * @param {string} name
     * @return {?WebInspector.TracingModel.Thread}
     */
    threadByName: function(name)
    {
        return this._threadByName.get(name) || null;
    },

    /**
     * @param {string} name
     * @param {!WebInspector.TracingModel.Thread} thread
     */
    _setThreadByName: function(name, thread)
    {
        this._threadByName.set(name, thread);
    },

    /**
     * @param {!WebInspector.TracingManager.EventPayload} payload
     * @return {?WebInspector.TracingModel.Event} event
     */
    _addEvent: function(payload)
    {
        var phase = WebInspector.TracingModel.Phase;

        var event = this.threadById(payload.tid)._addEvent(payload);
        if (!event)
            return null;
        if (payload.ph === phase.SnapshotObject)
            this.objectsByName(event.name).push(event);
        return event;
    },

    /**
     * @param {string} name
     * @return {!Array.<!WebInspector.TracingModel.Event>}
     */
    objectsByName: function(name)
    {
        var objects = this._objects[name];
        if (!objects) {
            objects = [];
            this._objects[name] = objects;
        }
        return objects;
    },

    /**
     * @return {!Array.<string>}
     */
    sortedObjectNames: function()
    {
        return Object.keys(this._objects).sort();
    },

    /**
     * @return {!Array.<!WebInspector.TracingModel.Thread>}
     */
    sortedThreads: function()
    {
        return WebInspector.TracingModel.NamedObject._sort(Object.values(this._threads));
    },

    __proto__: WebInspector.TracingModel.NamedObject.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TracingModel.NamedObject}
 * @param {!WebInspector.TracingModel.Process} process
 * @param {number} id
 */
WebInspector.TracingModel.Thread = function(process, id)
{
    WebInspector.TracingModel.NamedObject.call(this);
    this._process = process;
    this._setName("Thread " + id);
    this._events = [];
    this._asyncEvents = [];
    this._id = id;

    this._stack = [];
}

WebInspector.TracingModel.Thread.prototype = {
    /**
     * @return {?WebInspector.Target}
     */
    target: function()
    {
        //FIXME: correctly specify target
        if (this.name() === "CrRendererMain")
            return WebInspector.targetManager.targets()[0] || null;
        else
            return null;
    },

    /**
     * @param {!WebInspector.TracingManager.EventPayload} payload
     * @return {?WebInspector.TracingModel.Event} event
     */
    _addEvent: function(payload)
    {
        var timestamp = payload.ts / 1000;
        if (payload.ph === WebInspector.TracingModel.Phase.End) {
            // Quietly ignore unbalanced close events, they're legit (we could have missed start one).
            if (!this._stack.length)
                return null;
            var top = this._stack.pop();
            if (top.name !== payload.name || top.category !== payload.cat)
                console.error("B/E events mismatch at " + top.startTime + " (" + top.name + ") vs. " + timestamp + " (" + payload.name + ")");
            else
                top._complete(payload);
            return null;
        }
        var event = payload.ph === WebInspector.TracingModel.Phase.SnapshotObject
            ? WebInspector.TracingModel.ObjectSnapshot.fromPayload(payload, this)
            : WebInspector.TracingModel.Event.fromPayload(payload, this);
        if (payload.ph === WebInspector.TracingModel.Phase.Begin)
            this._stack.push(event);
        if (this._events.length && this._events.peekLast().startTime > event.startTime)
            console.assert(false, "Event is out of order: " + event.name);
        this._events.push(event);
        return event;
    },

    /**
     * @param {!WebInspector.TracingModel.AsyncEvent} asyncEvent
     */
    _addAsyncEvent: function(asyncEvent)
    {
        this._asyncEvents.push(asyncEvent);
    },

    /**
     * @override
     * @param {string} name
     */
    _setName: function(name)
    {
        WebInspector.TracingModel.NamedObject.prototype._setName.call(this, name);
        this._process._setThreadByName(name, this);
    },

    /**
     * @return {number}
     */
    id: function()
    {
        return this._id;
    },

    /**
     * @return {!WebInspector.TracingModel.Process}
     */
    process: function()
    {
        return this._process;
    },

    /**
     * @return {!Array.<!WebInspector.TracingModel.Event>}
     */
    events: function()
    {
        return this._events;
    },

    /**
     * @return {!Array.<!WebInspector.TracingModel.AsyncEvent>}
     */
    asyncEvents: function()
    {
        return this._asyncEvents;
    },

    __proto__: WebInspector.TracingModel.NamedObject.prototype
}

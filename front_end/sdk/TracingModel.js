/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @unrestricted
 */
WebInspector.TracingModel = class {
  /**
   * @param {!WebInspector.BackingStorage} backingStorage
   */
  constructor(backingStorage) {
    this._backingStorage = backingStorage;
    // Avoid extra reset of the storage as it's expensive.
    this._firstWritePending = true;
    this.reset();
  }

  /**
   * @param {string} phase
   * @return {boolean}
   */
  static isNestableAsyncPhase(phase) {
    return phase === 'b' || phase === 'e' || phase === 'n';
  }

  /**
   * @param {string} phase
   * @return {boolean}
   */
  static isAsyncBeginPhase(phase) {
    return phase === 'S' || phase === 'b';
  }

  /**
   * @param {string} phase
   * @return {boolean}
   */
  static isAsyncPhase(phase) {
    return WebInspector.TracingModel.isNestableAsyncPhase(phase) || phase === 'S' || phase === 'T' || phase === 'F' ||
        phase === 'p';
  }

  /**
   * @param {string} phase
   * @return {boolean}
   */
  static isFlowPhase(phase) {
    return phase === 's' || phase === 't' || phase === 'f';
  }

  /**
   * @param {!WebInspector.TracingModel.Event} event
   * @return {boolean}
   */
  static isTopLevelEvent(event) {
    return event.hasCategory(WebInspector.TracingModel.TopLevelEventCategory) ||
        event.hasCategory(WebInspector.TracingModel.DevToolsMetadataEventCategory) &&
        event.name === 'Program';  // Older timelines may have this instead of toplevel.
  }

  /**
   * @param {!WebInspector.TracingManager.EventPayload} payload
   * @return {string|undefined}
   */
  static _extractId(payload) {
    var scope = payload.scope || '';
    if (typeof payload.id2 === 'undefined')
      return scope && payload.id ? `${scope}@${payload.id}` : payload.id;
    var id2 = payload.id2;
    if (typeof id2 === 'object' && ('global' in id2) !== ('local' in id2))
      return typeof id2['global'] !== 'undefined' ? `:${scope}:${id2['global']}` :
                                                    `:${scope}:${payload.pid}:${id2['local']}`;
    console.error(
        `Unexpected id2 field at ${payload.ts / 1000}, one and only one of 'local' and 'global' should be present.`);
  }

  /**
   * @param {!WebInspector.TracingModel} tracingModel
   * @return {?WebInspector.TracingModel.Thread}
   *
   * TODO: Move this to a better place. This is here just for convenience o
   * re-use between modules. This really belongs to a higher level, since it
   * is specific to chrome's usage of tracing.
   */
  static browserMainThread(tracingModel) {
    var processes = tracingModel.sortedProcesses();
    // Avoid warning for an empty model.
    if (!processes.length)
      return null;
    var browserProcesses = [];
    var crRendererMainThreads = [];
    for (var process of processes) {
      if (process.name().toLowerCase().endsWith('browser'))
        browserProcesses.push(process);
      crRendererMainThreads.push(...process.sortedThreads().filter(t => t.name() === 'CrBrowserMain'));
    }
    if (crRendererMainThreads.length === 1)
      return crRendererMainThreads[0];
    if (browserProcesses.length === 1)
      return browserProcesses[0].threadByName('CrBrowserMain');
    var tracingStartedInBrowser =
        tracingModel.devToolsMetadataEvents().filter(e => e.name === 'TracingStartedInBrowser');
    if (tracingStartedInBrowser.length === 1)
      return tracingStartedInBrowser[0].thread;
    WebInspector.console.error(
        'Failed to find browser main thread in trace, some timeline features may be unavailable');
    return null;
  }

  /**
   * @return {!Array.<!WebInspector.TracingModel.Event>}
   */
  devToolsMetadataEvents() {
    return this._devToolsMetadataEvents;
  }

  /**
   * @param {!Array.<!WebInspector.TracingManager.EventPayload>} events
   */
  setEventsForTest(events) {
    this.reset();
    this.addEvents(events);
    this.tracingComplete();
  }

  /**
   * @param {!Array.<!WebInspector.TracingManager.EventPayload>} events
   */
  addEvents(events) {
    for (var i = 0; i < events.length; ++i)
      this._addEvent(events[i]);
  }

  tracingComplete() {
    this._processPendingAsyncEvents();
    this._backingStorage.appendString(this._firstWritePending ? '[]' : ']');
    this._backingStorage.finishWriting();
    this._firstWritePending = false;
    for (var process of this._processById.values()) {
      for (var thread of process._threads.values())
        thread.tracingComplete();
    }
  }

  reset() {
    /** @type {!Map<(number|string), !WebInspector.TracingModel.Process>} */
    this._processById = new Map();
    this._processByName = new Map();
    this._minimumRecordTime = 0;
    this._maximumRecordTime = 0;
    this._devToolsMetadataEvents = [];
    if (!this._firstWritePending)
      this._backingStorage.reset();

    this._firstWritePending = true;
    /** @type {!Array<!WebInspector.TracingModel.Event>} */
    this._asyncEvents = [];
    /** @type {!Map<string, !WebInspector.TracingModel.AsyncEvent>} */
    this._openAsyncEvents = new Map();
    /** @type {!Map<string, !Array<!WebInspector.TracingModel.AsyncEvent>>} */
    this._openNestableAsyncEvents = new Map();
    /** @type {!Map<string, !WebInspector.TracingModel.ProfileEventsGroup>} */
    this._profileGroups = new Map();
    /** @type {!Map<string, !Set<string>>} */
    this._parsedCategories = new Map();
  }

  /**
   * @param {!WebInspector.TracingManager.EventPayload} payload
   */
  _addEvent(payload) {
    var process = this._processById.get(payload.pid);
    if (!process) {
      process = new WebInspector.TracingModel.Process(this, payload.pid);
      this._processById.set(payload.pid, process);
    }

    var eventsDelimiter = ',\n';
    this._backingStorage.appendString(this._firstWritePending ? '[' : eventsDelimiter);
    this._firstWritePending = false;
    var stringPayload = JSON.stringify(payload);
    var isAccessible = payload.ph === WebInspector.TracingModel.Phase.SnapshotObject;
    var backingStorage = null;
    var keepStringsLessThan = 10000;
    if (isAccessible && stringPayload.length > keepStringsLessThan)
      backingStorage = this._backingStorage.appendAccessibleString(stringPayload);
    else
      this._backingStorage.appendString(stringPayload);

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
    if (payload.ph === WebInspector.TracingModel.Phase.Sample) {
      this._addSampleEvent(event);
      return;
    }
    // Build async event when we've got events from all threads & processes, so we can sort them and process in the
    // chronological order. However, also add individual async events to the thread flow (above), so we can easily
    // display them on the same chart as other events, should we choose so.
    if (WebInspector.TracingModel.isAsyncPhase(payload.ph))
      this._asyncEvents.push(event);
    event._setBackingStorage(backingStorage);
    if (event.hasCategory(WebInspector.TracingModel.DevToolsMetadataEventCategory))
      this._devToolsMetadataEvents.push(event);

    if (payload.ph !== WebInspector.TracingModel.Phase.Metadata)
      return;

    switch (payload.name) {
      case WebInspector.TracingModel.MetadataEvent.ProcessSortIndex:
        process._setSortIndex(payload.args['sort_index']);
        break;
      case WebInspector.TracingModel.MetadataEvent.ProcessName:
        var processName = payload.args['name'];
        process._setName(processName);
        this._processByName.set(processName, process);
        break;
      case WebInspector.TracingModel.MetadataEvent.ThreadSortIndex:
        process.threadById(payload.tid)._setSortIndex(payload.args['sort_index']);
        break;
      case WebInspector.TracingModel.MetadataEvent.ThreadName:
        process.threadById(payload.tid)._setName(payload.args['name']);
        break;
    }
  }

  /**
   * @param {!WebInspector.TracingModel.Event} event
   */
  _addSampleEvent(event) {
    var group = this._profileGroups.get(event.id);
    if (group)
      group._addChild(event);
    else
      this._profileGroups.set(event.id, new WebInspector.TracingModel.ProfileEventsGroup(event));
  }

  /**
   * @param {string} id
   * @return {?WebInspector.TracingModel.ProfileEventsGroup}
   */
  profileGroup(id) {
    return this._profileGroups.get(id) || null;
  }

  /**
   * @return {number}
   */
  minimumRecordTime() {
    return this._minimumRecordTime;
  }

  /**
   * @return {number}
   */
  maximumRecordTime() {
    return this._maximumRecordTime;
  }

  /**
   * @return {!Array.<!WebInspector.TracingModel.Process>}
   */
  sortedProcesses() {
    return WebInspector.TracingModel.NamedObject._sort(this._processById.valuesArray());
  }

  /**
   * @param {string} name
   * @return {?WebInspector.TracingModel.Process}
   */
  processByName(name) {
    return this._processByName.get(name);
  }

  /**
   * @param {string} processName
   * @param {string} threadName
   * @return {?WebInspector.TracingModel.Thread}
   */
  threadByName(processName, threadName) {
    var process = this.processByName(processName);
    return process && process.threadByName(threadName);
  }

  _processPendingAsyncEvents() {
    this._asyncEvents.stableSort(WebInspector.TracingModel.Event.compareStartTime);
    for (var i = 0; i < this._asyncEvents.length; ++i) {
      var event = this._asyncEvents[i];
      if (WebInspector.TracingModel.isNestableAsyncPhase(event.phase))
        this._addNestableAsyncEvent(event);
      else
        this._addAsyncEvent(event);
    }
    this._asyncEvents = [];
    this._closeOpenAsyncEvents();
  }

  _closeOpenAsyncEvents() {
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
  }

  /**
   * @param {!WebInspector.TracingModel.Event} event
   */
  _addNestableAsyncEvent(event) {
    var phase = WebInspector.TracingModel.Phase;
    var key = event.categoriesString + '.' + event.id;
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
          console.error(
              `Begin/end event mismatch for nestable async event, ${top.name} vs. ${event.name}, key: ${key}`);
          break;
        }
        top._addStep(event);
    }
  }

  /**
   * @param {!WebInspector.TracingModel.Event} event
   */
  _addAsyncEvent(event) {
    var phase = WebInspector.TracingModel.Phase;
    var key = event.categoriesString + '.' + event.name + '.' + event.id;
    var asyncEvent = this._openAsyncEvents.get(key);

    if (event.phase === phase.AsyncBegin) {
      if (asyncEvent) {
        console.error(`Event ${event.name} has already been started`);
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
        console.assert(
            false, 'Async event step phase mismatch: ' + lastStep.phase + ' at ' + lastStep.startTime + ' vs. ' +
                event.phase + ' at ' + event.startTime);
        return;
      }
      asyncEvent._addStep(event);
      return;
    }
    console.assert(false, 'Invalid async event phase');
  }

  /**
   * @param {string} str
   * @return {!Set<string>}
   */
  _parsedCategoriesForString(str) {
    var parsedCategories = this._parsedCategories.get(str);
    if (!parsedCategories) {
      parsedCategories = new Set(str.split(','));
      this._parsedCategories.set(str, parsedCategories);
    }
    return parsedCategories;
  }
};

/**
 * @enum {string}
 */
WebInspector.TracingModel.Phase = {
  Begin: 'B',
  End: 'E',
  Complete: 'X',
  Instant: 'I',
  AsyncBegin: 'S',
  AsyncStepInto: 'T',
  AsyncStepPast: 'p',
  AsyncEnd: 'F',
  NestableAsyncBegin: 'b',
  NestableAsyncEnd: 'e',
  NestableAsyncInstant: 'n',
  FlowBegin: 's',
  FlowStep: 't',
  FlowEnd: 'f',
  Metadata: 'M',
  Counter: 'C',
  Sample: 'P',
  CreateObject: 'N',
  SnapshotObject: 'O',
  DeleteObject: 'D'
};

WebInspector.TracingModel.MetadataEvent = {
  ProcessSortIndex: 'process_sort_index',
  ProcessName: 'process_name',
  ThreadSortIndex: 'thread_sort_index',
  ThreadName: 'thread_name'
};

WebInspector.TracingModel.TopLevelEventCategory = 'toplevel';
WebInspector.TracingModel.DevToolsMetadataEventCategory = 'disabled-by-default-devtools.timeline';
WebInspector.TracingModel.DevToolsTimelineEventCategory = 'disabled-by-default-devtools.timeline';

WebInspector.TracingModel.FrameLifecycleEventCategory = 'cc,devtools';


/**
 * @interface
 */
WebInspector.BackingStorage = function() {};

WebInspector.BackingStorage.prototype = {
  /**
   * @param {string} string
   */
  appendString: function(string) {},

  /**
   * @param {string} string
   * @return {function():!Promise.<?string>}
   */
  appendAccessibleString: function(string) {},

  finishWriting: function() {},

  reset: function() {},
};

/**
 * @unrestricted
 */
WebInspector.TracingModel.Event = class {
  /**
   * @param {string} categories
   * @param {string} name
   * @param {!WebInspector.TracingModel.Phase} phase
   * @param {number} startTime
   * @param {!WebInspector.TracingModel.Thread} thread
   */
  constructor(categories, name, phase, startTime, thread) {
    /** @type {string} */
    this.categoriesString = categories;
    /** @type {!Set<string>} */
    this._parsedCategories = thread._model._parsedCategoriesForString(categories);
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
    /** @type {?Array<!RuntimeAgent.CallFrame>} */
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
  static fromPayload(payload, thread) {
    var event = new WebInspector.TracingModel.Event(
        payload.cat, payload.name, /** @type {!WebInspector.TracingModel.Phase} */ (payload.ph), payload.ts / 1000,
        thread);
    if (payload.args)
      event.addArgs(payload.args);
    else
      console.error('Missing mandatory event argument \'args\' at ' + payload.ts / 1000);
    if (typeof payload.dur === 'number')
      event.setEndTime((payload.ts + payload.dur) / 1000);
    var id = WebInspector.TracingModel._extractId(payload);
    if (typeof id !== 'undefined')
      event.id = id;
    if (payload.bind_id)
      event.bind_id = payload.bind_id;

    return event;
  }

  /**
   * @param {!WebInspector.TracingModel.Event} a
   * @param {!WebInspector.TracingModel.Event} b
   * @return {number}
   */
  static compareStartTime(a, b) {
    return a.startTime - b.startTime;
  }

  /**
   * @param {!WebInspector.TracingModel.Event} a
   * @param {!WebInspector.TracingModel.Event} b
   * @return {number}
   */
  static compareStartAndEndTime(a, b) {
    return a.startTime - b.startTime || (b.endTime !== undefined && a.endTime !== undefined && b.endTime - a.endTime) ||
        0;
  }

  /**
   * @param {!WebInspector.TracingModel.Event} a
   * @param {!WebInspector.TracingModel.Event} b
   * @return {number}
   */
  static orderedCompareStartTime(a, b) {
    // Array.mergeOrdered coalesces objects if comparator returns 0.
    // To change this behavior this comparator return -1 in the case events
    // startTime's are equal, so both events got placed into the result array.
    return a.startTime - b.startTime || a.ordinal - b.ordinal || -1;
  }

  /**
   * @param {string} categoryName
   * @return {boolean}
   */
  hasCategory(categoryName) {
    return this._parsedCategories.has(categoryName);
  }

  /**
   * @param {number} endTime
   */
  setEndTime(endTime) {
    if (endTime < this.startTime) {
      console.assert(false, 'Event out of order: ' + this.name);
      return;
    }
    this.endTime = endTime;
    this.duration = endTime - this.startTime;
  }

  /**
   * @param {!Object} args
   */
  addArgs(args) {
    // Shallow copy args to avoid modifying original payload which may be saved to file.
    for (var name in args) {
      if (name in this.args)
        console.error('Same argument name (' + name + ') is used for begin and end phases of ' + this.name);
      this.args[name] = args[name];
    }
  }

  /**
   * @param {!WebInspector.TracingModel.Event} endEvent
   */
  _complete(endEvent) {
    if (endEvent.args)
      this.addArgs(endEvent.args);
    else
      console.error('Missing mandatory event argument \'args\' at ' + endEvent.startTime);
    this.setEndTime(endEvent.startTime);
  }

  /**
   * @param {?function():!Promise.<?string>} backingStorage
   */
  _setBackingStorage(backingStorage) {
  }
};


/**
 * @unrestricted
 */
WebInspector.TracingModel.ObjectSnapshot = class extends WebInspector.TracingModel.Event {
  /**
   * @param {string} category
   * @param {string} name
   * @param {number} startTime
   * @param {!WebInspector.TracingModel.Thread} thread
   */
  constructor(category, name, startTime, thread) {
    super(category, name, WebInspector.TracingModel.Phase.SnapshotObject, startTime, thread);
  }

  /**
   * @param {!WebInspector.TracingManager.EventPayload} payload
   * @param {!WebInspector.TracingModel.Thread} thread
   * @return {!WebInspector.TracingModel.ObjectSnapshot}
   */
  static fromPayload(payload, thread) {
    var snapshot = new WebInspector.TracingModel.ObjectSnapshot(payload.cat, payload.name, payload.ts / 1000, thread);
    var id = WebInspector.TracingModel._extractId(payload);
    if (typeof id !== 'undefined')
      snapshot.id = id;
    if (!payload.args || !payload.args['snapshot']) {
      console.error('Missing mandatory \'snapshot\' argument at ' + payload.ts / 1000);
      return snapshot;
    }
    if (payload.args)
      snapshot.addArgs(payload.args);
    return snapshot;
  }

  /**
   * @param {function(?)} callback
   */
  requestObject(callback) {
    var snapshot = this.args['snapshot'];
    if (snapshot) {
      callback(snapshot);
      return;
    }
    this._backingStorage().then(onRead, callback.bind(null, null));
    /**
     * @param {?string} result
     */
    function onRead(result) {
      if (!result) {
        callback(null);
        return;
      }
      try {
        var payload = JSON.parse(result);
        callback(payload['args']['snapshot']);
      } catch (e) {
        WebInspector.console.error('Malformed event data in backing storage');
        callback(null);
      }
    }
  }

  /**
   * @return {!Promise<?>}
   */
  objectPromise() {
    if (!this._objectPromise)
      this._objectPromise = new Promise(this.requestObject.bind(this));
    return this._objectPromise;
  }

  /**
   * @override
   * @param {?function():!Promise.<?>} backingStorage
   */
  _setBackingStorage(backingStorage) {
    if (!backingStorage)
      return;
    this._backingStorage = backingStorage;
    this.args = {};
  }
};


/**
 * @unrestricted
 */
WebInspector.TracingModel.AsyncEvent = class extends WebInspector.TracingModel.Event {
  /**
   * @param {!WebInspector.TracingModel.Event} startEvent
   */
  constructor(startEvent) {
    super(startEvent.categoriesString, startEvent.name, startEvent.phase, startEvent.startTime, startEvent.thread);
    this.addArgs(startEvent.args);
    this.steps = [startEvent];
  }

  /**
   * @param {!WebInspector.TracingModel.Event} event
   */
  _addStep(event) {
    this.steps.push(event);
    if (event.phase === WebInspector.TracingModel.Phase.AsyncEnd ||
        event.phase === WebInspector.TracingModel.Phase.NestableAsyncEnd) {
      this.setEndTime(event.startTime);
      // FIXME: ideally, we shouldn't do this, but this makes the logic of converting
      // async console events to sync ones much simpler.
      this.steps[0].setEndTime(event.startTime);
    }
  }
};

/**
 * @unrestricted
 */
WebInspector.TracingModel.ProfileEventsGroup = class {
  /**
   * @param {!WebInspector.TracingModel.Event} event
   */
  constructor(event) {
    /** @type {!Array<!WebInspector.TracingModel.Event>} */
    this.children = [event];
  }

  /**
   * @param {!WebInspector.TracingModel.Event} event
   */
  _addChild(event) {
    this.children.push(event);
  }
};

/**
 * @unrestricted
 */
WebInspector.TracingModel.NamedObject = class {
  /**
   * @param {!Array.<!WebInspector.TracingModel.NamedObject>} array
   */
  static _sort(array) {
    /**
     * @param {!WebInspector.TracingModel.NamedObject} a
     * @param {!WebInspector.TracingModel.NamedObject} b
     */
    function comparator(a, b) {
      return a._sortIndex !== b._sortIndex ? a._sortIndex - b._sortIndex : a.name().localeCompare(b.name());
    }
    return array.sort(comparator);
  }

  /**
   * @param {string} name
   */
  _setName(name) {
    this._name = name;
  }

  /**
   * @return {string}
   */
  name() {
    return this._name;
  }

  /**
   * @param {number} sortIndex
   */
  _setSortIndex(sortIndex) {
    this._sortIndex = sortIndex;
  }
};


/**
 * @unrestricted
 */
WebInspector.TracingModel.Process = class extends WebInspector.TracingModel.NamedObject {
  /**
   * @param {!WebInspector.TracingModel} model
   * @param {number} id
   */
  constructor(model, id) {
    super();
    this._setName('Process ' + id);
    this._id = id;
    /** @type {!Map<number, !WebInspector.TracingModel.Thread>} */
    this._threads = new Map();
    this._threadByName = new Map();
    this._model = model;
  }

  /**
   * @return {number}
   */
  id() {
    return this._id;
  }

  /**
   * @param {number} id
   * @return {!WebInspector.TracingModel.Thread}
   */
  threadById(id) {
    var thread = this._threads.get(id);
    if (!thread) {
      thread = new WebInspector.TracingModel.Thread(this, id);
      this._threads.set(id, thread);
    }
    return thread;
  }

  /**
   * @param {string} name
   * @return {?WebInspector.TracingModel.Thread}
   */
  threadByName(name) {
    return this._threadByName.get(name) || null;
  }

  /**
   * @param {string} name
   * @param {!WebInspector.TracingModel.Thread} thread
   */
  _setThreadByName(name, thread) {
    this._threadByName.set(name, thread);
  }

  /**
   * @param {!WebInspector.TracingManager.EventPayload} payload
   * @return {?WebInspector.TracingModel.Event} event
   */
  _addEvent(payload) {
    return this.threadById(payload.tid)._addEvent(payload);
  }

  /**
   * @return {!Array.<!WebInspector.TracingModel.Thread>}
   */
  sortedThreads() {
    return WebInspector.TracingModel.NamedObject._sort(this._threads.valuesArray());
  }
};

/**
 * @unrestricted
 */
WebInspector.TracingModel.Thread = class extends WebInspector.TracingModel.NamedObject {
  /**
   * @param {!WebInspector.TracingModel.Process} process
   * @param {number} id
   */
  constructor(process, id) {
    super();
    this._process = process;
    this._setName('Thread ' + id);
    this._events = [];
    this._asyncEvents = [];
    this._id = id;
    this._model = process._model;
  }

  tracingComplete() {
    this._asyncEvents.stableSort(WebInspector.TracingModel.Event.compareStartAndEndTime);
    this._events.stableSort(WebInspector.TracingModel.Event.compareStartTime);
    var phases = WebInspector.TracingModel.Phase;
    var stack = [];
    for (var i = 0; i < this._events.length; ++i) {
      var e = this._events[i];
      e.ordinal = i;
      switch (e.phase) {
        case phases.End:
          this._events[i] = null;  // Mark for removal.
          // Quietly ignore unbalanced close events, they're legit (we could have missed start one).
          if (!stack.length)
            continue;
          var top = stack.pop();
          if (top.name !== e.name || top.categoriesString !== e.categoriesString)
            console.error(
                'B/E events mismatch at ' + top.startTime + ' (' + top.name + ') vs. ' + e.startTime + ' (' + e.name +
                ')');
          else
            top._complete(e);
          break;
        case phases.Begin:
          stack.push(e);
          break;
      }
    }
    while (stack.length)
      stack.pop().setEndTime(this._model.maximumRecordTime());
    this._events.remove(null, false);
  }

  /**
   * @param {!WebInspector.TracingManager.EventPayload} payload
   * @return {?WebInspector.TracingModel.Event} event
   */
  _addEvent(payload) {
    var event = payload.ph === WebInspector.TracingModel.Phase.SnapshotObject ?
        WebInspector.TracingModel.ObjectSnapshot.fromPayload(payload, this) :
        WebInspector.TracingModel.Event.fromPayload(payload, this);
    if (WebInspector.TracingModel.isTopLevelEvent(event)) {
      // Discard nested "top-level" events.
      if (this._lastTopLevelEvent && this._lastTopLevelEvent.endTime > event.startTime)
        return null;
      this._lastTopLevelEvent = event;
    }
    this._events.push(event);
    return event;
  }

  /**
   * @param {!WebInspector.TracingModel.AsyncEvent} asyncEvent
   */
  _addAsyncEvent(asyncEvent) {
    this._asyncEvents.push(asyncEvent);
  }

  /**
   * @override
   * @param {string} name
   */
  _setName(name) {
    super._setName(name);
    this._process._setThreadByName(name, this);
  }

  /**
   * @return {number}
   */
  id() {
    return this._id;
  }

  /**
   * @return {!WebInspector.TracingModel.Process}
   */
  process() {
    return this._process;
  }

  /**
   * @return {!Array.<!WebInspector.TracingModel.Event>}
   */
  events() {
    return this._events;
  }

  /**
   * @return {!Array.<!WebInspector.TracingModel.AsyncEvent>}
   */
  asyncEvents() {
    return this._asyncEvents;
  }
};

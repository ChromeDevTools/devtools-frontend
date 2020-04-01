// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import {EventPayload} from './TracingManager.js';  // eslint-disable-line no-unused-vars

export class TracingModel {
  /**
   * @param {!BackingStorage} backingStorage
   */
  constructor(backingStorage) {
    this._backingStorage = backingStorage;
    // Avoid extra reset of the storage as it's expensive.
    this._firstWritePending = true;
    /** @type {!Map<(number|string), !Process>} */
    this._processById = new Map();
    this._processByName = new Map();
    this._minimumRecordTime = 0;
    this._maximumRecordTime = 0;
    this._devToolsMetadataEvents = [];
    /** @type {!Array<!Event>} */
    this._asyncEvents = [];
    /** @type {!Map<string, !AsyncEvent>} */
    this._openAsyncEvents = new Map();
    /** @type {!Map<string, !Array<!AsyncEvent>>} */
    this._openNestableAsyncEvents = new Map();
    /** @type {!Map<string, !ProfileEventsGroup>} */
    this._profileGroups = new Map();
    /** @type {!Map<string, !Set<string>>} */
    this._parsedCategories = new Map();
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
    return TracingModel.isNestableAsyncPhase(phase) || phase === 'S' || phase === 'T' || phase === 'F' || phase === 'p';
  }

  /**
   * @param {string} phase
   * @return {boolean}
   */
  static isFlowPhase(phase) {
    return phase === 's' || phase === 't' || phase === 'f';
  }

  /**
   * @param {!Event} event
   * @return {boolean}
   */
  static isTopLevelEvent(event) {
    return event.hasCategory(DevToolsTimelineEventCategory) && event.name === 'RunTask' ||
        event.hasCategory(LegacyTopLevelEventCategory) ||
        event.hasCategory(DevToolsMetadataEventCategory) &&
        event.name === 'Program';  // Older timelines may have this instead of toplevel.
  }

  /**
   * @param {!EventPayload} payload
   * @return {string|undefined}
   */
  static _extractId(payload) {
    const scope = payload.scope || '';
    if (typeof payload.id2 === 'undefined') {
      return scope && payload.id ? `${scope}@${payload.id}` : payload.id;
    }
    const id2 = payload.id2;
    if (typeof id2 === 'object' && ('global' in id2) !== ('local' in id2)) {
      return typeof id2['global'] !== 'undefined' ? `:${scope}:${id2['global']}` :
                                                    `:${scope}:${payload.pid}:${id2['local']}`;
    }
    console.error(
        `Unexpected id2 field at ${payload.ts / 1000}, one and only one of 'local' and 'global' should be present.`);
  }

  /**
   * @param {!TracingModel} tracingModel
   * @return {?Thread}
   *
   * TODO: Move this to a better place. This is here just for convenience o
   * re-use between modules. This really belongs to a higher level, since it
   * is specific to chrome's usage of tracing.
   */
  static browserMainThread(tracingModel) {
    const processes = tracingModel.sortedProcesses();
    // Avoid warning for an empty model.
    if (!processes.length) {
      return null;
    }
    const browserMainThreadName = 'CrBrowserMain';
    const browserProcesses = [];
    const browserMainThreads = [];
    for (const process of processes) {
      if (process.name().toLowerCase().endsWith('browser')) {
        browserProcesses.push(process);
      }
      browserMainThreads.push(...process.sortedThreads().filter(t => t.name() === browserMainThreadName));
    }
    if (browserMainThreads.length === 1) {
      return browserMainThreads[0];
    }
    if (browserProcesses.length === 1) {
      return browserProcesses[0].threadByName(browserMainThreadName);
    }
    const tracingStartedInBrowser =
        tracingModel.devToolsMetadataEvents().filter(e => e.name === 'TracingStartedInBrowser');
    if (tracingStartedInBrowser.length === 1) {
      return tracingStartedInBrowser[0].thread;
    }
    Common.Console.Console.instance().error('Failed to find browser main thread in trace, some timeline features may be unavailable');
    return null;
  }

  /**
   * @return {!Array.<!Event>}
   */
  devToolsMetadataEvents() {
    return this._devToolsMetadataEvents;
  }

  /**
   * @param {!Array.<!EventPayload>} events
   */
  addEvents(events) {
    for (let i = 0; i < events.length; ++i) {
      this._addEvent(events[i]);
    }
  }

  tracingComplete() {
    this._processPendingAsyncEvents();
    this._backingStorage.appendString(this._firstWritePending ? '[]' : ']');
    this._backingStorage.finishWriting();
    this._firstWritePending = false;
    for (const process of this._processById.values()) {
      for (const thread of process._threads.values()) {
        thread.tracingComplete();
      }
    }
  }

  dispose() {
    if (!this._firstWritePending) {
      this._backingStorage.reset();
    }
  }

  /**
   * @param {number} offset
   */
  adjustTime(offset) {
    this._minimumRecordTime += offset;
    this._maximumRecordTime += offset;
    for (const process of this._processById.values()) {
      for (const thread of process._threads.values()) {
        for (const event of thread.events()) {
          event.startTime += offset;
          if (typeof event.endTime === 'number') {
            event.endTime += offset;
          }
        }
        for (const event of thread.asyncEvents()) {
          event.startTime += offset;
          if (typeof event.endTime === 'number') {
            event.endTime += offset;
          }
        }
      }
    }
  }

  /**
   * @param {!EventPayload} payload
   */
  _addEvent(payload) {
    let process = this._processById.get(payload.pid);
    if (!process) {
      process = new Process(this, payload.pid);
      this._processById.set(payload.pid, process);
    }

    const phase = Phase;
    const eventsDelimiter = ',\n';
    this._backingStorage.appendString(this._firstWritePending ? '[' : eventsDelimiter);
    this._firstWritePending = false;
    const stringPayload = JSON.stringify(payload);
    const isAccessible = payload.ph === phase.SnapshotObject;
    let backingStorage = null;
    const keepStringsLessThan = 10000;
    if (isAccessible && stringPayload.length > keepStringsLessThan) {
      backingStorage = this._backingStorage.appendAccessibleString(stringPayload);
    } else {
      this._backingStorage.appendString(stringPayload);
    }

    const timestamp = payload.ts / 1000;
    // We do allow records for unrelated threads to arrive out-of-order,
    // so there's a chance we're getting records from the past.
    if (timestamp && (!this._minimumRecordTime || timestamp < this._minimumRecordTime) &&
        (payload.ph === phase.Begin || payload.ph === phase.Complete || payload.ph === phase.Instant)) {
      this._minimumRecordTime = timestamp;
    }
    const endTimeStamp = (payload.ts + (payload.dur || 0)) / 1000;
    this._maximumRecordTime = Math.max(this._maximumRecordTime, endTimeStamp);
    const event = process._addEvent(payload);
    if (!event) {
      return;
    }
    if (payload.ph === phase.Sample) {
      this._addSampleEvent(event);
      return;
    }
    // Build async event when we've got events from all threads & processes, so we can sort them and process in the
    // chronological order. However, also add individual async events to the thread flow (above), so we can easily
    // display them on the same chart as other events, should we choose so.
    if (TracingModel.isAsyncPhase(payload.ph)) {
      this._asyncEvents.push(event);
    }
    event._setBackingStorage(backingStorage);
    if (event.hasCategory(DevToolsMetadataEventCategory)) {
      this._devToolsMetadataEvents.push(event);
    }

    if (payload.ph !== phase.Metadata) {
      return;
    }

    switch (payload.name) {
      case MetadataEvent.ProcessSortIndex: {
        process._setSortIndex(payload.args['sort_index']);
        break;
      }
      case MetadataEvent.ProcessName: {
        const processName = payload.args['name'];
        process._setName(processName);
        this._processByName.set(processName, process);
        break;
      }
      case MetadataEvent.ThreadSortIndex: {
        process.threadById(payload.tid)._setSortIndex(payload.args['sort_index']);
        break;
      }
      case MetadataEvent.ThreadName: {
        process.threadById(payload.tid)._setName(payload.args['name']);
        break;
      }
    }
  }

  /**
   * @param {!Event} event
   */
  _addSampleEvent(event) {
    const id = `${event.thread.process().id()}:${event.id}`;
    const group = this._profileGroups.get(id);
    if (group) {
      group._addChild(event);
    } else {
      this._profileGroups.set(id, new ProfileEventsGroup(event));
    }
  }

  /**
   * @param {!Event} event
   * @return {?ProfileEventsGroup}
   */
  profileGroup(event) {
    return this._profileGroups.get(`${event.thread.process().id()}:${event.id}`) || null;
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
   * @return {!Array.<!Process>}
   */
  sortedProcesses() {
    return NamedObject._sort([...this._processById.values()]);
  }

  /**
   * @param {string} name
   * @return {?Process}
   */
  processByName(name) {
    return this._processByName.get(name);
  }

  /**
   * @param {number} pid
   * @return {?Process}
   */
  processById(pid) {
    return this._processById.get(pid) || null;
  }

  /**
   * @param {string} processName
   * @param {string} threadName
   * @return {?Thread}
   */
  threadByName(processName, threadName) {
    const process = this.processByName(processName);
    return process && process.threadByName(threadName);
  }

  /**
   * @param {string} processName
   * @param {string} threadName
   * @param {string} eventName
   * @return {!Array<!Event>}
   */
  extractEventsFromThreadByName(processName, threadName, eventName) {
    const thread = this.threadByName(processName, threadName);
    if (!thread) {
      return [];
    }

    return thread.removeEventsByName(eventName);
  }

  _processPendingAsyncEvents() {
    this._asyncEvents.sort(Event.compareStartTime);
    for (let i = 0; i < this._asyncEvents.length; ++i) {
      const event = this._asyncEvents[i];
      if (TracingModel.isNestableAsyncPhase(event.phase)) {
        this._addNestableAsyncEvent(event);
      } else {
        this._addAsyncEvent(event);
      }
    }
    this._asyncEvents = [];
    this._closeOpenAsyncEvents();
  }

  _closeOpenAsyncEvents() {
    for (const event of this._openAsyncEvents.values()) {
      event.setEndTime(this._maximumRecordTime);
      // FIXME: remove this once we figure a better way to convert async console
      // events to sync [waterfall] timeline records.
      event.steps[0].setEndTime(this._maximumRecordTime);
    }
    this._openAsyncEvents.clear();

    for (const eventStack of this._openNestableAsyncEvents.values()) {
      while (eventStack.length) {
        eventStack.pop().setEndTime(this._maximumRecordTime);
      }
    }
    this._openNestableAsyncEvents.clear();
  }

  /**
   * @param {!Event} event
   */
  _addNestableAsyncEvent(event) {
    const phase = Phase;
    const key = event.categoriesString + '.' + event.id;
    let openEventsStack = this._openNestableAsyncEvents.get(key);

    switch (event.phase) {
      case phase.NestableAsyncBegin: {
        if (!openEventsStack) {
          openEventsStack = [];
          this._openNestableAsyncEvents.set(key, openEventsStack);
        }
        const asyncEvent = new AsyncEvent(event);
        openEventsStack.push(asyncEvent);
        event.thread._addAsyncEvent(asyncEvent);
        break;
      }

      case phase.NestableAsyncInstant: {
        if (openEventsStack && openEventsStack.length) {
          openEventsStack.peekLast()._addStep(event);
        }
        break;
      }

      case phase.NestableAsyncEnd: {
        if (!openEventsStack || !openEventsStack.length) {
          break;
        }
        const top = openEventsStack.pop();
        if (top.name !== event.name) {
          console.error(
              `Begin/end event mismatch for nestable async event, ${top.name} vs. ${event.name}, key: ${key}`);
          break;
        }
        top._addStep(event);
      }
    }
  }

  /**
   * @param {!Event} event
   */
  _addAsyncEvent(event) {
    const phase = Phase;
    const key = event.categoriesString + '.' + event.name + '.' + event.id;
    let asyncEvent = this._openAsyncEvents.get(key);

    if (event.phase === phase.AsyncBegin) {
      if (asyncEvent) {
        console.error(`Event ${event.name} has already been started`);
        return;
      }
      asyncEvent = new AsyncEvent(event);
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
      const lastStep = asyncEvent.steps.peekLast();
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
   * @return {!BackingStorage}
   */
  backingStorage() {
    return this._backingStorage;
  }

  /**
   * @param {string} str
   * @return {!Set<string>}
   */
  _parsedCategoriesForString(str) {
    let parsedCategories = this._parsedCategories.get(str);
    if (!parsedCategories) {
      parsedCategories = new Set(str ? str.split(',') : []);
      this._parsedCategories.set(str, parsedCategories);
    }
    return parsedCategories;
  }
}

/**
 * @enum {string}
 */
export const Phase = {
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

export const MetadataEvent = {
  ProcessSortIndex: 'process_sort_index',
  ProcessName: 'process_name',
  ThreadSortIndex: 'thread_sort_index',
  ThreadName: 'thread_name'
};

// TODO(alph): LegacyTopLevelEventCategory is not recorded since M74 and used for loading
// legacy profiles. Drop at some point.
export const LegacyTopLevelEventCategory = 'toplevel';

export const DevToolsMetadataEventCategory = 'disabled-by-default-devtools.timeline';
export const DevToolsTimelineEventCategory = 'disabled-by-default-devtools.timeline';

/**
 * @interface
 */
export class BackingStorage {
  /**
   * @param {string} string
   */
  appendString(string) {
  }

  /**
   * @param {string} string
   * @return {function():!Promise.<?string>}
   */
  appendAccessibleString(string) {
  }

  finishWriting() {
  }

  reset() {}
}

/**
 * @unrestricted
 */
export class Event {
  /**
   * @param {string|undefined} categories
   * @param {string} name
   * @param {!Phase} phase
   * @param {number} startTime
   * @param {!Thread} thread
   */
  constructor(categories, name, phase, startTime, thread) {
    /** @type {string} */
    this.categoriesString = categories || '';
    /** @type {!Set<string>} */
    this._parsedCategories = thread._model._parsedCategoriesForString(this.categoriesString);
    /** @type {string} */
    this.name = name;
    /** @type {!Phase} */
    this.phase = phase;
    /** @type {number} */
    this.startTime = startTime;
    /** @type {!Thread} */
    this.thread = thread;
    /** @type {!Object} */
    this.args = {};

    /** @type {number} */
    this.selfTime = 0;
  }

  /**
   * @this {null}
   * @param {!EventPayload} payload
   * @param {!Thread} thread
   * @return {!Event}
   */
  static fromPayload(payload, thread) {
    const event = new Event(payload.cat, payload.name, /** @type {!Phase} */ (payload.ph), payload.ts / 1000, thread);
    if (payload.args) {
      event.addArgs(payload.args);
    }
    if (typeof payload.dur === 'number') {
      event.setEndTime((payload.ts + payload.dur) / 1000);
    }
    const id = TracingModel._extractId(payload);
    if (typeof id !== 'undefined') {
      event.id = id;
    }
    if (payload.bind_id) {
      event.bind_id = payload.bind_id;
    }

    return event;
  }

  /**
   * @param {?Event} a
   * @param {?Event} b
   * @return {number}
   */
  static compareStartTime(a, b) {
    if (!a || !b) {
      return 0;
    }

    return a.startTime - b.startTime;
  }

  /**
   * @param {!Event} a
   * @param {!Event} b
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
    for (const name in args) {
      if (name in this.args) {
        console.error('Same argument name (' + name + ') is used for begin and end phases of ' + this.name);
      }
      this.args[name] = args[name];
    }
  }

  /**
   * @param {!Event} endEvent
   */
  _complete(endEvent) {
    if (endEvent.args) {
      this.addArgs(endEvent.args);
    } else {
      console.error('Missing mandatory event argument \'args\' at ' + endEvent.startTime);
    }
    this.setEndTime(endEvent.startTime);
  }

  /**
   * @param {?function():!Promise.<?string>} backingStorage
   */
  _setBackingStorage(backingStorage) {
  }
}

export class ObjectSnapshot extends Event {
  /**
   * @param {string|undefined} category
   * @param {string} name
   * @param {number} startTime
   * @param {!Thread} thread
   */
  constructor(category, name, startTime, thread) {
    super(category, name, Phase.SnapshotObject, startTime, thread);
    /** @type {?function():!Promise<?string>} */
    this._backingStorage = null;
    /** @type {string} */
    this.id;
    /** @type {?Promise<?>} */
    this._objectPromise = null;
  }

  /**
   * @override
   * @this {null}
   * @param {!EventPayload} payload
   * @param {!Thread} thread
   * @return {!ObjectSnapshot}
   */
  static fromPayload(payload, thread) {
    const snapshot = new ObjectSnapshot(payload.cat, payload.name, payload.ts / 1000, thread);
    const id = TracingModel._extractId(payload);
    if (typeof id !== 'undefined') {
      snapshot.id = id;
    }
    if (!payload.args || !payload.args['snapshot']) {
      console.error('Missing mandatory \'snapshot\' argument at ' + payload.ts / 1000);
      return snapshot;
    }
    if (payload.args) {
      snapshot.addArgs(payload.args);
    }
    return snapshot;
  }

  /**
   * @param {function(?)} callback
   */
  requestObject(callback) {
    const snapshot = this.args['snapshot'];
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
        const payload = JSON.parse(result);
        callback(payload['args']['snapshot']);
      } catch (e) {
        Common.Console.Console.instance().error('Malformed event data in backing storage');
        callback(null);
      }
    }
  }

  /**
   * @return {!Promise<?>}
   */
  objectPromise() {
    if (!this._objectPromise) {
      this._objectPromise = new Promise(this.requestObject.bind(this));
    }
    return this._objectPromise;
  }

  /**
   * @override
   * @param {?function():!Promise.<?>} backingStorage
   */
  _setBackingStorage(backingStorage) {
    if (!backingStorage) {
      return;
    }
    this._backingStorage = backingStorage;
    this.args = {};
  }
}

/**
 * @unrestricted
 */
export class AsyncEvent extends Event {
  /**
   * @param {!Event} startEvent
   */
  constructor(startEvent) {
    super(startEvent.categoriesString, startEvent.name, startEvent.phase, startEvent.startTime, startEvent.thread);
    this.addArgs(startEvent.args);
    this.steps = [startEvent];
  }

  /**
   * @param {!Event} event
   */
  _addStep(event) {
    this.steps.push(event);
    if (event.phase === Phase.AsyncEnd || event.phase === Phase.NestableAsyncEnd) {
      this.setEndTime(event.startTime);
      // FIXME: ideally, we shouldn't do this, but this makes the logic of converting
      // async console events to sync ones much simpler.
      this.steps[0].setEndTime(event.startTime);
    }
  }
}

/**
 * @unrestricted
 */
class ProfileEventsGroup {
  /**
   * @param {!Event} event
   */
  constructor(event) {
    /** @type {!Array<!Event>} */
    this.children = [event];
  }

  /**
   * @param {!Event} event
   */
  _addChild(event) {
    this.children.push(event);
  }
}

class NamedObject {
  /**
   * @param {!TracingModel} model
   * @param {number} id
   */
  constructor(model, id) {
    this._model = model;
    this._id = id;
    this._name = '';
    this._sortIndex = 0;
  }

  /**
   * @param {!Array.<!NamedObject>} array
   */
  static _sort(array) {
    /**
     * @param {!NamedObject} a
     * @param {!NamedObject} b
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
}

export class Process extends NamedObject {
  /**
   * @param {!TracingModel} model
   * @param {number} id
   */
  constructor(model, id) {
    super(model, id);
    /** @type {!Map<number, !Thread>} */
    this._threads = new Map();
    this._threadByName = new Map();
  }

  /**
   * @return {number}
   */
  id() {
    return this._id;
  }

  /**
   * @param {number} id
   * @return {!Thread}
   */
  threadById(id) {
    let thread = this._threads.get(id);
    if (!thread) {
      thread = new Thread(this, id);
      this._threads.set(id, thread);
    }
    return thread;
  }

  /**
   * @param {string} name
   * @return {?Thread}
   */
  threadByName(name) {
    return this._threadByName.get(name) || null;
  }

  /**
   * @param {string} name
   * @param {!Thread} thread
   */
  _setThreadByName(name, thread) {
    this._threadByName.set(name, thread);
  }

  /**
   * @param {!EventPayload} payload
   * @return {?Event} event
   */
  _addEvent(payload) {
    return this.threadById(payload.tid)._addEvent(payload);
  }

  /**
   * @return {!Array.<!Thread>}
   */
  sortedThreads() {
    return NamedObject._sort([...this._threads.values()]);
  }
}

export class Thread extends NamedObject {
  /**
   * @param {!Process} process
   * @param {number} id
   */
  constructor(process, id) {
    super(process._model, id);
    this._process = process;

    /**
     * @type {!Array<?Event>};
     */
    this._events = [];
    this._asyncEvents = [];
    this._lastTopLevelEvent = null;
  }

  tracingComplete() {
    this._asyncEvents.sort(Event.compareStartTime);
    this._events.sort(Event.compareStartTime);
    const phases = Phase;
    const stack = [];
    for (let i = 0; i < this._events.length; ++i) {
      const e = this._events[i];
      e.ordinal = i;
      switch (e.phase) {
        case phases.End: {
          this._events[i] = null;  // Mark for removal.
          // Quietly ignore unbalanced close events, they're legit (we could have missed start one).
          if (!stack.length) {
            continue;
          }
          const top = stack.pop();
          if (top.name !== e.name || top.categoriesString !== e.categoriesString) {
            console.error(
                'B/E events mismatch at ' + top.startTime + ' (' + top.name + ') vs. ' + e.startTime + ' (' + e.name +
                ')');
          } else {
            top._complete(e);
          }
          break;
        }
        case phases.Begin: {
          stack.push(e);
          break;
        }
      }
    }
    while (stack.length) {
      stack.pop().setEndTime(this._model.maximumRecordTime());
    }
    this._events = this._events.filter(event => event !== null);
  }

  /**
   * @param {!EventPayload} payload
   * @return {?Event} event
   */
  _addEvent(payload) {
    const event = payload.ph === Phase.SnapshotObject ? ObjectSnapshot.fromPayload(payload, this) :
                                                        Event.fromPayload(payload, this);
    if (TracingModel.isTopLevelEvent(event)) {
      // Discard nested "top-level" events.
      if (this._lastTopLevelEvent && this._lastTopLevelEvent.endTime > event.startTime) {
        return null;
      }
      this._lastTopLevelEvent = event;
    }
    this._events.push(event);
    return event;
  }

  /**
   * @param {!AsyncEvent} asyncEvent
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
   * @return {!Process}
   */
  process() {
    return this._process;
  }

  /**
   * @return {!Array.<!Event>}
   */
  events() {
    return this._events;
  }

  /**
   * @return {!Array.<!AsyncEvent>}
   */
  asyncEvents() {
    return this._asyncEvents;
  }

  /**
   * @param {string} name
   */
  removeEventsByName(name) {
    /**
     * @type {!Array<!Event>}
     */
    const extracted = [];
    this._events = this._events.filter(e => {
      if (!e) {
        return false;
      }

      if (e.name !== name) {
        return true;
      }

      extracted.push(e);
      return false;
    });

    return extracted;
  }
}

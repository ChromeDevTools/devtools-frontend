// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import {type EventPayload} from './TracingManager.js';
import * as TraceEngine from '../../models/trace/trace.js';

type IgnoreListArgs = {
  [key: string]: string|number|ObjectSnapshot,
};

export class TracingModel {
  #backingStorageInternal: BackingStorage;
  readonly #shouldSaveToFile: boolean;
  readonly #title: string|undefined;
  #firstWritePending: boolean;
  readonly #processById: Map<string|number, Process>;
  readonly #processByName: Map<string, Process>;
  #minimumRecordTimeInternal: number;
  #maximumRecordTimeInternal: number;
  readonly #devToolsMetadataEventsInternal: Event[];
  #asyncEvents: AsyncEvent[];
  readonly #openAsyncEvents: Map<string, AsyncEvent>;
  readonly #openNestableAsyncEvents: Map<string, AsyncEvent[]>;
  readonly #profileGroups: Map<string, ProfileEventsGroup>;
  readonly #parsedCategories: Map<string, Set<string>>;
  readonly #mainFrameNavStartTimes: Map<string, Event>;
  readonly #allEventsPayload: EventPayload[] = [];

  constructor(backingStorage: BackingStorage, shouldSaveToFile = true, title?: string) {
    this.#backingStorageInternal = backingStorage;
    this.#shouldSaveToFile = shouldSaveToFile;
    this.#title = title;
    // Avoid extra reset of the storage as it's expensive.
    this.#firstWritePending = true;
    this.#processById = new Map();
    this.#processByName = new Map();
    this.#minimumRecordTimeInternal = Number(Infinity);
    this.#maximumRecordTimeInternal = Number(-Infinity);
    this.#devToolsMetadataEventsInternal = [];
    this.#asyncEvents = [];
    this.#openAsyncEvents = new Map();
    this.#openNestableAsyncEvents = new Map();
    this.#profileGroups = new Map();
    this.#parsedCategories = new Map();
    this.#mainFrameNavStartTimes = new Map();
  }

  static isNestableAsyncPhase(phase: string): boolean {
    return phase === 'b' || phase === 'e' || phase === 'n';
  }

  static isAsyncBeginPhase(phase: string): boolean {
    return phase === 'S' || phase === 'b';
  }

  static isAsyncPhase(phase: string): boolean {
    return TracingModel.isNestableAsyncPhase(phase) || phase === 'S' || phase === 'T' || phase === 'F' || phase === 'p';
  }

  static isFlowPhase(phase: string): boolean {
    return phase === 's' || phase === 't' || phase === 'f';
  }

  static isCompletePhase(phase: string): boolean {
    return phase === 'X';
  }

  static isTopLevelEvent(event: Event): boolean {
    return event.hasCategory(DevToolsTimelineEventCategory) && event.name === 'RunTask' ||
        event.hasCategory(LegacyTopLevelEventCategory) ||
        event.hasCategory(DevToolsMetadataEventCategory) &&
        event.name === 'Program';  // Older timelines may have this instead of toplevel.
  }

  static extractId(payload: EventPayload): string|undefined {
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
    return undefined;
  }

  static browserMainThread(tracingModel: TracingModel): Thread|null {
    const processes = tracingModel.sortedProcesses();
    // Avoid warning for an empty #model.
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
    Common.Console.Console.instance().error(
        'Failed to find browser main thread in trace, some timeline features may be unavailable');
    return null;
  }

  allRawEvents(): readonly EventPayload[] {
    return this.#allEventsPayload;
  }

  devToolsMetadataEvents(): Event[] {
    return this.#devToolsMetadataEventsInternal;
  }

  addEvents(events: readonly EventPayload[]): void {
    for (let i = 0; i < events.length; ++i) {
      this.addEvent(events[i]);
    }
  }

  tracingComplete(): void {
    this.processPendingAsyncEvents();
    if (this.#shouldSaveToFile) {
      this.#backingStorageInternal.appendString(this.#firstWritePending ? '[]' : ']');
      this.#backingStorageInternal.finishWriting();
      this.#firstWritePending = false;
    }
    for (const process of this.#processById.values()) {
      for (const thread of process.threads.values()) {
        thread.tracingComplete();
      }
    }
  }

  dispose(): void {
    if (!this.#firstWritePending && this.#shouldSaveToFile) {
      this.#backingStorageInternal.reset();
    }
  }

  adjustTime(offset: number): void {
    this.#minimumRecordTimeInternal += offset;
    this.#maximumRecordTimeInternal += offset;
    for (const process of this.#processById.values()) {
      for (const thread of process.threads.values()) {
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

  private addEvent(payload: EventPayload): void {
    this.#allEventsPayload.push(payload);
    let process = this.#processById.get(payload.pid);
    if (!process) {
      process = new Process(this, payload.pid);
      this.#processById.set(payload.pid, process);
    }

    const phase = Phase;

    let backingStorage: (() => Promise<string|null>)|null = null;
    if (this.#shouldSaveToFile) {
      const eventsDelimiter = ',\n';
      this.#backingStorageInternal.appendString(this.#firstWritePending ? '[' : eventsDelimiter);
      this.#firstWritePending = false;
      const stringPayload = JSON.stringify(payload);
      const isAccessible = payload.ph === phase.SnapshotObject;
      const keepStringsLessThan = 10000;
      if (isAccessible && stringPayload.length > keepStringsLessThan) {
        backingStorage = this.#backingStorageInternal.appendAccessibleString(stringPayload);
      } else {
        this.#backingStorageInternal.appendString(stringPayload);
      }
    }

    const timestamp = payload.ts / 1000;
    // We do allow records for unrelated threads to arrive out-of-order,
    // so there's a chance we're getting records from the past.
    if (timestamp && timestamp < this.#minimumRecordTimeInternal &&
        eventPhasesOfInterestForTraceBounds.has(payload.ph) &&
        // UMA related events are ignored when calculating the minimumRecordTime because they might
        // be related to previous navigations that happened before the current trace started and
        // will currently not be displayed anyways.
        // See crbug.com/1201198
        (!payload.name.endsWith('::UMA'))) {
      this.#minimumRecordTimeInternal = timestamp;
    }

    if (payload.name === 'TracingStartedInBrowser') {
      // If we received a timestamp for tracing start, use that for minimumRecordTime.
      this.#minimumRecordTimeInternal = timestamp;
    }

    // Track only main thread navigation start items. This is done by tracking
    // isOutermostMainFrame, and whether documentLoaderURL is set.
    if (payload.name === 'navigationStart') {
      const data = (payload.args.data as {
        isLoadingMainFrame: boolean,
        documentLoaderURL: string,
        navigationId: string,
        isOutermostMainFrame?: boolean,
      } | null);
      if (data) {
        const {isLoadingMainFrame, documentLoaderURL, navigationId, isOutermostMainFrame} = data;
        if ((isOutermostMainFrame ?? isLoadingMainFrame) && documentLoaderURL !== '') {
          const thread = process.threadById(payload.tid);
          const navStartEvent = PayloadEvent.fromPayload(payload, thread);
          this.#mainFrameNavStartTimes.set(navigationId, navStartEvent);
        }
      }
    }

    if (eventPhasesOfInterestForTraceBounds.has(payload.ph)) {
      const endTimeStamp = (payload.ts + (payload.dur || 0)) / 1000;
      this.#maximumRecordTimeInternal = Math.max(this.#maximumRecordTimeInternal, endTimeStamp);
    }
    const event = process.addEvent(payload);
    if (!event) {
      return;
    }
    if (payload.ph === phase.Sample) {
      this.addSampleEvent(event);
      return;
    }
    // Build async event when we've got events from all threads & processes, so we can sort them and process in the
    // chronological order. However, also add individual async events to the thread flow (above), so we can easily
    // display them on the same chart as other events, should we choose so.
    if (TracingModel.isAsyncPhase(payload.ph)) {
      this.#asyncEvents.push((event as AsyncEvent));
    }
    event.setBackingStorage(backingStorage);
    if (event.hasCategory(DevToolsMetadataEventCategory)) {
      this.#devToolsMetadataEventsInternal.push(event);
    }

    if (payload.ph !== phase.Metadata) {
      return;
    }

    switch (payload.name) {
      case MetadataEvent.ProcessSortIndex: {
        process.setSortIndex(payload.args['sort_index']);
        break;
      }
      case MetadataEvent.ProcessName: {
        const processName = payload.args['name'];
        process.setName(processName);
        this.#processByName.set(processName, process);
        break;
      }
      case MetadataEvent.ThreadSortIndex: {
        process.threadById(payload.tid).setSortIndex(payload.args['sort_index']);
        break;
      }
      case MetadataEvent.ThreadName: {
        process.threadById(payload.tid).setName(payload.args['name']);
        break;
      }
    }
  }

  private addSampleEvent(event: Event): void {
    const id = `${event.thread.process().id()}:${event.id}`;
    const group = this.#profileGroups.get(id);
    if (group) {
      group.addChild(event);
    } else {
      this.#profileGroups.set(id, new ProfileEventsGroup(event));
    }
  }

  profileGroup(event: Event): ProfileEventsGroup|null {
    return this.#profileGroups.get(`${event.thread.process().id()}:${event.id}`) || null;
  }

  minimumRecordTime(): number {
    return this.#minimumRecordTimeInternal;
  }

  maximumRecordTime(): number {
    return this.#maximumRecordTimeInternal;
  }

  navStartTimes(): Map<string, Event> {
    return this.#mainFrameNavStartTimes;
  }

  sortedProcesses(): Process[] {
    return NamedObject.sort([...this.#processById.values()]);
  }

  getProcessByName(name: string): Process|null {
    return this.#processByName.get(name) ?? null;
  }

  getProcessById(pid: number): Process|null {
    return this.#processById.get(pid) || null;
  }

  getThreadByName(processName: string, threadName: string): Thread|null {
    const process = this.getProcessByName(processName);
    return process && process.threadByName(threadName);
  }

  private processPendingAsyncEvents(): void {
    this.#asyncEvents.sort(Event.compareStartTime);
    for (let i = 0; i < this.#asyncEvents.length; ++i) {
      const event = this.#asyncEvents[i];
      if (TracingModel.isNestableAsyncPhase(event.phase)) {
        this.addNestableAsyncEvent(event);
      } else {
        this.addAsyncEvent(event);
      }
    }
    this.#asyncEvents = [];
    this.closeOpenAsyncEvents();
  }

  private closeOpenAsyncEvents(): void {
    for (const event of this.#openAsyncEvents.values()) {
      event.setEndTime(this.#maximumRecordTimeInternal);
      // FIXME: remove this once we figure a better way to convert async console
      // events to sync [waterfall] timeline records.
      event.steps[0].setEndTime(this.#maximumRecordTimeInternal);
    }
    this.#openAsyncEvents.clear();

    for (const eventStack of this.#openNestableAsyncEvents.values()) {
      while (eventStack.length) {
        const event = eventStack.pop();
        if (!event) {
          continue;
        }
        event.setEndTime(this.#maximumRecordTimeInternal);
      }
    }
    this.#openNestableAsyncEvents.clear();
  }

  private addNestableAsyncEvent(event: Event): void {
    const phase = Phase;
    const key = event.categoriesString + '.' + event.id;
    let openEventsStack = this.#openNestableAsyncEvents.get(key);

    switch (event.phase) {
      case phase.NestableAsyncBegin: {
        if (!openEventsStack) {
          openEventsStack = [];
          this.#openNestableAsyncEvents.set(key, openEventsStack);
        }
        const asyncEvent = new AsyncEvent(event);
        openEventsStack.push(asyncEvent);
        event.thread.addAsyncEvent(asyncEvent);
        break;
      }

      case phase.NestableAsyncInstant: {
        if (openEventsStack && openEventsStack.length) {
          const event = openEventsStack[openEventsStack.length - 1];
          if (event) {
            event.addStep(event);
          }
        }
        break;
      }

      case phase.NestableAsyncEnd: {
        if (!openEventsStack || !openEventsStack.length) {
          break;
        }
        const top = openEventsStack.pop();
        if (!top) {
          break;
        }
        if (top.name !== event.name) {
          console.error(
              `Begin/end event mismatch for nestable async event, ${top.name} vs. ${event.name}, key: ${key}`);
          break;
        }
        top.addStep(event);
      }
    }
  }

  private addAsyncEvent(event: Event): void {
    const phase = Phase;
    const key = event.categoriesString + '.' + event.name + '.' + event.id;
    let asyncEvent = this.#openAsyncEvents.get(key);

    if (event.phase === phase.AsyncBegin) {
      if (asyncEvent) {
        console.error(`Event ${event.name} has already been started`);
        return;
      }
      asyncEvent = new AsyncEvent(event);
      this.#openAsyncEvents.set(key, asyncEvent);
      event.thread.addAsyncEvent(asyncEvent);
      return;
    }
    if (!asyncEvent) {
      // Quietly ignore stray async events, we're probably too late for the start.
      return;
    }
    if (event.phase === phase.AsyncEnd) {
      asyncEvent.addStep(event);
      this.#openAsyncEvents.delete(key);
      return;
    }
    if (event.phase === phase.AsyncStepInto || event.phase === phase.AsyncStepPast) {
      const lastStep = asyncEvent.steps[asyncEvent.steps.length - 1];
      if (lastStep && lastStep.phase !== phase.AsyncBegin && lastStep.phase !== event.phase) {
        console.assert(
            false,
            'Async event step phase mismatch: ' + lastStep.phase + ' at ' + lastStep.startTime + ' vs. ' + event.phase +
                ' at ' + event.startTime);
        return;
      }
      asyncEvent.addStep(event);
      return;
    }
    console.assert(false, 'Invalid async event phase');
  }

  backingStorage(): BackingStorage {
    return this.#backingStorageInternal;
  }

  title(): string|undefined {
    return this.#title;
  }

  parsedCategoriesForString(str: string): Set<string> {
    let parsedCategories = this.#parsedCategories.get(str);
    if (!parsedCategories) {
      parsedCategories = new Set(str ? str.split(',') : []);
      this.#parsedCategories.set(str, parsedCategories);
    }
    return parsedCategories;
  }
}

// If this enum looks half complete, that is because we are currently removing
// it in favour of the enum in the new trace engine
// (models/trace/types/TraceEvents.ts). crbug.com/1417587 is tracking this
// work.
//
// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Phase {
  End = 'E',
  Complete = 'X',
  Instant = 'I',
  AsyncBegin = 'S',
  AsyncStepInto = 'T',
  AsyncStepPast = 'p',
  AsyncEnd = 'F',
  NestableAsyncBegin = 'b',
  NestableAsyncEnd = 'e',
  NestableAsyncInstant = 'n',
  FlowBegin = 's',
  FlowStep = 't',
  FlowEnd = 'f',
  Metadata = 'M',
  Counter = 'C',
  Sample = 'P',
  CreateObject = 'N',
  SnapshotObject = 'O',
  DeleteObject = 'D',
}

export const eventPhasesOfInterestForTraceBounds: Set<string> = new Set([
  TraceEngine.Types.TraceEvents.Phase.BEGIN,
  Phase.End,
  Phase.Complete,
  Phase.Instant,
]);

export const MetadataEvent = {
  ProcessSortIndex: 'process_sort_index',
  ProcessName: 'process_name',
  ThreadSortIndex: 'thread_sort_index',
  ThreadName: 'thread_name',
};

// TODO(alph): LegacyTopLevelEventCategory is not recorded since M74 and used for loading
// legacy profiles. Drop at some point.
export const LegacyTopLevelEventCategory = 'toplevel';

export const DevToolsMetadataEventCategory = 'disabled-by-default-devtools.timeline';
export const DevToolsTimelineEventCategory = 'disabled-by-default-devtools.timeline';

export abstract class BackingStorage {
  appendString(_string: string): void {
  }

  abstract appendAccessibleString(string: string): () => Promise<string|null>;

  finishWriting(): void {
  }

  reset(): void {
  }
}

export class Event {
  categoriesString: string;
  readonly #parsedCategories: Set<string>;
  name: string;
  phase: Phase;
  startTime: number;
  thread: Thread;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any;
  id!: string|null;
  ordinal: number;
  selfTime: number;
  endTime?: number;
  duration?: number;

  // The constructor is protected so that we ensure that only classes or
  // subclasses can directly instantiate events. All other callers should
  // either create ConstructedEvent instances, which have a public constructor,
  // or use the static fromPayload method which can create an event instance
  // from the trace payload.
  protected constructor(categories: string|undefined, name: string, phase: Phase, startTime: number, thread: Thread) {
    this.categoriesString = categories || '';
    this.#parsedCategories = thread.getModel().parsedCategoriesForString(this.categoriesString);
    this.name = name;
    this.phase = phase;
    this.startTime = startTime;
    this.thread = thread;
    this.args = {};
    this.ordinal = 0;

    this.selfTime = 0;
  }

  static compareStartTime(a: Event|null, b: Event|null): number {
    if (!a || !b) {
      return 0;
    }

    return a.startTime - b.startTime;
  }

  static orderedCompareStartTime(a: Event, b: Event): number {
    // Array.mergeOrdered coalesces objects if comparator returns 0.
    // To change this behavior this comparator return -1 in the case events
    // startTime's are equal, so both events got placed into the result array.
    return a.startTime - b.startTime || a.ordinal - b.ordinal || -1;
  }

  hasCategory(categoryName: string): boolean {
    return this.#parsedCategories.has(categoryName);
  }

  setEndTime(endTime: number): void {
    if (endTime < this.startTime) {
      console.assert(false, 'Event out of order: ' + this.name);
      return;
    }
    this.endTime = endTime;
    this.duration = endTime - this.startTime;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addArgs(args: any): void {
    // Shallow copy args to avoid modifying original #payload which may be saved to file.
    for (const name in args) {
      if (name in this.args) {
        console.error('Same argument name (' + name + ') is used for begin and end phases of ' + this.name);
      }

      (this.args as IgnoreListArgs)[name] = (args as IgnoreListArgs)[name];
    }
  }

  complete(endEvent: Event): void {
    if (endEvent.args) {
      this.addArgs(endEvent.args);
    } else {
      console.error('Missing mandatory event argument \'args\' at ' + endEvent.startTime);
    }
    this.setEndTime(endEvent.startTime);
  }

  setBackingStorage(_backingStorage: (() => Promise<string|null>)|null): void {
  }
}

/**
 * Represents a tracing event that is not directly linked to an individual
 * object in the trace. We construct these events at times, particularly when
 * building up the CPU profile data for JS Profiling.
 **/
export class ConstructedEvent extends Event {
  // Because the constructor of Event is marked as protected, but we want
  // people to be able to create constructed events, we override the
  // constructor here, even though we are only calling super, in order to mark
  // it as public.
  constructor(categories: string|undefined, name: string, phase: Phase, startTime: number, thread: Thread) {
    super(categories, name, phase, startTime, thread);
  }
}

/**
 * Represents a tracing event that has been created directly from an object in
 * the trace file and therefore is guaranteed to have a payload associated with
 * it. The only way to create these events is to use the static fromPayload
 * method, which you must call with a payload.
 **/
export class PayloadEvent extends Event {
  #rawPayload: EventPayload;

  rawPayload(): EventPayload {
    return this.#rawPayload;
  }

  protected constructor(
      categories: string|undefined, name: string, phase: Phase, startTime: number, thread: Thread,
      rawPayload: EventPayload) {
    super(categories, name, phase, startTime, thread);
    this.#rawPayload = rawPayload;
  }

  static fromPayload(payload: EventPayload, thread: Thread): PayloadEvent {
    const event =
        new PayloadEvent(payload.cat, payload.name, (payload.ph as Phase), payload.ts / 1000, thread, payload);
    event.#rawPayload = payload;
    if (payload.args) {
      event.addArgs(payload.args);
    }
    if (typeof payload.dur === 'number') {
      event.setEndTime((payload.ts + payload.dur) / 1000);
    }
    const id = TracingModel.extractId(payload);
    if (typeof id !== 'undefined') {
      event.id = id;
    }

    return event;
  }
}

export class ObjectSnapshot extends PayloadEvent {
  #backingStorage: (() => Promise<string|null>)|null;
  #objectPromiseInternal: Promise<ObjectSnapshot|null>|null;

  private constructor(
      category: string|undefined, name: string, startTime: number, thread: Thread, rawPayload: EventPayload) {
    super(category, name, Phase.SnapshotObject, startTime, thread, rawPayload);
    this.#backingStorage = null;
    this.#objectPromiseInternal = null;
  }

  static fromPayload(payload: EventPayload, thread: Thread): ObjectSnapshot {
    const snapshot = new ObjectSnapshot(payload.cat, payload.name, payload.ts / 1000, thread, payload);
    const id = TracingModel.extractId(payload);
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

  requestObject(callback: (arg0: ObjectSnapshot|null) => void): void {
    const snapshot = this.args['snapshot'];
    if (snapshot) {
      callback((snapshot as ObjectSnapshot));
      return;
    }
    const storage = this.#backingStorage;
    if (storage) {
      storage().then(onRead, callback.bind(null, null));
    }

    function onRead(result: string|null): void {
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

  objectPromise(): Promise<ObjectSnapshot|null> {
    if (!this.#objectPromiseInternal) {
      this.#objectPromiseInternal = new Promise(this.requestObject.bind(this));
    }
    return this.#objectPromiseInternal;
  }

  setBackingStorage(backingStorage: (() => Promise<string|null>)|null): void {
    if (!backingStorage) {
      return;
    }
    this.#backingStorage = backingStorage;
    this.args = {};
  }
}

export class AsyncEvent extends ConstructedEvent {
  steps: Event[];
  causedFrame: boolean;

  constructor(startEvent: Event) {
    super(startEvent.categoriesString, startEvent.name, startEvent.phase, startEvent.startTime, startEvent.thread);
    this.addArgs(startEvent.args);
    this.steps = [startEvent];
    this.causedFrame = false;
  }

  addStep(event: Event): void {
    this.steps.push(event);
    if (event.phase === Phase.AsyncEnd || event.phase === Phase.NestableAsyncEnd) {
      this.setEndTime(event.startTime);
      // FIXME: ideally, we shouldn't do this, but this makes the logic of converting
      // async console events to sync ones much simpler.
      this.steps[0].setEndTime(event.startTime);
    }
  }
}

class ProfileEventsGroup {
  children: Event[];
  constructor(event: Event) {
    this.children = [event];
  }

  addChild(event: Event): void {
    this.children.push(event);
  }
}

class NamedObject {
  model: TracingModel;
  readonly idInternal: number;
  #nameInternal: string;
  #sortIndex: number;
  constructor(model: TracingModel, id: number) {
    this.model = model;
    this.idInternal = id;
    this.#nameInternal = '';
    this.#sortIndex = 0;
  }

  static sort<Item extends NamedObject>(array: Item[]): Item[] {
    return array.sort((a, b) => {
      return a.#sortIndex !== b.#sortIndex ? a.#sortIndex - b.#sortIndex : a.name().localeCompare(b.name());
    });
  }

  setName(name: string): void {
    this.#nameInternal = name;
  }

  name(): string {
    return this.#nameInternal;
  }

  id(): number {
    return this.idInternal;
  }

  setSortIndex(sortIndex: number): void {
    this.#sortIndex = sortIndex;
  }

  getModel(): TracingModel {
    return this.model;
  }
}

export class Process extends NamedObject {
  readonly threads: Map<number, Thread>;
  readonly #threadByNameInternal: Map<string, Thread|null>;
  constructor(model: TracingModel, id: number) {
    super(model, id);
    this.threads = new Map();
    this.#threadByNameInternal = new Map();
  }

  threadById(id: number): Thread {
    let thread = this.threads.get(id);
    if (!thread) {
      thread = new Thread(this, id);
      this.threads.set(id, thread);
    }
    return thread;
  }

  threadByName(name: string): Thread|null {
    return this.#threadByNameInternal.get(name) || null;
  }

  setThreadByName(name: string, thread: Thread): void {
    this.#threadByNameInternal.set(name, thread);
  }

  addEvent(payload: EventPayload): Event|null {
    return this.threadById(payload.tid).addEvent(payload);
  }

  sortedThreads(): Thread[] {
    return NamedObject.sort([...this.threads.values()]);
  }
}

export class Thread extends NamedObject {
  readonly #processInternal: Process;
  #eventsInternal: Event[];
  readonly #asyncEventsInternal: AsyncEvent[];
  #lastTopLevelEvent: Event|null;
  constructor(process: Process, id: number) {
    super(process.getModel(), id);
    this.#processInternal = process;

    this.#eventsInternal = [];
    this.#asyncEventsInternal = [];
    this.#lastTopLevelEvent = null;
  }

  /**
   * Whilst we are in the middle of migrating to the new Phase enum, we need to
   * be able to compare events with the legacy phase to the new enum. This method
   * does this by casting the event phase to a string, ensuring we can compare it
   * against either enum. Once the migration is complete (crbug.com/1417587), we
   * will be able to use === to compare with no TS errors and this method can be
   * removed.
   **/
  #eventMatchesPhase(event: Event, phase: Phase|TraceEngine.Types.TraceEvents.Phase): boolean {
    return (event.phase as string) === phase;
  }

  tracingComplete(): void {
    this.#asyncEventsInternal.sort(Event.compareStartTime);
    this.#eventsInternal.sort(Event.compareStartTime);
    const stack: Event[] = [];
    const toDelete = new Set<number>();
    for (let i = 0; i < this.#eventsInternal.length; ++i) {
      const e = this.#eventsInternal[i];
      e.ordinal = i;
      if (this.#eventMatchesPhase(e, Phase.End)) {
        toDelete.add(i);  // Mark for removal.
        // Quietly ignore unbalanced close events, they're legit (we could have missed start one).
        if (!stack.length) {
          continue;
        }
        const top = stack.pop();
        if (!top) {
          continue;
        }
        if (top.name !== e.name || top.categoriesString !== e.categoriesString) {
          console.error(
              'B/E events mismatch at ' + top.startTime + ' (' + top.name + ') vs. ' + e.startTime + ' (' + e.name +
              ')');
        } else {
          top.complete(e);
        }
      } else if (this.#eventMatchesPhase(e, TraceEngine.Types.TraceEvents.Phase.BEGIN)) {
        stack.push(e);
      }
    }

    // Handle Begin events with no matching End.
    // This commonly happens due to a bug in the trace machinery. See crbug.com/982252
    while (stack.length) {
      const event = stack.pop();
      if (event) {
        // Masquerade the event as Instant, so it's rendered to the user.
        // The ideal fix is resolving crbug.com/1021571, but handling that without a perfetto migration appears prohibitive
        event.phase = Phase.Instant;
      }
    }
    this.#eventsInternal = this.#eventsInternal.filter((_, idx) => !toDelete.has(idx));
  }

  addEvent(payload: EventPayload): Event|null {
    const event = payload.ph === Phase.SnapshotObject ? ObjectSnapshot.fromPayload(payload, this) :
                                                        PayloadEvent.fromPayload(payload, this);
    if (TracingModel.isTopLevelEvent(event)) {
      // Discard nested "top-level" events.
      const lastTopLevelEvent = this.#lastTopLevelEvent;
      if (lastTopLevelEvent && (lastTopLevelEvent.endTime || 0) > event.startTime) {
        return null;
      }
      this.#lastTopLevelEvent = event;
    }
    this.#eventsInternal.push(event);
    return event;
  }

  addAsyncEvent(asyncEvent: AsyncEvent): void {
    this.#asyncEventsInternal.push(asyncEvent);
  }

  setName(name: string): void {
    super.setName(name);
    this.#processInternal.setThreadByName(name, this);
  }

  process(): Process {
    return this.#processInternal;
  }

  events(): Event[] {
    return this.#eventsInternal;
  }

  asyncEvents(): AsyncEvent[] {
    return this.#asyncEventsInternal;
  }

  removeEventsByName(name: string): Event[] {
    const extracted: Event[] = [];
    this.#eventsInternal = this.#eventsInternal.filter(e => {
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

// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export interface CoordinatorCallback<T> {
  (): T|PromiseLike<T>;
}

class WorkItem<T> {
  readonly promise: Promise<T>;
  readonly trigger: () => void;
  readonly cancel: (e: Error) => void;
  readonly label: string;
  handler: CoordinatorCallback<T>;

  constructor(label: string, handler: CoordinatorCallback<T>) {
    const {promise, resolve, reject} = Promise.withResolvers<void>();
    this.promise = promise.then(() => this.handler());
    this.trigger = resolve;
    this.cancel = reject;
    this.label = label;
    this.handler = handler;
  }
}

export interface LoggingRecord {
  time: number;
  value: string;
}

const enum ACTION {
  READ = 'read',
  WRITE = 'write',
}

export class RenderCoordinatorQueueEmptyEvent extends Event {
  static readonly eventName = 'renderqueueempty';
  constructor() {
    super(RenderCoordinatorQueueEmptyEvent.eventName);
  }
}

export class RenderCoordinatorNewFrameEvent extends Event {
  static readonly eventName = 'newframe';
  constructor() {
    super(RenderCoordinatorNewFrameEvent.eventName);
  }
}

export interface LoggingOptions {
  // If true, only log activity with an explicit label.
  // This does not affect logging frames or queue empty events.
  // Defaults to false.
  onlyNamed?: boolean;

  // Configurable log storage limit, defaults to 100.
  storageLimit?: number;
}

let loggingEnabled: null|LoggingOptions = null;
const loggingRecords: LoggingRecord[] = [];

export function setLoggingEnabled(enabled: false): void;
export function setLoggingEnabled(enabled: true, options?: LoggingOptions): void;
export function setLoggingEnabled(enabled: boolean, options: LoggingOptions = {}): void {
  if (enabled) {
    loggingEnabled = {
      onlyNamed: options.onlyNamed,
      storageLimit: options.storageLimit,
    };
  } else {
    loggingEnabled = null;
    loggingRecords.length = 0;
  }
}

const UNNAMED_READ = 'Unnamed read';
const UNNAMED_WRITE = 'Unnamed write';
const UNNAMED_SCROLL = 'Unnamed scroll';
const DEADLOCK_TIMEOUT = 1500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__getRenderCoordinatorPendingFrames = function(): number {
  return hasPendingWork() ? 1 : 0;
};

let pendingReaders: Array<WorkItem<unknown>> = [];
let pendingWriters: Array<WorkItem<unknown>> = [];
let scheduledWorkId = 0;

export function hasPendingWork(): boolean {
  return pendingReaders.length + pendingWriters.length !== 0;
}

export function done(options?: {waitForWork: boolean}): Promise<void> {
  if (!hasPendingWork() && !options?.waitForWork) {
    logIfEnabled('[Queue empty]');
    return Promise.resolve();
  }
  return new Promise(
      resolve => window.addEventListener(RenderCoordinatorQueueEmptyEvent.eventName, () => resolve(), {once: true}));
}

/**
 * Schedules a 'read' job which is being executed within an animation frame
 * before all 'write' jobs. If multiple jobs are scheduled with the same
 * non-empty label, only the latest callback would be executed. Such
 * invocations would return the same promise that will resolve to the value of
 * the latest callback.
 */
export async function read<T>(callback: CoordinatorCallback<T>): Promise<T>;
export async function read<T>(label: string, callback: CoordinatorCallback<T>): Promise<T>;
export async function read<T>(
    labelOrCallback: CoordinatorCallback<T>|string, callback?: CoordinatorCallback<T>): Promise<T> {
  if (typeof labelOrCallback === 'string') {
    if (!callback) {
      throw new Error('Read called with label but no callback');
    }
    return await enqueueHandler(ACTION.READ, labelOrCallback, callback);
  }

  return await enqueueHandler(ACTION.READ, UNNAMED_READ, labelOrCallback);
}

/**
 * Schedules a 'write' job which is being executed within an animation frame
 * after all 'read' and 'scroll' jobs. If multiple jobs are scheduled with
 * the same non-empty label, only the latest callback would be executed. Such
 * invocations would return the same promise that will resolve when the latest callback is run.
 */
export async function write<T>(callback: CoordinatorCallback<T>): Promise<T>;
export async function write<T>(label: string, callback: CoordinatorCallback<T>): Promise<T>;
export async function write<T>(
    labelOrCallback: CoordinatorCallback<T>|string, callback?: CoordinatorCallback<T>): Promise<T> {
  if (typeof labelOrCallback === 'string') {
    if (!callback) {
      throw new Error('Write called with label but no callback');
    }
    return await enqueueHandler(ACTION.WRITE, labelOrCallback, callback);
  }

  return await enqueueHandler(ACTION.WRITE, UNNAMED_WRITE, labelOrCallback);
}

export function takeLoggingRecords(): LoggingRecord[] {
  const logs = [...loggingRecords];
  loggingRecords.length = 0;
  return logs;
}

/**
 * We offer a convenience function for scroll-based activity, but often triggering a scroll
 * requires a layout pass, thus it is better handled as a read activity, i.e. we wait until
 * the layout-triggering work has been completed then it should be possible to scroll without
 * first forcing layout.  If multiple jobs are scheduled with the same non-empty label, only
 * the latest callback would be executed. Such invocations would return the same promise that
 * will resolve when the latest callback is run.
 */
export async function scroll<T>(callback: CoordinatorCallback<T>): Promise<T>;
export async function scroll<T>(label: string, callback: CoordinatorCallback<T>): Promise<T>;
export async function scroll<T>(
    labelOrCallback: CoordinatorCallback<T>|string, callback?: CoordinatorCallback<T>): Promise<T> {
  if (typeof labelOrCallback === 'string') {
    if (!callback) {
      throw new Error('Scroll called with label but no callback');
    }
    return await enqueueHandler(ACTION.READ, labelOrCallback, callback);
  }

  return await enqueueHandler(ACTION.READ, UNNAMED_SCROLL, labelOrCallback);
}

function enqueueHandler<T>(action: ACTION, label: string, callback: CoordinatorCallback<T>): Promise<T> {
  const hasName = ![UNNAMED_READ, UNNAMED_WRITE, UNNAMED_SCROLL].includes(label);
  label = `${action === ACTION.READ ? '[Read]' : '[Write]'}: ${label}`;

  let workItems = null;
  switch (action) {
    case ACTION.READ:
      workItems = pendingReaders;
      break;

    case ACTION.WRITE:
      workItems = pendingWriters;
      break;

    default:
      throw new Error(`Unknown action: ${action}`);
  }

  let workItem = hasName ? workItems.find(w => w.label === label) as WorkItem<T>| undefined : undefined;
  if (!workItem) {
    workItem = new WorkItem<T>(label, callback);
    workItems.push(workItem);
  } else {
    // We are always using the latest handler, so that we don't end up with a
    // stale results. We are reusing the promise to avoid blocking the first invocation, when
    // it is being "overridden" by another one.
    workItem.handler = callback;
  }

  scheduleWork();
  return workItem.promise;
}

function scheduleWork(): void {
  if (scheduledWorkId !== 0) {
    return;
  }

  scheduledWorkId = requestAnimationFrame(async () => {
    if (!hasPendingWork()) {
      // All pending work has completed.
      // The events dispatched below are mostly for testing contexts.
      window.dispatchEvent(new RenderCoordinatorQueueEmptyEvent());

      logIfEnabled('[Queue empty]');
      scheduledWorkId = 0;
      return;
    }

    window.dispatchEvent(new RenderCoordinatorNewFrameEvent());
    logIfEnabled('[New frame]');

    const readers = pendingReaders;
    pendingReaders = [];
    const writers = pendingWriters;
    pendingWriters = [];

    // Start with all the readers and allow them
    // to proceed together.
    for (const reader of readers) {
      logIfEnabled(reader.label);
      reader.trigger();
    }

    // Wait for them all to be done.
    try {
      await Promise.race([
        Promise.all(readers.map(r => r.promise)),
        new Promise((_, reject) => {
          window.setTimeout(
              () => reject(new Error(`Readers took over ${DEADLOCK_TIMEOUT}ms. Possible deadlock?`)), DEADLOCK_TIMEOUT);
        }),
      ]);
    } catch (err) {
      rejectAll(readers, err);
    }

    // Next do all the writers as a block.
    for (const writer of writers) {
      logIfEnabled(writer.label);
      writer.trigger();
    }

    // And wait for them to be done, too.
    try {
      await Promise.race([
        Promise.all(writers.map(w => w.promise)),
        new Promise((_, reject) => {
          window.setTimeout(
              () => reject(new Error(`Writers took over ${DEADLOCK_TIMEOUT}ms. Possible deadlock?`)), DEADLOCK_TIMEOUT);
        }),
      ]);
    } catch (err) {
      rejectAll(writers, err);
    }

    // Since there may have been more work requested in
    // the callback of a reader / writer, we attempt to schedule
    // it at this point.
    scheduledWorkId = 0;
    scheduleWork();
  });
}

function rejectAll(handlers: Array<WorkItem<unknown>>, error: Error): void {
  for (const handler of handlers) {
    handler.cancel(error);
  }
}

export function cancelPending(): void {
  const error = new Error();
  rejectAll(pendingReaders, error);
  rejectAll(pendingWriters, error);
}

function logIfEnabled(value: string): void {
  if (loggingEnabled === null) {
    return;
  }
  if (loggingEnabled.onlyNamed) {
    if (value.endsWith(UNNAMED_READ) || value.endsWith(UNNAMED_WRITE) || value.endsWith(UNNAMED_SCROLL)) {
      return;
    }
  }

  loggingRecords.push({time: performance.now(), value});

  // Keep the log at the log size.
  const loggingLimit = loggingEnabled.storageLimit ?? 100;
  while (loggingRecords.length > loggingLimit) {
    loggingRecords.shift();
  }
}

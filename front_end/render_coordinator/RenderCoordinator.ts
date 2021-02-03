// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Components don't orchestrate their DOM updates in a wider context
 * (i.e. the host frame's document), which leads to interleaved reading
 * and writing of layout-centric values, e.g. clientHeight, scrollTop etc.
 *
 * This helper to ensure that we do reads, writes, and scrolls at the
 * correct point in the frame lifecycle. It groups reads to the start of a
 * frame, where we can assume layout-centric values are available on the
 * basis of the last completed frame, and then it runs all writes
 * afterwards. In the event that a read / write / scroll callback contains
 * calls for more read / write / scroll calls, such calls will be scheduled
 * for the next available frame.
 */

interface CoordinatorCallback {
  (): unknown;
}

interface CoordinatorFrame {
  readers: CoordinatorCallback[];
  writers: CoordinatorCallback[];
}

interface CoordinatorLogEntry {
  time: number;
  value: string;
}

const enum ACTION {
  READ = 'read',
  WRITE = 'write',
}

export class RenderCoordinatorQueueEmptyEvent extends Event {
  constructor() {
    super('queueempty');
  }
}

export class RenderCoordinatorNewFrameEvent extends Event {
  constructor() {
    super('newframe');
  }
}

type RenderCoordinatorResolverCallback = (value: unknown) => void;

let renderCoordinatorInstance: RenderCoordinator;

const UNNAMED_READ = 'Unnamed read';
const UNNAMED_WRITE = 'Unnamed write';
const UNNAMED_SCROLL = 'Unnamed scroll';

export class RenderCoordinator extends EventTarget {
  static instance({forceNew = false} = {}): RenderCoordinator {
    if (!renderCoordinatorInstance || forceNew) {
      renderCoordinatorInstance = new RenderCoordinator();
    }

    return renderCoordinatorInstance;
  }

  // Toggle on to start tracking. You must call takeRecords() to
  // obtain the records. Please note: records are limited by maxRecordSize below.
  observe = false;
  recordStorageLimit = 100;

  // If true, only log activity with an explicit label.
  // This does not affect logging frames or queue empty events.
  observeOnlyNamed = true;

  private readonly logInternal: CoordinatorLogEntry[] = [];

  private readonly pendingWorkFrames: CoordinatorFrame[] = [];
  private readonly resolvers = new WeakMap<CoordinatorCallback, RenderCoordinatorResolverCallback>();
  private readonly labels = new WeakMap<CoordinatorCallback, string>();
  private scheduledWorkId = 0;

  done(): Promise<void> {
    if (this.pendingWorkFrames.length === 0) {
      return Promise.resolve();
    }
    return new Promise(resolve => this.addEventListener('queueempty', () => resolve(), {once: true}));
  }

  async read<T extends unknown>(callback: CoordinatorCallback): Promise<T>;
  async read<T extends unknown>(label: string, callback: CoordinatorCallback): Promise<T>;
  async read<T extends unknown>(labelOrCallback: CoordinatorCallback|string, callback?: CoordinatorCallback):
      Promise<T> {
    if (typeof labelOrCallback === 'string') {
      if (!callback) {
        throw new Error('Read called with label but no callback');
      }
      return this.enqueueHandler<T>(callback, ACTION.READ, labelOrCallback);
    }

    return this.enqueueHandler<T>(labelOrCallback, ACTION.READ, UNNAMED_READ);
  }

  async write<T extends unknown>(callback: CoordinatorCallback): Promise<T>;
  async write<T extends unknown>(label: string, callback: CoordinatorCallback): Promise<T>;
  async write<T extends unknown>(labelOrCallback: CoordinatorCallback|string, callback?: CoordinatorCallback):
      Promise<T> {
    if (typeof labelOrCallback === 'string') {
      if (!callback) {
        throw new Error('Write called with label but no callback');
      }
      return this.enqueueHandler<T>(callback, ACTION.WRITE, labelOrCallback);
    }

    return this.enqueueHandler<T>(labelOrCallback, ACTION.WRITE, UNNAMED_WRITE);
  }

  takeRecords(): CoordinatorLogEntry[] {
    const logs = [...this.logInternal];
    this.logInternal.length = 0;
    return logs;
  }

  /**
   * We offer a convenience function for scroll-based activity, but often triggering a scroll
   * requires a layout pass, thus it is better handled as a read activity, i.e. we wait until
   * the layout-triggering work has been completed then it should be possible to scroll without
   * first forcing layout.
   */
  async scroll<T extends unknown>(callback: CoordinatorCallback): Promise<T>;
  async scroll<T extends unknown>(label: string, callback: CoordinatorCallback): Promise<T>;
  async scroll<T extends unknown>(labelOrCallback: CoordinatorCallback|string, callback?: CoordinatorCallback):
      Promise<T> {
    if (typeof labelOrCallback === 'string') {
      if (!callback) {
        throw new Error('Scroll called with label but no callback');
      }
      return this.enqueueHandler<T>(callback, ACTION.READ, labelOrCallback);
    }

    return this.enqueueHandler<T>(labelOrCallback, ACTION.READ, UNNAMED_SCROLL);
  }

  private enqueueHandler<T = unknown>(callback: CoordinatorCallback, action: ACTION, label = ''): Promise<T> {
    this.labels.set(callback, `${action === ACTION.READ ? '[Read]' : '[Write]'}: ${label}`);

    if (this.pendingWorkFrames.length === 0) {
      this.pendingWorkFrames.push({
        readers: [],
        writers: [],
      });
    }

    const frame = this.pendingWorkFrames[0];
    if (!frame) {
      throw new Error('No frame available');
    }

    switch (action) {
      case ACTION.READ:
        frame.readers.push(callback);
        break;

      case ACTION.WRITE:
        frame.writers.push(callback);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const resolverPromise = new Promise(resolve => {
      this.resolvers.set(callback, resolve);
    });

    this.scheduleWork();
    return resolverPromise as Promise<T>;
  }

  private handleWork(handler: CoordinatorCallback): void {
    const data = handler.call(undefined);
    const resolver = this.resolvers.get(handler);
    if (!resolver) {
      throw new Error('Unable to locate resolver');
    }

    resolver.call(undefined, data);
    this.resolvers.delete(handler);
  }

  private scheduleWork(): void {
    const hasScheduledWork = this.scheduledWorkId !== 0;
    if (hasScheduledWork) {
      return;
    }

    this.scheduledWorkId = requestAnimationFrame(() => {
      const hasPendingFrames = this.pendingWorkFrames.length > 0;
      if (!hasPendingFrames) {
        // No pending frames means all pending work has completed.
        // The event dispatched below is mostly for testing contexts.
        this.dispatchEvent(new RenderCoordinatorQueueEmptyEvent());
        this.logIfEnabled('[Queue empty]');
        this.scheduledWorkId = 0;
        return;
      }

      this.dispatchEvent(new RenderCoordinatorNewFrameEvent());
      this.logIfEnabled('[New frame]');

      const frame = this.pendingWorkFrames.shift();
      if (!frame) {
        return;
      }

      for (const reader of frame.readers) {
        this.logIfEnabled(this.labels.get(reader));
        this.handleWork(reader);
      }

      for (const writer of frame.writers) {
        this.logIfEnabled(this.labels.get(writer));
        this.handleWork(writer);
      }

      // Since there may have been more work requested in
      // the callback of a reader / writer, we attempt to schedule
      // it at this point.
      this.scheduledWorkId = 0;
      this.scheduleWork();
    });
  }

  private logIfEnabled(value: string|undefined): void {
    if (!this.observe || !value) {
      return;
    }
    const hasNoName = value.endsWith(UNNAMED_READ) || value.endsWith(UNNAMED_WRITE) || value.endsWith(UNNAMED_SCROLL);
    if (hasNoName && this.observeOnlyNamed) {
      return;
    }

    this.logInternal.push({time: performance.now(), value});

    // Keep the log at the log size.
    while (this.logInternal.length > this.recordStorageLimit) {
      this.logInternal.shift();
    }
  }
}

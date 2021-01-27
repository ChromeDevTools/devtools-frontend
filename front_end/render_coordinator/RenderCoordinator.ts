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

const enum ACTION {
  READ = 'read',
  WRITE = 'write'
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

export class RenderCoordinator extends EventTarget {
  static instance({forceNew = false} = {}): RenderCoordinator {
    if (!renderCoordinatorInstance || forceNew) {
      renderCoordinatorInstance = new RenderCoordinator();
    }

    return renderCoordinatorInstance;
  }

  private readonly pendingWorkFrames: CoordinatorFrame[] = [];
  private readonly resolvers = new WeakMap<CoordinatorCallback, RenderCoordinatorResolverCallback>();
  private scheduledWorkId = 0;

  async read<T extends unknown>(callback: CoordinatorCallback): Promise<T> {
    return this.enqueueHandler<T>(callback, ACTION.READ);
  }

  async write<T extends unknown>(callback: CoordinatorCallback): Promise<T> {
    return this.enqueueHandler<T>(callback, ACTION.WRITE);
  }

  /**
   * We offer a convenience function for scroll-based activity, but often triggering a scroll
   * requires a layout pass, thus it is better handled as a read activity, i.e. we wait until
   * the layout-triggering work has been completed then it should be possible to scroll without
   * first forcing layout.
   */
  async scroll<T extends unknown>(callback: CoordinatorCallback): Promise<T> {
    return this.read(callback);
  }

  private enqueueHandler<T = unknown>(callback: CoordinatorCallback, action: ACTION): Promise<T> {
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
    const hasPendingFrames = this.pendingWorkFrames.length > 0;
    const hasScheduledWork = this.scheduledWorkId !== 0;
    if (!hasPendingFrames || hasScheduledWork) {
      // No pending frames means all pending work has completed.
      // The event dispatched below is mostly for testing contexts.
      if (!hasPendingFrames) {
        this.dispatchEvent(new RenderCoordinatorQueueEmptyEvent());
      }
      return;
    }

    this.scheduledWorkId = requestAnimationFrame(() => {
      this.dispatchEvent(new RenderCoordinatorNewFrameEvent());

      const frame = this.pendingWorkFrames.shift();
      if (!frame) {
        return;
      }

      for (const reader of frame.readers) {
        this.handleWork(reader);
      }

      for (const writer of frame.writers) {
        this.handleWork(writer);
      }

      // Since there may have been more work requested in
      // the callback of a reader / writer, we attempt to schedule
      // it at this point.
      this.scheduledWorkId = 0;
      this.scheduleWork();
    });
  }
}

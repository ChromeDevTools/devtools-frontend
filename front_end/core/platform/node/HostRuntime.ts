// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as WorkerThreads from 'node:worker_threads';

import type * as Api from '../api/api.js';

class NodeWorkerScope implements Api.HostRuntime.WorkerScope {
  postMessage(message: unknown): void {
    WorkerThreads.parentPort?.postMessage(message);
  }

  set onmessage(listener: (event: Api.HostRuntime.WorkerMessageEvent) => void) {
    WorkerThreads.parentPort?.on('message', data => {
      listener({data});
    });
  }
}

class NodeWorker implements Api.HostRuntime.Worker {
  readonly #workerPromise: Promise<WorkerThreads.Worker>;
  #disposed = false;
  #rejectWorkerPromise?: (error: Error) => void;

  constructor(url: string) {
    this.#workerPromise = new Promise((resolve, reject) => {
      this.#rejectWorkerPromise = reject;
      const worker = new WorkerThreads.Worker(new URL(url));
      worker.once('message', (message: unknown) => {
        if (message === 'workerReady') {
          resolve(worker);
        }
      });
      worker.on('error', reject);
    });
  }

  postMessage(message: unknown): void {
    void this.#workerPromise.then(worker => {
      if (!this.#disposed) {
        worker.postMessage(message);
      }
    });
  }

  dispose(): void {
    this.#disposed = true;
    void this.#workerPromise.then(worker => worker.terminate());
  }

  terminate(immediately?: boolean): void {
    if (immediately) {
      this.#rejectWorkerPromise?.(new Error('Worker terminated'));
    }
    this.dispose();
  }

  set onmessage(listener: (event: unknown) => void) {
    void this.#workerPromise.then(worker => {
      worker.on('message', data => {
        if (!this.#disposed) {
          listener({data});
        }
      });
    });
  }

  set onerror(listener: (event: unknown) => void) {
    void this.#workerPromise.then(worker => {
      worker.on('error', (error: Error) => {
        if (!this.#disposed) {
          listener({type: 'error', ...error});
        }
      });
    });
  }
}

export const HOST_RUNTIME: Api.HostRuntime.HostRuntime = {
  createWorker(url: string): Api.HostRuntime.Worker {
    return new NodeWorker(url);
  },
  workerScope: new NodeWorkerScope(),
};

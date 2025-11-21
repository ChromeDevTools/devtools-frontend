// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Api from '../platform/api/api.js';

export class WorkerWrapper implements Api.HostRuntime.Worker {
  readonly #workerPromise: Promise<Worker>;
  #disposed?: boolean;
  #rejectWorkerPromise?: (error: Error) => void;

  private constructor(workerLocation: URL) {
    this.#workerPromise = new Promise((fulfill, reject) => {
      this.#rejectWorkerPromise = reject;
      const worker = new Worker(workerLocation, {type: 'module'});
      worker.onerror = event => {
        console.error(`Failed to load worker for ${workerLocation.href}:`, event);
      };
      worker.onmessage = (event: MessageEvent<unknown>) => {
        console.assert(event.data === 'workerReady');
        worker.onmessage = null;
        fulfill(worker);
      };
    });
  }

  static fromURL(url: URL): Api.HostRuntime.Worker {
    return new WorkerWrapper(url);
  }

  postMessage(message: unknown, transfer?: Api.HostRuntime.WorkerTransferable[]): void {
    void this.#workerPromise.then(worker => {
      if (!this.#disposed) {
        worker.postMessage(message, transfer ?? []);
      }
    });
  }

  dispose(): void {
    this.#disposed = true;
    void this.#workerPromise.then(worker => worker.terminate());
  }

  terminate(immediately = false): void {
    if (immediately) {
      this.#rejectWorkerPromise?.(new Error('Worker terminated'));
    }
    this.dispose();
  }

  set onmessage(listener: (event: Api.HostRuntime.WorkerMessageEvent) => void) {
    void this.#workerPromise.then(worker => {
      worker.onmessage = listener;
    });
  }

  set onerror(listener: (event: unknown) => void) {
    void this.#workerPromise.then(worker => {
      worker.onerror = listener;
    });
  }
}

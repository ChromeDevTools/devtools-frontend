// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Api from '../api/api.js';

class WebWorkerScope implements Api.HostRuntime.WorkerScope {
  postMessage(message: unknown): void {
    self.postMessage(message);
  }

  set onmessage(listener: (event: Api.HostRuntime.WorkerMessageEvent) => void) {
    self.onmessage = listener;
  }
}

class WebWorker implements Api.HostRuntime.Worker {
  readonly #workerPromise: Promise<Worker>;
  #disposed?: boolean;
  #rejectWorkerPromise?: (error: Error) => void;

  constructor(workerLocation: string) {
    this.#workerPromise = new Promise((fulfill, reject) => {
      this.#rejectWorkerPromise = reject;
      const worker = new Worker(new URL(workerLocation), {type: 'module'});
      worker.onerror = event => {
        console.error(`Failed to load worker for ${workerLocation}:`, event);
      };
      worker.onmessage = (event: MessageEvent<unknown>) => {
        console.assert(event.data === 'workerReady');
        worker.onmessage = null;
        fulfill(worker);
      };
    });
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

export const HOST_RUNTIME: Api.HostRuntime.HostRuntime = {
  createWorker(url: string): Api.HostRuntime.Worker {
    return new WebWorker(url);
  },
  workerScope: new WebWorkerScope(),
};

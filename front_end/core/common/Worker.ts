// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class WorkerWrapper {
  readonly #workerPromise: Promise<Worker>;
  #disposed?: boolean;

  private constructor(workerLocation: URL) {
    this.#workerPromise = new Promise(fulfill => {
      const worker = new Worker(workerLocation, {type: 'module'});
      worker.onmessage = (event: MessageEvent<unknown>) => {
        console.assert(event.data === 'workerReady');
        worker.onmessage = null;
        fulfill(worker);
      };
    });
  }

  static fromURL(url: URL): WorkerWrapper {
    return new WorkerWrapper(url);
  }

  postMessage(message: unknown, transfer?: Transferable[]): void {
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

  terminate(): void {
    this.dispose();
  }

  set onmessage(listener: (event: MessageEvent) => void) {
    void this.#workerPromise.then(worker => {
      worker.onmessage = listener;
    });
  }

  set onerror(listener: (event: Event) => void) {
    void this.#workerPromise.then(worker => {
      worker.onerror = listener;
    });
  }
}

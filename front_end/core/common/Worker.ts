/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

export class WorkerWrapper {
  readonly #workerPromise: Promise<Worker>;
  #disposed?: boolean;

  private constructor(workerLocation: URL) {
    this.#workerPromise = new Promise(fulfill => {
      const worker = new Worker(workerLocation, {type: 'module'});
      worker.onmessage = (event: MessageEvent<unknown>): void => {
        console.assert(event.data === 'workerReady');
        worker.onmessage = null;
        fulfill(worker);
      };
    });
  }

  static fromURL(url: URL): WorkerWrapper {
    return new WorkerWrapper(url);
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

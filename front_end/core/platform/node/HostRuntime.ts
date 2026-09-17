// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Fs from 'node:fs';
import * as Url from 'node:url';
import * as WorkerThreads from 'node:worker_threads';

import type * as Api from '../api/api.js';

class NodeWorkerScope implements Api.HostRuntime.WorkerScope {
  postMessage(message: unknown, transfer?: Api.HostRuntime.WorkerTransferable[]): void {
    WorkerThreads.parentPort?.postMessage(message, transfer as unknown as WorkerThreads.Transferable[]);
  }

  set onmessage(listener: (event: Api.HostRuntime.WorkerMessageEvent) => void) {
    WorkerThreads.parentPort?.addEventListener('message', msg => {
      listener(msg as unknown as Api.HostRuntime.WorkerMessageEvent);
    });
  }
}

class NodeWorker implements Api.HostRuntime.Worker {
  readonly #worker: WorkerThreads.Worker;
  readonly #workerPromise: Promise<WorkerThreads.Worker>;
  #disposed = false;
  #rejectWorkerPromise?: (error: Error) => void;

  constructor(url: string) {
    const worker = new WorkerThreads.Worker(new URL(url));
    this.#worker = worker;
    this.#workerPromise = new Promise<WorkerThreads.Worker>((resolve, reject) => {
      this.#rejectWorkerPromise = reject;
      worker.once('message', (message: unknown) => {
        if (message === 'workerReady') {
          resolve(worker);
        }
      });
      worker.on('error', reject);
    });
    // Prevent unhandled promise rejections if the worker is terminated early.
    this.#workerPromise.catch(() => {});
  }

  postMessage(message: unknown, transfer?: Api.HostRuntime.WorkerTransferable[]): void {
    void this.#workerPromise.then(worker => {
      if (!this.#disposed) {
        worker.postMessage(message, transfer as unknown as WorkerThreads.Transferable[]);
      }
    });
  }

  dispose(): void {
    this.#disposed = true;
    void this.#worker.terminate();
  }

  terminate(immediately?: boolean): void {
    if (immediately) {
      this.#rejectWorkerPromise?.(new Error('Worker terminated'));
    }
    this.dispose();
  }

  set onmessage(listener: (event: Api.HostRuntime.WorkerMessageEvent) => void) {
    void this.#workerPromise.then(worker => {
      worker.on('message', (data: unknown) => {
        if (!this.#disposed) {
          listener({data, ports: []});
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

class NodeCacheEntry implements Api.HostRuntime.CacheEntry {
  readonly #entries = new Map<string, Response>();

  async put(url: string, response: Response): Promise<void> {
    this.#entries.set(url, response.clone());
  }

  async match(url: string): Promise<Response|undefined> {
    return this.#entries.get(url)?.clone();
  }
}

class NodeCacheStorage implements Api.HostRuntime.CacheStorageLike {
  readonly #caches = new Map<string, NodeCacheEntry>();

  async open(name: string): Promise<Api.HostRuntime.CacheEntry> {
    let cache = this.#caches.get(name);
    if (!cache) {
      cache = new NodeCacheEntry();
      this.#caches.set(name, cache);
    }
    return cache;
  }

  async delete(name: string): Promise<boolean> {
    return this.#caches.delete(name);
  }
}

const nodeCacheStorage = new NodeCacheStorage();

export const HOST_RUNTIME: Api.HostRuntime.HostRuntime = {
  createWorker(url: string): Api.HostRuntime.Worker {
    return new NodeWorker(url);
  },
  workerScope: new NodeWorkerScope(),
  getOnLine(): boolean {
    return true;
  },
  getUserAgent(): string {
    return 'Node.js';
  },
  getLocalStorage(): Storage |
      undefined {
        return undefined;
      },
  getCacheStorage(): Api.HostRuntime.CacheStorageLike |
      undefined {
        return nodeCacheStorage;
      },
  getDevicePixelRatio(): number {
    return 1;
  },
  async saveScreenshot(_options: Api.HostRuntime.ScreenshotOptions): Promise<void>{},
  revokeLastScreenshotUrl(): void{},
  async loadTextFile(url: URL): Promise<string> {
    return await Fs.promises.readFile(Url.fileURLToPath(url), 'utf-8');
  },
  evaluateCSS(_dataValue: string|null, _customExpr: string): string |
      null {
        return null;
      },
  removeCSSEvaluationElement(): void{},
};

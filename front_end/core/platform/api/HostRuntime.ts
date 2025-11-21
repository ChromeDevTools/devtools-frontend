// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Provides abstractions for host features that require different implementations depending
 * on whether DevTools runs in the browser or Node.js
 */
export interface HostRuntime {
  createWorker(url: string): Worker;
  workerScope: WorkerScope;
}

/**
 * Abstracts away the differences between browser web workers and Node.js worker threads.
 */
export interface Worker {
  postMessage(message: unknown, transfer?: WorkerTransferable[]): void;

  dispose(): void;
  terminate(immediately?: boolean): void;

  set onmessage(listener: (event: WorkerMessageEvent) => void);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set onerror(listener: (event: any) => void);
}

/**
 * Currently we ony transfer MessagePorts to workers, but it's possible to add
 * more things (like ReadableStream) as long as it's present in all runtimes.
 */
export type WorkerTransferable = typeof MessagePort.prototype;

/**
 * Used by workers to communicate with their parent.
 */
export interface WorkerScope {
  postMessage(message: unknown): void;
  set onmessage(listener: (event: WorkerMessageEvent) => void);
}

export interface WorkerMessageEvent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly data: any;
}

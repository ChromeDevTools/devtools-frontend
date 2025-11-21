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

export const HOST_RUNTIME: Api.HostRuntime.HostRuntime = {
  createWorker(): Api.HostRuntime.Worker {
    throw new Error('unimplemented');
  },
  workerScope: new NodeWorkerScope(),
};

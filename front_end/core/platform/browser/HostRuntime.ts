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

export const HOST_RUNTIME: Api.HostRuntime.HostRuntime = {
  createWorker(): Api.HostRuntime.Worker {
    throw new Error('unimplemented');
  },
  workerScope: new WebWorkerScope(),
};

// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as HeapSnapshotWorker from './heap_snapshot_worker.js';

// We need to force the worker context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctxSelf = self as any as Worker;
const dispatcher = new HeapSnapshotWorker.HeapSnapshotWorkerDispatcher.HeapSnapshotWorkerDispatcher(
    ctxSelf, (message: unknown) => self.postMessage(message));

function installMessageEventListener(listener: EventListener): void {
  ctxSelf.addEventListener('message', listener, false);
}

// @ts-ignore
installMessageEventListener(dispatcher.dispatchMessage.bind(dispatcher));

self.postMessage('workerReady');

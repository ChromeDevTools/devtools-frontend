// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as HeapSnapshotWorker from './heap_snapshot_worker.js';

const dispatcher =
    new HeapSnapshotWorker.HeapSnapshotWorkerDispatcher.HeapSnapshotWorkerDispatcher(self.postMessage.bind(self));
self.addEventListener('message', dispatcher.dispatchMessage.bind(dispatcher), false);
self.postMessage('workerReady');

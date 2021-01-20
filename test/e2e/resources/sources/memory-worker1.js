// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview Launch second worker with shared memory and wait for it.
 */

self.onmessage = (/** @type{MessageEvent<SharedArrayBuffer>} */ event) => {
    const memory1 = new ArrayBuffer(16);
    const sharedMemory = event.data;
    const worker2 = new Worker('./memory-worker2.js');
    const sharedArr = new Int32Array(sharedMemory);
    // Wake other worker
    Atomics.store(sharedArr, 1, 1);
    Atomics.notify(sharedArr, 1, 1);
    // Wait for the worker to modify the shared memory
    Atomics.wait(sharedArr, 0, 0);
    debugger;
  };

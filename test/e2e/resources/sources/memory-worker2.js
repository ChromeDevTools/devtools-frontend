// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview Break the debugger while other worker waits.
 */

self.onmessage = (/** @type{MessageEvent<SharedArrayBuffer>} */ event) => {
    const memory2 = new ArrayBuffer(16);
    const sharedMem = event.data;
    const sharedArray = new Int32Array(sharedMem);
    // Ensure that other worker is awake
    Atomics.wait(sharedArray, 1, 0);
    // Break
    debugger;
    // Wake other worker
    Atomics.store(sharedArray, 0, 1);
    Atomics.notify(sharedArray, 0, 1);
  };

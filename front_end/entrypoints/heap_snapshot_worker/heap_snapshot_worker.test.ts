// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

describe('HeapSnapshotWorker', () => {
  it('module can be imported', async () => {
    await import('./heap_snapshot_worker.js');
  });
});

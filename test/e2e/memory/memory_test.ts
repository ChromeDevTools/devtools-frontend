// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$$} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {navigateToMemoryTab, takeHeapSnapshot, waitForHeapSnapshotData} from '../helpers/memory-helpers.js';

describe('The Memory Panel', async () => {
  it('Loads content', async () => {
    await navigateToMemoryTab();
  });

  it('Can take several heap snapshots ', async () => {
    await navigateToMemoryTab();
    await takeHeapSnapshot();
    await waitForHeapSnapshotData();
    await takeHeapSnapshot();
    await waitForHeapSnapshotData();
    const heapSnapShots = await $$('.heap-snapshot-sidebar-tree-item');
    assert.strictEqual(heapSnapShots.length, 2);
  });
});

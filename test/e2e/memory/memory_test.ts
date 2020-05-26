// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from 'mocha';

import {getBrowserAndPages} from '../../shared/helper.js';
import {navigateToMemoryTab, takeHeapSnapshot, waitForHeapSnapshotData} from '../helpers/memory-helpers.js';

describe('The Memory Panel', async () => {
  it('Loads content', async () => {
    const {target} = getBrowserAndPages();
    await navigateToMemoryTab(target);
  });
  // The row count assertion is failing in CQ
  it.skip('[crbug.com/1086641]: Can take several heap snapshots ', async () => {
    const {target} = getBrowserAndPages();
    await navigateToMemoryTab(target);
    await takeHeapSnapshot();
    await waitForHeapSnapshotData();
    await takeHeapSnapshot();
    await waitForHeapSnapshotData();
  });
});

// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$$, click, goToResource, waitFor, waitForNone} from '../../shared/helper.js';

const NEW_HEAP_SNAPSHOT_BUTTON = 'button[aria-label="Take heap snapshot"]';
const MEMORY_PANEL_CONTENT = 'div[aria-label="Memory panel"]';
const PROFILE_TREE_SIDEBAR = 'div.profiles-tree-sidebar';
export const MEMORY_TAB_ID = '#tab-heap_profiler';

export async function navigateToMemoryTab() {
  await goToResource('memory/default.html');
  await click(MEMORY_TAB_ID);
  await waitFor(MEMORY_PANEL_CONTENT);
  await waitFor(PROFILE_TREE_SIDEBAR);
}

export async function takeHeapSnapshot() {
  await click(NEW_HEAP_SNAPSHOT_BUTTON);
  await waitForNone('.heap-snapshot-sidebar-tree-item.wait');
  await waitFor('.heap-snapshot-sidebar-tree-item.selected');
}

export async function waitForHeapSnapshotData() {
  await waitFor('#profile-views');
  await waitFor('#profile-views .data-grid');
  const rowCount = await getCountOfDataGridRows('#profile-views table.data');
  assert.notEqual(rowCount, 0);
}

export async function getCountOfDataGridRows(selector: string) {
  // The grid in Memory Tab contains a tree
  const grid = await waitFor(selector);
  const dataGridNodes = await $$('.data-grid-data-grid-node', grid);
  return await dataGridNodes.evaluate(nodes => nodes.length);
}

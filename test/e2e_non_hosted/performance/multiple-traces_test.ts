// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as fs from 'fs';
import * as path from 'path';

import {GEN_DIR} from '../../conductor/paths.js';
import {
  navigateToPerformanceTab,
} from '../../e2e/helpers/performance-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';

async function uploadTraceFile(devToolsPage: DevToolsPage, name: string) {
  const uploadProfileHandle = await devToolsPage.waitFor('input[type=file]');
  assert.isNotNull(uploadProfileHandle, 'unable to upload the performance profile');
  const testTrace = path.join(GEN_DIR, `test/e2e/resources/performance/timeline/${name}`);
  if (!fs.existsSync(testTrace)) {
    throw new Error(`Test trace file not found: ${testTrace}`);
  }

  await uploadProfileHandle.uploadFile(testTrace);
}

describe('RPP supporting multiple traces', () => {
  setup({dockingMode: 'undocked'});

  it('updates the UI when a new trace is imported', async ({devToolsPage, inspectedPage}) => {
    await navigateToPerformanceTab('fake-image-lcp', devToolsPage, inspectedPage);
    await uploadTraceFile(devToolsPage, 'web.dev-trace.json.gz');
    const firstTimings = await devToolsPage.waitFor<HTMLElement>('.summary-range');
    const firstTimingsText = await firstTimings.evaluate(t => t.innerText);
    assert.strictEqual(firstTimingsText, 'Range:  0 ms – 6.25 s');
    await uploadTraceFile(devToolsPage, 'treeView-test-trace.json');
    const secondTimings = await devToolsPage.waitFor<HTMLElement>('.summary-range');
    const secondTimingsText = await secondTimings.evaluate(t => t.innerText);
    assert.strictEqual(secondTimingsText, 'Range: 547 ms – 1.78 s');
  });
});

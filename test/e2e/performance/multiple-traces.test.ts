// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  navigateToPerformanceTab,
  uploadTraceFile,
} from '../helpers/performance-helpers.js';

describe('RPP supporting multiple traces', () => {
  setup({dockingMode: 'undocked'});

  it('updates the UI when a new trace is imported', async ({devToolsPage, inspectedPage}) => {
    await navigateToPerformanceTab('fake-image-lcp', devToolsPage, inspectedPage);
    await uploadTraceFile(devToolsPage, 'test/e2e/resources/performance/timeline/web.dev-trace.json.gz');
    const firstTimings = await devToolsPage.waitFor<HTMLElement>('.summary-range');
    const firstTimingsText = await firstTimings.evaluate(t => t.innerText.replace(/\s/g, ''));
    assert.strictEqual(firstTimingsText, 'Range:547ms–1.78s');
    await uploadTraceFile(devToolsPage, 'test/e2e/resources/performance/timeline/treeView-test-trace.json');
    const secondTimings = await devToolsPage.waitFor<HTMLElement>('.summary-range');
    const secondTimingsText = await secondTimings.evaluate(t => t.innerText.replace(/\s/g, ''));
    assert.strictEqual(secondTimingsText, 'Range:0ms–867ms');
  });
});

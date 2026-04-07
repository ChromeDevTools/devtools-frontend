// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  navigateToApplicationTab,
} from '../helpers/application-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

export async function navigateToBucketViaDbMetadata(
    devToolsPage: DevToolsPage, inspectedPage: InspectedPage, subPanel: string, dbSelector: string) {
  await navigateToApplicationTab('storage-buckets-link', devToolsPage, inspectedPage);

  await devToolsPage.bringToFront();
  await devToolsPage.reload();
  await devToolsPage.doubleClick(`[aria-label="${subPanel}"]`);

  const db = await devToolsPage.waitForAria(dbSelector);
  await db.click();

  await devToolsPage.waitFor('devtools-report');

  const bucketNameLinkSelector = 'devtools-report-value devtools-link';
  await devToolsPage.waitForVisible(bucketNameLinkSelector);
  await devToolsPage.click(bucketNameLinkSelector);

  await devToolsPage.waitFor('devtools-button[aria-label="Delete bucket"]');
}

describe('The Application Tab', () => {
  setup({
    dockingMode: 'undocked',
    enabledFeatures: ['StorageBuckets'],
  });

  it('reveals storage bucket when clicking its name in IndexedDB metadata', async ({devToolsPage, inspectedPage}) => {
    await navigateToBucketViaDbMetadata(devToolsPage, inspectedPage, 'IndexedDB', 'test-db');
  });

  it('reveals storage bucket when clicking its name in Cache Storage metadata',
     async ({devToolsPage, inspectedPage}) => {
       await navigateToBucketViaDbMetadata(
           devToolsPage, inspectedPage, 'Cache storage', `test-cache - ${inspectedPage.domain()}/`);
     });
});

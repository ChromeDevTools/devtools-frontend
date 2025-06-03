// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {
  navigateToApplicationTab,
  navigateToServiceWorkers,
  unregisterServiceWorker,
} from '../../e2e/helpers/application-helpers.js';

const TEST_HTML_FILE = 'service-worker-network';
const SERVICE_WORKER_UPDATE_TIMELINE_SELECTOR = '.service-worker-update-timing-table';

describe('The Application Tab', () => {
  // TODO (liviurau): Update navigateToApplicationTab helper to work in docked
  // mode and remove the setup below.
  setup({dockingMode: 'undocked'});

  it('Navigate to a page with service worker we should find service worker update timeline info',
     async ({devToolsPage, inspectedPage}) => {
       await navigateToApplicationTab(TEST_HTML_FILE, devToolsPage, inspectedPage);
       await navigateToServiceWorkers(devToolsPage);

       const timeline = await devToolsPage.waitFor(SERVICE_WORKER_UPDATE_TIMELINE_SELECTOR);
       assert.isDefined(timeline);

       await unregisterServiceWorker(devToolsPage);
     });
});

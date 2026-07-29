// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {
  navigateToApplicationTab,
  navigateToServiceWorkers,
  unregisterServiceWorker,
} from '../helpers/application-helpers.js';

const TEST_HTML_FILE = 'service-worker-network';
const SERVICE_WORKER_UPDATE_TIMELINE_SELECTOR = '.service-worker-update-timing-table';

describe('The Application Tab', () => {
  // TODO (liviurau): Update navigateToApplicationTab helper to work in docked
  // mode and remove the setup below.
  setup({dockingMode: 'undocked'});

  it('Navigate to a page with service worker we should find service worker update timeline info',
     async ({devToolsPage, inspectedPage}) => {
       expectError('Request Network.enableDeviceBoundSessions failed. {"code":-32603,"message":"Internal error"}');
       await navigateToApplicationTab(devToolsPage, inspectedPage, TEST_HTML_FILE);
       await navigateToServiceWorkers(devToolsPage);

       const timeline = await devToolsPage.waitFor(SERVICE_WORKER_UPDATE_TIMELINE_SELECTOR);
       assert.isDefined(timeline);

       await unregisterServiceWorker(devToolsPage);
     });
});

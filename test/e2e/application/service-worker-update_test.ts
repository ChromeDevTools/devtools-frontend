// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {unregisterAllServiceWorkers} from '../../conductor/hooks.js';
import {waitFor} from '../../shared/helper.js';
import {
  navigateToApplicationTab,
  navigateToServiceWorkers,
  unregisterServiceWorker,
} from '../helpers/application-helpers.js';

const TEST_HTML_FILE = 'service-worker-network';
const SERVICE_WORKER_UPDATE_TIMELINE_SELECTOR = '.service-worker-update-timing-table';

describe('The Application Tab', function() {
  it('Navigate to a page with service worker we should find service worker update timeline info', async () => {
    await navigateToApplicationTab(TEST_HTML_FILE);
    await navigateToServiceWorkers();

    const timeline = await waitFor(SERVICE_WORKER_UPDATE_TIMELINE_SELECTOR);
    assert.isDefined(timeline);

    await unregisterServiceWorker();
    await unregisterAllServiceWorkers();
  });
});

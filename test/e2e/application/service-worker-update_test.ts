// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {unregisterAllServiceWorkers} from '../../conductor/hooks.js';
import {getBrowserAndPages, step, waitFor} from '../../shared/helper.js';

import {
  navigateToApplicationTab,
  navigateToServiceWorkers,
  unregisterServiceWorker,
} from '../helpers/application-helpers.js';

const TEST_HTML_FILE = 'service-worker-network';
const SERVICE_WORKER_UPDATE_TIMELINE_SELECTOR = '.service-worker-update-timing-table';

describe('The Application Tab', function() {
  beforeEach(async function() {
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, TEST_HTML_FILE);
    await navigateToServiceWorkers();
  });

  afterEach(async () => {
    await unregisterAllServiceWorkers();
  });

  it('Navigate to a page with service worker we should find service worker update timeline info', async () => {
    await step('wait and locate service worker update time line', async () => {
      const timeline = await waitFor(SERVICE_WORKER_UPDATE_TIMELINE_SELECTOR);
      assert.isDefined(timeline);
    });
    await unregisterServiceWorker();
  });
});

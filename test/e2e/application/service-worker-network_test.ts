// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {unregisterAllServiceWorkers} from '../../conductor/hooks.js';
import {click, getBrowserAndPages, step} from '../../shared/helper.js';

import {
  navigateToApplicationTab,
  navigateToServiceWorkers,
  unregisterServiceWorker,
} from '../helpers/application-helpers.js';
import {tabExistsInDrawer, tabExistsInMainPanel} from '../helpers/cross-tool-helper.js';
import {closeDrawer} from '../helpers/quick_open-helpers.js';

const NETWORK_TAB_SELECTOR = '#tab-network';
const TEST_HTML_FILE = 'service-worker-network';
const SERVICE_WORKER_NETWORK_SELECTOR = '[title="Network requests"]';

describe('The Application Tab', () => {
  beforeEach(async () => {
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, TEST_HTML_FILE);
    await navigateToServiceWorkers();
  });

  afterEach(async () => {
    await unregisterAllServiceWorkers();
  });

  it('Clicking on Network requests for service worker should open Network panel in drawer and closing should move it back',
     async () => {
       await step('Click on network requests for service worker should open network panel in drawer', async () => {
         await click(SERVICE_WORKER_NETWORK_SELECTOR);
         await tabExistsInDrawer(NETWORK_TAB_SELECTOR);
       });

       await step('Close drawer and network tab should move back to main panel', async () => {
         await closeDrawer();
         await tabExistsInMainPanel(NETWORK_TAB_SELECTOR);
       });

       await unregisterServiceWorker();
     });
});

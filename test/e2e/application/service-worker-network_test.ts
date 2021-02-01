// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, step} from '../../shared/helper.js';
import {beforeEach, describe, it} from '../../shared/mocha-extensions.js';
import {doubleClickSourceTreeItem, navigateToApplicationTab} from '../helpers/application-helpers.js';
import {checkIfTabExistsInDrawer, tabExistsInMainPanel} from '../helpers/cross-tool-helper.js';
import {closeDrawer} from '../helpers/quick_open-helpers.js';

const NETWORK_TAB_SELECTOR = '#tab-network';
const SERVICE_WORKER_ROW_SELECTOR = '[aria-label="Service Workers"]';
const TEST_HTML_FILE = 'service-worker-network';
const SERVICE_WORKER_NETWORK_SELECTOR = '[aria-label="Network requests"]';

describe('The Application Tab', async () => {
  beforeEach(async () => {
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, TEST_HTML_FILE);
    await doubleClickSourceTreeItem(SERVICE_WORKER_ROW_SELECTOR);
  });

  // Flaky test
  it.skip(
      '[crbug.com/1172924]Clicking on Network requests for service worker should open Network panel in drawer and closing should move it back',
      async () => {
        await step('Click on network requests for service worker should open network panel in drawer', async () => {
          await click(SERVICE_WORKER_NETWORK_SELECTOR);
          const networkTabInDrawer = await checkIfTabExistsInDrawer(NETWORK_TAB_SELECTOR);
          assert.isTrue(networkTabInDrawer);
        });

        await step('Close drawer and network tab should move back to main panel', async () => {
          await closeDrawer();
          await tabExistsInMainPanel(NETWORK_TAB_SELECTOR);
        });
      });
});

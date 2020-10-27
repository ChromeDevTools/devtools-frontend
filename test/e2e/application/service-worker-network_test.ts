// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, step, waitFor} from '../../shared/helper.js';
import {beforeEach, describe, it} from '../../shared/mocha-extensions.js';
import {doubleClickSourceTreeItem, navigateToApplicationTab} from '../helpers/application-helpers.js';
import {checkIfTabExistsInDrawer, checkIfTabExistsInMainPanel, moveTabToDrawer} from '../helpers/cross-tool-helper.js';
import {getAllRequestNames, getSelectedRequestName} from '../helpers/network-helpers.js';
import {closeDrawer} from '../helpers/quick_open-helpers.js';

const NETWORK_TAB_SELECTOR = '#tab-network';
const RESOURCES_TAB_SELECTOR = '#tab-resources';
const SERVICE_WORKER_ROW_SELECTOR = '[aria-label="Service Workers"]';
const TEST_HTML_FILE = 'service-worker-network';
const SERVICE_WORKER_NETWORK_SELECTOR = '[aria-label="Network requests"]';

describe('The Application Tab', async () => {
  beforeEach(async () => {
    const {target} = getBrowserAndPages();
    await navigateToApplicationTab(target, TEST_HTML_FILE);
    await doubleClickSourceTreeItem(SERVICE_WORKER_ROW_SELECTOR);
  });

  it('Clicking on Network requests for service worker should open Network panel in drawer and closing should move it back',
     async () => {
       await step('Click on network requests for service worker should open network panel in drawer', async () => {
         const {target} = getBrowserAndPages();
         await target.reload({waitUntil: 'domcontentloaded'});
         await click(SERVICE_WORKER_NETWORK_SELECTOR);
         const networkTabInDrawer = await checkIfTabExistsInDrawer(NETWORK_TAB_SELECTOR);
         assert.isTrue(networkTabInDrawer);
       });

       await step('Check if network panel contains intercepted requests', async () => {
         const requests = await getAllRequestNames();
         const selectedRequest = await getSelectedRequestName();
         assert.lengthOf(requests, 1);
         assert.strictEqual(selectedRequest, 'main.css');
       });

       await step('Close drawer and network tab should move back to main panel', async () => {
         await closeDrawer();
         const networkTabInMainPanel = await checkIfTabExistsInMainPanel(NETWORK_TAB_SELECTOR);
         assert.isTrue(networkTabInMainPanel);
       });

       await step('Check if network panel contains all requests', async () => {
         await click(NETWORK_TAB_SELECTOR);
         const requests = await getAllRequestNames();
         assert.lengthOf(requests, 3);
       });
     });

  it('If network panel is already in drawer, it should not be moved back after closing the drawer', async () => {
    await step('Move network panel to bottom', async () => {
      await moveTabToDrawer(NETWORK_TAB_SELECTOR);
      const networkTabInDrawer = await checkIfTabExistsInDrawer(NETWORK_TAB_SELECTOR);
      assert.isTrue(networkTabInDrawer);
    });

    await step('Click on network requests button should show network panel in drawer', async () => {
      const serviceWorkerNetworkRequests = await waitFor(SERVICE_WORKER_NETWORK_SELECTOR);
      await click(serviceWorkerNetworkRequests);
      const networkTabInDrawer = await checkIfTabExistsInDrawer(NETWORK_TAB_SELECTOR);
      assert.isTrue(networkTabInDrawer);
    });

    await step('Close drawer and network tab should not be in main panel', async () => {
      await closeDrawer();
      const tabDoesNotExist = await checkIfTabExistsInMainPanel(NETWORK_TAB_SELECTOR);
      assert.isFalse(tabDoesNotExist);
    });
  });

  it('If application tab in drawer, then show network in main panel', async () => {
    await step('Move resources panel to bottom', async () => {
      await moveTabToDrawer(RESOURCES_TAB_SELECTOR);
      const resourcesTabInDrawer = await checkIfTabExistsInDrawer(RESOURCES_TAB_SELECTOR);
      assert.isTrue(resourcesTabInDrawer);
    });

    await step('Click on network requests button show show network in main panel', async () => {
      await doubleClickSourceTreeItem(SERVICE_WORKER_ROW_SELECTOR);
      await waitFor(SERVICE_WORKER_NETWORK_SELECTOR);
      await click(SERVICE_WORKER_NETWORK_SELECTOR);
      const networkTabInMainPanel = await checkIfTabExistsInMainPanel(NETWORK_TAB_SELECTOR);
      assert.isTrue(networkTabInMainPanel);
    });
  });
});

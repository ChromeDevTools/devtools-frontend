// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {
  navigateToApplicationTab,
  navigateToServiceWorkers,
  unregisterServiceWorker,
} from '../../e2e/helpers/application-helpers.js';
import {tabExistsInMainPanel} from '../../e2e/helpers/cross-tool-helper.js';

const NETWORK_TAB_SELECTOR = '#tab-network';
const TEST_HTML_FILE = 'service-worker-network';
const SERVICE_WORKER_NETWORK_SELECTOR = '[title="Network requests"]';

describe('The Application Tab', () => {
  // TODO (liviurau): Update navigateToApplicationTab helper to work in docked
  // mode and remove the setup below.
  setup({dockingMode: 'undocked'});

  it('Clicking on Network requests for service worker should open Network panel',
     async ({devToolsPage, inspectedPage}) => {
       await navigateToApplicationTab(TEST_HTML_FILE, devToolsPage, inspectedPage);
       await navigateToServiceWorkers(devToolsPage);
       await devToolsPage.click(SERVICE_WORKER_NETWORK_SELECTOR);
       await tabExistsInMainPanel(NETWORK_TAB_SELECTOR, devToolsPage);

       await unregisterServiceWorker(devToolsPage);
     });
});

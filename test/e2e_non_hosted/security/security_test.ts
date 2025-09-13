// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {
  closeSecurityTab,
  navigateToSecurityTab,
  openSecurityPanelFromCommandMenu,
  openSecurityPanelFromMoreTools,
  securityTabDoesNotExist,
  securityTabExists,
} from '../../e2e/helpers/security-helpers.js';

describe('The Security Panel', function() {
  setup({dockingMode: 'bottom'});
  it('is open by default when devtools initializes', async ({devToolsPage}) => {
    await navigateToSecurityTab(true, devToolsPage);
  });

  it('closes without crashing and stays closed after reloading tools', async ({devToolsPage}) => {
    await closeSecurityTab(devToolsPage);
    await devToolsPage.reload();
    await securityTabDoesNotExist(devToolsPage);
  });

  it('appears under More tools after being closed', async ({devToolsPage}) => {
    await closeSecurityTab(devToolsPage);
    await openSecurityPanelFromMoreTools(true, devToolsPage);
    await devToolsPage.reload();
    await securityTabExists(devToolsPage);
  });

  it('can be opened from command menu after being closed', async ({devToolsPage}) => {
    await closeSecurityTab(devToolsPage);
    await openSecurityPanelFromCommandMenu(devToolsPage);
  });

  it('shows blocked resources in the sidebar', async ({devToolsPage, inspectedPage}) => {
    await navigateToSecurityTab(true, devToolsPage);
    await inspectedPage.goToResourceWithCustomHost('devtools.test', 'security/mixed-content.html');
    const nonSecureOrigins = await devToolsPage.waitForAria('Non-secure origins');
    await devToolsPage.waitForElementWithTextContent('http://devtools.test', nonSecureOrigins);
  });
});

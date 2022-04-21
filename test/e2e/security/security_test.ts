// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {reloadDevTools} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {closeSecurityTab, navigateToSecurityTab, openSecurityPanelFromCommandMenu, openSecurityPanelFromMoreTools, securityPanelContentIsLoaded, securityTabDoesNotExist, securityTabExists} from '../helpers/security-helpers.js';

describe('The Security Panel', async () => {
  it('is open by default when devtools initializes', async () => {
    await navigateToSecurityTab();
  });

  it('closes without crashing and stays closed after reloading tools', async () => {
    await closeSecurityTab();
    await reloadDevTools();
    await securityTabDoesNotExist();
  });

  it('appears under More tools after being closed', async () => {
    await closeSecurityTab();
    await openSecurityPanelFromMoreTools();
    await reloadDevTools({selectedPanel: {name: 'security'}});
    await securityTabExists();
  });

  it('can be opened from command menu after being closed', async () => {
    await closeSecurityTab();
    await openSecurityPanelFromCommandMenu();
  });

  it('opens if the query param "panel" is set', async () => {
    await closeSecurityTab();
    await reloadDevTools({queryParams: {panel: 'security'}});
    await securityTabExists();
    await securityPanelContentIsLoaded();
  });
});

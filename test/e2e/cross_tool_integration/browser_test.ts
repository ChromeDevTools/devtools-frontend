// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {closeAllCloseableTabs, getBrowserAndPages, goToResource, timeout} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {getCurrentConsoleMessages} from '../helpers/console-helpers.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

describe('Browser', async () => {
  it('can reload a website after all closeable tools are closed', async () => {
    // Navigate to website
    const {target} = getBrowserAndPages();
    await goToResource('cross_tool/default.html');

    // Open a few closeable panels
    await openPanelViaMoreTools('Animations');
    // FIXME(crbug/1112692): Refactor test to remove the timeout.
    await timeout(100);
    await openPanelViaMoreTools('Rendering');

    const messages = await getCurrentConsoleMessages();
    await closeAllCloseableTabs();
    await target.reload();

    // Website logs the Date, so it shouldn't be the same
    const newMessages = await getCurrentConsoleMessages();

    assert.notDeepEqual(messages, newMessages);
  });

  it('can navigate to a new website after all closeable tools are closed', async () => {
    // Navigate to website
    const targetUrl = 'cross_tool/default.html';
    const secondTargetUrl = 'cross_tool/site_with_errors.html';
    await goToResource(targetUrl);

    // Open a few closeable panels
    await openPanelViaMoreTools('Animations');
    // FIXME(crbug/1112692): Refactor test to remove the timeout.
    await timeout(100);
    await openPanelViaMoreTools('Rendering');

    await closeAllCloseableTabs();
    // Navigate to a different website
    await goToResource(secondTargetUrl);
  });
});

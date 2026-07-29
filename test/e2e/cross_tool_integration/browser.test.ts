// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getCurrentConsoleMessages} from '../helpers/console-helpers.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

describe('Browser', () => {
  it('can reload a website after all closeable tools are closed', async ({devToolsPage, inspectedPage}) => {
    // Navigate to website
    await inspectedPage.goToResource('cross_tool/default.html');

    // Open a few closeable panels
    await openPanelViaMoreTools(devToolsPage, 'Animations');
    await openPanelViaMoreTools(devToolsPage, 'Rendering');

    const messages = await getCurrentConsoleMessages(devToolsPage, false, undefined, undefined);
    await devToolsPage.closeAllCloseableTabs();
    await inspectedPage.reload();

    // Website logs the Date, so it shouldn't be the same
    const newMessages = await getCurrentConsoleMessages(devToolsPage, false, undefined, undefined);

    assert.notDeepEqual(messages, newMessages);
  });

  it('can navigate to a new website after all closeable tools are closed', async ({devToolsPage, inspectedPage}) => {
    // Navigate to website
    const targetUrl = 'cross_tool/default.html';
    const secondTargetUrl = 'cross_tool/site_with_errors.html';
    await inspectedPage.goToResource(targetUrl);

    // Open a few closeable panels
    await openPanelViaMoreTools(devToolsPage, 'Animations');
    await openPanelViaMoreTools(devToolsPage, 'Rendering');

    await devToolsPage.closeAllCloseableTabs();
    // Navigate to a different website
    await inspectedPage.goToResource(secondTargetUrl);
  });
});

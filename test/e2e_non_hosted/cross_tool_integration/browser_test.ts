// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getCurrentConsoleMessages} from '../../e2e/helpers/console-helpers.js';
import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers.js';

describe('Browser', () => {
  it('can reload a website after all closeable tools are closed', async ({devToolsPage, inspectedPage}) => {
    // Navigate to website
    await inspectedPage.goToResource('cross_tool/default.html');

    // Open a few closeable panels
    await openPanelViaMoreTools('Animations', devToolsPage);
    await openPanelViaMoreTools('Rendering', devToolsPage);

    const messages = await getCurrentConsoleMessages(false, undefined, undefined, devToolsPage);
    await devToolsPage.closeAllCloseableTabs();
    await inspectedPage.reload();

    // Website logs the Date, so it shouldn't be the same
    const newMessages = await getCurrentConsoleMessages(false, undefined, undefined, devToolsPage);

    assert.notDeepEqual(messages, newMessages);
  });

  it('can navigate to a new website after all closeable tools are closed', async ({devToolsPage, inspectedPage}) => {
    // Navigate to website
    const targetUrl = 'cross_tool/default.html';
    const secondTargetUrl = 'cross_tool/site_with_errors.html';
    await inspectedPage.goToResource(targetUrl);

    // Open a few closeable panels
    await openPanelViaMoreTools('Animations', devToolsPage);
    await openPanelViaMoreTools('Rendering', devToolsPage);

    await devToolsPage.closeAllCloseableTabs();
    // Navigate to a different website
    await inspectedPage.goToResource(secondTargetUrl);
  });
});

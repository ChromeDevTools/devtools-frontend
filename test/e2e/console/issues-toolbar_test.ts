// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, goToResource, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {navigateToConsoleTab} from '../helpers/console-helpers.js';

describe('The Console Tab', async () => {
  it('shows infobar with button linking to issues tab', async () => {
    // Navigate to page which causes a SameSiteCookieIssue.
    await goToResource('console/cookie-issue.html');
    await navigateToConsoleTab();

    const infobarButton = await waitFor('.infobar .infobar-button');
    const infobarButtonText = await infobarButton.evaluate(node => node.textContent);
    assert.strictEqual(infobarButtonText, 'View issues');
  });

  it('issues bar has a context menu', async () => {
    // Navigate to page which causes a SameSiteCookieIssue.
    await goToResource('console/cookie-issue.html');
    await navigateToConsoleTab();

    // Find the infobar and right-click it.
    const selectedNode = await waitFor('.infobar-issue');
    await click(selectedNode, {clickOptions: {button: 'right'}});

    // Wait for the context menu and compare its content.
    const contextMenu = await waitFor('.soft-context-menu');
    const actual = await contextMenu.evaluate(e => e.textContent);
    assert.include(actual, 'Clear console history');
    assert.include(actual, 'Save as...');
  });
});

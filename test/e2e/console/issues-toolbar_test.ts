// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {goToResource, waitFor} from '../../shared/helper.js';
import {navigateToConsoleTab} from '../helpers/console-helpers.js';

describe('The Console Tab', async () => {
  it('shows infobar with button linking to issues tab', async () => {
    // navigate to page which causes a SameSiteCookieIssue
    await goToResource('console/cookie-issue.html');
    await navigateToConsoleTab();

    const infobarButton = await waitFor('.infobar .infobar-button');
    const infobarButtonText = await infobarButton.evaluate(node => node.textContent);
    assert.strictEqual(infobarButtonText, 'Go to Issues');
  });
});

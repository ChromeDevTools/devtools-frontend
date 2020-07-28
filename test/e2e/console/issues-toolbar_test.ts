// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {$, click, goToResource, waitFor} from '../../shared/helper.js';

describe('The Console Tab', async () => {
  // Disabled due to flakiness (see crbug.com/1110351)
  it.skip('[crbug.com/1110351] shows infobar with button linking to issues tab', async () => {
    // navigate to page which causes a SameSiteCookieIssue
    await goToResource('console/cookie-issue.html');
    await click('#tab-console');
    await waitFor('.infobar .infobar-button');

    const infobarButton = await $('.infobar .infobar-button');
    const infobarButtonText = await infobarButton.evaluate(node => node.textContent);
    assert.strictEqual(infobarButtonText, 'Go to Issues');
  });
});

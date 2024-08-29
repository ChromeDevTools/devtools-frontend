// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, goToResource, waitFor, waitForFunction} from '../../shared/helper.js';

import {navigateToConsoleTab} from '../helpers/console-helpers.js';

describe('Issue links in the console tab', () => {
  it('should reveal the right issue', async () => {
    await navigateToConsoleTab();
    await goToResource('issues/cors-issue-2.html');
    const issueLinkIcon = await waitFor('devtools-issue-link-icon');
    const button = await waitFor('button', issueLinkIcon);
    // There are several TypeErrors in the console, we don't care which one we get.
    const issueTitleFromLink = await waitForFunction(async () => {
      const title = await button.evaluate(el => (el as HTMLElement).title);
      const titleStart = 'Click to open the issue tab and show issue: ';
      if (title.startsWith(titleStart)) {
        return title.substr(titleStart.length);
      }
      return undefined;
    });
    await click('button', {root: issueLinkIcon});
    const selectedIssueTitleElement = await waitFor('li.issue.expanded.selected');
    const selectedIssueTitle = await selectedIssueTitleElement.evaluate(el => el.textContent);
    // The '1' is the number of issues aggregated.
    assert.strictEqual(selectedIssueTitle, `1${issueTitleFromLink}`);
  });
});

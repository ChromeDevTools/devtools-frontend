// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../conductor/mocha-interface.js';
import {
  navigateToConsoleTab,
} from '../helpers/console-helpers.js';

describe('Issue links in the console tab', () => {
  it('should reveal the right issue', async ({devToolsPage, inspectedPage}) => {
    await navigateToConsoleTab(devToolsPage);
    await inspectedPage.goToResource('issues/cors-issue-2.html');
    // There are several TypeErrors in the console, we don't care which one we get.
    const result = await devToolsPage.waitForFunction(async () => {
      const icons = await devToolsPage.$$('devtools-issue-link-icon');
      for (const icon of icons) {
        const button = await devToolsPage.$('button', icon);
        if (button) {
          const title = await button.evaluate(el => (el as HTMLElement).title);
          const titleStart = 'Click to open the Issues tab and show issue: ';
          if (title.startsWith(titleStart)) {
            return {
              issueTitleFromLink: title.substr(titleStart.length),
              issueLinkIcon: icon,
            };
          }
        }
      }
      return undefined;
    });
    await devToolsPage.click('button', {root: result.issueLinkIcon});
    const selectedIssueTitleElement = await devToolsPage.waitFor('li.issue.expanded.selected');
    const selectedIssueTitle = await selectedIssueTitleElement.evaluate(el => el.textContent);
    // The '1' is the number of issues aggregated.
    assert.strictEqual(selectedIssueTitle, `1${result.issueTitleFromLink}`);
  });
});

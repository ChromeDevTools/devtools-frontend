// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  CONSOLE_MESSAGE_TEXT_AND_ANCHOR_SELECTOR,
  deleteConsoleMessagesFilter,
  filterConsoleMessages,
  navigateToConsoleTab,
  showVerboseMessages,
  waitForConsoleMessagesToBeNonEmpty
} from '../../e2e/helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('shows messages from all levels', async ({devToolsPage, inspectedPage}) => {
    await Promise.all([
      inspectedPage.goToResource('console/console-filter.html'),
      navigateToConsoleTab(devToolsPage),
    ]);

    await showVerboseMessages(devToolsPage);
    await waitForConsoleMessagesToBeNonEmpty(19, devToolsPage);

    const actualMessages = await devToolsPage.evaluate(
        selector => Array.from(document.querySelectorAll(selector)).map(e => e.textContent ?? ''),
        CONSOLE_MESSAGE_TEXT_AND_ANCHOR_SELECTOR);

    assert.deepEqual(actualMessages, [
      'console-filter.html:10 1topGroup: log1()',
      'log-source.js:6 2topGroup: log2()',
      'console-filter.html:10 3topGroup: log1()',
      'console-filter.html:17 enterGroup outerGroup',
      'console-filter.html:10 1outerGroup: log1()',
      'log-source.js:6 2outerGroup: log2()',
      'console-filter.html:21 enterGroup innerGroup1',
      'console-filter.html:10 1innerGroup1: log1()',
      'log-source.js:6 2innerGroup1: log2()',
      'console-filter.html:26 enterGroup innerGroup2',
      'console-filter.html:10 1innerGroup2: log1()',
      'log-source.js:6 2innerGroup2: log2()',
      'console-filter.html:33 enterCollapsedGroup collapsedGroup',
      'console-filter.html:10 4topGroup: log1()',
      'log-source.js:6 5topGroup: log2()',
      'console-filter.html:42 Hello 1',
      'console-filter.html:43 Hello 2',
      'console-filter.html:45 verbose debug message',
      'console-filter.html:46 end',
    ]);
  });

  it('resets the filter', async ({devToolsPage, inspectedPage}) => {
    await Promise.all([
      inspectedPage.goToResource('console/console-filter.html'),
      navigateToConsoleTab(devToolsPage),
      waitForConsoleMessagesToBeNonEmpty(18, devToolsPage),
    ]);

    await filterConsoleMessages('outer', devToolsPage);
    await waitForConsoleMessagesToBeNonEmpty(3, devToolsPage);

    await deleteConsoleMessagesFilter(devToolsPage);
    await waitForConsoleMessagesToBeNonEmpty(18, devToolsPage);
  });
});

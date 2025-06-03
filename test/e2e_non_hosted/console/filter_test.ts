// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  deleteConsoleMessagesFilter,
  filterConsoleMessages,
  navigateToConsoleTab,
  waitForConsoleMessagesToBeNonEmpty
} from '../../e2e/helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('resets the filter', async ({devToolsPage, inspectedPage}) => {
    await Promise.all([
      inspectedPage.goToResource('console/console-filter.html'),
      navigateToConsoleTab(devToolsPage),
      waitForConsoleMessagesToBeNonEmpty(17, devToolsPage),
    ]);

    await filterConsoleMessages('outer', devToolsPage);
    await waitForConsoleMessagesToBeNonEmpty(2, devToolsPage);

    await deleteConsoleMessagesFilter(devToolsPage);
    await waitForConsoleMessagesToBeNonEmpty(17, devToolsPage);
  });
});

// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getCurrentConsoleMessages, Level, navigateToConsoleTab} from '../../e2e/helpers/console-helpers.js';

describe('console', () => {
  // Migrated devtools_browsertest.
  it('shows DOM warnings', async ({devToolsPage, inspectedPage}) => {
    await Promise.all([
      inspectedPage.goToResource('console/dom-warnings.html'),
      navigateToConsoleTab(devToolsPage),
    ]);

    const messages = await getCurrentConsoleMessages(/* withAnchor */ false, Level.All, undefined, devToolsPage);

    assert.include(messages[0], '[DOM] Found 2 elements with non-unique id #dup');
  });
});

// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getConsoleMessages,
  navigateToConsoleTab,
} from '../../e2e/helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('Does not crash if it fails to convert alert() argument to string', async ({devToolsPage, inspectedPage}) => {
    await navigateToConsoleTab(devToolsPage);

    await inspectedPage.reload();

    const result =
        (await getConsoleMessages('alert-toString-exception', undefined, undefined, devToolsPage, inspectedPage))[0];
    assert.strictEqual(result, 'Uncaught Exception in toString().');
  });
});

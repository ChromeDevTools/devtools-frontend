// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openSoftContextMenuAndClickOnItem} from '../../e2e/helpers/context-menu-helpers.js';
import {
  getCallFrameNames,
  PAUSE_INDICATOR_SELECTOR,
} from '../../e2e/helpers/sources-helpers.js';

describe('Sources Tab', () => {
  it('can restart a call stack frame', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('sources/restart-frame.html');

    void inspectedPage.evaluate('foo();');
    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);

    const callFrameNames = await getCallFrameNames(devToolsPage);
    assert.deepEqual(callFrameNames.slice(0, 3), ['baz', 'bar', 'foo']);

    await openSoftContextMenuAndClickOnItem(
        '.call-frame-item[aria-posinset="2"]', 'Restart frame', devToolsPage);  // Aria indices are 1-based.

    await devToolsPage.waitForFunction(async () => {
      const callFrameNames = await getCallFrameNames(devToolsPage);
      return callFrameNames[0] === 'bar' && callFrameNames[1] === 'foo';
    });
  });
});

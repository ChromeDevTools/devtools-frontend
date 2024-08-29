// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getBrowserAndPages,
  goToResource,
  step,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';

import {openSoftContextMenuAndClickOnItem} from '../helpers/context-menu-helpers.js';
import {
  getCallFrameNames,
  PAUSE_INDICATOR_SELECTOR,
} from '../helpers/sources-helpers.js';

describe('Sources Tab', () => {
  it('can restart a call stack frame', async () => {
    const {target} = getBrowserAndPages();
    await step('navigate to page', async () => {
      await goToResource('sources/restart-frame.html');
    });

    await step('wait for the page to stop on the "debugger" statement', async () => {
      target.evaluate('foo();');
      await waitFor(PAUSE_INDICATOR_SELECTOR);

      const callFrameNames = await getCallFrameNames();
      assert.deepStrictEqual(callFrameNames.slice(0, 3), ['baz', 'bar', 'foo']);
    });

    await step('restart frame "bar"', async () => {
      await openSoftContextMenuAndClickOnItem(
          '.call-frame-item[aria-posinset="2"]', 'Restart frame');  // Aria indices are 1-based.
    });

    await step('wait for the page to stop in "bar"', async () => {
      await waitForFunction(async () => {
        const callFrameNames = await getCallFrameNames();
        return callFrameNames[0] === 'bar' && callFrameNames[1] === 'foo';
      });
    });
  });
});

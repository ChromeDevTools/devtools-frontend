// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {clearPermissionsOverride, getBrowserAndPages, goToResource, overridePermissions, selectOption, step, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

describe('Idle Emulation on Sensors panel', () => {
  beforeEach(async () => {
    await step('opening sensors panel', async () => {
      await openPanelViaMoreTools('Sensors');
    });
  });

  before(async () => {
    await step('overriding permissions with \'idle-detection\'', async () => {
      // IdleDetector switched permission from 'notifications' to
      // 'idle-detection', but 'idle-detection' is not in the @types/puppeteer
      // package, so `as 'notifications'` needed for TypeScript.
      await overridePermissions(['idle-detection' as 'notifications']);
    });
  });

  after(async () => {
    await step('clearing permissions override', async () => {
      await clearPermissionsOverride();
    });
  });

  async function getState() {
    const {target} = getBrowserAndPages();
    return await target.evaluate(() => {
      const state = document.getElementById('state');
      return state ? state.innerText : '';
    });
  }

  async function waitForState(state: string) {
    const {target} = getBrowserAndPages();
    await step(`Waiting for state \'${state}\'`, async () => {
      await target.waitForFunction(_state => {
        const stateEl = document.getElementById('state');
        return _state === (stateEl ? stateEl.innerText : '');
      }, {}, state);
    });
  }

  it('includes UI for emulating an idle state', async () => {
    const select = await waitFor('.idle-section select');
    const actual = await select.evaluate(node => node.textContent);

    const expected = [
      'No idle emulation',
      'User active, screen unlocked',
      'User active, screen locked',
      'User idle, screen unlocked',
      'User idle, screen locked',
    ].join('');
    assert.deepEqual(actual, expected);
  });

  it('changing idle state emulation causes change of the IdleDetector state', async () => {
    await step('opening idle-detector.html', async () => {
      await goToResource('sensors/idle-detector.html');
    });

    const select = await waitFor('.idle-section select');

    // InitialState can be idle as well.
    const initialState = await getState();

    // Emulate Idle states and verify IdleDetector updates state accordingly.
    await selectOption(select, '{"isUserActive":false,"isScreenUnlocked":false}');
    await waitForState('Idle state: idle, locked.');

    await selectOption(select, '{"isUserActive":true,"isScreenUnlocked":false}');
    await waitForState('Idle state: active, locked.');

    await selectOption(select, '{"isUserActive":true,"isScreenUnlocked":true}');
    await waitForState('Idle state: active, unlocked.');

    await selectOption(select, '{"isUserActive":false,"isScreenUnlocked":true}');
    await waitForState('Idle state: idle, unlocked.');

    // Remove Idle emulation and verify IdleDetector is in initial state.
    await selectOption(select, 'none');
    await waitForState(initialState);
  });
});

// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers.js';
import {
  overridePermissions,
  selectOption,
  step,
} from '../../shared/helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

describe('Idle Emulation on Sensors panel', () => {
  async function getState(inspectedPage: InspectedPage) {
    return await inspectedPage.evaluate(() => {
      const state = document.getElementById('state');
      return state ? state.innerText : '';
    });
  }

  async function waitForState(state: string, inspectedPage: InspectedPage) {
    await step(`Waiting for state \'${state}\'`, async () => {
      await inspectedPage.page.waitForFunction((_state: string) => {
        const stateEl = document.getElementById('state');
        return _state === (stateEl ? stateEl.innerText : '');
      }, {}, state);
    });
  }

  it('includes UI for emulating an idle state', async ({devToolsPage, inspectedPage}) => {
    await overridePermissions(['idle-detection'], inspectedPage);
    await openPanelViaMoreTools('Sensors', devToolsPage);
    const select = await devToolsPage.waitFor('.idle-section select');
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

  it('changing idle state emulation causes change of the IdleDetector state', async ({devToolsPage, inspectedPage}) => {
    await overridePermissions(['idle-detection'], inspectedPage);
    await openPanelViaMoreTools('Sensors', devToolsPage);
    await step('opening idle-detector.html', async () => {
      await inspectedPage.goToResource('sensors/idle-detector.html');
    });

    const select = await (await devToolsPage.waitFor('.idle-section select')).toElement('select');

    // InitialState can be idle as well.
    const initialState = await getState(inspectedPage);

    // Emulate Idle states and verify IdleDetector updates state accordingly.
    await selectOption(select, '{"isUserActive":false,"isScreenUnlocked":false}');
    await waitForState('Idle state: idle, locked.', inspectedPage);

    await selectOption(select, '{"isUserActive":true,"isScreenUnlocked":false}');
    await waitForState('Idle state: active, locked.', inspectedPage);

    await selectOption(select, '{"isUserActive":true,"isScreenUnlocked":true}');
    await waitForState('Idle state: active, unlocked.', inspectedPage);

    await selectOption(select, '{"isUserActive":false,"isScreenUnlocked":true}');
    await waitForState('Idle state: idle, unlocked.', inspectedPage);

    // Remove Idle emulation and verify IdleDetector is in initial state.
    await selectOption(select, 'none');
    await waitForState(initialState, inspectedPage);
  });
});

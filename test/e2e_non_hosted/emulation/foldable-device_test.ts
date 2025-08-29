// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {
  clickDevicePosture,
  getDevicePostureDropDown,
  getWidthOfDevice,
  openDeviceToolbar,
  selectFoldableDevice,
  selectNonDualScreenDevice,
} from '../../e2e/helpers/emulation-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const ZENBOOK_VERTICAL_SPANNED_WIDTH = '1706';
const ZENBOOK_VERTICAL_WIDTH = '853';

// The test needs to be adapted from a browser test to an e2e test.
// The main difference is that we need to pass the devToolsPage and inspectedPage
// instances to the helper functions.
// The browser test used a beforeEach hook to setup the page, this is now
// a helper function that is called at the beginning of each test.
async function setup(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
  await inspectedPage.goToResource('emulation/dual-screen-inspector.html');
  await devToolsPage.waitFor('.tabbed-pane-left-toolbar');
  await openDeviceToolbar(devToolsPage, inspectedPage);
}

describe('Test the Device Posture API support', () => {
  it('User can change the posture of a foldable device', async ({devToolsPage, inspectedPage}) => {
    await setup(devToolsPage, inspectedPage);
    await selectFoldableDevice(devToolsPage);
    let widthSingle = await getWidthOfDevice(devToolsPage);
    assert.strictEqual(widthSingle, ZENBOOK_VERTICAL_WIDTH);

    await clickDevicePosture('Folded', devToolsPage);
    const widthDual = await getWidthOfDevice(devToolsPage);
    assert.strictEqual(widthDual, ZENBOOK_VERTICAL_SPANNED_WIDTH);

    await clickDevicePosture('Continuous', devToolsPage);
    widthSingle = await getWidthOfDevice(devToolsPage);
    assert.strictEqual(widthSingle, ZENBOOK_VERTICAL_WIDTH);
  });

  it('User may not change the posture for a non-foldable screen device', async ({devToolsPage, inspectedPage}) => {
    await setup(devToolsPage, inspectedPage);
    await selectNonDualScreenDevice(devToolsPage);
    // posture dropdown should not be found
    const dropdown = await getDevicePostureDropDown(devToolsPage);
    const hidden = dropdown ? await dropdown.evaluate(x => (x as Element).classList.contains('hidden')) : true;
    assert.isTrue(hidden);
  });
});

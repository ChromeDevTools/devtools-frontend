// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {
  clickWidthInput,
  clickZoomDropDown,
  getZoom,
  openDeviceToolbar,
  toggleAutoAdjustZoom,
  waitForZoomDropDownNotExpanded,
} from '../../e2e/helpers/emulation-helpers.js';

describe('Custom devices', () => {
  it('can preserve zoom', async ({devToolsPage, inspectedPage}) => {
    await openDeviceToolbar(devToolsPage, inspectedPage);

    await clickZoomDropDown(devToolsPage);
    await devToolsPage.page.keyboard.press('ArrowDown');
    await devToolsPage.page.keyboard.press('Enter');
    await waitForZoomDropDownNotExpanded(devToolsPage);
    assert.strictEqual(await getZoom(devToolsPage), '50%');

    await clickWidthInput(devToolsPage);
    await devToolsPage.page.keyboard.press('ArrowDown');
    assert.strictEqual(await getZoom(devToolsPage), '100%');

    await clickZoomDropDown(devToolsPage);
    await devToolsPage.page.keyboard.press('ArrowDown');
    await devToolsPage.page.keyboard.press('Enter');
    await waitForZoomDropDownNotExpanded(devToolsPage);
    assert.strictEqual(await getZoom(devToolsPage), '50%');

    await toggleAutoAdjustZoom(devToolsPage);

    await clickWidthInput(devToolsPage);
    await devToolsPage.page.keyboard.press('ArrowDown');
    assert.strictEqual(await getZoom(devToolsPage), '50%');
  });
});

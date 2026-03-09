// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';

import {
  clickWidthInput,
  getZoom,
  openDeviceToolbar,
  selectZoomLevel,
  toggleAutoAdjustZoom,
} from '../helpers/emulation-helpers.js';

describe('Custom devices', () => {
  it('can preserve zoom', async ({devToolsPage, inspectedPage}) => {
    await openDeviceToolbar(devToolsPage, inspectedPage);

    await selectZoomLevel(devToolsPage, '50%');
    assert.strictEqual(await getZoom(devToolsPage), '50%');

    await clickWidthInput(devToolsPage);
    await devToolsPage.page.keyboard.press('ArrowDown');
    assert.strictEqual(await getZoom(devToolsPage), '100%');

    await selectZoomLevel(devToolsPage, '50%');
    assert.strictEqual(await getZoom(devToolsPage), '50%');

    await toggleAutoAdjustZoom(devToolsPage);

    await clickWidthInput(devToolsPage);
    await devToolsPage.page.keyboard.press('ArrowDown');
    assert.strictEqual(await getZoom(devToolsPage), '50%');
  });
});

// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getBrowserAndPages,
} from '../../shared/helper.js';

describe('Drawer', () => {
  it('orientation can be toggled between horizontal and vertical', async () => {
    const {frontend} = getBrowserAndPages();

    // To show the drawer
    await frontend.keyboard.press('Escape');

    let drawerElement = await frontend.$('.drawer-tabbed-pane');
    let drawerBox = await drawerElement?.boundingBox();
    let originalWidth = 0;
    let originalHeight = 0;
    if (drawerBox) {
      originalWidth = drawerBox.width;
      originalHeight = drawerBox.height;
    } else {
      assert.fail();
    }

    // Toggle drawer to vertical
    await frontend.keyboard.down('Shift');
    await frontend.keyboard.press('Escape');
    await frontend.keyboard.up('Shift');

    drawerElement = await frontend.$('.drawer-tabbed-pane');
    drawerBox = await drawerElement?.boundingBox();
    if (drawerBox) {
      assert.isTrue(drawerBox.width < originalWidth);
      assert.isTrue(drawerBox.height > originalHeight);
    } else {
      assert.fail();
    }

    // Toggle drawer back to horizontal
    await frontend.keyboard.down('Shift');
    await frontend.keyboard.press('Escape');
    await frontend.keyboard.up('Shift');

    drawerElement = await frontend.$('.drawer-tabbed-pane');
    drawerBox = await drawerElement?.boundingBox();
    if (drawerBox) {
      assert.strictEqual(drawerBox.width, originalWidth);
      assert.strictEqual(drawerBox.height, originalHeight);
    } else {
      assert.fail();
    }
  });
});

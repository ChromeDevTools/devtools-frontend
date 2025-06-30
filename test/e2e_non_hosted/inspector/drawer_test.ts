// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

describe('Drawer', () => {
  setup({enabledDevToolsExperiments: ['vertical-drawer']});

  it('orientation can be toggled between horizontal and vertical', async ({devToolsPage}) => {
    // To show the drawer
    await devToolsPage.pressKey('Escape');

    let drawerElement = await devToolsPage.waitFor('.drawer-tabbed-pane');
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
    await devToolsPage.pressKey('Escape', {shift: true});

    drawerElement = await devToolsPage.waitFor('.drawer-tabbed-pane');
    drawerBox = await drawerElement?.boundingBox();
    if (drawerBox) {
      assert.isTrue(drawerBox.width < originalWidth);
      assert.isTrue(drawerBox.height > originalHeight);
    } else {
      assert.fail();
    }

    // Toggle drawer back to horizontal
    await devToolsPage.pressKey('Escape', {shift: true});

    drawerElement = await devToolsPage.waitFor('.drawer-tabbed-pane');
    drawerBox = await drawerElement?.boundingBox();
    if (drawerBox) {
      assert.strictEqual(drawerBox.width, originalWidth);
      assert.strictEqual(drawerBox.height, originalHeight);
    } else {
      assert.fail();
    }
  });
});

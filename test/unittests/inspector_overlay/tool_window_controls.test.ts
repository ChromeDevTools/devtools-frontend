// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {
  WindowControlsOverlay,
} from '../../../inspector_overlay/tool_window_controls.js';

describe('WindowControlsOverlay', () => {
  const windowControlsOverlay = new WindowControlsOverlay(window, []);
  const document = windowControlsOverlay.document;

  it('creates initially hidden toolbars', () => {
    const verifyOverlayToolBar = (osType: string, location: string) => {
      const elementCollection = document.getElementsByClassName(`${osType}-${location}-image-group`);
      assert.strictEqual(elementCollection.length, 1, `Expect ${osType} ${location} toolbar to be present`);

      const element = elementCollection[0];
      assert.isTrue(element.classList.contains('hidden'), 'Expect the element to be hidden');
      assert.isTrue(element.classList.contains('image-group'), 'Expect the element to have the "image-group" class');
      assert.isTrue(
          element.classList.contains(`image-group-${location}`), 'Expect the element to have the "image-group" class');
    };

    windowControlsOverlay.install();

    verifyOverlayToolBar('windows', 'right');
    verifyOverlayToolBar('linux', 'right');
    verifyOverlayToolBar('mac', 'right');
    verifyOverlayToolBar('mac', 'left');
  });

  it('shows mac toolbar', () => {
    const config = {selectedPlatform: 'Mac', themeColor: 'green'};

    windowControlsOverlay.drawWindowControlsOverlay(config);

    const macToolbarRight = document.getElementsByClassName('mac-right-image-group')[0];
    const macToolbarLeft = document.getElementsByClassName('mac-left-image-group')[0];

    assert.isFalse(macToolbarRight.classList.contains('hidden'), 'Expect the right mac toolbar to be shown');
    assert.isFalse(macToolbarLeft.classList.contains('hidden'), 'Expect the left mac toolbar to be shown');
  });

  it('show windows toolbar', () => {
    const config = {selectedPlatform: 'Windows', themeColor: 'green'};

    windowControlsOverlay.drawWindowControlsOverlay(config);

    const windowsToolbar = document.getElementsByClassName('windows-right-image-group')[0];

    assert.isFalse(windowsToolbar.classList.contains('hidden'), 'Expect windows toolbar to be shown');
  });

  it('show linux toolbar', () => {
    const config = {selectedPlatform: 'Linux', themeColor: 'green'};

    windowControlsOverlay.drawWindowControlsOverlay(config);

    const linuxToolBar = document.getElementsByClassName('linux-right-image-group')[0];

    assert.isFalse(linuxToolBar.classList.contains('hidden'), 'Expect linux toolbar to be shown');
  });

  it('clears overlay', () => {
    const elementCollection = document.getElementsByClassName('image-group');

    assert.strictEqual(elementCollection.length, 4, 'Expect there to be 4 toolbars');

    windowControlsOverlay.clearOverlays();

    for (const element of elementCollection) {
      assert.isTrue(element.classList.contains('hidden'), 'Expect the toolbar overlay to be hidden');
    }
  });

  it('cleans up on uninstall', () => {
    windowControlsOverlay.uninstall();
    assert.strictEqual(document.body.innerHTML, '', 'Expect document body to be empty');
  });
});

// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, goToResource, raf} from '../../shared/helper.js';

import {
  getPlayerButtonText,
  getPlayerErrors,
  playMediaFile,
  waitForPlayerButtonTexts,
} from '../helpers/media-helpers.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

// These tests are causing emulation tests to fail
describe.skip('[crbug.com/1501768] Media Tab', () => {
  // Skip until flake is fixed
  it('ensures video playback adds entry', async () => {
    await openPanelViaMoreTools('Media');
    await playMediaFile('fisch.webm');
    const entryName = await getPlayerButtonText();
    assert.strictEqual(entryName.length, 11, `Unexpected name ${entryName}, expected length 11`);
  });

  // TODO: there is a dependency between tests here. The order of tests affects
  // results.
  it('ensures that errors are rendered nicely', async () => {
    const {target, frontend} = getBrowserAndPages();
    await frontend.bringToFront();
    await openPanelViaMoreTools('Media');
    await goToResource('media/corrupt.webm');
    await target.bringToFront();
    await target.evaluate(() => {
      const videoElement = document.getElementsByName('media')[0] as HTMLVideoElement;
      void videoElement.play();
    });
    await raf(target);
    await frontend.bringToFront();
    await raf(frontend);
    const errors = await getPlayerErrors(2);
    const errorContent = await errors[1].evaluate(el => el.textContent);
    assert.include(errorContent, 'PipelineStatus');
  });

  it('ensures video playback adds entry for web worker', async () => {
    const {frontend} = getBrowserAndPages();
    await frontend.bringToFront();
    await openPanelViaMoreTools('Media');
    await goToResource('media/codec_worker.html');
    await waitForPlayerButtonTexts(4);
  });
});

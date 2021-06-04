// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {goToResource} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';

import {getPlayerButtonText, playMediaFile, waitForPlayerButtonTexts} from '../helpers/media-helpers.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

describe('Media Tab', () => {
  it('ensures video playback adds entry', async () => {
    await openPanelViaMoreTools('Media');
    await playMediaFile('fisch.webm');
    const entryName = await getPlayerButtonText();

    // Names are glitched right now, and display 32-character unguessable tokens.
    assert.strictEqual(entryName.length, 32);
  });

  it('ensures video playback adds entry for web worker', async () => {
    await openPanelViaMoreTools('Media');
    await goToResource('media/codec_worker.html');
    await waitForPlayerButtonTexts([
      /AudioEncoder/,
      /VideoDecoder/,
      /VideoEncoder/,
      /codec_worker.js/,
    ]);
  });
});

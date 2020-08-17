// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from '../../shared/mocha-extensions.js';

import {getPlayerButtonText, playMediaFile} from '../helpers/media-helpers.js';
import {openPanelViaMoreTools} from '../helpers/settings-helpers.js';

describe('Media Tab', () => {
  it('ensures video playback adds entry', async () => {
    await openPanelViaMoreTools('Media');
    await playMediaFile('fisch.webm');
    const entryName = await getPlayerButtonText();

    // Names are glitched right now, and display 32-character unguessable tokens.
    assert.strictEqual(entryName.length, 32);
  });
});

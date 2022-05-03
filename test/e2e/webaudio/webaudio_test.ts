// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from '../../shared/mocha-extensions.js';
import {openSourcesPanel} from '../helpers/sources-helpers.js';
import {
  navigateToSiteWithAudioContexts,
  waitForTheWebAudioPanelToLoad,
  waitForWebAudioContent,
} from '../helpers/webaudio-helpers.js';

describe('The WebAudio Panel', async () => {
  afterEach(async () => {
    // @see console-autocomplete_test.ts
    // Make sure we don't close DevTools while there is an outstanding
    // Runtime.evaluate CDP request, which causes an error. crbug.com/1134579.
    await openSourcesPanel();
  });

  it('Listens for audio contexts', async () => {
    await waitForTheWebAudioPanelToLoad();
    await navigateToSiteWithAudioContexts();
    await waitForWebAudioContent();
  });
});

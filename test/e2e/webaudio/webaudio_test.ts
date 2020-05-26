// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from 'mocha';

import {getBrowserAndPages} from '../../shared/helper.js';
import {navigateToSiteWithAudioContexts, waitForTheWebAudioPanelToLoad, waitForWebAudioContent} from '../helpers/webaudio-helpers.js';

describe('The WebAudio Panel', async () => {
  // Crashes Puppeteer if the assertion fails
  it.skip('[crbug.com/1086519]: Listens for audio contexts', async () => {
    const {target} = getBrowserAndPages();
    await waitForTheWebAudioPanelToLoad();
    await navigateToSiteWithAudioContexts(target);
    await waitForWebAudioContent();
  });
});

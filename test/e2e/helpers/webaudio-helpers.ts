// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {goToResource, waitFor, waitForNone} from '../../shared/helper.js';
import {openPanelViaMoreTools} from './settings-helpers.js';

export async function waitForTheWebAudioPanelToLoad() {
  // Open panel and wait for content
  await openPanelViaMoreTools('WebAudio');
  await waitFor('div[aria-label="WebAudio panel"]');
}

export async function navigateToSiteWithAudioContexts() {
  // Navigate to a website with an audio context
  await goToResource('webaudio/default.html');
}

export async function waitForWebAudioContent() {
  await waitFor('.web-audio-details-container');
  await waitFor('.context-detail-container');
  await waitForNone('.web-audio-landing-page');
}

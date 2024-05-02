// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {click, getBrowserAndPages, goToResource, platform, waitFor, waitForNone} from '../../shared/helper.js';

import {openPanelViaMoreTools} from './settings-helpers.js';

export const START_PROFILING_BUTTON = 'button[aria-label="Start CPU profiling"]';
export const STOP_PROFILING_BUTTON = 'button[aria-label="Stop CPU profiling"]';

export async function navigateToProfilerTab() {
  await goToResource('profiler/default.html');
  await openPanelViaMoreTools('JavaScript Profiler');
  await waitFor('[aria-label="JavaScript Profiler panel"]');
  await waitFor('.profile-launcher-view');
}

export async function createAProfile() {
  await click(START_PROFILING_BUTTON);
  // Once we start profiling the button should change to be stop
  await click(STOP_PROFILING_BUTTON);
  // The launcher view should disappear
  await waitForNone('.profile-launcher-view');
  // the detail information should appear
  await waitFor('#profile-views');
}

export async function toggleRecordingWithKeyboad() {
  const {frontend} = getBrowserAndPages();
  const modifierKey = platform === 'mac' ? 'Meta' : 'Control';
  await frontend.keyboard.down(modifierKey);
  await frontend.keyboard.press('E');
  await frontend.keyboard.up(modifierKey);
}

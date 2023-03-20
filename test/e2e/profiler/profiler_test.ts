// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {enableExperiment, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  createAProfile,
  navigateToProfilerTab,
  START_PROFILING_BUTTON,
  STOP_PROFILING_BUTTON,
  toggleRecordingWithKeyboad,
} from '../helpers/profiler-helpers.js';

describe('The JavaScript Profiler Panel', async () => {
  beforeEach(async () => {
    await enableExperiment('jsProfilerTemporarilyEnable');
  });

  it('Loads content', async () => {
    await navigateToProfilerTab();
  });

  it('Can make one profile and display its information', async () => {
    await navigateToProfilerTab();
    await createAProfile();
  });

  it('Can start and stop a recording using keyboard shortcuts', async () => {
    await navigateToProfilerTab();
    await waitFor(START_PROFILING_BUTTON);
    await toggleRecordingWithKeyboad();
    await waitFor(STOP_PROFILING_BUTTON);
    await toggleRecordingWithKeyboad();
    await waitFor(START_PROFILING_BUTTON);
  });
});

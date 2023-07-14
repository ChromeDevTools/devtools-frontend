// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../../shared/mocha-extensions.js';
import {
  getTotalTimeFromSummary,
  navigateToPerformanceTab,
  reloadAndRecord,
  startRecording,
  stopRecording,
} from '../helpers/performance-helpers.js';

describe('The Performance panel', () => {
  it('supports the user manually starting and stopping a recording', async () => {
    await navigateToPerformanceTab('empty');

    await startRecording();
    await stopRecording();

    // Check that the recording shows the pie chart with a non 0 total time.
    const totalTime = await getTotalTimeFromSummary();
    assert.isAbove(totalTime, 0, 'The recording was created successfully');
  });

  it('can reload and record a trace', async () => {
    await navigateToPerformanceTab('fake-website');
    await reloadAndRecord();
    const totalTime = await getTotalTimeFromSummary();
    assert.isAbove(totalTime, 0, 'The recording was created successfully');
  });
});

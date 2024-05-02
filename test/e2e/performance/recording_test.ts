// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {waitForFunction} from '../../shared/helper.js';
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
    await waitForFunction(async () => {
      const totalTime = await getTotalTimeFromSummary();
      return totalTime > 0;
    });
  });

  it('can reload and record a trace', async () => {
    await navigateToPerformanceTab('fake-website');
    await reloadAndRecord();

    await waitForFunction(async () => {
      const totalTime = await getTotalTimeFromSummary();
      return totalTime > 0;
    });
  });
});

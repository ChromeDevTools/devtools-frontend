// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'path';

import {GEN_DIR} from '../../conductor/paths.js';
import {waitFor, waitForFunction} from '../../shared/helper.js';
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

  it('can import a stored trace file', async () => {
    await navigateToPerformanceTab('empty');
    const uploadProfileHandle = await waitFor<HTMLInputElement>('input[type=file]');
    assert.isNotNull(uploadProfileHandle, 'unable to upload the performance profile');
    const testTrace = path.join(GEN_DIR, 'test/e2e/resources/performance/timeline/web.dev-trace.json.gz');
    await uploadProfileHandle.uploadFile(testTrace);
    const canvas = await waitFor('canvas.flame-chart-canvas');
    // Check that we have rendered the timeline canvas.
    await waitForFunction(async () => {
      const height = await canvas.evaluate(elem => elem.clientHeight);
      return height > 200;
    });
  });
});

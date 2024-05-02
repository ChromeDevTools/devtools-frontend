// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  describeWithEnvironment,
  registerNoopActions,
} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Timeline from './timeline.js';

const {assert} = chai;

describeWithEnvironment('TimelineHistoryManager', function() {
  let historyManager: Timeline.TimelineHistoryManager.TimelineHistoryManager;
  beforeEach(() => {
    registerNoopActions(['timeline.show-history']);
    historyManager = new Timeline.TimelineHistoryManager.TimelineHistoryManager();
  });

  afterEach(() => {
    UI.ActionRegistry.ActionRegistry.reset();
  });

  it('can select from multiple parsed data objects', async function() {
    // Add two parsed data objects to the history manager.
    const firstFileModels = await TraceLoader.allModels(this, 'slow-interaction-button-click.json.gz');
    historyManager.addRecording(
        {
          data: {
            legacyModel: firstFileModels.performanceModel,
            traceParseDataIndex: 1,
          },
          filmStripForPreview: null,
          traceParsedData: firstFileModels.traceParsedData,
          startTime: null,
        },
    );

    const secondFileModels = await TraceLoader.allModels(this, 'slow-interaction-keydown.json.gz');
    historyManager.addRecording({
      data: {
        legacyModel: secondFileModels.performanceModel,
        traceParseDataIndex: 2,
      },
      filmStripForPreview: null,
      traceParsedData: secondFileModels.traceParsedData,
      startTime: null,
    });

    // Make sure the correct model tuples (legacy and new engine) are returned when
    // using the history manager to navigate between trace files..
    const previousRecording = historyManager.navigate(1);
    assert.strictEqual(previousRecording?.legacyModel, firstFileModels.performanceModel);
    assert.strictEqual(previousRecording?.traceParseDataIndex, 1);

    const nextRecording = historyManager.navigate(-1);
    assert.strictEqual(nextRecording?.legacyModel, secondFileModels.performanceModel);
    assert.strictEqual(nextRecording?.traceParseDataIndex, 2);
  });
});

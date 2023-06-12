// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {allModelsFromFile, setTraceModelTimeout} from '../../helpers/TraceHelpers.js';

import type * as Platform from '../../../../../front_end/core/platform/platform.js';

const {assert} = chai;

describeWithEnvironment('TimelineHistoryManager', function() {
  setTraceModelTimeout(this);

  let historyManager: Timeline.TimelineHistoryManager.TimelineHistoryManager;
  beforeEach(() => {
    UI.ActionRegistration.registerActionExtension({
      actionId: 'timeline.show-history',
      async loadActionDelegate() {
        return Timeline.TimelinePanel.ActionDelegate.instance();
      },
      category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
      title: () => '' as Platform.UIString.LocalizedString,
      contextTypes() {
        return [Timeline.TimelinePanel.TimelinePanel];
      },
      bindings: [
        {
          platform: UI.ActionRegistration.Platforms.WindowsLinux,
          shortcut: 'Ctrl+H',
        },
        {
          platform: UI.ActionRegistration.Platforms.Mac,
          shortcut: 'Meta+Y',
        },
      ],
    });
    UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    historyManager = new Timeline.TimelineHistoryManager.TimelineHistoryManager();
  });

  afterEach(() => {
    UI.ActionRegistry.ActionRegistry.reset();
  });

  it('can select from multiple parsed data objects', async () => {
    // Add two parsed data objects to the history manager.
    const firstFileModels = await allModelsFromFile('slow-interaction-button-click.json.gz');
    historyManager.addRecording(
        firstFileModels.performanceModel,
        firstFileModels.traceParsedData,
        firstFileModels.filmStripModel,
    );

    const secondFileModels = await allModelsFromFile('slow-interaction-keydown.json.gz');
    historyManager.addRecording(
        secondFileModels.performanceModel, secondFileModels.traceParsedData, secondFileModels.filmStripModel);

    // Make sure the correct model tuples (legacy and new engine) are returned when
    // using the history manager to navigate between trace files..
    const previousRecording = historyManager.navigate(1);
    assert.strictEqual(previousRecording?.legacyModel, firstFileModels.performanceModel);
    assert.strictEqual(previousRecording?.traceParseData, firstFileModels.traceParsedData);
    assert.strictEqual(previousRecording?.filmStripModel, firstFileModels.filmStripModel);

    const nextRecording = historyManager.navigate(-1);
    assert.strictEqual(nextRecording?.legacyModel, secondFileModels.performanceModel);
    assert.strictEqual(nextRecording?.traceParseData, secondFileModels.traceParsedData);
    assert.strictEqual(nextRecording?.filmStripModel, secondFileModels.filmStripModel);
  });
});

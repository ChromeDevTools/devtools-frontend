// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../../../front_end/ui/components/helpers/helpers.js';
import * as FrontendHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';  // eslint-disable-line rulesdir/es_modules_import
import * as RecorderComponents from '../../../../panels/recorder/components/components.js';
import * as Models from '../../../../panels/recorder/models/models.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

async function initializeGlobalActions(): Promise<void> {
  const UI = await import('../../../../../front_end/ui/legacy/legacy.js');
  const actionRegistry = UI.ActionRegistry.ActionRegistry.instance();
  UI.ShortcutRegistry.ShortcutRegistry.instance({
    forceNew: true,
    actionRegistry,
  });
}
await initializeGlobalActions();

const recording = {
  title: 'Test',
  steps: [
    {
      type: Models.Schema.StepType.Navigate as const,
      url: 'http://example.com',
    },
    {
      type: Models.Schema.StepType.Click as const,
      target: 'main',
      selectors: [['.click']],
      offsetX: 1,
      offsetY: 2,
      assertedEvents: [{
        type: Models.Schema.AssertedEventType.Navigation,
        title: 'Test',
        url: 'http://example.com/2',
      }],
    },
    {
      type: Models.Schema.StepType.Click as const,
      target: 'main',
      selectors: [['.click2']],
      offsetX: 3,
      offsetY: 4,
    },
  ],
};
const data = {
  replayState: {
    isPlaying: false,
    isPausedOnBreakpoint: false,
  },
  isRecording: false,
  recordingTogglingInProgress: false,
  replayAllowed: true,
  recording,
  breakpointIndexes: new Set<number>(),
  sections: [
    {
      title: 'Section title',
      url: 'http://example.com',
      steps: [recording.steps[1]],
      causingStep: recording.steps[0],
    },
    {
      title: 'Section title 2',
      url: 'http://example.com/2',
      steps: [recording.steps[2]],
      causingStep: recording.steps[1],
    },
  ],
  settings: {
    networkConditionsSettings: {
      download: 3000,
      upload: 3000,
      latency: 3000,
      type: Models.Schema.StepType.EmulateNetworkConditions as const,
    },
    viewportSettings: {
      deviceScaleFactor: 1,
      hasTouch: false,
      height: 800,
      width: 600,
      isLandscape: false,
      isMobile: false,
      type: Models.Schema.StepType.SetViewport as const,
    },
  },
  builtInConverters: [],
  extensionConverters: [],
  recorderSettings: new Models.RecorderSettings.RecorderSettings(),
  replayExtensions: [],
};
const component1 = new RecorderComponents.RecordingView.RecordingView();
component1.data = data;
document.getElementById('container')?.appendChild(component1);

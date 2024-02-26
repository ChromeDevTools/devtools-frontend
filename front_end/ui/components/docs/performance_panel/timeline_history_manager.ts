// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../models/trace/trace.js';
import * as Timeline from '../../../../panels/timeline/timeline.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as TraceLoader from '../../../../testing/TraceLoader.js';
import * as UI from '../../../legacy/legacy.js';
import * as ComponentSetup from '../../helpers/helpers.js';

await FrontendHelpers.initializeGlobalVars();
await ComponentSetup.ComponentServerSetup.setup();

UI.ActionRegistration.registerActionExtension({
  actionId: 'timeline.show-history',
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  contextTypes() {
    return [Timeline.TimelinePanel.TimelinePanel];
  },
  async loadActionDelegate() {
    return new Timeline.TimelinePanel.ActionDelegate();
  },
});

// Adding the recording right after the profile is parsed is needed as
// the recording relies on the trace bounds initialized in
// |TraceLoader.allModels|

// By default we run both engines in the dev server, but this can be overridden by passing the parameter.
const {performanceModel: performanceModel1, traceParsedData: traceParsedData1} =
    await TraceLoader.TraceLoader.allModels(null, 'multiple-navigations.json.gz');

new Timeline.TimelineHistoryManager.TimelineHistoryManager().addRecording({
  data: {
    legacyModel: performanceModel1,
    traceParseDataIndex: 0,
  },
  filmStripForPreview: TraceEngine.Extras.FilmStrip.fromTraceData(traceParsedData1),
  traceParsedData: traceParsedData1,
  startTime: null,
});

const {performanceModel: performanceModel2, traceParsedData: traceParsedData2} =
    await TraceLoader.TraceLoader.allModels(null, 'web-dev.json.gz');
const container = document.querySelector('.container');
if (!container) {
  throw new Error('could not find container');
}

new Timeline.TimelineHistoryManager.TimelineHistoryManager().addRecording({
  data: {
    legacyModel: performanceModel2,
    traceParseDataIndex: 1,
  },
  filmStripForPreview: TraceEngine.Extras.FilmStrip.fromTraceData(traceParsedData2),
  traceParsedData: traceParsedData2,
  startTime: null,
});
await Timeline.TimelineHistoryManager.DropDown.show([0, 1], 1, container);

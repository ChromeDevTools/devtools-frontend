// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../../core/root/root.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Timeline from '../../../../panels/timeline/timeline.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as TraceLoader from '../../../../testing/TraceLoader.js';
import * as UI from '../../../legacy/legacy.js';
import * as ComponentSetup from '../../helpers/helpers.js';

await FrontendHelpers.initializeGlobalVars();
await ComponentSetup.ComponentServerSetup.setup();

Root.Runtime.experiments.setEnabled(Root.Runtime.ExperimentName.TIMELINE_OBSERVATIONS, true);

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

const {parsedTrace: parsedTrace1} = await TraceLoader.TraceLoader.traceEngine(null, 'multiple-navigations.json.gz');
TraceLoader.TraceLoader.initTraceBoundsManager(parsedTrace1);

new Timeline.TimelineHistoryManager.TimelineHistoryManager().addRecording({
  data: {
    parsedTraceIndex: 0,
    type: 'TRACE_INDEX',
  },
  filmStripForPreview: Trace.Extras.FilmStrip.fromParsedTrace(parsedTrace1),
  parsedTrace: parsedTrace1,
  startTime: null,
});

const {parsedTrace: parsedTrace2} = await TraceLoader.TraceLoader.traceEngine(null, 'web-dev.json.gz');
TraceLoader.TraceLoader.initTraceBoundsManager(parsedTrace2);
const container = document.querySelector('.container');
if (!container) {
  throw new Error('could not find container');
}

new Timeline.TimelineHistoryManager.TimelineHistoryManager().addRecording({
  data: {
    parsedTraceIndex: 1,
    type: 'TRACE_INDEX',
  },
  filmStripForPreview: Trace.Extras.FilmStrip.fromParsedTrace(parsedTrace2),
  parsedTrace: parsedTrace2,
  startTime: null,
});
await Timeline.TimelineHistoryManager.DropDown.show([0, 1], 1, container);

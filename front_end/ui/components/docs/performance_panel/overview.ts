// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as EnvironmentHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as TraceLoader from '../../../../../test/unittests/front_end/helpers/TraceLoader.js';
import * as TraceEngine from '../../../../models/trace/trace.js';
import * as Timeline from '../../../../panels/timeline/timeline.js';
import * as PerfUI from '../../../legacy/components/perf_ui/perf_ui.js';
import * as ComponentSetup from '../../helpers/helpers.js';

await EnvironmentHelpers.initializeGlobalVars();
await ComponentSetup.ComponentServerSetup.setup();
const container = document.querySelector<HTMLElement>('div.container');
if (!container) {
  throw new Error('could not find container');
}

const params = new URLSearchParams(window.location.search);
const fileName = (params.get('fileName') || 'web-dev') + '.json.gz';
const overview = new PerfUI.TimelineOverviewPane.TimelineOverviewPane('timeline');
overview.markAsRoot();
overview.show(container);

const models = await TraceLoader.TraceLoader.allModels(null, fileName);

const filmStrip = TraceEngine.Extras.FilmStrip.fromTraceData(models.traceParsedData);
const controls = [
  new Timeline.TimelineEventOverview.TimelineEventOverviewResponsiveness(),
  new Timeline.TimelineEventOverview.TimelineEventOverviewCPUActivity(),
  new Timeline.TimelineEventOverview.TimelineEventOverviewNetwork(),
  new Timeline.TimelineEventOverview.TimelineFilmStripOverview(filmStrip),
];
for (const control of controls) {
  control.setModel(models.performanceModel);
}
overview.setOverviewControls(controls);
overview.reset();

overview.setNavStartTimes(models.timelineModel.navStartTimes());
overview.setBounds(models.timelineModel.minimumRecordTime(), models.timelineModel.maximumRecordTime());
overview.setWindowTimes(models.performanceModel.window().left, models.performanceModel.window().right);

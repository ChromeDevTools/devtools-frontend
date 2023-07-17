// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as EnvironmentHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as TraceLoader from '../../../../../test/unittests/front_end/helpers/TraceLoader.js';
import * as Timeline from '../../../../panels/timeline/timeline.js';
import * as ComponentSetup from '../../helpers/helpers.js';

await EnvironmentHelpers.initializeGlobalVars();
await ComponentSetup.ComponentServerSetup.setup();
const container = document.querySelector<HTMLElement>('div.container');
if (!container) {
  throw new Error('could not find container');
}

const params = new URLSearchParams(window.location.search);
const fileName = (params.get('fileName') || 'web-dev') + '.json.gz';
const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap();
minimap.markAsRoot();
minimap.show(container);

const models = await TraceLoader.TraceLoader.allModels(null, fileName);

minimap.setNavStartTimes(models.timelineModel.navStartTimes());
minimap.setBounds(models.timelineModel.minimumRecordTime(), models.timelineModel.maximumRecordTime());
minimap.setWindowTimes(models.performanceModel.window().left, models.performanceModel.window().right);
minimap.updateControls({
  traceParsedData: models.traceParsedData,
  performanceModel: models.performanceModel,
  settings: {
    showMemory: false,
    showScreenshots: true,
  },
});

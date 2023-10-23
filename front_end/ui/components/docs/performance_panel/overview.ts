// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as EnvironmentHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as TraceLoader from '../../../../../test/unittests/front_end/helpers/TraceLoader.js';
import * as TraceEngine from '../../../../models/trace/trace.js';
import * as Timeline from '../../../../panels/timeline/timeline.js';
import * as ComponentSetup from '../../helpers/helpers.js';

await EnvironmentHelpers.initializeGlobalVars();
await ComponentSetup.ComponentServerSetup.setup();
const container = document.querySelector<HTMLElement>('div.container');
if (!container) {
  throw new Error('could not find container');
}

const params = new URLSearchParams(window.location.search);
const fileName = (params.get('trace') || 'web-dev') + '.json.gz';
const customStartWindowTime = params.get('windowStart');
const customEndWindowTime = params.get('windowEnd');

async function renderMiniMap(
    containerSelector: string, options: {showMemory: boolean, source: Timeline.TimelinePanel.ThreadTracksSource}) {
  const container = document.querySelector<HTMLElement>(containerSelector);
  if (!container) {
    throw new Error('could not find container');
  }
  const models = await TraceLoader.TraceLoader.allModels(null, fileName);
  const {left, right} = models.performanceModel.calculateWindowForMainThreadActivity();
  models.performanceModel.setWindow({left, right});

  const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap(options.source);
  minimap.activateBreadcrumbs();
  minimap.markAsRoot();
  minimap.show(container);

  minimap.setBounds(
      TraceEngine.Types.Timing.MilliSeconds(models.timelineModel.minimumRecordTime()),
      TraceEngine.Types.Timing.MilliSeconds(models.timelineModel.maximumRecordTime()),
  );

  minimap.setData({
    traceParsedData: models.traceParsedData,
    performanceModel: models.performanceModel,
    settings: {
      showMemory: options.showMemory,
      showScreenshots: true,
    },
  });
  if (customStartWindowTime && customEndWindowTime) {
    minimap.setWindowTimes(Number(customStartWindowTime), Number(customEndWindowTime));
  } else {
    minimap.setWindowTimes(models.performanceModel.window().left, models.performanceModel.window().right);
  }
}

await renderMiniMap('.container', {showMemory: false, source: Timeline.TimelinePanel.ThreadTracksSource.OLD_ENGINE});
await renderMiniMap(
    '.container-with-memory', {showMemory: true, source: Timeline.TimelinePanel.ThreadTracksSource.OLD_ENGINE});
await renderMiniMap(
    '.container-new-engine', {showMemory: false, source: Timeline.TimelinePanel.ThreadTracksSource.NEW_ENGINE});

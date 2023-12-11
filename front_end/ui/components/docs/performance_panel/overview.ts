// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as EnvironmentHelpers from '../../../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as TraceLoader from '../../../../../test/unittests/front_end/helpers/TraceLoader.js';
import * as TraceEngine from '../../../../models/trace/trace.js';
import * as Timeline from '../../../../panels/timeline/timeline.js';
import * as TraceBounds from '../../../../services/trace_bounds/trace_bounds.js';
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

async function renderMiniMap(containerSelector: string, options: {showMemory: boolean}) {
  const container = document.querySelector<HTMLElement>(containerSelector);
  if (!container) {
    throw new Error('could not find container');
  }
  const models = await TraceLoader.TraceLoader.allModels(null, fileName);

  const mainThread = TraceEngine.Handlers.Threads
                         .threadsInRenderer(models.traceParsedData.Renderer, models.traceParsedData.AuctionWorklets)
                         .find(t => t.type === TraceEngine.Handlers.Threads.ThreadType.MAIN_THREAD);
  if (!mainThread) {
    throw new Error('Could not find main thread.');
  }
  const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap();
  minimap.markAsRoot();
  minimap.show(container);
  TraceBounds.TraceBounds.BoundsManager.instance().resetWithNewBounds(models.traceParsedData.Meta.traceBounds);

  const zoomedWindow = TraceEngine.Extras.MainThreadActivity.calculateWindow(
      models.traceParsedData.Meta.traceBounds,
      mainThread.entries,
  );
  TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(zoomedWindow);

  minimap.setData({
    traceParsedData: models.traceParsedData,
    settings: {
      showMemory: options.showMemory,
      showScreenshots: true,
    },
  });
  if (customStartWindowTime && customEndWindowTime) {
    TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(
        TraceEngine.Helpers.Timing.traceWindowFromMilliSeconds(
            TraceEngine.Types.Timing.MilliSeconds(Number(customStartWindowTime)),
            TraceEngine.Types.Timing.MilliSeconds(Number(customEndWindowTime)),
            ),
    );
  }
}

await renderMiniMap('.container', {showMemory: false});
await renderMiniMap('.container-with-memory', {showMemory: true});

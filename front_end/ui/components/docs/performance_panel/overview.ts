// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../../models/trace/trace.js';
import * as Timeline from '../../../../panels/timeline/timeline.js';
import * as TraceBounds from '../../../../services/trace_bounds/trace_bounds.js';
import * as EnvironmentHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as TraceLoader from '../../../../testing/TraceLoader.js';
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
  const {parsedTrace} = await TraceLoader.TraceLoader.traceEngine(null, fileName);

  const mainThread = Trace.Handlers.Threads.threadsInRenderer(parsedTrace.Renderer, parsedTrace.AuctionWorklets)
                         .find(t => t.type === Trace.Handlers.Threads.ThreadType.MAIN_THREAD);
  if (!mainThread) {
    throw new Error('Could not find main thread.');
  }
  const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap();
  minimap.markAsRoot();
  minimap.show(container);
  TraceBounds.TraceBounds.BoundsManager.instance().resetWithNewBounds(parsedTrace.Meta.traceBounds);

  const zoomedWindow = Trace.Extras.MainThreadActivity.calculateWindow(
      parsedTrace.Meta.traceBounds,
      mainThread.entries,
  );
  TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(zoomedWindow);

  minimap.setData({
    parsedTrace,
    settings: {
      showMemory: options.showMemory,
      showScreenshots: true,
    },
  });
  if (customStartWindowTime && customEndWindowTime) {
    TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(
        Trace.Helpers.Timing.traceWindowFromMilliSeconds(
            Trace.Types.Timing.MilliSeconds(Number(customStartWindowTime)),
            Trace.Types.Timing.MilliSeconds(Number(customEndWindowTime)),
            ),
    );
  }
}

await renderMiniMap('.container', {showMemory: false});
await renderMiniMap('.container-with-memory', {showMemory: true});

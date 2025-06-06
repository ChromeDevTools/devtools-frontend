// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {getMainThread} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as TimelineComponents from './components/components.js';
import * as Timeline from './timeline.js';

describeWithEnvironment('TimelineMiniMap', function() {
  async function renderMiniMapForScreenshot(parsedTrace: Trace.Handlers.Types.ParsedTrace): Promise<void> {
    const container = document.createElement('div');
    container.style.flex = 'none';
    container.style.display = 'flex';
    container.style.position = 'relative';
    container.style.width = '600px';
    container.style.height = '200px';
    container.innerHTML = `<style>${UI.inspectorCommonStyles}</style>`;
    renderElementIntoDOM(container);

    const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap();
    minimap.markAsRoot();
    minimap.show(container);
    minimap.setData({
      parsedTrace,
      settings: {
        showMemory: true,
        showScreenshots: true,
      },
    });
    // Now we can zoom into the main thread activity; this means the resize handles are
    // not both on the edge of the screen, so it's a more representative screenshot.
    const mainThread = getMainThread(parsedTrace.Renderer);
    const zoomedWindow = Trace.Extras.MainThreadActivity.calculateWindow(
        parsedTrace.Meta.traceBounds,
        mainThread.entries,
    );
    TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(zoomedWindow);
    await raf();
  }

  it('always shows the responsiveness, CPU activity and network panel', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');

    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap();
    minimap.markAsRoot();
    minimap.show(container);

    minimap.setData({
      parsedTrace,
      settings: {
        showMemory: false,
        showScreenshots: false,
      },
    });

    await raf();
    assert.exists(container.querySelector('#timeline-overview-responsiveness'));
    assert.exists(container.querySelector('#timeline-overview-cpu-activity'));
    assert.exists(container.querySelector('#timeline-overview-network'));
    assert.isNull(container.querySelector('#timeline-overview-filmstrip'));
    assert.isNull(container.querySelector('#timeline-overview-memory'));
  });

  it('shows memory and screenshots also if they are set to be visible', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    await renderMiniMapForScreenshot(parsedTrace);
    await assertScreenshot('timeline/minimap_with_memory_and_screenshots.png');
  });

  it('highlights long tasks in red', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
    await renderMiniMapForScreenshot(parsedTrace);
    await assertScreenshot('timeline/minimap_long_task.png');
  });

  it('creates the first breadcrumb', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');

    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap();
    minimap.markAsRoot();
    minimap.show(container);

    minimap.setData({
      parsedTrace,
      settings: {
        showMemory: true,
        showScreenshots: true,
      },
    });

    await raf();

    if (!minimap.breadcrumbs) {
      throw new Error('The MiniMap unexpectedly did not create any breadcrumbs');
    }

    assert.lengthOf(TimelineComponents.Breadcrumbs.flattenBreadcrumbs(minimap.breadcrumbs.initialBreadcrumb), 1);
    assert.deepEqual(minimap.breadcrumbs.initialBreadcrumb, {window: parsedTrace.Meta.traceBounds, child: null});
  });

  it('stores breadcrumbs to be serialized', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap();
    minimap.setData({
      parsedTrace,
      settings: {
        showMemory: true,
        showScreenshots: true,
      },
    });
    const entireTraceBounds = parsedTrace.Meta.traceBounds;
    const newBounds = {
      ...entireTraceBounds,
      min: Trace.Types.Timing.Micro((entireTraceBounds.max + entireTraceBounds.min) / 2),
    };
    minimap.breadcrumbs?.add(newBounds);
    const serializableModifications = Timeline.ModificationsManager.ModificationsManager.activeManager()?.toJSON();
    assert.deepEqual(
        serializableModifications?.initialBreadcrumb.child,
        {window: {min: 1020035455504, max: 1020036087961, range: 1264914}, child: null} as Trace.Types.File.Breadcrumb);
  });
});

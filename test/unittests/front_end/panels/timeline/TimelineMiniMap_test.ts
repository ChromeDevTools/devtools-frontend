// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TimelineComponents from '../../../../../front_end/panels/timeline/components/components.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import * as TraceBounds from '../../../../../front_end/services/trace_bounds/trace_bounds.js';
import {raf, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {TraceLoader} from '../../helpers/TraceLoader.js';

describeWithEnvironment('TimelineMiniMap', function() {
  it('always shows the responsiveness, CPU activity and network panel', async function() {
    const traceParsedData = await TraceLoader.traceEngine(this, 'web-dev.json.gz');

    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap();
    minimap.markAsRoot();
    minimap.show(container);

    minimap.setData({
      traceParsedData,
      settings: {
        showMemory: false,
        showScreenshots: false,
      },
    });

    await raf();
    assert.isDefined(container.querySelector('#timeline-overview-responsiveness'));
    assert.isDefined(container.querySelector('#timeline-overview-cpu-activity'));
    assert.isDefined(container.querySelector('#timeline-overview-network'));
    assert.isNull(container.querySelector('#timeline-overview-filmstrip'));
    assert.isNull(container.querySelector('#timeline-overview-memory'));
    minimap.detach();
  });

  it('will show the other panels if they are set to visible', async function() {
    const traceParsedData = await TraceLoader.traceEngine(this, 'web-dev.json.gz');

    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap();
    minimap.markAsRoot();
    minimap.show(container);

    minimap.setData({
      traceParsedData,
      settings: {
        showMemory: true,
        showScreenshots: true,
      },
    });

    await raf();
    assert.isDefined(container.querySelector('#timeline-overview-responsiveness'));
    assert.isDefined(container.querySelector('#timeline-overview-cpu-activity'));
    assert.isDefined(container.querySelector('#timeline-overview-network'));
    assert.isDefined(container.querySelector('#timeline-overview-filmstrip'));
    assert.isDefined(container.querySelector('#timeline-overview-memory'));
    minimap.detach();
  });

  it('creates the first breadcrumb', async function() {
    const traceParsedData = await TraceLoader.traceEngine(this, 'web-dev.json.gz');

    TraceBounds.TraceBounds.BoundsManager.instance().resetWithNewBounds(traceParsedData.Meta.traceBounds);

    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap();
    minimap.markAsRoot();
    minimap.show(container);

    minimap.setData({
      traceParsedData,
      settings: {
        showMemory: true,
        showScreenshots: true,
      },
    });
    minimap.addInitialBreadcrumb();

    await raf();

    if (!minimap.breadcrumbs) {
      throw new Error('The MiniMap unexpectedly did not create any breadcrumbs');
    }

    assert.strictEqual(
        TimelineComponents.Breadcrumbs.flattenBreadcrumbs(minimap.breadcrumbs.initialBreadcrumb).length, 1);
    assert.deepEqual(minimap.breadcrumbs.initialBreadcrumb, {window: traceParsedData.Meta.traceBounds, child: null});
  });
});

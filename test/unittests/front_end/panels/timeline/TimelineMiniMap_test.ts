// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../../../../front_end/core/root/root.js';
import * as Types from '../../../../../front_end/models/trace/types/types.js';
import * as TimelineComponents from '../../../../../front_end/panels/timeline/components/components.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import {raf, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {TraceLoader} from '../../helpers/TraceLoader.js';

describeWithEnvironment('TimelineMiniMap', function() {
  it('always shows the responsiveness, CPU activity and network panel', async function() {
    const models = await TraceLoader.allModels(this, 'web-dev.json.gz');

    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap(Timeline.TimelinePanel.ThreadTracksSource.NEW_ENGINE);
    minimap.markAsRoot();
    minimap.show(container);

    minimap.setData({
      traceParsedData: models.traceParsedData,
      performanceModel: models.performanceModel,
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
    const models = await TraceLoader.allModels(this, 'web-dev.json.gz');

    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap(Timeline.TimelinePanel.ThreadTracksSource.NEW_ENGINE);
    minimap.markAsRoot();
    minimap.show(container);

    minimap.setData({
      traceParsedData: models.traceParsedData,
      performanceModel: models.performanceModel,
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

  it('creates the first breadcrumb when breadcrumbsPerformancePanel experiment is enabled', async function() {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.BREADCRUMBS_PERFORMANCE_PANEL);
    const models = await TraceLoader.allModels(this, 'web-dev.json.gz');

    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap(Timeline.TimelinePanel.ThreadTracksSource.NEW_ENGINE);
    minimap.markAsRoot();
    minimap.show(container);

    minimap.setData({
      traceParsedData: models.traceParsedData,
      performanceModel: models.performanceModel,
      settings: {
        showMemory: true,
        showScreenshots: true,
      },
    });
    minimap.addInitialBreadcrumb();

    await raf();

    const initialTraceWindow = {
      min: Types.Timing.MicroSeconds(-1020034823.047),
      max: Types.Timing.MicroSeconds(-1020034723.047),
      range: Types.Timing.MicroSeconds(100),
    };

    assert.isNotNull(minimap.breadcrumbs);
    if (minimap.breadcrumbs) {
      assert.strictEqual(
          TimelineComponents.Breadcrumbs.flattenBreadcrumbs(minimap.breadcrumbs.initialBreadcrumb).length, 1);
      assert.deepEqual(minimap.breadcrumbs.initialBreadcrumb, {window: initialTraceWindow, child: null});
    }
  });

  it('does not create breadcrumbs when breadcrumbsPerformancePanel experiment is disabled', async function() {
    const models = await TraceLoader.allModels(this, 'web-dev.json.gz');

    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap(Timeline.TimelinePanel.ThreadTracksSource.NEW_ENGINE);
    minimap.markAsRoot();
    minimap.show(container);

    minimap.setData({
      traceParsedData: models.traceParsedData,
      performanceModel: models.performanceModel,
      settings: {
        showMemory: true,
        showScreenshots: true,
      },
    });

    await raf();

    assert.isNull(minimap.breadcrumbs);
  });
});

// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import {raf, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {TraceLoader} from '../../helpers/TraceLoader.js';

describeWithEnvironment('TimelineMiniMap', function() {
  it('always shows the responsiveness, CPU activity and network panel', async function() {
    const models = await TraceLoader.allModels(this, 'web-dev.json.gz');

    const container = document.createElement('div');
    renderElementIntoDOM(container);

    const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap();
    minimap.markAsRoot();
    minimap.show(container);

    minimap.updateControls({
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

    const minimap = new Timeline.TimelineMiniMap.TimelineMiniMap();
    minimap.markAsRoot();
    minimap.show(container);

    minimap.updateControls({
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
});

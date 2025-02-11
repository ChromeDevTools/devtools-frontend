// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TimelineComponents from '../../../../panels/timeline/components/components.js';
import * as Timeline from '../../../../panels/timeline/timeline.js';
import * as EnvironmentHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as TraceLoader from '../../../../testing/TraceLoader.js';
import * as ComponentSetup from '../../helpers/helpers.js';

await EnvironmentHelpers.initializeGlobalVars();
await ComponentSetup.ComponentServerSetup.setup();

/**
 * Render tooltip for a basic network request
 **/
async function renderTooltips1() {
  const container = document.querySelector('#container1');
  if (!container) {
    throw new Error('No container');
  }

  const {parsedTrace} = await TraceLoader.TraceLoader.traceEngine(/* mocha context */ null, 'lcp-images.json.gz');
  const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
  const networkRequest = parsedTrace.NetworkRequests.byTime[0];

  const tooltip = new TimelineComponents.NetworkRequestTooltip.NetworkRequestTooltip();
  tooltip.data = {networkRequest, entityMapper};

  container.appendChild(tooltip);
}

/**
 * Render tooltip for a render-blocking network request
 **/
async function renderTooltips2() {
  const container = document.querySelector('#container2');
  if (!container) {
    throw new Error('No container');
  }

  const {parsedTrace} =
      await TraceLoader.TraceLoader.traceEngine(/* mocha context */ null, 'render-blocking-in-iframe.json.gz');
  const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
  const networkRequest = parsedTrace.NetworkRequests.byTime[1];

  const tooltip = new TimelineComponents.NetworkRequestTooltip.NetworkRequestTooltip();
  tooltip.data = {networkRequest, entityMapper};

  container.appendChild(tooltip);
}

/**
 * Render tooltip for a priority changed network request
 **/
async function renderTooltips3() {
  const container = document.querySelector('#container3');
  if (!container) {
    throw new Error('No container');
  }

  const {parsedTrace} =
      await TraceLoader.TraceLoader.traceEngine(/* mocha context */ null, 'changing-priority.json.gz');
  const entityMapper = new Timeline.Utils.EntityMapper.EntityMapper(parsedTrace);
  const networkRequest = parsedTrace.NetworkRequests.byTime.find(request => {
    return request.args.data.url === 'https://via.placeholder.com/3000.jpg';
  });
  if (!networkRequest) {
    throw new Error('The priority change event is not found');
  }

  const tooltip = new TimelineComponents.NetworkRequestTooltip.NetworkRequestTooltip();
  tooltip.data = {networkRequest, entityMapper};

  container.appendChild(tooltip);
}

await renderTooltips1();
await renderTooltips2();
await renderTooltips3();

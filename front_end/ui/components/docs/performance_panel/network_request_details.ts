// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TimelineComponents from '../../../../panels/timeline/components/components.js';
import * as Timeline from '../../../../panels/timeline/timeline.js';
import * as EnvironmentHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as TraceLoader from '../../../../testing/TraceLoader.js';
import * as Components from '../../../../ui/legacy/components/utils/utils.js';
import * as ComponentSetup from '../../helpers/helpers.js';

await EnvironmentHelpers.initializeGlobalVars();
await ComponentSetup.ComponentServerSetup.setup();
const detailsLinkifier = new Components.Linkifier.Linkifier();

/**
 * Render details for a basic network request
 **/
async function renderDetails() {
  const container = document.querySelector('#container');
  if (!container) {
    throw new Error('No container');
  }

  const {parsedTrace} = await TraceLoader.TraceLoader.traceEngine(/* mocha context */ null, 'lcp-images.json.gz');
  const networkEvent = parsedTrace.NetworkRequests.byTime[0];
  const maybeTarget = Timeline.TargetForEvent.targetForEvent(parsedTrace, networkEvent);

  const details = new TimelineComponents.NetworkRequestDetails.NetworkRequestDetails(detailsLinkifier);
  await details.setData(parsedTrace, networkEvent, maybeTarget);

  container.appendChild(details);
}

await renderDetails();

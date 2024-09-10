// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TraceEngine from '../../../../models/trace/trace.js';
import * as TimelineComponents from '../../../../panels/timeline/components/components.js';
import * as EnvironmentHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as TraceLoader from '../../../../testing/TraceLoader.js';
import * as ComponentSetup from '../../helpers/helpers.js';

await EnvironmentHelpers.initializeGlobalVars();
await ComponentSetup.ComponentServerSetup.setup();

/**
 * Render details for a Layout shift event.
 **/
async function renderDetails() {
  const container = document.querySelector('#container');
  if (!container) {
    throw new Error('No container');
  }

  const {traceData, insights} =
      await TraceLoader.TraceLoader.traceEngine(/* mocha context */ null, 'shift-attribution.json.gz');

  const shiftEventIframe =
      traceData.LayoutShifts.clusters[0].worstShiftEvent as TraceEngine.Types.TraceEvents.SyntheticLayoutShift;
  const details = new TimelineComponents.LayoutShiftDetails.LayoutShiftDetails();
  details.setData(shiftEventIframe, insights, traceData, false);

  container.appendChild(details);
}

await renderDetails();

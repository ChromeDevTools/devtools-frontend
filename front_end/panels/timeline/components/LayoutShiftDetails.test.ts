// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../models/trace/trace.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

import * as TimelineComponents from './components.js';

describeWithMockConnection('LayoutShiftDetails', () => {
  it('correctly renders main details', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'shift-attribution.json.gz');
    const shiftEvent = parsedTrace.LayoutShifts.clusters[0].worstShiftEvent as Trace.Types.Events.SyntheticLayoutShift;
    assert.isNotNull(shiftEvent);

    const details = new TimelineComponents.LayoutShiftDetails.LayoutShiftDetails();
    details.setData(shiftEvent, insights, parsedTrace, false);

    assert.isNotNull(details.shadowRoot);
    const decorativeChip = details.shadowRoot.querySelector('.timeline-details-chip-decorative-title');
    assert.isNotNull(decorativeChip);

    assert.include(decorativeChip?.textContent, 'Layout shift culprits');
    const eventTitle = details.shadowRoot.querySelector('.layout-shift-details-title');
    assert.include(eventTitle?.textContent, 'Layout shift');

    const table = details.shadowRoot.querySelector('.layout-shift-details-table');

    // These headers should be included.
    const tableHeaders = ['Start time', 'Shift score', 'Culprit type'];
    const content = table?.textContent;
    for (const header of tableHeaders) {
      assert.include(content, header);
    }

    // This header should not be included. Since this is not a freshly recorded trace.
    assert.notInclude(content, 'Elements shifted');
  });
});

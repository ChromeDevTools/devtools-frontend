// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../models/trace/trace.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';

import * as TimelineComponents from './components.js';

describeWithMockConnection('LayoutShiftDetails', () => {
  it('correctly renders main shift details', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'shift-attribution.json.gz');
    const shiftEvent = parsedTrace.LayoutShifts.clusters[0].worstShiftEvent as Trace.Types.Events.SyntheticLayoutShift;
    assert.isNotNull(shiftEvent);

    const details = new TimelineComponents.LayoutShiftDetails.LayoutShiftDetails();
    details.setData(shiftEvent, insights, parsedTrace, false);

    assert.isNotNull(details.shadowRoot);
    const decorativeChip = details.shadowRoot.querySelector('.insight-chip');
    assert.isNotNull(decorativeChip);

    assert.include(decorativeChip?.textContent, 'Layout shift culprits');
    const eventTitle = details.shadowRoot.querySelector('.layout-shift-details-title');
    assert.include(eventTitle?.textContent, 'Layout shift');

    const table = details.shadowRoot.querySelector('.layout-shift-details-table');

    // These headers should be included.
    const tableHeaders = ['Start time', 'Shift score'];
    const content = table?.textContent;
    for (const header of tableHeaders) {
      assert.include(content, header);
    }

    // This header should not be included. Since this is not a freshly recorded trace.
    assert.notInclude(content, 'Elements shifted');
  });
  it('correctly renders cluster details', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'shift-attribution.json.gz');
    const cluster = parsedTrace.LayoutShifts.clusters[0];
    assert.isNotNull(cluster);

    const details = new TimelineComponents.LayoutShiftDetails.LayoutShiftDetails();
    details.setData(cluster, insights, parsedTrace, false);

    assert.isNotNull(details.shadowRoot);
    const decorativeChip = details.shadowRoot.querySelector('.insight-chip');
    assert.isNotNull(decorativeChip);

    assert.include(decorativeChip?.textContent, 'Layout shift culprits');
    const eventTitle = details.shadowRoot.querySelector('.layout-shift-details-title');
    assert.include(eventTitle?.textContent, 'Layout shift cluster');

    const table = details.shadowRoot.querySelector('.layout-shift-details-table');
    const tableHeaders = ['Start time', 'Shift score'];
    const content = table?.textContent;
    for (const header of tableHeaders) {
      assert.include(content, header);
    }

    // Shift row should be "layout shift @".
    const shiftRow = details.shadowRoot.querySelector('.shift-row');
    assert.include(shiftRow?.textContent, 'Layout shift @ ');

    const lastRow = details.shadowRoot.querySelector('.total-row');
    assert.include(lastRow?.textContent, 'Total');
  });
});

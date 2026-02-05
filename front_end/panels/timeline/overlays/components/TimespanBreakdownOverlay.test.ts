// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../../models/trace/trace.js';
import {
  assertScreenshot,
  getCleanTextContentFromElements,
  raf,
  renderElementIntoDOM
} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {
  microsecondsTraceWindow,
} from '../../../../testing/TraceHelpers.js';

import * as Components from './components.js';

describeWithEnvironment('TimespanBreakdownOverlay', () => {
  it('renders the sections with the labels and time', async () => {
    const component = new Components.TimespanBreakdownOverlay.TimespanBreakdownOverlay();
    const sections: Trace.Types.Overlays.TimespanBreakdownEntryBreakdown[] = [
      {
        bounds: microsecondsTraceWindow(0, 1_000),
        label: 'section one',
        showDuration: true,
      },
      {
        bounds: microsecondsTraceWindow(1_000, 20_055),
        label: 'section two',
        showDuration: true,
      },
    ];

    component.sections = sections;
    await raf();

    const segmentContainer = Array.from(component.element.querySelectorAll<HTMLElement>('.timeline-segment-container'));

    const labels = segmentContainer.flatMap(elem => {
      return getCleanTextContentFromElements(elem, '.timespan-breakdown-overlay-label');
    });
    assert.deepEqual(labels, ['1 ms section one', '19 ms section two']);
  });

  it('renders the overlay', async function() {
    const testElem = document.createElement('div');
    testElem.style.width = '300px';
    testElem.style.height = '300px';
    testElem.style.position = 'relative';

    const component = new Components.TimespanBreakdownOverlay.TimespanBreakdownOverlay(testElem);
    const sections: Trace.Types.Overlays.TimespanBreakdownEntryBreakdown[] = [
      {
        bounds: microsecondsTraceWindow(0, 3_000),
        label: 'section one',
        showDuration: true,
      },
      {
        bounds: microsecondsTraceWindow(5_000, 50_055),
        label: 'section two',
        showDuration: true,

      },
    ];
    component.sections = sections;
    renderElementIntoDOM(component);

    await raf();

    await assertScreenshot('timeline/timespan-breakdown-overlay-rendered.png');
  });
});

// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../../models/trace/trace.js';
import {getCleanTextContentFromElements} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {
  microsecondsTraceWindow,
} from '../../../../testing/TraceHelpers.js';
import * as RenderCoordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';

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
    await RenderCoordinator.done();
    assert.isOk(component.shadowRoot);

    const sectionElems =
        Array.from(component.shadowRoot.querySelectorAll<HTMLElement>('.timespan-breakdown-overlay-section'));
    const labels = sectionElems.flatMap(elem => {
      return getCleanTextContentFromElements(elem, '.timespan-breakdown-overlay-label');
    });
    assert.deepEqual(labels, ['1 ms section one', '19 ms section two']);
  });
});

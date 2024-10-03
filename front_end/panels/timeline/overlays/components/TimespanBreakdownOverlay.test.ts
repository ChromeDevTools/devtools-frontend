// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getCleanTextContentFromElements} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {
  microsecondsTraceWindow,
} from '../../../../testing/TraceHelpers.js';
import * as RenderCoordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';

import * as Components from './components.js';
const coordinator = RenderCoordinator.RenderCoordinator.RenderCoordinator.instance();

describeWithEnvironment('TimespanBreakdownOverlay', () => {
  it('renders the sections with the labels and time', async () => {
    const component = new Components.TimespanBreakdownOverlay.TimespanBreakdownOverlay();
    const sections: Components.TimespanBreakdownOverlay.EntryBreakdown[] = [
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
    await coordinator.done();
    assert.isOk(component.shadowRoot);

    const sectionElems =
        Array.from(component.shadowRoot.querySelectorAll<HTMLElement>('.timespan-breakdown-overlay-section'));
    const labels = sectionElems.flatMap(elem => {
      return getCleanTextContentFromElements(elem, '.timespan-breakdown-overlay-label');
    });
    assert.deepEqual(labels, ['1 ms section one', '19 ms section two']);
  });
});
